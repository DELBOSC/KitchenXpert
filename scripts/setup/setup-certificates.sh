#!/bin/bash
#
# Setup Certificates - KitchenXpert
#
# Generates SSL/TLS certificates for local development and production.
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Configuration
CERT_DIR="$PROJECT_ROOT/certs"
DEV_MODE="${DEV_MODE:-false}"
DOMAIN="${DOMAIN:-localhost}"
ADDITIONAL_DOMAINS="${ADDITIONAL_DOMAINS:-}"

# Logging
log() {
    local level=$1
    local message=$2

    case $level in
        "INFO")    echo -e "${BLUE}[CERTS]${NC} $message" ;;
        "SUCCESS") echo -e "${GREEN}[CERTS]${NC} $message" ;;
        "WARNING") echo -e "${YELLOW}[CERTS]${NC} $message" ;;
        "ERROR")   echo -e "${RED}[CERTS]${NC} $message" ;;
    esac
}

check_prerequisites() {
    log "INFO" "Checking prerequisites..."

    # Check for OpenSSL
    if ! command -v openssl &> /dev/null; then
        log "ERROR" "OpenSSL is required but not installed"
        exit 1
    fi

    log "INFO" "OpenSSL version: $(openssl version)"

    # Check for mkcert (optional, for trusted local certs)
    if command -v mkcert &> /dev/null; then
        log "INFO" "mkcert found - can generate trusted local certificates"
        MKCERT_AVAILABLE="true"
    else
        log "INFO" "mkcert not found - will use self-signed certificates"
        MKCERT_AVAILABLE="false"
    fi

    log "SUCCESS" "Prerequisites check passed"
}

setup_directories() {
    log "INFO" "Setting up certificate directories..."

    mkdir -p "$CERT_DIR"
    mkdir -p "$CERT_DIR/dev"
    mkdir -p "$CERT_DIR/prod"

    # Set secure permissions
    chmod 700 "$CERT_DIR"

    log "SUCCESS" "Directories created"
}

generate_dev_certificates_mkcert() {
    log "INFO" "Generating trusted development certificates with mkcert..."

    cd "$CERT_DIR/dev"

    # Install local CA if not already done
    mkcert -install 2>/dev/null || true

    # Generate certificates
    local domains="localhost 127.0.0.1 ::1"

    if [ -n "$ADDITIONAL_DOMAINS" ]; then
        domains="$domains $ADDITIONAL_DOMAINS"
    fi

    mkcert -key-file key.pem -cert-file cert.pem $domains

    log "SUCCESS" "Trusted development certificates generated"
}

generate_dev_certificates_openssl() {
    log "INFO" "Generating self-signed development certificates..."

    cd "$CERT_DIR/dev"

    # Generate private key
    openssl genrsa -out key.pem 2048
    chmod 600 key.pem

    # Create certificate config
    cat > openssl.cnf << EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
x509_extensions = v3_req

[dn]
C = CA
ST = Quebec
L = Montreal
O = KitchenXpert Development
OU = Development
CN = localhost

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
DNS.3 = kitchenxpert.local
DNS.4 = *.kitchenxpert.local
IP.1 = 127.0.0.1
IP.2 = ::1
EOF

    # Add additional domains
    if [ -n "$ADDITIONAL_DOMAINS" ]; then
        local i=5
        for domain in $ADDITIONAL_DOMAINS; do
            echo "DNS.$i = $domain" >> openssl.cnf
            ((i++))
        done
    fi

    # Generate certificate
    openssl req -new -x509 -days 365 -key key.pem -out cert.pem -config openssl.cnf

    # Clean up config
    rm openssl.cnf

    log "SUCCESS" "Self-signed development certificates generated"
    log "WARNING" "Note: You may need to trust the certificate in your browser"
}

generate_csr_for_production() {
    log "INFO" "Generating CSR for production certificate..."

    cd "$CERT_DIR/prod"

    # Generate private key
    openssl genrsa -out key.pem 4096
    chmod 600 key.pem

    # Create CSR config
    cat > csr.cnf << EOF
[req]
default_bits = 4096
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = req_ext

[dn]
C = CA
ST = Quebec
L = Montreal
O = KitchenXpert Inc.
OU = Engineering
CN = $DOMAIN

[req_ext]
subjectAltName = @alt_names

[alt_names]
DNS.1 = $DOMAIN
DNS.2 = www.$DOMAIN
DNS.3 = api.$DOMAIN
DNS.4 = portal.$DOMAIN
EOF

    # Generate CSR
    openssl req -new -key key.pem -out csr.pem -config csr.cnf

    log "SUCCESS" "CSR generated: $CERT_DIR/prod/csr.pem"
    log "INFO" "Submit this CSR to your certificate authority"

    # Clean up config
    rm csr.cnf
}

