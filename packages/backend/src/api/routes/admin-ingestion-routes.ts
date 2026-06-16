/**
 * Admin catalog ingestion routes (CLAUDE.md §15.8 step d).
 *
 * POST /api/v1/admin/ingestion/run — déclenche une ingestion pour une marque :
 * IngestionOrchestrator -> Strategy -> CatalogIngestionService -> upsert dans
 * backend.Product. Admin-only (mirroir du pattern admin-routes). La réponse est
 * un IngestResult { brand, query, fetched, ingested, skipped, errors }.
 */
import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { IngestionOrchestrator, SUPPORTED_BRANDS } from '@kitchenxpert/common';

import { authenticate, authorize } from '../middleware/auth-middleware';
import { validateBody } from '../middleware/validation-middleware';
import { prisma } from '../../database/client';
import { ProductRepository } from '../../repositories/product-repository';
import { CatalogIngestionService } from '../../services/ingestion/catalog-ingestion.service';
import { PrismaCategoryResolver } from '../../services/ingestion/category-resolver';
import { HttpJsonFetcher } from '../../services/ingestion/http-json-fetcher';
import logger from '../../utils/logger';

const router: RouterType = Router();

// Admin-only (cf admin-routes.ts pattern).
router.use(authenticate);
router.use(authorize(['admin']));

const runSchema = z.object({
  brand: z.enum(['ikea', 'lapeyre', 'eprel', 'castorama'], {
    required_error: 'brand is required',
    invalid_type_error: `brand must be one of: ${SUPPORTED_BRANDS.join(', ')}`,
  }),
  // Pour EPREL : un code de groupe (ex. dishwashers2019). Pour ikea/lapeyre :
  // un mot-clé/catégorie produit (ex. "metod", "plan de travail").
  query: z.string().min(1, 'query is required'),
  // EPREL uniquement : plafond de produits à ingérer ce run (la Strategy
  // pagine jusque-là). Ignoré par ikea/lapeyre. Garde-fou 1..5000.
  maxProducts: z.coerce.number().int().min(1).max(5000).optional(),
});

/**
 * POST /run — ingest one brand+query into the catalog. Idempotent (upsert by
 * SKU). Returns the tally; never partially-throws (skip-not-crash service).
 */
router.post('/run', validateBody(runSchema), async (req, res, next) => {
  try {
    const { brand, query, maxProducts } = req.body as z.infer<typeof runSchema>;
    const orchestrator = new IngestionOrchestrator(new HttpJsonFetcher());
    const strategy = orchestrator.strategyFor(brand, { maxProducts });
    const service = new CatalogIngestionService(
      new ProductRepository(prisma),
      strategy,
      logger,
      new PrismaCategoryResolver(prisma),
    );
    const result = await service.ingestByCategory(query);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
