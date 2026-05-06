import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { bomController } from '../controllers/bom-controller';
import { authenticate } from '../middleware/auth-middleware';
import { validateBody } from '../middleware/validation-middleware';

const router: RouterType = Router();

// ==================== ZOD SCHEMAS ====================

const generateBOMSchema = z.object({
  kitchenId: z.string().uuid('Invalid kitchen ID'),
});

// All BOM routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/v1/bom/generate:
 *   post:
 *     summary: Generate a Bill of Materials for a kitchen design
 *     tags: [BOM]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - kitchenId
 *             properties:
 *               kitchenId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Generated BOM
 *       400:
 *         description: Invalid kitchen ID
 *       401:
 *         description: Unauthorized
 */
router.post('/generate', validateBody(generateBOMSchema), bomController.generate);

export default router;
