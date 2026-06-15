import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { describe, it, expect, vi } from 'vitest';

import { EprelApplianceStrategy, EPREL_KITCHEN_GROUPS, type JsonFetcher } from './eprel-strategy';

const here = dirname(fileURLToPath(import.meta.url));
const dishwashers = JSON.parse(readFileSync(join(here, '__fixtures__/eprel-sample.json'), 'utf8'));

/** Mock JsonFetcher renvoyant `response` pour toute URL. */
function mockFetcher(response: unknown): JsonFetcher {
  return { fetchJson: vi.fn().mockResolvedValue(response) };
}

/** Mock JsonFetcher paginé : honore `_page`/`_limit`, total = `size`. */
function paginatedFetcher(total: number): JsonFetcher {
  return {
    fetchJson: vi.fn(async (url: string) => {
      const u = new URL(url);
      const page = Number(u.searchParams.get('_page'));
      const limit = Number(u.searchParams.get('_limit'));
      const start = (page - 1) * limit;
      const hits = [];
      for (let i = start; i < Math.min(start + limit, total); i++) {
        hits.push({
          eprelRegistrationNumber: i,
          modelIdentifier: `M${i}`,
          supplierOrTrademark: 'Brand',
          dimensionWidth: 60,
          dimensionHeight: 85,
          dimensionDepth: 60,
        });
      }
      return { size: total, hits };
    }),
  };
}

