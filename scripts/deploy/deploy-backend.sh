#!/bin/bash
#
# Deploy Backend - KitchenXpert
#
# Deploys the NestJS backend API to the target environment.
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
ENVIRONMENT="${ENVIRONMENT:-staging}"
BACKEND_DIR="$PROJECT_ROOT/packages/backend"
DEPLOY_METHOD="${DEPLOY_METHOD:-docker}"

# Logging
log() {
    local level=$1
    local message=$2
    case $level in
        "INFO")    echo -e "${BLUE}[BACKEND]${NC} $message" ;;
        "SUCCESS") echo -e "${GREEN}[BACKEND]${NC} $message" ;;
        "WARNING") echo -e "${YELLOW}[BACKEND]${NC} $message" ;;
        "ERROR")   echo -e "${RED}[BACKEND]${NC} $message" ;;
    esac
}

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}            KitchenXpert - Backend Deployment                ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

check_backend() {
    log "INFO" "Checking backend directory..."

    if [ ! -d "$BACKEND_DIR" ]; then
        log "ERROR" "Backend directory not found: $BACKEND_DIR"
        exit 1
    fi

    if [ ! -f "$BACKEND_DIR/package.json" ]; then
        log "ERROR" "package.json not found in backend directory"
        exit 1
    fi

    log "SUCCESS" "Backend directory verified"
}

build_backend() {
    log "INFO" "Building backend..."

    cd "$BACKEND_DIR"

    # Install dependencies
    pnpm install --frozen-lockfile

    # Generate Prisma client
    if [ -f "prisma/schema.prisma" ]; then
        log "INFO" "Generating Prisma client..."
        pnpm prisma generate
    fi

    # Build
    NODE_ENV=production pnpm build

    log "SUCCESS" "Backend built successfully"
}

deploy_docker() {
    log "INFO" "Deploying with Docker..."

    cd "$PROJECT_ROOT"

    local image_name="kitchenxpert-backend"
    local image_tag="${ENVIRONMENT}-$(date +%Y%m%d%H%M%S)"

    # Build Docker image
    log "INFO" "Building Docker image: $image_name:$image_tag"

    docker build \
        -f "$PROJECT_ROOT/config/docker/Dockerfile.backend" \
        -t "$image_name:$image_tag" \
        -t "$image_name:$ENVIRONMENT-latest" \
        --build-arg NODE_ENV=production \
        --build-arg ENVIRONMENT="$ENVIRONMENT" \
        "$PROJECT_ROOT"

    # Push to registry if configured
    if [ -n "$DOCKER_REGISTRY" ]; then
        log "INFO" "Pushing to registry: $DOCKER_REGISTRY"

        docker tag "$image_name:$image_tag" "$DOCKER_REGISTRY/$image_name:$image_tag"
        docker tag "$image_name:$image_tag" "$DOCKER_REGISTRY/$image_name:$ENVIRONMENT-latest"

        docker push "$DOCKER_REGISTRY/$image_name:$image_tag"
        docker push "$DOCKER_REGISTRY/$image_name:$ENVIRONMENT-latest"
    fi

    # Deploy container
    log "INFO" "Deploying container..."

    # Stop existing container
    docker stop kitchenxpert-backend-$ENVIRONMENT 2>/dev/null || true
    docker rm kitchenxpert-backend-$ENVIRONMENT 2>/dev/null || true

    # Run new container
    docker run -d \
        --name kitchenxpert-backend-$ENVIRONMENT \
        --env-file "$PROJECT_ROOT/.env.$ENVIRONMENT" \
        -p "${BACKEND_PORT:-3001}:3001" \
        --restart unless-stopped \
        "$image_name:$image_tag"

    log "SUCCESS" "Docker deployment completed"
}

