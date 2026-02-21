#!/bin/bash
#
# Security Scan - KitchenXpert
#
# Scans codebase for security vulnerabilities and issues.
#

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Configuration
OUTPUT_DIR="${OUTPUT_DIR:-$PROJECT_ROOT/reports/security}"
SCAN_DATE=$(date +%Y%m%d_%H%M%S)

# Stats
TOTAL_FINDINGS=0
CRITICAL_FINDINGS=0
HIGH_FINDINGS=0

# Logging
log() {
    local level=$1
    local message=$2
    case $level in
        "INFO")    echo -e "${BLUE}[SCAN]${NC} $message" ;;
        "SUCCESS") echo -e "${GREEN}[SCAN]${NC} $message" ;;
        "WARNING") echo -e "${YELLOW}[SCAN]${NC} $message" ;;
        "ERROR")   echo -e "${RED}[SCAN]${NC} $message" ;;
    esac
}

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}            KitchenXpert - Security Scan                     ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

setup_output() {
    mkdir -p "$OUTPUT_DIR"
}

record_finding() {
    local severity=$1
    local category=$2
    local file=$3
    local line=$4
    local description=$5

    ((TOTAL_FINDINGS++))

    case $severity in
        "critical") ((CRITICAL_FINDINGS++)) ;;
        "high")     ((HIGH_FINDINGS++)) ;;
    esac

    echo "$severity|$category|$file:$line|$description" >> "$OUTPUT_DIR/findings_$SCAN_DATE.txt"
}

scan_hardcoded_secrets() {
    log "INFO" "Scanning for hardcoded secrets..."

    cd "$PROJECT_ROOT"

    local patterns=(
        # API keys
        'api[_-]?key["\s]*[:=]["\s]*["\x27][a-zA-Z0-9_-]{20,}["\x27]'
        # AWS credentials
        'AKIA[0-9A-Z]{16}'
        'aws[_-]?secret[_-]?access[_-]?key["\s]*[:=]'
        # Private keys
        '-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----'
        # JWT secrets
        'jwt[_-]?secret["\s]*[:=]["\s]*["\x27][^\s"]+["\x27]'
        # Database URLs with credentials
        '(mysql|postgres|mongodb)://[^:]+:[^@]+@'
        # Generic passwords
        'password["\s]*[:=]["\s]*["\x27][^"$\{][^\s"]{8,}["\x27]'
    )

    local findings=0

    for pattern in "${patterns[@]}"; do
        while IFS= read -r match; do
            local file=$(echo "$match" | cut -d: -f1)
            local line=$(echo "$match" | cut -d: -f2)
            record_finding "critical" "secrets" "$file" "$line" "Potential hardcoded secret"
            ((findings++))
        done < <(grep -rn --include="*.ts" --include="*.js" --include="*.tsx" --include="*.json" \
            -E "$pattern" . 2>/dev/null | grep -v node_modules | head -50 || true)
    done

    if [ $findings -eq 0 ]; then
        log "SUCCESS" "No hardcoded secrets found"
    else
        log "ERROR" "Found $findings potential hardcoded secrets"
    fi
}

scan_sql_injection() {
    log "INFO" "Scanning for SQL injection vulnerabilities..."

    cd "$PROJECT_ROOT"

    local patterns=(
        # String concatenation in SQL
        'query\s*\([^)]*\+\s*(req\.|params\.|body\.)'
        'execute\s*\([^)]*\+\s*(req\.|params\.|body\.)'
        '\$\{[^}]*req\.[^}]*\}'  # Template literals with req
        # Raw SQL without parameterization
        'raw\s*\([^)]*\+\s*'
    )

    local findings=0

    for pattern in "${patterns[@]}"; do
        while IFS= read -r match; do
            local file=$(echo "$match" | cut -d: -f1)
            local line=$(echo "$match" | cut -d: -f2)
            record_finding "high" "sql_injection" "$file" "$line" "Potential SQL injection"
            ((findings++))
        done < <(grep -rn --include="*.ts" --include="*.js" \
            -E "$pattern" . 2>/dev/null | grep -v node_modules | head -20 || true)
    done

    if [ $findings -eq 0 ]; then
        log "SUCCESS" "No SQL injection patterns found"
    else
        log "WARNING" "Found $findings potential SQL injection patterns"
    fi
}

