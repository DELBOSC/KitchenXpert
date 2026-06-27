/**
 * Cabinets API Routes
 */

import { Router, Request, Response } from 'express';
import type { CabinetType, CabinetCategory, CabinetSearchParams } from '../../models/cabinet.js';
import {
  queryCabinets,
  getCabinetById,
  getCabinetByReference,
  getCabinetTypesCounts,
  getCabinetWidthsCounts,
} from '../../services/db-query.service.js';

export function createCabinetsRouter(): Router {
  const router = Router();

  /**
   * GET /api/v1/cabinets
   * Search and filter cabinets
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const params: CabinetSearchParams = {
        brandIds: req.query.brand ? String(req.query.brand).split(',') : undefined,
        collectionIds: req.query.collection ? String(req.query.collection).split(',') : undefined,
        types: req.query.type ? (String(req.query.type).split(',') as CabinetType[]) : undefined,
        categories: req.query.category
          ? (String(req.query.category).split(',') as CabinetCategory[])
          : undefined,
        widthMin: req.query.width_min ? parseInt(String(req.query.width_min), 10) : undefined,
        widthMax: req.query.width_max ? parseInt(String(req.query.width_max), 10) : undefined,
        heightMin: req.query.height_min ? parseInt(String(req.query.height_min), 10) : undefined,
        heightMax: req.query.height_max ? parseInt(String(req.query.height_max), 10) : undefined,
        priceMin: req.query.price_min ? parseFloat(String(req.query.price_min)) : undefined,
        priceMax: req.query.price_max ? parseFloat(String(req.query.price_max)) : undefined,
        sinkCompatible: req.query.sink_compatible === 'true' ? true : undefined,
        hobCompatible: req.query.hob_compatible === 'true' ? true : undefined,
        limit: req.query.limit ? parseInt(String(req.query.limit), 10) : 50,
        offset: req.query.offset ? parseInt(String(req.query.offset), 10) : 0,
        orderBy: (req.query.order_by as CabinetSearchParams['orderBy']) || 'createdAt',
        orderDir: (req.query.order_dir as CabinetSearchParams['orderDir']) || 'desc',
      };

      const result = await queryCabinets(params);

      res.json({
        data: result.data,
        pagination: result.pagination,
        filters: params,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch cabinets',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/v1/cabinets/meta/types
   * Get all cabinet types with counts
   */
  router.get('/meta/types', async (_req: Request, res: Response) => {
    try {
      const types = await getCabinetTypesCounts();

      res.json({
        types:
          types.length > 0
            ? types.map((t) => ({ type: t.type, count: t.count }))
            : [
                { type: 'base_standard', count: 0 },
                { type: 'base_drawer', count: 0 },
                { type: 'wall_standard', count: 0 },
                { type: 'tall_pantry', count: 0 },
              ],
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch cabinet types',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/v1/cabinets/meta/widths
   * Get available widths with counts
   */
  router.get('/meta/widths', async (_req: Request, res: Response) => {
    try {
      const widths = await getCabinetWidthsCounts();

      res.json({
        widths:
          widths.length > 0
            ? widths.map((w) => ({ width: w.value, count: w.count }))
            : [
                { width: 300, count: 0 },
                { width: 400, count: 0 },
                { width: 600, count: 0 },
                { width: 800, count: 0 },
                { width: 900, count: 0 },
              ],
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch cabinet widths',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/v1/cabinets/by-reference/:brandId/:reference
   * Get cabinet by brand and reference
   */
  router.get('/by-reference/:brandId/:reference', async (req: Request, res: Response) => {
    try {
      const brandId = req.params.brandId;
      const reference = req.params.reference;
      if (!brandId || !reference) {
        res
          .status(400)
          .json({ error: 'Bad Request', message: 'Brand ID and reference are required' });
        return;
      }

      const cabinet = await getCabinetByReference(brandId, reference);

      if (!cabinet) {
        res.status(404).json({
          error: 'Not Found',
          message: `Cabinet ${reference} from brand ${brandId} not found`,
        });
        return;
      }

      res.json({ data: cabinet });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch cabinet',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/v1/cabinets/:id
   * Get cabinet by ID
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      if (!id) {
        res.status(400).json({ error: 'Bad Request', message: 'Cabinet ID is required' });
        return;
      }

      const cabinet = await getCabinetById(id);

      if (!cabinet) {
        res.status(404).json({
          error: 'Not Found',
          message: `Cabinet with ID ${id} not found`,
        });
        return;
      }

      res.json({ data: cabinet });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch cabinet',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return router;
}

export default createCabinetsRouter;
