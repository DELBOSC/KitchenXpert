import { createModuleLogger } from '../../utils/logger';

import type { ApplianceUpdate, ProductUpdate, SyncSource } from '../provider-sync.types';
import type { PrismaClient } from '@prisma/client';

const logger = createModuleLogger('scraper-bridge');

/**
 * Bridge to `@kitchenxpert/scraper`. Lazy-imports the scraper package so the
 * backend builds and runs without it. Returns empty deltas if the package
 * isn't installed or the bridge isn't enabled (`SCRAPER_BRIDGE_ENABLED=1`).
 *
 * The scraper package owns its own Prisma schema and BullMQ pipeline; we
 * read its `Cabinet` / `Appliance` tables and translate the rows into
 * backend-shaped updates by matching on SKU / brand+model.
 *
 * Wiring details — what the scraper exposes vs what we need:
 *
 *   Scraper Cabinet.reference  →  backend Product.sku
 *   Scraper Appliance.reference + manufacturerBrand → Appliance.model + brand
 *
 * Anything the scraper doesn't expose under those keys is simply not synced;
 * MockSyncSource still keeps every row moving in the meantime.
 */
export class ScraperBridgeSyncSource implements SyncSource {
  // The constructor accepts a Prisma client purely for parity with the
  // mock source; the bridge itself only reads from the scraper package.
  constructor(_prisma: PrismaClient) {
    void _prisma;
  }

  async fetchUpdates(
    providerCode: string
  ): Promise<{ products: ProductUpdate[]; appliances: ApplianceUpdate[] }> {
    if (process.env.SCRAPER_BRIDGE_ENABLED !== '1') {
      return { products: [], appliances: [] };
    }

    type ScraperModule = { getDbQueryService?: () => unknown };
    let scraperModule: ScraperModule;
    try {
      scraperModule = (await import('@kitchenxpert/scraper' as string)) as ScraperModule;
    } catch {
      logger.warn('[scraper-bridge] @kitchenxpert/scraper not installed — bridge inactive');
      return { products: [], appliances: [] };
    }

    if (!scraperModule.getDbQueryService) {
      logger.warn('[scraper-bridge] scraper package present but does not expose getDbQueryService');
      return { products: [], appliances: [] };
    }

    type DbQuery = {
      getCabinetsByBrand(
        brand: string
      ): Promise<
        Array<{ reference: string; price?: number; availability?: string; name?: string }>
      >;
      getAppliancesByBrand(brand: string): Promise<
        Array<{
          reference: string;
          manufacturerBrand: string;
          price?: number;
          availability?: string;
        }>
      >;
    };

    const dbQuery = scraperModule.getDbQueryService() as DbQuery;
    const cabinets = await dbQuery.getCabinetsByBrand(providerCode).catch(() => []);
    const appliances = await dbQuery.getAppliancesByBrand(providerCode).catch(() => []);

    return {
      products: cabinets
        .filter((c) => c.reference)
        .map((c) => ({
          sku: c.reference,
          price: c.price,
          availability: normalize(c.availability),
          name: c.name,
        })),
      appliances: appliances
        .filter((a) => a.reference && a.manufacturerBrand)
        .map((a) => ({
          brand: a.manufacturerBrand,
          model: a.reference,
          price: a.price,
          availability: normalize(a.availability),
        })),
    };
  }
}

function normalize(raw: string | undefined): ProductUpdate['availability'] | undefined {
  if (!raw) {
    return undefined;
  }
  const v = raw.toLowerCase();
  if (v.includes('out')) {
    return 'out_of_stock';
  }
  if (v.includes('low') || v.includes('limited')) {
    return 'low_stock';
  }
  if (v.includes('order') || v.includes('on demand')) {
    return 'on_order';
  }
  return 'in_stock';
}
