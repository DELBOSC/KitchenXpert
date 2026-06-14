#!/usr/bin/env node
/**
 * Post-deploy smoke test.
 *
 * Hits the deployed API health endpoint (and the frontend root, if a
 * FRONTEND_URL is provided) and FAILS LOUDLY (exit 1) on any non-2xx
 * response, network error, or timeout. This replaces the previous
 * `pnpm --filter backend test:smoke` chain, which delegated to a
 * non-existent backend script and therefore exited 0 without checking
 * anything — a silent no-op "smoke test" that always passed on a real
 * deploy (false-green, #115 class).
 *
 * Target resolution (first match wins):
 *   1. --url=<base>      CLI arg     (e.g. deploy-prod: `pnpm test:smoke --url=http://localhost:4001`)
 *   2. API_URL           env var     (e.g. deploy-staging: API_URL=https://staging-api.kitchenxpert.com)
 *   3. http://localhost:4000         local default
 *
 * Optional: FRONTEND_URL env var → the frontend root is also checked.
 *
 * Usage:
 *   node scripts/smoke-test.mjs [--url=<base>] [--timeout=<ms>]
 */

const args = process.argv.slice(2);
const getArg = (name) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
};

const apiBase = (getArg('url') || process.env.API_URL || 'http://localhost:4000').replace(/\/+$/, '');
const frontendBase = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/+$/, '') : undefined;
const timeoutMs = Number(getArg('timeout') || process.env.SMOKE_TIMEOUT_MS || 10_000);

/** GET a URL and assert a 2xx response, or throw with a clear message. */
async function check(label, url) {
  process.stdout.write(`[smoke] ${label}: GET ${url} ... `);
  let res;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), redirect: 'follow' });
  } catch (err) {
    const reason = err && err.name === 'TimeoutError' ? `timeout after ${timeoutMs}ms` : (err && err.message) || String(err);
    throw new Error(`request failed (${reason})`);
  }
  if (!res.ok) {
    throw new Error(`unexpected status ${res.status} ${res.statusText}`);
  }
  console.log(`OK (${res.status})`);
}

async function main() {
  const checks = [['API health', `${apiBase}/health`]];
  if (frontendBase) {
    checks.push(['frontend root', frontendBase]);
  }

  console.log(`[smoke] target API: ${apiBase}${frontendBase ? ` | frontend: ${frontendBase}` : ''} (timeout ${timeoutMs}ms)`);

  for (const [label, url] of checks) {
    await check(label, url);
  }

  console.log('[smoke] ✓ all smoke checks passed');
}

main().catch((err) => {
  console.error(`[smoke] ✗ FAILED: ${err.message}`);
  process.exit(1);
});
