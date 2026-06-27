/**
 * Appliances API Routes
 */

import { Router, Request, Response } from 'express';
import type {
  ApplianceType,
  ApplianceCategory,
  ApplianceSearchParams,
  EnergyClass,
} from '../../models/appliance.js';
import {
  getApplianceCategory,
  APPLIANCE_TYPE_LABELS,
  APPLIANCE_MANUFACTURERS,
} from '../../models/appliance.js';
import {
  queryAppliances,
  getApplianceById,
  getApplianceTypesCounts,
  getManufacturersCounts,
} from '../../services/db-query.service.js';

export function createAppliancesRouter(): Router {
  const router = Router();

  /**
   * GET /api/v1/appliances
   * Search and filter appliances
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const params: ApplianceSearchParams = {
        brandIds: req.query.brand ? String(req.query.brand).split(',') : undefined,
        manufacturerBrands: req.query.manufacturer
          ? String(req.query.manufacturer).split(',')
          : undefined,
        types: req.query.type ? (String(req.query.type).split(',') as ApplianceType[]) : undefined,
        categories: req.query.category
          ? (String(req.query.category).split(',') as ApplianceCategory[])
          : undefined,
        energyClasses: req.query.energy_class
          ? (String(req.query.energy_class).split(',') as EnergyClass[])
          : undefined,
        widthMin: req.query.width_min ? parseInt(String(req.query.width_min), 10) : undefined,
        widthMax: req.query.width_max ? parseInt(String(req.query.width_max), 10) : undefined,
        priceMin: req.query.price_min ? parseFloat(String(req.query.price_min)) : undefined,
        priceMax: req.query.price_max ? parseFloat(String(req.query.price_max)) : undefined,
        connectivity: req.query.connectivity === 'true' ? true : undefined,
        limit: req.query.limit ? parseInt(String(req.query.limit), 10) : 50,
        offset: req.query.offset ? parseInt(String(req.query.offset), 10) : 0,
      };

      const result = await queryAppliances(params);

      res.json({
        data: result.data,
        pagination: result.pagination,
        filters: params,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch appliances',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/v1/appliances/meta/types
   * Get available appliance types with counts
   */
  router.get('/meta/types', async (_req: Request, res: Response) => {
    try {
      const dbTypes = await getApplianceTypesCounts();
      const typeCountMap = new Map(dbTypes.map((t) => [t.type, t.count]));

      const types = Object.entries(APPLIANCE_TYPE_LABELS).map(([type, labels]) => ({
        type,
        labelFr: labels.fr,
        labelEn: labels.en,
        category: getApplianceCategory(type as ApplianceType),
        count: typeCountMap.get(type) || 0,
      }));

      res.json({ types });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch appliance types',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/v1/appliances/meta/manufacturers
   * Get available manufacturers
   */
  router.get('/meta/manufacturers', async (_req: Request, res: Response) => {
    try {
      const dbManufacturers = await getManufacturersCounts();
      const manufacturerCountMap = new Map(dbManufacturers.map((m) => [m.name, m.count]));

      const manufacturers = APPLIANCE_MANUFACTURERS.map((name) => ({
        name,
        count: manufacturerCountMap.get(name) || 0,
      })).sort((a, b) => b.count - a.count);

      // Also add any manufacturers from DB that aren't in the static list
      for (const dbMfr of dbManufacturers) {
        if (!APPLIANCE_MANUFACTURERS.includes(dbMfr.name)) {
          manufacturers.push({
            name: dbMfr.name,
            count: dbMfr.count,
          });
        }
      }

      res.json({ manufacturers });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch manufacturers',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/v1/appliances/:id
   * Get appliance by ID
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      if (!id) {
        res.status(400).json({ error: 'Bad Request', message: 'Appliance ID is required' });
        return;
      }

      const appliance = await getApplianceById(id);

      if (!appliance) {
        res.status(404).json({
          error: 'Not Found',
          message: `Appliance with ID ${id} not found`,
        });
        return;
      }

      res.json({ data: appliance });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch appliance',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return router;
}

export default createAppliancesRouter;
