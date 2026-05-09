import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';

import { aiGeneratorController } from '../controllers/ai-generator-controller';
import { authenticate } from '../middleware/auth-middleware';
import { validateBody } from '../middleware/validation-middleware';

const router: RouterType = Router();

// ==================== ZOD SCHEMAS ====================

const generateSchema = z.object({
  projectId: z.string().uuid(),
  kitchenStyle: z.string().min(1).max(100),
  colorPalette: z.string().min(1).max(100).optional(),
  layoutPreference: z.string().min(1).max(100).optional(),
  numberOfDesigns: z.number().int().min(1).max(5).optional(),
}).passthrough();

const saveDesignSchema = z.object({
  generationId: z.string().min(1, 'generationId is required'),
  designId: z.string().min(1, 'designId is required'),
  projectId: z.string().uuid(),
});

// All AI generator routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/v1/ai-generator/preferences/{projectId}:
 *   get:
 *     summary: Get generation preferences for a project
 *     tags: [AI Generator]
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
 *         description: Generation preferences
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Project not found
 */
router.get('/preferences/:projectId', aiGeneratorController.getPreferences);

/**
 * @swagger
 * /api/v1/ai-generator/generate:
 *   post:
 *     summary: Generate AI kitchen designs
 *     tags: [AI Generator]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectId
 *               - kitchenStyle
 *             properties:
 *               projectId:
 *                 type: string
 *                 format: uuid
 *               kitchenStyle:
 *                 type: string
 *               colorPalette:
 *                 type: string
 *               layoutPreference:
 *                 type: string
 *               numberOfDesigns:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *     responses:
 *       200:
 *         description: Generation started successfully
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized
 */
router.post('/generate', validateBody(generateSchema), aiGeneratorController.generate);

/**
 * @swagger
 * /api/v1/ai-generator/results/{generationId}:
 *   get:
 *     summary: Poll for generation results
 *     tags: [AI Generator]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: generationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Generation results (may be pending or complete)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Generation not found
 */
router.get('/results/:generationId', aiGeneratorController.getResults);

/**
 * @swagger
 * /api/v1/ai-generator/save-design:
 *   post:
 *     summary: Save a generated design to a project
 *     tags: [AI Generator]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - generationId
 *               - designId
 *               - projectId
 *             properties:
 *               generationId:
 *                 type: string
 *               designId:
 *                 type: string
 *               projectId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Design saved successfully
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized
 */
router.post('/save-design', validateBody(saveDesignSchema), aiGeneratorController.saveDesign);

export default router;
