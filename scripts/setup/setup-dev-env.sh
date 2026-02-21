#!/bin/bash
#
# Setup Development Environment - KitchenXpert
#
# Configures the local development environment with all necessary tools and settings.
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
SETUP_VSCODE="${SETUP_VSCODE:-true}"
SETUP_HUSKY="${SETUP_HUSKY:-true}"
SETUP_DOCKER="${SETUP_DOCKER:-true}"

# Logging
log() {
    local level=$1
    local message=$2

    case $level in
        "INFO")    echo -e "${BLUE}[DEV]${NC} $message" ;;
        "SUCCESS") echo -e "${GREEN}[DEV]${NC} $message" ;;
        "WARNING") echo -e "${YELLOW}[DEV]${NC} $message" ;;
        "ERROR")   echo -e "${RED}[DEV]${NC} $message" ;;
        "STEP")    echo -e "${CYAN}[STEP]${NC} $message" ;;
    esac
}

print_header() {
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}        KitchenXpert - Development Environment Setup          ${CYAN}║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

detect_os() {
    log "INFO" "Detecting operating system..."

    case "$(uname -s)" in
        Darwin*)
            OS="macos"
            log "INFO" "Detected macOS"
            ;;
        Linux*)
            OS="linux"
            log "INFO" "Detected Linux"
            ;;
        MINGW*|MSYS*|CYGWIN*)
            OS="windows"
            log "INFO" "Detected Windows (Git Bash/WSL)"
            ;;
        *)
            OS="unknown"
            log "WARNING" "Unknown operating system"
            ;;
    esac
}

check_node_version() {
    log "STEP" "Checking Node.js version..."

    if ! command -v node &> /dev/null; then
        log "ERROR" "Node.js is not installed"
        log "INFO" "Please install Node.js 20+ from https://nodejs.org"
        exit 1
    fi

    local node_version=$(node -v | sed 's/v//')
    local required_version="20.0.0"

    if [ "$(printf '%s\n' "$required_version" "$node_version" | sort -V | head -n1)" != "$required_version" ]; then
        log "ERROR" "Node.js 20+ is required (found: $node_version)"
        exit 1
    fi

    log "SUCCESS" "Node.js $node_version"
}

setup_node_version_manager() {
    log "STEP" "Setting up Node version configuration..."

    cd "$PROJECT_ROOT"

    # Create .nvmrc for nvm users
    if [ ! -f ".nvmrc" ]; then
        echo "20" > .nvmrc
        log "INFO" "Created .nvmrc"
    fi

    # Create .node-version for other version managers
    if [ ! -f ".node-version" ]; then
        echo "20" > .node-version
        log "INFO" "Created .node-version"
    fi

    log "SUCCESS" "Node version configuration complete"
}

setup_pnpm() {
    log "STEP" "Setting up pnpm..."

    if ! command -v pnpm &> /dev/null; then
        log "INFO" "Installing pnpm..."
        corepack enable && corepack prepare pnpm@8.15.0 --activate
    fi

    # Configure pnpm
    pnpm config set auto-install-peers true
    pnpm config set strict-peer-dependencies false

    log "SUCCESS" "pnpm $(pnpm -v) configured"
}

setup_vscode() {
    if [ "$SETUP_VSCODE" = "false" ]; then
        log "INFO" "Skipping VS Code setup"
        return
    fi

    log "STEP" "Setting up VS Code configuration..."

    cd "$PROJECT_ROOT"

    mkdir -p .vscode

    # Extensions recommendations
    cat > .vscode/extensions.json << 'EOF'
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "prisma.prisma",
    "ms-azuretools.vscode-docker",
    "eamodio.gitlens",
    "usernamehw.errorlens",
    "streetsidesoftware.code-spell-checker",
    "christian-kohler.path-intellisense",
    "formulahendry.auto-rename-tag",
    "ms-vscode.vscode-typescript-next"
  ]
}
EOF

    # Workspace settings
    cat > .vscode/settings.json << 'EOF'
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "explicit"
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.updateImportsOnFileMove.enabled": "always",
  "typescript.tsdk": "node_modules/typescript/lib",
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["cx\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ],
  "files.associations": {
    "*.css": "tailwindcss"
  },
  "editor.quickSuggestions": {
    "strings": true
  },
  "[prisma]": {
    "editor.defaultFormatter": "Prisma.prisma"
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.next": true,
    "**/coverage": true
  }
}
EOF

    # Launch configurations
    cat > .vscode/launch.json << 'EOF'
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Backend",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}/packages/backend",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["run", "start:debug"],
      "console": "integratedTerminal",
      "restart": true,
      "protocol": "inspector"
    },
    {
      "name": "Debug Frontend",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}/packages/frontend"
    },
    {
      "name": "Debug Current Test File",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["run", "test", "--", "--run", "${relativeFile}"],
      "console": "integratedTerminal"
    }
  ],
  "compounds": [
    {
      "name": "Full Stack",
      "configurations": ["Debug Backend", "Debug Frontend"]
    }
  ]
}
EOF

    log "SUCCESS" "VS Code configuration complete"
}

