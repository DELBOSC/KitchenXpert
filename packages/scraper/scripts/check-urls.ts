#!/usr/bin/env ts-node
/**
 * Check URLs Script
 *
 * Verify that configured brand websites are accessible.
 * Performs HEAD requests to check URL validity.
 *
 * Usage:
 *   npm run check:urls
 *   npm run check:urls -- --brand ikea
 *   npm run check:urls -- --timeout 10000
 */

import 'dotenv/config';
import axios, { AxiosError } from 'axios';
import { logger } from '../src/utils/logger.js';
import {
  BRANDS_CONFIG,
  BrandScrapingConfig,
  getBrandConfig,
  getEnabledBrands,
} from '../src/config/brands.config.js';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface CheckUrlsOptions {
  brand?: string;
  timeout: number;
  verbose: boolean;
  checkCatalogPaths: boolean;
}

interface UrlCheckResult {
  brandId: string;
  brandName: string;
  url: string;
  status: 'ok' | 'error' | 'redirect' | 'timeout';
  statusCode?: number;
  responseTime: number;
  redirectUrl?: string;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CLI Argument Parsing
// ═══════════════════════════════════════════════════════════════════════════

function parseArgs(): CheckUrlsOptions {
  const args = process.argv.slice(2);

  const options: CheckUrlsOptions = {
    timeout: 15000, // 15 seconds default
    verbose: false,
    checkCatalogPaths: true,
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

      case '--timeout':
      case '-t':
        if (nextArg) {
          options.timeout = parseInt(nextArg, 10);
          i++;
        }
        break;

      case '--verbose':
      case '-v':
        options.verbose = true;
        break;

      case '--no-catalog':
        options.checkCatalogPaths = false;
        break;
    }
  }

  return options;
}

function showHelp(): void {
  console.log(`
KitchenXpert Scraper - Check URLs

Verify that configured brand websites are accessible.

Usage:
  npm run check:urls [options]

Options:
  --brand, -b <brand-id>  Check specific brand only
  --timeout, -t <ms>      Request timeout in milliseconds (default: 15000)
  --verbose, -v           Show detailed response information
  --no-catalog            Don't check catalog paths, only main website
  --help, -h              Show this help message

Available brands:
  ${BRANDS_CONFIG.filter(b => b.enabled).map(b => b.id).join(', ')}

Examples:
  npm run check:urls
  npm run check:urls -- --brand ikea
  npm run check:urls -- --timeout 30000 --verbose
`);
}

// ═══════════════════════════════════════════════════════════════════════════
// URL Checking
// ═══════════════════════════════════════════════════════════════════════════

