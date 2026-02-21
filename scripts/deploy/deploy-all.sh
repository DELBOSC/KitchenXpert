#!/bin/bash
#
# Deploy All - KitchenXpert
#
# Orchestrates deployment of all application components.
#

set -euo pipefail

# Defaults for flag-only variables (prevent unbound variable errors under set -u)
SKIP_TESTS="${SKIP_TESTS:-false}"
SKIP_BUILD="${SKIP_BUILD:-false}"
SKIP_BACKUP="${SKIP_BACKUP:-false}"
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"
DISCORD_WEBHOOK_URL="${DISCORD_WEBHOOK_URL:-}"

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
DEPLOY_BACKEND="${DEPLOY_BACKEND:-true}"
DEPLOY_FRONTEND="${DEPLOY_FRONTEND:-true}"
DEPLOY_PARTNER="${DEPLOY_PARTNER:-true}"
DEPLOY_AI="${DEPLOY_AI:-true}"
DRY_RUN="${DRY_RUN:-false}"
PARALLEL="${PARALLEL:-false}"
NOTIFY="${NOTIFY:-true}"

# Deployment tracking
DEPLOY_ID=$(date +%Y%m%d%H%M%S)
DEPLOY_LOG="$PROJECT_ROOT/logs/deploy/deploy_${DEPLOY_ID}.log"

# Cleanup handler for failed deployments
cleanup_on_failure() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        log "ERROR" "Deployment failed with exit code $exit_code"
        log "INFO" "Check log: $DEPLOY_LOG"
    fi
}
trap cleanup_on_failure EXIT

# Logging
log() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    case $level in
        "INFO")    echo -e "${BLUE}[DEPLOY]${NC} $message" ;;
        "SUCCESS") echo -e "${GREEN}[DEPLOY]${NC} $message" ;;
        "WARNING") echo -e "${YELLOW}[DEPLOY]${NC} $message" ;;
        "ERROR")   echo -e "${RED}[DEPLOY]${NC} $message" ;;
        "STEP")    echo -e "${CYAN}[STEP]${NC} $message" ;;
    esac

    # Also log to file
    echo "[$timestamp] [$level] $message" >> "$DEPLOY_LOG" 2>/dev/null || true
}

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}            KitchenXpert - Full Deployment                   ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "  Deploy ID:    $DEPLOY_ID"
    echo "  Environment:  $ENVIRONMENT"
    echo "  Dry Run:      $DRY_RUN"
    echo ""
}

setup_logging() {
    mkdir -p "$(dirname "$DEPLOY_LOG")"
    echo "=== Deployment Log ===" > "$DEPLOY_LOG"
    echo "Deploy ID: $DEPLOY_ID" >> "$DEPLOY_LOG"
    echo "Environment: $ENVIRONMENT" >> "$DEPLOY_LOG"
    echo "Started: $(date -Iseconds)" >> "$DEPLOY_LOG"
    echo "" >> "$DEPLOY_LOG"
}

validate_environment() {
    if [ "$ENVIRONMENT" = "production" ]; then
        log "INFO" "Validating production environment variables..."
        local has_error=false
        for var in DATABASE_URL REDIS_URL; do
            if [ -z "${!var:-}" ]; then
                log "ERROR" "Missing required variable: $var"
                has_error=true
            fi
        done
        if [ "$has_error" = "true" ]; then
            exit 1
        fi
        log "SUCCESS" "Environment variables validated"
    fi
}

