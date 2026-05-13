import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for KitchenXpert.
 *
 * Two test directories live under packages/frontend:
 *   - `e2e/`            — fast UI tests with mocked API. Default.
 *   - `e2e-critical/`   — 8 must-never-break flows hitting a REAL backend.
 *                          Run via `pnpm test:e2e:critical` or
 *                          `bash scripts/smoke-e2e.sh`.
 *
 * The active suite is selected with `PLAYWRIGHT_SUITE=critical`. Critical
 * suite expects backend at http://localhost:4000 and frontend at 3005.
 */

const SUITE = process.env.PLAYWRIGHT_SUITE === 'critical' ? 'critical' : 'mocked';
const testDir = SUITE === 'critical' ? './e2e-critical' : './e2e';

export default defineConfig({
  testDir,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // 1 worker on CI keeps Postgres-bound critical tests deterministic;
  // locally Playwright defaults to physical-core count.
  workers: process.env.CI ? 1 : undefined,
  timeout: SUITE === 'critical' ? 60_000 : 30_000,

  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }], ['list']]
    : [['list'], ['html', { open: 'on-failure' }]],

  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3005',
    // Trace on EVERY failure (not just retry) so we never lose context
    // on flaky CI runs. Screenshots + videos retained on failure too.
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: process.env.CI ? 'retain-on-failure' : 'off',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },

  // Visual-regression baseline matching. 0.1% pixel-diff tolerance keeps
  // anti-aliasing wiggle room while still catching real layout shifts.
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.001,
      animations: 'disabled',
    },
  },

  projects: [
    // ---------- Desktop (full coverage) ---------------------------------
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'firefox-desktop',
      use: { ...devices['Desktop Firefox'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'webkit-desktop',
      use: { ...devices['Desktop Safari'], viewport: { width: 1440, height: 900 } },
    },

    // ---------- Tablet (Chromium-only — covers most break-points) -------
    {
      name: 'chromium-tablet',
      use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 } },
      // Skip heavy designer flows on tablet by default; opt-in with @responsive
      grep: /@responsive|@critical/,
    },

    // ---------- Mobile (Chromium + WebKit — covers Android + iOS) -------
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'] },
      grep: /@responsive|@critical/,
    },
    {
      name: 'mobile-webkit',
      use: { ...devices['iPhone 14'] },
      grep: /@responsive|@critical/,
    },
  ],

  // When E2E_BASE_URL is provided we assume the dev server is already
  // running (typical CI flow: `pnpm dev &` started by the workflow).
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'pnpm dev',
        url: 'http://localhost:3005',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
