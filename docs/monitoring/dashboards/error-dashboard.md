# Error Dashboard Documentation

> Comprehensive guide to the KitchenXpert Error Dashboard for debugging and error analysis.

**Last Updated:** 2026-01-10
**Owner:** SRE Team
**Version:** 1.0

---

## Table of Contents

1. [Dashboard Access](#dashboard-access)
2. [Dashboard Panels](#dashboard-panels)
3. [Using the Dashboard for Debugging](#using-the-dashboard-for-debugging)
4. [Linking to Log Entries](#linking-to-log-entries)
5. [Common Debugging Workflows](#common-debugging-workflows)
6. [Related Documentation](#related-documentation)

---

## Dashboard Access

### URL and Access

**Dashboard URL:** https://grafana.kitchenxpert.internal/d/errors

**Direct Links:**
| View | URL |
|------|-----|
| All Errors | https://grafana.kitchenxpert.internal/d/errors |
| Backend Only | https://grafana.kitchenxpert.internal/d/errors?var-service=backend |
| AI Service | https://grafana.kitchenxpert.internal/d/errors?var-service=ai-service |
| Last 1 Hour | https://grafana.kitchenxpert.internal/d/errors?from=now-1h&to=now |

### Access Requirements

| Role | Access Level |
|------|--------------|
| Admin | Full edit access |
| SRE Team | Full edit access |
| Developer | View + annotations |
| On-Call | View + annotations |

---

## Dashboard Panels

### Row 1: Error Overview

#### Panel 1.1: Error Count Over Time

**Type:** Time series graph

**Description:** Total error count over time, broken down by type

**Query:**
```promql
# 5xx errors over time
sum(increase(http_requests_total{status=~"5.."}[5m])) by (status)
```

**Visualization:**
- Stacked area chart
- Color coded: 500 (red), 502 (orange), 503 (yellow), 504 (purple)
- Y-axis: Error count
- X-axis: Time

[Dashboard: Error Count Over Time - Shows error volume trends]

#### Panel 1.2: Current Error Rate

**Type:** Stat panel

**Description:** Current error rate as percentage

**Query:**
```promql
# Current error rate percentage
sum(rate(http_requests_total{status=~"5.."}[5m])) /
sum(rate(http_requests_total[5m])) * 100
```

**Thresholds:**
| Rate | Color | Status |
|------|-------|--------|
| < 0.5% | Green | Normal |
| 0.5-2% | Yellow | Warning |
| > 2% | Red | Critical |

[Dashboard: Current Error Rate Gauge - Shows real-time error percentage]

---

### Row 2: Error Breakdown

#### Panel 2.1: Error Breakdown by Type

**Type:** Pie chart

**Description:** Distribution of errors by HTTP status code

**Query:**
```promql
# Error distribution
sum(increase(http_requests_total{status=~"5.."}[1h])) by (status)
```

**Visualization:**
- Pie chart with legend
- Shows percentage and count
- Interactive - click to filter

**Colors:**
- 500 Internal Server Error: #E24D42
- 502 Bad Gateway: #EAB839
- 503 Service Unavailable: #F2495C
- 504 Gateway Timeout: #FF9830

[Dashboard: Error Type Pie Chart - Distribution of error types]

#### Panel 2.2: Error Breakdown by Service

**Type:** Bar chart

**Description:** Error count per service

**Query:**
```promql
# Errors by service
sum(increase(http_requests_total{status=~"5.."}[1h])) by (service)
```

**Visualization:**
- Horizontal bar chart
- Sorted by error count (highest first)
- Color intensity based on severity

[Dashboard: Errors by Service Bar Chart - Shows which services have most errors]

---

### Row 3: Top Errors

#### Panel 3.1: Top Error Messages

**Type:** Table

**Description:** Most frequent error messages

**Data Source:** Elasticsearch (logs)

**Query:**
```json
{
  "query": {
    "bool": {
      "must": [
        { "term": { "level": "error" } },
        { "range": { "@timestamp": { "gte": "now-1h" } } }
      ]
    }
  },
  "aggs": {
    "top_errors": {
      "terms": {
        "field": "error.message.keyword",
        "size": 10
      }
    }
  }
}
```

**Columns:**
| Column | Description |
|--------|-------------|
| Error Message | Truncated error message |
| Count | Number of occurrences |
| First Seen | Timestamp of first occurrence |
| Last Seen | Timestamp of most recent |
| Services | Affected services |

[Dashboard: Top Error Messages Table - Most frequent errors]

#### Panel 3.2: Error Rate by Endpoint

**Type:** Table with sparklines

**Description:** Error rate for each API endpoint

**Query:**
```promql
# Error rate by endpoint
sum(rate(http_requests_total{status=~"5.."}[5m])) by (path) /
sum(rate(http_requests_total[5m])) by (path) * 100
```

**Columns:**
| Column | Description |
|--------|-------------|
| Endpoint | API path |
| Error Rate | Percentage |
| Error Count (1h) | Total errors |
| Trend | Sparkline showing trend |

**Sorting:** By error rate descending

[Dashboard: Error Rate by Endpoint - Table showing endpoint error rates]

---

### Row 4: Error Trends

#### Panel 4.1: Error Trends vs Previous Period

**Type:** Time series with comparison

**Description:** Current error rate compared to same time yesterday

**Queries:**
```promql
# Current error rate
sum(rate(http_requests_total{status=~"5.."}[5m]))

# Same time yesterday
sum(rate(http_requests_total{status=~"5.."}[5m] offset 24h))
```

**Visualization:**
- Two lines: "Current" (solid) and "Yesterday" (dashed)
- Difference highlighted
- Anomaly detection overlay

[Dashboard: Error Trend Comparison - Current vs yesterday]

#### Panel 4.2: Error Rate Change

**Type:** Stat with trend

**Description:** Percentage change in error rate

**Query:**
```promql
# Error rate change
(sum(rate(http_requests_total{status=~"5.."}[1h])) -
sum(rate(http_requests_total{status=~"5.."}[1h] offset 1h))) /
sum(rate(http_requests_total{status=~"5.."}[1h] offset 1h)) * 100
```

**Visualization:**
- Large number showing percentage change
- Green for decrease, red for increase
- Arrow indicating direction

[Dashboard: Error Rate Change Indicator]

---

### Row 5: Recent Errors

#### Panel 5.1: Recent Error Logs

**Type:** Logs panel (Elasticsearch)

**Description:** Stream of recent error log entries

**Query (KQL):**
```
level: error
```

**Time Range:** Last 15 minutes (auto-refreshing)

**Display Fields:**
- @timestamp
- service
- message
- error.name
- error.stack (expandable)
- traceId (clickable link)

**Features:**
- Live tail mode
- Click to expand full log entry
- Link to full Kibana search

[Dashboard: Recent Error Logs Panel - Live log stream]

#### Panel 5.2: Stack Trace Viewer

**Type:** Text panel (expandable)

**Description:** View full stack traces for selected errors

**Interaction:**
1. Click on error in logs panel
2. Stack trace appears in viewer
3. Syntax highlighting for code
4. Copy to clipboard button

[Dashboard: Stack Trace Viewer - Expandable stack trace display]

---

### Row 6: Error Analysis

#### Panel 6.1: Error Correlation

**Type:** Heatmap

**Description:** Correlation between error spikes and other events

**Data Points:**
- Deployment events
- Configuration changes
- Traffic spikes
- External service failures

**Visualization:**
- X-axis: Time
- Y-axis: Event type
- Color: Correlation strength

[Dashboard: Error Correlation Heatmap]

#### Panel 6.2: Error by User Impact

**Type:** Stat panels

**Description:** User impact metrics

**Queries:**
```promql
# Unique users affected
count(distinct user_id) where error = true

# Sessions with errors
sum(sessions_with_errors) / sum(total_sessions) * 100

# Affected requests
sum(rate(http_requests_total{status=~"5.."}[1h]))
```

**Panels:**
- Users Affected: Count
- Error Session Rate: Percentage
- Failed Requests: Count

[Dashboard: User Impact Metrics - Shows how many users affected]

---

## Using the Dashboard for Debugging

### Step 1: Identify the Scope

1. Check **Error Count Over Time** for spike timing
2. Review **Current Error Rate** for severity
3. Look at **Error Breakdown by Service** to identify affected components

### Step 2: Narrow Down the Issue

1. Use **Service Filter** to focus on specific service
2. Check **Error Rate by Endpoint** to find affected endpoints
3. Review **Top Error Messages** for common patterns

### Step 3: Investigate Details

1. Click on specific error in **Recent Error Logs**
2. Examine **Stack Trace** in viewer
3. Note the **traceId** for distributed tracing

### Step 4: Correlate Events

1. Check **Error Trends** for when issue started
2. Look at **Annotations** for deployments/changes
3. Review **Error Correlation** heatmap

### Debugging Checklist

```markdown
[ ] Identified error type (500, 502, 503, 504)
[ ] Identified affected service(s)
[ ] Identified affected endpoint(s)
[ ] Found common error message pattern
[ ] Reviewed stack trace
[ ] Checked for correlated events (deploys, config changes)
[ ] Identified user impact scope
[ ] Obtained trace ID for distributed tracing
```

---

## Linking to Log Entries

### From Error Dashboard to Kibana

**Method 1: Click-through Link**
- Click on any log entry
- Opens Kibana with pre-filtered query
- Time range preserved

**Method 2: "Open in Kibana" Button**
- Click button in panel header
- Opens full Kibana Discover view
- Current filters applied

### Query Templates

**All errors for service:**
```
https://kibana.kitchenxpert.internal/app/discover#/?_g=(time:(from:now-1h,to:now))&_a=(query:(language:kuery,query:'level:error AND service:backend'))
```

**Specific error message:**
```
https://kibana.kitchenxpert.internal/app/discover#/?_a=(query:(language:kuery,query:'error.message:"Connection timeout"'))
```

**By trace ID:**
```
https://kibana.kitchenxpert.internal/app/discover#/?_a=(query:(language:kuery,query:'traceId:"abc123"'))
```

### Linking to Jaeger Traces

**From Dashboard:**
1. Find error log entry with traceId
2. Click traceId link
3. Opens Jaeger trace view

**Direct Link Format:**
```
https://jaeger.kitchenxpert.internal/trace/{traceId}
```

---

## Common Debugging Workflows

### Workflow 1: Sudden Error Spike

```
1. Open Error Dashboard
   ↓
2. Note spike time in "Error Count Over Time"
   ↓
3. Check "Annotations" for deployment at that time
   ↓
4. If deployment found → Consider rollback
   ↓
5. Filter by affected service
   ↓
6. Review "Top Error Messages"
   ↓
7. Click through to logs for details
   ↓
8. Follow trace ID to Jaeger
```

### Workflow 2: Intermittent Errors

```
1. Set time range to 24 hours
   ↓
2. Look for patterns in "Error Trends"
   ↓
3. Check if errors correlate with:
   - Time of day (traffic patterns)
   - Specific endpoints
   - External services
   ↓
4. Filter to affected endpoint
   ↓
5. Sample error logs for patterns
   ↓
6. Check external service metrics
```

### Workflow 3: User-Reported Error

```
1. Get user ID and approximate time
   ↓
2. Filter logs: userId:"user123"
   ↓
3. Find error entries for that user
   ↓
4. Get traceId from error
   ↓
5. View full trace in Jaeger
   ↓
6. Identify which service failed
   ↓
7. Review service-specific logs
```

### Workflow 4: Post-Incident Analysis

```
1. Set time range to incident duration
   ↓
2. Export error data for analysis
   ↓
3. Create timeline from annotations
   ↓
4. Calculate error budget impact
   ↓
5. Document affected users/requests
   ↓
6. Generate report for post-mortem
```

---

## Dashboard Variables

### Available Filters

| Variable | Options | Default |
|----------|---------|---------|
| `$timeRange` | 15m, 1h, 6h, 24h, 7d | 1h |
| `$service` | All, backend, frontend, ai-service | All |
| `$status` | 500, 502, 503, 504 | All |
| `$endpoint` | Dynamic from data | All |

### URL Parameters

```
# Filter to backend 500 errors in last hour
?var-service=backend&var-status=500&from=now-1h&to=now

# Specific time range
?from=2026-01-10T14:00:00Z&to=2026-01-10T15:00:00Z
```

---

## Related Documentation

- [Monitoring Overview](../overview.md)
- [Error Metrics](../metrics/error-metrics.md)
- [Log Analysis](../logging/log-analysis.md)
- [Alert Rules](../alerting/alert-rules.md)
- [System Dashboard](./system-dashboard.md)
- [Incident Response](/docs/operations/incident-response.md)

---

*For questions about the error dashboard, contact the SRE team at sre@kitchenxpert.com*
