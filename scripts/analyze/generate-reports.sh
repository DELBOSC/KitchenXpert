#!/bin/bash
#
# Generate Reports - KitchenXpert
#
# Generates comprehensive analysis reports combining all analysis results.
#

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Configuration
OUTPUT_DIR="$PROJECT_ROOT/reports"
RUN_ALL="${RUN_ALL:-true}"
FORMAT="${FORMAT:-html}"

# Logging
log() {
    local level=$1
    local message=$2
    case $level in
        "INFO")    echo -e "${BLUE}[REPORT]${NC} $message" ;;
        "SUCCESS") echo -e "${GREEN}[REPORT]${NC} $message" ;;
        "WARNING") echo -e "${YELLOW}[REPORT]${NC} $message" ;;
        "ERROR")   echo -e "${RED}[REPORT]${NC} $message" ;;
    esac
}

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}          KitchenXpert - Report Generator                   ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

setup_directories() {
    mkdir -p "$OUTPUT_DIR"
    mkdir -p "$OUTPUT_DIR/code-quality"
    mkdir -p "$OUTPUT_DIR/dependencies"
    mkdir -p "$OUTPUT_DIR/performance"
    mkdir -p "$OUTPUT_DIR/bundle-analysis"
    log "INFO" "Output directory: $OUTPUT_DIR"
}

run_all_analyses() {
    if [ "$RUN_ALL" = "true" ]; then
        log "INFO" "Running all analysis scripts..."

        # Code Quality
        log "INFO" "Running code quality analysis..."
        "$SCRIPT_DIR/analyze-code-quality.sh" --output "$OUTPUT_DIR/code-quality" || {
            log "WARNING" "Code quality analysis failed"
        }

        # Dependencies
        log "INFO" "Running dependency analysis..."
        "$SCRIPT_DIR/analyze-dependencies.sh" --output "$OUTPUT_DIR/dependencies" || {
            log "WARNING" "Dependency analysis failed"
        }

        # Performance
        log "INFO" "Running performance analysis..."
        "$SCRIPT_DIR/analyze-performance.sh" --output "$OUTPUT_DIR/performance" --no-build || {
            log "WARNING" "Performance analysis failed"
        }

        # Bundle Analysis
        log "INFO" "Running bundle analysis..."
        "$PROJECT_ROOT/scripts/build/analyze-bundle.sh" --output "$OUTPUT_DIR/bundle-analysis" || {
            log "WARNING" "Bundle analysis failed"
        }

        log "SUCCESS" "All analyses complete"
    fi
}

collect_metrics() {
    log "INFO" "Collecting metrics from all reports..."

    local metrics_output="$OUTPUT_DIR/combined-metrics.json"

    # Initialize metrics
    local quality_score="N/A"
    local perf_score="N/A"
    local vuln_count="N/A"
    local outdated_count="N/A"

    # Collect from code quality
    if [ -f "$OUTPUT_DIR/code-quality/quality-score.json" ]; then
        quality_score=$(cat "$OUTPUT_DIR/code-quality/quality-score.json" | grep -o '"score":[0-9]*' | grep -o '[0-9]*' || echo "N/A")
    fi

    # Collect from performance
    if [ -f "$OUTPUT_DIR/performance/performance-score.json" ]; then
        perf_score=$(cat "$OUTPUT_DIR/performance/performance-score.json" | grep -o '"score":[0-9]*' | grep -o '[0-9]*' || echo "N/A")
    fi

    # Collect from dependencies
    if [ -f "$OUTPUT_DIR/dependencies/security-audit.json" ]; then
        local critical=$(cat "$OUTPUT_DIR/dependencies/security-audit.json" | grep -o '"critical":[0-9]*' | grep -o '[0-9]*' | head -1 || echo "0")
        local high=$(cat "$OUTPUT_DIR/dependencies/security-audit.json" | grep -o '"high":[0-9]*' | grep -o '[0-9]*' | head -1 || echo "0")
        vuln_count="$((${critical:-0} + ${high:-0}))"
    fi

    if [ -f "$OUTPUT_DIR/dependencies/outdated.json" ]; then
        outdated_count=$(cat "$OUTPUT_DIR/dependencies/outdated.json" | grep -c '"current"' 2>/dev/null || echo "0")
    fi

    cat > "$metrics_output" << EOF
{
  "generatedAt": "$(date -Iseconds)",
  "project": "KitchenXpert",
  "metrics": {
    "codeQuality": {
      "score": $quality_score,
      "maxScore": 100
    },
    "performance": {
      "score": $perf_score,
      "maxScore": 100
    },
    "security": {
      "criticalVulnerabilities": ${vuln_count:-0}
    },
    "dependencies": {
      "outdatedCount": ${outdated_count:-0}
    }
  }
}
EOF

    log "SUCCESS" "Metrics collected"
}

