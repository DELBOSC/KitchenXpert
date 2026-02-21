#!/bin/bash
#
# Clean Temp Files - KitchenXpert
#
# Cleans up temporary files, caches, and build artifacts.
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
DRY_RUN="${DRY_RUN:-false}"
CLEAN_NODE_MODULES="${CLEAN_NODE_MODULES:-false}"
CLEAN_BUILD="${CLEAN_BUILD:-true}"
CLEAN_CACHE="${CLEAN_CACHE:-true}"

# Stats
TOTAL_FREED=0
ITEMS_DELETED=0

# Logging
log() {
    local level=$1
    local message=$2
    case $level in
        "INFO")    echo -e "${BLUE}[CLEAN-TEMP]${NC} $message" ;;
        "SUCCESS") echo -e "${GREEN}[CLEAN-TEMP]${NC} $message" ;;
        "WARNING") echo -e "${YELLOW}[CLEAN-TEMP]${NC} $message" ;;
        "ERROR")   echo -e "${RED}[CLEAN-TEMP]${NC} $message" ;;
    esac
}

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}          KitchenXpert - Temporary Files Cleanup            ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

get_size() {
    local path="$1"
    if [ -e "$path" ]; then
        du -sh "$path" 2>/dev/null | cut -f1
    else
        echo "0"
    fi
}

get_size_bytes() {
    local path="$1"
    if [ -e "$path" ]; then
        du -sb "$path" 2>/dev/null | cut -f1 || echo 0
    else
        echo 0
    fi
}

clean_directory() {
    local dir="$1"
    local description="$2"

    if [ ! -d "$dir" ]; then
        return
    fi

    local size=$(get_size "$dir")
    local size_bytes=$(get_size_bytes "$dir")

    if [ "$DRY_RUN" = "true" ]; then
        log "INFO" "[DRY RUN] Would clean $description: $dir ($size)"
    else
        log "INFO" "Cleaning $description: $dir ($size)"
        rm -rf "$dir"
        mkdir -p "$dir" 2>/dev/null || true
        TOTAL_FREED=$((TOTAL_FREED + size_bytes))
        ((ITEMS_DELETED++))
        log "SUCCESS" "Cleaned $description"
    fi
}

clean_pattern() {
    local base_dir="$1"
    local pattern="$2"
    local description="$3"

    if [ ! -d "$base_dir" ]; then
        return
    fi

    local count=0
    local freed=0

    while IFS= read -r item; do
        local size_bytes=$(get_size_bytes "$item")

        if [ "$DRY_RUN" = "true" ]; then
            log "INFO" "[DRY RUN] Would delete: $item"
        else
            rm -rf "$item"
            freed=$((freed + size_bytes))
        fi
        ((count++))
    done < <(find "$base_dir" -name "$pattern" -type d 2>/dev/null)

    if [ $count -gt 0 ]; then
        TOTAL_FREED=$((TOTAL_FREED + freed))
        ITEMS_DELETED=$((ITEMS_DELETED + count))
        local freed_human=$(numfmt --to=iec $freed 2>/dev/null || echo "${freed}B")
        log "SUCCESS" "Cleaned $count $description ($freed_human)"
    fi
}

clean_next_cache() {
    log "INFO" "Cleaning Next.js caches..."

    local next_dirs=(
        "$PROJECT_ROOT/packages/frontend/.next"
        "$PROJECT_ROOT/packages/partner-portal/.next"
        "$PROJECT_ROOT/.next"
    )

    for dir in "${next_dirs[@]}"; do
        if [ -d "$dir" ]; then
            clean_directory "$dir/cache" "Next.js cache"
        fi
    done
}

clean_turbo_cache() {
    log "INFO" "Cleaning Turbo cache..."

    local turbo_dirs=(
        "$PROJECT_ROOT/.turbo"
        "$PROJECT_ROOT/node_modules/.cache/turbo"
    )

    for dir in "${turbo_dirs[@]}"; do
        clean_directory "$dir" "Turbo cache"
    done
}

clean_typescript_cache() {
    log "INFO" "Cleaning TypeScript caches..."

    clean_pattern "$PROJECT_ROOT" "*.tsbuildinfo" "TypeScript build info"
    clean_pattern "$PROJECT_ROOT" "tsconfig.tsbuildinfo" "TypeScript config cache"

    # Clean .tscache directories
    while IFS= read -r cache; do
        clean_directory "$cache" "TypeScript cache"
    done < <(find "$PROJECT_ROOT" -name ".tscache" -type d 2>/dev/null)
}

clean_jest_cache() {
    log "INFO" "Cleaning Jest caches..."

    local jest_cache="$PROJECT_ROOT/node_modules/.cache/jest"
    clean_directory "$jest_cache" "Jest cache"

    # Also clean coverage
    clean_directory "$PROJECT_ROOT/coverage" "Jest coverage"
}

clean_eslint_cache() {
    log "INFO" "Cleaning ESLint cache..."

    while IFS= read -r cache; do
        if [ "$DRY_RUN" = "true" ]; then
            log "INFO" "[DRY RUN] Would delete: $cache"
        else
            rm -f "$cache"
            ((ITEMS_DELETED++))
        fi
    done < <(find "$PROJECT_ROOT" -name ".eslintcache" -type f 2>/dev/null)
}

clean_build_artifacts() {
    log "INFO" "Cleaning build artifacts..."

    local build_dirs=(
        "$PROJECT_ROOT/dist"
        "$PROJECT_ROOT/build"
        "$PROJECT_ROOT/packages/backend/dist"
        "$PROJECT_ROOT/packages/frontend/out"
        "$PROJECT_ROOT/packages/ai-modules/dist"
    )

    for dir in "${build_dirs[@]}"; do
        clean_directory "$dir" "build artifacts"
    done
}

