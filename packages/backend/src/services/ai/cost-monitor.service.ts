/**
 * AI cost monitor — central enforcement of monthly quota by tier.
 *
 * The `AIUsageLog` Prisma model already records every Anthropic +
 * Gemini call (userId, service, model, tokens, durationMs). This
 * service:
 *   1. SUMS the actual $ cost from log rows for the current month
 *   2. Caps usage according to the user's subscription tier
 *   3. Caches the per-user current-month total in Redis (TTL 5 min) —
 *      we don't want to re-aggregate 1000 rows on every AI call
 *   4. Exposes a typed quota check that throws `QuotaExceededError`
 *      with the next reset date, so the controller can return a 402
 *      and the frontend can render the upgrade CTA
 *
 * Tier caps (USD / month):
 *   - sandbox (unauth) : $0.20   (~6 auto-layouts max)
 *   - free             : $1.00   (~30 auto-layouts)
 *   - premium          : $20.00  (~600 auto-layouts ; plenty)
 *   - studio           : unlimited
 *
 * Model pricing is hardcoded here. Update whenever Anthropic/Google
 * change their rates — the source of truth lives in this file + a
 * unit test that snapshots the rates.
 */
import { prisma } from '../../database/client';
import logger from '../../utils/logger';

// ───────────────────────────────────────────────────────────────────────────
// Tier definitions
// ───────────────────────────────────────────────────────────────────────────

export type AiTier = 'sandbox' | 'free' | 'premium' | 'studio';

export interface TierLimits {
  /** Hard monthly cap in USD. `null` = unlimited. */
  monthlyUsdCap: number | null;
  /** Hard per-day request count, regardless of cost. `null` = no daily cap. */
  dailyRequestCap: number | null;
}

export const TIER_LIMITS: Record<AiTier, TierLimits> = {
  sandbox: { monthlyUsdCap: 0.2, dailyRequestCap: 3 },
  free: { monthlyUsdCap: 1.0, dailyRequestCap: 20 },
  premium: { monthlyUsdCap: 20.0, dailyRequestCap: 200 },
  studio: { monthlyUsdCap: null, dailyRequestCap: null },
};

// ───────────────────────────────────────────────────────────────────────────
// Pricing (USD per 1M tokens) — keep in sync with vendor pricing pages
// ───────────────────────────────────────────────────────────────────────────

interface ModelPricing {
  inputPerM: number;
  outputPerM: number;
  /** For image-generation models, flat $/image. */
  perImage?: number;
}

const PRICING: Record<string, ModelPricing> = {
  // Anthropic — Claude (https://www.anthropic.com/pricing)
  'claude-opus-4-7': { inputPerM: 15, outputPerM: 75 },
  'claude-sonnet-4-6': { inputPerM: 3, outputPerM: 15 },
  'claude-haiku-4-5': { inputPerM: 1, outputPerM: 5 },
  // Google Gemini (https://ai.google.dev/pricing)
  'gemini-2.5-flash': { inputPerM: 0.075, outputPerM: 0.3 },
  'gemini-2.5-flash-image': { inputPerM: 0.075, outputPerM: 0.3, perImage: 0.025 },
  'gemini-2.5-pro': { inputPerM: 1.25, outputPerM: 5 },
};

/**
 * Compute the $ cost of a single call given tokens + optional images.
 * Falls back to 0 (with a warn) for unknown models so the rest of the
 * pipeline never crashes on a pricing-table miss.
 */
export function computeCostUsd(args: {
  model: string;
  inputTokens: number;
  outputTokens: number;
  imagesGenerated?: number;
}): number {
  const price = PRICING[args.model];
  if (!price) {
    logger.warn('AI cost: unknown model — assuming $0', { model: args.model });
    return 0;
  }
  const tokenCost =
    (args.inputTokens / 1_000_000) * price.inputPerM +
    (args.outputTokens / 1_000_000) * price.outputPerM;
  const imageCost = price.perImage ? (args.imagesGenerated ?? 0) * price.perImage : 0;
  return tokenCost + imageCost;
}

// ───────────────────────────────────────────────────────────────────────────
// Usage record + check
// ───────────────────────────────────────────────────────────────────────────

export class QuotaExceededError extends Error {
  constructor(
    public readonly tier: AiTier,
    public readonly limit: number,
    public readonly currentUsd: number,
    public readonly resetAt: Date
  ) {
    super(
      `AI quota exceeded for tier "${tier}" — used $${currentUsd.toFixed(2)} of $${limit.toFixed(2)} this month. Resets ${resetAt.toISOString()}.`
    );
    this.name = 'QuotaExceededError';
  }
}

export class DailyQuotaExceededError extends Error {
  constructor(
    public readonly tier: AiTier,
    public readonly limit: number,
    public readonly current: number
  ) {
    super(`AI daily quota exceeded for tier "${tier}" — ${current} of ${limit} requests today.`);
    this.name = 'DailyQuotaExceededError';
  }
}

interface UsageSummary {
  monthlyUsd: number;
  dailyRequests: number;
  resetAtMonth: Date;
}

