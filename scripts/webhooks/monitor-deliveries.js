#!/usr/bin/env node
/**
 * Monitor Webhook Deliveries - KitchenXpert
 *
 * Monitors and tracks webhook delivery status and performance.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function log(level, message) {
  const timestamp = new Date().toISOString();
  const prefix = {
    INFO: `${colors.blue}[MONITOR]${colors.reset}`,
    SUCCESS: `${colors.green}[MONITOR]${colors.reset}`,
    WARNING: `${colors.yellow}[MONITOR]${colors.reset}`,
    ERROR: `${colors.red}[MONITOR]${colors.reset}`,
    DELIVERY: `${colors.cyan}[DELIVERY]${colors.reset}`,
  };
  console.log(`${colors.gray}${timestamp}${colors.reset} ${prefix[level] || prefix.INFO} ${message}`);
}

// Configuration
const config = {
  logFile: process.env.LOG_FILE || path.join(__dirname, '../../logs/webhooks.log'),
  outputDir: process.env.OUTPUT_DIR || path.join(__dirname, '../../reports/webhooks'),
  serverPort: parseInt(process.env.PORT || '3005'),
  mode: 'monitor', // monitor, server, report, tail
  tailLines: parseInt(process.env.TAIL_LINES || '50'),
  refreshInterval: parseInt(process.env.REFRESH_INTERVAL || '5000'),
};

// Statistics
const stats = {
  total: 0,
  successful: 0,
  failed: 0,
  pending: 0,
  retrying: 0,
  byEventType: {},
  byEndpoint: {},
  responseTimesMs: [],
  errors: [],
  recentDeliveries: [],
};

/**
 * Parse a log line
 */
function parseLogLine(line) {
  try {
    return JSON.parse(line);
  } catch {
    // Try to parse as plain text log
    const match = line.match(/\[(\w+)\]\s+(\w+\.\w+)\s+(.+)/);
    if (match) {
      return {
        level: match[1],
        eventType: match[2],
        message: match[3],
      };
    }
    return null;
  }
}

/**
 * Process a delivery record
 */
function processDelivery(delivery) {
  stats.total++;

  // Track by status
  switch (delivery.status) {
    case 'success':
    case 'delivered':
      stats.successful++;
      break;
    case 'failed':
    case 'error':
      stats.failed++;
      if (delivery.error) {
        stats.errors.push({
          timestamp: delivery.timestamp,
          eventType: delivery.eventType,
          error: delivery.error,
        });
      }
      break;
    case 'pending':
      stats.pending++;
      break;
    case 'retrying':
      stats.retrying++;
      break;
  }

  // Track by event type
  const eventType = delivery.eventType || 'unknown';
  if (!stats.byEventType[eventType]) {
    stats.byEventType[eventType] = { total: 0, success: 0, failed: 0 };
  }
  stats.byEventType[eventType].total++;
  if (delivery.status === 'success' || delivery.status === 'delivered') {
    stats.byEventType[eventType].success++;
  } else if (delivery.status === 'failed' || delivery.status === 'error') {
    stats.byEventType[eventType].failed++;
  }

  // Track by endpoint
  const endpoint = delivery.endpoint || delivery.url || 'unknown';
  if (!stats.byEndpoint[endpoint]) {
    stats.byEndpoint[endpoint] = { total: 0, success: 0, failed: 0 };
  }
  stats.byEndpoint[endpoint].total++;
  if (delivery.status === 'success' || delivery.status === 'delivered') {
    stats.byEndpoint[endpoint].success++;
  } else if (delivery.status === 'failed' || delivery.status === 'error') {
    stats.byEndpoint[endpoint].failed++;
  }

  // Track response times
  if (delivery.responseTimeMs) {
    stats.responseTimesMs.push(delivery.responseTimeMs);
  }

  // Keep recent deliveries
  stats.recentDeliveries.unshift(delivery);
  if (stats.recentDeliveries.length > 100) {
    stats.recentDeliveries.pop();
  }
}

/**
 * Read and process log file
 */
