/**
 * Redis Client Singleton
 *
 * Provides a shared Redis connection for caching catalog data,
 * session management, token blacklisting, and job queues.
 *
 * Uses the `redis` package (node-redis v4+) for Redis connectivity.
 * Falls back gracefully if Redis is not available.
 */

import { createClient, type RedisClientType } from 'redis';

import { createModuleLogger } from '../utils/logger';

const logger = createModuleLogger('redis-client');

const KEY_PREFIX = 'kx:';

let redisClient: RedisClientType | null = null;
let connectionFailed = false;

/**
 * Get or create the Redis client singleton.
 * Returns the connected RedisClientType instance.
 * Throws if connection fails (callers should handle gracefully).
 */
export async function getRedisClient(): Promise<RedisClientType> {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  const url = process.env.REDIS_URL || 'redis://localhost:6379';

  redisClient = createClient({ url });

  redisClient.on('error', (err: Error) => {
    logger.error('[Redis] Connection error:', { error: err.message });
  });

  redisClient.on('connect', () => {
    logger.info('[Redis] Connected successfully', {
      url: url.replace(/\/\/.*@/, '//***@'),
    });
  });

  redisClient.on('reconnecting', () => {
    logger.info('[Redis] Reconnecting...');
  });

  await redisClient.connect();
  connectionFailed = false;

  return redisClient;
}

/**
 * Close Redis connection (for graceful shutdown)
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    connectionFailed = false;
    logger.info('[Redis] Connection closed');
  }
}

/**
 * Alias for closeRedisConnection — maintains backward compatibility
 */
export const closeRedis = closeRedisConnection;

/**
 * Reset connection state (for testing or reconnection)
 */
export function resetRedisConnection(): void {
  if (redisClient && redisClient.isOpen) {
    redisClient.quit().catch(() => {
      // Ignore errors during reset
    });
  }
  redisClient = null;
  connectionFailed = false;
}

// ---------------------------------------------------------------------------
// Convenience cache helpers (backward-compatible with existing consumers)
// ---------------------------------------------------------------------------

/**
 * Internal helper: get the Redis client or null if unavailable.
 * Used by the cache helpers to provide graceful degradation.
 */
async function getSafeClient(): Promise<RedisClientType | null> {
  if (connectionFailed) {return null;}

  try {
    return await getRedisClient();
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.warn('Redis not available, caching disabled', { error: err.message });
    connectionFailed = true;
    return null;
  }
}

/**
 * Get a value from Redis cache
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = await getSafeClient();
  if (!client) {return null;}

  try {
    const value = await client.get(`${KEY_PREFIX}${key}`);
    return value ? (JSON.parse(value) as T) : null;
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.warn('Redis get failed', { key, error: err.message });
    return null;
  }
}

/**
 * Set a value in Redis cache with TTL (in seconds)
 */
export async function cacheSet(key: string, value: unknown, ttlSeconds: number = 3600): Promise<boolean> {
  const client = await getSafeClient();
  if (!client) {return false;}

  try {
    await client.setEx(`${KEY_PREFIX}${key}`, ttlSeconds, JSON.stringify(value));
    return true;
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.warn('Redis set failed', { key, error: err.message });
    return false;
  }
}

/**
 * Delete one or more keys from Redis cache
 */
export async function cacheDel(...keys: string[]): Promise<number> {
  const client = await getSafeClient();
  if (!client) {return 0;}

  try {
    const prefixedKeys = keys.map((k) => `${KEY_PREFIX}${k}`);
    return await client.del(prefixedKeys);
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.warn('Redis del failed', { keys, error: err.message });
    return 0;
  }
}

/**
 * Cache TTL presets (in seconds)
 */
export const CACHE_TTL = {
  /** 1 hour — for volatile data like prices and stock */
  PRICES: 3600,
  /** 24 hours — for stable data like product specs */
  SPECS: 86400,
  /** 5 minutes — for health check results */
  HEALTH: 300,
  /** 12 hours — for catalog sync metadata */
  SYNC_META: 43200,
} as const;
