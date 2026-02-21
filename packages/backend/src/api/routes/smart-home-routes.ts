import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth-middleware.js';
import { validateParams, validateBody } from '../middleware/validation-middleware.js';
import { smartHomeController } from '../controllers/smart-home-controller.js';

const router: RouterType = Router();

const kitchenIdParam = z.object({
  kitchenId: z.string().uuid('Invalid kitchen ID format'),
});

const createPlanBody = z.object({
  kitchenId: z.string().uuid('Invalid kitchen ID format'),
  preferences: z
    .object({
      budget: z.number().positive().optional(),
      protocols: z.array(z.string()).optional(),
      priorities: z
        .array(z.enum(['security', 'energy', 'comfort', 'automation']))
        .optional(),
      existingHub: z.string().optional(),
      roomDimensions: z
        .object({
          width: z.number().positive(),
          depth: z.number().positive(),
          height: z.number().positive(),
        })
        .optional(),
      kitchenLayoutData: z.record(z.unknown()).optional(),
    })
    .optional(),
});

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/v1/smart-home/devices:
 *   get:
 *     summary: Get the smart device catalog
 *     tags: [Smart Home]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Device catalog
 *       401:
 *         description: Unauthorized
 */
router.get('/devices', smartHomeController.getDeviceCatalog);

/**
 * @swagger
 * /api/v1/smart-home:
 *   post:
 *     summary: Create a smart home plan for a kitchen
 *     tags: [Smart Home]
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
 *             properties:
 *               kitchenId:
 *                 type: string
 *                 format: uuid
 *               preferences:
 *                 type: object
 *     responses:
 *       201:
 *         description: Smart home plan created
 *       401:
 *         description: Unauthorized
 */
router.post('/', validateBody(createPlanBody), smartHomeController.createPlan);

/**
 * @swagger
 * /api/v1/smart-home/{kitchenId}:
 *   get:
 *     summary: Get the smart home plan for a kitchen
 *     tags: [Smart Home]
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
 *         description: Smart home plan
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Plan not found
 */
router.get('/:kitchenId', validateParams(kitchenIdParam), smartHomeController.getPlan);

/**
 * @swagger
 * /api/v1/smart-home/{kitchenId}:
 *   put:
 *     summary: Update the smart home plan for a kitchen
 *     tags: [Smart Home]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: kitchenId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Plan updated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Plan not found
 */
router.put('/:kitchenId', validateParams(kitchenIdParam), smartHomeController.updatePlan);

/**
 * @swagger
 * /api/v1/smart-home/{kitchenId}/coverage:
 *   get:
 *     summary: Get signal coverage map for a kitchen
 *     tags: [Smart Home]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: kitchenId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: routerX
 *         schema:
 *           type: number
 *       - in: query
 *         name: routerY
 *         schema:
 *           type: number
 *       - in: query
 *         name: routerZ
 *         schema:
 *           type: number
 *       - in: query
 *         name: protocol
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Coverage map
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Kitchen not found
 */
router.get('/:kitchenId/coverage', validateParams(kitchenIdParam), smartHomeController.getCoverage);

export default router;
