import { describe, it, expect } from 'vitest';

import {
  UnifiedProductSchema,
  ParseResultSchema,
  validateUnifiedProduct,
  type UnifiedProduct,
} from './unified-product.schema';

const base: UnifiedProduct = {
  sku: '50205626',
  name: 'METOD Rangement',
  brand: 'IKEA',
  type: 'cabinet',
  widthMm: 600,
  heightMm: 800,
  depthMm: 600,
  dimensionConfidence: 1,
  priceEurCents: 3400,
  currency: 'EUR',
  sourceLevel: 2,
  sourceUrl: 'https://www.ikea.com/fr/fr/p/metod-rangement-blanc-50205626/',
  lastVerifiedAt: new Date('2026-06-15T00:00:00Z'),
};

describe('UnifiedProductSchema', () => {
  it('accepts a complete valid product', () => {
    const r = validateUnifiedProduct(base);
    expect(r.success).toBe(true);
    expect(r.product?.sku).toBe('50205626');
    expect(r.errors).toHaveLength(0);
  });

  it('accepts a product with missing dimensions (nullable) + low confidence', () => {
    const partial = { ...base, depthMm: null, heightMm: null, dimensionConfidence: 0.3 };
    const r = validateUnifiedProduct(partial);
    expect(r.success).toBe(true);
    expect(r.product?.depthMm).toBeNull();
    expect(r.product?.dimensionConfidence).toBe(0.3);
  });

  it('rejects a product without SKU (skip-not-crash, no throw)', () => {
    const r = validateUnifiedProduct({ ...base, sku: '' });
    expect(r.success).toBe(false);
    expect(r.errors.join(' ')).toMatch(/sku/i);
  });

  it('rejects an invalid sourceLevel', () => {
    const r = validateUnifiedProduct({ ...base, sourceLevel: 5 });
    expect(r.success).toBe(false);
    expect(r.errors.join(' ')).toMatch(/sourceLevel/i);
  });

  it('rejects dimensionConfidence out of [0,1]', () => {
    expect(validateUnifiedProduct({ ...base, dimensionConfidence: 1.5 }).success).toBe(false);
    expect(validateUnifiedProduct({ ...base, dimensionConfidence: -0.1 }).success).toBe(false);
  });

  it('rejects non-integer / non-positive dimensions', () => {
    expect(validateUnifiedProduct({ ...base, widthMm: 600.5 }).success).toBe(false);
    expect(validateUnifiedProduct({ ...base, widthMm: 0 }).success).toBe(false);
  });

  it('rejects a non-integer price', () => {
    expect(validateUnifiedProduct({ ...base, priceEurCents: 34.5 }).success).toBe(false);
  });

  it('rejects an invalid sourceUrl', () => {
    expect(validateUnifiedProduct({ ...base, sourceUrl: 'not-a-url' }).success).toBe(false);
  });

  it('accepts optional specifications + imageUrls', () => {
    const r = validateUnifiedProduct({
      ...base,
      specifications: { color: 'blanc', doors: 1 },
      imageUrls: ['https://www.ikea.com/img/a.jpg'],
    });
    expect(r.success).toBe(true);
    expect(r.product?.specifications?.color).toBe('blanc');
  });

  it('never throws on garbage input', () => {
    expect(() => validateUnifiedProduct(null)).not.toThrow();
    expect(() => validateUnifiedProduct(42)).not.toThrow();
    expect(validateUnifiedProduct(undefined).success).toBe(false);
  });

  it('ParseResult shape is itself valid', () => {
    const r = validateUnifiedProduct(base);
    expect(ParseResultSchema.safeParse(r).success).toBe(true);
  });

  it('direct schema parse works for raw consumers', () => {
    expect(UnifiedProductSchema.safeParse(base).success).toBe(true);
  });

  // --- currency (ISO 4217) ---
  it('accepts a non-EUR currency (USD)', () => {
    const r = validateUnifiedProduct({ ...base, currency: 'USD' });
    expect(r.success).toBe(true);
    expect(r.product?.currency).toBe('USD');
  });

  it('defaults currency to EUR when omitted', () => {
    const { currency, ...noCurrency } = base;
    void currency;
    const r = validateUnifiedProduct(noCurrency);
    expect(r.success).toBe(true);
    expect(r.product?.currency).toBe('EUR');
  });

  it('rejects a 2-char currency', () => {
    expect(validateUnifiedProduct({ ...base, currency: 'EU' }).success).toBe(false);
  });

  it('rejects a 4-char currency', () => {
    expect(validateUnifiedProduct({ ...base, currency: 'EURO' }).success).toBe(false);
  });

  // --- ean / gtin ---
  it('accepts a product with an EAN', () => {
    const r = validateUnifiedProduct({ ...base, ean: '7350010060019' });
    expect(r.success).toBe(true);
    expect(r.product?.ean).toBe('7350010060019');
  });

  it('accepts a product without an EAN (optional)', () => {
    const { ...noEan } = base; // base has no ean
    expect(validateUnifiedProduct(noEan).success).toBe(true);
  });

  it('accepts a product with ean = null', () => {
    expect(validateUnifiedProduct({ ...base, ean: null }).success).toBe(true);
  });

  // --- extended ProductTypeEnum ---
  it('accepts new product types (sink, tap)', () => {
    expect(validateUnifiedProduct({ ...base, type: 'sink' }).success).toBe(true);
    expect(validateUnifiedProduct({ ...base, type: 'tap' }).success).toBe(true);
  });

  it('rejects an invalid product type', () => {
    expect(validateUnifiedProduct({ ...base, type: 'invalid-type' }).success).toBe(false);
  });
});
