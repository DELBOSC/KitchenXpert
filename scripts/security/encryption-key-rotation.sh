#!/bin/bash
#
# Encryption Key Rotation - KitchenXpert
#
# Rotates encryption keys for secure data handling.
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
KEYS_DIR="${KEYS_DIR:-$PROJECT_ROOT/.keys}"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/.keys/backup}"
DRY_RUN="${DRY_RUN:-false}"

# Logging
log() {
    local level=$1
    local message=$2
    case $level in
        "INFO")    echo -e "${BLUE}[KEY-ROTATE]${NC} $message" ;;
        "SUCCESS") echo -e "${GREEN}[KEY-ROTATE]${NC} $message" ;;
        "WARNING") echo -e "${YELLOW}[KEY-ROTATE]${NC} $message" ;;
        "ERROR")   echo -e "${RED}[KEY-ROTATE]${NC} $message" ;;
    esac
}

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}         KitchenXpert - Encryption Key Rotation             ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

check_prerequisites() {
    log "INFO" "Checking prerequisites..."

    if ! command -v openssl &> /dev/null; then
        log "ERROR" "OpenSSL is not installed"
        exit 1
    fi

    # Create directories if needed
    mkdir -p "$KEYS_DIR"
    mkdir -p "$BACKUP_DIR"

    log "SUCCESS" "Prerequisites verified"
}

generate_encryption_key() {
    local key_name=$1
    local key_length=${2:-32}

    log "INFO" "Generating new encryption key: $key_name"

    if [ "$DRY_RUN" = "true" ]; then
        log "INFO" "[DRY RUN] Would generate $key_length-byte key for $key_name"
        return
    fi

    local new_key=$(openssl rand -base64 $key_length)
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local key_file="$KEYS_DIR/${key_name}_${timestamp}.key"

    echo "$new_key" > "$key_file"
    chmod 600 "$key_file"

    log "SUCCESS" "Generated key: $key_file"
    echo "$key_file"
}

backup_current_key() {
    local key_name=$1

    log "INFO" "Backing up current key: $key_name"

    # Find current key file
    local current_key=$(find "$KEYS_DIR" -name "${key_name}*.key" -type f | sort -r | head -1)

    if [ -z "$current_key" ]; then
        log "INFO" "No existing key found for $key_name"
        return 0
    fi

    if [ "$DRY_RUN" = "true" ]; then
        log "INFO" "[DRY RUN] Would backup: $current_key"
        return
    fi

    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/$(basename "$current_key").bak.$timestamp"

    cp "$current_key" "$backup_file"
    chmod 400 "$backup_file"

    log "SUCCESS" "Backed up to: $backup_file"
}

rotate_jwt_secret() {
    log "INFO" "Rotating JWT secrets..."

    # Rotate JWT_ACCESS_SECRET
    backup_current_key "jwt_access_secret"
    local new_access_key_file=$(generate_encryption_key "jwt_access_secret" 64)

    if [ "$DRY_RUN" != "true" ] && [ -n "$new_access_key_file" ]; then
        local env_file="$PROJECT_ROOT/.env"
        if [ -f "$env_file" ]; then
            local new_access_secret=$(cat "$new_access_key_file")

            if grep -q "JWT_ACCESS_SECRET=" "$env_file"; then
                sed -i.bak "s|JWT_ACCESS_SECRET=.*|JWT_ACCESS_SECRET=$new_access_secret|" "$env_file"
                log "SUCCESS" "Updated JWT_ACCESS_SECRET in .env"
            else
                echo "JWT_ACCESS_SECRET=$new_access_secret" >> "$env_file"
                log "SUCCESS" "Added JWT_ACCESS_SECRET to .env"
            fi
        fi
    fi

    # Rotate JWT_REFRESH_SECRET
    backup_current_key "jwt_refresh_secret"
    local new_refresh_key_file=$(generate_encryption_key "jwt_refresh_secret" 64)

    if [ "$DRY_RUN" != "true" ] && [ -n "$new_refresh_key_file" ]; then
        local env_file="$PROJECT_ROOT/.env"
        if [ -f "$env_file" ]; then
            local new_refresh_secret=$(cat "$new_refresh_key_file")

            if grep -q "JWT_REFRESH_SECRET=" "$env_file"; then
                sed -i.bak "s|JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=$new_refresh_secret|" "$env_file"
                log "SUCCESS" "Updated JWT_REFRESH_SECRET in .env"
            else
                echo "JWT_REFRESH_SECRET=$new_refresh_secret" >> "$env_file"
                log "SUCCESS" "Added JWT_REFRESH_SECRET to .env"
            fi
        fi
    fi
}

