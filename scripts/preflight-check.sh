#!/usr/bin/env bash
# =============================================================================
# preflight-check.sh — KitchenXpert production readiness gate
# -----------------------------------------------------------------------------
# Verifies that the current shell environment can boot the production stack.
# Exits with a non-zero status as soon as any REQUIRED check fails — designed
# to be the last step of CI/CD before `docker stack deploy`.
#
# Usage:
#   set -a && source .env.production && set +a
#   bash scripts/preflight-check.sh                # full run
#   bash scripts/preflight-check.sh --skip-network # offline subset
#
# Each check prints one line, prefixed with:
#   ✅  ok
#   ⚠   warning (non-blocking)
#   ❌  failure (blocking)
# =============================================================================

set -uo pipefail

SKIP_NETWORK=false
[ "${1-}" = "--skip-network" ] && SKIP_NETWORK=true

# ---------- counters ----------------------------------------------------------
PASS=0
WARN=0
FAIL=0

ok()    { printf '✅  %s\n' "$1"; PASS=$((PASS+1)); }
warn()  { printf '⚠   %s\n' "$1"; WARN=$((WARN+1)); }
fail()  { printf '❌  %s\n' "$1"; FAIL=$((FAIL+1)); }

section() {
  printf '\n\033[1m── %s ─────────────────────────────────\033[0m\n' "$1"
}

# ---------- helpers -----------------------------------------------------------

require_var() {
  local name="$1"
  local value="${!name-}"
  if [ -z "$value" ]; then
    fail "$name is unset"
    return 1
  fi
  case "$value" in
    *CHANGE_ME*|*YOUR_*|*your-*|TODO_*|*PLACEHOLDER*)
      fail "$name still contains a placeholder value"
      return 1 ;;
  esac
  return 0
}

require_min_length() {
  local name="$1" min="$2" value="${!1-}"
  if [ "${#value}" -lt "$min" ]; then
    fail "$name is shorter than $min chars (current: ${#value})"
    return 1
  fi
  return 0
}

# ---------- 1. tooling --------------------------------------------------------
section "1. Tooling"

for cmd in node openssl curl; do
  if command -v "$cmd" >/dev/null 2>&1; then
    ok "$cmd present ($($cmd --version 2>&1 | head -n1))"
  else
    fail "$cmd missing — required by the runtime"
  fi
done

if command -v psql >/dev/null 2>&1; then ok "psql present"
else warn "psql missing — DB connectivity check will be skipped"; fi

if command -v redis-cli >/dev/null 2>&1; then ok "redis-cli present"
else warn "redis-cli missing — Redis connectivity check will be skipped"; fi

# ---------- 2. environment variables ------------------------------------------
section "2. Required environment variables"

REQUIRED_VARS=(
  NODE_ENV APP_URL API_URL
  DATABASE_URL REDIS_URL
  JWT_ACCESS_SECRET JWT_REFRESH_SECRET DATA_ENCRYPTION_KEY INTERNAL_API_KEY
  CORS_ORIGINS BCRYPT_ROUNDS
  SMTP_HOST SMTP_USER SMTP_PASS MAIL_FROM
  S3_ENDPOINT S3_REGION S3_BUCKET S3_ACCESS_KEY_ID S3_SECRET_ACCESS_KEY
  STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET STRIPE_PUBLIC_KEY
)

for v in "${REQUIRED_VARS[@]}"; do
  require_var "$v" && ok "$v is set"
done

[ "${NODE_ENV-}" = "production" ] && ok "NODE_ENV=production" || fail "NODE_ENV must be 'production' (current: ${NODE_ENV-unset})"

# ---------- 3. secret strength ------------------------------------------------
section "3. Secret strength"

# JWT secrets are base64. 64 raw bytes ≈ 88 base64 chars after padding.
require_min_length JWT_ACCESS_SECRET  64 && ok "JWT_ACCESS_SECRET length OK"
require_min_length JWT_REFRESH_SECRET 64 && ok "JWT_REFRESH_SECRET length OK"

if [ "${JWT_ACCESS_SECRET-}" = "${JWT_REFRESH_SECRET-}" ]; then
  fail "JWT_ACCESS_SECRET and JWT_REFRESH_SECRET MUST differ"
else
  ok "JWT access/refresh secrets are distinct"
fi

# DATA_ENCRYPTION_KEY must be hex 64 chars (32 bytes).
if [ "${#DATA_ENCRYPTION_KEY-}" -ne 64 ]; then
  fail "DATA_ENCRYPTION_KEY must be exactly 64 hex chars (got ${#DATA_ENCRYPTION_KEY-0})"
elif ! printf '%s' "${DATA_ENCRYPTION_KEY-}" | grep -qE '^[0-9a-fA-F]{64}$'; then
  fail "DATA_ENCRYPTION_KEY is not valid hex"
else
  ok "DATA_ENCRYPTION_KEY format OK (32 bytes hex)"
fi

# ---------- 4. URL / origin sanity --------------------------------------------
section "4. URL & origin sanity"

case "${DATABASE_URL-}" in
  postgresql://*sslmode=require*) ok "DATABASE_URL uses sslmode=require" ;;
  postgresql://*) fail "DATABASE_URL is missing sslmode=require" ;;
  *) fail "DATABASE_URL is not a postgresql:// URL" ;;
esac

case "${REDIS_URL-}" in
  rediss://*) ok "REDIS_URL uses TLS (rediss://)" ;;
  redis://*) warn "REDIS_URL uses plain TCP — only acceptable on a private network" ;;
  *) fail "REDIS_URL is malformed" ;;
esac

