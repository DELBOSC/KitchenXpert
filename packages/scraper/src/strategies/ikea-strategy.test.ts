import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { describe, it, expect, vi } from 'vitest';

import { IkeaStrategy, parseIkeaDims } from './ikea-strategy';
import type { ApiAdapter } from '../adapters/api-adapter';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(readFileSync(join(here, '__fixtures__/ikea-sample.json'), 'utf8'));

/** ApiAdapter mock that always returns the fixture response. */
function mockApi(response: unknown = fixture): ApiAdapter {
  return { fetchJson: vi.fn().mockResolvedValue(response) } as unknown as ApiAdapter;
}

describe('IkeaStrategy', () => {
  it('exposes brandId + sourceLevel N2', () => {
    const s = new IkeaStrategy(mockApi());
    expect(s.brandId).toBe('ikea');
    expect(s.sourceLevel).toBe(2);
  });

  it('maps a full category batch to valid unified products', async () => {
    const s = new IkeaStrategy(mockApi());
    const results = await s.fetchProductsByCategory('metod');
    expect(results).toHaveLength(4);
    expect(results.every((r) => r.success)).toBe(true);
  });

  it('maps a 3-dim cabinet correctly (sku/name/dims mm/price cents/source)', async () => {
    const s = new IkeaStrategy(mockApi());
    const [first] = await s.fetchProductsByCategory('metod');
    const p = first.product!;
    expect(p.sku).toBe('50205626');
    expect(p.name).toBe('METOD Rangement');
    expect(p.brand).toBe('IKEA');
    expect(p.widthMm).toBe(600);
    expect(p.depthMm).toBe(600);
    expect(p.heightMm).toBe(800);
    expect(p.dimensionConfidence).toBe(1);
    expect(p.priceEurCents).toBe(3400);
    expect(p.currency).toBe('EUR');
    expect(p.sourceLevel).toBe(2);
    expect(p.sourceUrl).toContain('ikea.com');
    // Convention §15.8: rawMeasureText preserved when dims extracted.
    expect(p.specifications?.rawMeasureText).toBe('60x60x80 cm');
  });

  it('flags low confidence for a single-dimension item (the leg)', async () => {
    const s = new IkeaStrategy(mockApi());
    const results = await s.fetchProductsByCategory('metod');
    const leg = results.map((r) => r.product!).find((p) => p.sku === '70556067')!;
    expect(leg.widthMm).toBe(80); // "8 cm" -> 80mm
    expect(leg.heightMm).toBeNull();
    expect(leg.depthMm).toBeNull();
    expect(leg.dimensionConfidence).toBe(0.3);
  });

  it('fetchProductByUrl extracts the item number and returns the match', async () => {
    const s = new IkeaStrategy(mockApi());
    const r = await s.fetchProductByUrl(
      'https://www.ikea.com/fr/fr/p/metod-colonne-blanc-60212565/'
    );
    expect(r.success).toBe(true);
    expect(r.product?.sku).toBe('60212565');
  });

  it('fetchProductByUrl fails cleanly on a URL without item number', async () => {
    const s = new IkeaStrategy(mockApi());
    const r = await s.fetchProductByUrl('https://www.ikea.com/fr/fr/cat/cuisines/');
    expect(r.success).toBe(false);
    expect(r.errors.join(' ')).toMatch(/item number/i);
  });

  it('returns skip-not-crash on an empty API response', async () => {
    const s = new IkeaStrategy(
      mockApi({ searchResultPage: { products: { main: { items: [] } } } })
    );
    const results = await s.fetchProductsByCategory('zzz');
    expect(results).toEqual([]);
  });
});

describe('parseIkeaDims', () => {
  it('3 dims (cm) -> W×D×H mm, confidence 1.0', () => {
    expect(parseIkeaDims('60x60x80 cm')).toEqual({
      widthMm: 600,
      depthMm: 600,
      heightMm: 800,
      confidence: 1,
    });
  });
  it('2 dims -> W,H mm, confidence 0.5', () => {
    expect(parseIkeaDims('60x37 cm')).toEqual({
      widthMm: 600,
      heightMm: 370,
      depthMm: null,
      confidence: 0.5,
    });
  });
  it('1 dim -> W mm, confidence 0.3', () => {
    expect(parseIkeaDims('8 cm')).toEqual({
      widthMm: 80,
      heightMm: null,
      depthMm: null,
      confidence: 0.3,
    });
  });
  it('mm unit is not multiplied', () => {
    expect(parseIkeaDims('600x800 mm')).toEqual({
      widthMm: 600,
      heightMm: 800,
      depthMm: null,
      confidence: 0.5,
    });
  });
  it('decimal thickness rounds (worktop 186x3.8 cm)', () => {
    expect(parseIkeaDims('186x3.8 cm')).toEqual({
      widthMm: 1860,
      heightMm: 38,
      depthMm: null,
      confidence: 0.5,
    });
  });
  it('empty/undefined -> all null, confidence 0', () => {
    expect(parseIkeaDims(undefined)).toEqual({
      widthMm: null,
      heightMm: null,
      depthMm: null,
      confidence: 0,
    });
    expect(parseIkeaDims('')).toEqual({
      widthMm: null,
      heightMm: null,
      depthMm: null,
      confidence: 0,
    });
  });
});

describe('IkeaStrategy.detectType (via category batch)', () => {
  it('classifies worktop / appliance / sink from name + categoryPath', async () => {
    const raw = {
      searchResultPage: {
        products: {
          main: {
            items: [
              {
                product: {
                  name: 'SÄLJAN',
                  typeName: 'Plan de travail',
                  itemNoGlobal: '1',
                  pipUrl: 'https://www.ikea.com/fr/fr/p/x-1/',
                  itemMeasureReferenceText: '186x3.8 cm',
                  salesPrice: { numeral: 49, currencyCode: 'EUR' },
                },
              },
              {
                product: {
                  name: 'Four',
                  typeName: 'encastrable',
                  itemNoGlobal: '2',
                  pipUrl: 'https://www.ikea.com/fr/fr/p/x-2/',
                  salesPrice: { numeral: 300, currencyCode: 'EUR' },
                },
              },
              {
                product: {
                  name: 'Évier',
                  typeName: '1 bac',
                  itemNoGlobal: '3',
                  pipUrl: 'https://www.ikea.com/fr/fr/p/x-3/',
                  salesPrice: { numeral: 90, currencyCode: 'EUR' },
                },
              },
            ],
          },
        },
      },
    };
    const s = new IkeaStrategy(mockApi(raw));
    const types = (await s.fetchProductsByCategory('x')).map((r) => r.product!.type);
    expect(types).toEqual(['worktop', 'appliance', 'sink']);
  });
});
