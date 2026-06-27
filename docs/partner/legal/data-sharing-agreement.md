# Data Sharing Agreement

**Version:** 2.0 **Last Updated:** 2026-01-12 **Effective Date:** 2026-01-12

---

## Table of Contents

1. [Preamble and Purpose](#1-preamble-and-purpose)
2. [Parties to This Agreement](#2-parties-to-this-agreement)
3. [Definitions](#3-definitions)
4. [Data Flows and Categories](#4-data-flows-and-categories)
5. [Purpose of Data Sharing](#5-purpose-of-data-sharing)
6. [Data Protection Obligations](#6-data-protection-obligations)
7. [Security Requirements](#7-security-requirements)
8. [Data Retention and Deletion](#8-data-retention-and-deletion)
9. [Sub-processors](#9-sub-processors)
10. [International Data Transfers](#10-international-data-transfers)
11. [Data Subject Rights](#11-data-subject-rights)
12. [Data Breach Notification](#12-data-breach-notification)
13. [Audit Rights](#13-audit-rights)
14. [Liability and Indemnification](#14-liability-and-indemnification)
15. [Term and Termination](#15-term-and-termination)
16. [Governing Law and Jurisdiction](#16-governing-law-and-jurisdiction)
17. [General Provisions](#17-general-provisions)
18. [Contact Information](#18-contact-information)
19. [Annexes](#19-annexes)

---

## 1. Preamble and Purpose

### 1.1 Background

This Data Sharing Agreement ("Agreement" or "DSA") governs the exchange of data
between KitchenXpert SAS ("KitchenXpert") and its Partners ("Partner") in
connection with the KitchenXpert Partner Program and the operation of the
KitchenXpert Platform.

### 1.2 Purpose

The purpose of this Agreement is to:

a) Define the types of data shared between the parties;

b) Establish the roles and responsibilities of each party regarding data
protection;

c) Ensure compliance with applicable data protection laws, including the General
Data Protection Regulation (GDPR);

d) Specify the technical and organizational measures for data security;

e) Set forth procedures for handling data subject requests and data breaches;

f) Protect the rights and interests of data subjects whose personal data is
processed.

### 1.3 Relationship to Other Agreements

This Agreement is incorporated into and forms part of the
[Partner Terms of Service](./terms-of-service.md). In the event of any conflict
between this Agreement and the Partner Terms of Service regarding data
protection matters, this Agreement shall prevail.

### 1.4 Regulatory Framework

This Agreement is designed to comply with:

- Regulation (EU) 2016/679 (General Data Protection Regulation - GDPR)
- French Law No. 78-17 of January 6, 1978 (Loi Informatique et Libertes)
- Applicable national data protection laws of EU Member States
- European Data Protection Board guidelines and recommendations

---

## 2. Parties to This Agreement

### 2.1 KitchenXpert

**KitchenXpert SAS** 15 Rue de la Innovation 75008 Paris, France

Company Registration: Paris Trade and Companies Registry Registration Number:
847 293 156 VAT Number: FR 12 847 293 156

Represented by: [Authorized Representative] Position: [Title]

### 2.2 Partner

The Partner is the entity identified in the Partner Account registration, as
accepted by KitchenXpert and bound by the Partner Terms of Service.

Partner details are maintained in the Partner Portal and include:

- Legal company name
- Registered address
- Company registration number
- VAT number
- Authorized representative contact

### 2.3 Data Protection Contacts

**KitchenXpert Data Protection Officer:** Email: dpo@kitchenxpert.com Phone: +33
1 XX XX XX XX

**Partner Data Protection Contact:** As designated in the Partner Account
settings or the contact provided during onboarding.

---

## 3. Definitions

For the purposes of this Agreement, the following definitions apply:

### 3.1 General Terms

**"Agreement"** means this Data Sharing Agreement, including all Annexes.

**"Applicable Data Protection Law"** means GDPR and any other applicable data
protection laws and regulations.

**"Effective Date"** means the date this Agreement comes into force, being the
later of (i) the date the Partner accepts the Partner Terms of Service, or (ii)
the date specified above.

### 3.2 Data Protection Terms

**"Controller"** means the natural or legal person, public authority, agency, or
other body which, alone or jointly with others, determines the purposes and
means of the processing of Personal Data.

**"Data Subject"** means an identified or identifiable natural person to whom
Personal Data relates.

**"Personal Data"** means any information relating to an identified or
identifiable natural person, as defined in Article 4(1) of GDPR.

**"Personal Data Breach"** means a breach of security leading to the accidental
or unlawful destruction, loss, alteration, unauthorized disclosure of, or access
to, Personal Data transmitted, stored, or otherwise processed.

**"Processing"** means any operation or set of operations performed on Personal
Data, whether or not by automated means, such as collection, recording,
organization, structuring, storage, adaptation, alteration, retrieval,
consultation, use, disclosure by transmission, dissemination, alignment,
combination, restriction, erasure, or destruction.

**"Processor"** means a natural or legal person, public authority, agency, or
other body which processes Personal Data on behalf of the Controller.

**"Sub-processor"** means any Processor engaged by KitchenXpert or Partner to
process Personal Data on their behalf.

### 3.3 Data Category Definitions

**"Analytics Data"** means aggregated or anonymized data derived from Platform
usage, including product views, search patterns, conversion rates, and market
trends, that does not identify individual Data Subjects.

**"Customer Data"** means Personal Data of end-user customers who purchase
products through the Platform, including names, contact information, delivery
addresses, and order details.

**"Order Data"** means information related to customer orders, including order
numbers, product details, quantities, prices, shipping information, and
fulfillment status.

**"Partner Business Data"** means information about the Partner's business,
including company details, tax information, bank details, and contact
information of Partner representatives.

**"Product Data"** means information about Partner's products, including
descriptions, specifications, images, pricing, and inventory levels.

---

## 4. Data Flows and Categories

### 4.1 Overview of Data Flows

Data flows between the parties in two primary directions:

- Partner to KitchenXpert: Product and business data for platform operation
- KitchenXpert to Partner: Order and analytics data for fulfillment and business
  intelligence

### 4.2 Data Shared by Partner to KitchenXpert

#### 4.2.1 Product Catalog Data

**Data Elements:**

- Product names and descriptions
- Model numbers and SKUs
- Technical specifications (dimensions, materials, finishes)
- Product categories and classifications
- Pricing information (base price, promotional prices, volume discounts)
- Availability and lead times

**Format:** JSON via API, CSV upload, or manual entry in Partner Portal

**Frequency:** Real-time via API or batch updates (minimum daily)

**Controller:** Partner (for product content)

#### 4.2.2 Pricing Data

**Data Elements:**

- Retail prices
- Wholesale prices
- Currency
- VAT rates
- Promotional pricing and validity periods
- Volume discount tiers

**Format:** JSON via API or Partner Portal

**Frequency:** Real-time or batch (minimum daily updates)

**Controller:** Partner

#### 4.2.3 Inventory Data

**Data Elements:**

- Stock quantities by SKU
- Warehouse locations
- Reorder points
- Expected restock dates
- Lead times for custom/made-to-order products

**Format:** JSON via API or Partner Portal

**Frequency:** Real-time (recommended) or hourly updates

**Controller:** Partner

#### 4.2.4 Product Images and Media

**Data Elements:**

- Product photographs (multiple angles)
- Lifestyle images
- Product videos
- 3D models and CAD files (if provided by Partner)
- Marketing materials
- Brand logos

**Format:** JPEG, PNG, MP4, OBJ, STEP, as applicable

**Frequency:** As updated by Partner

**Controller:** Partner (intellectual property owner)

#### 4.2.5 Partner Business Data

**Data Elements:**

- Company name and registration details
- Tax identification (VAT number)
- Bank account information for payments
- Contact information of authorized personnel
- Shipping and fulfillment capabilities

**Format:** Structured forms in Partner Portal

**Frequency:** Initial registration and updates as needed

**Controller:** KitchenXpert (for processing purposes)

### 4.3 Data Shared by KitchenXpert to Partner

#### 4.3.1 Order Data

**Data Elements:**

- Order identification number
- Order date and time
- Customer name and contact information
- Delivery address
- Billing address
- Products ordered (SKUs, quantities, prices)
- Special instructions or customizations
- Payment status
- Required delivery date

**Format:** JSON via API, Partner Portal dashboard, email notifications

**Frequency:** Real-time upon order placement

**Controller:** KitchenXpert (joint controller with Partner for fulfillment)

#### 4.3.2 Customer Information for Fulfillment

**Data Elements:**

- Customer name
- Delivery address
- Phone number (for delivery coordination)
- Email address (for order communications)
- Delivery preferences and instructions

**Format:** Included in Order Data

**Frequency:** With each order

**Controller:** KitchenXpert (Partner acts as Processor for fulfillment)

#### 4.3.3 Performance Analytics (Anonymized)

**Data Elements:**

- Product view counts
- Add-to-cart rates
- Conversion rates
- Average order value for Partner products
- Category performance benchmarks
- Search ranking data
- Customer rating averages

**Format:** Dashboards in Partner Portal, downloadable reports

**Frequency:** Daily updates, weekly/monthly reports

**Controller:** KitchenXpert (anonymized/aggregated data)

#### 4.3.4 Market Insights (Aggregated)

**Data Elements:**

- Category trends
- Regional demand patterns
- Seasonal variations
- Competitive benchmarks (anonymized)
- Customer preference trends
- Price sensitivity indicators

**Format:** Reports and visualizations in Partner Portal

**Frequency:** Weekly or monthly

**Controller:** KitchenXpert (aggregated data, no personal data)

#### 4.3.5 Customer Feedback

**Data Elements:**

- Product ratings (numerical scores)
- Written reviews (text)
- Response to reviews capability
- Aggregated sentiment analysis

**Format:** Partner Portal interface

**Frequency:** Real-time access

**Controller:** KitchenXpert (customer-generated content)

---

## 5. Purpose of Data Sharing

### 5.1 Primary Purposes

Data is shared between the parties for the following purposes:

#### 5.1.1 Platform Operation

- Displaying Partner products on the KitchenXpert Platform
- Enabling customers to search, view, and purchase products
- Integrating products into 3D kitchen design tools
- Generating AI-powered product recommendations

#### 5.1.2 Order Fulfillment

- Processing customer orders
- Enabling Partner to fulfill orders and arrange delivery
- Tracking order status and updates
- Managing returns and refunds

#### 5.1.3 Payment Processing

- Calculating commissions and fees
- Processing payments to Partners
- Generating financial reports and statements

#### 5.1.4 Business Analytics

- Providing Partners with performance insights
- Enabling data-driven business decisions
- Optimizing product offerings and pricing

#### 5.1.5 Quality Assurance

- Monitoring product quality and customer satisfaction
- Managing ratings and reviews
- Identifying and resolving issues

### 5.2 Permitted Uses

**Partner may use data received from KitchenXpert for:**

- Fulfilling customer orders
- Providing customer support related to orders
- Analyzing performance of products on the Platform
- Improving product offerings based on insights
- Complying with legal obligations

**Partner may NOT use data received from KitchenXpert for:**

- Direct marketing to customers without appropriate consent
- Sharing customer data with third parties (except for fulfillment)
- Building competing customer databases
- Any purpose not related to the Partner Program

### 5.3 KitchenXpert Use of Partner Data

**KitchenXpert may use data received from Partner for:**

- Operating the Platform and displaying products
- Marketing and promoting Partner products
- Training AI/ML models for recommendations (with appropriate safeguards)
- Generating aggregated market insights
- Complying with legal obligations

---

## 6. Data Protection Obligations

### 6.1 Controller and Processor Roles

The parties' roles depend on the type of data:

| Data Category                   | Partner Role                  | KitchenXpert Role |
| ------------------------------- | ----------------------------- | ----------------- |
| Partner Business Data           | Data Subject (where personal) | Controller        |
| Product Data                    | Controller                    | Processor         |
| Order Data                      | Joint Controller              | Joint Controller  |
| Customer Data (for fulfillment) | Processor                     | Controller        |
| Analytics Data (anonymized)     | N/A                           | Controller        |

### 6.2 Partner Obligations as Controller

When acting as Controller, Partner shall:

a) Ensure all Product Data is accurate and lawfully obtained;

b) Have appropriate legal basis for any personal data included in Product Data;

c) Respond to data subject requests related to Product Data;

d) Notify KitchenXpert of any changes affecting data processing;

e) Conduct data protection impact assessments where required.

### 6.3 Partner Obligations as Processor

When processing Customer Data for order fulfillment, Partner shall:

a) Process Customer Data only for the purposes specified in this Agreement;

b) Follow KitchenXpert's documented instructions regarding data processing;

c) Ensure confidentiality of personnel with access to Customer Data;

d) Implement appropriate technical and organizational security measures;

e) Not engage sub-processors without KitchenXpert's prior authorization;

f) Assist KitchenXpert in responding to data subject requests;

g) Delete or return Customer Data upon termination;

h) Make available information to demonstrate compliance;

