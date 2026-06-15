import { ProductRepository, type UpsertProductDto } from './product-repository';

/** Local minimal Prisma mock (the shared mockPrismaClient has no `product`). */
function makeRepo() {
  const upsert = jest.fn();
  const prisma = { product: { upsert } };
  return { repo: new ProductRepository(prisma as never), upsert };
}

const baseData: UpsertProductDto = {
  name: 'METOD',
  brand: 'IKEA',
  price: 129.99,
};

describe('ProductRepository.upsertBySku', () => {
  beforeEach(() => jest.clearAllMocks());

  it('keys the upsert on sku; create carries sku, update does not', async () => {
    const { repo, upsert } = makeRepo();
    upsert.mockResolvedValue({ id: 'p1', sku: 'IKEA-12345' });

    const out = await repo.upsertBySku('IKEA-12345', baseData);

    expect(upsert).toHaveBeenCalledTimes(1);
    const arg = upsert.mock.calls[0][0];
    expect(arg.where).toEqual({ sku: 'IKEA-12345' });
    expect(arg.create.sku).toBe('IKEA-12345');
    expect(arg.create.name).toBe('METOD');
    expect(arg.update.sku).toBeUndefined();
    expect(arg.update.name).toBe('METOD');
    expect(out).toEqual({ id: 'p1', sku: 'IKEA-12345' });
  });

  it('defaults currency + availability and stamps lastVerifiedAt when absent', async () => {
    const { repo, upsert } = makeRepo();
    upsert.mockResolvedValue({});

    await repo.upsertBySku('B-1', { name: 'N', brand: 'B', price: 0 });

    const arg = upsert.mock.calls[0][0];
    expect(arg.create.currency).toBe('EUR');
    expect(arg.create.availability).toBe('in_stock');
    expect(arg.create.lastVerifiedAt).toBeInstanceOf(Date);
    expect(arg.update.lastVerifiedAt).toBeInstanceOf(Date);
  });

  it('passes the ingestion provenance fields through to both create and update', async () => {
    const { repo, upsert } = makeRepo();
    upsert.mockResolvedValue({});
    const lastVerifiedAt = new Date('2026-06-15T00:00:00.000Z');

    await repo.upsertBySku('B-2', {
      ...baseData,
      dimensionConfidence: 0.5,
      sourceLevel: 2,
      sourceUrl: 'https://example.com/p',
      lastVerifiedAt,
    });

    const arg = upsert.mock.calls[0][0];
    expect(arg.create.dimensionConfidence).toBe(0.5);
    expect(arg.create.sourceLevel).toBe(2);
    expect(arg.create.sourceUrl).toBe('https://example.com/p');
    expect(arg.update.dimensionConfidence).toBe(0.5);
    expect(arg.update.lastVerifiedAt).toBe(lastVerifiedAt);
  });
});
