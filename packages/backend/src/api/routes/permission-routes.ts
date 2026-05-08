import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';

import { permissionController } from '../controllers/permission-controller';
import { authenticate, authorize } from '../middleware/auth-middleware';
import { validateBody } from '../middleware/validation-middleware';

const router: RouterType = Router();

const createPermissionSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  resource: z.string().min(1).max(100).optional(),
  action: z.string().min(1).max(100).optional(),
});

const updatePermissionSchema = createPermissionSchema.partial();

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorize(['admin']));

// Permission metadata (before CRUD)

/**
 * @swagger
 * /api/v1/permissions/resources:
 *   get:
 *     summary: Get all permission resources (admin only)
 *     tags: [Permissions]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of resources
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.get('/resources', permissionController.getResources);

/**
 * @swagger
 * /api/v1/permissions/actions:
 *   get:
 *     summary: Get all permission actions (admin only)
 *     tags: [Permissions]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of actions
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.get('/actions', permissionController.getActions);

/**
 * @swagger
 * /api/v1/permissions/grouped:
 *   get:
 *     summary: Get permissions grouped by resource (admin only)
 *     tags: [Permissions]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Grouped permissions
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.get('/grouped', permissionController.getGrouped);

/**
 * @swagger
 * /api/v1/permissions/check:
 *   get:
 *     summary: Check a specific permission (admin only)
 *     tags: [Permissions]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Permission check result
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.get('/check', permissionController.check);

// Seeding

/**
 * @swagger
 * /api/v1/permissions/seed:
 *   post:
 *     summary: Seed default permissions (admin only)
 *     tags: [Permissions]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Default permissions seeded
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.post('/seed', permissionController.seedDefaults);

/**
 * @swagger
 * /api/v1/permissions/seed/{resource}:
 *   post:
 *     summary: Seed permissions for a specific resource (admin only)
 *     tags: [Permissions]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: resource
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Resource permissions seeded
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.post('/seed/:resource', permissionController.seedResource);

// Permission CRUD

/**
 * @swagger
 * /api/v1/permissions:
 *   get:
 *     summary: Get all permissions (admin only)
 *     tags: [Permissions]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of permissions
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.get('/', permissionController.getAll);

/**
 * @swagger
 * /api/v1/permissions/{id}:
 *   get:
 *     summary: Get permission by ID (admin only)
 *     tags: [Permissions]
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
 *         description: Permission data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 *       404:
 *         description: Permission not found
 */
router.get('/:id', permissionController.getById);

/**
 * @swagger
 * /api/v1/permissions:
 *   post:
 *     summary: Create a new permission (admin only)
 *     tags: [Permissions]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               resource:
 *                 type: string
 *               action:
 *                 type: string
 *     responses:
 *       201:
 *         description: Permission created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.post('/', validateBody(createPermissionSchema), permissionController.create);

/**
 * @swagger
 * /api/v1/permissions/{id}:
 *   put:
 *     summary: Update permission (admin only)
 *     tags: [Permissions]
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
 *               description:
 *                 type: string
 *               resource:
 *                 type: string
 *               action:
 *                 type: string
 *     responses:
 *       200:
 *         description: Permission updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 *       404:
 *         description: Permission not found
 */
router.put('/:id', validateBody(updatePermissionSchema), permissionController.update);

/**
 * @swagger
 * /api/v1/permissions/{id}:
 *   delete:
 *     summary: Delete permission (admin only)
 *     tags: [Permissions]
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
 *         description: Permission deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 *       404:
 *         description: Permission not found
 */
router.delete('/:id', permissionController.delete);

export default router;
