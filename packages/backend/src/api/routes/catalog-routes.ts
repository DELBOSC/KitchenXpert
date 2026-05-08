import { Router, type Router as RouterType } from 'express';
import rateLimit from 'express-rate-limit';

import { catalogController } from '../controllers/catalog-controller';
import { authenticate, authorize } from '../middleware/auth-middleware';

const catalogRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per window for public catalog browsing
  message: { success: false, error: 'Too many requests, please try again later' },
});

const searchRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 search requests per minute
  message: { success: false, error: 'Too many search requests, please slow down' },
});

const router: RouterType = Router();

// Apply rate limiter to all public catalog routes
router.use(catalogRateLimiter);

// ==================== CATALOGS ====================

/**
 * @swagger
 * /api/v1/catalog:
 *   get:
 *     summary: Get all catalogs
 *     tags: [Catalog]
 *     responses:
 *       200:
 *         description: List of catalogs
 */
router.get('/', catalogController.getCatalogs);

/**
 * @swagger
 * /api/v1/catalog/stats:
 *   get:
 *     summary: Get catalog statistics
 *     tags: [Catalog]
 *     responses:
 *       200:
 *         description: Catalog statistics
 */
router.get('/stats', catalogController.getStats);

/**
 * @swagger
 * /api/v1/catalog/{id}:
 *   get:
 *     summary: Get catalog by ID
 *     tags: [Catalog]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Catalog data
 *       404:
 *         description: Catalog not found
 */
router.get('/:id', catalogController.getCatalogById);

// ==================== PROVIDERS ====================

/**
 * @swagger
 * /api/v1/catalog/providers/list:
 *   get:
 *     summary: Get all catalog providers
 *     tags: [Catalog]
 *     responses:
 *       200:
 *         description: List of providers
 */
router.get('/providers/list', catalogController.getProviders);

/**
 * @swagger
 * /api/v1/catalog/providers/{id}:
 *   get:
 *     summary: Get provider by ID
 *     tags: [Catalog]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Provider data
 *       404:
 *         description: Provider not found
 */
router.get('/providers/:id', catalogController.getProviderById);

// ==================== PRODUCTS ====================

/**
 * @swagger
 * /api/v1/catalog/products:
 *   get:
 *     summary: Get all catalog products
 *     tags: [Catalog]
 *     responses:
 *       200:
 *         description: List of products
 */
router.get('/products', catalogController.getProducts);

/**
 * @swagger
 * /api/v1/catalog/products/search:
 *   get:
 *     summary: Search catalog products
 *     tags: [Catalog]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Search results
 */
router.get('/products/search', searchRateLimiter, catalogController.searchProducts);

/**
 * @swagger
 * /api/v1/catalog/products/filters:
 *   get:
 *     summary: Get available product filter options
 *     tags: [Catalog]
 *     responses:
 *       200:
 *         description: Filter options
 */
router.get('/products/filters', catalogController.getProductFilters);

/**
 * @swagger
 * /api/v1/catalog/products/{id}:
 *   get:
 *     summary: Get catalog product by ID
 *     tags: [Catalog]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product data
 *       404:
 *         description: Product not found
 */
router.get('/products/:id', catalogController.getProductById);

/**
 * @swagger
 * /api/v1/catalog/products/{id}/related:
 *   get:
 *     summary: Get related products
 *     tags: [Catalog]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Related products
 *       404:
 *         description: Product not found
 */
router.get('/products/:id/related', catalogController.getRelatedProducts);

// ==================== CATEGORIES ====================

/**
 * @swagger
 * /api/v1/catalog/categories:
 *   get:
 *     summary: Get all catalog categories
 *     tags: [Catalog]
 *     responses:
 *       200:
 *         description: List of categories
 */
router.get('/categories', catalogController.getCategories);

/**
 * @swagger
 * /api/v1/catalog/categories/{slug}:
 *   get:
 *     summary: Get category by slug
 *     tags: [Catalog]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category data
 *       404:
 *         description: Category not found
 */
router.get('/categories/:slug', catalogController.getCategoryBySlug);

// ==================== APPLIANCES ====================

/**
 * @swagger
 * /api/v1/catalog/appliances:
 *   get:
 *     summary: Get all appliances
 *     tags: [Catalog]
 *     responses:
 *       200:
 *         description: List of appliances
 */
router.get('/appliances', catalogController.getAppliances);

/**
 * @swagger
 * /api/v1/catalog/appliances/types:
 *   get:
 *     summary: Get appliance types
 *     tags: [Catalog]
 *     responses:
 *       200:
 *         description: List of appliance types
 */
router.get('/appliances/types', catalogController.getApplianceTypes);

/**
 * @swagger
 * /api/v1/catalog/appliances/brands:
 *   get:
 *     summary: Get appliance brands
 *     tags: [Catalog]
 *     responses:
 *       200:
 *         description: List of appliance brands
 */
router.get('/appliances/brands', catalogController.getApplianceBrands);

/**
 * @swagger
 * /api/v1/catalog/appliances/search:
 *   get:
 *     summary: Search appliances
 *     tags: [Catalog]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Search results
 */
router.get('/appliances/search', searchRateLimiter, catalogController.searchAppliances);

/**
 * @swagger
 * /api/v1/catalog/appliances/{id}:
 *   get:
 *     summary: Get appliance by ID
 *     tags: [Catalog]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Appliance data
 *       404:
 *         description: Appliance not found
 */
router.get('/appliances/:id', catalogController.getApplianceById);

// ==================== MATERIALS ====================

/**
 * @swagger
 * /api/v1/catalog/materials:
 *   get:
 *     summary: Get all materials
 *     tags: [Catalog]
 *     responses:
 *       200:
 *         description: List of materials
 */
router.get('/materials', catalogController.getMaterials);

/**
 * @swagger
 * /api/v1/catalog/materials/types:
 *   get:
 *     summary: Get material types
 *     tags: [Catalog]
 *     responses:
 *       200:
 *         description: List of material types
 */
router.get('/materials/types', catalogController.getMaterialTypes);

/**
 * @swagger
 * /api/v1/catalog/materials/categories:
 *   get:
 *     summary: Get material categories
 *     tags: [Catalog]
 *     responses:
 *       200:
 *         description: List of material categories
 */
router.get('/materials/categories', catalogController.getMaterialCategories);

/**
 * @swagger
 * /api/v1/catalog/materials/search:
 *   get:
 *     summary: Search materials
 *     tags: [Catalog]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Search results
 */
router.get('/materials/search', searchRateLimiter, catalogController.searchMaterials);

/**
 * @swagger
 * /api/v1/catalog/materials/{id}:
 *   get:
 *     summary: Get material by ID
 *     tags: [Catalog]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Material data
 *       404:
 *         description: Material not found
 */
router.get('/materials/:id', catalogController.getMaterialById);

// ==================== PROTECTED ROUTES ====================

router.use(authenticate);

/**
 * @swagger
 * /api/v1/catalog/admin/stats:
 *   get:
 *     summary: Get catalog admin statistics (admin only)
 *     tags: [Catalog]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Admin catalog statistics
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.get('/admin/stats', authorize(['admin']), catalogController.getStats);

export default router;
