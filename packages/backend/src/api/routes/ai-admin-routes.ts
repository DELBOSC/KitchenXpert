import { Router, type Router as RouterType, type Request, type Response } from 'express';

import { AdminInsightsService } from '../../services/ai/admin-insights.service';
import { authenticate } from '../middleware/auth-middleware';
import { asyncHandler } from '../middleware/error-middleware';
import { aiRateLimiter } from '../middleware/rate-limit-middleware';

const router: RouterType = Router();
const insightsService = new AdminInsightsService();

/**
 * @swagger
 * /api/v1/ai-admin/insights:
 *   post:
 *     summary: Generate AI-powered admin dashboard insights
 *     tags: [AI Admin]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Dashboard summary insights
 *       403:
 *         description: Admin access required
 *       429:
 *         description: Rate limit exceeded
 */
router.post(
  '/insights',
  authenticate,
  aiRateLimiter,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId || req.user?.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Admin access required' });
      return;
    }

    const summary = await insightsService.generateDashboardSummary(userId);
    res.status(200).json({ success: true, data: { summary } });
  })
);

export default router;