function processLogFile() {
  if (!fs.existsSync(config.logFile)) {
    log('WARNING', `Log file not found: ${config.logFile}`);
    return;
  }

  const content = fs.readFileSync(config.logFile, 'utf8');
  const lines = content.split('\n').filter((l) => l.trim());

  // Reset stats
  Object.keys(stats.byEventType).forEach((k) => delete stats.byEventType[k]);
  Object.keys(stats.byEndpoint).forEach((k) => delete stats.byEndpoint[k]);
  stats.total = 0;
  stats.successful = 0;
  stats.failed = 0;
  stats.pending = 0;
  stats.retrying = 0;
  stats.responseTimesMs = [];
  stats.errors = [];
  stats.recentDeliveries = [];

  for (const line of lines) {
    const delivery = parseLogLine(line);
    if (delivery) {
      processDelivery(delivery);
    }
  }
}

/**
 * Calculate statistics
 */
function calculateStats() {
  const responseTimes = stats.responseTimesMs;

  return {
    total: stats.total,
    successful: stats.successful,
    failed: stats.failed,
    pending: stats.pending,
    retrying: stats.retrying,
    successRate: stats.total > 0
      ? ((stats.successful / stats.total) * 100).toFixed(2) + '%'
      : 'N/A',
    avgResponseTime: responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) + 'ms'
      : 'N/A',
    p95ResponseTime: responseTimes.length > 0
      ? Math.round(responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)]) + 'ms'
      : 'N/A',
    byEventType: stats.byEventType,
    byEndpoint: stats.byEndpoint,
    recentErrors: stats.errors.slice(0, 10),
  };
}

/**
 * Display stats in terminal
 */
function displayStats(clear = true) {
  if (clear) {
    console.clear();
  }

  const calculated = calculateStats();

  console.log('');
  console.log(`${colors.blue}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║${colors.reset}      KitchenXpert - Webhook Delivery Monitor               ${colors.blue}║${colors.reset}`);
  console.log(`${colors.blue}╚════════════════════════════════════════════════════════════╝${colors.reset}`);
  console.log('');
  console.log(`  ${colors.gray}Last updated: ${new Date().toISOString()}${colors.reset}`);
  console.log('');

  // Overall stats
  console.log('  ┌─────────────────────────────────────────────────────────┐');
  console.log('  │ Overall Statistics                                      │');
  console.log('  ├─────────────────────────────────────────────────────────┤');
  console.log(`  │ Total Deliveries:    ${String(calculated.total).padEnd(35)}│`);
  console.log(`  │ ${colors.green}Successful:${colors.reset}          ${String(calculated.successful).padEnd(35)}│`);
  console.log(`  │ ${colors.red}Failed:${colors.reset}              ${String(calculated.failed).padEnd(35)}│`);
  console.log(`  │ ${colors.yellow}Pending:${colors.reset}             ${String(calculated.pending).padEnd(35)}│`);
  console.log(`  │ ${colors.cyan}Retrying:${colors.reset}            ${String(calculated.retrying).padEnd(35)}│`);
  console.log(`  │ Success Rate:        ${String(calculated.successRate).padEnd(35)}│`);
  console.log(`  │ Avg Response Time:   ${String(calculated.avgResponseTime).padEnd(35)}│`);
  console.log(`  │ P95 Response Time:   ${String(calculated.p95ResponseTime).padEnd(35)}│`);
  console.log('  └─────────────────────────────────────────────────────────┘');
  console.log('');

  // By event type
  const eventTypes = Object.entries(calculated.byEventType);
  if (eventTypes.length > 0) {
    console.log('  ┌─────────────────────────────────────────────────────────┐');
    console.log('  │ By Event Type                                           │');
    console.log('  ├─────────────────────────────────────────────────────────┤');
    for (const [type, data] of eventTypes.slice(0, 8)) {
      const rate = data.total > 0 ? ((data.success / data.total) * 100).toFixed(0) : 0;
      const line = `${type}: ${data.success}/${data.total} (${rate}%)`;
      console.log(`  │ ${line.padEnd(55)}│`);
    }
    if (eventTypes.length > 8) {
      console.log(`  │ ${`... and ${eventTypes.length - 8} more`.padEnd(55)}│`);
    }
    console.log('  └─────────────────────────────────────────────────────────┘');
    console.log('');
  }

  // Recent errors
  if (calculated.recentErrors.length > 0) {
    console.log('  ┌─────────────────────────────────────────────────────────┐');
    console.log(`  │ ${colors.red}Recent Errors${colors.reset}                                           │`);
    console.log('  ├─────────────────────────────────────────────────────────┤');
    for (const error of calculated.recentErrors.slice(0, 5)) {
      const line = `${error.eventType}: ${error.error}`.slice(0, 53);
      console.log(`  │ ${line.padEnd(55)}│`);
    }
    console.log('  └─────────────────────────────────────────────────────────┘');
  }

  console.log('');
  console.log(`  ${colors.gray}Press Ctrl+C to exit${colors.reset}`);
}

