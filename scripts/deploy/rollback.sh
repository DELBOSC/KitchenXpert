#!/bin/bash
#
# Rollback Deployment - KitchenXpert
#
# Rollback to a previous deployment version.
#

set -euo pipefail

# Defaults for flag-only variables (prevent unbound variable errors under set -u)
FORCE="${FORCE:-false}"
INCLUDE_DB="${INCLUDE_DB:-false}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Configuration
ENVIRONMENT="${ENVIRONMENT:-staging}"
ROLLBACK_TARGET=""
COMPONENT="${COMPONENT:-all}"
DRY_RUN="${DRY_RUN:-false}"

# Logging
log() {
    local level=$1
    local message=$2
    case $level in
        "INFO")    echo -e "${BLUE}[ROLLBACK]${NC} $message" ;;
        "SUCCESS") echo -e "${GREEN}[ROLLBACK]${NC} $message" ;;
        "WARNING") echo -e "${YELLOW}[ROLLBACK]${NC} $message" ;;
        "ERROR")   echo -e "${RED}[ROLLBACK]${NC} $message" ;;
        "STEP")    echo -e "${CYAN}[STEP]${NC} $message" ;;
    esac
}

print_header() {
    echo ""
    echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║${NC}            KitchenXpert - Deployment Rollback               ${YELLOW}║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

list_deployments() {
    log "INFO" "Available deployments:"
    echo ""

    # Docker deployments
    echo "  Docker Images:"
    for component in backend frontend partner-portal ai; do
        local images=$(docker images "kitchenxpert-$component" --format "{{.Tag}}" 2>/dev/null | head -5)
        if [ -n "$images" ]; then
            echo "    $component:"
            echo "$images" | while read -r tag; do
                echo "      - $tag"
            done
        fi
    done
    echo ""

    # Git commits
    echo "  Recent Git Commits:"
    cd "$PROJECT_ROOT"
    git log --oneline -10 2>/dev/null | while read -r line; do
        echo "    $line"
    done
    echo ""

    # Deployment logs
    local logs_dir="$PROJECT_ROOT/logs/deploy"
    if [ -d "$logs_dir" ]; then
        echo "  Recent Deployments:"
        ls -t "$logs_dir" 2>/dev/null | head -5 | while read -r log; do
            echo "    - ${log%.log}"
        done
    fi
    echo ""
}

get_previous_version() {
    local component=$1

    # Get previous Docker image tag
    local prev_tag=$(docker images "kitchenxpert-$component" --format "{{.Tag}}" 2>/dev/null | grep "$ENVIRONMENT" | head -2 | tail -1)

    if [ -n "$prev_tag" ]; then
        echo "$prev_tag"
    else
        echo ""
    fi
}

rollback_docker() {
    local component=$1
    local target=$2

    log "STEP" "Rolling back $component to $target..."

    if [ "$DRY_RUN" = "true" ]; then
        log "INFO" "[DRY RUN] Would rollback $component to $target"
        return 0
    fi

    local image_name="kitchenxpert-$component"
    local container_name="kitchenxpert-$component-$ENVIRONMENT"

    # Check if target image exists
    if ! docker images "$image_name:$target" --format "{{.ID}}" | grep -q .; then
        log "ERROR" "Image not found: $image_name:$target"
        return 1
    fi

    # Stop current container
    docker stop "$container_name" 2>/dev/null || true
    docker rm "$container_name" 2>/dev/null || true

    # Determine port
    local port
    case $component in
        backend) port="${BACKEND_PORT:-4000}" ;;
        frontend) port="${FRONTEND_PORT:-3000}" ;;
        partner-portal) port="${PARTNER_PORT:-3002}" ;;
        ai) port="${AI_PORT:-5000}" ;;
    esac

    # Start container with previous version
    docker run -d \
        --name "$container_name" \
        -p "$port:$port" \
        --restart unless-stopped \
        "$image_name:$target"

    log "SUCCESS" "$component rolled back to $target"
}

rollback_kubernetes() {
    local component=$1
    local target=$2

    log "STEP" "Rolling back $component in Kubernetes..."

    local namespace="kitchenxpert-$ENVIRONMENT"
    local deployment="$component"

    if [ "$DRY_RUN" = "true" ]; then
        log "INFO" "[DRY RUN] Would rollback $deployment in $namespace"
        return 0
    fi

    if [ -n "$target" ] && [[ "$target" =~ ^[0-9]+$ ]]; then
        # Rollback to specific revision
        kubectl rollout undo deployment/$deployment -n "$namespace" --to-revision="$target"
    else
        # Rollback to previous version
        kubectl rollout undo deployment/$deployment -n "$namespace"
    fi

    # Wait for rollout
    kubectl rollout status deployment/$deployment -n "$namespace" --timeout=300s

    log "SUCCESS" "$component rolled back in Kubernetes"
}

rollback_git() {
    local target=$1

    log "STEP" "Rolling back to Git commit: $target..."

    cd "$PROJECT_ROOT"

    if [ "$DRY_RUN" = "true" ]; then
        log "INFO" "[DRY RUN] Would checkout $target and redeploy"
        return 0
    fi

    # Create backup branch
    local backup_branch="backup-before-rollback-$(date +%Y%m%d%H%M%S)"
    git branch "$backup_branch"
    log "INFO" "Created backup branch: $backup_branch"

    # Checkout target
    git checkout "$target"

    # Rebuild and redeploy
    log "INFO" "Rebuilding and redeploying..."
    "$SCRIPT_DIR/deploy-all.sh" --environment "$ENVIRONMENT" --skip-tests

    log "SUCCESS" "Rolled back to $target"
}