i) Allow and contribute to audits and inspections.

### 6.4 KitchenXpert Obligations as Controller

When acting as Controller, KitchenXpert shall:

a) Process Partner and Customer personal data in accordance with Applicable Data
Protection Law;

b) Maintain appropriate legal basis for all processing;

c) Provide transparency to data subjects through Privacy Policies;

d) Respond to data subject requests within required timeframes;

e) Implement appropriate security measures;

f) Notify Partners of data breaches as required.

### 6.5 KitchenXpert Obligations as Processor

When processing Product Data on behalf of Partner, KitchenXpert shall:

a) Process data only on documented instructions from Partner;

b) Ensure confidentiality of processing personnel;

c) Implement appropriate security measures;

d) Engage sub-processors only with Partner's authorization;

e) Assist Partner with data subject requests and compliance obligations;

f) Delete or return Product Data upon termination (subject to legal retention);

g) Provide information to demonstrate compliance.

### 6.6 Joint Controller Responsibilities

For Order Data where parties act as joint controllers:

a) KitchenXpert is responsible for:

- Collecting customer orders
- Processing payments
- Providing customer-facing privacy information
- Handling general data subject requests

b) Partner is responsible for:

- Order fulfillment communications
- Delivery-related data subject requests
- Post-delivery customer service data

