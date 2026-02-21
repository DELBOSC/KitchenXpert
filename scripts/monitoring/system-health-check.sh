#!/bin/bash
#
# System Health Check - KitchenXpert
#
# Performs comprehensive system health checks.
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
API_URL="${API_URL:-http://localhost:3001}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"
OUTPUT_DIR="${OUTPUT_DIR:-$PROJECT_ROOT/reports/health}"

# Health status
declare -A health_status
OVERALL_HEALTH="healthy"

# Logging
log() {
    local level=$1
    local message=$2
    case $level in
        "INFO")    echo -e "${BLUE}[HEALTH]${NC} $message" ;;
        "SUCCESS") echo -e "${GREEN}[HEALTH]${NC} $message" ;;
        "WARNING") echo -e "${YELLOW}[HEALTH]${NC} $message" ;;
        "ERROR")   echo -e "${RED}[HEALTH]${NC} $message" ;;
        "STEP")    echo -e "${CYAN}[CHECK]${NC} $message" ;;
    esac
}

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}         KitchenXpert - System Health Check                  ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

record_status() {
    local component=$1
    local status=$2
    local details=$3

    health_status[$component]="$status|$details"

    if [ "$status" = "unhealthy" ]; then
        OVERALL_HEALTH="unhealthy"
    elif [ "$status" = "degraded" ] && [ "$OVERALL_HEALTH" = "healthy" ]; then
        OVERALL_HEALTH="degraded"
    fi
}

check_api_health() {
    log "STEP" "Checking API health..."

    local response=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health" 2>/dev/null || echo "000")

    if [ "$response" = "200" ]; then
        log "SUCCESS" "API is healthy"
        record_status "api" "healthy" "HTTP 200"
    elif [ "$response" = "000" ]; then
        log "ERROR" "API is unreachable"
        record_status "api" "unhealthy" "Connection refused"
    else
        log "WARNING" "API returned status $response"
        record_status "api" "degraded" "HTTP $response"
    fi
}

check_frontend_health() {
    log "STEP" "Checking Frontend health..."

    local response=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" 2>/dev/null || echo "000")

    if [ "$response" = "200" ]; then
        log "SUCCESS" "Frontend is healthy"
        record_status "frontend" "healthy" "HTTP 200"
    elif [ "$response" = "000" ]; then
        log "ERROR" "Frontend is unreachable"
        record_status "frontend" "unhealthy" "Connection refused"
    else
        log "WARNING" "Frontend returned status $response"
        record_status "frontend" "degraded" "HTTP $response"
    fi
}

check_database_health() {
    log "STEP" "Checking Database health..."

    if docker ps | grep -q postgres; then
        if docker exec $(docker ps -qf "name=postgres" | head -1) pg_isready -U postgres &> /dev/null; then
            log "SUCCESS" "PostgreSQL is healthy"
            record_status "postgresql" "healthy" "Accepting connections"
        else
            log "ERROR" "PostgreSQL is not healthy"
            record_status "postgresql" "unhealthy" "Not accepting connections"
        fi
    else
        log "WARNING" "PostgreSQL not detected"
        record_status "postgresql" "unknown" "Not detected"
    fi
}

check_redis_health() {
    log "STEP" "Checking Redis health..."

    if docker ps | grep -q redis; then
        if docker exec $(docker ps -qf "name=redis" | head -1) redis-cli ping &> /dev/null; then
            log "SUCCESS" "Redis is healthy"
            record_status "redis" "healthy" "PONG"
        else
            log "ERROR" "Redis is not healthy"
            record_status "redis" "unhealthy" "No response"
        fi
    else
        log "WARNING" "Redis not detected"
        record_status "redis" "unknown" "Not detected"
    fi
}

check_disk_space() {
    log "STEP" "Checking disk space..."

    local usage=$(df -h "$PROJECT_ROOT" | awk 'NR==2 {print $5}' | sed 's/%//')

    if [ "$usage" -lt 80 ]; then
        log "SUCCESS" "Disk usage: ${usage}%"
        record_status "disk" "healthy" "${usage}% used"
    elif [ "$usage" -lt 90 ]; then
        log "WARNING" "Disk usage: ${usage}%"
        record_status "disk" "degraded" "${usage}% used"
    else
        log "ERROR" "Disk usage critical: ${usage}%"
        record_status "disk" "unhealthy" "${usage}% used"
    fi
}

check_memory() {
    log "STEP" "Checking memory usage..."

    if [[ "$OSTYPE" == "linux"* ]]; then
        local usage=$(free | awk 'NR==2 {printf "%.0f", $3/$2*100}')
        if [ "$usage" -lt 80 ]; then
            log "SUCCESS" "Memory usage: ${usage}%"
            record_status "memory" "healthy" "${usage}% used"
        elif [ "$usage" -lt 90 ]; then
            log "WARNING" "Memory usage: ${usage}%"
            record_status "memory" "degraded" "${usage}% used"
        else
            log "ERROR" "Memory usage critical: ${usage}%"
            record_status "memory" "unhealthy" "${usage}% used"
        fi
    else
        log "INFO" "Memory check not available on this OS"
        record_status "memory" "unknown" "OS not supported"
    fi
}

print_summary() {
    echo ""

    local color=$GREEN
    [ "$OVERALL_HEALTH" = "degraded" ] && color=$YELLOW
    [ "$OVERALL_HEALTH" = "unhealthy" ] && color=$RED

    echo -e "${color}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${color}║${NC}        Overall Health: $(printf '%-34s' "$OVERALL_HEALTH")${color}║${NC}"
    echo -e "${color}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    for component in "${!health_status[@]}"; do
        IFS='|' read -r status details <<< "${health_status[$component]}"
        local icon="✅"
        [ "$status" = "degraded" ] && icon="⚠️"
        [ "$status" = "unhealthy" ] && icon="❌"
        [ "$status" = "unknown" ] && icon="❓"
        printf "  %-15s %s %s\n" "$component" "$icon" "$status"
    done
    echo ""
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --api-url)
            API_URL="$2"
            shift 2
            ;;
        --help)
            echo "Usage: system-health-check.sh [options]"
            echo ""
            echo "Options:"
            echo "  --api-url <url>  API endpoint URL"
            echo "  --help           Show this help message"
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

check_api_health
check_frontend_health
check_database_health
check_redis_health
check_disk_space
check_memory

print_summary

[ "$OVERALL_HEALTH" = "unhealthy" ] && exit 2
[ "$OVERALL_HEALTH" = "degraded" ] && exit 1
exit 0
