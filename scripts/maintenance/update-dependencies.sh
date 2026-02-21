#!/bin/bash
#
# Update Dependencies - KitchenXpert
#
# Updates project dependencies with safety checks and rollback support.
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
DRY_RUN="${DRY_RUN:-false}"
UPDATE_LEVEL="${UPDATE_LEVEL:-minor}"
INTERACTIVE="${INTERACTIVE:-false}"
RUN_TESTS="${RUN_TESTS:-true}"
CREATE_BACKUP="${CREATE_BACKUP:-true}"

# Logging
log() {
    local level=$1
    local message=$2
    case $level in
        "INFO")    echo -e "${BLUE}[UPDATE]${NC} $message" ;;
        "SUCCESS") echo -e "${GREEN}[UPDATE]${NC} $message" ;;
        "WARNING") echo -e "${YELLOW}[UPDATE]${NC} $message" ;;
        "ERROR")   echo -e "${RED}[UPDATE]${NC} $message" ;;
        "STEP")    echo -e "${CYAN}[STEP]${NC} $message" ;;
    esac
}

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}           KitchenXpert - Dependency Update                  ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

check_prerequisites() {
    log "INFO" "Checking prerequisites..."

    if ! command -v pnpm &> /dev/null; then
        log "ERROR" "pnpm is not installed"
        exit 1
    fi

    if ! command -v node &> /dev/null; then
        log "ERROR" "Node.js is not installed"
        exit 1
    fi

    # Check if we're in the project root
    if [ ! -f "$PROJECT_ROOT/package.json" ]; then
        log "ERROR" "package.json not found in project root"
        exit 1
    fi

    log "SUCCESS" "Prerequisites verified"
}

backup_lock_files() {
    if [ "$CREATE_BACKUP" != "true" ]; then
        return
    fi

    log "INFO" "Creating backup of lock files..."

    local backup_dir="$PROJECT_ROOT/.dep-backups"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_path="$backup_dir/$timestamp"

    mkdir -p "$backup_path"

    # Backup pnpm-lock.yaml
    if [ -f "$PROJECT_ROOT/pnpm-lock.yaml" ]; then
        cp "$PROJECT_ROOT/pnpm-lock.yaml" "$backup_path/"
    fi

    # Backup package.json files
    find "$PROJECT_ROOT" -name "package.json" -not -path "*/node_modules/*" | while read pkg; do
        local rel_path=$(dirname "${pkg#$PROJECT_ROOT/}")
        mkdir -p "$backup_path/$rel_path"
        cp "$pkg" "$backup_path/$rel_path/"
    done

    log "SUCCESS" "Backup created at: $backup_path"
    echo "$backup_path" > "$PROJECT_ROOT/.dep-backups/latest"
}

check_outdated() {
    log "STEP" "Checking for outdated dependencies..."
    echo ""

    cd "$PROJECT_ROOT"

    # Get outdated packages
    local outdated=$(pnpm outdated --format json 2>/dev/null || echo "{}")

    if [ "$outdated" = "{}" ] || [ -z "$outdated" ]; then
        log "SUCCESS" "All dependencies are up to date!"
        return 0
    fi

    # Parse and display outdated packages
    echo "  Outdated packages:"
    echo ""

    pnpm outdated 2>/dev/null || true

    echo ""
    return 0
}

run_security_audit() {
    log "STEP" "Running security audit..."

    cd "$PROJECT_ROOT"

    local audit_result
    audit_result=$(pnpm audit 2>&1) || true

    if echo "$audit_result" | grep -q "found 0 vulnerabilities"; then
        log "SUCCESS" "No vulnerabilities found"
    else
        log "WARNING" "Security vulnerabilities detected"

        if [ "$VERBOSE" = "true" ]; then
            echo "$audit_result"
        fi

        echo ""
        read -p "Continue with update? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            log "INFO" "Update cancelled"
            exit 0
        fi
    fi
}

