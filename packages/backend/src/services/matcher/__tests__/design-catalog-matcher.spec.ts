import { DesignCatalogMatcher } from '../design-catalog-matcher.service';

import type { MatcherDb, ProductRow, SlotInput } from '../design-catalog-matcher.types';

function makeDb(rows: Partial<ProductRow>[]) {
  const findMany = jest.fn().mockResolvedValue(
    rows.map((r, i) => ({
      id: `p${i + 1}`,
      sku: `SKU${i + 1}`,
      brand: 'Bosch',
      price: 200,
      width: 59.5,
      height: 59.5,
      depth: 55,
      availability: 'in_stock',
      dimensionConfidence: 1,
      ...r,
    }))
  );
  return { db: { product: { findMany } } as unknown as MatcherDb, findMany };
}

const ovenSlot = (over: Partial<SlotInput> = {}): SlotInput => ({
  type: 'oven',
  dimensions: { width: 60, height: 60, depth: 55 },
  ...over,
});

describe('DesignCatalogMatcher.findMatchingProducts', () => {
  it('exact_match : slot 60x60x55, candidat 59.5x59.5x55 (5mm <= tol exacte)', async () => {
    const { db } = makeDb([{ width: 59.5, height: 59.5, depth: 55 }]);
    const r = await new DesignCatalogMatcher(db).findMatchingProducts(ovenSlot());
    expect(r.status).toBe('exact_match');
    expect(r.productId).toBe('p1');
  });

  it('matched_degraded : candidat 58x60x55 (20mm, dans tol dégradée)', async () => {
    const { db } = makeDb([{ width: 58, height: 60, depth: 55 }]);
    const r = await new DesignCatalogMatcher(db).findMatchingProducts(ovenSlot());
    expect(r.status).toBe('matched_degraded');
  });

  it('matched_over_budget : cotes OK mais prix > budget.max', async () => {
    const { db } = makeDb([{ width: 60, height: 60, depth: 55, price: 700 }]);
    const r = await new DesignCatalogMatcher(db).findMatchingProducts(
      ovenSlot({ budget: { max: 500 } })
    );
    expect(r.status).toBe('matched_over_budget');
    expect(r.productId).toBe('p1');
  });

  it('no_match : pool vide -> productId null', async () => {
    const { db } = makeDb([]);
    const r = await new DesignCatalogMatcher(db).findMatchingProducts(ovenSlot());
    expect(r.status).toBe('no_match');
    expect(r.productId).toBeNull();
    expect(r.alternatives).toHaveLength(0);
  });

  it('ranking : à cotes égales, le moins cher gagne', async () => {
    const { db } = makeDb([
      { width: 60, height: 60, depth: 55, price: 300 },
      { width: 60, height: 60, depth: 55, price: 200 },
    ]);
    const r = await new DesignCatalogMatcher(db).findMatchingProducts(ovenSlot());
    expect(r.product?.price).toBe(200);
    expect(r.productId).toBe('p2');
    expect(r.alternatives[0]?.price).toBe(300);
  });

  it('brandPreference : la marque préférée passe en tête (soft, pas filtre dur)', async () => {
    const { db } = makeDb([
      { width: 60, height: 60, depth: 55, brand: 'Bosch' },
      { width: 60, height: 60, depth: 55, brand: 'IKEA' },
    ]);
    const r = await new DesignCatalogMatcher(db).findMatchingProducts(
      ovenSlot({ brandPreference: ['IKEA'] })
    );
    expect(r.product?.brand).toBe('IKEA');
    expect(r.alternatives.map((a) => a.brand)).toContain('Bosch'); // non exclu, juste dépriorisé
  });

  it('seuil conf PAR TYPE : electro -> gte 0.7 ; meuble -> gte 0.5 (dans le where)', async () => {
    const { db: dbE, findMany: fE } = makeDb([]);
    await new DesignCatalogMatcher(dbE).findMatchingProducts(ovenSlot());
    expect(fE.mock.calls[0][0].where.dimensionConfidence.gte).toBe(0.7);
    expect(fE.mock.calls[0][0].where.category.slug).toBe('electromenager-cuisson');

    const { db: dbM, findMany: fM } = makeDb([]);
    await new DesignCatalogMatcher(dbM).findMatchingProducts({
      type: 'base_cabinet',
      dimensions: { width: 60 },
    });
    expect(fM.mock.calls[0][0].where.dimensionConfidence.gte).toBe(0.5);
    expect(fM.mock.calls[0][0].where.category.slug).toBe('meubles-bas');
  });

  it("slot 'hob' : pool vide -> no_match + where exclut ovens/rangehoods", async () => {
    const { db, findMany } = makeDb([]);
    const r = await new DesignCatalogMatcher(db).findMatchingProducts({
      type: 'hob',
      dimensions: { width: 60 },
    });
    expect(r.status).toBe('no_match');
    const where = findMany.mock.calls[0][0].where;
    expect(where.category.slug).toBe('electromenager-cuisson');
    expect(JSON.stringify(where.NOT)).toContain('ovens');
    expect(JSON.stringify(where.NOT)).toContain('rangehoods');
  });

  it("edge : cote produit absente quand le slot l'exige -> candidat exclu", async () => {
    const { db } = makeDb([{ width: 60, height: null, depth: 55 }]); // height null, slot demande height
    const r = await new DesignCatalogMatcher(db).findMatchingProducts(ovenSlot());
    expect(r.status).toBe('no_match');
  });

  it('oven : where filtre applianceGroup=ovens', async () => {
    const { db, findMany } = makeDb([]);
    await new DesignCatalogMatcher(db).findMatchingProducts(ovenSlot());
    expect(JSON.stringify(findMany.mock.calls[0][0].where)).toContain('"applianceGroup"');
    expect(JSON.stringify(findMany.mock.calls[0][0].where)).toContain('ovens');
  });

  it('P6 structurel : le where envoyé à findMany contient isCanonical=true', async () => {
    const { db, findMany } = makeDb([]);
    await new DesignCatalogMatcher(db).findMatchingProducts(ovenSlot());
    expect(findMany.mock.calls[0][0].where.isCanonical).toBe(true);
  });

  it('P6 comportemental : seul le canonique remonte, le variant couleur est exclu', async () => {
    // Pool [canonique, variant]. Le variant est MOINS CHER -> sans le filtre il
    // gagnerait au ranking ; le findMany mocké respecte where.isCanonical (comme
    // Prisma) et ne renvoie donc que le canonique.
    // Negative control: VARIANT is cheaper (180 < 200) with identical dims
    // (exact_match). Without isCanonical:true in the service where, findMany would
    // return both, VARIANT would win on price, and these assertions would fail.
    // This is what makes the test guard the filter rather than be a no-op.
    const pool: Array<Partial<ProductRow> & { isCanonical: boolean; parentSku: string | null }> = [
      {
        id: 'canon',
        sku: 'CANON',
        brand: 'Vicco',
        price: 200,
        width: 60,
        height: 60,
        depth: 55,
        availability: 'in_stock',
        dimensionConfidence: 1,
        isCanonical: true,
        parentSku: null,
      },
      {
        id: 'variant',
        sku: 'VARIANT',
        brand: 'Vicco',
        price: 180,
        width: 60,
        height: 60,
        depth: 55,
        availability: 'in_stock',
        dimensionConfidence: 1,
        isCanonical: false,
        parentSku: 'CANON',
      },
    ];
    const findMany = jest
      .fn()
      .mockImplementation(({ where }: { where: { isCanonical?: boolean } }) =>
        Promise.resolve(
          pool.filter((r) => where.isCanonical === undefined || r.isCanonical === where.isCanonical)
        )
      );
    const db = { product: { findMany } } as unknown as MatcherDb;

    const r = await new DesignCatalogMatcher(db).findMatchingProducts(ovenSlot());

    expect(r.product?.sku).toBe('CANON');
    expect(r.productId).toBe('canon');
    expect(r.alternatives.map((a) => a.sku)).not.toContain('VARIANT');
    // Anchor the intent inside this behavioural test too: the filter must be in the where.
    expect(findMany.mock.calls[0][0].where.isCanonical).toBe(true);
  });
});
