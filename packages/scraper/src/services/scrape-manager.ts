/**
 * Scrape Manager Service
 *
 * Manages scraping jobs with BullMQ for reliable job processing.
 * Supports scheduling, concurrency control, and job monitoring.
 */

import { Queue, Worker, Job, QueueEvents, QueueScheduler } from 'bullmq';
import Redis from 'ioredis';
import { EventEmitter } from 'events';
import { createScraper, hasScraperFor, getAvailableScrapers } from '../scrapers/index.js';
import { BRANDS_CONFIG, getBrandConfig, getEnabledBrands, getBrandsByPriority } from '../config/brands.config.js';
import { logger, createBrandLogger } from '../utils/logger.js';
import { DataNormalizer, createDataNormalizer } from './data-normalizer.js';
import { ImageDownloader, createImageDownloader } from './image-downloader.js';
import { getPrismaClient, isPrismaConnected } from '../database/client.js';
import { CircuitBreaker } from '../utils/circuit-breaker.js';
import type { ScrapedProduct, ScraperOptions } from '../scrapers/base-scraper.js';
import type { ScrapeSummary, ScrapeProgress } from '../models/scrape-result.js';
import type { BrandScrapingConfig } from '../config/brands.config.js';

// ═══════════════════════════════════════════════════════════════════════════
// Types & Interfaces
// ═══════════════════════════════════════════════════════════════════════════

export interface ScrapeJobData {
  brandId: string;
  options?: Partial<ScraperOptions>;
  priority?: number;
  scheduledAt?: Date;
  triggeredBy?: 'manual' | 'schedule' | 'api';
}

export interface ScrapeJobResult {
  brandId: string;
  summary: ScrapeSummary;
  startedAt: Date;
  completedAt: Date;
  duration: number;
}

export interface ScrapeManagerConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  queues: {
    scraping: string;
    images: string;
    normalization: string;
    enrichment: string;
  };
  concurrency: {
    scraping: number;
    images: number;
    normalization: number;
    enrichment: number;
  };
  defaultScraperOptions?: Partial<ScraperOptions>;
  downloadImages: boolean;
  normalizeData: boolean;
  storeResults: boolean;
}

export interface ManagerStats {
  queues: {
    scraping: QueueStats;
    images: QueueStats;
    normalization: QueueStats;
    enrichment: QueueStats;
  };
  activeJobs: ActiveJob[];
  completedToday: number;
  failedToday: number;
  totalProducts: number;
}

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export interface ActiveJob {
  id: string;
  brandId: string;
  status: string;
  progress: number;
  startedAt: Date;
}

type ScrapeManagerEvents = {
  'job:started': [job: Job<ScrapeJobData>];
  'job:progress': [job: Job<ScrapeJobData>, progress: ScrapeProgress];
  'job:completed': [job: Job<ScrapeJobData>, result: ScrapeJobResult];
  'job:failed': [job: Job<ScrapeJobData>, error: Error];
  'product:scraped': [brandId: string, product: ScrapedProduct];
};

const DEFAULT_CONFIG: ScrapeManagerConfig = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
  queues: {
    scraping: 'kitchenxpert:scraping',
    images: 'kitchenxpert:images',
    normalization: 'kitchenxpert:normalization',
    enrichment: 'kitchenxpert:enrichment',
  },
  concurrency: {
    scraping: 2,
    images: 5,
    normalization: 10,
    enrichment: 3,
  },
  downloadImages: true,
  normalizeData: true,
  storeResults: true,
};

// ═══════════════════════════════════════════════════════════════════════════
// Scrape Manager Class
// ═══════════════════════════════════════════════════════════════════════════

export class ScrapeManager extends EventEmitter {
  private config: ScrapeManagerConfig;
  private redis: Redis;
  private scrapingQueue!: Queue<ScrapeJobData, ScrapeJobResult>;
  private imagesQueue!: Queue;
  private normalizationQueue!: Queue;
  private enrichmentQueue!: Queue;
  private scrapingWorker!: Worker<ScrapeJobData, ScrapeJobResult>;
  private queueEvents!: QueueEvents;
  private scheduler!: QueueScheduler;
  private activeJobs: Map<string, ActiveJob> = new Map();
  private imageDownloader: ImageDownloader;
  private brandCircuitBreakers: Map<string, CircuitBreaker> = new Map();
  private isRunning = false;

