/**
 * Price Tracker Service (F9)
 *
 * Tracks product price history, calculates trends, and manages price alerts.
 * Called by the scraper when new prices are recorded, and by the API to serve
 * price intelligence data to the frontend.
 */

import { prisma } from '../../database/client';
import { createModuleLogger } from '../../utils/logger';

const logger = createModuleLogger('price-tracker');

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PriceTrends {
  productId: string;
  currentPrice: number | null;
  avg30d: number | null;
  avg90d: number | null;
  min90d: number | null;
  max90d: number | null;
  /** 'up' | 'down' | 'stable' */
  trendDirection: 'up' | 'down' | 'stable';
  changePercent30d: number | null;
}

export interface BestTimeSuggestion {
  productId: string;
  currentPrice: number | null;
  avgPrice: number | null;
  percentVsAvg: number | null;
  /** 'buy_now' | 'wait' | 'prices_rising' */
  recommendation: 'buy_now' | 'wait' | 'prices_rising';
  message: string;
}

// ─── Service ────────────────────────────────────────────────────────────────

export class PriceTrackerService {
  /**
   * Get price history for a product.
   * Defaults to the last 90 days if no `days` parameter is provided.
   */
  async getHistory(productId: string, days?: number) {
    const since = new Date();
    since.setDate(since.getDate() - (days || 90));

    return prisma.priceHistory.findMany({
      where: {
        productId,
        recordedAt: { gte: since },
      },
      orderBy: { recordedAt: 'asc' },
    });
  }

  /**
   * Record a new price point (called by the scraper pipeline).
   * Automatically computes `previousPrice` and `changePercent`.
   */
  async recordPrice(productId: string, providerId: string, price: number) {
    // Fetch the latest recorded price for delta calculation
    const latest = await prisma.priceHistory.findFirst({
      where: { productId, providerId },
      orderBy: { recordedAt: 'desc' },
    });

    const previousPrice = latest?.price ?? null;
    const changePercent =
      previousPrice !== null && previousPrice !== 0
        ? ((price - previousPrice) / previousPrice) * 100
        : null;

    const record = await prisma.priceHistory.create({
      data: {
        productId,
        providerId,
        price,
        previousPrice,
        changePercent,
        currency: 'EUR',
      },
    });

    logger.info(`Recorded price for product ${productId}: ${price} EUR (change: ${changePercent?.toFixed(2) ?? 'N/A'}%)`);
    return record;
  }

  /**
   * Compute price trends for a product (current, averages, min/max, direction).
   */
  async getTrends(productId: string): Promise<PriceTrends> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    const ninetyDaysAgo = new Date(now);
    ninetyDaysAgo.setDate(now.getDate() - 90);

    // Fetch the last 90 days of data
    const history = await prisma.priceHistory.findMany({
      where: {
        productId,
        recordedAt: { gte: ninetyDaysAgo },
      },
      orderBy: { recordedAt: 'asc' },
    });

    if (history.length === 0) {
      return {
        productId,
        currentPrice: null,
        avg30d: null,
        avg90d: null,
        min90d: null,
        max90d: null,
        trendDirection: 'stable',
        changePercent30d: null,
      };
    }

    const currentPrice = history[history.length - 1]!.price;
    const prices90d = history.map((h) => h.price);
    const prices30d = history
      .filter((h) => h.recordedAt >= thirtyDaysAgo)
      .map((h) => h.price);

    const avg = (arr: number[]): number | null =>
      arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

    const avg30d = avg(prices30d);
    const avg90d = avg(prices90d);
    const min90d = Math.min(...prices90d);
    const max90d = Math.max(...prices90d);

    // Determine trend direction
    let trendDirection: 'up' | 'down' | 'stable' = 'stable';
    let changePercent30d: number | null = null;

    if (prices30d.length >= 2) {
      const firstPrice30d = prices30d[0]!;
      const lastPrice30d = prices30d[prices30d.length - 1]!;
      if (firstPrice30d !== 0) {
        changePercent30d = ((lastPrice30d - firstPrice30d) / firstPrice30d) * 100;
        if (changePercent30d > 2) trendDirection = 'up';
        else if (changePercent30d < -2) trendDirection = 'down';
      }
    }

