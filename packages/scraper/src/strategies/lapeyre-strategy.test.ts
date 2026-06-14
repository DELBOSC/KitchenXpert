import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { describe, it, expect, vi } from 'vitest';

import { LapeyreStrategy } from './lapeyre-strategy';
import type { ApiAdapter } from '../adapters/api-adapter';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(readFileSync(join(here, '__fixtures__/lapeyre-sample.json'), 'utf8'));

function mockApi(response: unknown = fixture): ApiAdapter {
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
    // 'Offer' (1495.0) preferred over 'Display' (1602.97) -> cents
    expect(p.priceEurCents).toBe(149500);
    // seo.href -> absolute URL
    expect(p.sourceUrl).toMatch(/^https:\/\/www\.lapeyre\.fr\//);
    expect(p.sourceLevel).toBe(2);
  });

  it('emits dimensions null + dimensionConfidence 0 (Lapeyre API has no cotes)', async () => {
    const s = new LapeyreStrategy(mockApi());
    const results = await s.fetchProductsByCategory('cuisine');
    for (const r of results) {
      expect(r.product!.widthMm).toBeNull();
      expect(r.product!.heightMm).toBeNull();
      expect(r.product!.depthMm).toBeNull();
      expect(r.product!.dimensionConfidence).toBe(0);
      // convention §15.8: rawMeasureText present (null) when no cote extracted
      expect(r.product!.specifications?.rawMeasureText).toBeNull();
    }
  });

  it('absolutises relative WCS thumbnails to valid URLs', async () => {
    const s = new LapeyreStrategy(mockApi());
    const [first] = await s.fetchProductsByCategory('cuisine');
    // fixture thumbnails are relative (/dx/api/dam/…) -> must become absolute https URLs
    expect(first.product!.imageUrls?.[0]).toMatch(/^https:\/\/www\.lapeyre\.fr\/dx\/api\/dam\//);
  });

  it('detects product types from the name (cabinet / tap)', async () => {
    const s = new LapeyreStrategy(mockApi());
    const byKey = Object.fromEntries(
      (await s.fetchProductsByCategory('x')).map((r) => [r.product!.sku, r.product!.type]),
    );
    expect(byKey['FPC8937243']).toBe('cabinet'); // "Cuisine Lapeyre tout en 1"
    expect(byKey['FPC3093022']).toBe('tap'); // "Mitigeur évier START noir"
  });

  it('falls back to Display price when no Offer', async () => {
    const resp = {
      catalogEntryView: [
        { partNumber: 'X1', name: 'Plan de travail compact', seo: { href: '/x-1' },
          price: [{ usage: 'Display', currency: 'EUR', value: '249.00' }] },
      ],
    };
    const s = new LapeyreStrategy(mockApi(resp));
    const [r] = await s.fetchProductsByCategory('x');
    expect(r.success).toBe(true);
    expect(r.product!.priceEurCents).toBe(24900);
    expect(r.product!.type).toBe('worktop');
  });

  it('fetchProductByUrl extracts the trailing numeric id', async () => {
    const api = mockApi({ catalogEntryView: [fixture.catalogEntryView[1]] });
    const s = new LapeyreStrategy(api);
    const r = await s.fetchProductByUrl('https://www.lapeyre.fr/mitigeur-evier-start-cuisine-noir-1249857');
    expect(r.success).toBe(true);
    // assert the byId URL carried the extracted id
    const calledUrl = (api.fetchJson as unknown as { mock: { calls: string[][] } }).mock.calls[0][0];
    expect(calledUrl).toContain('/byId/1249857');
  });

  it('fetchProductByUrl fails cleanly on a URL without id', async () => {
    const s = new LapeyreStrategy(mockApi());
    const r = await s.fetchProductByUrl('https://www.lapeyre.fr/cuisines');
    expect(r.success).toBe(false);
    expect(r.errors.join(' ')).toMatch(/id/i);
  });

  it('returns skip-not-crash on empty response', async () => {
    const s = new LapeyreStrategy(mockApi({ catalogEntryView: [] }));
    expect(await s.fetchProductsByCategory('zzz')).toEqual([]);
  });

  it('skips an entry without SKU (Zod fail, no throw)', async () => {
    const s = new LapeyreStrategy(mockApi({ catalogEntryView: [{ name: 'no sku', seo: { href: '/x' }, price: [] }] }));
    const [r] = await s.fetchProductsByCategory('x');
    expect(r.success).toBe(false);
    expect(r.errors.join(' ')).toMatch(/sku/i);
  });
});