setup_husky() {
    if [ "$SETUP_HUSKY" = "false" ]; then
        log "INFO" "Skipping Husky setup"
        return
    fi

    log "STEP" "Setting up Husky git hooks..."

    cd "$PROJECT_ROOT"

    # Install husky if in package.json
    if grep -q "husky" package.json 2>/dev/null; then
        pnpm husky install 2>/dev/null || {
            # Manual husky setup
            mkdir -p .husky
            cat > .husky/pre-commit << 'EOF'
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

pnpm lint-staged
EOF
            chmod +x .husky/pre-commit

            cat > .husky/commit-msg << 'EOF'
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

pnpm commitlint --edit $1
EOF
            chmod +x .husky/commit-msg
        }

        log "SUCCESS" "Husky hooks configured"
    else
        log "INFO" "Husky not found in package.json, skipping"
    fi
}

setup_lint_staged() {
    log "STEP" "Setting up lint-staged..."

    cd "$PROJECT_ROOT"

    if [ ! -f ".lintstagedrc" ] && [ ! -f "lint-staged.config.js" ]; then
        cat > .lintstagedrc << 'EOF'
{
  "*.{js,jsx,ts,tsx}": [
    "eslint --fix",
    "prettier --write"
  ],
  "*.{json,md,yml,yaml}": [
    "prettier --write"
  ],
  "*.css": [
    "prettier --write"
  ]
}
EOF
        log "SUCCESS" "lint-staged configuration created"
    else
        log "INFO" "lint-staged config already exists"
    fi
}

setup_commitlint() {
    log "STEP" "Setting up commitlint..."

    cd "$PROJECT_ROOT"

    if [ ! -f "commitlint.config.js" ]; then
        cat > commitlint.config.js << 'EOF'
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'test',
        'chore',
        'perf',
        'ci',
        'build',
        'revert'
      ]
    ],
    'subject-case': [0],
    'body-max-line-length': [0]
  }
};
EOF
        log "SUCCESS" "commitlint configuration created"
    else
        log "INFO" "commitlint config already exists"
    fi
}

setup_docker_compose() {
    if [ "$SETUP_DOCKER" = "false" ]; then
        log "INFO" "Skipping Docker setup"
        return
    fi

    log "STEP" "Setting up Docker Compose for development..."

    cd "$PROJECT_ROOT"

    if [ ! -f "docker-compose.yml" ] && [ ! -f "docker-compose.yaml" ]; then
        cat > docker-compose.yml << 'EOF'
services:
  postgres:
    image: postgres:16-alpine
    container_name: kitchenxpert-postgres
    environment:
      POSTGRES_USER: kitchenxpert
      POSTGRES_PASSWORD: kitchenxpert
      POSTGRES_DB: kitchenxpert
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U kitchenxpert"]
      interval: 5s
      timeout: 5s
      retries: 5

  mongodb:
    image: mongo:7
    container_name: kitchenxpert-mongodb
    ports:
      - "27017:27017"
    volumes:
      - mongodb-data:/data/db
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongosh localhost:27017/test --quiet
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: kitchenxpert-redis
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  mailhog:
    image: mailhog/mailhog
    container_name: kitchenxpert-mailhog
    ports:
      - "1025:1025"
      - "8025:8025"

volumes:
  postgres-data:
  mongodb-data:
  redis-data:
EOF
        log "SUCCESS" "docker-compose.yml created"
    else
        log "INFO" "Docker Compose file already exists"
    fi
}

