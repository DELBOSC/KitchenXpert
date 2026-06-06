/**
 * Flow 8 — RGPD export + account deletion.
 *
 * Asserts compliance with Art. 15 (right of access) and Art. 17 (right
 * to erasure) of the GDPR:
 *   - GET  /me/gdpr/export   → JSON containing every personal data row
 *   - DELETE /me/gdpr/account → user is anonymised; subsequent login
 *     attempts return 401.
 *
 * Note: the backend uses *anonymisation* (not row deletion) to keep
 * referential integrity for invoices (legal retention 10 years). The
 * test therefore checks that login is rejected, NOT that the row is
 * gone from `users`.
 */
import { test, expect, loginUI, API_BASE, captureCookies } from './_fixtures';

test.describe('@critical Flow 8 — RGPD', () => {
  test('export returns a JSON with the user payload', async ({
    page, request, freshUser,
  }) => {
    await loginUI(page, freshUser);
    const cookies = await captureCookies(page);

    // Navigate to /profil → "Mes données" tab → "Exporter mes données"
    await page.goto('/fr/profile');
    await page.getByRole('tab', { name: /données|data|rgpd/i })
      .or(page.getByRole('link', { name: /données|data|rgpd/i }))
      .first()
      .click();

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 30_000 }),
      page.getByRole('button', { name: /export|télécharg/i }).first().click(),
    ]);

    const path = await download.path();
    expect(path).toBeTruthy();

    const fs = await import('node:fs/promises');
    const text = await fs.readFile(path!, 'utf8');
    const payload = JSON.parse(text);

    // Sanity: the export must include the user's email + a kitchens[] array
    expect(JSON.stringify(payload)).toContain(freshUser.email);
    expect(payload).toHaveProperty('user');
    expect(payload).toHaveProperty('kitchens');
    expect(payload).toHaveProperty('projects');

    // Cross-check via the API for parity
    const api = await request.get(`${API_BASE}/me/gdpr/export`, {
      headers: { Cookie: cookies },
    });
    expect(api.ok()).toBeTruthy();
  });

  test('delete-account anonymises and blocks future login', async ({
    page, request, freshUser,
  }) => {
    await loginUI(page, freshUser);
    const cookies = await captureCookies(page);

    await page.goto('/fr/profile');
    await page.getByRole('tab', { name: /données|data|rgpd/i })
      .or(page.getByRole('link', { name: /données|data|rgpd/i }))
      .first()
      .click();

    await page.getByRole('button', { name: /supprimer.*compte|delete.*account/i })
      .first()
      .click();

    // The destructive action lives behind a confirmation dialog
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('checkbox', { name: /confirme|understand/i }).check();
    await dialog.getByRole('button', { name: /supprimer|delete|confirm/i })
      .first()
      .click();

    // The app boots us out immediately
    await expect(page).toHaveURL(/\/(login|$|farewell)/, { timeout: 15_000 });

    // Login attempts now fail
    const login = await request.post(`${API_BASE}/auth/login`, {
      data: { email: freshUser.email, password: freshUser.password },
    });
    expect(login.status(), 'login should be rejected after deletion').toBe(401);

    // Belt-and-braces: same check via the UI
    await page.goto('/fr/login');
    await page.getByLabel(/email/i).fill(freshUser.email);
    await page.getByLabel(/mot de passe|password/i).fill(freshUser.password);
    await page.getByRole('button', { name: /se connecter|sign in/i }).click();

    await expect(page.getByText(/invalid|incorrect|introuvable/i).first())
      .toBeVisible({ timeout: 10_000 });

    // Bypass the fixture afterEach cleanup since the user is already gone
    await page.context().clearCookies();
  });
});
