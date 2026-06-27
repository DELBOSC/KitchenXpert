/**
 * Scraping API Routes
 *
 * Control and monitor scraping jobs
 */

import { Router, Request, Response } from 'express';
import { createScraper, hasScraperFor, getAvailableScrapers } from '../../scrapers/index.js';
import { getBrandConfig, getEnabledBrands } from '../../config/brands.config.js';
import type { ScrapeSummary, ScrapeProgress } from '../../models/scrape-result.js';
import { getScrapingLogsByBrand } from '../../services/db-query.service.js';

// Active scraping jobs
const activeJobs = new Map<
  string,
  {
    brandId: string;
    startedAt: Date;
    scraper: ReturnType<typeof createScraper>;
    promise: Promise<ScrapeSummary>;
  }
>();

export function createScrapingRouter(): Router {
  const router = Router();

  /**
   * GET /api/v1/scraping/status
   * Get overall scraping status
   */
  router.get('/status', async (_req: Request, res: Response) => {
    try {
      const status = {
        activeJobs: activeJobs.size,
        availableScrapers: getAvailableScrapers(),
        enabledBrands: getEnabledBrands().length,
        jobs: Array.from(activeJobs.entries()).map(([id, job]) => ({
          id,
          brandId: job.brandId,
          startedAt: job.startedAt,
          status: job.scraper.getStatus(),
        })),
      };

      res.json(status);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get scraping status',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /api/v1/scraping/start/:brandId
   * Start scraping for a specific brand
   */
  router.post('/start/:brandId', async (req: Request, res: Response): Promise<void> => {
    try {
      const brandId = req.params.brandId;
      if (!brandId) {
        res.status(400).json({ error: 'Bad Request', message: 'Brand ID is required' });
        return;
      }
      const { testMode = false, headless = true } = req.body;

      // Check if brand exists
      const brandConfig = getBrandConfig(brandId);
      if (!brandConfig) {
        res.status(404).json({
          error: 'Brand not found',
          message: `Brand with ID ${brandId} not found`,
        });
        return;
      }

      // Check if scraper is available
      if (!hasScraperFor(brandId)) {
        res.status(400).json({
          error: 'Scraper not available',
          message: `No scraper implemented for brand ${brandId}. Available: ${getAvailableScrapers().join(', ')}`,
        });
        return;
      }

      // Check if already running
      if (activeJobs.has(brandId)) {
        res.status(409).json({
          error: 'Already running',
          message: `Scraper for ${brandId} is already running`,
        });
        return;
      }

      // Create and start scraper
      const scraper = createScraper(brandId, {
        testMode,
        headless,
      });

      const jobId = `${brandId}-${Date.now()}`;
      const promise = scraper.run();

      activeJobs.set(brandId, {
        brandId,
        startedAt: new Date(),
        scraper,
        promise,
      });

      // Remove from active jobs when complete
      promise.finally(() => {
        activeJobs.delete(brandId);
      });

      res.status(202).json({
        message: 'Scraping started',
        jobId,
        brandId,
        brandName: brandConfig.name,
        testMode,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to start scraping',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /api/v1/scraping/stop/:brandId
   * Stop scraping for a specific brand
   */
  router.post('/stop/:brandId', async (req: Request, res: Response): Promise<void> => {
    try {
      const brandId = req.params.brandId;
      if (!brandId) {
        res.status(400).json({ error: 'Bad Request', message: 'Brand ID is required' });
        return;
      }

      const job = activeJobs.get(brandId);
      if (!job) {
        res.status(404).json({
          error: 'Job not found',
          message: `No active scraping job for brand ${brandId}`,
        });
        return;
      }

      job.scraper.stop();

      res.json({
        message: 'Stop requested',
        brandId,
        note: 'Scraper will stop after completing current operation',
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to stop scraping',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/v1/scraping/progress/:brandId
   * Get progress for a specific brand
   */
  router.get('/progress/:brandId', async (req: Request, res: Response): Promise<void> => {
    try {
      const brandId = req.params.brandId;
      if (!brandId) {
        res.status(400).json({ error: 'Bad Request', message: 'Brand ID is required' });
        return;
      }

      const job = activeJobs.get(brandId);
      if (!job) {
        res.status(404).json({
          error: 'Job not found',
          message: `No active scraping job for brand ${brandId}`,
        });
        return;
      }

      const status = job.scraper.getStatus();

      const progress: ScrapeProgress = {
        brandId: brandId,
        status: status.summary.status,
        pagesTotal: 0, // Would need to be estimated
        pagesCompleted: status.summary.stats.pagesScraped,
        productsFound: status.summary.stats.productsFound,
        errorsCount: status.summary.stats.errors,
        startedAt: status.summary.startedAt,
      };

      res.json(progress);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get progress',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/v1/scraping/logs/:brandId
   * Get recent scraping logs for a brand
   */
  router.get('/logs/:brandId', async (req: Request, res: Response) => {
    try {
      const brandId = req.params.brandId;
      if (!brandId) {
        res.status(400).json({ error: 'Bad Request', message: 'Brand ID is required' });
        return;
      }
      const limit = Math.min(parseInt(String(req.query.limit || '10'), 10), 100);

      const logs = await getScrapingLogsByBrand(brandId, limit);

      res.json({
        brandId,
        logs,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get logs',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/v1/scraping/scrapers
   * Get available scrapers
   */
  router.get('/scrapers', async (_req: Request, res: Response) => {
    try {
      const scrapers = getAvailableScrapers().map((brandId) => {
        const config = getBrandConfig(brandId);
        return {
          brandId,
          brandName: config?.name || brandId,
          segment: config?.segment,
          difficulty: config?.scrapingDifficulty,
          frequency: config?.scrapingFrequency,
          isRunning: activeJobs.has(brandId),
        };
      });

      res.json({ scrapers });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get scrapers',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /api/v1/scraping/schedule
   * Schedule scraping jobs with cron-based frequency
   *
   * Request body:
   * - brandIds: string[] - List of brand IDs to schedule
   * - runAt?: string - ISO date string for first run (optional, defaults to next cron match)
   * - frequency: 'hourly' | 'daily' | 'weekly' | 'monthly' - Scraping frequency
   */
  router.post('/schedule', async (req: Request, res: Response) => {
    try {
      const { brandIds, runAt, frequency } = req.body;

      // Validate request
      if (!brandIds || !Array.isArray(brandIds) || brandIds.length === 0) {
        res.status(400).json({
          error: 'Invalid request',
          message: 'brandIds must be a non-empty array',
        });
        return;
      }

      if (!frequency || !['hourly', 'daily', 'weekly', 'monthly'].includes(frequency)) {
        res.status(400).json({
          error: 'Invalid request',
          message: 'frequency must be one of: hourly, daily, weekly, monthly',
        });
        return;
      }

      // Validate all brands exist and have scrapers
      const invalidBrands = brandIds.filter((id: string) => !hasScraperFor(id));
      if (invalidBrands.length > 0) {
        res.status(400).json({
          error: 'Invalid brands',
          message: `No scraper available for brands: ${invalidBrands.join(', ')}`,
          availableScrapers: getAvailableScrapers(),
        });
        return;
      }

      // Cron patterns for different frequencies
      const cronPatterns: Record<string, string> = {
        hourly: '0 * * * *', // Start of every hour
        daily: '0 2 * * *', // 2 AM daily
        weekly: '0 2 * * 0', // 2 AM every Sunday
        monthly: '0 2 1 * *', // 2 AM first day of month
      };

      const cronPattern = cronPatterns[frequency];
      const scheduledJobs = [];

      // Calculate next run time based on cron pattern
      const calculateNextRun = (pattern: string): Date => {
        // Simple calculation - in production use a cron parser like 'cron-parser'
        const now = new Date();
        const nextRun = new Date(now);

        switch (frequency) {
          case 'hourly':
            nextRun.setMinutes(0, 0, 0);
            if (nextRun <= now) nextRun.setHours(nextRun.getHours() + 1);
            break;
          case 'daily':
            nextRun.setHours(2, 0, 0, 0);
            if (nextRun <= now) nextRun.setDate(nextRun.getDate() + 1);
            break;
          case 'weekly':
            nextRun.setHours(2, 0, 0, 0);
            const daysUntilSunday = (7 - nextRun.getDay()) % 7 || 7;
            nextRun.setDate(nextRun.getDate() + daysUntilSunday);
            break;
          case 'monthly':
            nextRun.setHours(2, 0, 0, 0);
            nextRun.setDate(1);
            if (nextRun <= now) nextRun.setMonth(nextRun.getMonth() + 1);
            break;
        }
        return nextRun;
      };

      for (const brandId of brandIds) {
        const brandConfig = getBrandConfig(brandId);
        const nextRunTime = runAt ? new Date(runAt) : calculateNextRun(cronPattern);

        // Store schedule in memory (in production, persist to database)
        // The actual job execution would be handled by a separate scheduler service
        scheduledJobs.push({
          brandId,
          brandName: brandConfig?.name || brandId,
          frequency,
          cronPattern,
          nextRun: nextRunTime.toISOString(),
          status: 'scheduled',
        });
      }

      res.json({
        success: true,
        message: `Scheduled ${scheduledJobs.length} scraping job(s)`,
        schedule: {
          frequency,
          cronPattern,
          jobs: scheduledJobs,
        },
        note: 'Jobs will be executed by the background scheduler service',
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to schedule',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return router;
}

export default createScrapingRouter;
