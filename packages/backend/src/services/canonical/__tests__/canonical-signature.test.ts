/**
 * Unit tests for canonical-signature.ts (CLAUDE.md §15.8.4 P5).
 *
 * Fixtures are REAL Castorama catalogue rows sourced live (read-only) on
 * 21/06/2026, not invented data:
 *   - Vicco "Elément haut de cuisine ... Haute brillance 60cm" — a genuine
 *     15-member cluster (cabinet, dims NULL, colours Blanc/Noir/Anthracite),
 *     the largest real cluster in the catalogue. Drives the price-tier test;
 *     its canonical SKUs match the POC oracle exactly.
 *   - A real 45cm Vicco facade name, to prove size anti-fusion vs the 60cm gamme.
 *
 * The module is pure (no DB) -> fixtures are passed as plain objects.
 */
import {
  baseNorm,
  extractColor,
  gammeName,
  extractSizeKey,
  buildSignature,
  clusterAndSelect,
  type CanonicalRow,
} from '../canonical-signature';

// --- Real Vicco rows (sku + colour word + price are verbatim from the DB). ---
function vicco(sku: string, colourWord: string, price: number): CanonicalRow {
  return {
    sku,
    name: `Vicco Elément haut de cuisine ${colourWord} Haute brillance 60cm`,
    brand: 'Castorama',
    realBrand: 'Vicco',
    specColor: `${colourWord} Haute brillance`,
    productType: 'cabinet',
    width: null,
    height: null,
    depth: null,
    price,
  };
}

const VICCO_15: CanonicalRow[] = [
  vicco('CASTORAMA-4251421944909', 'Blanc', 122.9),
  vicco('CASTORAMA-4251421927513', 'Blanc', 102.9),
  vicco('CASTORAMA-4066731344253', 'Noir', 113.9),
  vicco('CASTORAMA-4066731035663', 'Blanc', 107.9),
  vicco('CASTORAMA-4066731035823', 'Anthracite', 106.9),
  vicco('CASTORAMA-4066731344659', 'Noir', 108.9),
  vicco('CASTORAMA-4066731491124', 'Anthracite', 109.9),
  vicco('CASTORAMA-4251421927506', 'Anthracite', 102.9),
  vicco('CASTORAMA-4251421956131', 'Blanc', 103.9),
  vicco('CASTORAMA-4066731146123', 'Anthracite', 123.9),
  vicco('CASTORAMA-4066731161041', 'Blanc', 123.9),
  vicco('CASTORAMA-4066731343713', 'Noir', 119.9),
  vicco('CASTORAMA-4066731518326', 'Anthracite', 126.9),
  vicco('CASTORAMA-4251421944916', 'Anthracite', 122.9),
  vicco('CASTORAMA-4251421957633', 'Blanc', 126.9),
];

describe('baseNorm / deaccent', () => {
  it('strips accents and lowercases (real Castorama tokens)', () => {
    expect(baseNorm('Élément')).toBe('element');
    expect(baseNorm('Chêne Artisan')).toBe('chene artisan');
    expect(baseNorm('Crème')).toBe('creme');
  });
  it('handles null/undefined safely', () => {
    expect(baseNorm(null)).toBe('');
    expect(baseNorm(undefined)).toBe('');
  });
});

describe('extractColor', () => {
  it('matches a tier-1 colour with score 100', () => {
    expect(extractColor('vicco element haut blanc haute brillance')).toEqual({ color: 'blanc', tier: 1, score: 100 });
  });
  it('matches a tier-3 colour (noir) with score 70', () => {
    expect(extractColor('vicco element haut noir haute brillance')).toEqual({ color: 'noir', tier: 3, score: 70 });
  });
  it('matches a tier-6 colour (rouge) with score 10', () => {
    expect(extractColor('porte rouge mat')?.score).toBe(10);
  });
  it('is word-bounded: does NOT match a colour embedded inside a word', () => {
    // "blancheur" contains "blanc" but the trailing "h" breaks the boundary.
    expect(extractColor('toile blancheur uniforme')).toBeNull();
  });
  it('returns null when no dictionary colour is present', () => {
    expect(extractColor('vicco element haut cuisine')).toBeNull();
  });
});

describe('gammeName', () => {
  it('strips colour + dimensions + stopwords', () => {
    const norm = baseNorm('Vicco Elément haut de cuisine Blanc Haute brillance 60cm');
    expect(gammeName(norm, 'blanc')).toBe('vicco element haut cuisine haute brillance');
  });
  it('two rows of the same gamme, different colours -> SAME gamme', () => {
    const blanc = baseNorm('Vicco Elément haut de cuisine Blanc Haute brillance 60cm');
    const noir = baseNorm('Vicco Elément haut de cuisine Noir Haute brillance 60cm');
    expect(gammeName(blanc, 'blanc')).toBe(gammeName(noir, 'noir'));
  });
});

