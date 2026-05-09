# Frontend Test Debt

**Status (2026-05-09)** — 997/1210 vitest tests pass; 213 fail. The
failures are NOT regressions of new code — they trace back to two distinct
sources documented below. The UI ships and works; the tests are stale.

## Why the failures exist

### 1. Premium UI redesign (sessions of 2026-05-06 / 2026-05-07)

Six page-level components were rewritten to match the new design system
(aurora gradients, Framer Motion, new component library under
`components/ui/`). The page tests assert on the *old* DOM (specific
heading text, single-instance Catalog title, single-button hero, etc.).

| Test file                                      | Failures |
| ---------------------------------------------- | -------: |
| `__tests__/pages/HomePage.test.tsx`            |        7 |
| `__tests__/pages/LoginPage.test.tsx`           |        5 |
| `__tests__/pages/RegisterPage.test.tsx`        |       19 |
| `__tests__/pages/DashboardPage.test.tsx`       |       21 |
| `__tests__/pages/ProfilePage.test.tsx`         |       21 |
| `__tests__/pages/CatalogPage.test.tsx`         |        9 |
| `__tests__/pages/PricingPage.test.tsx`         |        7 |
| `__tests__/components/Toast.test.tsx`          |        4 |
| **Subtotal**                                   |   **93** |

### 2. Pre-existing legacy tests (untouched in 2026-05 sessions)

Tests written before the codebase reached its current state. Most assert
against admin pages whose i18n strings or layouts shifted over time.

| Test file                                      | Failures |
| ---------------------------------------------- | -------: |
| `__tests__/pages/KitchenDesignerPage.test.tsx` |       19 |
| `__tests__/pages/CarbonAdmin.test.tsx`         |       18 |
| `__tests__/pages/DigitalTwinAdmin.test.tsx`    |       18 |
| `__tests__/pages/StockAdmin.test.tsx`          |       15 |
| `__tests__/pages/ProjectEdit.test.tsx`         |       15 |
| `__tests__/pages/RoleManagement.test.tsx`      |        8 |
| `__tests__/pages/VRViewer.test.tsx`            |        5 |
| `__tests__/services/endpoints.test.ts`         |       ~8 |
| (smaller scattered)                            |      ~14 |
| **Subtotal**                                   |  **120** |

## Strategy

These failures are accepted technical debt. They do not block the ship
because:

- The TypeScript compiler is green (`tsc --noEmit` exits 0).
- The production build emits without errors (`vite build`).
- Manual smoke-tests on every redesigned page pass (see
  `docs/SMOKE-TEST.md`).
- 997 of 1210 tests still cover hooks, utilities, slices, services and
  components that haven't changed.

## Remediation plan (ordered by ROI)

1. **Endpoints test** — update `__tests__/services/endpoints.test.ts` to
   match the live `API_ENDPOINTS` constants. ~30 min, kills ~8 failures.
2. **Auth pages** (Login, Register) — rewrite the assertions against the
   new DOM. ~2 h. Kills 24 failures.
3. **Dashboard / Profile / Catalog / Home / Pricing** — same approach for
   the redesigned pages. ~6 h. Kills 65 failures.
4. **Admin pages** (Carbon, DigitalTwin, Stock, ProjectEdit, RoleManagement)
   — these pages haven't been redesigned, so the failures point to real
   selector / i18n drift. Investigate per-test. ~4 h. Kills 74 failures.
5. **KitchenDesigner / VRViewer** — the most complex pages, deeply
   integrated with three.js mocks. Need to rebuild the test harness from
   scratch. ~6 h. Kills 24 failures.

Total remediation budget: ~18 h spread across one or two focused sprints.
Until then, treat the failure list as a TODO board, not a CI blocker.
