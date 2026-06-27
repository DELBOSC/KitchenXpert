import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { describe, it, expect, vi } from 'vitest';

import {
  CastoramaStrategy,
  CASTORAMA_KITCHEN_CATEGORIES,
  parseCastoramaDims,
  type HtmlFetcher,
} from '@kitchenxpert/common';

const here = dirname(fileURLToPath(import.meta.url));
const pdpHtml = readFileSync(join(here, '__fixtures__/castorama-pdp.html'), 'utf8');
const pdpEnrichedHtml = readFileSync(
  join(here, '__fixtures__/castorama-pdp-enriched.html'),
  'utf8'
);
const pdpApplianceHtml = readFileSync(
  join(here, '__fixtures__/castorama-pdp-appliance.html'),
  'utf8'
);
const sitemapXml = readFileSync(join(here, '__fixtures__/castorama-sitemap.xml'), 'utf8');
const categoryHtml = readFileSync(join(here, '__fixtures__/castorama-category.html'), 'utf8');

/** Mock HtmlFetcher : sitemap pour l'URL sitemap, sinon la PDP fixture. */
function mockHtml(pdp = pdpHtml): HtmlFetcher {
  return {
    fetchText: vi.fn(async (url: string) => (url.includes('sitemap') ? sitemapXml : pdp)),
  };
}

/** Mock URL-aware : page catégorie / PDP / sitemap. */
function mockCategory(): HtmlFetcher {
  return {
    fetchText: vi.fn(async (url: string) => {
      if (url.includes('sitemap')) return sitemapXml;
      if (url.includes('_CAFR.prd')) return pdpHtml;
      return categoryHtml; // page catégorie (cat_id_*.cat?page=N)
    }),
  };
}

describe('parseCastoramaDims (cotes labellisées dans le nom)', () => {
  it('3 cotes L/H/P -> mm + confidence 1', () => {
    const d = parseCastoramaDims('Caisson GoodHome L. 60 x H. 85 x P. 56 cm');
    expect([d.widthMm, d.heightMm, d.depthMm]).toEqual([600, 850, 560]);
    expect(d.confidence).toBe(1);
  });
  it('1 cote -> confidence 0.3', () => {
    const d = parseCastoramaDims('Structure pour colonne blanc L. 200 cm');
    expect(d.widthMm).toBe(2000);
    expect(d.heightMm).toBeNull();
    expect(d.confidence).toBe(0.3);
  });
  it('détecte l\'unité par cote : "mm" reste mm, "cm"/absent -> ×10', () => {
    expect(parseCastoramaDims('Pied de caisson H. 100 mm').heightMm).toBe(100); // mm, pas 1000
    expect(parseCastoramaDims('Pied de caisson Hauteur 100 mm').heightMm).toBe(100);
    expect(parseCastoramaDims('Plan L. 246 cm').widthMm).toBe(2460); // cm -> mm
    expect(parseCastoramaDims('Structure H.201 L.60').heightMm).toBe(2010); // absent -> cm
  });
  it('aucune cote -> tout null, confidence 0', () => {
    const d = parseCastoramaDims('Peinture murale blanche mate');
    expect([d.widthMm, d.heightMm, d.depthMm]).toEqual([null, null, null]);
    expect(d.confidence).toBe(0);
  });
  it("ne matche pas un L/H/P à l'intérieur d'un mot (GoodHome, pour)", () => {
    const d = parseCastoramaDims('Meuble GoodHome pour cuisine');
    expect(d.confidence).toBe(0);
  });
  it('rawMeasureText conserve le nom complet', () => {
    expect(parseCastoramaDims('Plan L. 246 cm').rawMeasureText).toBe('Plan L. 246 cm');
  });
});

