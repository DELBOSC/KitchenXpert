#!/usr/bin/env ts-node
/**
 * Update Prices Script
 *
 * Compare and update product prices from recent scrapes.
 * Tracks price history and identifies significant changes.
 *
 * Usage:
 *   npm run update:prices
 *   npm run update:prices -- --brand ikea
 *   npm run update:prices -- --dry-run
 */

import 'dotenv/config';
import { logger } from '../src/utils/logger.js';
import { BRANDS_CONFIG, getBrandConfig, getEnabledBrands } from '../src/config/brands.config.js';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface UpdatePricesOptions {
  brand?: string;
  dryRun: boolean;
  threshold: number; // Minimum percentage change to report
  notifyOnDrop: boolean;
  notifyOnIncrease: boolean;
}

interface PriceUpdate {
  productId: string;
  productName: string;
  brandId: string;
  oldPrice: number;
  newPrice: number;
  changePercent: number;
  changeType: 'increase' | 'decrease' | 'unchanged';
}

// ═══════════════════════════════════════════════════════════════════════════
// CLI Argument Parsing
// ═══════════════════════════════════════════════════════════════════════════

function parseArgs(): UpdatePricesOptions {
  const args = process.argv.slice(2);

  const options: UpdatePricesOptions = {
    dryRun: false,
    threshold: 1, // 1% default threshold
    notifyOnDrop: true,
    notifyOnIncrease: true,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--brand':
      case '-b':
        if (nextArg) {
          options.brand = nextArg;
          i++;
        }
        break;

      case '--dry-run':
      case '-n':
        options.dryRun = true;
        break;

      case '--threshold':
      case '-t':
        if (nextArg) {
          options.threshold = parseFloat(nextArg);
          i++;
        }
        break;

      case '--no-drop-notify':
        options.notifyOnDrop = false;
        break;

      case '--no-increase-notify':
        options.notifyOnIncrease = false;
        break;
    }
  }

  return options;
}

function showHelp(): void {
  console.log(`
KitchenXpert Scraper - Update Prices

This script compares scraped prices with stored values and updates price history.

Usage:
  npm run update:prices [options]

Options:
  --brand, -b <brand-id>   Update prices for specific brand only
  --dry-run, -n            Show changes without saving to database
  --threshold, -t <pct>    Minimum change percentage to report (default: 1)
  --no-drop-notify         Don't notify on price drops
  --no-increase-notify     Don't notify on price increases
  --help, -h               Show this help message

What this script will do when database is connected:
  1. Load recently scraped product data
  2. Compare with existing prices in database
  3. Calculate price changes and percentages
  4. Update price history records
  5. Track lowest/highest prices ever
  6. Generate price change reports
  7. Trigger alerts for significant changes

Price tracking features:
  - Historical price tracking over time
  - Lowest price ever tracking
  - Price volatility analysis
  - Cross-brand price comparison
  - Discount detection (original vs sale price)
  - Price alert notifications

Available brands with online prices:
  ${BRANDS_CONFIG.filter((b) => b.enabled && b.hasPricesOnline)
    .map((b) => b.id)
    .join(', ')}

Examples:
  npm run update:prices
  npm run update:prices -- --brand ikea --dry-run
  npm run update:prices -- --threshold 5
`);
}

// ═══════════════════════════════════════════════════════════════════════════
// Price Update Functions (Stubs)
// ═══════════════════════════════════════════════════════════════════════════

