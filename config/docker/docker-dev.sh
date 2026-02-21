#!/bin/bash
# Quick start script for development environment

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

echo "Starting KitchenXpert Development Environment..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env from .env.example..."
    cp config/docker/.env.example .env
    echo "Please edit .env file with your configuration before continuing."
    exit 1
fi

# Start development environment
docker-compose -f config/docker/docker-compose.dev.yml up --build $NO_CACHE || {
    echo "ERROR: Docker build or startup failed."
    echo "Troubleshooting tips:"
    echo "  - Check if Docker daemon is running: docker info"
    echo "  - Check for port conflicts: docker ps"
    echo "  - Try rebuilding without cache: $0 --no-cache"
    echo "  - Check logs: docker-compose -f config/docker/docker-compose.dev.yml logs"
    exit 1
}

echo "Development environment stopped."
