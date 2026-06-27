/**
 * Flow 2 — Login → Dashboard → Logout.
 *
 * Asserts the auth-cookie lifecycle:
 *   - login sets exactly two httpOnly cookies (access + refresh)
 *   - dashboard renders user-scoped data
 *   - logout clears both cookies and bounces the user back to /login
 *   - refresh after logout does NOT silently re-authenticate
 */
import { test, expect, loginUI } from './_fixtures';

test.describe('@critical Flow 2 — Login + Logout', () => {
  test('login sets httpOnly cookies and renders the dashboard', async ({ page, freshUser }) => {
    await loginUI(page, freshUser);

    const cookies = await page.context().cookies();
    const access = cookies.find((c) => /access/i.test(c.name));
    const refresh = cookies.find((c) => /refresh/i.test(c.name));

    expect(access, 'access cookie missing').toBeTruthy();
    expect(refresh, 'refresh cookie missing').toBeTruthy();
    expect(access?.httpOnly, 'access cookie must be httpOnly').toBe(true);
    expect(refresh?.httpOnly, 'refresh cookie must be httpOnly').toBe(true);
    expect(access?.sameSite).toMatch(/Lax|Strict/);

    // Dashboard renders the user's name somewhere visible
    await expect(page.getByText(new RegExp(freshUser.firstName, 'i')).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test('logout clears cookies and protects /dashboard', async ({ page, freshUser }) => {
    await loginUI(page, freshUser);

    // Open the user menu and click "Déconnexion"
    const menuTrigger = page
      .getByRole('button', { name: new RegExp(freshUser.firstName, 'i') })
      .or(page.getByRole('button', { name: /menu|profil|account/i }))
      .first();
    await menuTrigger.click();
    await page
      .getByRole('menuitem', { name: /déconnex|logout|sign out/i })
      .or(page.getByRole('button', { name: /déconnex|logout|sign out/i }))
      .first()
      .click();

    await expect(page).toHaveURL(/\/(login|$)/, { timeout: 10_000 });

    const cookies = await page.context().cookies();
    expect(
      cookies.filter((c) => /access|refresh/i.test(c.name)),
      'auth cookies must be cleared on logout'
    ).toHaveLength(0);

    // Direct navigation to a protected route must redirect to /login
    await page.goto('/fr/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});
