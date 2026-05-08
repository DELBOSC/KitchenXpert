/**
 * Provider Sync Job
 *
 * For each catalog provider (`leroy-merlin`, `castorama`, `schmidt`, `bosch`,
 * and `ikea` for completeness), pull a list of price + availability updates
 * from the configured `SyncSource` and apply them to the local Product /
 * Appliance rows in a single transaction. Records the latest sync via
 * `Catalog.lastSyncAt` so the existing `/sync/status` endpoint reflects it.
 *
 * IKEA is intentionally out of the default rotation — its catalog is queried
 * live, so a periodic sync would only be useful if we wanted to backfill the
 * local Product table for offline browsing. Pass `providers: ['ikea']` to
 * opt in.
 *
 * Runs idempotently: applying the same updates twice is a no-op for
 * unchanged rows because Prisma compares values.
 */

import { prisma as defaultPrisma } from '../database/client';
import { createModuleLogger } from '../utils/logger';
import { MockSyncSource } from './sync-sources/mock-sync-source';
import { ScraperBridgeSyncSource } from './sync-sources/scraper-bridge-source';

import type { SyncSource } from './provider-sync.types';
import type { PrismaClient } from '@prisma/client';

const logger = createModuleLogger('provider-sync');

export const DEFAULT_PROVIDER_CODES = ['leroy-merlin', 'castorama', 'schmidt', 'bosch'] as const;
export type ProviderCode = (typeof DEFAULT_PROVIDER_CODES)[number] | 'ikea';

export interface ProviderSyncOptions {
  providers?: readonly string[];
  /** Override the source — handy for tests. */
  source?: SyncSource;
  /** Apply the diffs but don't commit (logs what would change). */
  dryRun?: boolean;
}

export interface ProviderSyncStats {
  provider: string;
  productsConsidered: number;
  productsUpdated: number;
  appliancesConsidered: number;
  appliancesUpdated: number;
  errors: number;
}

export async function runProviderSync(
  prismaArg?: PrismaClient,
  options: ProviderSyncOptions = {},
): Promise<ProviderSyncStats[]> {
  const prisma = prismaArg ?? defaultPrisma;
  const providers = options.providers ?? DEFAULT_PROVIDER_CODES;
  const source = options.source ?? buildDefaultSource(prisma);

  const stats: ProviderSyncStats[] = [];
  for (const code of providers) {
    try {
      const single = await syncOne(prisma, code, source, options.dryRun ?? false);
      stats.push(single);
    } catch (err) {
      logger.error('[provider-sync] failed', { provider: code, err: err instanceof Error ? err.message : String(err) });
      stats.push({ provider: code, productsConsidered: 0, productsUpdated: 0, appliancesConsidered: 0, appliancesUpdated: 0, errors: 1 });
    }
  }
  return stats;
}

async function syncOne(
  prisma: PrismaClient,
  providerCode: string,
  source: SyncSource,
  dryRun: boolean,
): Promise<ProviderSyncStats> {
  const updates = await source.fetchUpdates(providerCode);
  let productsUpdated = 0;
  let appliancesUpdated = 0;

  if (dryRun) {
    logger.info('[provider-sync] dry-run', {
      provider: providerCode,
      products: updates.products.length,
      appliances: updates.appliances.length,
    });
    return {
      provider: providerCode,
      productsConsidered: updates.products.length,
      productsUpdated: 0,
      appliancesConsidered: updates.appliances.length,
      appliancesUpdated: 0,
      errors: 0,
    };
  }

  await prisma.$transaction(async (tx) => {
    for (const u of updates.products) {
      const data: Record<string, unknown> = {};
      if (u.price !== undefined) {data.price = u.price;}
      if (u.availability) {data.availability = u.availability;}
      if (u.name) {data.name = u.name;}
      if (Object.keys(data).length === 0) {continue;}
      const result = await tx.product.updateMany({ where: { sku: u.sku }, data });
      if (result.count > 0) {productsUpdated += result.count;}
    }
    for (const u of updates.appliances) {
      const data: Record<string, unknown> = {};
      if (u.price !== undefined) {data.price = u.price;}
      if (u.availability) {data.availability = u.availability;}
      if (Object.keys(data).length === 0) {continue;}
      const result = await tx.appliance.updateMany({
        where: { brand: u.brand, model: u.model },
        data,
      });
      if (result.count > 0) {appliancesUpdated += result.count;}
    }
    // Stamp lastSyncAt on every catalog tied to this provider so the
    // /sync/status endpoint reflects the latest run.
    await tx.catalog.updateMany({
      where: { provider: { code: providerCode } },
      data: { lastSyncAt: new Date() },
    });
  });

  logger.info('[provider-sync] done', {
    provider: providerCode,
    productsUpdated,
    appliancesUpdated,
  });

  return {
    provider: providerCode,
    productsConsidered: updates.products.length,
    productsUpdated,
    appliancesConsidered: updates.appliances.length,
    appliancesUpdated,
    errors: 0,
  };
}

function buildDefaultSource(prisma: PrismaClient): SyncSource {
  if (process.env.SCRAPER_BRIDGE_ENABLED === '1') {
    return new ScraperBridgeSyncSource(prisma);
  }
  return new MockSyncSource(prisma);
}
