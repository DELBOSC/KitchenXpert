import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { questionnaireController } from '../controllers/questionnaire-controller';
import { authenticate } from '../middleware/auth-middleware';
import { validateBody } from '../middleware/validation-middleware';
import { aiRateLimiter } from '../middleware/rate-limit-middleware';

const router: RouterType = Router();

// ==================== ZOD SCHEMAS ====================

const sectionDataSchema = z.object({
  data: z.record(z.unknown()).refine((val) => Object.keys(val).length > 0, {
    message: 'Section data must not be empty',
  }),
}).passthrough();

// All questionnaire routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/v1/questionnaire/progress:
 *   get:
 *     summary: Get questionnaire progress for current user
 *     tags: [Questionnaire]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Questionnaire progress data
 *       401:
 *         description: Unauthorized
 */
router.get('/progress', questionnaireController.getProgress);

/**
 * @swagger
 * /api/v1/questionnaire/auto-bridge:
 *   get:
 *     summary: Get auto-bridge data for questionnaire
 *     tags: [Questionnaire]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Auto-bridge data
 *       401:
 *         description: Unauthorized
 */
router.get('/auto-bridge', questionnaireController.getAutoBridgeData);

/**
 * @swagger
 * /api/v1/questionnaire/auto-generate:
 *   post:
 *     summary: Generate 3 kitchen designs from questionnaire data
 *     description: >
 *       Generates 3 kitchen designs at different budget tiers (economique, confort, premium)
 *       based on the user's completed questionnaire data. This is an AI-powered operation
 *       that may take 10-30 seconds to complete.
 *     tags: [Questionnaire]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Three generated designs with quotes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     designs:
 *                       type: array
 *                       items:
 *                         type: object
 *                     generationId:
 *                       type: string
 *       400:
 *         description: Missing required questionnaire data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: No questionnaire data found
 */
router.post('/auto-generate', aiRateLimiter, questionnaireController.autoGenerate);

// Section endpoints -- GET (load) and POST (save) for each section
const validSections = ['user-profile', 'spatial-constraints', 'style-preferences', 'budget-planning'];

/**
 * @swagger
 * /api/v1/questionnaire/{section}/ai-tips:
 *   post:
 *     summary: Get AI-generated tips for a questionnaire section
 *     tags: [Questionnaire]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: section
 *         required: true
 *         schema:
 *           type: string
 *           enum: [user-profile, spatial-constraints, style-preferences, budget-planning]
 *     responses:
 *       200:
 *         description: AI tips for the section
 *       400:
 *         description: Invalid section
 *       401:
 *         description: Unauthorized
 */
router.post('/:section/ai-tips', (req, res, next) => {
  const section = req.params['section'] || '';
  if (!validSections.includes(section)) {
    res.status(400).json({
      success: false,
      error: `Invalid section. Must be one of: ${validSections.join(', ')}`,
    });
    return;
  }
  next();
}, aiRateLimiter, questionnaireController.getAITips);

/**
 * @swagger
 * /api/v1/questionnaire/{section}:
 *   get:
 *     summary: Get questionnaire section data
 *     tags: [Questionnaire]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: section
 *         required: true
 *         schema:
 *           type: string
 *           enum: [user-profile, spatial-constraints, style-preferences, budget-planning]
 *     responses:
 *       200:
 *         description: Section data
 *       400:
 *         description: Invalid section
 *       401:
 *         description: Unauthorized
 */
router.get('/:section', (req, res, next) => {
  const section = req.params['section'] || '';
  if (!validSections.includes(section)) {
    res.status(400).json({
      success: false,
      error: `Invalid section. Must be one of: ${validSections.join(', ')}`,
    });
    return;
  }
  next();
}, questionnaireController.getSection);

/**
 * @swagger
 * /api/v1/questionnaire/{section}:
 *   post:
 *     summary: Save questionnaire section data
 *     tags: [Questionnaire]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: section
 *         required: true
 *         schema:
 *           type: string
 *           enum: [user-profile, spatial-constraints, style-preferences, budget-planning]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [data]
 *             properties:
 *               data:
 *                 type: object
 *     responses:
 *       200:
 *         description: Section data saved
 *       400:
 *         description: Invalid section or validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/:section', (req, res, next) => {
  const section = req.params['section'] || '';
  if (!validSections.includes(section)) {
    res.status(400).json({
      success: false,
      error: `Invalid section. Must be one of: ${validSections.join(', ')}`,
    });
    return;
  }
  next();
}, validateBody(sectionDataSchema), questionnaireController.saveSection);

export default router;
