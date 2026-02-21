# KitchenXpert - Installation Guide

**Complete installation instructions for all platforms**

Last Updated: 2026-01-10

## Table of Contents

- [System Requirements](#system-requirements)
- [Prerequisites Installation](#prerequisites-installation)
- [Environment Setup](#environment-setup)
- [Database Initialization](#database-initialization)
- [First Run](#first-run)
- [Verification Steps](#verification-steps)
- [Docker Alternative](#docker-alternative)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

## System Requirements

### Minimum Requirements

- **Operating System**: Windows 10+, macOS 12+, Linux (Ubuntu 20.04+)
- **CPU**: 2 cores (4 cores recommended)
- **RAM**: 4 GB (8 GB recommended)
- **Storage**: 10 GB free space
- **Network**: Broadband internet connection

### Software Requirements

- **Node.js**: 20.x LTS or higher
- **PostgreSQL**: 15.x or higher
- **Redis**: 7.x or higher
- **MongoDB**: 7.x or higher
- **Git**: 2.x or higher
- **Python**: 3.11+ (for AI modules)

### Optional Requirements

- **Docker**: 24.x+ and Docker Compose 2.x+ (for containerized deployment)
- **CUDA**: 11.8+ (for GPU-accelerated AI features)
- **Nginx**: 1.24+ (for production proxy)

## Prerequisites Installation

### Node.js Installation

#### Windows
```bash
# Download and install from official website
# https://nodejs.org/

# Or using Chocolatey
choco install nodejs-lts

# Verify installation
node --version  # Should be v20.x.x or higher
npm --version
```

#### macOS
```bash
# Using Homebrew
brew install node@20

# Verify installation
node --version
npm --version
```

#### Linux (Ubuntu/Debian)
```bash
# Using NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### PostgreSQL Installation

#### Windows
```bash
# Download installer from postgresql.org
# Or using Chocolatey
choco install postgresql15

# Start service
net start postgresql-x64-15
```

#### macOS
```bash
# Using Homebrew
brew install postgresql@15
brew services start postgresql@15

# Verify installation
psql --version
```

#### Linux (Ubuntu/Debian)
```bash
# Install PostgreSQL
sudo apt-get update
sudo apt-get install -y postgresql-15 postgresql-contrib-15

# Start service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify installation
psql --version
```

### Redis Installation

#### Windows
```bash
# Download from GitHub releases or use WSL
# Or using Docker (recommended)
docker run -d -p 6379:6379 --name redis redis:7-alpine
```

#### macOS
```bash
# Using Homebrew
brew install redis
brew services start redis

# Verify installation
redis-cli ping  # Should return PONG
```

#### Linux (Ubuntu/Debian)
```bash
# Install Redis
sudo apt-get install -y redis-server

# Start service
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verify installation
redis-cli ping
```

### MongoDB Installation

#### Windows
```bash
# Download installer from mongodb.com
# Or using Chocolatey
choco install mongodb

# Start service
net start MongoDB
```

#### macOS
```bash
# Using Homebrew
brew tap mongodb/brew
brew install mongodb-community@7.0
brew services start mongodb-community@7.0

# Verify installation
mongosh --version
```

#### Linux (Ubuntu/Debian)
```bash
# Import MongoDB public GPG key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Create list file
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
   sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Install MongoDB
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start service
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify installation
mongosh --version
```

### Python Installation (for AI modules)

#### All Platforms
```bash
# Download from python.org or use package manager

# Verify installation
python --version  # Should be 3.11 or higher
pip --version

# Install virtual environment
pip install virtualenv
```

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/kitchenxpert/kitchenxpert.git
cd kitchenxpert
```

### 2. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install Python dependencies for AI modules
cd services/ai-service
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install requirements
pip install -r requirements.txt
cd ../..
```

### 3. Configure Environment Variables

```bash
# Copy environment template
cp .env.example .env
```

Edit `.env` file with your configuration:

```bash
# Application
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
API_URL=http://localhost:3000

# Database - PostgreSQL
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/kitchenxpert
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# Database - MongoDB
MONGODB_URL=mongodb://localhost:27017/kitchenxpert
MONGODB_DB_NAME=kitchenxpert

# Cache - Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
REDIS_DB=0

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_EXPIRES_IN=7d

# OAuth2 (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
OAUTH_CALLBACK_URL=http://localhost:3000/api/v1/auth/callback

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_PREMIUM_MAX=1000

# AI Service
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_API_KEY=your-ai-service-api-key
ENABLE_GPU=false

# File Storage
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/webp,model/gltf+json

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@kitchenxpert.com

# Monitoring (optional)
SENTRY_DSN=your-sentry-dsn
ENABLE_LOGGING=true
LOG_LEVEL=info

# Security
CORS_ORIGIN=http://localhost:5173
SESSION_SECRET=your-session-secret-change-this
ENCRYPTION_KEY=your-32-character-encryption-key

# Feature Flags
ENABLE_AI_FEATURES=true
ENABLE_WEBHOOKS=true
ENABLE_ANALYTICS=true
```

### 4. Generate Secrets

For production, generate secure secrets:

```bash
# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate session secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate encryption key (32 characters)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Database Initialization

### 1. Create Databases

#### PostgreSQL
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database and user
CREATE DATABASE kitchenxpert;
CREATE USER kitchenxpert_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE kitchenxpert TO kitchenxpert_user;

# Exit
\q
```

#### MongoDB
```bash
# MongoDB databases are created automatically on first use
# Optional: Create with authentication

mongosh

use kitchenxpert
db.createUser({
  user: "kitchenxpert_user",
  pwd: "your_password",
  roles: [{ role: "readWrite", db: "kitchenxpert" }]
})
```

### 2. Run Migrations

```bash
# Run database migrations
npm run db:migrate

# Seed initial data (optional)
npm run db:seed
```

### 3. Verify Database Setup

```bash
# Check PostgreSQL connection
npm run db:check

# Expected output:
# ✓ PostgreSQL connected successfully
# ✓ Database: kitchenxpert
# ✓ Tables: 15
```

## First Run

### 1. Start Development Server

```bash
# Start all services in development mode
npm run dev
```

This will start:
- Frontend dev server on http://localhost:5173
- Backend API server on http://localhost:3000
- AI service on http://localhost:8000 (if configured)

### 2. Start Services Individually

```bash
# Terminal 1: Start backend
npm run dev:backend

# Terminal 2: Start frontend
npm run dev:frontend

# Terminal 3: Start AI service (optional)
cd services/ai-service
source venv/bin/activate  # or venv\Scripts\activate on Windows
python main.py
```

### 3. Build for Production

```bash
# Build frontend and backend
npm run build

# Start production server
npm start
```

## Verification Steps

### 1. Health Check

```bash
# Check API health
curl http://localhost:3000/api/v1/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2026-01-10T12:00:00.000Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "mongodb": "connected"
  }
}
```

### 2. Test Authentication

```bash
# Register a new user
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "name": "Test User"
  }'

# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!"
  }'
```

### 3. Access API Documentation

Open browser and navigate to:
- Swagger UI: http://localhost:3000/api-docs
- ReDoc: http://localhost:3000/api/redoc

### 4. Access Frontend

Open browser and navigate to:
- http://localhost:5173

You should see the KitchenXpert landing page.

## Docker Alternative

For easier setup, use Docker:

### 1. Install Docker

Download and install Docker Desktop from https://www.docker.com/products/docker-desktop

### 2. Start with Docker Compose

```bash
# Clone repository
git clone https://github.com/kitchenxpert/kitchenxpert.git
cd kitchenxpert

# Copy environment file
cp .env.example .env

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Initialize databases
docker-compose exec api npm run db:setup
```

### 3. Docker Services

Docker Compose will start:
- PostgreSQL on port 5432
- MongoDB on port 27017
- Redis on port 6379
- API server on port 3000
- Frontend on port 5173
- AI service on port 8000

### 4. Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes all data)
docker-compose down -v
```

## Production Deployment

### Prerequisites

- SSL certificate (Let's Encrypt recommended)
- Domain name configured
- Production database servers
- CDN for static assets (optional)

### 1. Environment Configuration

Update `.env` for production:

```bash
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://app.kitchenxpert.com
API_URL=https://api.kitchenxpert.com

# Use production database URLs
DATABASE_URL=postgresql://user:pass@prod-db.example.com:5432/kitchenxpert
MONGODB_URL=mongodb://user:pass@prod-mongo.example.com:27017/kitchenxpert
REDIS_URL=redis://user:pass@prod-redis.example.com:6379

# Production secrets (use strong random values)
JWT_SECRET=<generated-secret>
SESSION_SECRET=<generated-secret>
ENCRYPTION_KEY=<generated-key>

# Enable security features
CORS_ORIGIN=https://app.kitchenxpert.com
ENABLE_LOGGING=true
LOG_LEVEL=warn

# Enable monitoring
SENTRY_DSN=https://your-sentry-dsn
```

### 2. Build Production Bundle

```bash
# Install production dependencies only
npm ci --production

# Build application
npm run build

# Optimize and compress
npm run build:optimize
```

### 3. Nginx Configuration

```nginx
# /etc/nginx/sites-available/kitchenxpert

upstream api_backend {
    server localhost:3000;
}

server {
    listen 80;
    server_name api.kitchenxpert.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.kitchenxpert.com;

    ssl_certificate /etc/letsencrypt/live/kitchenxpert.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/kitchenxpert.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # API proxy
    location /api {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4. Process Manager (PM2)

```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup startup script
pm2 startup
```

### 5. Monitoring Setup

```bash
# PM2 monitoring
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M

# Health checks
pm2 install pm2-auto-pull
```

## Troubleshooting

### Database Connection Issues

**Problem**: Cannot connect to PostgreSQL

**Solution**:
```bash
# Check if PostgreSQL is running
# Windows:
sc query postgresql-x64-15

# macOS/Linux:
sudo systemctl status postgresql

# Check connection string
psql "postgresql://user:password@localhost:5432/kitchenxpert"

# Check firewall rules
# Ensure port 5432 is open
```

### Port Conflicts

**Problem**: Port 3000 already in use

**Solution**:
```bash
# Find process using port
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux:
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run dev
```

### Module Installation Errors

**Problem**: npm install fails

**Solution**:
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Use specific Node version
nvm use 20
npm install
```

### Memory Issues

**Problem**: JavaScript heap out of memory

**Solution**:
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build

# Or in package.json scripts:
"build": "node --max-old-space-size=4096 scripts/build.js"
```

### Permission Errors

**Problem**: EACCES permission denied

**Solution**:
```bash
# Fix npm permissions (Linux/macOS)
sudo chown -R $USER:$GROUP ~/.npm
sudo chown -R $USER:$GROUP ~/.config

# Or use nvm instead of system Node.js
```

---

**Installation complete!** Continue with the [Quick Start Guide](./QUICKSTART.md) or explore the [API Documentation](./docs/api/api-overview.md).

For additional help, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) or contact support@kitchenxpert.com.
