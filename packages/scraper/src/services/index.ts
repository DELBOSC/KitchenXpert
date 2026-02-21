/**
 * Services Index
 *
 * Export all scraper services for KitchenXpert
 */

// ═══════════════════════════════════════════════════════════════════════════
// Database Clients
// ═══════════════════════════════════════════════════════════════════════════

export {
  prisma,
  getPrismaClient,
  connectPrisma,
  disconnectPrisma,
  isPrismaConnected,
  getPrismaConnectionError,
  checkPrismaHealth,
} from '../database/client.js';

export {
  redis,
  getRedisClient,
  connectRedis,
  disconnectRedis,
  isRedisConnected,
  getRedisConnectionError,
  checkRedisHealth,
  getRedisStatus,
  safeRedisCall,
} from '../database/redis.js';

// ═══════════════════════════════════════════════════════════════════════════
// Data Normalization
// ═══════════════════════════════════════════════════════════════════════════

export {
  DataNormalizer,
  createDataNormalizer,
  type NormalizationResult,
} from './data-normalizer.js';

// ═══════════════════════════════════════════════════════════════════════════
// Image Processing
// ═══════════════════════════════════════════════════════════════════════════

export {
  ImageDownloader,
  createImageDownloader,
  type ImageDownloadOptions,
  type ThumbnailSize,
  type DownloadResult,
  type BatchDownloadResult,
  type ImageInfo,
} from './image-downloader.js';

// ═══════════════════════════════════════════════════════════════════════════
// Scrape Management
// ═══════════════════════════════════════════════════════════════════════════

export {
  ScrapeManager,
  createScrapeManager,
  type ScrapeJobData,
  type ScrapeJobResult,
  type ScrapeManagerConfig,
  type ManagerStats,
  type QueueStats,
  type ActiveJob,
} from './scrape-manager.js';

// ═══════════════════════════════════════════════════════════════════════════
// Product Classification
// ═══════════════════════════════════════════════════════════════════════════

export {
  ProductClassifier,
  createProductClassifier,
  type ProductType,
  type ClassificationResult,
  type ExtractedFeatures,
} from './product-classifier.js';

// ═══════════════════════════════════════════════════════════════════════════
// Data Extraction
// ═══════════════════════════════════════════════════════════════════════════

export {
  DataExtractor,
  createDataExtractor,
  type ExtractedData,
  type ProductVariant,
  type ExtractionConfig,
} from './data-extractor.js';

// ═══════════════════════════════════════════════════════════════════════════
// Deduplication
// ═══════════════════════════════════════════════════════════════════════════

export {
  DeduplicationService,
  createDeduplicationService,
  type ProductFingerprint,
  type DuplicateMatch,
  type MatchType,
  type MatchDetails,
  type DeduplicationResult,
  type DuplicateGroup,
  type DeduplicationConfig,
} from './deduplication.js';

// ═══════════════════════════════════════════════════════════════════════════
// Smart Caching
// ═══════════════════════════════════════════════════════════════════════════

export {
  SmartCache,
  createSmartCache,
  type CacheConfig,
  type CacheEntry,
  type CacheStats,
  type CacheOptions,
} from './smart-cache.js';

// ═══════════════════════════════════════════════════════════════════════════
// Price Tracking
// ═══════════════════════════════════════════════════════════════════════════

export {
  PriceTracker,
  createPriceTracker,
  type PriceRecord,
  type PriceHistory,
  type PriceStatistics,
  type PriceAlert,
  type AlertType,
  type PriceComparison,
  type BrandPrice,
  type PriceTrackerConfig,
} from './price-tracker.js';

// ═══════════════════════════════════════════════════════════════════════════
// Sync Scheduling
// ═══════════════════════════════════════════════════════════════════════════

export {
  SyncScheduler,
  createSyncScheduler,
  type SyncSchedulerConfig,
  type SyncSchedulerStatus,
  type ScheduleStatus,
} from './sync-scheduler.js';

// ═══════════════════════════════════════════════════════════════════════════
// Service Factory
// ═══════════════════════════════════════════════════════════════════════════

import { DataNormalizer, createDataNormalizer } from './data-normalizer.js';
import { ImageDownloader, createImageDownloader, ImageDownloadOptions } from './image-downloader.js';
import { ScrapeManager, createScrapeManager, ScrapeManagerConfig } from './scrape-manager.js';
import { ProductClassifier, createProductClassifier } from './product-classifier.js';
import { DataExtractor, createDataExtractor, ExtractionConfig } from './data-extractor.js';
import { DeduplicationService, createDeduplicationService, DeduplicationConfig } from './deduplication.js';
import { SmartCache, createSmartCache, CacheConfig } from './smart-cache.js';
import { PriceTracker, createPriceTracker, PriceTrackerConfig } from './price-tracker.js';
import { connectPrisma, disconnectPrisma, isPrismaConnected } from '../database/client.js';
import { connectRedis, disconnectRedis, isRedisConnected } from '../database/redis.js';
import { logger } from '../utils/logger.js';

