# Development Setup

**Last Updated:** 2026-01-10

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation Steps](#installation-steps)
- [IDE Setup](#ide-setup)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Running in Development Mode](#running-in-development-mode)
- [Hot Reload Configuration](#hot-reload-configuration)
- [Debugging Setup](#debugging-setup)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before setting up KitchenXpert for development, ensure you have the following
installed:

### Required Software

| Software   | Minimum Version | Recommended Version | Purpose                                     |
| ---------- | --------------- | ------------------- | ------------------------------------------- |
| Node.js    | 20.0.0          | 20.11.0+            | Runtime for backend and build tools         |
| pnpm       | 8.0.0           | 8.15.0+             | Package manager (workspace support)         |
| PostgreSQL | 15.0            | 15.6+               | Primary relational database                 |
| MongoDB    | 7.0             | 7.0.5+              | Document storage for designs                |
| Redis      | 7.0             | 7.2.0+              | Caching and session storage                 |
| Python     | 3.11.0          | 3.11.7+             | AI modules runtime                          |
| Docker     | 24.0            | 24.0.7+             | Containerization (optional but recommended) |
| Git        | 2.40.0          | Latest              | Version control                             |

### System Requirements

- **RAM:** 16GB minimum (32GB recommended for 3D development)
- **Disk Space:** 20GB free space
- **OS:** Windows 10/11, macOS 12+, or Ubuntu 20.04+

### Installing Prerequisites

#### Node.js and pnpm

```bash
# Install Node.js using nvm (recommended)
# macOS/Linux
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 20
nvm use 20

# Windows (use nvm-windows)
# Download from: https://github.com/coreybutler/nvm-windows/releases

# Install pnpm globally
npm install -g pnpm@8.15.0
```

#### PostgreSQL

```bash
# macOS (using Homebrew)
brew install postgresql@15
brew services start postgresql@15

# Ubuntu/Debian
sudo apt-get update
sudo apt-get install postgresql-15 postgresql-contrib-15
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Windows
# Download from: https://www.postgresql.org/download/windows/
```

#### MongoDB

```bash
# macOS
brew tap mongodb/brew
brew install mongodb-community@7.0
brew services start mongodb-community@7.0

# Ubuntu
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

# Windows
# Download from: https://www.mongodb.com/try/download/community
```

#### Redis

```bash
# macOS
brew install redis
brew services start redis

# Ubuntu
sudo apt-get install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Windows (using WSL2 or download Windows port)
# WSL2: sudo apt-get install redis-server
# Or download from: https://github.com/microsoftarchive/redis/releases
```

#### Python and Dependencies

```bash
# Install Python 3.11
# macOS
brew install python@3.11

# Ubuntu
sudo apt-get install python3.11 python3.11-venv python3.11-dev

# Windows
# Download from: https://www.python.org/downloads/

# Verify installation
python3.11 --version

# Install pip and virtualenv
python3.11 -m pip install --upgrade pip
python3.11 -m pip install virtualenv
```

## Installation Steps

### 1. Clone the Repository

```bash
# Clone the repository
git clone https://github.com/your-org/kitchenxpert.git
cd kitchenxpert

# Verify you're in the correct directory
ls -la
# Should see: packages/, config/, docs/, catalog-providers/, etc.
```

### 2. Install Node.js Dependencies

```bash
# Install all workspace dependencies
pnpm install

# This will install dependencies for:
# - Root workspace
# - packages/backend
# - packages/frontend
# - packages/3d-engine
# - packages/partner-portal
# - catalog-providers/*
```

**Expected output:**

```
Progress: resolved 2847, reused 2654, downloaded 193, added 2847, done
Done in 45.3s
```

### 3. Set Up Python Virtual Environment

```bash
# Navigate to AI modules
cd packages/ai-modules

# Create virtual environment
python3.11 -m venv venv

# Activate virtual environment
# macOS/Linux
source venv/bin/activate

# Windows
.\venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Install development dependencies
pip install -r requirements-dev.txt

# Return to project root
cd ../..
```

### 4. Verify Installation

```bash
# Check Node.js version
node --version  # Should be v20.x.x

# Check pnpm version
pnpm --version  # Should be 8.x.x

# Check Python version
python --version  # Should be Python 3.11.x

# Verify databases are running
psql --version  # PostgreSQL 15.x
mongod --version  # MongoDB 7.0.x
redis-cli --version  # Redis 7.x.x
```

## IDE Setup

### Visual Studio Code (Recommended)

VS Code is the recommended IDE for KitchenXpert development due to excellent
TypeScript, React, and Python support.

#### Required Extensions

Install these extensions for the best development experience:

```bash
# Install via command line
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension humao.rest-client
code --install-extension ms-python.python
code --install-extension ms-python.vscode-pylance
code --install-extension bradlc.vscode-tailwindcss
code --install-extension prisma.prisma
code --install-extension mongodb.mongodb-vscode
code --install-extension ms-azuretools.vscode-docker
```

#### Extension Details

| Extension                 | Purpose                       |
| ------------------------- | ----------------------------- |
| ESLint                    | JavaScript/TypeScript linting |
| Prettier                  | Code formatting               |
| TypeScript                | Enhanced TypeScript support   |
| REST Client               | API testing from .http files  |
| Python                    | Python language support       |
| Pylance                   | Python type checking          |
| Tailwind CSS IntelliSense | CSS class autocompletion      |
| Prisma                    | Database schema support       |
| MongoDB                   | MongoDB query support         |
| Docker                    | Container management          |

#### Workspace Settings

Create `.vscode/settings.json` in project root:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "files.associations": {
    "*.css": "tailwindcss"
  },
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["cx\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ],
  "[python]": {
    "editor.defaultFormatter": "ms-python.black-formatter",
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.organizeImports": true
    }
  },
  "python.linting.enabled": true,
  "python.linting.pylintEnabled": true,
  "python.linting.flake8Enabled": true,
  "python.formatting.provider": "black",
  "python.testing.pytestEnabled": true,
  "python.testing.unittestEnabled": false,
  "files.exclude": {
    "**/.git": true,
    "**/.DS_Store": true,
    "**/node_modules": true,
    "**/__pycache__": true,
    "**/.pytest_cache": true,
    "**/dist": true,
    "**/build": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/build": true,
    "**/.next": true,
    "**/coverage": true
  }
}
```

#### Recommended VS Code Extensions (Optional)

```bash
# Git enhancements
code --install-extension eamodio.gitlens

# GitHub integration
code --install-extension github.vscode-pull-request-github

# Error highlighting
code --install-extension usernamehw.errorlens

# Import cost analysis
code --install-extension wix.vscode-import-cost

# Path intellisense
code --install-extension christian-kohler.path-intellisense

# TODO highlighting
code --install-extension wayou.vscode-todo-highlight
```

### Alternative IDEs

#### WebStorm

If using WebStorm/IntelliJ IDEA:

1. Enable TypeScript support in Settings → Languages & Frameworks → TypeScript
2. Set up ESLint: Settings → Languages & Frameworks → JavaScript → Code Quality
   Tools → ESLint
3. Configure Prettier: Settings → Languages & Frameworks → JavaScript → Prettier
4. Enable Node.js coding assistance

#### Cursor / Other VS Code Forks

Same configuration as VS Code applies to Cursor and other VS Code-based editors.

## Environment Configuration

### Creating .env Files

KitchenXpert uses multiple `.env` files for different parts of the application:

```bash
# Create environment files from templates
cp packages/backend/.env.example packages/backend/.env
cp packages/frontend/.env.example packages/frontend/.env
cp packages/ai-modules/.env.example packages/ai-modules/.env
cp packages/partner-portal/.env.example packages/partner-portal/.env
```

### Backend Environment Variables

Edit `packages/backend/.env`:

```env
# Application
NODE_ENV=development
PORT=3000
API_VERSION=v1
LOG_LEVEL=debug

# Database - PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=kitchenxpert_dev
POSTGRES_USER=kitchenxpert_user
POSTGRES_PASSWORD=dev_password_change_in_production
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}

# Database - MongoDB
MONGODB_URI=mongodb://localhost:27017/kitchenxpert_dev
MONGODB_DB_NAME=kitchenxpert_dev

# Redis Cache
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_URL=redis://${REDIS_HOST}:${REDIS_PORT}/${REDIS_DB}

# Session & Security
SESSION_SECRET=dev_session_secret_min_32_chars_change_in_production
JWT_SECRET=dev_jwt_secret_min_32_chars_change_in_production
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d
BCRYPT_ROUNDS=10

# CORS
CORS_ORIGIN=http://localhost:5173,http://localhost:5174
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174

# File Storage - AWS S3 (use LocalStack for development)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_S3_BUCKET=kitchenxpert-dev
AWS_ENDPOINT=http://localhost:4566
USE_LOCAL_STORAGE=true

# Email Service (use MailHog for development)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=noreply@kitchenxpert.dev
EMAIL_ENABLED=true

# AI Service
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_API_KEY=dev_ai_api_key

# Payment Gateway (Stripe - use test keys)
STRIPE_SECRET_KEY=sk_test_51xxxxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_51xxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxx

# External APIs
GOOGLE_API_KEY=
MAPBOX_ACCESS_TOKEN=

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Feature Flags
ENABLE_AI_RECOMMENDATIONS=true
ENABLE_3D_PREVIEW=true
ENABLE_CATALOG_IMPORT=true
ENABLE_PARTNER_PORTAL=true

# Monitoring & Analytics
SENTRY_DSN=
ANALYTICS_ENABLED=false
```

### Frontend Environment Variables

Edit `packages/frontend/.env`:

```env
# API Configuration
VITE_API_URL=http://localhost:3000/api/v1
VITE_API_TIMEOUT=30000

# WebSocket
VITE_WS_URL=ws://localhost:3000

# AI Service
VITE_AI_SERVICE_URL=http://localhost:8000

# Authentication
VITE_AUTH_COOKIE_NAME=kitchenxpert_session
VITE_AUTH_STORAGE_KEY=kitchenxpert_auth

# File Upload
VITE_MAX_FILE_SIZE=10485760
VITE_ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/webp
VITE_ALLOWED_3D_TYPES=model/gltf-binary,model/gltf+json

# 3D Engine
VITE_3D_MAX_TEXTURES=50
VITE_3D_ENABLE_SHADOWS=true
VITE_3D_ENABLE_ANTIALIASING=true

# Feature Flags
VITE_ENABLE_AI_CHAT=true
VITE_ENABLE_AR_VIEW=false
VITE_ENABLE_SOCIAL_SHARE=true

# Analytics
VITE_GA_MEASUREMENT_ID=
VITE_ANALYTICS_ENABLED=false

# Maps
VITE_MAPBOX_ACCESS_TOKEN=

# Environment
VITE_ENV=development
VITE_APP_VERSION=0.1.0
```

### AI Modules Environment Variables

Edit `packages/ai-modules/.env`:

```env
# Application
ENVIRONMENT=development
LOG_LEVEL=DEBUG
API_PORT=8000

# Database
MONGODB_URI=mongodb://localhost:27017/kitchenxpert_dev

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=1

# Model Configuration
MODEL_PATH=/app/models
CACHE_DIR=/app/cache
MAX_WORKERS=4

# AI Models
DESIGN_MODEL_NAME=kitchen-design-v1
RECOMMENDATION_MODEL_NAME=appliance-recommendation-v1
IMAGE_RECOGNITION_MODEL_NAME=kitchen-detection-v1

# API Keys (for external AI services if needed)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Model Parameters
MAX_DESIGN_GENERATION_TIME=30
MAX_BATCH_SIZE=10
ENABLE_GPU=false

# Feature Flags
ENABLE_DESIGN_GENERATION=true
ENABLE_APPLIANCE_RECOMMENDATION=true
ENABLE_IMAGE_ANALYSIS=true
```

### Partner Portal Environment Variables

Edit `packages/partner-portal/.env`:

```env
# API Configuration
VITE_API_URL=http://localhost:3000/api/v1/partner
VITE_MAIN_APP_URL=http://localhost:5173

# Authentication
VITE_AUTH_COOKIE_NAME=kitchenxpert_partner_session

# Feature Flags
VITE_ENABLE_CATALOG_UPLOAD=true
VITE_ENABLE_ANALYTICS_DASHBOARD=true
VITE_ENABLE_BULK_OPERATIONS=true

# Environment
VITE_ENV=development
```

## Database Setup

### PostgreSQL Setup

#### Create Database and User

```bash
# Connect to PostgreSQL
psql -U postgres

# Create user
CREATE USER kitchenxpert_user WITH PASSWORD 'dev_password_change_in_production';

# Create database
CREATE DATABASE kitchenxpert_dev OWNER kitchenxpert_user;

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE kitchenxpert_dev TO kitchenxpert_user;

# Exit psql
\q
```

#### Run Migrations

```bash
# Navigate to backend
cd packages/backend

# Run database migrations
pnpm db:migrate

# Seed database with sample data
pnpm db:seed

# Verify database setup
pnpm db:status
```

#### Database Schema Overview

The PostgreSQL database includes these main tables:

- `users` - User accounts and authentication
- `profiles` - User profiles and preferences
- `designs` - Kitchen design metadata
- `products` - Catalog products (appliances, cabinets, etc.)
- `categories` - Product categorization
- `manufacturers` - Product manufacturers
- `orders` - Purchase orders
- `reviews` - Product reviews
- `favorites` - User favorites and wishlists
- `sessions` - User sessions

### MongoDB Setup

```bash
# Connect to MongoDB
mongosh

# Switch to database
use kitchenxpert_dev

# Create collections with validation
db.createCollection("designs", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["userId", "name", "data"],
      properties: {
        userId: { bsonType: "string" },
        name: { bsonType: "string" },
        data: { bsonType: "object" }
      }
    }
  }
})

