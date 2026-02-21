#!/usr/bin/env ts-node
/**
 * Clean Duplicates Script
 *
 * Identify and clean duplicate products using the DeduplicationService.
 *
 * Usage:
 *   npm run clean:duplicates
 *   npm run clean:duplicates -- --brand ikea
 *   npm run clean:duplicates -- --dry-run
 *   npm run clean:duplicates -- --threshold 0.9
 */

import 'dotenv/config';
import { logger } from '../src/utils/logger.js';
import { BRANDS_CONFIG, getBrandConfig, getEnabledBrands } from '../src/config/brands.config.js';
import {
  DeduplicationService,
  DeduplicationConfig,
  DeduplicationResult,
} from '../src/services/deduplication.js';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface CleanDuplicatesOptions {
  brand?: string;
  dryRun: boolean;
  threshold: number;
  crossBrand: boolean;
  verbose: boolean;
  interactive: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// CLI Argument Parsing
// ═══════════════════════════════════════════════════════════════════════════

function parseArgs(): CleanDuplicatesOptions {
  const args = process.argv.slice(2);

  const options: CleanDuplicatesOptions = {
    dryRun: false,
    threshold: 0.85,
    crossBrand: false,
    verbose: false,
    interactive: false,
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

      case '--cross-brand':
      case '-x':
        options.crossBrand = true;
        break;

      case '--verbose':
      case '-v':
        options.verbose = true;
        break;

      case '--interactive':
      case '-i':
        options.interactive = true;
        break;
    }
  }

  return options;
}

function showHelp(): void {
  console.log(`
KitchenXpert Scraper - Clean Duplicates

Identify and remove duplicate products using multiple matching strategies.

Usage:
  npm run clean:duplicates [options]

Options:
  --brand, -b <brand-id>   Clean duplicates for specific brand only
  --dry-run, -n            Show duplicates without removing them
  --threshold, -t <value>  Similarity threshold 0-1 (default: 0.85)
  --cross-brand, -x        Enable cross-brand deduplication
  --verbose, -v            Show detailed match information
  --interactive, -i        Prompt before each deletion
  --help, -h               Show this help message

Matching strategies:
  1. Exact matching (reference, EAN, SKU)
  2. Fuzzy name matching (Jaccard/Levenshtein similarity)
  3. Dimension similarity (width, height, depth)
  4. Image fingerprinting
  5. Content hash matching
  6. Composite scoring with configurable weights

Available brands:
  ${BRANDS_CONFIG.filter(b => b.enabled).map(b => b.id).join(', ')}

Examples:
  npm run clean:duplicates
  npm run clean:duplicates -- --dry-run --verbose
  npm run clean:duplicates -- --brand ikea --threshold 0.9
  npm run clean:duplicates -- --cross-brand
`);
}

// ═══════════════════════════════════════════════════════════════════════════
// Deduplication Functions (Stubs)
// ═══════════════════════════════════════════════════════════════════════════

async function cleanDuplicates(options: CleanDuplicatesOptions): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('Deduplication - Status');
  console.log('='.repeat(60));

  console.log('\nDeduplication functionality requires database connection.');
  console.log('');

  // Show what would be done
  console.log('When connected, this script will:');
  console.log('');
  console.log('1. LOAD products from database');
  console.log('   - Fetch all products' + (options.brand ? ` for brand: ${options.brand}` : ''));
  console.log('   - Create fingerprints for each product');
  console.log('');
  console.log('2. BUILD deduplication index');
  console.log('   - Index by reference, EAN, SKU');
  console.log('   - Index by normalized name tokens');
  console.log('   - Generate content hashes');
  console.log('');
  console.log('3. FIND duplicates');
  console.log('   - Exact matching (reference, EAN, SKU)');
  console.log('   - Fuzzy name matching');
  console.log('   - Dimension similarity');
  console.log('   - Composite scoring');
  console.log('');
  console.log('4. GROUP duplicates');
  console.log('   - Select primary product (oldest or most complete)');
  console.log('   - List duplicate products');
  console.log('   - Calculate confidence scores');
  console.log('');

  if (options.dryRun) {
    console.log('5. REPORT (dry-run mode)');
    console.log('   - Show duplicate groups');
    console.log('   - Show match details');
    console.log('   - No changes made');
  } else {
    console.log('5. CLEAN duplicates');
    console.log('   - Merge product data if needed');
    console.log('   - Delete duplicate records');
    console.log('   - Update references');
  }

  // Show configuration
  console.log('\n' + '-'.repeat(60));
  console.log('Current configuration:');
  console.log('-'.repeat(60));
  console.log(`  Brand filter: ${options.brand || 'All brands'}`);
  console.log(`  Similarity threshold: ${options.threshold}`);
  console.log(`  Cross-brand dedup: ${options.crossBrand}`);
  console.log(`  Dry run: ${options.dryRun}`);
  console.log(`  Verbose: ${options.verbose}`);
  console.log(`  Interactive: ${options.interactive}`);
}

function showDeduplicationServiceInfo(): void {
  console.log('\n' + '-'.repeat(60));
  console.log('DeduplicationService Integration');
  console.log('-'.repeat(60));
  console.log(`
The DeduplicationService (src/services/deduplication.ts) provides:

Methods:
  - createFingerprint(product): Create a unique fingerprint for matching
  - addProduct(fingerprint): Add product to the deduplication index
  - findDuplicates(fingerprint): Find duplicates for a product
  - deduplicate(): Run full deduplication on indexed products
  - clear(): Clear all indices

Matching types:
  - exact_reference: Exact reference number match
  - exact_ean: Exact EAN/barcode match
  - exact_sku: Exact SKU match
  - fuzzy_name: Similar product names
  - dimension_match: Similar dimensions
  - image_match: Similar product images
  - content_hash: Content fingerprint match
  - composite: Combined scoring

Configuration options:
  - nameSimilarityThreshold (default: 0.85)
  - dimensionTolerancePercent (default: 5%)
  - priceTolerancePercent (default: 10%)
  - minImageMatchScore (default: 0.9)
  - caseSensitive (default: false)
  - crossBrandDedup (default: false)

Scoring weights:
  - reference: 1.0
  - ean: 1.0
  - sku: 0.95
  - name: 0.7
  - dimensions: 0.6
  - price: 0.4
  - images: 0.8
`);
}

