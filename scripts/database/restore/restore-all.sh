#!/bin/bash
#
# Restore All Databases - KitchenXpert
#
# Orchestrates restoration of all databases from backups.
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
RESTORE_TYPE="${RESTORE_TYPE:-latest}"
DRY_RUN="${DRY_RUN:-false}"

# Logging
log() {
    local level=$1
    local message=$2
    case $level in
        "INFO")    echo -e "${BLUE}[RESTORE]${NC} $message" ;;
        "SUCCESS") echo -e "${GREEN}[RESTORE]${NC} $message" ;;
        "WARNING") echo -e "${YELLOW}[RESTORE]${NC} $message" ;;
        "ERROR")   echo -e "${RED}[RESTORE]${NC} $message" ;;
        "STEP")    echo -e "${CYAN}[STEP]${NC} $message" ;;
    esac
}

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}          KitchenXpert - Full Database Restore              ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

find_latest_backup() {
    local db_type="$1"
    local backup_path="$BACKUP_DIR/$db_type"

    if [ ! -d "$backup_path" ]; then
        echo ""
        return
    fi

    # Find latest backup file
    local latest=""
    for type in daily weekly monthly; do
        if [ -d "$backup_path/$type" ]; then
            local found=$(find "$backup_path/$type" \( -name "*.sql.gz" -o -name "*.tar.gz" \) -type f 2>/dev/null | sort -r | head -1)
            if [ -n "$found" ]; then
                latest="$found"
                break
            fi
        fi
    done

    echo "$latest"
}

list_available_backups() {
    log "INFO" "Available backups:"
    echo ""

    echo "  PostgreSQL:"
    local pg_count=0
    for type in daily weekly monthly; do
        if [ -d "$BACKUP_DIR/postgresql/$type" ]; then
            find "$BACKUP_DIR/postgresql/$type" -name "*.sql*" -type f 2>/dev/null | grep -v ".sha256\|.json" | sort -r | head -3 | while read -r file; do
                local size=$(du -h "$file" | cut -f1)
                echo "    [$type] $(basename "$file") ($size)"
                ((pg_count++))
            done
        fi
    done
    [ $pg_count -eq 0 ] && echo "    No backups found"

    echo ""
    echo "  MongoDB:"
    local mongo_count=0
    for type in daily weekly monthly; do
        if [ -d "$BACKUP_DIR/mongodb/$type" ]; then
            find "$BACKUP_DIR/mongodb/$type" \( -name "*.tar.gz" -o -type d -name "kitchenxpert_*" \) 2>/dev/null | sort -r | head -3 | while read -r path; do
                local size=$(du -sh "$path" | cut -f1)
                echo "    [$type] $(basename "$path") ($size)"
                ((mongo_count++))
            done
        fi
    done
    [ $mongo_count -eq 0 ] && echo "    No backups found"

    echo ""
}

confirm_restore() {
    if [ "$FORCE" = "true" ]; then
        return 0
    fi

    echo ""
    echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║${NC}                        WARNING                              ${YELLOW}║${NC}"
    echo -e "${YELLOW}║${NC}  This will overwrite existing database data!               ${YELLOW}║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    read -p "Are you sure you want to proceed? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        log "INFO" "Restore cancelled by user"
        exit 0
    fi
}

restore_postgresql() {
    local backup_file="$1"

    log "STEP" "Restoring PostgreSQL..."

    if [ -z "$backup_file" ]; then
        backup_file=$(find_latest_backup "postgresql")
    fi

    if [ -z "$backup_file" ] || [ ! -f "$backup_file" ]; then
        log "WARNING" "No PostgreSQL backup found"
        return 1
    fi

    log "INFO" "Using backup: $(basename "$backup_file")"

    if [ "$DRY_RUN" = "true" ]; then
        log "INFO" "[DRY RUN] Would restore from: $backup_file"
        return 0
    fi

    local pg_script="$SCRIPT_DIR/restore-postgresql.sh"
    if [ -f "$pg_script" ]; then
        "$pg_script" --file "$backup_file" --force

        if [ $? -eq 0 ]; then
            log "SUCCESS" "PostgreSQL restored successfully"
            return 0
        else
            log "ERROR" "PostgreSQL restore failed"
            return 1
        fi
    else
        log "ERROR" "PostgreSQL restore script not found"
        return 1
    fi
}