# Create indexes
db.designs.createIndex({ userId: 1 })
db.designs.createIndex({ createdAt: -1 })

# Exit mongosh
exit
```

#### MongoDB Collections

- `designs` - 3D design data and configurations
- `design_snapshots` - Design version history
- `ai_generations` - AI-generated design data
- `user_preferences` - User AI preferences and history

### Redis Setup

```bash
# Test Redis connection
redis-cli ping
# Should return: PONG

# Check Redis info
redis-cli info
```

Redis is used for:

- Session storage
- API response caching
- Rate limiting counters
- Real-time design collaboration
- Job queue (Bull)

### Database Management Commands

```bash
# PostgreSQL
pnpm db:migrate          # Run pending migrations
pnpm db:migrate:rollback # Rollback last migration
pnpm db:migrate:status   # Check migration status
pnpm db:seed             # Seed database
pnpm db:reset            # Drop, migrate, and seed
pnpm db:studio           # Open Prisma Studio

# MongoDB
pnpm mongo:seed          # Seed MongoDB collections
pnpm mongo:reset         # Reset MongoDB database
```

## Running in Development Mode

### Starting All Services

Using the convenience script:

```bash
# Start all services (recommended for development)
pnpm dev

# This starts:
# - Backend API (port 3000)
# - Frontend dev server (port 5173)
# - Partner Portal (port 5174)
# - AI modules (port 8000)
```

### Starting Services Individually

```bash
# Terminal 1: Backend API
cd packages/backend
pnpm dev
# Starts on http://localhost:3000

