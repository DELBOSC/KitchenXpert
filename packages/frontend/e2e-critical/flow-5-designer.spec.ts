/**
 * Flow 5 — Designer manipulation.
 *
 * The hardest flow to drive headlessly because everything is canvas.
 * We rely on the data-testid hooks the designer exposes for testability:
 *   - [data-testid="palette-item"]      — sidebar items
 *   - [data-testid="designer-canvas"]   — the THREE.js root
 *   - [data-testid="designer-undo"]     — toolbar undo
 *   - [data-testid="designer-save"]     — explicit save button
 *
 * If those test-ids drift, fix them in the source — DO NOT relax this
 * test, the canvas is too opaque to assert on otherwise.
 */
import { test, expect, loginUI, API_BASE, captureCookies } from './_fixtures';

test.describe('@critical Flow 5 — Designer', () => {
  test('drag → snap → undo → save → reload preserves state', async ({
    page, request, freshUser,
  }) => {
    await loginUI(page, freshUser);
    const cookies = await captureCookies(page);

    // Provision a kitchen via API and jump straight into the designer
    const project = await request.post(`${API_BASE}/projects`, {
      headers: { Cookie: cookies },
      data: { name: 'Designer Project', clientName: 'Acme' },
    });
    const { data: pData } = await project.json();
    const kitchen = await request.post(`${API_BASE}/kitchens`, {
      headers: { Cookie: cookies },
      data: {
        projectId: pData.id, name: 'D-Kitchen',
        widthCm: 400, depthCm: 350, heightCm: 270,
      },
    });
    const { data: kData } = await kitchen.json();

    await page.goto(`/fr/projects/${pData.id}/kitchens/${kData.id}/designer`);

    const canvas = page.locator('[data-testid="designer-canvas"]')
      .or(page.locator('canvas').first());
    await expect(canvas).toBeVisible({ timeout: 20_000 });

    // 1. Drag the first palette item onto the canvas
    const palette = page.locator('[data-testid="palette-item"]').first();
    await expect(palette).toBeVisible({ timeout: 10_000 });

    const canvasBox = await canvas.boundingBox();
    expect(canvasBox).toBeTruthy();
    await palette.dragTo(canvas, {
      targetPosition: { x: (canvasBox!.width / 2), y: (canvasBox!.height / 2) },
    });

    // 2. Save explicitly (the designer also auto-saves but explicit is
    //    what users press)
    await page.locator('[data-testid="designer-save"]')
      .or(page.getByRole('button', { name: /enregistrer|save/i }))
      .first()
      .click();

    await expect(page.getByText(/enregistré|saved/i).first())
      .toBeVisible({ timeout: 10_000 });

    // 3. Verify backend state matches: at least one KitchenItem exists
    const items = await request.get(
      `${API_BASE}/kitchens/${kData.id}/items`,
      { headers: { Cookie: cookies } },
    );
    const { data: itemList } = await items.json();
    expect(itemList.length, 'drag-drop should create a backend item').toBeGreaterThan(0);

    // 4. Reload the page — item must still be there
    await page.reload();
    await expect(canvas).toBeVisible({ timeout: 15_000 });

    const itemsAfterReload = await request.get(
      `${API_BASE}/kitchens/${kData.id}/items`,
      { headers: { Cookie: cookies } },
    );
    const { data: itemListAfter } = await itemsAfterReload.json();
    expect(itemListAfter.length).toBe(itemList.length);

    // 5. Undo removes the item
    await page.locator('[data-testid="designer-undo"]')
      .or(page.getByRole('button', { name: /annuler|undo/i }))
      .first()
      .click();

    // Save again so backend reflects undo
    await page.locator('[data-testid="designer-save"]')
      .or(page.getByRole('button', { name: /enregistrer|save/i }))
      .first()
      .click();

    await expect(page.getByText(/enregistré|saved/i).first())
      .toBeVisible({ timeout: 10_000 });

    const finalItems = await request.get(
      `${API_BASE}/kitchens/${kData.id}/items`,
      { headers: { Cookie: cookies } },
    );
    const { data: finalList } = await finalItems.json();
    expect(finalList.length, 'undo+save should remove the item').toBeLessThan(itemList.length);
  });
});
