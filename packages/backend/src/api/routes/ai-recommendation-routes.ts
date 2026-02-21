import { Router, type Router as RouterType } from 'express';
import { Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth-middleware';
import { aiRateLimiter } from '../middleware/rate-limit-middleware';
import { validateBody } from '../middleware/validation-middleware';
import { asyncHandler } from '../middleware/error-middleware';
import { ProductRecommendationService } from '../../services/ai/recommendation.service';

const router: RouterType = Router();
const recService = new ProductRecommendationService();

// --- Zod Schemas ---

const complementarySchema = z.object({
  currentItems: z.array(z.object({}).passthrough()).optional(),
  lastAddedItem: z.object({}).passthrough(),
  style: z.string().optional(),
  budget: z.number().positive().optional(),
});

/**
 * @swagger
 * /api/v1/ai-recommendations/complementary:
 *   post:
 *     summary: Get AI-powered complementary product recommendations
 *     tags: [AI Recommendations]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - lastAddedItem
 *             properties:
 *               currentItems:
 *                 type: array
 *                 items:
 *                   type: object
 *                 description: Items already in the kitchen design
 *               lastAddedItem:
 *                 type: object
 *                 description: The most recently added item
 *               style:
 *                 type: string
 *               budget:
 *                 type: number
 *     responses:
 *       200:
 *         description: Complementary product recommendations
 *       400:
 *         description: lastAddedItem is required
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
router.post(
  '/complementary',
  authenticate,
  aiRateLimiter,
  validateBody(complementarySchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { currentItems, lastAddedItem, style, budget } = req.body;
    if (!lastAddedItem) {
      res.status(400).json({ success: false, error: 'lastAddedItem is required' });
      return;
    }

    const result = await recService.getComplementaryProducts({
      currentItems: currentItems || [],
      lastAddedItem,
      style,
      budget,
      userId,
    });

    res.status(200).json({ success: true, data: result });
  })
);

export default router;
