#!/bin/bash
#
# Backup All Databases - KitchenXpert
#
# Orchestrates backups of all databases (PostgreSQL and MongoDB).
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
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Configuration
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups}"
BACKUP_TYPE="${BACKUP_TYPE:-daily}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
PARALLEL="${PARALLEL:-false}"

# Logging
log() {
    local level=$1
    local message=$2
    case $level in
        "INFO")    echo -e "${BLUE}[BACKUP]${NC} $message" ;;
        "SUCCESS") echo -e "${GREEN}[BACKUP]${NC} $message" ;;
        "WARNING") echo -e "${YELLOW}[BACKUP]${NC} $message" ;;
        "ERROR")   echo -e "${RED}[BACKUP]${NC} $message" ;;
        "STEP")    echo -e "${CYAN}[STEP]${NC} $message" ;;
    esac
}

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}          KitchenXpert - Full Database Backup               ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

setup_directories() {
    log "INFO" "Setting up backup directories..."

    mkdir -p "$BACKUP_DIR"
    mkdir -p "$BACKUP_DIR/postgresql"
    mkdir -p "$BACKUP_DIR/mongodb"
    mkdir -p "$BACKUP_DIR/logs"

    log "SUCCESS" "Backup directory: $BACKUP_DIR"
}

backup_postgresql() {
    log "STEP" "Starting PostgreSQL backup..."

    local pg_script="$SCRIPT_DIR/backup-postgresql.sh"
    local log_file="$BACKUP_DIR/logs/postgresql_$(date +%Y%m%d_%H%M%S).log"

    if [ -f "$pg_script" ]; then
        "$pg_script" \
            --output "$BACKUP_DIR/postgresql" \
            --type "$BACKUP_TYPE" \
            --retention "$RETENTION_DAYS" \
            2>&1 | tee "$log_file"

        if [ ${PIPESTATUS[0]} -eq 0 ]; then
            log "SUCCESS" "PostgreSQL backup completed"
            return 0
        else
            log "ERROR" "PostgreSQL backup failed"
            return 1
        fi
    else
        log "WARNING" "PostgreSQL backup script not found"
        return 1
    fi
}

backup_mongodb() {
    log "STEP" "Starting MongoDB backup..."

    local mongo_script="$SCRIPT_DIR/backup-mongodb.sh"
    local log_file="$BACKUP_DIR/logs/mongodb_$(date +%Y%m%d_%H%M%S).log"

    if [ -f "$mongo_script" ]; then
        "$mongo_script" \
            --output "$BACKUP_DIR/mongodb" \
            --type "$BACKUP_TYPE" \
            --retention "$RETENTION_DAYS" \
            2>&1 | tee "$log_file"

        if [ ${PIPESTATUS[0]} -eq 0 ]; then
            log "SUCCESS" "MongoDB backup completed"
            return 0
        else
            log "ERROR" "MongoDB backup failed"
            return 1
        fi
    else
        log "WARNING" "MongoDB backup script not found"
        return 1
    fi
}

run_backups() {
    local pg_status=0
    local mongo_status=0

    if [ "$PARALLEL" = "true" ]; then
        log "INFO" "Running backups in parallel..."

        # Run both backups in parallel
        backup_postgresql &
        local pg_pid=$!

        backup_mongodb &
        local mongo_pid=$!

        # Wait for both to complete
        wait $pg_pid || pg_status=1
        wait $mongo_pid || mongo_status=1
    else
        log "INFO" "Running backups sequentially..."

        backup_postgresql || pg_status=1
        backup_mongodb || mongo_status=1
    fi

    # Return overall status
    if [ $pg_status -eq 0 ] && [ $mongo_status -eq 0 ]; then
        return 0
    else
        return 1
    fi
}

calculate_backup_size() {
    log "INFO" "Calculating backup sizes..."

    local pg_size=$(du -sh "$BACKUP_DIR/postgresql" 2>/dev/null | cut -f1 || echo "0")
    local mongo_size=$(du -sh "$BACKUP_DIR/mongodb" 2>/dev/null | cut -f1 || echo "0")
    local total_size=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1 || echo "0")

    echo "  PostgreSQL: $pg_size"
    echo "  MongoDB:    $mongo_size"
    echo "  Total:      $total_size"
}

