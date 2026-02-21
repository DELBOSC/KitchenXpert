#!/bin/bash
#
# SSL Certificate Check - KitchenXpert
#
# Checks SSL certificate validity and configuration.
#

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Configuration
CERTS_DIR="${CERTS_DIR:-$PROJECT_ROOT/certs}"
WARNING_DAYS="${WARNING_DAYS:-30}"
CRITICAL_DAYS="${CRITICAL_DAYS:-7}"
QUIET="${QUIET:-false}"

# Logging
log() {
    local level=$1
    local message=$2

    [ "$QUIET" = "true" ] && [ "$level" != "ERROR" ] && return

    case $level in
        "INFO")    echo -e "${BLUE}[SSL]${NC} $message" ;;
        "SUCCESS") echo -e "${GREEN}[SSL]${NC} $message" ;;
        "WARNING") echo -e "${YELLOW}[SSL]${NC} $message" ;;
        "ERROR")   echo -e "${RED}[SSL]${NC} $message" ;;
    esac
}

print_header() {
    [ "$QUIET" = "true" ] && return

    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}          KitchenXpert - SSL Certificate Check              ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

check_openssl() {
    if ! command -v openssl &> /dev/null; then
        log "ERROR" "OpenSSL is not installed"
        exit 1
    fi
}

get_cert_expiry() {
    local cert_file=$1

    openssl x509 -enddate -noout -in "$cert_file" 2>/dev/null | cut -d= -f2
}

get_days_until_expiry() {
    local cert_file=$1

    local expiry_date=$(get_cert_expiry "$cert_file")
    local expiry_epoch=$(date -d "$expiry_date" +%s 2>/dev/null || date -j -f "%b %d %H:%M:%S %Y %Z" "$expiry_date" +%s 2>/dev/null)
    local now_epoch=$(date +%s)

    echo $(( (expiry_epoch - now_epoch) / 86400 ))
}

check_certificate_file() {
    local cert_file=$1
    local name=$(basename "$cert_file")

    if [ ! -f "$cert_file" ]; then
        log "ERROR" "Certificate not found: $cert_file"
        return 1
    fi

    # Get certificate details
    local subject=$(openssl x509 -subject -noout -in "$cert_file" 2>/dev/null | sed 's/subject=//')
    local issuer=$(openssl x509 -issuer -noout -in "$cert_file" 2>/dev/null | sed 's/issuer=//')
    local expiry=$(get_cert_expiry "$cert_file")
    local days_left=$(get_days_until_expiry "$cert_file")

    echo ""
    log "INFO" "Certificate: $name"
    echo "  Subject:     $subject"
    echo "  Issuer:      $issuer"
    echo "  Expires:     $expiry"
    echo "  Days left:   $days_left"

    # Check expiry status
    if [ $days_left -lt 0 ]; then
        log "ERROR" "Certificate has EXPIRED"
        return 2
    elif [ $days_left -lt $CRITICAL_DAYS ]; then
        log "ERROR" "Certificate expires in $days_left days (CRITICAL)"
        return 2
    elif [ $days_left -lt $WARNING_DAYS ]; then
        log "WARNING" "Certificate expires in $days_left days"
        return 1
    else
        log "SUCCESS" "Certificate is valid"
        return 0
    fi
}

check_certificate_chain() {
    local cert_file=$1
    local ca_file=$2

    if [ ! -f "$ca_file" ]; then
        log "WARNING" "CA certificate not provided, skipping chain verification"
        return 0
    fi

    log "INFO" "Verifying certificate chain..."

    if openssl verify -CAfile "$ca_file" "$cert_file" &> /dev/null; then
        log "SUCCESS" "Certificate chain is valid"
        return 0
    else
        log "ERROR" "Certificate chain verification failed"
        return 1
    fi
}

check_key_match() {
    local cert_file=$1
    local key_file=$2

    if [ ! -f "$key_file" ]; then
        log "WARNING" "Private key file not found: $key_file"
        return 1
    fi

    log "INFO" "Checking certificate-key pair..."

    local cert_modulus=$(openssl x509 -modulus -noout -in "$cert_file" 2>/dev/null | md5sum)
    local key_modulus=$(openssl rsa -modulus -noout -in "$key_file" 2>/dev/null | md5sum)

    if [ "$cert_modulus" = "$key_modulus" ]; then
        log "SUCCESS" "Certificate and private key match"
        return 0
    else
        log "ERROR" "Certificate and private key DO NOT match"
        return 1
    fi
}

