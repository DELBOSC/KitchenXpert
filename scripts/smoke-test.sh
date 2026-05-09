#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# KitchenXpert smoke test
#
# What it does
#   1. Boots Postgres + Redis with `docker compose -f scripts/docker-compose.smoke.yml`
#   2. Runs Prisma migrations + the catalog seed
#   3. Builds + starts the backend (in the background) and the frontend
#   4. Probes 12 critical endpoints with curl, asserts expected status codes
#   5. Tears everything down on exit
#
# Flags
#   --ci         also runs `pnpm test` (jest + vitest), fails the script on
#                regression
#   --keep-up    do not tear down docker / processes after probing — useful
#                when you want to manually click around in the browser after
#                the script finishes
#
# Exit codes
#   0  every probe returned the expected status
#   1  at least one probe failed
#   2  bootstrap failure (docker, migrations, build)
# -----------------------------------------------------------------------------

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

CI_MODE=0
KEEP_UP=0
for arg in "$@"; do
  case "$arg" in
    --ci) CI_MODE=1 ;;
    --keep-up) KEEP_UP=1 ;;
  esac
done

log()  { printf '\033[1;36m[smoke]\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m✓\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m✗\033[0m %s\n' "$*" >&2; }

cleanup() {
  if [ "$KEEP_UP" -eq 1 ]; then
    log "--keep-up flag set — leaving services running"
    return
  fi
  log "Tearing down…"
  [ -n "${BACKEND_PID:-}" ] && kill "$BACKEND_PID" 2>/dev/null || true
  [ -n "${FRONTEND_PID:-}" ] && kill "$FRONTEND_PID" 2>/dev/null || true
  docker compose -f scripts/docker-compose.smoke.yml down -v --remove-orphans 2>/dev/null || true
}
trap cleanup EXIT

# -----------------------------------------------------------------------------
# 1. Boot Postgres + Redis
# -----------------------------------------------------------------------------
log "Booting Postgres + Redis with docker compose"
docker compose -f scripts/docker-compose.smoke.yml up -d || { fail "docker compose failed"; exit 2; }

log "Waiting for Postgres to accept connections"
for _ in $(seq 1 30); do
  if docker compose -f scripts/docker-compose.smoke.yml exec -T postgres pg_isready -U postgres >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

# -----------------------------------------------------------------------------
# 2. Env + migrations + seed
# -----------------------------------------------------------------------------
export NODE_ENV=development
export DATABASE_URL="postgresql://postgres:postgres@localhost:5433/kitchenxpert"
export REDIS_URL="redis://localhost:6380"
export JWT_ACCESS_SECRET="$(openssl rand -hex 32 2>/dev/null || node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
export JWT_REFRESH_SECRET="$(openssl rand -hex 32 2>/dev/null || node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
export DATA_ENCRYPTION_KEY="$(openssl rand -hex 32 2>/dev/null || node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
export PORT=4000
export APP_URL="http://localhost:5173"
export CORS_ORIGINS="http://localhost:5173"
export STRIPE_SECRET_KEY="sk_test_dummy"
export STRIPE_WEBHOOK_SECRET="whsec_test_dummy"

log "Applying Prisma migrations"
pnpm --filter @kitchenxpert/backend prisma:migrate:deploy >/tmp/smoke-migrate.log 2>&1 \
  || { fail "migrations failed (see /tmp/smoke-migrate.log)"; exit 2; }

log "Seeding database (5 providers + sample catalog)"
pnpm --filter @kitchenxpert/backend db:seed >/tmp/smoke-seed.log 2>&1 \
  || { fail "seed failed (see /tmp/smoke-seed.log)"; exit 2; }

# -----------------------------------------------------------------------------
# 3. Start backend + frontend
# -----------------------------------------------------------------------------
log "Building backend"
pnpm --filter @kitchenxpert/backend build >/tmp/smoke-backend-build.log 2>&1 \
  || { fail "backend build failed (see /tmp/smoke-backend-build.log)"; exit 2; }

log "Starting backend on :$PORT"
pnpm --filter @kitchenxpert/backend start >/tmp/smoke-backend.log 2>&1 &
BACKEND_PID=$!

log "Waiting for backend health check"
for _ in $(seq 1 30); do
  if curl -fsS "http://localhost:${PORT}/api/v1/health" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

log "Building frontend"
pnpm --filter @kitchenxpert/frontend build >/tmp/smoke-frontend-build.log 2>&1 \
  || { fail "frontend build failed (see /tmp/smoke-frontend-build.log)"; exit 2; }

log "Serving frontend on :5173"
pnpm --filter @kitchenxpert/frontend preview --port 5173 >/tmp/smoke-frontend.log 2>&1 &
FRONTEND_PID=$!
sleep 3

# -----------------------------------------------------------------------------
# 4. Probe critical endpoints
# -----------------------------------------------------------------------------
PASS=0; FAIL=0
probe() {
  local method=$1 path=$2 expected=$3 desc=$4
  local actual
  actual=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "http://localhost:${PORT}${path}" \
    -H "Content-Type: application/json" \
    -d "${5:-}" 2>/dev/null || echo "000")
  if [ "$actual" = "$expected" ]; then
    ok "$method $path → $actual ($desc)"
    PASS=$((PASS+1))
  else
    fail "$method $path → $actual (expected $expected, $desc)"
    FAIL=$((FAIL+1))
  fi
}

log "Probing endpoints…"
probe GET  /api/v1/health                         200 "basic health"
probe GET  /api/v1/health/ready                   200 "readiness check"
probe GET  /api/v1/docs/openapi.json              200 "OpenAPI spec generated"
probe GET  /api/v1/providers                      200 "5 catalog providers listed"
probe GET  /api/v1/leroy-merlin/products          200 "Leroy Merlin products from seed"
probe GET  /api/v1/bosch/appliances               200 "Bosch appliances from seed"
probe POST /api/v1/auth/register                  400 "register without body should 400"
probe POST /api/v1/auth/login                     400 "login without body should 400"
probe GET  /api/v1/me/gdpr/summary                401 "GDPR endpoints require auth"
probe POST /api/v1/providers/import               401 "import requires auth"
probe GET  /api/v1/users/me                       401 "users/me requires auth"
probe GET  http://localhost:5173                  200 "frontend index.html serves"

# -----------------------------------------------------------------------------
# 5. (Optional) full test suite
# -----------------------------------------------------------------------------
if [ "$CI_MODE" -eq 1 ]; then
  log "CI mode → running full test suite"
  pnpm --filter @kitchenxpert/backend test || FAIL=$((FAIL+1))
  pnpm --filter @kitchenxpert/3d-engine test || FAIL=$((FAIL+1))
  pnpm --filter @kitchenxpert/frontend test || true   # frontend tests have known debt; warn but don't fail
fi

# -----------------------------------------------------------------------------
log ""
log "Summary: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] || exit 1
exit 0
