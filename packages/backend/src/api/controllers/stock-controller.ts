import { type Request, type Response } from 'express';

import { StockCheckerService } from '../../services/catalog/stock-checker.service';
import logger from '../../utils/logger';
import { asyncHandler } from '../middleware/error-middleware';

/**
 * StockController
 *
 * Exposes stock checking and bulk availability endpoints,
 * delegating to the StockCheckerService.
 */
export class StockController {
  private stockService: StockCheckerService;

  constructor() {
    this.stockService = new StockCheckerService();
  }

  /**
   * POST /stock/check
   * Check stock availability for a single product.
   * Body: { productId, providerId, storeId? }
   */
  checkStock = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const { productId, providerId, storeId } = req.body;
    if (!productId || !providerId) {
      res.status(400).json({ success: false, error: 'productId and providerId are required' });
      return;
    }

    logger.info('[Stock] Checking stock', { userId, productId, providerId, storeId });

    const results = await this.stockService.checkAvailability([
      { sku: productId, brand: providerId, quantity: 1 },
    ]);

    const result = results[0];

    // If storeId was provided, filter store availability
    if (storeId && result?.storeAvailability) {
      result.storeAvailability = result.storeAvailability.filter(
        (store) => store.storeId === storeId,
      );
    }

    res.status(200).json({ success: true, data: result });
  });

  /**
   * POST /stock/bulk
   * Check stock availability for multiple items.
   * Body: { items: Array<{ productId, providerId }> }
   */
  getBulkStock = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, error: 'items array is required and must not be empty' });
      return;
    }

    logger.info('[Stock] Bulk stock check', { userId, itemCount: items.length });

    const stockItems = items.map((item: { productId: string; providerId: string }) => ({
      sku: item.productId,
      brand: item.providerId,
      quantity: 1,
    }));

    const results = await this.stockService.checkAvailability(stockItems);

    res.status(200).json({ success: true, data: results });
  });
}

export const stockController = new StockController();
export default stockController;