export interface ServiceContainer {
  normalizer: DataNormalizer;
  imageDownloader: ImageDownloader;
  scrapeManager: ScrapeManager;
  classifier: ProductClassifier;
  extractor: DataExtractor;
  deduplication: DeduplicationService;
  cache: SmartCache;
  priceTracker: PriceTracker;
}

export interface ServiceContainerConfig {
  brandId: string;
  imageDownloader?: Partial<ImageDownloadOptions>;
  scrapeManager?: Partial<ScrapeManagerConfig>;
  classifier?: { minConfidence?: number };
  extractor?: Partial<ExtractionConfig>;
  deduplication?: Partial<DeduplicationConfig>;
  cache?: Partial<CacheConfig>;
  priceTracker?: Partial<PriceTrackerConfig>;
}

/**
 * Create a container with all services configured for a brand
 */
export function createServiceContainer(config: ServiceContainerConfig): ServiceContainer {
  return {
    normalizer: createDataNormalizer(config.brandId),
    imageDownloader: createImageDownloader(config.imageDownloader),
    scrapeManager: createScrapeManager(config.scrapeManager),
    classifier: createProductClassifier(config.classifier),
    extractor: createDataExtractor(config.extractor),
    deduplication: createDeduplicationService(config.deduplication),
    cache: createSmartCache(config.cache),
    priceTracker: createPriceTracker(config.priceTracker),
  };
}

/**
 * Cleanup all services in a container
 */
export async function cleanupServiceContainer(container: ServiceContainer): Promise<void> {
  await container.cache.close();
  await container.scrapeManager.stop();
  container.deduplication.clear();
  container.priceTracker.clear();
}

// ═══════════════════════════════════════════════════════════════════════════
// Database Initialization & Cleanup
// ═══════════════════════════════════════════════════════════════════════════

export interface DatabaseConnectionStatus {
  prisma: boolean;
  redis: boolean;
  errors: string[];
}

/**
 * Initialize all database connections
 * Returns status of each connection attempt
 */
export async function initializeDatabases(): Promise<DatabaseConnectionStatus> {
  const errors: string[] = [];

  logger.info('Initializing database connections...');

  // Connect to Prisma
  let prismaConnected = false;
  try {
    prismaConnected = await connectPrisma();
    if (!prismaConnected) {
      errors.push('Prisma connection failed');
    }
  } catch (error) {
    errors.push(`Prisma error: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Connect to Redis
  let redisConnected = false;
  try {
    redisConnected = await connectRedis();
    if (!redisConnected) {
      errors.push('Redis connection failed');
    }
  } catch (error) {
    errors.push(`Redis error: ${error instanceof Error ? error.message : String(error)}`);
  }

  const status: DatabaseConnectionStatus = {
    prisma: prismaConnected,
    redis: redisConnected,
    errors,
  };

  if (errors.length === 0) {
    logger.info('All database connections established successfully');
  } else {
    logger.warn('Some database connections failed', { status });
  }

  return status;
}

/**
 * Disconnect all database connections
 */
export async function disconnectDatabases(): Promise<void> {
  logger.info('Disconnecting database connections...');

  try {
    await disconnectPrisma();
  } catch (error) {
    logger.error('Error disconnecting Prisma', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    await disconnectRedis();
  } catch (error) {
    logger.error('Error disconnecting Redis', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  logger.info('Database connections closed');
}

/**
 * Check health of all database connections
 */
export async function checkDatabaseHealth(): Promise<{
  prisma: { connected: boolean; latency?: number; error?: string };
  redis: { connected: boolean; latency?: number; error?: string };
  healthy: boolean;
}> {
  const { checkPrismaHealth } = await import('../database/client.js');
  const { checkRedisHealth } = await import('../database/redis.js');

  const [prismaHealth, redisHealth] = await Promise.all([
    checkPrismaHealth(),
    checkRedisHealth(),
  ]);

  return {
    prisma: prismaHealth,
    redis: redisHealth,
    healthy: prismaHealth.connected && redisHealth.connected,
  };
}

/**
 * Get current database connection status
 */
export function getDatabaseStatus(): DatabaseConnectionStatus {
  return {
    prisma: isPrismaConnected(),
    redis: isRedisConnected(),
    errors: [],
  };
}
