#!/bin/bash
#
# Alert Test - KitchenXpert
#
# Tests alerting system by triggering test alerts.
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
ALERTMANAGER_URL="${ALERTMANAGER_URL:-http://localhost:9093}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
DRY_RUN="${DRY_RUN:-false}"

# Logging
log() {
    local level=$1
    local message=$2
    case $level in
        "INFO")    echo -e "${BLUE}[ALERT-TEST]${NC} $message" ;;
        "SUCCESS") echo -e "${GREEN}[ALERT-TEST]${NC} $message" ;;
        "WARNING") echo -e "${YELLOW}[ALERT-TEST]${NC} $message" ;;
        "ERROR")   echo -e "${RED}[ALERT-TEST]${NC} $message" ;;
        "STEP")    echo -e "${CYAN}[STEP]${NC} $message" ;;
    esac
}

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}          KitchenXpert - Alert Testing                       ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

check_alertmanager() {
    log "STEP" "Checking Alertmanager connectivity..."

    local response=$(curl -s -o /dev/null -w "%{http_code}" "$ALERTMANAGER_URL/-/healthy" 2>/dev/null || echo "000")

    if [ "$response" = "200" ]; then
        log "SUCCESS" "Alertmanager is reachable"
        return 0
    else
        log "WARNING" "Alertmanager is not reachable (HTTP $response)"
        return 1
    fi
}

send_test_alert() {
    local severity=$1
    local alert_name=$2
    local description=$3

    log "INFO" "Sending test alert: $alert_name ($severity)"

    if [ "$DRY_RUN" = "true" ]; then
        log "INFO" "[DRY RUN] Would send alert to Alertmanager"
        return 0
    fi

    local alert_json='[{"labels":{"alertname":"'"$alert_name"'","severity":"'"$severity"'","service":"kitchenxpert"},"annotations":{"summary":"Test Alert","description":"'"$description"'"}}]'

    local response=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -d "$alert_json" \
        "$ALERTMANAGER_URL/api/v1/alerts" 2>/dev/null || echo "000")

    if [ "$response" = "200" ]; then
        log "SUCCESS" "Alert sent successfully"
        return 0
    else
        log "ERROR" "Failed to send alert (HTTP $response)"
        return 1
    fi
}

test_slack_webhook() {
    log "STEP" "Testing Slack webhook..."

    if [ -z "$SLACK_WEBHOOK" ]; then
        log "WARNING" "No Slack webhook configured"
        return 0
    fi

    if [ "$DRY_RUN" = "true" ]; then
        log "INFO" "[DRY RUN] Would send test message to Slack"
        return 0
    fi

    local message='{"text":"🧪 KitchenXpert Alert Test - This is a test notification"}'

    local response=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -d "$message" \
        "$SLACK_WEBHOOK" 2>/dev/null || echo "000")

    if [ "$response" = "200" ]; then
        log "SUCCESS" "Slack test message sent"
        return 0
    else
        log "ERROR" "Failed to send Slack message (HTTP $response)"
        return 1
    fi
}

test_critical_alert() {
    log "STEP" "Testing CRITICAL severity alert..."
    send_test_alert "critical" "TestCriticalAlert" "This is a test critical alert"
}

test_warning_alert() {
    log "STEP" "Testing WARNING severity alert..."
    send_test_alert "warning" "TestWarningAlert" "This is a test warning alert"
}

list_active_alerts() {
    log "STEP" "Listing active alerts..."

    local alerts=$(curl -s "$ALERTMANAGER_URL/api/v1/alerts" 2>/dev/null)

    if [ -n "$alerts" ]; then
        local alert_count=$(echo "$alerts" | grep -o '"alertname"' | wc -l)
        log "INFO" "Active alerts: $alert_count"
    else
        log "WARNING" "Could not retrieve active alerts"
    fi
}

print_summary() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}        Alert Testing Complete                              ${GREEN}║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "  Alertmanager: $ALERTMANAGER_URL"
    echo ""
    if [ "$DRY_RUN" = "true" ]; then
        echo "  ${YELLOW}DRY RUN - No actual alerts were sent${NC}"
        echo ""
    fi
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --alertmanager)
            ALERTMANAGER_URL="$2"
            shift 2
            ;;
        --slack)
            SLACK_WEBHOOK="$2"
            shift 2
            ;;
        --dry-run|-d)
            DRY_RUN="true"
            shift
            ;;
        --list|-l)
            LIST_ONLY="true"
            shift
            ;;
        --help)
            echo "Usage: alert-test.sh [options]"
            echo ""
            echo "Options:"
            echo "  --alertmanager <url>  Alertmanager URL"
            echo "  --slack <webhook>     Slack webhook URL"
            echo "  -d, --dry-run         Show what would be done"
            echo "  -l, --list            List active alerts"
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
print_header

if [ "$LIST_ONLY" = "true" ]; then
    check_alertmanager && list_active_alerts
    exit 0
fi

check_alertmanager
test_critical_alert
test_warning_alert
test_slack_webhook
list_active_alerts

print_summary
