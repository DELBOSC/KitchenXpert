import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/error-middleware';
import { prisma } from '../../database/client';
import { BOMGeneratorService } from '../../services/ai/bom-generator.service';
import logger from '../../utils/logger';

/**
 * BOM Controller
 *
 * Handles Bill of Materials generation for kitchen designs.
 * Verifies kitchen ownership before generating a BOM.
 */
export class BOMController {
  private bomGeneratorService: BOMGeneratorService;

  constructor() {
    this.bomGeneratorService = BOMGeneratorService.getInstance();
  }

  /**
   * POST /bom/generate
   * Generate a Bill of Materials for a kitchen.
   * Body: { kitchenId: string }
   */
  generate = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const { kitchenId } = req.body;

    if (!kitchenId) {
      res.status(400).json({ success: false, error: 'kitchenId is required' });
      return;
    }

    // Verify the kitchen exists and the user owns it
    const kitchen = await prisma.kitchen.findUnique({
      where: { id: kitchenId },
    });

    if (!kitchen) {
      res.status(404).json({ success: false, error: 'Kitchen not found' });
      return;
    }

    if (kitchen.userId !== userId && req.user?.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    try {
      const bom = await this.bomGeneratorService.generateBOM(kitchenId);

      logger.info('[BOM] Generated BOM successfully', {
        kitchenId,
        itemCount: bom.items.length,
        total: bom.total,
      });

      res.status(200).json({
        success: true,
        data: bom,
      });
    } catch (err) {
      logger.error('[BOM] Failed to generate BOM', {
        error: err instanceof Error ? err.message : String(err),
        kitchenId,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to generate Bill of Materials',
      });
    }
  });
}

export const bomController = new BOMController();
export default bomController;
