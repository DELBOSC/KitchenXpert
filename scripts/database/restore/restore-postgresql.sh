#!/bin/bash
#
# PostgreSQL Restore Script - KitchenXpert
#
# Restores PostgreSQL database from backup files.
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
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Configuration
BACKUP_FILE=""
DRY_RUN="${DRY_RUN:-false}"
CREATE_BACKUP="${CREATE_BACKUP:-true}"

# Database configuration (from environment)
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-kitchenxpert}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"

# Logging
log() {
    local level=$1
    local message=$2
    case $level in
        "INFO")    echo -e "${BLUE}[PG-RESTORE]${NC} $message" ;;
        "SUCCESS") echo -e "${GREEN}[PG-RESTORE]${NC} $message" ;;
        "WARNING") echo -e "${YELLOW}[PG-RESTORE]${NC} $message" ;;
        "ERROR")   echo -e "${RED}[PG-RESTORE]${NC} $message" ;;
    esac
}

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}          KitchenXpert - PostgreSQL Restore                  ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

check_prerequisites() {
    log "INFO" "Checking prerequisites..."

    # Check for psql
    if ! command -v psql &> /dev/null; then
        log "ERROR" "psql not found. Please install PostgreSQL client tools."
        exit 1
    fi

    # Validate backup file exists and is readable
    if [ -z "$BACKUP_FILE" ]; then
        log "ERROR" "No backup file specified"
        exit 1
    fi

    if [ ! -f "$BACKUP_FILE" ]; then
        log "ERROR" "Backup file not found: $BACKUP_FILE"
        exit 1
    fi

    if [ ! -r "$BACKUP_FILE" ]; then
        log "ERROR" "Backup file is not readable: $BACKUP_FILE"
        exit 1
    fi

    # Check file is not empty
    local file_size
    file_size=$(stat -c%s "$BACKUP_FILE" 2>/dev/null || stat -f%z "$BACKUP_FILE" 2>/dev/null || echo 0)
    if [ "$file_size" -eq 0 ]; then
        log "ERROR" "Backup file is empty: $BACKUP_FILE"
        exit 1
    fi
    log "INFO" "Backup file size: $file_size bytes"

    # Check connection
    if ! psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d postgres -c "SELECT 1" &> /dev/null; then
        log "ERROR" "Cannot connect to PostgreSQL server"
        log "INFO" "Host: $POSTGRES_HOST:$POSTGRES_PORT"
        exit 1
    fi

    log "SUCCESS" "Prerequisites verified"
}

verify_backup() {
    log "INFO" "Verifying backup file..."

    # Check file exists
    if [ ! -f "$BACKUP_FILE" ]; then
        log "ERROR" "Backup file not found"
        return 1
    fi

    # Verify checksum if .sha256 file exists
    local checksum_file="${BACKUP_FILE}.sha256"
    if [ -f "$checksum_file" ]; then
        log "INFO" "Verifying checksum..."
        # Try sha256sum first (Linux), fall back to shasum (macOS)
        if command -v sha256sum &> /dev/null; then
            if sha256sum -c "$checksum_file" &> /dev/null; then
                log "SUCCESS" "Checksum verified (sha256sum)"
            else
                log "ERROR" "Checksum verification failed - backup file may be corrupted or tampered with"
                return 1
            fi
        elif command -v shasum &> /dev/null; then
            local expected_hash
            expected_hash=$(awk '{print $1}' "$checksum_file")
            local actual_hash
            actual_hash=$(shasum -a 256 "$BACKUP_FILE" | awk '{print $1}')
            if [ "$expected_hash" = "$actual_hash" ]; then
                log "SUCCESS" "Checksum verified (shasum)"
            else
                log "ERROR" "Checksum verification failed - backup file may be corrupted or tampered with"
                log "INFO" "Expected: $expected_hash"
                log "INFO" "Actual:   $actual_hash"
                return 1
            fi
        else
            log "WARNING" "No checksum tool available (sha256sum or shasum), skipping verification"
        fi
    else
        log "WARNING" "No .sha256 checksum file found, skipping integrity verification"
    fi

    # Test compressed file
    if [[ "$BACKUP_FILE" == *.gz ]]; then
        if gzip -t "$BACKUP_FILE" 2>/dev/null; then
            log "SUCCESS" "Compression integrity verified"
        else
            log "ERROR" "Compressed file is corrupted"
            return 1
        fi
    fi

    log "SUCCESS" "Backup file verified"
    return 0
}

create_pre_restore_backup() {
    if [ "$CREATE_BACKUP" != "true" ]; then
        return 0
    fi

    log "INFO" "Creating pre-restore backup..."

    local backup_dir="$PROJECT_ROOT/backups/postgresql/pre-restore"
    mkdir -p "$backup_dir"

    local timestamp=$(date +%Y%m%d_%H%M%S)
    local pre_backup="$backup_dir/pre_restore_${timestamp}.sql.gz"

    pg_dump \
        -h "$POSTGRES_HOST" \
        -p "$POSTGRES_PORT" \
        -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" \
        --format=plain \
        --no-owner \
        --no-acl \
        2>/dev/null | gzip > "$pre_backup"

    if [ -f "$pre_backup" ]; then
        log "SUCCESS" "Pre-restore backup created: $pre_backup"
    else
        log "WARNING" "Could not create pre-restore backup"
    fi
}