scan_xss_vulnerabilities() {
    log "INFO" "Scanning for XSS vulnerabilities..."

    cd "$PROJECT_ROOT"

    local patterns=(
        'dangerouslySetInnerHTML'
        'innerHTML\s*='
        'outerHTML\s*='
        'document\.write\s*\('
        'eval\s*\('
        'new\s+Function\s*\('
    )

    local findings=0

    for pattern in "${patterns[@]}"; do
        while IFS= read -r match; do
            local file=$(echo "$match" | cut -d: -f1)
            local line=$(echo "$match" | cut -d: -f2)
            record_finding "high" "xss" "$file" "$line" "Potential XSS vulnerability: $pattern"
            ((findings++))
        done < <(grep -rn --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
            -E "$pattern" . 2>/dev/null | grep -v node_modules | head -30 || true)
    done

    if [ $findings -eq 0 ]; then
        log "SUCCESS" "No obvious XSS patterns found"
    else
        log "WARNING" "Found $findings potential XSS patterns (review required)"
    fi
}

scan_path_traversal() {
    log "INFO" "Scanning for path traversal vulnerabilities..."

    cd "$PROJECT_ROOT"

    local patterns=(
        'readFile\s*\([^)]*req\.'
        'readFileSync\s*\([^)]*req\.'
        'createReadStream\s*\([^)]*req\.'
        'path\.join\s*\([^)]*req\.'
        'fs\.[a-zA-Z]+\s*\([^)]*\+\s*req\.'
    )

    local findings=0

    for pattern in "${patterns[@]}"; do
        while IFS= read -r match; do
            local file=$(echo "$match" | cut -d: -f1)
            local line=$(echo "$match" | cut -d: -f2)
            record_finding "high" "path_traversal" "$file" "$line" "Potential path traversal"
            ((findings++))
        done < <(grep -rn --include="*.ts" --include="*.js" \
            -E "$pattern" . 2>/dev/null | grep -v node_modules | head -20 || true)
    done

    if [ $findings -eq 0 ]; then
        log "SUCCESS" "No path traversal patterns found"
    else
        log "WARNING" "Found $findings potential path traversal patterns"
    fi
}

scan_insecure_functions() {
    log "INFO" "Scanning for insecure function usage..."

    cd "$PROJECT_ROOT"

    local patterns=(
        # Crypto
        'createHash\s*\(\s*["\x27]md5["\x27]'
        'createHash\s*\(\s*["\x27]sha1["\x27]'
        # Random
        'Math\.random\s*\(' # for security purposes
        # Deserialization
        'JSON\.parse\s*\(\s*req\.'
        'unserialize\s*\('
    )

    local findings=0

    for pattern in "${patterns[@]}"; do
        local count=$(grep -rn --include="*.ts" --include="*.js" \
            -E "$pattern" . 2>/dev/null | grep -v node_modules | wc -l || echo "0")

        if [ $count -gt 0 ]; then
            log "WARNING" "Found $count uses of potentially insecure pattern: $pattern"
            ((findings += count))
        fi
    done

    if [ $findings -eq 0 ]; then
        log "SUCCESS" "No insecure function usage found"
    fi
}

scan_sensitive_data_exposure() {
    log "INFO" "Scanning for sensitive data exposure..."

    cd "$PROJECT_ROOT"

    local findings=0

    # Check for console.log with sensitive data
    while IFS= read -r match; do
        local file=$(echo "$match" | cut -d: -f1)
        local line=$(echo "$match" | cut -d: -f2)
        record_finding "medium" "data_exposure" "$file" "$line" "Logging potentially sensitive data"
        ((findings++))
    done < <(grep -rn --include="*.ts" --include="*.js" \
        -E 'console\.(log|info|debug)\s*\([^)]*password|console\.(log|info|debug)\s*\([^)]*token|console\.(log|info|debug)\s*\([^)]*secret' \
        . 2>/dev/null | grep -v node_modules | head -20 || true)

    # Check for error messages exposing stack traces
    while IFS= read -r match; do
        local file=$(echo "$match" | cut -d: -f1)
        local line=$(echo "$match" | cut -d: -f2)
        record_finding "medium" "data_exposure" "$file" "$line" "Stack trace may be exposed to user"
        ((findings++))
    done < <(grep -rn --include="*.ts" --include="*.js" \
        -E 'res\.(send|json)\s*\([^)]*\.stack' \
        . 2>/dev/null | grep -v node_modules | head -10 || true)

    if [ $findings -eq 0 ]; then
        log "SUCCESS" "No sensitive data exposure patterns found"
    else
        log "WARNING" "Found $findings potential data exposure issues"
    fi
}

