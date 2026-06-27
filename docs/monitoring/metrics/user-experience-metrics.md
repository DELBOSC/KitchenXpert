# User Experience Metrics Documentation

> Comprehensive guide to frontend performance, 3D engine metrics, and user
> satisfaction tracking for KitchenXpert.

**Last Updated:** 2026-01-10 **Owner:** Frontend Engineering Team **Version:**
1.0

---

## Table of Contents

1. [Frontend Performance (Core Web Vitals)](#frontend-performance-core-web-vitals)
2. [3D Engine Metrics](#3d-engine-metrics)
3. [API Latency from Client Perspective](#api-latency-from-client-perspective)
4. [User Satisfaction Metrics](#user-satisfaction-metrics)
5. [Real User Monitoring (RUM) Setup](#real-user-monitoring-rum-setup)
6. [Performance Budgets](#performance-budgets)
7. [Related Documentation](#related-documentation)

---

## Frontend Performance (Core Web Vitals)

### Overview

Core Web Vitals are Google's metrics for measuring real-world user experience.
These metrics directly impact SEO rankings and user satisfaction.

### LCP (Largest Contentful Paint)

**Definition:** Time until the largest content element is rendered

**Target:** < 2.5 seconds

#### Measurement

```javascript
// Web Vitals API
import { getLCP } from 'web-vitals';

getLCP((metric) => {
  sendToAnalytics({
    name: 'LCP',
    value: metric.value,
    id: metric.id,
  });
});
```

#### PromQL Query

```promql
# LCP distribution
histogram_quantile(0.75, sum(rate(kitchenxpert_lcp_seconds_bucket[5m])) by (le, page))

# LCP by page
avg(kitchenxpert_lcp_seconds) by (page)
```

#### LCP Thresholds

| Rating            | Value       | Color  |
| ----------------- | ----------- | ------ |
| Good              | < 2.5s      | Green  |
| Needs Improvement | 2.5s - 4.0s | Orange |
| Poor              | > 4.0s      | Red    |

#### LCP Optimization Targets

| Page            | Current | Target |
| --------------- | ------- | ------ |
| Home            | 1.8s    | < 2.0s |
| Design Editor   | 3.2s    | < 2.5s |
| Product Catalog | 2.1s    | < 2.0s |
| User Dashboard  | 1.5s    | < 1.5s |

#### Common LCP Issues

| Issue                 | Impact        | Solution                 |
| --------------------- | ------------- | ------------------------ |
| Large hero images     | Delayed paint | Image optimization, WebP |
| Render-blocking CSS   | Delayed paint | Critical CSS extraction  |
| Slow server response  | Delayed TTFB  | CDN, caching             |
| Client-side rendering | Late content  | SSR, pre-rendering       |

---

### FID (First Input Delay)

**Definition:** Time from first user interaction to browser response

**Target:** < 100 milliseconds

#### Measurement

```javascript
import { getFID } from 'web-vitals';

getFID((metric) => {
  sendToAnalytics({
    name: 'FID',
    value: metric.value,
    id: metric.id,
  });
});
```

#### PromQL Query

```promql
# FID p75
histogram_quantile(0.75, sum(rate(kitchenxpert_fid_milliseconds_bucket[5m])) by (le))

# FID distribution
histogram_quantile(0.50, sum(rate(kitchenxpert_fid_milliseconds_bucket[5m])) by (le))
histogram_quantile(0.95, sum(rate(kitchenxpert_fid_milliseconds_bucket[5m])) by (le))
histogram_quantile(0.99, sum(rate(kitchenxpert_fid_milliseconds_bucket[5m])) by (le))
```

#### FID Thresholds

| Rating            | Value         | Color  |
| ----------------- | ------------- | ------ |
| Good              | < 100ms       | Green  |
| Needs Improvement | 100ms - 300ms | Orange |
| Poor              | > 300ms       | Red    |

#### Common FID Issues

| Issue                     | Impact              | Solution       |
| ------------------------- | ------------------- | -------------- |
| Long JavaScript tasks     | Blocked main thread | Code splitting |
| Heavy third-party scripts | Delayed interaction | Defer loading  |
| Large bundle size         | Long parse time     | Tree shaking   |
| Synchronous operations    | Thread blocking     | Web Workers    |

---

### CLS (Cumulative Layout Shift)

**Definition:** Sum of all unexpected layout shifts during page load

**Target:** < 0.1

#### Measurement

```javascript
import { getCLS } from 'web-vitals';

getCLS((metric) => {
  sendToAnalytics({
    name: 'CLS',
    value: metric.value,
    id: metric.id,
  });
});
```

#### PromQL Query

```promql
# CLS p75
histogram_quantile(0.75, sum(rate(kitchenxpert_cls_bucket[5m])) by (le, page))

# Pages with poor CLS
kitchenxpert_cls > 0.25
```

#### CLS Thresholds

| Rating            | Value      | Color  |
| ----------------- | ---------- | ------ |
| Good              | < 0.1      | Green  |
| Needs Improvement | 0.1 - 0.25 | Orange |
| Poor              | > 0.25     | Red    |

#### Common CLS Issues

| Issue                     | Impact              | Solution           |
| ------------------------- | ------------------- | ------------------ |
| Images without dimensions | Layout shift        | Set width/height   |
| Dynamic content injection | Content pushed down | Reserve space      |
| Web fonts (FOIT/FOUT)     | Text shift          | font-display: swap |
| Ads/embeds loading        | Large shifts        | Reserve containers |

---

### INP (Interaction to Next Paint)

**Definition:** Latency of all user interactions throughout page lifecycle

**Target:** < 200 milliseconds

#### Measurement

```javascript
import { getINP } from 'web-vitals';

getINP((metric) => {
  sendToAnalytics({
    name: 'INP',
    value: metric.value,
    id: metric.id,
  });
});
```

#### PromQL Query

```promql
# INP p75
histogram_quantile(0.75, sum(rate(kitchenxpert_inp_milliseconds_bucket[5m])) by (le))
```

---

## 3D Engine Metrics

### Frame Rate (FPS)

**Target:** 30+ FPS for smooth interaction

#### FPS Measurement

```javascript
// Three.js / 3D engine FPS tracking
let frameCount = 0;
let lastTime = performance.now();

function measureFPS() {
  frameCount++;
  const currentTime = performance.now();

  if (currentTime - lastTime >= 1000) {
    const fps = frameCount;
    frameCount = 0;
    lastTime = currentTime;

    sendToAnalytics({
      name: '3d_fps',
      value: fps,
      scene: currentSceneId,
    });
  }

  requestAnimationFrame(measureFPS);
}
```

#### PromQL Query

```promql
# Average FPS
avg(kitchenxpert_3d_fps)

# FPS distribution
histogram_quantile(0.25, sum(rate(kitchenxpert_3d_fps_bucket[5m])) by (le))  # p25 (worst)
histogram_quantile(0.50, sum(rate(kitchenxpert_3d_fps_bucket[5m])) by (le))  # p50
histogram_quantile(0.75, sum(rate(kitchenxpert_3d_fps_bucket[5m])) by (le))  # p75
```

#### FPS Thresholds

| Rating    | FPS   | User Experience    |
| --------- | ----- | ------------------ |
| Excellent | 60+   | Smooth, responsive |
| Good      | 30-60 | Acceptable         |
| Poor      | 15-30 | Noticeable lag     |
| Critical  | < 15  | Unusable           |

#### FPS by Device Type

```promql
# FPS by device category
avg(kitchenxpert_3d_fps) by (device_type)
# device_type: desktop, tablet, mobile
```

---

### Load Time for 3D Scenes

**Target:** < 5 seconds for initial scene load

#### Scene Load Metrics

| Metric            | Description                  | Target |
| ----------------- | ---------------------------- | ------ |
| Scene Init Time   | Time to initialize 3D engine | < 1s   |
| Model Load Time   | Time to load 3D models       | < 3s   |
| Texture Load Time | Time to load textures        | < 2s   |
| Total Ready Time  | Time until fully interactive | < 5s   |

#### PromQL Queries

```promql
# Scene load time p95
histogram_quantile(0.95, sum(rate(kitchenxpert_3d_scene_load_seconds_bucket[5m])) by (le))

# Load time breakdown
avg(kitchenxpert_3d_init_seconds)
avg(kitchenxpert_3d_model_load_seconds)
avg(kitchenxpert_3d_texture_load_seconds)
```

#### Load Time by Scene Complexity

```promql
# Load time by number of objects
avg(kitchenxpert_3d_scene_load_seconds) by (complexity_tier)
# complexity_tier: simple (<50 objects), medium (50-200), complex (>200)
```

---

### Texture Loading Time

**Target:** < 2 seconds for texture loading

#### Texture Metrics

```promql
# Texture load time
histogram_quantile(0.95, sum(rate(kitchenxpert_texture_load_seconds_bucket[5m])) by (le))

# Texture cache hit rate
sum(rate(kitchenxpert_texture_cache_hits_total[5m])) /
sum(rate(kitchenxpert_texture_requests_total[5m])) * 100
```

#### Optimization Targets

| Metric                   | Target |
| ------------------------ | ------ |
| Texture load time (p95)  | < 2s   |
| Texture cache hit rate   | > 80%  |
| Compressed texture ratio | > 95%  |

---

### 3D Performance Dashboard Metrics

| Panel           | Query                           | Target  |
| --------------- | ------------------------------- | ------- |
| Average FPS     | `avg(kitchenxpert_3d_fps)`      | > 30    |
| Scene Load Time | `histogram_quantile(0.95, ...)` | < 5s    |
| Memory Usage    | `kitchenxpert_3d_memory_mb`     | < 500MB |
| Draw Calls      | `kitchenxpert_3d_draw_calls`    | < 200   |
| Triangle Count  | `kitchenxpert_3d_triangles`     | < 500K  |

---

## API Latency from Client Perspective

### Client-Side Latency Measurement

**Definition:** Total time from client request initiation to response received

This includes:

- DNS lookup
- TCP connection
- TLS handshake
- Request/response time
- Network latency

#### Measurement

```javascript
// Performance API timing
const timing = performance
  .getEntriesByType('resource')
  .filter((entry) => entry.name.includes('/api/'));

timing.forEach((entry) => {
  sendToAnalytics({
    endpoint: entry.name,
    dns: entry.domainLookupEnd - entry.domainLookupStart,
    tcp: entry.connectEnd - entry.connectStart,
    request: entry.responseStart - entry.requestStart,
    response: entry.responseEnd - entry.responseStart,
    total: entry.responseEnd - entry.startTime,
  });
});
```

### Response Time Percentiles

#### PromQL Queries

```promql
# Client-side latency p50
histogram_quantile(0.50, sum(rate(kitchenxpert_client_api_latency_seconds_bucket[5m])) by (le, endpoint))

# Client-side latency p90
histogram_quantile(0.90, sum(rate(kitchenxpert_client_api_latency_seconds_bucket[5m])) by (le, endpoint))

# Client-side latency p99
histogram_quantile(0.99, sum(rate(kitchenxpert_client_api_latency_seconds_bucket[5m])) by (le, endpoint))
```

#### Latency Targets by Endpoint Type

| Endpoint Type   | p50 Target | p90 Target | p99 Target |
| --------------- | ---------- | ---------- | ---------- |
| Auth endpoints  | < 100ms    | < 300ms    | < 500ms    |
| List/search     | < 200ms    | < 500ms    | < 1000ms   |
| Single resource | < 100ms    | < 300ms    | < 500ms    |
| Create/update   | < 200ms    | < 500ms    | < 1000ms   |
| File upload     | < 2s       | < 5s       | < 10s      |
| AI operations   | < 5s       | < 10s      | < 15s      |

### Latency by Geographic Region

```promql
# Latency by region
histogram_quantile(0.95, sum(rate(kitchenxpert_client_api_latency_seconds_bucket[5m])) by (le, region))
```

| Region       | Target p95 |
| ------------ | ---------- |
| US East      | < 300ms    |
| US West      | < 400ms    |
| Europe       | < 500ms    |
| Asia Pacific | < 700ms    |

---

## User Satisfaction Metrics

### Error Page Views

**Definition:** Pages that show error states to users

```promql
# Error page views per hour
sum(increase(kitchenxpert_error_page_views_total[1h])) by (error_type)
```

#### Error Types

| Error Type    | Description       | Target               |
| ------------- | ----------------- | -------------------- |
| 404           | Page not found    | < 1% of page views   |
| 500           | Server error      | < 0.1% of page views |
| network_error | Connection failed | < 0.5% of sessions   |
| timeout       | Request timeout   | < 0.2% of requests   |

### Rage Clicks

**Definition:** Multiple rapid clicks on the same element (indicates
frustration)

```promql
# Rage clicks per hour
sum(increase(kitchenxpert_rage_clicks_total[1h]))

# Rage clicks by element
sum(increase(kitchenxpert_rage_clicks_total[1h])) by (element_selector, page)
```

#### Rage Click Detection

```javascript
// Rage click detection
let clickCount = 0;
let lastClickTime = 0;
let lastClickTarget = null;

document.addEventListener('click', (event) => {
  const currentTime = Date.now();
  const target = event.target;

  if (target === lastClickTarget && currentTime - lastClickTime < 500) {
    clickCount++;
    if (clickCount >= 3) {
      sendToAnalytics({
        name: 'rage_click',
        element: target.tagName,
        selector: getSelector(target),
        page: window.location.pathname,
      });
    }
  } else {
    clickCount = 1;
  }

  lastClickTime = currentTime;
  lastClickTarget = target;
});
```

#### Rage Click Targets

| High Priority        | Action Required                |
| -------------------- | ------------------------------ |
| Submit buttons       | Check form validation feedback |
| Navigation links     | Check routing/loading states   |
| Interactive elements | Check responsiveness           |
| Modal close buttons  | Check modal behavior           |

**Target:** < 0.5% of sessions have rage clicks

### Bounce Rate

**Definition:** Users who leave after viewing only one page

```promql
# Bounce rate
sum(kitchenxpert_single_page_sessions) / sum(kitchenxpert_total_sessions) * 100

# Bounce rate by landing page
sum(kitchenxpert_single_page_sessions) by (landing_page) /
sum(kitchenxpert_total_sessions) by (landing_page) * 100
```

#### Bounce Rate Targets

| Page Type     | Target |
| ------------- | ------ |
| Home page     | < 40%  |
| Product pages | < 50%  |
| Design editor | < 20%  |
| Blog/content  | < 60%  |

### User Satisfaction Score

```promql
# Composite UX score (0-100)
(
  (1 - (avg(kitchenxpert_lcp_seconds) / 4)) * 25 +      # LCP contribution
  (1 - (avg(kitchenxpert_fid_milliseconds) / 300)) * 25 + # FID contribution
  (1 - (avg(kitchenxpert_cls) / 0.25)) * 25 +           # CLS contribution
  (1 - sum(rate(kitchenxpert_error_page_views_total[1h])) / sum(rate(kitchenxpert_page_views_total[1h]))) * 25  # Error contribution
)
```

---

## Real User Monitoring (RUM) Setup

### RUM Architecture

```
+----------------+     +----------------+     +----------------+
|                |     |                |     |                |
|  User Browser  |---->|  RUM Endpoint  |---->|  Analytics     |
|  (RUM Agent)   |     |  (Collector)   |     |  (Storage)     |
|                |     |                |     |                |
+----------------+     +----------------+     +----------------+
                                                      |
                                                      v
                                              +----------------+
                                              |                |
                                              |   Grafana      |
                                              |  (Dashboards)  |
                                              |                |
                                              +----------------+
```

### RUM Agent Configuration

```javascript
// RUM initialization
import { init as initRUM } from '@kitchenxpert/rum-agent';

initRUM({
  applicationId: 'kitchenxpert-frontend',
  clientToken: 'rum_client_token_xxx',
  site: 'kitchenxpert.internal',
  service: 'frontend',
  env: process.env.NODE_ENV,
  version: process.env.APP_VERSION,

  // Sampling
  sessionSampleRate: 100, // 100% of sessions
  sessionReplaySampleRate: 10, // 10% session replay

  // Features
  trackInteractions: true,
  trackResources: true,
  trackLongTasks: true,
  trackFrustrations: true,

  // Privacy
  defaultPrivacyLevel: 'mask-user-input',

  // Performance
  silentMultipleInit: true,
  allowedTracingOrigins: [
    'https://api.kitchenxpert.com',
    'https://kitchenxpert.com',
  ],
});
```

### RUM Data Collection

#### Automatic Collection

| Data Type    | Description                |
| ------------ | -------------------------- |
| Page Views   | URL, referrer, load time   |
| User Actions | Clicks, form submissions   |
| Resources    | JS, CSS, images, API calls |
| Long Tasks   | Tasks > 50ms               |
| Errors       | JS errors, network errors  |
| Web Vitals   | LCP, FID, CLS, INP         |

#### Custom Events

```javascript
// Custom event tracking
rum.addAction('design_saved', {
  design_id: designId,
  object_count: objectCount,
  duration_seconds: duration,
});

// Custom timing
rum.addTiming('3d_scene_load', loadTime);

// Custom error
rum.addError(new Error('3D rendering failed'), {
  scene_id: sceneId,
  device_info: deviceInfo,
});
```

### RUM Dashboard Panels

| Panel                 | Description                      |
| --------------------- | -------------------------------- |
| Session Count         | Active sessions over time        |
| Page Load Performance | LCP, FCP by page                 |
| User Actions          | Click heatmap, interaction count |
| Errors                | Error count, error distribution  |
| Geographic Map        | Performance by region            |
| Device Breakdown      | Performance by device type       |

---

## Performance Budgets

### Budget Configuration

```javascript
// performance-budget.json
{
  "budgets": [
    {
      "resourceType": "document",
      "budget": 50
    },
    {
      "resourceType": "script",
      "budget": 300
    },
    {
      "resourceType": "stylesheet",
      "budget": 50
    },
    {
      "resourceType": "image",
      "budget": 500
    },
    {
      "resourceType": "total",
      "budget": 1000
    },
    {
      "metric": "largest-contentful-paint",
      "budget": 2500
    },
    {
      "metric": "first-input-delay",
      "budget": 100
    },
    {
      "metric": "cumulative-layout-shift",
      "budget": 0.1
    }
  ]
}
```

### Budget Alerts

```yaml
groups:
  - name: performance_budgets
    rules:
      - alert: LCPBudgetExceeded
        expr:
          histogram_quantile(0.75,
          sum(rate(kitchenxpert_lcp_seconds_bucket[5m])) by (le)) > 2.5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: 'LCP budget exceeded'
          description: 'p75 LCP is {{ $value }}s (budget: 2.5s)'

      - alert: FIDBudgetExceeded
        expr:
          histogram_quantile(0.75,
          sum(rate(kitchenxpert_fid_milliseconds_bucket[5m])) by (le)) > 100
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: 'FID budget exceeded'
          description: 'p75 FID is {{ $value }}ms (budget: 100ms)'

      - alert: CLSBudgetExceeded
        expr:
          histogram_quantile(0.75, sum(rate(kitchenxpert_cls_bucket[5m])) by
          (le)) > 0.1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: 'CLS budget exceeded'
          description: 'p75 CLS is {{ $value }} (budget: 0.1)'

      - alert: 3DFPSBudgetExceeded
        expr: avg(kitchenxpert_3d_fps) < 30
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: '3D FPS below budget'
          description: 'Average FPS is {{ $value }} (budget: 30)'
```

### CI/CD Performance Gates

```yaml
# GitHub Actions performance check
- name: Run Lighthouse CI
  run: |
    npx lhci autorun
  env:
    LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}

# lighthouse-ci.json
{
  "ci": {
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "first-input-delay": ["error", { "maxNumericValue": 100 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }]
      }
    }
  }
}
```

---

## Grafana Dashboard

### Dashboard URL

**URL:** https://grafana.kitchenxpert.internal/d/ux

[Dashboard: User Experience Metrics - Core Web Vitals, 3D performance,
satisfaction]

### Dashboard Layout

#### Row 1: Core Web Vitals

1. **LCP Gauge:** Current p75 LCP with thresholds
2. **FID Gauge:** Current p75 FID with thresholds
3. **CLS Gauge:** Current p75 CLS with thresholds
4. **INP Gauge:** Current p75 INP with thresholds

#### Row 2: Core Web Vitals Trends

5. **LCP Over Time:** Line graph with threshold bands
6. **FID Over Time:** Line graph with threshold bands
7. **CLS Over Time:** Line graph with threshold bands
8. **Web Vitals by Page:** Table view

#### Row 3: 3D Performance

9. **Average FPS:** Current FPS gauge
10. **FPS Distribution:** Histogram
11. **Scene Load Time:** p95 load time
12. **3D Memory Usage:** Memory consumption

#### Row 4: API Client Latency

13. **p50 Latency:** By endpoint
14. **p90 Latency:** By endpoint
15. **p99 Latency:** By endpoint
16. **Latency by Region:** Geographic map

#### Row 5: User Satisfaction

17. **Error Page Rate:** Percentage with errors
18. **Rage Clicks:** Hourly count
19. **Bounce Rate:** By landing page
20. **UX Score:** Composite score gauge

---

## Related Documentation

- [Monitoring Overview](../overview.md)
- [System Metrics](./system-metrics.md)
- [Business Metrics](./business-metrics.md)
- [User Experience Dashboard](../dashboards/user-experience-dashboard.md)
- [Frontend Performance Guide](/docs/frontend/performance.md)

---

_For questions about user experience metrics, contact the Frontend Engineering
team at frontend@kitchenxpert.com_
