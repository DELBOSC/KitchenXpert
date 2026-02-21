# Audit Log Structure

**Last Updated:** 2026-01-10

## Table of Contents

1. [Introduction](#introduction)
2. [Log Entry Schema](#log-entry-schema)
3. [Field Definitions](#field-definitions)
4. [Log Categories](#log-categories)
5. [Storage Format](#storage-format)
6. [Indexing Strategy](#indexing-strategy)
7. [Query Patterns](#query-patterns)
8. [Related Documentation](#related-documentation)

---

## Introduction

This document defines the structure of audit logs in KitchenXpert. Audit logs provide a tamper-evident record of all significant system events for security, compliance, and operational purposes.

### Purpose of Audit Logs

- **Security**: Detect and investigate security incidents
- **Compliance**: Meet regulatory requirements (GDPR, CCPA, SOC 2)
- **Operations**: Troubleshoot issues and monitor system health
- **Accountability**: Track user and system actions

---

## Log Entry Schema

### Core Structure

Every audit log entry contains the following fields:

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Unique identifier for the log entry |
| timestamp | ISO 8601 | When the event occurred (UTC) |
| event_type | String | Specific event type identifier |
| category | String | Event category for grouping |
| severity | String | Event severity level |
| actor | Object | Who performed the action |
| resource | Object | What was acted upon |
| action | String | What was done |
| outcome | String | Result of the action |
| details | Object | Additional context |
| metadata | Object | Request and environment info |

---

## Field Definitions

### Severity Levels

| Level | Description | Examples |
|-------|-------------|----------|
| debug | Diagnostic information | Method entry/exit |
| info | Normal operations | Successful login |
| warning | Potential issues | Rate limit approached |
| error | Operation failures | API error |
| critical | System-level issues | Service unavailable |

### Actor Types

| Type | Description |
|------|-------------|
| user | Human user |
| system | Automated system process |
| api_key | API key authentication |
| service | Internal service |
| anonymous | Unauthenticated actor |

### Resource Types

| Type | Description |
|------|-------------|
| user | User account |
| design | Kitchen design |
| order | Customer order |
| product | Product item |
| session | User session |
| file | Uploaded file |
| setting | System setting |
| api_key | API key |

### Action Values

| Action | Description |
|--------|-------------|
| create | Resource created |
| read | Resource accessed |
| update | Resource modified |
| delete | Resource removed |
| login | Authentication |
| logout | Session end |
| export | Data export |
| import | Data import |

### Outcome Values

| Outcome | Description |
|---------|-------------|
| success | Operation completed |
| failure | Operation failed |
| pending | Operation in progress |
| denied | Access denied |
| error | System error |

---

## Log Categories

### Authentication

Events related to user authentication:
- user.login
- user.logout
- user.password_change
- user.mfa_enable
- user.mfa_disable
- user.password_reset

### Authorization

Events related to access control:
- access.granted
- access.denied
- role.assigned
- role.removed
- permission.changed

### Data Access

Events related to data operations:
- data.read
- data.create
- data.update
- data.delete
- data.export
- data.import

### Administration

Events related to system administration:
- admin.setting_change
- admin.user_create
- admin.user_disable
- admin.api_key_create
- admin.api_key_revoke

### Security

Events related to security:
- security.threat_detected
- security.rate_limit
- security.blocked_ip
- security.suspicious_activity
- security.breach_attempt

### Compliance

Events related to compliance:
- compliance.consent_given
- compliance.consent_withdrawn
- compliance.data_request
- compliance.data_deletion
- compliance.audit_access

---

## Storage Format

### Primary Storage

Audit logs are stored in:
- **Hot Storage**: Elasticsearch (30 days)
- **Warm Storage**: S3 with Glacier transition (1 year)
- **Cold Storage**: Glacier Deep Archive (7 years)

### Log Format

- **Format**: JSON Lines (JSONL)
- **Compression**: GZIP
- **Encryption**: AES-256 at rest
- **Integrity**: SHA-256 checksums

### Partition Strategy

| Level | Partition Key | Purpose |
|-------|---------------|---------|
| 1 | environment | Separate environments |
| 2 | date | Time-based queries |
| 3 | category | Event type filtering |

---

## Indexing Strategy

### Elasticsearch Indices

| Index Pattern | Retention | Purpose |
|---------------|-----------|---------|
| audit-{date} | 30 days | Real-time queries |
| audit-monthly-{month} | 1 year | Historical analysis |
| audit-security-{date} | 90 days | Security events |

### Indexed Fields

| Field | Index Type | Purpose |
|-------|------------|---------|
| timestamp | date | Time range queries |
| event_type | keyword | Exact match |
| actor.id | keyword | User activity |
| resource.id | keyword | Resource history |
| outcome | keyword | Success/failure filtering |
| severity | keyword | Severity filtering |

---

## Query Patterns

### Common Queries

**User Activity**: actor.id = "user_12345" AND timestamp >= "2026-01-01"

**Failed Logins**: event_type = "user.login" AND outcome = "failure"

**Data Access**: category = "data_access" AND resource.type = "design"

**Security Events**: category = "security" AND severity IN ("warning", "error", "critical")

### Performance Guidelines

| Query Type | Max Time Range | Recommended Filters |
|------------|----------------|---------------------|
| Real-time | 24 hours | event_type, actor.id |
| Investigation | 7 days | category, resource.id |
| Compliance | 30 days | actor.id, date range |
| Historical | 1 year | category, monthly rollup |

---

## Related Documentation

- [Event Types](./event-types.md)
- [Compliance Reporting](./compliance-reporting.md)
- [Log Retention](./log-retention.md)
- [Security Monitoring](../security/monitoring.md)

---

## Document Control

| Property | Value |
|----------|-------|
| Document Owner | Security Team |
| Last Reviewed | 2026-01-10 |
| Version | 2.0 |

---

*For questions, contact security@kitchenxpert.com.*
