/**
 * Cache Service (Redis-backed)
 *
 * Provides a high-level caching API on top of Redis with:
 * - Get/Set with TTL
 * - Cache-aside (getOrSet) pattern
 * - Pattern-based invalidation
 *
 * All methods degrade gracefully if Redis is unavailable.
 */

import { getRedisClient } from '../database/redis-client';
import { createModuleLogger } from '../utils/logger';

const logger = createModuleLogger('cache-service');

const CACHE_PREFIX = 'cache:';

export class CacheService {
  /**
   * Get a cached value by key.
   * Returns null if the key does not exist or Redis is unavailable.
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const redis = await getRedisClient();
      const data = await redis.get(`${CACHE_PREFIX}${key}`);
      return data ? (JSON.parse(data) as T) : null;
    } catch {
      return null;
    }
  }

  /**
   * Set a value in cache with an optional TTL.
   *
   * @param key - Cache key
   * @param value - Value to cache (will be JSON-serialized)
   * @param ttlSeconds - Time-to-live in seconds (default: 300 = 5 minutes)
   */
  static async set<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    try {
      const redis = await getRedisClient();
      await redis.setEx(`${CACHE_PREFIX}${key}`, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      logger.error('[Cache] Failed to set:', { key, error });
    }
  }

  /**
   * Delete a specific cache key.
   */
  static async del(key: string): Promise<void> {
    try {
      const redis = await getRedisClient();
      await redis.del(`${CACHE_PREFIX}${key}`);
    } catch (error) {
      logger.error('[Cache] Failed to delete:', { key, error });
    }
  }

  /**
   * Delete all cache keys matching a glob pattern.
   *
   * Example: `CacheService.invalidatePattern('user:*')` removes all user cache entries.
   *
   * Note: Uses KEYS command which may be slow on very large datasets.
   * For high-traffic production, consider SCAN-based iteration instead.
   */
  static async invalidatePattern(pattern: string): Promise<void> {
    try {
      const redis = await getRedisClient();
      const keys = await redis.keys(`${CACHE_PREFIX}${pattern}`);
      if (keys.length > 0) {
        await redis.del(keys);
      }
    } catch (error) {
      logger.error('[Cache] Failed to invalidate pattern:', { pattern, error });
    }
  }

  /**
   * Cache-aside pattern: return cached value if it exists, otherwise
   * compute the value, cache it, and return it.
   *
   * @param key - Cache key
   * @param computeFn - Async function that produces the value on cache miss
   * @param ttlSeconds - Time-to-live in seconds (default: 300 = 5 minutes)
   */
  static async getOrSet<T>(
    key: string,
    computeFn: () => Promise<T>,
    ttlSeconds: number = 300
  ): Promise<T> {
    const cached = await CacheService.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await computeFn();
    await CacheService.set(key, value, ttlSeconds);
    return value;
  }
}