describe('CastoramaStrategy', () => {
  it('brandId=castorama + sourceLevel N3', () => {
    const s = new CastoramaStrategy(mockHtml());
    expect(s.brandId).toBe('castorama');
    expect(s.sourceLevel).toBe(3);
  });

  it('mappe une PDP : nom + prix + EAN + cotes (depuis le nom) + type', async () => {
    const s = new CastoramaStrategy(mockHtml());
    const r = await s.fetchProductByUrl(
      'https://www.castorama.fr/caisson-de-cuisine-goodhome/5059340242217_CAFR.prd'
    );
    expect(r.success).toBe(true);
    const p = r.product!;
    expect(p.sku).toBe('5059340242217'); // gtin13 (EAN)
    expect(p.ean).toBe('5059340242217');
    expect(p.brand).toBe('Castorama');
    expect(p.type).toBe('cabinet');
    expect(p.priceEurCents).toBe(7950); // 79.5 € -> cents
    expect(p.currency).toBe('EUR');
    expect([p.widthMm, p.heightMm, p.depthMm]).toEqual([600, 850, 560]); // L60 H85 P56 cm
    expect(p.dimensionConfidence).toBe(1);
    expect(p.sourceLevel).toBe(3);
    expect(p.specifications?.gtin13).toBe('5059340242217');
  });

  it('§15.8.3 : la table specifications enrichit (3 cotes table > 1 cote nom), conf 1.0', async () => {
    const s = new CastoramaStrategy(mockHtml(pdpEnrichedHtml));
    const r = await s.fetchProductByUrl(
      'https://www.castorama.fr/caisson-bas-goodhome/5059340999999_CAFR.prd'
    );
    expect(r.success).toBe(true);
    const p = r.product!;
    // Le nom ne porte que "L. 60 cm" (1 cote, conf 0.3). La table donne 3 cotes.
    expect([p.widthMm, p.heightMm, p.depthMm]).toEqual([600, 850, 560]);
    expect(p.dimensionConfidence).toBe(1.0);
    // brand top-level reste 'Castorama' (namespace SKU stable) ; vraie marque en specs.
    expect(p.brand).toBe('Castorama');
    expect(p.specifications?.brand).toBe('GoodHome');
    expect(p.specifications?.material).toBe('Panneau de particules melamine');
    expect(p.specifications?.color).toBe('Blanc');
    expect(p.specifications?.finish).toBe('Mat');
    // rawMeasureText = paires table serialisees (pas le nom).
    expect(String(p.specifications?.rawMeasureText)).toContain('Hauteur (cm):85cm');
  });

  it('§15.8.3 : appliance (plaque) -> 3 cotes table dont hauteur 6.2cm, conf 1.0', async () => {
    const s = new CastoramaStrategy(mockHtml(pdpApplianceHtml));
    const r = await s.fetchProductByUrl(
      'https://www.castorama.fr/plaque-induction-ciarra/5056668703949_CAFR.prd'
    );
    expect(r.success).toBe(true);
    const p = r.product!;
    expect(p.type).toBe('appliance');
    // Nom = L59xP52 (2 cotes) ; table = H6.2 L59 P52 (3 cotes, hauteur acceptee).
    expect([p.widthMm, p.heightMm, p.depthMm]).toEqual([590, 62, 520]);
    expect(p.dimensionConfidence).toBe(1.0);
    expect(p.brand).toBe('Castorama');
    expect(p.specifications?.brand).toBe('Ciarra');
    expect(p.specifications?.specTableFlags).toBeUndefined(); // aucun out_of_bounds
  });

  it('skip-not-crash si pas de Product JSON-LD', async () => {
    const s = new CastoramaStrategy(mockHtml('<html><body>no json-ld</body></html>'));
    const r = await s.fetchProductByUrl('https://www.castorama.fr/x/1_CAFR.prd');
    expect(r.success).toBe(false);
    expect(r.errors.join(' ')).toMatch(/Product JSON-LD/i);
  });

  it('fetchProductsByCategory filtre le sitemap par mot-clé', async () => {
    const fetcher = mockHtml();
    const s = new CastoramaStrategy(fetcher, { maxProducts: 10 });
    const r = await s.fetchProductsByCategory('caisson');
    // 2 URLs "caisson" dans le sitemap fixture (pas le plan-de-travail ni la peinture)
    expect(r).toHaveLength(2);
    // 1 fetch sitemap + 2 fetch PDP = 3 appels
    expect(fetcher.fetchText as ReturnType<typeof vi.fn>).toHaveBeenCalledTimes(3);
  });

  it('respecte maxProducts (plafond de PDP fetchées)', async () => {
    const fetcher = mockHtml();
    const s = new CastoramaStrategy(fetcher, { maxProducts: 1 });
    const r = await s.fetchProductsByCategory('caisson');
    expect(r).toHaveLength(1);
  });

  it('MODE CATÉGORIE : pagine la page cat_id, déduplique, impose type+categorySlug', async () => {
    const s = new CastoramaStrategy(mockCategory(), { maxProducts: 10 });
    const r = await s.fetchProductsByCategory('plaque');
    expect(r).toHaveLength(2); // 2 PDP distinctes (le doublon est dédupliqué)
    expect(r.every((x) => x.success)).toBe(true);
    const p = r[0].product!;
    // contexte catégorie autoritaire (cat_id_832 = plaque) :
    expect(p.type).toBe('appliance');
    expect(p.specifications?.categorySlug).toBe('electromenager-cuisson');
    expect(p.brand).toBe('Castorama');
  });

  it('mode catégorie respecte maxProducts', async () => {
    const s = new CastoramaStrategy(mockCategory(), { maxProducts: 1 });
    expect(await s.fetchProductsByCategory('plaque')).toHaveLength(1);
  });

  it('CASTORAMA_KITCHEN_CATEGORIES expose les catégories cuisine + slugs valides', () => {
    expect(CASTORAMA_KITCHEN_CATEGORIES.plaque?.slug).toBe('electromenager-cuisson');
    expect(CASTORAMA_KITCHEN_CATEGORIES.evier?.type).toBe('sink');
    expect(CASTORAMA_KITCHEN_CATEGORIES.robinet?.type).toBe('tap');
    expect(CASTORAMA_KITCHEN_CATEGORIES['lave-vaisselle']?.slug).toBe('electromenager-lavage');
    expect(Object.keys(CASTORAMA_KITCHEN_CATEGORIES)).toContain('meuble-bas');
  });
});
