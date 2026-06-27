# Notification Channels Documentation

> Comprehensive guide to alert notification channels and routing for
> KitchenXpert.

**Last Updated:** 2026-01-10 **Owner:** SRE Team **Version:** 1.0

---

## Table of Contents

1. [Channel Types](#channel-types)
2. [Channel Configuration](#channel-configuration)
3. [Routing Rules](#routing-rules)
4. [Alert Grouping and Deduplication](#alert-grouping-and-deduplication)
5. [Silence and Mute Rules](#silence-and-mute-rules)
6. [Testing Notification Channels](#testing-notification-channels)
7. [Related Documentation](#related-documentation)

---

## Channel Types

### Overview

KitchenXpert uses multiple notification channels to ensure alerts reach the
right people at the right time.

| Channel        | Use Case                      | Response Time | Severity          |
| -------------- | ----------------------------- | ------------- | ----------------- |
| **Slack**      | Team awareness, collaboration | Minutes       | All               |
| **PagerDuty**  | Immediate response needed     | Seconds       | Critical, Warning |
| **Email**      | Daily digests, escalations    | Hours         | Info, Summary     |
| **SMS**        | Critical alerts only          | Seconds       | Critical          |
| **Phone Call** | Unacknowledged critical       | Immediate     | Critical          |

### Slack Channels

**Purpose:** Real-time team communication and alert visibility

| Channel             | Purpose                      | Alerts                |
| ------------------- | ---------------------------- | --------------------- |
| `#alerts-critical`  | Critical production alerts   | Severity: Critical    |
| `#alerts-warnings`  | Warning-level alerts         | Severity: Warning     |
| `#alerts-info`      | Informational alerts         | Severity: Info        |
| `#incidents-active` | Active incident coordination | All active incidents  |
| `#oncall-primary`   | On-call coordination         | Escalations, handoffs |

**Slack Alert Format:**

```
:rotating_light: CRITICAL ALERT

Alert: HighErrorRate
Service: backend
Instance: backend-prod-1

Description: Error rate is 5.2% (threshold: 1%)

Triggered: 2026-01-10 14:30:00 UTC
Duration: 5 minutes

Dashboard: https://grafana.kitchenxpert.internal/d/errors
Runbook: https://runbooks.kitchenxpert.internal/high-error-rate

[Acknowledge] [Silence 1h] [View Details]
```

### PagerDuty

**Purpose:** Critical alert management and on-call notification

**Features:**

- Immediate push notifications
- Phone calls for unacknowledged alerts
- Incident timeline tracking
- On-call scheduling integration
- Mobile app support

**Alert Format:**

```
[CRITICAL] HighErrorRate on backend

Error rate is 5.2% on backend-prod-1
Triggered at 14:30:00 UTC

Impact: High - Users experiencing errors
Action Required: Investigate backend logs

Links:
- Dashboard: <url>
- Runbook: <url>
- Logs: <url>
```

### Email

**Purpose:** Non-urgent notifications and daily summaries

**Email Types:**

| Type              | Frequency     | Content                         |
| ----------------- | ------------- | ------------------------------- |
| Alert Email       | Immediate     | Individual alert details        |
| Daily Digest      | Daily 9 AM    | Summary of alerts from past 24h |
| Weekly Report     | Monday 9 AM   | Weekly alert statistics         |
| Escalation Notice | On escalation | Escalation details and context  |

**Email Template:**

```
Subject: [KitchenXpert Alert] CRITICAL: HighErrorRate on backend

Alert Details:
- Alert Name: HighErrorRate
- Severity: Critical
- Service: backend
- Instance: backend-prod-1

Description:
Error rate is 5.2% (threshold: 1%)

Timeline:
- Triggered: 2026-01-10 14:30:00 UTC
- Duration: 5 minutes (and counting)

Actions:
- View Dashboard: <url>
- View Runbook: <url>
- Acknowledge: <url>

This alert was sent to: oncall@kitchenxpert.com
Escalation policy: KitchenXpert Critical
```

### SMS

**Purpose:** Critical alerts when other channels may not be seen

**Configuration:**

- Used only for critical severity
- Limited to on-call personnel
- Character limit: 160 characters
- Rate limited: Max 10 SMS/hour per recipient

**SMS Format:**

```
[KITCHENXPERT CRITICAL]
HighErrorRate: 5.2% errors on backend
Ack: reply ACK
Call: 555-123-4567
```

### Phone Call

**Purpose:** Last resort for unacknowledged critical alerts

**Configuration:**

- Triggered after 10 minutes without acknowledgment
- Up to 3 call attempts
- Voicemail if unanswered
- Escalates to next level after all attempts

**Voice Message Script:**

```
"This is KitchenXpert Alert System.
Critical alert: High Error Rate on backend service.
Error rate is 5 point 2 percent.
Please acknowledge this alert immediately.
Press 1 to acknowledge. Press 2 to escalate.
This message will repeat."
```

---

## Channel Configuration

### Alertmanager Configuration

```yaml
# alertmanager.yml

global:
  resolve_timeout: 5m
  slack_api_url: 'https://hooks.slack.com/services/xxx/xxx/xxx'
  pagerduty_url: 'https://events.pagerduty.com/v2/enqueue'
  smtp_smarthost: 'smtp.kitchenxpert.internal:587'
  smtp_from: 'alerts@kitchenxpert.com'
  smtp_auth_username: 'alerts@kitchenxpert.com'
  smtp_auth_password: '${SMTP_PASSWORD}'

receivers:
  # Slack receivers
  - name: 'slack-critical'
    slack_configs:
      - channel: '#alerts-critical'
        username: 'AlertBot'
        icon_emoji: ':rotating_light:'
        color: '{{ if eq .Status "firing" }}danger{{ else }}good{{ end }}'
        title: '{{ .CommonAnnotations.summary }}'
        text: |
          {{ range .Alerts }}
          *Alert:* {{ .Annotations.summary }}
          *Severity:* {{ .Labels.severity }}
          *Service:* {{ .Labels.service }}
          *Description:* {{ .Annotations.description }}
          *Dashboard:* {{ .Annotations.dashboard_url }}
          *Runbook:* {{ .Annotations.runbook_url }}
          {{ end }}
        actions:
          - type: button
            text: 'Acknowledge'
            url: '{{ .ExternalURL }}/#/alerts?receiver={{ .Receiver }}'
          - type: button
            text: 'Silence'
            url: '{{ .ExternalURL }}/#/silences/new?filter='

  - name: 'slack-warnings'
    slack_configs:
      - channel: '#alerts-warnings'
        username: 'AlertBot'
        icon_emoji: ':warning:'
        color: 'warning'
        title: '{{ .CommonAnnotations.summary }}'

  - name: 'slack-info'
    slack_configs:
      - channel: '#alerts-info'
        username: 'AlertBot'
        icon_emoji: ':information_source:'
        color: '#36a64f'

  # PagerDuty receivers
  - name: 'pagerduty-critical'
    pagerduty_configs:
      - service_key: '${PAGERDUTY_SERVICE_KEY_CRITICAL}'
        severity: 'critical'
        description: '{{ .CommonAnnotations.summary }}'
        details:
          service: '{{ .CommonLabels.service }}'
          severity: '{{ .CommonLabels.severity }}'
          dashboard: '{{ .CommonAnnotations.dashboard_url }}'
          runbook: '{{ .CommonAnnotations.runbook_url }}'
        links:
          - href: '{{ .CommonAnnotations.dashboard_url }}'
            text: 'Dashboard'
          - href: '{{ .CommonAnnotations.runbook_url }}'
            text: 'Runbook'

  - name: 'pagerduty-warning'
    pagerduty_configs:
      - service_key: '${PAGERDUTY_SERVICE_KEY_WARNING}'
        severity: 'warning'
        description: '{{ .CommonAnnotations.summary }}'

  # Email receivers
  - name: 'email-oncall'
    email_configs:
      - to: 'oncall@kitchenxpert.com'
        send_resolved: true
        headers:
          Subject:
            '[KitchenXpert Alert] {{ .Status | toUpper }}: {{
            .CommonAnnotations.summary }}'

  - name: 'email-digest'
    email_configs:
      - to: 'engineering@kitchenxpert.com'
        send_resolved: false

  # Webhook for custom integrations
  - name: 'webhook-custom'
    webhook_configs:
      - url: 'https://integrations.kitchenxpert.internal/alerts'
        send_resolved: true
        max_alerts: 10

  # Null receiver for silenced alerts
  - name: 'null'
```

### PagerDuty Integration

```yaml
# pagerduty-integration.yaml

integrations:
  - name: 'Prometheus Alertmanager'
    type: 'events_api_v2'
    service: 'KitchenXpert Backend'
    routing_key: '${PAGERDUTY_ROUTING_KEY}'

    event_rules:
      - condition:
          expression: "event.severity matches 'critical'"
        actions:
          - severity: 'critical'
          - urgency: 'high'
          - route_to: 'critical_escalation_policy'

      - condition:
          expression: "event.severity matches 'warning'"
        actions:
          - severity: 'warning'
          - urgency: 'low'
          - route_to: 'warning_escalation_policy'
```

---

## Routing Rules

### Alertmanager Routing Configuration

```yaml
# alertmanager.yml - route section

route:
  # Default receiver
  receiver: 'slack-warnings'

  # Global grouping
  group_by: ['alertname', 'service', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h

  # Child routes
  routes:
    # Critical alerts - immediate notification
    - match:
        severity: critical
      receiver: 'pagerduty-critical'
      group_wait: 10s
      group_interval: 1m
      repeat_interval: 1h
      continue: true # Also send to Slack
      routes:
        - match:
            alertname: ServiceDown
          receiver: 'pagerduty-critical'
          group_wait: 0s # No wait for service down

    - match:
        severity: critical
      receiver: 'slack-critical'
      continue: false

    # Warning alerts
    - match:
        severity: warning
      receiver: 'pagerduty-warning'
      group_wait: 30s
      group_interval: 5m
      repeat_interval: 4h
      continue: true

    - match:
        severity: warning
      receiver: 'slack-warnings'

    # Info alerts - Slack only
    - match:
        severity: info
      receiver: 'slack-info'
      group_wait: 1m
      group_interval: 10m
      repeat_interval: 24h

    # Team-specific routing
    - match:
        team: database
      receiver: 'slack-database-team'
      routes:
        - match:
            severity: critical
          receiver: 'pagerduty-database'

    - match:
        team: ai
      receiver: 'slack-ai-team'
      routes:
        - match:
            severity: critical
          receiver: 'pagerduty-ai'

    # Service-specific routing
    - match_re:
        service: (frontend|cdn)
      receiver: 'slack-frontend-team'

    # Business hours routing
    - match:
        business_critical: 'true'
      receiver: 'pagerduty-critical'
      active_time_intervals:
        - business_hours
```

### Time-Based Routing

```yaml
# Time intervals for routing
time_intervals:
  - name: business_hours
    time_intervals:
      - times:
          - start_time: '09:00'
            end_time: '18:00'
        weekdays: ['monday:friday']
        location: 'America/New_York'

  - name: off_hours
    time_intervals:
      - times:
          - start_time: '18:00'
            end_time: '09:00'
        weekdays: ['monday:friday']
      - weekdays: ['saturday', 'sunday']
        location: 'America/New_York'

# Mute during maintenance
mute_time_intervals:
  - name: weekly_maintenance
    time_intervals:
      - times:
          - start_time: '02:00'
            end_time: '04:00'
        weekdays: ['thursday']
        location: 'UTC'
```

---

## Alert Grouping and Deduplication

### Grouping Configuration

```yaml
# Grouping strategy
group_by:
  - alertname # Group same alert names
  - service # Group by service
  - cluster # Group by cluster
  - namespace # Group by K8s namespace

# Grouping behavior
group_wait: 30s # Wait before sending first notification
group_interval: 5m # Wait before sending updated group
repeat_interval: 4h # Wait before re-sending same group
```

### Example Grouping

**Scenario:** 3 instances of backend have high CPU

**Without Grouping:**

- Alert 1: HighCPU on backend-1
- Alert 2: HighCPU on backend-2
- Alert 3: HighCPU on backend-3
- Result: 3 separate notifications

**With Grouping (group_by: alertname, service):**

- Alert Group: HighCPU on backend
  - backend-1, backend-2, backend-3
- Result: 1 notification with all affected instances

### Deduplication

Alertmanager automatically deduplicates alerts based on:

- Alert name
- Labels
- Fingerprint (hash of name + labels)

**Configuration:**

```yaml
# Alerts with same fingerprint are deduplicated
# Fingerprint = hash(alertname + sorted(labels))

# Example: These are the SAME alert (deduplicated)
alert_1:
  alertname: HighCPU
  instance: backend-1
  severity: warning

alert_2:
  alertname: HighCPU
  instance: backend-1
  severity: warning # Same fingerprint

# These are DIFFERENT alerts
alert_3:
  alertname: HighCPU
  instance: backend-2 # Different instance = different fingerprint
  severity: warning
```

---

## Silence and Mute Rules

### Creating Silences

#### Via Alertmanager UI

1. Navigate to https://alertmanager.kitchenxpert.internal/#/silences
2. Click "New Silence"
3. Add matchers (e.g., `alertname="HighCPU"`, `instance="backend-1"`)
4. Set duration
5. Add comment and creator
6. Submit

#### Via amtool CLI

```bash
# Silence specific alert
amtool silence add alertname="HighCPU" instance="backend-1" \
  --comment="Planned maintenance" \
  --author="ops@kitchenxpert.com" \
  --duration="2h"

# Silence all alerts for a service
amtool silence add service="backend" \
  --comment="Deploying new version" \
  --author="deploy@kitchenxpert.com" \
  --duration="30m"

# List active silences
amtool silence query

# Expire a silence
amtool silence expire <silence-id>
```

#### Via API

```bash
# Create silence via API
curl -X POST https://alertmanager.kitchenxpert.internal/api/v2/silences \
  -H "Content-Type: application/json" \
  -d '{
    "matchers": [
      {"name": "alertname", "value": "HighCPU", "isRegex": false},
      {"name": "instance", "value": "backend-1", "isRegex": false}
    ],
    "startsAt": "2026-01-10T14:00:00Z",
    "endsAt": "2026-01-10T16:00:00Z",
    "createdBy": "ops@kitchenxpert.com",
    "comment": "Planned maintenance window"
  }'
```

### Silence Best Practices

| Do                          | Don't                        |
| --------------------------- | ---------------------------- |
| Set specific matchers       | Silence all alerts broadly   |
| Include meaningful comments | Leave comments empty         |
| Set appropriate duration    | Create indefinite silences   |
| Review silences regularly   | Forget about active silences |
| Use for planned maintenance | Use to hide problems         |

### Mute Time Intervals

Scheduled muting for recurring events:

```yaml
# alertmanager.yml
mute_time_intervals:
  - name: weekly_deployment
    time_intervals:
      - times:
          - start_time: '14:00'
            end_time: '15:00'
        weekdays: ['thursday']

  - name: nightly_batch_jobs
    time_intervals:
      - times:
          - start_time: '02:00'
            end_time: '04:00'
        weekdays: ['monday:friday']

route:
  receiver: 'default'
  routes:
    - match:
        alertname: 'DeploymentRelatedAlert'
      mute_time_intervals:
        - weekly_deployment

    - match:
        alertname: 'BatchJobHighLatency'
      mute_time_intervals:
        - nightly_batch_jobs
```

---

## Testing Notification Channels

### Test Alert Command

```bash
# Send test alert via amtool
amtool alert add alertname="TestAlert" severity="warning" service="test" \
  --annotation.summary="Test alert from $(hostname)" \
  --annotation.description="This is a test alert to verify notification channels"

# Remove test alert
amtool alert add alertname="TestAlert" severity="warning" service="test" \
  --end="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
```

### Prometheus Test Rule

```yaml
# Add to prometheus rules for testing
groups:
  - name: test_alerts
    rules:
      - alert: TestAlertCritical
        expr: vector(1) == 1
        for: 1m
        labels:
          severity: critical
          team: test
        annotations:
          summary: 'Test critical alert'
          description: 'This is a test alert for verification'
```

### Channel Test Checklist

| Channel   | Test Method           | Verify                                  |
| --------- | --------------------- | --------------------------------------- |
| Slack     | Send test alert       | Message appears in correct channel      |
| PagerDuty | Trigger test incident | Notification received, incident created |
| Email     | Send test email       | Email received, format correct          |
| SMS       | Manual test           | SMS received within 30 seconds          |
| Phone     | Manual test           | Call received, message clear            |

### Notification Test Script

```bash
#!/bin/bash
# test-notifications.sh

ALERTMANAGER_URL="https://alertmanager.kitchenxpert.internal"

echo "Testing notification channels..."

# Test critical alert
echo "1. Sending critical test alert..."
amtool --alertmanager.url="$ALERTMANAGER_URL" \
  alert add alertname="TestCritical" severity="critical" service="test" \
  --annotation.summary="Test Critical Alert" \
  --annotation.description="Testing critical notification path"

sleep 30

# Verify PagerDuty incident created
echo "2. Check PagerDuty for incident..."

# Verify Slack message
echo "3. Check #alerts-critical for message..."

# Clear test alert
echo "4. Clearing test alert..."
amtool --alertmanager.url="$ALERTMANAGER_URL" \
  alert add alertname="TestCritical" severity="critical" service="test" \
  --end="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

echo "Test complete. Verify notifications were received."
```

### Monthly Channel Verification

| Week   | Test                            |
| ------ | ------------------------------- |
| Week 1 | Slack channels (all severities) |
| Week 2 | PagerDuty integration           |
| Week 3 | Email delivery                  |
| Week 4 | SMS and phone (critical path)   |

---

## Related Documentation

- [Alert Rules](./alert-rules.md)
- [Escalation Policies](./escalation-policies.md)
- [On-Call Rotation](./on-call-rotation.md)
- [Monitoring Overview](../overview.md)

---

_For questions about notification channels, contact the SRE team at
sre@kitchenxpert.com_