restore_mongodb() {
    local backup_path="$1"

    log "STEP" "Restoring MongoDB..."

    if [ -z "$backup_path" ]; then
        backup_path=$(find_latest_backup "mongodb")
    fi

    if [ -z "$backup_path" ] || [ ! -e "$backup_path" ]; then
        log "WARNING" "No MongoDB backup found"
        return 1
    fi

    log "INFO" "Using backup: $(basename "$backup_path")"

    if [ "$DRY_RUN" = "true" ]; then
        log "INFO" "[DRY RUN] Would restore from: $backup_path"
        return 0
    fi

    local mongo_script="$SCRIPT_DIR/restore-mongodb.sh"
    if [ -f "$mongo_script" ]; then
        "$mongo_script" --file "$backup_path" --force

        if [ $? -eq 0 ]; then
            log "SUCCESS" "MongoDB restored successfully"
            return 0
        else
            log "ERROR" "MongoDB restore failed"
            return 1
        fi
    else
        log "ERROR" "MongoDB restore script not found"
        return 1
    fi
}

run_post_restore() {
    log "INFO" "Running post-restore tasks..."

    # Run any necessary migrations
    if [ -f "$PROJECT_ROOT/package.json" ]; then
        cd "$PROJECT_ROOT"

        # Check for Prisma migrations
        if [ -f "prisma/schema.prisma" ]; then
            log "INFO" "Running Prisma migrations..."
            pnpm prisma migrate deploy 2>/dev/null || true
        fi
    fi

    log "SUCCESS" "Post-restore tasks completed"
}

print_summary() {
    local pg_status="$1"
    local mongo_status="$2"

    echo ""
    if [ "$pg_status" = "success" ] && [ "$mongo_status" = "success" ]; then
        echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║${NC}           All Databases Restored Successfully              ${GREEN}║${NC}"
        echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    else
        echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${YELLOW}║${NC}            Restore Completed with Warnings                 ${YELLOW}║${NC}"
        echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"
    fi
    echo ""
    echo "  PostgreSQL: $pg_status"
    echo "  MongoDB:    $mongo_status"
    echo ""
}

# Parse arguments
PG_BACKUP=""
MONGO_BACKUP=""
POSTGRESQL_ONLY=""
MONGODB_ONLY=""
FORCE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --backup-dir)
            BACKUP_DIR="$2"
            shift 2
            ;;
        --pg-file)
            PG_BACKUP="$2"
            shift 2
            ;;
        --mongo-file)
            MONGO_BACKUP="$2"
            shift 2
            ;;
        --postgresql-only)
            POSTGRESQL_ONLY="true"
            shift
            ;;
        --mongodb-only)
            MONGODB_ONLY="true"
            shift
            ;;
        --dry-run)
            DRY_RUN="true"
            shift
            ;;
        --force)
            FORCE="true"
            shift
            ;;
        --list)
            list_available_backups
            exit 0
            ;;
        --help)
            echo "Usage: restore-all.sh [options]"
            echo ""
            echo "Options:"
            echo "  --backup-dir <dir>    Directory containing backups"
            echo "  --pg-file <file>      Specific PostgreSQL backup file"
            echo "  --mongo-file <file>   Specific MongoDB backup file"
            echo "  --postgresql-only     Only restore PostgreSQL"
            echo "  --mongodb-only        Only restore MongoDB"
            echo "  --dry-run             Show what would be restored"
            echo "  --force               Skip confirmation prompt"
            echo "  --list                List available backups"
            echo "  --help                Show this help message"
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

if [ "$DRY_RUN" = "true" ]; then
    log "INFO" "Running in DRY RUN mode - no changes will be made"
    echo ""
fi

confirm_restore

pg_status="skipped"
mongo_status="skipped"

if [ "$MONGODB_ONLY" != "true" ]; then
    if restore_postgresql "$PG_BACKUP"; then
        pg_status="success"
    else
        pg_status="failed"
    fi
fi

if [ "$POSTGRESQL_ONLY" != "true" ]; then
    if restore_mongodb "$MONGO_BACKUP"; then
        mongo_status="success"
    else
        mongo_status="failed"
    fi
fi

if [ "$DRY_RUN" != "true" ]; then
    run_post_restore
fi

print_summary "$pg_status" "$mongo_status"

# Exit with error if any restore failed
if [ "$pg_status" = "failed" ] || [ "$mongo_status" = "failed" ]; then
    exit 1
fi

exit 0
