/**
 * AI features routes — auto-layout, snapit, style-transfer.
 *
 * The chat assistant has its own surface (`ai-chat-routes.ts` already
 * exists). Here we only add the 3 new pipelines.
 *
 * Quota errors (`QuotaExceededError`, `DailyQuotaExceededError`)
 * surface as HTTP 402 Payment Required so the frontend can render the
 * upgrade modal directly without a string match on the error message.
 */
import { Router, type Router as RouterType, type Request, type Response } from 'express';

import {
  QuotaExceededError,
  DailyQuotaExceededError,
  type AiTier,
} from '../../services/ai/cost-monitor.service';
import { generateLayoutFromPrompt } from '../../use-cases/ai/generate-layout.use-case';
import { recognizeKitchenItems } from '../../use-cases/ai/recognize-photo.use-case';
import { styleTransfer } from '../../use-cases/ai/style-transfer.use-case';
import logger from '../../utils/logger';
import { authenticate } from '../middleware/auth-middleware';
import { aiRateLimiter } from '../middleware/rate-limit-middleware';

const router: RouterType = Router();
router.use(authenticate);
router.use(aiRateLimiter);

/**
 * Derive the user's AI tier from the JWT payload + (optionally) the
 * subscription row. Simple version : payload.role-based mapping. Wire
 * this to the real Subscription model when subscriptions land.
 */
function deriveTier(req: Request): AiTier {
  const role = req.user?.role;
  if (role === 'admin') {
    return 'studio';
  }
  // TODO: read `subscription.tier` from the User → Subscription join.
  const subTier = (req.user as unknown as { subscriptionTier?: string })?.subscriptionTier;
  if (subTier === 'studio') {
    return 'studio';
  }
  if (subTier === 'premium') {
    return 'premium';
  }
  return 'free';
}

function handleQuotaError(e: unknown, res: Response): boolean {
  if (e instanceof QuotaExceededError) {
    res.status(402).json({
      success: false,
      error: {
        code: 'AI_QUOTA_EXCEEDED',
        message: e.message,
        tier: e.tier,
        limit: e.limit,
        currentUsd: e.currentUsd,
        resetAt: e.resetAt,
      },
    });
    return true;
  }
  if (e instanceof DailyQuotaExceededError) {
    res.status(429).json({
      success: false,
      error: {
        code: 'AI_DAILY_LIMIT',
        message: e.message,
        tier: e.tier,
        limit: e.limit,
        current: e.current,
      },
    });
    return true;
  }
  return false;
}

// ─── POST /api/v1/ai/auto-layout ────────────────────────────────────────────
router.post('/auto-layout', async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ success: false, error: 'unauth' });
    return;
  }
  try {
    const result = await generateLayoutFromPrompt({
      userId,
      tier: deriveTier(req),
      input: req.body,
      generatePreviews: Boolean(req.body.generatePreviews),
    });
    res.status(200).json({ success: true, data: result });
  } catch (e) {
    if (handleQuotaError(e, res)) {
      return;
    }
    logger.error('auto-layout failed', { userId, error: e instanceof Error ? e.message : e });
    res.status(500).json({ success: false, error: 'auto_layout_failed' });
  }
});

// ─── POST /api/v1/ai/snapit ─────────────────────────────────────────────────
router.post('/snapit', async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ success: false, error: 'unauth' });
    return;
  }
  try {
    const result = await recognizeKitchenItems({
      userId,
      tier: deriveTier(req),
      input: req.body,
    });
    res.status(200).json({ success: true, data: result });
  } catch (e) {
    if (handleQuotaError(e, res)) {
      return;
    }
    logger.error('snapit failed', { userId, error: e instanceof Error ? e.message : e });
    res.status(500).json({ success: false, error: 'snapit_failed' });
  }
});

// ─── POST /api/v1/ai/style-transfer ─────────────────────────────────────────
router.post('/style-transfer', async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ success: false, error: 'unauth' });
    return;
  }
  try {
    const result = await styleTransfer({
      userId,
      tier: deriveTier(req),
      input: req.body,
    });
    res.status(200).json({ success: true, data: result });
  } catch (e) {
    if (handleQuotaError(e, res)) {
      return;
    }
    logger.error('style-transfer failed', { userId, error: e instanceof Error ? e.message : e });
    res.status(500).json({ success: false, error: 'style_transfer_failed' });
  }
});

export default router;
