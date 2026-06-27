# Business Dashboard Documentation

> Comprehensive guide to the KitchenXpert Business Dashboard for KPIs and
> business metrics.

**Last Updated:** 2026-01-10 **Owner:** Product Analytics Team **Version:** 1.0

---

## Table of Contents

1. [Dashboard Access](#dashboard-access)
2. [Dashboard Panels](#dashboard-panels)
3. [Business KPIs and Targets](#business-kpis-and-targets)
4. [Stakeholder Access](#stakeholder-access)
5. [Scheduled Reports](#scheduled-reports)
6. [Related Documentation](#related-documentation)

---

## Dashboard Access

### URL and Access

**Dashboard URL:** https://grafana.kitchenxpert.internal/d/business

**Direct Links:** | View | URL | |------|-----| | Executive View |
https://grafana.kitchenxpert.internal/d/business?var-view=executive | | Product
View | https://grafana.kitchenxpert.internal/d/business?var-view=product | |
Marketing View |
https://grafana.kitchenxpert.internal/d/business?var-view=marketing |

### Access Requirements

| Role            | Access Level  | Panels Visible    |
| --------------- | ------------- | ----------------- |
| Executive       | View only     | All panels        |
| Product Manager | View + export | All panels        |
| Marketing       | View only     | Marketing-related |
| Developer       | View only     | Technical metrics |
| Finance         | View only     | Revenue panels    |

---

## Dashboard Panels

### Row 1: Active Users

#### Panel 1.1: Active Users (Real-Time)

**Type:** Stat panel with trend

**Description:** Currently active users on the platform

**Query:**

```promql
# Real-time active users
kitchenxpert_active_sessions
```

**Visualization:**

- Large number display
- Small sparkline showing trend
- Comparison to same time yesterday

**Refresh Rate:** 10 seconds

[Dashboard: Active Users Counter - Shows real-time user count]

#### Panel 1.2: DAU/WAU/MAU Trend

**Type:** Time series with multiple metrics

**Description:** Daily, weekly, and monthly active user trends

**Queries:**

```promql
# Daily Active Users
kitchenxpert_daily_active_users

# Weekly Active Users
kitchenxpert_weekly_active_users

# Monthly Active Users
kitchenxpert_monthly_active_users
```

**Visualization:**

- Three lines on same graph
- Y-axis: User count
- Legend with current values

[Dashboard: Active Users Trend - DAU/WAU/MAU over time]

#### Panel 1.3: User Stickiness

**Type:** Gauge

**Description:** DAU/MAU ratio indicating engagement

**Query:**

```promql
# Stickiness ratio
kitchenxpert_daily_active_users / kitchenxpert_monthly_active_users * 100
```

**Thresholds:** | Value | Rating | Color | |-------|--------|-------| | > 20% |
Excellent | Green | | 10-20% | Good | Blue | | < 10% | Needs Improvement |
Yellow |

**Target:** > 20%

[Dashboard: Stickiness Gauge - Shows user engagement ratio]

---

### Row 2: Design Metrics

#### Panel 2.1: Designs Created Today

**Type:** Stat with comparison

**Description:** Number of designs created today

**Query:**

```promql
# Designs created today
increase(kitchenxpert_designs_created_total[24h])
```

**Comparison:**

- vs. yesterday
- vs. same day last week

[Dashboard: Designs Created Today - Daily design count]

#### Panel 2.2: Design Creation Trend

**Type:** Time series

**Description:** Design creation rate over time

**Query:**

```promql
# Design creation rate
rate(kitchenxpert_designs_created_total[1h]) * 3600
```

**Visualization:**

- Area chart
- Y-axis: Designs per hour
- Highlight peak hours

[Dashboard: Design Creation Trend - Hourly design rate]

#### Panel 2.3: Design Completion Funnel

**Type:** Bar gauge (funnel)

**Description:** Funnel from started to completed designs

**Queries:**

```promql
# Designs started
increase(kitchenxpert_designs_started_total[24h])

# Designs saved
increase(kitchenxpert_designs_saved_total[24h])

# Designs completed
increase(kitchenxpert_designs_completed_total[24h])
```

**Visualization:**

- Funnel chart showing drop-off
- Percentages at each stage

[Dashboard: Design Funnel - Shows completion rates]

---

### Row 3: Conversion Funnel

#### Panel 3.1: Full Conversion Funnel

**Type:** Sankey diagram / Funnel visualization

**Description:** Complete user journey from visit to conversion

**Stages:**

1. **Visitors** → Website visitors
2. **Sign-ups** → Registered users
3. **First Design** → Created first design
4. **Design Completed** → Saved a design
5. **Quote Requested** → Requested partner quote

**Queries:**

```promql
kitchenxpert_landing_page_views_total
kitchenxpert_signups_total
kitchenxpert_first_design_users_total
kitchenxpert_designs_completed_total
kitchenxpert_quotes_requested_total
```

**Conversion Rates Displayed:**

- Visitor → Signup: X%
- Signup → First Design: X%
- First Design → Completed: X%
- Completed → Quote: X%

[Dashboard: Conversion Funnel - Full user journey visualization]

#### Panel 3.2: Conversion Rate Trends

**Type:** Time series

**Description:** Key conversion rates over time

**Queries:**

```promql
# Signup conversion rate
rate(kitchenxpert_signups_total[1d]) /
rate(kitchenxpert_landing_page_views_total[1d]) * 100

# Design completion rate
rate(kitchenxpert_designs_completed_total[1d]) /
rate(kitchenxpert_designs_started_total[1d]) * 100

# Quote request rate
rate(kitchenxpert_quotes_requested_total[1d]) /
rate(kitchenxpert_designs_completed_total[1d]) * 100
```

**Visualization:**

- Multiple lines for each conversion rate
- Target threshold lines

[Dashboard: Conversion Rate Trends - Historical conversion metrics]

---

### Row 4: Product Catalog

#### Panel 4.1: Top Products

**Type:** Table

**Description:** Most viewed and added products

**Columns:** | Column | Description | |--------|-------------| | Rank | Position
by views | | Product Name | Product display name | | Category | Product category
| | Views (7d) | View count | | Adds to Design | Times added | | Add Rate | Adds
/ Views |

**Query:**

```promql
topk(10, sum(increase(kitchenxpert_product_views_total[7d])) by (product_id, product_name, category))
```

[Dashboard: Top Products Table - Most popular products]

#### Panel 4.2: Product Views by Category

**Type:** Pie chart

**Description:** Distribution of product views by category

**Query:**

```promql
sum(increase(kitchenxpert_product_views_total[24h])) by (category)
```

**Categories:**

- Cabinets
- Countertops
- Appliances
- Fixtures
- Lighting
- Flooring

[Dashboard: Product Views by Category - Category distribution]

#### Panel 4.3: Partner Catalog Status

**Type:** Status panel

**Description:** Health of partner catalog integrations

**Metrics:** | Partner | Products | Last Sync | Status |
|---------|----------|-----------|--------| | Partner A | 5,234 | 2h ago |
Healthy | | Partner B | 3,128 | 1h ago | Healthy | | Partner C | 2,891 | 6h ago
| Warning |

**Query:**

```promql
kitchenxpert_partner_catalog_products_count
kitchenxpert_partner_catalog_last_sync_timestamp
```

[Dashboard: Partner Catalog Status - Integration health]

---

### Row 5: Revenue Metrics

#### Panel 5.1: Monthly Recurring Revenue (MRR)

**Type:** Stat with trend

**Description:** Current MRR from subscriptions

**Query:**

```promql
kitchenxpert_mrr_dollars
```

**Display:**

- Current MRR value
- Month-over-month change
- Trend sparkline

[Dashboard: MRR Counter - Monthly recurring revenue]

#### Panel 5.2: Revenue Breakdown

**Type:** Stacked area chart

**Description:** Revenue by source over time

**Queries:**

```promql
# Subscription revenue
kitchenxpert_subscription_revenue_dollars

# Partner commission
kitchenxpert_partner_commission_dollars

# One-time purchases
kitchenxpert_onetime_revenue_dollars
```

**Visualization:**

- Stacked area showing revenue composition
- Y-axis: Dollars
- Legend showing breakdown

[Dashboard: Revenue Breakdown - Revenue by source]

#### Panel 5.3: Subscription Tier Distribution

**Type:** Pie chart

**Description:** Users by subscription tier

**Query:**

```promql
sum(kitchenxpert_users_by_tier) by (tier)
```

**Tiers:**

- Free: $0
- Pro: $29/month
- Business: $99/month
- Enterprise: Custom

[Dashboard: Subscription Distribution - Users by tier]

---

### Row 6: AI Metrics

#### Panel 6.1: AI Generations Today

**Type:** Stat panel

**Description:** Number of AI design generations today

**Query:**

```promql
increase(kitchenxpert_ai_generations_total[24h])
```

[Dashboard: AI Generations Counter]

#### Panel 6.2: AI Feature Adoption

**Type:** Gauge

**Description:** Percentage of users using AI features

**Query:**

```promql
sum(kitchenxpert_ai_users_active) /
sum(kitchenxpert_daily_active_users) * 100
```

**Target:** > 40%

[Dashboard: AI Adoption Gauge - AI feature usage rate]

#### Panel 6.3: AI Recommendation Acceptance

**Type:** Time series

**Description:** Rate at which users accept AI recommendations

**Query:**

```promql
rate(kitchenxpert_ai_recommendations_accepted_total[1h]) /
rate(kitchenxpert_ai_recommendations_shown_total[1h]) * 100
```

**Visualization:**

- Line chart with target threshold
- By recommendation type

[Dashboard: AI Acceptance Rate - Recommendation effectiveness]

---

## Business KPIs and Targets

### KPI Summary Table

| KPI                  | Current | Target  | Status       |
| -------------------- | ------- | ------- | ------------ |
| DAU                  | 15,234  | 15,000  | On Track     |
| WAU                  | 45,678  | 45,000  | On Track     |
| MAU                  | 123,456 | 120,000 | On Track     |
| Stickiness (DAU/MAU) | 12.3%   | 15%     | Below Target |
| Sign-up Conversion   | 4.2%    | 5%      | Below Target |
| Design Completion    | 68%     | 65%     | Above Target |
| Quote Request Rate   | 22%     | 20%     | Above Target |
| MRR                  | $145K   | $150K   | On Track     |
| AI Adoption          | 35%     | 40%     | Below Target |

### Target Tracking

**Weekly Review:**

- Every Monday: Review prior week KPIs
- Identify trends and anomalies
- Adjust targets if needed

**Monthly Review:**

- Full KPI review with stakeholders
- Update targets based on performance
- Strategic planning alignment

### Alert Thresholds

| KPI             | Warning             | Critical            |
| --------------- | ------------------- | ------------------- |
| DAU drop        | -10% day-over-day   | -20% day-over-day   |
| Conversion drop | -15% week-over-week | -25% week-over-week |
| Quote failures  | > 5%                | > 10%               |
| Revenue anomaly | -10% from forecast  | -20% from forecast  |

---

## Stakeholder Access

### Access Levels by Role

#### Executive Team

- **Access:** Full dashboard, all panels
- **Features:** PDF export, scheduled reports
- **Restrictions:** Cannot edit

#### Product Management

- **Access:** Full dashboard, all panels
- **Features:** Data export, annotations
- **Restrictions:** Cannot edit revenue panels

#### Marketing Team

- **Access:** User acquisition panels, conversion funnel
- **Features:** Campaign tracking views
- **Restrictions:** No revenue visibility

#### Finance Team

- **Access:** Revenue panels only
- **Features:** Financial data export
- **Restrictions:** Limited user metrics

### Sharing and Embedding

**Share Link:**

```
https://grafana.kitchenxpert.internal/d/business?kiosk=tv
```

**Embed in Notion/Confluence:**

```html
<iframe
  src="https://grafana.kitchenxpert.internal/d/business?orgId=1&kiosk=tv"
  width="100%"
  height="600"
></iframe>
```

**TV Dashboard Mode:**

- URL parameter: `?kiosk=tv`
- Auto-refresh enabled
- Navigation hidden

---

## Scheduled Reports

### Daily Report

**Recipients:** Executive team, Product leads **Schedule:** 9:00 AM daily
**Content:**

- Yesterday's KPIs
- Day-over-day changes
- Anomaly highlights

### Weekly Report

**Recipients:** All stakeholders **Schedule:** Monday 9:00 AM **Content:**

- Weekly KPI summary
- Funnel performance
- Top products
- Revenue summary
- AI metrics

### Monthly Report

**Recipients:** Leadership, Board **Schedule:** 1st of month **Content:**

- Full month analysis
- Trend analysis
- Target progress
- Strategic recommendations

### Configuring Reports

1. Navigate to Dashboard > Share > Report
2. Select panels to include
3. Set schedule and recipients
4. Choose format (PDF/CSV)
5. Enable and save

---

## Related Documentation

- [Monitoring Overview](../overview.md)
- [Business Metrics](../metrics/business-metrics.md)
- [User Experience Metrics](../metrics/user-experience-metrics.md)
- [System Dashboard](./system-dashboard.md)
- [Product Analytics Guide](/docs/analytics/product-analytics.md)

---

_For questions about the business dashboard, contact the Product Analytics team
at analytics@kitchenxpert.com_
