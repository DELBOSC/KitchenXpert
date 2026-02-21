#!/bin/bash
#
# Initialize Project - KitchenXpert
#
# First-time setup script for new developers. Sets up the complete development environment.
#

set -euo pipefail

# Colors for output
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
SKIP_DOCKER="${SKIP_DOCKER:-false}"
SKIP_DB="${SKIP_DB:-false}"
VERBOSE="${VERBOSE:-false}"

# Logging
log() {
    local level=$1
    local message=$2

    case $level in
        "INFO")    echo -e "${BLUE}[INFO]${NC} $message" ;;
        "SUCCESS") echo -e "${GREEN}[SUCCESS]${NC} $message" ;;
        "WARNING") echo -e "${YELLOW}[WARNING]${NC} $message" ;;
        "ERROR")   echo -e "${RED}[ERROR]${NC} $message" ;;
        "STEP")    echo -e "${CYAN}[STEP]${NC} $message" ;;
    esac
}

print_banner() {
    echo ""
    echo -e "${CYAN}"
    echo "  ╔═══════════════════════════════════════════════════════════════╗"
    echo "  ║                                                               ║"
    echo "  ║   🍳  KitchenXpert - Project Initialization                   ║"
    echo "  ║                                                               ║"
    echo "  ║   AI-Powered Kitchen Design Platform                          ║"
    echo "  ║                                                               ║"
    echo "  ╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
}

