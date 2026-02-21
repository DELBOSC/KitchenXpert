/**
 * Renovation Routes (F7)
 *
 * Before/After renovation workflow:
 * - Create renovation projects
 * - Analyze existing kitchen photos with AI
 * - Generate before/after comparisons
 * - List user's renovation projects
 */

import { Router, type Router as RouterType } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { authenticate } from '../middleware/auth-middleware';
import { validateBody, validateParams } from '../middleware/validation-middleware';
import { uploadSingleImage, handleUploadError } from '../../middleware/upload-middleware';
import { renovationController } from '../controllers/renovation-controller';

const router: RouterType = Router();

// ─── Validation schemas ──────────────────────────────────────────────────────

const idParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

const createProjectSchema = z.object({
  kitchenId: z.string().uuid('Invalid kitchen ID').optional(),
  beforePhotos: z.array(z.string().url()).max(10).optional(),
});

// Rate limiter for expensive Claude Vision API calls
const renovationAnalysisRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 analyses per hour per user
  message: {
    success: false,
    error: { code: 'RATE_LIMIT', message: 'Trop d\'analyses. Reessayez dans une heure.' },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// All routes require authentication
router.use(authenticate);

// ── IMPORTANT: static routes BEFORE parametric routes ──

/**
 * @swagger
 * /api/v1/renovation/my-projects:
 *   get:
 *     summary: List user's renovation projects
 *     description: Returns all renovation projects for the authenticated user
 *     tags: [Renovation]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of renovation projects
 *       401:
 *         description: Unauthorized
 */
router.get('/my-projects', renovationController.listMyProjects);

/**
 * @swagger
 * /api/v1/renovation/analyze-photo:
 *   post:
 *     summary: Analyze existing kitchen photo with AI
 *     description: Upload a kitchen photo for AI-powered analysis. Identifies cabinets, appliances, countertop, condition, and estimates demolition cost.
 *     tags: [Renovation]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - photo
 *             properties:
 *               photo:
 *                 type: string
 *                 format: binary
 *                 description: Kitchen photo (max 10MB, JPEG/PNG/WebP)
 *               projectId:
 *                 type: string
 *                 description: Optional renovation project ID to update with analysis
 *     responses:
 *       200:
 *         description: Structured analysis of existing kitchen
 *       400:
 *         description: No photo provided
 *       401:
 *         description: Unauthorized
 *       413:
 *         description: Photo too large (max 10MB)
 *       429:
 *         description: Rate limit exceeded
 */
router.post(
  '/analyze-photo',
  renovationAnalysisRateLimiter,
  uploadSingleImage('photo'),
  handleUploadError as any,
  renovationController.analyzePhoto,
);

/**
 * @swagger
 * /api/v1/renovation:
 *   post:
 *     summary: Create a renovation project
 *     description: Create a new renovation project for tracking before/after comparison
 *     tags: [Renovation]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               kitchenId:
 *                 type: string
 *                 description: Optional existing kitchen ID to link
 *               beforePhotos:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Optional list of before photo URLs
 *     responses:
 *       201:
 *         description: Renovation project created
 *       401:
 *         description: Unauthorized
 */
router.post('/', validateBody(createProjectSchema), renovationController.createProject);

/**
 * @swagger
 * /api/v1/renovation/{id}:
 *   get:
 *     summary: Get a renovation project by ID
 *     description: Returns a renovation project. Ownership is verified (user must own the project or be admin).
 *     tags: [Renovation]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Renovation project ID
 *     responses:
 *       200:
 *         description: Renovation project data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Project not found or access denied
 */
router.get('/:id', validateParams(idParamSchema), renovationController.getProject);

/**
 * @swagger
 * /api/v1/renovation/{id}/compare:
 *   get:
 *     summary: Get before/after comparison
 *     description: Generates or returns cached comparison data between existing kitchen and new design. Requires existing analysis and a linked after design.
 *     tags: [Renovation]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Renovation project ID
 *     responses:
 *       200:
 *         description: Before/after comparison metrics
 *       400:
 *         description: Missing analysis or design link
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Project not found
 */
router.get('/:id/compare', validateParams(idParamSchema), renovationController.getComparison);

export default router;
