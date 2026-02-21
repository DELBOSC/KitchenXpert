/**
 * KitchenXpert Scraper
 *
 * Kitchen furniture and appliance catalog scraper
 * Extracts product data from major kitchen retailers for the KitchenXpert AI configurator
 */

// Configuration
export {
  type BrandScrapingConfig,
  BRANDS_CONFIG,
  getBrandsByPriority,
  getEnabledBrands,
  getBrandsByGroup,
  getBrandConfig,
  getBrandsBySegment,
  getBrandsWithPrices,
} from './config/brands.config.js';

// Models
export * from './models/index.js';

// Scrapers
export * from './scrapers/index.js';

// Services
export * from './services/index.js';

// Utilities
export * from './utils/index.js';

// API
import { startServer as _startServer, createApp as _createApp } from './api/server.js';
export { _createApp as createApp, _startServer as startServer };

// Version
export const VERSION = '2.0.0';

// Re-export commonly used items for convenience
export {
  BaseScraper,
  SchmidtScraper,
  IkeaScraper,
  LeroyMerlinScraper,
  MobalpaScraper,
  createScraper,
  hasScraperFor,
  getAvailableScrapers,
} from './scrapers/index.js';

export {
  logger,
  rateLimiter,
  retryHandler,
  proxyManager,
} from './utils/index.js';

export {
  ScrapeManager,
  createScrapeManager,
  DataNormalizer,
  createDataNormalizer,
  ImageDownloader,
  createImageDownloader,
  SyncScheduler,
  createSyncScheduler,
} from './services/index.js';

// Default export: start the API server
export default _startServer;
