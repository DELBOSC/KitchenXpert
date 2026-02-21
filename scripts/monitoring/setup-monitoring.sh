#!/bin/bash
#
# Setup Monitoring - KitchenXpert
#
# Sets up monitoring infrastructure including Prometheus, Grafana, and alerting.
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
MONITORING_DIR="${MONITORING_DIR:-$PROJECT_ROOT/monitoring}"
USE_DOCKER="${USE_DOCKER:-true}"
PROMETHEUS_PORT="${PROMETHEUS_PORT:-9090}"
GRAFANA_PORT="${GRAFANA_PORT:-3000}"
ALERTMANAGER_PORT="${ALERTMANAGER_PORT:-9093}"

# Logging
log() {
    local level=$1
    local message=$2
    case $level in
        "INFO")    echo -e "${BLUE}[MONITOR]${NC} $message" ;;
        "SUCCESS") echo -e "${GREEN}[MONITOR]${NC} $message" ;;
        "WARNING") echo -e "${YELLOW}[MONITOR]${NC} $message" ;;
        "ERROR")   echo -e "${RED}[MONITOR]${NC} $message" ;;
        "STEP")    echo -e "${CYAN}[STEP]${NC} $message" ;;
    esac
}

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}        KitchenXpert - Monitoring Setup                      ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

check_prerequisites() {
    log "STEP" "Checking prerequisites..."

    if [ "$USE_DOCKER" = "true" ]; then
        if ! command -v docker &> /dev/null; then
            log "ERROR" "Docker is not installed"
            exit 1
        fi

        if ! docker compose version &> /dev/null && ! docker-compose version &> /dev/null; then
            log "ERROR" "Docker Compose is not installed"
            exit 1
        fi
    fi

    log "SUCCESS" "Prerequisites check passed"
}

create_directories() {
    log "STEP" "Creating monitoring directories..."

    mkdir -p "$MONITORING_DIR"/{prometheus,grafana,alertmanager}
    mkdir -p "$MONITORING_DIR/grafana"/{dashboards,provisioning/dashboards,provisioning/datasources}
    mkdir -p "$MONITORING_DIR/prometheus/rules"

    log "SUCCESS" "Directories created"
}

create_prometheus_config() {
    log "STEP" "Creating Prometheus configuration..."

    cat > "$MONITORING_DIR/prometheus/prometheus.yml" << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    monitor: 'kitchenxpert'

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

rule_files:
  - /etc/prometheus/rules/*.yml

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'backend'
    static_configs:
      - targets: ['backend:3001']
    metrics_path: /metrics

  - job_name: 'frontend'
    static_configs:
      - targets: ['frontend:3000']
    metrics_path: /api/metrics
EOF

    log "SUCCESS" "Prometheus configuration created"
}

create_alert_rules() {
    log "STEP" "Creating alert rules..."

    cat > "$MONITORING_DIR/prometheus/rules/alerts.yml" << 'EOF'
groups:
  - name: kitchenxpert-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"

      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service is down"

      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
EOF

    log "SUCCESS" "Alert rules created"
}

create_docker_compose() {
    log "STEP" "Creating Docker Compose configuration..."

    cat > "$MONITORING_DIR/docker-compose.yml" << EOF
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:v2.51.0
    container_name: kitchenxpert_prometheus
    ports:
      - "${PROMETHEUS_PORT}:9090"
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./prometheus/rules:/etc/prometheus/rules
      - prometheus_data:/prometheus
    restart: unless-stopped
    networks:
      - monitoring

  grafana:
    image: grafana/grafana:10.4.0
    container_name: kitchenxpert_grafana
    ports:
      - "${GRAFANA_PORT}:3000"
    volumes:
      - ./grafana/provisioning:/etc/grafana/provisioning
      - ./grafana/dashboards:/var/lib/grafana/dashboards
      - grafana_data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=\${GRAFANA_PASSWORD:-admin}
    restart: unless-stopped
    networks:
      - monitoring

  alertmanager:
    image: prom/alertmanager:v0.27.0
    container_name: kitchenxpert_alertmanager
    ports:
      - "${ALERTMANAGER_PORT}:9093"
    volumes:
      - ./alertmanager/alertmanager.yml:/etc/alertmanager/alertmanager.yml
    restart: unless-stopped
    networks:
      - monitoring

  node-exporter:
    image: prom/node-exporter:v1.7.0
    container_name: kitchenxpert_node_exporter
    ports:
      - "9100:9100"
    restart: unless-stopped
    networks:
      - monitoring

volumes:
  prometheus_data:
  grafana_data:

networks:
  monitoring:
    driver: bridge
EOF

    log "SUCCESS" "Docker Compose configuration created"
}

start_monitoring_stack() {
    log "STEP" "Starting monitoring stack..."

    cd "$MONITORING_DIR"

    if docker compose version &> /dev/null; then
        docker compose up -d
    else
        docker-compose up -d
    fi

    log "SUCCESS" "Monitoring stack started"
}

print_summary() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}        Monitoring Setup Complete                           ${GREEN}║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "  Services:"
    echo "    Prometheus:    http://localhost:$PROMETHEUS_PORT"
    echo "    Grafana:       http://localhost:$GRAFANA_PORT"
    echo "    Alertmanager:  http://localhost:$ALERTMANAGER_PORT"
    echo ""
    echo "  Default credentials:"
    echo "    Grafana: admin / admin"
    echo ""
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --no-docker)
            USE_DOCKER="false"
            shift
            ;;
        --prometheus-port)
            PROMETHEUS_PORT="$2"
            shift 2
            ;;
        --grafana-port)
            GRAFANA_PORT="$2"
            shift 2
            ;;
        --help)
            echo "Usage: setup-monitoring.sh [options]"
            echo ""
            echo "Options:"
            echo "  --no-docker           Don't use Docker"
            echo "  --prometheus-port <p> Prometheus port (default: 9090)"
            echo "  --grafana-port <p>    Grafana port (default: 3000)"
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
check_prerequisites
create_directories
create_prometheus_config
create_alert_rules
create_docker_compose

if [ "$USE_DOCKER" = "true" ]; then
    start_monitoring_stack
fi

print_summary