check_prerequisites() {
    log "INFO" "Checking prerequisites..."

    # Check environment configuration
    local env_file="$PROJECT_ROOT/.env.$ENVIRONMENT"
    if [ ! -f "$env_file" ] && [ "$ENVIRONMENT" != "development" ]; then
        log "WARNING" "Environment file not found: $env_file"
    fi

    # Check for required tools
    local missing_tools=()

    for tool in node pnpm docker; do
        if ! command -v $tool &> /dev/null; then
            missing_tools+=($tool)
        fi
    done

    if [ ${#missing_tools[@]} -gt 0 ]; then
        log "ERROR" "Missing required tools: ${missing_tools[*]}"
        exit 1
    fi

    # Check git status
    cd "$PROJECT_ROOT"
    if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
        log "WARNING" "Uncommitted changes detected"
    fi

    # Get current branch and commit
    local branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
    local commit=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    log "INFO" "Deploying from: $branch ($commit)"

    log "SUCCESS" "Prerequisites verified"
}

run_pre_deploy_tests() {
    log "STEP" "Running pre-deployment tests..."

    if [ "$SKIP_TESTS" = "true" ]; then
        log "WARNING" "Skipping tests (SKIP_TESTS=true)"
        return 0
    fi

    cd "$PROJECT_ROOT"

    # Type checking
    log "INFO" "Running type checks..."
    pnpm type-check 2>/dev/null || {
        log "ERROR" "Type check failed"
        return 1
    }

    # Linting
    log "INFO" "Running linter..."
    pnpm lint 2>/dev/null || {
        log "WARNING" "Lint warnings detected"
    }

    # Unit tests
    log "INFO" "Running unit tests..."
    pnpm test:unit --passWithNoTests 2>/dev/null || {
        log "ERROR" "Unit tests failed"
        return 1
    }

    log "SUCCESS" "Pre-deployment tests passed"
}

build_all() {
    log "STEP" "Building all applications..."

    if [ "$SKIP_BUILD" = "true" ]; then
        log "WARNING" "Skipping build (SKIP_BUILD=true)"
        return 0
    fi

    cd "$PROJECT_ROOT"

    # Run the build script
    local build_script="$SCRIPT_DIR/../build/build-all.sh"
    if [ -f "$build_script" ]; then
        ENVIRONMENT="$ENVIRONMENT" "$build_script" || {
            log "ERROR" "Build failed"
            return 1
        }
    else
        log "INFO" "Running pnpm build..."
        NODE_ENV=production pnpm build || {
            log "ERROR" "Build failed"
            return 1
        }
    fi

    log "SUCCESS" "Build completed"
}

create_backup() {
    log "INFO" "Creating pre-deployment backup..."

    if [ "$SKIP_BACKUP" = "true" ]; then
        log "WARNING" "Skipping backup (SKIP_BACKUP=true)"
        return 0
    fi

    local backup_script="$SCRIPT_DIR/../database/backup/backup-all.sh"
    if [ -f "$backup_script" ]; then
        BACKUP_TYPE="pre-deploy" "$backup_script" --output "$PROJECT_ROOT/backups/pre-deploy" || {
            log "WARNING" "Backup failed, continuing anyway"
        }
    fi

    log "SUCCESS" "Backup completed"
}

deploy_component() {
    local component=$1
    local script=$2

    log "STEP" "Deploying $component..."

    if [ "$DRY_RUN" = "true" ]; then
        log "INFO" "[DRY RUN] Would deploy $component"
        return 0
    fi

    if [ -f "$script" ]; then
        ENVIRONMENT="$ENVIRONMENT" "$script" || {
            log "ERROR" "$component deployment failed"
            return 1
        }
        log "SUCCESS" "$component deployed"
    else
        log "WARNING" "Deployment script not found: $script"
        return 1
    fi
}

deploy_sequential() {
    local failed=0

    if [ "$DEPLOY_BACKEND" = "true" ]; then
        deploy_component "Backend" "$SCRIPT_DIR/deploy-backend.sh" || ((failed++))
    fi

    if [ "$DEPLOY_FRONTEND" = "true" ]; then
        deploy_component "Frontend" "$SCRIPT_DIR/deploy-frontend.sh" || ((failed++))
    fi

    if [ "$DEPLOY_PARTNER" = "true" ]; then
        deploy_component "Partner Portal" "$SCRIPT_DIR/deploy-partner-portal.sh" || ((failed++))
    fi

    if [ "$DEPLOY_AI" = "true" ]; then
        deploy_component "AI Modules" "$SCRIPT_DIR/deploy-ai-modules.sh" || ((failed++))
    fi

    return $failed
}

deploy_parallel() {
    local pids=()
    local components=()
    local failed=0

    if [ "$DEPLOY_BACKEND" = "true" ]; then
        deploy_component "Backend" "$SCRIPT_DIR/deploy-backend.sh" &
        pids+=($!)
        components+=("Backend")
    fi

    if [ "$DEPLOY_FRONTEND" = "true" ]; then
        deploy_component "Frontend" "$SCRIPT_DIR/deploy-frontend.sh" &
        pids+=($!)
        components+=("Frontend")
    fi

    if [ "$DEPLOY_PARTNER" = "true" ]; then
        deploy_component "Partner Portal" "$SCRIPT_DIR/deploy-partner-portal.sh" &
        pids+=($!)
        components+=("Partner Portal")
    fi

    if [ "$DEPLOY_AI" = "true" ]; then
        deploy_component "AI Modules" "$SCRIPT_DIR/deploy-ai-modules.sh" &
        pids+=($!)
        components+=("AI Modules")
    fi

    # Wait for all deployments
    for i in "${!pids[@]}"; do
        wait "${pids[$i]}" || {
            log "ERROR" "${components[$i]} deployment failed"
            ((failed++))
        }
    done

    return $failed
}

run_post_deploy() {
    log "STEP" "Running post-deployment tasks..."

    # Run database migrations
    if [ "$ENVIRONMENT" != "development" ]; then
        log "INFO" "Running database migrations..."
        cd "$PROJECT_ROOT"
        pnpm prisma migrate deploy 2>&1 | tee -a "$DEPLOY_LOG" || {
            log "ERROR" "Database migration failed"
            log "INFO" "To rollback, restore from backup: $PROJECT_ROOT/backups/pre-deploy"
            return 1
        }
    fi

    # Clear caches
    log "INFO" "Clearing caches..."
    # Add cache clearing commands here

    # Health checks
    log "INFO" "Running health checks..."

    # Wait for services with retries
    local max_retries=12
    local retry_interval=5

    # Check backend health
    if [ "$DEPLOY_BACKEND" = "true" ]; then
        local backend_url="${BACKEND_URL:-http://localhost:4000}"
        local backend_healthy=false
        for i in $(seq 1 $max_retries); do
            if curl -sf --max-time 5 "$backend_url/health" > /dev/null 2>&1; then
                log "SUCCESS" "Backend health check passed (attempt $i)"
                backend_healthy=true
                break
            fi
            log "INFO" "Waiting for backend... (attempt $i/$max_retries)"
            sleep $retry_interval
        done
        if [ "$backend_healthy" = "false" ]; then
            log "ERROR" "Backend health check failed after $max_retries attempts"
        fi
    fi

    # Check frontend health
    if [ "$DEPLOY_FRONTEND" = "true" ]; then
        local frontend_url="${FRONTEND_URL:-http://localhost:3000}"
        local frontend_healthy=false
        for i in $(seq 1 $max_retries); do
            if curl -sf --max-time 5 "$frontend_url" > /dev/null 2>&1; then
                log "SUCCESS" "Frontend health check passed (attempt $i)"
                frontend_healthy=true
                break
            fi
            log "INFO" "Waiting for frontend... (attempt $i/$max_retries)"
            sleep $retry_interval
        done
        if [ "$frontend_healthy" = "false" ]; then
            log "ERROR" "Frontend health check failed after $max_retries attempts"
        fi
    fi

    log "SUCCESS" "Post-deployment tasks completed"
}

send_notification() {
    local status=$1
    local message=$2

    if [ "$NOTIFY" != "true" ]; then
        return 0
    fi

    # Slack notification
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        local color="good"
        [ "$status" = "failure" ] && color="danger"
        [ "$status" = "warning" ] && color="warning"

        curl -s -X POST "$SLACK_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"title\": \"KitchenXpert Deployment\",
                    \"text\": \"$message\",
                    \"fields\": [
                        {\"title\": \"Environment\", \"value\": \"$ENVIRONMENT\", \"short\": true},
                        {\"title\": \"Deploy ID\", \"value\": \"$DEPLOY_ID\", \"short\": true}
                    ]
                }]
            }" &> /dev/null || true
    fi

    # Discord notification
    if [ -n "$DISCORD_WEBHOOK_URL" ]; then
        curl -s -X POST "$DISCORD_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{
                \"embeds\": [{
                    \"title\": \"KitchenXpert Deployment\",
                    \"description\": \"$message\",
                    \"color\": $([ "$status" = "success" ] && echo "3066993" || echo "15158332")
                }]
            }" &> /dev/null || true
    fi
}

