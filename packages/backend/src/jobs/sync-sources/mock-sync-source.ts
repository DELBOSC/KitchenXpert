import type { PrismaClient } from '@prisma/client';
import type { ApplianceUpdate, ProductUpdate, SyncSource } from '../provider-sync.types';

/**
 * Mock sync source — reads the existing rows for a provider and applies
 * realistic price/availability drift around their current values.
 *
 * Price drift: ±3% with 70% probability, ±8% with 25%, no change with 5%.
 * Availability flip: 5% chance of moving to `low_stock`, 1% to `out_of_stock`,
 * 5% to recover from a non-`in_stock` state to `in_stock`.
 *
 * The randomness is seeded per-day so re-running the sync the same day twice
 * produces identical updates — useful for QA and to keep audit logs stable.
 */
export class MockSyncSource implements SyncSource {
  constructor(private readonly prisma: PrismaClient) {}

  async fetchUpdates(providerCode: string): Promise<{ products: ProductUpdate[]; appliances: ApplianceUpdate[] }> {
    const provider = await this.prisma.catalogProvider.findUnique({ where: { code: providerCode } });
    if (!provider) return { products: [], appliances: [] };

    const seed = dailySeed(providerCode);
    const rng = seededRng(seed);

    const products = await this.prisma.product.findMany({
      where: { providerId: provider.id, isActive: true, deletedAt: null },
      select: { sku: true, price: true, availability: true },
    });
    const appliances = await this.prisma.appliance.findMany({
      where: { providerId: provider.id, isActive: true, deletedAt: null },
      select: { brand: true, model: true, price: true, availability: true },
    });

    return {
      products: products.map((p) => ({
        sku: p.sku,
        price: driftPrice(Number(p.price), rng),
        availability: driftAvailability(p.availability as ProductUpdate['availability'], rng),
      })),
      appliances: appliances.map((a) => ({
        brand: a.brand,
        model: a.model,
        price: driftPrice(Number(a.price), rng),
        availability: driftAvailability(a.availability as ApplianceUpdate['availability'], rng),
      })),
    };
  }
}

// --- helpers ----------------------------------------------------------------

function dailySeed(providerCode: string): number {
  const dayKey = new Date().toISOString().slice(0, 10) + ':' + providerCode;
  let h = 2166136261;
  for (let i = 0; i < dayKey.length; i++) {
    h ^= dayKey.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededRng(seed: number): () => number {
  let s = seed || 1;
  return () => {
    // xorshift32 — fast, good enough for jitter.
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    return ((s >>> 0) / 0xffffffff);
  };
}

function driftPrice(currentPrice: number, rng: () => number): number {
  if (currentPrice <= 0) return currentPrice;
  const r = rng();
  let pct: number;
  if (r < 0.05) pct = 0;            // 5%: no change
  else if (r < 0.30) pct = (rng() - 0.5) * 0.16; // 25%: ±8%
  else pct = (rng() - 0.5) * 0.06;   // 70%: ±3%
  const next = currentPrice * (1 + pct);
  // Round to nearest .49 / .99 like real retailers do.
  const floored = Math.floor(next);
  return Math.max(0, floored + (rng() < 0.5 ? 0.49 : 0.99));
}

function driftAvailability(
  current: ProductUpdate['availability'] | string | null | undefined,
  rng: () => number,
): ProductUpdate['availability'] | undefined {
  const r = rng();
  if (current === 'in_stock' || !current) {
    if (r < 0.01) return 'out_of_stock';
    if (r < 0.06) return 'low_stock';
    return 'in_stock';
  }
  // Recover slowly from non-in_stock states.
  if (r < 0.15) return 'in_stock';
  if (r < 0.20) return 'low_stock';
  return current as ProductUpdate['availability'];
}
