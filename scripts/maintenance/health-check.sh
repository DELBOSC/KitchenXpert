#!/bin/bash
#
# Health Check - KitchenXpert
#
# Comprehensive health check for all system components.
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
BACKEND_URL="${BACKEND_URL:-http://localhost:3001}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"
PARTNER_URL="${PARTNER_URL:-http://localhost:3002}"
AI_URL="${AI_URL:-http://localhost:5000}"
TIMEOUT="${TIMEOUT:-5}"
VERBOSE="${VERBOSE:-false}"

# Results tracking
declare -A RESULTS
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# Logging
log() {
    local level=$1
    local message=$2
    case $level in
        "INFO")    echo -e "${BLUE}[CHECK]${NC} $message" ;;
        "SUCCESS") echo -e "${GREEN}[✓]${NC} $message" ;;
        "WARNING") echo -e "${YELLOW}[⚠]${NC} $message" ;;
        "ERROR")   echo -e "${RED}[✗]${NC} $message" ;;
        "STEP")    echo -e "${CYAN}[→]${NC} $message" ;;
    esac
}

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}              KitchenXpert - Health Check                    ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

record_result() {
    local component=$1
    local status=$2
    local details=$3

    RESULTS["$component"]="$status|$details"
    ((TOTAL_CHECKS++))

    case $status in
        "pass") ((PASSED_CHECKS++)) ;;
        "fail") ((FAILED_CHECKS++)) ;;
        "warn") ((WARNING_CHECKS++)) ;;
    esac
}

check_http_endpoint() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}
    local max_attempts=${4:-3}

    log "STEP" "Checking $name..."

    local response
    local http_code

    for attempt in $(seq 1 $max_attempts); do
        response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout $TIMEOUT --max-time 10 "$url" 2>/dev/null) || response="000"

        if [ "$response" = "$expected_status" ]; then
            log "SUCCESS" "$name is healthy (HTTP $response)"
            record_result "$name" "pass" "HTTP $response"
            return 0
        fi

        if [ $attempt -lt $max_attempts ]; then
            log "INFO" "$name check attempt $attempt/$max_attempts failed (HTTP $response), retrying..."
            sleep 2
        fi
    done

    if [ "$response" = "000" ]; then
        log "ERROR" "$name is unreachable after $max_attempts attempts"
        record_result "$name" "fail" "Connection failed"
        return 1
    else
        log "WARNING" "$name returned HTTP $response (expected $expected_status)"
        record_result "$name" "warn" "HTTP $response"
        return 1
    fi
}

check_backend() {
    echo ""
    log "INFO" "Checking Backend Services..."
    echo ""

    # Health endpoint
    check_http_endpoint "Backend Health" "$BACKEND_URL/health"

    # API endpoint
    check_http_endpoint "Backend API" "$BACKEND_URL/api"

    # Database connectivity (via API)
    if curl -sf --max-time 10 "$BACKEND_URL/health" 2>/dev/null | grep -q "database.*ok"; then
        log "SUCCESS" "Database connection is healthy"
        record_result "Database" "pass" "Connected"
    else
        log "WARNING" "Cannot verify database status"
        record_result "Database" "warn" "Status unknown"
    fi
}

check_frontend() {
    echo ""
    log "INFO" "Checking Frontend Services..."
    echo ""

    check_http_endpoint "Frontend" "$FRONTEND_URL"
    check_http_endpoint "Partner Portal" "$PARTNER_URL"
}

check_ai_services() {
    echo ""
    log "INFO" "Checking AI Services..."
    echo ""

    check_http_endpoint "AI Health" "$AI_URL/health"
    check_http_endpoint "AI API" "$AI_URL/api"
}

