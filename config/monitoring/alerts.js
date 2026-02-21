/**
 * Alert Rules Configuration for KitchenXpert
 *
 * Features:
 * - Alert definitions for various metrics and conditions
 * - Multiple notification channels (Slack, PagerDuty, Email)
 * - Severity levels (critical, warning, info)
 * - Escalation policies
 * - Silencing rules and maintenance windows
 * - Alert grouping and throttling
 */

const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Notification Channels Configuration
 */
const notificationChannels = {
  // Slack integration
  slack: {
    enabled: process.env.SLACK_ALERTS_ENABLED === 'true',
    webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
    channel: process.env.SLACK_ALERT_CHANNEL || '#alerts',
    username: 'KitchenXpert Alerts',
    iconEmoji: ':warning:',
    // Minimum severity level to send to Slack
    minSeverity: 'warning',
  },

  // PagerDuty integration
  pagerduty: {
    enabled: process.env.PAGERDUTY_ENABLED === 'true',
    integrationKey: process.env.PAGERDUTY_INTEGRATION_KEY || '',
    // Only send critical alerts to PagerDuty
    minSeverity: 'critical',
  },

  // Email notifications
  email: {
    enabled: process.env.EMAIL_ALERTS_ENABLED === 'true',
    smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
    smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
    smtpSecure: process.env.SMTP_SECURE === 'true',
    smtpUser: process.env.SMTP_USER || '',
    smtpPassword: process.env.SMTP_PASSWORD || '',
    from: process.env.ALERT_EMAIL_FROM || 'alerts@kitchenxpert.com',
    to: (process.env.ALERT_EMAIL_TO || '').split(',').filter(Boolean),
    minSeverity: 'warning',
  },

  // Webhook for custom integrations
  webhook: {
    enabled: process.env.WEBHOOK_ALERTS_ENABLED === 'true',
    url: process.env.WEBHOOK_ALERT_URL || '',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.WEBHOOK_AUTH_TOKEN || ''}`,
    },
    minSeverity: 'info',
  },
};

/**
 * Severity Levels
 */
const severityLevels = {
  CRITICAL: 'critical', // System is down or severely degraded
  WARNING: 'warning',   // Potential issues that need attention
  INFO: 'info',         // Informational alerts
};

/**
 * Alert Definitions
 */
const alertRules = {
  // ============================================
  // Application Performance Alerts
  // ============================================

  highErrorRate: {
    name: 'High Error Rate',
    description: 'HTTP 5xx error rate exceeds threshold',
    severity: severityLevels.CRITICAL,
    metric: 'http_requests_total',
    condition: 'rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05',
    threshold: 0.05, // 5% error rate
    duration: '5m',
    annotations: {
      summary: 'High error rate detected',
      description: 'Error rate is {{ $value | humanizePercentage }} (threshold: 5%)',
      runbook_url: 'https://runbooks.kitchenxpert.com/high-error-rate',
    },
    labels: {
      category: 'performance',
      team: 'backend',
    },
  },

  slowResponseTime: {
    name: 'Slow Response Time',
    description: 'API response time p95 exceeds 1 second',
    severity: severityLevels.WARNING,
    metric: 'http_request_duration_seconds',
    condition: 'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1',
    threshold: 1, // 1 second
    duration: '5m',
    annotations: {
      summary: 'API response time is slow',
      description: 'P95 response time is {{ $value | humanizeDuration }} (threshold: 1s)',
      runbook_url: 'https://runbooks.kitchenxpert.com/slow-response',
    },
    labels: {
      category: 'performance',
      team: 'backend',
    },
  },

  highLatency: {
    name: 'High API Latency',
    description: 'API latency p99 exceeds 2 seconds',
    severity: severityLevels.CRITICAL,
    metric: 'http_request_duration_seconds',
    condition: 'histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])) > 2',
    threshold: 2, // 2 seconds
    duration: '5m',
    annotations: {
      summary: 'API latency is very high',
      description: 'P99 latency is {{ $value | humanizeDuration }} (threshold: 2s)',
      runbook_url: 'https://runbooks.kitchenxpert.com/high-latency',
    },
    labels: {
      category: 'performance',
      team: 'backend',
    },
  },

  // ============================================
  // Infrastructure Alerts
  // ============================================

  highCpuUsage: {
    name: 'High CPU Usage',
    description: 'CPU usage exceeds 80%',
    severity: severityLevels.WARNING,
    metric: 'node_cpu_usage',
    condition: '100 - (avg by (instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80',
    threshold: 80, // 80%
    duration: '5m',
    annotations: {
      summary: 'High CPU usage detected',
      description: 'CPU usage is {{ $value | humanize }}% on {{ $labels.instance }}',
      runbook_url: 'https://runbooks.kitchenxpert.com/high-cpu',
    },
    labels: {
      category: 'infrastructure',
      team: 'devops',
    },
  },

  highMemoryUsage: {
    name: 'High Memory Usage',
    description: 'Memory usage exceeds 85%',
    severity: severityLevels.WARNING,
    metric: 'node_memory_usage',
    condition: '(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 85',
    threshold: 85, // 85%
    duration: '5m',
    annotations: {
      summary: 'High memory usage detected',
      description: 'Memory usage is {{ $value | humanize }}% on {{ $labels.instance }}',
      runbook_url: 'https://runbooks.kitchenxpert.com/high-memory',
    },
    labels: {
      category: 'infrastructure',
      team: 'devops',
    },
  },

  diskSpaceLow: {
    name: 'Low Disk Space',
    description: 'Disk space below 10%',
    severity: severityLevels.CRITICAL,
    metric: 'node_disk_free',
    condition: '(node_filesystem_avail_bytes / node_filesystem_size_bytes) * 100 < 10',
    threshold: 10, // 10%
    duration: '5m',
    annotations: {
      summary: 'Low disk space detected',
      description: 'Only {{ $value | humanize }}% disk space available on {{ $labels.instance }}:{{ $labels.mountpoint }}',
      runbook_url: 'https://runbooks.kitchenxpert.com/low-disk',
    },
    labels: {
      category: 'infrastructure',
      team: 'devops',
    },
  },

  // ============================================
  // Database Alerts
  // ============================================

  databaseConnectionPoolExhaustion: {
    name: 'Database Connection Pool Exhaustion',
    description: 'Database connection pool usage exceeds 90%',
    severity: severityLevels.CRITICAL,
    metric: 'db_connection_pool_usage',
    condition: '(pg_stat_database_numbackends / pg_settings_max_connections) * 100 > 90',
    threshold: 90, // 90%
    duration: '2m',
    annotations: {
      summary: 'Database connection pool nearly exhausted',
      description: 'Connection pool usage is {{ $value | humanize }}%',
      runbook_url: 'https://runbooks.kitchenxpert.com/db-connections',
    },
    labels: {
      category: 'database',
      team: 'backend',
    },
  },

  slowDatabaseQueries: {
    name: 'Slow Database Queries',
    description: 'Database query execution time exceeds 500ms',
    severity: severityLevels.WARNING,
    metric: 'db_query_duration',
    condition: 'rate(pg_stat_statements_mean_exec_time[5m]) > 500',
    threshold: 500, // 500ms
    duration: '5m',
    annotations: {
      summary: 'Slow database queries detected',
      description: 'Average query time is {{ $value | humanizeDuration }}',
      runbook_url: 'https://runbooks.kitchenxpert.com/slow-queries',
    },
    labels: {
      category: 'database',
      team: 'backend',
    },
  },

  databaseDown: {
    name: 'Database Down',
    description: 'Database is not responding',
    severity: severityLevels.CRITICAL,
    metric: 'up',
    condition: 'up{job="postgresql"} == 0',
    threshold: 0,
    duration: '1m',
    annotations: {
      summary: 'Database is down',
      description: 'PostgreSQL database on {{ $labels.instance }} is not responding',
      runbook_url: 'https://runbooks.kitchenxpert.com/db-down',
    },
    labels: {
      category: 'database',
      team: 'devops',
    },
  },

  // ============================================
  // Cache Alerts
  // ============================================

  redisDown: {
    name: 'Redis Down',
    description: 'Redis cache is not responding',
    severity: severityLevels.CRITICAL,
    metric: 'up',
    condition: 'up{job="redis"} == 0',
    threshold: 0,
    duration: '1m',
    annotations: {
      summary: 'Redis is down',
      description: 'Redis cache on {{ $labels.instance }} is not responding',
      runbook_url: 'https://runbooks.kitchenxpert.com/redis-down',
    },
    labels: {
      category: 'cache',
      team: 'devops',
    },
  },

  highCacheEvictionRate: {
    name: 'High Cache Eviction Rate',
    description: 'Redis eviction rate is high',
    severity: severityLevels.WARNING,
    metric: 'redis_evicted_keys_total',
    condition: 'rate(redis_evicted_keys_total[5m]) > 100',
    threshold: 100, // 100 keys/sec
    duration: '5m',
    annotations: {
      summary: 'High cache eviction rate',
      description: 'Redis is evicting {{ $value | humanize }} keys/sec',
      runbook_url: 'https://runbooks.kitchenxpert.com/cache-eviction',
    },
    labels: {
      category: 'cache',
      team: 'backend',
    },
  },

  // ============================================
  // Security Alerts
  // ============================================

  tooManyFailedLogins: {
    name: 'Too Many Failed Login Attempts',
    description: 'Excessive failed login attempts detected',
    severity: severityLevels.WARNING,
    metric: 'failed_login_attempts',
    condition: 'rate(failed_login_attempts_total[5m]) > 10',
    threshold: 10, // 10 attempts/sec
    duration: '5m',
    annotations: {
      summary: 'High rate of failed login attempts',
      description: '{{ $value | humanize }} failed login attempts/sec',
      runbook_url: 'https://runbooks.kitchenxpert.com/failed-logins',
    },
    labels: {
      category: 'security',
      team: 'security',
    },
  },

  sslCertificateExpiringSoon: {
    name: 'SSL Certificate Expiring Soon',
    description: 'SSL certificate expires in less than 7 days',
    severity: severityLevels.WARNING,
    metric: 'ssl_certificate_expiry_days',
    condition: 'ssl_certificate_expiry_seconds / 86400 < 7',
    threshold: 7, // 7 days
    duration: '1h',
    annotations: {
      summary: 'SSL certificate expiring soon',
      description: 'SSL certificate for {{ $labels.domain }} expires in {{ $value | humanize }} days',
      runbook_url: 'https://runbooks.kitchenxpert.com/ssl-expiry',
    },
    labels: {
      category: 'security',
      team: 'devops',
    },
  },

  // ============================================
  // Business Metrics Alerts
  // ============================================

  lowOrderConversionRate: {
    name: 'Low Order Conversion Rate',
    description: 'Order conversion rate dropped below 2%',
    severity: severityLevels.INFO,
    metric: 'order_conversion_rate',
    condition: '(rate(orders_completed_total[1h]) / rate(users_visited_total[1h])) * 100 < 2',
    threshold: 2, // 2%
    duration: '1h',
    annotations: {
      summary: 'Order conversion rate is low',
      description: 'Conversion rate is {{ $value | humanizePercentage }}',
      runbook_url: 'https://runbooks.kitchenxpert.com/low-conversion',
    },
    labels: {
      category: 'business',
      team: 'product',
    },
  },
};

/**
 * Escalation Policies
 */
const escalationPolicies = {
  critical: {
    // Immediate notification
    immediate: ['slack', 'pagerduty', 'email'],
    // Escalate after 15 minutes if not acknowledged
    escalate: {
      after: '15m',
      channels: ['pagerduty'],
      oncall: true,
    },
  },
  warning: {
    immediate: ['slack', 'email'],
    escalate: {
      after: '1h',
      channels: ['slack'],
    },
  },
  info: {
    immediate: ['slack'],
  },
};

/**
 * Silencing Rules
 * Define periods or conditions when alerts should be silenced
 */
const silencingRules = {
  maintenanceWindow: {
    enabled: false,
    schedule: {
      // Maintenance window every Sunday 2-4 AM UTC
      dayOfWeek: 0, // Sunday
      startHour: 2,
      endHour: 4,
      timezone: 'UTC',
    },
    silencedAlerts: ['*'], // Silence all alerts during maintenance
  },

  deploymentWindow: {
    enabled: true,
    // Silence certain alerts during deployment
    silencedAlerts: [
      'highErrorRate', // May spike during deployment
      'slowResponseTime', // May spike during deployment
    ],
    duration: '10m', // Silence for 10 minutes after deployment starts
  },
};

/**
 * Alert Grouping
 * Group similar alerts to reduce notification noise
 */
const alertGrouping = {
  enabled: true,
  // Group alerts by these labels
  groupBy: ['alertname', 'instance', 'severity'],
  // Wait before sending first notification (to group multiple alerts)
  groupWait: '30s',
  // Wait before sending notification about new alerts in the same group
  groupInterval: '5m',
  // Wait before re-sending notification about the same group
  repeatInterval: '3h',
};

/**
 * Alert Utilities
 */
const AlertUtils = {
  /**
   * Send alert notification to configured channels
   */
  async sendAlert(alert, channels = null) {
    const targetChannels = channels || this.getChannelsForSeverity(alert.severity);

    for (const channel of targetChannels) {
      if (notificationChannels[channel]?.enabled) {
        try {
          await this.sendToChannel(channel, alert);
        } catch (error) {
          console.error(`Failed to send alert to ${channel}:`, error);
        }
      }
    }
  },

  /**
   * Get notification channels for a given severity level
   */
  getChannelsForSeverity(severity) {
    const channels = [];
    Object.entries(notificationChannels).forEach(([channel, config]) => {
      if (config.enabled && this.shouldNotify(severity, config.minSeverity)) {
        channels.push(channel);
      }
    });
    return channels;
  },

  /**
   * Check if we should notify based on severity levels
   */
  shouldNotify(alertSeverity, minSeverity) {
    const severityOrder = ['info', 'warning', 'critical'];
    return severityOrder.indexOf(alertSeverity) >= severityOrder.indexOf(minSeverity);
  },

  /**
   * Send alert to specific channel
   */
  async sendToChannel(channel, alert) {
    // Implementation depends on the channel
    // This is a placeholder that should be implemented based on each channel's API
    console.log(`Sending alert to ${channel}:`, alert);
  },

  /**
   * Check if alert should be silenced
   */
  isSilenced(alert) {
    // Check maintenance window
    if (silencingRules.maintenanceWindow.enabled) {
      const now = new Date();
      const schedule = silencingRules.maintenanceWindow.schedule;
      if (now.getDay() === schedule.dayOfWeek &&
          now.getUTCHours() >= schedule.startHour &&
          now.getUTCHours() < schedule.endHour) {
        return true;
      }
    }

    // Check deployment window
    if (silencingRules.deploymentWindow.enabled &&
        silencingRules.deploymentWindow.silencedAlerts.includes(alert.name)) {
      // Check if we're in deployment window (implementation specific)
      return false; // Placeholder
    }

    return false;
  },
};

module.exports = {
  notificationChannels,
  severityLevels,
  alertRules,
  escalationPolicies,
  silencingRules,
  alertGrouping,
  AlertUtils,
};
