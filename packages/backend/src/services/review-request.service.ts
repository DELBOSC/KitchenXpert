/**
 * Review-request orchestrator.
 *
 * Responsibilities:
 *   - Detect when a user hits a milestone and schedule a ReviewRequest
 *     (subject to 90-day cooldown per user).
 *   - Trigger the email send (delegates to `mail.service.ts`).
 *   - Record the user's response (rating + optional external platform).
 *
 * NOT responsible for sending the actual email — that's the mail
 * service. NOT responsible for fetching reviews back from external
 * platforms — that's a separate ingester (see `services/review-ingest.service.ts`,
 * TODO file).
 */
import { prisma } from '../database/client';
import logger from '../utils/logger';

export type ReviewRequestTrigger =
  | 'first_project_completed'
  | 'active_two_weeks'
  | 'premium_purchase'
  | 'support_resolved_positive'
  | 'manual';

const COOLDOWN_DAYS = 90;
const ACTIVE_THRESHOLD_DAYS = 14;
const ACTIVE_MIN_SESSIONS = 3;

/** Has the user been requested for a review within the cooldown window? */
async function isInCooldown(userId: string): Promise<boolean> {
  const cutoff = new Date(Date.now() - COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
  const recent = await prisma.reviewRequest.findFirst({
    where: { userId, triggeredAt: { gte: cutoff } },
    select: { id: true },
  });
  return Boolean(recent);
}

/**
 * Idempotent — call from every milestone path. If the trigger applies
 * AND the cooldown has elapsed, a row is created and the email is
 * scheduled. Otherwise we no-op silently.
 */
export async function maybeScheduleReviewRequest(args: {
  userId: string;
  trigger: ReviewRequestTrigger;
  projectId?: string;
}): Promise<{ scheduled: boolean; reason?: string }> {
  const { userId, trigger, projectId } = args;

  if (await isInCooldown(userId)) {
    return { scheduled: false, reason: 'cooldown' };
  }

  // Per-trigger guards. These are cheap and avoid spamming a user who
  // technically hit "premium_purchase" but only signed up 2 days ago.
  switch (trigger) {
    case 'first_project_completed': {
      const completedCount = await prisma.project.count({
        where: { userId, status: 'completed' as never, deletedAt: null },
      });
      if (completedCount !== 1) {
        return { scheduled: false, reason: 'not-first-completion' };
      }
      break;
    }
    case 'active_two_weeks': {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { createdAt: true },
      });
      if (!user) {
        return { scheduled: false, reason: 'user-missing' };
      }
      const ageDays = (Date.now() - user.createdAt.getTime()) / (24 * 60 * 60 * 1000);
      if (ageDays < ACTIVE_THRESHOLD_DAYS) {
        return { scheduled: false, reason: 'too-young' };
      }
      // We measure "sessions" as updatedAt-bumps on Projects (proxy for
      // active design work). Real session tracking would live elsewhere.
      const recentActivity = await prisma.project.count({
        where: {
          userId,
          updatedAt: { gte: new Date(Date.now() - ACTIVE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000) },
        },
      });
      if (recentActivity < ACTIVE_MIN_SESSIONS) {
        return { scheduled: false, reason: 'low-activity' };
      }
      break;
    }
    // The other triggers fire from explicit call-sites that already
    // validated the precondition — no extra check.
    case 'premium_purchase':
    case 'support_resolved_positive':
    case 'manual':
      break;
  }

  await prisma.reviewRequest.create({
    data: { userId, trigger: trigger as never, projectId },
  });

  logger.info('review-request scheduled', { userId, trigger });
  return { scheduled: true };
}

/**
 * Mark a request as "shown to the user" (in-app modal opened OR email
 * delivered). The next response from the user closes the loop.
 */
export async function markReviewRequestSent(requestId: string): Promise<void> {
  await prisma.reviewRequest.update({
    where: { id: requestId },
    data: { sentAt: new Date() },
  });
}

