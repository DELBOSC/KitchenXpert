# Escalation Policies Documentation

> Comprehensive guide to alert escalation procedures and policies for KitchenXpert.

**Last Updated:** 2026-01-10
**Owner:** SRE Team
**Version:** 1.0

---

## Table of Contents

1. [Escalation Levels](#escalation-levels)
2. [Escalation by Severity](#escalation-by-severity)
3. [Auto-Escalation Rules](#auto-escalation-rules)
4. [Manual Escalation Procedures](#manual-escalation-procedures)
5. [Escalation Overrides](#escalation-overrides)
6. [PagerDuty Configuration](#pagerduty-configuration)
7. [Related Documentation](#related-documentation)

---

## Escalation Levels

### Overview

KitchenXpert uses a four-level escalation hierarchy to ensure incidents are addressed by the appropriate personnel.

### Level Definitions

```
Level 4: VP Engineering / CTO
    ^
    | (after 1 hour)
    |
Level 3: Engineering Manager
    ^
    | (after 30 minutes)
    |
Level 2: Team Lead
    ^
    | (after 15 minutes)
    |
Level 1: On-Call Engineer
    ^
    | (immediate)
    |
[ALERT TRIGGERED]
```

### Level 1: On-Call Engineer

**Who:** Primary on-call engineer for the affected service

**Responsibilities:**
- Acknowledge alert within 5 minutes
- Initial investigation and triage
- Apply immediate remediation if possible
- Update incident status and communication channels
- Escalate if unable to resolve

**Contact Methods:**
1. PagerDuty (automatic)
2. Slack DM
3. Phone call (critical only)

**Expected Response Time:** 5 minutes (critical), 15 minutes (warning)

### Level 2: Team Lead

**Who:** Technical lead of the affected service team

**Responsibilities:**
- Provide technical guidance
- Authorize emergency changes
- Coordinate with other teams
- Make escalation decisions
- Communicate with stakeholders

**Contact Methods:**
1. PagerDuty escalation
2. Slack DM
3. Phone call

**Expected Response Time:** 15 minutes (critical), 30 minutes (warning)

### Level 3: Engineering Manager

**Who:** Engineering manager responsible for the service

**Responsibilities:**
- Resource allocation decisions
- Cross-team coordination
- External communication approval
- Business impact assessment
- Executive escalation decisions

**Contact Methods:**
1. PagerDuty escalation
2. Direct phone call
3. Slack DM

**Expected Response Time:** 30 minutes (critical), 1 hour (warning)

### Level 4: VP Engineering / CTO

**Who:** Senior engineering leadership

**Responsibilities:**
- Major incident declaration
- Company-wide communication
- Resource mobilization
- External stakeholder communication
- Post-incident review sponsorship

**Contact Methods:**
1. Direct phone call
2. PagerDuty critical escalation
3. Emergency contact list

**Expected Response Time:** 1 hour

---

## Escalation by Severity

### Critical Alerts

**Initial Response:**
- Immediately notify Level 1 (On-Call Engineer)
- Notify backup on-call simultaneously
- Post to #incidents-critical Slack channel

**Escalation Timeline:**

| Time | Action |
|------|--------|
| T+0 | Alert fires, L1 notified via PagerDuty |
| T+5min | No ack? Auto-escalate to L1 backup |
| T+10min | No ack? Auto-escalate to L2 (Team Lead) |
| T+15min | Phone call to L1 + L2 |
| T+30min | No resolution? Auto-escalate to L3 |
| T+1h | No resolution? Auto-escalate to L4 |

**Example Policy:**
```yaml
escalation_policy:
  name: critical-alerts
  repeat_enabled: true
  num_loops: 3
  escalation_rules:
    - escalation_delay_in_minutes: 0
      targets:
        - type: schedule_reference
          id: PRIMARY_ONCALL
    - escalation_delay_in_minutes: 5
      targets:
        - type: schedule_reference
          id: SECONDARY_ONCALL
    - escalation_delay_in_minutes: 10
      targets:
        - type: user_reference
          id: TEAM_LEAD
    - escalation_delay_in_minutes: 30
      targets:
        - type: user_reference
          id: ENG_MANAGER
    - escalation_delay_in_minutes: 60
      targets:
        - type: user_reference
          id: VP_ENGINEERING
```

### Warning Alerts

**Initial Response:**
- Notify Level 1 (On-Call Engineer)
- Post to #alerts-warnings Slack channel

**Escalation Timeline:**

| Time | Action |
|------|--------|
| T+0 | Alert fires, L1 notified |
| T+30min | No ack? Notify L1 backup |
| T+1h | No ack? Escalate to L2 |
| T+2h | No resolution? Escalate to L3 |

**Example Policy:**
```yaml
escalation_policy:
  name: warning-alerts
  repeat_enabled: true
  num_loops: 2
  escalation_rules:
    - escalation_delay_in_minutes: 0
      targets:
        - type: schedule_reference
          id: PRIMARY_ONCALL
    - escalation_delay_in_minutes: 30
      targets:
        - type: schedule_reference
          id: SECONDARY_ONCALL
    - escalation_delay_in_minutes: 60
      targets:
        - type: user_reference
          id: TEAM_LEAD
    - escalation_delay_in_minutes: 120
      targets:
        - type: user_reference
          id: ENG_MANAGER
```

### Info Alerts

**Initial Response:**
- Notify via Slack channel only
- No immediate escalation

**Escalation Timeline:**

| Time | Action |
|------|--------|
| T+0 | Alert posted to Slack |
| T+4h | If unresolved, convert to warning |
| T+8h | Email digest to team lead |

---

## Auto-Escalation Rules

### Conditions for Auto-Escalation

```yaml
auto_escalation_triggers:
  # Time-based escalation
  - condition: no_acknowledgment
    timeout: 5m
    action: escalate_to_next_level
    severity: critical

  - condition: no_acknowledgment
    timeout: 30m
    action: escalate_to_next_level
    severity: warning

  # Status-based escalation
  - condition: incident_not_resolved
    timeout: 30m
    action: escalate_to_next_level
    severity: critical

  - condition: incident_not_resolved
    timeout: 2h
    action: escalate_to_next_level
    severity: warning

  # Impact-based escalation
  - condition: error_rate_increasing
    threshold: 50%_increase_after_ack
    action: escalate_to_next_level

  - condition: user_impact_spreading
    threshold: additional_services_affected
    action: escalate_to_next_level

  # Multiple alert escalation
  - condition: multiple_critical_alerts
    count: 3
    window: 15m
    action: escalate_to_l3_immediately
```

### Business Hours vs Off-Hours

**Business Hours (9 AM - 6 PM Local):**
```yaml
business_hours:
  escalation_delays:
    l1_to_l2: 15m
    l2_to_l3: 30m
    l3_to_l4: 60m
  contact_methods:
    - slack
    - pagerduty_push
    - email
```

**Off-Hours (6 PM - 9 AM, Weekends):**
```yaml
off_hours:
  escalation_delays:
    l1_to_l2: 10m  # Faster escalation
    l2_to_l3: 20m
    l3_to_l4: 45m
  contact_methods:
    - pagerduty_push
    - phone_call  # More aggressive
    - sms
```

---

## Manual Escalation Procedures

### When to Manually Escalate

1. **Complexity exceeds expertise:** Issue requires specialized knowledge
2. **Resource constraints:** Need additional personnel
3. **Business impact:** Customer-facing issues requiring management
4. **Cross-team coordination:** Multiple teams needed
5. **External dependencies:** Third-party involvement required

### How to Manually Escalate

#### Via PagerDuty

1. Open the incident in PagerDuty
2. Click "Escalate"
3. Select escalation target (user or policy)
4. Add escalation note explaining why
5. Confirm escalation

**API:**
```bash
curl -X POST https://api.pagerduty.com/incidents/{incident_id}/escalate \
  -H "Authorization: Token token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "escalation_level": 2,
    "note": "Escalating due to database expertise needed"
  }'
```

#### Via Slack

1. Post in #incident-active with `/escalate` command
2. Format: `/escalate [level] [reason]`
3. Example: `/escalate L2 Need team lead guidance on rollback decision`

#### Via Phone

For critical situations:
1. Call current on-call at the target level
2. Reference the incident ID
3. Provide brief context
4. Document the escalation in the incident channel

### Escalation Communication Template

```
ESCALATION NOTICE

Incident: [INC-XXXXX]
Severity: [Critical/Warning]
Current Status: [Investigating/Identified/Monitoring]

Escalating From: [Your Name] (L1)
Escalating To: [Target Name] (L2)

Reason for Escalation:
- [Specific reason 1]
- [Specific reason 2]

Current Situation:
- Issue started: [Time]
- Services affected: [List]
- User impact: [Description]
- Actions taken: [Summary]

Immediate Needs:
- [What you need from the escalation target]
```

---

## Escalation Overrides

### Holiday Overrides

During holidays, escalation policies are adjusted:

```yaml
holiday_overrides:
  - dates: ["2026-12-25", "2026-01-01"]
    policy: holiday_skeleton_crew
    rules:
      - Combine L1 and L2 escalation (10 min total)
      - Skip L3 for non-critical
      - Direct L4 contact for P1 incidents
      - Extended response SLAs (2x normal)
```

### Known Issue Overrides

For known issues being actively worked:

```yaml
known_issue_override:
  incident_id: "INC-12345"
  description: "Database migration in progress"
  override_rules:
    - Suppress related DB alerts
    - Do not escalate automatically
    - Direct to specific engineer
  expires: "2026-01-15T06:00:00Z"
```

### Maintenance Window Overrides

```yaml
maintenance_windows:
  - name: "Weekly Deployment Window"
    schedule: "Thursdays 2-4 AM UTC"
    override_rules:
      - Suppress deployment-related alerts
      - Route to deployment team only
      - No auto-escalation during window
      - Resume normal policy after window
```

### Creating an Override

**Via PagerDuty:**
1. Navigate to Services > [Service Name] > Maintenance Windows
2. Click "Create Maintenance Window"
3. Set start and end times
4. Select override behavior

**Via Alertmanager:**
```yaml
# Create silence
amtool silence add alertname="HighErrorRate" \
  --comment="Planned deployment" \
  --author="ops@kitchenxpert.com" \
  --duration="2h"
```

---

## PagerDuty Configuration

### Escalation Policy Setup

```yaml
# pagerduty-escalation-policy.yaml
escalation_policies:
  - name: "KitchenXpert Critical"
    description: "Escalation policy for critical production alerts"
    num_loops: 3
    on_call_handoff_notifications: "if_has_services"
    teams:
      - PLATFORM_TEAM_ID
    escalation_rules:
      - escalation_delay_in_minutes: 0
        targets:
          - type: schedule_reference
            id: PRIMARY_ONCALL_SCHEDULE
      - escalation_delay_in_minutes: 5
        targets:
          - type: schedule_reference
            id: SECONDARY_ONCALL_SCHEDULE
      - escalation_delay_in_minutes: 10
        targets:
          - type: user_reference
            id: TEAM_LEAD_USER_ID
        notification_types:
          - sms
          - phone
          - push
      - escalation_delay_in_minutes: 30
        targets:
          - type: user_reference
            id: ENG_MANAGER_USER_ID
      - escalation_delay_in_minutes: 60
        targets:
          - type: user_reference
            id: VP_ENGINEERING_USER_ID
```

### Service Configuration

```yaml
# pagerduty-service.yaml
services:
  - name: "KitchenXpert Backend"
    description: "Backend API services"
    escalation_policy: "KitchenXpert Critical"
    alert_creation: "create_alerts_and_incidents"
    auto_resolve_timeout: null
    acknowledgement_timeout: 1800  # 30 minutes
    status: "active"
    incident_urgency_rule:
      type: "constant"
      urgency: "high"
    support_hours:
      type: "use_support_hours"
      time_zone: "America/New_York"
      start_time: "09:00:00"
      end_time: "18:00:00"
      days_of_week: [1, 2, 3, 4, 5]
```

### Response Play Configuration

```yaml
# Response play for major incidents
response_plays:
  - name: "Major Incident Response"
    description: "Activate for P1/P2 incidents"
    responders:
      - type: schedule_reference
        id: PRIMARY_ONCALL
      - type: user_reference
        id: INCIDENT_COMMANDER
    conference_bridge:
      conference_number: "+1-555-123-4567"
      conference_url: "https://meet.kitchenxpert.com/incident"
    runnables:
      - type: "create_status_page_incident"
      - type: "post_to_slack_channel"
        channel: "#incident-active"
```

---

## Escalation Metrics and Reporting

### Key Metrics

| Metric | Target | Description |
|--------|--------|-------------|
| Time to Ack (L1) | < 5 min | Time for L1 to acknowledge |
| Escalation Rate | < 20% | % of alerts escalated beyond L1 |
| MTTA (Mean Time to Acknowledge) | < 5 min | Average time to first acknowledgment |
| Escalation Accuracy | > 90% | Escalations that were necessary |

### Monthly Escalation Report

```
ESCALATION REPORT - January 2026

Total Alerts: 450
- Resolved at L1: 380 (84.4%)
- Escalated to L2: 55 (12.2%)
- Escalated to L3: 12 (2.7%)
- Escalated to L4: 3 (0.7%)

Average Response Times:
- L1 Acknowledgment: 3.2 minutes
- L2 Response: 12 minutes
- L3 Response: 25 minutes

Top Escalation Reasons:
1. Database expertise needed (25%)
2. Multiple services affected (20%)
3. Customer impact (18%)
4. Unknown root cause (15%)
5. Resource constraints (12%)
```

---

## Related Documentation

- [Alert Rules](./alert-rules.md)
- [Notification Channels](./notification-channels.md)
- [On-Call Rotation](./on-call-rotation.md)
- [Incident Response](/docs/operations/incident-response.md)

---

*For questions about escalation policies, contact the SRE team at sre@kitchenxpert.com*