c) Both parties shall:

- Cooperate in handling data subject requests
- Notify each other of relevant requests or complaints
- Maintain records of processing activities

---

## 7. Security Requirements

### 7.1 General Security Obligations

Both parties shall implement appropriate technical and organizational measures
to ensure a level of security appropriate to the risk, including:

a) Pseudonymization and encryption of personal data where appropriate;

b) Ability to ensure ongoing confidentiality, integrity, availability, and
resilience of processing systems;

c) Ability to restore availability and access to personal data in a timely
manner following an incident;

d) Process for regularly testing, assessing, and evaluating effectiveness of
security measures.

### 7.2 Technical Security Measures

#### 7.2.1 Data Encryption

**In Transit:**

- TLS 1.2 or higher for all data transmissions
- HTTPS required for all API connections
- Certificate-based authentication for API access
- Encrypted email for sensitive communications

**At Rest:**

- AES-256 encryption for stored data
- Encrypted database storage
- Encrypted backups
- Secure key management

#### 7.2.2 Access Controls

- Role-based access control (RBAC)
- Principle of least privilege
- Unique user accounts (no shared credentials)
- Strong password requirements (minimum 12 characters, complexity requirements)
- Multi-factor authentication (MFA) required for administrative access
- Regular access reviews (minimum quarterly)
- Automatic session timeout (maximum 30 minutes of inactivity)
- Account lockout after failed login attempts

