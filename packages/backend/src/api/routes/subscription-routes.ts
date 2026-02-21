/**
 * Subscription Routes
 * Handles all subscription-related endpoints.
 */

import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { paymentController } from '../controllers/payment-controller';
import { authenticate } from '../middleware/auth-middleware';
import { validateBody } from '../middleware/validation-middleware';

const router: RouterType = Router();

// All subscription routes require authentication
router.use(authenticate);

// ==================== Zod Schemas ====================

const createSubscriptionSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  priceId: z.string().min(1, 'Price ID is required'),
  metadata: z.record(z.unknown()).optional(),
  trialPeriodDays: z.number().int().min(0).max(730).optional(),
});

const cancelSubscriptionSchema = z.object({
  cancelAtPeriodEnd: z.boolean().optional().default(false),
});

// ==================== SUBSCRIPTION CRUD ====================

/**
 * @swagger
 * /api/v1/subscriptions:
 *   post:
 *     summary: Create a new subscription
 *     tags: [Subscriptions]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerId
 *               - priceId
 *             properties:
 *               customerId:
 *                 type: string
 *                 description: Stripe customer ID
 *               priceId:
 *                 type: string
 *                 description: Stripe price ID
 *               metadata:
 *                 type: object
 *                 additionalProperties: true
 *                 description: Optional metadata key-value pairs
 *               trialPeriodDays:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 730
 *                 description: Optional trial period in days
 *     responses:
 *       201:
 *         description: Subscription created
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized
 */
router.post('/', validateBody(createSubscriptionSchema), paymentController.createSubscription);

/**
 * @swagger
 * /api/v1/subscriptions/{id}:
 *   get:
 *     summary: Get a subscription by ID
 *     tags: [Subscriptions]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Stripe subscription ID
 *     responses:
 *       200:
 *         description: Subscription details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Subscription not found
 */
router.get('/:id', paymentController.getSubscription);

/**
 * @swagger
 * /api/v1/subscriptions/{id}:
 *   delete:
 *     summary: Cancel a subscription
 *     tags: [Subscriptions]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Stripe subscription ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cancelAtPeriodEnd:
 *                 type: boolean
 *                 default: false
 *                 description: If true, cancel at end of billing period instead of immediately
 *     responses:
 *       200:
 *         description: Subscription cancelled
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Subscription not found
 */
router.delete('/:id', validateBody(cancelSubscriptionSchema), paymentController.cancelSubscription);

// ==================== CUSTOMER SUBSCRIPTIONS ====================

/**
 * @swagger
 * /api/v1/subscriptions/customer/{customerId}:
 *   get:
 *     summary: List subscriptions for a customer
 *     tags: [Subscriptions]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Stripe customer ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of subscriptions to return
 *     responses:
 *       200:
 *         description: List of customer subscriptions
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Customer not found
 */
router.get('/customer/:customerId', paymentController.listCustomerSubscriptions);

export default router;
