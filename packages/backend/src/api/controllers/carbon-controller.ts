import { type Request, type Response } from 'express';

import { prisma } from '../../database/client';
import { CarbonCalculatorService } from '../../services/sustainability/carbon-calculator.service';
import logger from '../../utils/logger';
import { asyncHandler } from '../middleware/error-middleware';

/**
 * CarbonController
 *
 * Exposes carbon footprint calculation and report retrieval endpoints,
 * delegating to the CarbonCalculatorService.
 */
export class CarbonController {
  private carbonService: CarbonCalculatorService;

  constructor() {
    this.carbonService = new CarbonCalculatorService();
  }

  /**
   * POST /carbon/calculate
   * Calculate embodied carbon for a kitchen design.
   * Body: { kitchenId, items }
   */
  calculateCarbon = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const { kitchenId, items } = req.body;
    if (!kitchenId) {
      res.status(400).json({ success: false, error: 'kitchenId is required' });
      return;
    }

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, error: 'items array is required and must not be empty' });
      return;
    }

    logger.info('[Carbon] Calculating carbon footprint', {
      userId,
      kitchenId,
      itemCount: items.length,
    });

    const report = this.carbonService.calculateKitchenCarbon(items);

    // Persist atomically — upsert avoids the find→update/create race.
    try {
      const data = {
        totalCO2kg: report.totalCO2e ?? 0,
        breakdown: (report.breakdown as any) ?? {},
        transportCO2: report.transportCO2e ?? 0,
        rating: report.grade ?? null,
      };
      await prisma.carbonReport.upsert({
        where: { kitchenId },
        create: { kitchenId, userId, ...data },
        update: data,
      });
    } catch (err) {
      // Non-critical: log and continue even if persistence fails
      logger.warn('[Carbon] Failed to persist carbon report', {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    res.status(200).json({ success: true, data: report });
  });

  /**
   * GET /carbon/report/:kitchenId
   * Retrieve a saved carbon report for a kitchen.
   */
  getCarbonReport = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const { kitchenId } = req.params;
    if (!kitchenId) {
      res.status(400).json({ success: false, error: 'kitchenId is required' });
      return;
    }

    logger.info('[Carbon] Retrieving carbon report', { userId, kitchenId });

    const report = await prisma.carbonReport.findUnique({
      where: { kitchenId },
    });

    if (!report) {
      res.status(404).json({ success: false, error: 'Carbon report not found for this kitchen' });
      return;
    }

    // Verify ownership
    if (report.userId !== userId && req.user?.role !== 'admin') {
      res.status(403).json({ success: false, error: 'You do not have access to this report' });
      return;
    }

    const data = {
      totalCO2kg: report.totalCO2kg,
      breakdown: report.breakdown,
      transportCO2: report.transportCO2,
      rating: report.rating,
    };

    res.status(200).json({ success: true, data });
  });
}

export const carbonController = new CarbonController();
export default carbonController;
