import { Router, type Router as RouterType } from 'express';

import { commentController } from '../controllers/comment-controller';
import { authenticate } from '../middleware/auth-middleware';
import { validateParams, commonSchemas } from '../middleware/validation-middleware';

const router: RouterType = Router();

// All comment routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/v1/comments:
 *   post:
 *     summary: Create a new comment
 *     tags: [Comments]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectId
 *               - content
 *             properties:
 *               projectId:
 *                 type: string
 *                 format: uuid
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Comment created
 *       401:
 *         description: Unauthorized
 */
router.post('/', commentController.createComment);

/**
 * @swagger
 * /api/v1/comments:
 *   get:
 *     summary: Get comments for a project
 *     tags: [Comments]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of comments
 *       401:
 *         description: Unauthorized
 */
router.get('/', commentController.getComments);

/**
 * @swagger
 * /api/v1/comments/{id}:
 *   put:
 *     summary: Update a comment
 *     tags: [Comments]
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
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Comment updated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Comment not found
 */
router.put('/:id', validateParams(commonSchemas.idParam), commentController.updateComment);

/**
 * @swagger
 * /api/v1/comments/{id}:
 *   delete:
 *     summary: Soft delete a comment
 *     tags: [Comments]
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
 *         description: Comment deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Comment not found
 */
router.delete('/:id', validateParams(commonSchemas.idParam), commentController.deleteComment);

export default router;
