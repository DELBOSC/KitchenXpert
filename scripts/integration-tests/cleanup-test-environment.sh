#!/bin/bash
#
# Cleanup Test Environment - KitchenXpert
#
# Cleans up test environment, removes containers and test data.
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
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Configuration
DOCKER_COMPOSE_FILE="${DOCKER_COMPOSE_FILE:-$PROJECT_ROOT/docker-compose.test.yml}"
REMOVE_VOLUMES="${REMOVE_VOLUMES:-false}"
REMOVE_ENV="${REMOVE_ENV:-false}"
REMOVE_REPORTS="${REMOVE_REPORTS:-false}"
FORCE="${FORCE:-false}"

# Logging
log() {
    local level=$1
    local message=$2
    case $level in
        "INFO")    echo -e "${BLUE}[CLEANUP]${NC} $message" ;;
        "SUCCESS") echo -e "${GREEN}[CLEANUP]${NC} $message" ;;
        "WARNING") echo -e "${YELLOW}[CLEANUP]${NC} $message" ;;
        "ERROR")   echo -e "${RED}[CLEANUP]${NC} $message" ;;
        "STEP")    echo -e "${CYAN}[STEP]${NC} $message" ;;
    esac
}

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}     KitchenXpert - Test Environment Cleanup                ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

confirm_cleanup() {
    if [ "$FORCE" = "true" ]; then
        return 0
    fi

    echo "This will:"
    echo "  - Stop and remove test Docker containers"
    [ "$REMOVE_VOLUMES" = "true" ] && echo "  - Remove test database volumes (DATA LOSS)"
    [ "$REMOVE_ENV" = "true" ] && echo "  - Remove .env.test file"
    [ "$REMOVE_REPORTS" = "true" ] && echo "  - Remove test reports"
    echo ""

    read -p "Continue? (y/N): " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        log "INFO" "Cleanup cancelled"
        exit 0
    fi
}

stop_docker_containers() {
    log "STEP" "Stopping Docker test containers..."

    if [ -f "$DOCKER_COMPOSE_FILE" ]; then
        if docker compose version &> /dev/null; then
            docker compose -f "$DOCKER_COMPOSE_FILE" down 2>/dev/null || true
        else
            docker-compose -f "$DOCKER_COMPOSE_FILE" down 2>/dev/null || true
        fi
    fi

    # Stop individual containers if they exist
    local containers=(
        "kitchenxpert_postgres_test"
        "kitchenxpert_mongodb_test"
        "kitchenxpert_redis_test"
        "kitchenxpert_mailhog_test"
    )

    for container in "${containers[@]}"; do
        if docker ps -a | grep -q "$container"; then
            log "INFO" "Stopping container: $container"
            docker stop "$container" 2>/dev/null || true
            docker rm "$container" 2>/dev/null || true
        fi
    done

    log "SUCCESS" "Docker containers stopped"
}

remove_docker_volumes() {
    log "STEP" "Removing Docker test volumes..."

    if [ -f "$DOCKER_COMPOSE_FILE" ]; then
        if docker compose version &> /dev/null; then
            docker compose -f "$DOCKER_COMPOSE_FILE" down -v 2>/dev/null || true
        else
            docker-compose -f "$DOCKER_COMPOSE_FILE" down -v 2>/dev/null || true
        fi
    fi

    # Remove individual volumes
    local volumes=(
        "postgres_test_data"
        "mongodb_test_data"
        "kitchenxpertproject_postgres_test_data"
        "kitchenxpertproject_mongodb_test_data"
    )

    for volume in "${volumes[@]}"; do
        if docker volume ls | grep -q "$volume"; then
            log "INFO" "Removing volume: $volume"
            docker volume rm "$volume" 2>/dev/null || true
        fi
    done

    log "SUCCESS" "Docker volumes removed"
}

remove_test_env() {
    log "STEP" "Removing test environment file..."

    local env_file="$PROJECT_ROOT/.env.test"
    if [ -f "$env_file" ]; then
        rm -f "$env_file"
        log "SUCCESS" "Removed: $env_file"
    else
        log "INFO" "No test environment file to remove"
    fi
}

