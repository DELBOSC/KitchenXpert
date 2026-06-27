# KitchenXpert Service Level Agreement (SLA)

**Effective Date:** January 2026

**Version:** 1.0

**Last Updated:** January 2026

---

## Introduction

This Service Level Agreement ("SLA") is part of the KitchenXpert Terms of
Service and applies to all users of the KitchenXpert platform with a paid
subscription (Pro, Business, or Enterprise tiers). This SLA describes the
service availability commitments, support response times, and remedies available
when commitments are not met.

**Provider:** KitchenXpert SAS 42 Rue de la Cuisine 75008 Paris, France

**Contact:** support@kitchenxpert.com

---

## 1. Service Availability

### 1.1 Uptime Commitment

KitchenXpert commits to the following monthly uptime targets based on your
subscription tier:

| Subscription Tier | Uptime Target |
| ----------------- | ------------- |
| Pro               | 99.9%         |
| Business          | 99.9%         |
| Enterprise        | 99.95%        |

"Uptime" means the percentage of time the KitchenXpert platform is available and
operational during a calendar month.

### 1.2 Measurement Period

Uptime is measured on a calendar month basis, beginning at 00:00:00 CET on the
first day of the month and ending at 23:59:59 CET on the last day of the month.

### 1.3 Exclusions from Downtime

The following events are excluded from downtime calculations:

**Scheduled Maintenance:**

- Maintenance performed during published maintenance windows
- Maintenance with advance notice as specified in Section 2
- Emergency maintenance required for security or stability

**External Factors:**

- Force majeure events (natural disasters, war, terrorism, etc.)
- Internet connectivity issues outside KitchenXpert's network
- Third-party service provider outages (cloud infrastructure, DNS, CDN)
- Failures of Customer's equipment, software, or network

**Customer-Caused Issues:**

- Downtime caused by Customer's actions or configurations
- Exceeding documented usage limits or API rate limits
- Unauthorized access or security incidents caused by Customer
- Issues arising from Customer's integration code

**Other Exclusions:**

- Beta, preview, or experimental features
- Sandbox or development environments
- Free tier accounts
- Periods where Customer has outstanding payment obligations

---

## 2. Scheduled Maintenance

### 2.1 Maintenance Windows

KitchenXpert performs routine maintenance during the following windows:

**Standard Maintenance Window:**

- Day: Sundays
- Time: 02:00 to 06:00 CET
- Typical Duration: 1-2 hours

**Extended Maintenance (Major Updates):**

- Frequency: Quarterly or as needed
- Maximum Duration: 4 hours
- Window: Sundays 00:00 to 08:00 CET

### 2.2 Advance Notice

KitchenXpert will provide advance notice of scheduled maintenance:

| Maintenance Type              | Advance Notice |
| ----------------------------- | -------------- |
| Standard (routine)            | 72 hours       |
| Major updates                 | 7 days         |
| Database migrations           | 14 days        |
| Emergency (security/critical) | Best effort    |

### 2.3 Notice Methods

Maintenance notifications are provided through:

- Status page: status.kitchenxpert.com
- Email to account administrators (opt-in)
- In-app notification banner
- RSS feed from status page

### 2.4 Maintenance Limits

- **Maximum Monthly Maintenance:** 4 hours total
- **Maximum Single Window:** 4 hours
- **Emergency Maintenance:** Not counted toward monthly limit (best effort
  notice provided)

---

## 3. Uptime Calculation

### 3.1 Formula

Uptime is calculated using the following formula:

```
Uptime % = ((Total Minutes in Month - Downtime Minutes) / Total Minutes in Month) x 100
```

Where:

- **Total Minutes in Month** = Number of minutes in the calendar month
- **Downtime Minutes** = Total minutes of unplanned service unavailability
  (excluding exclusions)

### 3.2 Monitoring

KitchenXpert uses independent third-party monitoring services to measure uptime:

- Monitoring from multiple geographic locations
- Health checks every 60 seconds
- Both synthetic and real-user monitoring
- Results published on status page

### 3.3 Status Page

Real-time service status is available at: **status.kitchenxpert.com**

