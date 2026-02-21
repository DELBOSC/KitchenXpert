/**
 * Types pour le monitoring et les métriques
 */

import { ID } from './base.types';

export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';
export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';

export interface Metric {
  name: string;
  type: MetricType;
  value: number;
  labels?: Record<string, string>;
  timestamp: Date;
  unit?: string;
}

export interface MetricSeries {
  name: string;
  labels: Record<string, string>;
  dataPoints: Array<{
    timestamp: Date;
    value: number;
  }>;
}

export interface ServiceHealth {
  name: string;
  status: HealthStatus;
  latency?: number;
  lastCheck: Date;
  message?: string;
  details?: Record<string, unknown>;
}

export interface SystemHealth {
  status: HealthStatus;
  timestamp: Date;
  version: string;
  uptime: number;
  services: ServiceHealth[];
  dependencies: DependencyHealth[];
}

export interface DependencyHealth {
  name: string;
  type: 'database' | 'cache' | 'queue' | 'storage' | 'external_api';
  status: HealthStatus;
  latency?: number;
  details?: {
    connections?: number;
    maxConnections?: number;
    version?: string;
    region?: string;
  };
}

export interface PerformanceMetrics {
  requestsPerSecond: number;
  averageLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  errorRate: number;
  activeConnections: number;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
}

export interface Alert {
  id: ID;
  name: string;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  source: string;
  metric?: string;
  threshold?: number;
  currentValue?: number;
  labels?: Record<string, string>;
  firedAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: ID;
  resolvedAt?: Date;
  resolvedBy?: ID;
  notificationsSent: AlertNotification[];
}

export interface AlertNotification {
  channel: 'email' | 'slack' | 'pagerduty' | 'webhook';
  sentAt: Date;
  success: boolean;
  error?: string;
}

export interface AlertRule {
  id: ID;
  name: string;
  description: string;
  enabled: boolean;
  metric: string;
  condition: AlertCondition;
  severity: AlertSeverity;
  labels?: Record<string, string>;
  notifications: AlertNotificationConfig[];
  cooldownMinutes: number;
  evaluationIntervalSeconds: number;
}

export interface AlertCondition {
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq';
  threshold: number;
  duration?: number;
  aggregation?: 'avg' | 'min' | 'max' | 'sum' | 'count';
}

export interface AlertNotificationConfig {
  channel: 'email' | 'slack' | 'pagerduty' | 'webhook';
  recipients?: string[];
  webhookUrl?: string;
  template?: string;
}

export interface LogEntry {
  id: ID;
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  service: string;
  traceId?: string;
  spanId?: string;
  userId?: ID;
  requestId?: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export interface LogSearchParams {
  level?: string | string[];
  service?: string | string[];
  search?: string;
  traceId?: string;
  userId?: ID;
  dateFrom?: Date | string;
  dateTo?: Date | string;
}

export interface DashboardMetrics {
  timestamp: Date;
  users: {
    total: number;
    active: number;
    newToday: number;
  };
  projects: {
    total: number;
    activeToday: number;
    completed: number;
  };
  orders: {
    total: number;
    pendingCount: number;
    revenue: number;
    currency: string;
  };
  performance: PerformanceMetrics;
}

export interface MetricQuery {
  name: string;
  labels?: Record<string, string>;
  aggregation?: 'avg' | 'min' | 'max' | 'sum' | 'count' | 'rate';
  interval?: string;
  start: Date | string;
  end: Date | string;
}

export interface MetricQueryResult {
  query: MetricQuery;
  series: MetricSeries[];
}
