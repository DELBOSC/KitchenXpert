import { Router, type Router as RouterType } from 'express';

import { shoppingListController } from '../controllers/shopping-list-controller';
import { authenticate } from '../middleware/auth-middleware';

const router: RouterType = Router();

// All shopping list routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/v1/shopping-list/{kitchenId}:
 *   get:
 *     summary: Get shopping list for a kitchen design
 *     tags: [Shopping List]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: kitchenId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Shopping list items
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Kitchen not found
 */
router.get('/:kitchenId', shoppingListController.getByKitchenId);

export default router;
