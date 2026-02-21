/**
 * Interfaces pour le monitoring et les métriques
 */

import { ID } from '../types/base.types';
import {
  Metric,
  ServiceHealth,
  SystemHealth,
  Alert,
  AlertRule,
  LogEntry,
  LogSearchParams,
  MetricQuery,
  MetricQueryResult,
} from '../types/monitoring.types';

/**
 * Interface principale pour le service de monitoring
 */
export interface IMonitoringService {
  getSystemHealth(): Promise<SystemHealth>;
  getServiceHealth(serviceName: string): Promise<ServiceHealth>;
  recordMetric(metric: Metric): Promise<void>;
  queryMetrics(query: MetricQuery): Promise<MetricQueryResult>;
}

/**
 * Interface pour le collecteur de métriques
 */
export interface IMetricsCollector {
  increment(name: string, value?: number, labels?: Record<string, string>): void;
  decrement(name: string, value?: number, labels?: Record<string, string>): void;
  gauge(name: string, value: number, labels?: Record<string, string>): void;
  histogram(name: string, value: number, labels?: Record<string, string>): void;
  timing(name: string, duration: number, labels?: Record<string, string>): void;
  flush(): Promise<void>;
}

/**
 * Interface pour le service d'alertes
 */
export interface IAlertService {
  createRule(rule: Omit<AlertRule, 'id'>): Promise<AlertRule>;
  updateRule(id: ID, rule: Partial<AlertRule>): Promise<AlertRule>;
  deleteRule(id: ID): Promise<void>;
  getRules(): Promise<AlertRule[]>;
  getActiveAlerts(): Promise<Alert[]>;
  acknowledgeAlert(id: ID, userId: ID): Promise<Alert>;
  resolveAlert(id: ID, userId: ID): Promise<Alert>;
}

/**
 * Interface pour le service de logs
 */
export interface ILogService {
  log(entry: Omit<LogEntry, 'id' | 'timestamp'>): Promise<void>;
  search(params: LogSearchParams): Promise<LogSearchResult>;
  getByTraceId(traceId: string): Promise<LogEntry[]>;
}

export interface LogSearchResult {
  entries: LogEntry[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Interface pour les health checks
 */
export interface IHealthChecker {
  check(): Promise<HealthCheckResult>;
  register(name: string, checker: () => Promise<ComponentHealth>): void;
  unregister(name: string): void;
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  components: Record<string, ComponentHealth>;
  timestamp: Date;
}

export interface ComponentHealth {
  status: 'up' | 'down' | 'degraded';
  latency?: number;
  message?: string;
  details?: Record<string, unknown>;
}

/**
 * Interface pour le tracing distribué
 */
export interface ITracer {
  startSpan(name: string, options?: SpanOptions): ISpan;
  getCurrentSpan(): ISpan | null;
  inject(carrier: Record<string, string>): void;
  extract(carrier: Record<string, string>): SpanContext | null;
}

export interface ISpan {
  traceId: string;
  spanId: string;
  end(): void;
  setStatus(status: 'ok' | 'error'): void;
  setAttribute(key: string, value: string | number | boolean): void;
  addEvent(name: string, attributes?: Record<string, unknown>): void;
  recordException(error: Error): void;
}

export interface SpanOptions {
  parent?: SpanContext;
  attributes?: Record<string, string | number | boolean>;
}

export interface SpanContext {
  traceId: string;
  spanId: string;
}

/**
 * Interface pour les notifications d'alertes
 */
export interface IAlertNotifier {
  send(alert: Alert, channel: NotificationChannel): Promise<boolean>;
  getAvailableChannels(): NotificationChannel[];
}

export type NotificationChannel = 'email' | 'slack' | 'pagerduty' | 'webhook' | 'sms';
