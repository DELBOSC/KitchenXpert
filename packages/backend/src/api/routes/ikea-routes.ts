/**
 * IKEA API Routes
 * REST endpoints for IKEA product data
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

import { type IkeaClient, createIkeaClient } from '../../services/ikea';
import { authenticate } from '../middleware/auth-middleware';

const router: Router = Router();

const ikeaRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: {
    success: false,
    error: { code: 'RATE_LIMIT', message: 'Too many IKEA API requests, please try again later' },
  },
});

router.use(authenticate);
router.use(ikeaRateLimiter);

// Create IKEA client with default config (can be overridden per request)
let defaultClient: IkeaClient | null = null;

function getClient(country: string = 'fr', language: string = 'fr'): IkeaClient {
  if (!defaultClient || defaultClient['config'].country !== country) {
    defaultClient = createIkeaClient({ country, language });
  }
  return defaultClient;
}

/**
 * @swagger
 * /api/v1/ikea/search:
 *   get:
 *     summary: Search IKEA products
 *     tags: [IKEA]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query string
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *           default: fr
 *         description: Country code for IKEA store
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *           default: fr
 *         description: Language code
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 24
 *         description: Maximum number of results
 *     responses:
 *       200:
 *         description: Search results
 *       400:
 *         description: Missing query parameter
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
router.get('/search', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { q, query, country = 'fr', language = 'fr', limit = '24' } = req.query;

    const searchQuery = (q || query) as string;
    if (!searchQuery) {
      res.status(400).json({
        success: false,
        error: { code: 'MISSING_QUERY', message: 'Query parameter "q" is required' },
      });
      return;
    }

    const client = getClient(country as string, language as string);
    const result = await client.search({
      query: searchQuery,
      limit: parseInt(limit as string, 10),
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/ikea/products/{itemCode}:
 *   get:
 *     summary: Get IKEA product details by item code
 *     tags: [IKEA]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: itemCode
 *         required: true
 *         schema:
 *           type: string
 *         description: IKEA item code (e.g. 123.456.78)
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *           default: fr
 *         description: Country code for IKEA store
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *           default: fr
 *         description: Language code
 *     responses:
 *       200:
 *         description: Product details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Product not found
 *       429:
 *         description: Rate limit exceeded
 */
