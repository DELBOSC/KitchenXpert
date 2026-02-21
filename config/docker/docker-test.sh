#!/bin/bash
# Test runner script

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

echo "Running KitchenXpert Test Suite..."

# Run tests
EXIT_CODE=0
docker-compose -f config/docker/docker-compose.test.yml up --build $NO_CACHE --abort-on-container-exit || {
    EXIT_CODE=$?
    echo "ERROR: Test container build or execution failed."
    echo "Troubleshooting tips:"
    echo "  - Check if Docker daemon is running: docker info"
    echo "  - Try rebuilding without cache: $0 --no-cache"
    echo "  - Check logs: docker-compose -f config/docker/docker-compose.test.yml logs"
}

# Cleanup
echo "Cleaning up test environment..."
docker-compose -f config/docker/docker-compose.test.yml down -v

if [ $EXIT_CODE -eq 0 ]; then
    echo "All tests passed!"
else
    echo "Tests failed with exit code $EXIT_CODE"
fi

exit $EXIT_CODE