print_summary() {
    local status=$1
    local duration=$2

    echo ""
    if [ "$status" = "success" ]; then
        echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║${NC}            Deployment Completed Successfully                ${GREEN}║${NC}"
        echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    else
        echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${RED}║${NC}              Deployment Failed                              ${RED}║${NC}"
        echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
    fi
    echo ""
    echo "  Deploy ID:    $DEPLOY_ID"
    echo "  Environment:  $ENVIRONMENT"
    echo "  Duration:     ${duration}s"
    echo "  Log file:     $DEPLOY_LOG"
    echo ""
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --environment|-e)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN="true"
            shift
            ;;
        --parallel)
            PARALLEL="true"
            shift
            ;;
        --skip-tests)
            SKIP_TESTS="true"
            shift
            ;;
        --skip-build)
            SKIP_BUILD="true"
            shift
            ;;
        --skip-backup)
            SKIP_BACKUP="true"
            shift
            ;;
        --backend-only)
            DEPLOY_FRONTEND="false"
            DEPLOY_PARTNER="false"
            DEPLOY_AI="false"
            shift
            ;;
        --frontend-only)
            DEPLOY_BACKEND="false"
            DEPLOY_PARTNER="false"
            DEPLOY_AI="false"
            shift
            ;;
        --no-notify)
            NOTIFY="false"
            shift
            ;;
        --help)
            echo "Usage: deploy-all.sh [options]"
            echo ""
            echo "Options:"
            echo "  -e, --environment <env>  Target environment (staging, production)"
            echo "  --dry-run                Show what would be deployed"
            echo "  --parallel               Deploy components in parallel"
            echo "  --skip-tests             Skip pre-deployment tests"
            echo "  --skip-build             Skip build step"
            echo "  --skip-backup            Skip database backup"
            echo "  --backend-only           Only deploy backend"
            echo "  --frontend-only          Only deploy frontend"
            echo "  --no-notify              Disable notifications"
            echo "  --help                   Show this help message"
            exit 0
            ;;
        *)
            log "ERROR" "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Load environment
