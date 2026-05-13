/**
 * Flow 3 — Sandbox designer (no authentication required).
 *
 * Reachable at /designer/sandbox (or /designer/sandbox/:templateId for
 * a template entry). The whole project lives in localStorage under
 * `kx-sandbox-project-v1`; there is intentionally no backend round-trip
 * until the user signs up and triggers the migration banner.
 *
 * What we cover here:
 *   - the page is reachable without auth
 *   - the watermark + onboarding modal render
 *   - picking a template hydrates localStorage
 *   - the import-sandbox migration round-trips through the backend
 *     (covered by `flow-3b-sandbox-migration` below)
 */
import { test, expect, API_BASE, newTestUser, registerAndVerify } from './_fixtures';

test.describe('@critical Flow 3 — Sandbox designer', () => {
  test('opens the designer without auth and shows the onboarding modal', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/designer/sandbox');

    // No redirect to /login
    await expect(page).toHaveURL(/\/designer\/sandbox/);

    // Watermark visible over the canvas
    await expect(page.getByText(/mode démo/i).first()).toBeVisible();

    // Onboarding modal opens on first visit
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/comment souhaitez-vous démarrer/i)).toBeVisible();

    // Pick "Cuisine vide" → modal closes + project lands in localStorage
    await page.getByRole('button', { name: /cuisine vide/i }).click();
    await expect(page.getByRole('dialog')).toBeHidden();

    const stored = await page.evaluate(() =>
      window.localStorage.getItem('kx-sandbox-project-v1'),
    );
    expect(stored, 'sandbox project must be persisted to localStorage').toBeTruthy();

    const parsed = JSON.parse(stored!);
    expect(parsed.state.project.kitchen.layout).toBe('L_SHAPED');

    // Reload preserves the project AND skips the onboarding modal
    await page.reload();
    await expect(page.getByText(/mode démo/i).first()).toBeVisible();
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('template URL skips onboarding and pre-loads the layout', async ({ page }) => {
    await page.context().clearCookies();
    await page.evaluate(() => window.localStorage.removeItem('kx-sandbox-project-v1'));

    await page.goto('/designer/sandbox/u-shape-medium');

    // Template loaded → no modal
    await expect(page.getByRole('dialog')).toBeHidden();

    const stored = await page.evaluate(() =>
      window.localStorage.getItem('kx-sandbox-project-v1'),
    );
    expect(stored).toBeTruthy();

    const parsed = JSON.parse(stored!);
    expect(parsed.state.project.kitchen.layout).toBe('U_SHAPED');
    expect(parsed.state.project.fromTemplate).toBe('u-shape-medium');
    expect(parsed.state.project.kitchen.items.length).toBeGreaterThan(0);
  });

  test('unknown template id bounces to clean sandbox URL', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/designer/sandbox/does-not-exist');
    await expect(page).toHaveURL(/\/designer\/sandbox$/);
  });
});

test.describe('@critical Flow 3b — Sandbox → account migration', () => {
  test('import-sandbox endpoint creates a real Project + Kitchen + Items', async ({ request }) => {
    // 1. Register a fresh user
    const user = newTestUser();
    await registerAndVerify(request, user);

    // 2. Login to get auth cookies for the import call
    const login = await request.post(`${API_BASE}/auth/login`, {
      data: { email: user.email, password: user.password },
    });
    expect(login.ok()).toBeTruthy();
    const cookies = (login.headers()['set-cookie'] || '').split('\n').join('; ');

    // 3. Build a believable sandbox payload (matches the Zod schema in
    //    packages/backend/src/api/routes/project-routes.ts)
    const sandboxPayload = {
      project: {
        name: 'Cuisine de démo',
        fromTemplate: 'u-shape-medium',
        kitchen: {
          name: 'Cuisine de démo',
          layout: 'U_SHAPED',
          widthCm: 360,
          depthCm: 320,
          heightCm: 250,
          items: [
            {
              sku: 'METOD-EVIER-80',
              label: 'Caisson évier 80',
              providerCode: 'IKEA',
              unitPrice: 249,
              quantity: 1,
              position: { x: 0, y: 0, z: 0 },
              rotation: 0,
              size: { w: 80, d: 60, h: 80 },
            },
            {
              sku: 'METOD-PLAQUE-80',
              label: 'Plaque 80',
              providerCode: 'IKEA',
              unitPrice: 229,
              quantity: 1,
              position: { x: 240, y: 0, z: 0 },
              rotation: 0,
              size: { w: 80, d: 60, h: 80 },
            },
          ],
        },
      },
    };

    // 4. POST /projects/import-sandbox
    const imported = await request.post(`${API_BASE}/projects/import-sandbox`, {
      headers: { Cookie: cookies, 'Content-Type': 'application/json' },
      data: sandboxPayload,
    });
    expect(imported.status(), `body: ${await imported.text()}`).toBe(201);
    const { data } = await imported.json();
    expect(data.projectId).toBeTruthy();
    expect(data.kitchenId).toBeTruthy();

    // 5. Verify the project shows up in /projects (so the dashboard
    //    will render it after the banner click)
    const list = await request.get(`${API_BASE}/projects`, { headers: { Cookie: cookies } });
    expect(list.ok()).toBeTruthy();
    const { data: projects } = await list.json();
    expect(projects.some((p: { id: string }) => p.id === data.projectId)).toBe(true);

    // 6. Verify items were created
    const items = await request.get(
      `${API_BASE}/kitchens/${data.kitchenId}/items`,
      { headers: { Cookie: cookies } },
    );
    expect(items.ok()).toBeTruthy();
    const { data: itemList } = await items.json();
    expect(itemList.length).toBe(2);
  });

  test('import-sandbox rejects payloads with > 200 items', async ({ request }) => {
    const user = newTestUser();
    await registerAndVerify(request, user);
    const login = await request.post(`${API_BASE}/auth/login`, {
      data: { email: user.email, password: user.password },
    });
    const cookies = (login.headers()['set-cookie'] || '').split('\n').join('; ');

    const tooMany = {
      project: {
        name: 'X',
        fromTemplate: null,
        kitchen: {
          name: 'X', layout: 'L_SHAPED' as const,
          widthCm: 400, depthCm: 350, heightCm: 270,
          items: Array.from({ length: 201 }, () => ({
            sku: 'X', label: 'X', providerCode: 'IKEA' as const,
            unitPrice: 1, quantity: 1,
            position: { x: 0, y: 0, z: 0 },
            rotation: 0,
            size: { w: 60, d: 60, h: 80 },
          })),
        },
      },
    };

    const res = await request.post(`${API_BASE}/projects/import-sandbox`, {
      headers: { Cookie: cookies, 'Content-Type': 'application/json' },
      data: tooMany,
    });
    expect(res.status(), 'over-quota payload must be rejected').toBe(400);
  });
});
