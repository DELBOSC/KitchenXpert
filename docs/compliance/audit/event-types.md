# Audit Event Types

**Last Updated:** 2026-01-10

## Table of Contents

1. [Introduction](#introduction)
2. [Event Type Naming Convention](#event-type-naming-convention)
3. [Authentication Events](#authentication-events)
4. [Authorization Events](#authorization-events)
5. [Data Events](#data-events)
6. [Administrative Events](#administrative-events)
7. [Security Events](#security-events)
8. [Compliance Events](#compliance-events)
9. [System Events](#system-events)
10. [Related Documentation](#related-documentation)

---

## Introduction

This document catalogs all audit event types in KitchenXpert. Each event type is documented with its purpose, severity, and required fields.

---

## Event Type Naming Convention

### Format

domain.action[.detail]

### Examples

- user.login
- user.login.mfa
- design.create
- order.payment.success

---

## Authentication Events

### user.login

**Severity**: info | **Category**: authentication

| Field | Required | Description |
|-------|----------|-------------|
| auth_method | Yes | password, oauth, sso |
| mfa_used | Yes | Whether MFA was used |

### user.login.failure

**Severity**: warning | **Category**: authentication

| Field | Required | Description |
|-------|----------|-------------|
| reason | Yes | invalid_password, account_locked |
| attempt_count | Yes | Number of attempts |

### user.logout

**Severity**: info | **Category**: authentication

| Field | Required | Description |
|-------|----------|-------------|
| logout_type | Yes | manual, timeout, forced |

### user.password.change

**Severity**: info | **Category**: authentication

| Field | Required | Description |
|-------|----------|-------------|
| change_type | Yes | user_initiated, admin_reset |

### user.mfa.enable

**Severity**: info | **Category**: authentication

| Field | Required | Description |
|-------|----------|-------------|
| mfa_type | Yes | totp, sms, email |

---

## Authorization Events

### access.granted

**Severity**: info | **Category**: authorization

| Field | Required | Description |
|-------|----------|-------------|
| permission | Yes | Permission checked |
| resource_type | Yes | Type of resource |

### access.denied

**Severity**: warning | **Category**: authorization

| Field | Required | Description |
|-------|----------|-------------|
| permission | Yes | Permission required |
| reason | Yes | Denial reason |

### role.assign

**Severity**: info | **Category**: authorization

| Field | Required | Description |
|-------|----------|-------------|
| role | Yes | Role name |
| assigned_by | Yes | Admin who assigned |

---

## Data Events

### data.read

**Severity**: info | **Category**: data_access

| Field | Required | Description |
|-------|----------|-------------|
| record_count | No | Number of records |

### data.create

**Severity**: info | **Category**: data_access

| Field | Required | Description |
|-------|----------|-------------|
| record_id | Yes | Created record ID |

### data.update

**Severity**: info | **Category**: data_access

| Field | Required | Description |
|-------|----------|-------------|
| fields_changed | Yes | Changed fields |

### data.delete

**Severity**: warning | **Category**: data_access

| Field | Required | Description |
|-------|----------|-------------|
| deletion_type | Yes | soft, hard |
| record_id | Yes | Deleted record ID |

### data.export

**Severity**: info | **Category**: data_access

| Field | Required | Description |
|-------|----------|-------------|
| format | Yes | Export format |
| record_count | Yes | Records exported |

---

## Administrative Events

### admin.setting.change

**Severity**: warning | **Category**: administration

| Field | Required | Description |
|-------|----------|-------------|
| setting | Yes | Setting name |
| old_value | Yes | Previous value |
| new_value | Yes | New value |

### admin.user.impersonate

**Severity**: warning | **Category**: administration

| Field | Required | Description |
|-------|----------|-------------|
| target_user | Yes | Impersonated user |
| reason | Yes | Reason |

### admin.api_key.create

**Severity**: info | **Category**: administration

| Field | Required | Description |
|-------|----------|-------------|
| key_name | Yes | Key identifier |
| permissions | Yes | Key permissions |

---

## Security Events

### security.threat.detected

**Severity**: critical | **Category**: security

| Field | Required | Description |
|-------|----------|-------------|
| threat_type | Yes | Type of threat |
| action_taken | Yes | Response action |

### security.rate_limit.exceeded

**Severity**: warning | **Category**: security

| Field | Required | Description |
|-------|----------|-------------|
| limit_type | Yes | Type of limit |
| current_rate | Yes | Current rate |

### security.ip.blocked

**Severity**: warning | **Category**: security

| Field | Required | Description |
|-------|----------|-------------|
| ip_address | Yes | Blocked IP |
| reason | Yes | Block reason |

---

## Compliance Events

### compliance.consent.given

**Severity**: info | **Category**: compliance

| Field | Required | Description |
|-------|----------|-------------|
| consent_type | Yes | Type of consent |
| version | Yes | Policy version |

### compliance.consent.withdrawn

**Severity**: info | **Category**: compliance

| Field | Required | Description |
|-------|----------|-------------|
| consent_type | Yes | Type of consent |

### compliance.data_request.received

**Severity**: info | **Category**: compliance

| Field | Required | Description |
|-------|----------|-------------|
| request_type | Yes | access, delete, correct |
| request_id | Yes | Request tracking ID |

---

## System Events

### system.startup

**Severity**: info | **Category**: system

| Field | Required | Description |
|-------|----------|-------------|
| service | Yes | Service name |
| version | Yes | Service version |

### system.shutdown

**Severity**: info | **Category**: system

| Field | Required | Description |
|-------|----------|-------------|
| reason | Yes | Shutdown reason |

### system.error

**Severity**: error | **Category**: system

| Field | Required | Description |
|-------|----------|-------------|
| error_type | Yes | Error category |
| error_message | Yes | Error details |

---

## Related Documentation

- [Audit Log Structure](./audit-log-structure.md)
- [Compliance Reporting](./compliance-reporting.md)
- [Log Retention](./log-retention.md)

---

## Document Control

| Property | Value |
|----------|-------|
| Document Owner | Security Team |
| Last Reviewed | 2026-01-10 |
| Version | 2.0 |

---

*For questions, contact security@kitchenxpert.com.*
