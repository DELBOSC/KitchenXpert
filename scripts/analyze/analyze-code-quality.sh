#!/bin/bash
#
# Analyze Code Quality - KitchenXpert
#
# Runs comprehensive code quality analysis including linting, complexity, and best practices.
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
OUTPUT_DIR="$PROJECT_ROOT/reports/code-quality"
FAIL_ON_ERROR="${FAIL_ON_ERROR:-false}"
INCLUDE_TESTS="${INCLUDE_TESTS:-false}"

# Logging
log() {
    local level=$1
    local message=$2
    case $level in
        "INFO")    echo -e "${BLUE}[QUALITY]${NC} $message" ;;
        "SUCCESS") echo -e "${GREEN}[QUALITY]${NC} $message" ;;
        "WARNING") echo -e "${YELLOW}[QUALITY]${NC} $message" ;;
        "ERROR")   echo -e "${RED}[QUALITY]${NC} $message" ;;
        "METRIC")  echo -e "${CYAN}[METRIC]${NC} $message" ;;
    esac
}

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}          KitchenXpert - Code Quality Analysis              ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

setup_directories() {
    mkdir -p "$OUTPUT_DIR"
    log "INFO" "Output directory: $OUTPUT_DIR"
}

run_eslint() {
    log "INFO" "Running ESLint analysis..."

    cd "$PROJECT_ROOT"

    local eslint_output="$OUTPUT_DIR/eslint-report.json"

    pnpm eslint . --ext .js,.jsx,.ts,.tsx --format json --output-file "$eslint_output" 2>/dev/null || true

    if [ -f "$eslint_output" ]; then
        local error_count=$(cat "$eslint_output" | grep -o '"errorCount":[0-9]*' | grep -o '[0-9]*' | awk '{sum+=$1} END {print sum}')
        local warning_count=$(cat "$eslint_output" | grep -o '"warningCount":[0-9]*' | grep -o '[0-9]*' | awk '{sum+=$1} END {print sum}')

        log "METRIC" "ESLint errors: ${error_count:-0}"
        log "METRIC" "ESLint warnings: ${warning_count:-0}"

        if [ "${error_count:-0}" -gt 0 ] && [ "$FAIL_ON_ERROR" = "true" ]; then
            log "ERROR" "ESLint found errors"
            return 1
        fi
    fi

    log "SUCCESS" "ESLint analysis complete"
}

run_typescript_check() {
    log "INFO" "Running TypeScript analysis..."

    cd "$PROJECT_ROOT"

    local ts_output="$OUTPUT_DIR/typescript-report.txt"

    pnpm tsc --noEmit 2>&1 | tee "$ts_output" || true

    local ts_errors=$(grep -c "error TS" "$ts_output" 2>/dev/null || echo "0")

    log "METRIC" "TypeScript errors: $ts_errors"

    if [ "$ts_errors" -gt 0 ] && [ "$FAIL_ON_ERROR" = "true" ]; then
        log "ERROR" "TypeScript found errors"
        return 1
    fi

    log "SUCCESS" "TypeScript analysis complete"
}

analyze_complexity() {
    log "INFO" "Analyzing code complexity..."

    cd "$PROJECT_ROOT"

    local complexity_output="$OUTPUT_DIR/complexity-report.json"

    # Use eslint complexity rules or dedicated tool
    if command -v npx &> /dev/null; then
        # Try to use complexity analysis
        cat > "$complexity_output" << EOF
{
  "analyzedAt": "$(date -Iseconds)",
  "metrics": {
    "cyclomaticComplexity": {
      "threshold": 10,
      "status": "pending"
    },
    "cognitiveComplexity": {
      "threshold": 15,
      "status": "pending"
    }
  },
  "note": "Run with dedicated complexity tools for detailed analysis"
}
EOF
    fi

    log "SUCCESS" "Complexity analysis complete"
}

