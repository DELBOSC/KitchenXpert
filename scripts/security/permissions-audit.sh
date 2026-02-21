#!/bin/bash
#
# Permissions Audit - KitchenXpert
#
# Audits file and directory permissions for security issues.
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
FIX_ISSUES="${FIX:-false}"
OUTPUT_DIR="${OUTPUT_DIR:-$PROJECT_ROOT/reports/security}"

# Stats
TOTAL_ISSUES=0
FIXED_ISSUES=0

# Logging
log() {
    local level=$1
    local message=$2
    case $level in
        "INFO")    echo -e "${BLUE}[PERMS]${NC} $message" ;;
        "SUCCESS") echo -e "${GREEN}[PERMS]${NC} $message" ;;
        "WARNING") echo -e "${YELLOW}[PERMS]${NC} $message" ;;
        "ERROR")   echo -e "${RED}[PERMS]${NC} $message" ;;
    esac
}

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}           KitchenXpert - Permissions Audit                  ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

record_issue() {
    local severity=$1
    local path=$2
    local issue=$3
    local current=$4
    local expected=$5

    ((TOTAL_ISSUES++))

    echo "$severity|$path|$issue|$current|$expected" >> "$OUTPUT_DIR/permission_issues.txt"
}

check_sensitive_files() {
    log "INFO" "Checking sensitive file permissions..."

    local sensitive_patterns=(
        ".env"
        ".env.*"
        "*.key"
        "*.pem"
        "*.crt"
        "credentials*"
        "secrets*"
        "*password*"
    )

    for pattern in "${sensitive_patterns[@]}"; do
        while IFS= read -r file; do
            local perms=$(stat -c %a "$file" 2>/dev/null || stat -f "%Lp" "$file" 2>/dev/null)

            # Should be readable only by owner (600 or 400)
            if [ "$perms" != "600" ] && [ "$perms" != "400" ]; then
                log "WARNING" "Insecure permissions on sensitive file: $file ($perms)"
                record_issue "high" "$file" "Insecure permissions" "$perms" "600"

                if [ "$FIX_ISSUES" = "true" ]; then
                    chmod 600 "$file"
                    log "SUCCESS" "Fixed: $file"
                    ((FIXED_ISSUES++))
                fi
            fi
        done < <(find "$PROJECT_ROOT" -name "$pattern" -type f -not -path "*/node_modules/*" 2>/dev/null)
    done
}

check_world_writable() {
    log "INFO" "Checking for world-writable files..."

    local count=0

    while IFS= read -r file; do
        ((count++))
        local perms=$(stat -c %a "$file" 2>/dev/null || stat -f "%Lp" "$file" 2>/dev/null)
        log "WARNING" "World-writable file: $file ($perms)"
        record_issue "medium" "$file" "World-writable" "$perms" "644"

        if [ "$FIX_ISSUES" = "true" ]; then
            chmod o-w "$file"
            ((FIXED_ISSUES++))
        fi
    done < <(find "$PROJECT_ROOT" -type f -perm -002 -not -path "*/node_modules/*" 2>/dev/null)

    if [ $count -eq 0 ]; then
        log "SUCCESS" "No world-writable files found"
    else
        log "WARNING" "Found $count world-writable file(s)"
    fi
}

check_world_readable_secrets() {
    log "INFO" "Checking for world-readable secret files..."

    local secret_dirs=(
        "$PROJECT_ROOT/.keys"
        "$PROJECT_ROOT/certs"
        "$PROJECT_ROOT/secrets"
    )

    for dir in "${secret_dirs[@]}"; do
        if [ -d "$dir" ]; then
            while IFS= read -r file; do
                local perms=$(stat -c %a "$file" 2>/dev/null || stat -f "%Lp" "$file" 2>/dev/null)
                if [[ "$perms" =~ [0-9][0-9][4-7] ]]; then
                    log "WARNING" "World-readable secret: $file ($perms)"
                    record_issue "high" "$file" "World-readable secret" "$perms" "600"

                    if [ "$FIX_ISSUES" = "true" ]; then
                        chmod 600 "$file"
                        ((FIXED_ISSUES++))
                    fi
                fi
            done < <(find "$dir" -type f 2>/dev/null)
        fi
    done
}

