#!/bin/bash
#
# Clean Logs - KitchenXpert
#
# Cleans up old log files to free disk space.
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
LOG_DIRS=(
    "$PROJECT_ROOT/logs"
    "$PROJECT_ROOT/packages/backend/logs"
    "$PROJECT_ROOT/packages/frontend/.next/cache"
    "/var/log/kitchenxpert"
)
RETENTION_DAYS="${RETENTION_DAYS:-30}"
DRY_RUN="${DRY_RUN:-false}"
COMPRESS_BEFORE_DELETE="${COMPRESS_BEFORE_DELETE:-true}"

# Logging
log() {
    local level=$1
    local message=$2
    case $level in
        "INFO")    echo -e "${BLUE}[CLEAN-LOGS]${NC} $message" ;;
        "SUCCESS") echo -e "${GREEN}[CLEAN-LOGS]${NC} $message" ;;
        "WARNING") echo -e "${YELLOW}[CLEAN-LOGS]${NC} $message" ;;
        "ERROR")   echo -e "${RED}[CLEAN-LOGS]${NC} $message" ;;
    esac
}

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}              KitchenXpert - Log Cleanup                     ${BLUE}║${NC}"
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

# Stats tracking
declare -A STATS
STATS[files_deleted]=0
STATS[files_compressed]=0
STATS[space_freed]=0

compress_old_logs() {
    local dir="$1"
    local days="$2"

    log "INFO" "Compressing logs older than $days days in $dir..."

    local compressed=0

    while IFS= read -r file; do
        if [ "$DRY_RUN" = "true" ]; then
            log "INFO" "[DRY RUN] Would compress: $file"
        else
            gzip -9 "$file" 2>/dev/null && ((compressed++))
        fi
    done < <(find "$dir" -name "*.log" -type f -mtime +$days 2>/dev/null)

    STATS[files_compressed]=$((${STATS[files_compressed]} + compressed))

    if [ $compressed -gt 0 ]; then
        log "SUCCESS" "Compressed $compressed log file(s)"
    fi
}

delete_old_logs() {
    local dir="$1"
    local days="$2"
    local patterns=("*.log" "*.log.gz" "*.log.*" "*.out" "*.err")

    log "INFO" "Deleting logs older than $days days in $dir..."

    local deleted=0
    local freed=0

    for pattern in "${patterns[@]}"; do
        while IFS= read -r file; do
            local size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo 0)

            if [ "$DRY_RUN" = "true" ]; then
                log "INFO" "[DRY RUN] Would delete: $file ($(numfmt --to=iec $size 2>/dev/null || echo "${size}B"))"
            else
                rm -f "$file" && {
                    ((deleted++))
                    freed=$((freed + size))
                }
            fi
        done < <(find "$dir" -name "$pattern" -type f -mtime +$days 2>/dev/null)
    done

    STATS[files_deleted]=$((${STATS[files_deleted]} + deleted))
    STATS[space_freed]=$((${STATS[space_freed]} + freed))

    if [ $deleted -gt 0 ]; then
        local freed_human=$(numfmt --to=iec $freed 2>/dev/null || echo "${freed}B")
        log "SUCCESS" "Deleted $deleted file(s), freed $freed_human"
    fi
}

clean_empty_directories() {
    local dir="$1"

    log "INFO" "Removing empty directories in $dir..."

    local removed=0

    while IFS= read -r empty_dir; do
        if [ "$DRY_RUN" = "true" ]; then
            log "INFO" "[DRY RUN] Would remove empty dir: $empty_dir"
        else
            rmdir "$empty_dir" 2>/dev/null && ((removed++))
        fi
    done < <(find "$dir" -type d -empty 2>/dev/null)

    if [ $removed -gt 0 ]; then
        log "SUCCESS" "Removed $removed empty directory(ies)"
    fi
}

