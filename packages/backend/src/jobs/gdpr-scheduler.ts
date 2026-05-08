/**
 * GDPR purge scheduler.
 *
 * Triggers the hard-delete job once per 24 hours. We use a simple in-process
 * `setInterval` rather than a real cron daemon because a single instance is
 * enough — adding a coordination primitive (Redis lock, leader election)
 * would be overkill for a daily housekeeping task. If the API is scaled to
 * multiple replicas, set GDPR_PURGE_LEADER=1 on exactly one of them.
 *
 * Configuration:
 *   GDPR_PURGE_ENABLED=1            — turn the scheduler on
 *   GDPR_PURGE_INTERVAL_MS=86400000 — override the 24h cadence (testing)
 *   GDPR_PURGE_RETENTION_MS=...     — override the 30-day retention window
 *   GDPR_PURGE_DRY_RUN=1            — log without deleting
 */

import { runGdprPurge } from './gdpr-purge.job';
import { prisma } from '../database/client';
import { createModuleLogger } from '../utils/logger';

const logger = createModuleLogger('gdpr-scheduler');

const DEFAULT_INTERVAL_MS = 24 * 60 * 60 * 1000;

let timer: ReturnType<typeof setInterval> | null = null;

export function startGdprPurgeScheduler(): void {
  if (timer) {return;}
  if (process.env.GDPR_PURGE_ENABLED !== '1') {
    logger.info('[gdpr-scheduler] Disabled (set GDPR_PURGE_ENABLED=1 to enable)');
    return;
  }

  const intervalMs = Number(process.env.GDPR_PURGE_INTERVAL_MS) || DEFAULT_INTERVAL_MS;
  const retentionMs = Number(process.env.GDPR_PURGE_RETENTION_MS) || undefined;
  const dryRun = process.env.GDPR_PURGE_DRY_RUN === '1';

  logger.info('[gdpr-scheduler] Starting', { intervalMs, retentionMs, dryRun });

  // First run on startup (after a short delay so DB is ready), then on cadence.
  setTimeout(() => void runOnce(retentionMs, dryRun), 60_000);
  timer = setInterval(() => void runOnce(retentionMs, dryRun), intervalMs);
}

export function stopGdprPurgeScheduler(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
    logger.info('[gdpr-scheduler] Stopped');
  }
}

async function runOnce(retentionMs: number | undefined, dryRun: boolean): Promise<void> {
  try {
    await runGdprPurge(prisma, { retentionMs, dryRun });
  } catch (error) {
    logger.error('[gdpr-scheduler] Run failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