generate_manifest() {
    log "INFO" "Generating backup manifest..."

    local manifest_file="$BACKUP_DIR/manifest.json"
    local timestamp=$(date -Iseconds)

    cat > "$manifest_file" << EOF
{
  "generatedAt": "$timestamp",
  "project": "KitchenXpert",
  "backupType": "$BACKUP_TYPE",
  "databases": {
    "postgresql": {
      "path": "$BACKUP_DIR/postgresql",
      "status": "$([ -d "$BACKUP_DIR/postgresql" ] && echo "available" || echo "missing")"
    },
    "mongodb": {
      "path": "$BACKUP_DIR/mongodb",
      "status": "$([ -d "$BACKUP_DIR/mongodb" ] && echo "available" || echo "missing")"
    }
  },
  "retention": {
    "days": $RETENTION_DAYS
  }
}
EOF

    log "SUCCESS" "Manifest generated"
}

cleanup_old_logs() {
    log "INFO" "Cleaning up old log files..."

    local deleted=0
    while IFS= read -r file; do
        rm -f "$file"
        ((deleted++))
    done < <(find "$BACKUP_DIR/logs" -name "*.log" -type f -mtime +30 2>/dev/null)

    if [ $deleted -gt 0 ]; then
        log "INFO" "Deleted $deleted old log file(s)"
    fi
}

send_notification() {
    local status="$1"
    local message="$2"

    # Check for notification webhook
    if [ -n "$BACKUP_WEBHOOK_URL" ]; then
        curl -s -X POST "$BACKUP_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{
                \"status\": \"$status\",
                \"message\": \"$message\",
                \"timestamp\": \"$(date -Iseconds)\",
                \"project\": \"KitchenXpert\"
            }" &> /dev/null || true
    fi

    # Log to file
    echo "[$(date -Iseconds)] [$status] $message" >> "$BACKUP_DIR/logs/notifications.log"
}

print_summary() {
    local status="$1"

    echo ""
    if [ "$status" = "success" ]; then
        echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║${NC}              All Backups Completed Successfully             ${GREEN}║${NC}"
        echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    else
        echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${YELLOW}║${NC}              Backup Completed with Warnings                 ${YELLOW}║${NC}"
        echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"
    fi
    echo ""
    echo "  Backup type: $BACKUP_TYPE"
    echo "  Backup directory: $BACKUP_DIR"
    echo ""
    echo "  Sizes:"
    calculate_backup_size
    echo ""
    echo "  Logs: $BACKUP_DIR/logs/"
    echo ""
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --output)
            BACKUP_DIR="$2"
            shift 2
            ;;
        --type)
            BACKUP_TYPE="$2"
            shift 2
            ;;
        --retention)
            RETENTION_DAYS="$2"
            shift 2
            ;;
        --parallel)
            PARALLEL="true"
            shift
            ;;
        --postgresql-only)
            POSTGRESQL_ONLY="true"
            shift
            ;;
        --mongodb-only)
            MONGODB_ONLY="true"
            shift
            ;;
        --help)
            echo "Usage: backup-all.sh [options]"
            echo ""
            echo "Options:"
            echo "  --output <dir>       Backup directory"
            echo "  --type <type>        Backup type: daily, weekly, monthly"
            echo "  --retention <days>   Days to retain daily backups"
            echo "  --parallel           Run backups in parallel"
            echo "  --postgresql-only    Only backup PostgreSQL"
            echo "  --mongodb-only       Only backup MongoDB"
            echo "  --help               Show this help message"
            exit 0
            ;;
        *)
            log "ERROR" "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Load environment variables
if [ -f "$PROJECT_ROOT/.env" ]; then
    source "$PROJECT_ROOT/.env" 2>/dev/null || true
fi

# Main execution
print_header
setup_directories

backup_status=0

if [ "$POSTGRESQL_ONLY" = "true" ]; then
    backup_postgresql || backup_status=1
elif [ "$MONGODB_ONLY" = "true" ]; then
    backup_mongodb || backup_status=1
else
    run_backups || backup_status=1
fi

cleanup_old_logs
generate_manifest

if [ $backup_status -eq 0 ]; then
    print_summary "success"
    send_notification "success" "All database backups completed successfully"
else
    print_summary "warning"
    send_notification "warning" "Database backup completed with some failures"
fi

exit $backup_status
