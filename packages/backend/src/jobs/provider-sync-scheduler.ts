/**
 * Provider sync scheduler.
 *
 * Runs the price+availability sync once per `PROVIDER_SYNC_INTERVAL_MS`
 * (default 6 h) so prices stay fresh without hammering retailer sites.
 * Like the GDPR purge scheduler, this is intentionally an in-process timer
 * — a single instance is enough; for multi-replica setups, gate it behind
 * `PROVIDER_SYNC_LEADER=1` on exactly one pod.
 *
 * Configuration:
 *   PROVIDER_SYNC_ENABLED=1            — turn it on (off by default in dev)
 *   PROVIDER_SYNC_INTERVAL_MS=21600000 — override the 6h cadence
 *   PROVIDER_SYNC_PROVIDERS=castorama,schmidt — restrict to a subset
 *   PROVIDER_SYNC_DRY_RUN=1            — log without applying
 *   SCRAPER_BRIDGE_ENABLED=1           — switch from MockSyncSource to the
 *                                       real scraper (needs the package +
 *                                       BullMQ + scraper DB).
 */

import { runProviderSync } from './provider-sync.job';
import { createModuleLogger } from '../utils/logger';

const logger = createModuleLogger('provider-sync-scheduler');

const DEFAULT_INTERVAL_MS = 6 * 60 * 60 * 1000;

let timer: ReturnType<typeof setInterval> | null = null;

export function startProviderSyncScheduler(): void {
  if (timer) {
    return;
  }
  if (process.env.PROVIDER_SYNC_ENABLED !== '1') {
    logger.info('[provider-sync-scheduler] disabled (set PROVIDER_SYNC_ENABLED=1)');
    return;
  }
  const intervalMs = Number(process.env.PROVIDER_SYNC_INTERVAL_MS) || DEFAULT_INTERVAL_MS;
  const providers = process.env.PROVIDER_SYNC_PROVIDERS?.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const dryRun = process.env.PROVIDER_SYNC_DRY_RUN === '1';

  logger.info('[provider-sync-scheduler] starting', { intervalMs, providers, dryRun });

  // First run shortly after boot so freshly-deployed nodes pick up the latest
  // prices instead of waiting 6h.
  setTimeout(() => void runOnce(providers, dryRun), 90_000);
  timer = setInterval(() => void runOnce(providers, dryRun), intervalMs);
}

export function stopProviderSyncScheduler(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
    logger.info('[provider-sync-scheduler] stopped');
  }
}

async function runOnce(providers: readonly string[] | undefined, dryRun: boolean): Promise<void> {
  try {
    const stats = await runProviderSync(undefined, { providers, dryRun });
    logger.info('[provider-sync-scheduler] tick', { stats });
  } catch (err) {
    logger.error('[provider-sync-scheduler] run failed', {
      err: err instanceof Error ? err.message : String(err),
    });
  }
}
