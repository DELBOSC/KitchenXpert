# GDPR Compliance Overview

**Last Updated:** 2026-01-10

## Table of Contents

1. [Introduction](#introduction)
2. [Scope and Applicability](#scope-and-applicability)
3. [Legal Basis for Processing](#legal-basis-for-processing)
4. [Data Controller and Processor Roles](#data-controller-and-processor-roles)
5. [KitchenXpert's GDPR Commitments](#kitchenxperts-gdpr-commitments)
6. [Key GDPR Principles](#key-gdpr-principles)
7. [GDPR Compliance Team](#gdpr-compliance-team)
8. [Audit and Certification Status](#audit-and-certification-status)
9. [Related Documentation](#related-documentation)

## Introduction

The General Data Protection Regulation (GDPR) is the European Union's
comprehensive data protection law that came into force on May 25, 2018. It
establishes strict requirements for how organizations collect, process, store,
and protect personal data of EU residents.

KitchenXpert is committed to full GDPR compliance for all users, regardless of
geographic location. This document provides an overview of how KitchenXpert
implements GDPR requirements across our platform.

### What is Personal Data?

Under GDPR, personal data is any information relating to an identified or
identifiable natural person. For KitchenXpert, this includes:

- **Direct identifiers**: Name, email address, user ID
- **Online identifiers**: IP addresses, cookie identifiers, device IDs
- **Account information**: Password hashes, account preferences, subscription
  status
- **Usage data**: Kitchen designs, product preferences, search queries
- **Financial data**: Payment information (processed by third-party providers)
- **Technical data**: Browser type, operating system, session data

## Scope and Applicability

### Geographic Scope

GDPR applies to KitchenXpert when:

1. **Establishment in the EU**: We process personal data of EU residents
2. **Offering goods/services**: We offer our kitchen design platform to EU users
3. **Monitoring behavior**: We monitor behavior of individuals within the EU
   through analytics

### Who is Protected?

- All EU residents (regardless of nationality)
- Users physically located in the EU when using our services
- Users who have registered from an EU country

### KitchenXpert Operations Covered

All aspects of our business are GDPR-compliant:

- Account registration and management
- Kitchen design creation and storage
- Product catalog browsing and recommendations
- AI-powered design generation
- Order processing and fulfillment
- Customer support interactions
- Marketing communications
- Analytics and platform improvements

## Legal Basis for Processing

GDPR requires a lawful basis for processing personal data. KitchenXpert relies
on the following legal bases:

### 1. Consent (Article 6(1)(a))

Used for:

- Marketing emails and newsletters
- Optional analytics and personalization features
- Cookie placement (non-essential cookies)
- Sharing designs publicly or with third parties

**Requirements**: Freely given, specific, informed, and unambiguous indication
of wishes.

### 2. Contract Performance (Article 6(1)(b))

Used for:

- Account creation and authentication
- Storing and managing kitchen designs
- Processing orders
- Providing customer support
- Delivering our core design platform services

**Requirements**: Processing is necessary to fulfill our Terms of Service
agreement with users.

### 3. Legal Obligation (Article 6(1)(c))

Used for:

- Tax and accounting records
- Compliance with court orders or regulatory requests
- Anti-fraud measures required by law
- Data breach notifications

**Requirements**: Processing is required by EU or Member State law.

### 4. Legitimate Interest (Article 6(1)(f))

Used for:

- Security monitoring and threat detection
- Platform analytics and improvements
- Fraud prevention
- Internal research and development

**Requirements**: We conduct Legitimate Interest Assessments (LIAs) to ensure
our interests don't override user rights.

## Data Controller and Processor Roles

### KitchenXpert as Data Controller

KitchenXpert acts as the **data controller** for:

- User account information
- Kitchen design data
- User preferences and settings
- Order and payment information (in coordination with payment processors)
- Marketing communications

As a controller, we determine the purposes and means of processing personal data
and bear primary responsibility for GDPR compliance.

### Third-Party Data Processors

KitchenXpert engages the following processors who process data on our behalf:

| Processor        | Purpose                   | Location             | Safeguards                                  |
| ---------------- | ------------------------- | -------------------- | ------------------------------------------- |
| AWS              | Cloud hosting and storage | US (with EU regions) | Standard Contractual Clauses, AWS DPA       |
| Stripe           | Payment processing        | US                   | PCI-DSS certified, Stripe DPA               |
| SendGrid         | Email delivery            | US                   | Standard Contractual Clauses, SendGrid DPA  |
| Google Analytics | Website analytics         | US                   | Data Processing Amendment, IP anonymization |
| Auth0            | Authentication services   | US                   | Standard Contractual Clauses, Auth0 DPA     |

All processors are contractually bound to:

- Process data only on our documented instructions
- Maintain appropriate security measures
- Ensure confidentiality of personnel
- Assist with data subject rights requests
- Notify us of any data breaches
- Delete or return data upon termination

### Data Processing Agreements (DPAs)

We maintain executed DPAs with all third-party processors, incorporating:

- Standard Contractual Clauses (SCCs) for international transfers
- Specific security and confidentiality obligations
- Sub-processor disclosure and approval mechanisms
- Audit rights
- Liability and indemnification provisions

## KitchenXpert's GDPR Commitments

We commit to the following GDPR compliance measures:

### 1. Privacy by Design and Default

- Data minimization built into all features
- Privacy-preserving defaults (minimal data collection)
- Privacy impact assessments for new features
- Security measures from initial design phase

### 2. Transparency

- Clear, plain-language privacy notices
- Detailed information about data processing
- Easy access to privacy documentation
- Transparent cookie consent mechanisms

### 3. User Rights

- Self-service tools for accessing and managing data
- 30-day response time for rights requests
- Free exercise of rights (with exceptions for excessive requests)
- Identity verification to prevent unauthorized access

### 4. Data Security

- Encryption in transit (TLS 1.3) and at rest (AES-256)
- Role-based access controls
- Regular security audits and penetration testing
- Incident response and breach notification procedures

### 5. Accountability

- Comprehensive documentation of processing activities
- Regular compliance audits
- Staff training on data protection
- Appointed Data Protection Officer (DPO)

### 6. International Transfers

- Standard Contractual Clauses for EU-to-US transfers
- Preference for EU-based service providers where feasible
- Regular monitoring of transfer mechanisms validity

## Key GDPR Principles

KitchenXpert adheres to all seven GDPR principles outlined in Article 5:

### 1. Lawfulness, Fairness, and Transparency

- **Lawfulness**: We have a lawful basis for all processing activities
- **Fairness**: We process data in ways users reasonably expect
- **Transparency**: We provide clear information about our data practices

**Implementation**:

- Privacy Policy available before account creation
- Clear consent mechanisms with granular choices
- No hidden data collection or unexpected uses

### 2. Purpose Limitation

We collect personal data for specified, explicit, and legitimate purposes and do
not process it further in ways incompatible with those purposes.

**Implementation**:

- Data collection tied to specific features and services
- New purposes require additional user consent
- Regular review of processing purposes against actual use

### 3. Data Minimization

We collect only personal data that is adequate, relevant, and limited to what is
necessary.

**Implementation**:

- No mandatory fields beyond essential account creation data
- Optional features clearly marked
- Regular audits to eliminate unnecessary data collection
- Anonymous design browsing (no account required to view catalog)

### 4. Accuracy

We take reasonable steps to ensure personal data is accurate and kept up to
date.

**Implementation**:

- Users can update profile information at any time
- Email verification for account creation
- Regular prompts to review and update information
- Mechanisms to correct inaccurate data

### 5. Storage Limitation

We keep personal data only as long as necessary for the purposes for which it
was collected.

**Implementation**:

- Defined retention periods for each data category
- Automated deletion processes
- Option for users to delete accounts and data
- See [Data Retention Policy](../data-retention/policy.md) for details

### 6. Integrity and Confidentiality (Security)

We process personal data in a manner that ensures appropriate security,
including protection against unauthorized or unlawful processing and against
accidental loss, destruction, or damage.

**Implementation**:

- Encryption in transit and at rest
- Regular security audits and penetration testing
- Access controls and authentication requirements
- Incident response procedures
- Employee training on data security

### 7. Accountability

We are responsible for and can demonstrate compliance with all GDPR principles.

**Implementation**:

- Comprehensive documentation of all processing activities
- Data Protection Impact Assessments (DPIAs) for high-risk processing
- Records of consent and legitimate interest assessments
- Regular compliance audits
- Appointed Data Protection Officer

## GDPR Compliance Team

### Data Protection Officer (DPO)

**Name**: Sarah Mitchell **Email**: dpo@kitchenxpert.com **Phone**: +1-555-0199
**Address**: KitchenXpert Inc., 123 Design Plaza, San Francisco, CA 94105

**Responsibilities**:

- Monitoring GDPR compliance
- Conducting Data Protection Impact Assessments
- Serving as contact point for supervisory authorities
- Advising on data protection obligations
- Handling data subject rights requests escalations

### Compliance Team Structure

```
Data Protection Officer (DPO)
â”œâ”€â”€ Privacy Counsel (Legal)
â”œâ”€â”€ Security Team (Technical Implementation)
â”œâ”€â”€ Data Governance Team (Policies and Procedures)
â””â”€â”€ Support Team (User Rights Requests)
```

### Contact Information

- **General Privacy Questions**: privacy@kitchenxpert.com
- **Data Subject Rights Requests**: rights@kitchenxpert.com
- **Data Breach Reports**: security@kitchenxpert.com
- **DPO Direct Contact**: dpo@kitchenxpert.com

## Audit and Certification Status

### Internal Audits

- **Frequency**: Quarterly comprehensive audits
- **Last Audit**: December 2025
- **Next Audit**: March 2026
- **Audit Scope**: All data processing activities, security measures,
  third-party processors

### External Certifications

| Certification               | Status    | Valid Until      | Auditor   |
| --------------------------- | --------- | ---------------- | --------- |
| ISO 27001                   | Certified | August 2026      | BSI Group |
| SOC 2 Type II               | Certified | November 2026    | Deloitte  |
| Privacy Shield (historical) | N/A       | Invalidated 2020 | N/A       |

### Compliance Assessments

- **GDPR Compliance Score**: 98% (internal assessment)
- **Areas of Excellence**: Data subject rights, transparency, security
- **Ongoing Improvements**: Third-party processor monitoring, cross-border
  transfer documentation

### Supervisory Authority

- **Primary Authority**: Irish Data Protection Commission (DPC)
- **Registration**: Completed (registration number: IE-2024-KX-789456)
- **Last Interaction**: June 2025 (routine inquiry, resolved)

### Audit Trail

All compliance activities are documented in our internal compliance management
system:

- Policy updates and version control
- Training completion records
- Data Protection Impact Assessments
- Breach incident reports
- Data subject rights request logs
- Third-party processor reviews

## Related Documentation

### GDPR-Specific Documentation

- [Data Processing Records](./data-processing.md) - Detailed processing
  activities
- [Consent Management](./consent-management.md) - How we obtain and manage
  consent
- [Data Subject Rights](./data-subject-rights.md) - User rights and how to
  exercise them
- [Data Breach Protocol](./data-breach-protocol.md) - Breach response procedures
- [Data Protection Impact Assessments](./dpia.md) - DPIA methodology and results

### Related Compliance Documentation

- [CCPA Overview](../ccpa/overview.md) - California privacy compliance
- [Data Retention Policy](../data-retention/policy.md) - How long we keep data
- [Audit Log Structure](../audit/audit-log-structure.md) - Compliance monitoring

### User-Facing Documentation

- [Privacy Policy](../../legal/privacy-policy.md) - Public-facing privacy notice
- [Cookie Policy](../../legal/cookie-policy.md) - Cookie usage and consent
- [Terms of Service](../../legal/terms-of-service.md) - User agreement

### Security Documentation

- [Security Architecture](../../security/architecture.md) - Technical security
  measures
- [Encryption Standards](../../security/encryption.md) - Data protection
  implementation
- [Access Control Policy](../../security/access-control.md) - Who can access
  what data

## Document Control

- **Document Owner**: Data Protection Officer
- **Review Frequency**: Quarterly or upon regulatory changes
- **Last Reviewed**: 2026-01-10
- **Next Review**: 2026-04-10
- **Version**: 3.2
- **Approved By**: Sarah Mitchell (DPO), Legal Counsel

## Updates and Changes

For questions about this document or to report compliance concerns, contact:

**Email**: compliance@kitchenxpert.com **Response Time**: Within 5 business days

---

_This document is part of KitchenXpert's comprehensive GDPR compliance program
and should be read in conjunction with related documentation listed above._
