/**
 * Reviews — endpoints consumed by the frontend modal.
 *
 *   GET    /me/reviews/pending   → does the current user have an
 *                                  open ReviewRequest? (drives the
 *                                  modal auto-open on next visit).
 *   POST   /me/reviews/respond   → submit the rating + optional msg.
 *                                  Returns either the external URL
 *                                  (rating ≥ 4) or null (rating ≤ 3).
 *   POST   /me/reviews/dismiss   → user closed the modal without
 *                                  rating. Marks request as
 *                                  responded so we don't re-prompt.
 *
 * All endpoints require auth.
 */
import { Router, type Router as RouterType, type Request, type Response } from 'express';
import { z } from 'zod';

import { prisma } from '../../database/client';
import {
  getPendingRequestForUser,
  recordReviewResponse,
  type ReviewPlatform,
} from '../../services/review-request.service';
import logger from '../../utils/logger';
import { authenticate } from '../middleware/auth-middleware';
import { validateBody } from '../middleware/validation-middleware';

const router: RouterType = Router();
router.use(authenticate);

// ─── GET /me/reviews/pending ────────────────────────────────────────────────
router.get('/pending', async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ success: false, error: 'unauth' });
    return;
  }
  const pending = await getPendingRequestForUser(userId);
  res.status(200).json({ success: true, data: pending });
});

// ─── POST /me/reviews/respond ───────────────────────────────────────────────
const respondSchema = z.object({
  requestId: z.string().uuid().optional(),
  rating: z.number().int().min(1).max(5),
  message: z.string().max(2000).optional(),
  context: z.string().max(200).optional(),
  preferredPlatform: z.enum(['g2', 'capterra', 'trustpilot', 'avis_verifies', 'google_business']).optional(),
});

router.post('/respond', validateBody(respondSchema), async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ success: false, error: 'unauth' });
    return;
  }
  const body = req.body as z.infer<typeof respondSchema>;
  try {
    const result = await recordReviewResponse({
      requestId: body.requestId,
      userId,
      rating: body.rating,
      message: body.message,
      context: body.context,
      preferredPlatform: body.preferredPlatform as ReviewPlatform | undefined,
    });
    res.status(201).json({ success: true, data: result });
  } catch (e) {
    logger.error('review respond failed', e);
    res.status(500).json({ success: false, error: 'review_response_failed' });
  }
});

// ─── POST /me/reviews/dismiss ───────────────────────────────────────────────
const dismissSchema = z.object({
  requestId: z.string().uuid(),
});

router.post('/dismiss', validateBody(dismissSchema), async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ success: false, error: 'unauth' });
    return;
  }
  const { requestId } = req.body as z.infer<typeof dismissSchema>;

  // Soft-dismiss: mark respondedAt with rating null. The cooldown
  // applies as if the user had rated, so we don't spam them.
  const updated = await prisma.reviewRequest.updateMany({
    where: { id: requestId, userId, respondedAt: null },
    data: { respondedAt: new Date() },
  });
  res.status(200).json({ success: true, data: { dismissed: updated.count > 0 } });
});

export default router;
