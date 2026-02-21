#!/bin/bash
#
# Dependency Security Check - KitchenXpert
#
# Checks dependencies for known security vulnerabilities.
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
FIX_VULNERABILITIES="${FIX:-false}"

# Logging
log() {
    local level=$1
    local message=$2
    case $level in
        "INFO")    echo -e "${BLUE}[DEP-CHECK]${NC} $message" ;;
        "SUCCESS") echo -e "${GREEN}[DEP-CHECK]${NC} $message" ;;
        "WARNING") echo -e "${YELLOW}[DEP-CHECK]${NC} $message" ;;
        "ERROR")   echo -e "${RED}[DEP-CHECK]${NC} $message" ;;
    esac
}

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}        KitchenXpert - Dependency Security Check            ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

check_npm_audit() {
    log "INFO" "Running npm/pnpm audit..."

    cd "$PROJECT_ROOT"

    mkdir -p "$OUTPUT_DIR"

    local audit_json="$OUTPUT_DIR/npm-audit.json"
    local audit_result

    # Run pnpm audit
    if pnpm audit --json > "$audit_json" 2>/dev/null; then
        log "SUCCESS" "No vulnerabilities found in npm packages"
        return 0
    else
        audit_result=$(cat "$audit_json")

        # Parse vulnerabilities
        local total=$(echo "$audit_result" | grep -c '"severity"' 2>/dev/null || echo "0")
        local critical=$(echo "$audit_result" | grep -c '"critical"' 2>/dev/null || echo "0")
        local high=$(echo "$audit_result" | grep -c '"high"' 2>/dev/null || echo "0")
        local moderate=$(echo "$audit_result" | grep -c '"moderate"' 2>/dev/null || echo "0")
        local low=$(echo "$audit_result" | grep -c '"low"' 2>/dev/null || echo "0")

        echo ""
        log "WARNING" "Found vulnerabilities:"
        echo "  Critical:  $critical"
        echo "  High:      $high"
        echo "  Moderate:  $moderate"
        echo "  Low:       $low"
        echo "  Total:     $total"
        echo ""

        # Show human-readable output
        pnpm audit 2>/dev/null || true

        return 1
    fi
}

check_license_compliance() {
    log "INFO" "Checking license compliance..."

    cd "$PROJECT_ROOT"

    local license_file="$OUTPUT_DIR/licenses.json"

    # Check for license-checker
    if ! command -v license-checker &> /dev/null; then
        if command -v npx &> /dev/null; then
            npx license-checker --json > "$license_file" 2>/dev/null || {
                log "WARNING" "Could not run license checker"
                return 0
            }
        else
            log "WARNING" "license-checker not available"
            return 0
        fi
    else
        license-checker --json > "$license_file" 2>/dev/null
    fi

    # Check for problematic licenses
    local problematic_licenses=("GPL" "AGPL" "SSPL" "BUSL")
    local issues=0

    for license in "${problematic_licenses[@]}"; do
        local count=$(grep -c "\"$license" "$license_file" 2>/dev/null || echo "0")
        if [ $count -gt 0 ]; then
            log "WARNING" "Found $count package(s) with $license license"
            ((issues++))
        fi
    done

    if [ $issues -eq 0 ]; then
        log "SUCCESS" "No problematic licenses found"
    fi
}

check_outdated_packages() {
    log "INFO" "Checking for outdated packages..."

    cd "$PROJECT_ROOT"

    local outdated_file="$OUTPUT_DIR/outdated.txt"

    pnpm outdated > "$outdated_file" 2>&1 || true

    if [ -s "$outdated_file" ]; then
        local count=$(wc -l < "$outdated_file")
        log "WARNING" "Found outdated packages (see $outdated_file)"

        # Show major version updates
        echo ""
        echo "  Major version updates available:"
        pnpm outdated 2>/dev/null | grep -E "^[a-z@].*major" || echo "  None"
    else
        log "SUCCESS" "All packages are up to date"
    fi
}

check_deprecated_packages() {
    log "INFO" "Checking for deprecated packages..."

    cd "$PROJECT_ROOT"

    # Check package.json for known deprecated packages
    local deprecated_packages=(
        "request"
        "node-uuid"
        "querystring"
        "moment"
        "tslint"
    )

    local found_deprecated=0

    for pkg in "${deprecated_packages[@]}"; do
        if grep -q "\"$pkg\"" "$PROJECT_ROOT/package.json" 2>/dev/null; then
            log "WARNING" "Found deprecated package: $pkg"
            ((found_deprecated++))
        fi
    done

    if [ $found_deprecated -eq 0 ]; then
        log "SUCCESS" "No known deprecated packages found"
    fi
}