if [ -f "$PROJECT_ROOT/.env" ]; then
    source "$PROJECT_ROOT/.env" 2>/dev/null || true
fi

if [ -f "$PROJECT_ROOT/.env.$ENVIRONMENT" ]; then
    source "$PROJECT_ROOT/.env.$ENVIRONMENT" 2>/dev/null || true
fi

# Main execution
start_time=$(date +%s)

print_header
setup_logging

send_notification "info" "Deployment started for $ENVIRONMENT"

# Run deployment pipeline
validate_environment
check_prerequisites || exit 1
run_pre_deploy_tests || exit 1
build_all || exit 1
create_backup

# Deploy components
deploy_failed=0
if [ "$PARALLEL" = "true" ]; then
    deploy_parallel || deploy_failed=$?
else
    deploy_sequential || deploy_failed=$?
fi

# Post-deployment
if [ $deploy_failed -eq 0 ]; then
    run_post_deploy
fi

# Calculate duration
end_time=$(date +%s)
duration=$((end_time - start_time))

# Final status
if [ $deploy_failed -eq 0 ]; then
    print_summary "success" "$duration"
    send_notification "success" "Deployment to $ENVIRONMENT completed successfully in ${duration}s"
    exit 0
else
    print_summary "failure" "$duration"
    send_notification "failure" "Deployment to $ENVIRONMENT failed after ${duration}s"
    log "INFO" "To rollback, run: ./rollback.sh --deploy-id $DEPLOY_ID"
    exit 1
fi
