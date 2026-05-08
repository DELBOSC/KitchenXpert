import { Router, type Router as RouterType , type Request, type Response } from 'express';
import { z } from 'zod';

import { prisma } from '../../database/client';
import { ProjectAssistantService } from '../../services/ai/project-assistant.service';
import { authenticate } from '../middleware/auth-middleware';
import { asyncHandler } from '../middleware/error-middleware';
import { aiRateLimiter } from '../middleware/rate-limit-middleware';
import { validateBody } from '../middleware/validation-middleware';

const router: RouterType = Router();
const projectAssistant = new ProjectAssistantService();

// --- Zod Schemas ---

const describeProjectSchema = z.object({
  projectName: z.string().optional(),
  projectId: z.string().uuid().optional(),
});

const compareDesignsSchema = z.object({
  designs: z.array(z.object({}).passthrough()).min(2, 'At least 2 designs are required'),
});

/**
 * @swagger
 * /api/v1/ai-project/describe:
 *   post:
 *     summary: Generate an AI project description
 *     tags: [AI Project]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               projectName:
 *                 type: string
 *               projectId:
 *                 type: string
 *                 format: uuid
 *                 description: Optional project ID to pull questionnaire data
 *     responses:
 *       200:
 *         description: Generated project description
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
router.post(
  '/describe',
  authenticate,
  aiRateLimiter,
  validateBody(describeProjectSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { projectName, projectId } = req.body;
    let questionnaireData: Record<string, unknown> | undefined;

    if (projectId) {
      // Verify project ownership
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (project && (project.userId === userId || req.user?.role === 'admin')) {
        const qr = await prisma.questionnaireResponse.findUnique({
          where: { projectId },
        });
        if (qr) {
          questionnaireData = {
            spatialData: qr.spatialData,
            cookingHabits: qr.cookingHabits,
            userProfile: qr.userProfile,
            budgetData: qr.budgetData,
            aestheticPrefs: qr.aestheticPrefs,
          };
        }
      }
    }

    const description = await projectAssistant.generateProjectDescription({
      projectName,
      questionnaireData,
      userId,
    });
    res.status(200).json({ success: true, data: { description } });
  })
);

/**
 * @swagger
 * /api/v1/ai-project/compare-designs:
 *   post:
 *     summary: Compare multiple kitchen designs using AI
 *     tags: [AI Project]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - designs
 *             properties:
 *               designs:
 *                 type: array
 *                 items:
 *                   type: object
 *                 minItems: 2
 *                 description: At least 2 designs to compare
 *     responses:
 *       200:
 *         description: Comparison results
 *       400:
 *         description: At least 2 designs are required
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
router.post(
  '/compare-designs',
  authenticate,
  aiRateLimiter,
  validateBody(compareDesignsSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { designs } = req.body;
    if (!designs || !Array.isArray(designs) || designs.length < 2) {
      res.status(400).json({ success: false, error: 'At least 2 designs are required' });
      return;
    }

    const result = await projectAssistant.compareDesigns({ designs, userId });
    res.status(200).json({ success: true, data: result });
  })
);

/**
 * @swagger
 * /api/v1/ai-project/recommendations/{projectId}:
 *   get:
 *     summary: Get AI progress recommendations for a project
 *     tags: [AI Project]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Progress recommendations
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Project not found
 *       429:
 *         description: Rate limit exceeded
 */
router.get(
  '/recommendations/:projectId',
  authenticate,
  aiRateLimiter,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { projectId } = req.params;
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        kitchens: {
          where: { deletedAt: null },
          select: { name: true, style: true, score: true },
        },
      },
    });

    if (!project || (project.userId !== userId && req.user?.role !== 'admin')) {
      res.status(404).json({ success: false, error: 'Project not found' });
      return;
    }

    const qr = await prisma.questionnaireResponse.findUnique({
      where: { projectId },
    });
    const hasDesigns = project.kitchens.some((k) => k.score !== null);

    const result = await projectAssistant.getProgressRecommendations({
      project: {
        name: project.name,
        status: project.status,
        kitchens: project.kitchens.map((k) => ({
          name: k.name,
          style: k.style,
          score: k.score,
        })),
        createdAt: project.createdAt.toISOString(),
      },
      hasQuestionnaire: !!qr,
      hasDesigns,
      userId,
    });

    res.status(200).json({ success: true, data: result });
  })
);

export default router;
