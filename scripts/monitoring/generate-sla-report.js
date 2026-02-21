#!/usr/bin/env node
/**
 * Generate SLA Report - KitchenXpert
 *
 * Generates Service Level Agreement compliance reports.
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
    INFO: `${colors.blue}[SLA]${colors.reset}`,
    SUCCESS: `${colors.green}[SLA]${colors.reset}`,
    WARNING: `${colors.yellow}[SLA]${colors.reset}`,
    ERROR: `${colors.red}[SLA]${colors.reset}`,
  };
  console.log(`${prefix[level] || prefix.INFO} ${message}`);
}

// Configuration
const config = {
  outputDir: process.env.OUTPUT_DIR || path.join(__dirname, '../../reports/sla'),
  period: process.env.PERIOD || 'monthly',
  prometheusUrl: process.env.PROMETHEUS_URL || 'http://localhost:9090',
};

// SLA targets
const slaTargets = {
  availability: 99.9, // 99.9% uptime
  responseTime: {
    p50: 100, // 100ms
    p95: 500, // 500ms
    p99: 1000, // 1000ms
  },
  errorRate: 0.1, // 0.1% error rate
  throughput: 100, // 100 req/s minimum
};

// Simulated metrics (in production, fetch from Prometheus)
function fetchMetrics() {
  log('INFO', 'Fetching metrics...');

  // Simulated metrics for demonstration
  return {
    availability: {
      value: 99.95,
      uptimeMinutes: 43170,
      downtimeMinutes: 22,
    },
    responseTime: {
      p50: 85,
      p95: 420,
      p99: 890,
    },
    errorRate: 0.08,
    throughput: {
      avg: 150,
      peak: 450,
      min: 45,
    },
    incidents: [
      { date: '2024-01-15', duration: 12, impact: 'minor', description: 'Database connection pool exhausted' },
      { date: '2024-01-22', duration: 10, impact: 'minor', description: 'Cache invalidation delay' },
    ],
  };
}

// Calculate SLA compliance
function calculateCompliance(metrics) {
  const compliance = {};

  // Availability
  compliance.availability = {
    target: slaTargets.availability,
    actual: metrics.availability.value,
    met: metrics.availability.value >= slaTargets.availability,
    margin: metrics.availability.value - slaTargets.availability,
  };

  // Response time
  compliance.responseTime = {
    p50: {
      target: slaTargets.responseTime.p50,
      actual: metrics.responseTime.p50,
      met: metrics.responseTime.p50 <= slaTargets.responseTime.p50,
    },
    p95: {
      target: slaTargets.responseTime.p95,
      actual: metrics.responseTime.p95,
      met: metrics.responseTime.p95 <= slaTargets.responseTime.p95,
    },
    p99: {
      target: slaTargets.responseTime.p99,
      actual: metrics.responseTime.p99,
      met: metrics.responseTime.p99 <= slaTargets.responseTime.p99,
    },
  };

  // Error rate
  compliance.errorRate = {
    target: slaTargets.errorRate,
    actual: metrics.errorRate,
    met: metrics.errorRate <= slaTargets.errorRate,
  };

  // Throughput
  compliance.throughput = {
    target: slaTargets.throughput,
    actual: metrics.throughput.avg,
    met: metrics.throughput.min >= slaTargets.throughput * 0.8,
  };

  // Overall compliance
  const allMet = [
    compliance.availability.met,
    compliance.responseTime.p95.met,
    compliance.errorRate.met,
    compliance.throughput.met,
  ];
  compliance.overall = allMet.every(m => m);
  compliance.score = (allMet.filter(m => m).length / allMet.length) * 100;

  return compliance;
}

// Generate markdown report
function generateMarkdownReport(metrics, compliance, period) {
  const timestamp = new Date().toISOString();
  const periodLabel = period === 'monthly' ? 'Monthly' : period === 'weekly' ? 'Weekly' : 'Daily';

  let report = `# SLA Compliance Report

**Report Type:** ${periodLabel}
**Generated:** ${timestamp}
**Overall Status:** ${compliance.overall ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}
**Compliance Score:** ${compliance.score}%

---

## Executive Summary

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Availability | ≥${slaTargets.availability}% | ${metrics.availability.value}% | ${compliance.availability.met ? '✅' : '❌'} |
| P95 Response Time | ≤${slaTargets.responseTime.p95}ms | ${metrics.responseTime.p95}ms | ${compliance.responseTime.p95.met ? '✅' : '❌'} |
| Error Rate | ≤${slaTargets.errorRate}% | ${metrics.errorRate}% | ${compliance.errorRate.met ? '✅' : '❌'} |
| Min Throughput | ≥${slaTargets.throughput} req/s | ${metrics.throughput.min} req/s | ${compliance.throughput.met ? '✅' : '❌'} |

---

## Availability

- **Target:** ${slaTargets.availability}% (${Math.round(43200 * (1 - slaTargets.availability / 100))} minutes downtime allowed/month)
- **Actual:** ${metrics.availability.value}%
- **Uptime:** ${metrics.availability.uptimeMinutes} minutes
- **Downtime:** ${metrics.availability.downtimeMinutes} minutes
- **Margin:** ${compliance.availability.margin > 0 ? '+' : ''}${compliance.availability.margin.toFixed(3)}%

### Availability Status: ${compliance.availability.met ? '✅ MET' : '❌ NOT MET'}

---

## Response Time

| Percentile | Target | Actual | Status |
|------------|--------|--------|--------|
| P50 | ≤${slaTargets.responseTime.p50}ms | ${metrics.responseTime.p50}ms | ${compliance.responseTime.p50.met ? '✅' : '❌'} |
| P95 | ≤${slaTargets.responseTime.p95}ms | ${metrics.responseTime.p95}ms | ${compliance.responseTime.p95.met ? '✅' : '❌'} |
| P99 | ≤${slaTargets.responseTime.p99}ms | ${metrics.responseTime.p99}ms | ${compliance.responseTime.p99.met ? '✅' : '❌'} |

---

## Error Rate

- **Target:** ≤${slaTargets.errorRate}%
- **Actual:** ${metrics.errorRate}%
- **Status:** ${compliance.errorRate.met ? '✅ MET' : '❌ NOT MET'}

---

## Throughput

- **Target:** ≥${slaTargets.throughput} req/s
- **Average:** ${metrics.throughput.avg} req/s
- **Peak:** ${metrics.throughput.peak} req/s
- **Minimum:** ${metrics.throughput.min} req/s
- **Status:** ${compliance.throughput.met ? '✅ MET' : '❌ NOT MET'}

---

## Incidents

`;

  if (metrics.incidents.length === 0) {
    report += `No incidents during this period.\n`;
  } else {
    report += `| Date | Duration | Impact | Description |
|------|----------|--------|-------------|
`;
    for (const incident of metrics.incidents) {
      report += `| ${incident.date} | ${incident.duration} min | ${incident.impact} | ${incident.description} |\n`;
    }
  }

  report += `
---

## Recommendations

`;

  if (!compliance.availability.met) {
    report += `1. **Improve availability** - Review and address causes of downtime\n`;
  }

  if (!compliance.responseTime.p95.met) {
    report += `2. **Optimize response time** - Profile slow endpoints and optimize database queries\n`;
  }

  if (!compliance.errorRate.met) {
    report += `3. **Reduce errors** - Investigate and fix recurring errors\n`;
  }

  if (!compliance.throughput.met) {
    report += `4. **Increase capacity** - Scale resources to handle load\n`;
  }

  if (compliance.overall) {
    report += `All SLA targets met. Continue monitoring and maintaining current performance levels.\n`;
  }

  report += `
---

## SLA Definitions

- **Availability:** Percentage of time the service is operational and accessible
- **Response Time:** Time from request received to response sent (P50/P95/P99 percentiles)
- **Error Rate:** Percentage of requests resulting in errors (4xx/5xx)
- **Throughput:** Number of requests processed per second

---
*Generated by KitchenXpert SLA Report Generator*
`;

  return report;
}

// Generate JSON report
function generateJsonReport(metrics, compliance) {
  return JSON.stringify({
    meta: {
      generated: new Date().toISOString(),
      period: config.period,
    },
    summary: {
      compliant: compliance.overall,
      score: compliance.score,
    },
    targets: slaTargets,
    metrics,
    compliance,
  }, null, 2);
}

async function main() {
  console.log('');
  console.log(`${colors.blue}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║${colors.reset}        KitchenXpert - SLA Report Generator                 ${colors.blue}║${colors.reset}`);
  console.log(`${colors.blue}╚════════════════════════════════════════════════════════════╝${colors.reset}`);
  console.log('');

  // Fetch metrics
  const metrics = fetchMetrics();

  // Calculate compliance
  const compliance = calculateCompliance(metrics);

  log('INFO', `Overall compliance: ${compliance.overall ? 'MET' : 'NOT MET'} (${compliance.score}%)`);

  // Ensure output directory exists
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  // Generate reports
  const mdReport = generateMarkdownReport(metrics, compliance, config.period);
  const mdPath = path.join(config.outputDir, `sla-report-${timestamp}.md`);
  fs.writeFileSync(mdPath, mdReport);
  log('SUCCESS', `Markdown report: ${mdPath}`);

  const jsonReport = generateJsonReport(metrics, compliance);
  const jsonPath = path.join(config.outputDir, `sla-report-${timestamp}.json`);
  fs.writeFileSync(jsonPath, jsonReport);
  log('SUCCESS', `JSON report: ${jsonPath}`);

  console.log('');
  const statusColor = compliance.overall ? colors.green : colors.red;
  console.log(`${statusColor}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${statusColor}║${colors.reset}        SLA Report Complete                                 ${statusColor}║${colors.reset}`);
  console.log(`${statusColor}╚════════════════════════════════════════════════════════════╝${colors.reset}`);
  console.log('');
  console.log(`  Status:     ${compliance.overall ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}`);
  console.log(`  Score:      ${compliance.score}%`);
  console.log(`  Reports:    ${config.outputDir}`);
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
    case '--period':
    case '-p':
      config.period = args[++i];
      break;
    case '--prometheus':
      config.prometheusUrl = args[++i];
      break;
    case '--help':
      console.log('Usage: generate-sla-report.js [options]');
      console.log('');
      console.log('Options:');
      console.log('  -o, --output <dir>     Output directory');
      console.log('  -p, --period <period>  Report period (daily, weekly, monthly)');
      console.log('  --prometheus <url>     Prometheus URL');
      console.log('  --help                 Show this help message');
      process.exit(0);
  }
}

main().catch((error) => {
  log('ERROR', `Failed: ${error.message}`);
  process.exit(1);
});
