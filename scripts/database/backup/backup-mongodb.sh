#!/bin/bash
#
# MongoDB Backup Script - KitchenXpert
#
# Creates compressed backups of MongoDB database with rotation.
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
OUTPUT_DIR="${OUTPUT_DIR:-$PROJECT_ROOT/backups/mongodb}"
BACKUP_TYPE="${BACKUP_TYPE:-daily}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
COMPRESS="${COMPRESS:-true}"

# Database configuration (from environment)
MONGODB_URI="${MONGODB_URI:-mongodb://localhost:27017}"
MONGODB_DB="${MONGODB_DB:-kitchenxpert}"

# Logging
log() {
    local level=$1
    local message=$2
    case $level in
        "INFO")    echo -e "${BLUE}[MONGO-BACKUP]${NC} $message" ;;
        "SUCCESS") echo -e "${GREEN}[MONGO-BACKUP]${NC} $message" ;;
        "WARNING") echo -e "${YELLOW}[MONGO-BACKUP]${NC} $message" ;;
        "ERROR")   echo -e "${RED}[MONGO-BACKUP]${NC} $message" ;;
    esac
}

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}             KitchenXpert - MongoDB Backup                   ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

check_prerequisites() {
    log "INFO" "Checking prerequisites..."

    # Check for mongodump
    if ! command -v mongodump &> /dev/null; then
        log "ERROR" "mongodump not found. Please install MongoDB Database Tools."
        log "INFO" "Install with: brew install mongodb-database-tools (macOS)"
        log "INFO" "Or download from: https://www.mongodb.com/try/download/database-tools"
        exit 1
    fi

    # Check connection
    if command -v mongosh &> /dev/null; then
        if mongosh "$MONGODB_URI/$MONGODB_DB" --quiet --eval "db.runCommand({ ping: 1 })" &> /dev/null; then
            log "SUCCESS" "MongoDB connection verified"
        else
            log "WARNING" "Cannot verify MongoDB connection"
            log "INFO" "Proceeding with backup attempt..."
        fi
    else
        log "INFO" "mongosh not available, skipping connection check"
    fi
}

setup_directories() {
    log "INFO" "Setting up backup directories..."

    mkdir -p "$OUTPUT_DIR/$BACKUP_TYPE"

    log "SUCCESS" "Output directory: $OUTPUT_DIR/$BACKUP_TYPE"
}

create_backup() {
    log "INFO" "Creating MongoDB backup..."

    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_name="kitchenxpert_${BACKUP_TYPE}_${timestamp}"
    local backup_dir="$OUTPUT_DIR/$BACKUP_TYPE/$backup_name"

    # Create backup with mongodump
    log "INFO" "Running mongodump..."

    mongodump \
        --uri="$MONGODB_URI" \
        --db="$MONGODB_DB" \
        --out="$backup_dir" \
        --gzip \
        2>&1 | while read -r line; do
            log "INFO" "$line"
        done

    if [ ! -d "$backup_dir" ]; then
        log "ERROR" "Backup directory not created"
        exit 1
    fi

    local size=$(du -sh "$backup_dir" | cut -f1)
    log "SUCCESS" "Backup created: $backup_dir ($size)"

    # Create archive if compression enabled
    local archive_file=""
    if [ "$COMPRESS" = "true" ]; then
        log "INFO" "Creating compressed archive..."

        archive_file="$OUTPUT_DIR/$BACKUP_TYPE/${backup_name}.tar.gz"
        tar -czf "$archive_file" -C "$OUTPUT_DIR/$BACKUP_TYPE" "$backup_name"

        # Remove uncompressed directory
        rm -rf "$backup_dir"

        local compressed_size=$(du -h "$archive_file" | cut -f1)
        log "SUCCESS" "Archive created: $archive_file ($compressed_size)"

        # Create checksum
        sha256sum "$archive_file" > "${archive_file}.sha256"

        # Create metadata
        create_metadata "$archive_file" "$timestamp"

        echo "$archive_file"
    else
        # Create checksum for directory
        find "$backup_dir" -type f -exec sha256sum {} \; > "${backup_dir}.sha256"

        # Create metadata
        create_metadata "$backup_dir" "$timestamp"

        echo "$backup_dir"
    fi
}

