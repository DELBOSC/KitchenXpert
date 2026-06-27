# System Metrics Documentation

> Comprehensive guide to infrastructure, container, and database metrics for
> KitchenXpert.

**Last Updated:** 2026-01-10 **Owner:** Platform Engineering Team **Version:**
1.0

---

## Table of Contents

1. [Infrastructure Metrics](#infrastructure-metrics)
2. [Container Metrics](#container-metrics)
3. [Database Metrics](#database-metrics)
4. [Prometheus Queries (PromQL)](#prometheus-queries-promql)
5. [Alert Thresholds](#alert-thresholds)
6. [Grafana Dashboards](#grafana-dashboards)
7. [Related Documentation](#related-documentation)

---

## Infrastructure Metrics

### CPU Utilization

#### Per-Service CPU Metrics

| Metric                              | Description                            | Unit    |
| ----------------------------------- | -------------------------------------- | ------- |
| `process_cpu_seconds_total`         | Total CPU time consumed by process     | seconds |
| `node_cpu_seconds_total`            | CPU time per mode (user, system, idle) | seconds |
| `container_cpu_usage_seconds_total` | Container CPU usage                    | seconds |

#### Key Measurements

**Overall CPU Usage (per node)**

```promql
# CPU utilization percentage
100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
```

**Per-Service CPU Usage**

```promql
# CPU usage by service
sum(rate(container_cpu_usage_seconds_total{namespace="kitchenxpert"}[5m])) by (pod) * 100
```

**CPU Usage by Service Type**

```promql
# Backend service CPU
sum(rate(container_cpu_usage_seconds_total{pod=~"backend-.*"}[5m])) * 100

# AI service CPU
sum(rate(container_cpu_usage_seconds_total{pod=~"ai-service-.*"}[5m])) * 100

# Frontend service CPU
sum(rate(container_cpu_usage_seconds_total{pod=~"frontend-.*"}[5m])) * 100
```

#### Thresholds

| Level    | Threshold | Action                               |
| -------- | --------- | ------------------------------------ |
| Normal   | < 70%     | No action required                   |
| Warning  | 70-85%    | Monitor closely, prepare for scaling |
| Critical | > 85%     | Immediate investigation, scale up    |

---

### Memory Usage

#### Memory Metrics

| Metric                           | Description      | Unit  |
| -------------------------------- | ---------------- | ----- |
| `node_memory_MemTotal_bytes`     | Total memory     | bytes |
| `node_memory_MemAvailable_bytes` | Available memory | bytes |
| `node_memory_Buffers_bytes`      | Buffer memory    | bytes |
| `node_memory_Cached_bytes`       | Cached memory    | bytes |
| `process_resident_memory_bytes`  | Process RSS      | bytes |

#### RAM Usage

**Node Memory Utilization**

```promql
# Memory utilization percentage
100 - ((node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100)
```

**Memory by Service**

```promql
# Memory usage per pod
sum(container_memory_usage_bytes{namespace="kitchenxpert"}) by (pod) / 1024 / 1024
```

#### Heap Memory (JVM/Node.js)

**Node.js Heap (Backend)**

```promql
# Node.js heap usage
nodejs_heap_size_used_bytes{service="backend"}
```

**JVM Heap (if applicable)**

```promql
# JVM heap usage percentage
jvm_memory_used_bytes{area="heap"} / jvm_memory_max_bytes{area="heap"} * 100
```

#### Thresholds

| Level    | RAM Usage | Heap Usage | Action                               |
| -------- | --------- | ---------- | ------------------------------------ |
| Normal   | < 75%     | < 70%      | No action                            |
| Warning  | 75-90%    | 70-85%     | Investigate, prepare scaling         |
| Critical | > 90%     | > 85%      | Scale immediately, investigate leaks |

---

### Disk I/O and Space

#### Disk Metrics

| Metric                            | Description          | Unit    |
| --------------------------------- | -------------------- | ------- |
| `node_filesystem_size_bytes`      | Total disk size      | bytes   |
| `node_filesystem_avail_bytes`     | Available disk space | bytes   |
| `node_disk_read_bytes_total`      | Disk read bytes      | bytes   |
| `node_disk_written_bytes_total`   | Disk written bytes   | bytes   |
| `node_disk_io_time_seconds_total` | Time spent doing I/O | seconds |

#### Disk Space

**Disk Utilization**

```promql
# Disk usage percentage
100 - ((node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100)
```

**Disk Space by Mount**

```promql
# Available space in GB
node_filesystem_avail_bytes{fstype!="tmpfs"} / 1024 / 1024 / 1024
```

#### Disk I/O

**Read/Write Throughput**

```promql
# Disk read rate (MB/s)
rate(node_disk_read_bytes_total[5m]) / 1024 / 1024

# Disk write rate (MB/s)
rate(node_disk_written_bytes_total[5m]) / 1024 / 1024
```

**I/O Utilization**

```promql
# Disk I/O utilization percentage
rate(node_disk_io_time_seconds_total[5m]) * 100
```

#### Thresholds

| Level    | Disk Space | I/O Utilization | Action                         |
| -------- | ---------- | --------------- | ------------------------------ |
| Normal   | < 70%      | < 60%           | No action                      |
| Warning  | 70-85%     | 60-80%          | Plan cleanup/expansion         |
| Critical | > 85%      | > 80%           | Immediate cleanup or expansion |

---

### Network I/O

#### Network Metrics

| Metric                                | Description         | Unit  |
| ------------------------------------- | ------------------- | ----- |
| `node_network_receive_bytes_total`    | Bytes received      | bytes |
| `node_network_transmit_bytes_total`   | Bytes transmitted   | bytes |
| `node_network_receive_packets_total`  | Packets received    | count |
| `node_network_transmit_packets_total` | Packets transmitted | count |
| `node_network_receive_errs_total`     | Receive errors      | count |
| `node_network_transmit_errs_total`    | Transmit errors     | count |

#### Network Throughput

**Bandwidth Usage**

```promql
# Network receive rate (Mbps)
rate(node_network_receive_bytes_total{device!="lo"}[5m]) * 8 / 1024 / 1024

# Network transmit rate (Mbps)
rate(node_network_transmit_bytes_total{device!="lo"}[5m]) * 8 / 1024 / 1024
```

**Network Errors**

```promql
# Network error rate
rate(node_network_receive_errs_total[5m]) + rate(node_network_transmit_errs_total[5m])
```

#### Thresholds

| Level    | Bandwidth Usage | Error Rate | Action                      |
| -------- | --------------- | ---------- | --------------------------- |
| Normal   | < 60% capacity  | < 0.1%     | No action                   |
| Warning  | 60-80% capacity | 0.1-1%     | Monitor, investigate errors |
| Critical | > 80% capacity  | > 1%       | Investigate, scale network  |

---

## Container Metrics

### Docker/Kubernetes Container Metrics

#### Container Resource Metrics

| Metric                                   | Description            | Unit    |
| ---------------------------------------- | ---------------------- | ------- |
| `container_cpu_usage_seconds_total`      | Container CPU usage    | seconds |
| `container_memory_usage_bytes`           | Container memory usage | bytes   |
| `container_memory_working_set_bytes`     | Container working set  | bytes   |
| `container_network_receive_bytes_total`  | Container network in   | bytes   |
| `container_network_transmit_bytes_total` | Container network out  | bytes   |

#### Container CPU

**CPU Usage by Container**

```promql
# CPU usage percentage per container
sum(rate(container_cpu_usage_seconds_total{namespace="kitchenxpert", container!="POD", container!=""}[5m])) by (pod, container) * 100
```

**CPU Throttling**

```promql
# CPU throttling
sum(rate(container_cpu_cfs_throttled_seconds_total[5m])) by (pod) /
sum(rate(container_cpu_cfs_periods_total[5m])) by (pod) * 100
```

#### Container Memory

**Memory Usage**

```promql
# Memory usage per container (MB)
sum(container_memory_working_set_bytes{namespace="kitchenxpert", container!="POD", container!=""}) by (pod, container) / 1024 / 1024
```

**Memory vs Limits**

```promql
# Memory usage as percentage of limit
container_memory_working_set_bytes / container_spec_memory_limit_bytes * 100
```

---

### Container Restarts

**Restart Count**

```promql
# Container restarts in last hour
increase(kube_pod_container_status_restarts_total{namespace="kitchenxpert"}[1h])
```

**Restart Rate**

```promql
# Restart rate (restarts per hour)
rate(kube_pod_container_status_restarts_total{namespace="kitchenxpert"}[1h]) * 3600
```

#### Thresholds

| Level    | Restarts (1h) | Action                  |
| -------- | ------------- | ----------------------- |
| Normal   | 0             | No action               |
| Warning  | 1-2           | Investigate logs        |
| Critical | > 3           | Immediate investigation |

---

### Image Versions

**Current Image Versions**

```promql
# Image versions in use
kube_pod_container_info{namespace="kitchenxpert"}
```

**Version Tracking Dashboard Query**

```promql
# Count pods by image version
count(kube_pod_container_info{namespace="kitchenxpert"}) by (image)
```

---

## Database Metrics

### PostgreSQL Metrics

#### Connection Metrics

| Metric                         | Description                 |
| ------------------------------ | --------------------------- |
| `pg_stat_activity_count`       | Active connections          |
| `pg_settings_max_connections`  | Maximum connections allowed |
| `pg_stat_database_numbackends` | Backends per database       |

**Connection Usage**

```promql
# Connection utilization percentage
pg_stat_activity_count / pg_settings_max_connections * 100
```

**Connections by State**

```promql
# Active connections by state
sum(pg_stat_activity_count) by (state)
```

#### Query Performance

| Metric                          | Description       |
| ------------------------------- | ----------------- |
| `pg_stat_database_tup_returned` | Rows returned     |
| `pg_stat_database_tup_fetched`  | Rows fetched      |
| `pg_stat_database_blks_hit`     | Buffer cache hits |
| `pg_stat_database_blks_read`    | Disk reads        |

**Query Time**

```promql
# Average query time (requires pg_stat_statements)
avg(pg_stat_statements_mean_time_seconds) by (query)
```

**Slow Queries**

```promql
# Queries taking more than 1 second
pg_stat_statements_mean_time_seconds > 1
```

#### Cache Hit Ratio

**Buffer Cache Hit Ratio**

```promql
# Cache hit ratio (should be > 99%)
pg_stat_database_blks_hit / (pg_stat_database_blks_hit + pg_stat_database_blks_read) * 100
```

#### PostgreSQL Thresholds

| Metric           | Warning | Critical |
| ---------------- | ------- | -------- |
| Connection Usage | > 70%   | > 85%    |
| Cache Hit Ratio  | < 99%   | < 95%    |
| Avg Query Time   | > 100ms | > 500ms  |
| Replication Lag  | > 10s   | > 60s    |

---

### MongoDB Metrics

#### Operation Metrics

| Metric                                  | Description         |
| --------------------------------------- | ------------------- |
| `mongodb_op_counters_total`             | Operations by type  |
| `mongodb_mongod_metrics_document_total` | Documents affected  |
| `mongodb_mongod_connections_current`    | Current connections |

**Operations per Second**

```promql
# Operations per second by type
rate(mongodb_op_counters_total[5m])
```

**Connection Count**

```promql
# Current connections
mongodb_mongod_connections_current
```

#### Replication Lag

**Replica Set Lag**

```promql
# Replication lag in seconds
mongodb_mongod_replset_member_replication_lag
```

#### MongoDB Thresholds

| Metric          | Warning   | Critical  |
| --------------- | --------- | --------- |
| Connections     | > 70% max | > 85% max |
| Replication Lag | > 5s      | > 30s     |
| Lock Percentage | > 5%      | > 20%     |

---

### Redis Metrics

#### Memory Metrics

| Metric                             | Description           |
| ---------------------------------- | --------------------- |
| `redis_memory_used_bytes`          | Memory used           |
| `redis_memory_max_bytes`           | Max memory configured |
| `redis_memory_fragmentation_ratio` | Memory fragmentation  |

**Memory Usage**

```promql
# Redis memory utilization percentage
redis_memory_used_bytes / redis_memory_max_bytes * 100
```

#### Hit Rate

**Cache Hit Rate**

```promql
# Cache hit rate
rate(redis_keyspace_hits_total[5m]) /
(rate(redis_keyspace_hits_total[5m]) + rate(redis_keyspace_misses_total[5m])) * 100
```

#### Connected Clients

**Client Connections**

```promql
# Connected clients
redis_connected_clients
```

#### Redis Thresholds

| Metric            | Warning   | Critical   |
| ----------------- | --------- | ---------- |
| Memory Usage      | > 70%     | > 85%      |
| Hit Rate          | < 90%     | < 80%      |
| Connected Clients | > 5000    | > 8000     |
| Evicted Keys      | > 100/min | > 1000/min |

---

## Prometheus Queries (PromQL)

### Common Query Patterns

#### Rate Calculations

```promql
# Rate of a counter over 5 minutes
rate(http_requests_total[5m])

# Increase over 1 hour
increase(http_requests_total[1h])
```

#### Aggregations

```promql
# Sum by label
sum(metric) by (label)

# Average by instance
avg(metric) by (instance)

# Maximum across all instances
max(metric)
```

#### Percentiles (Histograms)

```promql
# 50th percentile (median)
histogram_quantile(0.50, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))

# 95th percentile
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))

# 99th percentile
histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))
```

### Service-Specific Queries

**Backend Service Health**

```promql
# Request success rate
sum(rate(http_requests_total{service="backend", status!~"5.."}[5m])) /
sum(rate(http_requests_total{service="backend"}[5m])) * 100
```

**AI Service Performance**

```promql
# AI design generation time (p95)
histogram_quantile(0.95,
  sum(rate(ai_design_generation_seconds_bucket[5m])) by (le)
)
```

**Database Query Performance**

```promql
# Slow database queries
sum(rate(db_query_duration_seconds_bucket{le="1"}[5m])) /
sum(rate(db_query_duration_seconds_count[5m])) * 100
```

---

## Alert Thresholds

### Summary Table

| Metric                  | Warning | Critical | Duration |
| ----------------------- | ------- | -------- | -------- |
| CPU Usage               | 70%     | 85%      | 5m       |
| Memory Usage            | 75%     | 90%      | 5m       |
| Disk Space              | 70%     | 85%      | 5m       |
| Disk I/O                | 60%     | 80%      | 10m      |
| Network Errors          | 0.1%    | 1%       | 5m       |
| Container Restarts      | 2/hour  | 5/hour   | -        |
| PostgreSQL Connections  | 70%     | 85%      | 5m       |
| PostgreSQL Cache Hit    | 99%     | 95%      | 15m      |
| MongoDB Replication Lag | 5s      | 30s      | 5m       |
| Redis Memory            | 70%     | 85%      | 5m       |
| Redis Hit Rate          | 90%     | 80%      | 15m      |

### Alert Rule Examples

```yaml
groups:
  - name: system_metrics
    rules:
      - alert: HighCPUUsage
        expr:
          100 - (avg by(instance)
          (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 85
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: 'High CPU usage on {{ $labels.instance }}'
          description: 'CPU usage is {{ $value | printf "%.1f" }}%'

      - alert: HighMemoryUsage
        expr:
          100 - ((node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) *
          100) > 90
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: 'High memory usage on {{ $labels.instance }}'
          description: 'Memory usage is {{ $value | printf "%.1f" }}%'

      - alert: DiskSpaceLow
        expr:
          100 - ((node_filesystem_avail_bytes / node_filesystem_size_bytes) *
          100) > 85
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: 'Low disk space on {{ $labels.instance }}'
          description: 'Disk usage is {{ $value | printf "%.1f" }}%'
```

---

## Grafana Dashboards

### System Dashboard

**URL:** https://grafana.kitchenxpert.internal/d/system-metrics

[Dashboard: System Metrics Overview - Shows CPU, Memory, Disk, Network panels
for all services]

**Panels:**

1. CPU Usage (all nodes)
2. Memory Usage (all nodes)
3. Disk Space (all volumes)
4. Network I/O (in/out)
5. Container CPU by Pod
6. Container Memory by Pod
7. Container Restarts

### Database Dashboard

**URL:** https://grafana.kitchenxpert.internal/d/database-metrics

[Dashboard: Database Metrics - PostgreSQL, MongoDB, Redis panels]

**Panels:**

1. PostgreSQL Connections
2. PostgreSQL Query Performance
3. PostgreSQL Cache Hit Ratio
4. MongoDB Operations
5. MongoDB Replication Lag
6. Redis Memory Usage
7. Redis Hit Rate
8. Redis Connected Clients

---

## Related Documentation

- [Monitoring Overview](../overview.md)
- [Error Metrics](./error-metrics.md)
- [Business Metrics](./business-metrics.md)
- [User Experience Metrics](./user-experience-metrics.md)
- [Alert Rules](../alerting/alert-rules.md)
- [System Dashboard](../dashboards/system-dashboard.md)

---

_For questions about system metrics, contact the Platform Engineering team at
platform@kitchenxpert.com_
