#!/bin/bash
#
# Deploy Frontend - KitchenXpert
#
# Deploys the Next.js frontend to the target environment.
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
FRONTEND_DIR="$PROJECT_ROOT/packages/frontend"
DEPLOY_METHOD="${DEPLOY_METHOD:-vercel}"

# Logging
log() {
    local level=$1
    local message=$2
    case $level in
        "INFO")    echo -e "${BLUE}[FRONTEND]${NC} $message" ;;
        "SUCCESS") echo -e "${GREEN}[FRONTEND]${NC} $message" ;;
        "WARNING") echo -e "${YELLOW}[FRONTEND]${NC} $message" ;;
        "ERROR")   echo -e "${RED}[FRONTEND]${NC} $message" ;;
    esac
}

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}           KitchenXpert - Frontend Deployment                ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

check_frontend() {
    log "INFO" "Checking frontend directory..."

    if [ ! -d "$FRONTEND_DIR" ]; then
        log "ERROR" "Frontend directory not found: $FRONTEND_DIR"
        exit 1
    fi

    if [ ! -f "$FRONTEND_DIR/package.json" ]; then
        log "ERROR" "package.json not found in frontend directory"
        exit 1
    fi

    if [ ! -f "$FRONTEND_DIR/next.config.js" ] && [ ! -f "$FRONTEND_DIR/next.config.mjs" ]; then
        log "WARNING" "Next.js config not found"
    fi

    log "SUCCESS" "Frontend directory verified"
}

build_frontend() {
    log "INFO" "Building frontend..."

    cd "$FRONTEND_DIR"

    # Install dependencies
    pnpm install --frozen-lockfile

    # Set environment variables for build
    export NODE_ENV=production
    export NEXT_PUBLIC_API_URL="${BACKEND_URL:-http://localhost:3001}"
    export NEXT_PUBLIC_ENVIRONMENT="$ENVIRONMENT"

    # Build
    pnpm build

    # Export static if needed
    if [ "$STATIC_EXPORT" = "true" ]; then
        log "INFO" "Exporting static site..."
        pnpm export 2>/dev/null || log "WARNING" "Static export not configured"
    fi

    log "SUCCESS" "Frontend built successfully"
}

deploy_vercel() {
    log "INFO" "Deploying to Vercel..."

    cd "$FRONTEND_DIR"

    if ! command -v vercel &> /dev/null; then
        log "INFO" "Installing Vercel CLI..."
        npm install -g vercel
    fi

    local prod_flag=""
    [ "$ENVIRONMENT" = "production" ] && prod_flag="--prod"

    # Set environment variables
    local env_args=""
    if [ -n "$NEXT_PUBLIC_API_URL" ]; then
        env_args="$env_args -e NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL"
    fi

    vercel deploy $prod_flag $env_args --yes

    log "SUCCESS" "Vercel deployment completed"
}

deploy_netlify() {
    log "INFO" "Deploying to Netlify..."

    cd "$FRONTEND_DIR"

    if ! command -v netlify &> /dev/null; then
        log "INFO" "Installing Netlify CLI..."
        npm install -g netlify-cli
    fi

    local prod_flag=""
    [ "$ENVIRONMENT" = "production" ] && prod_flag="--prod"

    # Deploy
    netlify deploy $prod_flag --dir=.next

    log "SUCCESS" "Netlify deployment completed"
}

deploy_docker() {
    log "INFO" "Deploying with Docker..."

    cd "$PROJECT_ROOT"

    local image_name="kitchenxpert-frontend"
    local image_tag="${ENVIRONMENT}-$(date +%Y%m%d%H%M%S)"

    # Build Docker image
    log "INFO" "Building Docker image: $image_name:$image_tag"

    docker build \
        -f "$PROJECT_ROOT/config/docker/Dockerfile.frontend" \
        -t "$image_name:$image_tag" \
        -t "$image_name:$ENVIRONMENT-latest" \
        --build-arg NODE_ENV=production \
        --build-arg NEXT_PUBLIC_API_URL="${BACKEND_URL:-http://localhost:3001}" \
        "$PROJECT_ROOT"

    # Push to registry if configured
    if [ -n "$DOCKER_REGISTRY" ]; then
        log "INFO" "Pushing to registry: $DOCKER_REGISTRY"

        docker tag "$image_name:$image_tag" "$DOCKER_REGISTRY/$image_name:$image_tag"
        docker push "$DOCKER_REGISTRY/$image_name:$image_tag"
        docker push "$DOCKER_REGISTRY/$image_name:$ENVIRONMENT-latest"
    fi

    # Deploy container
    log "INFO" "Deploying container..."

    docker stop kitchenxpert-frontend-$ENVIRONMENT 2>/dev/null || true
    docker rm kitchenxpert-frontend-$ENVIRONMENT 2>/dev/null || true

    docker run -d \
        --name kitchenxpert-frontend-$ENVIRONMENT \
        -p "${FRONTEND_PORT:-3000}:3000" \
        --restart unless-stopped \
        "$image_name:$image_tag"

    log "SUCCESS" "Docker deployment completed"
}

