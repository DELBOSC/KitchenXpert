/**
 * Visual regression — 5 anchor pages.
 *
 * Compares the current rendering against committed PNG baselines under
 * `e2e-critical/__screenshots__/`. Tolerance is set globally to 0.1%
 * pixel diff in playwright.config.ts so anti-aliasing on different OSes
 * doesn't flake the suite.
 *
 * Baselines must be regenerated whenever the design changes:
 *   PLAYWRIGHT_SUITE=critical \
 *   pnpm --filter frontend exec playwright test \
 *     e2e-critical/visual-regression.spec.ts --update-snapshots
 *
 * Then commit the new PNGs along with the design change.
 *
 * For protected pages we mock /auth/me so the screenshot is reproducible
 * without spinning the full backend stack.
 */
import { test, expect } from '@playwright/test';

const VISUAL_USER = {
  id: 'visual-user',
  email: 'visual@e2e.local',
  firstName: 'Visual',
  lastName: 'User',
  name: 'Visual User',
  role: 'user' as const,
};

async function mockAuthed(page: import('@playwright/test').Page) {
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true, data: VISUAL_USER }),
    }),
  );
  await page.route('**/api/v1/projects*', (route) =>
    route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({
        success: true, data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      }),
    }),
  );
  await page.route('**/api/v1/catalog/**', (route) =>
    route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    }),
  );
}

/** Wait for fonts + lazy images so the screenshot is deterministic. */
async function settle(page: import('@playwright/test').Page) {
  await page.evaluate(() => document.fonts.ready);
  // `load` (not `networkidle`): the prod build's network-first Service Worker
  // keeps traffic alive so networkidle never settles (20s timeout). Fonts are
  // already awaited above; `load` guarantees images are in for the screenshot.
  await page.waitForLoadState('load');
  // Disable any CSS transition that would otherwise animate during capture
  await page.addStyleTag({
    content: `*, *::before, *::after {
      animation-duration: 0s !important;
      animation-delay: 0s !important;
      transition-duration: 0s !important;
      transition-delay: 0s !important;
    }`,
  });
}

test.describe('Visual regression', () => {
  test('home page', async ({ page }) => {
    await page.goto('/fr/');
    await settle(page);
    await expect(page).toHaveScreenshot('home.png', { fullPage: true });
  });

  test('login page', async ({ page }) => {
    await page.goto('/fr/login');
    await settle(page);
    await expect(page).toHaveScreenshot('login.png', { fullPage: true });
  });

  test('dashboard (mocked auth)', async ({ page }) => {
    await mockAuthed(page);
    await page.goto('/fr/dashboard');
    await settle(page);
    await expect(page).toHaveScreenshot('dashboard.png', { fullPage: true });
  });

  test('catalog (mocked)', async ({ page }) => {
    await mockAuthed(page);
    await page.goto('/fr/catalog');
    await settle(page);
    await expect(page).toHaveScreenshot('catalog.png', { fullPage: true });
  });

  test('designer placeholder (mocked)', async ({ page }) => {
    await mockAuthed(page);
    await page.goto('/fr/projects/visual-project/kitchens/visual-kitchen/designer');
    await settle(page);
    // Designer is heavy → just the chrome, mask the canvas which is
    // GPU-dependent and would never match across runners.
    const canvasArea = page.locator('canvas, [data-testid="designer-canvas"]');
    await expect(page).toHaveScreenshot('designer.png', {
      fullPage: true,
      mask: [canvasArea],
    });
  });
});
