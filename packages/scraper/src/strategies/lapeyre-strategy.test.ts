import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { describe, it, expect, vi } from 'vitest';

import { LapeyreStrategy } from './lapeyre-strategy';
import type { ApiAdapter } from '../adapters/api-adapter';

const here = dirname(fileURLToPath(import.meta.url));
const discovery = JSON.parse(readFileSync(join(here, '__fixtures__/lapeyre-sample.json'), 'utf8'));
const v2detail = JSON.parse(
  readFileSync(join(here, '__fixtures__/lapeyre-v2-detail.json'), 'utf8')
);

/** URL-aware mock: bySearchTerm/byId -> discovery ; /api/v2/products -> v2 detail (dims). */
function mockApi(): ApiAdapter {
  const fetchJson = vi.fn(async (url: string) =>
    url.includes('/api/v2/products') ? v2detail : discovery
  );
  return { fetchJson } as unknown as ApiAdapter;
}
/** Fixed-response mock (same object for every URL) — edge cases. */
function mockApiFixed(response: unknown): ApiAdapter {
  return { fetchJson: vi.fn().mockResolvedValue(response) } as unknown as ApiAdapter;
}

describe('LapeyreStrategy', () => {
  it('exposes brandId + sourceLevel N2', () => {
    const s = new LapeyreStrategy(mockApi());
    expect(s.brandId).toBe('lapeyre');
    expect(s.sourceLevel).toBe(2);
  });

  it('maps a category batch to valid unified products (reuses generic ApiAdapter)', async () => {
    const s = new LapeyreStrategy(mockApi());
    const results = await s.fetchProductsByCategory('cuisine');
    expect(results).toHaveLength(4);
    expect(results.every((r) => r.success)).toBe(true);
  });

  it('maps SKU/name/price/currency/sourceUrl from the WCS entry', async () => {
    const s = new LapeyreStrategy(mockApi());
    const [first] = await s.fetchProductsByCategory('cuisine');
    const p = first.product!;
    expect(p.sku).toBe('FPC8937243');
    expect(p.name).toBe('Cuisine Lapeyre tout en 1');
    expect(p.brand).toBe('Lapeyre');
    expect(p.currency).toBe('EUR');
    expect(p.priceEurCents).toBe(149500); // Offer preferred over Display
    expect(p.sourceUrl).toMatch(/^https:\/\/www\.lapeyre\.fr\//);
    expect(p.sourceLevel).toBe(2);
  });

  it('ENRICHES cotes from the v2 detail API (cm -> mm int + confidence)', async () => {
    const s = new LapeyreStrategy(mockApi());
    const [first] = await s.fetchProductsByCategory('cuisine');
    const p = first.product!;
    // v2 fixture (SKU child items[0]): LARGEUR=28, HAUTEUR=6.5, PROFONDEUR=32 cm -> mm
    expect(p.widthMm).toBe(280);
    expect(p.heightMm).toBe(65);
    expect(p.depthMm).toBe(320);
    expect(p.dimensionConfidence).toBe(1);
    expect(p.specifications?.rawMeasureText).toBe('L28×H6.5×P32 cm');
  });

  it('falls back to dims null + confidence 0 when v2 detail has no cotes', async () => {
    const s = new LapeyreStrategy(mockApiFixed(discovery)); // no `contents` -> enrichDims null
    const [first] = await s.fetchProductsByCategory('cuisine');
    expect(first.product!.widthMm).toBeNull();
    expect(first.product!.dimensionConfidence).toBe(0);
    expect(first.product!.specifications?.rawMeasureText).toBeNull();
  });

  it('partial dims (2 of 3) -> confidence 0.5', async () => {
    const partial = {
      contents: [
        {
          attributes: [
            { identifier: 'DIMENSIONS-COMMUNES-DIM-LARGEUR', values: [{ value: '60' }] },
            { identifier: 'DIMENSIONS-COMMUNES-DIM-HAUTEUR', values: [{ value: '80' }] },
          ],
        },
      ],
    };
    const api = {
      fetchJson: vi.fn(async (u: string) => (u.includes('/api/v2/') ? partial : discovery)),
    } as unknown as ApiAdapter;
    const s = new LapeyreStrategy(api);
    const [first] = await s.fetchProductsByCategory('x');
    expect(first.product!.widthMm).toBe(600);
    expect(first.product!.heightMm).toBe(800);
    expect(first.product!.depthMm).toBeNull();
    expect(first.product!.dimensionConfidence).toBe(0.5);
  });

  it('absolutises relative WCS thumbnails to valid URLs', async () => {
    const s = new LapeyreStrategy(mockApi());
    const [first] = await s.fetchProductsByCategory('cuisine');
    expect(first.product!.imageUrls?.[0]).toMatch(/^https:\/\/www\.lapeyre\.fr\/dx\/api\/dam\//);
  });

  it('detects product types from the name (cabinet / tap)', async () => {
    const s = new LapeyreStrategy(mockApi());
    const byKey = Object.fromEntries(
      (await s.fetchProductsByCategory('x')).map((r) => [r.product!.sku, r.product!.type])
    );
    expect(byKey['FPC8937243']).toBe('cabinet');
    expect(byKey['FPC3093022']).toBe('tap');
  });

  it('falls back to Display price when no Offer', async () => {
    const resp = {
      catalogEntryView: [
        {
          partNumber: 'X1',
          name: 'Plan de travail compact',
          seo: { href: '/x-1' },
          price: [{ usage: 'Display', currency: 'EUR', value: '249.00' }],
        },
      ],
    };
    const s = new LapeyreStrategy(mockApiFixed(resp));
    const [r] = await s.fetchProductsByCategory('x');
    expect(r.success).toBe(true);
    expect(r.product!.priceEurCents).toBe(24900);
    expect(r.product!.type).toBe('worktop');
  });

  it('fetchProductByUrl extracts the trailing numeric id', async () => {
    const api = mockApiFixed({ catalogEntryView: [discovery.catalogEntryView[1]] });
    const s = new LapeyreStrategy(api);
    const r = await s.fetchProductByUrl(
      'https://www.lapeyre.fr/mitigeur-evier-start-cuisine-noir-1249857'
    );
    expect(r.success).toBe(true);
    const calledUrl = (api.fetchJson as unknown as { mock: { calls: string[][] } }).mock
      .calls[0][0];
    expect(calledUrl).toContain('/byId/1249857');
  });

  it('fetchProductByUrl fails cleanly on a URL without id', async () => {
    const s = new LapeyreStrategy(mockApi());
    const r = await s.fetchProductByUrl('https://www.lapeyre.fr/cuisines');
    expect(r.success).toBe(false);
    expect(r.errors.join(' ')).toMatch(/id/i);
  });

  it('returns skip-not-crash on empty response', async () => {
    const s = new LapeyreStrategy(mockApiFixed({ catalogEntryView: [] }));
    expect(await s.fetchProductsByCategory('zzz')).toEqual([]);
  });

  it('skips an entry without SKU (Zod fail, no throw)', async () => {
    const s = new LapeyreStrategy(
      mockApiFixed({ catalogEntryView: [{ name: 'no sku', seo: { href: '/x' }, price: [] }] })
    );
    const [r] = await s.fetchProductsByCategory('x');
    expect(r.success).toBe(false);
    expect(r.errors.join(' ')).toMatch(/sku/i);
  });
});
