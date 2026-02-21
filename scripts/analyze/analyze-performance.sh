#!/bin/bash
#
# Analyze Performance - KitchenXpert
#
# Runs performance analysis on the application including build times, bundle sizes, and runtime metrics.
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
OUTPUT_DIR="$PROJECT_ROOT/reports/performance"
RUN_LIGHTHOUSE="${RUN_LIGHTHOUSE:-false}"
BENCHMARK_BUILD="${BENCHMARK_BUILD:-true}"

# Logging
log() {
    local level=$1
    local message=$2
    case $level in
        "INFO")    echo -e "${BLUE}[PERF]${NC} $message" ;;
        "SUCCESS") echo -e "${GREEN}[PERF]${NC} $message" ;;
        "WARNING") echo -e "${YELLOW}[PERF]${NC} $message" ;;
        "ERROR")   echo -e "${RED}[PERF]${NC} $message" ;;
        "METRIC")  echo -e "${CYAN}[METRIC]${NC} $message" ;;
    esac
}

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}          KitchenXpert - Performance Analysis               ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

setup_directories() {
    mkdir -p "$OUTPUT_DIR"
    log "INFO" "Output directory: $OUTPUT_DIR"
}

measure_build_time() {
    if [ "$BENCHMARK_BUILD" = "false" ]; then
        log "INFO" "Skipping build benchmark"
        return
    fi

    log "INFO" "Measuring build performance..."

    cd "$PROJECT_ROOT"

    local build_output="$OUTPUT_DIR/build-performance.json"

    # Measure frontend build time
    local frontend_start=$(date +%s%N)
    if [ -d "packages/frontend" ]; then
        (cd packages/frontend && pnpm run build 2>/dev/null) || true
    fi
    local frontend_end=$(date +%s%N)
    local frontend_duration=$(( (frontend_end - frontend_start) / 1000000 ))

    # Measure backend build time
    local backend_start=$(date +%s%N)
    if [ -d "packages/backend" ]; then
        (cd packages/backend && pnpm run build 2>/dev/null) || true
    fi
    local backend_end=$(date +%s%N)
    local backend_duration=$(( (backend_end - backend_start) / 1000000 ))

    log "METRIC" "Frontend build: ${frontend_duration}ms"
    log "METRIC" "Backend build: ${backend_duration}ms"

    cat > "$build_output" << EOF
{
  "analyzedAt": "$(date -Iseconds)",
  "buildTimes": {
    "frontend": {
      "durationMs": $frontend_duration,
      "durationFormatted": "$(echo "scale=2; $frontend_duration / 1000" | bc)s"
    },
    "backend": {
      "durationMs": $backend_duration,
      "durationFormatted": "$(echo "scale=2; $backend_duration / 1000" | bc)s"
    },
    "total": {
      "durationMs": $((frontend_duration + backend_duration)),
      "durationFormatted": "$(echo "scale=2; ($frontend_duration + $backend_duration) / 1000" | bc)s"
    }
  }
}
EOF

    log "SUCCESS" "Build performance measured"
}

analyze_bundle_sizes() {
    log "INFO" "Analyzing bundle sizes..."

    cd "$PROJECT_ROOT"

    local bundle_output="$OUTPUT_DIR/bundle-sizes.json"

    # Frontend bundles
    local frontend_size=0
    local frontend_js_size=0
    local frontend_css_size=0

    if [ -d "packages/frontend/.next" ]; then
        frontend_size=$(du -sb packages/frontend/.next 2>/dev/null | cut -f1)
        frontend_js_size=$(find packages/frontend/.next -name "*.js" -exec cat {} \; 2>/dev/null | wc -c)
        frontend_css_size=$(find packages/frontend/.next -name "*.css" -exec cat {} \; 2>/dev/null | wc -c)
    fi

    # Backend bundle
    local backend_size=0
    if [ -d "packages/backend/dist" ]; then
        backend_size=$(du -sb packages/backend/dist 2>/dev/null | cut -f1)
    fi

    log "METRIC" "Frontend bundle: $(echo "scale=2; $frontend_size / 1024 / 1024" | bc)MB"
    log "METRIC" "Backend bundle: $(echo "scale=2; $backend_size / 1024" | bc)KB"

    cat > "$bundle_output" << EOF
{
  "analyzedAt": "$(date -Iseconds)",
  "frontend": {
    "totalBytes": $frontend_size,
    "totalMB": $(echo "scale=2; $frontend_size / 1024 / 1024" | bc),
    "javascriptBytes": $frontend_js_size,
    "cssBytes": $frontend_css_size
  },
  "backend": {
    "totalBytes": $backend_size,
    "totalKB": $(echo "scale=2; $backend_size / 1024" | bc)
  },
  "thresholds": {
    "frontendWarning": 5242880,
    "frontendError": 10485760,
    "comment": "Values in bytes (5MB warning, 10MB error)"
  }
}
EOF

    # Check thresholds
    if [ "$frontend_size" -gt 10485760 ]; then
        log "ERROR" "Frontend bundle exceeds 10MB threshold"
    elif [ "$frontend_size" -gt 5242880 ]; then
        log "WARNING" "Frontend bundle exceeds 5MB warning threshold"
    fi

    log "SUCCESS" "Bundle size analysis complete"
}