scan_cors_configuration() {
    log "INFO" "Checking CORS configuration..."

    cd "$PROJECT_ROOT"

    # Check for wildcard CORS
    local wildcard_cors=$(grep -rn --include="*.ts" --include="*.js" \
        -E "cors\s*\(\s*\{[^}]*origin:\s*['\"]?\*['\"]?" . 2>/dev/null | \
        grep -v node_modules | head -5 || true)

    if [ -n "$wildcard_cors" ]; then
        log "WARNING" "Found wildcard CORS configuration (origin: '*')"
        echo "$wildcard_cors" | while read line; do
            local file=$(echo "$line" | cut -d: -f1)
            local num=$(echo "$line" | cut -d: -f2)
            record_finding "medium" "cors" "$file" "$num" "Wildcard CORS origin"
        done
    else
        log "SUCCESS" "No wildcard CORS configuration found"
    fi
}

generate_report() {
    log "INFO" "Generating scan report..."

    local report_file="$OUTPUT_DIR/scan_report_$SCAN_DATE.md"

    cat > "$report_file" << EOF
# Security Scan Report

**Scan Date:** $(date '+%Y-%m-%d %H:%M:%S')
**Project:** KitchenXpert

## Summary

| Severity | Count |
|----------|-------|
| Critical | $CRITICAL_FINDINGS |
| High     | $HIGH_FINDINGS |
| Total    | $TOTAL_FINDINGS |

## Findings

EOF

    if [ -f "$OUTPUT_DIR/findings_$SCAN_DATE.txt" ]; then
        while IFS='|' read -r severity category location description; do
            cat >> "$report_file" << EOF
### $description

- **Severity:** $severity
- **Category:** $category
- **Location:** $location

EOF
        done < "$OUTPUT_DIR/findings_$SCAN_DATE.txt"
    else
        echo "No findings." >> "$report_file"
    fi

    cat >> "$report_file" << EOF

## Recommendations

1. Review all critical and high severity findings
2. Fix hardcoded secrets immediately
3. Implement proper input validation
4. Use parameterized queries for database operations
5. Sanitize user input before rendering

---
*Generated by KitchenXpert Security Scanner*
EOF

    log "SUCCESS" "Report generated: $report_file"
}

print_summary() {
    echo ""
    if [ $CRITICAL_FINDINGS -gt 0 ]; then
        echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${RED}║${NC}       Security Scan Complete - CRITICAL ISSUES FOUND       ${RED}║${NC}"
        echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
    elif [ $HIGH_FINDINGS -gt 0 ]; then
        echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${YELLOW}║${NC}        Security Scan Complete - Issues Found               ${YELLOW}║${NC}"
        echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"
    else
        echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║${NC}          Security Scan Complete - All Clear                ${GREEN}║${NC}"
        echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    fi
    echo ""
    echo "  Total findings: $TOTAL_FINDINGS"
    echo "  Critical:       $CRITICAL_FINDINGS"
    echo "  High:           $HIGH_FINDINGS"
    echo ""
    echo "  Report: $OUTPUT_DIR/scan_report_$SCAN_DATE.md"
    echo ""
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --output|-o)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        --help)
            echo "Usage: security-scan.sh [options]"
            echo ""
            echo "Options:"
            echo "  -o, --output <dir>   Output directory for reports"
            echo "  --help               Show this help message"
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
setup_output

scan_hardcoded_secrets
scan_sql_injection
scan_xss_vulnerabilities
scan_path_traversal
scan_insecure_functions
scan_sensitive_data_exposure
scan_cors_configuration

generate_report
print_summary

# Exit code based on findings
if [ $CRITICAL_FINDINGS -gt 0 ]; then
    exit 2
elif [ $HIGH_FINDINGS -gt 0 ]; then
    exit 1
else
    exit 0
fi