/**
 * Start monitoring server
 */
function startServer() {
  const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Process log file
    processLogFile();
    const calculated = calculateStats();

    if (req.url === '/api/stats' || req.url === '/stats') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(calculated, null, 2));
    } else if (req.url === '/api/recent' || req.url === '/recent') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(stats.recentDeliveries, null, 2));
    } else if (req.url === '/api/errors' || req.url === '/errors') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(stats.errors, null, 2));
    } else if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }));
    } else {
      // Dashboard HTML
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(generateDashboardHtml(calculated));
    }
  });

  server.listen(config.serverPort, () => {
    log('SUCCESS', `Monitoring server started on http://localhost:${config.serverPort}`);
    log('INFO', 'Endpoints:');
    log('INFO', '  /          - Dashboard');
    log('INFO', '  /stats     - JSON statistics');
    log('INFO', '  /recent    - Recent deliveries');
    log('INFO', '  /errors    - Recent errors');
    log('INFO', '  /health    - Health check');
  });
}

/**
 * Generate dashboard HTML
 */
function generateDashboardHtml(stats) {
  return `<!DOCTYPE html>
<html>
<head>
    <title>Webhook Monitor - KitchenXpert</title>
    <meta http-equiv="refresh" content="5">
    <style>
        body { font-family: -apple-system, sans-serif; background: #f5f5f5; padding: 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 { color: #2c3e50; }
        .card { background: white; border-radius: 8px; padding: 20px; margin: 10px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; }
        .stat { text-align: center; }
        .stat-value { font-size: 2rem; font-weight: bold; }
        .success { color: #28a745; }
        .error { color: #dc3545; }
        .warning { color: #ffc107; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #eee; }
        th { background: #f8f9fa; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔔 Webhook Delivery Monitor</h1>
        <p>Last updated: ${new Date().toISOString()}</p>

        <div class="card">
            <h2>Overview</h2>
            <div class="stats">
                <div class="stat">
                    <div class="stat-value">${stats.total}</div>
                    <div>Total</div>
                </div>
                <div class="stat">
                    <div class="stat-value success">${stats.successful}</div>
                    <div>Successful</div>
                </div>
                <div class="stat">
                    <div class="stat-value error">${stats.failed}</div>
                    <div>Failed</div>
                </div>
                <div class="stat">
                    <div class="stat-value warning">${stats.pending}</div>
                    <div>Pending</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${stats.successRate}</div>
                    <div>Success Rate</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${stats.avgResponseTime}</div>
                    <div>Avg Response</div>
                </div>
            </div>
        </div>

        <div class="card">
            <h2>By Event Type</h2>
            <table>
                <tr><th>Event Type</th><th>Total</th><th>Success</th><th>Failed</th><th>Rate</th></tr>
                ${Object.entries(stats.byEventType).map(([type, data]) => `
                <tr>
                    <td>${type}</td>
                    <td>${data.total}</td>
                    <td class="success">${data.success}</td>
                    <td class="error">${data.failed}</td>
                    <td>${data.total > 0 ? ((data.success / data.total) * 100).toFixed(1) : 0}%</td>
                </tr>
                `).join('')}
            </table>
        </div>

        ${stats.recentErrors.length > 0 ? `
        <div class="card">
            <h2>Recent Errors</h2>
            <table>
                <tr><th>Event Type</th><th>Error</th></tr>
                ${stats.recentErrors.slice(0, 10).map(err => `
                <tr>
                    <td>${err.eventType}</td>
                    <td class="error">${err.error}</td>
                </tr>
                `).join('')}
            </table>
        </div>
        ` : ''}
    </div>
</body>
</html>`;
}

/**
 * Generate report
 */
