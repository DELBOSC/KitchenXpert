#!/usr/bin/env node
/**
 * Generate Dashboard - KitchenXpert
 *
 * Generates Grafana dashboards for monitoring.
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
    INFO: `${colors.blue}[DASHBOARD]${colors.reset}`,
    SUCCESS: `${colors.green}[DASHBOARD]${colors.reset}`,
    WARNING: `${colors.yellow}[DASHBOARD]${colors.reset}`,
    ERROR: `${colors.red}[DASHBOARD]${colors.reset}`,
  };
  console.log(`${prefix[level] || prefix.INFO} ${message}`);
}

// Configuration
const config = {
  outputDir: process.env.OUTPUT_DIR || path.join(__dirname, '../../monitoring/grafana/dashboards'),
  datasource: process.env.DATASOURCE || 'Prometheus',
};

// Panel templates
const panels = {
  stat(title, expr, gridPos, options = {}) {
    return {
      type: 'stat',
      title,
      gridPos,
      datasource: { type: 'prometheus', uid: config.datasource.toLowerCase() },
      targets: [{ expr, refId: 'A' }],
      options: {
        colorMode: 'value',
        graphMode: 'area',
        justifyMode: 'auto',
        orientation: 'auto',
        reduceOptions: { calcs: ['lastNotNull'], fields: '', values: false },
        ...options,
      },
      fieldConfig: {
        defaults: {
          color: { mode: 'palette-classic' },
          mappings: [],
          thresholds: {
            mode: 'absolute',
            steps: [
              { color: 'green', value: null },
              { color: 'yellow', value: 80 },
              { color: 'red', value: 90 },
            ],
          },
          unit: options.unit || 'short',
        },
      },
    };
  },

  graph(title, expr, gridPos, options = {}) {
    return {
      type: 'timeseries',
      title,
      gridPos,
      datasource: { type: 'prometheus', uid: config.datasource.toLowerCase() },
      targets: [{ expr, refId: 'A', legendFormat: options.legend || '' }],
      options: {
        legend: { displayMode: 'list', placement: 'bottom' },
        tooltip: { mode: 'single' },
      },
      fieldConfig: {
        defaults: {
          color: { mode: 'palette-classic' },
          custom: {
            drawStyle: 'line',
            lineInterpolation: 'linear',
            lineWidth: 1,
            fillOpacity: 10,
            gradientMode: 'none',
            spanNulls: false,
            showPoints: 'never',
            pointSize: 5,
            stacking: { mode: 'none', group: 'A' },
          },
          unit: options.unit || 'short',
        },
      },
    };
  },

  gauge(title, expr, gridPos, options = {}) {
    return {
      type: 'gauge',
      title,
      gridPos,
      datasource: { type: 'prometheus', uid: config.datasource.toLowerCase() },
      targets: [{ expr, refId: 'A' }],
      options: {
        reduceOptions: { calcs: ['lastNotNull'], fields: '', values: false },
        showThresholdLabels: false,
        showThresholdMarkers: true,
      },
      fieldConfig: {
        defaults: {
          color: { mode: 'thresholds' },
          min: options.min || 0,
          max: options.max || 100,
          thresholds: {
            mode: 'absolute',
            steps: [
              { color: 'green', value: null },
              { color: 'yellow', value: options.warnThreshold || 70 },
              { color: 'red', value: options.critThreshold || 90 },
            ],
          },
          unit: options.unit || 'percent',
        },
      },
    };
  },
};

// Dashboard generators
function generateOverviewDashboard() {
  log('INFO', 'Generating overview dashboard...');

  return {
    uid: 'kitchenxpert-overview',
    title: 'KitchenXpert Overview',
    tags: ['kitchenxpert', 'overview'],
    timezone: 'browser',
    refresh: '5s',
    time: { from: 'now-1h', to: 'now' },
    panels: [
      panels.stat('Services Up', 'sum(up{job=~"backend|frontend"})', { h: 4, w: 6, x: 0, y: 0 }),
      panels.stat(
        'Request Rate',
        'sum(rate(http_requests_total[5m]))',
        { h: 4, w: 6, x: 6, y: 0 },
        { unit: 'reqps' }
      ),
      panels.stat(
        'Error Rate',
        'sum(rate(http_requests_total{status=~"5.."}[5m]))/sum(rate(http_requests_total[5m]))*100',
        { h: 4, w: 6, x: 12, y: 0 },
        { unit: 'percent' }
      ),
      panels.stat(
        'P95 Latency',
        'histogram_quantile(0.95,sum(rate(http_request_duration_seconds_bucket[5m]))by(le))*1000',
        { h: 4, w: 6, x: 18, y: 0 },
        { unit: 'ms' }
      ),
      panels.graph(
        'Request Rate Over Time',
        'sum(rate(http_requests_total[5m])) by (job)',
        { h: 8, w: 12, x: 0, y: 4 },
        { unit: 'reqps', legend: '{{job}}' }
      ),
      panels.graph(
        'Error Rate Over Time',
        'sum(rate(http_requests_total{status=~"5.."}[5m])) by (job)',
        { h: 8, w: 12, x: 12, y: 4 },
        { unit: 'short', legend: '{{job}}' }
      ),
      panels.graph(
        'Response Time',
        'histogram_quantile(0.95,sum(rate(http_request_duration_seconds_bucket[5m]))by(le,job))*1000',
        { h: 8, w: 24, x: 0, y: 12 },
        { unit: 'ms', legend: '{{job}} p95' }
      ),
    ],
  };
}

function generateInfrastructureDashboard() {
  log('INFO', 'Generating infrastructure dashboard...');

  return {
    uid: 'kitchenxpert-infra',
    title: 'KitchenXpert Infrastructure',
    tags: ['kitchenxpert', 'infrastructure'],
    timezone: 'browser',
    refresh: '10s',
    time: { from: 'now-1h', to: 'now' },
    panels: [
      panels.gauge(
        'CPU Usage',
        '100 - (avg(irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)',
        { h: 6, w: 6, x: 0, y: 0 }
      ),
      panels.gauge(
        'Memory Usage',
        '(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100',
        { h: 6, w: 6, x: 6, y: 0 }
      ),
      panels.gauge(
        'Disk Usage',
        '(node_filesystem_size_bytes - node_filesystem_avail_bytes) / node_filesystem_size_bytes * 100',
        { h: 6, w: 6, x: 12, y: 0 },
        { warnThreshold: 80, critThreshold: 95 }
      ),
      panels.stat(
        'Network In',
        'sum(rate(node_network_receive_bytes_total[5m]))',
        { h: 6, w: 6, x: 18, y: 0 },
        { unit: 'Bps' }
      ),
      panels.graph(
        'CPU Over Time',
        '100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)',
        { h: 8, w: 12, x: 0, y: 6 },
        { unit: 'percent', legend: '{{instance}}' }
      ),
      panels.graph(
        'Memory Over Time',
        '(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / 1024 / 1024 / 1024',
        { h: 8, w: 12, x: 12, y: 6 },
        { unit: 'decgbytes', legend: 'Used' }
      ),
    ],
  };
}

function generateDatabaseDashboard() {
  log('INFO', 'Generating database dashboard...');

  return {
    uid: 'kitchenxpert-database',
    title: 'KitchenXpert Database',
    tags: ['kitchenxpert', 'database'],
    timezone: 'browser',
    refresh: '10s',
    time: { from: 'now-1h', to: 'now' },
    panels: [
      panels.stat('PostgreSQL Up', 'pg_up', { h: 4, w: 6, x: 0, y: 0 }),
      panels.stat('Active Connections', 'pg_stat_activity_count', { h: 4, w: 6, x: 6, y: 0 }),
      panels.stat(
        'Database Size',
        'pg_database_size_bytes',
        { h: 4, w: 6, x: 12, y: 0 },
        { unit: 'decbytes' }
      ),
      panels.stat('Redis Up', 'redis_up', { h: 4, w: 6, x: 18, y: 0 }),
      panels.graph(
        'Query Duration',
        'rate(pg_stat_user_tables_seq_scan[5m])',
        { h: 8, w: 12, x: 0, y: 4 },
        { legend: 'Sequential scans' }
      ),
      panels.graph(
        'Redis Memory',
        'redis_memory_used_bytes',
        { h: 8, w: 12, x: 12, y: 4 },
        { unit: 'decbytes', legend: 'Used' }
      ),
    ],
  };
}

function generateBusinessDashboard() {
  log('INFO', 'Generating business metrics dashboard...');

  return {
    uid: 'kitchenxpert-business',
    title: 'KitchenXpert Business Metrics',
    tags: ['kitchenxpert', 'business'],
    timezone: 'browser',
    refresh: '30s',
    time: { from: 'now-24h', to: 'now' },
    panels: [
      panels.stat('Active Users', 'app_active_users', { h: 4, w: 6, x: 0, y: 0 }),
      panels.stat('Orders Today', 'increase(app_orders_total[24h])', { h: 4, w: 6, x: 6, y: 0 }),
      panels.stat(
        'Revenue Today',
        'increase(app_revenue_total[24h])',
        { h: 4, w: 6, x: 12, y: 0 },
        { unit: 'currencyEUR' }
      ),
      panels.stat(
        'Conversion Rate',
        'app_conversion_rate * 100',
        { h: 4, w: 6, x: 18, y: 0 },
        { unit: 'percent' }
      ),
      panels.graph(
        'Orders Over Time',
        'rate(app_orders_total[1h])*3600',
        { h: 8, w: 12, x: 0, y: 4 },
        { legend: 'Orders/hour' }
      ),
      panels.graph(
        'Revenue Over Time',
        'rate(app_revenue_total[1h])*3600',
        { h: 8, w: 12, x: 12, y: 4 },
        { unit: 'currencyEUR', legend: 'Revenue/hour' }
      ),
    ],
  };
}

function saveDashboard(dashboard, filename) {
  const outputPath = path.join(config.outputDir, filename);

  // Ensure output directory exists
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
  }

  // Add common properties
  const fullDashboard = {
    ...dashboard,
    schemaVersion: 38,
    style: 'dark',
    editable: true,
    liveNow: false,
    fiscalYearStartMonth: 0,
    graphTooltip: 0,
    links: [],
    annotations: { list: [] },
    templating: { list: [] },
  };

  fs.writeFileSync(outputPath, JSON.stringify(fullDashboard, null, 2));
  log('SUCCESS', `Saved: ${outputPath}`);
}

async function main() {
  console.log('');
  console.log(
    `${colors.blue}╔════════════════════════════════════════════════════════════╗${colors.reset}`
  );
  console.log(
    `${colors.blue}║${colors.reset}      KitchenXpert - Dashboard Generator                    ${colors.blue}║${colors.reset}`
  );
  console.log(
    `${colors.blue}╚════════════════════════════════════════════════════════════╝${colors.reset}`
  );
  console.log('');

  const dashboards = [
    { generator: generateOverviewDashboard, filename: 'overview.json' },
    { generator: generateInfrastructureDashboard, filename: 'infrastructure.json' },
    { generator: generateDatabaseDashboard, filename: 'database.json' },
    { generator: generateBusinessDashboard, filename: 'business.json' },
  ];

  for (const { generator, filename } of dashboards) {
    const dashboard = generator();
    saveDashboard(dashboard, filename);
  }

  console.log('');
  console.log(
    `${colors.green}╔════════════════════════════════════════════════════════════╗${colors.reset}`
  );
  console.log(
    `${colors.green}║${colors.reset}        Dashboard Generation Complete                       ${colors.green}║${colors.reset}`
  );
  console.log(
    `${colors.green}╚════════════════════════════════════════════════════════════╝${colors.reset}`
  );
  console.log('');
  console.log(`  Output: ${config.outputDir}`);
  console.log(`  Dashboards: ${dashboards.length}`);
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
    case '--datasource':
    case '-d':
      config.datasource = args[++i];
      break;
    case '--help':
      console.log('Usage: generate-dashboard.js [options]');
      console.log('');
      console.log('Options:');
      console.log('  -o, --output <dir>       Output directory');
      console.log('  -d, --datasource <name>  Datasource name');
      console.log('  --help                   Show this help message');
      process.exit(0);
  }
}

main().catch((error) => {
  log('ERROR', `Failed: ${error.message}`);
  process.exit(1);
});