async function updatePrices(options: UpdatePricesOptions): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('Price Update - Status');
  console.log('='.repeat(60));

  console.log('\nPrice update functionality requires database connection.');
  console.log('');

  // Show what would be done
  console.log('When connected, this script will:');
  console.log('');
  console.log('1. FETCH recent scrape data');
  console.log('   - Load products scraped in the last 24 hours');
  console.log('   - Filter by brand if --brand is specified');
  console.log('');
  console.log('2. COMPARE with stored prices');
  console.log('   - Query current prices from database');
  console.log('   - Calculate percentage changes');
  console.log('   - Identify price drops and increases');
  console.log('');
  console.log('3. UPDATE price history');
  console.log('   - Insert new price records');
  console.log('   - Update product current prices');
  console.log('   - Track lowest/highest prices');
  console.log('');
  console.log('4. GENERATE reports');
  console.log('   - Summary of price changes');
  console.log('   - List of significant changes');
  console.log('   - Price volatility analysis');
  console.log('');
  console.log('5. SEND notifications (if configured)');
  console.log('   - Alert on significant price drops');
  console.log('   - Alert on new lowest prices');

  if (options.dryRun) {
    console.log('\n[DRY RUN MODE - No changes would be saved]');
  }

  // Show configuration
  console.log('\n' + '-'.repeat(60));
  console.log('Current configuration:');
  console.log('-'.repeat(60));
  console.log(`  Brand filter: ${options.brand || 'All brands'}`);
  console.log(`  Change threshold: ${options.threshold}%`);
  console.log(`  Notify on drops: ${options.notifyOnDrop}`);
  console.log(`  Notify on increases: ${options.notifyOnIncrease}`);
  console.log(`  Dry run: ${options.dryRun}`);

  // List brands with prices
  console.log('\n' + '-'.repeat(60));
  console.log('Brands with online pricing:');
  console.log('-'.repeat(60));

  const brandsWithPrices = options.brand
    ? [getBrandConfig(options.brand)].filter((b) => b?.hasPricesOnline)
    : getEnabledBrands().filter((b) => b.hasPricesOnline);

  if (brandsWithPrices.length === 0) {
    console.log('  No brands with online pricing found.');
  } else {
    for (const brand of brandsWithPrices) {
      if (brand) {
        console.log(`  - ${brand.name} (${brand.id})`);
        console.log(`    Website: ${brand.website}`);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('To enable price updates:');
  console.log('='.repeat(60));
  console.log('  1. Configure database connection in .env');
  console.log('  2. Run database migrations: npm run db:migrate');
  console.log('  3. Scrape brands with prices: npm run scrape:brand ikea');
  console.log('  4. Re-run this command: npm run update:prices');
}

// ═══════════════════════════════════════════════════════════════════════════
// Integration with PriceTracker Service
// ═══════════════════════════════════════════════════════════════════════════

function showPriceTrackerInfo(): void {
  console.log('\n' + '-'.repeat(60));
  console.log('PriceTracker Service Integration');
  console.log('-'.repeat(60));
  console.log(`
The PriceTracker service (src/services/price-tracker.ts) provides:

- recordPrice(record): Record a new price for a product
- getHistory(productId, brandId): Get price history
- getStatistics(productId, brandId): Get price statistics
- getPriceTrend(productId, brandId, days): Get recent price trend
- comparePrices(productId): Compare prices across brands
- createAlert(productId, type, threshold): Set up price alerts
- getBiggestDrops(limit): Find products with biggest price drops
- getLowestEverPrices(limit): Find products at lowest ever price
- getVolatilityReport(): Analyze price volatility

Statistics tracked:
- Current, lowest, highest, average prices
- Standard deviation and volatility
- Price change trends (up/down/stable)
- First seen and last updated dates
`);
}

// ═══════════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  const options = parseArgs();

  // Validate brand if specified
  if (options.brand) {
    const brandConfig = getBrandConfig(options.brand);
    if (!brandConfig) {
      console.error(`Error: Brand "${options.brand}" not found in configuration`);
      console.error('Available brands:', BRANDS_CONFIG.map((b) => b.id).join(', '));
      process.exit(1);
    }
    if (!brandConfig.hasPricesOnline) {
      console.warn(`Warning: Brand "${options.brand}" does not have online pricing`);
      console.warn('Price updates may not be available for this brand.');
    }
  }

  logger.info('Starting price update', {
    brand: options.brand,
    dryRun: options.dryRun,
    threshold: options.threshold,
  });

  try {
    await updatePrices(options);
    showPriceTrackerInfo();

    process.exit(0);
  } catch (error) {
    logger.error('Price update failed', { error });
    console.error('Price update failed:', error);
    process.exit(1);
  }
}

main();