clean_temp_files() {
    log "INFO" "Cleaning temporary files..."

    local patterns=(
        "*.tmp"
        "*.temp"
        "*.swp"
        "*.swo"
        "*~"
        ".DS_Store"
        "Thumbs.db"
    )

    for pattern in "${patterns[@]}"; do
        while IFS= read -r file; do
            if [ "$DRY_RUN" = "true" ]; then
                log "INFO" "[DRY RUN] Would delete: $file"
            else
                rm -f "$file"
                ((ITEMS_DELETED++))
            fi
        done < <(find "$PROJECT_ROOT" -name "$pattern" -type f 2>/dev/null)
    done
}

clean_node_modules() {
    if [ "$CLEAN_NODE_MODULES" != "true" ]; then
        return
    fi

    log "WARNING" "Cleaning node_modules directories..."

    local total_size=0

    while IFS= read -r nm_dir; do
        local size_bytes=$(get_size_bytes "$nm_dir")
        total_size=$((total_size + size_bytes))

        if [ "$DRY_RUN" = "true" ]; then
            log "INFO" "[DRY RUN] Would delete: $nm_dir ($(get_size "$nm_dir"))"
        else
            rm -rf "$nm_dir"
            ((ITEMS_DELETED++))
        fi
    done < <(find "$PROJECT_ROOT" -name "node_modules" -type d -prune 2>/dev/null)

    TOTAL_FREED=$((TOTAL_FREED + total_size))

    if [ "$DRY_RUN" != "true" ]; then
        local freed_human=$(numfmt --to=iec $total_size 2>/dev/null || echo "${total_size}B")
        log "SUCCESS" "Cleaned node_modules ($freed_human)"
        log "INFO" "Run 'pnpm install' to reinstall dependencies"
    fi
}

clean_pnpm_cache() {
    log "INFO" "Cleaning pnpm cache..."

    if command -v pnpm &> /dev/null; then
        if [ "$DRY_RUN" = "true" ]; then
            log "INFO" "[DRY RUN] Would run: pnpm store prune"
        else
            pnpm store prune 2>/dev/null || true
            log "SUCCESS" "Pruned pnpm store"
        fi
    fi
}

clean_docker_artifacts() {
    log "INFO" "Checking Docker artifacts..."

    if command -v docker &> /dev/null; then
        # Show dangling images
        local dangling=$(docker images -f "dangling=true" -q 2>/dev/null | wc -l)

        if [ $dangling -gt 0 ]; then
            if [ "$DRY_RUN" = "true" ]; then
                log "INFO" "[DRY RUN] Would remove $dangling dangling image(s)"
            else
                docker image prune -f 2>/dev/null || true
                log "SUCCESS" "Removed dangling images"
            fi
        fi

        # Show unused volumes
        log "INFO" "Run 'docker system prune' for full cleanup"
    fi
}

clean_python_cache() {
    log "INFO" "Cleaning Python caches..."

    # __pycache__ directories
    clean_pattern "$PROJECT_ROOT" "__pycache__" "Python cache directories"

    # .pyc files
    while IFS= read -r pyc; do
        if [ "$DRY_RUN" = "true" ]; then
            log "INFO" "[DRY RUN] Would delete: $pyc"
        else
            rm -f "$pyc"
            ((ITEMS_DELETED++))
        fi
    done < <(find "$PROJECT_ROOT" -name "*.pyc" -type f 2>/dev/null)

    # .pytest_cache
    clean_pattern "$PROJECT_ROOT" ".pytest_cache" "pytest cache"

    # .mypy_cache
    clean_pattern "$PROJECT_ROOT" ".mypy_cache" "mypy cache"
}

print_summary() {
    local freed_human=$(numfmt --to=iec $TOTAL_FREED 2>/dev/null || echo "${TOTAL_FREED}B")

    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}           Temporary Files Cleanup Completed                ${GREEN}║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "  Items deleted:  $ITEMS_DELETED"
    echo "  Space freed:    $freed_human"
    echo ""

    if [ "$DRY_RUN" = "true" ]; then
        echo -e "  ${YELLOW}DRY RUN - No changes were made${NC}"
        echo ""
    fi
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN="true"
            shift
            ;;
        --node-modules)
            CLEAN_NODE_MODULES="true"
            shift
            ;;
        --no-build)
            CLEAN_BUILD="false"
            shift
            ;;
        --no-cache)
            CLEAN_CACHE="false"
            shift
            ;;
        --all)
            CLEAN_NODE_MODULES="true"
            CLEAN_BUILD="true"
            CLEAN_CACHE="true"
            shift
            ;;
        --help)
            echo "Usage: clean-temp.sh [options]"
            echo ""
            echo "Options:"
            echo "  --dry-run        Show what would be deleted"
            echo "  --node-modules   Also clean node_modules"
            echo "  --no-build       Don't clean build directories"
            echo "  --no-cache       Don't clean caches"
            echo "  --all            Clean everything including node_modules"
            echo "  --help           Show this help message"
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

if [ "$DRY_RUN" = "true" ]; then
    log "WARNING" "DRY RUN MODE - No files will be deleted"
    echo ""
fi

# Clean caches
if [ "$CLEAN_CACHE" = "true" ]; then
    clean_next_cache
    clean_turbo_cache
    clean_typescript_cache
    clean_jest_cache
    clean_eslint_cache
    clean_pnpm_cache
    clean_python_cache
fi

# Clean build artifacts
if [ "$CLEAN_BUILD" = "true" ]; then
    clean_build_artifacts
fi

# Clean temp files
clean_temp_files

# Clean node_modules if requested
clean_node_modules

# Docker cleanup info
clean_docker_artifacts

print_summary
