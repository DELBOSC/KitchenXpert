#!/usr/bin/env ts-node
/**
 * Scrape All Script
 *
 * Scrape all enabled brands in sequence
 *
 * Usage:
 *   npm run scrape:all
 *   npm run scrape:priority   (by priority order)
 */

import 'dotenv/config';
import { createScraper, hasScraperFor, getAvailableScrapers } from '../src/scrapers/index.js';
import {
  getEnabledBrands,
  getBrandsByPriority,
  BrandScrapingConfig,
} from '../src/config/brands.config.js';
import { logger } from '../src/utils/logger.js';
import type { ScrapeSummary } from '../src/models/scrape-result.js';

interface ScrapeAllOptions {
  priorityOrder: boolean;
  testMode: boolean;
  dryRun: boolean;
  maxConcurrent: number;
  stopOnError: boolean;
}

async function scrapeAll(options: ScrapeAllOptions): Promise<Map<string, ScrapeSummary>> {
  const results = new Map<string, ScrapeSummary>();

  // Get brands to scrape
  let brands: BrandScrapingConfig[] = options.priorityOrder
    ? getBrandsByPriority()
    : getEnabledBrands();

  // Filter to only brands with scrapers
  brands = brands.filter((b) => hasScraperFor(b.id));

  logger.info(`Starting scrape of ${brands.length} brands`, {
    priorityOrder: options.priorityOrder,
    testMode: options.testMode,
    dryRun: options.dryRun,
  });

  console.log(`\nScraping ${brands.length} brands:`);
  brands.forEach((b, i) => {
    console.log(`  ${i + 1}. ${b.name} (${b.id}) - Priority: ${b.priority}`);
  });
  console.log('');

  // Dry run mode - just show what would be scraped
  if (options.dryRun) {
    console.log('[DRY RUN] Would scrape the following brands:');
    for (const brand of brands) {
      console.log(`  - ${brand.name} (${brand.id})`);
      console.log(`    Website: ${brand.website}`);
      console.log(`    Catalog paths: ${brand.catalogPaths.join(', ')}`);
      console.log(`    Difficulty: ${brand.scrapingDifficulty}`);
      console.log(`    Frequency: ${brand.scrapingFrequency}`);
    }
    console.log('\n[DRY RUN] No scraping performed.');
    return results;
  }

  // Scrape each brand sequentially
  for (const brand of brands) {
    console.log(`\n--- Starting: ${brand.name} ---`);

    try {
      const scraper = createScraper(brand.id, {
        testMode: options.testMode,
        headless: true,
        screenshotsOnError: true,
      });

      const summary = await scraper.run();
      results.set(brand.id, summary);

      console.log(`Completed: ${brand.name}`);
      console.log(`  Status: ${summary.status}`);
      console.log(`  Products: ${summary.stats.productsFound}`);
      console.log(`  Duration: ${summary.duration}s`);

      if (summary.status === 'failed' && options.stopOnError) {
        logger.error(`Stopping due to failure on ${brand.name}`);
        break;
      }
    } catch (error) {
      logger.error(`Error scraping ${brand.name}`, { error });
      console.error(`Error scraping ${brand.name}:`, error);

      if (options.stopOnError) {
        break;
      }
    }
  }

  return results;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
KitchenXpert Scraper - Scrape All Brands

Usage:
  npm run scrape:all [options]
  npm run scrape:priority [options]

Options:
  --priority       Scrape in priority order (lowest number first)
  --test           Run in test mode (scrape first page only)
  --dry-run        Show what would be scraped without actually scraping
  --stop-on-error  Stop if any brand fails
  --help, -h       Show this help message

Available scrapers:
  ${getAvailableScrapers().join(', ')}
`);
    process.exit(0);
  }

  const options: ScrapeAllOptions = {
    priorityOrder: args.includes('--priority') || (process.argv[1]?.includes('priority') ?? false),
    testMode: args.includes('--test'),
    dryRun: args.includes('--dry-run'),
    maxConcurrent: 1, // Sequential for now
    stopOnError: args.includes('--stop-on-error'),
  };

  const startTime = Date.now();

  try {
    const results = await scrapeAll(options);

    // Print final summary
    const totalDuration = Math.round((Date.now() - startTime) / 1000);

    console.log('\n' + '='.repeat(50));
    console.log('=== Final Summary ===');
    console.log('='.repeat(50));

    let totalProducts = 0;
    let totalErrors = 0;
    let successful = 0;
    let failed = 0;
    let partial = 0;

    for (const [brandId, summary] of results) {
      console.log(`\n${summary.brandName}:`);
      console.log(`  Status: ${summary.status}`);
      console.log(`  Products: ${summary.stats.productsFound}`);
      console.log(`  Errors: ${summary.stats.errors}`);

      totalProducts += summary.stats.productsFound;
      totalErrors += summary.stats.errors;

      switch (summary.status) {
        case 'completed':
          successful++;
          break;
        case 'failed':
          failed++;
          break;
        case 'partial':
          partial++;
          break;
      }
    }

    console.log('\n' + '-'.repeat(50));
    console.log('Totals:');
    console.log(`  Brands scraped: ${results.size}`);
    console.log(`  Successful: ${successful}`);
    console.log(`  Partial: ${partial}`);
    console.log(`  Failed: ${failed}`);
    console.log(`  Total products: ${totalProducts}`);
    console.log(`  Total errors: ${totalErrors}`);
    console.log(`  Total duration: ${Math.floor(totalDuration / 60)}m ${totalDuration % 60}s`);

    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    logger.error('Fatal error during scraping', { error });
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