generate_html_report() {
    log "INFO" "Generating HTML report..."

    local html_output="$OUTPUT_DIR/report.html"

    # Read metrics
    local quality_score="N/A"
    local perf_score="N/A"

    if [ -f "$OUTPUT_DIR/combined-metrics.json" ]; then
        quality_score=$(cat "$OUTPUT_DIR/combined-metrics.json" | grep -o '"codeQuality":{[^}]*"score":[0-9]*' | grep -o '"score":[0-9]*' | grep -o '[0-9]*' || echo "N/A")
        perf_score=$(cat "$OUTPUT_DIR/combined-metrics.json" | grep -o '"performance":{[^}]*"score":[0-9]*' | grep -o '"score":[0-9]*' | grep -o '[0-9]*' || echo "N/A")
    fi

    cat > "$html_output" << EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KitchenXpert - Analysis Report</title>
    <style>
        :root {
            --primary: #2563eb;
            --success: #16a34a;
            --warning: #ca8a04;
            --error: #dc2626;
            --bg: #f8fafc;
            --card: #ffffff;
            --text: #1e293b;
            --text-muted: #64748b;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg);
            color: var(--text);
            line-height: 1.6;
            padding: 2rem;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        header {
            text-align: center;
            margin-bottom: 3rem;
        }
        h1 {
            font-size: 2.5rem;
            color: var(--primary);
            margin-bottom: 0.5rem;
        }
        .subtitle {
            color: var(--text-muted);
            font-size: 1.1rem;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        .card {
            background: var(--card);
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .card h2 {
            font-size: 1rem;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 1rem;
        }
        .score {
            font-size: 3rem;
            font-weight: 700;
            line-height: 1;
        }
        .score.good { color: var(--success); }
        .score.warning { color: var(--warning); }
        .score.error { color: var(--error); }
        .score-label {
            color: var(--text-muted);
            font-size: 0.875rem;
        }
        .metric-list {
            list-style: none;
        }
        .metric-list li {
            display: flex;
            justify-content: space-between;
            padding: 0.75rem 0;
            border-bottom: 1px solid #e2e8f0;
        }
        .metric-list li:last-child { border-bottom: none; }
        .badge {
            padding: 0.25rem 0.75rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 500;
        }
        .badge.success { background: #dcfce7; color: var(--success); }
        .badge.warning { background: #fef9c3; color: var(--warning); }
        .badge.error { background: #fee2e2; color: var(--error); }
        footer {
            text-align: center;
            color: var(--text-muted);
            margin-top: 3rem;
            padding-top: 2rem;
            border-top: 1px solid #e2e8f0;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>KitchenXpert</h1>
            <p class="subtitle">Analysis Report - Generated $(date '+%Y-%m-%d %H:%M')</p>
        </header>

        <div class="grid">
            <div class="card">
                <h2>Code Quality</h2>
                <div class="score $([ "${quality_score:-0}" -ge 80 ] && echo "good" || ([ "${quality_score:-0}" -ge 60 ] && echo "warning" || echo "error"))">$quality_score</div>
                <div class="score-label">out of 100</div>
            </div>

            <div class="card">
                <h2>Performance</h2>
                <div class="score $([ "${perf_score:-0}" -ge 80 ] && echo "good" || ([ "${perf_score:-0}" -ge 60 ] && echo "warning" || echo "error"))">$perf_score</div>
                <div class="score-label">out of 100</div>
            </div>

            <div class="card">
                <h2>Security</h2>
                <ul class="metric-list">
                    <li>
                        <span>Vulnerabilities</span>
                        <span class="badge $([ "${vuln_count:-0}" -eq 0 ] && echo "success" || echo "error")">${vuln_count:-0}</span>
                    </li>
                </ul>
            </div>

            <div class="card">
                <h2>Dependencies</h2>
                <ul class="metric-list">
                    <li>
                        <span>Outdated Packages</span>
                        <span class="badge $([ "${outdated_count:-0}" -eq 0 ] && echo "success" || echo "warning")">${outdated_count:-0}</span>
                    </li>
                </ul>
            </div>
        </div>

        <div class="card">
            <h2>Report Files</h2>
            <ul class="metric-list">
                <li><span>Code Quality</span><span>reports/code-quality/</span></li>
                <li><span>Dependencies</span><span>reports/dependencies/</span></li>
                <li><span>Performance</span><span>reports/performance/</span></li>
                <li><span>Bundle Analysis</span><span>reports/bundle-analysis/</span></li>
            </ul>
        </div>

        <footer>
            <p>Generated by KitchenXpert Analysis Tools</p>
        </footer>
    </div>
</body>
</html>
EOF

    log "SUCCESS" "HTML report generated: $html_output"
}

generate_markdown_report() {
    log "INFO" "Generating Markdown report..."

    local md_output="$OUTPUT_DIR/REPORT.md"

    # Read metrics
    local quality_score="N/A"
    local perf_score="N/A"

    if [ -f "$OUTPUT_DIR/combined-metrics.json" ]; then
        quality_score=$(cat "$OUTPUT_DIR/combined-metrics.json" | grep -o '"codeQuality":{[^}]*"score":[0-9]*' | grep -o '"score":[0-9]*' | grep -o '[0-9]*' || echo "N/A")
        perf_score=$(cat "$OUTPUT_DIR/combined-metrics.json" | grep -o '"performance":{[^}]*"score":[0-9]*' | grep -o '"score":[0-9]*' | grep -o '[0-9]*' || echo "N/A")
    fi

    cat > "$md_output" << EOF
# KitchenXpert Analysis Report

Generated: $(date '+%Y-%m-%d %H:%M:%S')

## Summary

| Metric | Score | Status |
|--------|-------|--------|
| Code Quality | $quality_score/100 | $([ "${quality_score:-0}" -ge 80 ] && echo "✅ Good" || ([ "${quality_score:-0}" -ge 60 ] && echo "⚠️ Fair" || echo "❌ Needs Work")) |
| Performance | $perf_score/100 | $([ "${perf_score:-0}" -ge 80 ] && echo "✅ Good" || ([ "${perf_score:-0}" -ge 60 ] && echo "⚠️ Fair" || echo "❌ Needs Work")) |
| Security | ${vuln_count:-0} issues | $([ "${vuln_count:-0}" -eq 0 ] && echo "✅ Secure" || echo "❌ Issues Found") |
| Dependencies | ${outdated_count:-0} outdated | $([ "${outdated_count:-0}" -eq 0 ] && echo "✅ Up to date" || echo "⚠️ Updates Available") |

## Detailed Reports

- [Code Quality](./code-quality/)
- [Dependencies](./dependencies/)
- [Performance](./performance/)
- [Bundle Analysis](./bundle-analysis/)

## Recommendations

1. Review and address any security vulnerabilities
2. Update outdated dependencies
3. Monitor bundle sizes and optimize if needed
4. Address code quality issues flagged by ESLint

---

*Generated by KitchenXpert Analysis Tools*
EOF

    log "SUCCESS" "Markdown report generated: $md_output"
}

generate_json_summary() {
    log "INFO" "Generating JSON summary..."

    local json_output="$OUTPUT_DIR/summary.json"

    cat > "$json_output" << EOF
{
  "generatedAt": "$(date -Iseconds)",
  "project": "KitchenXpert",
  "reports": {
    "codeQuality": "$([ -d "$OUTPUT_DIR/code-quality" ] && echo "available" || echo "missing")",
    "dependencies": "$([ -d "$OUTPUT_DIR/dependencies" ] && echo "available" || echo "missing")",
    "performance": "$([ -d "$OUTPUT_DIR/performance" ] && echo "available" || echo "missing")",
    "bundleAnalysis": "$([ -d "$OUTPUT_DIR/bundle-analysis" ] && echo "available" || echo "missing")"
  },
  "files": {
    "html": "report.html",
    "markdown": "REPORT.md",
    "metrics": "combined-metrics.json"
  }
}
EOF

    log "SUCCESS" "JSON summary generated"
}

print_summary() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}              Reports Generated Successfully                 ${GREEN}║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "  Generated reports:"
    echo "    • $OUTPUT_DIR/report.html"
    echo "    • $OUTPUT_DIR/REPORT.md"
    echo "    • $OUTPUT_DIR/summary.json"
    echo "    • $OUTPUT_DIR/combined-metrics.json"
    echo ""
    echo "  Open HTML report:"
    echo "    open $OUTPUT_DIR/report.html"
    echo ""
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --output)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        --no-analyze)
            RUN_ALL="false"
            shift
            ;;
        --format)
            FORMAT="$2"
            shift 2
            ;;
        --help)
            echo "Usage: generate-reports.sh [options]"
            echo ""
            echo "Options:"
            echo "  --output <dir>     Output directory for reports"
            echo "  --no-analyze       Skip running analysis (use existing data)"
            echo "  --format <type>    Output format: html, markdown, both (default: html)"
            echo "  --help             Show this help message"
            exit 0
            ;;
        *)
            log "ERROR" "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Main execution
print_header
setup_directories
run_all_analyses
collect_metrics

case $FORMAT in
    html)
        generate_html_report
        ;;
    markdown)
        generate_markdown_report
        ;;
    *)
        generate_html_report
        generate_markdown_report
        ;;
esac

generate_json_summary
print_summary

exit 0
