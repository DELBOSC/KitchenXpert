#!/bin/bash
#
# Security Audit - KitchenXpert
#
# Comprehensive security audit combining all security checks.
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
OUTPUT_DIR="${OUTPUT_DIR:-$PROJECT_ROOT/reports/security}"
AUDIT_DATE=$(date +%Y%m%d_%H%M%S)
AUDIT_REPORT="$OUTPUT_DIR/audit_$AUDIT_DATE"

# Stats tracking
declare -A AUDIT_RESULTS
TOTAL_ISSUES=0
CRITICAL_ISSUES=0
HIGH_ISSUES=0
MEDIUM_ISSUES=0
LOW_ISSUES=0

# Logging
log() {
    local level=$1
    local message=$2
    case $level in
        "INFO")    echo -e "${BLUE}[AUDIT]${NC} $message" ;;
        "SUCCESS") echo -e "${GREEN}[AUDIT]${NC} $message" ;;
        "WARNING") echo -e "${YELLOW}[AUDIT]${NC} $message" ;;
        "ERROR")   echo -e "${RED}[AUDIT]${NC} $message" ;;
        "STEP")    echo -e "${CYAN}[STEP]${NC} $message" ;;
    esac
}

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}            KitchenXpert - Security Audit                    ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

setup_directories() {
    mkdir -p "$OUTPUT_DIR"
    mkdir -p "$AUDIT_REPORT"

    log "INFO" "Audit report directory: $AUDIT_REPORT"
}

record_issue() {
    local severity=$1
    local category=$2
    local description=$3

    ((TOTAL_ISSUES++))

    case $severity in
        "critical") ((CRITICAL_ISSUES++)) ;;
        "high")     ((HIGH_ISSUES++)) ;;
        "medium")   ((MEDIUM_ISSUES++)) ;;
        "low")      ((LOW_ISSUES++)) ;;
    esac

    echo "$severity|$category|$description" >> "$AUDIT_REPORT/issues.txt"
}

run_dependency_audit() {
    log "STEP" "Running dependency security audit..."

    cd "$PROJECT_ROOT"

    local audit_file="$AUDIT_REPORT/dependencies.json"

    # Run npm/pnpm audit
    if pnpm audit --json > "$audit_file" 2>/dev/null; then
        log "SUCCESS" "No dependency vulnerabilities found"
        AUDIT_RESULTS["dependencies"]="pass"
    else
        local vuln_count=$(cat "$audit_file" | grep -c '"severity"' 2>/dev/null || echo "0")
        log "WARNING" "Found $vuln_count vulnerable dependencies"
        AUDIT_RESULTS["dependencies"]="fail"

        # Count by severity
        local critical=$(grep -c '"critical"' "$audit_file" 2>/dev/null || echo "0")
        local high=$(grep -c '"high"' "$audit_file" 2>/dev/null || echo "0")

        [ $critical -gt 0 ] && record_issue "critical" "dependencies" "$critical critical vulnerabilities"
        [ $high -gt 0 ] && record_issue "high" "dependencies" "$high high vulnerabilities"
    fi
}

run_secrets_scan() {
    log "STEP" "Scanning for exposed secrets..."

    cd "$PROJECT_ROOT"

    local secrets_file="$AUDIT_REPORT/secrets.txt"
    local found_secrets=0

    # Patterns to search for
    local patterns=(
        "password\s*=\s*['\"][^'\"]+['\"]"
        "api[_-]?key\s*=\s*['\"][^'\"]+['\"]"
        "secret\s*=\s*['\"][^'\"]+['\"]"
        "token\s*=\s*['\"][^'\"]+['\"]"
        "AWS_ACCESS_KEY_ID"
        "AWS_SECRET_ACCESS_KEY"
        "PRIVATE_KEY"
        "-----BEGIN RSA PRIVATE KEY-----"
        "-----BEGIN OPENSSH PRIVATE KEY-----"
    )

    for pattern in "${patterns[@]}"; do
        local matches=$(grep -rn --include="*.ts" --include="*.js" --include="*.tsx" --include="*.json" \
            -E "$pattern" . 2>/dev/null | grep -v "node_modules" | grep -v ".env.example" || true)

        if [ -n "$matches" ]; then
            echo "$matches" >> "$secrets_file"
            ((found_secrets++))
        fi
    done

    if [ $found_secrets -gt 0 ]; then
        log "ERROR" "Found $found_secrets potential exposed secrets"
        AUDIT_RESULTS["secrets"]="fail"
        record_issue "critical" "secrets" "Found $found_secrets potential exposed secrets"
    else
        log "SUCCESS" "No exposed secrets found"
        AUDIT_RESULTS["secrets"]="pass"
    fi
}

