#!/usr/bin/env ts-node
/**
 * Scrape Brand Script
 *
 * Usage:
 *   npm run scrape:brand <brand-id>
 *   npm run scrape:brand schmidt
 *   npm run scrape:brand schmidt --test
 */

import 'dotenv/config';
import { createScraper, hasScraperFor, getAvailableScrapers } from '../src/scrapers/index.js';
import { getBrandConfig } from '../src/config/brands.config.js';
import { logger } from '../src/utils/logger.js';

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
KitchenXpert Scraper - Scrape Brand

Usage:
  npm run scrape:brand <brand-id> [options]

Options:
  --test        Run in test mode (scrape first page only)
  --headful     Run browser in visible mode (for debugging)
  --help, -h    Show this help message

Available scrapers:
  ${getAvailableScrapers().join(', ')}

Examples:
  npm run scrape:brand schmidt
  npm run scrape:brand schmidt --test
  npm run scrape:brand ikea --headful
`);
    process.exit(0);
  }

  const brandId = args[0];
  const testMode = args.includes('--test');
  const headless = !args.includes('--headful');

  if (!brandId) {
    console.error('Error: Brand ID is required');
    process.exit(1);
  }

  // Check if brand exists
  const brandConfig = getBrandConfig(brandId);
  if (!brandConfig) {
    console.error(`Error: Brand "${brandId}" not found in configuration`);
    console.error('Available brands: ', getAvailableScrapers().join(', '));
    process.exit(1);
  }

  // Check if scraper is available
  if (!hasScraperFor(brandId)) {
    console.error(`Error: No scraper implemented for brand "${brandId}"`);
    console.error('Available scrapers: ', getAvailableScrapers().join(', '));
    process.exit(1);
  }

  logger.info(`Starting scrape for ${brandConfig.name}`, {
    brandId,
    testMode,
    headless,
  });

  try {
    const scraper = createScraper(brandId, {
      testMode,
      headless,
      screenshotsOnError: true,
    });

    const summary = await scraper.run();

    logger.info('Scrape completed', {
      status: summary.status,
      duration: `${summary.duration}s`,
      products: summary.stats.productsFound,
      errors: summary.stats.errors,
    });

    // Print summary
    console.log('\n=== Scrape Summary ===');
    console.log(`Brand: ${summary.brandName}`);
    console.log(`Status: ${summary.status}`);
    console.log(`Duration: ${summary.duration}s`);
    console.log(`\nProducts found:`);
    console.log(`  - Cabinets: ${summary.byType.cabinets}`);
    console.log(`  - Worktops: ${summary.byType.worktops}`);
    console.log(`  - Facades: ${summary.byType.facades}`);
    console.log(`  - Handles: ${summary.byType.handles}`);
    console.log(`  - Appliances: ${summary.byType.appliances}`);
    console.log(`  - Accessories: ${summary.byType.accessories}`);
    console.log(`  - Total: ${summary.stats.productsFound}`);
    console.log(`\nPages scraped: ${summary.stats.pagesScraped}`);
    console.log(`Errors: ${summary.stats.errors}`);

    if (summary.errors.length > 0) {
      console.log('\nErrors:');
      summary.errors.slice(0, 5).forEach((err, i) => {
        console.log(`  ${i + 1}. ${err.message}${err.url ? ` (${err.url})` : ''}`);
      });
      if (summary.errors.length > 5) {
        console.log(`  ... and ${summary.errors.length - 5} more`);
      }
    }

    process.exit(summary.status === 'failed' ? 1 : 0);
  } catch (error) {
    logger.error('Fatal error during scraping', { error });
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
