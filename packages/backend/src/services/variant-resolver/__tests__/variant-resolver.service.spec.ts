/**
 * Unit tests for VariantResolverService (CLAUDE.md §15.8.4 P7).
 *
 * ResolverDb is MOCKED (no DB, no key). The main oracle is the REAL Vicco
 * gamme (canonical CASTORAMA-4251421945043, 11 SKU / 3 colors) measured in the
 * audit: Blanc canonical 44.9 + 2 Blanc variants, 5 Anthracite 44.9, 3 Noir
 * (45.9 / 45.9 / 46.9).
 */
import { VariantResolverService } from '../variant-resolver.service';

import type { ResolverDb, ResolverProductRow } from '../variant-resolver.types';

const PARENT = 'CASTORAMA-4251421945043';

function row(
  sku: string,
  color: string | null,
  price: number,
  isCanonical = false,
): ResolverProductRow {
  return {
    sku,
    isCanonical,
    parentSku: isCanonical ? null : PARENT,
    name: `Vicco Façade ${color ?? '?'}`,
    price,
    specifications: { color },
    isActive: true,
    deletedAt: null,
    images: [`https://img.example/${sku}.jpg`],
  };
}

// Real Vicco gamme (verbatim SKUs + prices from audit B2).
const VICCO: ResolverProductRow[] = [
  row(PARENT, 'Blanc Haute brillance', 44.9, true),
  row('CASTORAMA-4066731161645', 'Blanc Haute brillance', 44.9),
  row('CASTORAMA-4251421957817', 'Blanc Haute brillance', 44.9),
  row('CASTORAMA-4066731035533', 'Anthracite Haute brillance', 44.9),
  row('CASTORAMA-4066731161669', 'Anthracite Haute brillance', 44.9),
  row('CASTORAMA-4066731521241', 'Anthracite Haute brillance', 44.9),
  row('CASTORAMA-4251421927810', 'Anthracite Haute brillance', 44.9),
  row('CASTORAMA-4251421945067', 'Anthracite Haute brillance', 44.9),
  row('CASTORAMA-4066731354153', 'Noir Haute brillance', 45.9),
  row('CASTORAMA-4066731354139', 'Noir Haute brillance', 45.9),
  row('CASTORAMA-4066731360017', 'Noir Haute brillance', 46.9),
];

function makeDb(rows: ResolverProductRow[]) {
  const findMany = jest.fn().mockResolvedValue(rows);
  return { db: { product: { findMany } } as unknown as ResolverDb, findMany };
}

