/**
 * Screenshot Utility
 *
 * Captures screenshots for debugging scraping issues
 */

import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import type { Page } from 'puppeteer';

const SCREENSHOTS_DIR = process.env.DEBUG_SCREENSHOTS_PATH || './data/debug';
const SCREENSHOTS_ENABLED = process.env.DEBUG_SCREENSHOTS === 'true';

// Ensure directory exists
if (SCREENSHOTS_ENABLED && !fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

export interface ScreenshotOptions {
  /** Custom filename (without extension) */
  filename?: string;
  /** Include timestamp in filename */
  includeTimestamp?: boolean;
  /** Full page screenshot */
  fullPage?: boolean;
  /** Quality for JPEG (0-100) */
  quality?: number;
  /** Screenshot type */
  type?: 'png' | 'jpeg' | 'webp';
  /** Custom directory */
  directory?: string;
}

const DEFAULT_OPTIONS: ScreenshotOptions = {
  includeTimestamp: true,
  fullPage: true,
  quality: 80,
  type: 'png',
};

/**
 * Generate a filename for the screenshot
 */
function generateFilename(options: ScreenshotOptions, brandSlug?: string): string {
  const parts: string[] = [];

  if (brandSlug) {
    parts.push(brandSlug);
  }

  if (options.filename) {
    parts.push(options.filename);
  }

  if (options.includeTimestamp) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    parts.push(timestamp);
  }

  if (parts.length === 0) {
    parts.push('screenshot');
  }

  return parts.join('_');
}

/**
 * Sanitize string for use in filename
 */
function sanitizeFilename(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 100);
}

/**
 * Take a screenshot of the current page
 */
export async function takeScreenshot(
  page: Page,
  brandSlug?: string,
  options: ScreenshotOptions = {}
): Promise<string | null> {
  if (!SCREENSHOTS_ENABLED) {
    return null;
  }

  const opts = { ...DEFAULT_OPTIONS, ...options };
  const dir = opts.directory || SCREENSHOTS_DIR;

  // Ensure directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const filename = sanitizeFilename(generateFilename(opts, brandSlug));
  const filepath = path.join(dir, `${filename}.${opts.type}`);

  try {
    await page.screenshot({
      path: filepath,
      fullPage: opts.fullPage,
      quality: opts.type === 'jpeg' ? opts.quality : undefined,
      type: opts.type,
    });

    return filepath;
  } catch (error) {
    console.error('Failed to take screenshot:', error);
    return null;
  }
}

/**
 * Take a screenshot on error
 */
export async function takeErrorScreenshot(
  page: Page,
  brandSlug: string,
  errorType: string,
  url?: string
): Promise<string | null> {
  const urlPart = url ? sanitizeFilename(new URL(url).pathname) : '';
  return takeScreenshot(page, brandSlug, {
    filename: `error_${errorType}${urlPart ? '_' + urlPart : ''}`,
    includeTimestamp: true,
  });
}

/**
 * Save page HTML for debugging
 */
export async function savePageHtml(
  page: Page,
  brandSlug: string,
  identifier?: string
): Promise<string | null> {
  if (!SCREENSHOTS_ENABLED) {
    return null;
  }

  const dir = SCREENSHOTS_DIR;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${brandSlug}_${identifier || 'page'}_${timestamp}.html`;
  const filepath = path.join(dir, filename);

  try {
    const html = await page.content();
    fs.writeFileSync(filepath, html, 'utf8');
    return filepath;
  } catch (error) {
    console.error('Failed to save page HTML:', error);
    return null;
  }
}

/**
 * Clean old screenshots (older than N days)
 */
export async function cleanOldScreenshots(maxAgeDays = 7): Promise<number> {
  try {
    await fsPromises.access(SCREENSHOTS_DIR);
  } catch {
    return 0;
  }

  const maxAge = maxAgeDays * 24 * 60 * 60 * 1000;
  const now = Date.now();
  let cleaned = 0;

  const files = await fsPromises.readdir(SCREENSHOTS_DIR);
  for (const file of files) {
    const filepath = path.join(SCREENSHOTS_DIR, file);
    const stats = await fsPromises.stat(filepath);

    if (now - stats.mtimeMs > maxAge) {
      await fsPromises.unlink(filepath);
      cleaned++;
    }
  }

  return cleaned;
}

/**
 * Get screenshot statistics
 */
export async function getScreenshotStats(): Promise<{
  count: number;
  totalSize: number;
  oldestDate?: Date;
  newestDate?: Date;
}> {
  try {
    await fsPromises.access(SCREENSHOTS_DIR);
  } catch {
    return { count: 0, totalSize: 0 };
  }

  const files = await fsPromises.readdir(SCREENSHOTS_DIR);
  let totalSize = 0;
  let oldestDate: Date | undefined;
  let newestDate: Date | undefined;

  for (const file of files) {
    const filepath = path.join(SCREENSHOTS_DIR, file);
    const stats = await fsPromises.stat(filepath);
    totalSize += stats.size;

    const mtime = new Date(stats.mtimeMs);
    if (!oldestDate || mtime < oldestDate) oldestDate = mtime;
    if (!newestDate || mtime > newestDate) newestDate = mtime;
  }

  return {
    count: files.length,
    totalSize,
    oldestDate,
    newestDate,
  };
}