#### 7.2.3 Network Security

- Firewall protection
- Intrusion detection and prevention systems
- Network segmentation
- VPN for remote administrative access
- DDoS protection
- Regular vulnerability scanning

#### 7.2.4 Application Security

- Secure software development lifecycle (SDLC)
- Input validation and sanitization
- Protection against common vulnerabilities (OWASP Top 10)
- Regular penetration testing
- Web application firewall (WAF)
- Security patch management

### 7.3 Organizational Security Measures

#### 7.3.1 Personnel Security

- Background checks for personnel with access to personal data
- Confidentiality agreements and obligations
- Security awareness training (annual minimum)
- Clear security responsibilities
- Incident reporting procedures

#### 7.3.2 Physical Security

- Secure data center facilities
- Physical access controls
- Environmental controls (fire suppression, climate control)
- CCTV monitoring
- Visitor management

#### 7.3.3 Business Continuity

- Documented business continuity plan
- Disaster recovery procedures
- Regular backup procedures (daily minimum)
- Backup testing (annual minimum)
- Defined recovery time objectives (RTO)
- Defined recovery point objectives (RPO)

### 7.4 Partner-Specific Security Requirements

Partners must implement at minimum:

a) Secure storage of Customer Data received from KitchenXpert;

b) Access controls limiting data access to personnel with legitimate need;

c) Encryption of Customer Data at rest and in transit;

d) Secure deletion of Customer Data when no longer needed;

e) Incident response procedures for data breaches;

f) Employee training on data protection.

### 7.5 Security Certifications

KitchenXpert maintains or is pursuing the following certifications:

- ISO 27001 (Information Security Management)
- SOC 2 Type II
- PCI DSS (for payment processing)

Partners are encouraged to maintain similar certifications where applicable.

---

## 8. Data Retention and Deletion

### 8.1 Retention Principles

Data shall be retained only as long as necessary for the purposes for which it
was collected, or as required by law. Both parties shall implement data
retention policies consistent with this Agreement.

### 8.2 Retention Periods

#### 8.2.1 Product Data

| Data Type               | Retention Period                  | Basis                                  |
| ----------------------- | --------------------------------- | -------------------------------------- |
| Active product listings | Duration of partnership           | Contract performance                   |
| Discontinued products   | 2 years after discontinuation     | Historical reference, customer support |
| Product images          | Duration of partnership + 2 years | Contract, legitimate interest          |

#### 8.2.2 Order Data

| Data Type             | Retention Period            | Basis                                    |
| --------------------- | --------------------------- | ---------------------------------------- |
| Order details         | 10 years                    | French commercial law (Article L.123-22) |
| Customer contact info | Order fulfillment + 2 years | Legitimate interest, warranty support    |
| Payment records       | 10 years                    | Tax law requirements                     |

#### 8.2.3 Partner Business Data

| Data Type             | Retention Period      | Basis                   |
| --------------------- | --------------------- | ----------------------- |
| Account information   | Partnership + 5 years | Legal claims limitation |
| Financial records     | 10 years              | Tax and accounting law  |
| Communication history | 5 years               | Legitimate interest     |

#### 8.2.4 Analytics Data

| Data Type             | Retention Period        | Basis               |
| --------------------- | ----------------------- | ------------------- |
| Aggregated analytics  | Indefinite (anonymized) | Legitimate interest |
| Individual usage data | 2 years                 | Service improvement |

### 8.3 Deletion Procedures

#### 8.3.1 Upon Termination

Upon termination of the Partner Agreement:

**KitchenXpert shall:** a) Remove Partner products from public display within 30
days; b) Delete or anonymize Product Data within 90 days (subject to legal
retention); c) Provide Partner with export of their data upon request; d) Retain
Order Data as required by law.

