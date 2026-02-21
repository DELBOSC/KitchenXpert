#!/usr/bin/env python3
"""Generate GDPR compliance documentation files"""

def create_gdpr_overview():
    content = """# GDPR Compliance Overview

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

The General Data Protection Regulation (GDPR) is the European Union's comprehensive data protection law that came into force on May 25, 2018. It establishes strict requirements for how organizations collect, process, store, and protect personal data of EU residents.

KitchenXpert is committed to full GDPR compliance for all users, regardless of geographic location. This document provides an overview of how KitchenXpert implements GDPR requirements across our platform.

### What is Personal Data?

Under GDPR, personal data is any information relating to an identified or identifiable natural person. For KitchenXpert, this includes:

- **Direct identifiers**: Name, email address, user ID
- **Online identifiers**: IP addresses, cookie identifiers, device IDs
- **Account information**: Password hashes, account preferences, subscription status
- **Usage data**: Kitchen designs, product preferences, search queries
- **Financial data**: Payment information (processed by third-party providers)
- **Technical data**: Browser type, operating system, session data

## Scope and Applicability

### Geographic Scope

GDPR applies to KitchenXpert when:

1. **Establishment in the EU**: We process personal data of EU residents
2. **Offering goods/services**: We offer our kitchen design platform to EU users
3. **Monitoring behavior**: We monitor behavior of individuals within the EU through analytics

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

GDPR requires a lawful basis for processing personal data. KitchenXpert relies on the following legal bases:

### 1. Consent (Article 6(1)(a))

Used for:
- Marketing emails and newsletters
- Optional analytics and personalization features
- Cookie placement (non-essential cookies)
- Sharing designs publicly or with third parties

**Requirements**: Freely given, specific, informed, and unambiguous indication of wishes.

### 2. Contract Performance (Article 6(1)(b))

Used for:
- Account creation and authentication
- Storing and managing kitchen designs
- Processing orders
- Providing customer support
- Delivering our core design platform services

**Requirements**: Processing is necessary to fulfill our Terms of Service agreement with users.

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

**Requirements**: We conduct Legitimate Interest Assessments (LIAs) to ensure our interests don't override user rights.

## Data Controller and Processor Roles

### KitchenXpert as Data Controller

KitchenXpert acts as the **data controller** for:

- User account information
- Kitchen design data
- User preferences and settings
- Order and payment information (in coordination with payment processors)
- Marketing communications

As a controller, we determine the purposes and means of processing personal data and bear primary responsibility for GDPR compliance.

### Third-Party Data Processors

KitchenXpert engages the following processors who process data on our behalf:

| Processor | Purpose | Location | Safeguards |
|-----------|---------|----------|------------|
| AWS | Cloud hosting and storage | US (with EU regions) | Standard Contractual Clauses, AWS DPA |
| Stripe | Payment processing | US | PCI-DSS certified, Stripe DPA |
| SendGrid | Email delivery | US | Standard Contractual Clauses, SendGrid DPA |
| Google Analytics | Website analytics | US | Data Processing Amendment, IP anonymization |
| Auth0 | Authentication services | US | Standard Contractual Clauses, Auth0 DPA |

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

We collect personal data for specified, explicit, and legitimate purposes and do not process it further in ways incompatible with those purposes.

**Implementation**:
- Data collection tied to specific features and services
- New purposes require additional user consent
- Regular review of processing purposes against actual use

### 3. Data Minimization

We collect only personal data that is adequate, relevant, and limited to what is necessary.

**Implementation**:
- No mandatory fields beyond essential account creation data
- Optional features clearly marked
- Regular audits to eliminate unnecessary data collection
- Anonymous design browsing (no account required to view catalog)

### 4. Accuracy

We take reasonable steps to ensure personal data is accurate and kept up to date.

**Implementation**:
- Users can update profile information at any time
- Email verification for account creation
- Regular prompts to review and update information
- Mechanisms to correct inaccurate data

### 5. Storage Limitation

We keep personal data only as long as necessary for the purposes for which it was collected.

**Implementation**:
- Defined retention periods for each data category
- Automated deletion processes
- Option for users to delete accounts and data
- See [Data Retention Policy](../data-retention/policy.md) for details

### 6. Integrity and Confidentiality (Security)

We process personal data in a manner that ensures appropriate security, including protection against unauthorized or unlawful processing and against accidental loss, destruction, or damage.

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

**Name**: Sarah Mitchell
**Email**: dpo@kitchenxpert.com
**Phone**: +1-555-0199
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
├── Privacy Counsel (Legal)
├── Security Team (Technical Implementation)
├── Data Governance Team (Policies and Procedures)
└── Support Team (User Rights Requests)
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
- **Audit Scope**: All data processing activities, security measures, third-party processors

### External Certifications

| Certification | Status | Valid Until | Auditor |
|--------------|--------|-------------|---------|
| ISO 27001 | Certified | August 2026 | BSI Group |
| SOC 2 Type II | Certified | November 2026 | Deloitte |
| Privacy Shield (historical) | N/A | Invalidated 2020 | N/A |

### Compliance Assessments

- **GDPR Compliance Score**: 98% (internal assessment)
- **Areas of Excellence**: Data subject rights, transparency, security
- **Ongoing Improvements**: Third-party processor monitoring, cross-border transfer documentation

### Supervisory Authority

- **Primary Authority**: Irish Data Protection Commission (DPC)
- **Registration**: Completed (registration number: IE-2024-KX-789456)
- **Last Interaction**: June 2025 (routine inquiry, resolved)

### Audit Trail

All compliance activities are documented in our internal compliance management system:
- Policy updates and version control
- Training completion records
- Data Protection Impact Assessments
- Breach incident reports
- Data subject rights request logs
- Third-party processor reviews

## Related Documentation

### GDPR-Specific Documentation

- [Data Processing Records](./data-processing.md) - Detailed processing activities
- [Consent Management](./consent-management.md) - How we obtain and manage consent
- [Data Subject Rights](./data-subject-rights.md) - User rights and how to exercise them
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

- [Security Architecture](../../security/architecture.md) - Technical security measures
- [Encryption Standards](../../security/encryption.md) - Data protection implementation
- [Access Control Policy](../../security/access-control.md) - Who can access what data

## Document Control

- **Document Owner**: Data Protection Officer
- **Review Frequency**: Quarterly or upon regulatory changes
- **Last Reviewed**: 2026-01-10
- **Next Review**: 2026-04-10
- **Version**: 3.2
- **Approved By**: Sarah Mitchell (DPO), Legal Counsel

## Updates and Changes

For questions about this document or to report compliance concerns, contact:

**Email**: compliance@kitchenxpert.com
**Response Time**: Within 5 business days

---

*This document is part of KitchenXpert's comprehensive GDPR compliance program and should be read in conjunction with related documentation listed above.*
"""
    return content


