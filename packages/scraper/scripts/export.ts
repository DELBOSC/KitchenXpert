#!/usr/bin/env ts-node
/**
 * Export Script
 *
 * Export scraped data in various formats
 *
 * Usage:
 *   npm run export:json -- --output ./data/export.json
 *   npm run export:csv -- --output ./data/export.csv --brand ikea
 *   npm run export:kitchenxpert -- --output ./data/export.kx
 */

import 'dotenv/config';
import path from 'path';
import { logger } from '../src/utils/logger.js';
import { BRANDS_CONFIG, getBrandConfig } from '../src/config/brands.config.js';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

type ExportFormat = 'json' | 'csv' | 'kitchenxpert';

interface ExportOptions {
  format: ExportFormat;
  output: string;
  brand?: string;
  includeImages: boolean;
  prettyPrint: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// CLI Argument Parsing
// ═══════════════════════════════════════════════════════════════════════════

function parseArgs(): ExportOptions {
  const args = process.argv.slice(2);

  const options: ExportOptions = {
    format: 'json',
    output: '',
    includeImages: false,
    prettyPrint: true,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--format':
      case '-f':
        if (nextArg && ['json', 'csv', 'kitchenxpert'].includes(nextArg)) {
          options.format = nextArg as ExportFormat;
          i++;
        } else {
          console.error(`Invalid format: ${nextArg}. Valid options: json, csv, kitchenxpert`);
          process.exit(1);
        }
        break;

      case '--output':
      case '-o':
        if (nextArg) {
          options.output = nextArg;
          i++;
        }
        break;

      case '--brand':
      case '-b':
        if (nextArg) {
          options.brand = nextArg;
          i++;
        }
        break;

      case '--include-images':
        options.includeImages = true;
        break;

      case '--no-pretty':
        options.prettyPrint = false;
        break;
    }
  }

  return options;
}

function showHelp(): void {
  console.log(`
KitchenXpert Scraper - Export Data

Usage:
  npm run export:json [options]
  npm run export:csv [options]
  npm run export:kitchenxpert [options]

Options:
  --format, -f <format>   Export format: json, csv, kitchenxpert (default: json)
  --output, -o <path>     Output file path (required)
  --brand, -b <brand-id>  Filter by brand ID (optional)
  --include-images        Include image data in export
  --no-pretty             Disable pretty printing for JSON
  --help, -h              Show this help message

Formats:
  json          Standard JSON format
  csv           CSV format (one row per product)
  kitchenxpert  KitchenXpert internal format for import

Available brands:
  ${BRANDS_CONFIG.filter(b => b.enabled).map(b => b.id).join(', ')}

Examples:
  npm run export:json -- --output ./data/products.json
  npm run export:csv -- --output ./data/ikea.csv --brand ikea
  npm run export:kitchenxpert -- --output ./data/full-export.kx
`);
}

// ═══════════════════════════════════════════════════════════════════════════
// Export Functions (Stubs)
// ═══════════════════════════════════════════════════════════════════════════

async function exportJson(options: ExportOptions): Promise<void> {
  console.log('\n[JSON Export]');
  console.log(`Output: ${options.output}`);
  if (options.brand) {
    console.log(`Brand filter: ${options.brand}`);
  }
  console.log(`Include images: ${options.includeImages}`);
  console.log(`Pretty print: ${options.prettyPrint}`);
  console.log('\nExport functionality requires database connection.');
  console.log('This feature will be available once the database is configured.');
}

async function exportCsv(options: ExportOptions): Promise<void> {
  console.log('\n[CSV Export]');
  console.log(`Output: ${options.output}`);
  if (options.brand) {
    console.log(`Brand filter: ${options.brand}`);
  }
  console.log('\nExport functionality requires database connection.');
  console.log('This feature will be available once the database is configured.');
  console.log('\nCSV columns will include:');
  console.log('  - brand_id, brand_name');
  console.log('  - product_type, reference, name');
  console.log('  - price, currency');
  console.log('  - width, height, depth');
  console.log('  - url, image_url');
  console.log('  - scraped_at');
}

async function exportKitchenXpert(options: ExportOptions): Promise<void> {
  console.log('\n[KitchenXpert Format Export]');
  console.log(`Output: ${options.output}`);
  if (options.brand) {
    console.log(`Brand filter: ${options.brand}`);
  }
  console.log('\nExport functionality requires database connection.');
  console.log('This feature will be available once the database is configured.');
  console.log('\nKitchenXpert format is a structured JSON format designed for:');
  console.log('  - Import into KitchenXpert web application');
  console.log('  - Bulk synchronization with product catalog');
  console.log('  - Incremental updates with change tracking');
  console.log('  - Image references and CDN URLs');
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

  // Validate required options
  if (!options.output) {
    console.error('Error: --output is required');
    console.error('Use --help for usage information');
    process.exit(1);
  }

  // Validate brand if specified
  if (options.brand) {
    const brandConfig = getBrandConfig(options.brand);
    if (!brandConfig) {
      console.error(`Error: Brand "${options.brand}" not found in configuration`);
      console.error('Available brands:', BRANDS_CONFIG.map(b => b.id).join(', '));
      process.exit(1);
    }
  }

  // Resolve output path
  const outputPath = path.resolve(options.output);
  console.log(`\nExport Configuration:`);
  console.log(`  Format: ${options.format}`);
  console.log(`  Output: ${outputPath}`);
  if (options.brand) {
    console.log(`  Brand: ${options.brand}`);
  }

  logger.info('Starting export', {
    format: options.format,
    output: outputPath,
    brand: options.brand,
  });

  try {
    switch (options.format) {
      case 'json':
        await exportJson(options);
        break;
      case 'csv':
        await exportCsv(options);
        break;
      case 'kitchenxpert':
        await exportKitchenXpert(options);
        break;
    }

    console.log('\n' + '='.repeat(50));
    console.log('Export functionality requires database connection.');
    console.log('='.repeat(50));
    console.log('\nTo enable export functionality:');
    console.log('  1. Configure database connection in .env');
    console.log('  2. Run database migrations: npm run db:migrate');
    console.log('  3. Scrape some data: npm run scrape:brand <brand-id>');
    console.log('  4. Re-run this export command');

    process.exit(0);
  } catch (error) {
    logger.error('Export failed', { error });
    console.error('Export failed:', error);
    process.exit(1);
  }
}

main();
