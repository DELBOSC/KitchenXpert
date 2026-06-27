# Centralized Logging Setup

> Comprehensive guide to the ELK Stack architecture and centralized logging
> infrastructure for KitchenXpert.

**Last Updated:** 2026-01-10 **Owner:** Platform Engineering Team **Version:**
1.0

---

## Table of Contents

1. [ELK Stack Architecture](#elk-stack-architecture)
2. [Log Shipping](#log-shipping)
3. [Index Patterns and Lifecycle (ILM)](#index-patterns-and-lifecycle-ilm)
4. [Kibana Saved Searches](#kibana-saved-searches)
5. [Access Control](#access-control)
6. [Related Documentation](#related-documentation)

---

## ELK Stack Architecture

### Overview

The ELK Stack (Elasticsearch, Logstash, Kibana) provides centralized log
management for all KitchenXpert services.

### Architecture Diagram

```
+------------------+     +------------------+     +------------------+
|                  |     |                  |     |                  |
|  Backend Pods    |     |  Frontend        |     |  AI Service      |
|  (Node.js)       |     |  (Browser/SSR)   |     |  (Python)        |
|                  |     |                  |     |                  |
+--------+---------+     +--------+---------+     +--------+---------+
         |                        |                        |
         v                        v                        v
+--------+---------+     +--------+---------+     +--------+---------+
|                  |     |                  |     |                  |
|    Filebeat      |     |    Log API       |     |    Fluentd       |
|  (Log Shipper)   |     |   (Collector)    |     | (Container Logs) |
|                  |     |                  |     |                  |
+--------+---------+     +--------+---------+     +--------+---------+
         |                        |                        |
         +------------------------+------------------------+
                                  |
                                  v
                    +-------------+-------------+
                    |                           |
                    |      Kafka / Redis        |
                    |      (Buffer Queue)       |
                    |                           |
                    +-------------+-------------+
                                  |
                                  v
                    +-------------+-------------+
                    |                           |
                    |        Logstash           |
                    |   (Processing Pipeline)   |
                    |                           |
                    +-------------+-------------+
                                  |
                                  v
                    +-------------+-------------+
                    |                           |
                    |      Elasticsearch        |
                    |   (Storage & Search)      |
                    |                           |
                    +-------------+-------------+
                                  |
                                  v
                    +-------------+-------------+
                    |                           |
                    |         Kibana            |
                    |    (Visualization)        |
                    |                           |
                    +---------------------------+
```

### Component Details

#### Elasticsearch

**Purpose:** Log storage, indexing, and full-text search

**Cluster Configuration:**

```yaml
# elasticsearch.yml
cluster.name: kitchenxpert-logs
node.name: es-node-${NODE_ID}

# Network
network.host: 0.0.0.0
http.port: 9200
transport.port: 9300

# Discovery
discovery.seed_hosts:
  - es-master-0.elasticsearch
  - es-master-1.elasticsearch
  - es-master-2.elasticsearch
cluster.initial_master_nodes:
  - es-master-0
  - es-master-1
  - es-master-2

# Memory
bootstrap.memory_lock: true

# Security
xpack.security.enabled: true
xpack.security.transport.ssl.enabled: true
xpack.security.http.ssl.enabled: true
```

**Cluster Topology:** | Node Type | Count | CPU | Memory | Storage |
|-----------|-------|-----|--------|---------| | Master | 3 | 2 cores | 4GB |
50GB SSD | | Hot Data | 3 | 8 cores | 32GB | 1TB NVMe | | Warm Data | 2 | 4
cores | 16GB | 4TB HDD | | Cold Data | 2 | 2 cores | 8GB | 8TB HDD | |
Coordinating | 2 | 4 cores | 8GB | 100GB SSD |

**Access URL:** https://elasticsearch.kitchenxpert.internal:9200

#### Logstash

**Purpose:** Log processing, parsing, enrichment, and transformation

**Pipeline Configuration:**

```ruby
# logstash.conf

input {
  # From Kafka
  kafka {
    bootstrap_servers => "kafka-1:9092,kafka-2:9092,kafka-3:9092"
    topics => ["kitchenxpert-logs"]
    group_id => "logstash-consumers"
    codec => json
    consumer_threads => 4
  }

  # Direct beats input (backup)
  beats {
    port => 5044
    ssl => true
    ssl_certificate => "/etc/logstash/ssl/logstash.crt"
    ssl_key => "/etc/logstash/ssl/logstash.key"
  }
}

filter {
  # Parse JSON if not already parsed
  if ![message][timestamp] {
    json {
      source => "message"
      target => "parsed"
    }
    mutate {
      rename => { "[parsed]" => "[@metadata][parsed]" }
    }
  }

  # Extract fields
  mutate {
    add_field => {
      "service" => "%{[service]}"
      "level" => "%{[level]}"
      "environment" => "%{[environment]}"
    }
  }

  # Parse timestamp
  date {
    match => [ "timestamp", "ISO8601" ]
    target => "@timestamp"
  }

  # Geolocate IP addresses
  if [context][clientIp] {
    geoip {
      source => "[context][clientIp]"
      target => "[geo]"
    }
  }

  # Parse user agent
  if [context][userAgent] {
    useragent {
      source => "[context][userAgent]"
      target => "[ua]"
    }
  }

  # Enrich with Kubernetes metadata
  if [kubernetes] {
    mutate {
      add_field => {
        "k8s_namespace" => "%{[kubernetes][namespace]}"
        "k8s_pod" => "%{[kubernetes][pod][name]}"
        "k8s_container" => "%{[kubernetes][container][name]}"
      }
    }
  }

  # Calculate log level numeric value for sorting
  translate {
    field => "level"
    destination => "level_value"
    dictionary => {
      "debug" => "10"
      "info" => "20"
      "warn" => "30"
      "error" => "40"
      "fatal" => "50"
    }
  }

  # Remove sensitive fields
  prune {
    blacklist_names => ["password", "apiKey", "token", "secret"]
  }
}

output {
  elasticsearch {
    hosts => ["https://elasticsearch.kitchenxpert.internal:9200"]
    user => "${ES_USER}"
    password => "${ES_PASSWORD}"
    ssl => true
    cacert => "/etc/logstash/ssl/ca.crt"

    # Dynamic index based on service and date
    index => "logs-%{service}-%{+YYYY.MM.dd}"

    # Use ILM
    ilm_enabled => true
    ilm_rollover_alias => "logs-%{service}"
    ilm_pattern => "{now/d}-000001"
    ilm_policy => "kitchenxpert-logs-policy"
  }

  # Dead letter queue for failed events
  dead_letter_queue {
    path => "/var/logstash/dlq"
  }
}
```

**Scaling:**

- 4 Logstash nodes for high availability
- Auto-scaling based on queue depth
- Pipeline workers: 8 per node

#### Kibana

**Purpose:** Log visualization, search, and analysis

**Configuration:**

```yaml
# kibana.yml
server.name: kibana
server.host: '0.0.0.0'
server.port: 5601

elasticsearch.hosts:
  - 'https://elasticsearch.kitchenxpert.internal:9200'
elasticsearch.username: '${ES_USER}'
elasticsearch.password: '${ES_PASSWORD}'
elasticsearch.ssl.certificateAuthorities: ['/etc/kibana/ssl/ca.crt']

# Security
xpack.security.enabled: true
xpack.encryptedSavedObjects.encryptionKey: '${ENCRYPTION_KEY}'

# Spaces
xpack.spaces.enabled: true

# Reporting
xpack.reporting.enabled: true
xpack.reporting.kibanaServer.hostname: 'kibana.kitchenxpert.internal'

# Monitoring
monitoring.enabled: true
monitoring.kibana.collection.enabled: true
```

**Access URL:** https://kibana.kitchenxpert.internal

---

## Log Shipping

### Filebeat (File-Based Logs)

**Purpose:** Ships log files from application servers to the logging pipeline

**Configuration:**

```yaml
# filebeat.yml

filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/log/kitchenxpert/*.log
      - /var/log/kitchenxpert/**/*.log

    # JSON parsing
    json.keys_under_root: true
    json.add_error_key: true
    json.message_key: message

    # Multiline for stack traces
    multiline.type: pattern
    multiline.pattern: '^\s+at\s'
    multiline.negate: false
    multiline.match: after

    # Fields
    fields:
      log_type: application
      environment: '${ENVIRONMENT}'
    fields_under_root: true

    # Harvester settings
    close_inactive: 5m
    scan_frequency: 10s

  - type: log
    enabled: true
    paths:
      - /var/log/nginx/access.log

    fields:
      log_type: nginx_access
    fields_under_root: true

# Processors
processors:
  - add_host_metadata:
      when.not.contains.tags: forwarded
  - add_cloud_metadata: ~
  - add_docker_metadata: ~
  - add_kubernetes_metadata: ~

# Output to Kafka
output.kafka:
  hosts:
    - 'kafka-1:9092'
    - 'kafka-2:9092'
    - 'kafka-3:9092'
  topic: 'kitchenxpert-logs'
  partition.round_robin:
    reachable_only: true
  required_acks: 1
  compression: gzip
  max_message_bytes: 1000000

# Monitoring
monitoring:
  enabled: true
  elasticsearch:
    hosts: ['https://elasticsearch.kitchenxpert.internal:9200']
```

**Deployment:**

- Deployed as DaemonSet on all application nodes
- Resource limits: 200m CPU, 256MB memory

### Fluentd (Container Logs)

**Purpose:** Collects and forwards container logs from Kubernetes

**Configuration:**

```yaml
# fluent.conf

<source>
  @type tail
  path /var/log/containers/*.log
  pos_file /var/log/fluentd-containers.log.pos
  tag kubernetes.*
  read_from_head true
  <parse>
    @type multi_format
    <pattern>
      format json
      time_key time
      time_format %Y-%m-%dT%H:%M:%S.%NZ
    </pattern>
    <pattern>
      format /^(?<time>.+) (?<stream>stdout|stderr) [^ ]* (?<log>.*)$/
      time_format %Y-%m-%dT%H:%M:%S.%N%:z
    </pattern>
  </parse>
</source>

# Kubernetes metadata enrichment
<filter kubernetes.**>
  @type kubernetes_metadata
  kubernetes_url "#{ENV['KUBERNETES_SERVICE_HOST']}"
  cache_size 1000
  watch true
  de_dot true
  annotation_match ["fluentd.io/*"]
</filter>

# Parse JSON logs
<filter kubernetes.**>
  @type parser
  key_name log
  reserve_data true
  remove_key_name_field true
  <parse>
    @type json
  </parse>
</filter>

# Add service label
<filter kubernetes.**>
  @type record_transformer
  enable_ruby true
  <record>
    service ${record.dig("kubernetes", "labels", "app") || "unknown"}
    environment ${record.dig("kubernetes", "namespace_labels", "environment") || "unknown"}
  </record>
</filter>

# Output to Kafka
<match kubernetes.**>
  @type kafka2
  brokers kafka-1:9092,kafka-2:9092,kafka-3:9092
  topic_key topic
  default_topic kitchenxpert-logs

  <format>
    @type json
  </format>

  <buffer topic>
    @type file
    path /var/log/fluentd-buffer
    flush_interval 5s
    chunk_limit_size 5MB
    total_limit_size 1GB
    overflow_action drop_oldest_chunk
  </buffer>
</match>
```

**Deployment:**

```yaml
# Kubernetes DaemonSet
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluentd
  namespace: logging
spec:
  selector:
    matchLabels:
      name: fluentd
  template:
    spec:
      serviceAccountName: fluentd
      tolerations:
        - key: node-role.kubernetes.io/master
          effect: NoSchedule
      containers:
        - name: fluentd
          image: fluent/fluentd-kubernetes-daemonset:v1.16-debian-kafka
          resources:
            limits:
              memory: 512Mi
              cpu: 500m
            requests:
              memory: 256Mi
              cpu: 100m
          volumeMounts:
            - name: varlog
              mountPath: /var/log
            - name: varlibdockercontainers
              mountPath: /var/lib/docker/containers
              readOnly: true
            - name: config
              mountPath: /fluentd/etc
      volumes:
        - name: varlog
          hostPath:
            path: /var/log
        - name: varlibdockercontainers
          hostPath:
            path: /var/lib/docker/containers
        - name: config
          configMap:
            name: fluentd-config
```

---

## Index Patterns and Lifecycle (ILM)

### Index Naming Convention

```
logs-{service}-{date}

Examples:
- logs-backend-2026.01.10
- logs-ai-service-2026.01.10
- logs-frontend-2026.01.10
```

### Index Template

```json
PUT _index_template/logs-template
{
  "index_patterns": ["logs-*"],
  "template": {
    "settings": {
      "number_of_shards": 3,
      "number_of_replicas": 1,
      "index.lifecycle.name": "kitchenxpert-logs-policy",
      "index.lifecycle.rollover_alias": "logs",
      "index.refresh_interval": "5s",
      "index.translog.durability": "async",
      "index.translog.sync_interval": "30s"
    },
    "mappings": {
      "properties": {
        "@timestamp": {
          "type": "date"
        },
        "timestamp": {
          "type": "date"
        },
        "level": {
          "type": "keyword"
        },
        "level_value": {
          "type": "integer"
        },
        "service": {
          "type": "keyword"
        },
        "environment": {
          "type": "keyword"
        },
        "message": {
          "type": "text",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 256
            }
          }
        },
        "traceId": {
          "type": "keyword"
        },
        "spanId": {
          "type": "keyword"
        },
        "userId": {
          "type": "keyword"
        },
        "requestId": {
          "type": "keyword"
        },
        "context": {
          "type": "object",
          "dynamic": true
        },
        "error": {
          "properties": {
            "name": { "type": "keyword" },
            "message": { "type": "text" },
            "stack": { "type": "text" },
            "code": { "type": "keyword" }
          }
        },
        "geo": {
          "properties": {
            "location": { "type": "geo_point" },
            "country_name": { "type": "keyword" },
            "city_name": { "type": "keyword" }
          }
        }
      }
    }
  },
  "priority": 100
}
```

### Index Lifecycle Management (ILM) Policy

```json
PUT _ilm/policy/kitchenxpert-logs-policy
{
  "policy": {
    "phases": {
      "hot": {
        "min_age": "0ms",
        "actions": {
          "rollover": {
            "max_primary_shard_size": "50GB",
            "max_age": "1d"
          },
          "set_priority": {
            "priority": 100
          }
        }
      },
      "warm": {
        "min_age": "7d",
        "actions": {
          "shrink": {
            "number_of_shards": 1
          },
          "forcemerge": {
            "max_num_segments": 1
          },
          "set_priority": {
            "priority": 50
          },
          "allocate": {
            "require": {
              "data": "warm"
            }
          }
        }
      },
      "cold": {
        "min_age": "30d",
        "actions": {
          "set_priority": {
            "priority": 0
          },
          "allocate": {
            "require": {
              "data": "cold"
            }
          },
          "freeze": {}
        }
      },
      "delete": {
        "min_age": "365d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}
```

### Lifecycle Phases Summary

| Phase      | Age        | Storage  | Actions                               |
| ---------- | ---------- | -------- | ------------------------------------- |
| **Hot**    | 0-7 days   | NVMe SSD | Full indexing, fastest queries        |
| **Warm**   | 7-30 days  | SSD      | Shrink, force merge, reduced replicas |
| **Cold**   | 30-90 days | HDD      | Frozen, searchable but slow           |
| **Delete** | > 365 days | -        | Permanently deleted                   |

### Retention by Log Type

| Log Type         | Hot | Warm | Cold | Delete  |
| ---------------- | --- | ---- | ---- | ------- |
| Application logs | 7d  | 30d  | 90d  | 365d    |
| Audit logs       | 30d | 90d  | 365d | 7 years |
| Security logs    | 30d | 90d  | 365d | 7 years |
| Debug logs       | 3d  | 7d   | -    | 30d     |
| Access logs      | 7d  | 30d  | 90d  | 365d    |

---

## Kibana Saved Searches

### Pre-configured Searches

#### All Errors (Last Hour)

```json
{
  "name": "All Errors - Last Hour",
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
  "sort": [{ "@timestamp": "desc" }]
}
```

**Kibana KQL:** `level:(error OR fatal) AND @timestamp >= now-1h`

#### Slow Requests (> 1s)

```json
{
  "name": "Slow Requests - Last 24h",
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
  "sort": [{ "context.duration": "desc" }]
}
```

**Kibana KQL:** `context.duration > 1000 AND @timestamp >= now-24h`

#### User Journey

```json
{
  "name": "User Journey by UserID",
  "query": {
    "bool": {
      "must": [
        {
          "term": {
            "userId": "{{USER_ID}}"
          }
        }
      ]
    }
  },
  "sort": [{ "@timestamp": "asc" }]
}
```

**Kibana KQL:** `userId:"user_abc123"`

#### Service Errors by Endpoint

```json
{
  "name": "Errors by Endpoint",
  "query": {
    "bool": {
      "must": [
        {
          "term": {
            "level": "error"
          }
        }
      ]
    }
  },
  "aggs": {
    "by_endpoint": {
      "terms": {
        "field": "context.path.keyword",
        "size": 20
      }
    }
  }
}
```

### Saved Search URLs

| Search           | URL                                                                    |
| ---------------- | ---------------------------------------------------------------------- |
| All Errors       | https://kibana.kitchenxpert.internal/app/discover#/view/errors-all     |
| Backend Errors   | https://kibana.kitchenxpert.internal/app/discover#/view/errors-backend |
| Slow Requests    | https://kibana.kitchenxpert.internal/app/discover#/view/slow-requests  |
| Authentication   | https://kibana.kitchenxpert.internal/app/discover#/view/auth-logs      |
| Database Queries | https://kibana.kitchenxpert.internal/app/discover#/view/database-logs  |

---

## Access Control

### Role-Based Access

| Role              | Indices             | Kibana Access        |
| ----------------- | ------------------- | -------------------- |
| Admin             | All                 | Full access          |
| Platform Engineer | All                 | Full access          |
| Developer         | Service-specific    | Discover, Dashboards |
| Operations        | All production      | Discover, Dashboards |
| Security          | audit-_, security-_ | Discover, Dashboards |
| Business Analyst  | logs-frontend-\*    | Dashboards only      |

### Elasticsearch Roles

```json
PUT _security/role/developer
{
  "cluster": ["monitor"],
  "indices": [
    {
      "names": ["logs-backend-*", "logs-frontend-*"],
      "privileges": ["read", "view_index_metadata"]
    }
  ],
  "applications": [
    {
      "application": "kibana-.kibana",
      "privileges": ["feature_discover.read", "feature_dashboard.read"],
      "resources": ["*"]
    }
  ]
}
```

### Kibana Spaces

| Space       | Purpose             | Access               |
| ----------- | ------------------- | -------------------- |
| Production  | Production logs     | Platform, Operations |
| Development | Dev/staging logs    | Developers           |
| Security    | Security/audit logs | Security team        |
| Business    | Business metrics    | Business users       |

### Authentication

- **SSO Integration:** Okta SAML
- **MFA Required:** Yes for production access
- **Session Timeout:** 8 hours
- **API Keys:** For programmatic access only

### Audit Logging

All Kibana access is logged:

- User login/logout
- Search queries executed
- Dashboard views
- Configuration changes

---

## Related Documentation

- [Log Structure](./log-structure.md)
- [Log Levels Guide](./log-levels.md)
- [Log Analysis](./log-analysis.md)
- [Monitoring Overview](../overview.md)

---

_For questions about centralized logging, contact the Platform Engineering team
at platform@kitchenxpert.com_