check_prerequisites() {
    log "STEP" "Checking prerequisites..."

    local missing=()

    # Check Git
    if ! command -v git &> /dev/null; then
        missing+=("git")
    else
        log "INFO" "Git: $(git --version | head -1)"
    fi

    # Check Node.js
    if ! command -v node &> /dev/null; then
        missing+=("node (v20+)")
    else
        local node_version=$(node -v | sed 's/v//')
        log "INFO" "Node.js: v$node_version"

        if [ "$(printf '%s\n' "20.0.0" "$node_version" | sort -V | head -n1)" != "20.0.0" ]; then
            log "WARNING" "Node.js 20+ required (found: $node_version)"
            log "INFO" "Recommended version: 22.x LTS"
        fi
    fi

    # Check pnpm
    if ! command -v pnpm &> /dev/null; then
        log "WARNING" "pnpm not found, will be installed"
    else
        log "INFO" "pnpm: $(pnpm -v)"
    fi

    # Check Docker (optional)
    if [ "$SKIP_DOCKER" = "false" ]; then
        if ! command -v docker &> /dev/null; then
            log "WARNING" "Docker not found - database containers won't be available"
            SKIP_DOCKER="true"
        else
            log "INFO" "Docker: $(docker --version | head -1)"

            if ! docker info &> /dev/null; then
                log "WARNING" "Docker daemon not running"
                SKIP_DOCKER="true"
            fi
        fi
    fi

    if [ ${#missing[@]} -gt 0 ]; then
        log "ERROR" "Missing required tools: ${missing[*]}"
        log "INFO" "Please install the missing tools and run this script again."
        exit 1
    fi

    log "SUCCESS" "Prerequisites check passed"
}

setup_git_hooks() {
    log "STEP" "Setting up Git hooks..."

    cd "$PROJECT_ROOT"

    # Create hooks directory if not exists
    mkdir -p .git/hooks

    # Pre-commit hook
    cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# Pre-commit hook for KitchenXpert

echo "Running pre-commit checks..."

# Run lint-staged if available
if command -v pnpm &> /dev/null && [ -f "package.json" ]; then
    pnpm run lint-staged 2>/dev/null || {
        echo "Lint-staged not configured, running lint..."
        pnpm run lint --fix
    }
fi

# Check for debug statements
if git diff --cached --name-only | xargs grep -l "console.log\|debugger" 2>/dev/null; then
    echo "Warning: Found debug statements in staged files"
fi

exit 0
EOF

    chmod +x .git/hooks/pre-commit

    # Commit-msg hook
    cat > .git/hooks/commit-msg << 'EOF'
#!/bin/bash
# Commit message hook for KitchenXpert

commit_msg=$(cat "$1")

# Check for conventional commits format
if ! echo "$commit_msg" | grep -qE "^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\(.+\))?: .+"; then
    echo "Error: Commit message does not follow conventional commits format."
    echo "Examples:"
    echo "  feat: add user authentication"
    echo "  fix(api): resolve timeout issue"
    echo "  docs: update README"
    exit 1
fi

exit 0
EOF

    chmod +x .git/hooks/commit-msg

    log "SUCCESS" "Git hooks configured"
}

install_pnpm() {
    if ! command -v pnpm &> /dev/null; then
        log "STEP" "Installing pnpm..."
        corepack enable && corepack prepare pnpm@8.15.0 --activate
        log "SUCCESS" "pnpm installed"
    fi
}

install_dependencies() {
    log "STEP" "Installing dependencies..."

    cd "$PROJECT_ROOT"

    "$SCRIPT_DIR/install-dependencies.sh" || {
        log "ERROR" "Failed to install dependencies"
        exit 1
    }

    log "SUCCESS" "Dependencies installed"
}

setup_environment_files() {
    log "STEP" "Setting up environment files..."

    cd "$PROJECT_ROOT"

    # Root .env
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            log "INFO" "Created .env from .env.example"
        else
            cat > .env << EOF
# KitchenXpert Environment Configuration
NODE_ENV=development
LOG_LEVEL=debug

# API Configuration
API_PORT=3001
API_HOST=localhost

# Frontend Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001

# Database Configuration
DATABASE_URL=postgresql://kitchenxpert:kitchenxpert@localhost:5432/kitchenxpert
MONGODB_URI=mongodb://localhost:27017/kitchenxpert

# Redis Configuration
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_ACCESS_SECRET=dev-access-secret-change-in-production
JWT_REFRESH_SECRET=dev-refresh-secret-change-in-production

# AI Services
OPENAI_API_KEY=your-openai-api-key
EOF
            log "INFO" "Created default .env file"
        fi
    else
        log "INFO" ".env already exists, skipping"
    fi

    # Package-specific .env files
    local packages=("packages/backend" "packages/frontend" "packages/partner-portal")

    for package in "${packages[@]}"; do
        if [ -d "$PROJECT_ROOT/$package" ]; then
            if [ ! -f "$PROJECT_ROOT/$package/.env.local" ] && [ -f "$PROJECT_ROOT/$package/.env.example" ]; then
                cp "$PROJECT_ROOT/$package/.env.example" "$PROJECT_ROOT/$package/.env.local"
                log "INFO" "Created $package/.env.local"
            fi
        fi
    done

    log "SUCCESS" "Environment files configured"
}

setup_docker_services() {
    if [ "$SKIP_DOCKER" = "true" ]; then
        log "INFO" "Skipping Docker services setup"
        return
    fi

    log "STEP" "Setting up Docker services..."

    cd "$PROJECT_ROOT"

    # Check for docker-compose file
    local compose_file=""
    if [ -f "docker-compose.yml" ]; then
        compose_file="docker-compose.yml"
    elif [ -f "docker-compose.yaml" ]; then
        compose_file="docker-compose.yaml"
    elif [ -f "docker/docker-compose.dev.yml" ]; then
        compose_file="docker/docker-compose.dev.yml"
    fi

    if [ -n "$compose_file" ]; then
        log "INFO" "Starting development services..."
        docker compose -f "$compose_file" up -d || {
            log "WARNING" "Failed to start Docker services"
        }
        log "SUCCESS" "Docker services started"
    else
        log "WARNING" "No docker-compose file found"
    fi
}

setup_databases() {
    if [ "$SKIP_DB" = "true" ]; then
        log "INFO" "Skipping database setup"
        return
    fi

    log "STEP" "Setting up databases..."

    "$SCRIPT_DIR/setup-db.sh" || {
        log "WARNING" "Database setup failed - you may need to configure manually"
    }

    log "SUCCESS" "Databases configured"
}

generate_certificates() {
    log "STEP" "Generating development certificates..."

    "$SCRIPT_DIR/setup-certificates.sh" --dev || {
        log "WARNING" "Certificate generation failed - HTTPS may not work locally"
    }

    log "SUCCESS" "Certificates generated"
}

run_initial_build() {
    log "STEP" "Running initial build..."

    cd "$PROJECT_ROOT"

    # Generate Prisma client if available
    if [ -f "packages/backend/prisma/schema.prisma" ]; then
        log "INFO" "Generating Prisma client..."
        cd "$PROJECT_ROOT/packages/backend"
        pnpm prisma generate || log "WARNING" "Prisma generation failed"
        cd "$PROJECT_ROOT"
    fi

    # Build shared packages
    log "INFO" "Building shared packages..."
    pnpm run build:shared 2>/dev/null || {
        log "INFO" "No shared build script, attempting individual builds..."
        for dir in packages/shared/*/; do
            if [ -f "$dir/package.json" ]; then
                (cd "$dir" && pnpm run build 2>/dev/null) || true
            fi
        done
    }

    log "SUCCESS" "Initial build complete"
}

verify_installation() {
    log "STEP" "Verifying installation..."

    local checks_passed=0
    local checks_total=0

    # Check node_modules
    ((checks_total++))
    if [ -d "$PROJECT_ROOT/node_modules" ]; then
        ((checks_passed++))
        log "INFO" "✓ node_modules installed"
    else
        log "WARNING" "✗ node_modules not found"
    fi

    # Check .env
    ((checks_total++))
    if [ -f "$PROJECT_ROOT/.env" ]; then
        ((checks_passed++))
        log "INFO" "✓ .env configured"
    else
        log "WARNING" "✗ .env not found"
    fi

    # Check Git hooks
    ((checks_total++))
    if [ -f "$PROJECT_ROOT/.git/hooks/pre-commit" ]; then
        ((checks_passed++))
        log "INFO" "✓ Git hooks installed"
    else
        log "WARNING" "✗ Git hooks not installed"
    fi

    echo ""
    log "INFO" "Verification: $checks_passed/$checks_total checks passed"

    if [ $checks_passed -lt $checks_total ]; then
        log "WARNING" "Some checks failed - review the warnings above"
    else
        log "SUCCESS" "All checks passed!"
    fi
}

print_next_steps() {
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}                  Setup Complete!                              ${GREEN}║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${CYAN}Next steps:${NC}"
    echo ""
    echo "  1. Review and update the .env file with your configuration"
    echo ""
    echo "  2. Start the development servers:"
    echo "     ${YELLOW}pnpm run dev${NC}"
    echo ""
    echo "  3. Access the applications:"
    echo "     • Frontend:       ${BLUE}http://localhost:3000${NC}"
    echo "     • Backend API:    ${BLUE}http://localhost:3001${NC}"
    echo "     • Partner Portal: ${BLUE}http://localhost:3002${NC}"
    echo ""
    echo "  4. Run tests:"
    echo "     ${YELLOW}pnpm run test${NC}"
    echo ""
    echo -e "${CYAN}Useful commands:${NC}"
    echo "  • pnpm run build      - Build all packages"
    echo "  • pnpm run lint       - Run linters"
    echo "  • pnpm run typecheck  - TypeScript type checking"
    echo "  • pnpm run db:seed    - Seed the database"
    echo ""
    echo -e "${BLUE}Documentation:${NC} https://docs.kitchenxpert.com"
    echo ""
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-docker)
            SKIP_DOCKER="true"
            shift
            ;;
        --skip-db)
            SKIP_DB="true"
            shift
            ;;
        --verbose)
            VERBOSE="true"
            shift
            ;;
        --help)
            echo "Usage: init-project.sh [options]"
            echo ""
            echo "Options:"
            echo "  --skip-docker    Skip Docker services setup"
            echo "  --skip-db        Skip database setup"
            echo "  --verbose        Enable verbose output"
            echo "  --help           Show this help message"
            exit 0
            ;;
        *)
            log "ERROR" "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Main execution
print_banner
check_prerequisites
setup_git_hooks
install_pnpm
install_dependencies
setup_environment_files
setup_docker_services
setup_databases
generate_certificates
run_initial_build
verify_installation
print_next_steps

exit 0
