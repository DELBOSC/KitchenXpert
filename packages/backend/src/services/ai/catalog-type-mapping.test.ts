import { buildTypeWhereOr, TYPE_TO_CATEGORY_SLUGS } from './catalog-type-mapping';

/** Slugs d'un OR `category.slug IN [...]` (ou [] si fallback legacy name). */
function slugsOf(or: Record<string, unknown>[]): string[] {
  const cat = or[0]?.category as { slug?: { in?: string[] } } | undefined;
  return cat?.slug?.in ?? [];
}
function isLegacyNameFallback(or: Record<string, unknown>[]): boolean {
  const cat = or[0]?.category as { name?: { contains?: string } } | undefined;
  return or.length === 1 && typeof cat?.name?.contains === 'string';
}

describe('buildTypeWhereOr (Phase 2.4 — filtre par category.slug)', () => {
  it('électroménager -> slugs électroménager', () => {
    expect(slugsOf(buildTypeWhereOr('dishwasher'))).toEqual(['electromenager-lavage']);
    expect(slugsOf(buildTypeWhereOr('oven'))).toEqual(['electromenager-cuisson']);
    expect(slugsOf(buildTypeWhereOr('hood'))).toEqual(['electromenager-cuisson']);
    expect(slugsOf(buildTypeWhereOr('refrigerator'))).toEqual(['electromenager-froid']);
    expect(slugsOf(buildTypeWhereOr('appliance')).sort()).toEqual([
      'electromenager-cuisson', 'electromenager-froid', 'electromenager-lavage',
    ]);
  });

  it('cabinet (coarse) -> bas/hauts/colonnes ; sous-types -> 1 slug', () => {
    expect(slugsOf(buildTypeWhereOr('cabinet')).sort()).toEqual(['colonnes', 'meubles-bas', 'meubles-hauts']);
    expect(slugsOf(buildTypeWhereOr('base_cabinet'))).toEqual(['meubles-bas']);
    expect(slugsOf(buildTypeWhereOr('wall_cabinet'))).toEqual(['meubles-hauts']);
    expect(slugsOf(buildTypeWhereOr('tall_cabinet'))).toEqual(['colonnes']);
  });

  it('worktop / sink / tap / facade -> bon slug', () => {
    expect(slugsOf(buildTypeWhereOr('countertop'))).toEqual(['plans-de-travail']);
    expect(slugsOf(buildTypeWhereOr('sink'))).toEqual(['eviers-robinetterie']);
    expect(slugsOf(buildTypeWhereOr('faucet'))).toEqual(['eviers-robinetterie']);
    expect(slugsOf(buildTypeWhereOr('facade'))).toEqual(['facades']);
    expect(slugsOf(buildTypeWhereOr('façade'))).toEqual(['facades']);
  });

  it('synonymes français', () => {
    expect(slugsOf(buildTypeWhereOr('lave-vaisselle'))).toEqual(['electromenager-lavage']);
    expect(slugsOf(buildTypeWhereOr('frigo'))).toEqual(['electromenager-froid']);
    expect(slugsOf(buildTypeWhereOr('four'))).toEqual(['electromenager-cuisson']);
    expect(slugsOf(buildTypeWhereOr('caisson')).sort()).toEqual(['colonnes', 'meubles-bas', 'meubles-hauts']);
    expect(slugsOf(buildTypeWhereOr('plan de travail'))).toEqual(['plans-de-travail']);
    expect(slugsOf(buildTypeWhereOr('mitigeur'))).toEqual(['eviers-robinetterie']);
  });

  it('normalise lowercase + trim', () => {
    expect(slugsOf(buildTypeWhereOr('  Four '))).toEqual(['electromenager-cuisson']);
    expect(slugsOf(buildTypeWhereOr('CABINET')).length).toBe(3);
  });

  it('type INCONNU -> fallback legacy category.name (forward-compat, jamais vide)', () => {
    const or = buildTypeWhereOr('zzz-unknown');
    expect(isLegacyNameFallback(or)).toBe(true);
    expect(or[0]).toEqual({ category: { name: { contains: 'zzz-unknown', mode: 'insensitive' } } });
  });

  it('cooktop/microwave non mappés -> fallback legacy', () => {
    expect(TYPE_TO_CATEGORY_SLUGS.cooktop).toBeUndefined();
    expect(isLegacyNameFallback(buildTypeWhereOr('cooktop'))).toBe(true);
  });

  it('plus de fallback specifications (Phase 1 retiré)', () => {
    const or = buildTypeWhereOr('dishwasher');
    expect(or.some((c) => 'specifications' in c)).toBe(false);
  });
});
