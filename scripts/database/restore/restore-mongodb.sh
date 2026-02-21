#!/bin/bash
#
# MongoDB Restore Script - KitchenXpert
#
# Restores MongoDB database from backup files.
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
BACKUP_PATH=""
DRY_RUN="${DRY_RUN:-false}"
CREATE_BACKUP="${CREATE_BACKUP:-true}"
DROP_EXISTING="${DROP_EXISTING:-true}"

# Database configuration (from environment)
MONGODB_URI="${MONGODB_URI:-mongodb://localhost:27017}"
MONGODB_DB="${MONGODB_DB:-kitchenxpert}"

# Logging
log() {
    local level=$1
    local message=$2
    case $level in
        "INFO")    echo -e "${BLUE}[MONGO-RESTORE]${NC} $message" ;;
        "SUCCESS") echo -e "${GREEN}[MONGO-RESTORE]${NC} $message" ;;
        "WARNING") echo -e "${YELLOW}[MONGO-RESTORE]${NC} $message" ;;
        "ERROR")   echo -e "${RED}[MONGO-RESTORE]${NC} $message" ;;
    esac
}

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}            KitchenXpert - MongoDB Restore                   ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

check_prerequisites() {
    log "INFO" "Checking prerequisites..."

    # Check for mongorestore
    if ! command -v mongorestore &> /dev/null; then
        log "ERROR" "mongorestore not found. Please install MongoDB Database Tools."
        log "INFO" "Install with: brew install mongodb-database-tools (macOS)"
        log "INFO" "Or download from: https://www.mongodb.com/try/download/database-tools"
        exit 1
    fi

    # Check backup path
    if [ -z "$BACKUP_PATH" ] || [ ! -e "$BACKUP_PATH" ]; then
        log "ERROR" "Backup path not found: $BACKUP_PATH"
        exit 1
    fi

    # Check connection
    if command -v mongosh &> /dev/null; then
        if mongosh "$MONGODB_URI/$MONGODB_DB" --quiet --eval "db.runCommand({ ping: 1 })" &> /dev/null; then
            log "SUCCESS" "MongoDB connection verified"
        else
            log "WARNING" "Cannot verify MongoDB connection"
        fi
    fi

    log "SUCCESS" "Prerequisites verified"
}

verify_backup() {
    log "INFO" "Verifying backup..."

    # Check if archive
    if [[ "$BACKUP_PATH" == *.tar.gz ]]; then
        # Verify checksum if available
        local checksum_file="${BACKUP_PATH}.sha256"
        if [ -f "$checksum_file" ]; then
            log "INFO" "Verifying checksum..."
            if sha256sum -c "$checksum_file" &> /dev/null; then
                log "SUCCESS" "Checksum verified"
            else
                log "ERROR" "Checksum verification failed"
                return 1
            fi
        fi

        # Test archive integrity
        if tar -tzf "$BACKUP_PATH" &> /dev/null; then
            log "SUCCESS" "Archive integrity verified"
        else
            log "ERROR" "Archive is corrupted"
            return 1
        fi
    elif [ -d "$BACKUP_PATH" ]; then
        # Check directory has BSON files
        local bson_count=$(find "$BACKUP_PATH" -name "*.bson*" -type f 2>/dev/null | wc -l)
        if [ "$bson_count" -eq 0 ]; then
            log "ERROR" "No BSON files found in backup directory"
            return 1
        fi
        log "SUCCESS" "Found $bson_count BSON file(s)"
    else
        log "ERROR" "Invalid backup path"
        return 1
    fi

    log "SUCCESS" "Backup verified"
    return 0
}

create_pre_restore_backup() {
    if [ "$CREATE_BACKUP" != "true" ]; then
        return 0
    fi

    log "INFO" "Creating pre-restore backup..."

    local backup_dir="$PROJECT_ROOT/backups/mongodb/pre-restore"
    mkdir -p "$backup_dir"

    local timestamp=$(date +%Y%m%d_%H%M%S)
    local pre_backup="$backup_dir/pre_restore_${timestamp}"

    mongodump \
        --uri="$MONGODB_URI" \
        --db="$MONGODB_DB" \
        --out="$pre_backup" \
        --gzip \
        2>/dev/null

    if [ -d "$pre_backup" ]; then
        log "SUCCESS" "Pre-restore backup created: $pre_backup"
    else
        log "WARNING" "Could not create pre-restore backup"
    fi
}

