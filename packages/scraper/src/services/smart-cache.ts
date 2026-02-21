/**
 * Smart Cache Service
 *
 * Intelligent caching with:
 * - TTL-based expiration
 * - LRU eviction
 * - Tag-based invalidation
 * - Stale-while-revalidate
 * - Cache warming
 * - Statistics and monitoring
 *
 * Uses Redis from database/redis.ts when available,
 * falls back to memory cache otherwise.
 */

import Redis from 'ioredis';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';
import { getRedisClient, isRedisConnected } from '../database/redis.js';

// ═══════════════════════════════════════════════════════════════════════════
// Types & Interfaces
// ═══════════════════════════════════════════════════════════════════════════

export interface CacheConfig {
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  prefix: string;
  defaultTTL: number; // seconds
  maxMemoryMB: number;
  enableStats: boolean;
  staleWhileRevalidate: boolean;
  staleTTL: number; // seconds to serve stale content
  compressionThreshold: number; // bytes
}

export interface CacheEntry<T = any> {
  value: T;
  createdAt: number;
  expiresAt: number;
  staleAt?: number;
  tags: string[];
  size: number;
  hits: number;
  compressed: boolean;
}

export interface CacheStats {
  hits: number;
  misses: number;
  staleHits: number;
  writes: number;
  deletes: number;
  evictions: number;
  hitRate: number;
  totalSize: number;
  entryCount: number;
}

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
  staleWhileRevalidate?: boolean;
  compress?: boolean;
}

type RevalidateCallback<T> = () => Promise<T>;

const DEFAULT_CONFIG: CacheConfig = {
  prefix: 'kxscraper:cache:',
  defaultTTL: 3600, // 1 hour
  maxMemoryMB: 512,
  enableStats: true,
  staleWhileRevalidate: true,
  staleTTL: 300, // 5 minutes stale
  compressionThreshold: 1024, // 1KB
};

// ═══════════════════════════════════════════════════════════════════════════
// Smart Cache Class
// ═══════════════════════════════════════════════════════════════════════════