    return {
      productId,
      currentPrice,
      avg30d,
      avg90d,
      min90d,
      max90d,
      trendDirection,
      changePercent30d,
    };
  }

  /**
   * Analyze seasonal patterns and recent trends to suggest whether now
   * is a good time to buy.
   */
  async getBestTimeToBuy(productId: string): Promise<BestTimeSuggestion> {
    const trends = await this.getTrends(productId);

    if (trends.currentPrice === null || trends.avg90d === null) {
      return {
        productId,
        currentPrice: null,
        avgPrice: null,
        percentVsAvg: null,
        recommendation: 'wait',
        message: 'Not enough price history to make a recommendation.',
      };
    }

    const percentVsAvg =
      trends.avg90d !== 0
        ? ((trends.currentPrice - trends.avg90d) / trends.avg90d) * 100
        : 0;

    let recommendation: BestTimeSuggestion['recommendation'];
    let message: string;

    if (percentVsAvg <= -5) {
      // Price is significantly below average
      recommendation = 'buy_now';
      message = `Prices are ${Math.abs(percentVsAvg).toFixed(1)}% lower than the 90-day average. Good time to buy!`;
    } else if (trends.trendDirection === 'down') {
      // Prices are trending down
      recommendation = 'wait';
      message = `Prices are trending down (${trends.changePercent30d?.toFixed(1)}% over 30 days). You may want to wait for a better deal.`;
    } else if (trends.trendDirection === 'up' || percentVsAvg > 5) {
      // Prices are rising
      recommendation = 'prices_rising';
      message = `Prices are ${percentVsAvg.toFixed(1)}% above the 90-day average and trending up. Consider buying soon before further increases.`;
    } else {
      // Prices are stable, near average
      recommendation = 'wait';
      message = 'Prices are stable and near the 90-day average. No urgency to buy.';
    }

    return {
      productId,
      currentPrice: trends.currentPrice,
      avgPrice: trends.avg90d,
      percentVsAvg,
      recommendation,
      message,
    };
  }

  /**
   * Create a price alert for a user + product.
   * Direction: 'below' = alert when price drops below target.
   *            'above' = alert when price rises above target.
   */
  async createAlert(
    userId: string,
    productId: string,
    targetPrice: number,
    direction: 'below' | 'above',
  ) {
    // Get current price
    const latest = await prisma.priceHistory.findFirst({
      where: { productId },
      orderBy: { recordedAt: 'desc' },
    });

    const alert = await prisma.priceAlert.create({
      data: {
        userId,
        productId,
        targetPrice,
        currentPrice: latest?.price ?? null,
        direction,
        isActive: true,
        isTriggered: false,
      },
    });

    logger.info(`Created price alert for user ${userId}, product ${productId}, target: ${targetPrice} ${direction}`);
    return alert;
  }

  /**
   * Get all alerts for a user.
   */
  async getAlerts(userId: string) {
    return prisma.priceAlert.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Delete a price alert (ownership check: userId must match).
   */
  async deleteAlert(alertId: string, userId: string): Promise<void> {
    const alert = await prisma.priceAlert.findUnique({
      where: { id: alertId },
    });

    if (!alert) {
      throw new Error('Alert not found');
    }

    if (alert.userId !== userId) {
      throw new Error('Forbidden: you do not own this alert');
    }

    await prisma.priceAlert.delete({
      where: { id: alertId },
    });

    logger.info(`Deleted price alert ${alertId} for user ${userId}`);
  }

  /**
   * Check all active alerts against current prices and trigger those that match.
   * Intended to be called periodically (cron or after scraper runs).
   */
  async checkAlerts(): Promise<{ triggered: number }> {
    const activeAlerts = await prisma.priceAlert.findMany({
      where: { isActive: true, isTriggered: false },
    });

    let triggered = 0;

    for (const alert of activeAlerts) {
      const latest = await prisma.priceHistory.findFirst({
        where: { productId: alert.productId },
        orderBy: { recordedAt: 'desc' },
      });

      if (!latest) continue;

      const currentPrice = latest.price;
      let shouldTrigger = false;

      if (alert.direction === 'below' && currentPrice <= alert.targetPrice) {
        shouldTrigger = true;
      } else if (alert.direction === 'above' && currentPrice >= alert.targetPrice) {
        shouldTrigger = true;
      }

      if (shouldTrigger) {
        await prisma.priceAlert.update({
          where: { id: alert.id },
          data: {
            isTriggered: true,
            triggeredAt: new Date(),
            currentPrice,
          },
        });
        triggered++;
        logger.info(`Alert ${alert.id} triggered: product ${alert.productId} at ${currentPrice} EUR (target: ${alert.targetPrice} ${alert.direction})`);
      } else {
        // Update current price even if not triggered
        await prisma.priceAlert.update({
          where: { id: alert.id },
          data: { currentPrice },
        });
      }
    }

    logger.info(`Alert check complete: ${triggered} alert(s) triggered out of ${activeAlerts.length} active`);
    return { triggered };
  }
}

export const priceTrackerService = new PriceTrackerService();
export default priceTrackerService;