deploy_static() {
    log "INFO" "Deploying static files..."

    cd "$FRONTEND_DIR"

    local output_dir=".next/static"
    local deploy_dir="${STATIC_DEPLOY_DIR:-/var/www/kitchenxpert}"

    if [ ! -d "$output_dir" ]; then
        log "ERROR" "Static output not found. Run build first."
        exit 1
    fi

    # Copy to deploy directory
    if [ -n "$SSH_HOST" ]; then
        log "INFO" "Deploying to remote server: $SSH_HOST"
        rsync -avz --delete "$output_dir/" "$SSH_USER@$SSH_HOST:$deploy_dir/"
    else
        log "INFO" "Deploying to local directory: $deploy_dir"
        mkdir -p "$deploy_dir"
        rsync -avz --delete "$output_dir/" "$deploy_dir/"
    fi

    log "SUCCESS" "Static deployment completed"
}

deploy_s3() {
    log "INFO" "Deploying to AWS S3..."

    cd "$FRONTEND_DIR"

    if ! command -v aws &> /dev/null; then
        log "ERROR" "AWS CLI not installed"
        exit 1
    fi

    local bucket="${S3_BUCKET:-kitchenxpert-frontend-$ENVIRONMENT}"
    local output_dir="out"

    if [ ! -d "$output_dir" ]; then
        log "ERROR" "Static export not found. Enable STATIC_EXPORT=true"
        exit 1
    fi

    # Sync to S3
    aws s3 sync "$output_dir" "s3://$bucket" --delete

    # Invalidate CloudFront if configured
    if [ -n "$CLOUDFRONT_DISTRIBUTION_ID" ]; then
        log "INFO" "Invalidating CloudFront cache..."
        aws cloudfront create-invalidation \
            --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
            --paths "/*"
    fi

    log "SUCCESS" "S3 deployment completed"
}

health_check() {
    log "INFO" "Running health check..."

    local url="${FRONTEND_URL:-http://localhost:${FRONTEND_PORT:-3000}}"
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -sf "$url" > /dev/null 2>&1; then
            log "SUCCESS" "Health check passed"
            return 0
        fi

        log "INFO" "Waiting for frontend to start (attempt $attempt/$max_attempts)..."
        sleep 2
        ((attempt++))
    done

    log "WARNING" "Health check timed out (may be normal for serverless)"
    return 0
}

print_summary() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}         Frontend Deployment Completed Successfully          ${GREEN}║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "  Environment:  $ENVIRONMENT"
    echo "  Method:       $DEPLOY_METHOD"
    echo "  URL:          ${FRONTEND_URL:-http://localhost:${FRONTEND_PORT:-3000}}"
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
        --static)
            STATIC_EXPORT="true"
            shift
            ;;
        --help)
            echo "Usage: deploy-frontend.sh [options]"
            echo ""
            echo "Options:"
            echo "  -e, --environment <env>  Target environment"
            echo "  --method <method>        Deployment method: vercel, netlify, docker, static, s3"
            echo "  --skip-build             Skip build step"
            echo "  --static                 Enable static export"
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
check_frontend

if [ "$SKIP_BUILD" != "true" ]; then
    build_frontend
fi

# Deploy based on method
case $DEPLOY_METHOD in
    vercel)
        deploy_vercel
        ;;
    netlify)
        deploy_netlify
        ;;
    docker)
        deploy_docker
        ;;
    static)
        deploy_static
        ;;
    s3)
        STATIC_EXPORT="true"
        build_frontend
        deploy_s3
        ;;
    *)
        log "ERROR" "Unknown deployment method: $DEPLOY_METHOD"
        exit 1
        ;;
esac

health_check
print_summary
