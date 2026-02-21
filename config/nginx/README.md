# KitchenXpert - Nginx Configuration

This directory contains production-ready Nginx configuration files for the KitchenXpert project.

## Directory Structure

```
config/nginx/
├── nginx.conf                    # Main Nginx configuration
├── nginx.dev.conf                # Development environment settings
├── nginx.prod.conf               # Production environment settings
├── mime.types                    # MIME type mappings
├── proxy_params.conf             # Reusable proxy parameters
├── sites-available/              # Available virtual host configurations
│   ├── api.conf                  # Backend API reverse proxy
│   ├── app.conf                  # Frontend application
│   ├── partner-portal.conf       # Partner portal with enhanced security
│   └── documentation.conf        # Documentation site
└── sites-enabled/                # Enabled virtual hosts (symlinks)
```

## Quick Start

### 1. Installation

Copy the configuration files to your Nginx directory:

```bash
# On Linux/Unix
sudo cp -r config/nginx/* /etc/nginx/

# Create required directories
sudo mkdir -p /var/www/frontend/dist
sudo mkdir -p /var/www/partner-portal/dist
sudo mkdir -p /var/www/docs
sudo mkdir -p /var/cache/nginx/api
sudo mkdir -p /var/cache/nginx/static
```

### 2. SSL Certificates

Generate SSL certificates for production:

```bash
# Self-signed certificates (for testing)
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/kitchenxpert.com.key \
  -out /etc/nginx/ssl/kitchenxpert.com.crt

# For production, use Let's Encrypt
sudo certbot --nginx -d kitchenxpert.com -d www.kitchenxpert.com
sudo certbot --nginx -d api.kitchenxpert.com
sudo certbot --nginx -d partners.kitchenxpert.com
sudo certbot --nginx -d docs.kitchenxpert.com

# Generate DH parameters for enhanced security (takes time)
sudo openssl dhparam -out /etc/nginx/ssl/dhparam.pem 4096
```

### 3. Enable Sites

Create symlinks in `sites-enabled` for the sites you want to activate:

```bash
cd /etc/nginx/sites-enabled

# Enable all sites
sudo ln -s ../sites-available/api.conf .
sudo ln -s ../sites-available/app.conf .
sudo ln -s ../sites-available/partner-portal.conf .
sudo ln -s ../sites-available/documentation.conf .

# Or enable individual sites
sudo ln -s ../sites-available/api.conf .
```

### 4. Environment Configuration

Choose your environment by uncommenting the appropriate include in `nginx.conf`:

```nginx
# For development
include /etc/nginx/nginx.dev.conf;

# For production
include /etc/nginx/nginx.prod.conf;
```

### 5. Test & Reload

```bash
# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Or restart
sudo systemctl restart nginx
```

## Configuration Files

### nginx.conf
Main configuration file with:
- Auto-detection of CPU cores
- Optimized worker settings (1024 connections)
- Gzip compression
- Security headers (X-Frame-Options, CSP, etc.)
- SSL/TLS settings (TLS 1.2+)
- Rate limiting zones
- Upstream definitions for load balancing
- Cache configuration

### nginx.dev.conf
Development-specific settings:
- Verbose logging (debug level)
- No SSL required (HTTP only)
- Disabled caching for fresh content
- Permissive CORS
- Hot module replacement support

### nginx.prod.conf
Production-optimized settings:
- HTTPS/TLS required with strict ciphers
- HTTP/2 enabled
- HSTS headers (2-year max-age)
- Aggressive caching
- Brotli compression (if available)
- Multiple backend servers for load balancing
- Enhanced security headers

### mime.types
Comprehensive MIME type mappings including:
- Standard web types (HTML, CSS, JS, JSON)
- Modern formats (WebP, AVIF, WASM)
- Font types (WOFF2, TTF, OTF)
- Document types (PDF, Office files)
- 3D models (glTF, STL)

### sites-available/api.conf
Backend API reverse proxy with:
- WebSocket support for real-time features
- Rate limiting (10 req/s general, 5 req/min auth)
- CORS configuration
- Health check endpoint
- Metrics endpoint (restricted access)
- File upload support (50MB max)
- GraphQL endpoint
- API caching for GET requests

### sites-available/app.conf
Frontend application server with:
- SPA routing (fallback to index.html)
- Aggressive asset caching (1 year for hashed files)
- Gzip compression
- Service worker support (no cache)
- Development HMR support (Vite/Webpack)
- www to non-www redirect

### sites-available/partner-portal.conf
Partner portal with enhanced security:
- HTTPS required (always redirects)
- Optional client certificate authentication (mTLS)
- Strict rate limiting (5 connections max)
- Enhanced security headers
- IP whitelisting support
- Fail2ban integration notes
- Secure file downloads

### sites-available/documentation.conf
Documentation site with:
- Search-friendly caching
- Optional basic authentication
- Clean URLs (remove .html extension)
- Versioned documentation support
- API docs (Swagger/OpenAPI)
- Markdown rendering support
- Search functionality (Meilisearch/Algolia)

## Security Features

### Headers
- **HSTS**: Force HTTPS with 2-year max-age
- **CSP**: Content Security Policy to prevent XSS
- **X-Frame-Options**: Prevent clickjacking
- **X-Content-Type-Options**: Prevent MIME sniffing
- **Referrer-Policy**: Control referrer information
- **Permissions-Policy**: Restrict browser features

