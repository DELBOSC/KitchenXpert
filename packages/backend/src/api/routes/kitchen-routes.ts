import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';

import { kitchenController } from '../controllers/kitchen-controller';
import { authenticate } from '../middleware/auth-middleware';
import { generalRateLimiter } from '../middleware/rate-limit-middleware';
import {
  validateBody,
  validateQuery,
  validateParams,
  commonSchemas,
} from '../middleware/validation-middleware';

const router: RouterType = Router();

// ==================== ZOD SCHEMAS ====================

const kitchenItemParams = z.object({
  kitchenId: z.string().uuid(),
  itemId: z.string().uuid(),
});

const projectIdParam = z.object({
  projectId: z.string().uuid(),
});

const createKitchenSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1, 'Name is required').max(200),
  style: z.string().optional(),
  layout: z
    .enum(['l_shaped', 'u_shaped', 'galley', 'island', 'peninsula', 'one_wall', 'open_plan'])
    .optional(),
  width: z.coerce.number().positive('Width must be positive'),
  length: z.coerce.number().positive('Length must be positive'),
  height: z.coerce.number().positive('Height must be positive').optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateKitchenSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  style: z.string().optional(),
  layout: z
    .enum(['l_shaped', 'u_shaped', 'galley', 'island', 'peninsula', 'one_wall', 'open_plan'])
    .optional(),
  width: z.coerce.number().positive().optional(),
  length: z.coerce.number().positive().optional(),
  height: z.coerce.number().positive().optional(),
  isGenerated: z.boolean().optional(),
  score: z.number().min(0).max(100).optional(),
  thumbnail: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const kitchenQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  style: z.string().optional(),
  layout: z.string().optional(),
  isGenerated: z.enum(['true', 'false']).optional(),
});

const exportQuerySchema = z.object({
  format: z.enum(['json', 'pdf', 'csv']).default('json'),
});

const shareLinkSchema = z.object({
  expiresIn: z.number().positive().optional(),
  allowEdit: z.boolean().optional(),
  password: z.string().min(4).optional(),
});

const thumbnailSchema = z.object({
  thumbnailUrl: z.string().url('Invalid thumbnail URL'),
});

// ==================== PUBLIC ROUTES (no auth) ====================

/**
 * @swagger
 * /api/v1/kitchens/shared/{shareId}:
 *   post:
 *     summary: Access kitchen via share link
 *     tags: [Kitchens]
 *     parameters:
 *       - in: path
 *         name: shareId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Shared kitchen data
 *       401:
 *         description: Invalid share link password
 *       404:
 *         description: Share link not found
 */
router.post('/shared/:shareId', generalRateLimiter, kitchenController.getByShareId);

// All routes below require authentication
router.use(authenticate);

// ==================== STATISTICS ====================

/**
 * @swagger
 * /api/v1/kitchens/stats:
 *   get:
 *     summary: Get kitchen statistics for current user
 *     tags: [Kitchens]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Kitchen statistics
 *       401:
 *         description: Unauthorized
 */
router.get('/stats', kitchenController.getStats);

// ==================== ARCHIVED ====================

/**
 * @swagger
 * /api/v1/kitchens/archived:
 *   get:
 *     summary: Get all archived kitchens for current user
 *     tags: [Kitchens]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of archived kitchens
 *       401:
 *         description: Unauthorized
 */
router.get('/archived', kitchenController.getArchived);

// ==================== PROJECT KITCHENS ====================

/**
 * @swagger
 * /api/v1/kitchens/project/{projectId}:
 *   get:
 *     summary: Get kitchens by project
 *     tags: [Kitchens]
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
 *         description: List of kitchens in the project
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Project not found
 */
router.get('/project/:projectId', validateParams(projectIdParam), kitchenController.getByProject);

// ==================== KITCHEN CRUD ====================

/**
 * @swagger
 * /api/v1/kitchens:
 *   get:
 *     summary: List all kitchens for current user
 *     tags: [Kitchens]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: style
 *         schema:
 *           type: string
 *       - in: query
 *         name: layout
 *         schema:
 *           type: string
 *       - in: query
 *         name: isGenerated
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *     responses:
 *       200:
 *         description: Paginated list of kitchens
 *       401:
 *         description: Unauthorized
 */
router.get('/', validateQuery(kitchenQuerySchema), kitchenController.getAll);

