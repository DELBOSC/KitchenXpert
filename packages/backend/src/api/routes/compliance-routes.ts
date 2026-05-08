/**
 * Compliance Routes — Building Code Compliance Checker (NF C 15-100)
 *
 * All routes require authentication. The seed route requires admin role.
 */

import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';

import { authenticate, requireRole } from '../../middleware/auth-middleware';
import { complianceController } from '../controllers/compliance-controller';
import { generalRateLimiter } from '../middleware/rate-limit-middleware';
import { validateParams, validateQuery } from '../middleware/validation-middleware';

const router: RouterType = Router();

// ==================== ZOD SCHEMAS ====================

const kitchenIdParam = z.object({
  kitchenId: z.string().uuid('Invalid kitchen ID'),
});

const ruleCodeParam = z.object({
  code: z.string().min(1, 'Rule code is required').max(50),
});

const rulesQuerySchema = z.object({
  category: z.enum(['electrical', 'plumbing', 'ventilation', 'safety', 'accessibility']).optional(),
});

// ==================== ALL ROUTES REQUIRE AUTH ====================
router.use(authenticate);

// ==================== COMPLIANCE CHECK ====================

/**
 * @swagger
 * /api/v1/compliance/check/{kitchenId}:
 *   post:
 *     summary: Run compliance check on a kitchen
 *     tags: [Compliance]
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
 *         description: Compliance check results
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Kitchen not found
 */
router.post(
  '/check/:kitchenId',
  generalRateLimiter,
  validateParams(kitchenIdParam),
  complianceController.runCheck,
);

// ==================== RULES ====================

/**
 * @swagger
 * /api/v1/compliance/rules:
 *   get:
 *     summary: List all active compliance rules
 *     tags: [Compliance]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [electrical, plumbing, ventilation, safety, accessibility]
 *     responses:
 *       200:
 *         description: List of active compliance rules
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/rules',
  validateQuery(rulesQuerySchema),
  complianceController.getRules,
);

/**
 * @swagger
 * /api/v1/compliance/rules/{code}:
 *   get:
 *     summary: Get compliance rules by code category
 *     tags: [Compliance]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Rule code (e.g., "NF_C_15_100", "NF_DTU_24_1", "PMR")
 *     responses:
 *       200:
 *         description: Rules for the specified code
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/rules/:code',
  validateParams(ruleCodeParam),
  complianceController.getRulesByCode,
);

// ==================== CHECK HISTORY ====================

/**
 * @swagger
 * /api/v1/compliance/history/{kitchenId}:
 *   get:
 *     summary: Get compliance check history for a kitchen
 *     tags: [Compliance]
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
 *         description: List of previous compliance checks
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Kitchen not found
 */
router.get(
  '/history/:kitchenId',
  validateParams(kitchenIdParam),
  complianceController.getHistory,
);

// ==================== SEED (ADMIN ONLY) ====================

/**
 * @swagger
 * /api/v1/compliance/seed:
 *   post:
 *     summary: Seed default French building code rules (admin only)
 *     tags: [Compliance]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Rules seeded successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions (admin required)
 */
router.post(
  '/seed',
  requireRole('admin'),
  complianceController.seedRules,
);

export default router;
