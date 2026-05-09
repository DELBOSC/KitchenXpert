import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';

import { quoteController } from '../controllers/quote-controller';
import { authenticate } from '../middleware/auth-middleware';
import { validateBody, validateParams, commonSchemas } from '../middleware/validation-middleware';

const router: RouterType = Router();

// ─── Validation Schemas ───────────────────────────────────────────────────────

const sendQuoteSchema = z.object({
  kitchenId: z.string().uuid(),
  partnerId: z.string().uuid(),
  message: z.string().max(2000).optional(),
  timeline: z.enum(['1-3months', '3-6months', '6-12months', 'flexible']).optional(),
  contactInfo: z.object({
    name: z.string().max(200).optional(),
    email: z.string().email('Invalid contact email').max(255),
    phone: z.string().max(50).optional(),
  }),
});

// All quote routes require authentication
router.use(authenticate);

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/quotes/send:
 *   post:
 *     summary: Send a quote request to a partner
 *     tags: [Quotes]
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
 *               - partnerId
 *               - contactInfo
 *             properties:
 *               kitchenId:
 *                 type: string
 *                 format: uuid
 *               partnerId:
 *                 type: string
 *                 format: uuid
 *               message:
 *                 type: string
 *                 maxLength: 2000
 *               timeline:
 *                 type: string
 *                 enum: [1-3months, 3-6months, 6-12months, flexible]
 *               contactInfo:
 *                 type: object
 *                 required:
 *                   - email
 *                 properties:
 *                   name:
 *                     type: string
 *                   email:
 *                     type: string
 *                     format: email
 *                   phone:
 *                     type: string
 *     responses:
 *       200:
 *         description: Quote request sent
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized
 */
router.post('/send', validateBody(sendQuoteSchema), quoteController.send);

/**
 * @swagger
 * /api/v1/quotes:
 *   get:
 *     summary: Get all quote requests for the current user
 *     tags: [Quotes]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of quote requests
 *       401:
 *         description: Unauthorized
 */
router.get('/', quoteController.getAll);

/**
 * @swagger
 * /api/v1/quotes/partners/nearby:
 *   get:
 *     summary: Find nearby kitchen installation partners
 *     tags: [Quotes]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of nearby partners
 *       401:
 *         description: Unauthorized
 */
router.get('/partners/nearby', quoteController.findNearbyPartners);

/**
 * @swagger
 * /api/v1/quotes/{id}:
 *   get:
 *     summary: Get a specific quote request
 *     tags: [Quotes]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Quote request details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Quote not found
 */
router.get('/:id', validateParams(commonSchemas.idParam), quoteController.getById);

export default router;