deploy_kubernetes() {
    log "INFO" "Deploying to Kubernetes..."

    cd "$PROJECT_ROOT"

    local k8s_dir="$PROJECT_ROOT/k8s"
    local namespace="kitchenxpert-$ENVIRONMENT"

    if [ ! -d "$k8s_dir" ]; then
        log "ERROR" "Kubernetes manifests not found: $k8s_dir"
        exit 1
    fi

    # Apply ConfigMaps and Secrets
    if [ -f "$k8s_dir/backend/configmap-$ENVIRONMENT.yaml" ]; then
        kubectl apply -f "$k8s_dir/backend/configmap-$ENVIRONMENT.yaml" -n "$namespace"
    fi

    # Apply Deployment
    kubectl apply -f "$k8s_dir/backend/deployment.yaml" -n "$namespace"

    # Apply Service
    kubectl apply -f "$k8s_dir/backend/service.yaml" -n "$namespace"

    # Wait for rollout
    log "INFO" "Waiting for rollout to complete..."
    kubectl rollout status deployment/kitchenxpert-backend -n "$namespace" --timeout=300s

    log "SUCCESS" "Kubernetes deployment completed"
}

deploy_pm2() {
    log "INFO" "Deploying with PM2..."

    cd "$BACKEND_DIR"

    local pm2_config="ecosystem.config.js"

    if [ ! -f "$pm2_config" ]; then
        # Create PM2 config
        cat > "$pm2_config" << EOF
module.exports = {
  apps: [{
    name: 'kitchenxpert-backend-$ENVIRONMENT',
    script: 'dist/main.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: ${BACKEND_PORT:-3001}
    },
    env_file: '../.env.$ENVIRONMENT'
  }]
};
EOF
    fi

    # Deploy with PM2
    pm2 startOrRestart "$pm2_config" --env $ENVIRONMENT

    # Save PM2 process list
    pm2 save

    log "SUCCESS" "PM2 deployment completed"
}

deploy_vercel() {
    log "INFO" "Deploying to Vercel..."

    cd "$BACKEND_DIR"

    if ! command -v vercel &> /dev/null; then
        log "ERROR" "Vercel CLI not installed"
        exit 1
    fi

    local prod_flag=""
    [ "$ENVIRONMENT" = "production" ] && prod_flag="--prod"

    vercel deploy $prod_flag --yes

    log "SUCCESS" "Vercel deployment completed"
}

run_migrations() {
    log "INFO" "Running database migrations..."

    cd "$BACKEND_DIR"

    if [ -f "prisma/schema.prisma" ]; then
        pnpm prisma migrate deploy
        log "SUCCESS" "Migrations completed"
    else
        log "INFO" "No Prisma schema found, skipping migrations"
    fi
}

health_check() {
    log "INFO" "Running health check..."

    local url="${BACKEND_URL:-http://localhost:${BACKEND_PORT:-3001}}"
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -sf "$url/health" > /dev/null 2>&1; then
            log "SUCCESS" "Health check passed"
            return 0
        fi

        log "INFO" "Waiting for backend to start (attempt $attempt/$max_attempts)..."
        sleep 2
        ((attempt++))
    done

    log "ERROR" "Health check failed after $max_attempts attempts"
    return 1
}

print_summary() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}          Backend Deployment Completed Successfully          ${GREEN}║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "  Environment:  $ENVIRONMENT"
    echo "  Method:       $DEPLOY_METHOD"
    echo "  URL:          ${BACKEND_URL:-http://localhost:${BACKEND_PORT:-3001}}"
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
        --skip-migrations)
            SKIP_MIGRATIONS="true"
            shift
            ;;
        --help)
            echo "Usage: deploy-backend.sh [options]"
            echo ""
            echo "Options:"
            echo "  -e, --environment <env>  Target environment"
            echo "  --method <method>        Deployment method: docker, k8s, pm2, vercel"
            echo "  --skip-build             Skip build step"
            echo "  --skip-migrations        Skip database migrations"
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
check_backend

if [ "$SKIP_BUILD" != "true" ]; then
    build_backend
fi

# Deploy based on method
case $DEPLOY_METHOD in
    docker)
        deploy_docker
        ;;
    k8s|kubernetes)
        deploy_kubernetes
        ;;
    pm2)
        deploy_pm2
        ;;
    vercel)
        deploy_vercel
        ;;
    *)
        log "ERROR" "Unknown deployment method: $DEPLOY_METHOD"
        exit 1
        ;;
esac

# Post-deploy tasks
if [ "$SKIP_MIGRATIONS" != "true" ]; then
    run_migrations
fi

health_check

print_summary
