import { Router, type Request, type Response, type Router as RouterType } from 'express';
import { z } from 'zod';

import { prisma } from '../../database/client';
import logger from '../../utils/logger';
import { carbonController } from '../controllers/carbon-controller';
import { authenticate } from '../middleware/auth-middleware';
import { asyncHandler } from '../middleware/error-middleware';
import { validateParams } from '../middleware/validation-middleware';

const router: RouterType = Router();

const kitchenIdParam = z.object({
  kitchenId: z.string().uuid(),
});

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/v1/carbon/calculate:
 *   post:
 *     summary: Calculate carbon footprint for a kitchen design
 *     tags: [Carbon]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               kitchenId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Carbon footprint calculation result
 *       401:
 *         description: Unauthorized
 */
router.post('/calculate', carbonController.calculateCarbon);
/**
 * @swagger
 * /api/v1/carbon/report/{kitchenId}:
 *   get:
 *     summary: Get carbon footprint report for a kitchen
 *     tags: [Carbon]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: kitchenId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Carbon footprint report
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Report not found
 */
router.get('/report/:kitchenId', validateParams(kitchenIdParam), carbonController.getCarbonReport);

/**
 * @swagger
 * /api/v1/carbon/eco-score/{kitchenId}:
 *   get:
 *     summary: Get eco score for a kitchen design
 *     tags: [Carbon]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: kitchenId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Eco score with grade (A-E) and breakdown
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not report owner
 */
router.get('/eco-score/:kitchenId', validateParams(kitchenIdParam), asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ success: false, error: 'User not authenticated' });
    return;
  }

  const { kitchenId } = req.params;
  if (!kitchenId) {
    res.status(400).json({ success: false, error: 'kitchenId is required' });
    return;
  }

  logger.info('[Carbon] Retrieving eco score', { userId, kitchenId });

  // Try to derive eco score from existing carbon report
  const report = await prisma.carbonReport.findUnique({
    where: { kitchenId },
  });

  if (!report) {
    // Return a stub eco score when no carbon report exists yet
    res.status(200).json({
      success: true,
      data: {
        kitchenId,
        ecoScore: null,
        grade: null,
        message: 'No carbon report available. Calculate carbon footprint first to get an eco score.',
      },
    });
    return;
  }

  // Verify ownership
  if (report.userId !== userId && req.user?.role !== 'admin') {
    res.status(403).json({ success: false, error: 'You do not have access to this report' });
    return;
  }

  const carbonData = report.breakdown as Record<string, unknown> | null;
  const totalCarbonKg = report.totalCO2kg ?? 0;

  // Calculate eco score (0-100, lower carbon = higher score)
  // Thresholds based on typical kitchen carbon footprints (kg CO2e)
  let ecoScore: number;
  let grade: string;
  if (totalCarbonKg <= 500) {
    ecoScore = 90 + Math.round((500 - totalCarbonKg) / 50);
    grade = 'A';
  } else if (totalCarbonKg <= 1000) {
    ecoScore = 70 + Math.round((1000 - totalCarbonKg) / 25);
    grade = 'B';
  } else if (totalCarbonKg <= 2000) {
    ecoScore = 50 + Math.round((2000 - totalCarbonKg) / 50);
    grade = 'C';
  } else if (totalCarbonKg <= 3500) {
    ecoScore = 30 + Math.round((3500 - totalCarbonKg) / 75);
    grade = 'D';
  } else {
    ecoScore = Math.max(0, 30 - Math.round((totalCarbonKg - 3500) / 200));
    grade = 'E';
  }

  ecoScore = Math.max(0, Math.min(100, ecoScore));

  res.status(200).json({
    success: true,
    data: {
      kitchenId,
      ecoScore,
      grade,
      totalCarbonKg,
      breakdown: carbonData || null,
      calculatedAt: report.createdAt,
    },
  });
}));

export default router;