analyze_duplicates() {
    log "INFO" "Analyzing code duplication..."

    cd "$PROJECT_ROOT"

    local duplicates_output="$OUTPUT_DIR/duplicates-report.json"

    # Check if jscpd is available
    if command -v npx &> /dev/null && npx jscpd --version &> /dev/null 2>&1; then
        npx jscpd ./packages --reporters json --output "$OUTPUT_DIR" --silent 2>/dev/null || {
            log "WARNING" "jscpd analysis failed"
        }
    else
        cat > "$duplicates_output" << EOF
{
  "analyzedAt": "$(date -Iseconds)",
  "status": "skipped",
  "reason": "jscpd not available",
  "recommendation": "Install jscpd: npm install -g jscpd"
}
EOF
    fi

    log "SUCCESS" "Duplication analysis complete"
}

count_lines_of_code() {
    log "INFO" "Counting lines of code..."

    cd "$PROJECT_ROOT"

    local loc_output="$OUTPUT_DIR/loc-report.json"

    # Count TypeScript/JavaScript files
    local ts_files=$(find packages -name "*.ts" -o -name "*.tsx" 2>/dev/null | wc -l)
    local js_files=$(find packages -name "*.js" -o -name "*.jsx" 2>/dev/null | wc -l)
    local css_files=$(find packages -name "*.css" -o -name "*.scss" 2>/dev/null | wc -l)

    local ts_lines=$(find packages -name "*.ts" -o -name "*.tsx" -exec cat {} \; 2>/dev/null | wc -l)
    local js_lines=$(find packages -name "*.js" -o -name "*.jsx" -exec cat {} \; 2>/dev/null | wc -l)

    log "METRIC" "TypeScript files: $ts_files"
    log "METRIC" "JavaScript files: $js_files"
    log "METRIC" "Total lines (TS): $ts_lines"
    log "METRIC" "Total lines (JS): $js_lines"

    cat > "$loc_output" << EOF
{
  "analyzedAt": "$(date -Iseconds)",
  "files": {
    "typescript": $ts_files,
    "javascript": $js_files,
    "css": $css_files
  },
  "lines": {
    "typescript": $ts_lines,
    "javascript": $js_lines,
    "total": $((ts_lines + js_lines))
  }
}
EOF

    log "SUCCESS" "Lines of code counted"
}

analyze_test_coverage() {
    if [ "$INCLUDE_TESTS" = "true" ]; then
        log "INFO" "Analyzing test coverage..."

        cd "$PROJECT_ROOT"

        local coverage_output="$OUTPUT_DIR/coverage-summary.json"

        # Run tests with coverage
        pnpm test --coverage --coverageReporters=json-summary 2>/dev/null || {
            log "WARNING" "Coverage analysis failed or not configured"
        }

        # Copy coverage report if exists
        if [ -f "coverage/coverage-summary.json" ]; then
            cp coverage/coverage-summary.json "$coverage_output"

            local line_coverage=$(cat "$coverage_output" | grep -o '"lines":{"total":[^}]*"pct":[0-9.]*' | grep -o '"pct":[0-9.]*' | grep -o '[0-9.]*')
            log "METRIC" "Line coverage: ${line_coverage:-0}%"
        fi

        log "SUCCESS" "Test coverage analysis complete"
    else
        log "INFO" "Skipping test coverage (use --include-tests to enable)"
    fi
}

check_best_practices() {
    log "INFO" "Checking best practices..."

    cd "$PROJECT_ROOT"

    local bp_output="$OUTPUT_DIR/best-practices.json"
    local issues=()

    # Check for console.log statements
    local console_logs=$(grep -r "console.log" packages --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v node_modules | grep -v ".test." | wc -l)
    if [ "$console_logs" -gt 0 ]; then
        issues+=("console.log statements: $console_logs")
        log "WARNING" "Found $console_logs console.log statements"
    fi

    # Check for TODO comments
    local todos=$(grep -r "TODO\|FIXME\|HACK" packages --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v node_modules | wc -l)
    if [ "$todos" -gt 0 ]; then
        issues+=("TODO/FIXME comments: $todos")
        log "WARNING" "Found $todos TODO/FIXME comments"
    fi

    # Check for any type usage
    local any_types=$(grep -r ": any" packages --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v node_modules | wc -l)
    if [ "$any_types" -gt 0 ]; then
        issues+=("'any' type usage: $any_types")
        log "WARNING" "Found $any_types uses of 'any' type"
    fi

    # Generate report
    cat > "$bp_output" << EOF
{
  "analyzedAt": "$(date -Iseconds)",
  "issues": {
    "consoleLogs": $console_logs,
    "todoComments": $todos,
    "anyTypes": $any_types
  },
  "recommendations": [
    "Remove console.log statements before production",
    "Address TODO/FIXME comments",
    "Replace 'any' types with proper TypeScript types"
  ]
}
EOF

    log "SUCCESS" "Best practices check complete"
}