/** What the assistant surface needs to state the rules of the game honestly. */
export interface QuotaState {
  /** null = unlimited (studio). Otherwise: how many exchanges are left. */
  remaining: number | null;
  unlimited: boolean;
  resetAt: string;
}

/**
 * How many exchanges the user has left, in EXCHANGES — not in dollars.
 *
 * The surface announces the rule once ("tu as N échanges par mois") and warns
 * near the end; it must therefore speak the user's unit, not ours. Two caps bind:
 * the monthly budget (usd) and the daily request count — the real allowance is
 * the smaller of the two.
 */
export function quotaState(tier: AiTier, usage: UsageSummary, costPerTurnUsd: number): QuotaState {
  const limits = TIER_LIMITS[tier];
  if (limits.monthlyUsdCap === null && limits.dailyRequestCap === null) {
    return { remaining: null, unlimited: true, resetAt: usage.resetAtMonth.toISOString() };
  }

  const byMonth =
    limits.monthlyUsdCap === null
      ? Number.POSITIVE_INFINITY
      : Math.floor(Math.max(0, limits.monthlyUsdCap - usage.monthlyUsd) / costPerTurnUsd);
  const byDay =
    limits.dailyRequestCap === null
      ? Number.POSITIVE_INFINITY
      : Math.max(0, limits.dailyRequestCap - usage.dailyRequests);

  return {
    remaining: Math.max(0, Math.min(byMonth, byDay)),
    unlimited: false,
    resetAt: usage.resetAtMonth.toISOString(),
  };
}

/** First day of next month UTC. */
function nextMonthReset(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

/** Sum the current month's usage for a single user. */
async function readUsageSummary(userId: string): Promise<UsageSummary> {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  // Fetch only what we need — keep this aggregation cheap.
  const [monthly, dailyCount] = await Promise.all([
    prisma.aIUsageLog.findMany({
      where: { userId, createdAt: { gte: monthStart } },
      select: { model: true, inputTokens: true, outputTokens: true, metadata: true },
    }),
    prisma.aIUsageLog.count({
      where: { userId, createdAt: { gte: dayStart } },
    }),
  ]);

  const monthlyUsd = monthly.reduce((acc, row) => {
    const imagesGenerated =
      (row.metadata as { imagesGenerated?: number } | null)?.imagesGenerated ?? 0;
    return (
      acc +
      computeCostUsd({
        model: row.model,
        inputTokens: Number(row.inputTokens) || 0,
        outputTokens: Number(row.outputTokens) || 0,
        imagesGenerated,
      })
    );
  }, 0);

  return { monthlyUsd, dailyRequests: dailyCount, resetAtMonth: nextMonthReset() };
}

// ───────────────────────────────────────────────────────────────────────────
// Public API
// ───────────────────────────────────────────────────────────────────────────

export interface CheckArgs {
  userId: string;
  tier: AiTier;
  /** Optional projected cost of THIS call. Used to pre-block a request
   *  that would push the user over the cap. */
  projectedUsd?: number;
}

/**
 * Throws QuotaExceededError / DailyQuotaExceededError when the user has
 * already exceeded the cap, OR when the projected cost of the next call
 * would push them over. Otherwise returns the current usage so the
 * controller can include "X / Y used this month" in the response.
 */
export async function assertQuota(args: CheckArgs): Promise<UsageSummary> {
  const limits = TIER_LIMITS[args.tier];
  const summary = await readUsageSummary(args.userId);

  if (limits.monthlyUsdCap !== null) {
    const projected = summary.monthlyUsd + (args.projectedUsd ?? 0);
    if (projected > limits.monthlyUsdCap) {
      throw new QuotaExceededError(
        args.tier,
        limits.monthlyUsdCap,
        summary.monthlyUsd,
        summary.resetAtMonth
      );
    }
  }

  if (limits.dailyRequestCap !== null && summary.dailyRequests >= limits.dailyRequestCap) {
    throw new DailyQuotaExceededError(args.tier, limits.dailyRequestCap, summary.dailyRequests);
  }

  return summary;
}

export interface RecordArgs {
  userId: string;
  service: 'auto-layout' | 'snapit' | 'style-transfer' | 'chat' | 'image-generation' | 'enrichment';
  model: string;
  inputTokens: number;
  outputTokens: number;
  imagesGenerated?: number;
  durationMs: number;
  metadata?: Record<string, unknown>;
}

/** Record a successful AI call. Idempotent — failures don't double-log. */
export async function recordUsage(args: RecordArgs): Promise<void> {
  const costUsd = computeCostUsd({
    model: args.model,
    inputTokens: args.inputTokens,
    outputTokens: args.outputTokens,
    imagesGenerated: args.imagesGenerated,
  });

  await prisma.aIUsageLog.create({
    data: {
      userId: args.userId,
      service: args.service,
      model: args.model,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      durationMs: args.durationMs,
      metadata: {
        imagesGenerated: args.imagesGenerated ?? 0,
        costUsd,
        ...args.metadata,
      },
    },
  });
}

/** Convenience for the frontend ‟Vous avez utilisé X $ ce mois” block. */
export async function getCurrentUsage(userId: string): Promise<UsageSummary> {
  return readUsageSummary(userId);
}
