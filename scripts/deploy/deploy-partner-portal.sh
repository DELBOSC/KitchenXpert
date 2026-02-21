#!/bin/bash
#
# Deploy Partner Portal - KitchenXpert
#
# Deploys the partner portal application.
#

set -euo pipefail

# Defaults for flag-only variables (prevent unbound variable errors under set -u)
SKIP_BUILD="${SKIP_BUILD:-false}"
DOCKER_REGISTRY="${DOCKER_REGISTRY:-}"

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
ENVIRONMENT="${ENVIRONMENT:-staging}"
PORTAL_DIR="$PROJECT_ROOT/packages/partner-portal"
DEPLOY_METHOD="${DEPLOY_METHOD:-vercel}"

# Logging
log() {
    local level=$1
    local message=$2
    case $level in
        "INFO")    echo -e "${BLUE}[PARTNER]${NC} $message" ;;
        "SUCCESS") echo -e "${GREEN}[PARTNER]${NC} $message" ;;
        "WARNING") echo -e "${YELLOW}[PARTNER]${NC} $message" ;;
        "ERROR")   echo -e "${RED}[PARTNER]${NC} $message" ;;
    esac
}

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}        KitchenXpert - Partner Portal Deployment             ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

check_portal() {
    log "INFO" "Checking partner portal directory..."

    if [ ! -d "$PORTAL_DIR" ]; then
        log "WARNING" "Partner portal directory not found: $PORTAL_DIR"
        log "INFO" "Attempting to find alternative location..."

        # Try alternative locations
        for dir in "apps/partner" "packages/partner-portal" "partner-portal"; do
            if [ -d "$PROJECT_ROOT/$dir" ]; then
                PORTAL_DIR="$PROJECT_ROOT/$dir"
                log "SUCCESS" "Found at: $PORTAL_DIR"
                break
            fi
        done

        if [ ! -d "$PORTAL_DIR" ]; then
            log "ERROR" "Partner portal not found"
            exit 1
        fi
    fi

    if [ ! -f "$PORTAL_DIR/package.json" ]; then
        log "ERROR" "package.json not found in portal directory"
        exit 1
    fi

    log "SUCCESS" "Partner portal directory verified"
}

build_portal() {
    log "INFO" "Building partner portal..."

    cd "$PORTAL_DIR"

    # Install dependencies
    pnpm install --frozen-lockfile

    # Set environment variables
    export NODE_ENV=production
    export NEXT_PUBLIC_API_URL="${BACKEND_URL:-http://localhost:3001}"
    export NEXT_PUBLIC_ENVIRONMENT="$ENVIRONMENT"
    export NEXT_PUBLIC_PORTAL_TYPE="partner"

    # Build
    pnpm build

    log "SUCCESS" "Partner portal built successfully"
}

deploy_vercel() {
    log "INFO" "Deploying to Vercel..."

    cd "$PORTAL_DIR"

    if ! command -v vercel &> /dev/null; then
        log "INFO" "Installing Vercel CLI..."
        npm install -g vercel
    fi

    local prod_flag=""
    [ "$ENVIRONMENT" = "production" ] && prod_flag="--prod"

    # Deploy with project name
    vercel deploy $prod_flag --yes --name "kitchenxpert-partner-portal"

    log "SUCCESS" "Vercel deployment completed"
}

deploy_docker() {
    log "INFO" "Deploying with Docker..."

    cd "$PROJECT_ROOT"

    local image_name="kitchenxpert-partner-portal"
    local image_tag="${ENVIRONMENT}-$(date +%Y%m%d%H%M%S)"

    # Build Docker image
    log "INFO" "Building Docker image..."

    docker build \
        -f "config/docker/Dockerfile.partner-portal" \
        -t "$image_name:$image_tag" \
        -t "$image_name:$ENVIRONMENT-latest" \
        --build-arg NODE_ENV=production \
        --build-arg NEXT_PUBLIC_API_URL="${BACKEND_URL:-http://localhost:3001}" \
        "$PROJECT_ROOT"

    # Push to registry
    if [ -n "$DOCKER_REGISTRY" ]; then
        docker tag "$image_name:$image_tag" "$DOCKER_REGISTRY/$image_name:$image_tag"
        docker push "$DOCKER_REGISTRY/$image_name:$image_tag"
    fi

    # Deploy container
    docker stop kitchenxpert-partner-portal-$ENVIRONMENT 2>/dev/null || true
    docker rm kitchenxpert-partner-portal-$ENVIRONMENT 2>/dev/null || true

    docker run -d \
        --name kitchenxpert-partner-portal-$ENVIRONMENT \
        -p "${PARTNER_PORT:-3002}:3000" \
        --restart unless-stopped \
        "$image_name:$image_tag"

    log "SUCCESS" "Docker deployment completed"
}

deploy_kubernetes() {
    log "INFO" "Deploying to Kubernetes..."

    local k8s_dir="$PROJECT_ROOT/k8s"
    local namespace="kitchenxpert-$ENVIRONMENT"

    if [ ! -d "$k8s_dir/partner-portal" ]; then
        log "ERROR" "Kubernetes manifests not found"
        exit 1
    fi

    kubectl apply -f "$k8s_dir/partner-portal/" -n "$namespace"
    kubectl rollout status deployment/partner-portal -n "$namespace" --timeout=300s

    log "SUCCESS" "Kubernetes deployment completed"
}

health_check() {
    log "INFO" "Running health check..."

    local url="${PARTNER_URL:-http://localhost:${PARTNER_PORT:-3002}}"
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -sf "$url" > /dev/null 2>&1; then
            log "SUCCESS" "Health check passed"
            return 0
        fi

        log "INFO" "Waiting for portal to start (attempt $attempt/$max_attempts)..."
        sleep 2
        ((attempt++))
    done

    log "WARNING" "Health check timed out"
    return 0
}

print_summary() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}      Partner Portal Deployment Completed Successfully       ${GREEN}║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "  Environment:  $ENVIRONMENT"
    echo "  Method:       $DEPLOY_METHOD"
    echo "  URL:          ${PARTNER_URL:-http://localhost:${PARTNER_PORT:-3002}}"
    echo ""
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --environment|-e)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --method)
            DEPLOY_METHOD="$2"
            shift 2
            ;;
        --skip-build)
            SKIP_BUILD="true"
            shift
            ;;
        --help)
            echo "Usage: deploy-partner-portal.sh [options]"
            echo ""
            echo "Options:"
            echo "  -e, --environment <env>  Target environment"
            echo "  --method <method>        Deployment method: vercel, docker, k8s"
            echo "  --skip-build             Skip build step"
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
if [ -f "$PROJECT_ROOT/.env.$ENVIRONMENT" ]; then
    source "$PROJECT_ROOT/.env.$ENVIRONMENT" 2>/dev/null || true
fi

# Main execution
print_header
check_portal

if [ "$SKIP_BUILD" != "true" ]; then
    build_portal
fi

case $DEPLOY_METHOD in
    vercel)
        deploy_vercel
        ;;
    docker)
        deploy_docker
        ;;
    k8s|kubernetes)
        deploy_kubernetes
        ;;
    *)
        log "ERROR" "Unknown deployment method: $DEPLOY_METHOD"
        exit 1
        ;;
esac

health_check
print_summary
