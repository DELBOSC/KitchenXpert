import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';

import { stockController } from '../controllers/stock-controller';
import { authenticate } from '../middleware/auth-middleware';
import { validateBody } from '../middleware/validation-middleware';

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate);

// --- Zod Schemas ---

// SKUs/provider ids are short identifiers. The bounds below are not cosmetic: the mock
// stock helpers iterate `productId.length` (js/loop-bound-injection), so an unbounded
// productId is a CPU-DoS on an authenticated route. Cap every client-controlled length
// and the batch size — a real SKU is well under 128 chars, a real bulk check well under 500.
const ID_MAX = 128;

const checkStockSchema = z.object({
  productId: z.string().min(1, 'productId is required').max(ID_MAX),
  providerId: z.string().min(1, 'providerId is required').max(ID_MAX),
  storeId: z.string().max(ID_MAX).optional(),
});

const bulkStockSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1, 'productId is required').max(ID_MAX),
        providerId: z.string().min(1, 'providerId is required').max(ID_MAX),
      })
    )
    .min(1, 'items array must not be empty')
    .max(500, 'items array is too large'),
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