rotate_current_logs() {
    local dir="$1"

    log "INFO" "Rotating current logs..."

    local rotated=0

    while IFS= read -r file; do
        local base=$(basename "$file")
        local dir_path=$(dirname "$file")
        local timestamp=$(date +%Y%m%d_%H%M%S)
        local rotated_name="${base%.log}_${timestamp}.log"

        if [ "$DRY_RUN" = "true" ]; then
            log "INFO" "[DRY RUN] Would rotate: $file -> $rotated_name"
        else
            # Check if file is large enough to rotate (>10MB)
            local size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo 0)
            if [ $size -gt 10485760 ]; then
                mv "$file" "$dir_path/$rotated_name"
                touch "$file"
                gzip -9 "$dir_path/$rotated_name" &
                ((rotated++))
            fi
        fi
    done < <(find "$dir" -name "*.log" -type f 2>/dev/null)

    if [ $rotated -gt 0 ]; then
        log "SUCCESS" "Rotated $rotated large log file(s)"
    fi
}

clean_npm_logs() {
    log "INFO" "Cleaning npm/pnpm logs..."

    local npm_logs="$HOME/.npm/_logs"
    local pnpm_logs="$HOME/.pnpm-store"

    if [ -d "$npm_logs" ]; then
        local count=$(find "$npm_logs" -name "*.log" -type f -mtime +7 2>/dev/null | wc -l)
        if [ $count -gt 0 ]; then
            if [ "$DRY_RUN" = "true" ]; then
                log "INFO" "[DRY RUN] Would delete $count npm log(s)"
            else
                find "$npm_logs" -name "*.log" -type f -mtime +7 -delete 2>/dev/null
                log "SUCCESS" "Deleted $count npm log(s)"
            fi
        fi
    fi
}

clean_docker_logs() {
    log "INFO" "Checking Docker logs..."

    if command -v docker &> /dev/null; then
        # Get container log sizes
        local containers=$(docker ps -q 2>/dev/null)

        if [ -n "$containers" ]; then
            for container in $containers; do
                local name=$(docker inspect --format='{{.Name}}' "$container" 2>/dev/null | sed 's/\///')
                local log_path=$(docker inspect --format='{{.LogPath}}' "$container" 2>/dev/null)

                if [ -f "$log_path" ]; then
                    local size=$(du -h "$log_path" 2>/dev/null | cut -f1)
                    log "INFO" "Container $name: $size"
                fi
            done
        fi

        log "INFO" "To truncate Docker logs, run: docker system prune --volumes"
    fi
}

print_summary() {
    local freed_human=$(numfmt --to=iec ${STATS[space_freed]} 2>/dev/null || echo "${STATS[space_freed]}B")

    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}              Log Cleanup Completed                          ${GREEN}║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "  Files deleted:    ${STATS[files_deleted]}"
    echo "  Files compressed: ${STATS[files_compressed]}"
    echo "  Space freed:      $freed_human"
    echo "  Retention:        $RETENTION_DAYS days"
    echo ""

    if [ "$DRY_RUN" = "true" ]; then
        echo -e "  ${YELLOW}DRY RUN - No changes were made${NC}"
        echo ""
    fi
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --retention)
            RETENTION_DAYS="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN="true"
            shift
            ;;
        --no-compress)
            COMPRESS_BEFORE_DELETE="false"
            shift
            ;;
        --rotate)
            ROTATE_ONLY="true"
            shift
            ;;
        --dir)
            LOG_DIRS=("$2")
            shift 2
            ;;
        --help)
            echo "Usage: clean-logs.sh [options]"
            echo ""
            echo "Options:"
            echo "  --retention <days>   Days to retain logs (default: 30)"
            echo "  --dry-run            Show what would be deleted"
            echo "  --no-compress        Don't compress before deleting"
            echo "  --rotate             Only rotate current logs"
            echo "  --dir <path>         Specific directory to clean"
            echo "  --help               Show this help message"
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

log "INFO" "Retention period: $RETENTION_DAYS days"
echo ""

for dir in "${LOG_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        log "INFO" "Processing: $dir"
        log "INFO" "Current size: $(get_size "$dir")"

        if [ "$ROTATE_ONLY" = "true" ]; then
            rotate_current_logs "$dir"
        else
            if [ "$COMPRESS_BEFORE_DELETE" = "true" ]; then
                # Compress logs between 7 and retention days
                compress_old_logs "$dir" 7
            fi

            delete_old_logs "$dir" "$RETENTION_DAYS"
            clean_empty_directories "$dir"
        fi

        log "INFO" "New size: $(get_size "$dir")"
        echo ""
    fi
done

clean_npm_logs
clean_docker_logs

print_summary
