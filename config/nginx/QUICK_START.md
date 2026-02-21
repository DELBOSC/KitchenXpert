# Nginx Configuration - Quick Start Guide

## Installation

### Automated Deployment (Recommended)

```bash
# Deploy to development
sudo ./deploy.sh dev

# Deploy to production
sudo ./deploy.sh prod
```

### Manual Deployment

```bash
# 1. Copy files
sudo cp -r . /etc/nginx/

# 2. Create directories
sudo mkdir -p /var/www/{frontend,partner-portal,docs}/dist
sudo mkdir -p /var/cache/nginx/{api,static}

# 3. Enable sites
cd /etc/nginx/sites-enabled
sudo ln -s ../sites-available/api.conf .
sudo ln -s ../sites-available/app.conf .

# 4. Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

## Configuration Files Overview

| File | Purpose |
|------|---------|
| `nginx.conf` | Main configuration (workers, gzip, SSL, rate limiting) |
| `nginx.dev.conf` | Development settings (verbose logs, no SSL, permissive CORS) |
| `nginx.prod.conf` | Production settings (HTTPS, HTTP/2, strict security) |
| `mime.types` | File type mappings (includes modern formats) |
| `proxy_params.conf` | Reusable proxy headers |
| `sites-available/api.conf` | Backend API reverse proxy (port 4000) |
| `sites-available/app.conf` | Frontend SPA (React/Vue) |
| `sites-available/partner-portal.conf` | Partner portal with enhanced security |
| `sites-available/documentation.conf` | Documentation site |

## Common Tasks

### Switch Environment

```bash
# Edit nginx.conf and uncomment the appropriate include:
sudo nano /etc/nginx/nginx.conf

# Development:
include /etc/nginx/nginx.dev.conf;

# Production:
include /etc/nginx/nginx.prod.conf;
```

### Enable/Disable Sites

```bash
cd /etc/nginx/sites-enabled

# Enable
sudo ln -s ../sites-available/api.conf .

# Disable
sudo rm api.conf

# Reload
sudo nginx -t && sudo systemctl reload nginx
```

### SSL Certificates

```bash
# Development (self-signed)
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/kitchenxpert.com.key \
  -out /etc/nginx/ssl/kitchenxpert.com.crt

# Production (Let's Encrypt)
sudo certbot --nginx -d kitchenxpert.com -d www.kitchenxpert.com
sudo certbot --nginx -d api.kitchenxpert.com
sudo certbot --nginx -d partners.kitchenxpert.com
sudo certbot --nginx -d docs.kitchenxpert.com

# Generate DH parameters (takes 5-10 minutes)
sudo openssl dhparam -out /etc/nginx/ssl/dhparam.pem 4096
```

### Update Domain Names

```bash
# Replace all instances of kitchenxpert.com
cd /etc/nginx
sudo find . -type f -name "*.conf" -exec sed -i 's/kitchenxpert\.com/yourdomain.com/g' {} +
```

### Change Backend Port

Edit `/etc/nginx/nginx.conf`:

```nginx
upstream api_backend {
    server localhost:4000;  # Change port here
}
```

### View Logs

```bash
# Real-time error log
sudo tail -f /var/log/nginx/error.log

# Real-time access log
sudo tail -f /var/log/nginx/access.log

# API-specific logs
sudo tail -f /var/log/nginx/api.access.log
sudo tail -f /var/log/nginx/api.error.log
```

### Test Configuration

```bash
# Validate syntax
sudo nginx -t

# Verbose test
sudo nginx -T

# Reload if valid
sudo nginx -t && sudo systemctl reload nginx
```

## Development Setup

### 1. Add to /etc/hosts

```bash
sudo nano /etc/hosts