**Partner shall:** a) Delete Customer Data received from KitchenXpert within 90
days (except as needed for warranty/legal); b) Cease using Analytics Data; c)
Return or delete Confidential Information.

#### 8.3.2 Data Subject Deletion Requests

When a data subject exercises their right to erasure:

a) The receiving party shall notify the other party within 5 business days; b)
Each party shall delete data in their systems within 30 days; c) Exceptions
apply where retention is required by law; d) Confirmation of deletion shall be
provided upon request.

### 8.4 Secure Deletion Standards

Data deletion shall meet the following standards:

- Digital data: Secure overwriting or cryptographic erasure
- Backup data: Deleted according to backup rotation schedule
- Physical media: Secure destruction (shredding, degaussing)
- Verification: Deletion logged and auditable

---

## 9. Sub-processors

### 9.1 Authorization for Sub-processors

Partner authorizes KitchenXpert to engage the sub-processors listed in Annex C
for the processing activities described therein.

### 9.2 General Authorization

Partner provides general authorization for KitchenXpert to engage additional
sub-processors, subject to:

a) KitchenXpert maintaining an up-to-date list of sub-processors; b) Notifying
Partner of any intended changes at least 30 days in advance; c) Partner having
the right to object to new sub-processors on reasonable grounds; d) KitchenXpert
entering into appropriate data processing agreements with sub-processors.

### 9.3 Sub-processor Requirements

KitchenXpert shall ensure that each sub-processor:

a) Is bound by data protection obligations no less protective than this
Agreement; b) Implements appropriate technical and organizational security
measures; c) Processes data only on KitchenXpert's documented instructions; d)
Assists with data subject requests and compliance obligations; e) Allows for
audits and inspections.

### 9.4 Objection to Sub-processors

If Partner objects to a new sub-processor:

a) Partner shall notify KitchenXpert in writing within 15 days of receiving
notice; b) Partner shall provide specific, reasonable grounds for the objection;
c) The parties shall discuss in good faith to resolve the objection; d) If no
resolution is reached, Partner may terminate affected services with 30 days
notice.

### 9.5 Liability for Sub-processors

KitchenXpert remains fully liable for the acts and omissions of its
sub-processors as if they were its own acts and omissions.

### 9.6 Partner Sub-processors

If Partner engages sub-processors for order fulfillment (e.g., logistics
providers):

a) Partner shall ensure sub-processors comply with Applicable Data Protection
Law; b) Partner shall enter into appropriate data processing agreements; c)
Partner remains liable for sub-processor acts and omissions; d) Partner shall
maintain a list of fulfillment sub-processors and provide upon request.

---

## 10. International Data Transfers

### 10.1 Data Location

Primary data storage and processing occurs within the European Economic Area
(EEA):

- Primary data centers: France, Germany
- Backup data centers: Netherlands, Ireland

### 10.2 Transfers Outside the EEA

Personal data may be transferred outside the EEA only when:

a) The recipient country has an adequacy decision from the European Commission;
b) Standard Contractual Clauses (SCCs) are in place; c) Binding Corporate Rules
apply; d) An exception under Article 49 GDPR applies; e) Other legally
recognized transfer mechanisms are implemented.

### 10.3 Standard Contractual Clauses

Where transfers rely on SCCs:

a) The current European Commission-approved SCCs shall be used; b) Module Two
(Controller to Processor) applies for Product Data transfers; c) Module One
(Controller to Controller) applies for joint controller scenarios; d)
Supplementary measures shall be implemented as necessary.

### 10.4 Transfer Impact Assessments

Before transferring data to countries without adequacy decisions:

a) KitchenXpert shall conduct a transfer impact assessment; b) The assessment
shall evaluate the laws of the destination country; c) Supplementary technical
and organizational measures shall be identified; d) Documentation shall be
maintained demonstrating compliance.

### 10.5 Current Transfer Locations

KitchenXpert may transfer data to the following non-EEA locations:

| Country        | Purpose                                                | Safeguard                     |
| -------------- | ------------------------------------------------------ | ----------------------------- |
| United States  | Cloud infrastructure (AWS, Google), Payment processing | SCCs + supplementary measures |
| United Kingdom | Customer support backup                                | Adequacy decision             |

### 10.6 Partner Transfer Obligations

If Partner transfers Customer Data outside the EEA:

a) Partner shall implement appropriate safeguards; b) Partner shall conduct
transfer impact assessments; c) Partner shall notify KitchenXpert of such
transfers; d) Partner remains responsible for compliance.

---

## 11. Data Subject Rights

### 11.1 Overview

Data subjects have the following rights under GDPR:

- Right of access (Article 15)
- Right to rectification (Article 16)
- Right to erasure (Article 17)
- Right to restriction of processing (Article 18)
- Right to data portability (Article 20)
- Right to object (Article 21)
- Rights related to automated decision-making (Article 22)

