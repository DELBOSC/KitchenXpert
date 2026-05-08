/**
 * Payment Routes
 * Handles all payment-related endpoints including payment intents,
 * subscriptions, webhooks, and refunds.
 */

import { Router, type Router as RouterType, raw } from 'express';
import { z } from 'zod';

import { paymentController } from '../controllers/payment-controller';
import { authenticate, authorize } from '../middleware/auth-middleware';
import { validateBody, validateParams, validateQuery, commonSchemas } from '../middleware/validation-middleware';

const router: RouterType = Router();

// ==================== ZOD SCHEMAS ====================

const createPaymentIntentSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3, 'Currency must be 3-letter code').default('eur'),
  customerId: z.string().optional(),
  metadata: z.record(z.string()).optional(),
});

const paymentHistoryQuerySchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

const refundSchema = z.object({
  paymentIntentId: z.string().min(1, 'Payment intent ID is required'),
  amount: z.number().positive().optional(),
  reason: z.string().optional(),
});

const createCustomerSchema = z.object({
  email: commonSchemas.email,
  name: z.string().min(1).max(200).optional(),
  metadata: z.record(z.string()).optional(),
});

const stripeIdParam = z.object({
  id: z.string().min(1, 'ID is required'),
});

// =================================
// Webhook Route (MUST be before body parsing middleware)
// =================================

/**
 * @swagger
 * /api/v1/payments/webhook:
 *   post:
 *     summary: Handle Stripe webhook events
 *     description: Receives and processes Stripe webhook events. Requires raw body for signature verification.
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Stripe webhook event payload
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Invalid webhook signature or payload
 */
router.post(
  '/webhook',
  raw({ type: 'application/json' }),
  paymentController.handleWebhook
);

// =================================
// Public Routes (Read-only product/price info)
// =================================

/**
 * @swagger
 * /api/v1/payments/prices:
 *   get:
 *     summary: List available prices
 *     description: Returns all Stripe prices. Public endpoint, no authentication required.
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: List of prices
 */
router.get('/prices', paymentController.listPrices);

/**
 * @swagger
 * /api/v1/payments/products:
 *   get:
 *     summary: List available products
 *     description: Returns all Stripe products. Public endpoint, no authentication required.
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: List of products
 */
router.get('/products', paymentController.listProducts);

// =================================
// Protected Routes - Require Authentication
// =================================

router.use(authenticate);

// ==================== PAYMENT INTENTS ====================

/**
 * @swagger
 * /api/v1/payments/intent:
 *   post:
 *     summary: Create a payment intent
 *     tags: [Payments]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Payment amount in smallest currency unit (e.g. cents)
 *               currency:
 *                 type: string
 *                 default: eur
 *                 description: 3-letter ISO currency code
 *               customerId:
 *                 type: string
 *                 description: Optional Stripe customer ID
 *               metadata:
 *                 type: object
 *                 additionalProperties:
 *                   type: string
 *                 description: Optional metadata key-value pairs
 *     responses:
 *       201:
 *         description: Payment intent created
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized
 */
router.post('/intent', validateBody(createPaymentIntentSchema), paymentController.createPaymentIntent);

/**
 * @swagger
 * /api/v1/payments/intent/{id}:
 *   get:
 *     summary: Get a payment intent by ID
 *     tags: [Payments]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Stripe payment intent ID
 *     responses:
 *       200:
 *         description: Payment intent details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Payment intent not found
 */
router.get('/intent/:id', validateParams(stripeIdParam), paymentController.getPaymentIntent);

/**
 * @swagger
 * /api/v1/payments/intent/{id}/cancel:
 *   post:
 *     summary: Cancel a payment intent
 *     tags: [Payments]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Stripe payment intent ID
 *     responses:
 *       200:
 *         description: Payment intent cancelled
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Payment intent not found
 */
router.post('/intent/:id/cancel', validateParams(stripeIdParam), paymentController.cancelPaymentIntent);

// ==================== PAYMENT HISTORY ====================

/**
 * @swagger
 * /api/v1/payments/history:
 *   get:
 *     summary: Get payment history for a customer
 *     tags: [Payments]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
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
 *           minimum: 1
 *           maximum: 100
 *         description: Number of records to return
 *     responses:
 *       200:
 *         description: Payment history list
 *       400:
 *         description: Missing or invalid customerId
 *       401:
 *         description: Unauthorized
 */
router.get('/history', validateQuery(paymentHistoryQuerySchema), paymentController.getPaymentHistory);

// ==================== REFUNDS ====================

/**
 * @swagger
 * /api/v1/payments/refund:
 *   post:
 *     summary: Refund a payment (admin only)
 *     tags: [Payments]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentIntentId
 *             properties:
 *               paymentIntentId:
 *                 type: string
 *                 description: Stripe payment intent ID to refund
 *               amount:
 *                 type: number
 *                 description: Optional partial refund amount; if omitted, full refund is issued
 *               reason:
 *                 type: string
 *                 description: Optional reason for the refund
 *     responses:
 *       200:
 *         description: Refund processed
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.post('/refund', authorize(['admin']), validateBody(refundSchema), paymentController.refundPayment);

// ==================== CUSTOMERS ====================

/**
 * @swagger
 * /api/v1/payments/customers:
 *   post:
 *     summary: Create a Stripe customer
 *     tags: [Payments]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Customer email address
 *               name:
 *                 type: string
 *                 maxLength: 200
 *                 description: Customer name
 *               metadata:
 *                 type: object
 *                 additionalProperties:
 *                   type: string
 *                 description: Optional metadata key-value pairs
 *     responses:
 *       201:
 *         description: Customer created
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized
 */
router.post('/customers', validateBody(createCustomerSchema), paymentController.createCustomer);

/**
 * @swagger
 * /api/v1/payments/customers/{id}:
 *   get:
 *     summary: Get a Stripe customer by ID
 *     tags: [Payments]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Stripe customer ID
 *     responses:
 *       200:
 *         description: Customer details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Customer not found
 */
router.get('/customers/:id', validateParams(stripeIdParam), paymentController.getCustomer);

export default router;