generate_dhparam() {
    log "INFO" "Generating Diffie-Hellman parameters (this may take a while)..."

    cd "$CERT_DIR"

    if [ ! -f "dhparam.pem" ]; then
        openssl dhparam -out dhparam.pem 2048
        log "SUCCESS" "DH parameters generated"
    else
        log "INFO" "DH parameters already exist, skipping"
    fi
}

verify_certificates() {
    log "INFO" "Verifying certificates..."

    local dev_cert="$CERT_DIR/dev/cert.pem"
    local dev_key="$CERT_DIR/dev/key.pem"

    if [ -f "$dev_cert" ] && [ -f "$dev_key" ]; then
        # Check certificate validity
        local expiry=$(openssl x509 -enddate -noout -in "$dev_cert" | cut -d= -f2)
        log "INFO" "Development certificate expires: $expiry"

        # Verify key matches certificate
        local cert_modulus=$(openssl x509 -noout -modulus -in "$dev_cert" | md5sum)
        local key_modulus=$(openssl rsa -noout -modulus -in "$dev_key" 2>/dev/null | md5sum)

        if [ "$cert_modulus" = "$key_modulus" ]; then
            log "SUCCESS" "Certificate and key match"
        else
            log "ERROR" "Certificate and key do not match!"
            exit 1
        fi
    fi
}

create_nginx_snippet() {
    log "INFO" "Creating nginx SSL configuration snippet..."

    cat > "$CERT_DIR/nginx-ssl.conf" << EOF
# SSL Configuration for KitchenXpert
# Include this in your nginx server block

ssl_certificate     $CERT_DIR/dev/cert.pem;
ssl_certificate_key $CERT_DIR/dev/key.pem;
ssl_dhparam         $CERT_DIR/dhparam.pem;

ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers on;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;

ssl_session_cache shared:SSL:10m;
ssl_session_timeout 1d;
ssl_session_tickets off;

# HSTS (comment out for development)
# add_header Strict-Transport-Security "max-age=63072000" always;
EOF

    log "SUCCESS" "nginx configuration created: $CERT_DIR/nginx-ssl.conf"
}

create_env_snippet() {
    log "INFO" "Creating environment configuration snippet..."

    cat > "$CERT_DIR/.env.ssl" << EOF
# SSL Certificate Paths for KitchenXpert
SSL_CERT_PATH=$CERT_DIR/dev/cert.pem
SSL_KEY_PATH=$CERT_DIR/dev/key.pem
SSL_ENABLED=true
EOF

    log "SUCCESS" "Environment snippet created: $CERT_DIR/.env.ssl"
}

print_summary() {
    echo ""
    log "SUCCESS" "Certificate setup complete!"
    echo ""
    echo "  Generated files:"
    echo "    Development:"
    echo "      • $CERT_DIR/dev/cert.pem"
    echo "      • $CERT_DIR/dev/key.pem"
    echo ""
    echo "    Configuration:"
    echo "      • $CERT_DIR/nginx-ssl.conf"
    echo "      • $CERT_DIR/.env.ssl"
    echo "      • $CERT_DIR/dhparam.pem"
    echo ""

    if [ -f "$CERT_DIR/prod/csr.pem" ]; then
        echo "    Production:"
        echo "      • $CERT_DIR/prod/csr.pem (submit to CA)"
        echo "      • $CERT_DIR/prod/key.pem (keep secure!)"
        echo ""
    fi

    log "INFO" "Add the following to your .env:"
    echo ""
    echo "  SSL_CERT_PATH=$CERT_DIR/dev/cert.pem"
    echo "  SSL_KEY_PATH=$CERT_DIR/dev/key.pem"
    echo ""
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dev)
            DEV_MODE="true"
            shift
            ;;
        --domain)
            DOMAIN="$2"
            shift 2
            ;;
        --additional-domains)
            ADDITIONAL_DOMAINS="$2"
            shift 2
            ;;
        --prod-csr)
            GENERATE_PROD_CSR="true"
            shift
            ;;
        --help)
            echo "Usage: setup-certificates.sh [options]"
            echo ""
            echo "Options:"
            echo "  --dev                       Generate development certificates only"
            echo "  --domain <domain>           Primary domain for production"
            echo "  --additional-domains <list> Space-separated additional domains"
            echo "  --prod-csr                  Generate CSR for production certificate"
            echo "  --help                      Show this help message"
            exit 0
            ;;
        *)
            log "ERROR" "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Main execution
check_prerequisites
setup_directories

# Generate development certificates
if [ "$MKCERT_AVAILABLE" = "true" ]; then
    generate_dev_certificates_mkcert
else
    generate_dev_certificates_openssl
fi

# Generate production CSR if requested
if [ "$GENERATE_PROD_CSR" = "true" ]; then
    generate_csr_for_production
fi

# Generate DH parameters
generate_dhparam

verify_certificates
create_nginx_snippet
create_env_snippet
print_summary

exit 0
