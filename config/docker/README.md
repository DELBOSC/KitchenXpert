# KitchenXpert Docker Configuration

Complete Docker setup for KitchenXpert platform with development, production, and test environments.

## Directory Structure

```
config/docker/
├── docker-compose.yml          # Base compose file
├── docker-compose.dev.yml      # Development overrides
├── docker-compose.prod.yml     # Production configuration
├── docker-compose.test.yml     # Test environment
├── Dockerfile.frontend         # Frontend React app
├── Dockerfile.partner-portal   # Partner portal app
├── Dockerfile.ai               # AI/ML services
├── Dockerfile.data-exchange    # Data exchange service
├── Dockerfile.backend          # Backend API (existing)
├── .env.example                # Environment variables template
├── nginx/                      # Nginx configurations
│   ├── frontend.conf
│   ├── partner-portal.conf
│   └── security-headers.conf
└── README.md                   # This file
```

## Quick Start

### Development Environment

1. Copy environment variables:
```bash
cp config/docker/.env.example .env
# Edit .env with your development values
```

2. Start development environment:
```bash
docker-compose -f config/docker/docker-compose.dev.yml up
```

This will start:
- Backend API (port 3000) with hot reload
- Frontend (port 3001) with hot reload
- Partner Portal (port 3002) with hot reload
- AI Services (port 8000) with auto-reload
- Data Exchange Service (port 3001)
- PostgreSQL (port 5432)
- Redis (port 6379)
- Adminer (port 8080) - Database UI
- MailHog (port 8025) - Email testing

### Production Environment

1. Set production environment variables:
```bash
cp config/docker/.env.example .env.production
# Edit .env.production with secure production values
```

2. Build and start production:
```bash
docker-compose -f config/docker/docker-compose.prod.yml up -d
```

### Test Environment

Run all tests in isolated containers:

```bash
docker-compose -f config/docker/docker-compose.test.yml up --abort-on-container-exit
```

## Services

### Frontend (React Application)
- **Port**: 8080 (prod), 3001 (dev)
- **Dockerfile**: `Dockerfile.frontend`
- **Features**: Multi-stage build, nginx serving, hot reload in dev
- **Health Check**: `http://localhost:8080/health`

### Partner Portal
- **Port**: 8081 (prod), 3002 (dev)
- **Dockerfile**: `Dockerfile.partner-portal`
- **Features**: Enhanced security headers, isolated build
- **Health Check**: `http://localhost:8081/health`

### Backend API
- **Port**: 3000
- **Dockerfile**: `Dockerfile.backend`
- **Features**: Express.js, PostgreSQL, Redis integration
- **Health Check**: `http://localhost:3000/health`

### AI Services
- **Port**: 8000
- **Dockerfile**: `Dockerfile.ai`
- **Features**: Python 3.11, PyTorch, Transformers, FastAPI
- **Health Check**: `http://localhost:8000/health`
- **Resource Limits**: 4 CPU, 8GB RAM (production)

### Data Exchange Service
- **Port**: 3001
- **Dockerfile**: `Dockerfile.data-exchange`
- **Features**: CSV/Excel processing, catalog imports
- **Volumes**: uploads, imports, exports

## Environment Variables

### Required Production Variables

```bash
# Database
DB_HOST=postgres
DB_NAME=kitchenxpert_prod
DB_USER=postgres
DB_PASSWORD=<strong-password>

# Redis
REDIS_HOST=redis
REDIS_PASSWORD=<redis-password>

# Security
JWT_SECRET=<32+ character random string>
CORS_ORIGIN=https://yourdomain.com
```

See `.env.example` for full configuration options.

## Volume Management

### Development Volumes
- Source code mounted for hot reload
- Database data persisted
- No cleanup between restarts

### Production Volumes
```bash
# List volumes
docker volume ls | grep kitchenxpert

# Backup database
docker exec kitchenxpert-postgres-prod pg_dump -U postgres kitchenxpert_prod > backup.sql

# Remove all volumes (WARNING: Data loss!)
docker-compose -f config/docker/docker-compose.prod.yml down -v
```

