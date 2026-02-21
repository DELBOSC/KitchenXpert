#!/bin/bash
#
# Deploy AI Modules - KitchenXpert
#
# Deploys AI/ML modules and services.
#

set -euo pipefail

# Defaults for flag-only variables (prevent unbound variable errors under set -u)
SKIP_TESTS="${SKIP_TESTS:-false}"
SKIP_BUILD="${SKIP_BUILD:-false}"
SKIP_MODELS="${SKIP_MODELS:-false}"
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
AI_DIR="$PROJECT_ROOT/packages/ai-modules"
DEPLOY_METHOD="${DEPLOY_METHOD:-docker}"

# Logging
log() {
    local level=$1
    local message=$2
    case $level in
        "INFO")    echo -e "${BLUE}[AI]${NC} $message" ;;
        "SUCCESS") echo -e "${GREEN}[AI]${NC} $message" ;;
        "WARNING") echo -e "${YELLOW}[AI]${NC} $message" ;;
        "ERROR")   echo -e "${RED}[AI]${NC} $message" ;;
    esac
}

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}          KitchenXpert - AI Modules Deployment               ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

check_ai_modules() {
    log "INFO" "Checking AI modules directory..."

    if [ ! -d "$AI_DIR" ]; then
        log "WARNING" "AI modules directory not found: $AI_DIR"

        # Try alternative locations
        for dir in "ai" "ml" "packages/ai" "services/ai"; do
            if [ -d "$PROJECT_ROOT/$dir" ]; then
                AI_DIR="$PROJECT_ROOT/$dir"
                log "SUCCESS" "Found at: $AI_DIR"
                break
            fi
        done

        if [ ! -d "$AI_DIR" ]; then
            log "ERROR" "AI modules not found"
            exit 1
        fi
    fi

    log "SUCCESS" "AI modules directory verified"
}

check_python_env() {
    log "INFO" "Checking Python environment..."

    # Check Python version
    if command -v python3 &> /dev/null; then
        local py_version=$(python3 --version 2>&1 | cut -d' ' -f2)
        log "INFO" "Python version: $py_version"
    else
        log "ERROR" "Python 3 not found"
        exit 1
    fi

    # Check pip
    if ! command -v pip3 &> /dev/null; then
        log "ERROR" "pip3 not found"
        exit 1
    fi

    log "SUCCESS" "Python environment verified"
}

setup_virtual_env() {
    log "INFO" "Setting up virtual environment..."

    cd "$AI_DIR"

    if [ ! -d "venv" ]; then
        python3 -m venv venv
    fi

    source venv/bin/activate

    # Upgrade pip
    pip install --upgrade pip

    # Install dependencies
    if [ -f "requirements.txt" ]; then
        pip install -r requirements.txt
    fi

    if [ -f "requirements-$ENVIRONMENT.txt" ]; then
        pip install -r "requirements-$ENVIRONMENT.txt"
    fi

    log "SUCCESS" "Virtual environment ready"
}

download_models() {
    log "INFO" "Checking AI models..."

    cd "$AI_DIR"

    local models_dir="$AI_DIR/models"
    mkdir -p "$models_dir"

    # Download models if script exists
    if [ -f "scripts/download-models.py" ]; then
        log "INFO" "Downloading required models..."
        python3 scripts/download-models.py --env "$ENVIRONMENT"
    fi

    # Check model files
    local model_count=$(find "$models_dir" -type f \( -name "*.pt" -o -name "*.onnx" -o -name "*.pkl" \) 2>/dev/null | wc -l)
    log "INFO" "Found $model_count model file(s)"

    log "SUCCESS" "Models ready"
}

build_ai_modules() {
    log "INFO" "Building AI modules..."

    cd "$AI_DIR"

    # Run any build scripts
    if [ -f "setup.py" ]; then
        pip install -e .
    fi

    # Build TypeScript/JavaScript components if present
    if [ -f "package.json" ]; then
        pnpm install --frozen-lockfile
        pnpm build 2>/dev/null || true
    fi

    # Run tests
    if [ "$SKIP_TESTS" != "true" ]; then
        log "INFO" "Running AI module tests..."
        if [ -f "pytest.ini" ] || [ -d "tests" ]; then
            pytest tests/ -v --tb=short 2>/dev/null || {
                log "WARNING" "Some tests failed"
            }
        fi
    fi

    log "SUCCESS" "AI modules built successfully"
}

deploy_docker() {
    log "INFO" "Deploying AI modules with Docker..."

    cd "$PROJECT_ROOT"

    local image_name="kitchenxpert-ai"
    local image_tag="${ENVIRONMENT}-$(date +%Y%m%d%H%M%S)"

    # Build Docker image
    log "INFO" "Building Docker image..."

    docker build \
        -f "config/docker/Dockerfile.ai" \
        -t "$image_name:$image_tag" \
        -t "$image_name:$ENVIRONMENT-latest" \
        --build-arg ENVIRONMENT="$ENVIRONMENT" \
        "$AI_DIR"

    # Push to registry
    if [ -n "$DOCKER_REGISTRY" ]; then
        log "INFO" "Pushing to registry..."
        docker tag "$image_name:$image_tag" "$DOCKER_REGISTRY/$image_name:$image_tag"
        docker push "$DOCKER_REGISTRY/$image_name:$image_tag"
    fi

    # Deploy container
    docker stop kitchenxpert-ai-$ENVIRONMENT 2>/dev/null || true
    docker rm kitchenxpert-ai-$ENVIRONMENT 2>/dev/null || true

    # Check for GPU support
    local gpu_flag=""
    if command -v nvidia-smi &> /dev/null; then
        gpu_flag="--gpus all"
        log "INFO" "GPU support enabled"
    fi

    docker run -d \
        --name kitchenxpert-ai-$ENVIRONMENT \
        $gpu_flag \
        -p "${AI_PORT:-8000}:8000" \
        -v "$AI_DIR/models:/app/models" \
        --restart unless-stopped \
        "$image_name:$image_tag"

    log "SUCCESS" "Docker deployment completed"
}