prepare_database() {
    log "INFO" "Preparing database..."

    # Terminate existing connections
    log "INFO" "Terminating existing connections..."
    psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d postgres -c "
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = '$POSTGRES_DB'
        AND pid <> pg_backend_pid();
    " &> /dev/null || true

    log "SUCCESS" "Database prepared"
}

restore_database() {
    log "INFO" "Restoring database..."

    local sql_file="$BACKUP_FILE"

    # Decompress if needed
    if [[ "$BACKUP_FILE" == *.gz ]]; then
        log "INFO" "Decompressing backup..."
        local temp_file=$(mktemp)
        gunzip -c "$BACKUP_FILE" > "$temp_file"
        sql_file="$temp_file"
    fi

    # Restore using psql
    log "INFO" "Executing SQL restore..."

    psql \
        -h "$POSTGRES_HOST" \
        -p "$POSTGRES_PORT" \
        -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" \
        -f "$sql_file" \
        --quiet \
        2>&1 | while read -r line; do
            # Filter out common noise
            if [[ ! "$line" =~ ^(SET|COMMENT|ALTER) ]]; then
                log "INFO" "$line"
            fi
        done

    # Clean up temp file
    if [[ "$BACKUP_FILE" == *.gz ]]; then
        rm -f "$temp_file"
    fi

    log "SUCCESS" "Database restored"
}

verify_restore() {
    log "INFO" "Verifying restore..."

    # Check table count
    local table_count=$(psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "
        SELECT COUNT(*) FROM information_schema.tables
        WHERE table_schema = 'public';
    " 2>/dev/null | tr -d ' ')

    if [ -n "$table_count" ] && [ "$table_count" -gt 0 ]; then
        log "SUCCESS" "Restore verified: $table_count tables found"
        return 0
    else
        log "WARNING" "No tables found after restore"
        return 1
    fi
}

print_summary() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}         PostgreSQL Restore Completed Successfully           ${GREEN}║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "  Database: $POSTGRES_DB"
    echo "  Host: $POSTGRES_HOST:$POSTGRES_PORT"
    echo "  Backup file: $(basename "$BACKUP_FILE")"
    echo ""
}

# Parse arguments
FORCE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --file)
            BACKUP_FILE="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN="true"
            shift
            ;;
        --no-backup)
            CREATE_BACKUP="false"
            shift
            ;;
        --force)
            FORCE="true"
            shift
            ;;
        --help)
            echo "Usage: restore-postgresql.sh [options]"
            echo ""
            echo "Options:"
            echo "  --file <path>     Path to backup file (required)"
            echo "  --dry-run         Verify backup without restoring"
            echo "  --no-backup       Skip pre-restore backup"
            echo "  --force           Skip confirmation prompt"
            echo "  --help            Show this help message"
            echo ""
            echo "Environment variables:"
            echo "  POSTGRES_HOST      Database host (default: localhost)"
            echo "  POSTGRES_PORT      Database port (default: 5432)"
            echo "  POSTGRES_DB        Database name (default: kitchenxpert)"
            echo "  POSTGRES_USER      Database user (default: postgres)"
            echo "  POSTGRES_PASSWORD  Database password"
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

# Check required arguments
if [ -z "$BACKUP_FILE" ]; then
    log "ERROR" "Backup file is required. Use --file <path>"
    exit 1
fi

# Confirmation
if [ "$FORCE" != "true" ] && [ "$DRY_RUN" != "true" ]; then
    echo ""
    echo -e "${YELLOW}This will restore the database from: $(basename "$BACKUP_FILE")${NC}"
    echo -e "${YELLOW}All existing data in $POSTGRES_DB will be overwritten.${NC}"
    echo ""
    read -p "Continue? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        log "INFO" "Restore cancelled"
        exit 0
    fi
fi

# Setup PGPASSFILE for secure password handling
PGPASSFILE=$(mktemp)
chmod 600 "$PGPASSFILE"
echo "*:*:*:*:${POSTGRES_PASSWORD}" > "$PGPASSFILE"
export PGPASSFILE

# Cleanup PGPASSFILE on exit
cleanup_pgpassfile() {
    rm -f "$PGPASSFILE"
}
trap cleanup_pgpassfile EXIT

# Main execution
print_header
check_prerequisites

if ! verify_backup; then
    exit 1
fi

if [ "$DRY_RUN" = "true" ]; then
    log "INFO" "[DRY RUN] Backup file verified successfully"
    log "INFO" "[DRY RUN] Would restore to: $POSTGRES_DB@$POSTGRES_HOST:$POSTGRES_PORT"
    exit 0
fi

create_pre_restore_backup
prepare_database
restore_database

if verify_restore; then
    print_summary
    exit 0
else
    log "ERROR" "Restore verification failed"
    exit 1
fi
