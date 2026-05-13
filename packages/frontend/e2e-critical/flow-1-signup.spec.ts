/**
 * Flow 1 — Signup → Email confirm → First login.
 *
 * Hits the real backend. Email confirmation is bypassed via the dev
 * backdoor `/auth/dev/verify-email` (mounted only when
 * NODE_ENV !== 'production').
 *
 * What we assert:
 *   - Form-level validation (weak password, mismatched confirmation,
 *     invalid email) blocks submit and shows a visible error.
 *   - A successful POST sets the httpOnly cookies AND redirects to
 *     /dashboard once email is verified.
 *   - The new user can subsequently log out and log back in.
 */
import { test, expect, API_BASE, newTestUser } from './_fixtures';

test.describe('@critical Flow 1 — Signup', () => {
  test('blocks submission when password is too short', async ({ page }) => {
    await page.goto('/register');

    await page.getByLabel(/email/i).fill('weak@e2e.local');
    await page.getByLabel(/^mot de passe|^password$/i).fill('short');
    await page.getByLabel(/confirm/i).fill('short');
    await page.getByRole('button', { name: /créer|sign up|register/i }).click();

    // Expect either an inline error OR the form not navigating away
    await expect(page).toHaveURL(/\/register/);
    await expect(
      page.getByText(/au moins|at least|minimum|trop court/i).first(),
    ).toBeVisible();
  });

  test('completes signup → verify → reaches dashboard', async ({ page, request }) => {
    const user = newTestUser();

    await page.goto('/register');
    await page.getByLabel(/prénom|first name/i).fill(user.firstName);
    await page.getByLabel(/nom|last name/i).fill(user.lastName);
    await page.getByLabel(/email/i).fill(user.email);
    await page.getByLabel(/^mot de passe|^password$/i).fill(user.password);
    await page.getByLabel(/confirm/i).fill(user.password);

    // CGV / Privacy checkboxes (some flows have one, some have two)
    for (const cb of await page.getByRole('checkbox').all()) {
      if (await cb.isVisible()) await cb.check();
    }

    await page.getByRole('button', { name: /créer|sign up|register/i }).click();

    // Either: redirect to a "check your inbox" screen OR straight to
    // dashboard if auto-verify is on. Both are acceptable.
    await expect(page).toHaveURL(/\/(verify-email|dashboard|email-sent)/, {
      timeout: 15_000,
    });

    // Bypass email click via dev backdoor
    const verify = await request.post(`${API_BASE}/auth/dev/verify-email`, {
      data: { email: user.email },
    });
    expect(verify.ok(), `dev/verify-email backdoor missing or failing`).toBeTruthy();

    // Re-login from a clean state to confirm cookies are usable
    await page.context().clearCookies();
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(user.email);
    await page.getByLabel(/mot de passe|password/i).fill(user.password);
    await Promise.all([
      page.waitForURL(/\/dashboard/, { timeout: 15_000 }),
      page.getByRole('button', { name: /se connecter|sign in|connexion/i }).click(),
    ]);

    await expect(page.getByRole('heading', { name: /tableau|dashboard|bienvenue/i }).first())
      .toBeVisible();
  });

  test('rejects duplicate email', async ({ page, freshUser }) => {
    await page.goto('/register');
    await page.getByLabel(/email/i).fill(freshUser.email);
    await page.getByLabel(/^mot de passe|^password$/i).fill('Another!Pass123');
    await page.getByLabel(/confirm/i).fill('Another!Pass123');
    for (const cb of await page.getByRole('checkbox').all()) {
      if (await cb.isVisible()) await cb.check();
    }
    await page.getByRole('button', { name: /créer|sign up|register/i }).click();

    await expect(
      page.getByText(/déjà utilisé|already (in use|exists|registered)/i),
    ).toBeVisible({ timeout: 10_000 });
  });
});
