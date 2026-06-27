import { CatalogIngestionService } from './catalog-ingestion.service';

import type { ProductRepository } from '../../repositories/product-repository';
import type { IngestionStrategy, ParseResult, UnifiedProduct } from '@kitchenxpert/common';

function makeProduct(over: Partial<UnifiedProduct> = {}): UnifiedProduct {
  return {
    sku: 'A1',
    name: 'Élément',
    brand: 'IKEA',
    type: 'cabinet',
    widthMm: 600,
    heightMm: 800,
    depthMm: 600,
    dimensionConfidence: 1,
    priceEurCents: 9900,
    currency: 'EUR',
    sourceLevel: 2,
    sourceUrl: 'https://www.ikea.com/p/a1',
    lastVerifiedAt: new Date('2026-06-15T00:00:00.000Z'),
    ...over,
  };
}
const ok = (p: UnifiedProduct): ParseResult => ({
  success: true,
  product: p,
  errors: [],
  warnings: [],
});
const fail = (errors: string[]): ParseResult => ({ success: false, errors, warnings: [] });

function makeStrategy(results: ParseResult[] | Error): IngestionStrategy {
  return {
    brandId: 'ikea',
    sourceLevel: 2,
    fetchProductByUrl: jest.fn(),
    fetchProductsByCategory: jest.fn(
      results instanceof Error ? () => Promise.reject(results) : () => Promise.resolve(results)
    ),
  };
}

function makeRepo(upsert = jest.fn().mockResolvedValue({})) {
  return { repo: { upsertBySku: upsert } as unknown as ProductRepository, upsert };
}

describe('CatalogIngestionService.ingestByCategory', () => {
  beforeEach(() => jest.clearAllMocks());

  it('ingests every valid product (happy path)', async () => {
    const { repo, upsert } = makeRepo();
    const strategy = makeStrategy([
      ok(makeProduct({ sku: 'A1' })),
      ok(makeProduct({ sku: 'A2' })),
      ok(makeProduct({ sku: 'A3' })),
    ]);
    const svc = new CatalogIngestionService(repo, strategy);

    const res = await svc.ingestByCategory('cuisine');

    expect(res).toEqual({
      brand: 'ikea',
      query: 'cuisine',
      fetched: 3,
      ingested: 3,
      skipped: 0,
      errors: [],
    });
    expect(upsert).toHaveBeenCalledTimes(3);
    expect(upsert.mock.calls[0][0]).toBe('IKEA-A1'); // namespaced sku reaches the repo
  });

  it('skips invalid ParseResults and records their errors (mixed batch)', async () => {
    const { repo, upsert } = makeRepo();
    const strategy = makeStrategy([
      ok(makeProduct({ sku: 'A1' })),
      fail(['sku: Required']),
      ok(makeProduct({ sku: 'A3' })),
    ]);
    const svc = new CatalogIngestionService(repo, strategy);

    const res = await svc.ingestByCategory('cuisine');

    expect(res.fetched).toBe(3);
    expect(res.ingested).toBe(2);
    expect(res.skipped).toBe(1);
    expect(res.errors).toContain('sku: Required');
    expect(upsert).toHaveBeenCalledTimes(2);
  });

  it('handles a strategy fetch failure gracefully (skip-not-crash)', async () => {
    const { repo, upsert } = makeRepo();
    const strategy = makeStrategy(new Error('Cloudflare 403'));
    const svc = new CatalogIngestionService(repo, strategy);

    const res = await svc.ingestByCategory('cuisine');

    expect(res.fetched).toBe(0);
    expect(res.ingested).toBe(0);
    expect(res.errors.join(' ')).toMatch(/fetch failed: Cloudflare 403/);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('captures a single upsert failure without aborting the run', async () => {
    const upsert = jest
      .fn()
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('unique constraint'))
      .mockResolvedValueOnce({});
    const { repo } = makeRepo(upsert);
    const strategy = makeStrategy([
      ok(makeProduct({ sku: 'A1' })),
      ok(makeProduct({ sku: 'A2' })),
      ok(makeProduct({ sku: 'A3' })),
    ]);
    const svc = new CatalogIngestionService(repo, strategy);

    const res = await svc.ingestByCategory('cuisine');

    expect(res.ingested).toBe(2);
    expect(res.skipped).toBe(1);
    expect(res.errors).toContain('unique constraint');
  });

  it('forwards an optional logger summary line', async () => {
    const { repo } = makeRepo();
    const logger = { info: jest.fn(), warn: jest.fn() };
    const strategy = makeStrategy([ok(makeProduct())]);
    const svc = new CatalogIngestionService(repo, strategy, logger);

    await svc.ingestByCategory('cuisine');

    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('résout + pose categoryId via le resolver injecté (§15.8 Phase 2)', async () => {
    const upsert = jest.fn().mockResolvedValue({});
    const { repo } = makeRepo(upsert);
    const resolver = { idForSlug: jest.fn().mockResolvedValue('cat-froid') };
    const strategy = makeStrategy([
      ok(
        makeProduct({
          type: 'appliance',
          specifications: { applianceGroup: 'refrigeratingappliances2019' },
        })
      ),
    ]);
    const svc = new CatalogIngestionService(repo, strategy, undefined, resolver);

    const res = await svc.ingestByCategory('x');

    expect(res.ingested).toBe(1);
    expect(resolver.idForSlug).toHaveBeenCalledWith('electromenager-froid');
    const [, data] = upsert.mock.calls[0];
    expect(data.categoryId).toBe('cat-froid');
    expect(data.specifications.categoryDetection).toBe('explicit');
  });

  it('slug introuvable dans le resolver -> categoryId NULL + warn, pas de crash', async () => {
    const upsert = jest.fn().mockResolvedValue({});
    const { repo } = makeRepo(upsert);
    const logger = { info: jest.fn(), warn: jest.fn() };
    const resolver = { idForSlug: jest.fn().mockResolvedValue(null) };
    const strategy = makeStrategy([ok(makeProduct({ type: 'worktop' }))]);
    const svc = new CatalogIngestionService(repo, strategy, logger, resolver);

    const res = await svc.ingestByCategory('x');

    expect(res.ingested).toBe(1); // pas de crash
    expect(logger.warn).toHaveBeenCalledWith(expect.stringMatching(/plans-de-travail.*NULL/));
  });

  it('sans resolver : aucun categoryId posé (backward-compat Phase 1)', async () => {
    const upsert = jest.fn().mockResolvedValue({});
    const { repo } = makeRepo(upsert);
    const svc = new CatalogIngestionService(repo, makeStrategy([ok(makeProduct())]));
    await svc.ingestByCategory('x');
    const [, data] = upsert.mock.calls[0];
    expect(data.categoryId).toBeUndefined();
  });
});
