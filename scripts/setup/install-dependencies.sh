#!/bin/bash
#
# Install Dependencies - KitchenXpert
#
# Installs all project dependencies with proper caching and verification.
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Configuration
FROZEN_LOCKFILE="${FROZEN_LOCKFILE:-false}"
CLEAN_INSTALL="${CLEAN_INSTALL:-false}"
SKIP_OPTIONAL="${SKIP_OPTIONAL:-false}"

# Logging
log() {
    local level=$1
    local message=$2

    case $level in
        "INFO")    echo -e "${BLUE}[DEPS]${NC} $message" ;;
        "SUCCESS") echo -e "${GREEN}[DEPS]${NC} $message" ;;
        "WARNING") echo -e "${YELLOW}[DEPS]${NC} $message" ;;
        "ERROR")   echo -e "${RED}[DEPS]${NC} $message" ;;
    esac
}

check_package_manager() {
    log "INFO" "Checking package manager..."

    # Check for pnpm
    if ! command -v pnpm &> /dev/null; then
        log "INFO" "pnpm not found, installing..."
        corepack enable && corepack prepare pnpm@8.15.0 --activate || {
            log "ERROR" "Failed to install pnpm"
            exit 1
        }
    fi

    log "INFO" "pnpm version: $(pnpm -v)"
}

clean_cache() {
    if [ "$CLEAN_INSTALL" = "true" ]; then
        log "INFO" "Cleaning existing installations..."

        cd "$PROJECT_ROOT"

        # Remove node_modules
        rm -rf node_modules
        rm -rf packages/*/node_modules

        # Clear pnpm cache
        pnpm store prune

        log "SUCCESS" "Cache cleaned"
    fi
}

verify_lockfile() {
    cd "$PROJECT_ROOT"

    if [ ! -f "pnpm-lock.yaml" ]; then
        log "WARNING" "No pnpm-lock.yaml found - dependencies may be inconsistent"
        FROZEN_LOCKFILE="false"
    fi
}

install_root_dependencies() {
    log "INFO" "Installing root dependencies..."

    cd "$PROJECT_ROOT"

    local install_args=()

    if [ "$FROZEN_LOCKFILE" = "true" ]; then
        install_args+=("--frozen-lockfile")
    fi

    if [ "$SKIP_OPTIONAL" = "true" ]; then
        install_args+=("--no-optional")
    fi

    pnpm install "${install_args[@]}" || {
        log "ERROR" "Failed to install dependencies"
        exit 1
    }

    log "SUCCESS" "Root dependencies installed"
}

install_workspace_dependencies() {
    log "INFO" "Installing workspace dependencies..."

    cd "$PROJECT_ROOT"

    # pnpm workspaces handle this automatically, but we can verify
    local workspaces=$(pnpm ls --depth 0 --json 2>/dev/null | grep -o '"name":[^,]*' | wc -l)

    log "INFO" "Found $workspaces workspace packages"

    log "SUCCESS" "Workspace dependencies installed"
}

install_python_dependencies() {
    # Check for Python requirements
    if [ -f "$PROJECT_ROOT/packages/ai-modules/requirements.txt" ]; then
        log "INFO" "Installing Python dependencies..."

        if command -v python3 &> /dev/null; then
            cd "$PROJECT_ROOT/packages/ai-modules"

            # Create virtual environment if not exists
            if [ ! -d "venv" ]; then
                python3 -m venv venv
            fi

            # Activate and install
            source venv/bin/activate 2>/dev/null || . venv/Scripts/activate 2>/dev/null
            pip install -r requirements.txt -q

            log "SUCCESS" "Python dependencies installed"
        else
            log "WARNING" "Python 3 not found - skipping Python dependencies"
        fi
    fi
}

verify_installation() {
    log "INFO" "Verifying installation..."

    cd "$PROJECT_ROOT"

    local issues=0

    # Check critical packages
    local critical_packages=("typescript" "eslint" "prettier")

    for package in "${critical_packages[@]}"; do
        if ! pnpm ls "$package" --depth 0 &> /dev/null; then
            log "WARNING" "Package not found: $package"
            ((issues++))
        fi
    done

    # Check workspace packages can be resolved
    if [ -f "pnpm-workspace.yaml" ]; then
        local workspace_count=$(find packages -name "package.json" -maxdepth 2 | wc -l)
        log "INFO" "Found $workspace_count workspace packages"
    fi

    if [ $issues -gt 0 ]; then
        log "WARNING" "$issues potential issues found"
    else
        log "SUCCESS" "All packages verified"
    fi
}

print_summary() {
    log "INFO" "Installation summary:"

    cd "$PROJECT_ROOT"

    # Count packages
    if [ -d "node_modules" ]; then
        local package_count=$(find node_modules -maxdepth 2 -name "package.json" 2>/dev/null | wc -l)
        log "INFO" "  Installed packages: $package_count"
    fi

    # Show disk usage
    if [ -d "node_modules" ]; then
        local size=$(du -sh node_modules 2>/dev/null | cut -f1)
        log "INFO" "  node_modules size: $size"
    fi

    log "SUCCESS" "Dependencies installation complete"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --frozen-lockfile)
            FROZEN_LOCKFILE="true"
            shift
            ;;
        --clean)
            CLEAN_INSTALL="true"
            shift
            ;;
        --no-optional)
            SKIP_OPTIONAL="true"
            shift
            ;;
        --help)
            echo "Usage: install-dependencies.sh [options]"
            echo ""
            echo "Options:"
            echo "  --frozen-lockfile  Use frozen lockfile (CI mode)"
            echo "  --clean            Clean install (remove existing node_modules)"
            echo "  --no-optional      Skip optional dependencies"
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
check_package_manager
clean_cache
verify_lockfile
install_root_dependencies
install_workspace_dependencies
install_python_dependencies
verify_installation
print_summary

exit 0