check_remote_certificate() {
    local host=$1
    local port=${2:-443}

    log "INFO" "Checking remote certificate: $host:$port"

    # Get certificate from remote server
    local cert_info=$(echo | openssl s_client -servername "$host" -connect "$host:$port" 2>/dev/null)

    if [ -z "$cert_info" ]; then
        log "ERROR" "Could not connect to $host:$port"
        return 1
    fi

    # Extract and check certificate
    local expiry=$(echo "$cert_info" | openssl x509 -enddate -noout 2>/dev/null | cut -d= -f2)

    if [ -z "$expiry" ]; then
        log "ERROR" "Could not retrieve certificate from $host"
        return 1
    fi

    local expiry_epoch=$(date -d "$expiry" +%s 2>/dev/null || date -j -f "%b %d %H:%M:%S %Y %Z" "$expiry" +%s 2>/dev/null)
    local now_epoch=$(date +%s)
    local days_left=$(( (expiry_epoch - now_epoch) / 86400 ))

    echo "  Host:        $host:$port"
    echo "  Expires:     $expiry"
    echo "  Days left:   $days_left"

    if [ $days_left -lt $CRITICAL_DAYS ]; then
        log "ERROR" "Certificate expires in $days_left days"
        return 2
    elif [ $days_left -lt $WARNING_DAYS ]; then
        log "WARNING" "Certificate expires in $days_left days"
        return 1
    else
        log "SUCCESS" "Certificate is valid"
        return 0
    fi
}

check_ssl_configuration() {
    local host=$1
    local port=${2:-443}

    log "INFO" "Checking SSL/TLS configuration..."

    # Check TLS versions
    local protocols=("ssl3" "tls1" "tls1_1" "tls1_2" "tls1_3")
    local supported=()
    local deprecated=()

    for proto in "${protocols[@]}"; do
        if echo | openssl s_client -"$proto" -connect "$host:$port" 2>/dev/null | grep -q "CONNECTED"; then
            case $proto in
                ssl3|tls1|tls1_1)
                    deprecated+=("$proto")
                    ;;
                *)
                    supported+=("$proto")
                    ;;
            esac
        fi
    done

    echo "  Supported:   ${supported[*]:-none}"

    if [ ${#deprecated[@]} -gt 0 ]; then
        log "WARNING" "Deprecated protocols enabled: ${deprecated[*]}"
    fi

    # Check cipher suites
    local weak_ciphers=$(echo | openssl s_client -connect "$host:$port" -cipher 'NULL:EXPORT:LOW:DES:RC4:MD5:PSK' 2>/dev/null | grep -c "CONNECTED" || echo "0")

    if [ $weak_ciphers -gt 0 ]; then
        log "WARNING" "Weak cipher suites are enabled"
    else
        log "SUCCESS" "No weak cipher suites detected"
    fi
}

scan_local_certificates() {
    log "INFO" "Scanning local certificates in: $CERTS_DIR"

    if [ ! -d "$CERTS_DIR" ]; then
        log "WARNING" "Certificates directory not found: $CERTS_DIR"
        return 0
    fi

    local cert_count=0
    local issues=0

    # Find all certificate files
    while IFS= read -r cert_file; do
        ((cert_count++))
        check_certificate_file "$cert_file" || ((issues++))

        # Check for matching key
        local key_file="${cert_file%.crt}.key"
        [ -f "$key_file" ] && check_key_match "$cert_file" "$key_file"
    done < <(find "$CERTS_DIR" -name "*.crt" -o -name "*.pem" 2>/dev/null)

    echo ""
    log "INFO" "Scanned $cert_count certificate(s), $issues issue(s) found"

    return $issues
}

print_summary() {
    [ "$QUIET" = "true" ] && return

    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}              SSL Check Complete                            ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "  Warning threshold:  $WARNING_DAYS days"
    echo "  Critical threshold: $CRITICAL_DAYS days"
    echo ""
}

# Parse arguments
HOSTS=()

while [[ $# -gt 0 ]]; do
    case $1 in
        --certs-dir)
            CERTS_DIR="$2"
            shift 2
            ;;
        --warning-days)
            WARNING_DAYS="$2"
            shift 2
            ;;
        --critical-days)
            CRITICAL_DAYS="$2"
            shift 2
            ;;
        --host|-h)
            HOSTS+=("$2")
            shift 2
            ;;
        --quiet|-q)
            QUIET="true"
            shift
            ;;
        --help)
            echo "Usage: ssl-cert-check.sh [options]"
            echo ""
            echo "Options:"
            echo "  --certs-dir <dir>     Local certificates directory"
            echo "  --warning-days <n>    Warning threshold (default: 30)"
            echo "  --critical-days <n>   Critical threshold (default: 7)"
            echo "  -h, --host <host>     Check remote host certificate"
            echo "  -q, --quiet           Quiet mode (errors only)"
            echo "  --help                Show this help message"
            echo ""
            echo "Examples:"
            echo "  ssl-cert-check.sh                     # Check local certs"
            echo "  ssl-cert-check.sh -h example.com      # Check remote host"
            echo "  ssl-cert-check.sh --warning-days 60   # Custom threshold"
            exit 0
            ;;
        *)
            log "ERROR" "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Main execution
print_header
check_openssl

exit_code=0

# Check local certificates
scan_local_certificates || exit_code=1

# Check remote hosts if specified
for host in "${HOSTS[@]}"; do
    echo ""
    check_remote_certificate "$host" || exit_code=1
    check_ssl_configuration "$host" || exit_code=1
done

print_summary

exit $exit_code
