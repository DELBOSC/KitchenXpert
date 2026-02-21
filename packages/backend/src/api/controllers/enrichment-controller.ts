import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/error-middleware.js';
import { prisma } from '../../database/client.js';
import logger from '../../utils/logger.js';
import { ProductEnrichmentService } from '../../services/ai/product-enrichment.service.js';
import { CompatibilityGeneratorService } from '../../services/ai/compatibility-generator.service.js';
import { ProductMatcherService } from '../../services/ai/product-matcher.service.js';

/**
 * EnrichmentController
 *
 * Wires the three AI enrichment services (product enrichment, compatibility
 * matrix generation, and cross-brand product matching) to HTTP endpoints.
 */
export class EnrichmentController {
  private enrichmentService: ProductEnrichmentService;
  private compatibilityService: CompatibilityGeneratorService;
  private matcherService: ProductMatcherService;

  constructor() {
    this.enrichmentService = ProductEnrichmentService.getInstance();
    this.compatibilityService = CompatibilityGeneratorService.getInstance();
    this.matcherService = ProductMatcherService.getInstance();
  }
  /**
   * POST /enrichment/enrich
   * Enriches specific products by IDs.
   * Body: { products: Array<{ type, id, name, brand?, description?, rawHtml? }> }
   */
  enrich = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const { products } = req.body;
    if (!Array.isArray(products) || products.length === 0) {
      res.status(400).json({ success: false, error: 'products array is required and must not be empty' });
      return;
    }

    logger.info('[Enrichment] Enriching batch of products', {
      userId,
      count: products.length,
    });

    const results = await this.enrichmentService.enrichBatch(
      products.map((p: { type: string; id: string; name: string; brand?: string; description?: string; rawHtml?: string }) => ({
        id: p.id,
        type: p.type,
        name: p.name,
        brand: p.brand,
        description: p.description,
        rawHtml: p.rawHtml,
      })),
    );

    res.status(200).json({ success: true, data: results });
  });
  /**
   * POST /enrichment/enrich-all
   * Launches enrichment for all pending products (admin only).
   * Returns immediately and processes in the background.
   */
  enrichAll = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    if (req.user?.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Admin access required' });
      return;
    }

    // Get pending count before starting
    const stats = await this.enrichmentService.getStats();
    const pendingCount = stats.pending;

    logger.info('[Enrichment] Starting enrichment for all pending products', {
      userId,
      pendingCount,
    });

    // Start processing in background (non-blocking)
    const enrichmentService = this.enrichmentService;
    setImmediate(async () => {
      try {
        let processed = 0;
        let batchResult = 1;
        while (batchResult > 0) {
          batchResult = await enrichmentService.processPendingBatch();
          processed += batchResult;
        }
        logger.info('[Enrichment] Background enrichment completed', { processed });
      } catch (error) {
        logger.error('[Enrichment] Background enrichment failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    res.status(200).json({
      success: true,
      data: { message: 'Enrichment started', pendingCount },
    });
  });
  /**
   * GET /enrichment/status
   * Returns enrichment statistics.
   */
  getStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const stats = await this.enrichmentService.getStats();

    res.status(200).json({ success: true, data: stats });
  });

  /**
   * GET /enrichment/product/:type/:id
   * Gets enriched specs for a specific product.
   */
  getProductEnrichment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const { type, id } = req.params;
    if (!type || !id) {
      res.status(400).json({ success: false, error: 'Product type and id are required' });
      return;
    }

    const enrichment = await prisma.productEnrichment.findUnique({
      where: {
        productType_productId: {
          productType: type,
          productId: id,
        },
      },
    });

    if (!enrichment) {
      res.status(404).json({ success: false, error: 'Product enrichment not found' });
      return;
    }

    res.status(200).json({ success: true, data: enrichment });
  });
  /**
   * POST /enrichment/compatibility/generate
   * Generates the full compatibility matrix (admin only).
   */
  generateCompatibility = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    if (req.user?.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Admin access required' });
      return;
    }

    logger.info('[Enrichment] Generating full compatibility matrix', { userId });

    const result = await this.compatibilityService.generateFullMatrix();

    res.status(200).json({ success: true, data: result });
  });

  /**
   * GET /enrichment/compatibility/:cabinetType
   * Gets compatibility rules for a specific cabinet type.
   */
  getCompatibilityRules = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const { cabinetType } = req.params;
    if (!cabinetType) {
      res.status(400).json({ success: false, error: 'cabinetType is required' });
      return;
    }

    const rules = await this.compatibilityService.getRulesForCabinet(cabinetType);

    res.status(200).json({ success: true, data: rules });
  });
  /**
   * GET /enrichment/compatibility/check
   * Checks compatibility between a cabinet type and an appliance type.
   * Query params: cabinetType, applianceType
   */
  checkCompatibility = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const { cabinetType, applianceType } = req.query;
    if (!cabinetType || !applianceType) {
      res.status(400).json({ success: false, error: 'cabinetType and applianceType query params are required' });
      return;
    }

    const result = await this.compatibilityService.checkCompatibility(
      cabinetType as string,
      applianceType as string,
    );

    res.status(200).json({ success: true, data: result });
  });
  /**
   * POST /enrichment/match/:brandA/:brandB
   * Cross-matches products between two brands (admin only).
   * Body: { productType?: string }
   */
  crossMatchBrands = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    if (req.user?.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Admin access required' });
      return;
    }

    const { brandA, brandB } = req.params;
    if (!brandA || !brandB) {
      res.status(400).json({ success: false, error: 'brandA and brandB are required' });
      return;
    }

    const { productType } = req.body;

    logger.info('[Enrichment] Cross-matching brands', {
      userId,
      brandA,
      brandB,
      productType: productType || 'all',
    });

    const matchCount = await this.matcherService.crossMatchBrands(
      brandA,
      brandB,
      productType || '',
    );

    res.status(200).json({
      success: true,
      data: { matchCount, brandA, brandB, productType: productType || 'all' },
    });
  });
  /**
   * GET /enrichment/matches/:productId
   * Gets all matches for a specific product.
   */
  getProductMatches = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const { productId } = req.params;
    if (!productId) {
      res.status(400).json({ success: false, error: 'productId is required' });
      return;
    }

    const matches = await this.matcherService.getMatchesForProduct(productId);

    res.status(200).json({ success: true, data: matches });
  });
}

export const enrichmentController = new EnrichmentController();
export default enrichmentController;