/**
 * @swagger
 * /api/v1/kitchens:
 *   post:
 *     summary: Create a new kitchen
 *     tags: [Kitchens]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [projectId, name, width, length]
 *             properties:
 *               projectId:
 *                 type: string
 *                 format: uuid
 *               name:
 *                 type: string
 *               style:
 *                 type: string
 *               layout:
 *                 type: string
 *                 enum: [l_shaped, u_shaped, galley, island, peninsula, one_wall, open_plan]
 *               width:
 *                 type: number
 *               length:
 *                 type: number
 *               height:
 *                 type: number
 *     responses:
 *       201:
 *         description: Kitchen created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', validateBody(createKitchenSchema), kitchenController.create);

/**
 * @swagger
 * /api/v1/kitchens/{id}:
 *   get:
 *     summary: Get kitchen by ID
 *     tags: [Kitchens]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Kitchen data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Kitchen not found
 */
router.get('/:id', validateParams(commonSchemas.idParam), kitchenController.getById);

/**
 * @swagger
 * /api/v1/kitchens/{id}:
 *   put:
 *     summary: Update kitchen
 *     tags: [Kitchens]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               style:
 *                 type: string
 *               layout:
 *                 type: string
 *                 enum: [l_shaped, u_shaped, galley, island, peninsula, one_wall, open_plan]
 *               width:
 *                 type: number
 *               length:
 *                 type: number
 *               height:
 *                 type: number
 *     responses:
 *       200:
 *         description: Kitchen updated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Kitchen not found
 */
router.put(
  '/:id',
  validateParams(commonSchemas.idParam),
  validateBody(updateKitchenSchema),
  kitchenController.update
);

/**
 * @swagger
 * /api/v1/kitchens/{id}:
 *   delete:
 *     summary: Delete kitchen (soft delete)
 *     tags: [Kitchens]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Kitchen deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Kitchen not found
 */
router.delete('/:id', validateParams(commonSchemas.idParam), kitchenController.delete);

// ==================== KITCHEN ACTIONS ====================

/**
 * @swagger
 * /api/v1/kitchens/{id}/duplicate:
 *   post:
 *     summary: Duplicate a kitchen
 *     tags: [Kitchens]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Kitchen duplicated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Kitchen not found
 */
router.post('/:id/duplicate', validateParams(commonSchemas.idParam), kitchenController.duplicate);

// ==================== CONFIGURATION ====================

/**
 * @swagger
 * /api/v1/kitchens/{id}/configuration:
 *   get:
 *     summary: Get kitchen configuration
 *     tags: [Kitchens]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Kitchen configuration
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Kitchen not found
 */
router.get(
  '/:id/configuration',
  validateParams(commonSchemas.idParam),
  kitchenController.getConfiguration
);

/**
 * @swagger
 * /api/v1/kitchens/{id}/configuration:
 *   put:
 *     summary: Update kitchen configuration
 *     tags: [Kitchens]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               layout:
 *                 type: string
 *                 enum: [l_shaped, u_shaped, galley, island, peninsula, one_wall, open_plan]
 *               style:
 *                 type: string
 *               countertopMaterial:
 *                 type: string
 *               cabinetFinish:
 *                 type: string
 *               backsplash:
 *                 type: string
 *               lighting:
 *                 type: string
 *     responses:
 *       200:
 *         description: Configuration updated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Kitchen not found
 */
router.put(
  '/:id/configuration',
  validateParams(commonSchemas.idParam),
  validateBody(
    z
      .object({
        layout: z
          .enum(['l_shaped', 'u_shaped', 'galley', 'island', 'peninsula', 'one_wall', 'open_plan'])
          .optional(),
        style: z.string().max(100).optional(),
        countertopMaterial: z.string().max(100).optional(),
        cabinetFinish: z.string().max(100).optional(),
        backsplash: z.string().max(100).optional(),
        lighting: z.string().max(100).optional(),
        metadata: z.record(z.unknown()).optional(),
      })
      .strict()
  ),
  kitchenController.updateConfiguration
);

// ==================== KITCHEN ITEMS ====================

/**
 * @swagger
 * /api/v1/kitchens/{id}/items:
 *   get:
 *     summary: Get all items in a kitchen
 *     tags: [Kitchens]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of kitchen items
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Kitchen not found
 */
router.get('/:id/items', validateParams(commonSchemas.idParam), kitchenController.getItems);

/**
 * @swagger
 * /api/v1/kitchens/{id}/items:
 *   post:
 *     summary: Add an item to a kitchen
 *     tags: [Kitchens]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId]
 *             properties:
 *               productId:
 *                 type: string
 *                 format: uuid
 *               quantity:
 *                 type: integer
 *                 default: 1
 *               position:
 *                 type: object
 *                 properties:
 *                   x:
 *                     type: number
 *                   y:
 *                     type: number
 *                   z:
 *                     type: number
 *               rotation:
 *                 type: number
 *     responses:
 *       201:
 *         description: Item added
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Kitchen not found
 */
