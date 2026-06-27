import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';

import { partnerController } from '../controllers/partner-controller';
import { authenticate, authorize } from '../middleware/auth-middleware';
import { validateBody } from '../middleware/validation-middleware';

const router: RouterType = Router();

const createPartnerSchema = z.object({
  name: z.string().min(1).max(200),
  code: z.string().min(1).max(50),
  email: z.string().email().max(255),
  phone: z.string().max(50).optional(),
  website: z.string().url().max(500).optional(),
  commissionRate: z.number().min(0).max(100).optional(),
  configuration: z.record(z.unknown()).optional(),
});

const updatePartnerSchema = createPartnerSchema.omit({ code: true }).partial();

const validateCredentialsSchema = z.object({
  apiKey: z.string().min(1),
  apiSecret: z.string().min(1),
});

const createIntegrationSchema = z.object({
  type: z.string().min(1).max(100),
  endpoint: z.string().url().max(1000).optional(),
  credentials: z.record(z.unknown()).optional(),
  configuration: z.record(z.unknown()).optional(),
});

const updateIntegrationSchema = createIntegrationSchema.partial().extend({
  isActive: z.boolean().optional(),
});

// All partner routes require authentication and admin role
router.use(authenticate);
router.use(authorize(['admin']));

// ==================== PARTNER CRUD ====================

/**
 * @swagger
 * /api/v1/partners:
 *   get:
 *     summary: Get all partners (admin only)
 *     tags: [Partners]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of partners
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.get('/', partnerController.getAll);

/**
 * @swagger
 * /api/v1/partners/count:
 *   get:
 *     summary: Get partner count (admin only)
 *     tags: [Partners]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Partner count
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.get('/count', partnerController.getCount);

/**
 * @swagger
 * /api/v1/partners/validate:
 *   post:
 *     summary: Validate partner credentials (admin only)
 *     tags: [Partners]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [apiKey, apiSecret]
 *             properties:
 *               apiKey:
 *                 type: string
 *               apiSecret:
 *                 type: string
 *     responses:
 *       200:
 *         description: Validation result
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.post(
  '/validate',
  validateBody(validateCredentialsSchema),
  partnerController.validateCredentials
);

/**
 * @swagger
 * /api/v1/partners/integrations/type/{type}:
 *   get:
 *     summary: Get integrations by type (admin only)
 *     tags: [Partners]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of integrations
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.get('/integrations/type/:type', partnerController.getIntegrationsByType);

/**
 * @swagger
 * /api/v1/partners/code/{code}:
 *   get:
 *     summary: Get partner by code (admin only)
 *     tags: [Partners]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Partner data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 *       404:
 *         description: Partner not found
 */
router.get('/code/:code', partnerController.getByCode);

/**
 * @swagger
 * /api/v1/partners/{id}:
 *   get:
 *     summary: Get partner by ID (admin only)
 *     tags: [Partners]
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
 *         description: Partner data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 *       404:
 *         description: Partner not found
 */
router.get('/:id', partnerController.getById);

/**
 * @swagger
 * /api/v1/partners:
 *   post:
 *     summary: Create new partner (admin only)
 *     tags: [Partners]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, code, email]
 *             properties:
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               website:
 *                 type: string
 *                 format: uri
 *               commissionRate:
 *                 type: number
 *     responses:
 *       201:
 *         description: Partner created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.post('/', validateBody(createPartnerSchema), partnerController.create);

/**
 * @swagger
 * /api/v1/partners/{id}:
 *   put:
 *     summary: Update partner (admin only)
 *     tags: [Partners]
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
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               website:
 *                 type: string
 *                 format: uri
 *               commissionRate:
 *                 type: number
 *     responses:
 *       200:
 *         description: Partner updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 *       404:
 *         description: Partner not found
 */
router.put('/:id', validateBody(updatePartnerSchema), partnerController.update);

/**
 * @swagger
 * /api/v1/partners/{id}:
 *   delete:
 *     summary: Delete partner (admin only)
 *     tags: [Partners]
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
 *         description: Partner deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 *       404:
 *         description: Partner not found
 */
router.delete('/:id', partnerController.delete);

// ==================== PARTNER ACTIONS ====================

/**
 * @swagger
 * /api/v1/partners/{id}/toggle:
 *   post:
 *     summary: Toggle partner active status (admin only)
 *     tags: [Partners]
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
 *         description: Partner status toggled
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 *       404:
 *         description: Partner not found
 */
router.post('/:id/toggle', partnerController.toggle);

/**
 * @swagger
 * /api/v1/partners/{id}/regenerate-credentials:
 *   post:
 *     summary: Regenerate partner API credentials (admin only)
 *     tags: [Partners]
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
 *         description: New credentials generated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 *       404:
 *         description: Partner not found
 */
router.post('/:id/regenerate-credentials', partnerController.regenerateCredentials);

// ==================== INTEGRATIONS ====================

/**
 * @swagger
 * /api/v1/partners/{id}/integrations:
 *   get:
 *     summary: Get partner integrations (admin only)
 *     tags: [Partners]
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
 *         description: List of integrations
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.get('/:id/integrations', partnerController.getIntegrations);

/**
 * @swagger
 * /api/v1/partners/{id}/integrations:
 *   post:
 *     summary: Create partner integration (admin only)
 *     tags: [Partners]
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
 *             required: [type]
 *             properties:
 *               type:
 *                 type: string
 *               endpoint:
 *                 type: string
 *                 format: uri
 *     responses:
 *       201:
 *         description: Integration created
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.post(
  '/:id/integrations',
  validateBody(createIntegrationSchema),
  partnerController.createIntegration
);

/**
 * @swagger
 * /api/v1/partners/{partnerId}/integrations/{integrationId}:
 *   put:
 *     summary: Update partner integration (admin only)
 *     tags: [Partners]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: partnerId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: integrationId
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
 *               type:
 *                 type: string
 *               endpoint:
 *                 type: string
 *                 format: uri
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Integration updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 *       404:
 *         description: Integration not found
 */
router.put(
  '/:partnerId/integrations/:integrationId',
  validateBody(updateIntegrationSchema),
  partnerController.updateIntegration
);

/**
 * @swagger
 * /api/v1/partners/{partnerId}/integrations/{integrationId}:
 *   delete:
 *     summary: Delete partner integration (admin only)
 *     tags: [Partners]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: partnerId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: integrationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Integration deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 *       404:
 *         description: Integration not found
 */
router.delete('/:partnerId/integrations/:integrationId', partnerController.deleteIntegration);

/**
 * @swagger
 * /api/v1/partners/{partnerId}/integrations/{integrationId}/sync:
 *   post:
 *     summary: Mark integration as synced (admin only)
 *     tags: [Partners]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: partnerId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: integrationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Integration marked as synced
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 *       404:
 *         description: Integration not found
 */
router.post(
  '/:partnerId/integrations/:integrationId/sync',
  partnerController.markIntegrationSynced
);

export default router;