create_metadata() {
    local backup_path="$1"
    local timestamp="$2"
    local metadata_file="${backup_path}.json"

    # Get collection info
    local collections=""
    if command -v mongosh &> /dev/null; then
        collections=$(mongosh "$MONGODB_URI/$MONGODB_DB" --quiet --eval "db.getCollectionNames().join(',')" 2>/dev/null || echo "unknown")
    fi

    cat > "$metadata_file" << EOF
{
  "database": "$MONGODB_DB",
  "uri": "$MONGODB_URI",
  "backupType": "$BACKUP_TYPE",
  "timestamp": "$timestamp",
  "createdAt": "$(date -Iseconds)",
  "path": "$(basename "$backup_path")",
  "compressed": $COMPRESS,
  "collections": "$collections"
}
EOF

    log "SUCCESS" "Metadata created"
}

rotate_backups() {
    log "INFO" "Rotating old backups..."

    local backup_dir="$OUTPUT_DIR/$BACKUP_TYPE"
    local deleted=0

    # Set retention based on backup type
    local retention=$RETENTION_DAYS
    case $BACKUP_TYPE in
        "daily")   retention=${RETENTION_DAYS:-7} ;;
        "weekly")  retention=${RETENTION_DAYS:-28} ;;
        "monthly") retention=${RETENTION_DAYS:-365} ;;
    esac

    # Find and delete old backups (archives)
    while IFS= read -r file; do
        rm -f "$file"
        rm -f "${file}.sha256"
        rm -f "${file}.json"
        ((deleted++))
    done < <(find "$backup_dir" -name "*.tar.gz" -type f -mtime +$retention 2>/dev/null)

    # Find and delete old backup directories
    while IFS= read -r dir; do
        rm -rf "$dir"
        rm -f "${dir}.sha256"
        rm -f "${dir}.json"
        ((deleted++))
    done < <(find "$backup_dir" -maxdepth 1 -type d -name "kitchenxpert_*" -mtime +$retention 2>/dev/null)

    if [ $deleted -gt 0 ]; then
        log "INFO" "Deleted $deleted old backup(s)"
    else
        log "INFO" "No old backups to delete"
    fi
}

verify_backup() {
    local backup_path="$1"

    log "INFO" "Verifying backup integrity..."

    # Check if it's an archive or directory
    if [[ "$backup_path" == *.tar.gz ]]; then
        # Verify checksum
        if [ -f "${backup_path}.sha256" ]; then
            if sha256sum -c "${backup_path}.sha256" &> /dev/null; then
                log "SUCCESS" "Checksum verified"
            else
                log "ERROR" "Checksum verification failed"
                return 1
            fi
        fi

        # Test archive integrity
        if tar -tzf "$backup_path" &> /dev/null; then
            log "SUCCESS" "Archive integrity verified"
        else
            log "ERROR" "Archive is corrupted"
            return 1
        fi
    else
        # Verify directory exists and has files
        if [ -d "$backup_path" ] && [ "$(find "$backup_path" -type f | wc -l)" -gt 0 ]; then
            log "SUCCESS" "Backup directory verified"
        else
            log "ERROR" "Backup directory is empty or missing"
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
            local count=$(find "$OUTPUT_DIR/$type" \( -name "*.tar.gz" -o -type d -name "kitchenxpert_*" \) 2>/dev/null | wc -l)
            if [ $count -gt 0 ]; then
                echo "  $type: $count backup(s)"
                find "$OUTPUT_DIR/$type" \( -name "*.tar.gz" -o -type d -name "kitchenxpert_*" \) 2>/dev/null | sort -r | head -5 | while read -r path; do
                    local size=$(du -sh "$path" | cut -f1)
                    echo "    - $(basename "$path") ($size)"
                done
            fi
        fi
    done
    echo ""
}

print_summary() {
    local backup_path="$1"

    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}            MongoDB Backup Completed Successfully            ${GREEN}║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "  Database: $MONGODB_DB"
    echo "  URI: $MONGODB_URI"
    echo "  Backup type: $BACKUP_TYPE"
    echo "  Path: $(basename "$backup_path")"
    echo "  Size: $(du -sh "$backup_path" | cut -f1)"
    echo "  Location: $(dirname "$backup_path")"
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
            echo "Usage: backup-mongodb.sh [options]"
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
            echo "  MONGODB_URI        MongoDB connection URI"
            echo "  MONGODB_DB         Database name (default: kitchenxpert)"
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
check_prerequisites
setup_directories

backup_path=$(create_backup)
rotate_backups

if verify_backup "$backup_path"; then
    print_summary "$backup_path"
    exit 0
else
    log "ERROR" "Backup verification failed"
    exit 1
fi
