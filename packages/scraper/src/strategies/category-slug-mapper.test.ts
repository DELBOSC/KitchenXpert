import { describe, it, expect } from 'vitest';

import { resolveCategorySlug, type UnifiedProduct } from '@kitchenxpert/common';

function up(over: Partial<UnifiedProduct> = {}): UnifiedProduct {
  return {
    sku: 'X',
    name: 'Produit',
    brand: 'B',
    type: 'cabinet',
    widthMm: null,
    heightMm: null,
    depthMm: null,
    dimensionConfidence: 0,
    priceEurCents: null,
    currency: 'EUR',
    sourceLevel: 1,
    sourceUrl: 'https://x.test/p',
    lastVerifiedAt: new Date(),
    specifications: {},
    ...over,
  };
}

describe('resolveCategorySlug', () => {
  it('override explicite specifications.categorySlug = autoritaire (ingestion par cat_id)', () => {
    // type cabinet + applianceGroup ovens, mais categorySlug impose plans-de-travail
    const r = resolveCategorySlug(
      up({
        type: 'cabinet',
        specifications: { applianceGroup: 'ovens', categorySlug: 'plans-de-travail' },
      })
    );
    expect(r).toEqual({ slug: 'plans-de-travail', detection: 'explicit' });
  });

  it('override ignoré si slug invalide -> fallback logique normale', () => {
    const r = resolveCategorySlug(
      up({ type: 'worktop', specifications: { categorySlug: 'pas-un-slug' } })
    );
    expect(r.slug).toBe('plans-de-travail'); // via productType
  });

  it('EPREL applianceGroup -> catégorie (explicit)', () => {
    const cases: Array<[string, string]> = [
      ['dishwashers2019', 'electromenager-lavage'],
      ['refrigeratingappliances2019', 'electromenager-froid'],
      ['ovens', 'electromenager-cuisson'],
      ['rangehoods', 'electromenager-cuisson'],
    ];
    for (const [group, slug] of cases) {
      const r = resolveCategorySlug(
        up({ type: 'appliance', specifications: { applianceGroup: group } })
      );
      expect(r).toEqual({ slug, detection: 'explicit' });
    }
  });

  it('applianceGroup prioritaire sur productType', () => {
    // type cabinet mais group ovens -> ovens gagne
    const r = resolveCategorySlug(
      up({ type: 'cabinet', specifications: { applianceGroup: 'ovens' } })
    );
    expect(r.slug).toBe('electromenager-cuisson');
    expect(r.detection).toBe('explicit');
  });

  it('worktop -> plans-de-travail (explicit)', () => {
    expect(resolveCategorySlug(up({ type: 'worktop' }))).toEqual({
      slug: 'plans-de-travail',
      detection: 'explicit',
    });
  });

  it('sink + tap -> eviers-robinetterie (explicit)', () => {
    expect(resolveCategorySlug(up({ type: 'sink' })).slug).toBe('eviers-robinetterie');
    expect(resolveCategorySlug(up({ type: 'tap' })).slug).toBe('eviers-robinetterie');
  });

  it('facade -> facades (explicit)', () => {
    expect(resolveCategorySlug(up({ type: 'facade' }))).toEqual({
      slug: 'facades',
      detection: 'explicit',
    });
  });

  it('appliance SANS group -> electromenager-cuisson (inferred)', () => {
    expect(resolveCategorySlug(up({ type: 'appliance', specifications: {} }))).toEqual({
      slug: 'electromenager-cuisson',
      detection: 'inferred',
    });
  });

  it('cabinet : détection colonne / haut / mural / bas / fallback (inferred)', () => {
    expect(
      resolveCategorySlug(up({ type: 'cabinet', name: 'Structure pour colonne L. 200' })).slug
    ).toBe('colonnes');
    expect(resolveCategorySlug(up({ type: 'cabinet', name: 'Meuble haut 60' })).slug).toBe(
      'meubles-hauts'
    );
    expect(resolveCategorySlug(up({ type: 'cabinet', name: 'Caisson mural blanc' })).slug).toBe(
      'meubles-hauts'
    );
    expect(resolveCategorySlug(up({ type: 'cabinet', name: 'Caisson bas 80' })).slug).toBe(
      'meubles-bas'
    );
    expect(
      resolveCategorySlug(up({ type: 'cabinet', name: 'Caisson de cuisine GoodHome' })).slug
    ).toBe('meubles-bas'); // fallback
    expect(resolveCategorySlug(up({ type: 'cabinet', name: 'X' })).detection).toBe('inferred');
  });

  it('colonne prioritaire sur bas/haut (ordre)', () => {
    expect(resolveCategorySlug(up({ type: 'cabinet', name: 'Colonne meuble bas' })).slug).toBe(
      'colonnes'
    );
  });

  it('type non couvert -> null (storage/handle/lighting/unknown)', () => {
    for (const t of [
      'storage',
      'handle',
      'lighting',
      'accessory',
      'decoration',
      'unknown',
    ] as const) {
      expect(resolveCategorySlug(up({ type: t }))).toEqual({ slug: null, detection: null });
    }
  });
});