analyze_dependencies_size() {
    log "INFO" "Analyzing dependency sizes..."

    cd "$PROJECT_ROOT"

    local deps_output="$OUTPUT_DIR/dependency-sizes.json"

    # Get largest dependencies
    local large_deps=()
    if [ -d "node_modules" ]; then
        while IFS= read -r line; do
            large_deps+=("$line")
        done < <(du -sh node_modules/*/ 2>/dev/null | sort -rh | head -10)
    fi

    # Calculate total node_modules size
    local nm_size=$(du -sb node_modules 2>/dev/null | cut -f1 || echo "0")

    log "METRIC" "node_modules: $(echo "scale=2; $nm_size / 1024 / 1024" | bc)MB"

    cat > "$deps_output" << EOF
{
  "analyzedAt": "$(date -Iseconds)",
  "nodeModules": {
    "bytes": $nm_size,
    "mb": $(echo "scale=2; $nm_size / 1024 / 1024" | bc)
  },
  "largestPackages": [
$(for dep in "${large_deps[@]:0:10}"; do
    size=$(echo "$dep" | awk '{print $1}')
    name=$(echo "$dep" | awk '{print $2}' | sed 's|node_modules/||' | sed 's|/$||')
    echo "    {\"name\": \"$name\", \"size\": \"$size\"},"
done | sed '$ s/,$//')
  ]
}
EOF

    log "SUCCESS" "Dependency size analysis complete"
}

analyze_startup_time() {
    log "INFO" "Analyzing startup time..."

    cd "$PROJECT_ROOT"

    local startup_output="$OUTPUT_DIR/startup-time.json"

    # Measure Node.js require time for backend
    local require_time=0
    if [ -f "packages/backend/dist/main.js" ]; then
        require_time=$(node -e "
            const start = Date.now();
            try { require('./packages/backend/dist/main.js'); } catch(e) {}
            console.log(Date.now() - start);
        " 2>/dev/null || echo "0")
    fi

    log "METRIC" "Backend require time: ${require_time}ms"

    cat > "$startup_output" << EOF
{
  "analyzedAt": "$(date -Iseconds)",
  "backend": {
    "requireTimeMs": $require_time,
    "status": "$([ "$require_time" -lt 5000 ] && echo "good" || echo "slow")"
  },
  "thresholds": {
    "good": 2000,
    "acceptable": 5000,
    "slow": 10000
  }
}
EOF

    log "SUCCESS" "Startup time analysis complete"
}

run_lighthouse_audit() {
    if [ "$RUN_LIGHTHOUSE" = "false" ]; then
        log "INFO" "Skipping Lighthouse audit (use --lighthouse to enable)"
        return
    fi

    log "INFO" "Running Lighthouse audit..."

    cd "$PROJECT_ROOT"

    local lighthouse_output="$OUTPUT_DIR/lighthouse-report.json"

    if command -v npx &> /dev/null; then
        # Check if frontend is running
        if curl -s http://localhost:3000 > /dev/null 2>&1; then
            npx lighthouse http://localhost:3000 \
                --output=json \
                --output-path="$lighthouse_output" \
                --chrome-flags="--headless" \
                --only-categories=performance,accessibility,best-practices,seo \
                2>/dev/null || {
                log "WARNING" "Lighthouse audit failed"
            }

            if [ -f "$lighthouse_output" ]; then
                local perf_score=$(cat "$lighthouse_output" | grep -o '"performance":[0-9.]*' | head -1 | grep -o '[0-9.]*')
                log "METRIC" "Lighthouse Performance: ${perf_score:-N/A}"
            fi
        else
            log "WARNING" "Frontend not running at http://localhost:3000"
            cat > "$lighthouse_output" << EOF
{
  "status": "skipped",
  "reason": "Frontend not running",
  "recommendation": "Start the frontend with 'pnpm dev' before running Lighthouse"
}
EOF
        fi
    else
        log "WARNING" "npx not available for Lighthouse"
    fi

    log "SUCCESS" "Lighthouse audit complete"
}

analyze_memory_usage() {
    log "INFO" "Analyzing memory patterns..."

    cd "$PROJECT_ROOT"

    local memory_output="$OUTPUT_DIR/memory-analysis.json"

    # Get V8 heap statistics
    local heap_info=$(node -e "
        const v8 = require('v8');
        const stats = v8.getHeapStatistics();
        console.log(JSON.stringify({
            totalHeapSize: stats.total_heap_size,
            usedHeapSize: stats.used_heap_size,
            heapSizeLimit: stats.heap_size_limit
        }));
    " 2>/dev/null || echo '{}')

    cat > "$memory_output" << EOF
{
  "analyzedAt": "$(date -Iseconds)",
  "v8HeapStatistics": $heap_info,
  "recommendations": [
    "Monitor memory usage in production",
    "Use streaming for large data operations",
    "Implement proper cleanup in long-running processes"
  ]
}
EOF

    log "SUCCESS" "Memory analysis complete"
}

generate_performance_score() {
    log "INFO" "Generating performance score..."

    local score_output="$OUTPUT_DIR/performance-score.json"

    local score=100
    local issues=()

    # Check bundle size
    if [ -f "$OUTPUT_DIR/bundle-sizes.json" ]; then
        local frontend_size=$(cat "$OUTPUT_DIR/bundle-sizes.json" | grep -o '"totalBytes":[0-9]*' | head -1 | grep -o '[0-9]*')
        if [ "${frontend_size:-0}" -gt 10485760 ]; then
            score=$((score - 20))
            issues+=("Large frontend bundle (>10MB)")
        elif [ "${frontend_size:-0}" -gt 5242880 ]; then
            score=$((score - 10))
            issues+=("Frontend bundle >5MB")
        fi
    fi

    # Check build time
    if [ -f "$OUTPUT_DIR/build-performance.json" ]; then
        local build_time=$(cat "$OUTPUT_DIR/build-performance.json" | grep -o '"durationMs":[0-9]*' | tail -1 | grep -o '[0-9]*')
        if [ "${build_time:-0}" -gt 120000 ]; then
            score=$((score - 15))
            issues+=("Slow build time (>2 min)")
        fi
    fi

    # Ensure minimum score
    [ $score -lt 0 ] && score=0

    log "METRIC" "Performance Score: $score/100"

    cat > "$score_output" << EOF
{
  "analyzedAt": "$(date -Iseconds)",
  "score": $score,
  "maxScore": 100,
  "grade": "$([ $score -ge 90 ] && echo "A" || ([ $score -ge 80 ] && echo "B" || ([ $score -ge 70 ] && echo "C" || ([ $score -ge 60 ] && echo "D" || echo "F"))))",
  "issues": [
$(printf '    "%s",\n' "${issues[@]}" | sed '$ s/,$//')
  ]
}
EOF
}

print_summary() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}           Performance Analysis Complete                     ${GREEN}║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    if [ -f "$OUTPUT_DIR/performance-score.json" ]; then
        local score=$(cat "$OUTPUT_DIR/performance-score.json" | grep -o '"score":[0-9]*' | grep -o '[0-9]*')
        local grade=$(cat "$OUTPUT_DIR/performance-score.json" | grep -o '"grade":"[A-F]"' | grep -o '[A-F]')
        echo "  Performance Score: $score/100 (Grade: $grade)"
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
        --lighthouse)
            RUN_LIGHTHOUSE="true"
            shift
            ;;
        --no-build)
            BENCHMARK_BUILD="false"
            shift
            ;;
        --help)
            echo "Usage: analyze-performance.sh [options]"
            echo ""
            echo "Options:"
            echo "  --output <dir>     Output directory for reports"
            echo "  --lighthouse       Run Lighthouse audit (requires running frontend)"
            echo "  --no-build         Skip build benchmark"
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
measure_build_time
analyze_bundle_sizes
analyze_dependencies_size
analyze_startup_time
run_lighthouse_audit
analyze_memory_usage
generate_performance_score
print_summary

exit 0