### 11.2 Responsibility for Handling Requests

#### 11.2.1 Customer Requests

| Request Type                   | Primary Handler | Support Required                  |
| ------------------------------ | --------------- | --------------------------------- |
| Access to order data           | KitchenXpert    | Partner provides fulfillment info |
| Rectification of delivery info | Partner         | KitchenXpert updates records      |
| Erasure requests               | KitchenXpert    | Partner deletes Customer Data     |
| Marketing opt-outs             | KitchenXpert    | N/A                               |

#### 11.2.2 Partner Personnel Requests

| Request Type           | Handler                                           |
| ---------------------- | ------------------------------------------------- |
| Access to account data | KitchenXpert                                      |
| Rectification          | Partner updates via Portal; KitchenXpert verifies |
| Erasure                | KitchenXpert (subject to retention requirements)  |

### 11.3 Request Handling Procedures

#### 11.3.1 Notification

a) If either party receives a data subject request relevant to the other party,
they shall notify the other within 5 business days;

b) Notification shall include: identity of requestor (if known), nature of
request, relevant data categories, deadline for response.

#### 11.3.2 Response Timeline

a) Requests shall be responded to within 30 days of receipt; b) Complex requests
may be extended by 60 days with notification to the data subject; c) The
responsible party shall keep the other party informed of progress.

#### 11.3.3 Cooperation

a) Each party shall provide reasonable assistance to enable the other to respond
to requests; b) Assistance shall be provided within 10 business days of request;
c) Costs for excessive assistance may be recoverable.

### 11.4 Identity Verification

Before responding to requests:

a) The identity of the requestor shall be verified; b) Appropriate verification
methods shall be used (e.g., account authentication, identity documents); c)
Requests shall not be fulfilled if identity cannot be verified.

---

## 12. Data Breach Notification

### 12.1 Definition of Data Breach

A Personal Data Breach includes any breach of security leading to:

- Accidental or unlawful destruction of personal data
- Loss of personal data
- Alteration of personal data
- Unauthorized disclosure of personal data
- Unauthorized access to personal data

### 12.2 Internal Detection and Response

Each party shall:

a) Implement procedures to detect potential breaches; b) Investigate potential
breaches promptly; c) Document all breaches, including those not requiring
notification; d) Take immediate steps to contain and mitigate breaches.

### 12.3 Notification to the Other Party

#### 12.3.1 Timeline

The party discovering a breach shall notify the other party:

- Within 24 hours of becoming aware of a suspected breach
- Within 48 hours of confirming a breach

#### 12.3.2 Initial Notification Content

Initial notification shall include:

a) Date and time breach was discovered; b) Nature of the breach (description of
what occurred); c) Categories of data affected; d) Approximate number of records
affected; e) Likely consequences; f) Measures taken or proposed to address the
breach; g) Contact point for further information.

#### 12.3.3 Ongoing Updates

The notifying party shall provide updates:

a) As additional information becomes available; b) On containment and
remediation measures; c) On notifications to authorities and data subjects.

### 12.4 Notification to Supervisory Authorities

#### 12.4.1 KitchenXpert Responsibility

KitchenXpert shall notify the CNIL (French supervisory authority) within 72
hours when:

a) A breach affects Customer Data or Partner personal data; b) The breach is
likely to result in risk to individuals' rights and freedoms; c) Required by
GDPR Article 33.

#### 12.4.2 Partner Responsibility

Partner shall notify relevant supervisory authorities when:

a) A breach affects Product Data containing personal data for which Partner is
Controller; b) A breach occurs in Partner systems affecting Customer Data.

### 12.5 Notification to Data Subjects

When a breach is likely to result in high risk to individuals:

a) The Controller shall notify affected data subjects without undue delay; b)
Notification shall describe the nature of the breach and recommended steps; c)
The parties shall coordinate on customer-facing communications.

### 12.6 Cooperation and Investigation

Both parties shall:

a) Cooperate fully in investigating breaches; b) Preserve evidence related to
the breach; c) Not make public statements without coordinating with the other
party; d) Participate in post-incident reviews and implement improvements.

### 12.7 Contact Points for Breach Notification

**KitchenXpert Security Team:** Email: security@kitchenxpert.com Phone: +33 1 XX
XX XX XX (24/7 emergency line)

**Partner Contact:** As designated in Partner Account security settings.

---

## 13. Audit Rights

### 13.1 KitchenXpert Audit Rights

KitchenXpert may audit Partner's compliance with this Agreement:

a) Upon 30 days written notice for routine audits; b) Upon 48 hours notice for
cause (suspected breach or non-compliance); c) Immediately in case of data
breach or regulatory investigation.

### 13.2 Partner Audit Rights

Partner may audit KitchenXpert's processing of Partner Data:

a) Upon 30 days written notice; b) Maximum once per calendar year (unless cause
exists); c) Through third-party auditors bound by confidentiality.

### 13.3 Audit Scope

