import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';

import { adminController } from '../controllers/admin-controller';
import { authenticate, authorize } from '../middleware/auth-middleware';
import {
  validateBody,
  validateParams,
  validateQuery,
  commonSchemas,
} from '../middleware/validation-middleware';

const router: RouterType = Router();

// ==================== ZOD SCHEMAS ====================

const changeRoleSchema = z.object({
  role: z.enum(['user', 'admin', 'partner', 'designer'], { required_error: 'Role is required' }),
});

const userQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  role: z.enum(['user', 'admin', 'partner', 'designer']).optional(),
  search: z.string().optional(),
});

const reportQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

const bulkUpdateSchema = z
  .object({
    userIds: z.array(z.string().uuid()).min(1, 'At least one user ID is required'),
    action: z.enum(['suspend', 'activate', 'changeRole'], { required_error: 'Action is required' }),
    value: z.enum(['user', 'admin', 'partner', 'designer']).optional(),
  })
  .refine((data) => data.action !== 'changeRole' || data.value !== undefined, {
    message: 'Value (role) is required for changeRole action',
    path: ['value'],
  })
  .transform((data) => {
    // Strip any extra fields — only allow userIds, action, value
    return { userIds: data.userIds, action: data.action, value: data.value };
  });

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorize(['admin']));

// Dashboard

/**
 * @swagger
 * /api/v1/admin/dashboard:
 *   get:
 *     summary: Get admin dashboard data
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.get('/dashboard', adminController.getDashboard);

// User management

/**
 * @swagger
 * /api/v1/admin/users:
 *   get:
 *     summary: Get users list (admin only)
 *     tags: [Admin]
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
 *         name: role
 *         schema:
 *           type: string
 *           enum: [user, admin, partner, designer]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated list of users
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.get('/users', validateQuery(userQuerySchema), adminController.getUsers);

/**
 * @swagger
 * /api/v1/admin/users/bulk:
 *   patch:
 *     summary: Bulk update users (admin only)
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Users updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.patch('/users/bulk', validateBody(bulkUpdateSchema), adminController.bulkUpdateUsers);

/**
 * @swagger
 * /api/v1/admin/users/{id}/role:
 *   put:
 *     summary: Change user role (admin only)
 *     tags: [Admin]
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
 *             required: [role]
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [user, admin, partner, designer]
 *     responses:
 *       200:
 *         description: Role changed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 *       404:
 *         description: User not found
 */
router.put(
  '/users/:id/role',
  validateParams(commonSchemas.idParam),
  validateBody(changeRoleSchema),
  adminController.changeUserRole
);

/**
 * @swagger
 * /api/v1/admin/users/{id}/toggle-active:
 *   put:
 *     summary: Toggle user active status (admin only)
 *     tags: [Admin]
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
 *         description: User status toggled
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 *       404:
 *         description: User not found
 */
router.put(
  '/users/:id/toggle-active',
  validateParams(commonSchemas.idParam),
  adminController.toggleUserActive
);

/**
 * @swagger
 * /api/v1/admin/users/{id}:
 *   delete:
 *     summary: Delete user (admin only)
 *     tags: [Admin]
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
 *         description: User deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 *       404:
 *         description: User not found
 */
router.delete('/users/:id', validateParams(commonSchemas.idParam), adminController.deleteUser);

// System management

/**
 * @swagger
 * /api/v1/admin/system/info:
 *   get:
 *     summary: Get system info (admin only)
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: System information
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.get('/system/info', adminController.getSystemInfo);

/**
 * @swagger
 * /api/v1/admin/system/database:
 *   get:
 *     summary: Get database statistics (admin only)
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Database statistics
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.get('/system/database', adminController.getDatabaseStats);

// Maintenance

/**
 * @swagger
 * /api/v1/admin/maintenance/cleanup:
 *   post:
 *     summary: Run system cleanup (admin only)
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Cleanup completed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.post('/maintenance/cleanup', adminController.runCleanup);

/**
 * @swagger
 * /api/v1/admin/maintenance/reindex:
 *   post:
 *     summary: Reindex database (admin only)
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Reindex completed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.post('/maintenance/reindex', adminController.reindex);

// Configuration

/**
 * @swagger
 * /api/v1/admin/config:
 *   get:
 *     summary: Get application configuration (admin only)
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Application configuration
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.get('/config', adminController.getConfig);

// Reports

/**
 * @swagger
 * /api/v1/admin/reports/usage:
 *   get:
 *     summary: Get usage report (admin only)
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *     responses:
 *       200:
 *         description: Usage report data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.get('/reports/usage', validateQuery(reportQuerySchema), adminController.getUsageReport);

/**
 * @swagger
 * /api/v1/admin/reports/errors:
 *   get:
 *     summary: Get error report (admin only)
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *     responses:
 *       200:
 *         description: Error report data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.get('/reports/errors', validateQuery(reportQuerySchema), adminController.getErrorReport);

export default router;
