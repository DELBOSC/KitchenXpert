import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';

import { enrichmentController } from '../controllers/enrichment-controller';
import { authenticate, requireRole } from '../middleware/auth-middleware';
import { validateParams } from '../middleware/validation-middleware';

const router: RouterType = Router();

// ==================== Param Schemas ====================

const productTypeIdParams = z.object({
  type: z.string().min(1, 'Type is required'),
  id: z.string().uuid(),
});

const cabinetTypeParam = z.object({
  cabinetType: z.string().min(1, 'Cabinet type is required'),
});

const brandMatchParams = z.object({
  brandA: z.string().min(1, 'Brand A is required'),
  brandB: z.string().min(1, 'Brand B is required'),
});

const productIdParam = z.object({
  productId: z.string().uuid(),
});

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/v1/enrichment/enrich:
 *   post:
 *     summary: Enrich a single product with additional data
 *     tags: [Enrichment]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Product enriched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.post('/enrich', requireRole('admin'), enrichmentController.enrich);
/**
 * @swagger
 * /api/v1/enrichment/enrich-all:
 *   post:
 *     summary: Enrich all products in the catalog
 *     tags: [Enrichment]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Bulk enrichment started
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.post('/enrich-all', requireRole('admin'), enrichmentController.enrichAll);
/**
 * @swagger
 * /api/v1/enrichment/status:
 *   get:
 *     summary: Get enrichment processing status
 *     tags: [Enrichment]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Enrichment status
 *       401:
 *         description: Unauthorized
 */
router.get('/status', enrichmentController.getStatus);
/**
 * @swagger
 * /api/v1/enrichment/product/{type}/{id}:
 *   get:
 *     summary: Get enrichment data for a specific product
 *     tags: [Enrichment]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product enrichment data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Product not found
 */
router.get('/product/:type/:id', validateParams(productTypeIdParams), enrichmentController.getProductEnrichment);

/**
 * @swagger
 * /api/v1/enrichment/compatibility/generate:
 *   post:
 *     summary: Generate product compatibility matrix
 *     tags: [Enrichment]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Compatibility matrix generated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.post('/compatibility/generate', requireRole('admin'), enrichmentController.generateCompatibility);
/**
 * @swagger
 * /api/v1/enrichment/compatibility/check:
 *   get:
 *     summary: Check compatibility between products
 *     tags: [Enrichment]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Compatibility check result
 *       401:
 *         description: Unauthorized
 */
router.get('/compatibility/check', enrichmentController.checkCompatibility);
/**
 * @swagger
 * /api/v1/enrichment/compatibility/{cabinetType}:
 *   get:
 *     summary: Get compatibility rules for a cabinet type
 *     tags: [Enrichment]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: cabinetType
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Compatibility rules
 *       401:
 *         description: Unauthorized
 */
router.get('/compatibility/:cabinetType', validateParams(cabinetTypeParam), enrichmentController.getCompatibilityRules);

/**
 * @swagger
 * /api/v1/enrichment/match/{brandA}/{brandB}:
 *   post:
 *     summary: Cross-match products between two brands
 *     tags: [Enrichment]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: brandA
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: brandB
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Brand cross-match results
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.post('/match/:brandA/:brandB', validateParams(brandMatchParams), requireRole('admin'), enrichmentController.crossMatchBrands);
/**
 * @swagger
 * /api/v1/enrichment/matches/{productId}:
 *   get:
 *     summary: Get product matches for a specific product
 *     tags: [Enrichment]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product match results
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Product not found
 */
router.get('/matches/:productId', validateParams(productIdParam), enrichmentController.getProductMatches);

export default router;