# Terminal 2: Frontend
cd packages/frontend
pnpm dev
# Starts on http://localhost:5173

# Terminal 3: Partner Portal
cd packages/partner-portal
pnpm dev
# Starts on http://localhost:5174

# Terminal 4: AI Modules
cd packages/ai-modules
source venv/bin/activate  # or .\venv\Scripts\activate on Windows
uvicorn app.main:app --reload --port 8000
# Starts on http://localhost:8000
```

### Using Docker Compose (Alternative)

```bash
# Start all services with Docker
docker-compose -f config/docker/docker-compose.dev.yml up

# Start specific services
docker-compose -f config/docker/docker-compose.dev.yml up backend frontend

# Stop all services
docker-compose -f config/docker/docker-compose.dev.yml down

# View logs
docker-compose -f config/docker/docker-compose.dev.yml logs -f backend
```

### Verifying Services

```bash
# Check backend health
curl http://localhost:3000/health

# Check frontend
curl http://localhost:5173

# Check AI service
curl http://localhost:8000/health

# Check partner portal
curl http://localhost:5174
```

## Hot Reload Configuration

### Backend Hot Reload

The backend uses `tsx` with watch mode for hot reloading:

```json
// packages/backend/package.json
{
  "scripts": {
    "dev": "tsx watch --clear-screen=false src/index.ts"
  }
}
```

Configuration in `packages/backend/nodemon.json`:

```json
{
  "watch": ["src"],
  "ext": "ts,json",
  "ignore": ["src/**/*.test.ts", "node_modules"],
  "exec": "tsx src/index.ts",
  "env": {
    "NODE_ENV": "development"
  }
}
```

### Frontend Hot Reload

Vite provides built-in HMR (Hot Module Replacement):

```typescript
// packages/frontend/vite.config.ts
export default defineConfig({
  server: {
    port: 5173,
    hmr: {
      overlay: true,
    },
    watch: {
      usePolling: false,
    },
  },
});
```

### AI Modules Hot Reload

FastAPI with `--reload` flag automatically reloads on file changes:

```bash
uvicorn app.main:app --reload --port 8000
```

## Debugging Setup

### VS Code Launch Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["dev"],
      "cwd": "${workspaceFolder}/packages/backend",
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen",
      "skipFiles": ["<node_internals>/**"],
      "env": {
        "NODE_ENV": "development"
      }
    },
    {
      "type": "chrome",
      "request": "launch",
      "name": "Debug Frontend (Chrome)",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}/packages/frontend/src",
      "sourceMapPathOverrides": {
        "webpack:///src/*": "${webRoot}/*"
      }
    },
    {
      "type": "python",
      "request": "launch",
      "name": "Debug AI Modules",
      "module": "uvicorn",
      "args": ["app.main:app", "--reload", "--port", "8000"],
      "cwd": "${workspaceFolder}/packages/ai-modules",
      "env": {
        "PYTHONPATH": "${workspaceFolder}/packages/ai-modules"
      },
      "jinja": true
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Jest Tests",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand", "--no-cache"],
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ],
  "compounds": [
    {
      "name": "Debug Full Stack",
      "configurations": ["Debug Backend", "Debug Frontend (Chrome)"],
      "stopAll": true
    }
  ]
}
```