update_dependencies() {
    log "STEP" "Updating dependencies..."

    cd "$PROJECT_ROOT"

    local update_cmd=""

    case $UPDATE_LEVEL in
        "patch")
            log "INFO" "Updating patch versions only..."
            update_cmd="pnpm update"
            ;;
        "minor")
            log "INFO" "Updating minor and patch versions..."
            update_cmd="pnpm update"
            ;;
        "major")
            log "INFO" "Updating all versions including major..."
            update_cmd="pnpm update --latest"
            ;;
        "interactive")
            log "INFO" "Interactive update mode..."
            update_cmd="pnpm update --interactive"
            INTERACTIVE="true"
            ;;
    esac

    if [ "$DRY_RUN" = "true" ]; then
        log "INFO" "[DRY RUN] Would run: $update_cmd"
        return
    fi

    if [ "$INTERACTIVE" = "true" ]; then
        $update_cmd
    else
        $update_cmd 2>&1 | while read line; do
            echo "  $line"
        done
    fi

    log "SUCCESS" "Dependencies updated"
}

update_specific_packages() {
    local packages=("$@")

    if [ ${#packages[@]} -eq 0 ]; then
        return
    fi

    log "STEP" "Updating specific packages: ${packages[*]}"

    cd "$PROJECT_ROOT"

    for pkg in "${packages[@]}"; do
        log "INFO" "Updating $pkg..."

        if [ "$DRY_RUN" = "true" ]; then
            log "INFO" "[DRY RUN] Would update: $pkg"
        else
            pnpm update "$pkg" 2>&1 | while read line; do
                echo "    $line"
            done
        fi
    done

    log "SUCCESS" "Specific packages updated"
}

run_type_check() {
    log "STEP" "Running type check..."

    cd "$PROJECT_ROOT"

    if pnpm type-check 2>/dev/null; then
        log "SUCCESS" "Type check passed"
        return 0
    else
        log "ERROR" "Type check failed"
        return 1
    fi
}

run_tests() {
    if [ "$RUN_TESTS" != "true" ]; then
        log "INFO" "Skipping tests (RUN_TESTS=false)"
        return 0
    fi

    log "STEP" "Running tests..."

    cd "$PROJECT_ROOT"

    if pnpm test --passWithNoTests 2>/dev/null; then
        log "SUCCESS" "Tests passed"
        return 0
    else
        log "ERROR" "Tests failed"
        return 1
    fi
}

run_build() {
    log "STEP" "Running build verification..."

    cd "$PROJECT_ROOT"

    if pnpm build 2>/dev/null; then
        log "SUCCESS" "Build successful"
        return 0
    else
        log "ERROR" "Build failed"
        return 1
    fi
}

rollback() {
    log "WARNING" "Rolling back changes..."

    local latest_backup=$(cat "$PROJECT_ROOT/.dep-backups/latest" 2>/dev/null)

    if [ -z "$latest_backup" ] || [ ! -d "$latest_backup" ]; then
        log "ERROR" "No backup found to rollback to"
        exit 1
    fi

    # Restore lock file
    if [ -f "$latest_backup/pnpm-lock.yaml" ]; then
        cp "$latest_backup/pnpm-lock.yaml" "$PROJECT_ROOT/"
    fi

    # Restore package.json files
    find "$latest_backup" -name "package.json" | while read pkg; do
        local rel_path="${pkg#$latest_backup/}"
        cp "$pkg" "$PROJECT_ROOT/$rel_path"
    done

    # Reinstall
    cd "$PROJECT_ROOT"
    pnpm install --frozen-lockfile

    log "SUCCESS" "Rollback complete"
}

verify_update() {
    log "STEP" "Verifying update..."

    local failed=0

    # Type check
    if ! run_type_check; then
        ((failed++))
    fi

    # Tests
    if ! run_tests; then
        ((failed++))
    fi

    # Build (optional in verification)
    if [ "$VERIFY_BUILD" = "true" ]; then
        if ! run_build; then
            ((failed++))
        fi
    fi

    if [ $failed -gt 0 ]; then
        log "ERROR" "Verification failed with $failed error(s)"

        if [ "$AUTO_ROLLBACK" = "true" ]; then
            rollback
        else
            echo ""
            read -p "Rollback changes? (yes/no): " confirm
            if [ "$confirm" = "yes" ]; then
                rollback
            fi
        fi

        return 1
    fi

    log "SUCCESS" "Verification passed"
    return 0
}

generate_changelog() {
    log "INFO" "Generating update changelog..."

    local changelog_file="$PROJECT_ROOT/DEPENDENCY_UPDATES.md"
    local date=$(date '+%Y-%m-%d')

    {
        echo ""
        echo "## $date"
        echo ""
        echo "### Updated Dependencies"
        echo ""

        # Get git diff of package.json
        git diff --no-color package.json 2>/dev/null | grep "^[+-].*\":" | head -20

        echo ""
    } >> "$changelog_file"

    log "SUCCESS" "Changelog updated"
}

print_summary() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}           Dependency Update Completed                       ${GREEN}║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "  Update level:    $UPDATE_LEVEL"
    echo "  Tests run:       $RUN_TESTS"
    echo "  Verification:    passed"
    echo ""
    echo "  Next steps:"
    echo "    1. Review the changes: git diff"
    echo "    2. Test the application manually"
    echo "    3. Commit the changes: git add . && git commit -m 'chore: update dependencies'"
    echo ""
}

