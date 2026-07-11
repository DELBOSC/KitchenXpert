/**
 * Visual regression — UI primitives gallery (Button / Card / Input).
 *
 * Screenshots each primitive section in isolation from the dev-only
 * `/dev/primitives` route (registered only when the frontend is built with
 * VITE_DEV_GALLERY=1 — see router.tsx + the `primitives-visual` CI job).
 *
 * This is the safety net that lets us later swap `cn()` for tailwind-merge
 * with automatic proof: any pixel shift in a Button/Card/Input variant fails
 * here (CLAUDE.md §11 P2 "cn()→tailwind-merge").
 *
 * One screenshot PER SECTION (not per variant) → 3 readable baselines instead
 * of ~50. Regenerate on the CI runner (never locally — cross-OS AA drift):
 *   PLAYWRIGHT_SUITE=critical VITE_DEV_GALLERY=1 \
 *   pnpm --filter frontend exec playwright test \
 *     e2e-critical/primitives-gallery.spec.ts --update-snapshots
 */
import { test, expect } from '@playwright/test';

/** Freeze fonts + CSS animations so the capture is deterministic. */
async function settle(page: import('@playwright/test').Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState('load');
  await page.addStyleTag({
    content: `*, *::before, *::after {
      animation-duration: 0s !important;
      animation-delay: 0s !important;
      transition-duration: 0s !important;
      transition-delay: 0s !important;
    }`,
  });
}

test.describe('Visual regression — primitives', () => {
  test.beforeEach(async ({ page }) => {
    // Pre-dismiss the global CookieConsent banner (fixed inset-x-0 bottom-0
    // z-[100], mounted in App.tsx) whose overlay intercepts pointer events at
    // the page bottom — otherwise the tooltip hover times out. Mirrors
    // e2e-critical/_fixtures.ts (#152). Fixed decidedAt keeps it deterministic
    // (the value is stored, never rendered). Test-only, no app change.
    await page.addInitScript(() => {
      try {
        localStorage.setItem(
          'kx.cookie-consent.v1',
          JSON.stringify({
            necessary: true,
            analytics: false,
            marketing: false,
            decidedAt: '2026-01-01T00:00:00.000Z',
          })
        );
      } catch {
        /* ignore */
      }
    });
    await page.goto('/dev/primitives');
    await settle(page);
    // The gallery must actually be mounted (route present in this build).
    await expect(page.locator('#gallery-button')).toBeVisible();
  });

  test('button variants', async ({ page }) => {
    await expect(page.locator('#gallery-button')).toHaveScreenshot('primitives-button.png');
  });

  test('card variants', async ({ page }) => {
    await expect(page.locator('#gallery-card')).toHaveScreenshot('primitives-card.png');
  });

  test('input variants', async ({ page }) => {
    await expect(page.locator('#gallery-input')).toHaveScreenshot('primitives-input.png');
  });

  test('misc primitives (badge/avatar/separator/skeleton/emptystate/label/container)', async ({
    page,
  }) => {
    await expect(page.locator('#gallery-misc')).toHaveScreenshot('primitives-misc.png');
  });

  test('tooltip (hovered)', async ({ page }) => {
    // The tooltip bubble is hover-gated (no `open` prop) → trigger it, then wait
    // for the bubble text before capturing. Deterministic once shown (JS state
    // frozen; the bubble's CSS transition is zeroed by settle()).
    await page.locator('#gallery-tooltip button').hover();
    await expect(page.getByText('Astuce : ceci est une infobulle.')).toBeVisible();
    await expect(page.locator('#gallery-tooltip')).toHaveScreenshot('primitives-tooltip.png');
  });
});
