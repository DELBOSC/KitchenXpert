import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';

import { financingController } from '../controllers/financing-controller';
import { authenticate } from '../middleware/auth-middleware';
import { validateBody, validateParams, commonSchemas } from '../middleware/validation-middleware';

const router: RouterType = Router();

// ─── Validation Schemas ───────────────────────────────────────────────────────

const simulateSchema = z.object({
  totalAmount: z.number().positive('Total amount must be positive').max(500000),
  downPayment: z.number().min(0, 'Down payment cannot be negative').max(500000),
  kitchenId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
}).refine(data => data.downPayment < data.totalAmount, {
  message: 'Down payment must be less than total amount',
  path: ['downPayment'],
});

const ecoAidsSchema = z.object({
  totalAmount: z.number().positive('Total amount must be positive').max(500000),
  incomeBracket: z.enum(['tres_modeste', 'modeste', 'intermediaire', 'superieur']),
  householdSize: z.number().int().min(1).max(20),
  equipmentTypes: z.array(
    z.enum([
      'chauffe_eau_thermodynamique',
      'pompe_a_chaleur',
      'isolation_murs',
      'isolation_combles',
      'fenetre_double_vitrage',
      'chaudiere_condensation',
      'ventilation_double_flux',
      'panneau_solaire',
    ])
  ).max(10),
  isRenovation: z.boolean(),
  buildingAge: z.number().int().min(0).max(500).optional(),
});

const aiAdviceSchema = z.object({
  totalBudget: z.number().positive('Budget must be positive').max(500000),
  categories: z.array(z.object({
    name: z.string().max(100),
    currentAmount: z.number().min(0),
  })).max(20).optional(),
  style: z.string().max(100).optional(),
  roomSizeM2: z.number().positive().max(200).optional(),
  isRenovation: z.boolean().optional(),
});

// All financing routes require authentication
router.use(authenticate);

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/financing/simulate:
 *   post:
 *     summary: Run a financing simulation across providers and durations
 *     tags: [Financing]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - totalAmount
 *               - downPayment
 *             properties:
 *               totalAmount:
 *                 type: number
 *                 description: Total project cost in EUR
 *               downPayment:
 *                 type: number
 *                 description: Down payment amount in EUR
 *               kitchenId:
 *                 type: string
 *                 format: uuid
 *               projectId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Simulation results with all providers and durations
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post('/simulate', validateBody(simulateSchema), financingController.simulate);

/**
 * @swagger
 * /api/v1/financing/eco-aids:
 *   post:
 *     summary: Calculate eco aids eligibility (MaPrimeRenov, CEE, TVA reduite, eco-PTZ)
 *     tags: [Financing]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - totalAmount
 *               - incomeBracket
 *               - householdSize
 *               - equipmentTypes
 *               - isRenovation
 *             properties:
 *               totalAmount:
 *                 type: number
 *               incomeBracket:
 *                 type: string
 *                 enum: [tres_modeste, modeste, intermediaire, superieur]
 *               householdSize:
 *                 type: integer
 *                 minimum: 1
 *               equipmentTypes:
 *                 type: array
 *                 items:
 *                   type: string
 *               isRenovation:
 *                 type: boolean
 *               buildingAge:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Eco aids calculation results
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post('/eco-aids', validateBody(ecoAidsSchema), financingController.calculateEcoAids);

/**
 * @swagger
 * /api/v1/financing/providers:
 *   get:
 *     summary: List all financing providers with their current rates
 *     tags: [Financing]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of financing providers
 *       401:
 *         description: Unauthorized
 */
router.get('/providers', financingController.getProviders);

/**
 * @swagger
 * /api/v1/financing/my-simulations:
 *   get:
 *     summary: Get the current user's simulation history
 *     tags: [Financing]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of past simulations
 *       401:
 *         description: Unauthorized
 */
router.get('/my-simulations', financingController.getMySimulations);

/**
 * @swagger
 * /api/v1/financing/{id}:
 *   get:
 *     summary: Get a specific simulation detail
 *     tags: [Financing]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Simulation detail
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Simulation not found
 */
router.get('/:id', validateParams(commonSchemas.idParam), financingController.getById);

/**
 * @swagger
 * /api/v1/financing/ai-advice:
 *   post:
 *     summary: Get AI-powered budget allocation recommendations
 *     tags: [Financing]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - totalBudget
 *             properties:
 *               totalBudget:
 *                 type: number
 *               categories:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     currentAmount:
 *                       type: number
 *               style:
 *                 type: string
 *               roomSizeM2:
 *                 type: number
 *               isRenovation:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: AI budget recommendations
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post('/ai-advice', validateBody(aiAdviceSchema), financingController.getAIAdvice);

export default router;
