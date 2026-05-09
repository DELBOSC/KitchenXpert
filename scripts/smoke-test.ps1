# KitchenXpert smoke test — Windows PowerShell version.
# See scripts/smoke-test.sh for the Bash equivalent and detailed comments.

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

$Ci = $args -contains "--ci"
$KeepUp = $args -contains "--keep-up"

function Log($msg)  { Write-Host "[smoke] $msg" -ForegroundColor Cyan }
function OK($msg)   { Write-Host "  OK $msg" -ForegroundColor Green }
function Fail($msg) { Write-Host "  FAIL $msg" -ForegroundColor Red }

$BackendJob = $null
$FrontendJob = $null

function Cleanup {
  if ($KeepUp) {
    Log "--keep-up flag set, leaving services running"
    return
  }
  Log "Tearing down..."
  if ($BackendJob) { Stop-Job $BackendJob -ErrorAction SilentlyContinue; Remove-Job $BackendJob -Force -ErrorAction SilentlyContinue }
  if ($FrontendJob) { Stop-Job $FrontendJob -ErrorAction SilentlyContinue; Remove-Job $FrontendJob -Force -ErrorAction SilentlyContinue }
  docker compose -f scripts/docker-compose.smoke.yml down -v --remove-orphans 2>$null
}
trap { Cleanup; throw }

# 1. Boot Postgres + Redis
Log "Booting Postgres + Redis"
docker compose -f scripts/docker-compose.smoke.yml up -d
Start-Sleep -Seconds 5

# 2. Env
$env:NODE_ENV = "development"
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5433/kitchenxpert"
$env:REDIS_URL = "redis://localhost:6380"
$env:JWT_ACCESS_SECRET = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
$env:JWT_REFRESH_SECRET = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
$env:DATA_ENCRYPTION_KEY = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
$env:PORT = "4000"
$env:APP_URL = "http://localhost:5173"
$env:CORS_ORIGINS = "http://localhost:5173"
$env:STRIPE_SECRET_KEY = "sk_test_dummy"
$env:STRIPE_WEBHOOK_SECRET = "whsec_test_dummy"

# 3. Migrate + seed
Log "Migrating Prisma schema"
pnpm --filter "@kitchenxpert/backend" prisma:migrate:deploy

Log "Seeding catalog providers"
pnpm --filter "@kitchenxpert/backend" db:seed

# 4. Build + start backend
Log "Building backend"
pnpm --filter "@kitchenxpert/backend" build

Log "Starting backend"
$BackendJob = Start-Job -ScriptBlock {
  param($Root)
  Set-Location "$Root/packages/backend"
  pnpm start
} -ArgumentList (Get-Location).Path

# wait for /health
for ($i = 0; $i -lt 30; $i++) {
  try { Invoke-WebRequest "http://localhost:4000/api/v1/health" -UseBasicParsing -TimeoutSec 2 | Out-Null; break }
  catch { Start-Sleep 1 }
}

# 5. Build + serve frontend
Log "Building frontend"
pnpm --filter "@kitchenxpert/frontend" build

Log "Serving frontend"
$FrontendJob = Start-Job -ScriptBlock {
  param($Root)
  Set-Location "$Root/packages/frontend"
  pnpm preview --port 5173
} -ArgumentList (Get-Location).Path
Start-Sleep -Seconds 4

# 6. Probes
$Pass = 0; $FailCount = 0

function Probe($Method, $Path, $Expected, $Desc) {
  $url = if ($Path -like "http*") { $Path } else { "http://localhost:4000$Path" }
  try {
    $resp = Invoke-WebRequest -Uri $url -Method $Method -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    $code = [int]$resp.StatusCode
  } catch {
    $code = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
  }
  if ($code -eq $Expected) { OK "$Method $Path -> $code ($Desc)"; $script:Pass++ }
  else { Fail "$Method $Path -> $code (expected $Expected, $Desc)"; $script:FailCount++ }
}

Log "Probing endpoints..."
Probe GET  "/api/v1/health"                  200 "basic health"
Probe GET  "/api/v1/health/ready"            200 "readiness check"
Probe GET  "/api/v1/docs/openapi.json"       200 "OpenAPI spec"
Probe GET  "/api/v1/providers"               200 "5 providers listed"
Probe GET  "/api/v1/leroy-merlin/products"   200 "LM products"
Probe GET  "/api/v1/bosch/appliances"        200 "Bosch appliances"
Probe POST "/api/v1/auth/register"           400 "register no body 400"
Probe POST "/api/v1/auth/login"              400 "login no body 400"
Probe GET  "/api/v1/me/gdpr/summary"         401 "GDPR requires auth"
Probe POST "/api/v1/providers/import"        401 "import requires auth"
Probe GET  "/api/v1/users/me"                401 "users/me requires auth"
Probe GET  "http://localhost:5173"           200 "frontend index"

if ($Ci) {
  Log "CI mode: running full test suite"
  pnpm --filter "@kitchenxpert/backend" test
  pnpm --filter "@kitchenxpert/3d-engine" test
}

Log ""
Log "Summary: $Pass passed, $FailCount failed"
Cleanup
if ($FailCount -gt 0) { exit 1 } else { exit 0 }