Audits may include:

a) Review of policies and procedures; b) Inspection of security measures; c)
Review of access logs and records; d) Interviews with relevant personnel; e)
Review of sub-processor arrangements; f) Testing of technical controls (with
agreement).

### 13.4 Audit Procedures

a) Audits shall be conducted during normal business hours; b) Audits shall not
unreasonably disrupt business operations; c) Auditors shall comply with site
security policies; d) Confidential information of other clients shall be
protected; e) Audit findings shall be shared with the audited party.

### 13.5 Alternative Assurance

In lieu of direct audits, KitchenXpert may provide:

a) ISO 27001 certification reports; b) SOC 2 Type II reports; c) Third-party
penetration test summaries; d) Regulatory audit reports (where permitted).

### 13.6 Audit Costs

a) Each party bears its own costs for audits it initiates; b) If an audit
reveals material non-compliance, the non-compliant party bears all audit costs;
c) Costs of regulatory audits are borne by the party being audited.

### 13.7 Remediation

If an audit identifies non-compliance:

a) The non-compliant party shall provide a remediation plan within 30 days; b)
Remediation shall be completed within agreed timeframes; c) Follow-up audits may
be conducted to verify remediation.

---

## 14. Liability and Indemnification

### 14.1 Allocation of Liability

Each party is liable for damages arising from their own:

a) Breach of this Agreement; b) Violation of Applicable Data Protection Law; c)
Processing outside the scope of lawful instructions; d) Negligent acts or
omissions causing data breaches.

### 14.2 Joint Controller Liability

For processing where parties act as joint controllers:

a) Each party may be held liable for the entire damage to data subjects; b) The
party that paid compensation may recover from the other party their
proportionate share; c) Proportionate share is determined based on each party's
responsibility.

### 14.3 Processor Liability

When acting as Processor:

a) The Processor is liable for damages only if it has not complied with GDPR
obligations specifically for Processors, or has acted outside or contrary to
lawful Controller instructions;

b) The Controller remains responsible for demonstrating compliance with data
protection principles.

### 14.4 Partner Indemnification

Partner shall indemnify, defend, and hold harmless KitchenXpert from claims
arising from:

a) Partner's breach of this Agreement; b) Partner's violation of Applicable Data
Protection Law; c) Partner's processing of Customer Data outside permitted
purposes; d) Acts or omissions of Partner's sub-processors; e) Inaccurate or
unlawful Product Data provided by Partner.

### 14.5 KitchenXpert Indemnification

KitchenXpert shall indemnify, defend, and hold harmless Partner from claims
arising from:

a) KitchenXpert's breach of this Agreement; b) KitchenXpert's violation of
Applicable Data Protection Law; c) Unauthorized processing of Partner Data; d)
Acts or omissions of KitchenXpert's sub-processors.

### 14.6 Limitation of Liability

Subject to Section 14.7, each party's total liability under this Agreement shall
not exceed:

a) For KitchenXpert: The greater of (i) fees received from Partner in the 12
months preceding the claim, or (ii) EUR 100,000;

b) For Partner: The greater of (i) amounts received from KitchenXpert in the 12
months preceding the claim, or (ii) EUR 100,000.

### 14.7 Unlimited Liability

The limitations in Section 14.6 do not apply to:

a) Liability arising from willful misconduct or gross negligence; b) Fines,
penalties, or regulatory sanctions imposed on either party; c) Indemnification
obligations for third-party claims; d) Liability for breaches of confidentiality
obligations; e) Liability that cannot be limited under applicable law.

---

## 15. Term and Termination

### 15.1 Term

This Agreement commences on the Effective Date and continues for the duration of
the Partner Terms of Service.

### 15.2 Termination

This Agreement terminates automatically upon termination of the Partner Terms of
Service, for any reason.

### 15.3 Effect of Termination

Upon termination:

a) Each party shall cease processing data on behalf of the other; b) Data shall
be returned or deleted in accordance with Section 8; c) Surviving obligations
shall remain in effect.

### 15.4 Survival

The following provisions survive termination:

- Section 3 (Definitions)
- Section 8 (Data Retention and Deletion)
- Section 12 (Data Breach Notification)
- Section 13 (Audit Rights) - for 2 years post-termination
- Section 14 (Liability and Indemnification)
- Section 16 (Governing Law)
- Section 17 (General Provisions)

---

## 16. Governing Law and Jurisdiction

### 16.1 Governing Law

This Agreement shall be governed by and construed in accordance with the laws of
France, without regard to its conflict of law principles.

### 16.2 Jurisdiction

The parties submit to the exclusive jurisdiction of the courts of Paris, France
for any disputes arising under this Agreement.

### 16.3 Regulatory Authority

The competent supervisory authority for data protection matters is:

**Commission Nationale de l'Informatique et des Libertes (CNIL)** 3 Place de
Fontenoy TSA 80715 75334 Paris Cedex 07 France

---

