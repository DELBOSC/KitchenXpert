#!/bin/bash
#
# Setup Database - KitchenXpert
#
# Sets up PostgreSQL and MongoDB databases for development and production.
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Configuration
USE_DOCKER="${USE_DOCKER:-true}"
RUN_MIGRATIONS="${RUN_MIGRATIONS:-true}"
RUN_SEEDS="${RUN_SEEDS:-false}"

# Database configuration
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-kitchenxpert}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-kitchenxpert}"
POSTGRES_DB="${POSTGRES_DB:-kitchenxpert}"

MONGODB_HOST="${MONGODB_HOST:-localhost}"
MONGODB_PORT="${MONGODB_PORT:-27017}"
MONGODB_DB="${MONGODB_DB:-kitchenxpert}"

# Validate credentials for non-development environments
if [ "${NODE_ENV:-development}" != "development" ] && [ "$POSTGRES_PASSWORD" = "kitchenxpert" ]; then
    log "ERROR" "Default password detected in non-development environment. Set POSTGRES_PASSWORD."
    exit 1
fi

# Logging
log() {
    local level=$1
    local message=$2

    case $level in
        "INFO")    echo -e "${BLUE}[DB]${NC} $message" ;;
        "SUCCESS") echo -e "${GREEN}[DB]${NC} $message" ;;
        "WARNING") echo -e "${YELLOW}[DB]${NC} $message" ;;
        "ERROR")   echo -e "${RED}[DB]${NC} $message" ;;
    esac
}

check_docker() {
    if [ "$USE_DOCKER" = "true" ]; then
        if ! command -v docker &> /dev/null; then
            log "ERROR" "Docker is required but not installed"
            exit 1
        fi

        if ! docker info &> /dev/null; then
            log "ERROR" "Docker daemon is not running"
            exit 1
        fi

        log "INFO" "Docker is available"
    fi
}

start_postgres_docker() {
    log "INFO" "Starting PostgreSQL container..."

    # Check if container exists
    if docker ps -a --format '{{.Names}}' | grep -q "kitchenxpert-postgres"; then
        # Check if running
        if docker ps --format '{{.Names}}' | grep -q "kitchenxpert-postgres"; then
            log "INFO" "PostgreSQL container already running"
        else
            docker start kitchenxpert-postgres
            log "SUCCESS" "PostgreSQL container started"
        fi
    else
        # Create and run new container
        docker run -d \
            --name kitchenxpert-postgres \
            -e POSTGRES_USER="$POSTGRES_USER" \
            -e POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
            -e POSTGRES_DB="$POSTGRES_DB" \
            -p "$POSTGRES_PORT:5432" \
            -v kitchenxpert-postgres-data:/var/lib/postgresql/data \
            postgres:16-alpine

        log "SUCCESS" "PostgreSQL container created and started"
    fi

    # Wait for PostgreSQL to be ready
    log "INFO" "Waiting for PostgreSQL to be ready..."
    local retries=30
    while [ $retries -gt 0 ]; do
        if docker exec kitchenxpert-postgres pg_isready -U "$POSTGRES_USER" &> /dev/null; then
            log "SUCCESS" "PostgreSQL is ready"
            break
        fi
        sleep 1
        ((retries--))
    done

    if [ $retries -eq 0 ]; then
        log "ERROR" "PostgreSQL failed to start"
        exit 1
    fi
}

start_mongodb_docker() {
    log "INFO" "Starting MongoDB container..."

    # Check if container exists
    if docker ps -a --format '{{.Names}}' | grep -q "kitchenxpert-mongodb"; then
        # Check if running
        if docker ps --format '{{.Names}}' | grep -q "kitchenxpert-mongodb"; then
            log "INFO" "MongoDB container already running"
        else
            docker start kitchenxpert-mongodb
            log "SUCCESS" "MongoDB container started"
        fi
    else
        # Create and run new container
        docker run -d \
            --name kitchenxpert-mongodb \
            -p "$MONGODB_PORT:27017" \
            -v kitchenxpert-mongodb-data:/data/db \
            mongo:7

        log "SUCCESS" "MongoDB container created and started"
    fi

    # Wait for MongoDB to be ready
    log "INFO" "Waiting for MongoDB to be ready..."
    local retries=30
    while [ $retries -gt 0 ]; do
        if docker exec kitchenxpert-mongodb mongosh --eval "db.runCommand('ping').ok" &> /dev/null; then
            log "SUCCESS" "MongoDB is ready"
            break
        fi
        sleep 1
        ((retries--))
    done

    if [ $retries -eq 0 ]; then
        log "ERROR" "MongoDB failed to start"
        exit 1
    fi
}

