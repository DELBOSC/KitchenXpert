# Business Metrics Documentation

> Comprehensive guide to business KPIs and metrics tracking for KitchenXpert.

**Last Updated:** 2026-01-10
**Owner:** Product Analytics Team
**Version:** 1.0

---

## Table of Contents

1. [User Engagement Metrics](#user-engagement-metrics)
2. [Conversion Metrics](#conversion-metrics)
3. [Revenue Metrics](#revenue-metrics)
4. [Catalog Metrics](#catalog-metrics)
5. [AI Metrics](#ai-metrics)
6. [Prometheus Queries](#prometheus-queries)
7. [Business Dashboard](#business-dashboard)
8. [Related Documentation](#related-documentation)

---

## User Engagement Metrics

### Active User Metrics

#### Definitions

| Metric | Definition | Calculation |
|--------|------------|-------------|
| DAU | Daily Active Users | Unique users with activity in 24h |
| WAU | Weekly Active Users | Unique users with activity in 7d |
| MAU | Monthly Active Users | Unique users with activity in 30d |
| Stickiness | User retention indicator | DAU / MAU ratio |

#### DAU (Daily Active Users)

**Definition:** Unique users who perform at least one meaningful action per day

**Meaningful Actions:**
- Login to platform
- Create or edit a design
- Save a design
- View product catalog
- Request a quote

**PromQL Query**
```promql
# Daily active users (from custom metric)
kitchenxpert_daily_active_users
```

**Target:** Growth of 5-10% month-over-month

#### WAU (Weekly Active Users)

**Definition:** Unique users active in the past 7 days

```promql
# Weekly active users
kitchenxpert_weekly_active_users
```

**Target:** WAU should be at least 3x DAU

#### MAU (Monthly Active Users)

**Definition:** Unique users active in the past 30 days

```promql
# Monthly active users
kitchenxpert_monthly_active_users
```

**Target:** Consistent growth, low churn rate

#### Stickiness Ratio

**Calculation:** DAU / MAU

```promql
# Stickiness ratio
kitchenxpert_daily_active_users / kitchenxpert_monthly_active_users
```

**Interpretation:**
| Ratio | Meaning |
|-------|---------|
| > 0.5 | Excellent engagement (users come daily) |
| 0.2 - 0.5 | Good engagement (several times per week) |
| 0.1 - 0.2 | Average engagement (weekly users) |
| < 0.1 | Low engagement (monthly users only) |

**Target:** > 0.2 (20% stickiness)

---

### Session Metrics

#### Session Duration

**Definition:** Time from session start to last activity

```promql
# Average session duration (minutes)
avg(kitchenxpert_session_duration_seconds) / 60
```

**Percentile Distribution**
```promql
# Session duration p50
histogram_quantile(0.50, sum(rate(kitchenxpert_session_duration_bucket[24h])) by (le)) / 60

# Session duration p90
histogram_quantile(0.90, sum(rate(kitchenxpert_session_duration_bucket[24h])) by (le)) / 60
```

**Targets:**
| Metric | Target |
|--------|--------|
| Average Session | > 8 minutes |
| p50 Session | > 5 minutes |
| p90 Session | > 15 minutes |

#### Sessions Per User

```promql
# Average sessions per user per week
sum(increase(kitchenxpert_sessions_total[7d])) / kitchenxpert_weekly_active_users
```

**Target:** > 2 sessions per user per week

---

### Designs Created Per User

#### Design Metrics

| Metric | Description |
|--------|-------------|
| Designs created (total) | All new designs |
| Designs per user | Average designs per active user |
| Design completion rate | Started designs that get saved |
| Design iterations | Average edits per design |

```promql
# Total designs created today
increase(kitchenxpert_designs_created_total[24h])

# Designs per active user
increase(kitchenxpert_designs_created_total[24h]) / kitchenxpert_daily_active_users
```

**Targets:**
| Metric | Target |
|--------|--------|
| Designs per DAU | > 0.5 |
| Design completion rate | > 60% |
| Average iterations | 3-5 per design |

---

## Conversion Metrics

### Conversion Funnel

```
    Landing Page Visitors
            |
            v (Sign-up Rate: ~5%)
    Registered Users
            |
            v (Activation Rate: ~60%)
    First Design Created
            |
            v (Engagement Rate: ~40%)
    Design Completed
            |
            v (Quote Rate: ~20%)
    Quote Requested
            |
            v (Conversion Rate: ~15%)
    Partner Connected
```

### Sign-up Conversion Rate

**Definition:** Visitors who complete registration / Total visitors

```promql
# Sign-up conversion rate
sum(increase(kitchenxpert_signups_total[24h])) /
sum(increase(kitchenxpert_landing_page_views_total[24h])) * 100
```

**Breakdown by Source**
```promql
# Sign-up rate by acquisition source
sum(increase(kitchenxpert_signups_total[24h])) by (source) /
sum(increase(kitchenxpert_landing_page_views_total[24h])) by (source) * 100
```

**Targets:**
| Source | Target Conversion |
|--------|-------------------|
| Organic Search | 3-5% |
| Paid Ads | 5-8% |
| Referral | 8-12% |
| Partner Website | 10-15% |

### Design Completion Rate

**Definition:** Users who save a design / Users who start a design

```promql
# Design completion rate
sum(increase(kitchenxpert_designs_saved_total[24h])) /
sum(increase(kitchenxpert_designs_started_total[24h])) * 100
```

**Target:** > 60%

### Quote Request Rate

**Definition:** Completed designs that result in quote requests

```promql
# Quote request rate
sum(increase(kitchenxpert_quotes_requested_total[24h])) /
sum(increase(kitchenxpert_designs_saved_total[24h])) * 100
```

**Target:** > 20%

### Full Funnel Metrics

```promql
# Funnel visualization data
label_replace(
  vector(1), "stage", "visitors", "", ""
) or label_replace(
  kitchenxpert_signups_total / kitchenxpert_visitors_total, "stage", "signups", "", ""
) or label_replace(
  kitchenxpert_designs_created_total / kitchenxpert_signups_total, "stage", "first_design", "", ""
) or label_replace(
  kitchenxpert_quotes_requested_total / kitchenxpert_designs_created_total, "stage", "quote_request", "", ""
)
```

---

## Revenue Metrics

### Subscription Revenue

#### Subscription Tiers

| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | Basic design tools, 2 designs/month |
| Pro | $29/month | Unlimited designs, AI features |
| Business | $99/month | Team features, API access |
| Enterprise | Custom | White-label, dedicated support |

#### Revenue Metrics

```promql
# Monthly Recurring Revenue (MRR)
kitchenxpert_mrr_dollars

# Revenue by tier
sum(kitchenxpert_subscription_revenue_dollars) by (tier)

# Average Revenue Per User (ARPU)
kitchenxpert_mrr_dollars / kitchenxpert_paying_users
```

**Targets:**
| Metric | Target |
|--------|--------|
| MRR Growth | > 10% month-over-month |
| ARPU | > $35 |
| Free to Paid Conversion | > 5% |

### Partner Commission

**Definition:** Commission earned from partner referrals

```promql
# Partner commission revenue
kitchenxpert_partner_commission_dollars

# Commission by partner
sum(kitchenxpert_partner_commission_dollars) by (partner)
```

#### Commission Structure

| Action | Commission |
|--------|------------|
| Lead (quote request) | $5-10 |
| Sale (completed purchase) | 2-5% of order value |
| Installation booking | $20-50 |

### Revenue Dashboard Metrics

| Metric | Query | Target |
|--------|-------|--------|
| Today's Revenue | `increase(kitchenxpert_revenue_total[24h])` | Track trend |
| This Month Revenue | `increase(kitchenxpert_revenue_total[30d])` | Beat last month |
| Churn Rate | `kitchenxpert_churned_users / kitchenxpert_total_subscribers` | < 5% |

---

## Catalog Metrics

### Product View Metrics

#### Products Viewed

```promql
# Total product views today
increase(kitchenxpert_product_views_total[24h])

# Product views per session
increase(kitchenxpert_product_views_total[24h]) /
increase(kitchenxpert_sessions_total[24h])
```

**Target:** > 10 product views per session

#### Products by Category

```promql
# Product views by category
sum(increase(kitchenxpert_product_views_total[24h])) by (category)
```

**Categories:**
- Cabinets
- Countertops
- Appliances
- Fixtures
- Lighting
- Flooring
- Accessories

### Products Added to Designs

```promql
# Products added to designs
increase(kitchenxpert_products_added_total[24h])

# Add-to-design rate
increase(kitchenxpert_products_added_total[24h]) /
increase(kitchenxpert_product_views_total[24h]) * 100
```

**Target:** > 15% add-to-design rate

### Top Products

```promql
# Top 20 most viewed products
topk(20, sum(increase(kitchenxpert_product_views_total[7d])) by (product_id, product_name))

# Top 20 most added products
topk(20, sum(increase(kitchenxpert_products_added_total[7d])) by (product_id, product_name))
```

### Catalog Health Metrics

| Metric | Query | Target |
|--------|-------|--------|
| Total Products | `kitchenxpert_catalog_product_count` | > 10,000 |
| Active Products (viewed this week) | `count(increase(kitchenxpert_product_views_total[7d]) > 0)` | > 80% |
| Out of Stock Products | `kitchenxpert_products_out_of_stock` | < 5% |
| New Products (this month) | `increase(kitchenxpert_catalog_product_count[30d])` | > 100 |

---

## AI Metrics

### Design Generation Metrics

#### AI Generations Per Day

```promql
# AI design generations today
increase(kitchenxpert_ai_generations_total[24h])

# AI generations by type
sum(increase(kitchenxpert_ai_generations_total[24h])) by (type)
```

**Generation Types:**
- Layout suggestions
- Style recommendations
- Product recommendations
- Color palettes
- Complete design generation

#### AI Usage Rate

```promql
# Users using AI features / Total active users
sum(increase(kitchenxpert_ai_users_total[24h])) /
kitchenxpert_daily_active_users * 100
```

**Target:** > 40% of users engage with AI features

### AI Recommendation Acceptance Rate

**Definition:** AI suggestions that users accept / Total AI suggestions shown

```promql
# AI recommendation acceptance rate
sum(increase(kitchenxpert_ai_recommendations_accepted_total[24h])) /
sum(increase(kitchenxpert_ai_recommendations_shown_total[24h])) * 100
```

**Breakdown by Type**
```promql
# Acceptance rate by recommendation type
sum(increase(kitchenxpert_ai_recommendations_accepted_total[24h])) by (type) /
sum(increase(kitchenxpert_ai_recommendations_shown_total[24h])) by (type) * 100
```

**Targets:**
| Recommendation Type | Target Acceptance |
|---------------------|-------------------|
| Layout suggestions | > 30% |
| Product recommendations | > 25% |
| Color palettes | > 35% |
| Style recommendations | > 20% |

### AI Performance Metrics

```promql
# AI generation latency (p95)
histogram_quantile(0.95, sum(rate(kitchenxpert_ai_generation_duration_bucket[5m])) by (le))

# AI error rate
sum(rate(kitchenxpert_ai_errors_total[5m])) /
sum(rate(kitchenxpert_ai_generations_total[5m])) * 100
```

**Targets:**
| Metric | Target |
|--------|--------|
| AI Generation Time (p95) | < 10 seconds |
| AI Error Rate | < 2% |
| AI Availability | > 99.5% |

---

## Prometheus Queries

### Daily Business Summary

```promql
# Daily business metrics summary
kitchenxpert_daily_active_users  # DAU
kitchenxpert_daily_signups       # New signups
kitchenxpert_daily_designs       # Designs created
kitchenxpert_daily_quotes        # Quotes requested
kitchenxpert_daily_revenue       # Revenue
```

### Week-Over-Week Comparisons

```promql
# DAU growth week-over-week
(kitchenxpert_daily_active_users - kitchenxpert_daily_active_users offset 7d) /
kitchenxpert_daily_active_users offset 7d * 100

# Revenue growth week-over-week
(increase(kitchenxpert_revenue_total[7d]) - increase(kitchenxpert_revenue_total[7d] offset 7d)) /
increase(kitchenxpert_revenue_total[7d] offset 7d) * 100
```

### Cohort Analysis Query

```promql
# Retention by signup cohort (example for week 1 retention)
sum(kitchenxpert_users_active{cohort="2026-01-01"}) /
sum(kitchenxpert_users_signed_up{cohort="2026-01-01"}) * 100
```

---

## Business Dashboard

### Dashboard URL

**URL:** https://grafana.kitchenxpert.internal/d/business

[Dashboard: Business Metrics Overview - KPIs, conversions, and revenue]

### Dashboard Panels

#### Row 1: Active Users
1. **DAU Counter:** Current daily active users
2. **DAU Trend:** 30-day DAU graph
3. **WAU/MAU:** Weekly and monthly active users
4. **Stickiness:** DAU/MAU ratio gauge

#### Row 2: Engagement
5. **Session Duration:** Average session time
6. **Designs Created:** Daily design count
7. **Designs per User:** Average designs per active user
8. **AI Usage Rate:** Percentage using AI features

#### Row 3: Conversions
9. **Conversion Funnel:** Sankey diagram
10. **Sign-up Rate:** Visitor to signup conversion
11. **Design Completion:** Start to save conversion
12. **Quote Request Rate:** Design to quote conversion

#### Row 4: Revenue
13. **MRR:** Monthly recurring revenue
14. **Daily Revenue:** Today's revenue
15. **ARPU:** Average revenue per user
16. **Subscription Distribution:** Pie chart by tier

#### Row 5: Catalog & AI
17. **Top Products:** Most viewed products table
18. **Product Views:** Daily product view count
19. **AI Generations:** Daily AI generation count
20. **AI Acceptance Rate:** Recommendation acceptance

### Access Permissions

| Role | Access Level |
|------|--------------|
| Executive | Full dashboard |
| Product Manager | Full dashboard |
| Marketing | Marketing-related panels |
| Developer | Read-only |

---

## Related Documentation

- [Monitoring Overview](../overview.md)
- [System Metrics](./system-metrics.md)
- [User Experience Metrics](./user-experience-metrics.md)
- [Business Dashboard](../dashboards/business-dashboard.md)
- [Product Analytics Guide](/docs/analytics/product-analytics.md)

---

*For questions about business metrics, contact the Product Analytics team at analytics@kitchenxpert.com*