/**
 * Record the user's response. Behaviour:
 *   - rating ≥ 4 → record `pushedToPlatform`, return the redirect URL
 *     for the chosen platform. Frontend handles `window.open`.
 *   - rating ≤ 3 → record `respondedAt`, write an InternalFeedback row
 *     with the message. NEVER push externally.
 */
export type ReviewPlatform = 'g2' | 'capterra' | 'trustpilot' | 'avis_verifies' | 'google_business';

const PLATFORM_URLS: Record<ReviewPlatform, string> = {
  g2: 'https://www.g2.com/products/kitchenxpert/reviews',
  capterra: 'https://www.capterra.com/p/000000/KitchenXpert/', // ID TBD post-submission
  trustpilot: 'https://www.trustpilot.com/evaluate/kitchenxpert.com',
  avis_verifies: 'https://www.avis-verifies.com/avis-clients/kitchenxpert.com',
  google_business: 'https://g.page/r/CXxxxxxxxx/review', // TBD when GMB is set up
};

/** Round-robin platform picker so traffic is spread across G2/Capterra/Trustpilot. */
function pickRoundRobinPlatform(requestId: string): ReviewPlatform {
  // Deterministic: hash the requestId → pick one of the 3 prioritised platforms.
  // We don't include Avis Vérifiés / Google in the random rotation
  // because they're optional secondary channels.
  const pool: ReviewPlatform[] = ['g2', 'capterra', 'trustpilot'];
  let hash = 0;
  for (let i = 0; i < requestId.length; i++) {
    hash = (hash * 31 + requestId.charCodeAt(i)) | 0;
  }
  // Array length is fixed at 3 so the index is always defined.
  return pool[Math.abs(hash) % pool.length]!;
}

export interface RecordResponseArgs {
  requestId?: string; // optional — modal can fire without a server-side request row
  userId: string;
  rating: number; // 1–5
  message?: string;
  context?: string; // route or screen where modal was shown
  preferredPlatform?: ReviewPlatform;
}

export interface RecordResponseResult {
  /** External URL to redirect the user to (only if rating ≥ 4). */
  externalUrl: string | null;
  /** Platform actually used (round-robin if user didn't pick). */
  platform: ReviewPlatform | null;
}

export async function recordReviewResponse(
  args: RecordResponseArgs
): Promise<RecordResponseResult> {
  const { requestId, userId, rating, message, context, preferredPlatform } = args;
  const now = new Date();

  if (rating >= 1 && rating <= 3) {
    // Internal triage — DO NOT push externally
    await prisma.internalFeedback.create({
      data: { userId, rating, message, context },
    });
    if (requestId) {
      await prisma.reviewRequest.update({
        where: { id: requestId },
        data: { respondedAt: now, rating },
      });
    }
    logger.info('internal feedback captured (low rating)', { userId, rating });
    return { externalUrl: null, platform: null };
  }

  if (rating >= 4) {
    // Push to external platform — record optional message internally too
    // (useful for the testimonial wall on /avis later).
    const platform = preferredPlatform ?? pickRoundRobinPlatform(requestId ?? userId);
    if (message) {
      await prisma.internalFeedback.create({
        data: { userId, rating, message, context },
      });
    }
    if (requestId) {
      await prisma.reviewRequest.update({
        where: { id: requestId },
        data: {
          respondedAt: now,
          rating,
          pushedToPlatform: platform as never,
          pushedAt: now,
        },
      });
    }
    logger.info('review pushed to external platform', { userId, platform });
    return { externalUrl: PLATFORM_URLS[platform], platform };
  }

  throw new Error(`Invalid rating ${rating}`);
}

/** Convenience: fetch the open (sent, not-responded) request for a user. */
export async function getPendingRequestForUser(userId: string): Promise<{
  id: string;
  trigger: string;
  projectId: string | null;
} | null> {
  const row = await prisma.reviewRequest.findFirst({
    where: { userId, sentAt: { not: null }, respondedAt: null },
    orderBy: { sentAt: 'desc' },
    select: { id: true, trigger: true, projectId: true },
  });
  return row;
}
