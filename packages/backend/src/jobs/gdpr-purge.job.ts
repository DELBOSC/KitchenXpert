/**
 * RGPD Hard-Delete Purge Job
 *
 * Implements the second half of the right-to-erasure flow (Art. 17 RGPD):
 *
 *   1. User clicks "supprimer mon compte" in the UI.
 *   2. `gdpr-controller.requestErasure()` immediately *anonymises* the
 *      account (PII overwritten, sessions wiped, audit log written) and
 *      returns to the user.
 *   3. After a configurable retention window — default **30 days** — this
 *      job actually purges the data from the database. The window exists
 *      because some downstream business records (invoices, audit trails
 *      relevant to fraud investigations, refunds in flight) may legally need
 *      to be retained or referenced for a short period.
 *
 * Why a delayed hard-delete rather than immediate?
 *   • Article L123-22 Code de commerce mandates 10 years for invoices —
 *     handled via a separate retention rule, not this job.
 *   • Anonymisation is enough to comply with Art. 17 from the user's
 *     perspective: the personal data is no longer linked to them.
 *   • A 30-day window gives the user time to change their mind (we offer
 *     a "restore" path during the window — see TODO below) and limits
 *     the blast radius of accidental clicks.
 *
 * Idempotency: the job re-runs safely because it filters on the
 * `gdpr_erasure_requested` audit event timestamp; once the user is gone,
 * the next run finds nothing.
 *
 * To run: scheduled via cron (or the in-process scheduler) once per day —
 * typically at off-peak hours.
 */

import type { PrismaClient } from '@prisma/client';
import { createModuleLogger } from '../utils/logger';

const logger = createModuleLogger('gdpr-purge');

export interface PurgeOptions {
  /** Retention window in milliseconds before hard-delete. */
  retentionMs?: number;
  /** Cap how many users we process per tick to avoid DB pressure. */
  batchSize?: number;
  /** Dry run mode — log what would be deleted without touching the DB. */
  dryRun?: boolean;
}

export interface PurgeStats {
  candidates: number;
  purged: number;
  skipped: number;
  errors: number;
}

const DEFAULT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const DEFAULT_BATCH = 100;

export async function runGdprPurge(
  prisma: PrismaClient,
  options: PurgeOptions = {},
): Promise<PurgeStats> {
  const retentionMs = options.retentionMs ?? DEFAULT_RETENTION_MS;
  const batchSize = options.batchSize ?? DEFAULT_BATCH;
  const dryRun = options.dryRun ?? false;
  const cutoff = new Date(Date.now() - retentionMs);

  // Find users who requested erasure before the cutoff. We use the audit log
  // as the system of record for the request timestamp because the user row
  // itself is already anonymised (status=suspended, email=deleted-...).
  const candidates = await prisma.auditLog.findMany({
    where: {
      action: 'delete',
      resource: 'user',
      createdAt: { lte: cutoff },
      // metadata jsonb path filter keeps only RGPD-driven deletions.
      metadata: { path: ['kind'], equals: 'gdpr_erasure_art_17' },
    },
    select: { userId: true, resourceId: true, createdAt: true },
    take: batchSize,
    orderBy: { createdAt: 'asc' },
  });

  const stats: PurgeStats = { candidates: candidates.length, purged: 0, skipped: 0, errors: 0 };

  if (candidates.length === 0) {
    logger.info('[gdpr-purge] No erasure requests past retention window');
    return stats;
  }

  logger.info(`[gdpr-purge] Processing ${candidates.length} erasure request(s)`, { dryRun, retentionMs, cutoff });

  for (const audit of candidates) {
    if (!audit.userId) { stats.skipped++; continue; }
    try {
      const exists = await prisma.user.findUnique({
        where: { id: audit.userId },
        select: { id: true, email: true, status: true },
      });
      if (!exists) {
        // Already purged on a previous run — clean up the audit log so we
        // don't keep retrying.
        if (!dryRun) {
          await prisma.auditLog.deleteMany({
            where: {
              userId: audit.userId,
              action: 'delete',
              metadata: { path: ['kind'], equals: 'gdpr_erasure_art_17' },
            },
          });
        }
        stats.skipped++;
        continue;
      }

      // Sanity check: do not purge unless the row was anonymised (defensive
      // guard against accidentally deleting active users if metadata gets
      // crafted by mistake).
      if (!exists.email.startsWith('deleted-') || exists.status !== 'suspended') {
        logger.warn('[gdpr-purge] User not in anonymised state — skipping', { userId: audit.userId });
        stats.skipped++;
        continue;
      }

      if (dryRun) {
        logger.info('[gdpr-purge] [dry-run] would purge', { userId: audit.userId });
        stats.purged++;
        continue;
      }

      await purgeUser(prisma, audit.userId);
      stats.purged++;
      logger.info('[gdpr-purge] Purged user', { userId: audit.userId });
    } catch (error) {
      stats.errors++;
      logger.error('[gdpr-purge] Failed to purge user', {
        userId: audit.userId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logger.info('[gdpr-purge] Tick complete', stats);
  return stats;
}

/**
 * Hard-delete one user and every record that references them. The order is
 * important: leaf relations first, then the user. Most are cascaded via
 * Prisma's `onDelete: Cascade`, but we list the tables explicitly so a
 * future schema change cannot silently leave orphans.
 *
 * Records that the law forces us to keep (e.g. immutable invoices) MUST be
 * handled here — currently we have none persisted on our side (Stripe holds
 * the receipts). If/when local invoices are introduced, anonymise them
 * here instead of deleting.
 */
async function purgeUser(prisma: PrismaClient, userId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Tokens & sessions — already deleted at anonymisation time, but defensive.
    await tx.userSession.deleteMany({ where: { userId } });
    await tx.emailVerificationToken.deleteMany({ where: { userId } });
    await tx.passwordResetToken.deleteMany({ where: { userId } });

    // Domain content owned by the user. Most cascades from User, but we
    // delete explicitly to fail fast if a future schema change breaks a FK.
    await tx.kitchen.deleteMany({ where: { userId } });
    await tx.project.deleteMany({ where: { userId } });
    await tx.order.deleteMany({ where: { userId } });
    await tx.notification.deleteMany({ where: { userId } });
    await tx.userPreference.deleteMany({ where: { userId } });

    // Drop the audit trail last — it's the marker we used to find this user.
    await tx.auditLog.deleteMany({ where: { userId } });

    // Finally the row itself.
    await tx.user.delete({ where: { id: userId } });
  });
}
