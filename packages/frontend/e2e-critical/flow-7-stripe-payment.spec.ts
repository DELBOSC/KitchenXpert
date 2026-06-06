/**
 * Flow 7 — Stripe checkout (test mode) + 3DS + webhook.
 *
 * The most fragile flow because it crosses three trust boundaries:
 *   - SPA → backend (create checkout session)
 *   - SPA → Stripe-hosted checkout iframe (3DS challenge)
 *   - Stripe → backend webhook (subscription activation)
 *
 * Pre-conditions for the test environment:
 *   - STRIPE_SECRET_KEY = sk_test_…  (NOT a live key)
 *   - STRIPE_WEBHOOK_SECRET wired AND `stripe listen --forward-to
 *     localhost:4000/api/v1/payments/webhook` running in the background
 *     (the smoke runner starts this — see scripts/smoke-e2e.sh)
 *
 * If `STRIPE_SECRET_KEY` is missing OR is a live key the test is skipped
 * with a visible reason — we never want this suite to touch real money.
 */
import { test, expect, loginUI, API_BASE, captureCookies, STRIPE_TEST_CARDS } from './_fixtures';

test.describe('@critical Flow 7 — Stripe payment', () => {
  test.beforeEach(({ }, testInfo) => {
    const key = process.env.STRIPE_SECRET_KEY || '';
    if (!key.startsWith('sk_test_')) {
      testInfo.skip(true, 'STRIPE_SECRET_KEY missing or not a sk_test_ key');
    }
  });

  test('checkout → 3DS challenge → webhook → subscription active', async ({
    page, request, freshUser,
  }) => {
    await loginUI(page, freshUser);
    const cookies = await captureCookies(page);

    // Click "S'abonner Premium" on the pricing page
    await page.goto('/fr/pricing');
    await page.getByRole('button', { name: /premium/i })
      .or(page.getByRole('link', { name: /premium/i }))
      .first()
      .click();

    // Confirm in any "are you sure" modal
    const confirmBtn = page.getByRole('button', { name: /confirmer|continuer|proceed/i });
    if (await confirmBtn.isVisible().catch(() => false)) await confirmBtn.click();

    // Wait for redirect to checkout.stripe.com
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 20_000 });

    // ---- Stripe Checkout (live page in test mode) ----
    // Selectors here track Stripe's hosted checkout — they're stable
    // across releases but watch the changelog.
    const cardNumber = page.getByPlaceholder(/1234 1234 1234 1234/i);
    await cardNumber.waitFor({ timeout: 30_000 });
    await cardNumber.fill(STRIPE_TEST_CARDS.sca3DS.replace(/\s/g, ''));
    await page.getByPlaceholder('MM / YY').fill('12 / 34');
    await page.getByPlaceholder('CVC').fill('123');
    await page.getByPlaceholder(/full name|nom/i).fill(`${freshUser.firstName} ${freshUser.lastName}`);

    await page.getByRole('button', { name: /pay|payer|s'abonner|subscribe/i }).click();

    // ---- 3DS challenge frame ----
    const frame = page.frameLocator('iframe[name*="stripe-frame"]')
      .or(page.frameLocator('iframe[src*="hooks.stripe.com"]'));
    const completeBtn = frame.getByRole('button', { name: /complete|completer|approve/i });
    if (await completeBtn.first().isVisible({ timeout: 15_000 }).catch(() => false)) {
      await completeBtn.first().click();
    }

    // ---- Back on KitchenXpert success page ----
    await page.waitForURL(/\/(payment\/success|subscription\/active|dashboard)/, {
      timeout: 60_000,
    });

    // ---- Verify backend received the webhook and activated the sub ----
    // Allow up to 30 s for `stripe listen` to forward the event.
    let active = false;
    for (let i = 0; i < 15 && !active; i++) {
      const me = await request.get(`${API_BASE}/subscriptions/me`, {
        headers: { Cookie: cookies },
      });
      if (me.ok()) {
        const { data } = await me.json();
        if (data?.status === 'active' || data?.tier === 'premium') {
          active = true;
          break;
        }
      }
      await new Promise((r) => setTimeout(r, 2_000));
    }
    expect(active, 'subscription was not activated by the webhook').toBe(true);
  });
});