# Add these lines:
127.0.0.1 kitchenxpert.com
127.0.0.1 api.kitchenxpert.com
127.0.0.1 partners.kitchenxpert.com
127.0.0.1 docs.kitchenxpert.com
```

### 2. Deploy development config

```bash
sudo ./deploy.sh dev
```

### 3. Start your backend

```bash
# Backend should run on port 4000
cd backend
npm start  # or your start command
```

### 4. Build frontend

```bash
cd frontend
npm run build
sudo cp -r dist/* /var/www/frontend/dist/
```

### 5. Test

```bash
# Test API
curl http://api.kitchenxpert.com/health

# Test frontend (in browser)
http://kitchenxpert.com
```

## Production Setup

### 1. Deploy production config

```bash
sudo ./deploy.sh prod
```

### 2. Install SSL certificates

```bash
# Let's Encrypt (recommended)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d kitchenxpert.com -d www.kitchenxpert.com
sudo certbot --nginx -d api.kitchenxpert.com
sudo certbot --nginx -d partners.kitchenxpert.com
sudo certbot --nginx -d docs.kitchenxpert.com

# Enable auto-renewal
sudo certbot renew --dry-run
```

### 3. Generate DH parameters

```bash
sudo openssl dhparam -out /etc/nginx/ssl/dhparam.pem 4096
```

### 4. Update configurations

```bash
# Update domain names
sudo find /etc/nginx -type f -name "*.conf" -exec sed -i 's/kitchenxpert\.com/yourdomain.com/g' {} +

# Uncomment SSL directives in virtual host configs
# In each sites-available/*.conf file:
# - Uncomment: listen 443 ssl http2;
# - Uncomment SSL certificate paths
# - Comment out development HTTP listeners
```

### 5. Configure firewall

```bash
# UFW
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Or iptables
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
```

### 6. Set up log rotation

Create `/etc/logrotate.d/nginx`:

```
/var/log/nginx/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 nginx nginx
    sharedscripts
    postrotate
        if [ -f /var/run/nginx.pid ]; then
            kill -USR1 `cat /var/run/nginx.pid`
        fi
    endscript
}
```

### 7. Test and reload

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Feature Configuration

### Enable HTTP/2

In virtual host configs, change:

```nginx
listen 443;  # Remove this
listen 443 ssl http2;  # Add this
```

### Enable Rate Limiting

Already configured in `nginx.conf`:

```nginx
# API: 10 requests/second
limit_req zone=api_limit burst=20 nodelay;

# Auth: 5 requests/minute
limit_req zone=auth_limit burst=5 nodelay;
```

### Enable Client Certificates (mTLS)

In `partner-portal.conf`, uncomment:

```nginx
ssl_client_certificate /etc/nginx/ssl/partner-ca.crt;
ssl_verify_client on;
```

### Enable Basic Auth

```bash
# Install htpasswd
sudo apt install apache2-utils

# Create password file
sudo htpasswd -c /etc/nginx/.htpasswd username

# In config file, uncomment:
auth_basic "Protected Area";
auth_basic_user_file /etc/nginx/.htpasswd;
```

### Enable IP Whitelisting

In virtual host config:

```nginx
# Allow specific IPs
allow 203.0.113.0/24;
allow 198.51.100.50;
deny all;
```

## Monitoring

### Nginx Status

```bash
# Enable status endpoint (already in prod config)
curl http://localhost:8080/nginx_status
```

### Check Processes

```bash
# Worker processes
ps aux | grep nginx

# Port usage
sudo netstat -tlnp | grep nginx
```

### Performance Metrics

```bash
# Connection stats
sudo nginx -V 2>&1 | grep -- 'worker_connections'

# Request rate
tail -f /var/log/nginx/access.log | pv -l -i 10 > /dev/null
```

## Troubleshooting

### 502 Bad Gateway

```bash
# Check backend is running
curl http://localhost:4000/health

# Check Nginx can connect
sudo netstat -tlnp | grep 4000

# Check SELinux (if enabled)
sudo setsebool -P httpd_can_network_connect 1
```

### Permission Denied

```bash
# Check file permissions
ls -la /var/www/frontend/dist

# Fix ownership
sudo chown -R nginx:nginx /var/www
# or
sudo chown -R www-data:www-data /var/www
```

### SSL Issues

```bash
# Test SSL
openssl s_client -connect kitchenxpert.com:443

# Check certificate
sudo nginx -t

# Verify certificate files
sudo openssl x509 -in /etc/nginx/ssl/cert.crt -text -noout
```

### CORS Errors

Update CORS origin pattern in `api.conf`:

```nginx
if ($http_origin ~* (https?://(localhost|yourdomain\.com)(:[0-9]+)?)) {
    set $cors_origin $http_origin;
}
```

## Performance Tuning

### Increase Worker Connections

In `nginx.conf`:

```nginx
events {
    worker_connections 2048;  # Increase from 1024
}
```

### Enable Caching

Already configured. Adjust cache sizes in `nginx.conf`:

```nginx
proxy_cache_path /var/cache/nginx/api
                 max_size=500m;  # Increase from 100m
```

### Enable Brotli Compression

Install module and uncomment in `nginx.prod.conf`:

```bash
sudo apt install nginx-module-brotli
```

```nginx
brotli on;
brotli_comp_level 6;
```

## Security Hardening

### Update Security Headers

Already configured. Adjust in virtual host configs:

```nginx
add_header Content-Security-Policy "default-src 'self';" always;
add_header X-Frame-Options "DENY" always;
```

### Enable Fail2ban

```bash
sudo apt install fail2ban
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
```

Add to `/etc/fail2ban/jail.local`:

```ini
[nginx-limit-req]
enabled = true
filter = nginx-limit-req
logpath = /var/log/nginx/*error.log
maxretry = 5
bantime = 3600
```

## Backup & Restore

### Backup

```bash
# Backup config
sudo tar -czf nginx-backup-$(date +%Y%m%d).tar.gz /etc/nginx

# Backup SSL
sudo tar -czf ssl-backup-$(date +%Y%m%d).tar.gz /etc/nginx/ssl
```

### Restore

```bash
sudo tar -xzf nginx-backup-20240101.tar.gz -C /
sudo nginx -t && sudo systemctl reload nginx
```

## Useful Commands

```bash
# Start/Stop/Reload
sudo systemctl start nginx
sudo systemctl stop nginx
sudo systemctl reload nginx
sudo systemctl restart nginx

# Enable on boot
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx

# View config
sudo nginx -T | less

# Count active connections
sudo ss -s | grep -i tcp

# Test performance
ab -n 1000 -c 10 http://kitchenxpert.com/
```

## Resources

- Full documentation: See [README.md](README.md)
- Nginx docs: https://nginx.org/en/docs/
- SSL config: https://ssl-config.mozilla.org/