run_env_file_check() {
    log "STEP" "Checking environment file security..."

    local env_issues=0

    # Check if .env files are in .gitignore
    if [ -f "$PROJECT_ROOT/.gitignore" ]; then
        if ! grep -q "^\.env$" "$PROJECT_ROOT/.gitignore"; then
            log "WARNING" ".env not in .gitignore"
            record_issue "high" "config" ".env not in .gitignore"
            ((env_issues++))
        fi
    fi

    # Check for .env files in git history
    if git -C "$PROJECT_ROOT" log --all --full-history -- "*.env" 2>/dev/null | grep -q "commit"; then
        log "WARNING" ".env files found in git history"
        record_issue "high" "config" ".env files in git history"
        ((env_issues++))
    fi

    # Check .env.example doesn't contain real values
    if [ -f "$PROJECT_ROOT/.env.example" ]; then
        if grep -qE "^[A-Z_]+=[^$\{][a-zA-Z0-9]{20,}" "$PROJECT_ROOT/.env.example"; then
            log "WARNING" ".env.example may contain real credentials"
            record_issue "medium" "config" ".env.example may contain real credentials"
            ((env_issues++))
        fi
    fi

    if [ $env_issues -eq 0 ]; then
        log "SUCCESS" "Environment file configuration is secure"
        AUDIT_RESULTS["env_files"]="pass"
    else
        AUDIT_RESULTS["env_files"]="fail"
    fi
}

run_permission_check() {
    log "STEP" "Checking file permissions..."

    local perm_issues=0

    # Check for world-writable files
    local world_writable=$(find "$PROJECT_ROOT" -type f -perm -002 -not -path "*/node_modules/*" 2>/dev/null | wc -l)

    if [ $world_writable -gt 0 ]; then
        log "WARNING" "Found $world_writable world-writable files"
        record_issue "medium" "permissions" "$world_writable world-writable files"
        ((perm_issues++))
    fi

    # Check for executable scripts without proper permissions
    local bad_scripts=$(find "$PROJECT_ROOT/scripts" -name "*.sh" -not -executable 2>/dev/null | wc -l)

    if [ $bad_scripts -gt 0 ]; then
        log "INFO" "Found $bad_scripts scripts without execute permission"
    fi

    if [ $perm_issues -eq 0 ]; then
        log "SUCCESS" "File permissions look good"
        AUDIT_RESULTS["permissions"]="pass"
    else
        AUDIT_RESULTS["permissions"]="fail"
    fi
}

run_security_headers_check() {
    log "STEP" "Checking security headers configuration..."

    local headers_file="$PROJECT_ROOT/packages/frontend/next.config.js"
    local missing_headers=0

    if [ -f "$headers_file" ]; then
        local required_headers=(
            "X-Frame-Options"
            "X-Content-Type-Options"
            "X-XSS-Protection"
            "Content-Security-Policy"
            "Strict-Transport-Security"
        )

        for header in "${required_headers[@]}"; do
            if ! grep -q "$header" "$headers_file" 2>/dev/null; then
                log "WARNING" "Missing security header: $header"
                ((missing_headers++))
            fi
        done
    else
        log "WARNING" "Cannot find Next.js config for headers check"
    fi

    if [ $missing_headers -gt 0 ]; then
        record_issue "medium" "headers" "$missing_headers missing security headers"
        AUDIT_RESULTS["headers"]="fail"
    else
        log "SUCCESS" "Security headers configuration looks good"
        AUDIT_RESULTS["headers"]="pass"
    fi
}

run_ssl_check() {
    log "STEP" "Checking SSL/TLS configuration..."

    # Run the dedicated SSL check script if available
    if [ -f "$SCRIPT_DIR/ssl-cert-check.sh" ]; then
        "$SCRIPT_DIR/ssl-cert-check.sh" --quiet > "$AUDIT_REPORT/ssl.txt" 2>&1 || true
    fi

    AUDIT_RESULTS["ssl"]="info"
    log "INFO" "SSL check completed (see ssl.txt for details)"
}

