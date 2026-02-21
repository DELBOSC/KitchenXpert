#!/bin/bash
#
# Run Integration Tests - KitchenXpert
#
# Executes integration test suites with configurable options.
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
TEST_ENV="${TEST_ENV:-test}"
TEST_SUITE="${TEST_SUITE:-all}"
PARALLEL="${PARALLEL:-false}"
COVERAGE="${COVERAGE:-false}"
WATCH="${WATCH:-false}"
BAIL="${BAIL:-false}"
VERBOSE="${VERBOSE:-false}"
OUTPUT_DIR="${OUTPUT_DIR:-$PROJECT_ROOT/reports/tests}"
TEST_TIMEOUT="${TEST_TIMEOUT:-30000}"

# Stats
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0
START_TIME=$(date +%s)

# Logging
log() {
    local level=$1
    local message=$2
    case $level in
        "INFO")    echo -e "${BLUE}[TEST]${NC} $message" ;;
        "SUCCESS") echo -e "${GREEN}[TEST]${NC} $message" ;;
        "WARNING") echo -e "${YELLOW}[TEST]${NC} $message" ;;
        "ERROR")   echo -e "${RED}[TEST]${NC} $message" ;;
        "STEP")    echo -e "${CYAN}[STEP]${NC} $message" ;;
    esac
}

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}        KitchenXpert - Integration Tests                    ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

check_environment() {
    log "STEP" "Checking test environment..."

    # Check if test env file exists
    if [ ! -f "$PROJECT_ROOT/.env.test" ]; then
        log "WARNING" "Test environment file not found"
        log "INFO" "Running setup script..."
        "$SCRIPT_DIR/setup-test-environment.sh"
    fi

    # Verify services are running
    if docker ps | grep -q "kitchenxpert_postgres_test"; then
        log "SUCCESS" "PostgreSQL test container is running"
    else
        log "WARNING" "PostgreSQL test container not running"
        log "INFO" "Starting test services..."
        "$SCRIPT_DIR/setup-test-environment.sh"
    fi

    log "SUCCESS" "Environment check passed"
}

setup_output() {
    mkdir -p "$OUTPUT_DIR"
    mkdir -p "$OUTPUT_DIR/coverage"
    mkdir -p "$OUTPUT_DIR/junit"
}

run_api_tests() {
    log "STEP" "Running API integration tests..."

    cd "$PROJECT_ROOT"

    local test_args=()

    # Add Jest options
    test_args+=("--config" "jest.integration.config.js")
    test_args+=("--testTimeout" "$TEST_TIMEOUT")
    test_args+=("--runInBand")  # Sequential by default for integration tests

    [ "$VERBOSE" = "true" ] && test_args+=("--verbose")
    [ "$BAIL" = "true" ] && test_args+=("--bail")
    [ "$COVERAGE" = "true" ] && test_args+=("--coverage" "--coverageDirectory" "$OUTPUT_DIR/coverage/api")
    [ "$WATCH" = "true" ] && test_args+=("--watch")

    # JUnit reporter for CI
    test_args+=("--reporters" "default" "--reporters" "jest-junit")
    export JEST_JUNIT_OUTPUT_DIR="$OUTPUT_DIR/junit"
    export JEST_JUNIT_OUTPUT_NAME="api-results.xml"

    # Load test environment
    export $(grep -v '^#' "$PROJECT_ROOT/.env.test" | xargs)

    # Run tests
    if pnpm jest "${test_args[@]}" --testPathPattern=".*\\.integration\\.test\\.(ts|js)$" 2>&1; then
        log "SUCCESS" "API integration tests passed"
        return 0
    else
        log "ERROR" "API integration tests failed"
        return 1
    fi
}

run_e2e_tests() {
    log "STEP" "Running E2E tests..."

    cd "$PROJECT_ROOT"

    # Check for Playwright or Cypress
    if [ -f "playwright.config.ts" ]; then
        log "INFO" "Using Playwright for E2E tests"

        local playwright_args=()
        [ "$VERBOSE" = "true" ] && playwright_args+=("--debug")

        if pnpm playwright test "${playwright_args[@]}" 2>&1; then
            log "SUCCESS" "E2E tests passed"
            return 0
        else
            log "ERROR" "E2E tests failed"
            return 1
        fi
    elif [ -f "cypress.config.ts" ] || [ -f "cypress.config.js" ]; then
        log "INFO" "Using Cypress for E2E tests"

        if pnpm cypress run 2>&1; then
            log "SUCCESS" "E2E tests passed"
            return 0
        else
            log "ERROR" "E2E tests failed"
            return 1
        fi
    else
        log "WARNING" "No E2E test framework configured"
        return 0
    fi
}

