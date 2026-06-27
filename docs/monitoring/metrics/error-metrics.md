# Error Metrics Documentation

> Comprehensive guide to error tracking, classification, and analysis for
> KitchenXpert.

**Last Updated:** 2026-01-10 **Owner:** Platform Engineering Team **Version:**
1.0

---

## Table of Contents

1. [HTTP Error Rates](#http-error-rates)
2. [Application Errors](#application-errors)
3. [Error Classification](#error-classification)
4. [Error Trends and Patterns](#error-trends-and-patterns)
5. [MTTR Tracking](#mttr-tracking)
6. [Error Budget Calculations](#error-budget-calculations)
7. [Alert Rules for Error Spikes](#alert-rules-for-error-spikes)
8. [Related Documentation](#related-documentation)

---

## HTTP Error Rates

### Overview

HTTP errors are categorized into two main groups:

- **4xx Errors:** Client errors (bad requests, unauthorized, not found)
- **5xx Errors:** Server errors (internal errors, service unavailable)

### 4xx Errors (Client Errors)

#### Common 4xx Status Codes

| Status Code | Name                 | Description              | Common Causes                        |
| ----------- | -------------------- | ------------------------ | ------------------------------------ |
| 400         | Bad Request          | Malformed request syntax | Invalid JSON, missing fields         |
| 401         | Unauthorized         | Authentication required  | Missing/invalid token                |
| 403         | Forbidden            | Access denied            | Insufficient permissions             |
| 404         | Not Found            | Resource not found       | Invalid URL, deleted resource        |
| 409         | Conflict             | Request conflict         | Duplicate creation, version conflict |
| 422         | Unprocessable Entity | Validation error         | Invalid field values                 |
| 429         | Too Many Requests    | Rate limit exceeded      | API abuse, bug in client             |

#### 4xx Error Rate by Endpoint

**Overall 4xx Error Rate**

```promql
# 4xx error rate as percentage
sum(rate(http_requests_total{status=~"4.."}[5m])) /
sum(rate(http_requests_total[5m])) * 100
```

**4xx Errors by Endpoint**

```promql
# 4xx errors grouped by endpoint
sum(rate(http_requests_total{status=~"4.."}[5m])) by (endpoint, status)
```

**Top 4xx Error Endpoints**

```promql
# Top 10 endpoints with highest 4xx rate
topk(10, sum(rate(http_requests_total{status=~"4.."}[5m])) by (endpoint))
```

#### Key 4xx Metrics Dashboard

| Metric   | PromQL Query                                       | Target |
| -------- | -------------------------------------------------- | ------ |
| 400 Rate | `sum(rate(http_requests_total{status="400"}[5m]))` | < 1%   |
| 401 Rate | `sum(rate(http_requests_total{status="401"}[5m]))` | < 5%   |
| 404 Rate | `sum(rate(http_requests_total{status="404"}[5m]))` | < 2%   |
| 429 Rate | `sum(rate(http_requests_total{status="429"}[5m]))` | < 0.1% |

---

### 5xx Errors (Server Errors)

#### Common 5xx Status Codes

| Status Code | Name                  | Description               | Typical Causes              |
| ----------- | --------------------- | ------------------------- | --------------------------- |
| 500         | Internal Server Error | Generic server error      | Unhandled exception, bug    |
| 502         | Bad Gateway           | Invalid upstream response | Backend down, timeout       |
| 503         | Service Unavailable   | Server overloaded         | Capacity issues, deployment |
| 504         | Gateway Timeout       | Upstream timeout          | Slow database, external API |

#### 5xx Error Rate by Endpoint

**Overall 5xx Error Rate**

```promql
# 5xx error rate as percentage
sum(rate(http_requests_total{status=~"5.."}[5m])) /
sum(rate(http_requests_total[5m])) * 100
```

**5xx Errors by Service**

```promql
# 5xx errors grouped by service
sum(rate(http_requests_total{status=~"5.."}[5m])) by (service, status)
```

**5xx Error Trend**

```promql
# 5xx error rate over time (for graphing)
sum(rate(http_requests_total{status=~"5.."}[5m]))
```

#### Critical 5xx Metrics

| Metric   | PromQL Query                                       | Critical Threshold |
| -------- | -------------------------------------------------- | ------------------ |
| 500 Rate | `sum(rate(http_requests_total{status="500"}[5m]))` | > 0.1%             |
| 502 Rate | `sum(rate(http_requests_total{status="502"}[5m]))` | > 0.05%            |
| 503 Rate | `sum(rate(http_requests_total{status="503"}[5m]))` | > 0.05%            |
| 504 Rate | `sum(rate(http_requests_total{status="504"}[5m]))` | > 0.1%             |

---

## Application Errors

### Uncaught Exceptions

#### Exception Metrics

| Metric                             | Description                            |
| ---------------------------------- | -------------------------------------- |
| `app_exceptions_total`             | Total uncaught exceptions              |
| `app_exceptions_total{type="..."}` | Exceptions by type                     |
| `nodejs_active_handles_total`      | Active handles (memory leak indicator) |

**Exception Rate**

```promql
# Exceptions per minute
rate(app_exceptions_total[5m]) * 60
```

**Exception Rate by Type**

```promql
# Exceptions grouped by type
sum(rate(app_exceptions_total[5m])) by (type, service)
```

#### Common Exception Types

| Type             | Description        | Investigation Steps              |
| ---------------- | ------------------ | -------------------------------- |
| `TypeError`      | Type mismatch      | Check null values, API responses |
| `ReferenceError` | Undefined variable | Code bug, missing initialization |
| `RangeError`     | Value out of range | Input validation                 |
| `SyntaxError`    | JSON parse error   | External data format             |
| `TimeoutError`   | Operation timeout  | Network, database issues         |

---

### Database Errors

#### PostgreSQL Errors

| Metric                               | Description           |
| ------------------------------------ | --------------------- |
| `pg_errors_total`                    | Total database errors |
| `pg_errors_total{type="connection"}` | Connection errors     |
| `pg_errors_total{type="query"}`      | Query errors          |
| `pg_errors_total{type="constraint"}` | Constraint violations |

**Database Error Rate**

```promql
# PostgreSQL errors per minute
rate(pg_errors_total[5m]) * 60
```

**Connection Errors**

```promql
# Connection errors (critical)
rate(pg_errors_total{type="connection"}[5m]) * 60
```

#### MongoDB Errors

**MongoDB Error Rate**

```promql
# MongoDB errors per minute
rate(mongodb_errors_total[5m]) * 60
```

#### Redis Errors

**Redis Error Rate**

```promql
# Redis errors per minute
rate(redis_errors_total[5m]) * 60
```

---

### External Service Errors

#### Third-Party API Errors

| Service          | Metric                                                 |
| ---------------- | ------------------------------------------------------ |
| Partner Catalogs | `external_api_errors_total{service="partner_catalog"}` |
| Payment Gateway  | `external_api_errors_total{service="payment"}`         |
| Email Service    | `external_api_errors_total{service="email"}`           |
| AI/ML Services   | `external_api_errors_total{service="ai"}`              |

**External Service Error Rate**

```promql
# External API errors by service
sum(rate(external_api_errors_total[5m])) by (service) * 60
```

**External Service Availability**

```promql
# External service success rate
sum(rate(external_api_requests_total{status="success"}[5m])) by (service) /
sum(rate(external_api_requests_total[5m])) by (service) * 100
```

---

## Error Classification

### Severity Levels

#### Critical Errors

**Definition:** Errors that cause service outage or data loss

| Criteria                 | Examples                   | Response Time |
| ------------------------ | -------------------------- | ------------- |
| Complete service failure | 503 across all endpoints   | Immediate     |
| Data corruption risk     | Database write failures    | Immediate     |
| Security breach          | Auth bypass detected       | Immediate     |
| Revenue impact           | Payment processing failure | < 5 minutes   |

**Critical Error Query**

```promql
# Critical error conditions
(
  sum(rate(http_requests_total{status="503"}[5m])) > 0.01
  or
  sum(rate(pg_errors_total{type="connection"}[5m])) > 0.1
  or
  sum(rate(app_exceptions_total{severity="critical"}[5m])) > 0
)
```

#### Major Errors

**Definition:** Errors affecting significant functionality

| Criteria            | Examples             | Response Time |
| ------------------- | -------------------- | ------------- |
| Feature degradation | AI service errors    | < 15 minutes  |
| Partial outage      | Single endpoint down | < 15 minutes  |
| Performance impact  | Response time > 5s   | < 30 minutes  |
| User impact         | Login failures > 5%  | < 30 minutes  |

**Major Error Query**

```promql
# Major error conditions
(
  sum(rate(http_requests_total{status="500"}[5m])) / sum(rate(http_requests_total[5m])) > 0.01
  or
  histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) > 5
)
```

#### Minor Errors

**Definition:** Errors with limited impact

| Criteria             | Examples                   | Response Time     |
| -------------------- | -------------------------- | ----------------- |
| Single user impact   | Individual request failure | Business hours    |
| Non-critical feature | Export function error      | Next business day |
| Warning conditions   | Cache miss rate high       | Monitor           |
| Cosmetic issues      | UI rendering error         | Backlog           |

---

## Error Trends and Patterns

### Trend Analysis

#### Error Rate Over Time

**Hourly Error Trend**

```promql
# Hourly error rate trend (for past 24h graph)
sum(increase(http_requests_total{status=~"5.."}[1h]))
```

**Daily Error Comparison**

```promql
# Today vs yesterday error rate
sum(rate(http_requests_total{status=~"5.."}[5m])) /
sum(rate(http_requests_total{status=~"5.."}[5m] offset 24h))
```

**Week Over Week Trend**

```promql
# This week vs last week
sum(increase(http_requests_total{status=~"5.."}[7d])) /
sum(increase(http_requests_total{status=~"5.."}[7d] offset 7d))
```

### Pattern Detection

#### Time-Based Patterns

| Pattern          | Indicator                 | Investigation           |
| ---------------- | ------------------------- | ----------------------- |
| Peak hour errors | Errors spike at 10am, 2pm | Capacity issues         |
| Nightly errors   | Errors spike at midnight  | Batch job issues        |
| Weekend patterns | Different error profile   | Different user behavior |
| Deploy-related   | Errors after deployments  | Code or config issue    |

**Peak Hour Analysis**

```promql
# Error rate by hour of day
sum(rate(http_requests_total{status=~"5.."}[5m])) by (hour_of_day)
```

#### Endpoint Patterns

**Most Error-Prone Endpoints**

```promql
# Top 10 endpoints by error count
topk(10, sum(increase(http_requests_total{status=~"5.."}[24h])) by (endpoint))
```

**Error Hotspots**

```promql
# Endpoints with highest error percentage
topk(10,
  sum(rate(http_requests_total{status=~"5.."}[5m])) by (endpoint) /
  sum(rate(http_requests_total[5m])) by (endpoint)
)
```

---

## MTTR Tracking

### Mean Time to Resolution (MTTR)

#### Definition

MTTR = Time from error detection to resolution

#### MTTR Components

```
MTTR = MTTD + MTTI + MTTF + MTTV

Where:
- MTTD = Mean Time to Detect (alert firing)
- MTTI = Mean Time to Investigate (root cause found)
- MTTF = Mean Time to Fix (fix implemented)
- MTTV = Mean Time to Verify (fix confirmed working)
```

#### MTTR Tracking Dashboard

| Metric               | Target       | Measurement                        |
| -------------------- | ------------ | ---------------------------------- |
| MTTD (Detection)     | < 5 min      | Alert timestamp - Error start time |
| MTTI (Investigation) | < 15 min     | RCA start - Alert timestamp        |
| MTTF (Fix)           | < 30 min     | Fix deployed - RCA start           |
| MTTV (Verification)  | < 10 min     | Verification - Fix deployed        |
| **Total MTTR**       | **< 60 min** | Resolution - Error start           |

#### MTTR Calculation

```promql
# Average resolution time (from PagerDuty metrics)
avg(pagerduty_incident_resolve_time_seconds) / 60  # in minutes
```

#### MTTR Targets by Severity

| Severity | Target MTTR | Escalation          |
| -------- | ----------- | ------------------- |
| Critical | < 30 min    | Immediate page      |
| Major    | < 2 hours   | Alert within 15 min |
| Minor    | < 24 hours  | Business hours      |

---

## Error Budget Calculations

### SLO-Based Error Budget

#### Service Level Objectives

| Service                 | SLO   | Error Budget (monthly) |
| ----------------------- | ----- | ---------------------- |
| API Availability        | 99.9% | 43.2 minutes           |
| API Latency (p99 < 1s)  | 99.5% | 3.6 hours              |
| AI Service Availability | 99.5% | 3.6 hours              |
| Design Load Success     | 99.0% | 7.2 hours              |

#### Error Budget Calculation

```
Monthly Error Budget = (1 - SLO) x Total Minutes in Month

For 99.9% SLO:
Error Budget = 0.001 x 43,200 = 43.2 minutes
```

#### Error Budget Consumption

**Current Error Budget Usage**

```promql
# Error budget consumed (percentage)
(1 - (
  sum(rate(http_requests_total{status!~"5.."}[30d])) /
  sum(rate(http_requests_total[30d]))
)) / 0.001 * 100
```

**Error Budget Burn Rate**

```promql
# Burn rate (1.0 = on track, >1.0 = burning too fast)
(1 - (
  sum(rate(http_requests_total{status!~"5.."}[1h])) /
  sum(rate(http_requests_total[1h]))
)) / (0.001 / 720)  # 720 hours in 30 days
```

#### Error Budget Alert Thresholds

| Condition                           | Action                                |
| ----------------------------------- | ------------------------------------- |
| Budget > 50% consumed in first week | Review recent changes                 |
| Budget > 75% consumed               | Freeze non-critical deployments       |
| Budget exhausted                    | Emergency review, postmortem required |
| Budget burn rate > 2x               | Page on-call engineer                 |

---

## Alert Rules for Error Spikes

### Alert Configuration

#### High Error Rate Alert

```yaml
groups:
  - name: error_alerts
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m])) /
          sum(rate(http_requests_total[5m])) > 0.01
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: 'High error rate detected'
          description: 'Error rate is {{ $value | humanizePercentage }}'
          runbook_url: 'https://runbooks.kitchenxpert.internal/high-error-rate'
```

#### Error Spike Detection

```yaml
- alert: ErrorRateSpike
  expr: |
    (sum(rate(http_requests_total{status=~"5.."}[5m])) /
    sum(rate(http_requests_total{status=~"5.."}[5m] offset 1h))) > 3
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: 'Error rate spike detected'
    description: 'Error rate is {{ $value }}x higher than 1 hour ago'
```

#### Critical Service Errors

```yaml
- alert: CriticalServiceDown
  expr: |
    sum(rate(http_requests_total{status="503", service="backend"}[1m])) > 0.1
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: 'Critical service returning 503'
    description: 'Backend service is returning 503 errors'
```

#### Database Connection Errors

```yaml
- alert: DatabaseConnectionErrors
  expr: |
    rate(pg_errors_total{type="connection"}[5m]) > 0.1
  for: 2m
  labels:
    severity: critical
  annotations:
    summary: 'Database connection errors'
    description: 'PostgreSQL connection errors detected'
```

#### External Service Failures

```yaml
- alert: ExternalServiceFailure
  expr: |
    sum(rate(external_api_errors_total[5m])) by (service) /
    sum(rate(external_api_requests_total[5m])) by (service) > 0.1
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: 'External service {{ $labels.service }} failing'
    description: 'Error rate: {{ $value | humanizePercentage }}'
```

### Alert Routing Rules

```yaml
route:
  group_by: ['alertname', 'service']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'slack-warnings'
  routes:
    - match:
        severity: critical
      receiver: 'pagerduty-critical'
      continue: true
    - match:
        severity: critical
      receiver: 'slack-critical'
    - match:
        severity: warning
      receiver: 'slack-warnings'
```

---

## Grafana Error Dashboard

**URL:** https://grafana.kitchenxpert.internal/d/errors

[Dashboard: Error Metrics Overview - Error rates, trends, and breakdown]

### Dashboard Panels

1. **Error Rate Overview:** Real-time 5xx error rate
2. **Error by Status Code:** Breakdown of 4xx and 5xx codes
3. **Top Error Endpoints:** Table of highest error endpoints
4. **Error Trend (24h):** Graph of error rate over time
5. **Error Budget Consumption:** Gauge of budget used
6. **Exception Types:** Pie chart of exception types
7. **Database Errors:** PostgreSQL, MongoDB, Redis errors
8. **External Service Errors:** Third-party API failure rates
9. **Recent Error Logs:** Embedded log panel

---

## Related Documentation

- [Monitoring Overview](../overview.md)
- [System Metrics](./system-metrics.md)
- [Business Metrics](./business-metrics.md)
- [Alert Rules](../alerting/alert-rules.md)
- [Error Dashboard](../dashboards/error-dashboard.md)
- [Log Analysis](../logging/log-analysis.md)
- [Incident Response](/docs/operations/incident-response.md)

---

_For questions about error metrics, contact the SRE team at
sre@kitchenxpert.com_