setup_env_template() {
    log "STEP" "Setting up environment template..."

    cd "$PROJECT_ROOT"

    if [ ! -f ".env.example" ]; then
        cat > .env.example << 'EOF'
# KitchenXpert Environment Configuration
# Copy this file to .env and update the values

# Node Environment
NODE_ENV=development
LOG_LEVEL=debug

# API Configuration
API_PORT=3001
API_HOST=localhost
API_PREFIX=/api

# Frontend Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Database - PostgreSQL
DATABASE_URL=postgresql://kitchenxpert:kitchenxpert@localhost:5432/kitchenxpert?schema=public

# Database - MongoDB
MONGODB_URI=mongodb://localhost:27017/kitchenxpert

# Redis
REDIS_URL=redis://localhost:6379

# JWT Authentication
JWT_ACCESS_SECRET=your-access-secret-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-change-in-production
JWT_REFRESH_EXPIRES_IN=30d

# Session
SESSION_SECRET=your-session-secret-change-in-production

# Email (Development - MailHog)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_FROM=noreply@kitchenxpert.local

# AI Services
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key

# Storage
STORAGE_PROVIDER=local
STORAGE_PATH=./uploads

# Stripe (Test Mode)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Feature Flags
ENABLE_AI_FEATURES=true
ENABLE_ANALYTICS=true
ENABLE_MAINTENANCE_MODE=false
EOF
        log "SUCCESS" ".env.example created"
    else
        log "INFO" ".env.example already exists"
    fi
}

setup_editor_config() {
    log "STEP" "Setting up EditorConfig..."

    cd "$PROJECT_ROOT"

    if [ ! -f ".editorconfig" ]; then
        cat > .editorconfig << 'EOF'
# EditorConfig - https://editorconfig.org

root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.md]
trim_trailing_whitespace = false

[*.{yml,yaml}]
indent_size = 2

[Makefile]
indent_style = tab

[*.py]
indent_size = 4
EOF
        log "SUCCESS" ".editorconfig created"
    else
        log "INFO" ".editorconfig already exists"
    fi
}

verify_setup() {
    log "STEP" "Verifying development environment..."

    local issues=0

    # Check files exist
    local required_files=(".env.example" ".nvmrc")
    for file in "${required_files[@]}"; do
        if [ -f "$PROJECT_ROOT/$file" ]; then
            log "INFO" "✓ $file"
        else
            log "WARNING" "✗ $file missing"
            ((issues++))
        fi
    done

    # Check VS Code config
    if [ -d "$PROJECT_ROOT/.vscode" ]; then
        log "INFO" "✓ VS Code configuration"
    else
        log "WARNING" "✗ VS Code configuration missing"
        ((issues++))
    fi

    if [ $issues -gt 0 ]; then
        log "WARNING" "$issues issues found"
    else
        log "SUCCESS" "All checks passed"
    fi
}

print_summary() {
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}           Development Environment Ready!                      ${GREEN}║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "  Configuration files created:"
    echo "    • .env.example         - Environment template"
    echo "    • .nvmrc               - Node version"
    echo "    • .editorconfig        - Editor settings"
    echo "    • .vscode/             - VS Code workspace"
    echo "    • docker-compose.yml   - Development services"
    echo ""
    echo "  Next steps:"
    echo "    1. Copy .env.example to .env"
    echo "    2. Update .env with your configuration"
    echo "    3. Run: pnpm install"
    echo "    4. Run: docker compose up -d"
    echo "    5. Run: pnpm dev"
    echo ""
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --no-vscode)
            SETUP_VSCODE="false"
            shift
            ;;
        --no-husky)
            SETUP_HUSKY="false"
            shift
            ;;
        --no-docker)
            SETUP_DOCKER="false"
            shift
            ;;
        --help)
            echo "Usage: setup-dev-env.sh [options]"
            echo ""
            echo "Options:"
            echo "  --no-vscode    Skip VS Code configuration"
            echo "  --no-husky     Skip Husky git hooks"
            echo "  --no-docker    Skip Docker Compose setup"
            echo "  --help         Show this help message"
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
detect_os
check_node_version
setup_node_version_manager
setup_pnpm
setup_vscode
setup_husky
setup_lint_staged
setup_commitlint
setup_docker_compose
setup_env_template
setup_editor_config
verify_setup
print_summary

exit 0
