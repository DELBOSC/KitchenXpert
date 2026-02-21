import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { roleController } from '../controllers/role-controller';
import { authenticate, authorize } from '../middleware/auth-middleware';
import { validateBody } from '../middleware/validation-middleware';

const router: RouterType = Router();

const createRoleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  permissionIds: z.array(z.string().uuid()).optional(),
});

const updateRoleSchema = createRoleSchema.partial();

const setPermissionsSchema = z.object({
  permissionIds: z.array(z.string().uuid()).min(0).max(200),
});

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorize(['admin']));

// Role CRUD

/**
 * @swagger
 * /api/v1/roles:
 *   get:
 *     summary: Get all roles (admin only)
 *     tags: [Roles]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of roles
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.get('/', roleController.getAll);

/**
 * @swagger
 * /api/v1/roles/{id}:
 *   get:
 *     summary: Get role by ID (admin only)
 *     tags: [Roles]
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
 *         description: Role data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 *       404:
 *         description: Role not found
 */
router.get('/:id', roleController.getById);

/**
 * @swagger
 * /api/v1/roles:
 *   post:
 *     summary: Create a new role (admin only)
 *     tags: [Roles]
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
 *               permissionIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       201:
 *         description: Role created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.post('/', validateBody(createRoleSchema), roleController.create);

/**
 * @swagger
 * /api/v1/roles/{id}:
 *   put:
 *     summary: Update role (admin only)
 *     tags: [Roles]
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
 *               permissionIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       200:
 *         description: Role updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 *       404:
 *         description: Role not found
 */
router.put('/:id', validateBody(updateRoleSchema), roleController.update);

/**
 * @swagger
 * /api/v1/roles/{id}:
 *   delete:
 *     summary: Delete role (admin only)
 *     tags: [Roles]
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
 *         description: Role deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 *       404:
 *         description: Role not found
 */
router.delete('/:id', roleController.delete);

// Role permissions

/**
 * @swagger
 * /api/v1/roles/{id}/permissions:
 *   get:
 *     summary: Get permissions for a role (admin only)
 *     tags: [Roles]
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
 *         description: List of permissions
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 *       404:
 *         description: Role not found
 */
router.get('/:id/permissions', roleController.getPermissions);

/**
 * @swagger
 * /api/v1/roles/{id}/permissions:
 *   put:
 *     summary: Set permissions for a role (admin only)
 *     tags: [Roles]
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
 *             required: [permissionIds]
 *             properties:
 *               permissionIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       200:
 *         description: Permissions set
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 *       404:
 *         description: Role not found
 */
router.put('/:id/permissions', validateBody(setPermissionsSchema), roleController.setPermissions);

/**
 * @swagger
 * /api/v1/roles/{id}/permissions/{permissionId}:
 *   post:
 *     summary: Add a permission to a role (admin only)
 *     tags: [Roles]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: permissionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Permission added
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 *       404:
 *         description: Role or permission not found
 */
router.post('/:id/permissions/:permissionId', roleController.addPermission);

/**
 * @swagger
 * /api/v1/roles/{id}/permissions/{permissionId}:
 *   delete:
 *     summary: Remove a permission from a role (admin only)
 *     tags: [Roles]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: permissionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Permission removed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 *       404:
 *         description: Role or permission not found
 */
router.delete('/:id/permissions/:permissionId', roleController.removePermission);

// Role users

/**
 * @swagger
 * /api/v1/roles/{id}/users:
 *   get:
 *     summary: Get users with a role (admin only)
 *     tags: [Roles]
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
 *         description: List of users
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 *       404:
 *         description: Role not found
 */
router.get('/:id/users', roleController.getUsers);

// User role management

/**
 * @swagger
 * /api/v1/roles/users/{userId}/roles/{roleId}:
 *   post:
 *     summary: Assign a role to a user (admin only)
 *     tags: [Roles]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Role assigned
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 *       404:
 *         description: User or role not found
 */
router.post('/users/:userId/roles/:roleId', roleController.assignToUser);

/**
 * @swagger
 * /api/v1/roles/users/{userId}/roles/{roleId}:
 *   delete:
 *     summary: Remove a role from a user (admin only)
 *     tags: [Roles]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Role removed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 *       404:
 *         description: User or role not found
 */
router.delete('/users/:userId/roles/:roleId', roleController.removeFromUser);

/**
 * @swagger
 * /api/v1/roles/users/{userId}/roles:
 *   get:
 *     summary: Get roles for a user (admin only)
 *     tags: [Roles]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of user roles
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 *       404:
 *         description: User not found
 */
router.get('/users/:userId/roles', roleController.getUserRoles);

/**
 * @swagger
 * /api/v1/roles/users/{userId}/permissions:
 *   get:
 *     summary: Get effective permissions for a user (admin only)
 *     tags: [Roles]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of user permissions
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 *       404:
 *         description: User not found
 */
router.get('/users/:userId/permissions', roleController.getUserPermissions);

export default router;
