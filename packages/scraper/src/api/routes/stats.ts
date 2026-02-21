/**
 * Stats API Routes
 *
 * Statistics and analytics endpoints
 */

import { Router, Request, Response } from 'express';
import { BRANDS_CONFIG } from '../../config/brands.config.js';
import {
  getProductStats,
  getCollectionsCount,
  getImagesCount,
  getLastUpdatedDate,
  getBrandProductStats,
  getBrandScrapingStatus,
  getPriceStatsByCabinet,
  getDimensionStats,
  getScrapingStats,
  getRecentScrapingRuns,
} from '../../services/db-query.service.js';
import { checkPrismaHealth } from '../../database/client.js';
import { checkRedisHealth } from '../../database/redis.js';

export function createStatsRouter(): Router {
  const router = Router();

  /**
   * GET /api/v1/stats
   * Get overall statistics
   */
  router.get('/', async (_req: Request, res: Response) => {
    try {
      const [productStats, collectionsCount, imagesCount, lastUpdated, scrapingStats] = await Promise.all([
        getProductStats(),
        getCollectionsCount(),
        getImagesCount(),
        getLastUpdatedDate(),
        getScrapingStats(),
      ]);

      const stats = {
        brands: {
          total: BRANDS_CONFIG.length,
          enabled: BRANDS_CONFIG.filter(b => b.enabled).length,
          withPrices: BRANDS_CONFIG.filter(b => b.hasPricesOnline).length,
          with3D: BRANDS_CONFIG.filter(b => b.has3DConfigurator).length,
        },
        products: {
          cabinets: productStats.cabinets,
          worktops: productStats.worktops,
          facades: productStats.facades,
          handles: productStats.handles,
          appliances: productStats.appliances,
          accessories: productStats.accessories,
          total: productStats.total,
        },
        collections: collectionsCount,
        images: imagesCount,
        lastUpdated,
        scraping: {
          lastRun: scrapingStats.totalRuns > 0 ? new Date() : null, // Would need additional query
          totalRuns: scrapingStats.totalRuns,
          averageDuration: scrapingStats.averageDuration,
          successRate: scrapingStats.totalRuns > 0
            ? Math.round((scrapingStats.successfulRuns / scrapingStats.totalRuns) * 100)
            : 0,
        },
      };

      res.json(stats);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get stats',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/v1/stats/brands
   * Get statistics by brand
   */
  router.get('/brands', async (_req: Request, res: Response) => {
    try {
      const brandStatsPromises = BRANDS_CONFIG.map(async (brand) => {
        const [productStats, scrapingStatus] = await Promise.all([
          getBrandProductStats(brand.id),
          getBrandScrapingStatus(brand.id),
        ]);

        return {
          id: brand.id,
          name: brand.name,
          segment: brand.segment,
          products: productStats,
          collections: 0, // Would need additional query
          lastScraped: scrapingStatus.lastRun,
          scrapingStatus: scrapingStatus.lastStatus === 'completed' ? 'idle' :
                          scrapingStatus.lastStatus === 'running' ? 'running' :
                          scrapingStatus.lastStatus === 'failed' ? 'failed' : 'idle',
        };
      });

      const brandStats = await Promise.all(brandStatsPromises);

      res.json({ brands: brandStats });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get brand stats',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/v1/stats/prices
   * Get price statistics
   */
  router.get('/prices', async (_req: Request, res: Response) => {
    try {
      const cabinetPriceStats = await getPriceStatsByCabinet();

      const priceStats = {
        cabinets: {
          min: cabinetPriceStats.min,
          max: cabinetPriceStats.max,
          avg: Math.round(cabinetPriceStats.avg * 100) / 100,
          median: cabinetPriceStats.median,
          byCategory: Object.fromEntries(
            Object.entries(cabinetPriceStats.byCategory).map(([category, stats]) => [
              category,
              {
                min: stats.min,
                max: stats.max,
                avg: Math.round(stats.avg * 100) / 100,
              },
            ])
          ),
        },
        worktops: {
          byMaterial: {},
        },
        appliances: {
          byType: {},
        },
        currency: 'EUR',
        lastUpdated: new Date(),
      };

      res.json(priceStats);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get price stats',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/v1/stats/dimensions
   * Get dimension statistics
   */
  router.get('/dimensions', async (_req: Request, res: Response) => {
    try {
      const cabinetDimensions = await getDimensionStats();

      const dimensionStats = {
        cabinets: {
          widths: cabinetDimensions.widths.length > 0
            ? cabinetDimensions.widths.map(w => ({ value: w.value, count: w.count }))
            : [
                { value: 300, count: 0 },
                { value: 400, count: 0 },
                { value: 600, count: 0 },
                { value: 800, count: 0 },
                { value: 900, count: 0 },
              ],
          heights: cabinetDimensions.heights.length > 0
            ? cabinetDimensions.heights.map(h => ({ value: h.value, count: h.count }))
            : [
                { value: 720, count: 0 },
                { value: 900, count: 0 },
                { value: 2000, count: 0 },
              ],
          depths: cabinetDimensions.depths.length > 0
            ? cabinetDimensions.depths.map(d => ({ value: d.value, count: d.count }))
            : [
                { value: 560, count: 0 },
                { value: 580, count: 0 },
                { value: 600, count: 0 },
              ],
        },
        worktops: {
          thicknesses: [
            { value: 20, count: 0 },
            { value: 30, count: 0 },
            { value: 40, count: 0 },
          ],
        },
      };

      res.json(dimensionStats);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get dimension stats',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/v1/stats/scraping
   * Get scraping statistics
   */
  router.get('/scraping', async (_req: Request, res: Response) => {
    try {
      const [scrapingStats, recentRuns] = await Promise.all([
        getScrapingStats(),
        getRecentScrapingRuns(20),
      ]);

      // Get per-brand scraping status
      const brandScrapingPromises = BRANDS_CONFIG.map(async (brand) => {
        const status = await getBrandScrapingStatus(brand.id);
        return {
          brandId: brand.id,
          brandName: brand.name,
          runs: 0, // Would need count query
          lastRun: status.lastRun,
          lastStatus: status.lastStatus,
          productsFound: status.productsFound,
        };
      });

      const byBrand = await Promise.all(brandScrapingPromises);

      const response = {
        totalRuns: scrapingStats.totalRuns,
        successfulRuns: scrapingStats.successfulRuns,
        failedRuns: scrapingStats.failedRuns,
        partialRuns: scrapingStats.partialRuns,
        successRate: scrapingStats.totalRuns > 0
          ? Math.round((scrapingStats.successfulRuns / scrapingStats.totalRuns) * 100)
          : 0,
        averageDuration: scrapingStats.averageDuration,
        totalProductsScraped: scrapingStats.totalProductsScraped,
        byBrand,
        recentRuns,
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get scraping stats',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/v1/stats/health
   * Get system health status
   */
  router.get('/health', async (_req: Request, res: Response) => {
    try {
      const [prismaHealth, redisHealth] = await Promise.all([
        checkPrismaHealth(),
        checkRedisHealth(),
      ]);

      const isHealthy = prismaHealth.connected && redisHealth.connected;
      const isDegraded = prismaHealth.connected || redisHealth.connected;

      const health = {
        status: isHealthy ? 'healthy' : isDegraded ? 'degraded' : 'unhealthy',
        checks: {
          database: {
            status: prismaHealth.connected ? 'ok' : 'error',
            latency: prismaHealth.latency || 0,
            error: prismaHealth.error,
          },
          redis: {
            status: redisHealth.connected ? 'ok' : 'error',
            latency: redisHealth.latency || 0,
            error: redisHealth.error,
          },
          scrapers: {
            status: 'ok',
            activeJobs: 0, // Would need to check active scraping jobs
          },
        },
        uptime: process.uptime(),
        memory: {
          used: process.memoryUsage().heapUsed,
          total: process.memoryUsage().heapTotal,
          percentage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100),
        },
        timestamp: new Date().toISOString(),
      };

      // Set appropriate status code based on health
      const statusCode = isHealthy ? 200 : isDegraded ? 207 : 503;
      res.status(statusCode).json(health);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get health status',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return router;
}

export default createStatsRouter;
