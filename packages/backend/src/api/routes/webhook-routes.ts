import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { webhookController } from '../controllers/webhook-controller';
import { authenticate, authorize } from '../middleware/auth-middleware';
import { validateBody, validateParams, validateQuery, commonSchemas } from '../middleware/validation-middleware';

const router: RouterType = Router();

// ==================== ZOD SCHEMAS ====================

const createWebhookSchema = z.object({
  partnerId: z.string().uuid('Invalid partner ID'),
  name: z.string().min(1, 'Name is required').max(200),
  url: z.string().url('Invalid webhook URL'),
  events: z.array(z.string()).min(1, 'At least one event type is required'),
  headers: z.record(z.string()).optional(),
  retryCount: z.number().int().min(0).max(10).default(3),
  timeout: z.number().int().min(1000).max(30000).default(5000),
});

const updateWebhookSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  url: z.string().url('Invalid webhook URL').optional(),
  events: z.array(z.string()).min(1).optional(),
  headers: z.record(z.string()).optional(),
  isActive: z.boolean().optional(),
  retryCount: z.number().int().min(0).max(10).optional(),
  timeout: z.number().int().min(1000).max(30000).optional(),
});

const failedEventsQuerySchema = z.object({
  maxAttempts: z.coerce.number().int().min(1).max(20).default(3),
});

const eventsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(50),
});

const statsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

const cleanupSchema = z.object({
  olderThanDays: z.number().int().min(1).max(365).default(30),
});

// All routes require authentication and admin/partner role
router.use(authenticate);
router.use(authorize(['admin', 'partner']));

/**
 * @swagger
 * /api/v1/webhooks/failed:
 *   get:
 *     summary: Get failed webhook events
 *     tags: [Webhooks]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: maxAttempts
 *         schema:
 *           type: integer
 *           default: 3
 *     responses:
 *       200:
 *         description: List of failed events
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/failed', validateQuery(failedEventsQuerySchema), webhookController.getFailedEvents);

/**
 * @swagger
 * /api/v1/webhooks/events/cleanup:
 *   delete:
 *     summary: Cleanup old webhook events (admin only)
 *     tags: [Webhooks]
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
 *                 default: 30
 *     responses:
 *       200:
 *         description: Events cleaned up
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.delete('/events/cleanup', authorize(['admin']), validateBody(cleanupSchema), webhookController.cleanupEvents);

// Webhook CRUD

/**
 * @swagger
 * /api/v1/webhooks:
 *   get:
 *     summary: Get all webhooks
 *     tags: [Webhooks]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of webhooks
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/', webhookController.getAll);

/**
 * @swagger
 * /api/v1/webhooks/{id}:
 *   get:
 *     summary: Get webhook by ID
 *     tags: [Webhooks]
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
 *         description: Webhook data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Webhook not found
 */
router.get('/:id', validateParams(commonSchemas.idParam), webhookController.getById);

/**
 * @swagger
 * /api/v1/webhooks:
 *   post:
 *     summary: Create a new webhook
 *     tags: [Webhooks]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [partnerId, name, url, events]
 *             properties:
 *               partnerId:
 *                 type: string
 *                 format: uuid
 *               name:
 *                 type: string
 *               url:
 *                 type: string
 *                 format: uri
 *               events:
 *                 type: array
 *                 items:
 *                   type: string
 *               retryCount:
 *                 type: integer
 *                 default: 3
 *               timeout:
 *                 type: integer
 *                 default: 5000
 *     responses:
 *       201:
 *         description: Webhook created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', validateBody(createWebhookSchema), webhookController.create);

/**
 * @swagger
 * /api/v1/webhooks/{id}:
 *   put:
 *     summary: Update webhook
 *     tags: [Webhooks]
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
 *               url:
 *                 type: string
 *                 format: uri
 *               events:
 *                 type: array
 *                 items:
 *                   type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Webhook updated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Webhook not found
 */
router.put('/:id', validateParams(commonSchemas.idParam), validateBody(updateWebhookSchema), webhookController.update);

/**
 * @swagger
 * /api/v1/webhooks/{id}:
 *   delete:
 *     summary: Delete webhook
 *     tags: [Webhooks]
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
 *         description: Webhook deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Webhook not found
 */
router.delete('/:id', validateParams(commonSchemas.idParam), webhookController.delete);

// Webhook management

/**
 * @swagger
 * /api/v1/webhooks/{id}/toggle:
 *   post:
 *     summary: Toggle webhook active status
 *     tags: [Webhooks]
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
 *         description: Webhook toggled
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Webhook not found
 */
router.post('/:id/toggle', validateParams(commonSchemas.idParam), webhookController.toggle);

/**
 * @swagger
 * /api/v1/webhooks/{id}/test:
 *   post:
 *     summary: Send a test webhook event
 *     tags: [Webhooks]
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
 *         description: Test event sent
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Webhook not found
 */
router.post('/:id/test', validateParams(commonSchemas.idParam), webhookController.test);

/**
 * @swagger
 * /api/v1/webhooks/{id}/regenerate-secret:
 *   post:
 *     summary: Regenerate webhook signing secret
 *     tags: [Webhooks]
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
 *         description: New secret generated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Webhook not found
 */
router.post('/:id/regenerate-secret', validateParams(commonSchemas.idParam), webhookController.regenerateSecret);

// Webhook events and stats

/**
 * @swagger
 * /api/v1/webhooks/{id}/events:
 *   get:
 *     summary: Get webhook events
 *     tags: [Webhooks]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: List of webhook events
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Webhook not found
 */
router.get('/:id/events', validateParams(commonSchemas.idParam), validateQuery(eventsQuerySchema), webhookController.getEvents);

/**
 * @swagger
 * /api/v1/webhooks/{id}/stats:
 *   get:
 *     summary: Get webhook statistics
 *     tags: [Webhooks]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *     responses:
 *       200:
 *         description: Webhook statistics
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Webhook not found
 */
router.get('/:id/stats', validateParams(commonSchemas.idParam), validateQuery(statsQuerySchema), webhookController.getStats);

/**
 * @swagger
 * /api/v1/webhooks/{id}/delivery-rate:
 *   get:
 *     summary: Get webhook delivery rate
 *     tags: [Webhooks]
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
 *         description: Delivery rate data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Webhook not found
 */
router.get('/:id/delivery-rate', validateParams(commonSchemas.idParam), webhookController.getDeliveryRate);

export default router;
