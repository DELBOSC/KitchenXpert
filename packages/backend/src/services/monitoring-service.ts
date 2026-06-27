/**
 * Monitoring Service
 * Handles health checks, metrics collection, and system monitoring
 */

import logger from '../utils/logger';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  uptime: number;
  version: string;
  checks: HealthCheck[];
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  responseTime?: number;
  message?: string;
  lastCheck: Date;
}

export interface SystemMetrics {
  cpu: CpuMetrics;
  memory: MemoryMetrics;
  disk: DiskMetrics;
  network: NetworkMetrics;
  process: ProcessMetrics;
}

export interface CpuMetrics {
  usage: number;
  cores: number;
  loadAverage: number[];
}

export interface MemoryMetrics {
  total: number;
  used: number;
  free: number;
  usagePercent: number;
  heapUsed: number;
  heapTotal: number;
}

export interface DiskMetrics {
  total: number;
  used: number;
  free: number;
  usagePercent: number;
}

export interface NetworkMetrics {
  bytesIn: number;
  bytesOut: number;
  connections: number;
}

export interface ProcessMetrics {
  pid: number;
  uptime: number;
  cpuUsage: number;
  memoryUsage: number;
  handles: number;
}

export interface ApplicationMetrics {
  requests: RequestMetrics;
  database: DatabaseMetrics;
  cache: CacheMetrics;
  queue: QueueMetrics;
  ai: AIMetrics;
}

export interface RequestMetrics {
  total: number;
  successful: number;
  failed: number;
  averageResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerSecond: number;
  byEndpoint: Record<string, EndpointMetrics>;
}

export interface EndpointMetrics {
  count: number;
  avgTime: number;
  errors: number;
}

export interface DatabaseMetrics {
  connections: {
    active: number;
    idle: number;
    total: number;
    max: number;
  };
  queries: {
    total: number;
    avgTime: number;
    slowQueries: number;
  };
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  memoryUsage: number;
}

export interface QueueMetrics {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  avgProcessingTime: number;
}

export interface AIMetrics {
  configurationsGenerated: number;
  avgGenerationTime: number;
  successRate: number;
  tokensUsed: number;
}

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  source: string;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  metadata?: Record<string, unknown>;
}

export type AlertType =
  | 'cpu_high'
  | 'memory_high'
  | 'disk_full'
  | 'error_rate_high'
  | 'response_time_high'
  | 'service_down'
  | 'queue_backlog'
  | 'ai_failure';

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface AlertRule {
  id: string;
  name: string;
  type: AlertType;
  condition: AlertCondition;
  severity: AlertSeverity;
  cooldownMinutes: number;
  enabled: boolean;
  notifyChannels: string[];
}

export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  duration?: number;
}

export interface MonitoringRepository {
  saveMetrics(metrics: SystemMetrics & ApplicationMetrics): Promise<void>;
  getMetrics(
    from: Date,
    to: Date,
    granularity?: string
  ): Promise<Array<SystemMetrics & ApplicationMetrics & { timestamp: Date }>>;
  createAlert(alert: Omit<Alert, 'id'>): Promise<Alert>;
  getAlerts(params?: { acknowledged?: boolean; severity?: AlertSeverity }): Promise<Alert[]>;
  acknowledgeAlert(id: string, acknowledgedBy: string): Promise<Alert | null>;
  getAlertRules(): Promise<AlertRule[]>;
  saveAlertRule(rule: AlertRule): Promise<AlertRule>;
}

interface HealthCheckFn {
  name: string;
  check: () => Promise<HealthCheck>;
}