describe('extractSizeKey (anti-fusion)', () => {
  it('"60cm" and "45cm" produce DIFFERENT size keys', () => {
    const k60 = extractSizeKey(baseNorm('Vicco Elément haut de cuisine Blanc Haute brillance 60cm'));
    const k45 = extractSizeKey(baseNorm('Vicco Façade Chêne Artisan 45cm sans PT'));
    expect(k60).toBe('60');
    expect(k45).toBe('45');
    expect(k60).not.toBe(k45);
  });
  it('rejects numbers NOT anchored by cm/mm or an L/H/P label', () => {
    // "4 foyers" / "6000w" must not be read as sizes.
    expect(extractSizeKey(baseNorm('Plaque 4 foyers 6000W'))).toBe('');
  });
  it('converts mm to cm', () => {
    expect(extractSizeKey('porte 600mm')).toBe('60');
  });
});

describe('buildSignature', () => {
  it('two variants of the same gamme/size, different colours -> SAME signature', () => {
    const blanc = VICCO_15.find((r) => r.specColor?.startsWith('Blanc'))!;
    const noir = VICCO_15.find((r) => r.specColor?.startsWith('Noir'))!;
    expect(buildSignature(blanc)).toBe(buildSignature(noir));
    expect(buildSignature(blanc)).toBe('cabinet|vicco|vicco element haut cuisine haute brillance|n:60');
  });
  it('different size -> different signature (anti-fusion at signature level)', () => {
    const sig60 = buildSignature(VICCO_15[0]!);
    const facade45: CanonicalRow = {
      sku: 'CASTORAMA-4066731446032',
      name: 'Vicco Façade Chêne Artisan 45cm sans PT',
      brand: 'Castorama', realBrand: 'Vicco', specColor: 'Chêne Artisan',
      productType: 'facade', width: null, height: null, depth: null, price: 36.9,
    };
    expect(buildSignature(facade45)).not.toBe(sig60);
  });
});

describe('clusterAndSelect', () => {
  it('(a) simple cluster (<=5): one canonical = best colour score, lowest price tie-break', () => {
    // 3 real Vicco rows, different colours -> single cluster, single canonical.
    const subset = [
      VICCO_15.find((r) => r.sku === 'CASTORAMA-4251421927513')!, // Blanc 102.9 (score 100)
      VICCO_15.find((r) => r.sku === 'CASTORAMA-4066731344253')!, // Noir 113.9 (score 70)
      VICCO_15.find((r) => r.sku === 'CASTORAMA-4066731035823')!, // Anthracite 106.9 (score 85)
    ];
    const { canonicals, variants } = clusterAndSelect(subset, false);
    expect(canonicals).toHaveLength(1);
    expect(canonicals[0]!.sku).toBe('CASTORAMA-4251421927513'); // Blanc wins on score
    expect(canonicals[0]!.colorScore).toBe(100);
    // (b) each variant points at the canonical
    expect(variants).toHaveLength(2);
    expect(variants.every((v) => v.parentSku === 'CASTORAMA-4251421927513')).toBe(true);
    expect(variants.map((v) => v.sku).sort()).toEqual(
      ['CASTORAMA-4066731035823', 'CASTORAMA-4066731344253'].sort(),
    );
  });

  it('(c) cluster >5 with usePriceTiers -> one canonical per price tier (BAS/MOYEN/HAUT)', () => {
    const { canonicals, variants } = clusterAndSelect(VICCO_15, true);
    // 15 rows -> 3 canonicals (one per tier) + 12 variants.
    expect(canonicals).toHaveLength(3);
    expect(variants).toHaveLength(12);
    expect(canonicals.map((c) => c.priceTier).sort()).toEqual(['BAS', 'HAUT', 'MOYEN']);

    const byTier = Object.fromEntries(canonicals.map((c) => [c.priceTier, c]));
    // Matches the POC oracle exactly.
    expect(byTier.BAS!.sku).toBe('CASTORAMA-4251421927513'); // Blanc 102.9
    expect(byTier.MOYEN!.sku).toBe('CASTORAMA-4066731344253'); // Noir 113.9
    expect(byTier.HAUT!.sku).toBe('CASTORAMA-4251421944909'); // Blanc 122.9

    // Graph integrity: every variant points at one of the 3 canonicals, none self.
    const canonSet = new Set(canonicals.map((c) => c.sku));
    expect(variants.every((v) => canonSet.has(v.parentSku))).toBe(true);
    expect(variants.every((v) => v.sku !== v.parentSku)).toBe(true);
    // Conservation: 3 + 12 == 15.
    expect(canonicals.length + variants.length).toBe(VICCO_15.length);
  });

  it('without usePriceTiers, a >5 cluster collapses to a single canonical', () => {
    const { canonicals, variants } = clusterAndSelect(VICCO_15, false);
    expect(canonicals).toHaveLength(1);
    expect(variants).toHaveLength(14);
    expect(canonicals[0]!.colorScore).toBe(100); // a Blanc wins
  });
});