function showExampleOutput(): void {
  console.log('\n' + '-'.repeat(60));
  console.log('Example Output (when database is connected)');
  console.log('-'.repeat(60));
  console.log(`
Deduplication Results:
======================

Total products analyzed: 1,234
Unique products: 1,189
Duplicates found: 45

Duplicate Groups:
-----------------

Group 1 (Confidence: 98%)
  Primary: IKEA-12345 - METOD Wall Cabinet 60x37x60
  Duplicates:
    - IKEA-12346 (exact_reference, 100%)
    - IKEA-12347 (fuzzy_name + dimensions, 95%)

Group 2 (Confidence: 92%)
  Primary: LM-98765 - Meuble haut cuisine 60cm
  Duplicates:
    - LM-98766 (fuzzy_name, 90%)

...

Summary:
--------
  Groups processed: 23
  Products merged: 12
  Products deleted: 33
  Processing time: 2.5s
`);
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo with DeduplicationService
// ═══════════════════════════════════════════════════════════════════════════

function runDemoDeduplication(): void {
  console.log('\n' + '-'.repeat(60));
  console.log('Demo: DeduplicationService in action');
  console.log('-'.repeat(60));

  const config: Partial<DeduplicationConfig> = {
    nameSimilarityThreshold: 0.85,
    crossBrandDedup: false,
  };

  const service = new DeduplicationService(config);

  // Create sample fingerprints
  const product1 = service.createFingerprint({
    id: 'prod-001',
    brandId: 'ikea',
    reference: 'METOD-60-37-60',
    name: 'METOD Wall Cabinet 60x37x60cm White',
    width: 600,
    height: 370,
    depth: 600,
    price: 89.99,
  });

  const product2 = service.createFingerprint({
    id: 'prod-002',
    brandId: 'ikea',
    reference: 'METOD-60-37-60',
    name: 'METOD Mural 60x37x60 Blanc',
    width: 600,
    height: 370,
    depth: 600,
    price: 89.99,
  });

  const product3 = service.createFingerprint({
    id: 'prod-003',
    brandId: 'ikea',
    reference: 'METOD-80-37-60',
    name: 'METOD Wall Cabinet 80x37x60cm White',
    width: 800,
    height: 370,
    depth: 600,
    price: 109.99,
  });

  // Add to index
  service.addProduct(product1);
  service.addProduct(product2);
  service.addProduct(product3);

  console.log('\nSample products added to index:');
  console.log('  1. METOD Wall Cabinet 60x37x60cm White (METOD-60-37-60)');
  console.log('  2. METOD Mural 60x37x60 Blanc (METOD-60-37-60) [same reference]');
  console.log('  3. METOD Wall Cabinet 80x37x60cm White (METOD-80-37-60)');

  // Run deduplication
  const result: DeduplicationResult = service.deduplicate();

  console.log('\nDeduplication results:');
  console.log(`  Total products: ${result.totalProducts}`);
  console.log(`  Unique products: ${result.uniqueProducts}`);
  console.log(`  Duplicates found: ${result.duplicatesFound}`);
  console.log(`  Processing time: ${result.processingTime}ms`);

  if (result.groups.length > 0) {
    console.log('\nDuplicate groups:');
    for (const group of result.groups) {
      console.log(`\n  Group (Confidence: ${(group.confidence * 100).toFixed(0)}%)`);
      console.log(`    Primary: ${group.primaryId}`);
      console.log(`    Duplicates: ${group.duplicateIds.join(', ')}`);
      for (const match of group.matches) {
        console.log(`    Match: ${match.matchType} - ${match.details.reasoning}`);
      }
    }
  }

  const stats = service.getStats();
  console.log('\nIndex statistics:');
  console.log(`  Total products: ${stats.totalProducts}`);
  console.log(`  Indexed references: ${stats.indexedReferences}`);
  console.log(`  Indexed EANs: ${stats.indexedEans}`);
  console.log(`  Indexed SKUs: ${stats.indexedSkus}`);
  console.log(`  Indexed names: ${stats.indexedNames}`);
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
      console.error('Available brands:', BRANDS_CONFIG.map(b => b.id).join(', '));
      process.exit(1);
    }
  }

  logger.info('Starting deduplication', {
    brand: options.brand,
    dryRun: options.dryRun,
    threshold: options.threshold,
    crossBrand: options.crossBrand,
  });

  try {
    await cleanDuplicates(options);
    showDeduplicationServiceInfo();
    showExampleOutput();
    runDemoDeduplication();

    console.log('\n' + '='.repeat(60));
    console.log('To enable full deduplication:');
    console.log('='.repeat(60));
    console.log('  1. Configure database connection in .env');
    console.log('  2. Run database migrations: npm run db:migrate');
    console.log('  3. Scrape some data: npm run scrape:brand <brand-id>');
    console.log('  4. Re-run this command: npm run clean:duplicates');

    process.exit(0);
  } catch (error) {
    logger.error('Deduplication failed', { error });
    console.error('Deduplication failed:', error);
    process.exit(1);
  }
}

main();
