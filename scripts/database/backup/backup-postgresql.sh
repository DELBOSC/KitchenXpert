#!/bin/bash
#
# PostgreSQL Backup Script - KitchenXpert
#
# Creates compressed backups of PostgreSQL database with rotation.
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
OUTPUT_DIR="${OUTPUT_DIR:-$PROJECT_ROOT/backups/postgresql}"
BACKUP_TYPE="${BACKUP_TYPE:-daily}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
COMPRESS="${COMPRESS:-true}"

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
        "INFO")    echo -e "${BLUE}[PG-BACKUP]${NC} $message" ;;
        "SUCCESS") echo -e "${GREEN}[PG-BACKUP]${NC} $message" ;;
        "WARNING") echo -e "${YELLOW}[PG-BACKUP]${NC} $message" ;;
        "ERROR")   echo -e "${RED}[PG-BACKUP]${NC} $message" ;;
    esac
}

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}           KitchenXpert - PostgreSQL Backup                  ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

check_prerequisites() {
    log "INFO" "Checking prerequisites..."

    # Check for pg_dump
    if ! command -v pg_dump &> /dev/null; then
        log "ERROR" "pg_dump not found. Please install PostgreSQL client tools."
        exit 1
    fi

    # Use temporary pgpass file instead of PGPASSWORD env var
    PGPASS_FILE=$(mktemp)
    chmod 600 "$PGPASS_FILE"
    echo "$POSTGRES_HOST:$POSTGRES_PORT:$POSTGRES_DB:$POSTGRES_USER:$POSTGRES_PASSWORD" > "$PGPASS_FILE"
    export PGPASSFILE="$PGPASS_FILE"

    if ! psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 1" &> /dev/null; then
        log "ERROR" "Cannot connect to PostgreSQL database"
        log "INFO" "Host: $POSTGRES_HOST:$POSTGRES_PORT"
        log "INFO" "Database: $POSTGRES_DB"
        exit 1
    fi

    log "SUCCESS" "PostgreSQL connection verified"
}

setup_directories() {
    log "INFO" "Setting up backup directories..."

    mkdir -p "$OUTPUT_DIR/$BACKUP_TYPE"

    log "SUCCESS" "Output directory: $OUTPUT_DIR/$BACKUP_TYPE"
}

create_backup() {
    log "INFO" "Creating PostgreSQL backup..."

    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_name="kitchenxpert_${BACKUP_TYPE}_${timestamp}"
    local backup_file="$OUTPUT_DIR/$BACKUP_TYPE/${backup_name}.sql"

    # PGPASSFILE is already configured by check_prerequisites

    # Create backup with pg_dump
    log "INFO" "Running pg_dump..."

    pg_dump \
        -h "$POSTGRES_HOST" \
        -p "$POSTGRES_PORT" \
        -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" \
        --format=plain \
        --no-owner \
        --no-acl \
        --clean \
        --if-exists \
        --verbose \
        -f "$backup_file" 2>&1 | while read -r line; do
            log "INFO" "$line"
        done

    if [ ! -f "$backup_file" ]; then
        log "ERROR" "Backup file not created"
        exit 1
    fi

    local size=$(du -h "$backup_file" | cut -f1)
    log "SUCCESS" "Backup created: $backup_file ($size)"

    # Compress if enabled
    if [ "$COMPRESS" = "true" ]; then
        if ! command -v gzip &> /dev/null; then
            log "WARNING" "gzip not found, skipping compression"
            COMPRESS="false"
        else
            log "INFO" "Compressing backup..."

            gzip -9 "$backup_file"
            backup_file="${backup_file}.gz"

            local compressed_size=$(du -h "$backup_file" | cut -f1)
            log "SUCCESS" "Compressed backup: $backup_file ($compressed_size)"
        fi
    fi

    # Create checksum
    log "INFO" "Creating checksum..."
    sha256sum "$backup_file" > "${backup_file}.sha256"

    # Create metadata
    create_metadata "$backup_file" "$timestamp"

    echo "$backup_file"
}

create_metadata() {
    local backup_file="$1"
    local timestamp="$2"
    local metadata_file="${backup_file}.json"

    cat > "$metadata_file" << EOF
{
  "database": "$POSTGRES_DB",
  "host": "$POSTGRES_HOST",
  "port": $POSTGRES_PORT,
  "backupType": "$BACKUP_TYPE",
  "timestamp": "$timestamp",
  "createdAt": "$(date -Iseconds)",
  "file": "$(basename "$backup_file")",
  "size": $(stat -c%s "$backup_file" 2>/dev/null || stat -f%z "$backup_file" 2>/dev/null || echo 0),
  "compressed": $COMPRESS,
  "checksumFile": "$(basename "${backup_file}.sha256")"
}
EOF

    log "SUCCESS" "Metadata created"
}