## 17. General Provisions

### 17.1 Amendments

This Agreement may be amended:

a) By written agreement signed by both parties; or b) By KitchenXpert with 30
days notice for changes required by law or to reflect changes in sub-processors;
or c) As part of updates to the Partner Terms of Service in accordance with
Section 17.1 thereof.

### 17.2 Assignment

Neither party may assign this Agreement without the other's written consent,
except in connection with a merger, acquisition, or sale of substantially all
assets.

### 17.3 Severability

If any provision is held invalid or unenforceable, the remaining provisions
shall continue in full force and effect.

### 17.4 Entire Agreement

This Agreement, together with the Partner Terms of Service and referenced
documents, constitutes the entire agreement regarding data sharing and
supersedes all prior agreements on this subject.

### 17.5 No Waiver

Failure to enforce any provision does not constitute a waiver of that provision.

### 17.6 Notices

Notices under this Agreement shall be sent to the addresses in Section 18 or as
updated in the Partner Account.

---

## 18. Contact Information

### 18.1 KitchenXpert Contacts

**Data Protection Officer:** Email: dpo@kitchenxpert.com Phone: +33 1 XX XX XX
XX

**Privacy Team:** Email: privacy@kitchenxpert.com

**Security Team:** Email: security@kitchenxpert.com

**Legal Department:** Email: legal@kitchenxpert.com

**Mailing Address:** KitchenXpert SAS 15 Rue de la Innovation 75008 Paris,
France

### 18.2 Partner Contacts

Partner contacts as designated in the Partner Account settings.

---

## 19. Annexes

### Annex A: Data Categories and Processing Details

| Category                    | Data Elements                                | Purpose                      | Legal Basis         | Retention             |
| --------------------------- | -------------------------------------------- | ---------------------------- | ------------------- | --------------------- |
| Partner Business Data       | Company details, tax ID, bank info, contacts | Account management, payments | Contract            | Partnership + 5 years |
| Product Data                | Descriptions, specs, prices, images          | Platform display, 3D design  | Contract            | Partnership + 2 years |
| Order Data                  | Order details, customer info, delivery       | Order fulfillment            | Contract            | 10 years              |
| Customer Data (fulfillment) | Name, address, phone, email                  | Delivery, support            | Contract            | Fulfillment + 2 years |
| Analytics Data              | Views, conversions, ratings                  | Performance reporting        | Legitimate interest | 2 years               |

### Annex B: Technical and Organizational Measures

**Encryption:**

- TLS 1.2+ for data in transit
- AES-256 for data at rest
- Encrypted backups

**Access Control:**

- Role-based access control
- Multi-factor authentication
- Regular access reviews
- Automatic session timeout

**Network Security:**

- Firewalls and IDS/IPS
- Network segmentation
- VPN for administrative access
- DDoS protection

**Application Security:**

- Secure SDLC
- Regular penetration testing
- Web application firewall
- Vulnerability management

**Physical Security:**

- Secure data centers
- Access controls
- Environmental controls
- 24/7 monitoring

**Personnel:**

- Background checks
- Security training
- Confidentiality agreements

**Incident Response:**

- 24/7 security monitoring
- Documented response procedures
- Regular testing

### Annex C: Approved Sub-processors

| Sub-processor             | Location                  | Services             | Data Processed                    |
| ------------------------- | ------------------------- | -------------------- | --------------------------------- |
| Amazon Web Services (AWS) | EU (Frankfurt, Ireland)   | Cloud infrastructure | All data types                    |
| Google Cloud Platform     | EU (Belgium, Netherlands) | Analytics, ML        | Product Data, Analytics           |
| Stripe                    | US (SCCs in place)        | Payment processing   | Payment Data                      |
| SendGrid                  | US (SCCs in place)        | Email delivery       | Contact info, order notifications |
| Intercom                  | US (SCCs in place)        | Customer support     | Support communications            |
| Twilio                    | US (SCCs in place)        | SMS notifications    | Phone numbers, order info         |
| Salesforce                | US (SCCs in place)        | CRM                  | Partner business data             |
| Datadog                   | US (SCCs in place)        | System monitoring    | Technical logs                    |

_Sub-processor list last updated: 2026-01-12_

---

## Related Documents

- [Partner Terms of Service](./terms-of-service.md)
- [Partner Privacy Policy](./privacy-policy.md)
- [Intellectual Property Guidelines](./intellectual-property.md)

---

## Version History

| Version | Date       | Description                          |
| ------- | ---------- | ------------------------------------ |
| 1.0     | 2025-06-01 | Initial release                      |
| 1.1     | 2025-09-15 | Updated sub-processor list           |
| 2.0     | 2026-01-12 | Comprehensive revision and expansion |

---

_This Data Sharing Agreement forms part of the Partner Terms of Service. By
accepting the Partner Terms of Service, Partner agrees to be bound by this
Agreement._

**Last Updated: 2026-01-12**
