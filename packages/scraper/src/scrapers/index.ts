/**
 * Scrapers Index
 *
 * Export all brand-specific scrapers and factory functions
 */

export { BaseScraper } from './base-scraper.js';
export type { ScraperOptions, ScrapedProduct, CrawlState, PageCache } from './base-scraper.js';

// Brand scrapers
export { SchmidtScraper } from './schmidt.js';
export { CuisinellaScraper } from './cuisinella.js';
export { IkeaScraper } from './ikea.js';
export { LeroyMerlinScraper } from './leroy-merlin.js';
export { MobalpaScraper } from './mobalpa.js';
export { CastoramaScraper } from './castorama.js';
export { ButScraper } from './but.js';
export { NobiliaScraper } from './nobilia.js';

import { BaseScraper, ScraperOptions } from './base-scraper.js';
import { SchmidtScraper } from './schmidt.js';
import { CuisinellaScraper } from './cuisinella.js';
import { IkeaScraper } from './ikea.js';
import { LeroyMerlinScraper } from './leroy-merlin.js';
import { MobalpaScraper } from './mobalpa.js';
import { CastoramaScraper } from './castorama.js';
import { ButScraper } from './but.js';
import { NobiliaScraper } from './nobilia.js';
import { getBrandConfig, BrandScrapingConfig } from '../config/brands.config.js';

// Type for scraper constructor
type ScraperConstructor = new (
  config: BrandScrapingConfig,
  options?: Partial<ScraperOptions>
) => BaseScraper;

/**
 * Scraper registry - maps brand IDs to their scraper classes
 */
const scraperRegistry = new Map<string, ScraperConstructor>();

// Register all scrapers
scraperRegistry.set('schmidt', SchmidtScraper as ScraperConstructor);
scraperRegistry.set('cuisinella', CuisinellaScraper as ScraperConstructor);
scraperRegistry.set('ikea', IkeaScraper as ScraperConstructor);
scraperRegistry.set('leroy-merlin', LeroyMerlinScraper as ScraperConstructor);
scraperRegistry.set('mobalpa', MobalpaScraper as ScraperConstructor);
scraperRegistry.set('castorama', CastoramaScraper as ScraperConstructor);
scraperRegistry.set('but', ButScraper as ScraperConstructor);
scraperRegistry.set('nobilia', NobiliaScraper as ScraperConstructor);

/**
 * Create a scraper instance for a specific brand
 */
export function createScraper(brandId: string, options?: Partial<ScraperOptions>): BaseScraper {
  const ScraperClass = scraperRegistry.get(brandId);
  const brandConfig = getBrandConfig(brandId);

  if (!ScraperClass) {
    throw new Error(
      `No scraper implemented for brand: ${brandId}. Available: ${Array.from(scraperRegistry.keys()).join(', ')}`
    );
  }

  if (!brandConfig) {
    throw new Error(`Brand configuration not found: ${brandId}`);
  }

  return new ScraperClass(brandConfig, options);
}

/**
 * Check if a scraper is available for a brand
 */
export function hasScraperFor(brandId: string): boolean {
  return scraperRegistry.has(brandId);
}

/**
 * Get list of available scrapers
 */
export function getAvailableScrapers(): string[] {
  return Array.from(scraperRegistry.keys());
}

/**
 * Register a new scraper
 */
export function registerScraper(brandId: string, scraperClass: ScraperConstructor): void {
  scraperRegistry.set(brandId, scraperClass);
}
