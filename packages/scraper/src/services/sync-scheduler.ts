/**
 * Sync Scheduler Service
 *
 * Orchestrates catalog synchronization jobs using BullMQ repeatable jobs.
 * Sets up cron-based schedules for all enabled brands, with staggered execution
 * to prevent resource contention.
 *
 * Usage:
 *   const scheduler = createSyncScheduler();
 *   await scheduler.start();        // Register all cron jobs
 *   await scheduler.getStatus();    // Check running schedules
 *   await scheduler.stop();         // Clean up
 */

import { ScrapeManager, createScrapeManager, ScrapeManagerConfig } from './scrape-manager.js';
import { generateAllSchedules, SyncSchedule } from '../config/sync-schedules.js';
import { hasScraperFor } from '../scrapers/index.js';
import { logger } from '../utils/logger.js';

export interface SyncSchedulerConfig {
  /** ScrapeManager configuration (Redis, concurrency, etc.) */
  scrapeManager?: Partial<ScrapeManagerConfig>;
  /** Only schedule brands that have an implemented scraper */
  requireScraper?: boolean;
  /** Override: only schedule these specific brand IDs */
  brandIds?: string[];
  /** Enable/disable the scheduler (useful for dev environments) */
  enabled?: boolean;
}

export interface ScheduleStatus {
  brandId: string;
  brandName: string;
  cronPattern: string;
  frequency: string;
  priority: number;
  isActive: boolean;
  hasScraper: boolean;
  nextRun?: string;
}

export interface SyncSchedulerStatus {
  isRunning: boolean;
  totalSchedules: number;
  activeSchedules: number;
  schedules: ScheduleStatus[];
  managerStats?: Awaited<ReturnType<ScrapeManager['getStats']>>;
}

export class SyncScheduler {
  private manager: ScrapeManager;
  private schedules: SyncSchedule[] = [];
  private activeSchedules: Map<string, SyncSchedule> = new Map();
  private isRunning = false;
  private config: SyncSchedulerConfig;

  constructor(config: SyncSchedulerConfig = {}) {
    this.config = {
      requireScraper: true,
      enabled: true,
      ...config,
    };

    this.manager = createScrapeManager(config.scrapeManager);
  }

  /**
   * Start the scheduler: register all cron jobs with BullMQ
   */
  async start(): Promise<void> {
    if (!this.config.enabled) {
      logger.info('SyncScheduler is disabled, skipping');
      return;
    }

    if (this.isRunning) {
      logger.warn('SyncScheduler is already running');
      return;
    }

    logger.info('Starting SyncScheduler...');

    // Start the underlying ScrapeManager
    await this.manager.start();

    // Generate schedules
    this.schedules = generateAllSchedules();

    // Filter by brand IDs if specified
    if (this.config.brandIds && this.config.brandIds.length > 0) {
      this.schedules = this.schedules.filter((s) =>
        this.config.brandIds!.includes(s.brandId)
      );
    }

    // Register each schedule as a repeatable BullMQ job
    let registered = 0;
    for (const schedule of this.schedules) {
      // Skip brands without scrapers if requireScraper is true
      if (this.config.requireScraper && !hasScraperFor(schedule.brandId)) {
        logger.debug(`Skipping ${schedule.brandId}: no scraper available`);
        continue;
      }

      if (!schedule.enabled) {
        logger.debug(`Skipping ${schedule.brandId}: disabled in config`);
        continue;
      }

      try {
        await this.manager.scheduleJob(schedule.brandId, schedule.cronPattern);
        this.activeSchedules.set(schedule.brandId, schedule);
        registered++;

        logger.info(`Scheduled ${schedule.brandName}`, {
          brandId: schedule.brandId,
          cron: schedule.cronPattern,
          frequency: schedule.frequency,
          priority: schedule.priority,
        });
      } catch (error) {
        logger.error(`Failed to schedule ${schedule.brandName}`, {
          brandId: schedule.brandId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    this.isRunning = true;
    logger.info(`SyncScheduler started: ${registered} schedules registered`);
  }

  /**
   * Stop the scheduler: remove all repeatable jobs and shut down manager
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    logger.info('Stopping SyncScheduler...');

    // Stop the manager (closes queues, workers, Redis)
    await this.manager.stop();

    this.activeSchedules.clear();
    this.isRunning = false;
    logger.info('SyncScheduler stopped');
  }

  /**
   * Trigger an immediate sync for a specific brand (bypasses schedule)
   */
  async triggerSync(brandId: string, priority?: number): Promise<string | undefined> {
    if (!hasScraperFor(brandId)) {
      throw new Error(`No scraper available for brand: ${brandId}`);
    }

    const job = await this.manager.addJob(brandId, undefined, priority);
    logger.info(`Manual sync triggered for ${brandId}`, { jobId: job.id });
    return job.id ?? undefined;
  }

  /**
   * Trigger sync for all brands with scrapers
   */
  async triggerSyncAll(): Promise<string[]> {
    const jobs = await this.manager.addAllJobs();
    const jobIds = jobs.map((j) => j.id).filter((id): id is string => id != null);
    logger.info(`Manual sync triggered for all brands`, { count: jobIds.length });
    return jobIds;
  }

  /**
   * Trigger sync for priority brands only
   */
  async triggerSyncPriority(): Promise<string[]> {
    const jobs = await this.manager.addPriorityJobs();
    const jobIds = jobs.map((j) => j.id).filter((id): id is string => id != null);
    logger.info(`Priority sync triggered`, { count: jobIds.length });
    return jobIds;
  }

  /**
   * Get current scheduler status
   */
  async getStatus(): Promise<SyncSchedulerStatus> {
    const scheduleStatuses: ScheduleStatus[] = this.schedules.map((s) => ({
      brandId: s.brandId,
      brandName: s.brandName,
      cronPattern: s.cronPattern,
      frequency: s.frequency,
      priority: s.priority,
      isActive: this.activeSchedules.has(s.brandId),
      hasScraper: hasScraperFor(s.brandId),
    }));

    let managerStats;
    if (this.isRunning) {
      try {
        managerStats = await this.manager.getStats();
      } catch {
        // Manager stats may fail if Redis is unavailable
      }
    }

    return {
      isRunning: this.isRunning,
      totalSchedules: this.schedules.length,
      activeSchedules: this.activeSchedules.size,
      schedules: scheduleStatuses,
      managerStats,
    };
  }

  /**
   * Pause all scheduled jobs
   */
  async pause(): Promise<void> {
    await this.manager.pause();
    logger.info('SyncScheduler paused');
  }

  /**
   * Resume all scheduled jobs
   */
  async resume(): Promise<void> {
    await this.manager.resume();
    logger.info('SyncScheduler resumed');
  }

  /**
   * Get the underlying ScrapeManager (for advanced usage)
   */
  getManager(): ScrapeManager {
    return this.manager;
  }

  /**
   * Check if a brand has an active schedule
   */
  isScheduled(brandId: string): boolean {
    return this.activeSchedules.has(brandId);
  }

  /**
   * Get available scrapers list
   */
  getAvailableScrapers(): string[] {
    return this.manager.getAvailableScrapers();
  }
}

/**
 * Factory function to create a SyncScheduler instance
 */
export function createSyncScheduler(config?: SyncSchedulerConfig): SyncScheduler {
  return new SyncScheduler(config);
}

export default SyncScheduler;