The status page displays:

- Current operational status of all services
- Ongoing incidents and updates
- Scheduled maintenance calendar
- Historical uptime data (90 days)
- Incident history and post-mortems

---

## 4. Service Credits

### 4.1 Credit Schedule

If KitchenXpert fails to meet the Uptime Commitment, eligible customers may
receive service credits according to the following schedule:

**Pro and Business Tiers:**

| Monthly Uptime   | Service Credit     |
| ---------------- | ------------------ |
| 99.0% to < 99.9% | 10% of monthly fee |
| 95.0% to < 99.0% | 25% of monthly fee |
| 90.0% to < 95.0% | 50% of monthly fee |
| Below 90.0%      | 50% of monthly fee |

**Enterprise Tier:**

| Monthly Uptime    | Service Credit     |
| ----------------- | ------------------ |
| 99.0% to < 99.95% | 15% of monthly fee |
| 95.0% to < 99.0%  | 30% of monthly fee |
| 90.0% to < 95.0%  | 50% of monthly fee |
| Below 90.0%       | 50% of monthly fee |

### 4.2 Credit Request Process

To request service credits:

1. **Submit Request:** Email sla-claims@kitchenxpert.com within thirty (30) days
   of the incident
2. **Include Details:**
   - Account email and company name
   - Date(s) and time(s) of the incident (in CET)
   - Description of the service disruption
   - Any error messages or screenshots
3. **Review:** KitchenXpert will review and respond within ten (10) business
   days
4. **Credit Issuance:** Approved credits applied to the next billing cycle

### 4.3 Credit Limitations

- **Maximum Credit:** 50% of monthly fee per month
- **No Cash Refunds:** Credits are applied to future invoices only
- **Annual Subscriptions:** Credits calculated based on 1/12 of annual fee
- **Unused Credits:** Do not carry over beyond twelve (12) months
- **Account Standing:** Customer must be in good standing with no outstanding
  payments

### 4.4 Credit Application

- Credits are automatically applied to the next invoice after approval
- Credits cannot be transferred between accounts
- Credits cannot be combined with other promotional discounts (unless specified)
- Credits do not apply to third-party services or partner purchases

---

## 5. Support Response Times

### 5.1 Severity Levels

Support requests are classified by severity:

| Severity     | Definition                                           | Examples                                               |
| ------------ | ---------------------------------------------------- | ------------------------------------------------------ |
| **Critical** | Service completely unavailable; no workaround        | Platform down, cannot log in, data loss                |
| **High**     | Major feature or function broken; significant impact | Cannot create designs, export broken, payments failing |
| **Medium**   | Feature degraded; workaround available               | Slow performance, minor feature bugs                   |
| **Low**      | Minor issue, question, or request                    | How-to questions, feature requests, cosmetic issues    |

### 5.2 Response Time Targets

KitchenXpert targets the following response times based on severity and
subscription tier:

| Severity | Pro      | Business | Enterprise |
| -------- | -------- | -------- | ---------- |
| Critical | 4 hours  | 2 hours  | 1 hour     |
| High     | 8 hours  | 4 hours  | 2 hours    |
| Medium   | 24 hours | 12 hours | 8 hours    |
| Low      | 48 hours | 24 hours | 12 hours   |

**Response Time Definition:** Time from support ticket submission to first
meaningful response from KitchenXpert support team (excluding automated
acknowledgments).

### 5.3 Support Hours

| Tier       | Support Hours                       |
| ---------- | ----------------------------------- |
| Pro        | Monday-Friday, 09:00-18:00 CET      |
| Business   | Monday-Friday, 08:00-20:00 CET      |
| Enterprise | 24/7 for Critical and High severity |

Response times apply during support hours. Tickets submitted outside support
hours begin tracking at the start of the next support period.

### 5.4 Support Channels

| Tier       | Available Channels                               |
| ---------- | ------------------------------------------------ |
| Pro        | Email, Help Center                               |
| Business   | Email, Live Chat, Help Center                    |
| Enterprise | Email, Live Chat, Phone, Dedicated Slack Channel |