check_databases() {
    echo ""
    log "INFO" "Checking Databases..."
    echo ""

    # PostgreSQL
    if command -v psql &> /dev/null; then
        # Create temporary PGPASSFILE
        local PGPASSFILE_TMP
        PGPASSFILE_TMP=$(mktemp)
        chmod 600 "$PGPASSFILE_TMP"
        echo "*:*:*:*:${POSTGRES_PASSWORD:-}" > "$PGPASSFILE_TMP"
        if PGPASSWORD="" PGPASSFILE="$PGPASSFILE_TMP" psql -h "${POSTGRES_HOST:-localhost}" -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-kitchenxpert}" -c "SELECT 1" &> /dev/null; then
            log "SUCCESS" "PostgreSQL is accessible"
            record_result "PostgreSQL" "pass" "Connected"
        else
            log "ERROR" "PostgreSQL is not accessible"
            record_result "PostgreSQL" "fail" "Connection failed"
        fi
        rm -f "$PGPASSFILE_TMP"
    else
        log "WARNING" "psql not installed, skipping PostgreSQL check"
        record_result "PostgreSQL" "warn" "Client not installed"
    fi

    # MongoDB
    if command -v mongosh &> /dev/null; then
        if mongosh "${MONGODB_URI:-mongodb://localhost:27017}" --quiet --eval "db.runCommand({ ping: 1 })" &> /dev/null; then
            log "SUCCESS" "MongoDB is accessible"
            record_result "MongoDB" "pass" "Connected"
        else
            log "ERROR" "MongoDB is not accessible"
            record_result "MongoDB" "fail" "Connection failed"
        fi
    else
        log "WARNING" "mongosh not installed, skipping MongoDB check"
        record_result "MongoDB" "warn" "Client not installed"
    fi

    # Redis
    if command -v redis-cli &> /dev/null; then
        if redis-cli -h "${REDIS_HOST:-localhost}" -p "${REDIS_PORT:-6379}" ping &> /dev/null; then
            log "SUCCESS" "Redis is accessible"
            record_result "Redis" "pass" "Connected"
        else
            log "ERROR" "Redis is not accessible"
            record_result "Redis" "fail" "Connection failed"
        fi
    else
        log "WARNING" "redis-cli not installed, skipping Redis check"
        record_result "Redis" "warn" "Client not installed"
    fi
}

check_docker() {
    echo ""
    log "INFO" "Checking Docker Services..."
    echo ""

    if ! command -v docker &> /dev/null; then
        log "WARNING" "Docker not installed"
        record_result "Docker" "warn" "Not installed"
        return
    fi

    if ! docker info &> /dev/null; then
        log "ERROR" "Docker daemon is not running"
        record_result "Docker" "fail" "Daemon not running"
        return
    fi

    log "SUCCESS" "Docker daemon is running"
    record_result "Docker" "pass" "Running"

    # Check containers
    local running=$(docker ps --format "{{.Names}}" 2>/dev/null | grep -c "kitchenxpert" || echo "0")
    log "INFO" "KitchenXpert containers running: $running"

    if [ "$VERBOSE" = "true" ]; then
        docker ps --filter "name=kitchenxpert" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null
    fi
}

check_disk_space() {
    echo ""
    log "INFO" "Checking Disk Space..."
    echo ""

    local usage
    local threshold=90

    # Check project directory
    usage=$(df "$PROJECT_ROOT" 2>/dev/null | tail -1 | awk '{print $5}' | sed 's/%//')

    if [ -n "$usage" ]; then
        if [ "$usage" -lt 70 ]; then
            log "SUCCESS" "Disk usage: ${usage}%"
            record_result "Disk Space" "pass" "${usage}% used"
        elif [ "$usage" -lt $threshold ]; then
            log "WARNING" "Disk usage: ${usage}% (consider cleanup)"
            record_result "Disk Space" "warn" "${usage}% used"
        else
            log "ERROR" "Disk usage critical: ${usage}%"
            record_result "Disk Space" "fail" "${usage}% used"
        fi
    fi

    # Check specific directories
    if [ "$VERBOSE" = "true" ]; then
        echo ""
        echo "  Directory sizes:"
        du -sh "$PROJECT_ROOT/node_modules" 2>/dev/null | awk '{print "    node_modules: " $1}'
        du -sh "$PROJECT_ROOT/logs" 2>/dev/null | awk '{print "    logs:         " $1}'
        du -sh "$PROJECT_ROOT/.next" 2>/dev/null | awk '{print "    .next:        " $1}'
    fi
}