prepare_backup() {
    log "INFO" "Preparing backup for restore..."

    # If archive, extract to temp directory
    if [[ "$BACKUP_PATH" == *.tar.gz ]]; then
        log "INFO" "Extracting archive..."

        local temp_dir=$(mktemp -d)
        tar -xzf "$BACKUP_PATH" -C "$temp_dir"

        # Find the database directory
        local db_dir=$(find "$temp_dir" -type d -name "$MONGODB_DB" 2>/dev/null | head -1)

        if [ -z "$db_dir" ]; then
            # Maybe it's in a subdirectory
            db_dir=$(find "$temp_dir" -type d -name "kitchenxpert*" 2>/dev/null | head -1)
        fi

        if [ -n "$db_dir" ]; then
            RESTORE_PATH="$db_dir"
            TEMP_DIR="$temp_dir"
            log "SUCCESS" "Archive extracted"
        else
            log "ERROR" "Could not find database directory in archive"
            rm -rf "$temp_dir"
            return 1
        fi
    else
        # Direct directory restore
        local db_dir="$BACKUP_PATH/$MONGODB_DB"
        if [ -d "$db_dir" ]; then
            RESTORE_PATH="$db_dir"
        else
            RESTORE_PATH="$BACKUP_PATH"
        fi
    fi

    log "INFO" "Restore path: $RESTORE_PATH"
    return 0
}

restore_database() {
    log "INFO" "Restoring database..."

    local drop_flag=""
    if [ "$DROP_EXISTING" = "true" ]; then
        drop_flag="--drop"
    fi

    mongorestore \
        --uri="$MONGODB_URI" \
        --db="$MONGODB_DB" \
        $drop_flag \
        --gzip \
        "$RESTORE_PATH" \
        2>&1 | while read -r line; do
            log "INFO" "$line"
        done

    log "SUCCESS" "Database restored"
}

cleanup() {
    if [ -n "$TEMP_DIR" ] && [ -d "$TEMP_DIR" ]; then
        log "INFO" "Cleaning up temporary files..."
        rm -rf "$TEMP_DIR"
    fi
}

verify_restore() {
    log "INFO" "Verifying restore..."

    if ! command -v mongosh &> /dev/null; then
        log "WARNING" "mongosh not available, skipping verification"
        return 0
    fi

    # Check collection count
    local collection_count=$(mongosh "$MONGODB_URI/$MONGODB_DB" --quiet --eval "db.getCollectionNames().length" 2>/dev/null || echo "0")

    if [ -n "$collection_count" ] && [ "$collection_count" -gt 0 ]; then
        log "SUCCESS" "Restore verified: $collection_count collections found"

        # Show collections
        log "INFO" "Collections:"
        mongosh "$MONGODB_URI/$MONGODB_DB" --quiet --eval "db.getCollectionNames().forEach(c => print('  - ' + c))" 2>/dev/null || true

        return 0
    else
        log "WARNING" "No collections found after restore"
        return 1
    fi
}

print_summary() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}           MongoDB Restore Completed Successfully            ${GREEN}║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "  Database: $MONGODB_DB"
    echo "  URI: $MONGODB_URI"
    echo "  Backup: $(basename "$BACKUP_PATH")"
    echo ""
}

# Trap for cleanup
trap cleanup EXIT

# Parse arguments
FORCE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --file)
            BACKUP_PATH="$2"
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
        --no-drop)
            DROP_EXISTING="false"
            shift
            ;;
        --force)
            FORCE="true"
            shift
            ;;
        --help)
            echo "Usage: restore-mongodb.sh [options]"
            echo ""
            echo "Options:"
            echo "  --file <path>     Path to backup file/directory (required)"
            echo "  --dry-run         Verify backup without restoring"
            echo "  --no-backup       Skip pre-restore backup"
            echo "  --no-drop         Don't drop existing collections"
            echo "  --force           Skip confirmation prompt"
            echo "  --help            Show this help message"
            echo ""
            echo "Environment variables:"
            echo "  MONGODB_URI       MongoDB connection URI"
            echo "  MONGODB_DB        Database name (default: kitchenxpert)"
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
if [ -z "$BACKUP_PATH" ]; then
    log "ERROR" "Backup path is required. Use --file <path>"
    exit 1
fi

# Confirmation
if [ "$FORCE" != "true" ] && [ "$DRY_RUN" != "true" ]; then
    echo ""
    echo -e "${YELLOW}This will restore the database from: $(basename "$BACKUP_PATH")${NC}"
    if [ "$DROP_EXISTING" = "true" ]; then
        echo -e "${YELLOW}All existing data in $MONGODB_DB will be dropped first.${NC}"
    fi
    echo ""
    read -p "Continue? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        log "INFO" "Restore cancelled"
        exit 0
    fi
fi

# Main execution
print_header
check_prerequisites

if ! verify_backup; then
    exit 1
fi

if [ "$DRY_RUN" = "true" ]; then
    log "INFO" "[DRY RUN] Backup verified successfully"
    log "INFO" "[DRY RUN] Would restore to: $MONGODB_DB at $MONGODB_URI"
    exit 0
fi

create_pre_restore_backup

if ! prepare_backup; then
    exit 1
fi

restore_database

if verify_restore; then
    print_summary
    exit 0
else
    log "WARNING" "Restore completed but verification showed warnings"
    print_summary
    exit 0
fi
