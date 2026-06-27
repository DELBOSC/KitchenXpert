# KitchenXpert Nginx Configuration - Index

## Overview

This directory contains a complete, production-ready Nginx configuration for the
KitchenXpert project. All configurations follow modern best practices with
security, performance, and scalability in mind.

**Total Files:** 14 **Last Updated:** 2026-01-10 **Nginx Version:** 1.24+
**Environment Support:** Development & Production

---

## Quick Navigation

### Getting Started

- **[QUICK_START.md](QUICK_START.md)** - Fast setup guide (start here!)
- **[deploy.sh](deploy.sh)** - Automated deployment script
- **[.checklist.md](.checklist.md)** - Pre-deployment checklist

### Documentation

- **[README.md](README.md)** - Complete documentation (400+ lines)
- **[FILE_SUMMARY.txt](FILE_SUMMARY.txt)** - Detailed file descriptions

---

## Core Configuration Files

| File                  | Size   | Purpose                                                      |
| --------------------- | ------ | ------------------------------------------------------------ |
| **nginx.conf**        | 8.3 KB | Main configuration with workers, gzip, SSL, rate limiting    |
| **nginx.dev.conf**    | 5.6 KB | Development settings (verbose logs, no SSL, permissive CORS) |
| **nginx.prod.conf**   | 9.4 KB | Production settings (HTTPS, HTTP/2, strict security)         |
| **mime.types**        | 9.1 KB | Comprehensive MIME type mappings (200+ types)                |
| **proxy_params.conf** | 2.7 KB | Reusable proxy headers and settings                          |

---

## Virtual Host Configurations

### API Server (api.conf) - 11 KB

**Domain:** api.kitchenxpert.com **Backend:** localhost:4000 **Features:**

- WebSocket support for real-time connections
- Rate limiting (10 req/s general, 5 req/min auth)
- CORS with origin whitelisting
- Health check & metrics endpoints
- File upload support (50MB max)
- GraphQL endpoint support
- API response caching

### Frontend App (app.conf) - 9.1 KB

**Domain:** kitchenxpert.com, www.kitchenxpert.com **Type:** Single Page
Application (React/Vue) **Features:**

- SPA routing with fallback to index.html
- Aggressive asset caching (1 year)
- Service worker support
- Development HMR support
- www to non-www redirect
- Custom error pages

### Partner Portal (partner-portal.conf) - 12 KB

**Domain:** partners.kitchenxpert.com **Security:** Enhanced **Features:**

- HTTPS required (forced)
- Optional client certificate auth (mTLS)
- Strict rate limiting
- IP whitelisting support
- Enhanced security headers
- Fail2ban integration
- Secure downloads directory

### Documentation (documentation.conf) - 12 KB

**Domain:** docs.kitchenxpert.com **Type:** Documentation site **Features:**

- Optional basic authentication
- Clean URLs (no .html extension)
- Versioned documentation (/v1/, /v2/)
- API docs with Swagger UI
- Search functionality support
- SEO optimizations
- Markdown file serving

---

## Documentation Files

### README.md (11 KB)

Complete reference documentation covering:

- Directory structure
- Installation & configuration
- Security features
- Performance optimizations
- Monitoring & logging
- Customization guide
- Troubleshooting
- Best practices

### QUICK_START.md (9.7 KB)

Fast-track guide with:

- Quick installation (automated & manual)
- Common tasks
- SSL certificate setup
- Development & production setup
- Feature configuration
- Troubleshooting tips
- Useful commands

### .checklist.md (9.2 KB)

Comprehensive deployment checklist:

- Pre-deployment requirements
- Configuration verification
- Security validation
- Performance testing
- Production launch steps
- Maintenance schedules
- Rollback procedures

### FILE_SUMMARY.txt (13 KB)

Detailed breakdown of all files including:

- File descriptions
- Feature lists
- Configuration details
- Usage instructions
- Customization notes

---

## Deployment Script

### deploy.sh (9.3 KB, executable)

Automated deployment with:

- Environment selection (dev/prod)
- Automatic backup
- Directory creation
- Configuration deployment
- Site enablement (interactive)
- SSL certificate generation (dev)
- Configuration testing
- Nginx reload
- Color-coded output

**Usage:**

```bash
sudo ./deploy.sh dev      # Development
sudo ./deploy.sh prod     # Production
```