check_memory() {
    echo ""
    log "INFO" "Checking Memory..."
    echo ""

    if command -v free &> /dev/null; then
        local mem_info=$(free -m | grep Mem)
        local total=$(echo $mem_info | awk '{print $2}')
        local used=$(echo $mem_info | awk '{print $3}')
        local percentage=$((used * 100 / total))

        if [ $percentage -lt 70 ]; then
            log "SUCCESS" "Memory usage: ${percentage}% (${used}MB / ${total}MB)"
            record_result "Memory" "pass" "${percentage}%"
        elif [ $percentage -lt 90 ]; then
            log "WARNING" "Memory usage: ${percentage}%"
            record_result "Memory" "warn" "${percentage}%"
        else
            log "ERROR" "Memory usage critical: ${percentage}%"
            record_result "Memory" "fail" "${percentage}%"
        fi
    else
        # macOS
        if command -v vm_stat &> /dev/null; then
            local pages_free=$(vm_stat | grep "Pages free" | awk '{print $3}' | tr -d '.')
            local pages_active=$(vm_stat | grep "Pages active" | awk '{print $3}' | tr -d '.')
            local page_size=4096

            if [ -n "$pages_free" ] && [ -n "$pages_active" ]; then
                log "SUCCESS" "Memory appears healthy"
                record_result "Memory" "pass" "OK"
            fi
        fi
    fi
}

check_processes() {
    echo ""
    log "INFO" "Checking Node Processes..."
    echo ""

    local node_count=$(pgrep -c node 2>/dev/null || echo "0")

    if [ "$node_count" -gt 0 ]; then
        log "SUCCESS" "Node processes running: $node_count"
        record_result "Node Processes" "pass" "$node_count running"

        if [ "$VERBOSE" = "true" ]; then
            echo ""
            echo "  Active processes:"
            pgrep -la node 2>/dev/null | head -5 | while read line; do
                echo "    $line"
            done
        fi
    else
        log "WARNING" "No Node processes detected"
        record_result "Node Processes" "warn" "None running"
    fi
}

check_ssl_certificates() {
    echo ""
    log "INFO" "Checking SSL Certificates..."
    echo ""

    local certs_dir="$PROJECT_ROOT/certs"

    if [ ! -d "$certs_dir" ]; then
        log "WARNING" "Certificates directory not found"
        record_result "SSL Certs" "warn" "Not configured"
        return
    fi

    # Check certificate expiry
    local cert_file=$(find "$certs_dir" -name "*.crt" -o -name "*.pem" 2>/dev/null | head -1)

    if [ -n "$cert_file" ] && command -v openssl &> /dev/null; then
        local expiry=$(openssl x509 -enddate -noout -in "$cert_file" 2>/dev/null | cut -d= -f2)
        local expiry_epoch=$(date -d "$expiry" +%s 2>/dev/null || date -j -f "%b %d %H:%M:%S %Y %Z" "$expiry" +%s 2>/dev/null)
        local now_epoch=$(date +%s)
        local days_left=$(( (expiry_epoch - now_epoch) / 86400 ))

        if [ $days_left -gt 30 ]; then
            log "SUCCESS" "SSL certificate valid for $days_left days"
            record_result "SSL Certs" "pass" "$days_left days left"
        elif [ $days_left -gt 0 ]; then
            log "WARNING" "SSL certificate expires in $days_left days"
            record_result "SSL Certs" "warn" "$days_left days left"
        else
            log "ERROR" "SSL certificate has expired"
            record_result "SSL Certs" "fail" "Expired"
        fi
    else
        log "WARNING" "Cannot check SSL certificate"
        record_result "SSL Certs" "warn" "Cannot verify"
    fi
}

