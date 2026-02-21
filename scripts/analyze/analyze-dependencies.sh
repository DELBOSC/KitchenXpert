#!/bin/bash
#
# Analyze Dependencies - KitchenXpert
#
# Analyzes project dependencies for updates, vulnerabilities, and optimization opportunities.
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
OUTPUT_DIR="$PROJECT_ROOT/reports/dependencies"
CHECK_UPDATES="${CHECK_UPDATES:-true}"
CHECK_SECURITY="${CHECK_SECURITY:-true}"
CHECK_LICENSES="${CHECK_LICENSES:-true}"

# Logging
log() {
    local level=$1
    local message=$2
    case $level in
        "INFO")    echo -e "${BLUE}[DEPS]${NC} $message" ;;
        "SUCCESS") echo -e "${GREEN}[DEPS]${NC} $message" ;;
        "WARNING") echo -e "${YELLOW}[DEPS]${NC} $message" ;;
        "ERROR")   echo -e "${RED}[DEPS]${NC} $message" ;;
        "METRIC")  echo -e "${CYAN}[METRIC]${NC} $message" ;;
    esac
}

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}          KitchenXpert - Dependency Analysis                ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

setup_directories() {
    mkdir -p "$OUTPUT_DIR"
    log "INFO" "Output directory: $OUTPUT_DIR"
}

count_dependencies() {
    log "INFO" "Counting dependencies..."

    cd "$PROJECT_ROOT"

    local deps_output="$OUTPUT_DIR/dependency-count.json"

    # Count from package.json files
    local root_deps=$(cat package.json 2>/dev/null | grep -c '"' | head -1 || echo "0")
    local total_packages=$(find packages -name "package.json" -not -path "*/node_modules/*" | wc -l)

    # Count actual installed packages
    local installed=$(find node_modules -maxdepth 2 -name "package.json" 2>/dev/null | wc -l)

    log "METRIC" "Workspace packages: $total_packages"
    log "METRIC" "Installed packages: $installed"

    cat > "$deps_output" << EOF
{
  "analyzedAt": "$(date -Iseconds)",
  "workspacePackages": $total_packages,
  "installedPackages": $installed,
  "nodeModulesSize": "$(du -sh node_modules 2>/dev/null | cut -f1 || echo 'unknown')"
}
EOF

    log "SUCCESS" "Dependency count complete"
}

check_outdated() {
    if [ "$CHECK_UPDATES" = "false" ]; then
        log "INFO" "Skipping update check"
        return
    fi

    log "INFO" "Checking for outdated dependencies..."

    cd "$PROJECT_ROOT"

    local outdated_output="$OUTPUT_DIR/outdated.json"

    # Use pnpm outdated
    pnpm outdated --format json > "$outdated_output" 2>/dev/null || {
        echo '{"packages": [], "note": "No outdated packages or check failed"}' > "$outdated_output"
    }

    # Count outdated
    if [ -f "$outdated_output" ]; then
        local outdated_count=$(cat "$outdated_output" | grep -c '"current"' 2>/dev/null || echo "0")
        log "METRIC" "Outdated packages: $outdated_count"

        if [ "$outdated_count" -gt 0 ]; then
            log "WARNING" "Some packages are outdated"
        fi
    fi

    log "SUCCESS" "Update check complete"
}

run_security_audit() {
    if [ "$CHECK_SECURITY" = "false" ]; then
        log "INFO" "Skipping security audit"
        return
    fi

    log "INFO" "Running security audit..."

    cd "$PROJECT_ROOT"

    local audit_output="$OUTPUT_DIR/security-audit.json"

    # Run pnpm audit
    pnpm audit --json > "$audit_output" 2>/dev/null || {
        log "WARNING" "Security audit encountered issues"
    }

    if [ -f "$audit_output" ]; then
        local critical=$(cat "$audit_output" | grep -o '"critical":[0-9]*' | grep -o '[0-9]*' | head -1 || echo "0")
        local high=$(cat "$audit_output" | grep -o '"high":[0-9]*' | grep -o '[0-9]*' | head -1 || echo "0")
        local moderate=$(cat "$audit_output" | grep -o '"moderate":[0-9]*' | grep -o '[0-9]*' | head -1 || echo "0")
        local low=$(cat "$audit_output" | grep -o '"low":[0-9]*' | grep -o '[0-9]*' | head -1 || echo "0")

        log "METRIC" "Critical vulnerabilities: ${critical:-0}"
        log "METRIC" "High vulnerabilities: ${high:-0}"
        log "METRIC" "Moderate vulnerabilities: ${moderate:-0}"
        log "METRIC" "Low vulnerabilities: ${low:-0}"

        if [ "${critical:-0}" -gt 0 ] || [ "${high:-0}" -gt 0 ]; then
            log "ERROR" "Critical or high severity vulnerabilities found!"
        fi
    fi

    log "SUCCESS" "Security audit complete"
}

check_licenses() {
    if [ "$CHECK_LICENSES" = "false" ]; then
        log "INFO" "Skipping license check"
        return
    fi

    log "INFO" "Checking dependency licenses..."

    cd "$PROJECT_ROOT"

    local license_output="$OUTPUT_DIR/licenses.json"

    # Try to use license-checker if available
    if command -v npx &> /dev/null; then
        npx license-checker --json --out "$license_output" 2>/dev/null || {
            log "WARNING" "License checker not available, creating basic report"

            cat > "$license_output" << EOF
{
  "analyzedAt": "$(date -Iseconds)",
  "status": "basic",
  "note": "Install license-checker for detailed analysis: npm install -g license-checker",
  "commonLicenses": ["MIT", "Apache-2.0", "BSD-3-Clause", "ISC"]
}
EOF
        }
    fi

    log "SUCCESS" "License check complete"
}