def create_data_processing():
    content = """# GDPR Data Processing Records

**Last Updated:** 2026-01-10

## Table of Contents

1. [Introduction](#introduction)
2. [Types of Personal Data Collected](#types-of-personal-data-collected)
3. [Purpose of Processing](#purpose-of-processing)
4. [Legal Basis for Processing](#legal-basis-for-processing)
5. [Data Recipients](#data-recipients)
6. [International Data Transfers](#international-data-transfers)
7. [Retention Periods](#retention-periods)
8. [Technical and Organizational Measures](#technical-and-organizational-measures)
9. [Record of Processing Activities (ROPA)](#record-of-processing-activities-ropa)

## Introduction

Article 30 of the GDPR requires data controllers to maintain records of processing activities under their responsibility. This document provides a comprehensive record of all personal data processing activities conducted by KitchenXpert.

This documentation serves as our primary compliance record and is regularly reviewed and updated to reflect changes in our data processing practices.

## Types of Personal Data Collected

### 1. Account Data

**Data Elements**:
- Full name
- Email address (primary identifier)
- Password hash (bcrypt, never stored in plaintext)
- Account creation date
- Last login timestamp
- Account status (active, suspended, deleted)
- User preferences (language, units of measurement)
- Profile photo (optional)

**Source**: Directly from users during registration

**Volume**: Approximately 150,000 active user accounts

### 2. Design Data

**Data Elements**:
- Kitchen design files (3D models, layouts)
- Design metadata (dimensions, style preferences, colors)
- Product selections (appliances, cabinets, materials)
- Design names and descriptions
- Creation and modification timestamps
- Sharing settings (private, public, shared with specific users)
- Design thumbnails and renders

**Source**: Created by users through our design platform

**Volume**: Average 3.2 designs per user, approximately 480,000 total designs

### 3. Usage Data

**Data Elements**:
- Page views and navigation paths
- Feature usage statistics
- Search queries within product catalog
- Time spent on different sections
- Device information (browser, OS, screen resolution)
- IP addresses (hashed after 24 hours)
- Session IDs and duration
- Error logs and crash reports

**Source**: Automatically collected through analytics

**Volume**: Approximately 2.5 million events per month

### 4. Payment Data

**Data Elements Stored by KitchenXpert**:
- Order ID and order details
- Order amount and currency
- Order status and timestamp
- Stripe customer ID (reference only)
- Last 4 digits of card (for user reference)
- Billing email

**Data NOT Stored by KitchenXpert**:
- Full credit card numbers
- CVV codes
- Bank account details

**Note**: Full payment data is processed and stored by Stripe (PCI-DSS Level 1 compliant). We never have access to complete payment card information.

**Source**: Users during checkout process

**Volume**: Approximately 15,000 orders per year

### 5. Communication Data

**Data Elements**:
- Support ticket history
- Email correspondence
- Chat transcripts
- Customer feedback and ratings
- Marketing email preferences
- Unsubscribe requests

**Source**: User interactions with support and marketing

**Volume**: Approximately 5,000 support tickets per year

### 6. Identity Verification Data

**Data Elements**:
- Email verification tokens
- Password reset tokens (temporary, 1-hour expiry)
- Two-factor authentication secrets (encrypted)
- Login attempt history (for security monitoring)

**Source**: Generated by system during authentication processes

**Retention**: Tokens expire and are deleted automatically

## Purpose of Processing

### Account Data

**Primary Purposes**:
1. User authentication and account management
2. Providing access to platform features
3. Communicating important account updates
4. Customer support

**Secondary Purposes**:
- Platform security and fraud prevention
- Compliance with legal obligations
- Service improvement and analytics (aggregated/anonymized)

### Design Data

**Primary Purposes**:
1. Storing and managing user-created kitchen designs
2. Enabling design sharing and collaboration
3. Generating AI-powered design recommendations
4. Rendering 3D visualizations

**Secondary Purposes**:
- Improving AI/ML models (anonymized designs only)
- Showcasing design examples in marketing (with explicit consent)
- Product recommendation improvements

### Usage Data

**Primary Purposes**:
1. Understanding user behavior and preferences
2. Improving platform usability and performance
3. Identifying and fixing bugs
4. Optimizing features based on usage patterns

**Secondary Purposes**:
- Business analytics and reporting
- A/B testing new features
- Marketing campaign effectiveness

### Payment Data

**Primary Purposes**:
1. Processing orders and payments
2. Fraud detection and prevention
3. Refund and chargeback management
4. Financial record-keeping and tax compliance

**Secondary Purposes**:
- Payment method management for user convenience
- Transaction history for user reference

### Communication Data

**Primary Purposes**:
1. Providing customer support
2. Sending transactional emails (order confirmations, password resets)
3. Responding to user inquiries

**Secondary Purposes**:
- Marketing communications (with consent)
- Service announcements and updates
- Improving support quality

## Legal Basis for Processing

| Data Type | Legal Basis | GDPR Article | Justification |
|-----------|-------------|--------------|---------------|
| Account Data | Contract Performance | Art. 6(1)(b) | Necessary to provide service |
| Design Data | Contract Performance | Art. 6(1)(b) | Core service feature |
| Usage Data (Essential) | Legitimate Interest | Art. 6(1)(f) | Platform improvement and security |
| Usage Data (Analytics) | Consent | Art. 6(1)(a) | Optional enhanced analytics |
| Payment Data | Contract Performance | Art. 6(1)(b) | Order fulfillment |
| Payment Data (Retention) | Legal Obligation | Art. 6(1)(c) | Tax and accounting requirements |
| Marketing Communications | Consent | Art. 6(1)(a) | Opt-in email marketing |
| Support Communications | Contract Performance | Art. 6(1)(b) | Service provision and support |
| Security Logs | Legitimate Interest | Art. 6(1)(f) | Platform security and fraud prevention |

### Legitimate Interest Assessments (LIA)

For processing based on legitimate interest, we have conducted assessments to ensure:

1. **Purpose Test**: Our interest is legitimate and clearly defined
2. **Necessity Test**: Processing is necessary to achieve that purpose
3. **Balancing Test**: Our interest doesn't override user rights and freedoms

**Example LIA - Security Monitoring**:
- **Our Interest**: Protecting platform and user accounts from unauthorized access
- **Necessity**: Logging login attempts is necessary to detect suspicious activity
- **User Impact**: Minimal - enhances their security
- **Safeguards**: Limited retention (90 days), access controls, hashed IP addresses
- **Conclusion**: Legitimate interest justified

## Data Recipients

### Internal Recipients

**Access is granted on a need-to-know basis**:

| Team | Data Access | Purpose | Controls |
|------|-------------|---------|----------|
| Engineering | All data (production) | Platform development and maintenance | Role-based access, audit logging |
| Support | Account, Design, Communication | Customer assistance | Read-only for most data, change logging |
| Security | Logs, Authentication data | Security monitoring and incident response | Dedicated security tools, SOC access |
| Analytics | Usage data (anonymized) | Product insights | Anonymized datasets only |
| Finance | Payment data (limited) | Accounting and reconciliation | Accounting system access only |
| Marketing | Email, Preferences | Marketing campaigns | Only consented users, unsubscribe honored |

### External Recipients (Data Processors)

| Processor | Data Shared | Purpose | Location | Safeguards |
|-----------|-------------|---------|----------|------------|
| AWS | All data | Cloud hosting and storage | US (us-east-1, eu-west-1) | DPA, SCCs, encryption |
| Stripe | Payment information | Payment processing | US | PCI-DSS, DPA, SCCs |
| SendGrid | Email, Name | Email delivery | US | DPA, SCCs |
| Auth0 | Authentication data | Identity management | US | DPA, SCCs, ISO 27001 |
| Google Analytics | Usage data (anonymized IP) | Website analytics | US | Data Processing Amendment, IP anonymization |
| Sentry | Error logs (anonymized) | Error tracking | US | DPA, data scrubbing |

All processors are contractually obligated to:
- Process data only on our instructions
- Implement appropriate security measures
- Maintain confidentiality
- Assist with data subject rights
- Notify us of breaches
- Delete/return data on termination

### Third-Party Recipients (Not Processors)

We do NOT sell or share personal data with third parties for their own purposes, except:

1. **Legal Obligations**: Law enforcement, regulators (when legally required)
2. **Business Transfers**: In case of merger/acquisition (users notified)
3. **Public Designs**: When users explicitly choose to make designs public

## International Data Transfers

### Transfer Mechanisms

KitchenXpert is headquartered in the United States. Personal data of EU users is transferred from the EU to the US using appropriate safeguards:

**Primary Mechanism**: Standard Contractual Clauses (SCCs)
- **Version**: 2021 SCCs (Commission Implementing Decision 2021/914)
- **Type**: Module Two (Controller to Processor)
- **Supplementary Measures**: Encryption in transit and at rest, access controls, US privacy law compliance

**Data Localization Options**:
- EU users' design data is stored in AWS eu-west-1 (Ireland) region
- Metadata and account data may be replicated to US regions for redundancy
- Users can request EU-only data storage (Enterprise plan)

### Countries Involved

| Country | Entity | Role | Safeguards |
|---------|--------|------|------------|
| Ireland | AWS eu-west-1 | Data storage (EU users) | EU data center, GDPR compliant |
| United States | KitchenXpert Inc. | Data controller | SCCs, Privacy Shield principles (voluntarily) |
| United States | AWS us-east-1 | Data storage (US users) | SCCs, DPA |
| United States | Stripe | Payment processor | SCCs, PCI-DSS |
| United States | SendGrid | Email delivery | SCCs, DPA |

### Transfer Impact Assessment

We regularly assess the impact of international transfers, considering:
- Legal framework in destination countries
- Practical access by public authorities
- Supplementary measures needed to ensure adequate protection

**Last Assessment**: December 2025
**Outcome**: SCCs with supplementary measures provide adequate protection

## Retention Periods

### Retention Schedule

| Data Type | Retention Period | Legal Basis | Deletion Method |
|-----------|------------------|-------------|-----------------|
| Account Data (Active) | Duration of account | Contract performance | N/A (account active) |
| Account Data (Deleted) | 7 years after deletion request | Legal obligation (tax/audit) | Hard delete after 7 years |
| Design Data (Active) | Duration of account | Contract performance | N/A (account active) |
| Design Data (Deleted) | 30 days after account deletion | Grace period for recovery | Hard delete after 30 days |
| Usage Data (Analytics) | 2 years | Legitimate interest | Automated deletion |
| Payment Data | 7 years | Legal obligation (accounting) | Automated deletion |
| Support Tickets | 3 years | Legitimate interest | Automated deletion |
| Security Logs | 1 year | Legitimate interest | Automated deletion |
| Audit Logs | 7 years | Legal obligation | Automated deletion |
| Marketing Data | Until consent withdrawn + 30 days | Consent | Immediate upon withdrawal |
| Email Verification Tokens | 24 hours | Technical necessity | Automated deletion |
| Password Reset Tokens | 1 hour | Technical necessity | Automated deletion |

### Retention Justification

**7-Year Retention for Financial Data**:
- Required by tax laws (IRS, EU tax authorities)
- Standard accounting practice
- Necessary for audit and legal compliance

**30-Day Grace Period for Deleted Designs**:
- Allows users to recover accidentally deleted designs
- Balances user convenience with data minimization
- Clear communication to users about grace period

**2-Year Analytics Retention**:
- Sufficient for trend analysis and product improvement
- Balances business needs with storage limitation principle
- Anonymized after 6 months for longer-term analysis

### Automated Deletion

We implement automated deletion processes:

```python
# Example: Automated deletion cron job (pseudocode)
def cleanup_expired_data():
    # Delete designs 30 days after account deletion
    delete_where(designs,
        account_deleted_at < now() - 30_days)

    # Delete analytics older than 2 years
    delete_where(analytics,
        created_at < now() - 2_years)

    # Delete expired tokens
    delete_where(tokens,
        expires_at < now())

    log_cleanup_activity()
```

## Technical and Organizational Measures

### Technical Measures

**Encryption**:
- **In Transit**: TLS 1.3 for all connections
- **At Rest**: AES-256 encryption for all data at rest
- **Database**: Encrypted database volumes (AWS RDS encryption)
- **Backups**: Encrypted backups with separate key management

**Access Controls**:
- Role-Based Access Control (RBAC) for all systems
- Multi-Factor Authentication (MFA) required for admin access
- Principle of least privilege
- Regular access reviews (quarterly)

**Pseudonymization and Anonymization**:
- IP addresses hashed after 24 hours
- User IDs used instead of names in analytics
- Design data anonymized for ML training
- Aggregated reports contain no personal identifiers

**Security Monitoring**:
- Intrusion Detection Systems (IDS)
- Security Information and Event Management (SIEM)
- Automated vulnerability scanning
- Regular penetration testing (annual)

**Data Loss Prevention**:
- Automated backups (daily, 30-day retention)
- Geo-redundant storage
- Disaster recovery plan (tested quarterly)
- Backup encryption and access controls

### Organizational Measures

**Policies and Procedures**:
- Data Protection Policy (reviewed annually)
- Incident Response Plan
- Access Control Policy
- Data Retention Policy
- Third-Party Risk Management Policy

**Training and Awareness**:
- Annual GDPR training for all employees
- Specialized privacy training for engineering and support
- Regular security awareness campaigns
- Onboarding privacy training for new hires

**Accountability**:
- Designated Data Protection Officer (DPO)
- Privacy by Design reviews for new features
- Data Protection Impact Assessments (DPIAs) for high-risk processing
- Regular internal audits

**Vendor Management**:
- Due diligence on all processors
- Data Processing Agreements (DPAs) with all processors
- Annual processor reviews
- Monitoring of processor security incidents

**Incident Management**:
- 24/7 security monitoring
- Defined incident response procedures
- Breach notification process (within 72 hours)
- Post-incident reviews and improvements

## Record of Processing Activities (ROPA)

### ROPA Template

For each processing activity, we maintain the following information:

**Activity Name**: User Account Management

**Controller**: KitchenXpert Inc., 123 Design Plaza, San Francisco, CA 94105

**Data Protection Officer**: Sarah Mitchell, dpo@kitchenxpert.com

**Purposes**: User authentication, account management, service provision

**Categories of Data Subjects**: Platform users (B2C), business customers (B2B)

**Categories of Personal Data**:
- Identity data (name, email)
- Credentials (password hash)
- Account metadata (creation date, preferences)

**Categories of Recipients**:
- Internal: Engineering, Support teams
- External: AWS (hosting), Auth0 (authentication)

**Transfers to Third Countries**: Yes, to United States via SCCs

**Retention Period**: Duration of account + 7 years after deletion

**Security Measures**: Encryption (TLS 1.3, AES-256), MFA, RBAC, audit logging

**DPIA Required**: No (low risk)

**Legal Basis**: Contract performance (Art. 6(1)(b))

---

### Complete ROPA Table

| Activity | Purpose | Data Categories | Legal Basis | Retention | DPIA |
|----------|---------|-----------------|-------------|-----------|------|
| Account Management | Authentication, service provision | Identity, credentials | Contract | Account + 7y | No |
| Design Storage | Store user designs | Design files, metadata | Contract | Account + 30d | No |
| AI Design Generation | Generate design recommendations | Design preferences | Contract | Session only | Yes |
| Payment Processing | Order fulfillment | Payment info, order details | Contract | 7 years | No |
| Marketing Emails | Promotional communications | Email, preferences | Consent | Until withdrawal | No |
| Security Monitoring | Fraud prevention, security | Logs, IP addresses | Legitimate Interest | 1 year | No |
| Analytics | Platform improvement | Usage data (anonymized) | Legitimate Interest | 2 years | No |
| Support Tickets | Customer assistance | Contact info, issue details | Contract | 3 years | No |

### ROPA Maintenance

- **Review Frequency**: Quarterly or when processing changes
- **Last Updated**: 2026-01-10
- **Next Review**: 2026-04-10
- **Responsible**: Data Protection Officer
- **Approval**: Privacy Counsel, CTO

## Related Documentation

- [GDPR Overview](./overview.md) - General GDPR compliance information
- [Consent Management](./consent-management.md) - How we obtain and manage consent
- [Data Retention Policy](../data-retention/policy.md) - Detailed retention schedules
- [Security Architecture](../../security/architecture.md) - Technical security measures
- [Privacy Policy](../../legal/privacy-policy.md) - User-facing privacy notice

## Document Control

- **Document Owner**: Data Protection Officer
- **Review Frequency**: Quarterly
- **Last Reviewed**: 2026-01-10
- **Next Review**: 2026-04-10
- **Version**: 2.8
- **Approved By**: Sarah Mitchell (DPO), Legal Counsel

---

*This document serves as our Article 30 GDPR record of processing activities. It is regularly updated to reflect changes in our data processing practices.*
"""
    return content


# Main execution
if __name__ == "__main__":
    base_dir = "c:/Users/AA/KitchenXpertProject/docs/compliance/gdpr"

    # Create all files
    files = {
        "overview.md": create_gdpr_overview(),
        "data-processing.md": create_data_processing(),
    }

    for filename, content in files.items():
        filepath = f"{base_dir}/{filename}"
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Created: {filepath}")

    print(f"\nSuccessfully created {len(files)} GDPR documentation files!")
