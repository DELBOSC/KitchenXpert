#!/bin/bash
#
# Performance Benchmark - KitchenXpert
#
# Runs performance benchmarks against the application.
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
API_URL="${API_URL:-http://localhost:3001}"
CONCURRENT_USERS="${CONCURRENT_USERS:-10}"
DURATION="${DURATION:-30}"
OUTPUT_DIR="${OUTPUT_DIR:-$PROJECT_ROOT/reports/benchmarks}"
BENCHMARK_DATE=$(date +%Y%m%d_%H%M%S)

# Logging
log() {
    local level=$1
    local message=$2
    case $level in
        "INFO")    echo -e "${BLUE}[BENCH]${NC} $message" ;;
        "SUCCESS") echo -e "${GREEN}[BENCH]${NC} $message" ;;
        "WARNING") echo -e "${YELLOW}[BENCH]${NC} $message" ;;
        "ERROR")   echo -e "${RED}[BENCH]${NC} $message" ;;
        "STEP")    echo -e "${CYAN}[STEP]${NC} $message" ;;
    esac
}

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}        KitchenXpert - Performance Benchmark                 ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

check_prerequisites() {
    log "STEP" "Checking prerequisites..."

    if command -v wrk &> /dev/null; then
        BENCH_TOOL="wrk"
    elif command -v ab &> /dev/null; then
        BENCH_TOOL="ab"
    else
        BENCH_TOOL="curl"
        log "WARNING" "No benchmarking tool found. Using curl."
    fi

    log "SUCCESS" "Using benchmark tool: $BENCH_TOOL"
}

setup_output() {
    mkdir -p "$OUTPUT_DIR"
}

check_service_available() {
    log "STEP" "Checking if service is available..."

    local response=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health" 2>/dev/null || echo "000")

    if [ "$response" = "200" ]; then
        log "SUCCESS" "Service is available"
        return 0
    else
        log "ERROR" "Service is not available (HTTP $response)"
        return 1
    fi
}

run_benchmark() {
    local endpoint=$1
    local name=$2

    log "INFO" "Benchmarking: $name"

    local results_file="$OUTPUT_DIR/${name// /_}_$BENCHMARK_DATE.txt"
    local total_time=0
    local successful=0
    local failed=0
    local iterations=$((CONCURRENT_USERS * 10))

    for ((i=1; i<=iterations; i++)); do
        local result=$(curl -s -o /dev/null -w "%{http_code},%{time_total}" "$API_URL$endpoint" 2>/dev/null || echo "000,0")
        local status=$(echo "$result" | cut -d',' -f1)
        local time_ms=$(echo "$result" | cut -d',' -f2 | awk '{printf "%.0f", $1 * 1000}')

        if [ "$status" = "200" ]; then
            ((successful++))
            total_time=$((total_time + time_ms))
        else
            ((failed++))
        fi
    done

    local avg_time=0
    [ "$successful" -gt 0 ] && avg_time=$((total_time / successful))

    cat > "$results_file" << EOF
Benchmark: $name
Endpoint: $endpoint
Iterations: $iterations
Successful: $successful
Failed: $failed
Avg Response Time: ${avg_time}ms
EOF

    log "SUCCESS" "$name: ${avg_time}ms avg, $successful/$iterations successful"
}

benchmark_endpoints() {
    log "STEP" "Benchmarking API endpoints..."

    run_benchmark "/health" "health_check"
    run_benchmark "/api/products" "products_list"
    run_benchmark "/api/categories" "categories_list"
}

generate_report() {
    log "STEP" "Generating benchmark report..."

    local report_file="$OUTPUT_DIR/benchmark_report_$BENCHMARK_DATE.md"

    cat > "$report_file" << EOF
# Performance Benchmark Report

**Date:** $(date '+%Y-%m-%d %H:%M:%S')
**Target:** $API_URL
**Concurrent Users:** $CONCURRENT_USERS

## Results

| Endpoint | Avg (ms) | Success Rate |
|----------|----------|--------------|
EOF

    for file in "$OUTPUT_DIR"/*_$BENCHMARK_DATE.txt; do
        [ -f "$file" ] || continue

        local name=$(grep "^Benchmark:" "$file" | cut -d: -f2 | tr -d ' ')
        local avg=$(grep "^Avg Response Time:" "$file" | grep -o '[0-9]*')
        local successful=$(grep "^Successful:" "$file" | cut -d: -f2 | tr -d ' ')
        local iterations=$(grep "^Iterations:" "$file" | cut -d: -f2 | tr -d ' ')

        [ -n "$name" ] && echo "| $name | $avg | $successful/$iterations |" >> "$report_file"
    done

    log "SUCCESS" "Report generated: $report_file"
}

print_summary() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}        Benchmark Complete                                   ${GREEN}║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "  Target: $API_URL"
    echo "  Results: $OUTPUT_DIR"
    echo ""
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --url|-u)
            API_URL="$2"
            shift 2
            ;;
        --concurrent|-c)
            CONCURRENT_USERS="$2"
            shift 2
            ;;
        --help)
            echo "Usage: performance-benchmark.sh [options]"
            echo ""
            echo "Options:"
            echo "  -u, --url <url>        Target API URL"
            echo "  -c, --concurrent <n>   Concurrent users"
            echo "  --help                 Show this help message"
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
setup_output

if ! check_service_available; then
    exit 1
fi

benchmark_endpoints
generate_report
print_summary