check_script_permissions() {
    log "INFO" "Checking script file permissions..."

    local issues=0

    # Check scripts directory
    while IFS= read -r script; do
        local perms=$(stat -c %a "$script" 2>/dev/null || stat -f "%Lp" "$script" 2>/dev/null)

        # Scripts should be executable but not world-writable
        if [[ "$perms" =~ [0-9][0-9][2367] ]]; then
            log "WARNING" "World-writable script: $script ($perms)"
            record_issue "medium" "$script" "World-writable script" "$perms" "755"
            ((issues++))

            if [ "$FIX_ISSUES" = "true" ]; then
                chmod 755 "$script"
                ((FIXED_ISSUES++))
            fi
        fi

        # Should be executable
        if [ ! -x "$script" ]; then
            log "INFO" "Script not executable: $script"
            if [ "$FIX_ISSUES" = "true" ]; then
                chmod +x "$script"
                ((FIXED_ISSUES++))
            fi
        fi
    done < <(find "$PROJECT_ROOT/scripts" -name "*.sh" -type f 2>/dev/null)

    if [ $issues -eq 0 ]; then
        log "SUCCESS" "Script permissions look good"
    fi
}

check_git_permissions() {
    log "INFO" "Checking Git repository permissions..."

    if [ -d "$PROJECT_ROOT/.git" ]; then
        # .git directory should not be world-readable in production
        local git_perms=$(stat -c %a "$PROJECT_ROOT/.git" 2>/dev/null || stat -f "%Lp" "$PROJECT_ROOT/.git" 2>/dev/null)

        if [[ "$git_perms" =~ [0-9][0-9][4-7] ]]; then
            log "INFO" ".git directory is world-readable (ok for development)"
        fi

        # Check for sensitive files in .git
        if [ -f "$PROJECT_ROOT/.git/config" ]; then
            if grep -q "password" "$PROJECT_ROOT/.git/config" 2>/dev/null; then
                log "WARNING" "Password found in .git/config"
                record_issue "high" "$PROJECT_ROOT/.git/config" "Password in git config" "N/A" "Remove"
            fi
        fi
    fi
}

check_upload_directory() {
    log "INFO" "Checking upload directory permissions..."

    local upload_dirs=(
        "$PROJECT_ROOT/uploads"
        "$PROJECT_ROOT/public/uploads"
        "$PROJECT_ROOT/storage"
    )

    for dir in "${upload_dirs[@]}"; do
        if [ -d "$dir" ]; then
            local perms=$(stat -c %a "$dir" 2>/dev/null || stat -f "%Lp" "$dir" 2>/dev/null)

            # Upload directories should be writable but not executable
            if [[ "$perms" =~ [0-9][1357][0-9] ]]; then
                log "INFO" "Upload directory has execute permission: $dir ($perms)"
            fi

            # Check for executable files in upload directory
            local exec_files=$(find "$dir" -type f -executable 2>/dev/null | wc -l)
            if [ $exec_files -gt 0 ]; then
                log "WARNING" "Found $exec_files executable file(s) in upload directory"
                record_issue "medium" "$dir" "Executable files in upload dir" "$exec_files" "0"
            fi
        fi
    done
}

check_config_files() {
    log "INFO" "Checking configuration file permissions..."

    local config_files=(
        "package.json"
        "tsconfig.json"
        "next.config.js"
        "next.config.mjs"
        "prisma/schema.prisma"
    )

    for config in "${config_files[@]}"; do
        local file="$PROJECT_ROOT/$config"
        if [ -f "$file" ]; then
            local perms=$(stat -c %a "$file" 2>/dev/null || stat -f "%Lp" "$file" 2>/dev/null)

            # Config files should be readable but not world-writable
            if [[ "$perms" =~ [0-9][0-9][2367] ]]; then
                log "WARNING" "World-writable config: $file ($perms)"
                record_issue "medium" "$file" "World-writable config" "$perms" "644"

                if [ "$FIX_ISSUES" = "true" ]; then
                    chmod 644 "$file"
                    ((FIXED_ISSUES++))
                fi
            fi
        fi
    done
}