export class SmartCache {
  private config: CacheConfig;
  private redis: Redis | null = null;
  private useSharedRedis: boolean = false;
  private memoryCache: Map<string, CacheEntry> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    staleHits: 0,
    writes: 0,
    deletes: 0,
    evictions: 0,
    hitRate: 0,
    totalSize: 0,
    entryCount: 0,
  };
  private revalidating: Set<string> = new Set();
  private maxMemoryBytes: number;

  constructor(config?: Partial<CacheConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.maxMemoryBytes = this.config.maxMemoryMB * 1024 * 1024;

    // Try to use explicit redis config first, then fall back to shared client
    if (config?.redis) {
      this.initRedis(config.redis);
    } else {
      this.initSharedRedis();
    }
  }

  /**
   * Initialize with the shared Redis client from database/redis.ts
   */
  private initSharedRedis(): void {
    try {
      const sharedClient = getRedisClient();
      if (sharedClient) {
        this.redis = sharedClient;
        this.useSharedRedis = true;
        logger.info('Smart cache using shared Redis client');
      } else {
        logger.info('Smart cache: No Redis available, using memory cache only');
      }
    } catch (error) {
      logger.warn('Failed to initialize shared Redis client', { error });
      this.redis = null;
    }
  }

  /**
   * Initialize with custom Redis configuration
   */
  private async initRedis(redisConfig: NonNullable<CacheConfig['redis']>): Promise<void> {
    try {
      this.redis = new Redis({
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
        db: redisConfig.db,
        lazyConnect: true,
        maxRetriesPerRequest: 3,
      });

      await this.redis.connect();
      this.useSharedRedis = false;
      logger.info('Smart cache connected to custom Redis');
    } catch (error) {
      logger.warn('Failed to connect to Redis, using memory cache only', { error });
      this.redis = null;
    }
  }

  /**
   * Check if Redis is available and connected
   */
  private isRedisAvailable(): boolean {
    if (!this.redis) return false;

    // For shared client, use the isRedisConnected function
    if (this.useSharedRedis) {
      return isRedisConnected();
    }

    // For custom client, check status
    return this.redis.status === 'ready';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Core Operations
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const fullKey = this.getFullKey(key);

    // Try memory cache first
    const memEntry = this.memoryCache.get(fullKey);
    if (memEntry) {
      const now = Date.now();

      if (now < memEntry.expiresAt) {
        // Fresh cache hit
        memEntry.hits++;
        this.stats.hits++;
        this.updateHitRate();
        return memEntry.value as T;
      }

      if (this.config.staleWhileRevalidate && memEntry.staleAt && now < memEntry.staleAt) {
        // Stale but still usable
        memEntry.hits++;
        this.stats.staleHits++;
        this.updateHitRate();
        return memEntry.value as T;
      }

      // Expired, remove
      this.memoryCache.delete(fullKey);
      this.stats.totalSize -= memEntry.size;
    }

    // Try Redis
    if (this.isRedisAvailable()) {
      try {
        const data = await this.redis!.get(fullKey);
        if (data) {
          const entry = JSON.parse(data) as CacheEntry<T>;
          const now = Date.now();

          if (now < entry.expiresAt) {
            // Populate memory cache
            this.setMemoryCache(fullKey, entry);
            this.stats.hits++;
            this.updateHitRate();
            return entry.value;
          }

          if (this.config.staleWhileRevalidate && entry.staleAt && now < entry.staleAt) {
            this.setMemoryCache(fullKey, entry);
            this.stats.staleHits++;
            this.updateHitRate();
            return entry.value;
          }

          // Expired in Redis
          await this.redis!.del(fullKey);
        }
      } catch (error) {
        logger.warn('Redis get error', { key, error });
      }
    }

    this.stats.misses++;
    this.updateHitRate();
    return null;
  }

  /**
   * Get or compute a value
   */
  async getOrSet<T>(
    key: string,
    compute: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    const cached = await this.get<T>(key);

    if (cached !== null) {
      // Check if we should background revalidate
      const fullKey = this.getFullKey(key);
      const memEntry = this.memoryCache.get(fullKey);

      if (memEntry && this.config.staleWhileRevalidate) {
        const now = Date.now();
        if (now >= memEntry.expiresAt && now < (memEntry.staleAt || 0)) {
          // Stale - trigger background revalidation
          this.backgroundRevalidate(key, compute, options);
        }
      }

      return cached;
    }

    // Cache miss - compute and store
    const value = await compute();
    await this.set(key, value, options);
    return value;
  }

  /**
   * Set a value in cache
   */
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    const fullKey = this.getFullKey(key);
    const ttl = options?.ttl || this.config.defaultTTL;
    const tags = options?.tags || [];

    const now = Date.now();
    const serializedValue = JSON.stringify(value);
    const size = Buffer.byteLength(serializedValue, 'utf8');

    const entry: CacheEntry<T> = {
      value,
      createdAt: now,
      expiresAt: now + ttl * 1000,
      staleAt: this.config.staleWhileRevalidate ? now + (ttl + this.config.staleTTL) * 1000 : undefined,
      tags,
      size,
      hits: 0,
      compressed: false,
    };

    // Memory cache
    this.ensureMemorySpace(size);
    this.setMemoryCache(fullKey, entry);

    // Tag indexing
    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(fullKey);
    }

    // Redis
    if (this.isRedisAvailable()) {
      try {
        const serializedEntry = JSON.stringify(entry);
        const redisTTL = Math.ceil((entry.staleAt || entry.expiresAt - now) / 1000);
        await this.redis!.setex(fullKey, redisTTL, serializedEntry);

        // Store tags in Redis
        for (const tag of tags) {
          await this.redis!.sadd(`${this.config.prefix}tag:${tag}`, fullKey);
          await this.redis!.expire(`${this.config.prefix}tag:${tag}`, redisTTL);
        }
      } catch (error) {
        logger.warn('Redis set error', { key, error });
      }
    }

    this.stats.writes++;
  }

  /**
   * Delete a specific key
   */
  async delete(key: string): Promise<boolean> {
    const fullKey = this.getFullKey(key);

    // Remove from memory
    const memEntry = this.memoryCache.get(fullKey);
    if (memEntry) {
      this.stats.totalSize -= memEntry.size;
      this.memoryCache.delete(fullKey);

      // Remove from tag index
      for (const tag of memEntry.tags) {
        this.tagIndex.get(tag)?.delete(fullKey);
      }
    }

    // Remove from Redis
    if (this.isRedisAvailable()) {
      try {
        await this.redis!.del(fullKey);
      } catch (error) {
        logger.warn('Redis delete error', { key, error });
      }
    }

    this.stats.deletes++;
    return true;
  }

  /**
   * Invalidate by tag
   */
  async invalidateByTag(tag: string): Promise<number> {
    let count = 0;

    // Memory cache
    const keys = this.tagIndex.get(tag);
    if (keys) {
      for (const key of keys) {
        const entry = this.memoryCache.get(key);
        if (entry) {
          this.stats.totalSize -= entry.size;
          this.memoryCache.delete(key);
          count++;
        }
      }
      this.tagIndex.delete(tag);
    }

    // Redis
    if (this.isRedisAvailable()) {
      try {
        const redisKeys = await this.redis!.smembers(`${this.config.prefix}tag:${tag}`);
        if (redisKeys.length > 0) {
          await this.redis!.del(...redisKeys);
          count = Math.max(count, redisKeys.length);
        }
        await this.redis!.del(`${this.config.prefix}tag:${tag}`);
      } catch (error) {
        logger.warn('Redis invalidate by tag error', { tag, error });
      }
    }

    logger.info(`Invalidated ${count} entries by tag: ${tag}`);
    return count;
  }

  /**
   * Invalidate by pattern
   */
  async invalidateByPattern(pattern: string): Promise<number> {
    let count = 0;
    const fullPattern = this.getFullKey(pattern);

    // Memory cache
    for (const [key, entry] of this.memoryCache) {
      if (this.matchPattern(key, fullPattern)) {
        this.stats.totalSize -= entry.size;
        this.memoryCache.delete(key);
        count++;
      }
    }

    // Redis
    if (this.isRedisAvailable()) {
      try {
        let cursor = '0';
        do {
          const [newCursor, keys] = await this.redis!.scan(
            cursor,
            'MATCH',
            fullPattern.replace('*', '*'),
            'COUNT',
            100
          );
          cursor = newCursor;

          if (keys.length > 0) {
            await this.redis!.del(...keys);
            count += keys.length;
          }
        } while (cursor !== '0');
      } catch (error) {
        logger.warn('Redis invalidate by pattern error', { pattern, error });
      }
    }

    logger.info(`Invalidated ${count} entries by pattern: ${pattern}`);
    return count;
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();
    this.tagIndex.clear();
    this.stats.totalSize = 0;
    this.stats.entryCount = 0;

    if (this.isRedisAvailable()) {
      try {
        let cursor = '0';
        do {
          const [newCursor, keys] = await this.redis!.scan(
            cursor,
            'MATCH',
            `${this.config.prefix}*`,
            'COUNT',
            100
          );
          cursor = newCursor;

          if (keys.length > 0) {
            await this.redis!.del(...keys);
          }
        } while (cursor !== '0');
      } catch (error) {
        logger.warn('Redis clear error', { error });
      }
    }

    logger.info('Cache cleared');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Cache Warming
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Warm cache with multiple entries
   */
  async warm<T>(
    entries: Array<{ key: string; compute: () => Promise<T>; options?: CacheOptions }>
  ): Promise<void> {
    logger.info(`Warming cache with ${entries.length} entries`);

    const results = await Promise.allSettled(
      entries.map(async ({ key, compute, options }) => {
        const value = await compute();
        await this.set(key, value, options);
        return key;
      })
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    logger.info(`Cache warm complete: ${successful}/${entries.length} entries`);
  }

  /**
   * Prefetch and cache a URL
   */
  async prefetch(
    key: string,
    fetchFn: () => Promise<any>,
    options?: CacheOptions
  ): Promise<void> {
    // Only prefetch if not already cached
    const existing = await this.get(key);
    if (existing === null) {
      try {
        const value = await fetchFn();
        await this.set(key, value, options);
        logger.debug(`Prefetched: ${key}`);
      } catch (error) {
        logger.warn(`Prefetch failed: ${key}`, { error });
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Helper Methods
  // ═══════════════════════════════════════════════════════════════════════════

  private getFullKey(key: string): string {
    return `${this.config.prefix}${key}`;
  }

  private setMemoryCache<T>(key: string, entry: CacheEntry<T>): void {
    this.memoryCache.set(key, entry);
    this.stats.totalSize += entry.size;
    this.stats.entryCount = this.memoryCache.size;
  }

  private ensureMemorySpace(neededBytes: number): void {
    while (this.stats.totalSize + neededBytes > this.maxMemoryBytes && this.memoryCache.size > 0) {
      // LRU eviction - remove entry with lowest hits
      let lowestKey: string | null = null;
      let lowestHits = Infinity;
      let lowestTime = Infinity;

      for (const [key, entry] of this.memoryCache) {
        // Prefer to evict expired entries first
        if (entry.expiresAt < Date.now()) {
          lowestKey = key;
          break;
        }

        // Then lowest hit count
        if (entry.hits < lowestHits || (entry.hits === lowestHits && entry.createdAt < lowestTime)) {
          lowestKey = key;
          lowestHits = entry.hits;
          lowestTime = entry.createdAt;
        }
      }

      if (lowestKey) {
        const entry = this.memoryCache.get(lowestKey);
        if (entry) {
          this.stats.totalSize -= entry.size;
          this.memoryCache.delete(lowestKey);
          this.stats.evictions++;
        }
      } else {
        break;
      }
    }
  }

  private async backgroundRevalidate<T>(
    key: string,
    compute: RevalidateCallback<T>,
    options?: CacheOptions
  ): Promise<void> {
    const fullKey = this.getFullKey(key);

    // Prevent concurrent revalidation
    if (this.revalidating.has(fullKey)) {
      return;
    }

    this.revalidating.add(fullKey);

    try {
      const value = await compute();
      await this.set(key, value, options);
      logger.debug(`Background revalidated: ${key}`);
    } catch (error) {
      logger.warn(`Background revalidation failed: ${key}`, { error });
    } finally {
      this.revalidating.delete(fullKey);
    }
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  private matchPattern(key: string, pattern: string): boolean {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(key);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Statistics
  // ═══════════════════════════════════════════════════════════════════════════

  getStats(): CacheStats {
    return { ...this.stats, entryCount: this.memoryCache.size };
  }

  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      staleHits: 0,
      writes: 0,
      deletes: 0,
      evictions: 0,
      hitRate: 0,
      totalSize: this.stats.totalSize,
      entryCount: this.memoryCache.size,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Specialized Methods
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Cache key generator for scraping
   */
  static generateKey(parts: {
    type: 'page' | 'product' | 'collection' | 'search';
    brandId: string;
    identifier: string;
    version?: string;
  }): string {
    const { type, brandId, identifier, version } = parts;
    const hash = crypto
      .createHash('md5')
      .update(identifier)
      .digest('hex')
      .substring(0, 12);

    return version
      ? `${type}:${brandId}:${hash}:${version}`
      : `${type}:${brandId}:${hash}`;
  }

  /**
   * Get cache key for a URL
   */
  static urlKey(url: string): string {
    const urlObj = new URL(url);
    const hash = crypto
      .createHash('md5')
      .update(urlObj.pathname + urlObj.search)
      .digest('hex')
      .substring(0, 16);

    return `url:${urlObj.hostname}:${hash}`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Cleanup
  // ═══════════════════════════════════════════════════════════════════════════

  async close(): Promise<void> {
    // Only close custom Redis connection, not the shared one
    if (this.redis && !this.useSharedRedis) {
      await this.redis.quit();
    }
    this.redis = null;
    this.memoryCache.clear();
    this.tagIndex.clear();
    logger.info('Smart cache closed');
  }

  /**
   * Check if Redis connection is available
   */
  hasRedis(): boolean {
    return this.isRedisAvailable();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Factory Function
// ═══════════════════════════════════════════════════════════════════════════

export function createSmartCache(config?: Partial<CacheConfig>): SmartCache {
  return new SmartCache(config);
}

export default SmartCache;