rotate_backups() {
    log "INFO" "Rotating old backups..."

    local backup_dir="$OUTPUT_DIR/$BACKUP_TYPE"

    if [ ! -d "$backup_dir" ]; then
        log "INFO" "No backup directory to rotate"
        return 0
    fi

    local deleted=0

    # Set retention based on backup type
    local retention=$RETENTION_DAYS
    case $BACKUP_TYPE in
        "daily")   retention=${RETENTION_DAYS:-7} ;;
        "weekly")  retention=${RETENTION_DAYS:-28} ;;
        "monthly") retention=${RETENTION_DAYS:-365} ;;
    esac

    # Find and delete old backups
    while IFS= read -r file; do
        rm -f "$file"
        rm -f "${file}.sha256"
        rm -f "${file}.json"
        ((deleted++))
    done < <(find "$backup_dir" -name "*.sql*" -type f -mtime +$retention 2>/dev/null)

    if [ $deleted -gt 0 ]; then
        log "INFO" "Deleted $deleted old backup(s)"
    else
        log "INFO" "No old backups to delete"
    fi
}

verify_backup() {
    local backup_file="$1"

    log "INFO" "Verifying backup integrity..."

    # Verify checksum
    if [ -f "${backup_file}.sha256" ]; then
        if sha256sum -c "${backup_file}.sha256" &> /dev/null; then
            log "SUCCESS" "Checksum verified"
        else
            log "ERROR" "Checksum verification failed"
            return 1
        fi
    fi

    # Test decompression if compressed
    if [[ "$backup_file" == *.gz ]]; then
        if gzip -t "$backup_file" 2>/dev/null; then
            log "SUCCESS" "Compression integrity verified"
        else
            log "ERROR" "Compressed file is corrupted"
            return 1
        fi
    fi

    return 0
}

list_backups() {
    log "INFO" "Available backups:"
    echo ""

    for type in daily weekly monthly; do
        if [ -d "$OUTPUT_DIR/$type" ]; then
            local count=$(find "$OUTPUT_DIR/$type" -name "*.sql*" -type f 2>/dev/null | grep -v ".sha256\|.json" | wc -l)
            if [ $count -gt 0 ]; then
                echo "  $type: $count backup(s)"
                find "$OUTPUT_DIR/$type" -name "*.sql*" -type f 2>/dev/null | grep -v ".sha256\|.json" | sort -r | head -5 | while read -r file; do
                    local size=$(du -h "$file" | cut -f1)
                    echo "    - $(basename "$file") ($size)"
                done
            fi
        fi
    done
    echo ""
}

print_summary() {
    local backup_file="$1"

    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}           PostgreSQL Backup Completed Successfully          ${GREEN}║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "  Database: $POSTGRES_DB"
    echo "  Host: $POSTGRES_HOST:$POSTGRES_PORT"
    echo "  Backup type: $BACKUP_TYPE"
    echo "  File: $(basename "$backup_file")"
    echo "  Size: $(du -h "$backup_file" | cut -f1)"
    echo "  Location: $(dirname "$backup_file")"
    echo ""
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --output)
            OUTPUT_DIR="$2"
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
        --no-compress)
            COMPRESS="false"
            shift
            ;;
        --list)
            list_backups
            exit 0
            ;;
        --help)
            echo "Usage: backup-postgresql.sh [options]"
            echo ""
            echo "Options:"
            echo "  --output <dir>     Output directory for backups"
            echo "  --type <type>      Backup type: daily, weekly, monthly"
            echo "  --retention <days> Days to retain backups"
            echo "  --no-compress      Disable compression"
            echo "  --list             List available backups"
            echo "  --help             Show this help message"
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

if [ -z "${POSTGRES_PASSWORD:-}" ]; then
    log "ERROR" "POSTGRES_PASSWORD is not set"
    exit 1
fi

# Cleanup temporary pgpass file on exit
cleanup() {
    [ -n "${PGPASS_FILE:-}" ] && rm -f "$PGPASS_FILE"
}
trap cleanup EXIT

# Main execution
print_header
check_prerequisites
setup_directories

backup_file=$(create_backup)
rotate_backups

if verify_backup "$backup_file"; then
    print_summary "$backup_file"
    exit 0
else
    log "ERROR" "Backup verification failed"
    exit 1
fi
