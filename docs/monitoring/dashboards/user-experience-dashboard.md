# User Experience Dashboard Documentation

> Comprehensive guide to the KitchenXpert User Experience Dashboard for frontend
> performance monitoring.

**Last Updated:** 2026-01-10 **Owner:** Frontend Engineering Team **Version:**
1.0

---

## Table of Contents

1. [Dashboard Access](#dashboard-access)
2. [Dashboard Panels](#dashboard-panels)
3. [Performance Budgets and Alerts](#performance-budgets-and-alerts)
4. [Historical Trends](#historical-trends)
5. [Troubleshooting Guide](#troubleshooting-guide)
6. [Related Documentation](#related-documentation)

---

## Dashboard Access

### URL and Access

**Dashboard URL:** https://grafana.kitchenxpert.internal/d/ux

**Direct Links:** | View | URL | |------|-----| | Core Web Vitals |
https://grafana.kitchenxpert.internal/d/ux?var-section=cwv | | 3D Performance |
https://grafana.kitchenxpert.internal/d/ux?var-section=3d | | API Latency |
https://grafana.kitchenxpert.internal/d/ux?var-section=api | | Geographic |
https://grafana.kitchenxpert.internal/d/ux?var-section=geo |

### Access Requirements

| Role              | Access Level       |
| ----------------- | ------------------ |
| Frontend Engineer | Full edit access   |
| Developer         | View + annotations |
| Product Manager   | View only          |
| UX Designer       | View only          |

---

## Dashboard Panels

### Row 1: Core Web Vitals Summary

#### Panel 1.1: LCP (Largest Contentful Paint)

**Type:** Gauge with threshold bands

**Description:** Current p75 LCP across all pages

**Query:**

```promql
histogram_quantile(0.75, sum(rate(kitchenxpert_lcp_seconds_bucket[5m])) by (le))
```

**Thresholds:** | Value | Rating | Color | |-------|--------|-------| | < 2.5s |
Good | Green | | 2.5s - 4.0s | Needs Improvement | Yellow | | > 4.0s | Poor |
Red |

**Target:** < 2.5s

[Dashboard: LCP Gauge - Shows current Largest Contentful Paint]

#### Panel 1.2: FID (First Input Delay)

**Type:** Gauge with threshold bands

**Description:** Current p75 FID across all pages

**Query:**

```promql
histogram_quantile(0.75, sum(rate(kitchenxpert_fid_milliseconds_bucket[5m])) by (le))
```

**Thresholds:** | Value | Rating | Color | |-------|--------|-------| | < 100ms
| Good | Green | | 100ms - 300ms | Needs Improvement | Yellow | | > 300ms | Poor
| Red |

**Target:** < 100ms

[Dashboard: FID Gauge - Shows current First Input Delay]

#### Panel 1.3: CLS (Cumulative Layout Shift)

**Type:** Gauge with threshold bands

**Description:** Current p75 CLS across all pages

**Query:**

```promql
histogram_quantile(0.75, sum(rate(kitchenxpert_cls_bucket[5m])) by (le))
```

**Thresholds:** | Value | Rating | Color | |-------|--------|-------| | < 0.1 |
Good | Green | | 0.1 - 0.25 | Needs Improvement | Yellow | | > 0.25 | Poor | Red
|

**Target:** < 0.1

[Dashboard: CLS Gauge - Shows current Cumulative Layout Shift]

#### Panel 1.4: INP (Interaction to Next Paint)

**Type:** Gauge with threshold bands

**Description:** Current p75 INP across all pages

**Query:**

```promql
histogram_quantile(0.75, sum(rate(kitchenxpert_inp_milliseconds_bucket[5m])) by (le))
```

**Thresholds:** | Value | Rating | Color | |-------|--------|-------| | < 200ms
| Good | Green | | 200ms - 500ms | Needs Improvement | Yellow | | > 500ms | Poor
| Red |

**Target:** < 200ms

[Dashboard: INP Gauge - Shows current Interaction to Next Paint]

---

### Row 2: Core Web Vitals Trends

#### Panel 2.1: LCP Over Time

**Type:** Time series with threshold bands

**Description:** LCP trend over selected time range

**Query:**

```promql
# LCP p75 over time
histogram_quantile(0.75, sum(rate(kitchenxpert_lcp_seconds_bucket[5m])) by (le))
```

**Visualization:**

- Line graph
- Green band: 0 - 2.5s
- Yellow band: 2.5s - 4.0s
- Red band: > 4.0s
- Threshold lines

[Dashboard: LCP Trend - Historical LCP values]

#### Panel 2.2: FID Over Time

**Type:** Time series with threshold bands

**Description:** FID trend over selected time range

**Query:**

```promql
histogram_quantile(0.75, sum(rate(kitchenxpert_fid_milliseconds_bucket[5m])) by (le))
```

**Visualization:**

- Line graph with threshold bands
- Similar to LCP

[Dashboard: FID Trend - Historical FID values]

#### Panel 2.3: CLS Over Time

**Type:** Time series with threshold bands

**Description:** CLS trend over selected time range

**Query:**

```promql
histogram_quantile(0.75, sum(rate(kitchenxpert_cls_bucket[5m])) by (le))
```

[Dashboard: CLS Trend - Historical CLS values]

#### Panel 2.4: Web Vitals by Page

**Type:** Table

**Description:** Core Web Vitals breakdown by page/route

**Columns:** | Column | Description | |--------|-------------| | Page |
Route/URL path | | LCP (p75) | LCP value | | FID (p75) | FID value | | CLS (p75)
| CLS value | | Traffic | Page view count | | Status | Overall rating |

**Query:**

```promql
histogram_quantile(0.75, sum(rate(kitchenxpert_lcp_seconds_bucket[1h])) by (le, page))
```

[Dashboard: Web Vitals by Page Table - Per-page breakdown]

---

### Row 3: 3D Engine Performance

#### Panel 3.1: Average FPS

**Type:** Gauge with trend

**Description:** Current average frames per second in 3D editor

**Query:**

```promql
avg(kitchenxpert_3d_fps)
```

**Thresholds:** | FPS | Rating | Color | |-----|--------|-------| | 60+ |
Excellent | Green | | 30-60 | Good | Blue | | 15-30 | Poor | Yellow | | < 15 |
Critical | Red |

**Target:** > 30 FPS

[Dashboard: FPS Gauge - Current average frame rate]

#### Panel 3.2: FPS Distribution

**Type:** Histogram

**Description:** Distribution of FPS values across sessions

**Query:**

```promql
histogram_quantile(0.25, sum(rate(kitchenxpert_3d_fps_bucket[1h])) by (le))  # p25
histogram_quantile(0.50, sum(rate(kitchenxpert_3d_fps_bucket[1h])) by (le))  # p50
histogram_quantile(0.75, sum(rate(kitchenxpert_3d_fps_bucket[1h])) by (le))  # p75
histogram_quantile(0.95, sum(rate(kitchenxpert_3d_fps_bucket[1h])) by (le))  # p95
```

**Visualization:**

- Histogram showing FPS buckets
- Percentile markers

[Dashboard: FPS Distribution - Histogram of frame rates]

#### Panel 3.3: 3D Scene Load Time (p95)

**Type:** Stat with trend

**Description:** 95th percentile scene load time

**Query:**

```promql
histogram_quantile(0.95, sum(rate(kitchenxpert_3d_scene_load_seconds_bucket[5m])) by (le))
```

**Target:** < 5 seconds

[Dashboard: Scene Load Time - 3D scene initialization time]

#### Panel 3.4: 3D Memory Usage

**Type:** Time series

**Description:** Memory used by 3D engine over time

**Query:**

```promql
avg(kitchenxpert_3d_memory_mb)
```

**Visualization:**

- Area chart
- Warning threshold at 400MB
- Critical threshold at 500MB

[Dashboard: 3D Memory Usage - Memory consumption over time]

---

### Row 4: API Client Latency

#### Panel 4.1: p50 Latency by Endpoint

**Type:** Bar chart

**Description:** Median latency for top endpoints

**Query:**

```promql
topk(10, histogram_quantile(0.50, sum(rate(kitchenxpert_client_api_latency_seconds_bucket[5m])) by (le, endpoint)))
```

[Dashboard: p50 Latency by Endpoint - Median API response times]

#### Panel 4.2: p90 Latency by Endpoint

**Type:** Bar chart

**Description:** 90th percentile latency for top endpoints

**Query:**

```promql
topk(10, histogram_quantile(0.90, sum(rate(kitchenxpert_client_api_latency_seconds_bucket[5m])) by (le, endpoint)))
```

[Dashboard: p90 Latency by Endpoint - 90th percentile response times]

#### Panel 4.3: p99 Latency by Endpoint

**Type:** Bar chart

**Description:** 99th percentile latency for top endpoints

**Query:**

```promql
topk(10, histogram_quantile(0.99, sum(rate(kitchenxpert_client_api_latency_seconds_bucket[5m])) by (le, endpoint)))
```

[Dashboard: p99 Latency by Endpoint - 99th percentile response times]

#### Panel 4.4: Latency by Region

**Type:** Geographic map

**Description:** API latency visualized on world map

**Query:**

```promql
histogram_quantile(0.95, sum(rate(kitchenxpert_client_api_latency_seconds_bucket[5m])) by (le, region))
```

**Visualization:**

- World map
- Color intensity = latency
- Click region for details

**Regions:** | Region | Target p95 | |--------|------------| | US East | < 300ms
| | US West | < 400ms | | Europe | < 500ms | | Asia Pacific | < 700ms |

[Dashboard: Geographic Latency Map - Latency by user location]

---

### Row 5: User Satisfaction

#### Panel 5.1: Error Page Rate

**Type:** Stat with trend

**Description:** Percentage of page views showing errors

**Query:**

```promql
sum(rate(kitchenxpert_error_page_views_total[1h])) /
sum(rate(kitchenxpert_page_views_total[1h])) * 100
```

**Target:** < 1%

[Dashboard: Error Page Rate - Percentage of error pages]

#### Panel 5.2: Rage Clicks

**Type:** Time series

**Description:** Rage click events indicating user frustration

**Query:**

```promql
sum(increase(kitchenxpert_rage_clicks_total[1h]))
```

**Visualization:**

- Bar chart showing hourly rage clicks
- Drill-down to specific elements

[Dashboard: Rage Clicks - User frustration indicator]

#### Panel 5.3: Bounce Rate by Page

**Type:** Table

**Description:** Bounce rate for each landing page

**Columns:** | Column | Description | |--------|-------------| | Landing Page |
Entry page URL | | Sessions | Total sessions | | Bounces | Single-page sessions
| | Bounce Rate | Percentage | | Trend | Week-over-week change |

[Dashboard: Bounce Rate Table - Per-page bounce rates]

#### Panel 5.4: UX Score

**Type:** Gauge

**Description:** Composite user experience score (0-100)

**Query:**

```promql
# Composite score from multiple factors
(
  (1 - (avg(kitchenxpert_lcp_seconds) / 4)) * 25 +
  (1 - (avg(kitchenxpert_fid_milliseconds) / 300)) * 25 +
  (1 - (avg(kitchenxpert_cls) / 0.25)) * 25 +
  (1 - error_page_rate) * 25
)
```

**Thresholds:** | Score | Rating | |-------|--------| | 90-100 | Excellent | |
70-90 | Good | | 50-70 | Fair | | < 50 | Poor |

[Dashboard: UX Score Gauge - Overall user experience rating]

---

### Row 6: Device and Browser

#### Panel 6.1: Performance by Device Type

**Type:** Table

**Description:** Web Vitals breakdown by device category

**Columns:** | Device | LCP | FID | CLS | Sessions |
|--------|-----|-----|-----|----------| | Desktop | 2.1s | 45ms | 0.05 | 65% | |
Tablet | 2.8s | 80ms | 0.08 | 15% | | Mobile | 3.5s | 120ms | 0.12 | 20% |

[Dashboard: Performance by Device - Device type comparison]

#### Panel 6.2: Performance by Browser

**Type:** Bar chart

**Description:** LCP by browser type

**Query:**

```promql
avg(kitchenxpert_lcp_seconds) by (browser)
```

**Browsers:**

- Chrome
- Safari
- Firefox
- Edge
- Other

[Dashboard: Performance by Browser - Browser comparison]

---

## Performance Budgets and Alerts

### Budget Configuration

| Metric     | Budget | Alert Threshold    |
| ---------- | ------ | ------------------ |
| LCP (p75)  | 2.5s   | > 3.0s for 10 min  |
| FID (p75)  | 100ms  | > 150ms for 10 min |
| CLS (p75)  | 0.1    | > 0.15 for 10 min  |
| INP (p75)  | 200ms  | > 300ms for 10 min |
| 3D FPS     | 30     | < 25 for 5 min     |
| Scene Load | 5s     | > 7s for 5 min     |

### Active Alerts

**Alert Panel:** Shows currently firing performance alerts

```promql
# Alert rule example
ALERTS{alertname=~"LCP.*|FID.*|CLS.*|FPS.*"}
```

### Alert Configuration

```yaml
# Performance budget alerts
groups:
  - name: ux_performance_alerts
    rules:
      - alert: LCPBudgetExceeded
        expr: |
          histogram_quantile(0.75, sum(rate(kitchenxpert_lcp_seconds_bucket[5m])) by (le)) > 3.0
        for: 10m
        labels:
          severity: warning
          team: frontend
        annotations:
          summary: 'LCP budget exceeded'
          description:
            'p75 LCP is {{ $value | humanizeDuration }} (budget: 2.5s)'

      - alert: FPSBelowThreshold
        expr: |
          avg(kitchenxpert_3d_fps) < 25
        for: 5m
        labels:
          severity: warning
          team: frontend
        annotations:
          summary: '3D FPS below threshold'
          description: 'Average FPS is {{ $value }} (threshold: 30)'
```

---

## Historical Trends

### Weekly Comparison

**Panel:** Web Vitals Week-over-Week

Shows current week vs previous week for all Core Web Vitals

**Queries:**

```promql
# Current week LCP
avg_over_time(kitchenxpert_lcp_seconds[7d])

# Previous week LCP
avg_over_time(kitchenxpert_lcp_seconds[7d] offset 7d)
```

### Monthly Trends

**Panel:** Monthly Web Vitals Trend

Shows 30-day rolling average for trend analysis

**Use Cases:**

- Identify gradual degradation
- Track improvement initiatives
- Correlate with releases

### Release Impact Analysis

**Annotations:** Deployment markers on all charts

**Analysis Questions:**

1. Did LCP change after deployment?
2. Is FPS affected by new features?
3. Did new code cause layout shifts?

---

## Troubleshooting Guide

### Poor LCP Investigation

1. **Check by Page:** Which pages have worst LCP?
2. **Check Resources:** Are images/fonts blocking?
3. **Check Server:** Is TTFB high?
4. **Check Third-Party:** Ad/analytics impact?

**Actions:**

- Optimize hero images
- Preload critical resources
- Implement lazy loading
- Review server response time

### Poor FID Investigation

1. **Check JavaScript:** Large bundles?
2. **Check Third-Party:** Blocking scripts?
3. **Check Device:** Mobile vs desktop difference?

**Actions:**

- Code split large bundles
- Defer non-critical JavaScript
- Use Web Workers for heavy computation

### High CLS Investigation

1. **Check Images:** Missing dimensions?
2. **Check Fonts:** Flash of unstyled text?
3. **Check Ads:** Dynamic content insertion?

**Actions:**

- Add width/height to images
- Use font-display: swap
- Reserve space for dynamic content

### Poor 3D Performance

1. **Check Scene Complexity:** Object count?
2. **Check Textures:** Resolution/count?
3. **Check Device:** GPU capabilities?

**Actions:**

- Implement LOD (Level of Detail)
- Compress textures
- Reduce polygon count
- Add performance mode option

---

## Related Documentation

- [Monitoring Overview](../overview.md)
- [User Experience Metrics](../metrics/user-experience-metrics.md)
- [System Dashboard](./system-dashboard.md)
- [Frontend Performance Guide](/docs/frontend/performance.md)
- [3D Engine Optimization](/docs/frontend/3d-optimization.md)

---

_For questions about the UX dashboard, contact the Frontend Engineering team at
frontend@kitchenxpert.com_
