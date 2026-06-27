# Deployment Guide

**Last Updated:** 2026-01-10

## Table of Contents

- [Overview](#overview)
- [Deployment Environments](#deployment-environments)
- [Prerequisites](#prerequisites)
- [Docker Deployment](#docker-deployment)
- [Environment Variables](#environment-variables)
- [Database Migrations](#database-migrations)
- [Build Process](#build-process)
- [Deployment Checklist](#deployment-checklist)
- [Deployment Strategies](#deployment-strategies)
- [Health Checks and Monitoring](#health-checks-and-monitoring)
- [CI/CD Pipeline](#cicd-pipeline)
- [Rollback Procedures](#rollback-procedures)
- [Troubleshooting](#troubleshooting)

## Overview

KitchenXpert uses a containerized deployment strategy with Docker and
Kubernetes, supported by automated CI/CD pipelines through GitHub Actions.

### Deployment Architecture

```
┌─────────────────────────────────────────────┐
│              Load Balancer                   │
│         (AWS ALB / Nginx Ingress)            │
└──────────────────┬──────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
  ┌─────▼─────┐        ┌─────▼─────┐
  │ Frontend  │        │  Backend  │
  │ (Static)  │        │   API     │
  └───────────┘        └─────┬─────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
  ┌─────▼─────┐      ┌──────▼─────┐      ┌──────▼─────┐
  │PostgreSQL │      │  MongoDB   │      │   Redis    │
  │    RDS    │      │   Atlas    │      │ElastiCache │
  └───────────┘      └────────────┘      └────────────┘
```

## Deployment Environments

### Development (dev)

- **Purpose**: Local development and testing
- **URL**: http://localhost:\*
- **Database**: Local PostgreSQL, MongoDB, Redis
- **Features**: All features enabled, debug logging
- **Auto-deploy**: No

### Staging (staging)

- **Purpose**: Pre-production testing and QA
- **URL**: https://staging.kitchenxpert.com
- **Database**: Staging databases (separate from production)
- **Features**: All features enabled, verbose logging
- **Auto-deploy**: Yes, on push to `develop` branch
- **Data**: Anonymized production data snapshot

### Production (prod)

- **Purpose**: Live application serving end users
- **URL**: https://kitchenxpert.com
- **Database**: Production databases with backups
- **Features**: Stable features only, error logging
- **Auto-deploy**: No, manual approval required
- **Monitoring**: Full monitoring and alerting

## Prerequisites

### Required Tools

```bash
# Docker and Docker Compose
docker --version  # 24.0+
docker-compose --version  # 2.20+

# Kubernetes CLI (for production deployments)
kubectl version --client  # 1.28+

# AWS CLI (if deploying to AWS)
aws --version  # 2.13+

# GitHub CLI (for CI/CD management)
gh --version  # 2.35+
```

### Access Requirements

- AWS account with appropriate IAM roles
- Docker Hub or container registry access
- GitHub repository access with deployment permissions
- Database credentials for each environment
- SSL certificates for HTTPS

## Docker Deployment

### Development Environment

#### Using Docker Compose

```bash
# Build and start all services
docker-compose -f config/docker/docker-compose.dev.yml up --build

# Start specific services
docker-compose -f config/docker/docker-compose.dev.yml up backend frontend

# Run in detached mode
docker-compose -f config/docker/docker-compose.dev.yml up -d

# View logs
docker-compose -f config/docker/docker-compose.dev.yml logs -f

# Stop services
docker-compose -f config/docker/docker-compose.dev.yml down

# Stop and remove volumes
docker-compose -f config/docker/docker-compose.dev.yml down -v
```

#### Docker Compose Configuration

`config/docker/docker-compose.dev.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: kitchenxpert_dev
      POSTGRES_USER: kitchenxpert_user
      POSTGRES_PASSWORD: dev_password
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U kitchenxpert_user']
      interval: 10s
      timeout: 5s
      retries: 5

  mongodb:
    image: mongo:7.0
    environment:
      MONGO_INITDB_DATABASE: kitchenxpert_dev
    ports:
      - '27017:27017'
    volumes:
      - mongodb_data:/data/db
    healthcheck:
      test: ['CMD', 'mongosh', '--eval', "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ../..
      dockerfile: packages/backend/Dockerfile
      target: development
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://kitchenxpert_user:dev_password@postgres:5432/kitchenxpert_dev
      - MONGODB_URI=mongodb://mongodb:27017/kitchenxpert_dev
      - REDIS_URL=redis://redis:6379
    volumes:
      - ../../packages/backend/src:/app/src
      - /app/node_modules
    depends_on:
      postgres:
        condition: service_healthy
      mongodb:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: pnpm dev

  frontend:
    build:
      context: ../..
      dockerfile: packages/frontend/Dockerfile
      target: development
    ports:
      - '5173:5173'
    environment:
      - VITE_API_URL=http://localhost:3000/api/v1
    volumes:
      - ../../packages/frontend/src:/app/src
      - /app/node_modules
    depends_on:
      - backend
    command: pnpm dev

  ai-modules:
    build:
      context: ../../packages/ai-modules
      dockerfile: Dockerfile
    ports:
      - '8000:8000'
    environment:
      - ENVIRONMENT=development
      - MONGODB_URI=mongodb://mongodb:27017/kitchenxpert_dev
      - REDIS_HOST=redis
    volumes:
      - ../../packages/ai-modules/app:/app/app
    depends_on:
      - mongodb
      - redis
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

volumes:
  postgres_data:
  mongodb_data:
  redis_data:
```

### Production Deployment

#### Multi-stage Dockerfile (Backend)

`packages/backend/Dockerfile`:

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/backend/package.json ./packages/backend/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/backend ./packages/backend

# Build
WORKDIR /app/packages/backend
RUN pnpm build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/backend/package.json ./packages/backend/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built files from builder
COPY --from=builder /app/packages/backend/dist ./packages/backend/dist
COPY --from=builder /app/packages/backend/prisma ./packages/backend/prisma

# Generate Prisma client
WORKDIR /app/packages/backend
RUN pnpm prisma generate

# Set user
USER node

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/index.js"]
```

#### Multi-stage Dockerfile (Frontend)

`packages/frontend/Dockerfile`:

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/frontend/package.json ./packages/frontend/
COPY packages/3d-engine/package.json ./packages/3d-engine/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/frontend ./packages/frontend
COPY packages/3d-engine ./packages/3d-engine

# Build
WORKDIR /app/packages/frontend
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm build

# Production stage - Nginx
FROM nginx:alpine AS production

# Copy custom nginx config
COPY config/nginx/nginx.conf /etc/nginx/nginx.conf
COPY config/nginx/default.conf /etc/nginx/conf.d/default.conf

# Copy built files
COPY --from=builder /app/packages/frontend/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

#### AI Modules Dockerfile

`packages/ai-modules/Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt requirements-dev.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY app ./app
COPY models ./models

# Create non-root user
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:8000/health')"

# Start application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Building Docker Images

```bash
# Build all images
docker-compose -f config/docker/docker-compose.prod.yml build

# Build specific image
docker build -t kitchenxpert/backend:latest -f packages/backend/Dockerfile .

# Build with build args
docker build \
  --build-arg VITE_API_URL=https://api.kitchenxpert.com \
  -t kitchenxpert/frontend:latest \
  -f packages/frontend/Dockerfile .

# Tag for registry
docker tag kitchenxpert/backend:latest registry.example.com/kitchenxpert/backend:v1.0.0

# Push to registry
docker push registry.example.com/kitchenxpert/backend:v1.0.0
```

## Environment Variables

### Staging Environment

```env
# Application
NODE_ENV=staging
PORT=3000
API_VERSION=v1
LOG_LEVEL=info

# Database - PostgreSQL
DATABASE_URL=postgresql://user:pass@staging-db.example.com:5432/kitchenxpert_staging

# Database - MongoDB
MONGODB_URI=mongodb+srv://user:pass@staging-cluster.mongodb.net/kitchenxpert_staging

# Redis
REDIS_URL=redis://staging-redis.example.com:6379

# Security
SESSION_SECRET=<64-char-random-string>
JWT_SECRET=<64-char-random-string>

# AWS S3
AWS_REGION=us-east-1
AWS_S3_BUCKET=kitchenxpert-staging-assets
USE_LOCAL_STORAGE=false

# Email
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=<sendgrid-api-key>
EMAIL_ENABLED=true

# AI Service
AI_SERVICE_URL=https://ai-staging.kitchenxpert.com

# Stripe (test mode)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# Monitoring
SENTRY_DSN=<sentry-dsn>
ANALYTICS_ENABLED=true
```

### Production Environment

```env
# Application
NODE_ENV=production
PORT=3000
API_VERSION=v1
LOG_LEVEL=warn

# Database - PostgreSQL (RDS)
DATABASE_URL=postgresql://user:pass@prod-db.xxxxx.us-east-1.rds.amazonaws.com:5432/kitchenxpert_prod

# Database - MongoDB (Atlas)
MONGODB_URI=mongodb+srv://user:pass@prod-cluster.mongodb.net/kitchenxpert_prod

# Redis (ElastiCache)
REDIS_URL=redis://prod-redis.xxxxx.cache.amazonaws.com:6379

# Security
SESSION_SECRET=<production-secret-64-chars>
JWT_SECRET=<production-secret-64-chars>
BCRYPT_ROUNDS=12

# AWS S3
AWS_REGION=us-east-1
AWS_S3_BUCKET=kitchenxpert-prod-assets
USE_LOCAL_STORAGE=false

# Email (SendGrid)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=<production-sendgrid-key>
EMAIL_ENABLED=true

# AI Service
AI_SERVICE_URL=https://ai.kitchenxpert.com

# Stripe (live mode)
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Rate Limiting (stricter in production)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=50

# Monitoring
SENTRY_DSN=<production-sentry-dsn>
ANALYTICS_ENABLED=true
NEW_RELIC_LICENSE_KEY=<new-relic-key>
```

## Database Migrations

### Running Migrations in Production

#### Pre-deployment Preparation

```bash
# 1. Test migrations on staging
# Connect to staging database
export DATABASE_URL="postgresql://user:pass@staging-db/kitchenxpert_staging"

# Run migrations
cd packages/backend
pnpm prisma migrate deploy

# Verify migration
pnpm prisma migrate status

# 2. Create database backup before production migration
aws rds create-db-snapshot \
  --db-instance-identifier kitchenxpert-prod \
  --db-snapshot-identifier kitchenxpert-prod-$(date +%Y%m%d-%H%M%S)
```

#### Production Migration

```bash
# 1. Enable maintenance mode (optional)
kubectl scale deployment frontend --replicas=0

# 2. Run migrations
export DATABASE_URL="postgresql://user:pass@prod-db/kitchenxpert_prod"
cd packages/backend
pnpm prisma migrate deploy

# 3. Verify migration
pnpm prisma migrate status

# 4. Disable maintenance mode
kubectl scale deployment frontend --replicas=3
```

#### Migration Best Practices

1. **Always backup before migrating**
2. **Test on staging first**
3. **Use migration transactions** when possible
4. **Plan for rollback** - write reversible migrations
5. **Minimize downtime** - use online migrations for large tables
6. **Monitor performance** during and after migration

#### Rollback Migration

```bash
# Mark migration as rolled back
pnpm prisma migrate resolve --rolled-back 20240110_migration_name

# Apply previous migration state
# (Requires manual SQL for data changes)
```

## Build Process

### Backend Build

```bash
# Navigate to backend
cd packages/backend

# Type check
pnpm type-check

# Lint
pnpm lint

# Run tests
pnpm test

# Build
pnpm build

# Output: dist/ directory with compiled JavaScript
```

**Build output structure:**

```
dist/
├── api/
├── services/
├── db/
├── utils/
├── index.js
└── server.js
```

### Frontend Build

```bash
# Navigate to frontend
cd packages/frontend

# Type check
pnpm type-check

# Lint
pnpm lint

# Run tests
pnpm test

# Build for production
pnpm build

# Output: dist/ directory with optimized static files
```

**Build output structure:**

```
dist/
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── [images/fonts]
├── index.html
└── favicon.ico
```

**Build optimizations:**

- Code splitting
- Tree shaking
- Minification
- Asset optimization
- Source maps (for error tracking)

### AI Modules Build

```bash
# Navigate to AI modules
cd packages/ai-modules

# Run tests
pytest

# Type check
mypy app/

# Lint
flake8 app/
black --check app/

# Build Docker image
docker build -t kitchenxpert/ai-modules:latest .
```

### Build Environment Variables

```bash
# Frontend build-time variables
VITE_API_URL=https://api.kitchenxpert.com
VITE_ENV=production
VITE_APP_VERSION=1.0.0

# Backend build-time variables
NODE_ENV=production

# Set during build
docker build \
  --build-arg VITE_API_URL=https://api.kitchenxpert.com \
  --build-arg VITE_ENV=production \
  -t kitchenxpert/frontend:latest \
  -f packages/frontend/Dockerfile .
```

## Deployment Checklist

### Pre-Deployment

- [ ] All tests pass (unit, integration, E2E)
- [ ] Code review completed and approved
- [ ] Staging deployment successful
- [ ] Database migrations tested on staging
- [ ] Environment variables configured
- [ ] SSL certificates valid and up to date
- [ ] Database backup created
- [ ] Monitoring and alerting configured
- [ ] Rollback plan prepared
- [ ] Team notified of deployment

### Deployment

- [ ] Deploy database migrations
- [ ] Deploy backend services
- [ ] Deploy frontend static files
- [ ] Deploy AI modules
- [ ] Update DNS/load balancer if needed
- [ ] Clear CDN cache if applicable
- [ ] Verify health checks passing
- [ ] Run smoke tests

### Post-Deployment

- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Verify all features working
- [ ] Review logs for errors
- [ ] Confirm database connectivity
- [ ] Test critical user flows
- [ ] Update deployment documentation
- [ ] Notify team of completion

## Deployment Strategies

### Rolling Update

**Best for:** Zero-downtime deployments

```bash
# Kubernetes rolling update
kubectl set image deployment/backend \
  backend=kitchenxpert/backend:v1.1.0 \
  --record

# Monitor rollout
kubectl rollout status deployment/backend

# Verify
kubectl get pods -l app=backend
```

### Blue-Green Deployment

**Best for:** Quick rollback capability

```bash
# Deploy green environment
kubectl apply -f k8s/deployment-green.yml

# Test green environment
curl https://green.kitchenxpert.com/health

# Switch traffic to green
kubectl patch service backend -p '{"spec":{"selector":{"version":"green"}}}'

# Monitor for issues
# If issues, switch back to blue
kubectl patch service backend -p '{"spec":{"selector":{"version":"blue"}}}'
```

### Canary Deployment

**Best for:** Gradual rollout with risk mitigation

```bash
# Deploy canary with 10% traffic
kubectl apply -f k8s/deployment-canary.yml

# Monitor canary metrics
# If successful, increase to 50%
kubectl scale deployment backend-canary --replicas=5

# If successful, complete rollout
kubectl apply -f k8s/deployment-v2.yml
kubectl delete deployment backend-canary
```

## Health Checks and Monitoring

### Health Check Endpoints

```typescript
// packages/backend/src/api/health.ts
import { Router } from 'express';
import { prisma } from '../db/client';
import { redis } from '../db/redis';

const router = Router();

// Basic health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Detailed health check
router.get('/health/detailed', async (req, res) => {
  const checks = {
    postgres: await checkPostgres(),
    mongodb: await checkMongoDB(),
    redis: await checkRedis(),
    ai: await checkAI(),
  };

  const allHealthy = Object.values(checks).every((c) => c.status === 'healthy');

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
  });
});

async function checkPostgres() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'healthy', latency: Date.now() };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}
```

### Monitoring Setup

#### Application Metrics

```typescript
// Prometheus metrics
import promClient from 'prom-client';

const register = new promClient.Registry();

// HTTP request duration
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// Database query duration
const dbQueryDuration = new promClient.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  registers: [register],
});
```

#### Logging

```typescript
// Winston logger configuration
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: 'error.log',
      level: 'error',
    }),
    new winston.transports.File({
      filename: 'combined.log',
    }),
  ],
});
```

### Monitoring Tools

- **Application Performance**: New Relic, Datadog
- **Error Tracking**: Sentry
- **Logs**: CloudWatch, ELK Stack
- **Metrics**: Prometheus + Grafana
- **Uptime**: UptimeRobot, Pingdom

## CI/CD Pipeline

### GitHub Actions Workflows

#### CI Workflow

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [develop, main]
  pull_request:
    branches: [develop, main]

jobs:
  test-backend:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready --health-interval 10s --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Type check
        run: pnpm type-check
        working-directory: packages/backend

      - name: Lint
        run: pnpm lint
        working-directory: packages/backend

      - name: Run tests
        run: pnpm test:coverage
        working-directory: packages/backend
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: packages/backend/coverage/coverage-final.json

  test-frontend:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Type check
        run: pnpm type-check
        working-directory: packages/frontend

      - name: Lint
        run: pnpm lint
        working-directory: packages/frontend

      - name: Run tests
        run: pnpm test:coverage
        working-directory: packages/frontend

      - name: Build
        run: pnpm build
        working-directory: packages/frontend

  test-ai-modules:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
          cache: 'pip'

      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install -r requirements-dev.txt
        working-directory: packages/ai-modules

      - name: Lint
        run: |
          flake8 app/
          black --check app/
        working-directory: packages/ai-modules

      - name: Type check
        run: mypy app/
        working-directory: packages/ai-modules

      - name: Run tests
        run: pytest --cov=app
        working-directory: packages/ai-modules
```

#### CD Workflow (Staging)

`.github/workflows/deploy-staging.yml`:

```yaml
name: Deploy to Staging

on:
  push:
    branches: [develop]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: staging

    steps:
      - uses: actions/checkout@v3

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1

      - name: Build and push backend
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/kitchenxpert-backend:$IMAGE_TAG \
            -f packages/backend/Dockerfile .
          docker push $ECR_REGISTRY/kitchenxpert-backend:$IMAGE_TAG

      - name: Build and push frontend
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build \
            --build-arg VITE_API_URL=${{ secrets.STAGING_API_URL }} \
            -t $ECR_REGISTRY/kitchenxpert-frontend:$IMAGE_TAG \
            -f packages/frontend/Dockerfile .
          docker push $ECR_REGISTRY/kitchenxpert-frontend:$IMAGE_TAG

      - name: Deploy to ECS
        run: |
          aws ecs update-service \
            --cluster kitchenxpert-staging \
            --service backend \
            --force-new-deployment

          aws ecs update-service \
            --cluster kitchenxpert-staging \
            --service frontend \
            --force-new-deployment

      - name: Wait for deployment
        run: |
          aws ecs wait services-stable \
            --cluster kitchenxpert-staging \
            --services backend frontend

      - name: Run smoke tests
        run: |
          curl -f https://staging.kitchenxpert.com/health || exit 1
```

#### CD Workflow (Production)

`.github/workflows/deploy-production.yml`:

```yaml
name: Deploy to Production

on:
  push:
    tags:
      - 'v*'

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production

    steps:
      - uses: actions/checkout@v3

      # Similar to staging but with:
      # - Manual approval required
      # - Production secrets
      # - Blue-green deployment
      # - More comprehensive smoke tests
      # - Slack notification
```

## Rollback Procedures

### Quick Rollback (Kubernetes)

```bash
# Rollback to previous deployment
kubectl rollout undo deployment/backend

# Rollback to specific revision
kubectl rollout undo deployment/backend --to-revision=2

# View rollout history
kubectl rollout history deployment/backend

# Check rollout status
kubectl rollout status deployment/backend
```

### Database Rollback

```bash
# Restore from backup
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier kitchenxpert-prod-restored \
  --db-snapshot-identifier kitchenxpert-prod-20260110-120000

# Or restore specific tables (if migration was reversible)
psql $DATABASE_URL < backup-20260110.sql
```

### Application Rollback

```bash
# Redeploy previous version
kubectl set image deployment/backend \
  backend=kitchenxpert/backend:v1.0.0

# Or use previous Docker image
docker pull kitchenxpert/backend:v1.0.0
docker tag kitchenxpert/backend:v1.0.0 kitchenxpert/backend:latest
```

## Troubleshooting

### Deployment Fails

```bash
# Check pod status
kubectl get pods

# View pod logs
kubectl logs pod-name

# Describe pod for events
kubectl describe pod pod-name

# Check deployment events
kubectl describe deployment backend
```

### Database Migration Fails

```bash
# Check migration status
pnpm prisma migrate status

# View migration errors
kubectl logs migration-job-pod

# Rollback migration
pnpm prisma migrate resolve --rolled-back migration_name
```

### Health Checks Failing

```bash
# Test health endpoint directly
kubectl exec -it pod-name -- curl localhost:3000/health

# Check logs
kubectl logs pod-name | grep health

# Verify database connectivity
kubectl exec -it pod-name -- psql $DATABASE_URL -c "SELECT 1"
```

### High Error Rates

```bash
# View recent errors in Sentry
# Check CloudWatch logs
aws logs tail /aws/ecs/kitchenxpert-backend --follow

# Check application metrics
kubectl port-forward svc/backend 3000:3000
curl localhost:3000/metrics
```

## Related Documentation

- [Development Setup](./setup.md) - Local development setup
- [CI/CD Integration](./integration-testing/ci-integration.md) - CI/CD details
- [Architecture Overview](../architecture/overview.md) - System architecture
- [Database Schema](../database/schema.md) - Database structure
