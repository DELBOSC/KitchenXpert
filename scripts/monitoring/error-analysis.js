#!/usr/bin/env node
/**
 * Error Analysis - KitchenXpert
 *
 * Analyzes application errors and generates reports.
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
    INFO: `${colors.blue}[ERROR-ANALYSIS]${colors.reset}`,
    SUCCESS: `${colors.green}[ERROR-ANALYSIS]${colors.reset}`,
    WARNING: `${colors.yellow}[ERROR-ANALYSIS]${colors.reset}`,
    ERROR: `${colors.red}[ERROR-ANALYSIS]${colors.reset}`,
  };
  console.log(`${prefix[level] || prefix.INFO} ${message}`);
}

// Configuration
const config = {
  logDir: process.env.LOG_DIR || path.join(__dirname, '../../logs'),
  outputDir: process.env.OUTPUT_DIR || path.join(__dirname, '../../reports/errors'),
  timeRange: process.env.TIME_RANGE || '24h',
};

// Error statistics
const stats = {
  total: 0,
  byType: {},
  byEndpoint: {},
  byStatusCode: {},
  byHour: {},
  topErrors: [],
};

// Parse log line
function parseLogLine(line) {
  try {
    return JSON.parse(line);
  } catch {
    // Try to parse as plain text log
    const match = line.match(/\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\]\s+(\w+)\s+(.+)/);
    if (match) {
      return {
        timestamp: match[1],
        level: match[2],
        message: match[3],
      };
    }
    return null;
  }
}

// Process error entry
function processError(entry) {
  if (!entry || (entry.level !== 'error' && entry.level !== 'ERROR')) {
    return;
  }

  stats.total++;

  // By error type
  const errorType = entry.error?.name || entry.type || 'Unknown';
  stats.byType[errorType] = (stats.byType[errorType] || 0) + 1;

  // By endpoint
  const endpoint = entry.path || entry.endpoint || entry.url || 'Unknown';
  stats.byEndpoint[endpoint] = (stats.byEndpoint[endpoint] || 0) + 1;

  // By status code
  const statusCode = entry.statusCode || entry.status || 'N/A';
  stats.byStatusCode[statusCode] = (stats.byStatusCode[statusCode] || 0) + 1;

  // By hour
  if (entry.timestamp) {
    const hour = entry.timestamp.substring(0, 13);
    stats.byHour[hour] = (stats.byHour[hour] || 0) + 1;
  }

  // Track top errors
  stats.topErrors.push({
    timestamp: entry.timestamp,
    type: errorType,
    message: entry.message || entry.error?.message || 'No message',
    endpoint,
    statusCode,
    stack: entry.error?.stack || entry.stack,
  });
}

// Analyze log files
function analyzeLogFiles() {
  log('INFO', `Analyzing logs in: ${config.logDir}`);

  if (!fs.existsSync(config.logDir)) {
    log('WARNING', 'Log directory not found');
    return;
  }

  const files = fs.readdirSync(config.logDir).filter(f => f.endsWith('.log') || f.endsWith('.json'));

  log('INFO', `Found ${files.length} log file(s)`);

  for (const file of files) {
    const filePath = path.join(config.logDir, file);
    log('INFO', `Processing: ${file}`);

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').filter(l => l.trim());

      for (const line of lines) {
        const entry = parseLogLine(line);
        processError(entry);
      }
    } catch (error) {
      log('WARNING', `Failed to process ${file}: ${error.message}`);
    }
  }
}

// Calculate error rate trends
function calculateTrends() {
  const hours = Object.keys(stats.byHour).sort();
  if (hours.length < 2) return null;

  const recent = hours.slice(-6);
  const previous = hours.slice(-12, -6);

  const recentAvg = recent.reduce((sum, h) => sum + (stats.byHour[h] || 0), 0) / recent.length;
  const previousAvg = previous.length > 0
    ? previous.reduce((sum, h) => sum + (stats.byHour[h] || 0), 0) / previous.length
    : recentAvg;

  const trend = previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;

  return {
    recentAvg: Math.round(recentAvg * 10) / 10,
    previousAvg: Math.round(previousAvg * 10) / 10,
    trend: Math.round(trend * 10) / 10,
    direction: trend > 10 ? 'increasing' : trend < -10 ? 'decreasing' : 'stable',
  };
}

// Generate markdown report
function generateMarkdownReport() {
  const timestamp = new Date().toISOString();
  const trends = calculateTrends();

  let report = `# Error Analysis Report

**Generated:** ${timestamp}
**Time Range:** ${config.timeRange}
**Total Errors:** ${stats.total}

## Summary

`;

  if (trends) {
    report += `### Trend Analysis

- Recent average: ${trends.recentAvg} errors/hour
- Previous average: ${trends.previousAvg} errors/hour
- Trend: ${trends.direction} (${trends.trend > 0 ? '+' : ''}${trends.trend}%)

`;
  }

  report += `## Errors by Type

| Error Type | Count | Percentage |
|------------|-------|------------|
`;

  const sortedTypes = Object.entries(stats.byType).sort((a, b) => b[1] - a[1]);
  for (const [type, count] of sortedTypes) {
    const pct = stats.total > 0 ? ((count / stats.total) * 100).toFixed(1) : 0;
    report += `| ${type} | ${count} | ${pct}% |\n`;
  }

  report += `
## Errors by Status Code

| Status Code | Count | Percentage |
|-------------|-------|------------|
`;

  const sortedCodes = Object.entries(stats.byStatusCode).sort((a, b) => b[1] - a[1]);
  for (const [code, count] of sortedCodes) {
    const pct = stats.total > 0 ? ((count / stats.total) * 100).toFixed(1) : 0;
    report += `| ${code} | ${count} | ${pct}% |\n`;
  }

  report += `
## Top Affected Endpoints

| Endpoint | Error Count |
|----------|-------------|
`;

  const sortedEndpoints = Object.entries(stats.byEndpoint).sort((a, b) => b[1] - a[1]).slice(0, 10);
  for (const [endpoint, count] of sortedEndpoints) {
    report += `| ${endpoint} | ${count} |\n`;
  }

  report += `
## Recent Errors

`;

  const recentErrors = stats.topErrors.slice(-10).reverse();
  for (const error of recentErrors) {
    report += `### ${error.type}

- **Time:** ${error.timestamp || 'N/A'}
- **Endpoint:** ${error.endpoint}
- **Status:** ${error.statusCode}
- **Message:** ${error.message}

`;
  }

  report += `
## Recommendations

`;

  if (stats.total > 100) {
    report += `1. **High error volume** - Investigate the most common error types\n`;
  }

  if (stats.byStatusCode['500'] > 10) {
    report += `2. **Server errors** - Review 500 errors for unhandled exceptions\n`;
  }

  if (stats.byStatusCode['404'] > 50) {
    report += `3. **Not found errors** - Check for broken links or missing resources\n`;
  }

  if (trends && trends.direction === 'increasing') {
    report += `4. **Increasing trend** - Error rate is rising, investigate recent changes\n`;
  }

  report += `
---
*Generated by KitchenXpert Error Analysis*
`;

  return report;
}

// Generate JSON report
function generateJsonReport() {
  const trends = calculateTrends();

  return JSON.stringify({
    meta: {
      generated: new Date().toISOString(),
      timeRange: config.timeRange,
    },
    summary: {
      total: stats.total,
      trends,
    },
    byType: stats.byType,
    byStatusCode: stats.byStatusCode,
    byEndpoint: stats.byEndpoint,
    byHour: stats.byHour,
    recentErrors: stats.topErrors.slice(-20),
  }, null, 2);
}

async function main() {
  console.log('');
  console.log(`${colors.blue}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║${colors.reset}        KitchenXpert - Error Analysis                       ${colors.blue}║${colors.reset}`);
  console.log(`${colors.blue}╚════════════════════════════════════════════════════════════╝${colors.reset}`);
  console.log('');

  analyzeLogFiles();

  // Ensure output directory exists
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  // Generate reports
  const mdReport = generateMarkdownReport();
  const mdPath = path.join(config.outputDir, `error-analysis-${timestamp}.md`);
  fs.writeFileSync(mdPath, mdReport);
  log('SUCCESS', `Markdown report: ${mdPath}`);

  const jsonReport = generateJsonReport();
  const jsonPath = path.join(config.outputDir, `error-analysis-${timestamp}.json`);
  fs.writeFileSync(jsonPath, jsonReport);
  log('SUCCESS', `JSON report: ${jsonPath}`);

  console.log('');
  console.log(`${colors.green}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.green}║${colors.reset}        Error Analysis Complete                             ${colors.green}║${colors.reset}`);
  console.log(`${colors.green}╚════════════════════════════════════════════════════════════╝${colors.reset}`);
  console.log('');
  console.log(`  Total errors: ${stats.total}`);
  console.log(`  Error types:  ${Object.keys(stats.byType).length}`);
  console.log(`  Reports:      ${config.outputDir}`);
  console.log('');
}

// Parse command line arguments
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--logs':
    case '-l':
      config.logDir = args[++i];
      break;
    case '--output':
    case '-o':
      config.outputDir = args[++i];
      break;
    case '--range':
    case '-r':
      config.timeRange = args[++i];
      break;
    case '--help':
      console.log('Usage: error-analysis.js [options]');
      console.log('');
      console.log('Options:');
      console.log('  -l, --logs <dir>    Log files directory');
      console.log('  -o, --output <dir>  Output directory');
      console.log('  -r, --range <time>  Time range (e.g., 24h, 7d)');
      console.log('  --help              Show this help message');
      process.exit(0);
  }
}

main().catch((error) => {
  log('ERROR', `Failed: ${error.message}`);
  process.exit(1);
});
