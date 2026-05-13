/**
 * Flow 4 — Catalog browse → Import to design.
 *
 * Hub catalog → IKEA tab → search → import a product into the active
 * kitchen. Asserts that:
 *   - the catalog tabs render
 *   - search returns at least one result (uses the seeded test fixture
 *     which preloads ~10 products per provider — see
 *     packages/backend/prisma/seed.test.ts)
 *   - clicking "Importer" creates a KitchenItem in the database (verified
 *     via the API)
 */
import { test, expect, loginUI, API_BASE, captureCookies } from './_fixtures';

test.describe('@critical Flow 4 — Catalog → Import', () => {
  test('imports an IKEA product into a kitchen', async ({ page, request, freshUser }) => {
    await loginUI(page, freshUser);

    // 1. Create a project + kitchen via the API (faster than UI here —
    //    the UI flow is covered in Flow 5)
    const cookies = await captureCookies(page);
    const project = await request.post(`${API_BASE}/projects`, {
      headers: { Cookie: cookies },
      data: { name: 'E2E Project', clientName: 'Acme' },
    });
    const { data: projectData } = await project.json();
    const kitchen = await request.post(`${API_BASE}/kitchens`, {
      headers: { Cookie: cookies },
      data: {
        projectId: projectData.id,
        name: 'E2E Kitchen',
        widthCm: 400, depthCm: 350, heightCm: 270,
      },
    });
    const { data: kitchenData } = await kitchen.json();

    // 2. Open catalog hub
    await page.goto('/catalog');
    await expect(page.getByRole('heading', { name: /catalogue|catalog/i }).first())
      .toBeVisible();

    // 3. Switch to IKEA tab
    await page.getByRole('tab', { name: /ikea/i })
      .or(page.getByRole('link', { name: /ikea/i }))
      .first()
      .click();

    await expect(page).toHaveURL(/\/(catalog\/ikea|ikea)/, { timeout: 10_000 });

    // 4. Search a known seeded item ("METOD" is the IKEA kitchen line)
    await page.getByRole('searchbox').or(page.getByPlaceholder(/recherche|search/i))
      .first()
      .fill('METOD');
    await page.keyboard.press('Enter');

    const firstCard = page.locator('[data-testid="product-card"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10_000 });

    // 5. Click "Importer dans ma cuisine"
    await firstCard.getByRole('button', { name: /import|ajouter/i }).click();

    // 6. Pick our kitchen in the modal that opens
    const dialog = page.getByRole('dialog');
    if (await dialog.isVisible().catch(() => false)) {
      await dialog.getByRole('combobox').or(dialog.getByRole('listbox'))
        .first()
        .click();
      await page.getByRole('option', { name: /E2E Kitchen/ }).click();
      await dialog.getByRole('button', { name: /import|ajouter|valider/i }).click();
    }

    // 7. Toast confirmation
    await expect(page.getByText(/importé|added|ajouté/i).first())
      .toBeVisible({ timeout: 10_000 });

    // 8. Verify a KitchenItem now exists in the DB
    const items = await request.get(
      `${API_BASE}/kitchens/${kitchenData.id}/items`,
      { headers: { Cookie: cookies } },
    );
    const { data: itemList } = await items.json();
    expect(itemList.length, 'expected at least one imported item').toBeGreaterThan(0);
  });
});