router.post(
  '/:id/items',
  validateParams(commonSchemas.idParam),
  validateBody(
    z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().positive().default(1),
      position: z
        .object({
          x: z.number(),
          y: z.number(),
          z: z.number().optional(),
        })
        .optional(),
      rotation: z.number().optional(),
      metadata: z.record(z.unknown()).optional(),
    })
  ),
  kitchenController.addItem
);

/**
 * @swagger
 * /api/v1/kitchens/{kitchenId}/items/{itemId}:
 *   put:
 *     summary: Update a kitchen item
 *     tags: [Kitchens]
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
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantity:
 *                 type: integer
 *               position:
 *                 type: object
 *                 properties:
 *                   x:
 *                     type: number
 *                   y:
 *                     type: number
 *                   z:
 *                     type: number
 *               rotation:
 *                 type: number
 *     responses:
 *       200:
 *         description: Item updated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Item not found
 */
router.put(
  '/:kitchenId/items/:itemId',
  validateParams(kitchenItemParams),
  validateBody(
    z.object({
      quantity: z.number().int().positive().optional(),
      position: z
        .object({
          x: z.number(),
          y: z.number(),
          z: z.number().optional(),
        })
        .optional(),
      rotation: z.number().optional(),
      metadata: z.record(z.unknown()).optional(),
    })
  ),
  kitchenController.updateItem
);

/**
 * @swagger
 * /api/v1/kitchens/{kitchenId}/items/{itemId}:
 *   delete:
 *     summary: Remove an item from a kitchen
 *     tags: [Kitchens]
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
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Item removed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Item not found
 */
router.delete(
  '/:kitchenId/items/:itemId',
  validateParams(kitchenItemParams),
  kitchenController.removeItem
);

// ==================== ARCHIVE / RESTORE ====================

/**
 * @swagger
 * /api/v1/kitchens/{id}/archive:
 *   post:
 *     summary: Archive a kitchen
 *     tags: [Kitchens]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Kitchen archived
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Kitchen not found
 */
router.post('/:id/archive', validateParams(commonSchemas.idParam), kitchenController.archive);

/**
 * @swagger
 * /api/v1/kitchens/{id}/restore:
 *   post:
 *     summary: Restore an archived kitchen
 *     tags: [Kitchens]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Kitchen restored
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Kitchen not found
 */
router.post('/:id/restore', validateParams(commonSchemas.idParam), kitchenController.restore);

// ==================== 3D MODEL ====================

/**
 * @swagger
 * /api/v1/kitchens/{id}/model:
 *   get:
 *     summary: Get 3D model data for a kitchen
 *     tags: [Kitchens]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 3D model data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Kitchen not found
 */
router.get('/:id/model', validateParams(commonSchemas.idParam), kitchenController.getModel);

/**
 * @swagger
 * /api/v1/kitchens/{id}/thumbnail:
 *   put:
 *     summary: Update kitchen thumbnail
 *     tags: [Kitchens]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [thumbnailUrl]
 *             properties:
 *               thumbnailUrl:
 *                 type: string
 *                 format: uri
 *     responses:
 *       200:
 *         description: Thumbnail updated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Kitchen not found
 */
router.put(
  '/:id/thumbnail',
  validateParams(commonSchemas.idParam),
  validateBody(thumbnailSchema),
  kitchenController.updateThumbnail
);

// ==================== EXPORT ====================

/**
 * @swagger
 * /api/v1/kitchens/{id}/export:
 *   get:
 *     summary: Export kitchen data
 *     tags: [Kitchens]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, pdf, csv]
 *           default: json
 *     responses:
 *       200:
 *         description: Exported kitchen data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Kitchen not found
 */
router.get(
  '/:id/export',
  validateParams(commonSchemas.idParam),
  validateQuery(exportQuerySchema),
  kitchenController.exportKitchen
);

// ==================== SHARING ====================

/**
 * @swagger
 * /api/v1/kitchens/{id}/share:
 *   post:
 *     summary: Create a share link for a kitchen
 *     tags: [Kitchens]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               expiresIn:
 *                 type: number
 *               allowEdit:
 *                 type: boolean
 *               password:
 *                 type: string
 *                 minLength: 4
 *     responses:
 *       201:
 *         description: Share link created
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Kitchen not found
 */
router.post(
  '/:id/share',
  validateParams(commonSchemas.idParam),
  validateBody(shareLinkSchema),
  kitchenController.createShareLink
);

/**
 * @swagger
 * /api/v1/kitchens/{id}/share/{shareId}:
 *   delete:
 *     summary: Revoke a share link
 *     tags: [Kitchens]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: shareId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Share link revoked
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Share link not found
 */
router.delete(
  '/:id/share/:shareId',
  validateParams(z.object({ id: z.string().uuid(), shareId: z.string() })),
  kitchenController.revokeShareLink
);

export default router;