rotate_session_secret() {
    log "INFO" "Rotating session secret..."

    backup_current_key "session_secret"
    local new_key_file=$(generate_encryption_key "session_secret" 32)

    if [ "$DRY_RUN" != "true" ] && [ -n "$new_key_file" ]; then
        local env_file="$PROJECT_ROOT/.env"
        if [ -f "$env_file" ]; then
            local new_secret=$(cat "$new_key_file")

            if grep -q "SESSION_SECRET=" "$env_file"; then
                sed -i.bak "s|SESSION_SECRET=.*|SESSION_SECRET=$new_secret|" "$env_file"
            else
                echo "SESSION_SECRET=$new_secret" >> "$env_file"
            fi
            log "SUCCESS" "Updated SESSION_SECRET in .env"
        fi
    fi
}

rotate_api_keys() {
    log "INFO" "Rotating API keys..."

    local api_keys=("api_key_internal" "api_key_partner" "webhook_secret")

    for key_name in "${api_keys[@]}"; do
        backup_current_key "$key_name"
        generate_encryption_key "$key_name" 32
    done
}

rotate_database_key() {
    log "INFO" "Rotating database encryption key..."

    backup_current_key "db_encryption"
    local new_key_file=$(generate_encryption_key "db_encryption" 32)

    if [ "$DRY_RUN" != "true" ] && [ -n "$new_key_file" ]; then
        log "WARNING" "Database encryption key rotated"
        log "WARNING" "You may need to re-encrypt existing data with the new key"
    fi
}

cleanup_old_keys() {
    log "INFO" "Cleaning up old keys..."

    local retention_days=${RETENTION_DAYS:-90}
    local deleted=0

    while IFS= read -r old_key; do
        if [ "$DRY_RUN" = "true" ]; then
            log "INFO" "[DRY RUN] Would delete: $old_key"
        else
            rm -f "$old_key"
            ((deleted++))
        fi
    done < <(find "$BACKUP_DIR" -name "*.key.bak.*" -type f -mtime +$retention_days 2>/dev/null)

    if [ $deleted -gt 0 ]; then
        log "SUCCESS" "Deleted $deleted old backup key(s)"
    else
        log "INFO" "No old keys to clean up"
    fi
}

list_keys() {
    log "INFO" "Current encryption keys:"
    echo ""

    find "$KEYS_DIR" -name "*.key" -type f 2>/dev/null | while read -r key_file; do
        local name=$(basename "$key_file")
        local modified=$(stat -c %y "$key_file" 2>/dev/null || stat -f "%Sm" "$key_file" 2>/dev/null)
        echo "  $name"
        echo "    Modified: $modified"
    done

    echo ""
    log "INFO" "Backup keys:"

    find "$BACKUP_DIR" -name "*.bak.*" -type f 2>/dev/null | wc -l | while read count; do
        echo "  $count backup file(s)"
    done
}

