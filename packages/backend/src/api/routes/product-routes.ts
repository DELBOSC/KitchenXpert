import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';

import { productController } from '../controllers/product-controller';
import { optionalAuth, authenticate, authorize } from '../middleware/auth-middleware';
import { validateBody } from '../middleware/validation-middleware';

const router: RouterType = Router();

const createProductSchema = z.object({
  name: z.string().min(1).max(300),
  sku: z.string().min(1).max(100).optional(),
  description: z.string().max(5000).optional(),
  price: z.number().min(0).optional(),
  brand: z.string().max(200).optional(),
  categoryId: z.string().uuid().optional(),
  images: z.array(z.string().max(2000)).max(20).optional(),
  specifications: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

const updateProductSchema = createProductSchema.partial();

// ==================== PUBLIC ROUTES ====================

/**
 * @swagger
 * /api/v1/products:
 *   get:
 *     summary: List all products with filters
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: List of products
 */
router.get('/', optionalAuth, productController.getAll);

/**
 * @swagger
 * /api/v1/products/search:
 *   get:
 *     summary: Search products
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Search results
 */
router.get('/search', productController.search);

/**
 * @swagger
 * /api/v1/products/filters:
 *   get:
 *     summary: Get available product filter options
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Filter options
 */
router.get('/filters', productController.getFilters);

/**
 * @swagger
 * /api/v1/products/categories:
 *   get:
 *     summary: List all product categories
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: List of categories
 */
router.get('/categories', productController.getCategories);

/**
 * @swagger
 * /api/v1/products/categories/{slug}:
 *   get:
 *     summary: Get category by slug
 *     tags: [Products]
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
router.get('/categories/:slug', productController.getCategoryBySlug);

/**
 * @swagger
 * /api/v1/products/category/{categoryId}:
 *   get:
 *     summary: Get products by category
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Products in category
 *       404:
 *         description: Category not found
 */
router.get('/category/:categoryId', productController.getByCategory);

/**
 * @swagger
 * /api/v1/products/sku/{sku}:
 *   get:
 *     summary: Get product by SKU
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: sku
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product data
 *       404:
 *         description: Product not found
 */
router.get('/sku/:sku', productController.getBySku);

/**
 * @swagger
 * /api/v1/products/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Products]
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
router.get('/:id', productController.getById);

/**
 * @swagger
 * /api/v1/products/{id}/related:
 *   get:
 *     summary: Get related products
 *     tags: [Products]
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
router.get('/:id/related', productController.getRelated);

/**
 * @swagger
 * /api/v1/products/{id}/compatibility:
 *   get:
 *     summary: Check product compatibility
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Compatibility data
 *       404:
 *         description: Product not found
 */
router.get('/:id/compatibility', productController.checkCompatibility);

// ==================== ADMIN ROUTES ====================

/**
 * @swagger
 * /api/v1/products:
 *   post:
 *     summary: Create new product (admin only)
 *     tags: [Products]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               sku:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               brand:
 *                 type: string
 *               categoryId:
 *                 type: string
 *                 format: uuid
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Product created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.post('/', authenticate, authorize(['admin']), validateBody(createProductSchema), productController.create);

/**
 * @swagger
 * /api/v1/products/{id}:
 *   put:
 *     summary: Update product (admin only)
 *     tags: [Products]
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
 *             properties:
 *               name:
 *                 type: string
 *               sku:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               brand:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Product updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 *       404:
 *         description: Product not found
 */
router.put('/:id', authenticate, authorize(['admin']), validateBody(updateProductSchema), productController.update);

/**
 * @swagger
 * /api/v1/products/{id}:
 *   delete:
 *     summary: Delete product (admin only)
 *     tags: [Products]
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
 *         description: Product deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 *       404:
 *         description: Product not found
 */
router.delete('/:id', authenticate, authorize(['admin']), productController.delete);

export default router;
