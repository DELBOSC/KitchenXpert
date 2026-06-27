# Alert Rules Documentation

> Comprehensive guide to Prometheus alerting rules and alert configurations for
> KitchenXpert.

**Last Updated:** 2026-01-10 **Owner:** SRE Team **Version:** 1.0

---

## Table of Contents

1. [Alert Rule Format](#alert-rule-format)
2. [Categories of Alerts](#categories-of-alerts)
3. [Alert Severity Levels](#alert-severity-levels)
4. [Infrastructure Alerts](#infrastructure-alerts)
5. [Application Alerts](#application-alerts)
6. [Database Alerts](#database-alerts)
7. [Business Alerts](#business-alerts)
8. [Alert Management](#alert-management)
9. [Related Documentation](#related-documentation)

---

## Alert Rule Format

### Prometheus Alerting Rule Structure

```yaml
groups:
  - name: <group_name>
    rules:
      - alert: <AlertName>
        expr: <PromQL expression>
        for: <duration>
        labels:
          severity: <critical|warning|info>
          team: <team_name>
          service: <service_name>
        annotations:
          summary: '<Brief description>'
          description:
            '<Detailed description with {{ $labels }} and {{ $value }}>'
          runbook_url: '<URL to runbook>'
          dashboard_url: '<URL to relevant dashboard>'
```

### Rule Components

| Component     | Description                           | Example               |
| ------------- | ------------------------------------- | --------------------- |
| `alert`       | Unique alert name (PascalCase)        | `HighCPUUsage`        |
| `expr`        | PromQL expression that triggers alert | `cpu_usage > 85`      |
| `for`         | Duration before alert fires           | `5m`                  |
| `labels`      | Key-value pairs for routing           | `severity: critical`  |
| `annotations` | Descriptive information               | `summary: "High CPU"` |

### Example Alert Rule

```yaml
groups:
  - name: kitchenxpert_infrastructure
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m])) /
          sum(rate(http_requests_total[5m])) > 0.05
        for: 5m
        labels:
          severity: critical
          team: platform
          service: backend
        annotations:
          summary: 'High error rate on {{ $labels.instance }}'
          description:
            'Error rate is {{ $value | humanizePercentage }} (threshold: 5%)'
          runbook_url: 'https://runbooks.kitchenxpert.internal/high-error-rate'
          dashboard_url: 'https://grafana.kitchenxpert.internal/d/errors'
```

---

## Categories of Alerts

### Alert Categories Overview

| Category           | Description                          | Examples                     |
| ------------------ | ------------------------------------ | ---------------------------- |
| **Infrastructure** | System resources (CPU, memory, disk) | High CPU, Low disk space     |
| **Application**    | Service health and performance       | Error rates, latency         |
| **Database**       | Database health and performance      | Connections, replication     |
| **Business**       | Business metrics and KPIs            | Zero orders, signup failures |

---

## Alert Severity Levels

### Severity Definitions

| Severity     | Response Time  | Description                      | Notification               |
| ------------ | -------------- | -------------------------------- | -------------------------- |
| **Critical** | Immediate      | Service down, data loss risk     | PagerDuty page, Slack, SMS |
| **Warning**  | Within 1 hour  | Degraded service, trending issue | Slack, Email               |
| **Info**     | Business hours | Notable event, review needed     | Slack, Email digest        |

### Severity Selection Guide

```
Is the service completely down?
├── Yes → CRITICAL
└── No
    └── Is user experience significantly impacted?
        ├── Yes → CRITICAL
        └── No
            └── Is it trending toward a problem?
                ├── Yes → WARNING
                └── No → INFO
```

---

## Infrastructure Alerts

### CPU Alerts

```yaml
groups:
  - name: cpu_alerts
    rules:
      # High CPU Usage - Warning
      - alert: HighCPUUsageWarning
        expr: |
          100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 70
        for: 10m
        labels:
          severity: warning
          team: platform
        annotations:
          summary: 'High CPU usage on {{ $labels.instance }}'
          description:
            'CPU usage is {{ $value | printf "%.1f" }}% (warning threshold: 70%)'
          runbook_url: 'https://runbooks.kitchenxpert.internal/high-cpu'

      # High CPU Usage - Critical
      - alert: HighCPUUsageCritical
        expr: |
          100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 85
        for: 5m
        labels:
          severity: critical
          team: platform
        annotations:
          summary: 'Critical CPU usage on {{ $labels.instance }}'
          description:
            'CPU usage is {{ $value | printf "%.1f" }}% (critical threshold:
            85%)'
          runbook_url: 'https://runbooks.kitchenxpert.internal/high-cpu'

      # CPU Saturation
      - alert: CPUSaturation
        expr: |
          node_load1 / count without(cpu, mode) (node_cpu_seconds_total{mode="idle"}) > 2
        for: 15m
        labels:
          severity: warning
          team: platform
        annotations:
          summary: 'CPU saturation on {{ $labels.instance }}'
          description: 'Load average is {{ $value | printf "%.2f" }} per CPU'
```

### Memory Alerts

```yaml
groups:
  - name: memory_alerts
    rules:
      # High Memory Usage - Warning
      - alert: HighMemoryUsageWarning
        expr: |
          100 - ((node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100) > 75
        for: 10m
        labels:
          severity: warning
          team: platform
        annotations:
          summary: 'High memory usage on {{ $labels.instance }}'
          description:
            'Memory usage is {{ $value | printf "%.1f" }}% (warning: 75%)'

      # High Memory Usage - Critical
      - alert: HighMemoryUsageCritical
        expr: |
          100 - ((node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100) > 90
        for: 5m
        labels:
          severity: critical
          team: platform
        annotations:
          summary: 'Critical memory usage on {{ $labels.instance }}'
          description:
            'Memory usage is {{ $value | printf "%.1f" }}% (critical: 90%)'

      # OOM Kill Detected
      - alert: OOMKillDetected
        expr: |
          increase(node_vmstat_oom_kill[5m]) > 0
        for: 0m
        labels:
          severity: critical
          team: platform
        annotations:
          summary: 'OOM kill detected on {{ $labels.instance }}'
          description: '{{ $value }} OOM kills in the last 5 minutes'
```

### Disk Alerts

```yaml
groups:
  - name: disk_alerts
    rules:
      # Disk Space Low - Warning
      - alert: DiskSpaceLowWarning
        expr: |
          100 - ((node_filesystem_avail_bytes{fstype!="tmpfs"} /
          node_filesystem_size_bytes{fstype!="tmpfs"}) * 100) > 70
        for: 15m
        labels:
          severity: warning
          team: platform
        annotations:
          summary:
            'Low disk space on {{ $labels.instance }} ({{ $labels.mountpoint }})'
          description: 'Disk usage is {{ $value | printf "%.1f" }}%'

      # Disk Space Low - Critical
      - alert: DiskSpaceLowCritical
        expr: |
          100 - ((node_filesystem_avail_bytes{fstype!="tmpfs"} /
          node_filesystem_size_bytes{fstype!="tmpfs"}) * 100) > 85
        for: 5m
        labels:
          severity: critical
          team: platform
        annotations:
          summary:
            'Critical disk space on {{ $labels.instance }} ({{
            $labels.mountpoint }})'
          description: 'Disk usage is {{ $value | printf "%.1f" }}%'

      # Disk Will Fill Soon
      - alert: DiskWillFillIn24Hours
        expr: |
          predict_linear(node_filesystem_avail_bytes{fstype!="tmpfs"}[6h], 24*60*60) < 0
        for: 30m
        labels:
          severity: warning
          team: platform
        annotations:
          summary: 'Disk will fill within 24 hours on {{ $labels.instance }}'
          description: 'Disk {{ $labels.mountpoint }} will run out of space'

      # Disk I/O High
      - alert: HighDiskIOUtilization
        expr: |
          rate(node_disk_io_time_seconds_total[5m]) * 100 > 80
        for: 15m
        labels:
          severity: warning
          team: platform
        annotations:
          summary: 'High disk I/O on {{ $labels.instance }}'
          description: 'Disk I/O utilization is {{ $value | printf "%.1f" }}%'
```

### Network Alerts

```yaml
groups:
  - name: network_alerts
    rules:
      # High Network Errors
      - alert: HighNetworkErrors
        expr: |
          rate(node_network_receive_errs_total[5m]) +
          rate(node_network_transmit_errs_total[5m]) > 10
        for: 5m
        labels:
          severity: warning
          team: platform
        annotations:
          summary: 'Network errors on {{ $labels.instance }}'
          description:
            '{{ $value | printf "%.1f" }} errors/second on {{ $labels.device }}'

      # Network Interface Down
      - alert: NetworkInterfaceDown
        expr: |
          node_network_up{device!~"lo|veth.*|docker.*|br-.*"} == 0
        for: 2m
        labels:
          severity: critical
          team: platform
        annotations:
          summary: 'Network interface down on {{ $labels.instance }}'
          description: 'Interface {{ $labels.device }} is down'
```

---

## Application Alerts

### Error Rate Alerts

```yaml
groups:
  - name: error_rate_alerts
    rules:
      # High 5xx Error Rate
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m])) by (service) /
          sum(rate(http_requests_total[5m])) by (service) > 0.01
        for: 5m
        labels:
          severity: critical
          team: backend
        annotations:
          summary: 'High error rate on {{ $labels.service }}'
          description: 'Error rate is {{ $value | humanizePercentage }}'

      # Error Rate Spike
      - alert: ErrorRateSpike
        expr: |
          (sum(rate(http_requests_total{status=~"5.."}[5m])) /
          sum(rate(http_requests_total{status=~"5.."}[5m] offset 1h))) > 3
        for: 5m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: 'Error rate spike detected'
          description: 'Error rate is {{ $value }}x higher than 1 hour ago'

      # High 4xx Error Rate
      - alert: High4xxErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"4.."}[5m])) by (service) /
          sum(rate(http_requests_total[5m])) by (service) > 0.10
        for: 10m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: 'High 4xx error rate on {{ $labels.service }}'
          description: '4xx error rate is {{ $value | humanizePercentage }}'
```

### Latency Alerts

```yaml
groups:
  - name: latency_alerts
    rules:
      # High P95 Latency
      - alert: HighLatencyP95
        expr: |
          histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service)) > 1
        for: 10m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: 'High P95 latency on {{ $labels.service }}'
          description: 'P95 latency is {{ $value | humanizeDuration }}'

      # High P99 Latency
      - alert: HighLatencyP99
        expr: |
          histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service)) > 2
        for: 5m
        labels:
          severity: critical
          team: backend
        annotations:
          summary: 'Critical P99 latency on {{ $labels.service }}'
          description: 'P99 latency is {{ $value | humanizeDuration }}'

      # Slow Endpoint
      - alert: SlowEndpoint
        expr: |
          histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, path)) > 3
        for: 10m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: 'Slow endpoint: {{ $labels.path }}'
          description: 'P95 latency is {{ $value | humanizeDuration }}'
```

### Service Health Alerts

```yaml
groups:
  - name: service_health_alerts
    rules:
      # Service Down
      - alert: ServiceDown
        expr: |
          up{job=~"backend|ai-service|frontend"} == 0
        for: 1m
        labels:
          severity: critical
          team: platform
        annotations:
          summary: 'Service {{ $labels.job }} is down'
          description: 'Instance {{ $labels.instance }} is not responding'

      # High Container Restart Rate
      - alert: ContainerRestartLoop
        expr: |
          increase(kube_pod_container_status_restarts_total[1h]) > 3
        for: 5m
        labels:
          severity: critical
          team: platform
        annotations:
          summary: 'Container restart loop: {{ $labels.container }}'
          description: '{{ $value }} restarts in the last hour'

      # Pod Not Ready
      - alert: PodNotReady
        expr: |
          kube_pod_status_ready{condition="true"} == 0
        for: 10m
        labels:
          severity: warning
          team: platform
        annotations:
          summary: 'Pod not ready: {{ $labels.pod }}'
          description: 'Pod has been not ready for 10 minutes'

      # Deployment Replicas Mismatch
      - alert: DeploymentReplicasMismatch
        expr: |
          kube_deployment_spec_replicas != kube_deployment_status_available_replicas
        for: 15m
        labels:
          severity: warning
          team: platform
        annotations:
          summary: 'Deployment {{ $labels.deployment }} replicas mismatch'
          description:
            'Expected {{ $labels.spec_replicas }} replicas, got {{ $value }}'
```

### AI Service Alerts

```yaml
groups:
  - name: ai_service_alerts
    rules:
      # AI Service High Latency
      - alert: AIServiceHighLatency
        expr: |
          histogram_quantile(0.95, sum(rate(ai_design_generation_seconds_bucket[5m])) by (le)) > 15
        for: 10m
        labels:
          severity: warning
          team: ai
        annotations:
          summary: 'AI service high latency'
          description: 'P95 generation time is {{ $value | humanizeDuration }}'

      # AI Service Error Rate
      - alert: AIServiceHighErrorRate
        expr: |
          sum(rate(ai_generation_errors_total[5m])) /
          sum(rate(ai_generation_requests_total[5m])) > 0.05
        for: 5m
        labels:
          severity: critical
          team: ai
        annotations:
          summary: 'AI service high error rate'
          description: 'Error rate is {{ $value | humanizePercentage }}'

      # AI GPU Memory High
      - alert: AIGPUMemoryHigh
        expr: |
          ai_gpu_memory_used_bytes / ai_gpu_memory_total_bytes > 0.90
        for: 10m
        labels:
          severity: warning
          team: ai
        annotations:
          summary: 'High GPU memory usage'
          description: 'GPU memory usage is {{ $value | humanizePercentage }}'
```

---

## Database Alerts

### PostgreSQL Alerts

```yaml
groups:
  - name: postgresql_alerts
    rules:
      # PostgreSQL Down
      - alert: PostgreSQLDown
        expr: |
          pg_up == 0
        for: 1m
        labels:
          severity: critical
          team: database
        annotations:
          summary: 'PostgreSQL is down'
          description:
            'PostgreSQL instance {{ $labels.instance }} is not responding'

      # High Connection Usage
      - alert: PostgreSQLHighConnections
        expr: |
          pg_stat_activity_count / pg_settings_max_connections > 0.70
        for: 10m
        labels:
          severity: warning
          team: database
        annotations:
          summary: 'High PostgreSQL connection usage'
          description:
            '{{ $value | humanizePercentage }} of max connections in use'

      # Critical Connection Usage
      - alert: PostgreSQLCriticalConnections
        expr: |
          pg_stat_activity_count / pg_settings_max_connections > 0.85
        for: 5m
        labels:
          severity: critical
          team: database
        annotations:
          summary: 'Critical PostgreSQL connection usage'
          description:
            '{{ $value | humanizePercentage }} of max connections in use'

      # Low Cache Hit Ratio
      - alert: PostgreSQLLowCacheHitRatio
        expr: |
          pg_stat_database_blks_hit /
          (pg_stat_database_blks_hit + pg_stat_database_blks_read) < 0.95
        for: 30m
        labels:
          severity: warning
          team: database
        annotations:
          summary: 'Low PostgreSQL cache hit ratio'
          description: 'Cache hit ratio is {{ $value | humanizePercentage }}'

      # Replication Lag
      - alert: PostgreSQLReplicationLag
        expr: |
          pg_replication_lag_seconds > 30
        for: 5m
        labels:
          severity: critical
          team: database
        annotations:
          summary: 'PostgreSQL replication lag'
          description: 'Replication lag is {{ $value | humanizeDuration }}'

      # Deadlocks Detected
      - alert: PostgreSQLDeadlocks
        expr: |
          increase(pg_stat_database_deadlocks[5m]) > 0
        for: 0m
        labels:
          severity: warning
          team: database
        annotations:
          summary: 'PostgreSQL deadlocks detected'
          description: '{{ $value }} deadlocks in the last 5 minutes'

      # Slow Queries
      - alert: PostgreSQLSlowQueries
        expr: |
          pg_stat_statements_mean_time_seconds > 1
        for: 15m
        labels:
          severity: warning
          team: database
        annotations:
          summary: 'PostgreSQL slow queries detected'
          description: 'Average query time is {{ $value | humanizeDuration }}'
```

### MongoDB Alerts

```yaml
groups:
  - name: mongodb_alerts
    rules:
      # MongoDB Down
      - alert: MongoDBDown
        expr: |
          mongodb_up == 0
        for: 1m
        labels:
          severity: critical
          team: database
        annotations:
          summary: 'MongoDB is down'
          description:
            'MongoDB instance {{ $labels.instance }} is not responding'

      # MongoDB Replication Lag
      - alert: MongoDBReplicationLag
        expr: |
          mongodb_mongod_replset_member_replication_lag > 10
        for: 5m
        labels:
          severity: critical
          team: database
        annotations:
          summary: 'MongoDB replication lag'
          description: 'Replication lag is {{ $value | humanizeDuration }}'

      # MongoDB High Connections
      - alert: MongoDBHighConnections
        expr: |
          mongodb_mongod_connections_current / mongodb_mongod_connections_available > 0.70
        for: 10m
        labels:
          severity: warning
          team: database
        annotations:
          summary: 'High MongoDB connections'
          description:
            '{{ $value | humanizePercentage }} of available connections in use'
```

### Redis Alerts

```yaml
groups:
  - name: redis_alerts
    rules:
      # Redis Down
      - alert: RedisDown
        expr: |
          redis_up == 0
        for: 1m
        labels:
          severity: critical
          team: database
        annotations:
          summary: 'Redis is down'
          description: 'Redis instance {{ $labels.instance }} is not responding'

      # Redis High Memory
      - alert: RedisHighMemory
        expr: |
          redis_memory_used_bytes / redis_memory_max_bytes > 0.85
        for: 10m
        labels:
          severity: critical
          team: database
        annotations:
          summary: 'High Redis memory usage'
          description: 'Memory usage is {{ $value | humanizePercentage }}'

      # Redis Low Hit Rate
      - alert: RedisLowHitRate
        expr: |
          rate(redis_keyspace_hits_total[5m]) /
          (rate(redis_keyspace_hits_total[5m]) + rate(redis_keyspace_misses_total[5m])) < 0.80
        for: 30m
        labels:
          severity: warning
          team: database
        annotations:
          summary: 'Low Redis cache hit rate'
          description: 'Hit rate is {{ $value | humanizePercentage }}'

      # Redis Evictions
      - alert: RedisHighEvictions
        expr: |
          rate(redis_evicted_keys_total[5m]) > 100
        for: 10m
        labels:
          severity: warning
          team: database
        annotations:
          summary: 'High Redis key evictions'
          description: '{{ $value }} evictions per second'
```

---

## Business Alerts

```yaml
groups:
  - name: business_alerts
    rules:
      # No Signups
      - alert: NoSignupsInLastHour
        expr: |
          increase(kitchenxpert_signups_total[1h]) == 0
        for: 60m
        labels:
          severity: warning
          team: product
        annotations:
          summary: 'No new signups in the last hour'
          description: 'Zero signups detected during business hours'

      # Design Creation Drop
      - alert: DesignCreationDrop
        expr: |
          increase(kitchenxpert_designs_created_total[1h]) <
          increase(kitchenxpert_designs_created_total[1h] offset 24h) * 0.5
        for: 60m
        labels:
          severity: warning
          team: product
        annotations:
          summary: 'Significant drop in design creation'
          description: "Design creation is 50% below yesterday's level"

      # Quote Request Failures
      - alert: QuoteRequestFailures
        expr: |
          sum(rate(kitchenxpert_quote_requests_failed_total[5m])) /
          sum(rate(kitchenxpert_quote_requests_total[5m])) > 0.10
        for: 15m
        labels:
          severity: critical
          team: product
        annotations:
          summary: 'High quote request failure rate'
          description:
            '{{ $value | humanizePercentage }} of quote requests are failing'

      # Partner API Integration Failure
      - alert: PartnerAPIDown
        expr: |
          sum(rate(partner_api_errors_total[5m])) by (partner) /
          sum(rate(partner_api_requests_total[5m])) by (partner) > 0.50
        for: 10m
        labels:
          severity: critical
          team: integrations
        annotations:
          summary: 'Partner API {{ $labels.partner }} is failing'
          description: '{{ $value | humanizePercentage }} error rate'

      # Revenue Impact - Zero Transactions
      - alert: ZeroRevenueTransactions
        expr: |
          increase(kitchenxpert_transactions_total[2h]) == 0
        for: 120m
        labels:
          severity: critical
          team: product
        annotations:
          summary: 'No revenue transactions in 2 hours'
          description: 'Zero completed transactions during active hours'
```

---

## Alert Management

### Alert Silencing

```yaml
# Silence for planned maintenance
silences:
  - matchers:
      - name: instance
        value: 'backend-1'
      - name: severity
        value: 'warning'
    startsAt: '2026-01-15T00:00:00Z'
    endsAt: '2026-01-15T06:00:00Z'
    createdBy: 'ops-team'
    comment: 'Planned maintenance window'
```

### Alert Inhibition Rules

```yaml
# Inhibit warnings when critical is firing
inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'service']

  - source_match:
      alertname: 'ServiceDown'
    target_match:
      alertname: 'HighErrorRate'
    equal: ['service']
```

### Alert Testing

```yaml
# Test alerts with unit tests
rule_files:
  - alerts/*.yaml

tests:
  - interval: 1m
    input_series:
      - series: 'http_requests_total{status="500", service="backend"}'
        values: '0+10x10' # 10 errors per minute
      - series: 'http_requests_total{status="200", service="backend"}'
        values: '0+100x10' # 100 requests per minute
    alert_rule_test:
      - alertname: HighErrorRate
        eval_time: 10m
        exp_alerts:
          - exp_labels:
              severity: critical
              service: backend
```

### URLs and Access

| Resource      | URL                                                   |
| ------------- | ----------------------------------------------------- |
| Alertmanager  | https://alertmanager.kitchenxpert.internal            |
| Alert Rules   | https://prometheus.kitchenxpert.internal/rules        |
| Silences      | https://alertmanager.kitchenxpert.internal/#/silences |
| Alert History | https://grafana.kitchenxpert.internal/alerting/list   |

---

## Related Documentation

- [Escalation Policies](./escalation-policies.md)
- [Notification Channels](./notification-channels.md)
- [On-Call Rotation](./on-call-rotation.md)
- [Monitoring Overview](../overview.md)
- [Incident Response](/docs/operations/incident-response.md)

---

_For questions about alert rules, contact the SRE team at sre@kitchenxpert.com_