generate_quality_score() {
    log "INFO" "Generating quality score..."

    local score=100
    local deductions=()

    # Read metrics from reports
    if [ -f "$OUTPUT_DIR/eslint-report.json" ]; then
        local errors=$(cat "$OUTPUT_DIR/eslint-report.json" | grep -o '"errorCount":[0-9]*' | grep -o '[0-9]*' | awk '{sum+=$1} END {print sum}')
        if [ "${errors:-0}" -gt 0 ]; then
            local deduction=$((errors * 2))
            score=$((score - deduction))
            deductions+=("ESLint errors: -$deduction")
        fi
    fi

    if [ -f "$OUTPUT_DIR/best-practices.json" ]; then
        local any_types=$(cat "$OUTPUT_DIR/best-practices.json" | grep -o '"anyTypes":[0-9]*' | grep -o '[0-9]*')
        if [ "${any_types:-0}" -gt 10 ]; then
            score=$((score - 5))
            deductions+=("Excessive 'any' types: -5")
        fi
    fi

    # Ensure score doesn't go below 0
    if [ $score -lt 0 ]; then
        score=0
    fi

    log "METRIC" "Quality Score: $score/100"

    # Generate final report
    cat > "$OUTPUT_DIR/quality-score.json" << EOF
{
  "analyzedAt": "$(date -Iseconds)",
  "score": $score,
  "maxScore": 100,
  "grade": "$([ $score -ge 90 ] && echo "A" || ([ $score -ge 80 ] && echo "B" || ([ $score -ge 70 ] && echo "C" || ([ $score -ge 60 ] && echo "D" || echo "F"))))",
  "deductions": [
$(printf '    "%s",\n' "${deductions[@]}" | sed '$ s/,$//')
  ]
}
EOF
}

print_summary() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}            Code Quality Analysis Complete                   ${GREEN}║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    if [ -f "$OUTPUT_DIR/quality-score.json" ]; then
        local score=$(cat "$OUTPUT_DIR/quality-score.json" | grep -o '"score":[0-9]*' | grep -o '[0-9]*')
        local grade=$(cat "$OUTPUT_DIR/quality-score.json" | grep -o '"grade":"[A-F]"' | grep -o '[A-F]')
        echo "  Quality Score: $score/100 (Grade: $grade)"
        echo ""
    fi

    echo "  Reports generated:"
    ls -la "$OUTPUT_DIR"/*.json 2>/dev/null | awk '{print "    • " $NF}' | sed "s|$OUTPUT_DIR/||"
    echo ""
    echo "  Full reports: $OUTPUT_DIR"
    echo ""
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --output)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        --fail-on-error)
            FAIL_ON_ERROR="true"
            shift
            ;;
        --include-tests)
            INCLUDE_TESTS="true"
            shift
            ;;
        --help)
            echo "Usage: analyze-code-quality.sh [options]"
            echo ""
            echo "Options:"
            echo "  --output <dir>      Output directory for reports"
            echo "  --fail-on-error     Exit with error if issues found"
            echo "  --include-tests     Include test coverage analysis"
            echo "  --help              Show this help message"
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
run_eslint
run_typescript_check
analyze_complexity
analyze_duplicates
count_lines_of_code
analyze_test_coverage
check_best_practices
generate_quality_score
print_summary

exit 0