remove_test_reports() {
    log "STEP" "Removing test reports..."

    local reports_dir="$PROJECT_ROOT/reports/tests"
    if [ -d "$reports_dir" ]; then
        rm -rf "$reports_dir"
        log "SUCCESS" "Removed: $reports_dir"
    else
        log "INFO" "No test reports directory to remove"
    fi
}

remove_test_uploads() {
    log "STEP" "Removing test uploads directory..."

    local uploads_dir="$PROJECT_ROOT/test-uploads"
    if [ -d "$uploads_dir" ]; then
        rm -rf "$uploads_dir"
        log "SUCCESS" "Removed: $uploads_dir"
    else
        log "INFO" "No test uploads directory to remove"
    fi
}

cleanup_node_modules_cache() {
    log "STEP" "Cleaning test-related caches..."

    cd "$PROJECT_ROOT"

    # Clear Jest cache
    if command -v pnpm &> /dev/null; then
        pnpm jest --clearCache 2>/dev/null || true
    fi

    # Remove test coverage directory
    local coverage_dirs=(
        "$PROJECT_ROOT/coverage"
        "$PROJECT_ROOT/.nyc_output"
    )

    for dir in "${coverage_dirs[@]}"; do
        if [ -d "$dir" ]; then
            rm -rf "$dir"
            log "INFO" "Removed: $dir"
        fi
    done

    log "SUCCESS" "Caches cleaned"
}

cleanup_docker_networks() {
    log "STEP" "Cleaning up Docker networks..."

    # Remove test-specific networks
    docker network ls --filter "name=test" -q | while read network; do
        log "INFO" "Removing network: $network"
        docker network rm "$network" 2>/dev/null || true
    done

    # Prune unused networks
    docker network prune -f 2>/dev/null || true

    log "SUCCESS" "Docker networks cleaned"
}

print_summary() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}        Test Environment Cleanup Complete                   ${GREEN}║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "  Cleaned:"
    echo "    ✓ Docker containers stopped and removed"
    [ "$REMOVE_VOLUMES" = "true" ] && echo "    ✓ Docker volumes removed"
    [ "$REMOVE_ENV" = "true" ] && echo "    ✓ Test environment file removed"
    [ "$REMOVE_REPORTS" = "true" ] && echo "    ✓ Test reports removed"
    echo "    ✓ Test uploads directory removed"
    echo "    ✓ Test caches cleared"
    echo ""
    echo "  To set up test environment again:"
    echo "    ./scripts/integration-tests/setup-test-environment.sh"
    echo ""
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --volumes|-v)
            REMOVE_VOLUMES="true"
            shift
            ;;
        --env|-e)
            REMOVE_ENV="true"
            shift
            ;;
        --reports|-r)
            REMOVE_REPORTS="true"
            shift
            ;;
        --all|-a)
            REMOVE_VOLUMES="true"
            REMOVE_ENV="true"
            REMOVE_REPORTS="true"
            shift
            ;;
        --force|-f)
            FORCE="true"
            shift
            ;;
        --help)
            echo "Usage: cleanup-test-environment.sh [options]"
            echo ""
            echo "Options:"
            echo "  -v, --volumes    Also remove Docker volumes (data loss)"
            echo "  -e, --env        Also remove .env.test file"
            echo "  -r, --reports    Also remove test reports"
            echo "  -a, --all        Remove everything (volumes, env, reports)"
            echo "  -f, --force      Skip confirmation prompt"
            echo "  --help           Show this help message"
            echo ""
            echo "Examples:"
            echo "  cleanup-test-environment.sh              # Basic cleanup"
            echo "  cleanup-test-environment.sh --all        # Full cleanup"
            echo "  cleanup-test-environment.sh -v -f        # Remove volumes, no prompt"
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
confirm_cleanup

stop_docker_containers

if [ "$REMOVE_VOLUMES" = "true" ]; then
    remove_docker_volumes
fi

if [ "$REMOVE_ENV" = "true" ]; then
    remove_test_env
fi

if [ "$REMOVE_REPORTS" = "true" ]; then
    remove_test_reports
fi

remove_test_uploads
cleanup_node_modules_cache
cleanup_docker_networks

print_summary
