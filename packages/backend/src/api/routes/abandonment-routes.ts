import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth-middleware';
import { validateBody } from '../middleware/validation-middleware';
import { abandonmentController } from '../controllers/abandonment-controller';

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate);

// --- Zod Schemas ---

const analyzeSessionSchema = z.object({
  sessionData: z.object({
    events: z.array(z.object({
      type: z.string(),
      timestamp: z.string().or(z.number()).optional(),
    }).passthrough()),
  }).passthrough(),
});

/**
 * @swagger
 * /api/v1/abandonment/analyze:
 *   post:
 *     summary: Analyze a user session for abandonment signals
 *     tags: [Abandonment]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sessionId:
 *                 type: string
 *               events:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Abandonment analysis result
 *       401:
 *         description: Unauthorized
 */
router.post('/analyze', validateBody(analyzeSessionSchema), abandonmentController.analyzeSession);
/**
 * @swagger
 * /api/v1/abandonment/stats:
 *   get:
 *     summary: Get abandonment statistics (admin only)
 *     tags: [Abandonment]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Abandonment statistics
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.get('/stats', requireRole('admin'), abandonmentController.getStats);

export default router;
