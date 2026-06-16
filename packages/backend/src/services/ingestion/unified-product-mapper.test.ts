import type { UnifiedProduct } from '@kitchenxpert/common';

import { mapUnifiedProductToUpsert } from './unified-product-mapper';

function makeUP(over: Partial<UnifiedProduct> = {}): UnifiedProduct {
  return {
    sku: '12345',
    name: 'METOD Élément',
    brand: 'IKEA',
    type: 'cabinet',
    widthMm: 600,
    heightMm: 800,
    depthMm: 600,
    dimensionConfidence: 1,
    priceEurCents: 12999,
    currency: 'EUR',
    sourceLevel: 2,
    sourceUrl: 'https://www.ikea.com/fr/fr/p/metod-12345',
    lastVerifiedAt: new Date('2026-06-15T00:00:00.000Z'),
    specifications: { rawMeasureText: '60x60x80 cm' },
    imageUrls: ['https://www.ikea.com/img/metod.jpg'],
    ...over,
  };
}

describe('mapUnifiedProductToUpsert', () => {
  it('maps a standard IKEA product (sku namespacing, price cents->eur, dims mm->cm)', () => {
    const { sku, data } = mapUnifiedProductToUpsert(makeUP());

    expect(sku).toBe('IKEA-12345');
    expect(data.name).toBe('METOD Élément');
    expect(data.brand).toBe('IKEA');
    expect(data.price).toBe(129.99);
    expect(data.currency).toBe('EUR');
    // mm -> cm
    expect(data.width).toBe(60);
    expect(data.height).toBe(80);
    expect(data.depth).toBe(60);
    // ingestion provenance
    expect(data.dimensionConfidence).toBe(1);
    expect(data.sourceLevel).toBe(2);
    expect(data.sourceUrl).toBe('https://www.ikea.com/fr/fr/p/metod-12345');
    expect(data.lastVerifiedAt).toEqual(new Date('2026-06-15T00:00:00.000Z'));
    // specifications: original keys preserved + productType added
    expect(data.specifications).toMatchObject({
      rawMeasureText: '60x60x80 cm',
      productType: 'cabinet',
    });
    expect((data.specifications as Record<string, unknown>).priceMissing).toBeUndefined();
    expect(data.images).toEqual(['https://www.ikea.com/img/metod.jpg']);
  });

  it('upper-cases the brand in the namespaced SKU (Lapeyre)', () => {
    const { sku } = mapUnifiedProductToUpsert(
      makeUP({ brand: 'Lapeyre', sku: 'FPC8937243' }),
    );
    expect(sku).toBe('LAPEYRE-FPC8937243');
  });

  it('maps null dimensions to undefined (confidence 0)', () => {
    const { data } = mapUnifiedProductToUpsert(
      makeUP({
        brand: 'Lapeyre',
        sku: 'FPC1',
        widthMm: null,
        heightMm: null,
        depthMm: null,
        dimensionConfidence: 0,
        specifications: { rawMeasureText: null },
      }),
    );
    expect(data.width).toBeUndefined();
    expect(data.height).toBeUndefined();
    expect(data.depth).toBeUndefined();
    expect(data.dimensionConfidence).toBe(0);
  });

  it('converts a half-centimetre dimension losslessly (65mm -> 6.5cm)', () => {
    const { data } = mapUnifiedProductToUpsert(makeUP({ widthMm: 65 }));
    expect(data.width).toBe(6.5);
  });

  it('flags a missing price honestly (price=0 + specifications.priceMissing)', () => {
    const { data } = mapUnifiedProductToUpsert(makeUP({ priceEurCents: null }));
    expect(data.price).toBe(0);
    expect((data.specifications as Record<string, unknown>).priceMissing).toBe(true);
  });

  it('omits images when imageUrls is empty or absent', () => {
    expect(mapUnifiedProductToUpsert(makeUP({ imageUrls: [] })).data.images).toBeUndefined();
    expect(mapUnifiedProductToUpsert(makeUP({ imageUrls: undefined })).data.images).toBeUndefined();
  });

  it('carries an EAN into specifications when present', () => {
    const { data } = mapUnifiedProductToUpsert(makeUP({ ean: '7350094711234' }));
    expect((data.specifications as Record<string, unknown>).ean).toBe('7350094711234');
  });

  it('pose categoryId + specifications.categoryDetection quand category fourni (§15.8 Phase 2)', () => {
    const { data } = mapUnifiedProductToUpsert(makeUP(), { categoryId: 'cat-1', detection: 'inferred' });
    expect(data.categoryId).toBe('cat-1');
    expect((data.specifications as Record<string, unknown>).categoryDetection).toBe('inferred');
  });

  it('aucun categoryId/detection si category non fourni (backward-compat)', () => {
    const { data } = mapUnifiedProductToUpsert(makeUP());
    expect(data.categoryId).toBeUndefined();
    expect((data.specifications as Record<string, unknown>).categoryDetection).toBeUndefined();
  });
});
