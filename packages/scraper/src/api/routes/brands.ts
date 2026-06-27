/**
 * Brands API Routes
 */

import { Router, Request, Response } from 'express';
import {
  BRANDS_CONFIG,
  getBrandConfig,
  getBrandsBySegment,
  getBrandsByGroup,
  getBrandsWithPrices,
} from '../../config/brands.config.js';
import type { Segment } from '../../models/brand.js';
import { getBrandStatsById, getCollectionsByBrandId } from '../../services/db-query.service.js';

export function createBrandsRouter(): Router {
  const router = Router();

  /**
   * GET /api/v1/brands
   * Get all brands
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      let brands = BRANDS_CONFIG;

      // Filter by segment
      if (req.query.segment) {
        brands = getBrandsBySegment(req.query.segment as Segment);
      }

      // Filter by group
      if (req.query.group) {
        brands = getBrandsByGroup(String(req.query.group));
      }

      // Filter by online prices
      if (req.query.has_prices === 'true') {
        brands = getBrandsWithPrices();
      }

      // Filter enabled only
      if (req.query.enabled !== 'false') {
        brands = brands.filter((b) => b.enabled);
      }

      // Sort by priority
      brands = brands.sort((a, b) => a.priority - b.priority);

      res.json({
        data: brands.map((b) => ({
          id: b.id,
          name: b.name,
          slug: b.slug,
          parentGroup: b.parentGroup,
          segment: b.segment,
          country: b.country,
          website: b.website,
          hasPricesOnline: b.hasPricesOnline,
          has3DConfigurator: b.has3DConfigurator,
          priority: b.priority,
          enabled: b.enabled,
        })),
        total: brands.length,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch brands',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/v1/brands/meta/groups
   * Get all brand groups
   */
  router.get('/meta/groups', async (_req: Request, res: Response) => {
    try {
      const groups = new Map<string, { name: string; brands: string[] }>();

      BRANDS_CONFIG.forEach((brand) => {
        const groupName = brand.parentGroup || 'Indépendant';
        if (!groups.has(groupName)) {
          groups.set(groupName, { name: groupName, brands: [] });
        }
        groups.get(groupName)!.brands.push(brand.name);
      });

      res.json({
        groups: Array.from(groups.values()),
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch brand groups',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/v1/brands/meta/segments
   * Get brands by segment
   */
  router.get('/meta/segments', async (_req: Request, res: Response) => {
    try {
      const segments: Record<string, { label: string; count: number }> = {
        entry: { label: 'Entrée de gamme', count: 0 },
        entry_mid: { label: 'Entrée-Milieu de gamme', count: 0 },
        mid: { label: 'Milieu de gamme', count: 0 },
        mid_premium: { label: 'Milieu-Premium', count: 0 },
        premium: { label: 'Premium', count: 0 },
        luxury: { label: 'Luxe', count: 0 },
      };

      BRANDS_CONFIG.forEach((brand) => {
        if (segments[brand.segment]) {
          segments[brand.segment]!.count++;
        }
      });

      res.json({ segments });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch segments',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/v1/brands/:id/collections
   * Get collections for a brand
   */
  router.get('/:id/collections', async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id;
      if (!id) {
        res.status(400).json({ error: 'Bad Request', message: 'Brand ID is required' });
        return;
      }
      const brand = getBrandConfig(id);

      if (!brand) {
        res.status(404).json({
          error: 'Not Found',
          message: `Brand with ID ${id} not found`,
        });
        return;
      }

      const collections = await getCollectionsByBrandId(id);

      res.json({
        brandId: id,
        brandName: brand.name,
        collections,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch collections',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/v1/brands/:id
   * Get brand by ID or slug
   */
  router.get('/:id', async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id;
      if (!id) {
        res.status(400).json({ error: 'Bad Request', message: 'Brand ID is required' });
        return;
      }
      const brand = getBrandConfig(id);

      if (!brand) {
        res.status(404).json({
          error: 'Not Found',
          message: `Brand with ID ${id} not found`,
        });
        return;
      }

      // Get actual product counts from database
      const stats = await getBrandStatsById(id);

      res.json({
        ...brand,
        stats: stats || {
          collectionsCount: 0,
          cabinetsCount: 0,
          facadesCount: 0,
          worktopsCount: 0,
          appliancesCount: 0,
          lastScrapedAt: null,
        },
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch brand',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return router;
}

export default createBrandsRouter;
