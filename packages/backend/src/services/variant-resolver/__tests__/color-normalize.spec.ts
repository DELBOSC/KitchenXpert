/**
 * Unit tests for color-normalize.ts (CLAUDE.md §15.8.4 P7).
 *
 * Fixtures are REAL Castorama color values (see .scrape-output/colors185.json),
 * not invented. Measured coverage on the 185 distinct values / 6350 SKU = 99.6%
 * (the ~0.4% remainder is data noise: kWh/cm/"Non applicable", asserted unknown).
 */
import { normalizeColor } from '../color-normalize';

describe('normalizeColor', () => {
  describe('simple colors (dict-known, trend score from extractColor)', () => {
    it('"Blanc Haute brillance" -> blanc/color, score 100 (tier1)', () => {
      expect(normalizeColor('Blanc Haute brillance')).toEqual({ key: 'blanc', label: 'Blanc', kind: 'color', score: 100 });
    });
    it('"Noir mat" -> noir/color (finish "mat" dropped)', () => {
      const r = normalizeColor('Noir mat');
      expect(r.key).toBe('noir');
      expect(r.kind).toBe('color');
    });
    it('"GrisBeige" (camelCase) -> gris/color', () => {
      expect(normalizeColor('GrisBeige').key).toBe('gris');
    });
  });

  describe('noisy compounds (stopwords stripped)', () => {
    it('"Effet chêne" -> chene/material', () => {
      expect(normalizeColor('Effet chêne')).toMatchObject({ key: 'chene', kind: 'material' });
    });
    it('"Panneau en chêne" -> chene/material', () => {
      expect(normalizeColor('Panneau en chêne')).toMatchObject({ key: 'chene', kind: 'material' });
    });
    it('"Chêne de force doré" -> chene/material (first family token wins)', () => {
      expect(normalizeColor('Chêne de force doré')).toMatchObject({ key: 'chene', kind: 'material' });
    });
  });

  describe('high-volume materials', () => {
    it('"Inox" -> inox/material', () => {
      expect(normalizeColor('Inox')).toMatchObject({ key: 'inox', kind: 'material' });
    });
    it('"Béton" -> beton/material', () => {
      expect(normalizeColor('Béton')).toMatchObject({ key: 'beton', kind: 'material' });
    });
    it('"Béton noir" -> beton/material (material token before "noir")', () => {
      expect(normalizeColor('Béton noir').key).toBe('beton');
    });
  });

  describe('colors missing from the trend dict -> neutral score 50', () => {
    it('"Bleu" -> bleu/color, score 50 (plain "bleu" not in COLOR_TIERS)', () => {
      expect(normalizeColor('Bleu')).toEqual({ key: 'bleu', label: 'Bleu', kind: 'color', score: 50 });
    });
    it('"Doré" -> dore/color, score 50', () => {
      expect(normalizeColor('Doré')).toEqual({ key: 'dore', label: 'Doré', kind: 'color', score: 50 });
    });
    it('"Taupe" -> taupe/color, score 50', () => {
      expect(normalizeColor('Taupe')).toMatchObject({ key: 'taupe', kind: 'color', score: 50 });
    });
    it('"Vert sauge" -> vert/color, score 85 (dict "vert sauge" tier2 via extractColor)', () => {
      expect(normalizeColor('Vert sauge')).toEqual({ key: 'vert', label: 'Vert', kind: 'color', score: 85 });
    });
  });

  describe('materials are always neutral (score 50) regardless of embedded colors', () => {
    it('"Chêne" -> score 50', () => {
      expect(normalizeColor('Chêne').score).toBe(50);
    });
    it('"Marbre blanc" -> marbre/material, score 50 (not blanc/100)', () => {
      expect(normalizeColor('Marbre blanc')).toMatchObject({ key: 'marbre', kind: 'material', score: 50 });
    });
  });

  describe('data noise -> unknown (excluded from the offer)', () => {
    it.each(['0,74 kWh', '24 h', '15 cm', 'Non applicable', 'Transparent', 'Multicolore'])(
      '"%s" -> unknown',
      (raw) => {
        expect(normalizeColor(raw)).toEqual({ key: 'unknown', label: '', kind: 'unknown', score: -1 });
      },
    );
  });

  describe('null / empty -> unknown', () => {
    it.each([null, undefined, '', '   '])('%p -> unknown', (raw) => {
      expect(normalizeColor(raw as string | null)).toMatchObject({ key: 'unknown', kind: 'unknown', score: -1 });
    });
  });

  describe('scoring contract', () => {
    it('a dict color keeps its extractColor score; a non-dict color/material is neutral 50', () => {
      expect(normalizeColor('Blanc').score).toBe(100); // dict tier1
      expect(normalizeColor('Anthracite').score).toBe(85); // dict tier2
      expect(normalizeColor('Chêne').score).toBe(50); // material, neutral
      expect(normalizeColor('Camel').score).toBe(50); // color, not in dict
    });
  });

  describe('direct locks for common base colors', () => {
    it('"Rouge" -> rouge/color, score 10 (dict tier6)', () => {
      expect(normalizeColor('Rouge')).toEqual({ key: 'rouge', label: 'Rouge', kind: 'color', score: 10 });
    });
    it('"Gris clair" -> gris/color, score 30 (dict tier5; "clair" dropped)', () => {
      expect(normalizeColor('Gris clair')).toEqual({ key: 'gris', label: 'Gris', kind: 'color', score: 30 });
    });
  });
});