### Chrome DevTools Setup

1. Open Chrome DevTools (F12)
2. Go to Sources tab
3. Add workspace folder: Right-click → Add folder to workspace
4. Select `packages/frontend/src`
5. Allow access when prompted
6. Set breakpoints directly in DevTools

### Backend Debugging

```bash
# Using Node.js inspector
node --inspect-brk -r tsx/cjs packages/backend/src/index.ts

# Open chrome://inspect in Chrome
# Click "inspect" on your Node.js process
```

### Database Debugging

```bash
# Enable query logging in PostgreSQL
# Edit postgresql.conf:
log_statement = 'all'
log_duration = on

# Or use Prisma logging
// packages/backend/src/db/client.ts
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error']
})
```

## Troubleshooting

### Common Issues and Solutions

#### Port Already in Use

```bash
# Find process using port
# macOS/Linux
lsof -i :3000
kill -9 <PID>

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or change port in .env
PORT=3001
```

#### Database Connection Failed

```bash
# Check if PostgreSQL is running
# macOS
brew services list | grep postgresql

# Linux
sudo systemctl status postgresql

# Windows
# Check Services app for PostgreSQL

# Test connection
psql -U kitchenxpert_user -d kitchenxpert_dev -h localhost

# Check environment variables
echo $DATABASE_URL
```