case "${STRIPE_SECRET_KEY-}" in
  sk_live_*) ok "STRIPE_SECRET_KEY is a live key" ;;
  sk_test_*) fail "STRIPE_SECRET_KEY is a TEST key — refuse to deploy" ;;
  *) fail "STRIPE_SECRET_KEY shape is invalid" ;;
esac

case "${STRIPE_WEBHOOK_SECRET-}" in
  whsec_*) ok "STRIPE_WEBHOOK_SECRET shape OK" ;;
  *) fail "STRIPE_WEBHOOK_SECRET must start with whsec_" ;;
esac

if printf '%s' "${CORS_ORIGINS-}" | grep -q '\*'; then
  fail "CORS_ORIGINS contains a wildcard"
elif printf '%s' "${CORS_ORIGINS-}" | grep -qE '^https://'; then
  ok "CORS_ORIGINS uses https://"
else
  warn "CORS_ORIGINS does not start with https://"
fi

# ---------- 5. live network checks --------------------------------------------
if $SKIP_NETWORK; then
  section "5. Network checks (skipped via --skip-network)"
else
  section "5. Network reachability"

  # 5.a Postgres
  if command -v psql >/dev/null 2>&1; then
    if PGCONNECT_TIMEOUT=5 psql "${DATABASE_URL-}" -c 'SELECT 1;' >/dev/null 2>&1; then
      ok "Postgres reachable and accepting connections"
    else
      fail "Postgres connection failed"
    fi
  fi

  # 5.b Redis
  if command -v redis-cli >/dev/null 2>&1; then
    if redis-cli -u "${REDIS_URL-}" --no-auth-warning ping 2>/dev/null | grep -q '^PONG$'; then
      ok "Redis reachable (PONG)"
    else
      fail "Redis PING failed"
    fi
  fi

  # 5.c S3
  if [ -n "${S3_ENDPOINT-}" ] && [ -n "${S3_BUCKET-}" ]; then
    if curl -sf -o /dev/null -m 8 "${S3_ENDPOINT}/${S3_BUCKET}/?location"; then
      ok "S3 endpoint reachable for bucket ${S3_BUCKET}"
    else
      # 403 still proves DNS+TLS work; we treat that as ok.
      code=$(curl -s -o /dev/null -w '%{http_code}' -m 8 "${S3_ENDPOINT}/${S3_BUCKET}/")
      case "$code" in
        2*|3*|403|404) ok "S3 endpoint reachable (HTTP $code)" ;;
        *) fail "S3 endpoint unreachable (HTTP $code)" ;;
      esac
    fi
  fi

  # 5.d Stripe webhook secret syntax already checked; here we ping the API.
  if [ -n "${STRIPE_SECRET_KEY-}" ]; then
    code=$(curl -s -o /dev/null -w '%{http_code}' -m 8 \
      -u "${STRIPE_SECRET_KEY}:" https://api.stripe.com/v1/balance)
    case "$code" in
      200) ok "Stripe API authenticates (live key valid)" ;;
      401) fail "Stripe rejected the secret key (HTTP 401)" ;;
      *)   warn "Stripe API check inconclusive (HTTP $code)" ;;
    esac
  fi

  # 5.e Anthropic
  if [ -n "${ANTHROPIC_API_KEY-}" ]; then
    code=$(curl -s -o /dev/null -w '%{http_code}' -m 8 \
      -H "x-api-key: ${ANTHROPIC_API_KEY}" \
      -H "anthropic-version: 2023-06-01" \
      https://api.anthropic.com/v1/models)
    case "$code" in
      200) ok "Anthropic API key valid" ;;
      401|403) fail "Anthropic rejected the API key (HTTP $code)" ;;
      *) warn "Anthropic API check inconclusive (HTTP $code)" ;;
    esac
  else
    warn "ANTHROPIC_API_KEY unset — AI assistant feature will be disabled"
  fi

  # 5.f Google Gemini
  if [ -n "${GOOGLE_GENAI_API_KEY-}" ]; then
    code=$(curl -s -o /dev/null -w '%{http_code}' -m 8 \
      "https://generativelanguage.googleapis.com/v1beta/models?key=${GOOGLE_GENAI_API_KEY}")
    case "$code" in
      200) ok "Google Gemini API key valid" ;;
      401|403) fail "Gemini rejected the API key (HTTP $code)" ;;
      *) warn "Gemini API check inconclusive (HTTP $code)" ;;
    esac
  else
    warn "GOOGLE_GENAI_API_KEY unset — image generation will be disabled"
  fi

  # 5.g SMTP
  if command -v openssl >/dev/null 2>&1 && [ -n "${SMTP_HOST-}" ]; then
    if echo 'QUIT' | timeout 8 openssl s_client \
        -starttls smtp -connect "${SMTP_HOST}:${SMTP_PORT:-587}" \
        -crlf -quiet 2>/dev/null | grep -q '^220'; then
      ok "SMTP STARTTLS handshake OK on ${SMTP_HOST}:${SMTP_PORT:-587}"
    else
      fail "SMTP STARTTLS failed on ${SMTP_HOST}:${SMTP_PORT:-587}"
    fi
  fi
fi

# ---------- 6. summary --------------------------------------------------------
section "Summary"
printf '   %d ok   %d warning(s)   %d failure(s)\n' "$PASS" "$WARN" "$FAIL"

if [ "$FAIL" -gt 0 ]; then
  echo
  echo "Refusing to declare environment production-ready."
  exit 1
fi

if [ "$WARN" -gt 0 ]; then
  echo
  echo "Environment is bootable but has warnings — review above."
  exit 0
fi

echo
echo "All checks passed — safe to deploy."
exit 0