---

## 6. Incident Communication

### 6.1 Incident Updates

During service incidents, KitchenXpert will provide regular updates:

| Severity | Update Frequency                |
| -------- | ------------------------------- |
| Critical | Every 30 minutes until resolved |
| High     | Every 2 hours until resolved    |
| Medium   | Daily until resolved            |
| Low      | Upon resolution                 |

### 6.2 Communication Channels

Incident updates are provided through:

- **Status Page:** Primary source for all incidents (status.kitchenxpert.com)
- **Email Notifications:** Opt-in for critical incident alerts
- **In-App Banner:** Displayed during active incidents
- **Social Media:** Major incidents announced on Twitter/X (@KitchenXpert)

### 6.3 Post-Incident Reports

For Critical and High severity incidents, KitchenXpert will provide a
post-incident report:

**Timeline:**

- Initial report: Within five (5) business days of resolution
- Detailed RCA (Root Cause Analysis): Within ten (10) business days for Critical
  incidents

**Report Contents:**

- Incident timeline and duration
- Services affected
- Root cause analysis
- Remediation actions taken
- Preventive measures implemented

Enterprise customers receive detailed post-incident reports via email and
quarterly business reviews.

---

## 7. Exclusions

### 7.1 SLA Does Not Apply To

This SLA does NOT apply to:

- **Free Tier Accounts:** No uptime commitment or service credits
- **Beta Features:** Features marked as beta, preview, or experimental
- **Sandbox Environments:** Development and testing environments
- **API Abuse:** Service degradation caused by API misuse or excessive requests
- **Custom Integrations:** Issues arising from customer-built integrations
- **Third-Party Services:** Outages of integrated third-party services

### 7.2 Sole Remedy

Service credits are the sole and exclusive remedy for KitchenXpert's failure to
meet the SLA commitments. Service credits do not entitle customers to any
additional compensation, damages, or other remedies.

---

## 8. Customer Responsibilities

### 8.1 To Benefit from This SLA

Customers must:

- Maintain accurate contact information in account settings
- Configure notification preferences to receive incident alerts
- Report issues promptly through official support channels
- Provide necessary information for incident diagnosis
- Cooperate with KitchenXpert in troubleshooting efforts

### 8.2 Reporting Issues

To report service issues:

1. Check status.kitchenxpert.com for known incidents
2. Submit a support ticket at support.kitchenxpert.com
3. Include: description, time of occurrence, affected users, screenshots
4. For Critical issues, use the priority escalation option

---

## 9. SLA Modifications

### 9.1 Changes to SLA

KitchenXpert may modify this SLA with thirty (30) days notice. Changes will be
communicated via:

- Email to account administrators
- Notice on the status page
- In-app notification

### 9.2 Grandfathering

If SLA terms are changed to be less favorable:

- Existing annual subscribers retain current terms until renewal
- Enterprise customers retain contracted terms

---

## 10. Contact Information

**Support:**

- Email: support@kitchenxpert.com
- Help Center: help.kitchenxpert.com

**SLA Claims:**

- Email: sla-claims@kitchenxpert.com

**Status Page:**

- URL: status.kitchenxpert.com

**Mailing Address:** KitchenXpert SAS 42 Rue de la Cuisine 75008 Paris, France

---

## 11. Definitions

**"Downtime"** means a period during which the Platform is unavailable or not
functioning in accordance with its documentation, excluding Scheduled
Maintenance and Exclusions.

**"Incident"** means an unplanned interruption or reduction in quality of the
Platform services.

**"Response Time"** means the elapsed time between when a support request is
submitted and when a KitchenXpert support representative provides a substantive
response.

**"Service Credit"** means a credit against future KitchenXpert subscription
fees, calculated as a percentage of the monthly subscription fee.

**"Uptime"** means the percentage of total time during a calendar month that the
Platform is available and operational.

---

_This Service Level Agreement is incorporated into and subject to the
KitchenXpert Terms of Service._

_Document Version: 1.0 | Last Updated: January 2026_

_For the most current version, visit: https://kitchenxpert.com/legal/sla_
