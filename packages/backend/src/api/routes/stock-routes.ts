import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth-middleware';
import { validateBody } from '../middleware/validation-middleware';
import { stockController } from '../controllers/stock-controller';

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate);

// --- Zod Schemas ---

const checkStockSchema = z.object({
  productId: z.string().min(1, 'productId is required'),
  providerId: z.string().min(1, 'providerId is required'),
  storeId: z.string().optional(),
});

const bulkStockSchema = z.object({
  items: z.array(z.object({
    productId: z.string().min(1, 'productId is required'),
    providerId: z.string().min(1, 'providerId is required'),
  })).min(1, 'items array must not be empty'),
});

/**
 * @swagger
 * /api/v1/stock/check:
 *   post:
 *     summary: Check stock availability for a product
 *     tags: [Stock]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productId:
 *                 type: string
 *               storeId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Stock availability info
 *       401:
 *         description: Unauthorized
 */
router.post('/check', validateBody(checkStockSchema), stockController.checkStock);
/**
 * @swagger
 * /api/v1/stock/bulk:
 *   post:
 *     summary: Check stock availability for multiple products
 *     tags: [Stock]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               storeId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Bulk stock availability info
 *       401:
 *         description: Unauthorized
 */
router.post('/bulk', validateBody(bulkStockSchema), stockController.getBulkStock);

export default router;
