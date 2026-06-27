# KitchenXpert — E2E Testing Guide

Two Playwright suites coexist in `packages/frontend`. Pick the right one for the
job.

| Suite             | Path                                     | Backend     | Speed           | When to run                        |
| ----------------- | ---------------------------------------- | ----------- | --------------- | ---------------------------------- |
| **mocked**        | `packages/frontend/e2e/`                 | mocked APIs | fast (~3 min)   | Local iteration on UI changes      |
| **critical**      | `packages/frontend/e2e-critical/`        | **real**    | slower (~5 min) | Pre-merge gate, deploy gate, smoke |
| visual regression | `e2e-critical/visual-regression.spec.ts` | mocked APIs | ~30 s           | PR (only)                          |

## Running locally

```bash
# Mocked suite (fast UI iteration)
pnpm --filter frontend test:e2e

# Critical suite — needs a running backend
docker compose -f config/docker/docker-compose.dev.yml up -d
pnpm --filter backend dev &        # http://localhost:4000
pnpm --filter frontend dev &       # http://localhost:3005
pnpm --filter frontend test:e2e:critical

# All-in-one smoke gate (parallel, 5-min budget)
bash scripts/smoke-e2e.sh

# Visual regression (capture / update baselines)
pnpm --filter frontend test:e2e:visual
pnpm --filter frontend test:e2e:visual:update
```

## The 8 critical flows

| #   | Spec                              | Avg duration | Coverage                                                                                      |
| --- | --------------------------------- | ------------ | --------------------------------------------------------------------------------------------- |
| 1   | `flow-1-signup.spec.ts`           | ~25 s        | Form validation · POST /auth/register · email-verify backdoor · login round-trip · dup email  |
| 2   | `flow-2-login-logout.spec.ts`     | ~15 s        | httpOnly access+refresh cookies · dashboard render · logout clears cookies · /dashboard guard |
| 3   | `flow-3-sandbox-designer.spec.ts` | ~20 s ⚠      | Anonymous /sandbox · localStorage persistence · watermark · save → register prompt            |
| 4   | `flow-4-catalog-import.spec.ts`   | ~30 s        | Catalog hub · IKEA tab · search METOD · import → KitchenItem in DB                            |
| 5   | `flow-5-designer.spec.ts`         | ~45 s        | Drag-drop · save · reload preserves · undo + save removes                                     |
| 6   | `flow-6-quote-pdf.spec.ts`        | ~20 s        | Quote total real-time · PDF download · `%PDF-` magic + ≥ 2 KB                                 |
| 7   | `flow-7-stripe-payment.spec.ts`   | ~60 s ⚠      | Checkout session · 3DS challenge · webhook → subscription active                              |
| 8   | `flow-8-rgpd.spec.ts`             | ~25 s        | GDPR Art. 15 export JSON · Art. 17 delete → login 401                                         |

⚠ = depends on infrastructure that may not be wired in your environment (see
"Known failures" below).

## Known failures to investigate

### Flow 3 — Sandbox designer (`test.fixme`)

The `/sandbox` route does not exist yet in
[packages/frontend/src/router.tsx](packages/frontend/src/router.tsx). The test
is intentionally marked `test.fixme` and will become active the moment the route
is shipped. **Action:** ship the sandbox page, then remove the `.fixme` markers.

### Flow 7 — Stripe (auto-skipped without test key)

Self-skips when `STRIPE_SECRET_KEY` is missing or starts with `sk_live_`. To
enable locally:

```bash
export STRIPE_SECRET_KEY=sk_test_...
export STRIPE_WEBHOOK_SECRET=$(stripe listen --print-secret)
stripe listen --forward-to localhost:4000/api/v1/payments/webhook &
pnpm --filter frontend test:e2e:critical -- e2e-critical/flow-7-stripe-payment.spec.ts
```

In CI it self-skips unless `STRIPE_TEST_SECRET_KEY` is configured as a GitHub
secret.

### Flow 1 + 8 — Email verify backdoor

Both tests POST to `/auth/dev/verify-email` to bypass the SMTP click-through.
This endpoint **must** be mounted under `if (NODE_ENV !== 'production')` in
[packages/backend/src/api/routes/auth-routes.ts](packages/backend/src/api/routes/auth-routes.ts).
If it's not there, both flows will fail with
`dev/verify-email backdoor missing`. Adding it is a 5-line change.

## Adding a new critical flow — checklist

1. Create `packages/frontend/e2e-critical/flow-<N>-<slug>.spec.ts`
2. Tag the `describe` block with `@critical` (e.g. `'@critical Flow 9 — …'`) so
   it shows up in the responsive viewport projects too
3. Use the shared fixtures:
   ```ts
   import { test, expect, loginUI, freshUser } from './_fixtures';
   ```
4. Prefer **role-based selectors** (`getByRole`, `getByLabel`) over CSS
   selectors — they survive copy edits
5. Provision data via API where possible (faster, less flaky than UI)
6. Always clean up via the GDPR delete endpoint or rely on the `freshUser`
   fixture's `afterEach`
7. Add the spec to the `FLOWS=()` array in `scripts/smoke-e2e.sh`
8. Update the table in this document

### Spec template

```ts
/**
 * Flow <N> — <one-line summary>.
 *
 * Pre-conditions: <list>
 * Asserts: <list>
 */
import { test, expect, loginUI } from './_fixtures';

test.describe('@critical Flow <N> — <name>', () => {
  test('<scenario>', async ({ page, freshUser }) => {
    await loginUI(page, freshUser);
    // … happy path …
    await expect(page.getByRole('heading', { name: /…/ })).toBeVisible();
  });
});
```

## Trace + screenshot artifacts

`playwright.config.ts` is set to `trace: 'retain-on-failure'`,
`screenshot: 'only-on-failure'`, `video: 'retain-on-failure'` (CI only).
Artifacts land in `packages/frontend/test-results/` and are uploaded by the
GitHub workflow on failure for 7 days.

To replay a trace locally:

```bash
npx playwright show-trace packages/frontend/test-results/<dir>/trace.zip
```

## Visual-regression baselines

PNG baselines live under `packages/frontend/e2e-critical/__screenshots__/`.
Regenerate them whenever the design changes:

```bash
pnpm --filter frontend test:e2e:visual:update
git add packages/frontend/e2e-critical/__screenshots__/
git commit -m "test: refresh visual baselines after <change>"
```

The 5 baselines are: `home.png`, `login.png`, `dashboard.png`, `catalog.png`,
`designer.png`. The designer canvas is masked because GPU rendering varies
between machines.

## CI overview

`.github/workflows/e2e.yml` runs on every push to `main` and every PR:

1. **critical-flows** job (≤ 25 min)
   - Spins Postgres-16 + Redis-7 services
   - Runs `prisma migrate deploy` + `db:seed:test`
   - Builds frontend, starts both servers, waits for health
   - Optionally starts `stripe listen` (only when secrets present)
   - Executes the critical suite on Chromium desktop
   - Uploads traces + HTML report on failure
2. **visual-regression** job (PR only, ≤ 10 min)
   - Builds frontend, runs the 5-page screenshot suite
   - Uploads diff PNGs on failure
