/**
 * Scrape Result Models
 */

export type ScrapeStatus = 'pending' | 'running' | 'completed' | 'failed' | 'partial';

export interface ScrapeLogEntry {
  id: string;
  brandId: string;
  status: ScrapeStatus;

  startedAt: Date;
  completedAt?: Date;

  // Stats
  pagesScraped: number;
  productsFound: number;
  productsNew: number;
  productsUpdated: number;
  errors: number;

  errorMessages: string[];
  duration?: number; // seconds
}

export interface ScrapeResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  url?: string;
  timestamp: Date;
}

export interface ScrapedPage {
  url: string;
  title?: string;
  contentHash: string;
  scrapedAt: Date;
  products: ScrapedProductReference[];
}

export interface ScrapedProductReference {
  type: 'cabinet' | 'worktop' | 'facade' | 'handle' | 'appliance' | 'accessory';
  reference: string;
  url: string;
  name?: string;
}

export interface ScrapeSummary {
  brandId: string;
  brandName: string;
  status: ScrapeStatus;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;

  stats: {
    pagesScraped: number;
    productsFound: number;
    productsNew: number;
    productsUpdated: number;
    productsSkipped: number;
    imagesDownloaded: number;
    errors: number;
  };

  byType: {
    cabinets: number;
    worktops: number;
    facades: number;
    handles: number;
    appliances: number;
    accessories: number;
  };

  errors: ScrapeError[];
}

export interface ScrapeError {
  url?: string;
  message: string;
  code?: string;
  stack?: string;
  timestamp: Date;
  retryCount?: number;
}

export interface ScrapeProgress {
  brandId: string;
  status: ScrapeStatus;
  currentPage?: string;
  pagesTotal: number;
  pagesCompleted: number;
  productsFound: number;
  errorsCount: number;
  startedAt: Date;
  estimatedCompletion?: Date;
}

export interface PriceChange {
  entityType: 'cabinet' | 'worktop' | 'facade' | 'handle' | 'appliance' | 'accessory';
  entityId: string;
  entityReference: string;
  brandId: string;
  priceOld?: number;
  priceNew?: number;
  priceType: string;
  changePercent?: number;
  recordedAt: Date;
}

export interface ScrapeSchedule {
  brandId: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  nextRun: Date;
  lastRun?: Date;
  enabled: boolean;
}

/**
 * Calculate scrape duration in a human-readable format
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Create an empty scrape summary
 */
export function createEmptySummary(brandId: string, brandName: string): ScrapeSummary {
  return {
    brandId,
    brandName,
    status: 'pending',
    startedAt: new Date(),
    stats: {
      pagesScraped: 0,
      productsFound: 0,
      productsNew: 0,
      productsUpdated: 0,
      productsSkipped: 0,
      imagesDownloaded: 0,
      errors: 0,
    },
    byType: {
      cabinets: 0,
      worktops: 0,
      facades: 0,
      handles: 0,
      appliances: 0,
      accessories: 0,
    },
    errors: [],
  };
}
