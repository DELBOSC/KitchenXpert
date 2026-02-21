#!/bin/bash
#
# Security Report Generator - KitchenXpert
#
# Generates comprehensive security reports from all security scans.
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
REPORTS_DIR="${REPORTS_DIR:-$PROJECT_ROOT/reports/security}"
OUTPUT_FORMAT="${OUTPUT_FORMAT:-all}"
REPORT_DATE=$(date +%Y%m%d_%H%M%S)
INCLUDE_RECOMMENDATIONS="${INCLUDE_RECOMMENDATIONS:-true}"

# Logging
log() {
    local level=$1
    local message=$2
    case $level in
        "INFO")    echo -e "${BLUE}[REPORT]${NC} $message" ;;
        "SUCCESS") echo -e "${GREEN}[REPORT]${NC} $message" ;;
        "WARNING") echo -e "${YELLOW}[REPORT]${NC} $message" ;;
        "ERROR")   echo -e "${RED}[REPORT]${NC} $message" ;;
        "STEP")    echo -e "${CYAN}[STEP]${NC} $message" ;;
    esac
}

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}        KitchenXpert - Security Report Generator            ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

collect_scan_results() {
    log "STEP" "Collecting security scan results..."

    # Initialize counters
    TOTAL_CRITICAL=0
    TOTAL_HIGH=0
    TOTAL_MEDIUM=0
    TOTAL_LOW=0
    TOTAL_INFO=0

    # Collect from findings files
    if [ -d "$REPORTS_DIR" ]; then
        # Count findings by severity
        for file in "$REPORTS_DIR"/findings_*.txt "$REPORTS_DIR"/*/findings_*.txt 2>/dev/null; do
            if [ -f "$file" ]; then
                local critical=$(grep -c "^critical|" "$file" 2>/dev/null || echo "0")
                local high=$(grep -c "^high|" "$file" 2>/dev/null || echo "0")
                local medium=$(grep -c "^medium|" "$file" 2>/dev/null || echo "0")
                local low=$(grep -c "^low|" "$file" 2>/dev/null || echo "0")
                local info=$(grep -c "^info|" "$file" 2>/dev/null || echo "0")

                TOTAL_CRITICAL=$((TOTAL_CRITICAL + critical))
                TOTAL_HIGH=$((TOTAL_HIGH + high))
                TOTAL_MEDIUM=$((TOTAL_MEDIUM + medium))
                TOTAL_LOW=$((TOTAL_LOW + low))
                TOTAL_INFO=$((TOTAL_INFO + info))
            fi
        done
    fi

    log "SUCCESS" "Collected scan results"
}

collect_dependency_vulnerabilities() {
    log "STEP" "Collecting dependency vulnerabilities..."

    DEP_CRITICAL=0
    DEP_HIGH=0
    DEP_MODERATE=0
    DEP_LOW=0

    # Check for npm audit results
    local audit_file="$REPORTS_DIR/dependency_audit_*.json"
    if ls $audit_file 1> /dev/null 2>&1; then
        local latest_audit=$(ls -t $audit_file 2>/dev/null | head -1)
        if [ -f "$latest_audit" ]; then
            DEP_CRITICAL=$(jq '.metadata.vulnerabilities.critical // 0' "$latest_audit" 2>/dev/null || echo "0")
            DEP_HIGH=$(jq '.metadata.vulnerabilities.high // 0' "$latest_audit" 2>/dev/null || echo "0")
            DEP_MODERATE=$(jq '.metadata.vulnerabilities.moderate // 0' "$latest_audit" 2>/dev/null || echo "0")
            DEP_LOW=$(jq '.metadata.vulnerabilities.low // 0' "$latest_audit" 2>/dev/null || echo "0")
        fi
    fi

    log "SUCCESS" "Collected dependency data"
}

collect_ssl_status() {
    log "STEP" "Collecting SSL certificate status..."

    SSL_VALID=0
    SSL_EXPIRING=0
    SSL_EXPIRED=0

    # Check SSL report files
    for file in "$REPORTS_DIR"/ssl_*.txt 2>/dev/null; do
        if [ -f "$file" ]; then
            local valid=$(grep -c "valid" "$file" 2>/dev/null || echo "0")
            local expiring=$(grep -c "expiring" "$file" 2>/dev/null || echo "0")
            local expired=$(grep -c "expired" "$file" 2>/dev/null || echo "0")

            SSL_VALID=$((SSL_VALID + valid))
            SSL_EXPIRING=$((SSL_EXPIRING + expiring))
            SSL_EXPIRED=$((SSL_EXPIRED + expired))
        fi
    done

    log "SUCCESS" "Collected SSL status"
}

calculate_security_score() {
    log "STEP" "Calculating security score..."

    # Base score of 100, deduct points for issues
    SECURITY_SCORE=100

    # Critical: -20 points each
    SECURITY_SCORE=$((SECURITY_SCORE - (TOTAL_CRITICAL * 20)))

    # High: -10 points each
    SECURITY_SCORE=$((SECURITY_SCORE - (TOTAL_HIGH * 10)))

    # Medium: -5 points each
    SECURITY_SCORE=$((SECURITY_SCORE - (TOTAL_MEDIUM * 5)))

    # Low: -2 points each
    SECURITY_SCORE=$((SECURITY_SCORE - (TOTAL_LOW * 2)))

    # Dependency vulnerabilities
    SECURITY_SCORE=$((SECURITY_SCORE - (DEP_CRITICAL * 15)))
    SECURITY_SCORE=$((SECURITY_SCORE - (DEP_HIGH * 8)))

    # SSL issues
    SECURITY_SCORE=$((SECURITY_SCORE - (SSL_EXPIRED * 25)))
    SECURITY_SCORE=$((SECURITY_SCORE - (SSL_EXPIRING * 10)))

    # Ensure minimum of 0
    [ $SECURITY_SCORE -lt 0 ] && SECURITY_SCORE=0

    # Determine grade
    if [ $SECURITY_SCORE -ge 90 ]; then
        SECURITY_GRADE="A"
        GRADE_COLOR="$GREEN"
    elif [ $SECURITY_SCORE -ge 80 ]; then
        SECURITY_GRADE="B"
        GRADE_COLOR="$GREEN"
    elif [ $SECURITY_SCORE -ge 70 ]; then
        SECURITY_GRADE="C"
        GRADE_COLOR="$YELLOW"
    elif [ $SECURITY_SCORE -ge 60 ]; then
        SECURITY_GRADE="D"
        GRADE_COLOR="$YELLOW"
    else
        SECURITY_GRADE="F"
        GRADE_COLOR="$RED"
    fi

    log "SUCCESS" "Security score: $SECURITY_SCORE ($SECURITY_GRADE)"
}

generate_markdown_report() {
    log "STEP" "Generating Markdown report..."

    local report_file="$REPORTS_DIR/security_report_$REPORT_DATE.md"

    cat > "$report_file" << EOF
# Security Report - KitchenXpert

**Generated:** $(date '+%Y-%m-%d %H:%M:%S')
**Report ID:** SEC-$REPORT_DATE

---

## Executive Summary

### Security Score: $SECURITY_SCORE/100 (Grade: $SECURITY_GRADE)

| Metric | Value |
|--------|-------|
| Critical Issues | $TOTAL_CRITICAL |
| High Issues | $TOTAL_HIGH |
| Medium Issues | $TOTAL_MEDIUM |
| Low Issues | $TOTAL_LOW |
| Informational | $TOTAL_INFO |

---

## Vulnerability Overview

### Code Vulnerabilities

| Severity | Count | Status |
|----------|-------|--------|
| Critical | $TOTAL_CRITICAL | $([ $TOTAL_CRITICAL -eq 0 ] && echo "✅ None" || echo "❌ Action Required") |
| High | $TOTAL_HIGH | $([ $TOTAL_HIGH -eq 0 ] && echo "✅ None" || echo "⚠️ Review Required") |
| Medium | $TOTAL_MEDIUM | $([ $TOTAL_MEDIUM -eq 0 ] && echo "✅ None" || echo "⚠️ Monitor") |
| Low | $TOTAL_LOW | $([ $TOTAL_LOW -eq 0 ] && echo "✅ None" || echo "ℹ️ Low Priority") |

### Dependency Vulnerabilities

| Severity | Count |
|----------|-------|
| Critical | $DEP_CRITICAL |
| High | $DEP_HIGH |
| Moderate | $DEP_MODERATE |
| Low | $DEP_LOW |

### SSL Certificate Status

| Status | Count |
|--------|-------|
| Valid | $SSL_VALID |
| Expiring Soon | $SSL_EXPIRING |
| Expired | $SSL_EXPIRED |

---

## Detailed Findings

EOF

    # Add detailed findings from each scan
    for findings_file in "$REPORTS_DIR"/findings_*.txt "$REPORTS_DIR"/*/findings_*.txt 2>/dev/null; do
        if [ -f "$findings_file" ]; then
            local scan_name=$(basename "$(dirname "$findings_file")" 2>/dev/null || echo "general")
            echo "### $scan_name Findings" >> "$report_file"
            echo "" >> "$report_file"
            echo "| Severity | Category | Location | Description |" >> "$report_file"
            echo "|----------|----------|----------|-------------|" >> "$report_file"

            while IFS='|' read -r severity category location description; do
                echo "| $severity | $category | \`$location\` | $description |" >> "$report_file"
            done < "$findings_file"

            echo "" >> "$report_file"
        fi
    done

    if [ "$INCLUDE_RECOMMENDATIONS" = "true" ]; then
        cat >> "$report_file" << EOF

---

## Recommendations

### Immediate Actions (Critical/High)

1. **Fix all critical vulnerabilities** - These pose immediate security risks
2. **Update vulnerable dependencies** - Run \`pnpm audit fix\` to auto-fix where possible
3. **Renew expiring SSL certificates** - Certificates expiring within 30 days need attention
4. **Remove hardcoded secrets** - Move all secrets to environment variables

### Short-term Actions (Medium)

1. Review and fix medium-severity code vulnerabilities
2. Implement Content Security Policy headers
3. Enable rate limiting on all API endpoints
4. Review CORS configuration

### Long-term Improvements

1. Implement automated security scanning in CI/CD pipeline
2. Conduct regular penetration testing
3. Set up security monitoring and alerting
4. Provide security training for development team

---

## Compliance Checklist

- [ ] OWASP Top 10 vulnerabilities addressed
- [ ] Dependency vulnerabilities remediated
- [ ] SSL/TLS properly configured
- [ ] Security headers implemented
- [ ] Input validation in place
- [ ] Authentication/Authorization reviewed
- [ ] Logging and monitoring enabled
- [ ] Incident response plan documented

---

## Appendix

### Scan Configuration

- Scan Date: $(date '+%Y-%m-%d %H:%M:%S')
- Project Root: $PROJECT_ROOT
- Reports Directory: $REPORTS_DIR

### Tools Used

- Static Code Analysis (custom patterns)
- Dependency Audit (npm/pnpm audit)
- SSL Certificate Checker (OpenSSL)
- Permissions Audit
- Penetration Testing Suite

---

*Generated by KitchenXpert Security Report Generator*
EOF
    fi

    log "SUCCESS" "Markdown report: $report_file"
    echo "$report_file"
}

generate_html_report() {
    log "STEP" "Generating HTML report..."

    local report_file="$REPORTS_DIR/security_report_$REPORT_DATE.html"

    # Determine status colors
    local score_color="#28a745"
    [ $SECURITY_SCORE -lt 80 ] && score_color="#ffc107"
    [ $SECURITY_SCORE -lt 60 ] && score_color="#dc3545"

    cat > "$report_file" << EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Security Report - KitchenXpert</title>
    <style>
        :root {
            --primary: #2c3e50;
            --success: #28a745;
            --warning: #ffc107;
            --danger: #dc3545;
            --info: #17a2b8;
            --light: #f8f9fa;
            --dark: #343a40;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--light);
            color: var(--dark);
            line-height: 1.6;
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        header {
            background: var(--primary);
            color: white;
            padding: 30px 0;
            text-align: center;
        }
        header h1 { font-size: 2.5rem; margin-bottom: 10px; }
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
            color: $score_color;
        }
        .grade {
            font-size: 2rem;
            color: var(--dark);
            margin-top: 10px;
        }
        .metrics {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .metric-card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .metric-value {
            font-size: 2.5rem;
            font-weight: bold;
        }
        .metric-label { color: #666; font-size: 0.9rem; }
        .critical { color: var(--danger); }
        .high { color: #e67e22; }
        .medium { color: var(--warning); }
        .low { color: var(--info); }
        .success { color: var(--success); }
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
            border-bottom: 1px solid var(--light);
        }
        th { background: var(--light); font-weight: 600; }
        tr:hover { background: #f5f5f5; }
        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 600;
        }
        .badge-critical { background: #f8d7da; color: var(--danger); }
        .badge-high { background: #ffe5d0; color: #e67e22; }
        .badge-medium { background: #fff3cd; color: #856404; }
        .badge-low { background: #d1ecf1; color: var(--info); }
        .recommendations {
            list-style: none;
        }
        .recommendations li {
            padding: 10px 0;
            border-bottom: 1px solid var(--light);
        }
        .recommendations li:before {
            content: "→";
            margin-right: 10px;
            color: var(--primary);
        }
        footer {
            text-align: center;
            padding: 30px;
            color: #666;
        }
    </style>
</head>
<body>
    <header>
        <div class="container">
            <h1>🔒 Security Report</h1>
            <p>KitchenXpert - Generated $(date '+%Y-%m-%d %H:%M:%S')</p>
        </div>
    </header>

    <div class="container">
        <div class="score-card">
            <div class="score">$SECURITY_SCORE</div>
            <div class="grade">Grade: $SECURITY_GRADE</div>
        </div>

        <div class="metrics">
            <div class="metric-card">
                <div class="metric-value critical">$TOTAL_CRITICAL</div>
                <div class="metric-label">Critical Issues</div>
            </div>
            <div class="metric-card">
                <div class="metric-value high">$TOTAL_HIGH</div>
                <div class="metric-label">High Issues</div>
            </div>
            <div class="metric-card">
                <div class="metric-value medium">$TOTAL_MEDIUM</div>
                <div class="metric-label">Medium Issues</div>
            </div>
            <div class="metric-card">
                <div class="metric-value low">$TOTAL_LOW</div>
                <div class="metric-label">Low Issues</div>
            </div>
        </div>

        <section>
            <h2>📦 Dependency Vulnerabilities</h2>
            <table>
                <tr>
                    <th>Severity</th>
                    <th>Count</th>
                    <th>Status</th>
                </tr>
                <tr>
                    <td><span class="badge badge-critical">Critical</span></td>
                    <td>$DEP_CRITICAL</td>
                    <td>$([ $DEP_CRITICAL -eq 0 ] && echo "✅ None" || echo "❌ Fix Required")</td>
                </tr>
                <tr>
                    <td><span class="badge badge-high">High</span></td>
                    <td>$DEP_HIGH</td>
                    <td>$([ $DEP_HIGH -eq 0 ] && echo "✅ None" || echo "⚠️ Review")</td>
                </tr>
                <tr>
                    <td><span class="badge badge-medium">Moderate</span></td>
                    <td>$DEP_MODERATE</td>
                    <td>$([ $DEP_MODERATE -eq 0 ] && echo "✅ None" || echo "ℹ️ Monitor")</td>
                </tr>
                <tr>
                    <td><span class="badge badge-low">Low</span></td>
                    <td>$DEP_LOW</td>
                    <td>$([ $DEP_LOW -eq 0 ] && echo "✅ None" || echo "ℹ️ Low Priority")</td>
                </tr>
            </table>
        </section>

        <section>
            <h2>🔐 SSL Certificate Status</h2>
            <table>
                <tr>
                    <th>Status</th>
                    <th>Count</th>
                </tr>
                <tr>
                    <td>✅ Valid</td>
                    <td>$SSL_VALID</td>
                </tr>
                <tr>
                    <td>⚠️ Expiring Soon</td>
                    <td>$SSL_EXPIRING</td>
                </tr>
                <tr>
                    <td>❌ Expired</td>
                    <td>$SSL_EXPIRED</td>
                </tr>
            </table>
        </section>

        <section>
            <h2>📋 Recommendations</h2>
            <ul class="recommendations">
                <li><strong>Critical:</strong> Fix all critical vulnerabilities immediately</li>
                <li><strong>Dependencies:</strong> Run <code>pnpm audit fix</code> to resolve dependency issues</li>
                <li><strong>SSL:</strong> Renew any expiring certificates before they expire</li>
                <li><strong>Secrets:</strong> Move hardcoded secrets to environment variables</li>
                <li><strong>Headers:</strong> Implement security headers (CSP, HSTS, X-Frame-Options)</li>
                <li><strong>Rate Limiting:</strong> Enable rate limiting on authentication endpoints</li>
                <li><strong>CI/CD:</strong> Add security scanning to deployment pipeline</li>
            </ul>
        </section>
    </div>

    <footer>
        <p>Generated by KitchenXpert Security Report Generator</p>
        <p>Report ID: SEC-$REPORT_DATE</p>
    </footer>
</body>
</html>
EOF

    log "SUCCESS" "HTML report: $report_file"
    echo "$report_file"
}

generate_json_report() {
    log "STEP" "Generating JSON report..."

    local report_file="$REPORTS_DIR/security_report_$REPORT_DATE.json"

    cat > "$report_file" << EOF
{
  "report": {
    "id": "SEC-$REPORT_DATE",
    "generated": "$(date -Iseconds)",
    "project": "KitchenXpert"
  },
  "summary": {
    "score": $SECURITY_SCORE,
    "grade": "$SECURITY_GRADE",
    "status": "$([ $SECURITY_SCORE -ge 80 ] && echo "healthy" || ([ $SECURITY_SCORE -ge 60 ] && echo "warning" || echo "critical"))"
  },
  "vulnerabilities": {
    "code": {
      "critical": $TOTAL_CRITICAL,
      "high": $TOTAL_HIGH,
      "medium": $TOTAL_MEDIUM,
      "low": $TOTAL_LOW,
      "info": $TOTAL_INFO,
      "total": $((TOTAL_CRITICAL + TOTAL_HIGH + TOTAL_MEDIUM + TOTAL_LOW + TOTAL_INFO))
    },
    "dependencies": {
      "critical": $DEP_CRITICAL,
      "high": $DEP_HIGH,
      "moderate": $DEP_MODERATE,
      "low": $DEP_LOW,
      "total": $((DEP_CRITICAL + DEP_HIGH + DEP_MODERATE + DEP_LOW))
    }
  },
  "ssl": {
    "valid": $SSL_VALID,
    "expiring": $SSL_EXPIRING,
    "expired": $SSL_EXPIRED
  },
  "recommendations": [
    {
      "priority": "critical",
      "action": "Fix all critical vulnerabilities",
      "impact": "high"
    },
    {
      "priority": "high",
      "action": "Update vulnerable dependencies",
      "impact": "high"
    },
    {
      "priority": "medium",
      "action": "Implement security headers",
      "impact": "medium"
    },
    {
      "priority": "medium",
      "action": "Enable rate limiting",
      "impact": "medium"
    }
  ]
}
EOF

    log "SUCCESS" "JSON report: $report_file"
    echo "$report_file"
}

print_summary() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}           Security Report Generated                        ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  Security Score: ${GRADE_COLOR}$SECURITY_SCORE/100 (Grade: $SECURITY_GRADE)${NC}"
    echo ""
    echo "  Findings Summary:"
    echo "    Critical: $TOTAL_CRITICAL"
    echo "    High:     $TOTAL_HIGH"
    echo "    Medium:   $TOTAL_MEDIUM"
    echo "    Low:      $TOTAL_LOW"
    echo ""
    echo "  Reports: $REPORTS_DIR"
    echo ""
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --output|-o)
            REPORTS_DIR="$2"
            shift 2
            ;;
        --format|-f)
            OUTPUT_FORMAT="$2"
            shift 2
            ;;
        --no-recommendations)
            INCLUDE_RECOMMENDATIONS="false"
            shift
            ;;
        --help)
            echo "Usage: security-report.sh [options]"
            echo ""
            echo "Options:"
            echo "  -o, --output <dir>       Output directory for reports"
            echo "  -f, --format <format>    Output format: md, html, json, all (default: all)"
            echo "  --no-recommendations     Exclude recommendations section"
            echo "  --help                   Show this help message"
            echo ""
            echo "Examples:"
            echo "  security-report.sh                    # Generate all formats"
            echo "  security-report.sh -f html            # HTML only"
            echo "  security-report.sh -o ./reports       # Custom output dir"
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

mkdir -p "$REPORTS_DIR"

collect_scan_results
collect_dependency_vulnerabilities
collect_ssl_status
calculate_security_score

# Generate reports based on format
case $OUTPUT_FORMAT in
    md|markdown)
        generate_markdown_report
        ;;
    html)
        generate_html_report
        ;;
    json)
        generate_json_report
        ;;
    all|*)
        generate_markdown_report
        generate_html_report
        generate_json_report
        ;;
esac

print_summary