check_directory_permissions() {
    log "INFO" "Checking directory permissions..."

    # Sensitive directories that should have restricted access
    local restricted_dirs=(
        ".keys"
        "certs"
        "secrets"
        "private"
    )

    for dir_name in "${restricted_dirs[@]}"; do
        local dir="$PROJECT_ROOT/$dir_name"
        if [ -d "$dir" ]; then
            local perms=$(stat -c %a "$dir" 2>/dev/null || stat -f "%Lp" "$dir" 2>/dev/null)

            if [ "$perms" != "700" ] && [ "$perms" != "750" ]; then
                log "WARNING" "Sensitive directory too permissive: $dir ($perms)"
                record_issue "high" "$dir" "Directory too permissive" "$perms" "700"

                if [ "$FIX_ISSUES" = "true" ]; then
                    chmod 700 "$dir"
                    ((FIXED_ISSUES++))
                fi
            fi
        fi
    done
}

generate_report() {
    mkdir -p "$OUTPUT_DIR"

    local report_file="$OUTPUT_DIR/permissions_audit_$(date +%Y%m%d).md"

    cat > "$report_file" << EOF
# Permissions Audit Report

**Date:** $(date '+%Y-%m-%d %H:%M:%S')
**Project:** KitchenXpert

## Summary

- **Total Issues Found:** $TOTAL_ISSUES
- **Issues Fixed:** $FIXED_ISSUES
- **Remaining Issues:** $((TOTAL_ISSUES - FIXED_ISSUES))

## Issues

EOF

    if [ -f "$OUTPUT_DIR/permission_issues.txt" ]; then
        echo "| Severity | Path | Issue | Current | Expected |" >> "$report_file"
        echo "|----------|------|-------|---------|----------|" >> "$report_file"

        while IFS='|' read -r severity path issue current expected; do
            echo "| $severity | $path | $issue | $current | $expected |" >> "$report_file"
        done < "$OUTPUT_DIR/permission_issues.txt"
    else
        echo "No issues found." >> "$report_file"
    fi

    cat >> "$report_file" << EOF

## Recommendations

1. Fix all high severity issues immediately
2. Review medium severity issues and fix as appropriate
3. Run this audit regularly (e.g., before deployments)
4. Consider implementing a pre-commit hook for permission checks

---
*Generated by KitchenXpert Permissions Audit*
EOF

    log "SUCCESS" "Report generated: $report_file"
}

print_summary() {
    echo ""
    if [ $TOTAL_ISSUES -eq 0 ]; then
        echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║${NC}         Permissions Audit Complete - All Clear             ${GREEN}║${NC}"
        echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    elif [ $TOTAL_ISSUES -eq $FIXED_ISSUES ]; then
        echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║${NC}      Permissions Audit Complete - Issues Fixed             ${GREEN}║${NC}"
        echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    else
        echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${YELLOW}║${NC}       Permissions Audit Complete - Issues Found            ${YELLOW}║${NC}"
        echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"
    fi
    echo ""
    echo "  Total issues:    $TOTAL_ISSUES"
    echo "  Fixed issues:    $FIXED_ISSUES"
    echo "  Remaining:       $((TOTAL_ISSUES - FIXED_ISSUES))"
    echo ""
    echo "  Report: $OUTPUT_DIR/permissions_audit_$(date +%Y%m%d).md"
    echo ""
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --fix)
            FIX_ISSUES="true"
            shift
            ;;
        --output|-o)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        --help)
            echo "Usage: permissions-audit.sh [options]"
            echo ""
            echo "Options:"
            echo "  --fix              Attempt to fix permission issues"
            echo "  -o, --output <dir> Output directory for reports"
            echo "  --help             Show this help message"
            exit 0
            ;;
        *)
            log "ERROR" "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Clear previous issues file
mkdir -p "$OUTPUT_DIR"
rm -f "$OUTPUT_DIR/permission_issues.txt"

# Main execution
print_header

if [ "$FIX_ISSUES" = "true" ]; then
    log "INFO" "Running in FIX mode - will attempt to fix issues"
    echo ""
fi

check_sensitive_files
check_world_writable
check_world_readable_secrets
check_script_permissions
check_git_permissions
check_upload_directory
check_config_files
check_directory_permissions

generate_report
print_summary

# Exit with appropriate code
if [ $((TOTAL_ISSUES - FIXED_ISSUES)) -gt 0 ]; then
    exit 1
else
    exit 0
fi
