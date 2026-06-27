/**
 * Price Tracker Controller (F9)
 *
 * Handles HTTP requests for price history, trends, buy-time suggestions,
 * and price alerts.
 */

import { type Request, type Response } from 'express';

import { priceTrackerService } from '../../services/price-tracker/price-tracker.service';
import { asyncHandler } from '../middleware/error-middleware';

export class PriceTrackerController {
  /**
   * GET /price-tracker/history/:productId
   * Returns price history for a product, optionally filtered by number of days.
   */
  getHistory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { productId } = req.params;
    const days = req.query.days ? Number(req.query.days) : undefined;

    if (!productId) {
      res.status(400).json({ success: false, error: 'Product ID is required' });
      return;
    }

    const history = await priceTrackerService.getHistory(productId, days);

    res.status(200).json({
      success: true,
      data: history,
    });
  });

  /**
   * GET /price-tracker/trends
   * Returns price trends for one or more products (comma-separated query param).
   */
  getTrends = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const productIds = req.query.productIds as string | undefined;

    if (!productIds) {
      res.status(400).json({ success: false, error: 'productIds query parameter is required' });
      return;
    }

    const ids = productIds
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    if (ids.length === 0) {
      res.status(400).json({ success: false, error: 'At least one product ID is required' });
      return;
    }

    const trends = await Promise.all(ids.map((id) => priceTrackerService.getTrends(id)));

    res.status(200).json({
      success: true,
      data: trends,
    });
  });

  /**
   * GET /price-tracker/best-time/:productId
   * Returns a buy-time recommendation for a product.
   */
  getBestTime = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { productId } = req.params;

    if (!productId) {
      res.status(400).json({ success: false, error: 'Product ID is required' });
      return;
    }

    const suggestion = await priceTrackerService.getBestTimeToBuy(productId);

    res.status(200).json({
      success: true,
      data: suggestion,
    });
  });

  /**
   * POST /price-tracker/alerts
   * Create a price alert for the authenticated user.
   */
  createAlert = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { productId, targetPrice, direction } = req.body;

    const alert = await priceTrackerService.createAlert(userId, productId, targetPrice, direction);

    res.status(201).json({
      success: true,
      data: alert,
      message: 'Price alert created successfully',
    });
  });

  /**
   * GET /price-tracker/alerts
   * List all alerts for the authenticated user.
   */
  getAlerts = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const alerts = await priceTrackerService.getAlerts(userId);

    res.status(200).json({
      success: true,
      data: alerts,
    });
  });

  /**
   * DELETE /price-tracker/alerts/:id
   * Delete a price alert (ownership enforced in service).
   */
  deleteAlert = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    const alertId = req.params.id;

    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    if (!alertId) {
      res.status(400).json({ success: false, error: 'Alert ID is required' });
      return;
    }

    try {
      await priceTrackerService.deleteAlert(alertId, userId);

      res.status(200).json({
        success: true,
        message: 'Price alert deleted successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message === 'Alert not found') {
        res.status(404).json({ success: false, error: message });
      } else if (message.startsWith('Forbidden')) {
        res.status(403).json({ success: false, error: message });
      } else {
        throw error;
      }
    }
  });
}

export const priceTrackerController = new PriceTrackerController();
export default priceTrackerController;