router.get(
  '/products/:itemCode',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const itemCode = req.params.itemCode as string;
      const { country = 'fr', language = 'fr' } = req.query;

      const client = getClient(country as string, language as string);
      const result = await client.getProduct(itemCode);

      if (!result.success) {
        res.status(404).json(result);
        return;
      }

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/ikea/products:
 *   post:
 *     summary: Get multiple IKEA products by item codes
 *     tags: [IKEA]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - itemCodes
 *             properties:
 *               itemCodes:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of IKEA item codes
 *               country:
 *                 type: string
 *                 default: fr
 *                 description: Country code for IKEA store
 *               language:
 *                 type: string
 *                 default: fr
 *                 description: Language code
 *     responses:
 *       200:
 *         description: Product details for all requested items
 *       400:
 *         description: Missing or empty itemCodes array
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
router.post('/products', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { itemCodes, country = 'fr', language = 'fr' } = req.body;

    if (!Array.isArray(itemCodes) || itemCodes.length === 0) {
      res.status(400).json({
        success: false,
        error: { code: 'MISSING_ITEMS', message: 'itemCodes array is required' },
      });
      return;
    }

    const client = getClient(country as string, language as string);
    const result = await client.getProducts(itemCodes);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/ikea/stock/{itemCode}:
 *   get:
 *     summary: Get IKEA stock availability for a product
 *     tags: [IKEA]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: itemCode
 *         required: true
 *         schema:
 *           type: string
 *         description: IKEA item code
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *           default: fr
 *         description: Country code for IKEA store
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *           default: fr
 *         description: Language code
 *     responses:
 *       200:
 *         description: Stock availability data
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
router.get(
  '/stock/:itemCode',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const itemCode = req.params.itemCode as string;
      const { country = 'fr', language = 'fr' } = req.query;

      const client = getClient(country as string, language as string);
      const result = await client.getStock(itemCode);

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/ikea/kitchen/cabinets:
 *   get:
 *     summary: Search IKEA kitchen cabinets
 *     tags: [IKEA]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Optional search query
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *           default: fr
 *         description: Country code for IKEA store
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *           default: fr
 *         description: Language code
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of results
 *     responses:
 *       200:
 *         description: Kitchen cabinet products
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
router.get(
  '/kitchen/cabinets',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { country = 'fr', language = 'fr', limit = '50', q = '' } = req.query;

      const client = getClient(country as string, language as string);
      const result = await client.searchKitchenCabinets(
        (q || '') as string,
        parseInt(limit as string, 10)
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/ikea/kitchen/appliances:
 *   get:
 *     summary: Search IKEA kitchen appliances
 *     tags: [IKEA]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Optional search query
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *           default: fr
 *         description: Country code for IKEA store
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *           default: fr
 *         description: Language code
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of results
 *     responses:
 *       200:
 *         description: Kitchen appliance products
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
router.get(
  '/kitchen/appliances',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { country = 'fr', language = 'fr', limit = '50', q = '' } = req.query;

      const client = getClient(country as string, language as string);
      const result = await client.searchAppliances(
        (q || '') as string,
        parseInt(limit as string, 10)
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/ikea/kitchen/countertops:
 *   get:
 *     summary: Search IKEA kitchen countertops
 *     tags: [IKEA]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Optional search query
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *           default: fr
 *         description: Country code for IKEA store
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *           default: fr
 *         description: Language code
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of results
 *     responses:
 *       200:
 *         description: Kitchen countertop products
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
router.get(
  '/kitchen/countertops',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { country = 'fr', language = 'fr', limit = '50', q = '' } = req.query;

      const client = getClient(country as string, language as string);
      const result = await client.searchCountertops(
        (q || '') as string,
        parseInt(limit as string, 10)
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/ikea/kitchen/metod:
 *   get:
 *     summary: Get IKEA METOD kitchen system products
 *     tags: [IKEA]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *           default: fr
 *         description: Country code for IKEA store
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *           default: fr
 *         description: Language code
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Maximum number of results
 *     responses:
 *       200:
 *         description: METOD kitchen system products
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
router.get(
  '/kitchen/metod',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { country = 'fr', language = 'fr', limit = '100' } = req.query;

      const client = getClient(country as string, language as string);
      const result = await client.getMetodProducts(parseInt(limit as string, 10));

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/ikea/kitchen/all:
 *   get:
 *     summary: Get all IKEA kitchen products aggregated from all categories
 *     description: >
 *       Aggregates products from kitchen systems (METOD, KNOXHULT, ENHET),
 *       cabinets, fronts and doors, drawers and interior fittings, worktops,
 *       sinks and faucets, lighting, and appliances.
 *     tags: [IKEA]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *           default: fr
 *         description: Country code for IKEA store
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *           default: fr
 *         description: Language code
 *       - in: query
 *         name: limitPerCategory
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Maximum number of products per category
 *     responses:
 *       200:
 *         description: All kitchen products grouped by category
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
router.get(
  '/kitchen/all',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { country = 'fr', language = 'fr', limitPerCategory = '100' } = req.query;

      const client = getClient(country as string, language as string);
      const result = await client.getAllKitchenProducts(parseInt(limitPerCategory as string, 10));

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/ikea/kitchen/category/{category}:
 *   get:
 *     summary: Get IKEA kitchen products by category
 *     tags: [IKEA]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *           enum: [cabinets, fronts, worktops, sinks, appliances, fittings, lighting]
 *         description: >
 *           Kitchen product category:
 *           cabinets (base, wall, tall), fronts (doors/drawer fronts),
 *           worktops (countertops), sinks (sinks/faucets),
 *           appliances (built-in), fittings (interior organizers), lighting
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *           default: fr
 *         description: Country code for IKEA store
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *           default: fr
 *         description: Language code
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Maximum number of results
 *     responses:
 *       200:
 *         description: Kitchen products for the specified category
 *       400:
 *         description: Invalid category
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
router.get(
  '/kitchen/category/:category',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const category = req.params.category as string;
      const { country = 'fr', language = 'fr', limit = '100' } = req.query;

      const validCategories = [
        'cabinets',
        'fronts',
        'worktops',
        'sinks',
        'appliances',
        'fittings',
        'lighting',
      ];

      if (!validCategories.includes(category)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_CATEGORY',
            message: `Invalid category. Valid categories: ${validCategories.join(', ')}`,
          },
        });
        return;
      }

      const client = getClient(country as string, language as string);
      const result = await client.getKitchenProductsByCategory(
        category as
          | 'cabinets'
          | 'fronts'
          | 'worktops'
          | 'sinks'
          | 'appliances'
          | 'fittings'
          | 'lighting',
        parseInt(limit as string, 10)
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
