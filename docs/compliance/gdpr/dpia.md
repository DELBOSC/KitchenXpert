# Data Protection Impact Assessment (DPIA)

**Last Updated:** 2026-01-10

## Table of Contents

1. [Introduction](#introduction)
2. [When DPIA is Required](#when-dpia-is-required)
3. [DPIA Process](#dpia-process)
4. [DPIA for Key Processing Activities](#dpia-for-key-processing-activities)
5. [Risk Assessment Matrix](#risk-assessment-matrix)
6. [Mitigation Measures](#mitigation-measures)
7. [DPO Consultation](#dpo-consultation)
8. [DPIA Review Schedule](#dpia-review-schedule)
9. [DPIA Template](#dpia-template)
10. [Related Documentation](#related-documentation)

---

## Introduction

A DPIA identifies and minimizes data protection risks. Under GDPR Article 35,
DPIAs are mandatory for processing likely to result in high risk to individuals.

### Responsibilities

| Role          | Responsibility                                  |
| ------------- | ----------------------------------------------- |
| DPO           | Oversight, advice, review, sign-off             |
| Project Owner | Initiate DPIA, provide info, implement measures |
| Legal Team    | Legal basis assessment                          |
| Security Team | Technical measures, risk assessment             |
| Product Team  | Feature design, UX considerations               |

---

## When DPIA is Required

### Mandatory Triggers (Article 35)

| Trigger                                | KitchenXpert Examples                  |
| -------------------------------------- | -------------------------------------- |
| Systematic evaluation/profiling        | AI recommendations, behavior analytics |
| New technologies                       | AI/ML models, 3D rendering             |
| Automated decisions with legal effects | Fraud detection, account suspension    |
| Large-scale processing                 | Platform analytics, marketing          |
| Data matching/combining                | Cross-platform matching                |
| Vulnerable data subjects               | Users under 18                         |

### KitchenXpert Criteria (Two or more triggers DPIA)

- Processing >10,000 individuals
- AI/ML recommendations or decisions
- New tracking/analytics technology
- Sharing with new third parties
- New purposes not in original consent
- Creating user profiles
- Cross-border transfers to new jurisdictions
- Children's data processing
- Biometric or location data
- Supervisory authority list

---

## DPIA Process

### Seven Steps

1. **Screening**: Determine if DPIA required
2. **Description**: Document processing
3. **Consultation**: Gather stakeholder input
4. **Necessity/Proportionality**: Confirm justification
5. **Risk Assessment**: Identify and evaluate risks
6. **Mitigation**: Identify risk reduction measures
7. **Sign-off/Review**: Approve and schedule review

---

## DPIA for Key Processing Activities

### DPIA 1: AI Design Generation

**Purpose**: Personalized kitchen design suggestions **Legal Basis**: Consent
(personalization) / Contract (core service) **Data**: Design preferences,
dimensions, styles, history **Volume**: ~500,000 active users monthly

#### Risk Assessment

| Risk                        | Level  | Mitigation                     |
| --------------------------- | ------ | ------------------------------ |
| Profiling without awareness | Medium | Clear AI disclosure, opt-out   |
| Biased recommendations      | Low    | Bias audits, diverse training  |
| Data beyond purpose         | Medium | Access controls, documentation |
| Unauthorized model access   | Medium | Security, logging              |

**DPO Review**: Approved, November 2025. Next review: November 2026.

---

### DPIA 2: Analytics and Profiling

**Purpose**: Platform improvement, conversion optimization **Legal Basis**:
Consent (cookies) / Legitimate interest (aggregate) **Data**: Page views,
clicks, sessions, device info, IP (anonymized) **Volume**: ~2M monthly visitors

#### Risk Assessment

| Risk                     | Level  | Mitigation                          |
| ------------------------ | ------ | ----------------------------------- |
| Tracking without consent | Medium | Cookie consent, GA consent mode     |
| Behavioral profiling     | Low    | IP anonymization, limited retention |
| Cross-site tracking      | Medium | First-party cookies only            |

---

### DPIA 3: Partner Data Sharing

**Purpose**: Order fulfillment, localized services **Legal Basis**: Contract
(fulfillment) / Consent (marketing) **Data**: Contact info, orders, designs,
delivery address **Volume**: ~50,000 orders/month, ~200 partners

#### Risk Assessment

| Risk                   | Level  | Mitigation                             |
| ---------------------- | ------ | -------------------------------------- |
| Partner misuse         | High   | DPAs, audits, limited data             |
| Unauthorized marketing | Medium | Clear consent, contractual prohibition |
| Partner breach         | High   | Security requirements, audits          |

---

## Risk Assessment Matrix

### Likelihood (1-5)

1=Very Low, 2=Low, 3=Medium, 4=High, 5=Very High

### Severity (1-4)

1=Negligible, 2=Limited, 3=Significant, 4=Maximum

### Risk Levels

| Likelihood/Severity | 1      | 2      | 3      | 4        |
| ------------------- | ------ | ------ | ------ | -------- |
| 5                   | Medium | High   | High   | Critical |
| 4                   | Low    | Medium | High   | Critical |
| 3                   | Low    | Medium | Medium | High     |
| 2                   | Low    | Low    | Medium | Medium   |
| 1                   | Low    | Low    | Low    | Medium   |

### Response

- **Critical**: Must not proceed without significant mitigation
- **High**: Requires specific mitigation before proceeding
- **Medium**: Implement proportionate mitigation
- **Low**: Accept risk, document, monitor

---

## Mitigation Measures

### Technical

Encryption, pseudonymization, anonymization, access controls, logging, data
minimization, retention automation

### Organizational

Policies, training, contracts (DPAs), privacy by design, audits, incident
response, DPO consultation

---

## DPO Consultation

### When Required

- DPIA screening stage
- When DPIA is required
- High-risk processing decisions
- Supervisory authority consultation may be needed
- Special category data processing

### Supervisory Authority Consultation

Required when residual risk remains high despite mitigations, DPO recommends, or
novel processing with uncertainty.

---

## DPIA Review Schedule

### Trigger-Based

- Significant change to processing
- New technology
- New data categories
- Security incident
- Regulatory guidance changes
- User complaints
- Processor changes

### Scheduled

| Processing           | Frequency | Next Review   |
| -------------------- | --------- | ------------- |
| AI Design Generation | Annual    | November 2026 |
| Analytics/Profiling  | Annual    | January 2027  |
| Partner Data Sharing | Annual    | March 2026    |

---

## DPIA Template

### Document Information

DPIA ID, Project Name, Owner, Dates, Version, DPO Status

### Sections

1. Screening Decision
2. Description of Processing
3. Consultation
4. Necessity and Proportionality
5. Risk Assessment
6. Mitigation Measures
7. DPO Review
8. Approval and Sign-off
9. Review Schedule

---

## Related Documentation

- [GDPR Overview](./overview.md)
- [Data Processing](./data-processing.md)
- [Consent Management](./consent-management.md)
- [Data Subject Rights](./data-subject-rights.md)
- [Data Breach Protocol](./data-breach-protocol.md)
- [Security Architecture](../../security/architecture.md)

---

## Document Control

| Property         | Value                   |
| ---------------- | ----------------------- |
| Document Owner   | Data Protection Officer |
| Review Frequency | Annual                  |
| Last Reviewed    | 2026-01-10              |
| Next Review      | 2027-01-10              |
| Version          | 2.0                     |

---

_For DPIA questions or consultation, contact dpo@kitchenxpert.com._
