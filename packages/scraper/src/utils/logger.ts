/**
 * Logger Utility
 *
 * Winston-based logging for the scraper
 */

import winston from 'winston';
import path from 'path';
import fs from 'fs';

const LOG_DIR = process.env.LOG_FILE_PATH || './logs';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info as {
      timestamp?: string;
      level: string;
      message: string;
      [key: string]: unknown;
    };
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp || ''} ${level}: ${message}${metaStr}`;
  })
);

// Custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create the logger instance
export const logger = winston.createLogger({
  level: LOG_LEVEL,
  defaultMeta: { service: 'kitchenxpert-scraper' },
  transports: [
    // Console output
    new winston.transports.Console({
      format: consoleFormat,
    }),

    // Combined log file
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'combined.log'),
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),

    // Error log file
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),

    // Scraping specific log
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'scraping.log'),
      format: fileFormat,
      maxsize: 10 * 1024 * 1024,
      maxFiles: 10,
    }),
  ],
});

/**
 * Create a child logger for a specific brand/scraper
 */
export function createBrandLogger(brandSlug: string): winston.Logger {
  return logger.child({ brand: brandSlug });
}

/**
 * Log scraping start
 */
export function logScrapeStart(brandSlug: string, url: string): void {
  logger.info(`Starting scrape`, { brand: brandSlug, url });
}

/**
 * Log scraping completion
 */
export function logScrapeComplete(
  brandSlug: string,
  stats: { pages: number; products: number; duration: number }
): void {
  logger.info(`Scrape completed`, { brand: brandSlug, ...stats });
}

/**
 * Log scraping error
 */
export function logScrapeError(brandSlug: string, error: Error, url?: string): void {
  logger.error(`Scrape error`, {
    brand: brandSlug,
    url,
    error: error.message,
    stack: error.stack,
  });
}

/**
 * Log product found
 */
export function logProductFound(
  brandSlug: string,
  productType: string,
  reference: string,
  isNew: boolean
): void {
  logger.debug(`Product ${isNew ? 'added' : 'updated'}`, {
    brand: brandSlug,
    type: productType,
    reference,
  });
}

/**
 * Log rate limit hit
 */
export function logRateLimitHit(brandSlug: string, waitTime: number): void {
  logger.warn(`Rate limit hit, waiting ${waitTime}ms`, { brand: brandSlug });
}

/**
 * Log proxy rotation
 */
export function logProxyRotation(brandSlug: string, newProxy: string): void {
  logger.debug(`Proxy rotated`, { brand: brandSlug, proxy: newProxy });
}

export default logger;
