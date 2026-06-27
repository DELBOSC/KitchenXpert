/**
 * Price Tracker Service
 *
 * Tracks price changes, calculates statistics, and provides
 * price comparison and alerting functionality.
 *
 * Supports optional Prisma integration for persistence.
 * Falls back to in-memory storage when database is unavailable.
 */

import { logger } from '../utils/logger.js';
import { getPrismaClient, isPrismaConnected } from '../database/client.js';
import type { PrismaClient, PriceType as PrismaPriceType } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════════════════
// Types & Interfaces
// ═══════════════════════════════════════════════════════════════════════════

export interface PriceRecord {
  productId: string;
  brandId: string;
  price: number;
  originalPrice?: number;
  currency: string;
  priceType: 'regular' | 'sale' | 'clearance' | 'member';
  timestamp: Date;
  source: string;
  metadata?: Record<string, any>;
}

export interface PriceHistory {
  productId: string;
  brandId: string;
  records: PriceRecord[];
  statistics: PriceStatistics;
  lastUpdated: Date;
}

export interface PriceStatistics {
  current: number;
  lowest: number;
  highest: number;
  average: number;
  median: number;
  standardDeviation: number;
  priceChange: number; // Percent change from previous
  trend: 'up' | 'down' | 'stable';
  volatility: 'low' | 'medium' | 'high';
  recordCount: number;
  firstSeen: Date;
  lastSeen: Date;
}

export interface PriceAlert {
  id: string;
  productId: string;
  type: AlertType;
  threshold?: number;
  triggered: boolean;
  triggeredAt?: Date;
  currentPrice?: number;
  createdAt: Date;
}

export type AlertType =
  | 'price_drop'
  | 'price_increase'
  | 'below_threshold'
  | 'above_threshold'
  | 'lowest_ever'
  | 'back_in_stock';

export interface PriceComparison {
  productId: string;
  name: string;
  comparisons: BrandPrice[];
  bestPrice: BrandPrice;
  averagePrice: number;
  priceRange: { min: number; max: number };
  potentialSavings: number;
}

export interface BrandPrice {
  brandId: string;
  brandName: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  currency: string;
  url?: string;
  availability?: boolean;
  lastUpdated: Date;
}

export interface PriceTrackerConfig {
  historyRetentionDays: number;
  significantChangePercent: number; // Minimum change to track
  volatilityThreshold: { low: number; high: number };
  maxRecordsPerProduct: number;
  persistToDatabase: boolean; // Enable Prisma persistence
}

const DEFAULT_CONFIG: PriceTrackerConfig = {
  historyRetentionDays: 365,
  significantChangePercent: 1, // 1% minimum change
  volatilityThreshold: { low: 5, high: 15 }, // Percent
  maxRecordsPerProduct: 365,
  persistToDatabase: true,
};

// ═══════════════════════════════════════════════════════════════════════════
// Price Tracker Class
// ═══════════════════════════════════════════════════════════════════════════

export class PriceTracker {
  private config: PriceTrackerConfig;
  private priceHistory: Map<string, PriceHistory> = new Map();
  private alerts: Map<string, PriceAlert[]> = new Map();
  private brandPrices: Map<string, Map<string, BrandPrice>> = new Map();
  private prisma: PrismaClient | null = null;

  constructor(config?: Partial<PriceTrackerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initPrisma();
  }

  /**
   * Initialize Prisma client for persistence
   */
  private initPrisma(): void {
    if (!this.config.persistToDatabase) {
      logger.info('Price tracker: Database persistence disabled');
      return;
    }

    try {
      this.prisma = getPrismaClient();
      if (this.prisma) {
        logger.info('Price tracker: Prisma client initialized');
      } else {
        logger.info('Price tracker: Prisma not available, using memory storage');
      }
    } catch (error) {
      logger.warn('Price tracker: Failed to initialize Prisma', {
        error: error instanceof Error ? error.message : String(error),
      });
      this.prisma = null;
    }
  }