run_database_tests() {
    log "STEP" "Running database integration tests..."

    cd "$PROJECT_ROOT"

    # Load test environment
    export $(grep -v '^#' "$PROJECT_ROOT/.env.test" | xargs)

    local test_args=()
    test_args+=("--testTimeout" "$TEST_TIMEOUT")
    [ "$VERBOSE" = "true" ] && test_args+=("--verbose")

    if pnpm jest "${test_args[@]}" --testPathPattern=".*\\.db\\.test\\.(ts|js)$" 2>&1; then
        log "SUCCESS" "Database integration tests passed"
        return 0
    else
        log "ERROR" "Database integration tests failed"
        return 1
    fi
}

run_service_tests() {
    log "STEP" "Running service integration tests..."

    cd "$PROJECT_ROOT"

    # Load test environment
    export $(grep -v '^#' "$PROJECT_ROOT/.env.test" | xargs)

    local test_args=()
    test_args+=("--testTimeout" "$TEST_TIMEOUT")
    [ "$VERBOSE" = "true" ] && test_args+=("--verbose")

    # Test external service integrations (with mocks)
    if pnpm jest "${test_args[@]}" --testPathPattern=".*\\.service\\.test\\.(ts|js)$" 2>&1; then
        log "SUCCESS" "Service integration tests passed"
        return 0
    else
        log "ERROR" "Service integration tests failed"
        return 1
    fi
}

run_all_tests() {
    log "STEP" "Running all integration tests..."

    local failed=0

    run_api_tests || ((failed++))
    run_database_tests || ((failed++))
    run_service_tests || ((failed++))

    if [ "$TEST_SUITE" = "all" ] || [ "$TEST_SUITE" = "e2e" ]; then
        run_e2e_tests || ((failed++))
    fi

    return $failed
}

generate_report() {
    log "STEP" "Generating test report..."

    # Run report generator
    if [ -f "$SCRIPT_DIR/report-test-results.js" ]; then
        node "$SCRIPT_DIR/report-test-results.js" --output "$OUTPUT_DIR"
    fi

    log "SUCCESS" "Test report generated"
}

print_summary() {
    local end_time=$(date +%s)
    local duration=$((end_time - START_TIME))

    echo ""
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║${NC}          All Integration Tests Passed                       ${GREEN}║${NC}"
        echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    else
        echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${RED}║${NC}          Some Integration Tests Failed                      ${RED}║${NC}"
        echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
    fi
    echo ""
    echo "  Test Suite:    $TEST_SUITE"
    echo "  Duration:      ${duration}s"
    echo "  Reports:       $OUTPUT_DIR"
    echo ""
    if [ "$COVERAGE" = "true" ]; then
        echo "  Coverage report: $OUTPUT_DIR/coverage/index.html"
        echo ""
    fi
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --suite|-s)
            TEST_SUITE="$2"
            shift 2
            ;;
        --parallel|-p)
            PARALLEL="true"
            shift
            ;;
        --coverage|-c)
            COVERAGE="true"
            shift
            ;;
        --watch|-w)
            WATCH="true"
            shift
            ;;
        --bail|-b)
            BAIL="true"
            shift
            ;;
        --verbose|-v)
            VERBOSE="true"
            shift
            ;;
        --output|-o)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        --timeout|-t)
            TEST_TIMEOUT="$2"
            shift 2
            ;;
        --help)
            echo "Usage: run-integration-tests.sh [options]"
            echo ""
            echo "Options:"
            echo "  -s, --suite <suite>    Test suite: all, api, e2e, db, service"
            echo "  -p, --parallel         Run tests in parallel"
            echo "  -c, --coverage         Generate coverage report"
            echo "  -w, --watch            Watch mode"
            echo "  -b, --bail             Stop on first failure"
            echo "  -v, --verbose          Verbose output"
            echo "  -o, --output <dir>     Output directory for reports"
            echo "  -t, --timeout <ms>     Test timeout in milliseconds"
            echo "  --help                 Show this help message"
            echo ""
            echo "Examples:"
            echo "  run-integration-tests.sh                    # Run all tests"
            echo "  run-integration-tests.sh -s api -c          # API tests with coverage"
            echo "  run-integration-tests.sh -s e2e -v          # E2E tests verbose"
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
check_environment
setup_output

exit_code=0

case $TEST_SUITE in
    all)
        run_all_tests || exit_code=$?
        ;;
    api)
        run_api_tests || exit_code=$?
        ;;
    e2e)
        run_e2e_tests || exit_code=$?
        ;;
    db|database)
        run_database_tests || exit_code=$?
        ;;
    service)
        run_service_tests || exit_code=$?
        ;;
    *)
        log "ERROR" "Unknown test suite: $TEST_SUITE"
        exit 1
        ;;
esac

generate_report
print_summary

exit $exit_code
