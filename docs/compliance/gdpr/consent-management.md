# Consent Management

**Last Updated:** 2026-01-10

## Table of Contents

1. [Introduction](#introduction)
2. [Consent Requirements Under GDPR](#consent-requirements-under-gdpr)
3. [Types of Consent in KitchenXpert](#types-of-consent-in-kitchenxpert)
4. [Consent Collection Methods](#consent-collection-methods)
5. [Consent Storage and Documentation](#consent-storage-and-documentation)
6. [Consent Withdrawal Mechanism](#consent-withdrawal-mechanism)
7. [Cookie Consent Implementation](#cookie-consent-implementation)
8. [Preference Center](#preference-center)
9. [Audit Trail of Consent Changes](#audit-trail-of-consent-changes)
10. [Technical Implementation](#technical-implementation)
11. [Related Documentation](#related-documentation)

---

## Introduction

Consent is one of the six lawful bases for processing personal data under GDPR. When KitchenXpert relies on consent as the legal basis for processing, we must ensure that consent meets all GDPR requirements: it must be freely given, specific, informed, and unambiguous.

This document outlines how KitchenXpert implements consent management across our platform, ensuring compliance with GDPR Article 7 (Conditions for Consent) and Article 8 (Conditions applicable to child's consent in relation to information society services).

### Scope

This policy applies to:
- All consent-based processing activities
- Cookie consent and tracking technologies
- Marketing communications
- Optional data processing features
- Third-party data sharing

---

## Consent Requirements Under GDPR

### GDPR Article 7 - Conditions for Consent

| Requirement | Description | KitchenXpert Implementation |
|-------------|-------------|----------------------------|
| **Freely Given** | Cannot be coerced or bundled | Separate consent requests; core service available without optional consents |
| **Specific** | For specific, defined purposes | Granular consent options for each processing activity |
| **Informed** | User must understand consent | Clear, plain-language descriptions; links to privacy policy |
| **Unambiguous** | Clear affirmative action | Explicit checkboxes (unchecked by default); clear opt-in buttons |
| **Demonstrable** | Must prove consent | Timestamped consent records; audit logs |
| **Withdrawable** | Easy withdrawal | One-click unsubscribe; preference center access |

### Consent vs. Other Legal Bases

| Processing Activity | Legal Basis | Consent Required? |
|--------------------|-------------|-------------------|
| Account creation | Contract performance | No |
| Storing kitchen designs | Contract performance | No |
| Order processing | Contract performance | No |
| Security monitoring | Legitimate interest | No |
| Marketing emails | **Consent** | **Yes** |
| Analytics cookies | **Consent** | **Yes** |
| AI training on user designs | **Consent** | **Yes** |
| Third-party marketing | **Consent** | **Yes** |

---

## Types of Consent in KitchenXpert

### 1. Account Creation (Contract Basis)

**Legal Basis:** Contract performance (Article 6(1)(b))

Data collected: email (required), password (hashed, required), name (optional).

### 2. Marketing Communications (Explicit Opt-In)

**Legal Basis:** Consent (Article 6(1)(a))

Types: newsletters, design tips, partner offers, feature announcements, discounts.

Key implementation: checkboxes unchecked by default, each category separate, easy unsubscribe.

### 3. Analytics and Cookies (Cookie Consent Banner)

**Legal Basis:** Consent (Article 6(1)(a)) for non-essential cookies

Categories:
- **Essential** (no consent): Session cookies, security tokens
- **Functional** (consent required): Language, theme preferences
- **Analytics** (consent required): Google Analytics, usage tracking
- **Marketing** (consent required): Advertising pixels, remarketing

### 4. AI Training Data Usage (Separate Consent)

**Legal Basis:** Consent (Article 6(1)(a))

Opt-in only, clear explanation, separate from core service, can be withdrawn anytime.

---

## Consent Collection Methods

1. **Checkbox Consent**: Unchecked by default, clear labels
2. **Cookie Consent Banners**: Before non-essential cookies, equal Accept/Reject prominence
3. **Modal Dialogs**: Cannot dismiss without choice
4. **Just-in-Time Consent**: Feature-specific during user journey

---

## Consent Storage and Documentation

### Consent Record Fields

id, userId, consentType, purpose, version, granted, timestamp, ipAddress, userAgent, collectionMethod, expirationDate, withdrawnAt, pageUrl, formId, consentTextHash

### Database Schema

```sql
CREATE TABLE consent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    consent_type VARCHAR(50) NOT NULL,
    purpose TEXT NOT NULL,
    version VARCHAR(20) NOT NULL,
    granted BOOLEAN NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    collection_method VARCHAR(50) NOT NULL,
    consent_text_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Consent Withdrawal Mechanism

### Principles

- Withdrawal as easy as giving consent
- Effective immediately
- No penalty for withdrawal

### Methods

1. **Preference Center**: Account Settings > Privacy > Consent Preferences
2. **Email Unsubscribe**: One-click link in every email
3. **Cookie Settings**: Footer link on all pages
4. **Direct Request**: privacy@kitchenxpert.com

---

## Cookie Consent Implementation

### Essential Cookies (No Consent)

session_id, csrf_token, auth_token, cookie_consent

### Functional Cookies (Consent Required)

language (1 year), theme (1 year), recent_designs (30 days)

### Analytics Cookies (Consent Required)

_ga (2 years), _gid (24 hours), kx_session (session)

### Marketing Cookies (Consent Required)

_fbp (90 days), _gcl_au (90 days), kx_affiliate (30 days)

---

## Preference Center

**URL**: https://kitchenxpert.com/account/privacy/preferences

**Features**: View all consents, modify consents, view history, download consent record

**API Endpoints**: GET/PUT /api/v1/users/me/consent-preferences, GET consent-history, GET consent-export

---

## Audit Trail of Consent Changes

### What is Logged

Consent given/withdrawn, preference center access, cookie banner interaction, email unsubscribe

### Retention

7 years, required for compliance, included in data export, append-only protection

---

## Technical Implementation

### Architecture

Frontend UI, Consent API, Database, Cookie Storage, Event Publisher, Audit Logs, Third-Party Sync

### Global Privacy Control (GPC)

Respects GPC signal as opt-out for analytics, marketing cookies, and CCPA sale opt-out.

---

## Related Documentation

- [GDPR Overview](./overview.md)
- [Data Processing](./data-processing.md)
- [Data Subject Rights](./data-subject-rights.md)
- [Data Breach Protocol](./data-breach-protocol.md)
- [DPIA](./dpia.md)
- [CCPA Opt-Out](../ccpa/opt-out-mechanism.md)
- [Audit Log Structure](../audit/audit-log-structure.md)

---

## Document Control

| Property | Value |
|----------|-------|
| Document Owner | Data Protection Officer |
| Review Frequency | Quarterly |
| Last Reviewed | 2026-01-10 |
| Next Review | 2026-04-10 |
| Version | 2.3 |

---

*For questions, contact privacy@kitchenxpert.com.*
