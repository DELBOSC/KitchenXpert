/**
 * Facades API Routes
 */

import { Router, Request, Response } from 'express';
import type {
  FacadeStyle,
  FacadeMaterial,
  FacadeSearchParams,
  ColorCategory,
} from '../../models/facade.js';
import { FACADE_STYLE_LABELS } from '../../models/facade.js';
import {
  queryFacades,
  getFacadeById,
  getFacadeColors,
  getFacadeStylesCounts,
} from '../../services/db-query.service.js';

export function createFacadesRouter(): Router {
  const router = Router();

  /**
   * GET /api/v1/facades
   * Search and filter facades
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const params: FacadeSearchParams = {
        brandIds: req.query.brand ? String(req.query.brand).split(',') : undefined,
        collectionIds: req.query.collection ? String(req.query.collection).split(',') : undefined,
        styles: req.query.style ? (String(req.query.style).split(',') as FacadeStyle[]) : undefined,
        materials: req.query.material
          ? (String(req.query.material).split(',') as FacadeMaterial[])
          : undefined,
        colorCategories: req.query.color_category
          ? (String(req.query.color_category).split(',') as ColorCategory[])
          : undefined,
        priceMin: req.query.price_min ? parseFloat(String(req.query.price_min)) : undefined,
        priceMax: req.query.price_max ? parseFloat(String(req.query.price_max)) : undefined,
        limit: req.query.limit ? parseInt(String(req.query.limit), 10) : 50,
        offset: req.query.offset ? parseInt(String(req.query.offset), 10) : 0,
      };

      const result = await queryFacades(params);

      res.json({
        data: result.data,
        pagination: result.pagination,
        filters: params,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch facades',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/v1/facades/meta/styles
   * Get available styles with counts
   */
  router.get('/meta/styles', async (_req: Request, res: Response) => {
    try {
      const dbStyles = await getFacadeStylesCounts();
      const styleCountMap = new Map(dbStyles.map((s) => [s.style, s.count]));

      const styles = Object.entries(FACADE_STYLE_LABELS).map(([style, labels]) => ({
        style,
        label: labels.fr,
        labelEn: labels.en,
        count: styleCountMap.get(style) || 0,
      }));

      res.json({ styles });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch facade styles',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/v1/facades/:id/colors
   * Get available colors for a facade
   */
  router.get('/:id/colors', async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      if (!id) {
        res.status(400).json({ error: 'Bad Request', message: 'Facade ID is required' });
        return;
      }

      const colors = await getFacadeColors(id);

      res.json({
        facadeId: id,
        colors,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch facade colors',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/v1/facades/:id
   * Get facade by ID
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      if (!id) {
        res.status(400).json({ error: 'Bad Request', message: 'Facade ID is required' });
        return;
      }

      const facade = await getFacadeById(id);

      if (!facade) {
        res.status(404).json({
          error: 'Not Found',
          message: `Facade with ID ${id} not found`,
        });
        return;
      }

      res.json({ data: facade });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch facade',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return router;
}

export default createFacadesRouter;