---

## Key Features

### Security (Production-Grade)

- ✅ TLS 1.2+ only with modern ciphers
- ✅ HSTS headers (2-year max-age)
- ✅ Content Security Policy
- ✅ Rate limiting (API, auth, connections)
- ✅ CORS with origin whitelisting
- ✅ Optional client certificates (mTLS)
- ✅ IP whitelisting support
- ✅ Security header validation
- ✅ Hidden file blocking

### Performance (Optimized)

- ✅ HTTP/2 support
- ✅ Gzip compression (level 6)
- ✅ Brotli compression ready
- ✅ Aggressive asset caching
- ✅ API response caching
- ✅ Keep-alive connections
- ✅ Load balancing ready
- ✅ WebSocket support
- ✅ Efficient file serving

### Monitoring (Observable)

- ✅ Detailed access logging
- ✅ Per-service log files
- ✅ Request timing information
- ✅ Health check endpoints
- ✅ Metrics endpoint
- ✅ Status page
- ✅ Cache status headers

---

## Supported Environments

### Development

- HTTP only (no SSL)
- Verbose debugging
- Permissive CORS
- No caching
- Hot reload support
- Single backend

### Production

- HTTPS required
- HTTP/2 enabled
- Strict security
- Aggressive caching
- Multiple backends
- Load balancing

---

## Quick Commands

```bash
# Deploy
sudo ./deploy.sh dev              # Deploy development
sudo ./deploy.sh prod             # Deploy production

# Test configuration
sudo nginx -t                     # Validate syntax
sudo nginx -T                     # Show merged config

# Service management
sudo systemctl reload nginx       # Reload configuration
sudo systemctl restart nginx      # Restart service
sudo systemctl status nginx       # Check status

# Enable sites
cd /etc/nginx/sites-enabled
sudo ln -s ../sites-available/api.conf .
sudo nginx -t && sudo systemctl reload nginx

# View logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/api.access.log

# SSL certificates (Let's Encrypt)
sudo certbot --nginx -d kitchenxpert.com
```

---

## File Tree

```
config/nginx/
├── nginx.conf                    # Main configuration
├── nginx.dev.conf                # Development settings
├── nginx.prod.conf               # Production settings
├── mime.types                    # MIME type mappings
├── proxy_params.conf             # Proxy headers
├── deploy.sh                     # Deployment script
├── README.md                     # Full documentation
├── QUICK_START.md                # Quick reference
├── .checklist.md                 # Deployment checklist
├── FILE_SUMMARY.txt              # File descriptions
├── INDEX.md                      # This file
├── sites-available/
│   ├── api.conf                  # Backend API
│   ├── app.conf                  # Frontend app
│   ├── partner-portal.conf       # Partner portal
│   └── documentation.conf        # Documentation
└── sites-enabled/                # Symlinks to enabled sites
```

---

## Customization Required

Before deployment, update these items:

1. **Domain Names**: Replace `kitchenxpert.com` in all configs
2. **SSL Certificates**: Install valid certificates (Let's Encrypt)
3. **Backend Port**: Verify API runs on port 4000
4. **CORS Origins**: Update allowed origins in api.conf
5. **Document Roots**: Verify web root paths exist

---

## What to Read First

1. **New User?** Start with [QUICK_START.md](QUICK_START.md)
2. **Deploying?** Check [.checklist.md](.checklist.md)
3. **Need Details?** Read [README.md](README.md)
4. **Want Overview?** See [FILE_SUMMARY.txt](FILE_SUMMARY.txt)

---

## Support & Resources

- **Nginx Docs**: https://nginx.org/en/docs/
- **SSL Config**: https://ssl-config.mozilla.org/
- **Security Headers**: https://securityheaders.com/
- **SSL Test**: https://www.ssllabs.com/ssltest/

---

## Version Information

| Component | Version  | Notes                        |
| --------- | -------- | ---------------------------- |
| Nginx     | 1.24+    | Required for modern features |
| OpenSSL   | 1.1+     | For TLS 1.3 support          |
| HTTP      | 2        | Enabled in production        |
| TLS       | 1.2, 1.3 | Minimum TLS 1.2              |

---

## License

Copyright © 2024-2026 KitchenXpert. All rights reserved.

---

**Last Updated:** 2026-01-10 **Maintained By:** KitchenXpert DevOps Team
