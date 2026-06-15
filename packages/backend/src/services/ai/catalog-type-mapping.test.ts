import { buildTypeWhereOr, TYPE_TO_SPEC_FILTERS } from './catalog-type-mapping';

/** Helper : extrait les valeurs spec (applianceGroup/productType) d'un OR. */
function specValues(or: Record<string, unknown>[]): { groups: string[]; types: string[] } {
  const groups: string[] = [];
  const types: string[] = [];
  for (const cond of or) {
    const spec = cond.specifications as { path?: string[]; equals?: string } | undefined;
    if (spec?.path?.[0] === 'applianceGroup' && spec.equals) groups.push(spec.equals);
    if (spec?.path?.[0] === 'productType' && spec.equals) types.push(spec.equals);
  }
  return { groups, types };
}

describe('buildTypeWhereOr', () => {
  it('inclut TOUJOURS le filtre legacy category.name (1er élément)', () => {
    const or = buildTypeWhereOr('dishwasher');
    expect(or[0]).toEqual({ category: { name: { contains: 'dishwasher', mode: 'insensitive' } } });
  });

  it('appliance EPREL -> applianceGroup', () => {
    expect(specValues(buildTypeWhereOr('dishwasher')).groups).toEqual(['dishwashers2019']);
    expect(specValues(buildTypeWhereOr('oven')).groups).toEqual(['ovens']);
    expect(specValues(buildTypeWhereOr('hood')).groups).toEqual(['rangehoods']);
    expect(specValues(buildTypeWhereOr('refrigerator')).groups).toEqual(['refrigeratingappliances2019']);
  });

  it('meuble -> productType', () => {
    expect(specValues(buildTypeWhereOr('cabinet')).types).toEqual(['cabinet']);
    expect(specValues(buildTypeWhereOr('countertop')).types).toEqual(['worktop']);
    expect(specValues(buildTypeWhereOr('sink')).types).toEqual(['sink']);
    expect(specValues(buildTypeWhereOr('faucet')).types).toEqual(['tap']);
  });

  it('accessory et facade sont DISTINCTS', () => {
    expect(specValues(buildTypeWhereOr('accessory')).types).toEqual(['accessory']);
    expect(specValues(buildTypeWhereOr('facade')).types).toEqual(['facade']);
    expect(specValues(buildTypeWhereOr('façade')).types).toEqual(['facade']);
  });

  it('synonymes français -> même filtre', () => {
    expect(specValues(buildTypeWhereOr('lave-vaisselle')).groups).toEqual(['dishwashers2019']);
    expect(specValues(buildTypeWhereOr('frigo')).groups).toEqual(['refrigeratingappliances2019']);
    expect(specValues(buildTypeWhereOr('four')).groups).toEqual(['ovens']);
    expect(specValues(buildTypeWhereOr('hotte')).groups).toEqual(['rangehoods']);
    expect(specValues(buildTypeWhereOr('caisson')).types).toEqual(['cabinet']);
    expect(specValues(buildTypeWhereOr('plan de travail')).types).toEqual(['worktop']);
    expect(specValues(buildTypeWhereOr('mitigeur')).types).toEqual(['tap']);
    expect(specValues(buildTypeWhereOr('évier')).types).toEqual(['sink']);
  });

  it('normalise (lowercase + trim) avant lookup', () => {
    expect(specValues(buildTypeWhereOr('  Four ')).groups).toEqual(['ovens']);
    expect(specValues(buildTypeWhereOr('CABINET')).types).toEqual(['cabinet']);
  });

  it('type INCONNU -> legacy SEUL (pas d\'OR vide, forward-compat)', () => {
    const or = buildTypeWhereOr('zzz-unknown');
    expect(or).toHaveLength(1);
    expect(or[0]).toEqual({ category: { name: { contains: 'zzz-unknown', mode: 'insensitive' } } });
  });

  it('cooktop/microwave NON mappés (retirés volontairement)', () => {
    expect(TYPE_TO_SPEC_FILTERS.cooktop).toBeUndefined();
    expect(TYPE_TO_SPEC_FILTERS.microwave).toBeUndefined();
    expect(buildTypeWhereOr('cooktop')).toHaveLength(1); // legacy seul
  });
});
