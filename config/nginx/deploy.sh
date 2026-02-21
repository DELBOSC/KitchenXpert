#!/bin/bash
# ==============================================================================
# KitchenXpert - Nginx Configuration Deployment Script
# ==============================================================================
# Description: Automated deployment script for Nginx configuration
# Usage: sudo ./deploy.sh [dev|prod]
# ==============================================================================

set -euo pipefail  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NGINX_DIR="/etc/nginx"
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENVIRONMENT="${1:-dev}"

# Functions
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "This script must be run as root"
        echo "Usage: sudo ./deploy.sh [dev|prod]"
        exit 1
    fi
}

# Validate environment
validate_environment() {
    if [[ ! "$ENVIRONMENT" =~ ^(dev|prod)$ ]]; then
        print_error "Invalid environment: $ENVIRONMENT"
        echo "Usage: sudo ./deploy.sh [dev|prod]"
        exit 1
    fi
    print_success "Environment: $ENVIRONMENT"
}

# Backup existing configuration
backup_config() {
    print_header "Backing up existing configuration"

    BACKUP_DIR="/etc/nginx/backup_$(date +%Y%m%d_%H%M%S)"

    if [ -d "$NGINX_DIR" ]; then
        mkdir -p "$BACKUP_DIR"
        cp -r "$NGINX_DIR"/* "$BACKUP_DIR/" 2>/dev/null || true
        print_success "Backup created at: $BACKUP_DIR"
    else
        print_warning "No existing configuration to backup"
    fi
}

# Create required directories
create_directories() {
    print_header "Creating required directories"

    # Nginx directories
    mkdir -p "$NGINX_DIR/sites-available"
    mkdir -p "$NGINX_DIR/sites-enabled"
    mkdir -p "$NGINX_DIR/conf.d"
    mkdir -p "$NGINX_DIR/ssl"
    print_success "Nginx directories created"

    # Web root directories
    mkdir -p /var/www/frontend/dist
    mkdir -p /var/www/partner-portal/dist
    mkdir -p /var/www/docs
    print_success "Web root directories created"

    # Cache directories
    mkdir -p /var/cache/nginx/api
    mkdir -p /var/cache/nginx/static
    chown -R nginx:nginx /var/cache/nginx 2>/dev/null || chown -R www-data:www-data /var/cache/nginx
    print_success "Cache directories created"

    # Log directory
    mkdir -p /var/log/nginx
    print_success "Log directory verified"
}

# Copy configuration files
copy_configs() {
    print_header "Copying configuration files"

    # Main configuration
    cp "$SOURCE_DIR/nginx.conf" "$NGINX_DIR/nginx.conf"
    print_success "Copied nginx.conf"

    # Environment-specific configuration
    cp "$SOURCE_DIR/nginx.dev.conf" "$NGINX_DIR/nginx.dev.conf"
    cp "$SOURCE_DIR/nginx.prod.conf" "$NGINX_DIR/nginx.prod.conf"
    print_success "Copied environment configurations"

    # MIME types
    cp "$SOURCE_DIR/mime.types" "$NGINX_DIR/mime.types"
    print_success "Copied mime.types"

    # Proxy parameters
    cp "$SOURCE_DIR/proxy_params.conf" "$NGINX_DIR/conf.d/proxy_params.conf"
    print_success "Copied proxy_params.conf"

    # Virtual host configurations
    cp "$SOURCE_DIR/sites-available/"*.conf "$NGINX_DIR/sites-available/"
    print_success "Copied virtual host configurations"
}

# Configure environment
configure_environment() {
    print_header "Configuring environment: $ENVIRONMENT"

    # Update main config to include correct environment file
    if [ "$ENVIRONMENT" = "prod" ]; then
        sed -i 's/# include \/etc\/nginx\/nginx.prod.conf;/include \/etc\/nginx\/nginx.prod.conf;/' "$NGINX_DIR/nginx.conf"
        sed -i 's/include \/etc\/nginx\/nginx.dev.conf;/# include \/etc\/nginx\/nginx.dev.conf;/' "$NGINX_DIR/nginx.conf"
        print_success "Configured for production"
    else
        sed -i 's/# include \/etc\/nginx\/nginx.dev.conf;/include \/etc\/nginx\/nginx.dev.conf;/' "$NGINX_DIR/nginx.conf"
        sed -i 's/include \/etc\/nginx\/nginx.prod.conf;/# include \/etc\/nginx\/nginx.prod.conf;/' "$NGINX_DIR/nginx.conf"
        print_success "Configured for development"
    fi
}

# Enable sites
enable_sites() {
    print_header "Enabling virtual hosts"

    cd "$NGINX_DIR/sites-enabled"

    # Remove existing symlinks
    rm -f *.conf

    # Ask which sites to enable
    echo "Which sites do you want to enable?"
    echo "1) API only"
    echo "2) Frontend App only"
    echo "3) Partner Portal only"
    echo "4) Documentation only"
    echo "5) All sites"
    read -p "Enter choice [1-5] (default: 5): " choice
    choice=${choice:-5}

    case $choice in
        1)
            ln -s ../sites-available/api.conf .
            print_success "Enabled API"
            ;;
        2)
            ln -s ../sites-available/app.conf .
            print_success "Enabled Frontend App"
            ;;
        3)
            ln -s ../sites-available/partner-portal.conf .
            print_success "Enabled Partner Portal"
            ;;
        4)
            ln -s ../sites-available/documentation.conf .
            print_success "Enabled Documentation"
            ;;
        5)
            ln -s ../sites-available/api.conf .
            ln -s ../sites-available/app.conf .
            ln -s ../sites-available/partner-portal.conf .
            ln -s ../sites-available/documentation.conf .
            print_success "Enabled all sites"
            ;;
        *)
            print_error "Invalid choice"
            exit 1
            ;;
    esac
}

# Generate self-signed SSL certificates (for development)
generate_ssl_dev() {
    if [ "$ENVIRONMENT" = "dev" ]; then
        print_header "Generating self-signed SSL certificates"

        cd "$NGINX_DIR/ssl"

        # Generate certificates for each domain
        for domain in kitchenxpert.com api.kitchenxpert.com partners.kitchenxpert.com docs.kitchenxpert.com; do
            if [ ! -f "$domain.crt" ]; then
                openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
                    -keyout "$domain.key" \
                    -out "$domain.crt" \
                    -subj "/C=US/ST=State/L=City/O=KitchenXpert/CN=$domain" 2>/dev/null
                print_success "Generated certificate for $domain"
            else
                print_info "Certificate for $domain already exists"
            fi
        done
    fi
}

# Test configuration
test_config() {
    print_header "Testing Nginx configuration"

    if nginx -t; then
        print_success "Configuration test passed"
        return 0
    else
        print_error "Configuration test failed"
        return 1
    fi
}

# Reload Nginx
reload_nginx() {
    print_header "Reloading Nginx"

    if systemctl is-active --quiet nginx; then
        systemctl reload nginx
        print_success "Nginx reloaded"
    else
        systemctl start nginx
        print_success "Nginx started"
    fi
}

# Print summary
print_summary() {
    print_header "Deployment Summary"

    echo "Environment: $ENVIRONMENT"
    echo "Nginx config: $NGINX_DIR"
    echo "Enabled sites:"
    ls -1 "$NGINX_DIR/sites-enabled/"*.conf | xargs -n1 basename
    echo ""

    if [ "$ENVIRONMENT" = "prod" ]; then
        print_warning "Production Checklist:"
        echo "  □ Install SSL certificates (use Let's Encrypt)"
        echo "  □ Generate DH parameters: openssl dhparam -out /etc/nginx/ssl/dhparam.pem 4096"
        echo "  □ Update domain names in configs"
        echo "  □ Configure firewall (allow 80, 443)"
        echo "  □ Set up log rotation"
        echo "  □ Configure monitoring"
        echo "  □ Update DNS records"
    else
        print_info "Development mode - using self-signed certificates"
        echo "  Access sites at:"
        echo "    - https://kitchenxpert.com (Frontend App)"
        echo "    - https://api.kitchenxpert.com (API)"
        echo "    - https://partners.kitchenxpert.com (Partner Portal)"
        echo "    - https://docs.kitchenxpert.com (Documentation)"
        echo ""
        echo "  Add to /etc/hosts:"
        echo "    127.0.0.1 kitchenxpert.com"
        echo "    127.0.0.1 api.kitchenxpert.com"
        echo "    127.0.0.1 partners.kitchenxpert.com"
        echo "    127.0.0.1 docs.kitchenxpert.com"
    fi
}

# Main execution
main() {
    print_header "KitchenXpert Nginx Deployment"

    check_root
    validate_environment
    backup_config
    create_directories
    copy_configs
    configure_environment
    enable_sites
    generate_ssl_dev

    if test_config; then
        reload_nginx
        print_summary
        print_success "Deployment completed successfully!"
    else
        print_error "Deployment failed - please check configuration"
        echo "Restore from backup: $BACKUP_DIR"
        exit 1
    fi
}

# Run main function
main