check_supply_chain() {
    log "INFO" "Checking for supply chain security..."

    cd "$PROJECT_ROOT"

    local issues=0

    # Check for lockfile integrity
    if [ -f "pnpm-lock.yaml" ]; then
        if pnpm install --frozen-lockfile --dry-run &> /dev/null; then
            log "SUCCESS" "Lockfile integrity verified"
        else
            log "WARNING" "Lockfile may be out of sync"
            ((issues++))
        fi
    fi

    # Check for packages without integrity hashes
    if [ -f "pnpm-lock.yaml" ]; then
        local no_integrity=$(grep -c "resolution:" pnpm-lock.yaml 2>/dev/null || echo "0")
        local with_integrity=$(grep -c "integrity:" pnpm-lock.yaml 2>/dev/null || echo "0")

        if [ $with_integrity -lt $no_integrity ]; then
            log "WARNING" "Some packages missing integrity hashes"
            ((issues++))
        fi
    fi

    # Check for typosquatting patterns
    local suspicious_names=$(grep -oE '"@?[a-z]+-[a-z]+(-[a-z]+)*"' "$PROJECT_ROOT/package.json" 2>/dev/null | \
        grep -E "(lodahs|momnet|recat|expresss|typescrit)" || true)

    if [ -n "$suspicious_names" ]; then
        log "WARNING" "Potentially suspicious package names found"
        echo "$suspicious_names"
        ((issues++))
    fi

    if [ $issues -eq 0 ]; then
        log "SUCCESS" "Supply chain checks passed"
    fi
}

fix_vulnerabilities() {
    if [ "$FIX_VULNERABILITIES" != "true" ]; then
        return
    fi

    log "INFO" "Attempting to fix vulnerabilities..."

    cd "$PROJECT_ROOT"

    # Try pnpm audit fix
    pnpm audit fix 2>/dev/null || {
        log "WARNING" "Could not automatically fix all vulnerabilities"
        log "INFO" "Manual intervention may be required"
    }

    # Run audit again
    check_npm_audit
}

generate_sbom() {
    log "INFO" "Generating Software Bill of Materials (SBOM)..."

    cd "$PROJECT_ROOT"

    local sbom_file="$OUTPUT_DIR/sbom.json"

    # Try to generate SBOM using cyclonedx
    if command -v cyclonedx-npm &> /dev/null; then
        cyclonedx-npm --output-format json > "$sbom_file" 2>/dev/null
        log "SUCCESS" "SBOM generated: $sbom_file"
    elif command -v npx &> /dev/null; then
        npx @cyclonedx/bom --output "$sbom_file" 2>/dev/null || {
            log "WARNING" "Could not generate SBOM"
        }
    else
        log "INFO" "SBOM generation tools not available"
    fi
}

print_summary() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}         Dependency Check Summary                            ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "  Reports saved to: $OUTPUT_DIR"
    echo ""
    echo "  Next steps:"
    echo "    - Review npm-audit.json for vulnerability details"
    echo "    - Update outdated packages: pnpm update"
    echo "    - Run 'pnpm audit fix' to auto-fix some issues"
    echo ""
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --fix)
            FIX_VULNERABILITIES="true"
            shift
            ;;
        --output|-o)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        --sbom)
            GENERATE_SBOM="true"
            shift
            ;;
        --help)
            echo "Usage: dependency-check.sh [options]"
            echo ""
            echo "Options:"
            echo "  --fix              Attempt to fix vulnerabilities"
            echo "  -o, --output <dir> Output directory for reports"
            echo "  --sbom             Generate Software Bill of Materials"
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

vuln_found=false
check_npm_audit || vuln_found=true
check_license_compliance
check_outdated_packages
check_deprecated_packages
check_supply_chain

if [ "$GENERATE_SBOM" = "true" ]; then
    generate_sbom
fi

if [ "$vuln_found" = "true" ]; then
    fix_vulnerabilities
fi

print_summary

# Exit with appropriate code
if [ "$vuln_found" = "true" ]; then
    exit 1
else
    exit 0
fi