describe('VariantResolverService.resolveColors', () => {
  it('(a) Vicco gamme -> 3 color options with correct representative/price/count', async () => {
    const { db } = makeDb(VICCO);
    const opts = await new VariantResolverService(db).resolveColors(PARENT);
    const by = Object.fromEntries(opts.map((o) => [o.key, o]));

    expect(opts).toHaveLength(3);

    // Blanc = the canonical's color.
    expect(by.blanc).toMatchObject({
      kind: 'color', score: 100, isCanonicalColor: true,
      representativeSku: PARENT, priceFrom: 44.9, skuCount: 3,
    });

    // Anthracite: 5 variants, no canonical, cheapest 44.9.
    expect(by.anthracite).toMatchObject({
      score: 85, isCanonicalColor: false, priceFrom: 44.9, skuCount: 5,
    });

    // Noir: representative is the cheapest 45.9 (sku tie-break), NOT the 46.9.
    expect(by.noir).toMatchObject({
      score: 70, isCanonicalColor: false, priceFrom: 45.9, skuCount: 3,
      representativeSku: 'CASTORAMA-4066731354139',
    });
    expect(by.noir!.representativeSku).not.toBe('CASTORAMA-4066731360017'); // the 46.9 one
  });

  it('(b) ordering: score desc, then skuCount desc, then label asc', async () => {
    const { db } = makeDb(VICCO);
    const opts = await new VariantResolverService(db).resolveColors(PARENT);
    expect(opts.map((o) => o.key)).toEqual(['blanc', 'anthracite', 'noir']);
  });

  it('(c) isCanonicalColor is true only for the canonical color', async () => {
    const { db } = makeDb(VICCO);
    const opts = await new VariantResolverService(db).resolveColors(PARENT);
    expect(opts.filter((o) => o.isCanonicalColor).map((o) => o.key)).toEqual(['blanc']);
  });

  it('(d) mono-color gamme -> 1 option (no error)', async () => {
    const { db } = makeDb([
      row(PARENT, 'Blanc Haute brillance', 44.9, true),
      row('CASTORAMA-X1', 'Blanc Haute brillance', 44.9),
      row('CASTORAMA-X2', 'Blanc Haute brillance', 44.9),
    ]);
    const opts = await new VariantResolverService(db).resolveColors(PARENT);
    expect(opts).toHaveLength(1);
    expect(opts[0]).toMatchObject({ key: 'blanc', skuCount: 3, isCanonicalColor: true });
  });

  it('(e) a NULL-color variant is excluded; valid colors still offered', async () => {
    const { db } = makeDb([
      row(PARENT, 'Blanc Haute brillance', 44.9, true),
      row('CASTORAMA-N1', 'Noir Haute brillance', 45.9),
      row('CASTORAMA-NULL', null, 50), // no usable color -> excluded
    ]);
    const opts = await new VariantResolverService(db).resolveColors(PARENT);
    expect(opts.map((o) => o.key)).toEqual(['blanc', 'noir']);
  });

  it('(f) unknown canonical / empty gamme -> []', async () => {
    const { db } = makeDb([]);
    const opts = await new VariantResolverService(db).resolveColors('CASTORAMA-DOES-NOT-EXIST');
    expect(opts).toEqual([]);
  });

  it('queries the parentSku graph (OR parentSku/sku) with active filter', async () => {
    const { db, findMany } = makeDb(VICCO);
    await new VariantResolverService(db).resolveColors(PARENT);
    const where = findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({ isActive: true, deletedAt: null });
    expect(JSON.stringify(where.OR)).toContain('parentSku');
    expect(JSON.stringify(where.OR)).toContain(PARENT);
  });

  it('(b2) tie-breakers: at equal score, skuCount DESC then label ASC', async () => {
    // All materials score 50 (Inox/Chêne/Bois) so the trend score does NOT
    // separate them -> exercises the secondary (skuCount) and tertiary (label)
    // sort keys. Canonical Blanc (score 100) stays on top, out of the tie.
    // Labels: Bois < Chêne < Inox.
    const { db } = makeDb([
      row(PARENT, 'Blanc Haute brillance', 50, true),
      row('CASTORAMA-I1', 'Inox', 60),
      row('CASTORAMA-I2', 'Inox', 60),
      row('CASTORAMA-I3', 'Inox', 60), // inox = 3 SKU
      row('CASTORAMA-C1', 'Chêne', 60), // chene = 1 SKU
      row('CASTORAMA-B1', 'Bois', 60), // bois = 1 SKU
    ]);
    const opts = await new VariantResolverService(db).resolveColors(PARENT);
    // inox (3 SKU) before the 1-SKU groups -> locks skuCount DESC
    // (without it, label ASC would order [blanc, bois, chene, inox]).
    // bois before chene at equal score+count -> locks label ASC.
    expect(opts.map((o) => o.key)).toEqual(['blanc', 'inox', 'bois', 'chene']);
  });
});

describe('VariantResolverService.resolveByColor', () => {
  it('(g) resolves a color to its representative SKU + price', async () => {
    const { db } = makeDb(VICCO);
    const r = await new VariantResolverService(db).resolveByColor(PARENT, 'noir');
    expect(r).toEqual({ sku: 'CASTORAMA-4066731354139', price: 45.9 });
  });

  it('(g) returns null for a color the gamme does not offer', async () => {
    const { db } = makeDb(VICCO);
    expect(await new VariantResolverService(db).resolveByColor(PARENT, 'rose')).toBeNull();
  });
});