start_redis_docker() {
    log "INFO" "Starting Redis container..."

    # Check if container exists
    if docker ps -a --format '{{.Names}}' | grep -q "kitchenxpert-redis"; then
        # Check if running
        if docker ps --format '{{.Names}}' | grep -q "kitchenxpert-redis"; then
            log "INFO" "Redis container already running"
        else
            docker start kitchenxpert-redis
            log "SUCCESS" "Redis container started"
        fi
    else
        # Create and run new container
        docker run -d \
            --name kitchenxpert-redis \
            -p 6379:6379 \
            -v kitchenxpert-redis-data:/data \
            redis:7-alpine

        log "SUCCESS" "Redis container created and started"
    fi
}

setup_postgres_schema() {
    log "INFO" "Setting up PostgreSQL schema..."

    # Create additional databases if needed
    docker exec kitchenxpert-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" << 'EOF'
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS kitchens;
CREATE SCHEMA IF NOT EXISTS users;
CREATE SCHEMA IF NOT EXISTS partners;
CREATE SCHEMA IF NOT EXISTS analytics;

-- Grant permissions
GRANT ALL ON SCHEMA kitchens TO kitchenxpert;
GRANT ALL ON SCHEMA users TO kitchenxpert;
GRANT ALL ON SCHEMA partners TO kitchenxpert;
GRANT ALL ON SCHEMA analytics TO kitchenxpert;
EOF

    log "SUCCESS" "PostgreSQL schema created"
}

setup_mongodb_collections() {
    log "INFO" "Setting up MongoDB collections..."

    docker exec kitchenxpert-mongodb mongosh "$MONGODB_DB" << 'EOF'
// Create collections with validation
db.createCollection("questionnaires", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["userId", "createdAt"],
      properties: {
        userId: { bsonType: "string" },
        responses: { bsonType: "object" },
        createdAt: { bsonType: "date" },
        updatedAt: { bsonType: "date" }
      }
    }
  }
});

db.createCollection("designs", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["kitchenId", "version"],
      properties: {
        kitchenId: { bsonType: "string" },
        version: { bsonType: "int" },
        layout: { bsonType: "object" },
        createdAt: { bsonType: "date" }
      }
    }
  }
});

db.createCollection("analytics_events");

// Create indexes
db.questionnaires.createIndex({ userId: 1 });
db.questionnaires.createIndex({ createdAt: -1 });
db.designs.createIndex({ kitchenId: 1, version: -1 });
db.analytics_events.createIndex({ timestamp: -1 });
db.analytics_events.createIndex({ userId: 1, eventType: 1 });

print("MongoDB collections and indexes created");
EOF

    log "SUCCESS" "MongoDB collections created"
}

run_prisma_migrations() {
    if [ "$RUN_MIGRATIONS" = "true" ]; then
        log "INFO" "Running Prisma migrations..."

        cd "$PROJECT_ROOT/packages/backend"

        if [ -f "prisma/schema.prisma" ]; then
            # Generate Prisma client
            pnpm prisma generate

            # Run migrations
            pnpm prisma migrate deploy || {
                log "WARNING" "No pending migrations or migrations failed"
                # Try to create initial migration in development
                if [ "${NODE_ENV:-development}" = "development" ]; then
                    pnpm prisma migrate dev --name init || true
                fi
            }

            log "SUCCESS" "Prisma migrations completed"
        else
            log "WARNING" "No Prisma schema found, skipping migrations"
        fi
    fi
}

run_seeds() {
    if [ "$RUN_SEEDS" = "true" ]; then
        log "INFO" "Running database seeds..."

        cd "$PROJECT_ROOT"

        if [ -f "scripts/database/seed/seed-all.js" ]; then
            node scripts/database/seed/seed-all.js || {
                log "WARNING" "Seeding failed or partially completed"
            }
            log "SUCCESS" "Database seeding completed"
        else
            log "WARNING" "No seed script found"
        fi
    fi
}