  /**
   * Check if Prisma is available for persistence
   */
  private isPrismaAvailable(): boolean {
    return this.prisma !== null && isPrismaConnected();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Price Recording
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Record a new price for a product
   */
  recordPrice(record: PriceRecord): PriceHistory {
    const key = this.getProductKey(record.productId, record.brandId);
    let history = this.priceHistory.get(key);

    if (!history) {
      history = {
        productId: record.productId,
        brandId: record.brandId,
        records: [],
        statistics: this.createEmptyStats(record.price, record.timestamp),
        lastUpdated: new Date(),
      };
      this.priceHistory.set(key, history);
    }

    // Check if this is a significant change
    const lastRecord = history.records[history.records.length - 1];
    const isSignificant = this.isSignificantChange(lastRecord?.price, record.price);

    if (
      isSignificant ||
      !lastRecord ||
      this.isDifferentDay(lastRecord.timestamp, record.timestamp)
    ) {
      // Add to history
      history.records.push(record);

      // Trim old records
      this.trimHistory(history);

      // Update statistics
      history.statistics = this.calculateStatistics(history.records);
      history.lastUpdated = new Date();

      // Check alerts
      this.checkAlerts(record.productId, record);

      // Persist to database if available
      this.savePriceToDatabase(record, lastRecord?.price);

      logger.debug('Price recorded', {
        productId: record.productId,
        brandId: record.brandId,
        price: record.price,
        change: lastRecord
          ? (((record.price - lastRecord.price) / lastRecord.price) * 100).toFixed(2) + '%'
          : 'N/A',
      });
    }

    // Update brand prices for comparison
    this.updateBrandPrice(record);

    return history;
  }

  /**
   * Record multiple prices at once
   */
  recordPrices(records: PriceRecord[]): void {
    for (const record of records) {
      this.recordPrice(record);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Price History & Statistics
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get price history for a product
   */
  getHistory(productId: string, brandId: string): PriceHistory | undefined {
    return this.priceHistory.get(this.getProductKey(productId, brandId));
  }

  /**
   * Get price statistics for a product
   */
  getStatistics(productId: string, brandId: string): PriceStatistics | undefined {
    const history = this.getHistory(productId, brandId);
    return history?.statistics;
  }

  /**
   * Get price trend for last N days
   */
  getPriceTrend(
    productId: string,
    brandId: string,
    days: number = 30
  ): { date: Date; price: number }[] {
    const history = this.getHistory(productId, brandId);
    if (!history) return [];

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return history.records
      .filter((r) => r.timestamp >= cutoffDate)
      .map((r) => ({ date: r.timestamp, price: r.price }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Calculate statistics from records
   */
  private calculateStatistics(records: PriceRecord[]): PriceStatistics {
    if (records.length === 0) {
      return this.createEmptyStats(0, new Date());
    }

    const prices = records.map((r) => r.price);
    const sortedPrices = [...prices].sort((a, b) => a - b);

    const current = prices[prices.length - 1]!;
    const lowest = Math.min(...prices);
    const highest = Math.max(...prices);
    const average = prices.reduce((sum, p) => sum + p, 0) / prices.length;

    // Median
    const mid = Math.floor(sortedPrices.length / 2);
    const median =
      sortedPrices.length % 2 !== 0
        ? sortedPrices[mid]!
        : ((sortedPrices[mid - 1] ?? 0) + (sortedPrices[mid] ?? 0)) / 2;

    // Standard deviation
    const squareDiffs = prices.map((p) => Math.pow(p - average, 2));
    const avgSquareDiff = squareDiffs.reduce((sum, d) => sum + d, 0) / prices.length;
    const standardDeviation = Math.sqrt(avgSquareDiff);

    // Price change
    const previousPrice = records.length > 1 ? records[records.length - 2]!.price : current;
    const priceChange = ((current - previousPrice) / previousPrice) * 100;

    // Trend
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (records.length >= 3) {
      const recentPrices = prices.slice(-3);
      const recentAvg = recentPrices.reduce((sum, p) => sum + p, 0) / recentPrices.length;
      if (current > recentAvg * 1.02) trend = 'up';
      else if (current < recentAvg * 0.98) trend = 'down';
    }

    // Volatility
    const volatilityPercent = (standardDeviation / average) * 100;
    let volatility: 'low' | 'medium' | 'high' = 'medium';
    if (volatilityPercent <= this.config.volatilityThreshold.low) volatility = 'low';
    else if (volatilityPercent >= this.config.volatilityThreshold.high) volatility = 'high';

    return {
      current,
      lowest,
      highest,
      average,
      median,
      standardDeviation,
      priceChange,
      trend,
      volatility,
      recordCount: records.length,
      firstSeen: records[0]!.timestamp,
      lastSeen: records[records.length - 1]!.timestamp,
    };
  }

  private createEmptyStats(price: number, date: Date): PriceStatistics {
    return {
      current: price,
      lowest: price,
      highest: price,
      average: price,
      median: price,
      standardDeviation: 0,
      priceChange: 0,
      trend: 'stable',
      volatility: 'low',
      recordCount: 1,
      firstSeen: date,
      lastSeen: date,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Price Comparison
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Compare prices across brands for a product
   */
  comparePrices(productId: string): PriceComparison | undefined {
    const brandPricesMap = this.brandPrices.get(productId);
    if (!brandPricesMap || brandPricesMap.size === 0) return undefined;

    const comparisons = Array.from(brandPricesMap.values());
    const prices = comparisons.map((c) => c.price);

    const bestPrice = comparisons.reduce((min, curr) => (curr.price < min.price ? curr : min));

    const averagePrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const maxPrice = Math.max(...prices);

    return {
      productId,
      name: '', // Should be populated from product data
      comparisons,
      bestPrice,
      averagePrice,
      priceRange: { min: bestPrice.price, max: maxPrice },
      potentialSavings: maxPrice - bestPrice.price,
    };
  }

  /**
   * Find best prices across all products for a brand
   */
  findBestPrices(brandId: string, limit: number = 10): BrandPrice[] {
    const allPrices: BrandPrice[] = [];

    for (const [, brandPricesMap] of this.brandPrices) {
      const brandPrice = brandPricesMap.get(brandId);
      if (brandPrice) {
        allPrices.push(brandPrice);
      }
    }

    return allPrices
      .filter((p) => p.discount && p.discount > 10)
      .sort((a, b) => (b.discount || 0) - (a.discount || 0))
      .slice(0, limit);
  }

  private updateBrandPrice(record: PriceRecord): void {
    if (!this.brandPrices.has(record.productId)) {
      this.brandPrices.set(record.productId, new Map());
    }

    const brandPrice: BrandPrice = {
      brandId: record.brandId,
      brandName: record.brandId, // Should be looked up
      price: record.price,
      originalPrice: record.originalPrice,
      discount: record.originalPrice
        ? Math.round(((record.originalPrice - record.price) / record.originalPrice) * 100)
        : undefined,
      currency: record.currency,
      availability: true,
      lastUpdated: record.timestamp,
    };

    this.brandPrices.get(record.productId)!.set(record.brandId, brandPrice);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Price Alerts
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create a price alert
   */
  createAlert(productId: string, type: AlertType, threshold?: number): PriceAlert {
    const alert: PriceAlert = {
      id: `${productId}-${type}-${Date.now()}`,
      productId,
      type,
      threshold,
      triggered: false,
      createdAt: new Date(),
    };

    const productAlerts = this.alerts.get(productId) || [];
    productAlerts.push(alert);
    this.alerts.set(productId, productAlerts);

    logger.info('Price alert created', { productId, type, threshold });
    return alert;
  }

  /**
   * Check alerts for a product
   */
  private checkAlerts(productId: string, record: PriceRecord): PriceAlert[] {
    const productAlerts = this.alerts.get(productId) || [];
    const triggeredAlerts: PriceAlert[] = [];
    const history = this.priceHistory.get(this.getProductKey(productId, record.brandId));
    const lastRecord = history?.records[history.records.length - 2];

    for (const alert of productAlerts) {
      if (alert.triggered) continue;

      let shouldTrigger = false;

      switch (alert.type) {
        case 'price_drop':
          shouldTrigger = !!lastRecord && record.price < lastRecord.price;
          break;

        case 'price_increase':
          shouldTrigger = !!lastRecord && record.price > lastRecord.price;
          break;

        case 'below_threshold':
          shouldTrigger = alert.threshold !== undefined && record.price <= alert.threshold;
          break;

        case 'above_threshold':
          shouldTrigger = alert.threshold !== undefined && record.price >= alert.threshold;
          break;

        case 'lowest_ever':
          shouldTrigger = history ? record.price <= history.statistics.lowest : false;
          break;
      }

      if (shouldTrigger) {
        alert.triggered = true;
        alert.triggeredAt = new Date();
        alert.currentPrice = record.price;
        triggeredAlerts.push(alert);

        logger.info('Price alert triggered', {
          alertId: alert.id,
          type: alert.type,
          productId,
          price: record.price,
        });
      }
    }

    return triggeredAlerts;
  }

  /**
   * Get alerts for a product
   */
  getAlerts(productId: string): PriceAlert[] {
    return this.alerts.get(productId) || [];
  }

  /**
   * Delete an alert
   */
  deleteAlert(productId: string, alertId: string): boolean {
    const productAlerts = this.alerts.get(productId);
    if (!productAlerts) return false;

    const index = productAlerts.findIndex((a) => a.id === alertId);
    if (index === -1) return false;

    productAlerts.splice(index, 1);
    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Price Analysis
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get products with biggest price drops
   */
  getBiggestDrops(limit: number = 10): Array<{
    productId: string;
    brandId: string;
    currentPrice: number;
    previousPrice: number;
    dropPercent: number;
  }> {
    const drops: Array<{
      productId: string;
      brandId: string;
      currentPrice: number;
      previousPrice: number;
      dropPercent: number;
    }> = [];

    for (const [, history] of this.priceHistory) {
      if (history.records.length < 2) continue;

      const current = history.records[history.records.length - 1]!.price;
      const previous = history.records[history.records.length - 2]!.price;
      const dropPercent = ((previous - current) / previous) * 100;

      if (dropPercent > 0) {
        drops.push({
          productId: history.productId,
          brandId: history.brandId,
          currentPrice: current,
          previousPrice: previous,
          dropPercent,
        });
      }
    }

    return drops.sort((a, b) => b.dropPercent - a.dropPercent).slice(0, limit);
  }

  /**
   * Get products at lowest price ever
   */
  getLowestEverPrices(limit: number = 10): Array<{
    productId: string;
    brandId: string;
    currentPrice: number;
    lowestPrice: number;
    isAtLowest: boolean;
  }> {
    const results: Array<{
      productId: string;
      brandId: string;
      currentPrice: number;
      lowestPrice: number;
      isAtLowest: boolean;
    }> = [];

    for (const [, history] of this.priceHistory) {
      const stats = history.statistics;
      const isAtLowest = stats.current <= stats.lowest;

      results.push({
        productId: history.productId,
        brandId: history.brandId,
        currentPrice: stats.current,
        lowestPrice: stats.lowest,
        isAtLowest,
      });
    }

    return results
      .filter((r) => r.isAtLowest)
      .sort((a, b) => a.currentPrice - b.currentPrice)
      .slice(0, limit);
  }

  /**
   * Get price volatility report
   */
  getVolatilityReport(): {
    low: number;
    medium: number;
    high: number;
    products: Array<{ productId: string; brandId: string; volatility: string }>;
  } {
    const report = {
      low: 0,
      medium: 0,
      high: 0,
      products: [] as Array<{ productId: string; brandId: string; volatility: string }>,
    };

    for (const [, history] of this.priceHistory) {
      report[history.statistics.volatility]++;
      report.products.push({
        productId: history.productId,
        brandId: history.brandId,
        volatility: history.statistics.volatility,
      });
    }

    return report;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Helper Methods
  // ═══════════════════════════════════════════════════════════════════════════

  private getProductKey(productId: string, brandId: string): string {
    return `${brandId}:${productId}`;
  }

  private isSignificantChange(oldPrice: number | undefined, newPrice: number): boolean {
    if (oldPrice === undefined) return true;

    const changePercent = Math.abs((newPrice - oldPrice) / oldPrice) * 100;
    return changePercent >= this.config.significantChangePercent;
  }

  private isDifferentDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() !== date2.getFullYear() ||
      date1.getMonth() !== date2.getMonth() ||
      date1.getDate() !== date2.getDate()
    );
  }

  private trimHistory(history: PriceHistory): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.historyRetentionDays);

    // Remove old records
    history.records = history.records.filter((r) => r.timestamp >= cutoffDate);

    // Trim to max records
    if (history.records.length > this.config.maxRecordsPerProduct) {
      history.records = history.records.slice(-this.config.maxRecordsPerProduct);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Import/Export
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Export all price data
   */
  export(): {
    priceHistory: Array<[string, PriceHistory]>;
    alerts: Array<[string, PriceAlert[]]>;
  } {
    return {
      priceHistory: Array.from(this.priceHistory.entries()),
      alerts: Array.from(this.alerts.entries()),
    };
  }

  /**
   * Import price data
   */
  import(data: ReturnType<typeof this.export>): void {
    this.priceHistory = new Map(data.priceHistory);
    this.alerts = new Map(data.alerts);

    // Rebuild brand prices
    for (const [, history] of this.priceHistory) {
      const lastRecord = history.records[history.records.length - 1];
      if (lastRecord) {
        this.updateBrandPrice(lastRecord);
      }
    }

    logger.info('Price data imported', {
      products: this.priceHistory.size,
      alerts: this.alerts.size,
    });
  }

  /**
   * Get total tracked products
   */
  getTrackedCount(): number {
    return this.priceHistory.size;
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.priceHistory.clear();
    this.alerts.clear();
    this.brandPrices.clear();
    logger.info('Price tracker cleared');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Database Persistence Methods
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Save a price record to the database
   */
  private async savePriceToDatabase(record: PriceRecord, oldPrice?: number): Promise<void> {
    if (!this.isPrismaAvailable()) {
      return;
    }

    try {
      // Map price type to Prisma enum
      const priceTypeMap: Record<string, PrismaPriceType> = {
        regular: 'fixed',
        sale: 'fixed',
        clearance: 'fixed',
        member: 'fixed',
      };

      await this.prisma!.priceHistory.create({
        data: {
          entityType: record.metadata?.entityType || 'product',
          entityId: record.productId,
          priceOld: oldPrice ?? null,
          priceNew: record.price,
          priceType: priceTypeMap[record.priceType] || 'fixed',
          recordedAt: record.timestamp,
        },
      });

      logger.debug('Price saved to database', {
        productId: record.productId,
        price: record.price,
      });
    } catch (error) {
      logger.warn('Failed to save price to database', {
        productId: record.productId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Load price history from database for a product
   */
  async loadPriceHistoryFromDatabase(
    productId: string,
    brandId: string,
    entityType: string = 'product'
  ): Promise<PriceHistory | null> {
    if (!this.isPrismaAvailable()) {
      return null;
    }

    try {
      const dbRecords = await this.prisma!.priceHistory.findMany({
        where: {
          entityType,
          entityId: productId,
        },
        orderBy: {
          recordedAt: 'asc',
        },
        take: this.config.maxRecordsPerProduct,
      });

      if (dbRecords.length === 0) {
        return null;
      }

      // Convert database records to PriceRecord format
      const records: PriceRecord[] = dbRecords
        .filter((r: { priceNew: number | null }) => r.priceNew !== null)
        .map((r: { priceNew: number | null; recordedAt: Date }) => ({
          productId,
          brandId,
          price: r.priceNew!,
          currency: 'EUR',
          priceType: 'regular' as const,
          timestamp: r.recordedAt,
          source: 'database',
        }));

      if (records.length === 0) {
        return null;
      }

      const history: PriceHistory = {
        productId,
        brandId,
        records,
        statistics: this.calculateStatistics(records),
        lastUpdated: records[records.length - 1]!.timestamp,
      };

      // Cache in memory
      const key = this.getProductKey(productId, brandId);
      this.priceHistory.set(key, history);

      logger.debug('Price history loaded from database', {
        productId,
        recordCount: records.length,
      });

      return history;
    } catch (error) {
      logger.warn('Failed to load price history from database', {
        productId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Save all in-memory price history to database
   */
  async persistAllToDatabase(): Promise<{ saved: number; failed: number }> {
    if (!this.isPrismaAvailable()) {
      return { saved: 0, failed: 0 };
    }

    let saved = 0;
    let failed = 0;

    for (const [, history] of this.priceHistory) {
      for (let i = 0; i < history.records.length; i++) {
        const record = history.records[i]!;
        const oldPrice = i > 0 ? history.records[i - 1]!.price : undefined;

        try {
          await this.savePriceToDatabase(record, oldPrice);
          saved++;
        } catch {
          failed++;
        }
      }
    }

    logger.info('Price history persisted to database', { saved, failed });
    return { saved, failed };
  }

  /**
   * Check if database persistence is available
   */
  hasDatabaseConnection(): boolean {
    return this.isPrismaAvailable();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Factory Function
// ═══════════════════════════════════════════════════════════════════════════

export function createPriceTracker(config?: Partial<PriceTrackerConfig>): PriceTracker {
  return new PriceTracker(config);
}

export default PriceTracker;
