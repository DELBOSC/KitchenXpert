/**
 * Unit tests for the DETERMINISTIC BOMGeneratorService (CLAUDE.md §15.7 P4 — BOM-a).
 *
 * No LLM is involved anymore: only prisma is mocked. The generator turns placed
 * items (with real product/appliance) into `catalog` lines (real SKU + DB price)
 * and config posts into `estimated` lines (barème-priced). 100% deterministic.
 */

const mockPrisma = {
  kitchenItem: { findMany: jest.fn() },
  kitchenConfiguration: { findUnique: jest.fn() },
  kitchen: { findUnique: jest.fn() },
};

jest.mock('../../database/client', () => ({
  prisma: mockPrisma,
  connectPrisma: jest.fn(),
  disconnectPrisma: jest.fn(),
}));

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { BOMGeneratorService } from './bom-generator.service';

const KID = 'kitchen-1';

function productItem(name: string, sku: string, price: unknown, type = 'base_cabinet') {
  return { type, name: 'placed', price: null, product: { name, sku, price }, appliance: null };
}

function applianceItem(name: string, brand: string, model: string, price: unknown) {
  return {
    type: 'appliance',
    name: 'placed',
    price: null,
    product: null,
    appliance: { name, brand, model, price },
  };
}

function setup(opts: { items?: unknown[]; config?: unknown; kitchen?: unknown } = {}) {
  mockPrisma.kitchenItem.findMany.mockResolvedValue(opts.items ?? []);
  mockPrisma.kitchenConfiguration.findUnique.mockResolvedValue(opts.config ?? null);
  // Use `in` so an explicit `kitchen: null` is honored (not replaced by the default).
  mockPrisma.kitchen.findUnique.mockResolvedValue(
    'kitchen' in opts ? opts.kitchen : { id: KID, name: 'K' }
  );
}

describe('BOMGeneratorService.generateBOM (deterministic)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('(a) two catalog products -> 2 catalog lines with real SKUs + DB prices', async () => {
    setup({
      items: [
        productItem('Caisson bas 60', 'IKEA-METOD-001', '250.00'),
        productItem('Caisson haut 80', 'IKEA-METOD-002', '180.00'),
      ],
    });

    const bom = await BOMGeneratorService.getInstance().generateBOM(KID);

    expect(bom.items).toHaveLength(2);
    expect(bom.items.every((i) => i.source === 'catalog')).toBe(true);
    expect(bom.items.map((i) => i.catalogRef)).toEqual(['IKEA-METOD-001', 'IKEA-METOD-002']);
    expect(bom.items.map((i) => i.unitPrice)).toEqual([250, 180]);
    expect(bom.subtotalCatalog).toBe(430);
    expect(bom.subtotalEstimated).toBe(0); // no config
    expect(bom.subtotal).toBe(430);
    expect(bom.tax).toBe(86); // 20%
    expect(bom.total).toBe(516);
  });

  it('(b) an appliance item -> catalogRef = "brand model", source catalog', async () => {
    setup({ items: [applianceItem('Four pyrolyse', 'Bosch', 'HBA171', '699.00')] });

    const bom = await BOMGeneratorService.getInstance().generateBOM(KID);

    expect(bom.items).toHaveLength(1);
    expect(bom.items[0]).toMatchObject({
      name: 'Four pyrolyse',
      category: 'Electromenager',
      catalogRef: 'Bosch HBA171',
      source: 'catalog',
      unitPrice: 699,
    });
    expect(bom.subtotalCatalog).toBe(699);
  });

  it('(c) config (countertop + flooring) -> estimated lines + installation', async () => {
    setup({ config: { countertopMaterial: 'Quartz Silestone', flooringType: 'Parquet chêne' } });

    const bom = await BOMGeneratorService.getInstance().generateBOM(KID);

    // countertop(quartz=2500) + flooring(parquet=2000) + installation(1500)
    expect(bom.items.map((i) => i.name)).toEqual([
      'Plan de travail',
      'Sol',
      'Pose et installation',
    ]);
    expect(bom.items.every((i) => i.source === 'estimated' && i.catalogRef === null)).toBe(true);
    expect(bom.subtotalEstimated).toBe(6000);
    expect(bom.subtotalCatalog).toBe(0);
    expect(bom.tax).toBe(1200);
    expect(bom.total).toBe(7200);
  });

  it('(d) mix product + config -> both subtotals > 0, totals coherent', async () => {
    setup({
      items: [productItem('Caisson bas 60', 'CASTORAMA-X1', '300.00')],
      config: { countertopMaterial: 'Granit' }, // granit=3000 + installation 1500
    });

    const bom = await BOMGeneratorService.getInstance().generateBOM(KID);

    expect(bom.subtotalCatalog).toBe(300);
    expect(bom.subtotalEstimated).toBe(4500); // 3000 + 1500
    expect(bom.subtotal).toBe(4800);
    expect(bom.tax).toBe(960);
    expect(bom.total).toBe(5760);
    expect(bom.subtotal).toBe(bom.subtotalCatalog + bom.subtotalEstimated);
    expect(bom.total).toBe(bom.subtotal + bom.tax);
  });

  it('(e) kitchen not found -> throws', async () => {
    setup({ kitchen: null });
    await expect(BOMGeneratorService.getInstance().generateBOM(KID)).rejects.toThrow(
      'Kitchen not found'
    );
  });

  it('(f) Decimal-like prices are coerced to numbers (not NaN / [object])', async () => {
    // Simulate a Prisma Decimal via an object exposing valueOf/toString.
    const decimal = { valueOf: () => 412.5, toString: () => '412.50' };
    setup({ items: [productItem('Plan inox', 'INOX-1', decimal)] });

    const bom = await BOMGeneratorService.getInstance().generateBOM(KID);

    expect(bom.items[0]!.unitPrice).toBe(412.5);
    expect(Number.isNaN(bom.items[0]!.unitPrice)).toBe(false);
    expect(bom.subtotalCatalog).toBe(412.5);
  });

  it('does NOT call any LLM (deterministic) — only prisma reads', async () => {
    setup({ items: [productItem('X', 'SKU-1', '10.00')] });
    await BOMGeneratorService.getInstance().generateBOM(KID);
    expect(mockPrisma.kitchenItem.findMany).toHaveBeenCalledWith({
      where: { kitchenId: KID },
      include: { product: true, appliance: true },
    });
  });
});
