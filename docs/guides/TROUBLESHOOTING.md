# KitchenXpert - Troubleshooting Guide

**Solutions to common issues and problems**

Last Updated: 2026-01-10

## Table of Contents

- [Installation Issues](#installation-issues)
- [Database Connection Issues](#database-connection-issues)
- [API Errors](#api-errors)
- [Build Errors](#build-errors)
- [Performance Issues](#performance-issues)
- [3D Rendering Issues](#3d-rendering-issues)
- [Authentication Issues](#authentication-issues)
- [AI Service Issues](#ai-service-issues)
- [Network Issues](#network-issues)
- [FAQ](#faq)

## Installation Issues

### Node.js Version Mismatch

**Error:**
```
The engine "node" is incompatible with this module. Expected version ">=20.0.0"
```

**Solution:**
```bash
# Check current Node.js version
node --version

# Install Node.js 20 LTS
# Using nvm (recommended):
nvm install 20
nvm use 20

# Or download from nodejs.org
```

### npm Install Fails

**Error:**
```
npm ERR! code EACCES
npm ERR! syscall access
```

**Solution:**
```bash
# Fix permissions (macOS/Linux)
sudo chown -R $USER:$GROUP ~/.npm
sudo chown -R $USER:$GROUP ~/.config

# Or use nvm instead of system Node.js

# Clear cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Python Dependencies Fail

**Error:**
```
error: Microsoft Visual C++ 14.0 or greater is required
```

**Solution:**
```bash
# Windows: Install Visual Studio Build Tools
# Download from: https://visualstudio.microsoft.com/downloads/

# macOS: Install Xcode Command Line Tools
xcode-select --install

# Linux: Install build essentials
sudo apt-get install build-essential python3-dev
```

### Port Already in Use

**Error:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**
```bash
# Windows: Find and kill process
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux: Find and kill process
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run dev
```

### Module Not Found

**Error:**
```
Error: Cannot find module 'xyz'
```

**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# If specific module is missing
npm install xyz

# Clear TypeScript cache
rm -rf dist .tsbuildinfo
npm run build
```

## Database Connection Issues

### PostgreSQL Connection Failed

**Error:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:**
```bash
# 1. Check if PostgreSQL is running
# Windows:
sc query postgresql-x64-15

# macOS:
brew services list
brew services start postgresql@15

# Linux:
sudo systemctl status postgresql
sudo systemctl start postgresql

# 2. Verify connection string
DATABASE_URL=postgresql://user:password@localhost:5432/kitchenxpert

# 3. Test connection
psql -U postgres -h localhost
\l  # List databases

# 4. Check firewall
# Ensure port 5432 is not blocked

# 5. Check pg_hba.conf
# Should allow local connections
# Location: /etc/postgresql/15/main/pg_hba.conf (Linux)
```

### MongoDB Connection Timeout

**Error:**
```
MongoServerError: connection timeout
```

**Solution:**
```bash
# 1. Start MongoDB
# Windows:
net start MongoDB

# macOS:
brew services start mongodb-community

# Linux:
sudo systemctl start mongod

# 2. Check connection string
MONGODB_URL=mongodb://localhost:27017/kitchenxpert

# 3. Test connection
mongosh

# 4. Check if MongoDB is listening
# macOS/Linux:
netstat -an | grep 27017

# Windows:
netstat -ano | findstr :27017
```

### Redis Connection Error

**Error:**
```
Error: Redis connection to localhost:6379 failed
```

**Solution:**
```bash
# 1. Start Redis
# Windows (using WSL or Docker):
docker run -d -p 6379:6379 redis:7-alpine

# macOS:
brew services start redis

# Linux:
sudo systemctl start redis-server

# 2. Test connection
redis-cli ping  # Should return PONG

# 3. Check Redis configuration
redis-cli CONFIG GET bind
redis-cli CONFIG GET port

# 4. Verify REDIS_URL in .env
REDIS_URL=redis://localhost:6379
```

### Database Migration Errors

**Error:**
```
Error: relation "users" does not exist
```

**Solution:**
```bash
# 1. Check migration status
npm run db:migrate:status

# 2. Run pending migrations
npm run db:migrate

# 3. If migrations are corrupted, rollback and retry
npm run db:migrate:undo
npm run db:migrate

# 4. If database is empty, recreate
npm run db:drop    # WARNING: Deletes all data
npm run db:create
npm run db:migrate
npm run db:seed
```

## API Errors

### Error 401: Unauthorized

**Error:**
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**Solution:**
```bash
# 1. Ensure you're sending the token
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/v1/...

# 2. Check if token is expired
# Login again to get a new token

# 3. Verify JWT_SECRET in .env matches

# 4. Check token format (should start with "Bearer ")
```

### Error 403: Forbidden

**Error:**
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions"
  }
}
```

**Solution:**
```bash
# 1. Check user role
# Endpoint may require admin or premium user

# 2. Verify user permissions in database
SELECT id, email, role FROM users WHERE email = 'your-email@example.com';

# 3. Contact admin to upgrade account
```

### Error 404: Not Found

**Error:**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found"
  }
}
```

**Solution:**
```bash
# 1. Verify the endpoint URL
# Correct: /api/v1/catalog/products
# Wrong: /api/catalog/products (missing v1)

# 2. Check if resource exists
# Use correct ID format (e.g., prod_123, not 123)

# 3. Verify API version
# Current version: v1
```

### Error 429: Too Many Requests

**Error:**
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests"
  }
}
```

**Solution:**
```bash
# 1. Wait before retrying
# Standard tier: 100 requests/minute
# Premium tier: 1000 requests/minute

# 2. Implement exponential backoff
# Wait: 1s, 2s, 4s, 8s, etc.

# 3. Upgrade to premium tier

# 4. Optimize requests (use pagination, caching)
```

### Error 500: Internal Server Error

**Error:**
```json
{
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

**Solution:**
```bash
# 1. Check server logs
npm run logs

# Or
docker-compose logs -f api

# 2. Verify environment variables
# Missing required env vars can cause 500 errors

# 3. Check database connections
# Ensure all databases are running

# 4. If persistent, report bug with:
# - Request details
# - Error message
# - Timestamp
# - Steps to reproduce
```

### Error 422: Validation Error

**Error:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

**Solution:**
```bash
# 1. Check request body format
# Ensure all required fields are present

# 2. Verify data types
# Example: price should be number, not string

# 3. Check field constraints
# Email must be valid format
# Password must be at least 8 characters

# 4. See API documentation for field requirements
```

## Build Errors

### TypeScript Compilation Errors

**Error:**
```
error TS2307: Cannot find module 'xyz' or its corresponding type declarations
```

**Solution:**
```bash
# 1. Install type definitions
npm install --save-dev @types/xyz

# 2. If types don't exist, create declaration file
# Create: src/types/xyz.d.ts
declare module 'xyz';

# 3. Clear TypeScript cache
rm -rf dist .tsbuildinfo
npm run build
```

### Out of Memory Error

**Error:**
```
FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed
JavaScript heap out of memory
```

**Solution:**
```bash
# 1. Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build

# 2. Or update package.json
{
  "scripts": {
    "build": "node --max-old-space-size=4096 ./node_modules/.bin/vite build"
  }
}

# 3. Close other applications
# Free up system memory
```

### Webpack/Vite Build Fails

**Error:**
```
Error: EMFILE: too many open files
```

**Solution:**
```bash
# macOS/Linux: Increase file descriptor limit
ulimit -n 10000

# Permanent fix (add to ~/.bashrc or ~/.zshrc):
echo "ulimit -n 10000" >> ~/.bashrc

# Windows: Usually not an issue, but restart if needed
```

### CSS/Style Issues

**Error:**
```
Module parse failed: Unexpected token
```

**Solution:**
```bash
# 1. Ensure CSS loader is configured
# Check vite.config.ts or webpack.config.js

# 2. Install required dependencies
npm install --save-dev sass  # If using SCSS

# 3. Clear build cache
rm -rf node_modules/.vite dist
npm run build
```

## Performance Issues

### Slow API Response

**Symptoms:**
- API requests taking > 2 seconds
- Timeouts

**Solution:**
```bash
# 1. Enable database query logging
# Check for slow queries

# 2. Add database indexes
# See docs/architecture/database-schema.md

# 3. Enable Redis caching
# Verify REDIS_URL is configured

# 4. Check server resources
# CPU, memory, disk usage

# 5. Use pagination for large datasets
GET /api/v1/catalog/products?page=1&limit=20

# 6. Enable compression
# Check if gzip is enabled
```

### High Memory Usage

**Symptoms:**
- Application crashes
- Slow performance

**Solution:**
```bash
# 1. Check for memory leaks
# Use Node.js profiler
node --inspect index.js

# 2. Monitor memory usage
npm run monitor

# 3. Optimize queries
# Avoid loading unnecessary data

# 4. Clear caches periodically
redis-cli FLUSHDB

# 5. Restart application
pm2 restart kitchenxpert
```

### Frontend Lag

**Symptoms:**
- Slow UI updates
- Unresponsive interface

**Solution:**
```bash
# 1. Check browser console for errors
# Open DevTools (F12)

# 2. Clear browser cache
# Ctrl+Shift+Delete

# 3. Disable browser extensions
# Some extensions can slow down apps

# 4. Check network throttling
# Ensure "Online" mode in DevTools

# 5. Use production build
npm run build
npm run preview  # Test production build
```

## 3D Rendering Issues

### WebGL Not Supported

**Error:**
```
WebGL is not supported in this browser
```

**Solution:**
```bash
# 1. Update browser to latest version
# Chrome 100+, Firefox 97+, Safari 15.4+

# 2. Enable WebGL in browser settings
# Chrome: chrome://flags/#ignore-gpu-blocklist

# 3. Update graphics drivers

# 4. Try different browser

# 5. Check GPU compatibility
# Visit: https://get.webgl.org/
```

### 3D Model Not Loading

**Symptoms:**
- Black screen in 3D viewer
- Models fail to render

**Solution:**
```bash
# 1. Check browser console for errors

# 2. Verify model file format
# Supported: GLB, GLTF

# 3. Check file size
# Large models (>10MB) may take time to load

# 4. Test with simple model first

# 5. Clear browser cache

# 6. Check CORS headers
# Models must be served with correct headers
```

### Poor 3D Performance

**Symptoms:**
- Low FPS (< 30)
- Choppy rendering

**Solution:**
```bash
# 1. Reduce model complexity
# Use lower poly count models

# 2. Enable hardware acceleration
# Check browser settings

# 3. Reduce texture sizes
# Use compressed textures

# 4. Close other tabs/applications

# 5. Lower render quality in settings

# 6. Update graphics drivers
```

## Authentication Issues

### Cannot Login

**Symptoms:**
- Login fails with correct credentials

**Solution:**
```bash
# 1. Verify email/password
# Check for typos, caps lock

# 2. Reset password
POST /api/v1/auth/forgot-password

# 3. Check account status
# Account may be locked or unverified

# 4. Clear cookies and try again
# Use incognito mode

# 5. Check server logs for errors
```

### Session Expires Too Quickly

**Symptoms:**
- Logged out frequently

**Solution:**
```bash
# 1. Check JWT expiration in .env
JWT_EXPIRES_IN=24h  # Increase if needed

# 2. Use refresh token
POST /api/v1/auth/refresh

# 3. Implement auto-refresh
# Frontend should refresh before expiration

# 4. Check for clock skew
# Ensure server time is correct
```

### OAuth Login Fails

**Error:**
```
OAuth authentication failed
```

**Solution:**
```bash
# 1. Verify OAuth credentials
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# 2. Check callback URL
# Must match OAuth app settings
OAUTH_CALLBACK_URL=http://localhost:3000/api/v1/auth/callback

# 3. Verify scopes
# Ensure correct permissions requested

# 4. Check OAuth provider status
# Google/GitHub may be down
```

## AI Service Issues

### AI Service Unreachable

**Error:**
```
Error: connect ECONNREFUSED 127.0.0.1:8000
```

**Solution:**
```bash
# 1. Start AI service
cd services/ai-service
source venv/bin/activate
python main.py

# 2. Check AI_SERVICE_URL
AI_SERVICE_URL=http://localhost:8000

# 3. Verify Python dependencies
pip install -r requirements.txt

# 4. Check logs
tail -f services/ai-service/logs/app.log
```

### AI Generation Timeout

**Symptoms:**
- Design generation takes > 60 seconds
- Request times out

**Solution:**
```bash
# 1. Increase timeout
# In backend: timeout = 60000 (60 seconds)

# 2. Check AI service resources
# CPU/RAM usage may be high

# 3. Use GPU acceleration
ENABLE_GPU=true

# 4. Simplify input
# Reduce complexity of questionnaire answers

# 5. Check AI model loading
# First request may take longer
```

### Poor AI Recommendations

**Symptoms:**
- Irrelevant product suggestions
- Low quality designs

**Solution:**
```bash
# 1. Provide more detailed input
# Fill out questionnaire completely

# 2. Check AI model version
# Ensure latest model is loaded

# 3. Report feedback
POST /api/v1/ai/feedback

# 4. Try different parameters
# Adjust budget, style preferences

# 5. Clear AI cache
# May be serving old results
```

## Network Issues

### CORS Errors

**Error:**
```
Access to fetch at '...' has been blocked by CORS policy
```

**Solution:**
```bash
# 1. Verify CORS_ORIGIN in .env
CORS_ORIGIN=http://localhost:5173

# 2. Check API server configuration
# Ensure CORS middleware is enabled

# 3. For multiple origins, use comma-separated list
CORS_ORIGIN=http://localhost:5173,http://localhost:3001

# 4. Check request headers
# Ensure Content-Type is set correctly
```

### Request Timeout

**Error:**
```
Error: timeout of 30000ms exceeded
```

**Solution:**
```bash
# 1. Increase timeout in client
axios.defaults.timeout = 60000;

# 2. Check network connection
# Ping API server

# 3. Check for proxy/VPN issues
# May slow down requests

# 4. Monitor server response time
# Server may be overloaded
```

### SSL/TLS Errors

**Error:**
```
Error: unable to verify the first certificate
```

**Solution:**
```bash
# Development only (NOT for production):
# Disable SSL verification
NODE_TLS_REJECT_UNAUTHORIZED=0

# Production: Use valid SSL certificate
# Let's Encrypt: https://letsencrypt.org/

# Check certificate validity
openssl s_client -connect api.kitchenxpert.com:443
```

## FAQ

### Quick Links to Common Solutions

**Installation & Setup:**
- [Node.js version issues](#nodejs-version-mismatch)
- [npm install fails](#npm-install-fails)
- [Port already in use](#port-already-in-use)

**Database:**
- [PostgreSQL won't connect](#postgresql-connection-failed)
- [MongoDB timeout](#mongodb-connection-timeout)
- [Redis errors](#redis-connection-error)

**API:**
- [401 Unauthorized](#error-401-unauthorized)
- [429 Rate limit](#error-429-too-many-requests)
- [500 Server error](#error-500-internal-server-error)

**Performance:**
- [Slow API](#slow-api-response)
- [High memory usage](#high-memory-usage)
- [Frontend lag](#frontend-lag)

### Still Need Help?

If your issue isn't covered here:

1. **Search existing issues**: https://github.com/kitchenxpert/kitchenxpert/issues
2. **Check FAQ**: [docs/user/faq.md](./docs/user/faq.md)
3. **Ask on Discord**: https://discord.gg/kitchenxpert
4. **Create an issue**: https://github.com/kitchenxpert/kitchenxpert/issues/new
5. **Email support**: support@kitchenxpert.com

---

**Remember**: Include error messages, logs, and environment details when asking for help!
