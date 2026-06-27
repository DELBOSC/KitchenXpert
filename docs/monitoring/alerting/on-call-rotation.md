# On-Call Rotation Documentation

> Comprehensive guide to on-call scheduling, responsibilities, and procedures
> for KitchenXpert.

**Last Updated:** 2026-01-10 **Owner:** SRE Team **Version:** 1.0

---

## Table of Contents

1. [On-Call Schedule](#on-call-schedule)
2. [Team Structure](#team-structure)
3. [Handoff Procedures](#handoff-procedures)
4. [Responsibilities](#responsibilities)
5. [Compensation and Time Off](#compensation-and-time-off)
6. [On-Call Tools](#on-call-tools)
7. [Training Requirements](#training-requirements)
8. [Related Documentation](#related-documentation)

---

## On-Call Schedule

### Primary On-Call Rotation

**Rotation Type:** Weekly rotation **Handoff Time:** Monday 9:00 AM local time
**Duration:** 7 days

```
Week 1: Engineer A
Week 2: Engineer B
Week 3: Engineer C
Week 4: Engineer D
Week 5: Engineer E
Week 6: Engineer A (cycle repeats)
```

### Schedule Configuration

```yaml
# pagerduty-schedule.yaml
schedules:
  - name: 'Primary On-Call'
    description: 'Primary on-call rotation for KitchenXpert'
    time_zone: 'America/New_York'
    schedule_layers:
      - name: 'Primary Layer'
        start: '2026-01-06T09:00:00-05:00'
        rotation_virtual_start: '2026-01-06T09:00:00-05:00'
        rotation_turn_length_seconds: 604800 # 7 days
        users:
          - id: USER_A_ID
          - id: USER_B_ID
          - id: USER_C_ID
          - id: USER_D_ID
          - id: USER_E_ID
        restrictions:
          - type: 'daily_restriction'
            start_time_of_day: '09:00:00'
            duration_seconds: 86400
```

### Secondary/Backup Rotation

**Purpose:** Backup coverage when primary is unavailable

```yaml
schedules:
  - name: 'Secondary On-Call'
    description: 'Backup on-call rotation'
    time_zone: 'America/New_York'
    schedule_layers:
      - name: 'Secondary Layer'
        start: '2026-01-06T09:00:00-05:00'
        rotation_virtual_start: '2026-01-06T09:00:00-05:00'
        rotation_turn_length_seconds: 604800
        users:
          # Offset by 1 week from primary
          - id: USER_B_ID
          - id: USER_C_ID
          - id: USER_D_ID
          - id: USER_E_ID
          - id: USER_A_ID
```

### Weekend/Holiday Coverage

**Weekends:**

- Same engineer continues from weekday rotation
- Backup must be available within 30 minutes

**Holidays:**

- Skeleton crew schedule with volunteers
- Additional compensation (1.5x on-call rate)
- Reduced SLA (response time extended by 50%)

```yaml
holiday_coverage:
  holidays_2026:
    - date: '2026-01-01'
      name: "New Year's Day"
      coverage: skeleton
    - date: '2026-07-04'
      name: 'Independence Day'
      coverage: skeleton
    - date: '2026-12-25'
      name: 'Christmas Day'
      coverage: skeleton

  skeleton_crew:
    primary_volunteers: true # Volunteers preferred
    minimum_coverage: 1
    compensation: 1.5x
    response_sla: 15m # Extended from 5m
```

### Schedule Visibility

**PagerDuty Schedule URL:** https://kitchenxpert.pagerduty.com/schedules

**Calendar Integration:**

- Google Calendar: Subscribe via iCal link
- Outlook: Add shared calendar
- Slack: `/pd oncall` command

---

## Team Structure

### On-Call Teams

| Team     | Services                        | Rotation Size |
| -------- | ------------------------------- | ------------- |
| Platform | Infrastructure, K8s, Networking | 5 engineers   |
| Backend  | API, Database, Integrations     | 6 engineers   |
| AI       | AI Service, ML Pipeline         | 4 engineers   |
| Frontend | Web App, 3D Engine              | 4 engineers   |

### Roster Management

```yaml
on_call_roster:
  platform_team:
    members:
      - name: 'Alice Smith'
        email: 'alice@kitchenxpert.com'
        phone: '+1-555-0101'
        slack: '@alice'
        timezone: 'America/New_York'
        can_escalate_to: ['team_lead', 'manager']

      - name: 'Bob Johnson'
        email: 'bob@kitchenxpert.com'
        phone: '+1-555-0102'
        slack: '@bob'
        timezone: 'America/Chicago'

    team_lead:
      name: 'Carol Williams'
      email: 'carol@kitchenxpert.com'
      phone: '+1-555-0110'

    manager:
      name: 'David Brown'
      email: 'david@kitchenxpert.com'
      phone: '+1-555-0120'
```

### Minimum Staffing Requirements

| Time Period    | Minimum On-Call | Backup Required     |
| -------------- | --------------- | ------------------- |
| Business Hours | 1 per team      | Yes                 |
| Evenings       | 1 per team      | Yes                 |
| Weekends       | 1 per team      | Available in 30 min |
| Holidays       | 1 skeleton crew | Available in 30 min |

---

## Handoff Procedures

### Handoff Checklist

**Outgoing On-Call Engineer:**

```markdown
## On-Call Handoff - [Date]

### Active Issues

- [ ] List any ongoing incidents
- [ ] Note unresolved alerts
- [ ] Pending investigations

### Recent Changes

- [ ] Deployments in last 7 days
- [ ] Configuration changes
- [ ] Known issues introduced

### Scheduled Events

- [ ] Upcoming maintenance windows
- [ ] Planned deployments
- [ ] External dependencies

### Action Items for Incoming

- [ ] Items requiring follow-up
- [ ] Pending escalations
- [ ] Monitoring gaps identified

### Handoff Notes

[Free-form notes about the week]
```

### Handoff Meeting

**Timing:** Monday 9:00 AM (30 minutes) **Attendees:** Outgoing and incoming
on-call engineers

**Agenda:**

1. Review active incidents (5 min)
2. Walk through recent alerts (10 min)
3. Discuss upcoming events (5 min)
4. Q&A and knowledge transfer (10 min)

### Handoff Automation

```bash
#!/bin/bash
# handoff-report.sh - Generate handoff report

echo "=== ON-CALL HANDOFF REPORT ==="
echo "Week: $(date -d 'last monday' +%Y-%m-%d) to $(date +%Y-%m-%d)"
echo ""

echo "### INCIDENTS THIS WEEK ###"
pd incidents list --since "7 days ago" --status resolved

echo ""
echo "### ALERTS SUMMARY ###"
amtool alert query --output simple | head -20

echo ""
echo "### DEPLOYMENTS ###"
kubectl get deployments -o wide | grep -v "1/1"

echo ""
echo "### UPCOMING MAINTENANCE ###"
pd maintenance list --future
```

### Emergency Handoff

For unplanned handoffs (illness, emergency):

1. **Immediate:** Contact secondary on-call
2. **Notify:** Post in #oncall-primary Slack channel
3. **Update:** Transfer incidents in PagerDuty
4. **Document:** Create handoff note with current status

---

## Responsibilities

### Primary Responsibilities

#### Acknowledge Alerts

**SLA:** Within 5 minutes for critical, 15 minutes for warning

**Process:**

1. Receive alert notification
2. Acknowledge in PagerDuty/Alertmanager
3. Post acknowledgment in Slack
4. Begin investigation

#### Investigate and Respond

**Investigation Steps:**

1. Verify alert is valid (not false positive)
2. Check affected systems and services
3. Review recent changes (deployments, config)
4. Identify root cause or contributing factors
5. Apply mitigation if possible

**Response Actions:**

- Apply known fixes from runbooks
- Restart services if safe
- Scale resources if capacity issue
- Rollback recent deployments
- Engage subject matter experts

#### Escalate When Needed

**Escalation Triggers:**

- Issue beyond current expertise
- Customer-facing impact > 15 minutes
- Multiple services affected
- Unable to identify root cause in 30 minutes
- Need to authorize risky changes

**Escalation Process:**

1. Document current status
2. Identify appropriate escalation target
3. Brief escalation target
4. Transfer incident ownership or collaborate

#### Document in Incident Ticket

**Required Documentation:**

- Timeline of events
- Actions taken
- Impact assessment
- Root cause (if identified)
- Resolution steps
- Follow-up items

```markdown
## Incident: INC-2026-0110-001

### Timeline

- 14:30 UTC - Alert triggered: HighErrorRate
- 14:32 UTC - Acknowledged by @alice
- 14:35 UTC - Identified: Database connection pool exhausted
- 14:40 UTC - Mitigation: Increased pool size
- 14:45 UTC - Error rate normalized
- 14:50 UTC - Incident resolved

### Impact

- Duration: 20 minutes
- Users affected: ~500
- Requests failed: ~2000

### Root Cause

Database connection pool was undersized for current traffic load

### Resolution

Increased connection pool from 50 to 100 connections

### Follow-up

- [ ] Review connection pool sizing across all services
- [ ] Add proactive alerting for connection pool usage
```

---

## Compensation and Time Off

### On-Call Compensation

| Component                              | Rate             |
| -------------------------------------- | ---------------- |
| Weekly on-call stipend                 | $500/week        |
| Holiday on-call                        | $750/week (1.5x) |
| Night incident response (11 PM - 7 AM) | $50/incident     |
| Weekend major incident (P1/P2)         | $100/incident    |

### Time Off Policy

**Comp Time:**

- Major incident (> 2 hours): 4 hours comp time
- After-hours incident (> 1 hour): 2 hours comp time
- Consecutive weeks on-call: Extra day off

**Schedule Flexibility:**

- Swap shifts with team members (approval not required)
- Block vacation time in advance (2 weeks notice)
- Emergency coverage requests via #oncall-primary

### Burnout Prevention

**Limits:**

- Maximum 2 consecutive on-call weeks
- Minimum 2 weeks between on-call rotations
- No on-call during scheduled PTO

**Support:**

- On-call buddy system
- Post-incident debrief for major incidents
- Regular retrospectives on on-call experience

---

## On-Call Tools

### PagerDuty

**URL:** https://kitchenxpert.pagerduty.com

**Features Used:**

- Incident management
- On-call scheduling
- Escalation policies
- Mobile app notifications

**Mobile App Setup:**

1. Download PagerDuty app
2. Log in with SSO
3. Enable push notifications
4. Set notification sounds (distinct from regular notifications)
5. Configure do-not-disturb exceptions

### OpsGenie (Backup)

**URL:** https://kitchenxpert.app.opsgenie.com

**Used for:**

- Backup alerting
- Incident war rooms
- Schedule overrides

### Slack

**Channels:**

- `#oncall-primary` - On-call coordination
- `#incidents-active` - Active incident discussion
- `#alerts-critical` - Critical alerts

**Slash Commands:**

```
/pd oncall - Show current on-call
/pd incident - Create incident
/pd ack - Acknowledge alert
/pd escalate - Escalate incident
```

### Runbook Repository

**URL:** https://runbooks.kitchenxpert.internal

**Structure:**

```
runbooks/
├── alerts/
│   ├── high-cpu.md
│   ├── high-memory.md
│   ├── high-error-rate.md
│   └── database-connection.md
├── services/
│   ├── backend.md
│   ├── ai-service.md
│   └── frontend.md
└── procedures/
    ├── deployment-rollback.md
    ├── database-failover.md
    └── incident-response.md
```

### SSH Access

**Jump Host:** ssh.kitchenxpert.internal

**Access Pattern:**

```bash
# Connect to production servers
ssh -J jumphost.kitchenxpert.internal user@backend-prod-1

# Use SSH config
# ~/.ssh/config
Host jumphost
  HostName ssh.kitchenxpert.internal
  User oncall
  IdentityFile ~/.ssh/kitchenxpert_oncall

Host backend-*
  ProxyJump jumphost
  User oncall
```

### Kubernetes Access

```bash
# Configure kubectl context
kubectl config use-context production

# Common debugging commands
kubectl get pods -n kitchenxpert
kubectl logs -f deployment/backend -n kitchenxpert
kubectl describe pod <pod-name> -n kitchenxpert
kubectl rollout status deployment/backend -n kitchenxpert
```

---

## Training Requirements

### Initial Training (Before First On-Call)

**Duration:** 2 weeks

| Module                     | Duration | Format       |
| -------------------------- | -------- | ------------ |
| Monitoring Stack Overview  | 2 hours  | Classroom    |
| PagerDuty and Alertmanager | 2 hours  | Hands-on lab |
| Runbook Walkthrough        | 4 hours  | Guided tour  |
| Incident Response Process  | 2 hours  | Classroom    |
| Shadow On-Call Week        | 1 week   | Shadowing    |
| Supervised On-Call Week    | 1 week   | With mentor  |

### Shadow Week

**Activities:**

- Join all incident bridges
- Review all alerts with primary
- Practice acknowledgment flow
- Execute runbook procedures (non-prod)
- Participate in handoff meeting

### Certification

**Requirements:**

- Complete all training modules
- Pass incident response simulation
- Successfully handle 3 incidents during supervised week
- Sign on-call responsibility agreement

### Ongoing Training

**Monthly:**

- Incident review session (1 hour)
- New runbook walkthrough (as needed)

**Quarterly:**

- Disaster recovery drill
- Incident response simulation
- Tool updates and new features

### Knowledge Base

| Resource             | URL                                             |
| -------------------- | ----------------------------------------------- |
| Training Portal      | https://training.kitchenxpert.internal          |
| Video Library        | https://videos.kitchenxpert.internal/oncall     |
| Certification Status | https://hr.kitchenxpert.internal/certifications |

---

## Related Documentation

- [Alert Rules](./alert-rules.md)
- [Escalation Policies](./escalation-policies.md)
- [Notification Channels](./notification-channels.md)
- [Incident Response](/docs/operations/incident-response.md)
- [Runbooks](/runbooks/README.md)

---

_For questions about on-call rotation, contact the SRE team at
sre@kitchenxpert.com_
