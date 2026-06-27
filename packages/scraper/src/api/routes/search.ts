/**
 * Search API Routes
 *
 * Smart search for KitchenXpert AI integration
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  searchAllProducts,
  getSearchSuggestions,
  findCompatibleProducts,
  findSimilarProducts,
  queryCabinets,
  queryAppliances,
  queryFacades,
  queryWorktops,
} from '../../services/db-query.service.js';

// Smart search request schema
const SmartSearchSchema = z.object({
  roomWidth: z.number().min(1000).max(10000).optional(),
  roomDepth: z.number().min(1000).max(10000).optional(),
  layout: z.enum(['I', 'L', 'U', 'G', 'parallel', 'island', 'peninsula']).optional(),
  style: z.array(z.string()).optional(),
  budget: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
      currency: z.string().default('EUR'),
    })
    .optional(),
  mustHave: z.array(z.string()).optional(),
  niceToHave: z.array(z.string()).optional(),
  brands: z.array(z.string()).optional(),
  excludeBrands: z.array(z.string()).optional(),
  segments: z.array(z.string()).optional(),
  prioritize: z.enum(['price', 'quality', 'brand', 'availability']).optional(),
});

// Type exported for external use
export type SmartSearchRequest = z.infer<typeof SmartSearchSchema>;

export function createSearchRouter(): Router {
  const router = Router();

  /**
   * POST /api/v1/search/smart
   * AI-powered smart search for kitchen configurations
   */
  router.post('/smart', async (req: Request, res: Response) => {
    try {
      const searchRequest = SmartSearchSchema.parse(req.body);

      // Determine cabinet sizes needed based on room dimensions
      const neededWidths: number[] = [];
      if (searchRequest.roomWidth) {
        // Simple heuristic: suggest standard widths that fit the room
        const standardWidths = [300, 400, 600, 800, 900];
        for (const width of standardWidths) {
          if (width <= searchRequest.roomWidth / 2) {
            neededWidths.push(width);
          }
        }
      }

      // Build query parameters based on search request
      const cabinetParams = {
        brandIds: searchRequest.brands,
        priceMin: searchRequest.budget?.min,
        priceMax: searchRequest.budget?.max,
        limit: 10,
        offset: 0,
      };

      // Query different cabinet categories
      const [baseCabinets, wallCabinets, tallCabinets] = await Promise.all([
        queryCabinets({
          ...cabinetParams,
          categories: ['base'],
          types: undefined,
          widthMin: undefined,
          widthMax: undefined,
          heightMin: undefined,
          heightMax: undefined,
          sinkCompatible: undefined,
          hobCompatible: undefined,
        }),
        queryCabinets({
          ...cabinetParams,
          categories: ['wall'],
          types: undefined,
          widthMin: undefined,
          widthMax: undefined,
          heightMin: undefined,
          heightMax: undefined,
          sinkCompatible: undefined,
          hobCompatible: undefined,
        }),
        queryCabinets({
          ...cabinetParams,
          categories: ['tall'],
          types: undefined,
          widthMin: undefined,
          widthMax: undefined,
          heightMin: undefined,
          heightMax: undefined,
          sinkCompatible: undefined,
          hobCompatible: undefined,
        }),
      ]);

      // Query worktops and facades
      const [worktops, facades] = await Promise.all([
        queryWorktops({
          brandIds: searchRequest.brands,
          priceMin: searchRequest.budget?.min,
          priceMax: searchRequest.budget?.max,
          limit: 5,
        }),
        queryFacades({
          brandIds: searchRequest.brands,
          priceMin: searchRequest.budget?.min,
          priceMax: searchRequest.budget?.max,
          limit: 5,
          styles: searchRequest.style as never[],
        }),
      ]);

      // Query appliances by category
      const [cookingAppliances, extractionAppliances, coldAppliances, washingAppliances] =
        await Promise.all([
          queryAppliances({
            brandIds: searchRequest.brands,
            priceMin: searchRequest.budget?.min,
            priceMax: searchRequest.budget?.max,
            categories: ['cooking'],
            limit: 5,
          }),
          queryAppliances({
            brandIds: searchRequest.brands,
            priceMin: searchRequest.budget?.min,
            priceMax: searchRequest.budget?.max,
            categories: ['extraction'],
            limit: 5,
          }),
          queryAppliances({
            brandIds: searchRequest.brands,
            priceMin: searchRequest.budget?.min,
            priceMax: searchRequest.budget?.max,
            categories: ['cold'],
            limit: 5,
          }),
          queryAppliances({
            brandIds: searchRequest.brands,
            priceMin: searchRequest.budget?.min,
            priceMax: searchRequest.budget?.max,
            categories: ['washing'],
            limit: 5,
          }),
        ]);

      // Calculate totals and estimate prices
      const totalProducts =
        baseCabinets.pagination.total +
        wallCabinets.pagination.total +
        tallCabinets.pagination.total +
        worktops.pagination.total +
        facades.pagination.total +
        cookingAppliances.pagination.total +
        extractionAppliances.pagination.total +
        coldAppliances.pagination.total +
        washingAppliances.pagination.total;

      // Collect unique brands
      const brandsCovered = new Set<string>();
      const collectBrands = (items: unknown[]) => {
        for (const item of items) {
          const product = item as { brand?: { name?: string } };
          if (product.brand?.name) {
            brandsCovered.add(product.brand.name);
          }
        }
      };
      collectBrands(baseCabinets.data);
      collectBrands(wallCabinets.data);
      collectBrands(tallCabinets.data);
      collectBrands(worktops.data);
      collectBrands(facades.data);

      const recommendations = {
        cabinets: {
          base: baseCabinets.data,
          wall: wallCabinets.data,
          tall: tallCabinets.data,
          corner: [],
        },
        worktops: worktops.data,
        facades: facades.data,
        appliances: {
          cooking: cookingAppliances.data,
          extraction: extractionAppliances.data,
          cold: coldAppliances.data,
          washing: washingAppliances.data,
        },
        accessories: [],
        summary: {
          totalProducts,
          estimatedPrice: {
            min: searchRequest.budget?.min || 0,
            max: searchRequest.budget?.max || 0,
            currency: searchRequest.budget?.currency || 'EUR',
          },
          matchScore: totalProducts > 0 ? Math.min(95, 50 + totalProducts) : 0,
          brandsCovered: Array.from(brandsCovered),
        },
      };

      res.json({
        success: true,
        request: searchRequest,
        recommendations,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Invalid request',
          details: error.errors,
        });
        return;
      }

      res.status(500).json({
        error: 'Search failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/v1/search/suggest
   * Autocomplete suggestions
   */
  router.get('/suggest', async (req: Request, res: Response) => {
    try {
      const query = String(req.query.q || '')
        .trim()
        .toLowerCase();
      const type = req.query.type as string | undefined;
      const limit = Math.min(parseInt(String(req.query.limit || '10'), 10), 50);

      if (query.length < 2) {
        res.json({ suggestions: [] });
        return;
      }

      const suggestions = await getSearchSuggestions(query, type, limit);

      res.json({
        query,
        type,
        suggestions,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Suggestions failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/v1/search/compatible
   * Find compatible products
   */
  router.get('/compatible', async (req: Request, res: Response) => {
    try {
      const productId = req.query.product_id as string;
      const productType = req.query.product_type as string;
      // limit could be used in future enhancement
      // const limit = Math.min(parseInt(String(req.query.limit || '20'), 10), 100);

      if (!productId || !productType) {
        res.status(400).json({
          error: 'Missing parameters',
          message: 'product_id and product_type are required',
        });
        return;
      }

      const compatible = await findCompatibleProducts(productId, productType);

      res.json({
        productId,
        productType,
        compatible,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Compatibility search failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /api/v1/search/similar
   * Find similar products
   */
  router.post('/similar', async (req: Request, res: Response) => {
    try {
      const { productId, productType, maxResults = 10 } = req.body;

      if (!productId || !productType) {
        res.status(400).json({
          error: 'Missing parameters',
          message: 'productId and productType are required',
        });
        return;
      }

      const similar = await findSimilarProducts(productId, productType, maxResults);

      res.json({
        productId,
        productType,
        similar,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Similarity search failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/v1/search/text
   * Full-text search across all products
   */
  router.get('/text', async (req: Request, res: Response) => {
    try {
      const query = String(req.query.q || '').trim();
      const types = req.query.types ? String(req.query.types).split(',') : undefined;
      const brands = req.query.brands ? String(req.query.brands).split(',') : undefined;
      const limit = Math.min(parseInt(String(req.query.limit || '20'), 10), 100);
      const offset = parseInt(String(req.query.offset || '0'), 10);

      if (!query) {
        res.status(400).json({
          error: 'Missing query',
          message: 'q parameter is required',
        });
        return;
      }

      const result = await searchAllProducts(query, { types, brands, limit, offset });

      res.json({
        query,
        filters: { types, brands },
        results: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Text search failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return router;
}

export default createSearchRouter;