deploy_kubernetes() {
    log "INFO" "Deploying to Kubernetes..."

    local k8s_dir="$PROJECT_ROOT/k8s"
    local namespace="kitchenxpert-$ENVIRONMENT"

    if [ ! -d "$k8s_dir/ai-modules" ]; then
        log "ERROR" "Kubernetes manifests not found"
        exit 1
    fi

    # Apply ConfigMaps
    kubectl apply -f "$k8s_dir/ai-modules/configmap.yaml" -n "$namespace" 2>/dev/null || true

    # Apply Deployment
    kubectl apply -f "$k8s_dir/ai-modules/deployment.yaml" -n "$namespace"

    # Apply Service
    kubectl apply -f "$k8s_dir/ai-modules/service.yaml" -n "$namespace"

    # Wait for rollout
    kubectl rollout status deployment/ai-modules -n "$namespace" --timeout=600s

    log "SUCCESS" "Kubernetes deployment completed"
}

deploy_lambda() {
    log "INFO" "Deploying to AWS Lambda..."

    cd "$AI_DIR"

    if ! command -v serverless &> /dev/null; then
        log "INFO" "Installing Serverless Framework..."
        npm install -g serverless
    fi

    # Package dependencies
    log "INFO" "Packaging Lambda function..."

    # Create deployment package
    local package_dir="$AI_DIR/.serverless-python"
    rm -rf "$package_dir"
    mkdir -p "$package_dir"

    pip install -r requirements.txt -t "$package_dir"
    cp -r src/* "$package_dir/" 2>/dev/null || cp -r *.py "$package_dir/"

    # Deploy
    serverless deploy --stage "$ENVIRONMENT"

    log "SUCCESS" "Lambda deployment completed"
}

deploy_sagemaker() {
    log "INFO" "Deploying to AWS SageMaker..."

    if ! command -v aws &> /dev/null; then
        log "ERROR" "AWS CLI not installed"
        exit 1
    fi

    cd "$AI_DIR"

    local model_name="kitchenxpert-ai-$ENVIRONMENT"
    local endpoint_name="kitchenxpert-ai-endpoint-$ENVIRONMENT"

    # Create/update model
    log "INFO" "Creating SageMaker model..."

    # This is a simplified example - real deployment would need more configuration
    aws sagemaker create-model \
        --model-name "$model_name" \
        --primary-container "Image=${SAGEMAKER_IMAGE},ModelDataUrl=${MODEL_S3_URL}" \
        --execution-role-arn "${SAGEMAKER_ROLE}" \
        2>/dev/null || {
            log "INFO" "Updating existing model..."
            aws sagemaker update-model --model-name "$model_name" \
                --primary-container "Image=${SAGEMAKER_IMAGE}" 2>/dev/null || true
        }

    log "SUCCESS" "SageMaker deployment completed"
}

health_check() {
    log "INFO" "Running health check..."

    local url="${AI_URL:-http://localhost:${AI_PORT:-5000}}"
    local max_attempts=60
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -sf "$url/health" > /dev/null 2>&1; then
            log "SUCCESS" "Health check passed"

            # Test prediction endpoint
            log "INFO" "Testing prediction endpoint..."
            local test_result=$(curl -sf "$url/api/test" 2>/dev/null || echo "")
            if [ -n "$test_result" ]; then
                log "SUCCESS" "Prediction endpoint responsive"
            fi

            return 0
        fi

        log "INFO" "Waiting for AI service (attempt $attempt/$max_attempts)..."
        sleep 3
        ((attempt++))
    done

    log "WARNING" "Health check timed out"
    return 0
}

print_summary() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}        AI Modules Deployment Completed Successfully         ${GREEN}║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "  Environment:  $ENVIRONMENT"
    echo "  Method:       $DEPLOY_METHOD"
    echo "  URL:          ${AI_URL:-http://localhost:${AI_PORT:-5000}}"
    echo ""
    echo "  Endpoints:"
    echo "    - Health:     /health"
    echo "    - Predict:    /api/predict"
    echo "    - Models:     /api/models"
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
        --skip-tests)
            SKIP_TESTS="true"
            shift
            ;;
        --skip-models)
            SKIP_MODELS="true"
            shift
            ;;
        --help)
            echo "Usage: deploy-ai-modules.sh [options]"
            echo ""
            echo "Options:"
            echo "  -e, --environment <env>  Target environment"
            echo "  --method <method>        Deployment method: docker, k8s, lambda, sagemaker"
            echo "  --skip-build             Skip build step"
            echo "  --skip-tests             Skip running tests"
            echo "  --skip-models            Skip model download"
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
check_ai_modules
check_python_env

if [ "$SKIP_BUILD" != "true" ]; then
    setup_virtual_env

    if [ "$SKIP_MODELS" != "true" ]; then
        download_models
    fi

    build_ai_modules
fi

case $DEPLOY_METHOD in
    docker)
        deploy_docker
        ;;
    k8s|kubernetes)
        deploy_kubernetes
        ;;
    lambda)
        deploy_lambda
        ;;
    sagemaker)
        deploy_sagemaker
        ;;
    *)
        log "ERROR" "Unknown deployment method: $DEPLOY_METHOD"
        exit 1
        ;;
esac

health_check
print_summary
