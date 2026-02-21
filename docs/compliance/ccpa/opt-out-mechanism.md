# Opt-Out Mechanism

**Last Updated:** 2026-01-10

## Table of Contents

1. [Introduction](#introduction)
2. [Do Not Sell Implementation](#do-not-sell-implementation)
3. [Global Privacy Control Support](#global-privacy-control-support)
4. [Cookie Opt-Out](#cookie-opt-out)
5. [Third-Party Sharing Disclosure](#third-party-sharing-disclosure)
6. [Financial Incentive Programs](#financial-incentive-programs)
7. [Technical Implementation](#technical-implementation)
8. [Related Documentation](#related-documentation)

---

## Introduction

This document describes how KitchenXpert implements opt-out mechanisms for California consumers under CCPA.

---

## Do Not Sell Implementation

### Link Location

The "Do Not Sell My Personal Information" link is located:
- Website footer (all pages)
- Privacy Policy
- Account Privacy Settings
- Cookie consent banner

**URL**: https://kitchenxpert.com/privacy/do-not-sell

### User Experience

1. User clicks "Do Not Sell" link
2. Information page explains what data sharing means
3. One-click opt-out button
4. Confirmation displayed
5. Preference saved to account (if logged in) and browser

### What Happens on Opt-Out

| Data Type | Before Opt-Out | After Opt-Out |
|-----------|----------------|---------------|
| Advertising cookies | Active | Disabled |
| Facebook Pixel | Active | Disabled |
| Google Ads | Active | Disabled |
| Affiliate tracking | Active | Disabled |
| Partner marketing | May share | No sharing |
| Analytics | Active | Basic only |

### Opt-Out Persistence

- **Logged-in users**: Stored in account, applies across devices
- **Logged-out users**: Stored in browser cookie (1 year)
- **Cross-device**: Requires account login

---

## Global Privacy Control Support

### What is GPC

Global Privacy Control is a browser/extension signal that communicates opt-out preferences.

### Our Implementation

KitchenXpert automatically honors GPC signals:

1. Browser sends GPC header (Sec-GPC: 1)
2. Server detects GPC signal
3. Same actions as "Do Not Sell" applied
4. No additional user action needed

### GPC Detection

We detect GPC via:
- Sec-GPC HTTP header
- navigator.globalPrivacyControl JavaScript API

### GPC + Explicit Opt-In

If user previously opted in but browser sends GPC:
- GPC is honored
- User can explicitly override in account settings

---

## Cookie Opt-Out

### Cookie Categories

| Category | Default | Opt-Out Available |
|----------|---------|-------------------|
| Essential | Enabled | No (required) |
| Functional | Enabled | Yes |
| Analytics | Consent | Yes |
| Marketing | Consent | Yes |

### How to Opt-Out

**Method 1: Cookie Banner**
- Click "Manage Preferences" on cookie banner
- Deselect categories
- Save preferences

**Method 2: Privacy Settings**
- Account Settings > Privacy > Cookie Preferences
- Toggle categories off
- Save changes

**Method 3: Browser Settings**
- Block third-party cookies
- Use private/incognito mode

### Technical Implementation

When marketing cookies are opted out:
- Advertising scripts not loaded
- Existing marketing cookies deleted
- Tracking pixels blocked
- Cookie preference stored

---

## Third-Party Sharing Disclosure

### Categories of Third Parties

| Third Party Type | Data Shared | Purpose |
|------------------|-------------|---------|
| Advertising partners | Hashed email, browsing | Targeted ads |
| Analytics providers | Anonymized usage | Analytics |
| Affiliate networks | Referral codes | Commission tracking |
| Social media | Pixel data | Remarketing |

### With Opt-Out Active

| Third Party Type | Data Shared |
|------------------|-------------|
| Advertising partners | None |
| Analytics providers | Aggregated only |
| Affiliate networks | None |
| Social media | None |

### Service Providers (Not Sale)

These receive data as service providers, not buyers:
- Cloud hosting (AWS)
- Payment processing (Stripe)
- Email delivery (SendGrid)
- Authentication (Auth0)

---

## Financial Incentive Programs

### Current Programs

KitchenXpert currently offers:

**Loyalty Program**
- Earn points on purchases
- Personal data used: purchase history, preferences
- Opt-out: Leave program anytime

**Newsletter Discount**
- 10% discount for email signup
- Personal data used: email address
- Opt-out: Unsubscribe anytime

### Disclosure

For each program, we disclose:
- What data is collected
- How data is used
- Material terms
- How to opt out

### Value Calculation

Financial incentives are reasonably related to the value of consumer data based on:
- Cost of data collection
- Revenue from data use
- Comparable market rates

---

## Technical Implementation

### Opt-Out Cookie



### Server-Side Check

Every request checks:
1. GPC header present?
2. Opt-out cookie present?
3. Account opt-out flag set?

If any are true, disable sale-related processing.

### Third-Party Script Loading



### Database Storage



### API Endpoint



---

## Related Documentation

- [CCPA Overview](./overview.md)
- [Consumer Rights](./consumer-rights.md)
- [GDPR Consent Management](../gdpr/consent-management.md)
- [Cookie Policy](../../legal/cookie-policy.md)

---

## Document Control

| Property | Value |
|----------|-------|
| Document Owner | Data Protection Officer |
| Last Reviewed | 2026-01-10 |
| Version | 2.0 |

---

*For questions, contact privacy@kitchenxpert.com.*