verify_key_security() {
    log "INFO" "Verifying key security..."

    local issues=0

    # Check key file permissions
    while IFS= read -r key_file; do
        local perms=$(stat -c %a "$key_file" 2>/dev/null || stat -f "%Lp" "$key_file" 2>/dev/null)

        if [ "$perms" != "600" ] && [ "$perms" != "400" ]; then
            log "WARNING" "Insecure permissions on: $key_file ($perms)"
            ((issues++))

            if [ "$DRY_RUN" != "true" ]; then
                chmod 600 "$key_file"
                log "SUCCESS" "Fixed permissions on: $key_file"
            fi
        fi
    done < <(find "$KEYS_DIR" -name "*.key" -type f 2>/dev/null)

    # Check if keys are in .gitignore
    if [ -f "$PROJECT_ROOT/.gitignore" ]; then
        if ! grep -q "\.keys" "$PROJECT_ROOT/.gitignore"; then
            log "WARNING" ".keys directory should be in .gitignore"
            ((issues++))
        fi
    fi

    if [ $issues -eq 0 ]; then
        log "SUCCESS" "Key security verified"
    fi
}

print_summary() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}         Key Rotation Completed                             ${GREEN}║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "  Keys directory:   $KEYS_DIR"
    echo "  Backup directory: $BACKUP_DIR"
    echo ""
    echo "  IMPORTANT: After key rotation:"
    echo "    1. Restart all application services"
    echo "    2. Invalidate existing sessions (users will need to re-login)"
    echo "    3. Update any external systems with new API keys"
    echo ""
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --keys-dir)
            KEYS_DIR="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN="true"
            shift
            ;;
        --jwt)
            ROTATE_JWT="true"
            shift
            ;;
        --session)
            ROTATE_SESSION="true"
            shift
            ;;
        --api)
            ROTATE_API="true"
            shift
            ;;
        --database)
            ROTATE_DB="true"
            shift
            ;;
        --all)
            ROTATE_ALL="true"
            shift
            ;;
        --list)
            LIST_ONLY="true"
            shift
            ;;
        --cleanup)
            CLEANUP_ONLY="true"
            shift
            ;;
        --verify)
            VERIFY_ONLY="true"
            shift
            ;;
        --help)
            echo "Usage: encryption-key-rotation.sh [options]"
            echo ""
            echo "Options:"
            echo "  --keys-dir <dir>   Keys directory"
            echo "  --dry-run          Show what would be done"
            echo "  --jwt              Rotate JWT secret only"
            echo "  --session          Rotate session secret only"
            echo "  --api              Rotate API keys only"
            echo "  --database         Rotate database encryption key"
            echo "  --all              Rotate all keys"
            echo "  --list             List current keys"
            echo "  --cleanup          Clean up old backup keys"
            echo "  --verify           Verify key security"
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
print_header
check_prerequisites

if [ "$DRY_RUN" = "true" ]; then
    log "WARNING" "DRY RUN MODE - No changes will be made"
    echo ""
fi

if [ "$LIST_ONLY" = "true" ]; then
    list_keys
    exit 0
fi

if [ "$CLEANUP_ONLY" = "true" ]; then
    cleanup_old_keys
    exit 0
fi

if [ "$VERIFY_ONLY" = "true" ]; then
    verify_key_security
    exit 0
fi

# Determine what to rotate
if [ "$ROTATE_ALL" = "true" ]; then
    ROTATE_JWT="true"
    ROTATE_SESSION="true"
    ROTATE_API="true"
    ROTATE_DB="true"
fi

# Default to rotating JWT and session if nothing specified
if [ "$ROTATE_JWT" != "true" ] && [ "$ROTATE_SESSION" != "true" ] && \
   [ "$ROTATE_API" != "true" ] && [ "$ROTATE_DB" != "true" ]; then
    ROTATE_JWT="true"
    ROTATE_SESSION="true"
fi

# Perform rotations
[ "$ROTATE_JWT" = "true" ] && rotate_jwt_secret
[ "$ROTATE_SESSION" = "true" ] && rotate_session_secret
[ "$ROTATE_API" = "true" ] && rotate_api_keys
[ "$ROTATE_DB" = "true" ] && rotate_database_key

# Cleanup and verify
cleanup_old_keys
verify_key_security

print_summary
