# System Dashboard Documentation

> Comprehensive guide to the KitchenXpert System Dashboard for infrastructure
> monitoring.

**Last Updated:** 2026-01-10 **Owner:** Platform Engineering Team **Version:**
1.0

---

## Table of Contents

1. [Dashboard Access](#dashboard-access)
2. [Dashboard Panels](#dashboard-panels)
3. [Time Range Selection](#time-range-selection)
4. [Filtering Options](#filtering-options)
5. [Drill-Down Capabilities](#drill-down-capabilities)
6. [Screenshot Examples](#screenshot-examples)
7. [Related Documentation](#related-documentation)

---

## Dashboard Access

### URL and Access

**Dashboard URL:** https://grafana.kitchenxpert.internal/d/system

**Direct Links:** | Environment | URL | |-------------|-----| | Production |
https://grafana.kitchenxpert.internal/d/system?var-env=production | | Staging |
https://grafana.kitchenxpert.internal/d/system?var-env=staging | | Development |
https://grafana.kitchenxpert.internal/d/system?var-env=development |

### Access Requirements

| Role              | Access Level       |
| ----------------- | ------------------ |
| Admin             | Full edit access   |
| Platform Engineer | Full edit access   |
| Developer         | View only          |
| Operations        | View + annotations |
| On-Call           | View + annotations |

### Authentication

- **SSO Login:** Use your KitchenXpert SSO credentials
- **API Access:** Use service account tokens for automation
- **Guest Access:** Not available for system dashboard

---

## Dashboard Panels

### Row 1: Service Health Overview

#### Panel 1.1: Service Health Status

**Type:** Stat panel with status indicators

**Description:** Shows green/yellow/red status for each critical service

**Query:**

```promql
# Service up status
up{job=~"backend|ai-service|frontend|api-gateway"}
```

**Thresholds:** | Color | Condition | |-------|-----------| | Green | Service up
(1) | | Red | Service down (0) |

**Layout:**

```
+----------+----------+----------+----------+
| Backend  | Frontend | AI Svc   | API GW   |
|    UP    |    UP    |    UP    |    UP    |
+----------+----------+----------+----------+
```

[Dashboard: Service Health Status Panel - Shows status indicators for all
services]

#### Panel 1.2: Active Alerts Count

**Type:** Stat panel

**Description:** Count of currently firing alerts by severity

**Query:**

```promql
# Active alerts by severity
count(ALERTS{alertstate="firing"}) by (severity)
```

**Layout:**

```
+----------------+----------------+----------------+
| Critical: 0    | Warning: 2     | Info: 5        |
+----------------+----------------+----------------+
```

---

### Row 2: CPU and Memory

#### Panel 2.1: CPU Usage (All Nodes)

**Type:** Time series graph

**Description:** CPU utilization across all nodes over time

**Query:**

```promql
# CPU usage percentage by node
100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
```

**Visualization:**

- Line graph with one series per node
- Y-axis: 0-100%
- Legend: Node names

**Thresholds:**

- Warning line at 70%
- Critical line at 85%

[Dashboard: CPU Usage Graph - Line chart showing CPU utilization for all nodes]

#### Panel 2.2: Memory Usage (All Nodes)

**Type:** Time series graph

**Description:** Memory utilization across all nodes

**Query:**

```promql
# Memory usage percentage
100 - ((node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100)
```

**Visualization:**

- Stacked area chart
- Y-axis: 0-100%
- Color-coded by node

**Thresholds:**

- Warning line at 75%
- Critical line at 90%

[Dashboard: Memory Usage Graph - Area chart showing memory utilization]

---

### Row 3: Request Rate and Errors

#### Panel 3.1: Request Rate (requests/second)

**Type:** Time series graph

**Description:** Total HTTP request rate across all services

**Query:**

```promql
# Total request rate
sum(rate(http_requests_total[5m])) by (service)
```

**Visualization:**

- Line graph
- Y-axis: requests per second
- Stacked by service

**Additional Metrics:**

```promql
# Request rate by status code class
sum(rate(http_requests_total[5m])) by (status_class)
# where status_class = 2xx, 3xx, 4xx, 5xx
```

[Dashboard: Request Rate Graph - Shows incoming request volume]

#### Panel 3.2: Error Rate (percentage)

**Type:** Time series graph with threshold bands

**Description:** HTTP error rate (5xx) as percentage of total requests

**Query:**

```promql
# Error rate percentage
sum(rate(http_requests_total{status=~"5.."}[5m])) /
sum(rate(http_requests_total[5m])) * 100
```

**Visualization:**

- Line graph with fill below
- Y-axis: 0-10% (auto-scale if needed)
- Red fill for values above threshold

**Thresholds:**

- Warning: 1%
- Critical: 5%

[Dashboard: Error Rate Graph - Shows 5xx error percentage over time]

---

### Row 4: Latency

#### Panel 4.1: Latency Distribution (p50, p90, p99)

**Type:** Time series graph with multiple series

**Description:** Request latency percentiles over time

**Queries:**

```promql
# P50 latency
histogram_quantile(0.50, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))

# P90 latency
histogram_quantile(0.90, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))

# P99 latency
histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))
```

**Visualization:**

- Three lines (P50, P90, P99)
- Y-axis: seconds (or milliseconds)
- Different colors for each percentile

**Thresholds:** | Percentile | Warning | Critical |
|------------|---------|----------| | P50 | 200ms | 500ms | | P90 | 500ms | 1s |
| P99 | 1s | 2s |

[Dashboard: Latency Distribution - Shows P50/P90/P99 latency over time]

#### Panel 4.2: Latency Heatmap

**Type:** Heatmap

**Description:** Distribution of request latencies as a heatmap

**Query:**

```promql
# Latency histogram
sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
```

**Visualization:**

- X-axis: Time
- Y-axis: Latency buckets
- Color intensity: Request count

[Dashboard: Latency Heatmap - Visual distribution of request latencies]

---

### Row 5: Database Connections

#### Panel 5.1: Active Database Connections

**Type:** Gauge with time series

**Description:** Current database connection pool usage

**Query:**

```promql
# PostgreSQL connections
pg_stat_activity_count

# Connection utilization percentage
pg_stat_activity_count / pg_settings_max_connections * 100
```

**Visualization:**

- Gauge showing current value
- Small time series showing trend
- Color-coded based on utilization

**Thresholds:** | Usage | Color | |-------|-------| | 0-70% | Green | | 70-85% |
Yellow | | 85-100% | Red |

[Dashboard: Database Connections Gauge - Shows connection pool utilization]

#### Panel 5.2: Database Connections Over Time

**Type:** Time series

**Description:** Historical database connection count

**Query:**

```promql
# Connections over time
pg_stat_activity_count
```

**Additional Queries:**

```promql
# Connections by state
sum(pg_stat_activity_count) by (state)
# States: active, idle, idle in transaction
```

[Dashboard: Database Connections History - Connection trends over time]

---

### Row 6: Cache Performance

#### Panel 6.1: Cache Hit Rate

**Type:** Gauge with trend

**Description:** Redis cache hit ratio

**Query:**

```promql
# Cache hit rate
rate(redis_keyspace_hits_total[5m]) /
(rate(redis_keyspace_hits_total[5m]) + rate(redis_keyspace_misses_total[5m])) * 100
```

**Visualization:**

- Large gauge showing current hit rate
- Target indicator at 90%

**Thresholds:** | Hit Rate | Color | |----------|-------| | 90-100% | Green | |
80-90% | Yellow | | 0-80% | Red |

[Dashboard: Cache Hit Rate Gauge - Shows Redis cache effectiveness]

#### Panel 6.2: Cache Operations

**Type:** Time series

**Description:** Cache operations per second

**Query:**

```promql
# Cache operations
sum(rate(redis_commands_total[5m])) by (cmd)
```

**Visualization:**

- Stacked area chart
- Shows GET, SET, DEL operations
- Y-axis: operations per second

[Dashboard: Cache Operations Graph - Shows cache operation volume]

---

### Row 7: Container Metrics

#### Panel 7.1: Container CPU by Pod

**Type:** Time series

**Description:** CPU usage per Kubernetes pod

**Query:**

```promql
# Container CPU usage
sum(rate(container_cpu_usage_seconds_total{namespace="kitchenxpert"}[5m])) by (pod) * 100
```

**Visualization:**

- Line graph per pod
- Y-axis: CPU percentage
- Interactive legend for filtering

[Dashboard: Container CPU Usage - CPU usage per Kubernetes pod]

#### Panel 7.2: Container Memory by Pod

**Type:** Time series

**Description:** Memory usage per Kubernetes pod

**Query:**

```promql
# Container memory usage (MB)
sum(container_memory_working_set_bytes{namespace="kitchenxpert"}) by (pod) / 1024 / 1024
```

**Visualization:**

- Stacked area chart
- Y-axis: Memory in MB
- Color-coded by pod

[Dashboard: Container Memory Usage - Memory per pod]

#### Panel 7.3: Container Restarts

**Type:** Stat panel with history

**Description:** Container restart count

**Query:**

```promql
# Restart count in last 24 hours
sum(increase(kube_pod_container_status_restarts_total{namespace="kitchenxpert"}[24h])) by (pod, container)
```

**Visualization:**

- Table showing pods with restarts
- Red highlight for pods with > 0 restarts

[Dashboard: Container Restarts Table - Shows pods that have restarted]

---

## Time Range Selection

### Available Time Ranges

| Range           | Use Case                      |
| --------------- | ----------------------------- |
| Last 15 minutes | Active incident investigation |
| Last 1 hour     | Recent issue analysis         |
| Last 6 hours    | Shift review                  |
| Last 24 hours   | Daily patterns                |
| Last 7 days     | Weekly trends                 |
| Last 30 days    | Monthly capacity planning     |

### Custom Time Range

1. Click the time picker in top-right
2. Select "Custom time range"
3. Enter start and end times
4. Click "Apply"

### Time Zone Settings

**Default:** UTC

**Options:**

- UTC (recommended for cross-team collaboration)
- Local browser time
- Specific timezone (America/New_York, etc.)

---

## Filtering Options

### Environment Filter

**Variable:** `$env`

**Options:**

- All
- production
- staging
- development

**Query:**

```promql
label_values(up, environment)
```

### Service Filter

**Variable:** `$service`

**Options:**

- All
- backend
- frontend
- ai-service
- api-gateway

**Query:**

```promql
label_values(up{job=~".*"}, job)
```

### Node/Instance Filter

**Variable:** `$instance`

**Query:**

```promql
label_values(node_cpu_seconds_total, instance)
```

### Using Filters

1. Click dropdown at top of dashboard
2. Select desired values
3. Dashboard automatically refreshes

**URL Parameters:**

```
?var-env=production&var-service=backend&var-instance=backend-1
```

---

## Drill-Down Capabilities

### From Service Health to Service Detail

**Action:** Click on a service status panel

**Navigation:** Opens service-specific dashboard with:

- Detailed metrics for that service
- Recent deployments
- Configuration changes
- Related alerts

### From High-Level Metrics to Specific Instances

**Action:** Click on a data point in graphs

**Navigation:**

- Filters dashboard to specific time range
- Shows detailed breakdown by instance
- Links to relevant logs in Kibana

### Linking to Logs

**Action:** Click "View Logs" annotation or button

**Query Parameters Passed:**

- Time range
- Service name
- Instance ID
- Correlation IDs (if available)

### Linking to Traces

**Action:** Click request data points

**Navigation:** Opens Jaeger with:

- Time range filter
- Service filter
- Duration filter based on selected data

---

## Screenshot Examples

### Full Dashboard View

[Dashboard: System Dashboard Full View - Complete dashboard layout with all
panels visible]

```
+------------------------------------------------------------------+
| KitchenXpert System Dashboard                    [Time: Last 6h] |
+------------------------------------------------------------------+
| Service Health                                                    |
| [Backend: UP] [Frontend: UP] [AI: UP] [Gateway: UP]   Alerts: 0  |
+------------------------------------------------------------------+
| CPU Usage                          | Memory Usage                 |
| [===Line Graph================]    | [===Area Chart============]  |
+------------------------------------------------------------------+
| Request Rate                       | Error Rate                   |
| [===Stacked Area=============]     | [===Line with threshold===]  |
+------------------------------------------------------------------+
| Latency (p50/p90/p99)              | Latency Heatmap             |
| [===Three Lines==============]     | [===Heatmap===============]  |
+------------------------------------------------------------------+
| DB Connections     | Cache Hit Rate | Container CPU/Memory        |
| [===Gauge===]      | [===Gauge===]  | [===Stacked Area=======]    |
+------------------------------------------------------------------+
```

### Alert State Example

[Dashboard: System Dashboard with Active Alert - Shows warning state
highlighting]

### Incident Investigation View

[Dashboard: System Dashboard Zoomed - Zoomed to specific incident time range]

---

## Dashboard JSON Export

For backup or version control:

```json
{
  "dashboard": {
    "id": null,
    "uid": "system",
    "title": "KitchenXpert System Dashboard",
    "tags": ["infrastructure", "production"],
    "timezone": "utc",
    "schemaVersion": 38,
    "version": 1,
    "refresh": "30s"
  }
}
```

**Export Location:** https://grafana.kitchenxpert.internal/d/system/export

---

## Related Documentation

- [Monitoring Overview](../overview.md)
- [System Metrics](../metrics/system-metrics.md)
- [Error Dashboard](./error-dashboard.md)
- [Alert Rules](../alerting/alert-rules.md)

---

_For questions about the system dashboard, contact the Platform Engineering team
at platform@kitchenxpert.com_
