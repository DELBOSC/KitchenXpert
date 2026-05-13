#!/usr/bin/env bash
# =============================================================================
# smoke-e2e.sh — KitchenXpert critical-flows gate
# -----------------------------------------------------------------------------
# Runs the 8 must-never-break flows against a real backend, in parallel,
# under a strict 5-minute total budget.
#
# Pre-conditions:
#   - Postgres + Redis are reachable via DATABASE_URL / REDIS_URL
#   - The backend is running on http://localhost:4000  (or set E2E_API_URL)
#   - The frontend is running on http://localhost:3005 (or set E2E_BASE_URL)
#   - For Flow 7: STRIPE_SECRET_KEY=sk_test_… and `stripe listen` running
#     (the test self-skips otherwise)
#
# Output is one ✅/❌ line per flow plus a final exit status.
# =============================================================================

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/packages/frontend"

FLOWS=(
  "flow-1-signup"
  "flow-2-login-logout"
  "flow-3-sandbox-designer"
  "flow-4-catalog-import"
  "flow-5-designer"
  "flow-6-quote-pdf"
  "flow-7-stripe-payment"
  "flow-8-rgpd"
)

# Total budget for the whole suite — fail loudly past it.
TOTAL_TIMEOUT_SEC="${SMOKE_TIMEOUT:-300}"

LOG_DIR="$(mktemp -d -t kx-smoke-XXXXXX)"
echo "→ Smoke logs: $LOG_DIR"
echo "→ Budget:    ${TOTAL_TIMEOUT_SEC}s"
echo

PIDS=()
for flow in "${FLOWS[@]}"; do
  (
    PLAYWRIGHT_SUITE=critical \
      npx playwright test "e2e-critical/${flow}.spec.ts" \
        --project=chromium-desktop \
        --reporter=line \
        > "${LOG_DIR}/${flow}.log" 2>&1
    echo "$?" > "${LOG_DIR}/${flow}.exit"
  ) &
  PIDS+=("$!")
done

# Wait with global timeout. If any child is still running past the
# budget, kill the lot and mark missing exit codes as 124 (timeout).
START=$(date +%s)
while :; do
  ALL_DONE=true
  for pid in "${PIDS[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then ALL_DONE=false; fi
  done
  $ALL_DONE && break

  NOW=$(date +%s)
  if (( NOW - START >= TOTAL_TIMEOUT_SEC )); then
    echo "⏱  Total timeout (${TOTAL_TIMEOUT_SEC}s) — killing remaining flows"
    for pid in "${PIDS[@]}"; do kill -9 "$pid" 2>/dev/null || true; done
    break
  fi
  sleep 2
done
wait 2>/dev/null || true

# ---------- report ----------------------------------------------------------
echo
echo "── RESULTS ──────────────────────────────────────"
PASS=0; FAIL=0
for flow in "${FLOWS[@]}"; do
  exit_file="${LOG_DIR}/${flow}.exit"
  if [ -f "$exit_file" ]; then
    code="$(cat "$exit_file")"
  else
    code=124
  fi
  if [ "$code" = "0" ]; then
    printf "✅  %-30s ok\n" "$flow"
    PASS=$((PASS+1))
  else
    printf "❌  %-30s exit=%s   (log: %s.log)\n" "$flow" "$code" "${LOG_DIR}/${flow}"
    FAIL=$((FAIL+1))
  fi
done
echo "─────────────────────────────────────────────────"
echo "   $PASS passed   ·   $FAIL failed"
echo

if [ "$FAIL" -gt 0 ]; then
  echo "Re-run a single flow with full output:"
  echo "   PLAYWRIGHT_SUITE=critical pnpm --filter frontend exec playwright test e2e-critical/<flow>.spec.ts --headed"
  exit 1
fi
exit 0