export class MonitoringService {
  private healthChecks: HealthCheckFn[] = [];
  private startTime: Date;
  private metricsBuffer: Array<SystemMetrics & ApplicationMetrics & { timestamp: Date }> = [];
  private alertCooldowns: Map<string, Date> = new Map();
  private collectInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private repository: MonitoringRepository,
    private config: MonitoringConfig = defaultConfig
  ) {
    this.startTime = new Date();
    this.registerDefaultChecks();
  }

  /**
   * Start metrics collection
   */
  start(): void {
    if (this.collectInterval) {
      return;
    }

    this.collectInterval = setInterval(
      () => this.collectAndStoreMetrics(),
      this.config.collectIntervalMs
    );
  }

  /**
   * Stop metrics collection
   */
  stop(): void {
    if (this.collectInterval) {
      clearInterval(this.collectInterval);
      this.collectInterval = null;
    }
  }

  /**
   * Get health status
   */
  async getHealth(): Promise<HealthStatus> {
    const checks: HealthCheck[] = [];

    for (const healthCheck of this.healthChecks) {
      try {
        const result = await healthCheck.check();
        checks.push(result);
      } catch (error) {
        checks.push({
          name: healthCheck.name,
          status: 'fail',
          message: error instanceof Error ? error.message : 'Unknown error',
          lastCheck: new Date(),
        });
      }
    }

    const hasFailure = checks.some((c) => c.status === 'fail');
    const hasWarning = checks.some((c) => c.status === 'warn');

    return {
      status: hasFailure ? 'unhealthy' : hasWarning ? 'degraded' : 'healthy',
      timestamp: new Date(),
      uptime: Date.now() - this.startTime.getTime(),
      version: process.env['APP_VERSION'] || '1.0.0',
      checks,
    };
  }

  /**
   * Register a health check
   */
  registerHealthCheck(name: string, check: () => Promise<HealthCheck>): void {
    this.healthChecks.push({ name, check });
  }

  /**
   * Get system metrics
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    // Lazy ESM import keeps this fn tree-shakeable in non-Node envs.
    const os = await import('os');
    const memoryUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const cpus = os.cpus();

    return {
      cpu: {
        usage: await this.getCpuUsage(),
        cores: cpus.length,
        loadAverage: os.loadavg() as [number, number, number],
      },
      memory: {
        total: totalMem,
        used: totalMem - freeMem,
        free: freeMem,
        usagePercent: ((totalMem - freeMem) / totalMem) * 100,
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
      },
      disk: {
        // Note: Real disk metrics require platform-specific tools (df, wmic)
        // For cross-platform, use a library like 'diskusage' or 'systeminformation'
        total: 0,
        used: 0,
        free: 0,
        usagePercent: 0,
      },
      network: {
        bytesIn: 0,
        bytesOut: 0,
        connections: 0,
      },
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        cpuUsage: process.cpuUsage().user / 1000000, // Convert to seconds
        memoryUsage: memoryUsage.rss,
        handles: 0,
      },
    };
  }

  /**
   * Get application metrics
   */
  async getApplicationMetrics(): Promise<ApplicationMetrics> {
    return {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        averageResponseTime: 0,
        p50ResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        requestsPerSecond: 0,
        byEndpoint: {},
      },
      database: {
        connections: { active: 5, idle: 10, total: 15, max: 20 },
        queries: { total: 0, avgTime: 0, slowQueries: 0 },
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0,
        size: 0,
        memoryUsage: 0,
      },
      queue: {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        avgProcessingTime: 0,
      },
      ai: {
        configurationsGenerated: 0,
        avgGenerationTime: 0,
        successRate: 100,
        tokensUsed: 0,
      },
    };
  }

  /**
   * Get historical metrics
   */
  async getHistoricalMetrics(
    from: Date,
    to: Date,
    granularity: string = '1h'
  ): Promise<Array<SystemMetrics & ApplicationMetrics & { timestamp: Date }>> {
    return this.repository.getMetrics(from, to, granularity);
  }

  /**
   * Record request metrics
   */
  recordRequest(endpoint: string, responseTime: number, statusCode: number): void {
    // In real implementation, would update request metrics
    logger.info(`[Monitoring] Request: ${endpoint} - ${statusCode} - ${responseTime}ms`);
  }

  /**
   * Record AI configuration generation
   */
  recordAIGeneration(duration: number, success: boolean, configurationsCount: number): void {
    logger.info(
      `[Monitoring] AI Generation: ${configurationsCount} configs in ${duration}ms - ${success ? 'success' : 'failed'}`
    );
  }

  /**
   * Create an alert
   */
  async createAlert(
    type: AlertType,
    severity: AlertSeverity,
    message: string,
    source: string,
    metadata?: Record<string, unknown>
  ): Promise<Alert | null> {
    // Check cooldown
    const cooldownKey = `${type}:${source}`;
    const lastAlert = this.alertCooldowns.get(cooldownKey);

    if (lastAlert) {
      const cooldownMs = this.config.alertCooldownMinutes * 60 * 1000;
      if (Date.now() - lastAlert.getTime() < cooldownMs) {
        return null;
      }
    }

    const alert = await this.repository.createAlert({
      type,
      severity,
      message,
      source,
      timestamp: new Date(),
      acknowledged: false,
      metadata,
    });

    this.alertCooldowns.set(cooldownKey, new Date());

    return alert;
  }

  /**
   * Get alerts
   */
  async getAlerts(params?: { acknowledged?: boolean; severity?: AlertSeverity }): Promise<Alert[]> {
    return this.repository.getAlerts(params);
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(id: string, acknowledgedBy: string): Promise<Alert | null> {
    return this.repository.acknowledgeAlert(id, acknowledgedBy);
  }

  /**
   * Evaluate alert rules
   */
  async evaluateAlertRules(metrics: SystemMetrics & ApplicationMetrics): Promise<void> {
    const rules = await this.repository.getAlertRules();

    for (const rule of rules) {
      if (!rule.enabled) {
        continue;
      }

      const value = this.getMetricValue(metrics, rule.condition.metric);
      if (value === null) {
        continue;
      }

      const triggered = this.evaluateCondition(value, rule.condition);

      if (triggered) {
        await this.createAlert(
          rule.type,
          rule.severity,
          `Alert: ${rule.name} - ${rule.condition.metric} is ${value}`,
          'monitoring',
          { rule: rule.id, value, threshold: rule.condition.threshold }
        );
      }
    }
  }

  /**
   * Collect and store metrics
   */
  private async collectAndStoreMetrics(): Promise<void> {
    try {
      const [systemMetrics, appMetrics] = await Promise.all([
        this.getSystemMetrics(),
        this.getApplicationMetrics(),
      ]);

      const combined = {
        ...systemMetrics,
        ...appMetrics,
        timestamp: new Date(),
      };

      this.metricsBuffer.push(combined);

      // Flush buffer periodically
      if (this.metricsBuffer.length >= this.config.bufferSize) {
        await this.flushMetrics();
      }

      // Evaluate alert rules
      await this.evaluateAlertRules(combined);
    } catch (error) {
      logger.error('[Monitoring] Error collecting metrics:', error);
    }
  }

  /**
   * Flush metrics buffer
   */
  private async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0) {
      return;
    }

    const metrics = [...this.metricsBuffer];
    this.metricsBuffer = [];

    const results = await Promise.allSettled(metrics.map((m) => this.repository.saveMetrics(m)));

    const failures = results.filter((r) => r.status === 'rejected');
    if (failures.length > 0) {
      logger.error(`[Monitoring] Failed to save ${failures.length}/${metrics.length} metrics`);
    }
  }

  /**
   * Register default health checks
   */
  private registerDefaultChecks(): void {
    this.registerHealthCheck('memory', async () => {
      const memoryUsage = process.memoryUsage();
      const usagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

      return {
        name: 'memory',
        status: usagePercent > 90 ? 'fail' : usagePercent > 70 ? 'warn' : 'pass',
        message: `Memory usage: ${usagePercent.toFixed(1)}%`,
        lastCheck: new Date(),
      };
    });

    this.registerHealthCheck('uptime', async () => {
      const uptime = process.uptime();
      return {
        name: 'uptime',
        status: 'pass',
        message: `Uptime: ${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
        lastCheck: new Date(),
      };
    });
  }

  /**
   * Get CPU usage (average across all cores)
   */
  private async getCpuUsage(): Promise<number> {
    const os = await import('os');
    const cpus = os.cpus();

    let totalIdle = 0;
    let totalTick = 0;

    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    }

    // Return usage percentage
    return ((totalTick - totalIdle) / totalTick) * 100;
  }

  /**
   * Get metric value from metrics object
   */
  private getMetricValue(metrics: SystemMetrics & ApplicationMetrics, path: string): number | null {
    const parts = path.split('.');
    let current: unknown = metrics;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return null;
      }
    }

    return typeof current === 'number' ? current : null;
  }

  /**
   * Evaluate alert condition
   */
  private evaluateCondition(value: number, condition: AlertCondition): boolean {
    switch (condition.operator) {
      case 'gt':
        return value > condition.threshold;
      case 'lt':
        return value < condition.threshold;
      case 'eq':
        return value === condition.threshold;
      case 'gte':
        return value >= condition.threshold;
      case 'lte':
        return value <= condition.threshold;
      default:
        return false;
    }
  }
}

export interface MonitoringConfig {
  collectIntervalMs: number;
  bufferSize: number;
  alertCooldownMinutes: number;
}

const defaultConfig: MonitoringConfig = {
  collectIntervalMs: 60000,
  bufferSize: 10,
  alertCooldownMinutes: 15,
};

export class MonitoringServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'MonitoringServiceError';
  }
}

export function createMonitoringService(
  repository: MonitoringRepository,
  config?: Partial<MonitoringConfig>
): MonitoringService {
  return new MonitoringService(repository, { ...defaultConfig, ...config });
}

export default MonitoringService;