### Test Volumes
- Automatically cleaned up after test run
- Use tmpfs for database (no disk I/O)

## Resource Limits

### Production Limits
| Service | CPU Limit | Memory Limit | CPU Reserved | Memory Reserved |
|---------|-----------|--------------|--------------|-----------------|
| Backend | 2 cores | 2GB | 0.5 cores | 512MB |
| Frontend | 1 core | 512MB | 0.25 cores | 128MB |
| AI Services | 4 cores | 8GB | 2 cores | 4GB |
| PostgreSQL | 2 cores | 2GB | 1 core | 1GB |
| Redis | 1 core | 1GB | 0.25 cores | 256MB |

## Security Features

### All Services
- Run as non-root user
- Multi-stage builds (minimal attack surface)
- Health checks enabled
- Resource limits enforced
- Logging with rotation

### Frontend & Partner Portal
- Nginx security headers
- CSP (Content Security Policy)
- HSTS ready
- XSS protection
- Clickjacking prevention

### Databases
- Password-protected
- Network isolation
- Regular health checks
- Data persistence

## Troubleshooting

### Check service logs
```bash
docker-compose -f config/docker/docker-compose.prod.yml logs -f backend
```

### Restart a service
```bash
docker-compose -f config/docker/docker-compose.prod.yml restart backend
```

### Check service health
```bash
docker ps
# Look for (healthy) status
```

### Database connection issues
```bash
# Connect to database
docker exec -it kitchenxpert-postgres-prod psql -U postgres -d kitchenxpert_prod

# Check database is ready
docker exec kitchenxpert-postgres-prod pg_isready
```

### Clear everything and restart
```bash
# Development
docker-compose -f config/docker/docker-compose.dev.yml down -v
docker-compose -f config/docker/docker-compose.dev.yml up --build

# Production (WARNING: Destroys data)
docker-compose -f config/docker/docker-compose.prod.yml down -v
docker-compose -f config/docker/docker-compose.prod.yml up -d --build
```

## Building Images

### Build specific service
```bash
docker-compose -f config/docker/docker-compose.prod.yml build frontend
```

### Build all services
```bash
docker-compose -f config/docker/docker-compose.prod.yml build
```

### Build without cache
```bash
docker-compose -f config/docker/docker-compose.prod.yml build --no-cache
```

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run tests
  run: docker-compose -f config/docker/docker-compose.test.yml up --abort-on-container-exit

- name: Build production images
  run: docker-compose -f config/docker/docker-compose.prod.yml build

- name: Push to registry
  run: docker-compose -f config/docker/docker-compose.prod.yml push
```

## Monitoring

### Health Checks
All services include health checks:
- Interval: 30s
- Timeout: 3-10s
- Retries: 3-5
- Start period: 5-90s

### Logs
- JSON format
- Size limits (5-20MB per file)
- Rotation (3-5 files)

### Metrics
Production services expose:
- Health endpoints
- Prometheus metrics (if enabled)
- Application logs

## Backup & Restore

### Backup Database
```bash
docker exec kitchenxpert-postgres-prod pg_dump -U postgres kitchenxpert_prod > backup-$(date +%Y%m%d).sql
```

### Restore Database
```bash
cat backup-20260110.sql | docker exec -i kitchenxpert-postgres-prod psql -U postgres -d kitchenxpert_prod
```

### Backup Volumes
```bash
docker run --rm -v kitchenxpert-postgres-prod-data:/data -v $(pwd):/backup alpine tar czf /backup/postgres-data.tar.gz /data
```

## Performance Tuning

### Development
- Use volume mounting for hot reload
- Disable production optimizations
- Enable debug logging

### Production
- Use built images (no volumes)
- Enable all optimizations
- Resource limits enforced
- Logging set to info/warning

## Support

For issues and questions:
1. Check logs: `docker-compose logs -f <service>`
2. Verify health: `docker ps`
3. Check environment variables
4. Review this documentation

## License

Copyright 2026 KitchenXpert
