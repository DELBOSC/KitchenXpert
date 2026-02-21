/**
 * Redis Client Singleton
 *
 * Provides a singleton Redis instance using ioredis.
 * Configured from REDIS_URL environment variable.
 * Handles connection errors gracefully and provides cleanup functionality.
 */

import Redis from 'ioredis';
import { logger } from '../utils/logger.js';

// ===============================================================================
// Singleton Instance
// ===============================================================================

let redisClient: Redis | null = null;
let isConnected = false;
let connectionError: Error | null = null;

// ===============================================================================
// Configuration
// ===============================================================================

interface RedisClientConfig {
  url?: string;
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  maxRetriesPerRequest?: number;
  retryDelayMs?: number;
  connectTimeoutMs?: number;
  lazyConnect?: boolean;
  keyPrefix?: string;
}

const defaultConfig: RedisClientConfig = {
  maxRetriesPerRequest: 3,
  retryDelayMs: 1000,
  connectTimeoutMs: 10000,
  lazyConnect: true,
  keyPrefix: 'kxscraper:',
};

/**
 * Parse REDIS_URL environment variable
 */
function parseRedisUrl(url: string): Partial<RedisClientConfig> {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port, 10) || 6379,
      password: parsed.password || undefined,
      db: parsed.pathname ? parseInt(parsed.pathname.slice(1), 10) || 0 : 0,
    };
  } catch (error) {
    logger.warn('Failed to parse REDIS_URL, using default connection', {
      error: error instanceof Error ? error.message : String(error),
    });
    return {};
  }
}

// ===============================================================================
// Client Creation & Connection
// ===============================================================================

/**
 * Get or create the Redis client singleton
 */
export function getRedisClient(config?: RedisClientConfig): Redis | null {
  if (redisClient) {
    return redisClient;
  }

  const mergedConfig = { ...defaultConfig, ...config };

  // Parse REDIS_URL if available and no explicit config provided
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl && !config?.host && !config?.url) {
    Object.assign(mergedConfig, parseRedisUrl(redisUrl));
  }

  // Use explicit URL if provided
  if (mergedConfig.url) {
    Object.assign(mergedConfig, parseRedisUrl(mergedConfig.url));
  }

  try {
    redisClient = new Redis({
      host: mergedConfig.host || 'localhost',
      port: mergedConfig.port || 6379,
      password: mergedConfig.password,
      db: mergedConfig.db || 0,
      maxRetriesPerRequest: mergedConfig.maxRetriesPerRequest,
      lazyConnect: mergedConfig.lazyConnect,
      connectTimeout: mergedConfig.connectTimeoutMs,
      keyPrefix: mergedConfig.keyPrefix,
      retryStrategy: (times: number) => {
        if (times > 10) {
          logger.error('Redis max retries exceeded, giving up');
          return null; // Stop retrying
        }
        const delay = Math.min(times * mergedConfig.retryDelayMs!, 30000);
        logger.warn(`Redis connection retry attempt ${times}, waiting ${delay}ms`);
        return delay;
      },
    });

    // Set up event handlers
    redisClient.on('connect', () => {
      logger.info('Redis connecting...');
    });

    redisClient.on('ready', () => {
      isConnected = true;
      connectionError = null;
      logger.info('Redis connected and ready');
    });

    redisClient.on('error', (error: Error) => {
      connectionError = error;
      logger.error('Redis error', { error: error.message });
    });

    redisClient.on('close', () => {
      isConnected = false;
      logger.info('Redis connection closed');
    });

    redisClient.on('reconnecting', () => {
      logger.info('Redis reconnecting...');
    });

    redisClient.on('end', () => {
      isConnected = false;
      logger.info('Redis connection ended');
    });

    logger.info('Redis client created', {
      host: mergedConfig.host || 'localhost',
      port: mergedConfig.port || 6379,
      db: mergedConfig.db || 0,
    });

    return redisClient;
  } catch (error) {
    connectionError = error instanceof Error ? error : new Error(String(error));
    logger.error('Failed to create Redis client', { error: connectionError.message });
    return null;
  }
}

/**
 * Connect to Redis
 */
export async function connectRedis(): Promise<boolean> {
  const client = getRedisClient();

  if (!client) {
    logger.error('Cannot connect: Redis client not initialized');
    return false;
  }

  if (isConnected) {
    return true;
  }

  try {
    await client.connect();
    // The 'ready' event handler will set isConnected = true
    // Wait a bit for the connection to be established
    await new Promise((resolve) => setTimeout(resolve, 100));
    return isConnected;
  } catch (error) {
    // If already connected, this is fine
    if (error instanceof Error && error.message.includes('already connecting')) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return isConnected;
    }

    connectionError = error instanceof Error ? error : new Error(String(error));
    logger.error('Failed to connect to Redis', { error: connectionError.message });
    return false;
  }
}

/**
 * Disconnect from Redis
 */
export async function disconnectRedis(): Promise<void> {
  if (!redisClient) {
    return;
  }

  try {
    await redisClient.quit();
    isConnected = false;
    logger.info('Redis disconnected gracefully');
  } catch (error) {
    logger.error('Error disconnecting Redis', {
      error: error instanceof Error ? error.message : String(error),
    });
    // Force disconnect on error
    try {
      redisClient.disconnect();
    } catch {
      // Ignore errors during forced disconnect
    }
  }
}

// ===============================================================================
// Status & Health Check
// ===============================================================================

/**
 * Check if Redis is connected
 */
export function isRedisConnected(): boolean {
  return isConnected && redisClient?.status === 'ready';
}

/**
 * Get the last connection error
 */
export function getRedisConnectionError(): Error | null {
  return connectionError;
}

/**
 * Health check for Redis connection
 */
export async function checkRedisHealth(): Promise<{
  connected: boolean;
  latency?: number;
  error?: string;
  info?: {
    usedMemory?: string;
    connectedClients?: number;
    uptimeInSeconds?: number;
  };
}> {
  if (!redisClient) {
    return { connected: false, error: 'Client not initialized' };
  }

  const startTime = Date.now();

  try {
    const pong = await redisClient.ping();

    if (pong !== 'PONG') {
      return { connected: false, error: 'Unexpected PING response' };
    }

    // Get basic info
    const infoStr = await redisClient.info('memory');
    const usedMemoryMatch = infoStr.match(/used_memory_human:(\S+)/);

    return {
      connected: true,
      latency: Date.now() - startTime,
      info: {
        usedMemory: usedMemoryMatch?.[1],
      },
    };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ===============================================================================
// Utility Functions
// ===============================================================================

/**
 * Get Redis client status
 */
export function getRedisStatus(): string {
  return redisClient?.status || 'not_initialized';
}

/**
 * Execute a Redis command with error handling
 * Returns null if Redis is not available
 */
export async function safeRedisCall<T>(
  operation: (client: Redis) => Promise<T>,
  fallback?: T
): Promise<T | null> {
  if (!redisClient || !isRedisConnected()) {
    return fallback ?? null;
  }

  try {
    return await operation(redisClient);
  } catch (error) {
    logger.warn('Redis operation failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return fallback ?? null;
  }
}

// ===============================================================================
// Exports
// ===============================================================================

/**
 * The Redis client instance (may be null if not initialized)
 */
export const redis = getRedisClient();

export default redis;
