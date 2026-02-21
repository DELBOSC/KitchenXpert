/**
 * Constantes pour le monitoring
 */

export const HEALTH_STATUSES = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  UNHEALTHY: 'unhealthy',
  UNKNOWN: 'unknown',
} as const;

export type HealthStatus = typeof HEALTH_STATUSES[keyof typeof HEALTH_STATUSES];

export const METRIC_TYPES = {
  COUNTER: 'counter',
  GAUGE: 'gauge',
  HISTOGRAM: 'histogram',
  SUMMARY: 'summary',
} as const;

export type MetricType = typeof METRIC_TYPES[keyof typeof METRIC_TYPES];

export const ALERT_SEVERITIES = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical',
} as const;

export type AlertSeverity = typeof ALERT_SEVERITIES[keyof typeof ALERT_SEVERITIES];

export const ALERT_STATUSES = {
  FIRING: 'firing',
  RESOLVED: 'resolved',
  ACKNOWLEDGED: 'acknowledged',
  SILENCED: 'silenced',
} as const;

export type AlertStatus = typeof ALERT_STATUSES[keyof typeof ALERT_STATUSES];

export const DEFAULT_METRICS = {
  HTTP_REQUEST_DURATION: 'http_request_duration_seconds',
  HTTP_REQUEST_COUNT: 'http_request_total',
  ERROR_COUNT: 'error_total',
  ACTIVE_USERS: 'active_users_gauge',
  DB_CONNECTION_POOL: 'db_connection_pool_gauge',
  MEMORY_USAGE: 'memory_usage_bytes',
  CPU_USAGE: 'cpu_usage_percent',
} as const;

export const MONITORING_INTERVALS = {
  HEALTH_CHECK_MS: 30000,
  METRICS_COLLECTION_MS: 10000,
  LOG_FLUSH_MS: 5000,
} as const;

export const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4,
} as const;

export type LogLevel = keyof typeof LOG_LEVELS;

export const RETENTION_POLICIES = {
  METRICS_DAYS: 30,
  LOGS_DAYS: 14,
  ALERTS_DAYS: 90,
} as const;
