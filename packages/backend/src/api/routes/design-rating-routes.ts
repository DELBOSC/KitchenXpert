import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';

import { designRatingController } from '../controllers/design-rating-controller';
import { authenticate } from '../middleware/auth-middleware';
import { validateBody } from '../middleware/validation-middleware';

const router: RouterType = Router();

// ==================== ZOD SCHEMAS ====================

const createRatingSchema = z.object({
  kitchenId: z.string().uuid('Invalid kitchen ID'),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

// All design rating routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/v1/design-ratings:
 *   post:
 *     summary: Create or update a design rating
 *     tags: [Design Ratings]
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
 *               - rating
 *             properties:
 *               kitchenId:
 *                 type: string
 *                 format: uuid
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *                 maxLength: 1000
 *     responses:
 *       200:
 *         description: Rating created or updated
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized
 */
router.post('/', validateBody(createRatingSchema), designRatingController.createOrUpdate);

/**
 * @swagger
 * /api/v1/design-ratings/{kitchenId}:
 *   get:
 *     summary: Get all ratings for a kitchen design
 *     tags: [Design Ratings]
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
 *         description: List of ratings
 *       401:
 *         description: Unauthorized
 */
router.get('/:kitchenId', designRatingController.getByKitchen);

/**
 * @swagger
 * /api/v1/design-ratings/{kitchenId}/my:
 *   get:
 *     summary: Get current user's rating for a kitchen
 *     tags: [Design Ratings]
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
 *         description: User's rating for the kitchen
 *       401:
 *         description: Unauthorized
 */
router.get('/:kitchenId/my', designRatingController.getMyRating);

/**
 * @swagger
 * /api/v1/design-ratings/{kitchenId}:
 *   delete:
 *     summary: Delete current user's rating for a kitchen
 *     tags: [Design Ratings]
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
 *         description: Rating deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Rating not found
 */
router.delete('/:kitchenId', designRatingController.deleteMyRating);

export default router;