describe('EprelApplianceStrategy', () => {
  it('exposes brandId=eprel + sourceLevel N1', () => {
    const s = new EprelApplianceStrategy(mockFetcher(dishwashers));
    expect(s.brandId).toBe('eprel');
    expect(s.sourceLevel).toBe(1);
  });

  it('appelle l API publique avec le header Origin', async () => {
    const fetcher = mockFetcher(dishwashers);
    const s = new EprelApplianceStrategy(fetcher);
    await s.fetchProductsByCategory('dishwashers2019');
    const [url, opts] = (fetcher.fetchJson as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('/api/products/dishwashers2019');
    expect(opts.headers.Origin).toBe('https://eprel.ec.europa.eu');
  });

  it('mappe un lave-vaisselle complet (cotes cm -> mm, marque, modèle, énergie)', async () => {
    const s = new EprelApplianceStrategy(mockFetcher(dishwashers));
    const [first] = await s.fetchProductsByCategory('dishwashers2019');
    expect(first.success).toBe(true);
    const p = first.product!;
    expect(p.sku).toBe('DFN38532X-7609003477'); // modelIdentifier complet normalisé
    expect(p.brand).toBe('BEKO');
    expect(p.type).toBe('appliance');
    // dishwashers2019 = cm connu -> ×10
    expect(p.widthMm).toBe(600);
    expect(p.heightMm).toBe(850);
    expect(p.depthMm).toBe(600);
    expect(p.dimensionConfidence).toBe(1);
    expect(p.priceEurCents).toBeNull(); // EPREL = pas de prix
    expect(p.sourceLevel).toBe(1);
    expect(p.specifications?.energyClass).toBe('B');
    expect(p.specifications?.applianceGroup).toBe('dishwashers2019');
    expect(p.specifications?.eprelRegistrationNumber).toBe(123456);
    expect(p.specifications?.rawMeasureText).toBe('60×85×60 cm');
    expect(p.specifications?.dimensionUnitAssumed).toBe(false);
  });

  it('confidence 0.5 quand 2 cotes seulement', async () => {
    const s = new EprelApplianceStrategy(mockFetcher(dishwashers));
    const r = await s.fetchProductsByCategory('dishwashers2019');
    const bosch = r.find((x) => x.product?.sku === 'SMS4HVI01E')!;
    expect(bosch.product!.widthMm).toBe(600);
    expect(bosch.product!.heightMm).toBe(850);
    expect(bosch.product!.depthMm).toBeNull();
    expect(bosch.product!.dimensionConfidence).toBe(0.5);
  });

  it('skip-not-crash : un hit sans modelIdentifier échoue la validation (sku vide)', async () => {
    const s = new EprelApplianceStrategy(mockFetcher(dishwashers));
    const r = await s.fetchProductsByCategory('dishwashers2019');
    const nomodel = r.find((x) => !x.success)!;
    expect(nomodel.success).toBe(false);
    expect(nomodel.errors.join(' ')).toMatch(/sku/i);
  });

  it('groupe en mm (frigos) : passe les cotes telles quelles', async () => {
    const fridge = {
      size: 54446,
      hits: [{ eprelRegistrationNumber: 9, modelIdentifier: 'KIL82ADE0', supplierOrTrademark: 'Bosch',
        energyClass: 'E', dimensionWidth: 558, dimensionHeight: 1772, dimensionDepth: 545 }],
    };
    const s = new EprelApplianceStrategy(mockFetcher(fridge));
    const [p] = await s.fetchProductsByCategory('refrigeratingappliances2019');
    expect(p.product!.widthMm).toBe(558);
    expect(p.product!.heightMm).toBe(1772);
    expect(p.product!.depthMm).toBe(545);
    expect(p.product!.specifications?.dimensionUnitAssumed).toBe(false);
  });

  it('groupe d unité inconnue : heuristique (<300 => cm) + flag + confidence réduite', async () => {
    const unknown = {
      size: 1,
      hits: [{ eprelRegistrationNumber: 7, modelIdentifier: 'HOB-X', supplierOrTrademark: 'AEG',
        dimensionWidth: 60, dimensionHeight: 520, dimensionDepth: 52 }],
    };
    const s = new EprelApplianceStrategy(mockFetcher(unknown));
    const [p] = await s.fetchProductsByCategory('cookinghobs');
    expect(p.product!.widthMm).toBe(600); // 60 < 300 => cm
    expect(p.product!.heightMm).toBe(520); // >= 300 => mm
    expect(p.product!.depthMm).toBe(520); // 52 < 300 => cm
    expect(p.product!.specifications?.dimensionUnitAssumed).toBe(true);
    expect(p.product!.dimensionConfidence).toBe(0.7); // 1.0 × 0.7 (unité inférée)
  });

  it('fetchProductByUrl extrait {group, regNo} et retrouve le produit', async () => {
    const s = new EprelApplianceStrategy(mockFetcher(dishwashers));
    const r = await s.fetchProductByUrl('https://eprel.ec.europa.eu/screen/product/dishwashers2019/123456');
    expect(r.success).toBe(true);
    expect(r.product!.sku).toBe('DFN38532X-7609003477');
  });

  it('EPREL_KITCHEN_GROUPS expose les groupes cuisine prouvés', () => {
    expect(EPREL_KITCHEN_GROUPS).toContain('dishwashers2019');
    expect(EPREL_KITCHEN_GROUPS).toContain('refrigeratingappliances2019');
  });

  it('pagine sur plusieurs pages jusqu au plafond maxProducts', async () => {
    const fetcher = paginatedFetcher(100);
    const s = new EprelApplianceStrategy(fetcher, { pageSize: 2, maxProducts: 5 });
    const r = await s.fetchProductsByCategory('dishwashers2019');
    expect(r).toHaveLength(5); // 2 + 2 + 1
    expect(r.map((x) => x.product!.sku)).toEqual(['M0', 'M1', 'M2', 'M3', 'M4']);
    // 3 requêtes : pages 1,2 (limit 2) + page 3 (limit 1, reste du plafond)
    expect((fetcher.fetchJson as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(3);
  });

  it('s arrête quand le groupe est épuisé (size), sans dépasser', async () => {
    const fetcher = paginatedFetcher(3); // seulement 3 produits dans le groupe
    const s = new EprelApplianceStrategy(fetcher, { pageSize: 2, maxProducts: 1000 });
    const r = await s.fetchProductsByCategory('ovens');
    expect(r).toHaveLength(3); // page 1 (2) + page 2 (1 < limit -> stop)
    expect((fetcher.fetchJson as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(2);
  });

  it('par défaut : 1 page (pas de pagination involontaire)', async () => {
    const fetcher = paginatedFetcher(1000);
    const s = new EprelApplianceStrategy(fetcher); // défaut maxProducts = pageSize = 100
    const r = await s.fetchProductsByCategory('dishwashers2019');
    expect(r).toHaveLength(100);
    expect((fetcher.fetchJson as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(1);
  });
});
