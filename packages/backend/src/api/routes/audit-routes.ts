import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';

import { auditController } from '../controllers/audit-controller';
import { authenticate, authorize } from '../middleware/auth-middleware';
import { validateBody, validateParams, commonSchemas } from '../middleware/validation-middleware';

const router: RouterType = Router();

const cleanupSchema = z.object({
  olderThanDays: z.number().int().min(1).max(365).default(90),
});

const userIdParam = z.object({
  userId: z.string().uuid(),
});

const resourceParams = z.object({
  resource: z.string().min(1, 'Resource type is required'),
  resourceId: z.string().uuid(),
});

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorize(['admin']));

// Statistics and export

/**
 * @swagger
 * /api/v1/audit/stats:
 *   get:
 *     summary: Get audit log statistics (admin only)
 *     tags: [Audit]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Audit statistics
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.get('/stats', auditController.getStats);

/**
 * @swagger
 * /api/v1/audit/export:
 *   get:
 *     summary: Export audit logs (admin only)
 *     tags: [Audit]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Exported audit data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.get('/export', auditController.export);

/**
 * @swagger
 * /api/v1/audit/cleanup:
 *   delete:
 *     summary: Cleanup old audit logs (admin only)
 *     tags: [Audit]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               olderThanDays:
 *                 type: integer
 *                 default: 90
 *     responses:
 *       200:
 *         description: Audit logs cleaned up
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.delete('/cleanup', validateBody(cleanupSchema), auditController.cleanup);

// Audit logs

/**
 * @swagger
 * /api/v1/audit:
 *   get:
 *     summary: Get all audit logs (admin only)
 *     tags: [Audit]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of audit logs
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.get('/', auditController.getAll);

/**
 * @swagger
 * /api/v1/audit/{id}:
 *   get:
 *     summary: Get audit log by ID (admin only)
 *     tags: [Audit]
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
 *         description: Audit log entry
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 *       404:
 *         description: Audit log not found
 */
router.get('/:id', validateParams(commonSchemas.idParam), auditController.getById);

// User audit logs

/**
 * @swagger
 * /api/v1/audit/user/{userId}:
 *   get:
 *     summary: Get audit logs for a user (admin only)
 *     tags: [Audit]
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
 *         description: User audit logs
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.get('/user/:userId', validateParams(userIdParam), auditController.getByUser);

/**
 * @swagger
 * /api/v1/audit/user/{userId}/activity:
 *   get:
 *     summary: Get user activity summary (admin only)
 *     tags: [Audit]
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
 *         description: User activity data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.get('/user/:userId/activity', validateParams(userIdParam), auditController.getUserActivity);

// Resource audit logs

/**
 * @swagger
 * /api/v1/audit/resource/{resource}/{resourceId}:
 *   get:
 *     summary: Get audit logs for a resource (admin only)
 *     tags: [Audit]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: resource
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: resourceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Resource audit logs
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.get('/resource/:resource/:resourceId', validateParams(resourceParams), auditController.getByResource);

/**
 * @swagger
 * /api/v1/audit/resource/{resource}/{resourceId}/history:
 *   get:
 *     summary: Get resource change history (admin only)
 *     tags: [Audit]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: resource
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: resourceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Resource history
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.get('/resource/:resource/:resourceId/history', validateParams(resourceParams), auditController.getResourceHistory);

export default router;