#### pnpm install Fails

```bash
# Clear pnpm cache
pnpm store prune

# Remove node_modules and lockfile
rm -rf node_modules pnpm-lock.yaml

# Reinstall
pnpm install

# If still failing, check Node.js version
node --version  # Should be 20.x
```

#### Python Virtual Environment Issues

```bash
# Delete and recreate venv
cd packages/ai-modules
rm -rf venv
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

#### TypeScript Errors in IDE

```bash
# Restart TypeScript server in VS Code
# Ctrl+Shift+P (Cmd+Shift+P on macOS)
# Type: TypeScript: Restart TS Server

# Ensure workspace TypeScript is used
# Check .vscode/settings.json has:
# "typescript.tsdk": "node_modules/typescript/lib"
```

#### Hot Reload Not Working

```bash
# Frontend - Clear Vite cache
rm -rf packages/frontend/node_modules/.vite

# Backend - Check file watchers limit (Linux)
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

#### MongoDB Connection Issues

```bash
# Check MongoDB status
mongosh --eval "db.adminCommand('ping')"

# Check if MongoDB is running
# macOS
brew services list | grep mongodb

# Linux
sudo systemctl status mongod

# Start MongoDB
brew services start mongodb-community@7.0  # macOS
sudo systemctl start mongod  # Linux
```