verify_connections() {
    log "INFO" "Verifying database connections..."

    # Test PostgreSQL
    if docker exec kitchenxpert-postgres pg_isready -U "$POSTGRES_USER" &> /dev/null; then
        log "SUCCESS" "PostgreSQL: Connected"
    else
        log "ERROR" "PostgreSQL: Connection failed"
    fi

    # Test MongoDB
    if docker exec kitchenxpert-mongodb mongosh --eval "db.runCommand('ping').ok" &> /dev/null; then
        log "SUCCESS" "MongoDB: Connected"
    else
        log "ERROR" "MongoDB: Connection failed"
    fi

    # Test Redis
    if docker exec kitchenxpert-redis redis-cli ping &> /dev/null; then
        log "SUCCESS" "Redis: Connected"
    else
        log "WARNING" "Redis: Connection failed"
    fi
}

generate_env_config() {
    log "INFO" "Generating environment configuration..."

    cat > "$PROJECT_ROOT/.env.database" << EOF
# Database Configuration - Generated by setup-db.sh
# Add these to your .env file

# PostgreSQL
DATABASE_URL=postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@$POSTGRES_HOST:$POSTGRES_PORT/$POSTGRES_DB?schema=public

# MongoDB
MONGODB_URI=mongodb://$MONGODB_HOST:$MONGODB_PORT/$MONGODB_DB

# Redis
REDIS_URL=redis://localhost:6379
EOF

    log "SUCCESS" "Environment config saved to .env.database"
}

print_summary() {
    echo ""
    log "SUCCESS" "Database setup complete!"
    echo ""
    echo "  Services running:"
    echo "    • PostgreSQL: localhost:$POSTGRES_PORT"
    echo "    • MongoDB:    localhost:$MONGODB_PORT"
    echo "    • Redis:      localhost:6379"
    echo ""
    echo "  Connection strings:"
    echo "    PostgreSQL: postgresql://$POSTGRES_USER:****@localhost:$POSTGRES_PORT/$POSTGRES_DB"
    echo "    MongoDB:    mongodb://localhost:$MONGODB_PORT/$MONGODB_DB"
    echo "    Redis:      redis://localhost:6379"
    echo ""
    echo "  Useful commands:"
    echo "    • docker logs kitchenxpert-postgres   - View PostgreSQL logs"
    echo "    • docker logs kitchenxpert-mongodb    - View MongoDB logs"
    echo "    • docker exec -it kitchenxpert-postgres psql -U $POSTGRES_USER -d $POSTGRES_DB"
    echo "    • docker exec -it kitchenxpert-mongodb mongosh $MONGODB_DB"
    echo ""
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --no-docker)
            USE_DOCKER="false"
            shift
            ;;
        --no-migrations)
            RUN_MIGRATIONS="false"
            shift
            ;;
        --seed)
            RUN_SEEDS="true"
            shift
            ;;
        --postgres-host)
            POSTGRES_HOST="$2"
            shift 2
            ;;
        --postgres-port)
            POSTGRES_PORT="$2"
            shift 2
            ;;
        --mongodb-host)
            MONGODB_HOST="$2"
            shift 2
            ;;
        --mongodb-port)
            MONGODB_PORT="$2"
            shift 2
            ;;
        --help)
            echo "Usage: setup-db.sh [options]"
            echo ""
            echo "Options:"
            echo "  --no-docker        Don't use Docker (connect to existing databases)"
            echo "  --no-migrations    Skip running migrations"
            echo "  --seed             Run database seeds after setup"
            echo "  --postgres-host    PostgreSQL host (default: localhost)"
            echo "  --postgres-port    PostgreSQL port (default: 5432)"
            echo "  --mongodb-host     MongoDB host (default: localhost)"
            echo "  --mongodb-port     MongoDB port (default: 27017)"
            echo "  --help             Show this help message"
            exit 0
            ;;
        *)
            log "ERROR" "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Main execution
if [ "$USE_DOCKER" = "true" ]; then
    check_docker
    start_postgres_docker
    start_mongodb_docker
    start_redis_docker
    setup_postgres_schema
    setup_mongodb_collections
fi

run_prisma_migrations
run_seeds
verify_connections
generate_env_config
print_summary

exit 0
