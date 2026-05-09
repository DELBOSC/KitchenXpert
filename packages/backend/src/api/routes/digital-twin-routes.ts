import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';

import { digitalTwinController } from '../controllers/digital-twin-controller';
import { authenticate } from '../middleware/auth-middleware';
import { validateParams } from '../middleware/validation-middleware';

const router: RouterType = Router();

const kitchenIdParam = z.object({
  kitchenId: z.string().uuid(),
});

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/v1/digital-twin:
 *   post:
 *     summary: Create a digital twin for a kitchen
 *     tags: [Digital Twin]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               kitchenId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Digital twin created
 *       401:
 *         description: Unauthorized
 */
router.post('/', digitalTwinController.createTwin);
/**
 * @swagger
 * /api/v1/digital-twin/{kitchenId}:
 *   get:
 *     summary: Get digital twin for a kitchen
 *     tags: [Digital Twin]
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
 *         description: Digital twin data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Twin not found
 */
router.get('/:kitchenId', validateParams(kitchenIdParam), digitalTwinController.getTwin);
/**
 * @swagger
 * /api/v1/digital-twin/{kitchenId}/sync:
 *   put:
 *     summary: Sync digital twin with latest kitchen data
 *     tags: [Digital Twin]
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
 *         description: Twin synced successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Twin not found
 */
router.put('/:kitchenId/sync', validateParams(kitchenIdParam), digitalTwinController.syncTwin);
/**
 * @swagger
 * /api/v1/digital-twin/{kitchenId}/maintenance:
 *   get:
 *     summary: Get maintenance schedule for a kitchen's digital twin
 *     tags: [Digital Twin]
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
 *         description: Maintenance schedule
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Twin not found
 */
router.get('/:kitchenId/maintenance', validateParams(kitchenIdParam), digitalTwinController.getMaintenanceSchedule);

export default router;