run_code_security_scan() {
    log "STEP" "Running static code security analysis..."

    cd "$PROJECT_ROOT"

    local code_issues=0

    # Check for common security anti-patterns
    local antipatterns=(
        "eval("
        "innerHTML\s*="
        "dangerouslySetInnerHTML"
        "document.write"
        "new Function("
    )

    for pattern in "${antipatterns[@]}"; do
        local count=$(grep -rn --include="*.ts" --include="*.tsx" --include="*.js" \
            "$pattern" . 2>/dev/null | grep -v "node_modules" | wc -l || echo "0")

        if [ $count -gt 0 ]; then
            log "WARNING" "Found $count instances of potentially unsafe: $pattern"
            record_issue "medium" "code" "$count instances of $pattern"
            ((code_issues++))
        fi
    done

    # Check for SQL injection patterns
    local sql_issues=$(grep -rn --include="*.ts" --include="*.js" \
        "query.*\+.*req\." . 2>/dev/null | grep -v "node_modules" | wc -l || echo "0")

    if [ $sql_issues -gt 0 ]; then
        log "WARNING" "Found $sql_issues potential SQL injection patterns"
        record_issue "high" "code" "$sql_issues potential SQL injection patterns"
        ((code_issues++))
    fi

    if [ $code_issues -eq 0 ]; then
        log "SUCCESS" "No obvious code security issues found"
        AUDIT_RESULTS["code"]="pass"
    else
        AUDIT_RESULTS["code"]="fail"
    fi
}

generate_report() {
    log "STEP" "Generating audit report..."

    local report_file="$AUDIT_REPORT/report.md"

    cat > "$report_file" << EOF
# Security Audit Report

**Date:** $(date '+%Y-%m-%d %H:%M:%S')
**Project:** KitchenXpert

## Executive Summary

| Severity | Count |
|----------|-------|
| Critical | $CRITICAL_ISSUES |
| High     | $HIGH_ISSUES |
| Medium   | $MEDIUM_ISSUES |
| Low      | $LOW_ISSUES |
| **Total**| **$TOTAL_ISSUES** |

## Audit Results

EOF

    for category in "${!AUDIT_RESULTS[@]}"; do
        local status="${AUDIT_RESULTS[$category]}"
        local icon="✓"
        [ "$status" = "fail" ] && icon="✗"
        [ "$status" = "info" ] && icon="ℹ"
        echo "- **$category**: $icon $status" >> "$report_file"
    done

    cat >> "$report_file" << EOF

## Issues Found

EOF

    if [ -f "$AUDIT_REPORT/issues.txt" ]; then
        while IFS='|' read -r severity category description; do
            echo "### [$severity] $category" >> "$report_file"
            echo "$description" >> "$report_file"
            echo "" >> "$report_file"
        done < "$AUDIT_REPORT/issues.txt"
    else
        echo "No issues found." >> "$report_file"
    fi

    cat >> "$report_file" << EOF

## Recommendations

1. Fix all critical and high severity issues immediately
2. Review and fix medium severity issues within 30 days
3. Plan for low severity issues in upcoming sprints
4. Run security audits regularly (weekly recommended)

---
*Generated by KitchenXpert Security Audit Tool*
EOF

    log "SUCCESS" "Report generated: $report_file"
}

print_summary() {
    echo ""
    if [ $CRITICAL_ISSUES -gt 0 ] || [ $HIGH_ISSUES -gt 0 ]; then
        echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${RED}║${NC}         Security Audit Completed - ISSUES FOUND            ${RED}║${NC}"
        echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
    elif [ $MEDIUM_ISSUES -gt 0 ] || [ $LOW_ISSUES -gt 0 ]; then
        echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${YELLOW}║${NC}        Security Audit Completed - Minor Issues             ${YELLOW}║${NC}"
        echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"
    else
        echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║${NC}          Security Audit Completed - All Clear              ${GREEN}║${NC}"
        echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    fi
    echo ""
    echo "  Summary:"
    echo "    Critical: $CRITICAL_ISSUES"
    echo "    High:     $HIGH_ISSUES"
    echo "    Medium:   $MEDIUM_ISSUES"
    echo "    Low:      $LOW_ISSUES"
    echo ""
    echo "  Full report: $AUDIT_REPORT/report.md"
    echo ""
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --output|-o)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        --quick)
            QUICK_AUDIT="true"
            shift
            ;;
        --verbose|-v)
            VERBOSE="true"
            shift
            ;;
        --help)
            echo "Usage: audit.sh [options]"
            echo ""
            echo "Options:"
            echo "  -o, --output <dir>   Output directory for reports"
            echo "  --quick              Quick audit (skip some checks)"
            echo "  -v, --verbose        Verbose output"
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
setup_directories

run_dependency_audit
run_secrets_scan
run_env_file_check
run_permission_check

if [ "$QUICK_AUDIT" != "true" ]; then
    run_security_headers_check
    run_ssl_check
    run_code_security_scan
fi

generate_report
print_summary

# Exit with appropriate code
if [ $CRITICAL_ISSUES -gt 0 ]; then
    exit 2
elif [ $HIGH_ISSUES -gt 0 ]; then
    exit 1
else
    exit 0
fi