print_summary() {
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}                     Health Check Summary                         ${CYAN}║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    # Status counts
    local status_color=$GREEN
    if [ $FAILED_CHECKS -gt 0 ]; then
        status_color=$RED
    elif [ $WARNING_CHECKS -gt 0 ]; then
        status_color=$YELLOW
    fi

    echo -e "  Total checks:   $TOTAL_CHECKS"
    echo -e "  ${GREEN}Passed:${NC}        $PASSED_CHECKS"
    echo -e "  ${YELLOW}Warnings:${NC}      $WARNING_CHECKS"
    echo -e "  ${RED}Failed:${NC}        $FAILED_CHECKS"
    echo ""

    # Overall status
    if [ $FAILED_CHECKS -eq 0 ] && [ $WARNING_CHECKS -eq 0 ]; then
        echo -e "  ${GREEN}Overall Status: HEALTHY${NC}"
    elif [ $FAILED_CHECKS -eq 0 ]; then
        echo -e "  ${YELLOW}Overall Status: DEGRADED${NC}"
    else
        echo -e "  ${RED}Overall Status: UNHEALTHY${NC}"
    fi

    echo ""

    # Detailed results if verbose
    if [ "$VERBOSE" = "true" ]; then
        echo "  Detailed Results:"
        for component in "${!RESULTS[@]}"; do
            local result="${RESULTS[$component]}"
            local status=$(echo "$result" | cut -d'|' -f1)
            local details=$(echo "$result" | cut -d'|' -f2)

            case $status in
                "pass") echo -e "    ${GREEN}✓${NC} $component: $details" ;;
                "warn") echo -e "    ${YELLOW}⚠${NC} $component: $details" ;;
                "fail") echo -e "    ${RED}✗${NC} $component: $details" ;;
            esac
        done
        echo ""
    fi
}

print_json_output() {
    local overall_status="healthy"
    if [ $FAILED_CHECKS -gt 0 ]; then
        overall_status="unhealthy"
    elif [ $WARNING_CHECKS -gt 0 ]; then
        overall_status="degraded"
    fi

    local checks_json=""
    local first=true
    for component in "${!RESULTS[@]}"; do
        local result="${RESULTS[$component]}"
        local status=$(echo "$result" | cut -d'|' -f1)
        local details=$(echo "$result" | cut -d'|' -f2)

        if [ "$first" = "true" ]; then
            first=false
        else
            checks_json+=","
        fi
        checks_json+="{\"component\":\"$component\",\"status\":\"$status\",\"details\":\"$details\"}"
    done

    cat <<ENDJSON
{
  "timestamp": "$(date -Iseconds)",
  "overallStatus": "$overall_status",
  "summary": {
    "total": $TOTAL_CHECKS,
    "passed": $PASSED_CHECKS,
    "warnings": $WARNING_CHECKS,
    "failed": $FAILED_CHECKS
  },
  "checks": [$checks_json]
}
ENDJSON
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --backend-url)
            BACKEND_URL="$2"
            shift 2
            ;;
        --frontend-url)
            FRONTEND_URL="$2"
            shift 2
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --verbose|-v)
            VERBOSE="true"
            shift
            ;;
        --quick)
            QUICK_CHECK="true"
            shift
            ;;
        --json)
            JSON_OUTPUT="true"
            shift
            ;;
        --help)
            echo "Usage: health-check.sh [options]"
            echo ""
            echo "Options:"
            echo "  --backend-url <url>   Backend URL (default: http://localhost:3001)"
            echo "  --frontend-url <url>  Frontend URL (default: http://localhost:3000)"
            echo "  --timeout <seconds>   Request timeout (default: 5)"
            echo "  -v, --verbose         Show detailed output"
            echo "  --quick               Quick check (skip some checks)"
            echo "  --json                Output results as JSON"
            echo "  --help                Show this help message"
            exit 0
            ;;
        *)
            log "ERROR" "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Main execution
if [ "$JSON_OUTPUT" != "true" ]; then
    print_header
fi

check_backend
check_frontend

if [ "$QUICK_CHECK" != "true" ]; then
    check_ai_services
    check_databases
    check_docker
    check_disk_space
    check_memory
    check_processes
    check_ssl_certificates
fi

if [ "$JSON_OUTPUT" = "true" ]; then
    print_json_output
else
    print_summary
fi

# Exit with appropriate code
if [ $FAILED_CHECKS -gt 0 ]; then
    exit 1
elif [ $WARNING_CHECKS -gt 0 ]; then
    exit 2
else
    exit 0
fi
