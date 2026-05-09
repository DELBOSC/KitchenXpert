import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';

import { workflowSimulationController } from '../controllers/workflow-simulation-controller';
import { authenticate } from '../middleware/auth-middleware';
import { validateBody, validateParams } from '../middleware/validation-middleware';

const router: RouterType = Router();

// ==================== ZOD SCHEMAS ====================

const simulateSchema = z.object({
  kitchenId: z.string().uuid(),
  scenario: z.enum(['dinner_for_6', 'quick_breakfast', 'meal_prep', 'baking'], {
    errorMap: () => ({
      message:
        'Invalid scenario. Must be one of: dinner_for_6, quick_breakfast, meal_prep, baking',
    }),
  }),
});

const optimizeSchema = z.object({
  simulationId: z.string().uuid(),
});

const kitchenIdParamSchema = z.object({
  kitchenId: z.string().uuid(),
});

// All workflow simulation routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/v1/workflow-simulation/scenarios:
 *   get:
 *     summary: List available cooking scenarios
 *     tags: [WorkflowSimulation]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of cooking scenarios
 *       401:
 *         description: Unauthorized
 */
router.get('/scenarios', workflowSimulationController.getScenarios);

/**
 * @swagger
 * /api/v1/workflow-simulation/simulate:
 *   post:
 *     summary: Run a cooking workflow simulation for a kitchen
 *     tags: [WorkflowSimulation]
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
 *               - scenario
 *             properties:
 *               kitchenId:
 *                 type: string
 *                 format: uuid
 *               scenario:
 *                 type: string
 *                 enum: [dinner_for_6, quick_breakfast, meal_prep, baking]
 *     responses:
 *       200:
 *         description: Simulation result
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied (not owner)
 *       404:
 *         description: Kitchen not found
 */
router.post('/simulate', validateBody(simulateSchema), workflowSimulationController.simulate);

/**
 * @swagger
 * /api/v1/workflow-simulation/optimize:
 *   post:
 *     summary: Get AI optimization suggestions for a simulation
 *     tags: [WorkflowSimulation]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - simulationId
 *             properties:
 *               simulationId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Optimization suggestions
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied (not owner)
 *       404:
 *         description: Simulation not found
 */
router.post('/optimize', validateBody(optimizeSchema), workflowSimulationController.optimize);

/**
 * @swagger
 * /api/v1/workflow-simulation/history/{kitchenId}:
 *   get:
 *     summary: Get previous simulations for a kitchen
 *     tags: [WorkflowSimulation]
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
 *         description: Simulation history
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied (not owner)
 *       404:
 *         description: Kitchen not found
 */
router.get(
  '/history/:kitchenId',
  validateParams(kitchenIdParamSchema),
  workflowSimulationController.getHistory,
);

export default router;