### SSL/TLS
- TLS 1.2 and 1.3 only
- Modern cipher suites (ECDHE, AES-GCM, ChaCha20)
- OCSP stapling for certificate validation
- Session tickets disabled
- Perfect Forward Secrecy (PFS)

### Rate Limiting
- API endpoints: 10 requests/second
- Auth endpoints: 5 requests/minute
- Login endpoints: 3 requests/minute (production)
- Connection limit: 10 concurrent connections/IP

## Performance Optimizations

### Caching
- **Static assets**: 1 year (immutable)
- **API responses**: 5 minutes
- **HTML files**: No cache or short TTL
- **Open file cache**: 10,000 files

### Compression
- Gzip level 6 (good balance)
- Minimum size: 1000 bytes
- All text formats compressed
- Pre-compressed files support (gzip_static)

### HTTP/2
- Enabled in production
- Optimized header/field sizes
- Server push ready

### Load Balancing
- Least connection algorithm
- Health checks (manual/nginx plus)
- Fail-over support (backup servers)
- Keep-alive to upstream (64 connections)

## Monitoring & Logging

### Log Formats
- **main**: Standard Apache-style logging
- **detailed**: Includes timing and cache status
- **dev**: Verbose debugging information
- **partner**: Includes client certificate info

### Log Locations
```
/var/log/nginx/access.log         # Main access log
/var/log/nginx/error.log          # Main error log
/var/log/nginx/api.access.log     # API access log
/var/log/nginx/app.access.log     # Frontend access log
/var/log/nginx/partner-portal.access.log
/var/log/nginx/docs.access.log
```

### Status Endpoint
Production config includes a status endpoint on localhost:8080:

```bash
curl http://localhost:8080/nginx_status
```

## Customization

### Update Domain Names
Replace `kitchenxpert.com` with your actual domain in all `.conf` files:

```bash
cd /etc/nginx
sudo find . -type f -name "*.conf" -exec sed -i 's/kitchenxpert\.com/yourdomain.com/g' {} +
```

### Adjust Backend Ports
Update the `api_backend` upstream block in `nginx.conf`:

```nginx
upstream api_backend {
    server localhost:4000;  # Change to your API port
}
```

### Change Root Directories
Update the `root` directive in each virtual host:

```nginx
root /var/www/frontend/dist;  # Change to your path
```

### Enable/Disable Features

**Enable HTTP/2:**
```nginx
listen 443 ssl http2;  # Uncomment in production configs
```

**Enable Client Certificates (mTLS):**
```nginx
ssl_client_certificate /etc/nginx/ssl/partner-ca.crt;
ssl_verify_client on;
```

**Enable Basic Auth:**
```nginx
auth_basic "Protected Area";
auth_basic_user_file /etc/nginx/.htpasswd;
```

## Troubleshooting

### Check Configuration
```bash
sudo nginx -t
```

### Check Logs
```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Test Upstream Connectivity
```bash
curl http://localhost:4000/health
```

### Verify SSL
```bash
openssl s_client -connect kitchenxpert.com:443
```

### Test Rate Limiting
```bash
# Send 20 requests quickly
for i in {1..20}; do curl -I https://api.kitchenxpert.com/api/test; done
```

## Common Issues

### 502 Bad Gateway
- Backend service not running
- Wrong upstream port/address
- Firewall blocking connection
- Check: `sudo netstat -tlnp | grep 4000`

### 413 Request Entity Too Large
- Increase `client_max_body_size`
- Default is 20M for API, 10M for production

### CORS Errors
- Update `$cors_origin` pattern in api.conf
- Add your frontend domain to the regex

### SSL Certificate Errors
- Check certificate paths
- Verify certificate validity: `openssl x509 -in cert.pem -text -noout`
- Ensure intermediate certificates are included

## Production Checklist

- [ ] SSL certificates installed and valid
- [ ] DH parameters generated (4096-bit)
- [ ] Environment set to production (nginx.prod.conf)
- [ ] Rate limiting configured appropriately
- [ ] CORS origins restricted to your domains
- [ ] Server tokens disabled (server_tokens off)
- [ ] Security headers enabled
- [ ] Gzip compression enabled
- [ ] HTTP/2 enabled
- [ ] Log rotation configured
- [ ] Monitoring/alerting set up
- [ ] Backup servers configured
- [ ] Firewall rules configured
- [ ] DNS records pointing to server

## Best Practices

1. **Always test before reloading**: `sudo nginx -t`
2. **Use symlinks for enabled sites**: Easier to enable/disable
3. **Keep SSL certificates updated**: Use certbot auto-renewal
4. **Monitor logs regularly**: Set up log aggregation
5. **Set up rate limiting**: Protect against abuse
6. **Use HTTP/2**: Better performance
7. **Enable caching**: Reduce backend load
8. **Set up backups**: Configuration and certificates
9. **Use version control**: Track config changes
10. **Document customizations**: Update this README

## Resources

- [Nginx Documentation](https://nginx.org/en/docs/)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [Let's Encrypt](https://letsencrypt.org/)
- [Nginx HTTP/2 Guide](https://nginx.org/en/docs/http/ngx_http_v2_module.html)
- [Security Headers](https://securityheaders.com/)

## License

Copyright © 2024 KitchenXpert. All rights reserved.
