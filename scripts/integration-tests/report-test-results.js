#!/usr/bin/env node
/**
 * Report Test Results - KitchenXpert
 *
 * Generates comprehensive test result reports from various test runners.
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
    INFO: `${colors.blue}[REPORT]${colors.reset}`,
    SUCCESS: `${colors.green}[REPORT]${colors.reset}`,
    WARNING: `${colors.yellow}[REPORT]${colors.reset}`,
    ERROR: `${colors.red}[REPORT]${colors.reset}`,
  };
  console.log(`${prefix[level] || prefix.INFO} ${message}`);
}

// Configuration
const config = {
  outputDir: process.env.OUTPUT_DIR || path.join(__dirname, '../../reports/tests'),
  junitDir: process.env.JUNIT_DIR || path.join(__dirname, '../../reports/tests/junit'),
  coverageDir: process.env.COVERAGE_DIR || path.join(__dirname, '../../reports/tests/coverage'),
  format: process.env.FORMAT || 'all',
};

// Parse JUnit XML results
function parseJunitResults(junitDir) {
  const results = {
    suites: [],
    totals: {
      tests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      errors: 0,
      time: 0,
    },
  };

  if (!fs.existsSync(junitDir)) {
    return results;
  }

  const files = fs.readdirSync(junitDir).filter(f => f.endsWith('.xml'));

  for (const file of files) {
    const content = fs.readFileSync(path.join(junitDir, file), 'utf8');

    // Simple XML parsing for JUnit format
    const testsMatch = content.match(/tests="(\d+)"/);
    const failuresMatch = content.match(/failures="(\d+)"/);
    const errorsMatch = content.match(/errors="(\d+)"/);
    const skippedMatch = content.match(/skipped="(\d+)"/);
    const timeMatch = content.match(/time="([\d.]+)"/);

    const tests = testsMatch ? parseInt(testsMatch[1]) : 0;
    const failures = failuresMatch ? parseInt(failuresMatch[1]) : 0;
    const errors = errorsMatch ? parseInt(errorsMatch[1]) : 0;
    const skipped = skippedMatch ? parseInt(skippedMatch[1]) : 0;
    const time = timeMatch ? parseFloat(timeMatch[1]) : 0;

    results.suites.push({
      name: file.replace('.xml', ''),
      tests,
      passed: tests - failures - errors - skipped,
      failed: failures,
      errors,
      skipped,
      time,
    });

    results.totals.tests += tests;
    results.totals.passed += tests - failures - errors - skipped;
    results.totals.failed += failures;
    results.totals.errors += errors;
    results.totals.skipped += skipped;
    results.totals.time += time;
  }

  return results;
}

// Parse coverage summary
function parseCoverageResults(coverageDir) {
  const coverageSummaryPath = path.join(coverageDir, 'coverage-summary.json');
  const defaultCoverage = {
    lines: { total: 0, covered: 0, pct: 0 },
    statements: { total: 0, covered: 0, pct: 0 },
    functions: { total: 0, covered: 0, pct: 0 },
    branches: { total: 0, covered: 0, pct: 0 },
  };

  if (!fs.existsSync(coverageSummaryPath)) {
    return defaultCoverage;
  }

  try {
    const data = JSON.parse(fs.readFileSync(coverageSummaryPath, 'utf8'));
    return data.total || defaultCoverage;
  } catch {
    return defaultCoverage;
  }
}

// Calculate test health score
function calculateHealthScore(results, coverage) {
  let score = 100;

  // Deduct for failed tests
  if (results.totals.tests > 0) {
    const failureRate = (results.totals.failed + results.totals.errors) / results.totals.tests;
    score -= failureRate * 50;
  }

  // Deduct for low coverage
  const avgCoverage = (
    coverage.lines.pct +
    coverage.statements.pct +
    coverage.functions.pct +
    coverage.branches.pct
  ) / 4;

  if (avgCoverage < 80) {
    score -= (80 - avgCoverage) * 0.5;
  }

  return Math.max(0, Math.round(score));
}

// Generate Markdown report
function generateMarkdownReport(results, coverage, healthScore) {
  const timestamp = new Date().toISOString();
  const passRate = results.totals.tests > 0
    ? ((results.totals.passed / results.totals.tests) * 100).toFixed(1)
    : 0;

  let report = `# Integration Test Report

**Generated:** ${timestamp}
**Project:** KitchenXpert

---

## Summary

### Health Score: ${healthScore}/100

| Metric | Value |
|--------|-------|
| Total Tests | ${results.totals.tests} |
| Passed | ${results.totals.passed} |
| Failed | ${results.totals.failed} |
| Errors | ${results.totals.errors} |
| Skipped | ${results.totals.skipped} |
| Pass Rate | ${passRate}% |
| Duration | ${results.totals.time.toFixed(2)}s |

---

## Coverage

| Type | Total | Covered | Percentage |
|------|-------|---------|------------|
| Lines | ${coverage.lines.total} | ${coverage.lines.covered} | ${coverage.lines.pct}% |
| Statements | ${coverage.statements.total} | ${coverage.statements.covered} | ${coverage.statements.pct}% |
| Functions | ${coverage.functions.total} | ${coverage.functions.covered} | ${coverage.functions.pct}% |
| Branches | ${coverage.branches.total} | ${coverage.branches.covered} | ${coverage.branches.pct}% |

---

## Test Suites

`;

  for (const suite of results.suites) {
    const suitePassRate = suite.tests > 0
      ? ((suite.passed / suite.tests) * 100).toFixed(1)
      : 0;
    const status = suite.failed === 0 && suite.errors === 0 ? '✅' : '❌';

    report += `### ${status} ${suite.name}

| Metric | Value |
|--------|-------|
| Tests | ${suite.tests} |
| Passed | ${suite.passed} |
| Failed | ${suite.failed} |
| Errors | ${suite.errors} |
| Pass Rate | ${suitePassRate}% |
| Duration | ${suite.time.toFixed(2)}s |

`;
  }

  report += `---

## Recommendations

`;

  if (results.totals.failed > 0 || results.totals.errors > 0) {
    report += `- ⚠️ **Fix failing tests** - ${results.totals.failed + results.totals.errors} test(s) need attention\n`;
  }

  if (coverage.lines.pct < 80) {
    report += `- 📊 **Improve line coverage** - Currently at ${coverage.lines.pct}%, target is 80%\n`;
  }

  if (coverage.branches.pct < 70) {
    report += `- 🌿 **Improve branch coverage** - Currently at ${coverage.branches.pct}%, target is 70%\n`;
  }

  if (results.totals.skipped > 0) {
    report += `- ⏭️ **Review skipped tests** - ${results.totals.skipped} test(s) are being skipped\n`;
  }

  if (results.totals.failed === 0 && results.totals.errors === 0 && coverage.lines.pct >= 80) {
    report += `- ✅ All tests passing with good coverage!\n`;
  }

  report += `
---

*Generated by KitchenXpert Test Report Generator*
`;

  return report;
}

// Generate HTML report
function generateHtmlReport(results, coverage, healthScore) {
  const timestamp = new Date().toISOString();
  const passRate = results.totals.tests > 0
    ? ((results.totals.passed / results.totals.tests) * 100).toFixed(1)
    : 0;

  const scoreColor = healthScore >= 80 ? '#28a745' : healthScore >= 60 ? '#ffc107' : '#dc3545';

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Integration Test Report - KitchenXpert</title>
    <style>
        :root {
            --primary: #2c3e50;
            --success: #28a745;
            --warning: #ffc107;
            --danger: #dc3545;
            --info: #17a2b8;
            --light: #f8f9fa;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--light);
            color: #333;
            line-height: 1.6;
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        header {
            background: var(--primary);
            color: white;
            padding: 30px 0;
            text-align: center;
        }
        header h1 { font-size: 2rem; margin-bottom: 5px; }
        header p { opacity: 0.8; }
        .score-card {
            background: white;
            border-radius: 12px;
            padding: 30px;
            margin: 20px 0;
            text-align: center;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .score {
            font-size: 4rem;
            font-weight: bold;
            color: ${scoreColor};
        }
        .metrics {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .metric {
            background: white;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .metric-value {
            font-size: 2rem;
            font-weight: bold;
        }
        .metric-label { color: #666; font-size: 0.85rem; }
        .passed { color: var(--success); }
        .failed { color: var(--danger); }
        .skipped { color: var(--warning); }
        section {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        section h2 {
            color: var(--primary);
            border-bottom: 2px solid var(--light);
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #eee;
        }
        th { background: var(--light); font-weight: 600; }
        .progress-bar {
            height: 8px;
            background: #e9ecef;
            border-radius: 4px;
            overflow: hidden;
        }
        .progress-fill {
            height: 100%;
            transition: width 0.3s;
        }
        footer {
            text-align: center;
            padding: 20px;
            color: #666;
        }
    </style>
</head>
<body>
    <header>
        <div class="container">
            <h1>🧪 Integration Test Report</h1>
            <p>KitchenXpert - ${timestamp}</p>
        </div>
    </header>

    <div class="container">
        <div class="score-card">
            <div class="score">${healthScore}</div>
            <div>Health Score</div>
        </div>

        <div class="metrics">
            <div class="metric">
                <div class="metric-value">${results.totals.tests}</div>
                <div class="metric-label">Total Tests</div>
            </div>
            <div class="metric">
                <div class="metric-value passed">${results.totals.passed}</div>
                <div class="metric-label">Passed</div>
            </div>
            <div class="metric">
                <div class="metric-value failed">${results.totals.failed}</div>
                <div class="metric-label">Failed</div>
            </div>
            <div class="metric">
                <div class="metric-value skipped">${results.totals.skipped}</div>
                <div class="metric-label">Skipped</div>
            </div>
            <div class="metric">
                <div class="metric-value">${passRate}%</div>
                <div class="metric-label">Pass Rate</div>
            </div>
            <div class="metric">
                <div class="metric-value">${results.totals.time.toFixed(1)}s</div>
                <div class="metric-label">Duration</div>
            </div>
        </div>

        <section>
            <h2>📊 Code Coverage</h2>
            <table>
                <tr>
                    <th>Type</th>
                    <th>Coverage</th>
                    <th>Progress</th>
                </tr>
                <tr>
                    <td>Lines</td>
                    <td>${coverage.lines.pct}%</td>
                    <td>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${coverage.lines.pct}%; background: ${coverage.lines.pct >= 80 ? 'var(--success)' : 'var(--warning)'}"></div>
                        </div>
                    </td>
                </tr>
                <tr>
                    <td>Statements</td>
                    <td>${coverage.statements.pct}%</td>
                    <td>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${coverage.statements.pct}%; background: ${coverage.statements.pct >= 80 ? 'var(--success)' : 'var(--warning)'}"></div>
                        </div>
                    </td>
                </tr>
                <tr>
                    <td>Functions</td>
                    <td>${coverage.functions.pct}%</td>
                    <td>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${coverage.functions.pct}%; background: ${coverage.functions.pct >= 80 ? 'var(--success)' : 'var(--warning)'}"></div>
                        </div>
                    </td>
                </tr>
                <tr>
                    <td>Branches</td>
                    <td>${coverage.branches.pct}%</td>
                    <td>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${coverage.branches.pct}%; background: ${coverage.branches.pct >= 70 ? 'var(--success)' : 'var(--warning)'}"></div>
                        </div>
                    </td>
                </tr>
            </table>
        </section>

        <section>
            <h2>📋 Test Suites</h2>
            <table>
                <tr>
                    <th>Suite</th>
                    <th>Tests</th>
                    <th>Passed</th>
                    <th>Failed</th>
                    <th>Duration</th>
                    <th>Status</th>
                </tr>
                ${results.suites.map(suite => `
                <tr>
                    <td>${suite.name}</td>
                    <td>${suite.tests}</td>
                    <td class="passed">${suite.passed}</td>
                    <td class="failed">${suite.failed}</td>
                    <td>${suite.time.toFixed(2)}s</td>
                    <td>${suite.failed === 0 && suite.errors === 0 ? '✅' : '❌'}</td>
                </tr>
                `).join('')}
            </table>
        </section>
    </div>

    <footer>
        <p>Generated by KitchenXpert Test Report Generator</p>
    </footer>
</body>
</html>`;
}

// Generate JSON report
function generateJsonReport(results, coverage, healthScore) {
  return JSON.stringify({
    meta: {
      generated: new Date().toISOString(),
      project: 'KitchenXpert',
      type: 'integration-test-report',
    },
    summary: {
      healthScore,
      passRate: results.totals.tests > 0
        ? ((results.totals.passed / results.totals.tests) * 100).toFixed(1)
        : 0,
    },
    tests: results,
    coverage,
  }, null, 2);
}

async function main() {
  console.log('');
  console.log(`${colors.blue}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║${colors.reset}      KitchenXpert - Test Report Generator                  ${colors.blue}║${colors.reset}`);
  console.log(`${colors.blue}╚════════════════════════════════════════════════════════════╝${colors.reset}`);
  console.log('');

  // Create output directory
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
  }

  // Collect results
  log('INFO', 'Collecting test results...');
  const results = parseJunitResults(config.junitDir);
  log('SUCCESS', `Found ${results.suites.length} test suite(s)`);

  log('INFO', 'Collecting coverage data...');
  const coverage = parseCoverageResults(config.coverageDir);
  log('SUCCESS', `Line coverage: ${coverage.lines.pct}%`);

  // Calculate health score
  const healthScore = calculateHealthScore(results, coverage);
  log('INFO', `Health score: ${healthScore}/100`);

  // Generate reports
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  if (config.format === 'all' || config.format === 'md') {
    const mdReport = generateMarkdownReport(results, coverage, healthScore);
    const mdPath = path.join(config.outputDir, `test-report-${timestamp}.md`);
    fs.writeFileSync(mdPath, mdReport);
    log('SUCCESS', `Markdown report: ${mdPath}`);
  }

  if (config.format === 'all' || config.format === 'html') {
    const htmlReport = generateHtmlReport(results, coverage, healthScore);
    const htmlPath = path.join(config.outputDir, `test-report-${timestamp}.html`);
    fs.writeFileSync(htmlPath, htmlReport);
    log('SUCCESS', `HTML report: ${htmlPath}`);
  }

  if (config.format === 'all' || config.format === 'json') {
    const jsonReport = generateJsonReport(results, coverage, healthScore);
    const jsonPath = path.join(config.outputDir, `test-report-${timestamp}.json`);
    fs.writeFileSync(jsonPath, jsonReport);
    log('SUCCESS', `JSON report: ${jsonPath}`);
  }

  console.log('');
  console.log(`${colors.green}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.green}║${colors.reset}        Test Report Generation Complete                     ${colors.green}║${colors.reset}`);
  console.log(`${colors.green}╚════════════════════════════════════════════════════════════╝${colors.reset}`);
  console.log('');
  console.log(`  Health Score: ${healthScore}/100`);
  console.log(`  Tests:        ${results.totals.passed}/${results.totals.tests} passed`);
  console.log(`  Coverage:     ${coverage.lines.pct}% lines`);
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
    case '--junit':
      config.junitDir = args[++i];
      break;
    case '--coverage':
      config.coverageDir = args[++i];
      break;
    case '--format':
    case '-f':
      config.format = args[++i];
      break;
    case '--help':
      console.log('Usage: report-test-results.js [options]');
      console.log('');
      console.log('Options:');
      console.log('  -o, --output <dir>    Output directory for reports');
      console.log('  --junit <dir>         JUnit XML results directory');
      console.log('  --coverage <dir>      Coverage results directory');
      console.log('  -f, --format <format> Output format: md, html, json, all');
      console.log('  --help                Show this help message');
      process.exit(0);
  }
}

main().catch((error) => {
  log('ERROR', `Failed to generate report: ${error.message}`);
  process.exit(1);
});