  constructor(config: Partial<ScrapeManagerConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize Redis connection with lazyConnect so we can handle errors in start()
    this.redis = new Redis({
      host: this.config.redis.host,
      port: this.config.redis.port,
      password: this.config.redis.password,
      db: this.config.redis.db,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
    });

    // Initialize image downloader
    this.imageDownloader = createImageDownloader();

    this.setupQueues();
    this.setupWorkers();
    this.setupEventHandlers();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Setup Methods
  // ═══════════════════════════════════════════════════════════════════════════

  private setupQueues(): void {
    const connection = this.redis;

    // Scraping queue
    this.scrapingQueue = new Queue<ScrapeJobData, ScrapeJobResult>(
      this.config.queues.scraping,
      {
        connection,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 60000, // 1 minute
          },
          removeOnComplete: {
            age: 86400, // 24 hours
            count: 100,
          },
          removeOnFail: {
            age: 604800, // 7 days
          },
        },
      }
    );

    // Images queue
    this.imagesQueue = new Queue(this.config.queues.images, {
      connection,
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
      },
    });

    // Normalization queue
    this.normalizationQueue = new Queue(this.config.queues.normalization, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        removeOnComplete: true,
      },
    });

    // Enrichment queue (Claude AI product enrichment)
    this.enrichmentQueue = new Queue(this.config.queues.enrichment, {
      connection,
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 30000,
        },
        removeOnComplete: true,
      },
    });

    // Queue events for monitoring
    this.queueEvents = new QueueEvents(this.config.queues.scraping, { connection });

    // Scheduler for delayed/repeatable jobs
    this.scheduler = new QueueScheduler(this.config.queues.scraping, { connection });

    logger.info('Queues initialized', { queues: this.config.queues });
  }

  private setupWorkers(): void {
    // Scraping worker
    this.scrapingWorker = new Worker<ScrapeJobData, ScrapeJobResult>(
      this.config.queues.scraping,
      async (job: Job<ScrapeJobData>) => this.processScrapeJob(job),
      {
        connection: this.redis as never,
        concurrency: this.config.concurrency.scraping,
        limiter: {
          max: 1,
          duration: 5000, // 1 job per 5 seconds max per brand
        },
      }
    );

    // Worker event handlers
    this.scrapingWorker.on('completed', (job: Job<ScrapeJobData>, result: ScrapeJobResult) => {
      logger.info(`Job completed: ${job.data.brandId}`, { jobId: job.id, result });
      this.activeJobs.delete(job.id!);
      this.emit('job:completed', job, result);
    });

    this.scrapingWorker.on('failed', (job: Job<ScrapeJobData> | undefined, error: Error) => {
      if (job) {
        logger.error(`Job failed: ${job.data.brandId}`, { jobId: job.id, error: error.message });
        this.activeJobs.delete(job.id!);
        this.emit('job:failed', job, error);
      }
    });

    this.scrapingWorker.on('progress', (job: Job<ScrapeJobData>, progress: number | object | string) => {
      logger.debug(`Job progress: ${job.data.brandId}`, { progress });
      this.emit('job:progress', job, progress as ScrapeProgress);
    });

    logger.info('Workers initialized');
  }

  private setupEventHandlers(): void {
    this.queueEvents.on('waiting', ({ jobId }: { jobId: string }) => {
      logger.debug(`Job waiting: ${jobId}`);
    });

    this.queueEvents.on('active', async ({ jobId }: { jobId: string }) => {
      const job = await this.scrapingQueue.getJob(jobId);
      if (job) {
        this.activeJobs.set(jobId, {
          id: jobId,
          brandId: job.data.brandId,
          status: 'active',
          progress: 0,
          startedAt: new Date(),
        });
        this.emit('job:started', job);
      }
    });

    this.queueEvents.on('progress', async ({ jobId, data }: { jobId: string; data: unknown }) => {
      const activeJob = this.activeJobs.get(jobId);
      if (activeJob) {
        activeJob.progress = (data as { progress?: number }).progress || 0;
        activeJob.status = (data as { status?: string }).status || 'running';
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Circuit Breaker
  // ═══════════════════════════════════════════════════════════════════════════

  private getCircuitBreaker(brandId: string): CircuitBreaker {
    if (!this.brandCircuitBreakers.has(brandId)) {
      this.brandCircuitBreakers.set(brandId, new CircuitBreaker({
        failureThreshold: 5,
        resetTimeout: 60000,
        // Allow 3 test requests in half-open state for a more reliable sample before deciding recovery
        halfOpenMax: 3,
        name: `scraper:${brandId}`,
      }));
    }
    return this.brandCircuitBreakers.get(brandId)!;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Job Processing
  // ═══════════════════════════════════════════════════════════════════════════

  private async processScrapeJob(job: Job<ScrapeJobData>): Promise<ScrapeJobResult> {
    const { brandId, options } = job.data;
    const startedAt = new Date();
    const brandLogger = createBrandLogger(brandId);

    brandLogger.info(`Starting scrape job`, { jobId: job.id, options });

    // Check if scraper exists
    if (!hasScraperFor(brandId)) {
      throw new Error(`No scraper available for brand: ${brandId}`);
    }

    // Get brand config
    const brandConfig = getBrandConfig(brandId);
    if (!brandConfig) {
      throw new Error(`Brand configuration not found: ${brandId}`);
    }

    // Create scraper instance
    const scraperOptions: Partial<ScraperOptions> = {
      ...this.config.defaultScraperOptions,
      ...options,
    };

    const scraper = createScraper(brandId, scraperOptions);

    // Create data normalizer for this brand
    const normalizer = createDataNormalizer(brandId);

    // Collected products
    const products: ScrapedProduct[] = [];
    let failedProductCount = 0;

    // Set up product callback
    scraper.onProductEvent(async (product) => {
      try {
        // Normalize product data
        if (this.config.normalizeData) {
          const normalized = this.normalizeProduct(normalizer, product);
          if (normalized) {
            products.push(normalized);
            this.emit('product:scraped', brandId, normalized);
          }
        } else {
          products.push(product);
          this.emit('product:scraped', brandId, product);
        }

        // Queue image download if enabled
        if (this.config.downloadImages && 'imageUrls' in product.data) {
          await this.queueImageDownload(brandId, product);
        }
      } catch (error) {
        failedProductCount++;
        brandLogger.error('Failed to process product in callback', {
          type: product.type,
          error: error instanceof Error ? error.message : String(error),
          failedProductCount,
        });
      }
    });

    // Set up progress callback
    scraper.onProgressEvent((progress) => {
      job.updateProgress(progress);
    });

    // Run the scraper with circuit breaker protection
    const circuitBreaker = this.getCircuitBreaker(brandId);
    const summary = await circuitBreaker.execute(() => scraper.run());

    const completedAt = new Date();
    const duration = Math.round((completedAt.getTime() - startedAt.getTime()) / 1000);

    brandLogger.info(`Scrape job completed`, {
      jobId: job.id,
      status: summary.status,
      products: summary.stats.productsFound,
      duration: `${duration}s`,
    });

    // Store results if enabled
    if (this.config.storeResults) {
      await this.storeResults(brandId, products, summary);
    }

    return {
      brandId,
      summary,
      startedAt,
      completedAt,
      duration,
    };
  }

  private normalizeProduct(normalizer: DataNormalizer, product: ScrapedProduct): ScrapedProduct | null {
    try {
      switch (product.type) {
        case 'cabinet': {
          const result = normalizer.normalizeCabinet(product.data);
          if (result.success && result.data) {
            return { type: 'cabinet', data: result.data };
          }
          break;
        }
        case 'worktop': {
          const result = normalizer.normalizeWorktop(product.data);
          if (result.success && result.data) {
            return { type: 'worktop', data: result.data };
          }
          break;
        }
        case 'facade': {
          const result = normalizer.normalizeFacade(product.data);
          if (result.success && result.data) {
            return { type: 'facade', data: result.data };
          }
          break;
        }
        case 'handle': {
          const result = normalizer.normalizeHandle(product.data);
          if (result.success && result.data) {
            return { type: 'handle', data: result.data };
          }
          break;
        }
        case 'appliance': {
          const result = normalizer.normalizeAppliance(product.data);
          if (result.success && result.data) {
            return { type: 'appliance', data: result.data };
          }
          break;
        }
        case 'accessory': {
          const result = normalizer.normalizeAccessory(product.data);
          if (result.success && result.data) {
            return { type: 'accessory', data: result.data };
          }
          break;
        }
      }
    } catch (error) {
      logger.warn('Failed to normalize product', { type: product.type, error });
    }

    return product;
  }

  private async queueImageDownload(brandId: string, product: ScrapedProduct): Promise<void> {
    const data = product.data as unknown as Record<string, unknown>;
    const imageUrls = data.imageUrls ?? data.images ?? data.imageThumbnails;
    const reference = data.reference;

    if (!Array.isArray(imageUrls) || imageUrls.length === 0 || typeof reference !== 'string') {
      return;
    }

    await this.imagesQueue.add(
      `images:${brandId}:${reference}`,
      {
        brandId,
        productType: product.type,
        productReference: reference,
        imageUrls: imageUrls as string[],
      },
      { priority: 10 }
    );
  }

  private async storeResults(
    brandId: string,
    products: ScrapedProduct[],
    summary: ScrapeSummary
  ): Promise<void> {
    // Store in Redis for quick access
    const key = `scrape:results:${brandId}:${Date.now()}`;
    await this.redis.setex(
      key,
      86400 * 7, // 7 days
      JSON.stringify({
        brandId,
        summary,
        productCount: products.length,
        timestamp: new Date().toISOString(),
      })
    );

    // Store products in database via Prisma
    if (isPrismaConnected() && products.length > 0) {
      const prisma = getPrismaClient();
      if (prisma) {
        try {
          // Store scrape log
          await prisma.scrapeLog.create({
            data: {
              brandId,
              status: summary.status === 'success' ? 'completed' : summary.status === 'partial' ? 'partial' : 'failed',
              startedAt: summary.startedAt,
              completedAt: summary.completedAt || new Date(),
              pagesScraped: summary.stats.pagesScraped,
              productsFound: summary.stats.productsFound,
              productsNew: summary.stats.productsNew || 0,
              productsUpdated: summary.stats.productsUpdated || 0,
              errors: summary.stats.errors,
              errorMessages: summary.stats.errorMessages || [],
              duration: summary.completedAt
                ? Math.floor((summary.completedAt.getTime() - summary.startedAt.getTime()) / 1000)
                : null,
            },
          });

          // Upsert products (batch insert/update) within a transaction with retry
          let productsStored = 0;
          let productsUpdated = 0;
          const BATCH_SIZE = 20;
          const MAX_TRANSACTION_RETRIES = 3;

          for (let batchStart = 0; batchStart < products.length; batchStart += BATCH_SIZE) {
            const batch = products.slice(batchStart, batchStart + BATCH_SIZE);
            let retryAttempt = 0;
            let batchSuccess = false;

            while (retryAttempt < MAX_TRANSACTION_RETRIES && !batchSuccess) {
              try {
                await prisma.$transaction(async (tx) => {
                  for (const product of batch) {
                    switch (product.type) {
                      case 'cabinet': {
                        const d = product.data;
                        await tx.cabinet.upsert({
                          where: {
                            brandId_reference: {
                              brandId,
                              reference: d.reference,
                            },
                          },
                          create: {
                            brandId,
                            reference: d.reference,
                            name: d.name,
                            description: d.description || null,
                            type: d.type || 'base_standard',
                            category: d.category || 'base',
                            width: d.width || 0,
                            height: d.height || 0,
                            depth: d.depth || 0,
                            priceTTC: d.priceTTC || null,
                            priceUnit: 'EUR',
                            priceType: d.priceType || 'on_request',
                            imageMain: d.imageMain || null,
                            imageThumbnails: d.imageThumbnails || [],
                            url: d.url,
                            scrapedAt: new Date(),
                          },
                          update: {
                            name: d.name,
                            description: d.description || null,
                            priceTTC: d.priceTTC || null,
                            imageMain: d.imageMain || null,
                            imageThumbnails: d.imageThumbnails || [],
                            scrapedAt: new Date(),
                            updatedAt: new Date(),
                          },
                        });
                        productsStored++;
                        break;
                      }

                      case 'worktop': {
                        const d = product.data;
                        await tx.worktop.upsert({
                          where: {
                            brandId_reference: {
                              brandId,
                              reference: d.reference,
                            },
                          },
                          create: {
                            brandId,
                            reference: d.reference,
                            name: d.name,
                            description: d.description || null,
                            material: d.material,
                            materialDetail: d.materialDetail || null,
                            thicknesses: d.thicknesses || [],
                            depths: d.depths || [],
                            maxLength: d.maxLength || null,
                            finishes: d.finishes || [],
                            heatResistant: d.heatResistant || false,
                            scratchResistant: d.scratchResistant || false,
                            stainResistant: d.stainResistant || false,
                            foodSafe: d.foodSafe ?? true,
                            antibacterial: d.antibacterial || false,
                            pricePerMeter: d.pricePerMeter || null,
                            pricePerSquareMeter: d.pricePerSquareMeter || null,
                            priceType: d.priceType || 'on_request',
                            images: d.images || [],
                            url: d.url,
                            scrapedAt: new Date(),
                          },
                          update: {
                            name: d.name,
                            description: d.description || null,
                            pricePerMeter: d.pricePerMeter || null,
                            pricePerSquareMeter: d.pricePerSquareMeter || null,
                            images: d.images || [],
                            scrapedAt: new Date(),
                            updatedAt: new Date(),
                          },
                        });
                        productsStored++;
                        break;
                      }

                      case 'appliance': {
                        const d = product.data;
                        await tx.appliance.upsert({
                          where: {
                            brandId_reference: {
                              brandId,
                              reference: d.reference,
                            },
                          },
                          create: {
                            brandId,
                            reference: d.reference,
                            name: d.name,
                            description: d.description || null,
                            manufacturerBrand: d.manufacturerBrand,
                            type: d.type,
                            width: d.width || 0,
                            height: d.height || 0,
                            depth: d.depth || 0,
                            cutoutWidth: d.cutoutWidth || null,
                            cutoutDepth: d.cutoutDepth || null,
                            energyClass: d.energyClass || null,
                            capacity: d.capacity || null,
                            power: d.power || null,
                            noiseLevel: d.noiseLevel || null,
                            programs: d.programs || null,
                            connectivity: d.connectivity || false,
                            priceTTC: d.priceTTC || null,
                            priceType: d.priceType || 'on_request',
                            inclusion: d.inclusion || 'optional',
                            images: d.images || [],
                            url: d.url,
                            scrapedAt: new Date(),
                          },
                          update: {
                            name: d.name,
                            description: d.description || null,
                            priceTTC: d.priceTTC || null,
                            images: d.images || [],
                            scrapedAt: new Date(),
                            updatedAt: new Date(),
                          },
                        });
                        productsStored++;
                        break;
                      }

                      case 'facade': {
                        const d = product.data;
                        await tx.facade.upsert({
                          where: {
                            brandId_reference: {
                              brandId,
                              reference: d.reference,
                            },
                          },
                          create: {
                            brandId,
                            reference: d.reference,
                            name: d.name,
                            description: d.description || null,
                            collectionId: d.collectionId || null,
                            type: d.type,
                            style: d.style,
                            material: d.material,
                            thickness: d.thickness || null,
                            finishes: d.finishes || [],
                            edgingType: d.edgingType || null,
                            edgingThickness: d.edgingThickness || null,
                            pricePerSquareMeter: d.pricePerSquareMeter || null,
                            priceType: d.priceType || 'on_request',
                            images: d.images || [],
                            url: d.url,
                            scrapedAt: new Date(),
                          },
                          update: {
                            name: d.name,
                            description: d.description || null,
                            pricePerSquareMeter: d.pricePerSquareMeter || null,
                            images: d.images || [],
                            scrapedAt: new Date(),
                            updatedAt: new Date(),
                          },
                        });
                        productsStored++;
                        break;
                      }

                      case 'handle': {
                        const d = product.data;
                        await tx.handle.upsert({
                          where: {
                            brandId_reference: {
                              brandId,
                              reference: d.reference,
                            },
                          },
                          create: {
                            brandId,
                            reference: d.reference,
                            name: d.name,
                            description: d.description || null,
                            type: d.type,
                            style: d.style || null,
                            material: d.material,
                            finish: d.finish || null,
                            length: d.length || null,
                            width: d.width || null,
                            projection: d.projection || null,
                            colors: d.colors || [],
                            priceUnit: d.priceUnit || null,
                            pricePack: d.pricePack || null,
                            packQuantity: d.packQuantity || null,
                            priceType: d.priceType || 'on_request',
                            images: d.images || [],
                            url: d.url,
                            scrapedAt: new Date(),
                          },
                          update: {
                            name: d.name,
                            description: d.description || null,
                            priceUnit: d.priceUnit || null,
                            images: d.images || [],
                            scrapedAt: new Date(),
                            updatedAt: new Date(),
                          },
                        });
                        productsStored++;
                        break;
                      }

                      case 'accessory': {
                        const d = product.data;
                        await tx.accessory.upsert({
                          where: {
                            brandId_reference: {
                              brandId,
                              reference: d.reference,
                            },
                          },
                          create: {
                            brandId,
                            reference: d.reference,
                            name: d.name,
                            description: d.description || null,
                            type: d.type,
                            width: d.width || null,
                            height: d.height || null,
                            depth: d.depth || null,
                            cabinetTypes: d.cabinetTypes || [],
                            cabinetWidths: d.cabinetWidths || [],
                            priceTTC: d.priceTTC || null,
                            priceType: d.priceType || 'on_request',
                            images: d.images || [],
                            url: d.url,
                            scrapedAt: new Date(),
                          },
                          update: {
                            name: d.name,
                            description: d.description || null,
                            priceTTC: d.priceTTC || null,
                            images: d.images || [],
                            scrapedAt: new Date(),
                            updatedAt: new Date(),
                          },
                        });
                        productsStored++;
                        break;
                      }

                      case 'collection':
                        // Collections are not stored as products
                        break;

                      default:
                        logger.warn(`Unknown product type: ${(product as ScrapedProduct).type}`, { brandId });
                        break;
                    }
                  }
                });
                batchSuccess = true;
              } catch (transactionError) {
                retryAttempt++;
                if (retryAttempt < MAX_TRANSACTION_RETRIES) {
                  logger.warn(`Transaction failed for batch starting at ${batchStart}, retrying (${retryAttempt}/${MAX_TRANSACTION_RETRIES})`, {
                    error: transactionError instanceof Error ? transactionError.message : String(transactionError),
                    brandId,
                  });
                  // Exponential backoff before retry
                  await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryAttempt) * 1000));
                } else {
                  logger.error(`Transaction failed for batch starting at ${batchStart} after ${MAX_TRANSACTION_RETRIES} retries`, {
                    error: transactionError instanceof Error ? transactionError.message : String(transactionError),
                    brandId,
                    batchSize: batch.length,
                  });
                }
              }
            }
          }

          // Queue products for AI enrichment
          if (products.length > 0) {
            const getProductMeta = (p: ScrapedProduct): { reference: string; name: string; description?: string } => {
              const data = p.data as Record<string, unknown>;
              return {
                reference: (data.reference as string) || (data.externalId as string) || 'unknown',
                name: (data.name as string) || 'Unknown',
                description: data.description as string | undefined,
              };
            };

            // Queue in batches of 5
            for (let i = 0; i < products.length; i += 5) {
              const batch = products.slice(i, i + 5);
              await this.enrichmentQueue.add(
                `enrich:${brandId}:${i}`,
                {
                  brandId,
                  products: batch.map(p => {
                    const meta = getProductMeta(p);
                    return {
                      type: p.type,
                      id: meta.reference || `${brandId}-${i}`,
                      name: meta.name,
                      description: meta.description,
                    };
                  }),
                },
                { priority: 20 }
              );
            }
            logger.info(`Queued ${products.length} products for AI enrichment`, { brandId });
          }

          // Update brand stats
          await prisma.brand.update({
            where: { id: brandId },
            data: {
              lastScrapedAt: new Date(),
              productsCount: {
                increment: productsStored - productsUpdated,
              },
            },
          }).catch(() => {
            // Brand might not exist, ignore
          });

          logger.info(`Stored ${productsStored} products in database for ${brandId}`);
        } catch (dbError) {
          logger.error(`Failed to store products in database for ${brandId}`, {
            error: dbError instanceof Error ? dbError.message : String(dbError),
          });
        }
      }
    }

    logger.info(`Stored scrape results for ${brandId}`, { key, products: products.length });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Public API - Job Management
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Add a scraping job for a single brand
   */
  async addJob(
    brandId: string,
    options?: Partial<ScraperOptions>,
    priority?: number
  ): Promise<Job<ScrapeJobData>> {
    const jobData: ScrapeJobData = {
      brandId,
      options,
      priority,
      triggeredBy: 'manual',
    };

    const job = await this.scrapingQueue.add(
      `scrape:${brandId}`,
      jobData,
      {
        priority: priority || this.getBrandPriority(brandId),
        jobId: `scrape:${brandId}:${Date.now()}`,
      }
    );

    logger.info(`Added scraping job for ${brandId}`, { jobId: job.id });
    return job;
  }

  /**
   * Add scraping jobs for all enabled brands
   */
  async addAllJobs(options?: Partial<ScraperOptions>): Promise<Job<ScrapeJobData>[]> {
    const brands = getEnabledBrands().filter((b) => hasScraperFor(b.id));
    const jobs: Job<ScrapeJobData>[] = [];

    for (const brand of brands) {
      const job = await this.addJob(brand.id, options, brand.priority);
      jobs.push(job);
    }

    logger.info(`Added ${jobs.length} scraping jobs`);
    return jobs;
  }

  /**
   * Add scraping jobs in priority order
   */
  async addPriorityJobs(options?: Partial<ScraperOptions>): Promise<Job<ScrapeJobData>[]> {
    const brands = getBrandsByPriority().filter((b) => hasScraperFor(b.id));
    const jobs: Job<ScrapeJobData>[] = [];

    for (const brand of brands) {
      const job = await this.addJob(brand.id, options, brand.priority);
      jobs.push(job);
    }

    logger.info(`Added ${jobs.length} priority scraping jobs`);
    return jobs;
  }

  /**
   * Schedule recurring scrape for a brand
   */
  async scheduleJob(
    brandId: string,
    cronPattern: string,
    options?: Partial<ScraperOptions>
  ): Promise<void> {
    const jobData: ScrapeJobData = {
      brandId,
      options,
      triggeredBy: 'schedule',
    };

    await this.scrapingQueue.add(`scheduled:${brandId}`, jobData, {
      repeat: { pattern: cronPattern },
      priority: this.getBrandPriority(brandId),
    });

    logger.info(`Scheduled recurring scrape for ${brandId}`, { cron: cronPattern });
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string): Promise<Job<ScrapeJobData> | undefined> {
    return this.scrapingQueue.getJob(jobId);
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<void> {
    const job = await this.scrapingQueue.getJob(jobId);
    if (job) {
      await job.remove();
      this.activeJobs.delete(jobId);
      logger.info(`Cancelled job ${jobId}`);
    }
  }

  /**
   * Pause all scraping
   */
  async pause(): Promise<void> {
    await this.scrapingQueue.pause();
    logger.info('Scraping paused');
  }

  /**
   * Resume scraping
   */
  async resume(): Promise<void> {
    await this.scrapingQueue.resume();
    logger.info('Scraping resumed');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Public API - Statistics
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get manager statistics
   */
  async getStats(): Promise<ManagerStats> {
    const [scrapingCounts, imagesCounts, normCounts, enrichmentCounts] = await Promise.all([
      this.scrapingQueue.getJobCounts(),
      this.imagesQueue.getJobCounts(),
      this.normalizationQueue.getJobCounts(),
      this.enrichmentQueue.getJobCounts(),
    ]);

    // Get today's completed/failed counts
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const completedJobs = await this.scrapingQueue.getCompleted(0, 1000);
    const failedJobs = await this.scrapingQueue.getFailed(0, 1000);

    const completedToday = completedJobs.filter(
      (j: { finishedOn?: number }) => j.finishedOn && j.finishedOn >= startOfDay.getTime()
    ).length;

    const failedToday = failedJobs.filter(
      (j: { finishedOn?: number }) => j.finishedOn && j.finishedOn >= startOfDay.getTime()
    ).length;

    // Calculate total products (from Redis using SCAN to avoid blocking)
    let totalProducts = 0;
    const resultKeys: string[] = [];
    let cursor = '0';
    do {
      const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', 'scrape:results:*', 'COUNT', 100);
      cursor = nextCursor;
      resultKeys.push(...keys);
    } while (cursor !== '0');

    for (const key of resultKeys) {
      const data = await this.redis.get(key);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          totalProducts += parsed.productCount || 0;
        } catch {}
      }
    }

    return {
      queues: {
        scraping: {
          waiting: scrapingCounts.waiting ?? 0,
          active: scrapingCounts.active ?? 0,
          completed: scrapingCounts.completed ?? 0,
          failed: scrapingCounts.failed ?? 0,
          delayed: scrapingCounts.delayed ?? 0,
        },
        images: {
          waiting: imagesCounts.waiting ?? 0,
          active: imagesCounts.active ?? 0,
          completed: imagesCounts.completed ?? 0,
          failed: imagesCounts.failed ?? 0,
          delayed: imagesCounts.delayed ?? 0,
        },
        normalization: {
          waiting: normCounts.waiting ?? 0,
          active: normCounts.active ?? 0,
          completed: normCounts.completed ?? 0,
          failed: normCounts.failed ?? 0,
          delayed: normCounts.delayed ?? 0,
        },
        enrichment: {
          waiting: enrichmentCounts.waiting ?? 0,
          active: enrichmentCounts.active ?? 0,
          completed: enrichmentCounts.completed ?? 0,
          failed: enrichmentCounts.failed ?? 0,
          delayed: enrichmentCounts.delayed ?? 0,
        },
      },
      activeJobs: Array.from(this.activeJobs.values()),
      completedToday,
      failedToday,
      totalProducts,
    };
  }

  /**
   * Get available scrapers
   */
  getAvailableScrapers(): string[] {
    return getAvailableScrapers();
  }

  /**
   * Check if a brand has a scraper
   */
  hasScraper(brandId: string): boolean {
    return hasScraperFor(brandId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Lifecycle
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Start the manager
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('ScrapeManager is already running');
      return;
    }

    // Explicitly connect to Redis
    try {
      await this.redis.connect();
      logger.info('Redis connection established');
    } catch (error) {
      logger.error('Failed to connect to Redis', {
        error: error instanceof Error ? error.message : String(error),
        host: this.config.redis.host,
        port: this.config.redis.port,
      });
      throw error;
    }

    this.isRunning = true;
    logger.info('ScrapeManager started');
  }

  /**
   * Stop the manager gracefully
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    logger.info('Stopping ScrapeManager...');

    // Close worker first
    await this.scrapingWorker.close();

    // Close queues
    await this.scrapingQueue.close();
    await this.imagesQueue.close();
    await this.normalizationQueue.close();
    await this.enrichmentQueue.close();

    // Close scheduler and events
    await this.scheduler.close();
    await this.queueEvents.close();

    // Close Redis
    await this.redis.quit();

    this.isRunning = false;
    logger.info('ScrapeManager stopped');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Helper Methods
  // ═══════════════════════════════════════════════════════════════════════════

  private getBrandPriority(brandId: string): number {
    const brand = getBrandConfig(brandId);
    return brand?.priority || 50;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Factory Function
// ═══════════════════════════════════════════════════════════════════════════

export function createScrapeManager(config?: Partial<ScrapeManagerConfig>): ScrapeManager {
  return new ScrapeManager(config);
}

export default ScrapeManager;