async function checkUrl(
  url: string,
  brandId: string,
  brandName: string,
  timeout: number,
  verbose: boolean
): Promise<UrlCheckResult> {
  const startTime = Date.now();

  try {
    const response = await axios.head(url, {
      timeout,
      maxRedirects: 0,
      validateStatus: () => true, // Accept all status codes
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    const responseTime = Date.now() - startTime;

    if (verbose) {
      console.log(`  Headers: ${JSON.stringify(response.headers, null, 2)}`);
    }

    // Check for redirects
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const redirectUrl = response.headers.location || response.headers.Location;
      return {
        brandId,
        brandName,
        url,
        status: 'redirect',
        statusCode: response.status,
        responseTime,
        redirectUrl: redirectUrl as string | undefined,
      };
    }

    // Check for success
    if (response.status >= 200 && response.status < 400) {
      return {
        brandId,
        brandName,
        url,
        status: 'ok',
        statusCode: response.status,
        responseTime,
      };
    }

    // Error status
    return {
      brandId,
      brandName,
      url,
      status: 'error',
      statusCode: response.status,
      responseTime,
      error: `HTTP ${response.status}`,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const axiosError = error as AxiosError;

    if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
      return {
        brandId,
        brandName,
        url,
        status: 'timeout',
        responseTime,
        error: `Timeout after ${timeout}ms`,
      };
    }

    return {
      brandId,
      brandName,
      url,
      status: 'error',
      responseTime,
      error: axiosError.message || 'Unknown error',
    };
  }
}

async function checkBrand(
  brand: BrandScrapingConfig,
  options: CheckUrlsOptions
): Promise<UrlCheckResult[]> {
  const results: UrlCheckResult[] = [];

  // Check main website
  console.log(`\nChecking ${brand.name} (${brand.id})...`);
  console.log(`  Website: ${brand.website}`);

  const mainResult = await checkUrl(
    brand.website,
    brand.id,
    brand.name,
    options.timeout,
    options.verbose
  );
  results.push(mainResult);
  printResult(mainResult, '  ');

  // Check catalog paths
  if (options.checkCatalogPaths && brand.catalogPaths.length > 0) {
    console.log(`  Catalog paths:`);
    for (const path of brand.catalogPaths) {
      const catalogUrl = new URL(path, brand.website).toString();
      const pathResult = await checkUrl(
        catalogUrl,
        brand.id,
        brand.name,
        options.timeout,
        options.verbose
      );
      results.push(pathResult);
      printResult(pathResult, '    ');
    }
  }

  return results;
}

function printResult(result: UrlCheckResult, indent: string = ''): void {
  const statusIcon = getStatusIcon(result.status);
  const timeStr = `${result.responseTime}ms`;

  let message = `${indent}${statusIcon} ${result.url}`;
  message += ` [${timeStr}]`;

  if (result.statusCode) {
    message += ` (${result.statusCode})`;
  }

  if (result.redirectUrl) {
    message += ` -> ${result.redirectUrl}`;
  }

  if (result.error && result.status === 'error') {
    message += ` - ${result.error}`;
  }

  console.log(message);
}

function getStatusIcon(status: UrlCheckResult['status']): string {
  switch (status) {
    case 'ok':
      return '[OK]';
    case 'redirect':
      return '[REDIRECT]';
    case 'timeout':
      return '[TIMEOUT]';
    case 'error':
      return '[ERROR]';
    default:
      return '[?]';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Summary Report
// ═══════════════════════════════════════════════════════════════════════════

function printSummary(results: UrlCheckResult[]): void {
  console.log('\n' + '='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));

  const ok = results.filter(r => r.status === 'ok').length;
  const redirects = results.filter(r => r.status === 'redirect').length;
  const errors = results.filter(r => r.status === 'error').length;
  const timeouts = results.filter(r => r.status === 'timeout').length;

  console.log(`\n  Total URLs checked: ${results.length}`);
  console.log(`  [OK] Accessible: ${ok}`);
  console.log(`  [REDIRECT] Redirects: ${redirects}`);
  console.log(`  [ERROR] Errors: ${errors}`);
  console.log(`  [TIMEOUT] Timeouts: ${timeouts}`);

  // Average response time
  const avgTime = Math.round(
    results.reduce((sum, r) => sum + r.responseTime, 0) / results.length
  );
  console.log(`\n  Average response time: ${avgTime}ms`);

  // List errors
  const errorResults = results.filter(r => r.status === 'error' || r.status === 'timeout');
  if (errorResults.length > 0) {
    console.log('\n  Issues found:');
    for (const result of errorResults) {
      console.log(`    - ${result.brandName}: ${result.url}`);
      console.log(`      ${result.error || 'Unknown error'}`);
    }
  }

  // List redirects
  const redirectResults = results.filter(r => r.status === 'redirect');
  if (redirectResults.length > 0) {
    console.log('\n  Redirects detected:');
    for (const result of redirectResults) {
      console.log(`    - ${result.brandName}: ${result.url}`);
      console.log(`      -> ${result.redirectUrl || 'Unknown'}`);
    }
  }

  console.log('');
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

  // Get brands to check
  let brands: BrandScrapingConfig[];

  if (options.brand) {
    const brand = getBrandConfig(options.brand);
    if (!brand) {
      console.error(`Error: Brand "${options.brand}" not found in configuration`);
      console.error('Available brands:', BRANDS_CONFIG.map(b => b.id).join(', '));
      process.exit(1);
    }
    brands = [brand];
  } else {
    brands = getEnabledBrands();
  }

  console.log('='.repeat(60));
  console.log('KitchenXpert - URL Accessibility Check');
  console.log('='.repeat(60));
  console.log(`\nChecking ${brands.length} brand(s)...`);
  console.log(`Timeout: ${options.timeout}ms`);
  console.log(`Check catalog paths: ${options.checkCatalogPaths}`);

  logger.info('Starting URL check', {
    brandCount: brands.length,
    timeout: options.timeout,
  });

  const allResults: UrlCheckResult[] = [];

  try {
    for (const brand of brands) {
      const results = await checkBrand(brand, options);
      allResults.push(...results);
    }

    printSummary(allResults);

    // Exit with error code if any URLs failed
    const hasErrors = allResults.some(r => r.status === 'error' || r.status === 'timeout');
    process.exit(hasErrors ? 1 : 0);
  } catch (error) {
    logger.error('URL check failed', { error });
    console.error('URL check failed:', error);
    process.exit(1);
  }
}

main();
