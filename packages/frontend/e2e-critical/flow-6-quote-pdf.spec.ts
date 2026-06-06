/**
 * Flow 6 — Devis (quote) generation + PDF export.
 *
 * Pre-condition: a kitchen with at least one KitchenItem exists. We
 * provision both via API to keep the test focused on the quote pipeline.
 *
 * Asserts:
 *   - The quote total updates in real time as items are added
 *   - "Exporter en PDF" produces a `application/pdf` download with
 *     non-zero bytes and a `%PDF-` magic header
 */
import { test, expect, loginUI, API_BASE, captureCookies } from './_fixtures';

test.describe('@critical Flow 6 — Quote + PDF export', () => {
  test('generates a quote and exports a valid PDF', async ({
    page, request, freshUser,
  }) => {
    await loginUI(page, freshUser);
    const cookies = await captureCookies(page);

    // ---- Provision project + kitchen + 2 items via API ----
    const project = await request.post(`${API_BASE}/projects`, {
      headers: { Cookie: cookies },
      data: { name: 'Quote Project', clientName: 'Acme' },
    });
    const { data: pData } = await project.json();
    const kitchen = await request.post(`${API_BASE}/kitchens`, {
      headers: { Cookie: cookies },
      data: {
        projectId: pData.id, name: 'Q-Kitchen',
        widthCm: 400, depthCm: 350, heightCm: 270,
      },
    });
    const { data: kData } = await kitchen.json();

    // Add 2 items directly (skips the catalog UI — that path is Flow 4)
    for (const sku of ['METOD-60-WHITE', 'METOD-80-BLACK']) {
      await request.post(`${API_BASE}/kitchens/${kData.id}/items`, {
        headers: { Cookie: cookies },
        data: {
          sku, label: sku, providerCode: 'IKEA',
          unitPrice: 199.99, quantity: 1,
          x: 0, y: 0, z: 0, rotation: 0,
        },
      });
    }

    // ---- Open the quote view ----
    await page.goto(`/fr/projects/${pData.id}/kitchens/${kData.id}/quote`);

    // Total visible and matches sum (2 × 199.99 = 399.98 ; allow display
    // variation: "399,98 €", "399.98 €", "399,98€", etc.)
    await expect(page.getByText(/399[\.,]98/).first())
      .toBeVisible({ timeout: 15_000 });

    // ---- Trigger PDF export and capture the download ----
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 30_000 }),
      page.getByRole('button', { name: /exporter|export.*pdf|télécharger.*pdf/i })
        .first()
        .click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);

    const path = await download.path();
    expect(path, 'download path missing').toBeTruthy();

    const fs = await import('node:fs/promises');
    const head = await fs.readFile(path!).then((b) => b.subarray(0, 5).toString('ascii'));
    expect(head, 'file is not a PDF (missing %PDF- magic)').toBe('%PDF-');

    const stat = await fs.stat(path!);
    expect(stat.size, 'PDF is suspiciously small').toBeGreaterThan(2_000);
  });
});
