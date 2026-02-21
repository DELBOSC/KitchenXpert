# Log Analysis Documentation

> Comprehensive guide to log querying, analysis, and incident investigation for KitchenXpert.

**Last Updated:** 2026-01-10
**Owner:** Platform Engineering Team
**Version:** 1.0

---

## Table of Contents

1. [Kibana Query Syntax (KQL)](#kibana-query-syntax-kql)
2. [Common Log Queries](#common-log-queries)
3. [Log-Based Alerting](#log-based-alerting)
4. [Anomaly Detection](#anomaly-detection)
5. [Creating Visualizations](#creating-visualizations)
6. [Incident Investigation Workflow](#incident-investigation-workflow)
7. [Related Documentation](#related-documentation)

---

## Kibana Query Syntax (KQL)

### Basic Syntax

KQL (Kibana Query Language) is the primary query language for searching logs in Kibana.

#### Field Queries

```
# Exact match
level: error

# Multiple values (OR)
level: (error OR fatal)

# Wildcard
message: *timeout*

# Exists check
userId: *

# Does not exist
NOT userId: *
```

#### Text Search

```
# Full-text search
message: "database connection failed"

# Phrase search (exact)
message: "connection timeout"

# Any word
message: connection OR timeout
```

#### Range Queries

```
# Numeric range
context.duration >= 1000

# Date range
@timestamp >= "2026-01-10T00:00:00" AND @timestamp < "2026-01-11T00:00:00"

# Relative time (use time picker instead)
# Not directly in KQL, use Kibana time picker
```

#### Logical Operators

```
# AND (implicit)
level: error service: backend

# AND (explicit)
level: error AND service: backend

# OR
level: error OR level: fatal

# NOT
level: error AND NOT service: health-check

# Grouping
(level: error OR level: fatal) AND service: backend
```

### Advanced Queries

#### Nested Field Queries

```
# Nested object fields
context.statusCode: 500
error.name: "PostgresError"
error.code: "ETIMEDOUT"
```

#### Wildcard Patterns

```
# Wildcard in field value
context.path: /api/v1/*

# Wildcard in field name (Lucene syntax)
context.user*: "john"
```

#### Regular Expressions (Lucene)

```
# Lucene regex syntax
message: /.*timeout.*/
context.path: /\/api\/v[12]\/.*/
```

### Query Examples by Use Case

| Use Case | KQL Query |
|----------|-----------|
| All errors | `level: (error OR fatal)` |
| Backend errors | `level: error AND service: backend` |
| 500 errors | `context.statusCode: 500` |
| Slow requests | `context.duration >= 1000` |
| Specific user | `userId: "user_abc123"` |
| Specific trace | `traceId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"` |
| Database errors | `error.name: *Postgres* OR error.name: *Mongo*` |
| Authentication | `message: *auth* OR message: *login*` |

---

## Common Log Queries

### Find All Errors in Last Hour

**KQL:**
```
level: (error OR fatal)
```

**Time Range:** Last 1 hour (set in time picker)

**Useful Columns:**
- @timestamp
- service
- message
- error.name
- error.message
- traceId

**Elasticsearch DSL:**
```json
{
  "query": {
    "bool": {
      "must": [
        {
          "range": {
            "@timestamp": {
              "gte": "now-1h"
            }
          }
        }
      ],
      "filter": [
        {
          "terms": {
            "level": ["error", "fatal"]
          }
        }
      ]
    }
  },
  "sort": [
    { "@timestamp": "desc" }
  ],
  "size": 100
}
```

---

### Track User Journey by userId

**KQL:**
```
userId: "user_abc123"
```

**Time Range:** As needed (last 24 hours typical)

**Sort:** @timestamp ascending (chronological order)

**Useful Columns:**
- @timestamp
- service
- message
- context.path
- context.method

**Elasticsearch DSL:**
```json
{
  "query": {
    "bool": {
      "must": [
        {
          "term": {
            "userId": "user_abc123"
          }
        }
      ]
    }
  },
  "sort": [
    { "@timestamp": "asc" }
  ],
  "size": 500
}
```

---

### Find Slow Requests (> 1 second)

**KQL:**
```
context.duration > 1000
```

**Time Range:** Last 24 hours

**Sort:** context.duration descending (slowest first)

**Useful Columns:**
- @timestamp
- service
- context.path
- context.method
- context.duration
- context.statusCode

**Elasticsearch DSL:**
```json
{
  "query": {
    "bool": {
      "must": [
        {
          "range": {
            "@timestamp": {
              "gte": "now-24h"
            }
          }
        },
        {
          "range": {
            "context.duration": {
              "gt": 1000
            }
          }
        }
      ]
    }
  },
  "sort": [
    { "context.duration": "desc" }
  ],
  "size": 100
}
```

---

### Error Patterns by Endpoint

**KQL:**
```
level: error AND context.path: *
```

**Aggregation:** Terms aggregation on `context.path.keyword`

**Elasticsearch DSL:**
```json
{
  "query": {
    "bool": {
      "must": [
        {
          "term": {
            "level": "error"
          }
        },
        {
          "range": {
            "@timestamp": {
              "gte": "now-24h"
            }
          }
        }
      ]
    }
  },
  "aggs": {
    "error_by_endpoint": {
      "terms": {
        "field": "context.path.keyword",
        "size": 20,
        "order": {
          "_count": "desc"
        }
      }
    }
  },
  "size": 0
}
```

---

### Database Errors

**KQL:**
```
(error.name: *Postgres* OR error.name: *Mongo* OR error.name: *Redis* OR message: *database*)
```

**Elasticsearch DSL:**
```json
{
  "query": {
    "bool": {
      "should": [
        { "wildcard": { "error.name": "*Postgres*" } },
        { "wildcard": { "error.name": "*Mongo*" } },
        { "wildcard": { "error.name": "*Redis*" } },
        { "match": { "message": "database" } }
      ],
      "minimum_should_match": 1
    }
  }
}
```

---

### External Service Failures

**KQL:**
```
(context.service: partner* OR context.service: external* OR message: *external API*)
AND level: error
```

---

### Authentication Issues

**KQL:**
```
(message: *auth* OR message: *login* OR message: *token* OR context.path: */auth/*)
AND level: (warn OR error)
```

---

## Log-Based Alerting

### Elasticsearch Watcher Configuration

#### High Error Rate Alert

```json
PUT _watcher/watch/high-error-rate
{
  "trigger": {
    "schedule": {
      "interval": "5m"
    }
  },
  "input": {
    "search": {
      "request": {
        "indices": ["logs-*"],
        "body": {
          "query": {
            "bool": {
              "must": [
                {
                  "range": {
                    "@timestamp": {
                      "gte": "now-5m"
                    }
                  }
                },
                {
                  "term": {
                    "level": "error"
                  }
                }
              ]
            }
          }
        }
      }
    }
  },
  "condition": {
    "compare": {
      "ctx.payload.hits.total.value": {
        "gt": 100
      }
    }
  },
  "actions": {
    "notify_slack": {
      "webhook": {
        "scheme": "https",
        "host": "hooks.slack.com",
        "port": 443,
        "method": "post",
        "path": "/services/xxx/xxx/xxx",
        "headers": {
          "Content-Type": "application/json"
        },
        "body": "{{#toJson}}{'text': 'High error rate detected: {{ctx.payload.hits.total.value}} errors in last 5 minutes'}{{/toJson}}"
      }
    }
  }
}
```

#### Specific Error Pattern Alert

```json
PUT _watcher/watch/database-connection-errors
{
  "trigger": {
    "schedule": {
      "interval": "1m"
    }
  },
  "input": {
    "search": {
      "request": {
        "indices": ["logs-*"],
        "body": {
          "query": {
            "bool": {
              "must": [
                {
                  "range": {
                    "@timestamp": {
                      "gte": "now-5m"
                    }
                  }
                },
                {
                  "match": {
                    "error.name": "PostgresError"
                  }
                },
                {
                  "match": {
                    "error.code": "ECONNREFUSED"
                  }
                }
              ]
            }
          }
        }
      }
    }
  },
  "condition": {
    "compare": {
      "ctx.payload.hits.total.value": {
        "gt": 5
      }
    }
  },
  "actions": {
    "pagerduty": {
      "pagerduty": {
        "routing_key": "{{ctx.metadata.pagerduty_key}}",
        "event_action": "trigger",
        "dedup_key": "database-connection-error",
        "payload": {
          "summary": "Database connection errors detected",
          "severity": "critical",
          "source": "elasticsearch-watcher"
        }
      }
    }
  }
}
```

### Kibana Alerting Rules

**Navigate to:** Kibana > Stack Management > Rules and Connectors

#### Create Log Threshold Rule

1. **Rule Type:** Log threshold
2. **Conditions:**
   - Count of `level: error` is above 50
   - FOR the last 5 minutes
   - GROUP BY `service.keyword`
3. **Actions:**
   - Slack notification to #alerts-critical
   - PagerDuty for critical services

---

## Anomaly Detection

### Machine Learning Jobs

#### Error Rate Anomaly Detection

```json
PUT _ml/anomaly_detectors/error-rate-anomaly
{
  "description": "Detect unusual error rates",
  "analysis_config": {
    "bucket_span": "15m",
    "detectors": [
      {
        "function": "count",
        "partition_field_name": "service.keyword"
      }
    ],
    "influencers": ["service.keyword", "context.path.keyword"]
  },
  "data_description": {
    "time_field": "@timestamp"
  },
  "datafeed_config": {
    "indices": ["logs-*"],
    "query": {
      "bool": {
        "filter": [
          { "term": { "level": "error" } }
        ]
      }
    }
  }
}
```

#### Response Time Anomaly Detection

```json
PUT _ml/anomaly_detectors/response-time-anomaly
{
  "description": "Detect unusual response times",
  "analysis_config": {
    "bucket_span": "15m",
    "detectors": [
      {
        "function": "high_mean",
        "field_name": "context.duration",
        "partition_field_name": "context.path.keyword"
      }
    ],
    "influencers": ["service.keyword", "context.path.keyword"]
  },
  "data_description": {
    "time_field": "@timestamp"
  },
  "datafeed_config": {
    "indices": ["logs-*"],
    "query": {
      "bool": {
        "must": [
          { "exists": { "field": "context.duration" } }
        ]
      }
    }
  }
}
```

### Viewing Anomalies

**Navigate to:** Kibana > Machine Learning > Anomaly Explorer

**Anomaly Score Interpretation:**
| Score | Severity | Action |
|-------|----------|--------|
| 0-25 | Low | Monitor |
| 25-50 | Warning | Investigate if persistent |
| 50-75 | Minor | Investigate within 1 hour |
| 75-100 | Critical | Investigate immediately |

---

## Creating Visualizations

### Error Count Over Time

**Visualization Type:** Line chart

**Configuration:**
```yaml
Index Pattern: logs-*
Metrics:
  - Y-axis: Count
Buckets:
  - X-axis: Date Histogram (@timestamp, interval: auto)
  - Split Series: Terms (level.keyword)
Filters:
  - level: (error OR warn)
```

### Top Error Endpoints

**Visualization Type:** Horizontal bar chart

**Configuration:**
```yaml
Index Pattern: logs-*
Metrics:
  - Y-axis: Count
Buckets:
  - X-axis: Terms (context.path.keyword, top 10)
Filters:
  - level: error
```

### Error Distribution by Service

**Visualization Type:** Pie chart

**Configuration:**
```yaml
Index Pattern: logs-*
Metrics:
  - Slice Size: Count
Buckets:
  - Split Slices: Terms (service.keyword)
Filters:
  - level: error
```

### Response Time Heatmap

**Visualization Type:** Heat map

**Configuration:**
```yaml
Index Pattern: logs-*
Metrics:
  - Value: Average (context.duration)
Buckets:
  - X-axis: Date Histogram (@timestamp, interval: 1h)
  - Y-axis: Terms (context.path.keyword, top 20)
```

### Geographic Error Distribution

**Visualization Type:** Map

**Configuration:**
```yaml
Index Pattern: logs-*
Layer: Documents
Metrics:
  - Count
Join Field: geo.location
Filters:
  - level: error
```

---

## Incident Investigation Workflow

### Step-by-Step Investigation Process

#### 1. Identify the Scope

**Initial Query:**
```
level: (error OR fatal)
```

**Questions to Answer:**
- When did errors start?
- Which services are affected?
- What's the error rate compared to normal?

**Actions:**
1. Set time range to span the incident
2. Look at error count over time
3. Group by service to identify affected components

#### 2. Narrow Down to Affected Service

**Query:**
```
level: error AND service: "affected-service"
```

**Questions to Answer:**
- What types of errors are occurring?
- Which endpoints are failing?
- Is it affecting all users or specific users?

**Actions:**
1. Look at top error messages
2. Check endpoint distribution
3. Sample specific error logs for details

#### 3. Find the Root Cause

**Query for Error Details:**
```
level: error AND service: "affected-service" AND error.stack: *
```

**Trace a Single Request:**
```
traceId: "trace-id-from-error"
```

**Questions to Answer:**
- What's the stack trace showing?
- What downstream services are involved?
- What changed recently (deployments, config)?

**Actions:**
1. Find common error stack traces
2. Follow trace IDs across services
3. Check for correlated events (deployments, config changes)

#### 4. Understand User Impact

**Query:**
```
level: error AND service: "affected-service" AND userId: *
```

**Questions to Answer:**
- How many users are affected?
- Are specific users repeatedly affected?
- What actions were users trying to perform?

**Actions:**
1. Count distinct userIds affected
2. Track user journeys for affected users
3. Identify the user action that triggers errors

#### 5. Document Findings

**Create Incident Timeline:**
```
| Time | Event |
|------|-------|
| 14:00 | First error logged |
| 14:05 | Error rate spike detected |
| 14:10 | Service: database connection errors |
| 14:15 | Root cause: PostgreSQL max connections |
| 14:20 | Fix deployed |
| 14:25 | Error rate returned to normal |
```

### Investigation Queries Cheat Sheet

| Stage | Query |
|-------|-------|
| All errors | `level: (error OR fatal)` |
| By service | `level: error AND service: "X"` |
| By endpoint | `level: error AND context.path: "/api/X"` |
| By user | `userId: "X" AND level: error` |
| By trace | `traceId: "X"` |
| With stack | `error.stack: * AND level: error` |
| Slow requests | `context.duration > 1000` |
| Database errors | `error.name: *Postgres*` |
| External failures | `context.service: external*` |

### Saved Investigation Dashboards

| Dashboard | URL | Purpose |
|-----------|-----|---------|
| Error Overview | https://kibana.kitchenxpert.internal/app/dashboards#/view/error-overview | Initial triage |
| Service Deep Dive | https://kibana.kitchenxpert.internal/app/dashboards#/view/service-dive | Per-service analysis |
| User Journey | https://kibana.kitchenxpert.internal/app/dashboards#/view/user-journey | Track user activity |
| Performance | https://kibana.kitchenxpert.internal/app/dashboards#/view/performance | Response time analysis |

---

## Related Documentation

- [Log Structure](./log-structure.md)
- [Log Levels Guide](./log-levels.md)
- [Centralized Logging Setup](./centralized-logging.md)
- [Incident Response](/docs/operations/incident-response.md)
- [Error Dashboard](../dashboards/error-dashboard.md)

---

*For questions about log analysis, contact the Platform Engineering team at platform@kitchenxpert.com*
