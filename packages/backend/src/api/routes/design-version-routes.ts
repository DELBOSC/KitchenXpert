import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { designVersionController } from '../controllers/design-version-controller';
import { authenticate } from '../middleware/auth-middleware';
import { validateBody, validateParams } from '../middleware/validation-middleware';

const router: RouterType = Router();

// ==================== ZOD SCHEMAS ====================

const createVersionSchema = z.object({
  kitchenId: z.string().uuid('Invalid kitchen ID'),
  label: z.string().max(200).optional(),
});

const kitchenIdParam = z.object({
  kitchenId: z.string().uuid('Invalid kitchen ID'),
});

const kitchenVersionParams = z.object({
  kitchenId: z.string().uuid('Invalid kitchen ID'),
  version: z.coerce.number().int().positive('Version must be a positive integer'),
});

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/v1/design-versions:
 *   post:
 *     summary: Create a new design version snapshot
 *     tags: [Design Versions]
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
 *               label:
 *                 type: string
 *                 maxLength: 200
 *     responses:
 *       201:
 *         description: Version created successfully
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/',
  validateBody(createVersionSchema),
  designVersionController.create,
);

/**
 * @swagger
 * /api/v1/design-versions/{kitchenId}:
 *   get:
 *     summary: List all versions for a kitchen design
 *     tags: [Design Versions]
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
 *         description: List of design versions
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Kitchen not found
 */
router.get(
  '/:kitchenId',
  validateParams(kitchenIdParam),
  designVersionController.listVersions,
);

/**
 * @swagger
 * /api/v1/design-versions/{kitchenId}/{version}:
 *   get:
 *     summary: Get a specific design version
 *     tags: [Design Versions]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: kitchenId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: version
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: Design version details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Version not found
 */
router.get(
  '/:kitchenId/:version',
  validateParams(kitchenVersionParams),
  designVersionController.getVersion,
);

/**
 * @swagger
 * /api/v1/design-versions/{kitchenId}/{version}/restore:
 *   post:
 *     summary: Restore a previous design version
 *     tags: [Design Versions]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: kitchenId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: version
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: Version restored successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Version not found
 */
router.post(
  '/:kitchenId/:version/restore',
  validateParams(kitchenVersionParams),
  designVersionController.restoreVersion,
);

/**
 * @swagger
 * /api/v1/design-versions/{kitchenId}/{version}:
 *   delete:
 *     summary: Delete a design version
 *     tags: [Design Versions]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: kitchenId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: version
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: Version deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Version not found
 */
router.delete(
  '/:kitchenId/:version',
  validateParams(kitchenVersionParams),
  designVersionController.deleteVersion,
);

export default router;
