/**
 * Price Tracker Routes (F9)
 *
 * All routes are protected (require authentication).
 *
 * Routes:
 *   GET    /price-tracker/history/:productId  — Price history for a product
 *   GET    /price-tracker/trends              — Price trends for multiple products
 *   GET    /price-tracker/best-time/:productId — Best time to buy suggestion
 *   POST   /price-tracker/alerts              — Create a price alert
 *   GET    /price-tracker/alerts              — List my alerts
 *   DELETE /price-tracker/alerts/:id          — Delete an alert
 */

import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth-middleware';
import { validateBody, validateParams } from '../middleware/validation-middleware';
import { priceTrackerController } from '../controllers/price-tracker-controller';

const router: RouterType = Router();

// ─── Validation schemas ──────────────────────────────────────────────────────

const createAlertSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  targetPrice: z.number().positive('Target price must be positive'),
  direction: z.enum(['below', 'above']),
});

const productIdParamSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
});

const alertIdParamSchema = z.object({
  id: z.string().uuid('Invalid alert ID'),
});

// ─── Protected routes ────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/price-tracker/history/{productId}:
 *   get:
 *     summary: Get price history for a product
 *     tags: [PriceTracker]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *         description: Number of days of history (default 90)
 *     responses:
 *       200:
 *         description: Price history data
 */
router.get('/history/:productId', authenticate, validateParams(productIdParamSchema), priceTrackerController.getHistory);

/**
 * @swagger
 * /api/v1/price-tracker/trends:
 *   get:
 *     summary: Get price trends for multiple products
 *     tags: [PriceTracker]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: productIds
 *         required: true
 *         schema:
 *           type: string
 *         description: Comma-separated list of product IDs
 *     responses:
 *       200:
 *         description: Price trends for each product
 */
router.get('/trends', authenticate, priceTrackerController.getTrends);

/**
 * @swagger
 * /api/v1/price-tracker/best-time/{productId}:
 *   get:
 *     summary: Get best time to buy suggestion
 *     tags: [PriceTracker]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Buy-time recommendation
 */
router.get('/best-time/:productId', authenticate, validateParams(productIdParamSchema), priceTrackerController.getBestTime);

/**
 * @swagger
 * /api/v1/price-tracker/alerts:
 *   post:
 *     summary: Create a price alert
 *     tags: [PriceTracker]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, targetPrice, direction]
 *             properties:
 *               productId:
 *                 type: string
 *               targetPrice:
 *                 type: number
 *               direction:
 *                 type: string
 *                 enum: [below, above]
 *     responses:
 *       201:
 *         description: Alert created
 */
router.post('/alerts', authenticate, validateBody(createAlertSchema), priceTrackerController.createAlert);

/**
 * @swagger
 * /api/v1/price-tracker/alerts:
 *   get:
 *     summary: List my price alerts
 *     tags: [PriceTracker]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of alerts
 */
router.get('/alerts', authenticate, priceTrackerController.getAlerts);

/**
 * @swagger
 * /api/v1/price-tracker/alerts/{id}:
 *   delete:
 *     summary: Delete a price alert
 *     tags: [PriceTracker]
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
 *         description: Alert deleted
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Alert not found
 */
router.delete('/alerts/:id', authenticate, validateParams(alertIdParamSchema), priceTrackerController.deleteAlert);

export default router;