analyze_bundle_impact() {
    log "INFO" "Analyzing dependency bundle impact..."

    cd "$PROJECT_ROOT"

    local impact_output="$OUTPUT_DIR/bundle-impact.json"

    # Identify large dependencies
    local large_deps=()

    if [ -d "node_modules" ]; then
        while IFS= read -r line; do
            local size=$(echo "$line" | awk '{print $1}')
            local name=$(echo "$line" | awk '{print $2}' | sed 's|node_modules/||' | cut -d'/' -f1)
            if [ -n "$name" ] && [ "$name" != "." ]; then
                large_deps+=("$name: $size")
            fi
        done < <(du -sh node_modules/*/ 2>/dev/null | sort -rh | head -20)
    fi

    cat > "$impact_output" << EOF
{
  "analyzedAt": "$(date -Iseconds)",
  "largestDependencies": [
$(for dep in "${large_deps[@]}"; do echo "    \"$dep\","; done | sed '$ s/,$//')
  ],
  "recommendations": [
    "Consider using lighter alternatives for large dependencies",
    "Use dynamic imports for rarely used features",
    "Check if all dependencies are actually used"
  ]
}
EOF

    log "SUCCESS" "Bundle impact analysis complete"
}

find_unused_dependencies() {
    log "INFO" "Looking for potentially unused dependencies..."

    cd "$PROJECT_ROOT"

    local unused_output="$OUTPUT_DIR/unused-analysis.json"

    # Try depcheck if available
    if command -v npx &> /dev/null && npx depcheck --version &> /dev/null 2>&1; then
        npx depcheck --json > "$unused_output" 2>/dev/null || {
            log "WARNING" "depcheck analysis failed"
        }
    else
        cat > "$unused_output" << EOF
{
  "analyzedAt": "$(date -Iseconds)",
  "status": "skipped",
  "note": "Install depcheck for unused dependency analysis: npm install -g depcheck"
}
EOF
    fi

    log "SUCCESS" "Unused dependency check complete"
}

analyze_peer_dependencies() {
    log "INFO" "Analyzing peer dependencies..."

    cd "$PROJECT_ROOT"

    local peer_output="$OUTPUT_DIR/peer-dependencies.json"

    # Check for peer dependency issues
    local peer_warnings=$(pnpm install --dry-run 2>&1 | grep -i "peer" | wc -l || echo "0")

    cat > "$peer_output" << EOF
{
  "analyzedAt": "$(date -Iseconds)",
  "peerWarnings": $peer_warnings,
  "status": "$([ "$peer_warnings" -eq 0 ] && echo "ok" || echo "warnings")"
}
EOF

    if [ "$peer_warnings" -gt 0 ]; then
        log "WARNING" "Found $peer_warnings peer dependency warnings"
    else
        log "SUCCESS" "No peer dependency issues"
    fi
}

generate_summary() {
    log "INFO" "Generating dependency summary..."

    local summary_output="$OUTPUT_DIR/summary.json"

    cat > "$summary_output" << EOF
{
  "analyzedAt": "$(date -Iseconds)",
  "project": "KitchenXpert",
  "reports": {
    "dependencyCount": $([ -f "$OUTPUT_DIR/dependency-count.json" ] && echo "true" || echo "false"),
    "outdated": $([ -f "$OUTPUT_DIR/outdated.json" ] && echo "true" || echo "false"),
    "securityAudit": $([ -f "$OUTPUT_DIR/security-audit.json" ] && echo "true" || echo "false"),
    "licenses": $([ -f "$OUTPUT_DIR/licenses.json" ] && echo "true" || echo "false"),
    "bundleImpact": $([ -f "$OUTPUT_DIR/bundle-impact.json" ] && echo "true" || echo "false"),
    "unused": $([ -f "$OUTPUT_DIR/unused-analysis.json" ] && echo "true" || echo "false"),
    "peerDependencies": $([ -f "$OUTPUT_DIR/peer-dependencies.json" ] && echo "true" || echo "false")
  }
}
EOF

    log "SUCCESS" "Summary generated"
}

print_summary() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}           Dependency Analysis Complete                      ${GREEN}║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "  Reports generated:"
    ls -la "$OUTPUT_DIR"/*.json 2>/dev/null | awk '{print "    • " $NF}' | sed "s|$OUTPUT_DIR/||"
    echo ""
    echo "  Full reports: $OUTPUT_DIR"
    echo ""
    echo "  Recommendations:"
    echo "    • Run 'pnpm update' to update packages"
    echo "    • Run 'pnpm audit fix' to fix vulnerabilities"
    echo "    • Review large dependencies for lighter alternatives"
    echo ""
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --output)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        --no-updates)
            CHECK_UPDATES="false"
            shift
            ;;
        --no-security)
            CHECK_SECURITY="false"
            shift
            ;;
        --no-licenses)
            CHECK_LICENSES="false"
            shift
            ;;
        --help)
            echo "Usage: analyze-dependencies.sh [options]"
            echo ""
            echo "Options:"
            echo "  --output <dir>     Output directory for reports"
            echo "  --no-updates       Skip checking for updates"
            echo "  --no-security      Skip security audit"
            echo "  --no-licenses      Skip license check"
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
count_dependencies
check_outdated
run_security_audit
check_licenses
analyze_bundle_impact
find_unused_dependencies
analyze_peer_dependencies
generate_summary
print_summary

exit 0
