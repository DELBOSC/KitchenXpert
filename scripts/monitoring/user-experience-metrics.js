#!/usr/bin/env node
/**
 * User Experience Metrics - KitchenXpert
 *
 * Collects and analyzes user experience metrics.
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(level, message) {
  const prefix = {
    INFO: `${colors.blue}[UX-METRICS]${colors.reset}`,
    SUCCESS: `${colors.green}[UX-METRICS]${colors.reset}`,
    WARNING: `${colors.yellow}[UX-METRICS]${colors.reset}`,
    ERROR: `${colors.red}[UX-METRICS]${colors.reset}`,
  };
  console.log(`${prefix[level] || prefix.INFO} ${message}`);
}

// Configuration
const config = {
  outputDir: process.env.OUTPUT_DIR || path.join(__dirname, '../../reports/ux'),
  dataFile: process.env.DATA_FILE || null,
};

// UX metrics thresholds (based on Web Vitals)
const thresholds = {
  // Core Web Vitals
  LCP: { good: 2500, needsImprovement: 4000 }, // Largest Contentful Paint
  FID: { good: 100, needsImprovement: 300 }, // First Input Delay
  CLS: { good: 0.1, needsImprovement: 0.25 }, // Cumulative Layout Shift

  // Additional metrics
  FCP: { good: 1800, needsImprovement: 3000 }, // First Contentful Paint
  TTFB: { good: 800, needsImprovement: 1800 }, // Time to First Byte
  TTI: { good: 3800, needsImprovement: 7300 }, // Time to Interactive

  // Custom metrics
  pageLoadTime: { good: 3000, needsImprovement: 5000 },
  interactionLatency: { good: 100, needsImprovement: 300 },
};

// Simulated UX metrics (in production, collect from RUM)
function collectMetrics() {
  log('INFO', 'Collecting UX metrics...');

  return {
    coreWebVitals: {
      LCP: { p50: 2100, p75: 2800, p95: 4200 },
      FID: { p50: 45, p75: 85, p95: 180 },
      CLS: { p50: 0.05, p75: 0.12, p95: 0.28 },
    },
    additionalMetrics: {
      FCP: { p50: 1500, p75: 2200, p95: 3500 },
      TTFB: { p50: 450, p75: 750, p95: 1200 },
      TTI: { p50: 3200, p75: 4500, p95: 6800 },
    },
    pageMetrics: {
      '/': { loadTime: 2100, bounceRate: 25, avgTimeOnPage: 45 },
      '/products': { loadTime: 2800, bounceRate: 35, avgTimeOnPage: 120 },
      '/kitchen-designer': { loadTime: 4500, bounceRate: 15, avgTimeOnPage: 480 },
      '/checkout': { loadTime: 2200, bounceRate: 40, avgTimeOnPage: 180 },
    },
    userFlow: {
      conversionRate: 3.2,
      cartAbandonmentRate: 65,
      avgSessionDuration: 420,
      pagesPerSession: 4.5,
    },
    deviceBreakdown: {
      desktop: { share: 55, satisfaction: 4.2 },
      mobile: { share: 38, satisfaction: 3.8 },
      tablet: { share: 7, satisfaction: 4.0 },
    },
    errors: {
      jsErrorRate: 0.5,
      networkErrorRate: 0.2,
      renderErrorRate: 0.1,
    },
  };
}

// Evaluate metric against thresholds
function evaluateMetric(value, metricName) {
  const threshold = thresholds[metricName];
  if (!threshold) return 'unknown';

  if (value <= threshold.good) return 'good';
  if (value <= threshold.needsImprovement) return 'needs-improvement';
  return 'poor';
}

// Calculate overall UX score
function calculateUXScore(metrics) {
  const scores = [];

  // Core Web Vitals (weighted heavily)
  const lcpScore = evaluateMetric(metrics.coreWebVitals.LCP.p75, 'LCP');
  const fidScore = evaluateMetric(metrics.coreWebVitals.FID.p75, 'FID');
  const clsScore = evaluateMetric(metrics.coreWebVitals.CLS.p75, 'CLS');

  const scoreMap = { good: 100, 'needs-improvement': 60, poor: 20, unknown: 50 };

  scores.push(scoreMap[lcpScore] * 0.35);
  scores.push(scoreMap[fidScore] * 0.35);
  scores.push(scoreMap[clsScore] * 0.3);

  const overallScore = Math.round(scores.reduce((a, b) => a + b, 0));

  return {
    overall: overallScore,
    grade:
      overallScore >= 90
        ? 'A'
        : overallScore >= 80
          ? 'B'
          : overallScore >= 70
            ? 'C'
            : overallScore >= 60
              ? 'D'
              : 'F',
    breakdown: {
      LCP: lcpScore,
      FID: fidScore,
      CLS: clsScore,
    },
  };
}

// Generate markdown report
function generateMarkdownReport(metrics, uxScore) {
  const timestamp = new Date().toISOString();

  let report = `# User Experience Metrics Report

**Generated:** ${timestamp}
**UX Score:** ${uxScore.overall}/100 (Grade: ${uxScore.grade})

---

## Core Web Vitals

| Metric | P50 | P75 | P95 | Target | Status |
|--------|-----|-----|-----|--------|--------|
| LCP (Largest Contentful Paint) | ${metrics.coreWebVitals.LCP.p50}ms | ${metrics.coreWebVitals.LCP.p75}ms | ${metrics.coreWebVitals.LCP.p95}ms | ≤${thresholds.LCP.good}ms | ${uxScore.breakdown.LCP === 'good' ? '✅' : uxScore.breakdown.LCP === 'needs-improvement' ? '⚠️' : '❌'} |
| FID (First Input Delay) | ${metrics.coreWebVitals.FID.p50}ms | ${metrics.coreWebVitals.FID.p75}ms | ${metrics.coreWebVitals.FID.p95}ms | ≤${thresholds.FID.good}ms | ${uxScore.breakdown.FID === 'good' ? '✅' : uxScore.breakdown.FID === 'needs-improvement' ? '⚠️' : '❌'} |
| CLS (Cumulative Layout Shift) | ${metrics.coreWebVitals.CLS.p50} | ${metrics.coreWebVitals.CLS.p75} | ${metrics.coreWebVitals.CLS.p95} | ≤${thresholds.CLS.good} | ${uxScore.breakdown.CLS === 'good' ? '✅' : uxScore.breakdown.CLS === 'needs-improvement' ? '⚠️' : '❌'} |

---

## Additional Performance Metrics

| Metric | P50 | P75 | P95 |
|--------|-----|-----|-----|
| FCP (First Contentful Paint) | ${metrics.additionalMetrics.FCP.p50}ms | ${metrics.additionalMetrics.FCP.p75}ms | ${metrics.additionalMetrics.FCP.p95}ms |
| TTFB (Time to First Byte) | ${metrics.additionalMetrics.TTFB.p50}ms | ${metrics.additionalMetrics.TTFB.p75}ms | ${metrics.additionalMetrics.TTFB.p95}ms |
| TTI (Time to Interactive) | ${metrics.additionalMetrics.TTI.p50}ms | ${metrics.additionalMetrics.TTI.p75}ms | ${metrics.additionalMetrics.TTI.p95}ms |

---

## Page Performance

| Page | Load Time | Bounce Rate | Avg Time on Page |
|------|-----------|-------------|------------------|
`;

  for (const [page, data] of Object.entries(metrics.pageMetrics)) {
    report += `| ${page} | ${data.loadTime}ms | ${data.bounceRate}% | ${data.avgTimeOnPage}s |\n`;
  }

  report += `
---

## User Flow Metrics

| Metric | Value |
|--------|-------|
| Conversion Rate | ${metrics.userFlow.conversionRate}% |
| Cart Abandonment Rate | ${metrics.userFlow.cartAbandonmentRate}% |
| Avg Session Duration | ${Math.floor(metrics.userFlow.avgSessionDuration / 60)}m ${metrics.userFlow.avgSessionDuration % 60}s |
| Pages per Session | ${metrics.userFlow.pagesPerSession} |

---

## Device Breakdown

| Device | Traffic Share | User Satisfaction |
|--------|---------------|-------------------|
| Desktop | ${metrics.deviceBreakdown.desktop.share}% | ${metrics.deviceBreakdown.desktop.satisfaction}/5 |
| Mobile | ${metrics.deviceBreakdown.mobile.share}% | ${metrics.deviceBreakdown.mobile.satisfaction}/5 |
| Tablet | ${metrics.deviceBreakdown.tablet.share}% | ${metrics.deviceBreakdown.tablet.satisfaction}/5 |

---

## Error Rates

| Error Type | Rate |
|------------|------|
| JavaScript Errors | ${metrics.errors.jsErrorRate}% |
| Network Errors | ${metrics.errors.networkErrorRate}% |
| Render Errors | ${metrics.errors.renderErrorRate}% |

---

## Recommendations

`;

  if (uxScore.breakdown.LCP !== 'good') {
    report += `1. **Improve LCP** - Optimize images, implement lazy loading, reduce server response time\n`;
  }

  if (uxScore.breakdown.FID !== 'good') {
    report += `2. **Improve FID** - Reduce JavaScript execution time, break up long tasks\n`;
  }

  if (uxScore.breakdown.CLS !== 'good') {
    report += `3. **Improve CLS** - Reserve space for images/ads, avoid inserting content above existing content\n`;
  }

  if (metrics.deviceBreakdown.mobile.satisfaction < 4) {
    report += `4. **Improve mobile experience** - Mobile users report lower satisfaction\n`;
  }

  if (metrics.userFlow.cartAbandonmentRate > 60) {
    report += `5. **Reduce cart abandonment** - Simplify checkout, add guest checkout option\n`;
  }

  report += `
---
*Generated by KitchenXpert UX Metrics*
`;

  return report;
}

// Generate JSON report
function generateJsonReport(metrics, uxScore) {
  return JSON.stringify(
    {
      meta: {
        generated: new Date().toISOString(),
        thresholds,
      },
      score: uxScore,
      metrics,
    },
    null,
    2
  );
}

async function main() {
  console.log('');
  console.log(
    `${colors.blue}╔════════════════════════════════════════════════════════════╗${colors.reset}`
  );
  console.log(
    `${colors.blue}║${colors.reset}      KitchenXpert - User Experience Metrics                ${colors.blue}║${colors.reset}`
  );
  console.log(
    `${colors.blue}╚════════════════════════════════════════════════════════════╝${colors.reset}`
  );
  console.log('');

  // Collect metrics
  const metrics = collectMetrics();

  // Calculate UX score
  const uxScore = calculateUXScore(metrics);

  log('INFO', `UX Score: ${uxScore.overall}/100 (Grade: ${uxScore.grade})`);

  // Ensure output directory exists
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  // Generate reports
  const mdReport = generateMarkdownReport(metrics, uxScore);
  const mdPath = path.join(config.outputDir, `ux-metrics-${timestamp}.md`);
  fs.writeFileSync(mdPath, mdReport);
  log('SUCCESS', `Markdown report: ${mdPath}`);

  const jsonReport = generateJsonReport(metrics, uxScore);
  const jsonPath = path.join(config.outputDir, `ux-metrics-${timestamp}.json`);
  fs.writeFileSync(jsonPath, jsonReport);
  log('SUCCESS', `JSON report: ${jsonPath}`);

  console.log('');
  const gradeColor =
    uxScore.grade === 'A'
      ? colors.green
      : uxScore.grade === 'B'
        ? colors.green
        : uxScore.grade === 'C'
          ? colors.yellow
          : colors.red;
  console.log(
    `${gradeColor}╔════════════════════════════════════════════════════════════╗${colors.reset}`
  );
  console.log(
    `${gradeColor}║${colors.reset}        UX Metrics Analysis Complete                        ${gradeColor}║${colors.reset}`
  );
  console.log(
    `${gradeColor}╚════════════════════════════════════════════════════════════╝${colors.reset}`
  );
  console.log('');
  console.log(`  UX Score: ${uxScore.overall}/100`);
  console.log(`  Grade:    ${uxScore.grade}`);
  console.log('');
  console.log('  Core Web Vitals:');
  console.log(
    `    LCP: ${uxScore.breakdown.LCP === 'good' ? '✅' : '⚠️'} ${uxScore.breakdown.LCP}`
  );
  console.log(
    `    FID: ${uxScore.breakdown.FID === 'good' ? '✅' : '⚠️'} ${uxScore.breakdown.FID}`
  );
  console.log(
    `    CLS: ${uxScore.breakdown.CLS === 'good' ? '✅' : '⚠️'} ${uxScore.breakdown.CLS}`
  );
  console.log('');
  console.log(`  Reports: ${config.outputDir}`);
  console.log('');
}

// Parse command line arguments
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--output':
    case '-o':
      config.outputDir = args[++i];
      break;
    case '--data':
    case '-d':
      config.dataFile = args[++i];
      break;
    case '--help':
      console.log('Usage: user-experience-metrics.js [options]');
      console.log('');
      console.log('Options:');
      console.log('  -o, --output <dir>  Output directory');
      console.log('  -d, --data <file>   Input data file (JSON)');
      console.log('  --help              Show this help message');
      process.exit(0);
  }
}

main().catch((error) => {
  log('ERROR', `Failed: ${error.message}`);
  process.exit(1);
});