# Parse arguments
PACKAGES=()

while [[ $# -gt 0 ]]; do
    case $1 in
        --level)
            UPDATE_LEVEL="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN="true"
            shift
            ;;
        --interactive|-i)
            UPDATE_LEVEL="interactive"
            shift
            ;;
        --no-tests)
            RUN_TESTS="false"
            shift
            ;;
        --no-backup)
            CREATE_BACKUP="false"
            shift
            ;;
        --verify-build)
            VERIFY_BUILD="true"
            shift
            ;;
        --auto-rollback)
            AUTO_ROLLBACK="true"
            shift
            ;;
        --package|-p)
            PACKAGES+=("$2")
            shift 2
            ;;
        --check-only)
            CHECK_ONLY="true"
            shift
            ;;
        --rollback)
            rollback
            exit 0
            ;;
        --verbose|-v)
            VERBOSE="true"
            shift
            ;;
        --help)
            echo "Usage: update-dependencies.sh [options]"
            echo ""
            echo "Options:"
            echo "  --level <level>      Update level: patch, minor, major, interactive"
            echo "  --dry-run            Show what would be updated"
            echo "  -i, --interactive    Interactive update mode"
            echo "  -p, --package <pkg>  Update specific package(s)"
            echo "  --no-tests           Skip running tests"
            echo "  --no-backup          Skip creating backup"
            echo "  --verify-build       Run build as part of verification"
            echo "  --auto-rollback      Automatically rollback on failure"
            echo "  --check-only         Only check for updates, don't install"
            echo "  --rollback           Rollback to previous state"
            echo "  -v, --verbose        Verbose output"
            echo "  --help               Show this help message"
            echo ""
            echo "Examples:"
            echo "  update-dependencies.sh                    # Minor updates"
            echo "  update-dependencies.sh --level major      # Major updates"
            echo "  update-dependencies.sh -p typescript      # Update specific package"
            echo "  update-dependencies.sh --check-only       # Just check for updates"
            exit 0
            ;;
        *)
            PACKAGES+=("$1")
            shift
            ;;
    esac
done

# Main execution
print_header

if [ "$DRY_RUN" = "true" ]; then
    log "WARNING" "DRY RUN MODE - No changes will be made"
    echo ""
fi

check_prerequisites
check_outdated

if [ "$CHECK_ONLY" = "true" ]; then
    run_security_audit
    exit 0
fi

backup_lock_files
run_security_audit

if [ ${#PACKAGES[@]} -gt 0 ]; then
    update_specific_packages "${PACKAGES[@]}"
else
    update_dependencies
fi

if [ "$DRY_RUN" != "true" ]; then
    if verify_update; then
        generate_changelog
        print_summary
    else
        exit 1
    fi
fi