rollback_database() {
    log "STEP" "Rolling back database..."

    if [ "$DRY_RUN" = "true" ]; then
        log "INFO" "[DRY RUN] Would restore from backup"
        return 0
    fi

    # Find latest pre-deploy backup
    local backup_dir="$PROJECT_ROOT/backups/pre-deploy"
    local latest_backup=$(ls -t "$backup_dir" 2>/dev/null | head -1)

    if [ -z "$latest_backup" ]; then
        log "WARNING" "No pre-deploy backup found"
        return 1
    fi

    log "INFO" "Restoring from: $latest_backup"

    # Restore database
    "$SCRIPT_DIR/../database/restore/restore-all.sh" \
        --backup-dir "$backup_dir/$latest_backup" \
        --force

    log "SUCCESS" "Database rolled back"
}

confirm_rollback() {
    if [ "$FORCE" = "true" ]; then
        return 0
    fi

    echo ""
    echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║${NC}                        WARNING                              ${YELLOW}║${NC}"
    echo -e "${YELLOW}║${NC}  You are about to rollback the deployment!                 ${YELLOW}║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "  Environment: $ENVIRONMENT"
    echo "  Component:   $COMPONENT"
    echo "  Target:      ${ROLLBACK_TARGET:-previous version}"
    echo ""

    read -p "Are you sure you want to proceed? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        log "INFO" "Rollback cancelled"
        exit 0
    fi
}

perform_rollback() {
    local failed=0

    case $COMPONENT in
        all)
            for comp in backend frontend partner-portal ai; do
                local target=$(get_previous_version "$comp")
                if [ -n "$target" ]; then
                    rollback_docker "$comp" "$target" || ((failed++))
                fi
            done
            ;;
        backend|frontend|partner-portal|ai)
            local target="${ROLLBACK_TARGET:-$(get_previous_version "$COMPONENT")}"
            if [ -n "$target" ]; then
                rollback_docker "$COMPONENT" "$target" || ((failed++))
            else
                log "ERROR" "No previous version found for $COMPONENT"
                ((failed++))
            fi
            ;;
        database)
            rollback_database || ((failed++))
            ;;
        *)
            log "ERROR" "Unknown component: $COMPONENT"
            exit 1
            ;;
    esac

    return $failed
}

health_check() {
    log "INFO" "Running post-rollback health checks..."

    local all_healthy=true

    # Check backend
    if [ "$COMPONENT" = "all" ] || [ "$COMPONENT" = "backend" ]; then
        local backend_url="${BACKEND_URL:-http://localhost:${BACKEND_PORT:-3001}}"
        if curl -sf "$backend_url/health" > /dev/null 2>&1; then
            log "SUCCESS" "Backend is healthy"
        else
            log "WARNING" "Backend health check failed"
            all_healthy=false
        fi
    fi

    # Check frontend
    if [ "$COMPONENT" = "all" ] || [ "$COMPONENT" = "frontend" ]; then
        local frontend_url="${FRONTEND_URL:-http://localhost:${FRONTEND_PORT:-3000}}"
        if curl -sf "$frontend_url" > /dev/null 2>&1; then
            log "SUCCESS" "Frontend is healthy"
        else
            log "WARNING" "Frontend health check failed"
            all_healthy=false
        fi
    fi

    if [ "$all_healthy" = "true" ]; then
        log "SUCCESS" "All health checks passed"
    else
        log "WARNING" "Some health checks failed"
    fi
}

print_summary() {
    local status=$1

    echo ""
    if [ "$status" = "success" ]; then
        echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║${NC}            Rollback Completed Successfully                  ${GREEN}║${NC}"
        echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    else
        echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${RED}║${NC}                  Rollback Failed                            ${RED}║${NC}"
        echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
    fi
    echo ""
    echo "  Environment: $ENVIRONMENT"
    echo "  Component:   $COMPONENT"
    echo "  Target:      ${ROLLBACK_TARGET:-previous version}"
    echo ""
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --environment|-e)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --component|-c)
            COMPONENT="$2"
            shift 2
            ;;
        --target|-t)
            ROLLBACK_TARGET="$2"
            shift 2
            ;;
        --deploy-id)
            ROLLBACK_TARGET="$2"
            shift 2
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
            list_deployments
            exit 0
            ;;
        --include-db)
            INCLUDE_DB="true"
            shift
            ;;
        --help)
            echo "Usage: rollback.sh [options]"
            echo ""
            echo "Options:"
            echo "  -e, --environment <env>  Target environment"
            echo "  -c, --component <name>   Component to rollback: all, backend, frontend, etc."
            echo "  -t, --target <version>   Target version/tag to rollback to"
            echo "  --deploy-id <id>         Rollback to specific deployment ID"
            echo "  --dry-run                Show what would be rolled back"
            echo "  --force                  Skip confirmation prompt"
            echo "  --list                   List available versions"
            echo "  --include-db             Also rollback database"
            echo "  --help                   Show this help message"
            echo ""
            echo "Examples:"
            echo "  rollback.sh --list"
            echo "  rollback.sh -c backend -t staging-20240101120000"
            echo "  rollback.sh -c all --dry-run"
            exit 0
            ;;
        *)
            log "ERROR" "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Load environment
if [ -f "$PROJECT_ROOT/.env.$ENVIRONMENT" ]; then
    source "$PROJECT_ROOT/.env.$ENVIRONMENT" 2>/dev/null || true
fi

# Main execution
print_header

if [ "$DRY_RUN" = "true" ]; then
    log "INFO" "Running in DRY RUN mode - no changes will be made"
    echo ""
fi

confirm_rollback

if perform_rollback; then
    if [ "$INCLUDE_DB" = "true" ]; then
        rollback_database
    fi

    health_check
    print_summary "success"
    exit 0
else
    print_summary "failure"
    exit 1
fi