#### Redis Connection Issues

```bash
# Test Redis
redis-cli ping

# Check if running
# macOS
brew services list | grep redis

# Linux
sudo systemctl status redis-server

# Start Redis
brew services start redis  # macOS
sudo systemctl start redis-server  # Linux
```

#### Build Fails

```bash
# Clear build artifacts
pnpm clean

# Remove all node_modules
pnpm clean:all

# Reinstall and rebuild
pnpm install
pnpm build

# Check for TypeScript errors
pnpm type-check
```

#### Memory Issues (3D Engine)

```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Add to package.json scripts
"dev": "NODE_OPTIONS='--max-old-space-size=4096' vite"
```

### Getting Help

If you encounter issues not covered here:

1. Check existing
   [GitHub Issues](https://github.com/your-org/kitchenxpert/issues)
2. Search [Discussions](https://github.com/your-org/kitchenxpert/discussions)
3. Ask in team Slack channel: #kitchenxpert-dev
4. Create a new issue with:
   - Steps to reproduce
   - Environment details (OS, Node version, etc.)
   - Error messages and logs
   - Screenshots if applicable

### Useful Debug Commands

```bash
# Check all service health
pnpm health-check

# View all environment variables
pnpm env:check

# Validate configuration
pnpm validate:config

# Check database connectivity
pnpm db:ping

# View logs
pnpm logs:backend
pnpm logs:frontend
pnpm logs:ai

# System diagnostics
pnpm diagnostics
```

## Next Steps

Now that your development environment is set up:

1. Read [Getting Started for Developers](./getting-started.md)
2. Review [Coding Standards](./coding-standards.md)
3. Understand [Git Workflow](./git-workflow.md)
4. Learn about [Testing](./testing.md)
5. Make your first contribution!

## Related Documentation

- [Installation Guide](../../INSTALLATION.md) - User installation instructions
- [Architecture Overview](../architecture/overview.md) - System architecture
- [API Documentation](../api/overview.md) - API reference
- [Database Schema](../database/schema.md) - Database structure
- [Contributing Guide](../../CONTRIBUTING.md) - Contribution guidelines
