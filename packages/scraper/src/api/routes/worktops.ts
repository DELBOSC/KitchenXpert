/**
 * Worktops API Routes
 */

import { Router, Request, Response } from 'express';
import type { WorktopMaterial, WorktopFinish, WorktopSearchParams } from '../../models/worktop.js';
import { WORKTOP_MATERIAL_TIERS } from '../../models/worktop.js';
import {
  queryWorktops,
  getWorktopById,
  getWorktopMaterialsCounts,
} from '../../services/db-query.service.js';

export function createWorktopsRouter(): Router {
  const router = Router();

  /**
   * GET /api/v1/worktops
   * Search and filter worktops
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const params: WorktopSearchParams = {
        brandIds: req.query.brand ? String(req.query.brand).split(',') : undefined,
        materials: req.query.material
          ? (String(req.query.material).split(',') as WorktopMaterial[])
          : undefined,
        finishes: req.query.finish
          ? (String(req.query.finish).split(',') as WorktopFinish[])
          : undefined,
        thickness: req.query.thickness ? parseInt(String(req.query.thickness), 10) : undefined,
        priceMin: req.query.price_min ? parseFloat(String(req.query.price_min)) : undefined,
        priceMax: req.query.price_max ? parseFloat(String(req.query.price_max)) : undefined,
        limit: req.query.limit ? parseInt(String(req.query.limit), 10) : 50,
        offset: req.query.offset ? parseInt(String(req.query.offset), 10) : 0,
      };

      const result = await queryWorktops(params);

      res.json({
        data: result.data,
        pagination: result.pagination,
        filters: params,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch worktops',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/v1/worktops/meta/materials
   * Get available materials with counts
   */
  router.get('/meta/materials', async (_req: Request, res: Response) => {
    try {
      const dbMaterials = await getWorktopMaterialsCounts();
      const materialCountMap = new Map(dbMaterials.map((m) => [m.material, m.count]));

      const materials = Object.entries(WORKTOP_MATERIAL_TIERS).map(([material, tier]) => ({
        material,
        tier,
        count: materialCountMap.get(material) || 0,
      }));

      res.json({ materials });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch worktop materials',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/v1/worktops/:id
   * Get worktop by ID
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      if (!id) {
        res.status(400).json({ error: 'Bad Request', message: 'Worktop ID is required' });
        return;
      }

      const worktop = await getWorktopById(id);

      if (!worktop) {
        res.status(404).json({
          error: 'Not Found',
          message: `Worktop with ID ${id} not found`,
        });
        return;
      }

      res.json({ data: worktop });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch worktop',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return router;
}

export default createWorktopsRouter;
