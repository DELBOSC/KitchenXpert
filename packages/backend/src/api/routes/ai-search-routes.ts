import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth-middleware';
import { aiRateLimiter } from '../middleware/rate-limit-middleware';
import { validateBody } from '../middleware/validation-middleware';
import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/error-middleware';
import { AICatalogSearchService } from '../../services/ai/catalog-search.service';

const router: RouterType = Router();
const searchService = new AICatalogSearchService();

// --- Zod Schemas ---

const catalogSearchSchema = z.object({
  query: z.string().min(1, 'query is required'),
});

/**
 * @swagger
 * /api/v1/ai-search/catalog:
 *   post:
 *     summary: AI-powered catalog search
 *     tags: [AI Search]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *             properties:
 *               query:
 *                 type: string
 *                 description: Natural language search query
 *     responses:
 *       200:
 *         description: Search results
 *       400:
 *         description: Missing or invalid query
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
router.post('/catalog', authenticate, aiRateLimiter, validateBody(catalogSearchSchema), asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ success: false, error: 'Not authenticated' });
    return;
  }

  const { query } = req.body;
  if (!query || typeof query !== 'string') {
    res.status(400).json({ success: false, error: 'query is required' });
    return;
  }

  const result = await searchService.search({ query, userId });
  res.status(200).json({ success: true, data: result });
}));

export default router;
