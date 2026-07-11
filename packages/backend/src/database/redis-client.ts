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

// --- Circuit breaker config --------------------------------------------------
// When connect() fails, we keep the circuit open for COOLDOWN_MS to avoid burning
// 8s on every getRedisClient() call (login/CSRF latency in prod under Upstash incidents).
// After the cooldown expires the next call performs a half-open probe; success
// closes the circuit, failure rearms it.
const CONNECT_TIMEOUT_MS = 2_000;
const RECONNECT_MAX_RETRIES = 3;
const COOLDOWN_MS = 30_000;

let redisClient: RedisClientType | null = null;
let connectionFailed = false;
let circuitOpenUntil = 0;
let pendingConnect: Promise<RedisClientType> | null = null;
// Last connection failure, SANITIZED (never the raw message — see getRedisCircuitState,
// exposed on the public /health/redis endpoint; a raw error can carry the Upstash
// host/credentials). Reset to null on a successful connect.
let lastError: string | null = null;

class RedisCircuitOpenError extends Error {
  constructor(msSinceOpen: number) {
    super(`Redis circuit open (${msSinceOpen}ms ago); retry after cooldown`);
    this.name = 'RedisCircuitOpenError';
  }
}

/** Read-only snapshot of the Redis circuit breaker, for the /health/redis probe. */
export interface RedisCircuitState {
  /** up = connected; cooldown = circuit open (waiting); down = not connected, no cooldown. */
  state: 'up' | 'down' | 'cooldown';
  /** Epoch ms until which the circuit stays open, or null if closed. */
  circuitOpenUntil: number | null;
  cooldownMs: number;
  /** Sanitized last connection error (never raw — no host/credentials). */
  lastError: string | null;
}

/**
 * Sanitize a Redis error for PUBLIC exposure: never leak the Upstash host,
 * credentials or connection string. Prefer the infra-safe error code
 * (ECONNREFUSED / ENOTFOUND / ETIMEDOUT / WRONGPASS…); otherwise redact any
 * connection string, host:port, known hostnames and IPs from the message.
 */
export function sanitizeRedisError(err: unknown): string {
  const code = (err as { code?: unknown } | null)?.code;
  if (typeof code === 'string' && code.length > 0) {
    return code;
  }
  const raw = err instanceof Error ? err.message : String(err);
  return raw
    .replace(/rediss?:\/\/[^\s'"]+/gi, '[redacted-url]')
    .replace(/@[^\s:'"]+/g, '@[redacted-host]')
    .replace(/\b[\w.-]+\.(?:upstash\.io|amazonaws\.com|cache\.\w+)\b/gi, '[redacted-host]')
    .replace(/\b\d{1,3}(?:\.\d{1,3}){3}(?::\d{2,5})?\b/g, '[redacted-ip]')
    .replace(/\b[a-z0-9-]+(?::\d{2,5})\b/gi, '[redacted-host]')
    .slice(0, 160);
}

/**
 * Read-only snapshot of the circuit breaker state (no side effects, no connect
 * attempt). Derived from the existing breaker vars — does NOT change its logic.
 */
export function getRedisCircuitState(): RedisCircuitState {
  const now = Date.now();
  let state: RedisCircuitState['state'];
  if (redisClient && redisClient.isOpen) {
    state = 'up';
  } else if (circuitOpenUntil > now) {
    state = 'cooldown';
  } else {
    state = 'down';
  }
  return {
    state,
    circuitOpenUntil: circuitOpenUntil > now ? circuitOpenUntil : null,
    cooldownMs: COOLDOWN_MS,
    lastError,
  };
}

/**
 * Get or create the Redis client singleton.
 * Returns the connected RedisClientType instance.
 * Throws RedisCircuitOpenError immediately if the circuit is open (no new connect attempt).
 * Throws the underlying error if a connect attempt fails (and arms the circuit).
 * Callers are expected to handle errors gracefully (token-blacklist, csrf, job-queue all do).
 */
export async function getRedisClient(): Promise<RedisClientType> {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  // Circuit open ⇒ short-circuit. Avoids cycling through reconnect retries on every call.
  const now = Date.now();
  if (circuitOpenUntil > now) {
    throw new RedisCircuitOpenError(COOLDOWN_MS - (circuitOpenUntil - now));
  }

  // Coalesce concurrent callers onto a single in-flight connect attempt.
  if (pendingConnect) {
    return pendingConnect;
  }

  const url = process.env.REDIS_URL || 'redis://localhost:6379';

  const client: RedisClientType = createClient({
    url,
    socket: {
      connectTimeout: CONNECT_TIMEOUT_MS,
      // Returning an Error from reconnectStrategy causes connect()/operations to reject
      // instead of looping forever. node-redis v4 contract.
      reconnectStrategy: (retries: number) => {
        if (retries >= RECONNECT_MAX_RETRIES) {
          return new Error(`Redis: max reconnect retries (${RECONNECT_MAX_RETRIES}) reached`);
        }
        return Math.min(retries * 200, 2_000);
      },
    },
  });

  client.on('error', (err: Error) => {
    logger.error('[Redis] Connection error:', { error: err.message });
  });
  client.on('connect', () => {
    logger.info('[Redis] Connected successfully', { url: url.replace(/\/\/.*@/, '//***@') });
  });
  client.on('reconnecting', () => {
    logger.info('[Redis] Reconnecting...');
  });

  pendingConnect = client.connect().then(
    () => {
      redisClient = client;
      connectionFailed = false;
      circuitOpenUntil = 0;
      lastError = null;
      pendingConnect = null;
      return client;
    },
    (err: unknown) => {
      // Arm the circuit, log once, dispose the orphan client to stop background reconnects.
      circuitOpenUntil = Date.now() + COOLDOWN_MS;
      connectionFailed = true;
      lastError = sanitizeRedisError(err);
      pendingConnect = null;
      const message = err instanceof Error ? err.message : String(err);
      logger.warn('[Redis] Connect failed; circuit open', {
        error: message,
        cooldownMs: COOLDOWN_MS,
      });
      // node-redis keeps its own reconnect loop alive on the client; force-stop it.
      void client.disconnect().catch(() => {
        /* swallow */
      });
      redisClient = null;
      throw err;
    }
  );

  return pendingConnect;
}

/**
 * Close Redis connection (for graceful shutdown)
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    connectionFailed = false;
    circuitOpenUntil = 0;
    pendingConnect = null;
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
  circuitOpenUntil = 0;
  pendingConnect = null;
}

// ---------------------------------------------------------------------------
// Convenience cache helpers (backward-compatible with existing consumers)
// ---------------------------------------------------------------------------

/**
 * Internal helper: get the Redis client or null if unavailable.
 * Used by the cache helpers to provide graceful degradation.
 */
async function getSafeClient(): Promise<RedisClientType | null> {
  // Fast paths: sticky failure flag, or circuit open. Both avoid the 8s reconnect cycle.
  if (connectionFailed && circuitOpenUntil > Date.now()) {
    return null;
  }

  try {
    return await getRedisClient();
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    // getRedisClient already armed the circuit and logged; suppress duplicate log here.
    if (!(err instanceof RedisCircuitOpenError)) {
      logger.warn('Redis not available, caching disabled', { error: err.message });
    }
    return null;
  }
}

/**
 * Get a value from Redis cache
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = await getSafeClient();
  if (!client) {
    return null;
  }

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
export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number = 3600
): Promise<boolean> {
  const client = await getSafeClient();
  if (!client) {
    return false;
  }

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
  if (!client) {
    return 0;
  }

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
