/**
 * Provider Routes Factory
 *
 * Creates standardized Express routers for catalog providers.
 * Each provider gets endpoints for: products, search, categories, sync status.
 */

import { Router, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';

import { prisma } from '../../database/client';
import { runProviderSync } from '../../jobs/provider-sync.job';
import { ApplianceRepository } from '../../repositories/appliance-repository';
import { ProductRepository } from '../../repositories/product-repository';
import { authenticate, authorize } from '../middleware/auth-middleware';
import { asyncHandler } from '../middleware/error-middleware';

const productRepository = new ProductRepository(prisma);
const applianceRepository = new ApplianceRepository(prisma);

export interface ProviderRouteConfig {
  /** Provider code matching CatalogProvider.code (e.g. 'leroy-merlin') */
  providerCode: string;
  /** Display name for error messages */
  displayName: string;
  /** Provider type: 'furniture' queries Products, 'appliance' queries Appliances */
  type: 'furniture' | 'appliance';
  /** Rate limit: max requests per minute (default: 30) */
  rateLimit?: number;
  /** Additional categories specific to this provider */
  categories?: string[];
}

/**
 * Create a standard provider router with product/appliance endpoints
 */
export function createProviderRoutes(config: ProviderRouteConfig): Router {
  const router = Router();

  const limiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: config.rateLimit || 30,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT',
        message: `Too many ${config.displayName} API requests, please try again later`,
      },
    },
  });

  router.use(limiter);

  // ==================== PROVIDER INFO ====================

  /**
   * @swagger
   * /api/v1/{provider}/info:
   *   get:
   *     summary: Get catalog provider metadata
   *     description: Returns provider information including product/appliance/catalog counts. Applies to leroy-merlin, castorama, schmidt, bosch providers.
   *     tags: [Catalog Providers]
   *     parameters:
   *       - in: path
   *         name: provider
   *         required: true
   *         schema:
   *           type: string
   *           enum: [leroy-merlin, castorama, schmidt, bosch]
   *         description: Provider identifier
   *     responses:
   *       200:
   *         description: Provider metadata
   *       404:
   *         description: Provider not configured
   *       429:
   *         description: Rate limit exceeded
   */
  router.get(
    '/info',
    asyncHandler(async (_req: Request, res: Response) => {
      const provider = await prisma.catalogProvider.findFirst({
        where: { code: config.providerCode },
        include: {
          _count: {
            select: {
              products: true,
              appliances: true,
              catalogs: true,
            },
          },
        },
      });

      if (!provider) {
        res.status(404).json({
          success: false,
          error: `Provider '${config.displayName}' not configured`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          id: provider.id,
          name: provider.name,
          code: provider.code,
          isActive: provider.isActive,
          productCount: provider._count.products,
          applianceCount: provider._count.appliances,
          catalogCount: provider._count.catalogs,
        },
      });
    })
  );

  if (config.type === 'furniture') {
    addFurnitureRoutes(router, config);
  } else {
    addApplianceRoutes(router, config);
  }

  // ==================== SYNC ROUTES (protected) ====================

  /**
   * @swagger
   * /api/v1/{provider}/sync/status:
   *   get:
   *     summary: Get last synchronization status for a catalog provider
   *     tags: [Catalog Providers]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: provider
   *         required: true
   *         schema:
   *           type: string
   *           enum: [leroy-merlin, castorama, schmidt, bosch]
   *         description: Provider identifier
   *     responses:
   *       200:
   *         description: Sync status with last sync timestamp and catalog version
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Provider not found
   */
  router.get(
    '/sync/status',
    authenticate,
    asyncHandler(async (_req: Request, res: Response) => {
      const provider = await prisma.catalogProvider.findFirst({
        where: { code: config.providerCode },
        include: {
          catalogs: {
            orderBy: { lastSyncAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!provider) {
        res.status(404).json({ success: false, error: 'Provider not found' });
        return;
      }

      const lastCatalog = provider.catalogs[0];
      res.status(200).json({
        success: true,
        data: {
          providerId: provider.id,
          providerCode: config.providerCode,
          isActive: provider.isActive,
          lastSyncAt: lastCatalog?.lastSyncAt || null,
          catalogVersion: lastCatalog?.version || null,
        },
      });
    })
  );

  /**
   * @swagger
   * /api/v1/{provider}/sync/trigger:
   *   post:
   *     summary: Trigger manual catalog sync (admin only)
   *     tags: [Catalog Providers]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: provider
   *         required: true
   *         schema:
   *           type: string
   *           enum: [leroy-merlin, castorama, schmidt, bosch]
   *         description: Provider identifier
   *     responses:
   *       202:
   *         description: Sync job queued
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Admin access required
   *       404:
   *         description: Provider not found
   */
  router.post(
    '/sync/trigger',
    authenticate,
    authorize(['admin']),
    asyncHandler(async (_req: Request, res: Response) => {
      const provider = await prisma.catalogProvider.findFirst({
        where: { code: config.providerCode },
      });

      if (!provider) {
        res.status(404).json({ success: false, error: 'Provider not found' });
        return;
      }

      // Run the sync inline. Each provider has at most a few hundred rows so
      // this stays well under request budget. Heavy real-scraping should be
      // delegated to the @kitchenxpert/scraper BullMQ pipeline via
      // SCRAPER_BRIDGE_ENABLED=1 — see jobs/sync-sources/scraper-bridge-source.ts.
      const [stats] = await runProviderSync(prisma, { providers: [config.providerCode] });

      res.status(202).json({
        success: true,
        data: {
          providerId: provider.id,
          providerCode: config.providerCode,
          ...stats,
        },
      });
    })
  );

  return router;
}

// ==================== FURNITURE ROUTES ====================

function addFurnitureRoutes(router: Router, config: ProviderRouteConfig): void {
  /**
   * @swagger
   * /api/v1/{provider}/products:
   *   get:
   *     summary: List products from a catalog provider with pagination and filters
   *     description: Applies to furniture providers (leroy-merlin, castorama, schmidt).
   *     tags: [Catalog Providers]
   *     parameters:
   *       - in: path
   *         name: provider
   *         required: true
   *         schema:
   *           type: string
   *           enum: [leroy-merlin, castorama, schmidt]
   *         description: Furniture provider identifier
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Page number
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *           maximum: 100
   *         description: Items per page
   *       - in: query
   *         name: categoryId
   *         schema:
   *           type: string
   *         description: Filter by category ID
   *       - in: query
   *         name: material
   *         schema:
   *           type: string
   *         description: Filter by material
   *       - in: query
   *         name: color
   *         schema:
   *           type: string
   *         description: Filter by color
   *       - in: query
   *         name: minPrice
   *         schema:
   *           type: number
   *         description: Minimum price filter
   *       - in: query
   *         name: maxPrice
   *         schema:
   *           type: number
   *         description: Maximum price filter
   *       - in: query
   *         name: sortBy
   *         schema:
   *           type: string
   *           default: name
   *         description: Sort field
   *       - in: query
   *         name: sortOrder
   *         schema:
   *           type: string
   *           enum: [asc, desc]
   *           default: asc
   *         description: Sort direction
   *     responses:
   *       200:
   *         description: Paginated list of products
   *       404:
   *         description: Provider not found
   *       429:
   *         description: Rate limit exceeded
   */
  router.get(
    '/products',
    asyncHandler(async (req: Request, res: Response) => {
      const {
        page = '1',
        limit = '20',
        categoryId,
        material,
        color,
        minPrice,
        maxPrice,
        sortBy = 'name',
        sortOrder = 'asc',
      } = req.query;

      const provider = await prisma.catalogProvider.findFirst({
        where: { code: config.providerCode },
      });

      if (!provider) {
        res.status(404).json({ success: false, error: 'Provider not found' });
        return;
      }

      const result = await productRepository.findAll(
        {
          providerId: provider.id,
          categoryId: categoryId as string,
          material: material as string,
          color: color as string,
          minPrice: minPrice ? Number(minPrice) : undefined,
          maxPrice: maxPrice ? Number(maxPrice) : undefined,
        },
        {
          page: Number(page),
          limit: Math.min(Number(limit), 100),
          sortBy: sortBy as string,
          sortOrder: sortOrder as 'asc' | 'desc',
        }
      );

      res.status(200).json({
        success: true,
        data: result.data,
        meta: {
          page: result.page,
          limit: Math.min(Number(limit), 100),
          total: result.total,
          totalPages: result.totalPages,
          provider: config.providerCode,
        },
      });
    })
  );

  /**
   * @swagger
   * /api/v1/{provider}/products/search:
   *   get:
   *     summary: Search products from a catalog provider
   *     tags: [Catalog Providers]
   *     parameters:
   *       - in: path
   *         name: provider
   *         required: true
   *         schema:
   *           type: string
   *           enum: [leroy-merlin, castorama, schmidt]
   *         description: Furniture provider identifier
   *       - in: query
   *         name: q
   *         required: true
   *         schema:
   *           type: string
   *         description: Search query string
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *           maximum: 100
   *         description: Maximum number of results
   *     responses:
   *       200:
   *         description: Search results
   *       400:
   *         description: Missing query parameter
   *       404:
   *         description: Provider not found
   *       429:
   *         description: Rate limit exceeded
   */
  router.get(
    '/products/search',
    asyncHandler(async (req: Request, res: Response) => {
      const { q, limit = '20' } = req.query;

      if (!q) {
        res.status(400).json({
          success: false,
          error: { code: 'MISSING_QUERY', message: 'Query parameter "q" is required' },
        });
        return;
      }

      const provider = await prisma.catalogProvider.findFirst({
        where: { code: config.providerCode },
      });

      if (!provider) {
        res.status(404).json({ success: false, error: 'Provider not found' });
        return;
      }

      // Search within this provider's products
      const products = await productRepository.findAll(
        {
          providerId: provider.id,
          search: q as string,
        },
        { page: 1, limit: Math.min(Number(limit), 100) }
      );

      res.status(200).json({
        success: true,
        data: products.data,
        meta: { total: products.total, provider: config.providerCode },
      });
    })
  );

  /**
   * @swagger
   * /api/v1/{provider}/products/{id}:
   *   get:
   *     summary: Get a specific product from a catalog provider
   *     tags: [Catalog Providers]
   *     parameters:
   *       - in: path
   *         name: provider
   *         required: true
   *         schema:
   *           type: string
   *           enum: [leroy-merlin, castorama, schmidt]
   *         description: Furniture provider identifier
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Product ID
   *     responses:
   *       200:
   *         description: Product details
   *       404:
   *         description: Product not found
   *       429:
   *         description: Rate limit exceeded
   */
  router.get(
    '/products/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const id = req.params['id'] || '';
      const product = await productRepository.findById(id);

      if (!product) {
        res.status(404).json({ success: false, error: 'Product not found' });
        return;
      }

      res.status(200).json({ success: true, data: product });
    })
  );

  /**
   * @swagger
   * /api/v1/{provider}/categories:
   *   get:
   *     summary: Get available product categories for a catalog provider
   *     tags: [Catalog Providers]
   *     parameters:
   *       - in: path
   *         name: provider
   *         required: true
   *         schema:
   *           type: string
   *           enum: [leroy-merlin, castorama, schmidt]
   *         description: Furniture provider identifier
   *     responses:
   *       200:
   *         description: List of product categories with product counts
   *       404:
   *         description: Provider not found
   *       429:
   *         description: Rate limit exceeded
   */
  router.get(
    '/categories',
    asyncHandler(async (_req: Request, res: Response) => {
      const provider = await prisma.catalogProvider.findFirst({
        where: { code: config.providerCode },
      });

      if (!provider) {
        res.status(404).json({ success: false, error: 'Provider not found' });
        return;
      }

      // Get categories that have products from this provider
      const categories = await prisma.productCategory.findMany({
        where: {
          products: {
            some: { providerId: provider.id },
          },
        },
        include: {
          _count: {
            select: { products: true },
          },
        },
        orderBy: { sortOrder: 'asc' },
      });

      res.status(200).json({ success: true, data: categories });
    })
  );
}

// ==================== APPLIANCE ROUTES ====================

function addApplianceRoutes(router: Router, config: ProviderRouteConfig): void {
  /**
   * @swagger
   * /api/v1/{provider}/appliances:
   *   get:
   *     summary: List appliances from a catalog provider with pagination and filters
   *     description: Applies to appliance providers (bosch).
   *     tags: [Catalog Providers]
   *     parameters:
   *       - in: path
   *         name: provider
   *         required: true
   *         schema:
   *           type: string
   *           enum: [bosch]
   *         description: Appliance provider identifier
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Page number
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *           maximum: 100
   *         description: Items per page
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *         description: Filter by appliance type
   *       - in: query
   *         name: energyRating
   *         schema:
   *           type: string
   *         description: Filter by energy rating
   *       - in: query
   *         name: minPrice
   *         schema:
   *           type: number
   *         description: Minimum price filter
   *       - in: query
   *         name: maxPrice
   *         schema:
   *           type: number
   *         description: Maximum price filter
   *     responses:
   *       200:
   *         description: Paginated list of appliances
   *       429:
   *         description: Rate limit exceeded
   */
  router.get(
    '/appliances',
    asyncHandler(async (req: Request, res: Response) => {
      const { page = '1', limit = '20', type, energyRating, minPrice, maxPrice } = req.query;

      const result = await applianceRepository.findAll(
        {
          brand: config.displayName,
          type: type as string,
          energyRating: energyRating as string,
          minPrice: minPrice ? Number(minPrice) : undefined,
          maxPrice: maxPrice ? Number(maxPrice) : undefined,
        },
        { page: Number(page), limit: Math.min(Number(limit), 100) }
      );

      res.status(200).json({
        success: true,
        data: result.data,
        meta: {
          page: result.page,
          limit: Math.min(Number(limit), 100),
          total: result.total,
          totalPages: result.totalPages,
          provider: config.providerCode,
        },
      });
    })
  );

  /**
   * @swagger
   * /api/v1/{provider}/appliances/search:
   *   get:
   *     summary: Search appliances from a catalog provider
   *     tags: [Catalog Providers]
   *     parameters:
   *       - in: path
   *         name: provider
   *         required: true
   *         schema:
   *           type: string
   *           enum: [bosch]
   *         description: Appliance provider identifier
   *       - in: query
   *         name: q
   *         required: true
   *         schema:
   *           type: string
   *         description: Search query string
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *           maximum: 100
   *         description: Maximum number of results
   *     responses:
   *       200:
   *         description: Search results
   *       400:
   *         description: Missing query parameter
   *       429:
   *         description: Rate limit exceeded
   */
  router.get(
    '/appliances/search',
    asyncHandler(async (req: Request, res: Response) => {
      const { q, limit = '20' } = req.query;

      if (!q) {
        res.status(400).json({
          success: false,
          error: { code: 'MISSING_QUERY', message: 'Query parameter "q" is required' },
        });
        return;
      }

      // Search scoped to this brand via repository
      const appliances = await applianceRepository.search(
        `${config.displayName} ${q as string}`,
        Math.min(Number(limit), 100)
      );

      res.status(200).json({
        success: true,
        data: appliances,
        meta: { provider: config.providerCode },
      });
    })
  );

  /**
   * @swagger
   * /api/v1/{provider}/appliances/types:
   *   get:
   *     summary: Get available appliance types for a provider
   *     tags: [Catalog Providers]
   *     parameters:
   *       - in: path
   *         name: provider
   *         required: true
   *         schema:
   *           type: string
   *           enum: [bosch]
   *         description: Appliance provider identifier
   *     responses:
   *       200:
   *         description: List of available appliance types
   *       429:
   *         description: Rate limit exceeded
   */
  router.get(
    '/appliances/types',
    asyncHandler(async (_req: Request, res: Response) => {
      const types = await applianceRepository.getTypes();
      res.status(200).json({ success: true, data: types });
    })
  );

  /**
   * @swagger
   * /api/v1/{provider}/appliances/{id}:
   *   get:
   *     summary: Get a specific appliance from a catalog provider
   *     tags: [Catalog Providers]
   *     parameters:
   *       - in: path
   *         name: provider
   *         required: true
   *         schema:
   *           type: string
   *           enum: [bosch]
   *         description: Appliance provider identifier
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Appliance ID
   *     responses:
   *       200:
   *         description: Appliance details
   *       404:
   *         description: Appliance not found
   *       429:
   *         description: Rate limit exceeded
   */
  router.get(
    '/appliances/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const id = req.params['id'] || '';
      const appliance = await applianceRepository.findById(id);

      if (!appliance) {
        res.status(404).json({ success: false, error: 'Appliance not found' });
        return;
      }

      res.status(200).json({ success: true, data: appliance });
    })
  );
}