function generateReport() {
  processLogFile();
  const calculated = calculateStats();

  // Ensure output directory exists
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  // JSON report
  const jsonPath = path.join(config.outputDir, `webhook-report-${timestamp}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(calculated, null, 2));
  log('SUCCESS', `JSON report: ${jsonPath}`);

  // Markdown report
  const mdPath = path.join(config.outputDir, `webhook-report-${timestamp}.md`);
  const mdContent = `# Webhook Delivery Report

**Generated:** ${new Date().toISOString()}

## Summary

| Metric | Value |
|--------|-------|
| Total Deliveries | ${calculated.total} |
| Successful | ${calculated.successful} |
| Failed | ${calculated.failed} |
| Success Rate | ${calculated.successRate} |
| Avg Response Time | ${calculated.avgResponseTime} |
| P95 Response Time | ${calculated.p95ResponseTime} |

## By Event Type

| Event Type | Total | Success | Failed | Rate |
|------------|-------|---------|--------|------|
${Object.entries(calculated.byEventType).map(([type, data]) =>
  `| ${type} | ${data.total} | ${data.success} | ${data.failed} | ${data.total > 0 ? ((data.success / data.total) * 100).toFixed(1) : 0}% |`
).join('\n')}

## Recent Errors

${calculated.recentErrors.length > 0 ? calculated.recentErrors.map(err =>
  `- **${err.eventType}**: ${err.error}`
).join('\n') : 'No recent errors.'}

---
*Generated by KitchenXpert Webhook Monitor*
`;
  fs.writeFileSync(mdPath, mdContent);
  log('SUCCESS', `Markdown report: ${mdPath}`);
}

/**
 * Tail log file
 */
function tailLog() {
  if (!fs.existsSync(config.logFile)) {
    log('ERROR', `Log file not found: ${config.logFile}`);
    return;
  }

  const content = fs.readFileSync(config.logFile, 'utf8');
  const lines = content.split('\n').filter((l) => l.trim());
  const recent = lines.slice(-config.tailLines);

  console.log('');
  log('INFO', `Last ${config.tailLines} deliveries:`);
  console.log('');

  for (const line of recent) {
    const delivery = parseLogLine(line);
    if (delivery) {
      const status = delivery.status || 'unknown';
      const statusColor = status === 'success' ? colors.green :
                          status === 'failed' ? colors.red : colors.yellow;
      console.log(`  ${statusColor}[${status.toUpperCase()}]${colors.reset} ${delivery.eventType || 'unknown'} - ${delivery.timestamp || ''}`);
    }
  }
}

async function main() {
  console.log('');
  console.log(`${colors.blue}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║${colors.reset}      KitchenXpert - Webhook Delivery Monitor               ${colors.blue}║${colors.reset}`);
  console.log(`${colors.blue}╚════════════════════════════════════════════════════════════╝${colors.reset}`);
  console.log('');

  switch (config.mode) {
    case 'server':
      startServer();
      break;
    case 'report':
      generateReport();
      break;
    case 'tail':
      tailLog();
      break;
    case 'monitor':
    default:
      processLogFile();
      displayStats(false);

      // Live monitoring
      setInterval(() => {
        processLogFile();
        displayStats(true);
      }, config.refreshInterval);
      break;
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--log':
    case '-l':
      config.logFile = args[++i];
      break;
    case '--output':
    case '-o':
      config.outputDir = args[++i];
      break;
    case '--port':
    case '-p':
      config.serverPort = parseInt(args[++i]);
      break;
    case '--server':
    case '-s':
      config.mode = 'server';
      break;
    case '--report':
    case '-r':
      config.mode = 'report';
      break;
    case '--tail':
    case '-t':
      config.mode = 'tail';
      break;
    case '--lines':
    case '-n':
      config.tailLines = parseInt(args[++i]);
      break;
    case '--interval':
    case '-i':
      config.refreshInterval = parseInt(args[++i]);
      break;
    case '--help':
      console.log('Usage: monitor-deliveries.js [options]');
      console.log('');
      console.log('Options:');
      console.log('  -l, --log <path>       Webhook log file path');
      console.log('  -o, --output <dir>     Output directory for reports');
      console.log('  -p, --port <port>      Server port (default: 3005)');
      console.log('  -s, --server           Start monitoring web server');
      console.log('  -r, --report           Generate report and exit');
      console.log('  -t, --tail             Show recent deliveries');
      console.log('  -n, --lines <n>        Number of lines to tail');
      console.log('  -i, --interval <ms>    Refresh interval');
      console.log('  --help                 Show this help message');
      console.log('');
      console.log('Examples:');
      console.log('  monitor-deliveries.js                    # Live terminal monitor');
      console.log('  monitor-deliveries.js --server           # Start web dashboard');
      console.log('  monitor-deliveries.js --report           # Generate report');
      console.log('  monitor-deliveries.js --tail -n 100      # Show last 100 deliveries');
      process.exit(0);
  }
}

main().catch((error) => {
  log('ERROR', `Fatal error: ${error.message}`);
  process.exit(1);
});
