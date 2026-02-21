#!/bin/bash
#
# Penetration Test Runner - KitchenXpert
#
# Runs automated penetration testing against the application.
# For authorized security testing and development environments only.
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
TARGET_URL="${TARGET_URL:-http://localhost:3001}"
OUTPUT_DIR="${OUTPUT_DIR:-$PROJECT_ROOT/reports/security/pentest}"
TEST_DATE=$(date +%Y%m%d_%H%M%S)

# Logging
log() {
    local level=$1
    local message=$2
    case $level in
        "INFO")    echo -e "${BLUE}[PENTEST]${NC} $message" ;;
        "SUCCESS") echo -e "${GREEN}[PENTEST]${NC} $message" ;;
        "WARNING") echo -e "${YELLOW}[PENTEST]${NC} $message" ;;
        "ERROR")   echo -e "${RED}[PENTEST]${NC} $message" ;;
        "STEP")    echo -e "${CYAN}[STEP]${NC} $message" ;;
    esac
}

print_header() {
    echo ""
    echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║${NC}        KitchenXpert - Penetration Testing                   ${YELLOW}║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}  WARNING: Only run against systems you have permission to test${NC}"
    echo ""
}

check_prerequisites() {
    log "INFO" "Checking prerequisites..."

    local required_tools=("curl")
    local missing_tools=()

    for tool in "${required_tools[@]}"; do
        if ! command -v $tool &> /dev/null; then
            missing_tools+=($tool)
        fi
    done

    if [ ${#missing_tools[@]} -gt 0 ]; then
        log "WARNING" "Missing tools: ${missing_tools[*]}"
        log "INFO" "Some tests may be skipped"
    fi

    mkdir -p "$OUTPUT_DIR"

    log "SUCCESS" "Prerequisites check complete"
}

confirm_authorization() {
    echo ""
    echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║${NC}                    AUTHORIZATION CHECK                       ${RED}║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "  Target: $TARGET_URL"
    echo ""
    echo "  You are about to run penetration tests against this target."
    echo "  Ensure you have proper authorization before proceeding."
    echo ""

    read -p "Do you have authorization to test this target? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        log "INFO" "Testing cancelled - no authorization"
        exit 0
    fi

    echo ""
}

test_sql_injection() {
    log "STEP" "Testing SQL Injection vulnerabilities..."

    local endpoints=(
        "/api/users?id=1"
        "/api/products?search=test"
        "/api/kitchens?filter=name"
    )

    local payloads=(
        "' OR '1'='1"
        "1; DROP TABLE users--"
        "1 UNION SELECT * FROM users--"
        "'; INSERT INTO users VALUES('hacked')--"
    )

    local vuln_count=0
    local results_file="$OUTPUT_DIR/sqli_$TEST_DATE.txt"

    for endpoint in "${endpoints[@]}"; do
        for payload in "${payloads[@]}"; do
            local url="$TARGET_URL${endpoint}&test=${payload}"
            local response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")

            # Check for error messages that indicate SQL injection
            local body=$(curl -s "$url" 2>/dev/null || echo "")

            if echo "$body" | grep -qiE "(sql|syntax|mysql|postgresql|sqlite|query)" ; then
                log "WARNING" "Potential SQLi at: $endpoint"
                echo "VULNERABLE: $endpoint with payload: $payload" >> "$results_file"
                ((vuln_count++))
            fi
        done
    done

    if [ $vuln_count -eq 0 ]; then
        log "SUCCESS" "No SQL injection vulnerabilities detected"
    else
        log "ERROR" "Found $vuln_count potential SQL injection points"
    fi
}

test_xss() {
    log "STEP" "Testing XSS vulnerabilities..."

    local endpoints=(
        "/api/search?q="
        "/api/users?name="
    )

    local payloads=(
        "<script>alert('XSS')</script>"
        "<img src=x onerror=alert('XSS')>"
        "javascript:alert('XSS')"
        "'><script>alert('XSS')</script>"
    )

    local vuln_count=0
    local results_file="$OUTPUT_DIR/xss_$TEST_DATE.txt"

    for endpoint in "${endpoints[@]}"; do
        for payload in "${payloads[@]}"; do
            local encoded_payload=$(echo "$payload" | sed 's/ /%20/g; s/</%3C/g; s/>/%3E/g; s/"/%22/g; s/'\''/%27/g')
            local url="$TARGET_URL${endpoint}${encoded_payload}"
            local body=$(curl -s "$url" 2>/dev/null || echo "")

            # Check if payload is reflected without encoding
            if echo "$body" | grep -qF "$payload" ; then
                log "WARNING" "Potential XSS at: $endpoint"
                echo "VULNERABLE: $endpoint with payload: $payload" >> "$results_file"
                ((vuln_count++))
            fi
        done
    done

    if [ $vuln_count -eq 0 ]; then
        log "SUCCESS" "No XSS vulnerabilities detected"
    else
        log "ERROR" "Found $vuln_count potential XSS points"
    fi
}

test_path_traversal() {
    log "STEP" "Testing path traversal vulnerabilities..."

    local endpoints=(
        "/api/files?path="
        "/api/download?file="
        "/api/images?name="
    )

    local payloads=(
        "../../etc/passwd"
        "..\\..\\..\\windows\\system32\\config\\sam"
        "....//....//....//etc/passwd"
        "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd"
    )

    local vuln_count=0
    local results_file="$OUTPUT_DIR/traversal_$TEST_DATE.txt"

    for endpoint in "${endpoints[@]}"; do
        for payload in "${payloads[@]}"; do
            local url="$TARGET_URL${endpoint}${payload}"
            local body=$(curl -s "$url" 2>/dev/null || echo "")

            # Check for indicators of successful traversal
            if echo "$body" | grep -qE "(root:|Administrator|\\[boot loader\\])" ; then
                log "ERROR" "Path traversal CONFIRMED at: $endpoint"
                echo "CONFIRMED: $endpoint with payload: $payload" >> "$results_file"
                ((vuln_count++))
            fi
        done
    done

    if [ $vuln_count -eq 0 ]; then
        log "SUCCESS" "No path traversal vulnerabilities detected"
    else
        log "ERROR" "Found $vuln_count path traversal vulnerabilities"
    fi
}

test_authentication() {
    log "STEP" "Testing authentication mechanisms..."

    local results_file="$OUTPUT_DIR/auth_$TEST_DATE.txt"
    local issues=0

    # Test default credentials
    local default_creds=(
        "admin:admin"
        "admin:password"
        "admin:123456"
        "test:test"
        "user:user"
    )

    for cred in "${default_creds[@]}"; do
        local user=$(echo "$cred" | cut -d: -f1)
        local pass=$(echo "$cred" | cut -d: -f2)

        local response=$(curl -s -X POST "$TARGET_URL/api/auth/login" \
            -H "Content-Type: application/json" \
            -d "{\"email\":\"$user@test.com\",\"password\":\"$pass\"}" 2>/dev/null || echo "")

        if echo "$response" | grep -qiE "(token|success|authorized)" ; then
            log "ERROR" "Default credentials accepted: $cred"
            echo "DEFAULT CREDS WORK: $cred" >> "$results_file"
            ((issues++))
        fi
    done

    # Test brute force protection
    log "INFO" "Testing rate limiting..."
    local rate_limited=false

    for i in {1..20}; do
        local response=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$TARGET_URL/api/auth/login" \
            -H "Content-Type: application/json" \
            -d '{"email":"test@test.com","password":"wrongpassword"}' 2>/dev/null || echo "000")

        if [ "$response" = "429" ]; then
            rate_limited=true
            break
        fi
    done

    if [ "$rate_limited" = "true" ]; then
        log "SUCCESS" "Rate limiting is enabled"
    else
        log "WARNING" "No rate limiting detected on login endpoint"
        echo "NO RATE LIMITING on login" >> "$results_file"
        ((issues++))
    fi

    if [ $issues -eq 0 ]; then
        log "SUCCESS" "Authentication tests passed"
    fi
}

test_security_headers() {
    log "STEP" "Testing security headers..."

    local results_file="$OUTPUT_DIR/headers_$TEST_DATE.txt"
    local headers=$(curl -sI "$TARGET_URL" 2>/dev/null || echo "")
    local issues=0

    local required_headers=(
        "X-Content-Type-Options"
        "X-Frame-Options"
        "X-XSS-Protection"
        "Strict-Transport-Security"
        "Content-Security-Policy"
    )

    echo "Security Headers Check" >> "$results_file"
    echo "=====================" >> "$results_file"
    echo "" >> "$results_file"

    for header in "${required_headers[@]}"; do
        if echo "$headers" | grep -qi "$header"; then
            log "SUCCESS" "Found: $header"
            echo "PRESENT: $header" >> "$results_file"
        else
            log "WARNING" "Missing: $header"
            echo "MISSING: $header" >> "$results_file"
            ((issues++))
        fi
    done

    # Check for dangerous headers
    if echo "$headers" | grep -qi "Server:"; then
        local server=$(echo "$headers" | grep -i "Server:" | head -1)
        log "INFO" "Server header exposed: $server"
        echo "EXPOSED: $server" >> "$results_file"
    fi

    if [ $issues -gt 0 ]; then
        log "WARNING" "Missing $issues security header(s)"
    fi
}

test_cors() {
    log "STEP" "Testing CORS configuration..."

    local results_file="$OUTPUT_DIR/cors_$TEST_DATE.txt"
    local issues=0

    # Test with arbitrary origin
    local response=$(curl -sI "$TARGET_URL/api" \
        -H "Origin: https://evil.com" 2>/dev/null || echo "")

    if echo "$response" | grep -qi "Access-Control-Allow-Origin: \*"; then
        log "WARNING" "Wildcard CORS enabled"
        echo "WILDCARD CORS: Access-Control-Allow-Origin: *" >> "$results_file"
        ((issues++))
    elif echo "$response" | grep -qi "Access-Control-Allow-Origin: https://evil.com"; then
        log "ERROR" "CORS reflects arbitrary origin"
        echo "REFLECTED ORIGIN: evil.com was allowed" >> "$results_file"
        ((issues++))
    else
        log "SUCCESS" "CORS properly configured"
    fi

    # Check for credentials exposure
    if echo "$response" | grep -qi "Access-Control-Allow-Credentials: true"; then
        if echo "$response" | grep -qi "Access-Control-Allow-Origin: \*"; then
            log "ERROR" "Credentials allowed with wildcard origin"
            ((issues++))
        fi
    fi

    return $issues
}

generate_report() {
    log "STEP" "Generating penetration test report..."

    local report_file="$OUTPUT_DIR/pentest_report_$TEST_DATE.md"

    cat > "$report_file" << EOF
# Penetration Test Report

**Date:** $(date '+%Y-%m-%d %H:%M:%S')
**Target:** $TARGET_URL
**Project:** KitchenXpert

## Executive Summary

This report summarizes the findings from automated penetration testing
performed against the KitchenXpert application.

## Tests Performed

1. SQL Injection Testing
2. Cross-Site Scripting (XSS) Testing
3. Path Traversal Testing
4. Authentication Testing
5. Security Headers Analysis
6. CORS Configuration Testing

## Findings

EOF

    # Append individual test results
    for file in "$OUTPUT_DIR"/*_$TEST_DATE.txt; do
        if [ -f "$file" ]; then
            local test_name=$(basename "$file" | sed "s/_$TEST_DATE.txt//")
            echo "### $test_name" >> "$report_file"
            echo '```' >> "$report_file"
            cat "$file" >> "$report_file"
            echo '```' >> "$report_file"
            echo "" >> "$report_file"
        fi
    done

    cat >> "$report_file" << EOF

## Recommendations

1. Fix all confirmed vulnerabilities immediately
2. Review and fix potential vulnerabilities
3. Implement missing security headers
4. Enable rate limiting on all authentication endpoints
5. Properly configure CORS policies

## Disclaimer

This automated test does not replace a comprehensive manual security assessment.
Further testing by qualified security professionals is recommended.

---
*Generated by KitchenXpert Penetration Testing Tool*
EOF

    log "SUCCESS" "Report generated: $report_file"
}

print_summary() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}          Penetration Testing Complete                       ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "  Target:  $TARGET_URL"
    echo "  Reports: $OUTPUT_DIR"
    echo ""
    echo "  Review the generated reports for detailed findings."
    echo ""
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --target|-t)
            TARGET_URL="$2"
            shift 2
            ;;
        --output|-o)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        --skip-confirm)
            SKIP_CONFIRM="true"
            shift
            ;;
        --help)
            echo "Usage: penetration-test.sh [options]"
            echo ""
            echo "Options:"
            echo "  -t, --target <url>   Target URL to test"
            echo "  -o, --output <dir>   Output directory for reports"
            echo "  --skip-confirm       Skip authorization confirmation"
            echo "  --help               Show this help message"
            echo ""
            echo "Example:"
            echo "  penetration-test.sh --target http://localhost:3001"
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
check_prerequisites

if [ "$SKIP_CONFIRM" != "true" ]; then
    confirm_authorization
fi

test_sql_injection
test_xss
test_path_traversal
test_authentication
test_security_headers
test_cors

generate_report
print_summary
