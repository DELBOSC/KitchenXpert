#!/bin/bash
# Production deployment script

set -euo pipefail

# Enable BuildKit for faster builds
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Parse arguments
NO_CACHE=""
for arg in "$@"; do
    case $arg in
        --no-cache)
            NO_CACHE="--no-cache"
            shift
            ;;
    esac
done

echo "Building and deploying KitchenXpert Production Environment..."

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo "ERROR: .env.production file not found!"
    echo "Please create .env.production with your production configuration."
    exit 1
fi

# Build images
echo "Building production images..."
docker-compose -f config/docker/docker-compose.prod.yml build $NO_CACHE || {
    echo "ERROR: Production Docker build failed."
    echo "Troubleshooting tips:"
    echo "  - Check if Docker daemon is running: docker info"
    echo "  - Review build logs above for specific errors"
    echo "  - Try rebuilding without cache: $0 --no-cache"
    echo "  - Ensure all required build args are set in .env.production"
    exit 1
}

# Start services
echo "Starting production services..."
docker-compose -f config/docker/docker-compose.prod.yml up -d || {
    echo "ERROR: Failed to start production services."
    echo "Troubleshooting tips:"
    echo "  - Check for port conflicts: docker ps"
    echo "  - Check logs: docker-compose -f config/docker/docker-compose.prod.yml logs"
    exit 1
}

# Wait for health checks
echo "Waiting for services to be healthy..."
sleep 10

# Show status
docker-compose -f config/docker/docker-compose.prod.yml ps

echo "Production environment deployed successfully!"
echo "Access the application at:"
echo "  Frontend: http://localhost:8080"
echo "  Partner Portal: http://localhost:8081"
echo "  Backend API: http://localhost:3000"
echo "  AI Services: http://localhost:8000"
