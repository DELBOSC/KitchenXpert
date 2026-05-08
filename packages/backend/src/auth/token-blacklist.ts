/**
 * Token Blacklist Service
 *
 * Provides functionality to blacklist/revoke JWT tokens before their natural expiration.
 * Used for logout, password changes, and security revocation scenarios.
 *
 * PRODUCTION NOTE:
 * This implementation uses in-memory storage which is suitable for development
 * and single-instance deployments. For production with multiple instances,
 * use Redis or another distributed cache:
 *
 * Example Redis implementation:
 * ```typescript
 * class RedisTokenBlacklist implements ITokenBlacklist {
 *   constructor(private redis: Redis) {}
 *
 *   async addToBlacklist(token: string, expiresAt: Date): Promise<void> {
 *     const ttl = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
 *     await this.redis.setex(`blacklist:${this.hashToken(token)}`, ttl, '1');
 *   }
 *
 *   async isBlacklisted(token: string): Promise<boolean> {
 *     const result = await this.redis.get(`blacklist:${this.hashToken(token)}`);
 *     return result !== null;
 *   }
 *
 *   private hashToken(token: string): string {
 *     return crypto.createHash('sha256').update(token).digest('hex');
 *   }
 * }
 * ```
 */

import crypto from 'crypto';

import logger from '../utils/logger';

/**
 * Interface for token blacklist storage
 * Implement this interface to use different storage backends (Redis, database, etc.)
 */
export interface ITokenBlacklist {
  /**
   * Add a token to the blacklist
   * @param token - The JWT token or token identifier to blacklist
   * @param expiresAt - When the token would naturally expire (for cleanup)
   */
  addToBlacklist(token: string, expiresAt: Date): Promise<void>;

  /**
   * Check if a token is blacklisted
   * @param token - The JWT token or token identifier to check
   * @returns True if the token is blacklisted
   */
  isBlacklisted(token: string): Promise<boolean>;

  /**
   * Clean up expired entries from the blacklist
   * @returns Number of entries cleaned up
   */
  cleanup(): Promise<number>;

  /**
   * Blacklist all tokens for a specific user
   * @param userId - The user ID whose tokens should be blacklisted
   * @param expiresAt - When to expire the user blacklist entry
   */
  blacklistUserTokens(userId: string, expiresAt: Date): Promise<void>;

  /**
   * Check if a user's tokens are globally blacklisted
   * @param userId - The user ID to check
   * @param tokenIssuedAt - When the token was issued (to compare with blacklist time)
   * @returns True if user's tokens issued before the blacklist time should be rejected
   */
  isUserBlacklisted(userId: string, tokenIssuedAt: Date): Promise<boolean>;
}

/**
 * Blacklist entry structure
 */
interface BlacklistEntry {
  /** Hash of the token (never store raw tokens) */
  tokenHash: string;
  /** When this entry should be removed from the blacklist */
  expiresAt: Date;
  /** When the entry was added */
  createdAt: Date;
  /** Optional reason for blacklisting */
  reason?: string;
}

/**
 * User blacklist entry for bulk token revocation
 */
interface UserBlacklistEntry {
  /** User ID */
  userId: string;
  /** All tokens issued before this time are invalid */
  invalidBefore: Date;
  /** When this entry expires */
  expiresAt: Date;
}

/**
 * Memory-based token blacklist implementation
 *
 * Suitable for:
 * - Development environments
 * - Single-instance deployments
 * - Low-traffic applications
 *
 * NOT suitable for:
 * - Multi-instance/clustered deployments (tokens won't be shared)
 * - High-traffic applications (memory growth)
 * - Applications requiring persistence across restarts
 */
export class MemoryTokenBlacklist implements ITokenBlacklist {
  private blacklist: Map<string, BlacklistEntry> = new Map();
  private userBlacklist: Map<string, UserBlacklistEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(autoCleanupIntervalMs = 5 * 60 * 1000) {
    // Auto-cleanup every 5 minutes by default
    if (autoCleanupIntervalMs > 0) {
      this.startAutoCleanup(autoCleanupIntervalMs);
    }
  }

  /**
   * Hash a token for storage (never store raw tokens)
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Add a token to the blacklist.
   * Delegates to Redis-backed TokenBlacklistService when available,
   * falling back to in-memory storage.
   */
  async addToBlacklist(token: string, expiresAt: Date, reason?: string): Promise<void> {
    // Try Redis first
    try {
      const { TokenBlacklistService } = await import('../services/token-blacklist.service');
      const expiresInSeconds = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
      if (expiresInSeconds > 0) {
        await TokenBlacklistService.blacklist(token, expiresInSeconds);
        return;
      }
    } catch {
      // Fall back to memory
    }

    // Memory fallback
    const tokenHash = this.hashToken(token);

    this.blacklist.set(tokenHash, {
      tokenHash,
      expiresAt,
      createdAt: new Date(),
      reason,
    });
  }

  /**
   * Check if a token is blacklisted.
   * Checks Redis-backed TokenBlacklistService first, then falls back to memory.
   */
  async isBlacklisted(token: string): Promise<boolean> {
    // Try Redis first
    try {
      const { TokenBlacklistService } = await import('../services/token-blacklist.service');
      const result = await TokenBlacklistService.isBlacklisted(token);
      if (result) {return true;}
    } catch {
      // Fall back to memory check
    }

    // Memory fallback
    const tokenHash = this.hashToken(token);
    const entry = this.blacklist.get(tokenHash);

    if (!entry) {
      return false;
    }

    // Check if entry has expired
    if (new Date() > entry.expiresAt) {
      this.blacklist.delete(tokenHash);
      return false;
    }

    return true;
  }

  /**
   * Blacklist all tokens for a user
   * Tokens issued before the current time will be invalid
   */
  async blacklistUserTokens(userId: string, expiresAt: Date): Promise<void> {
    this.userBlacklist.set(userId, {
      userId,
      invalidBefore: new Date(),
      expiresAt,
    });
  }

  /**
   * Check if a user's tokens issued at a specific time are blacklisted
   */
  async isUserBlacklisted(userId: string, tokenIssuedAt: Date): Promise<boolean> {
    const entry = this.userBlacklist.get(userId);

    if (!entry) {
      return false;
    }

    // Check if user blacklist entry has expired
    if (new Date() > entry.expiresAt) {
      this.userBlacklist.delete(userId);
      return false;
    }

    // Token is invalid if it was issued before the blacklist time
    return tokenIssuedAt < entry.invalidBefore;
  }

  /**
   * Clean up expired entries
   */
  async cleanup(): Promise<number> {
    const now = new Date();
    let cleaned = 0;

    // Clean token blacklist
    for (const [tokenHash, entry] of this.blacklist.entries()) {
      if (now > entry.expiresAt) {
        this.blacklist.delete(tokenHash);
        cleaned++;
      }
    }

    // Clean user blacklist
    for (const [userId, entry] of this.userBlacklist.entries()) {
      if (now > entry.expiresAt) {
        this.userBlacklist.delete(userId);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Start automatic cleanup interval
   */
  private startAutoCleanup(intervalMs: number): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup().catch((err) => logger.error('Token blacklist cleanup error', err));
    }, intervalMs);

    // Don't prevent process exit
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Stop automatic cleanup
   */
  stopAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get current blacklist statistics
   */
  getStats(): { tokenCount: number; userCount: number } {
    return {
      tokenCount: this.blacklist.size,
      userCount: this.userBlacklist.size,
    };
  }

  /**
   * Clear all entries (for testing)
   */
  clear(): void {
    this.blacklist.clear();
    this.userBlacklist.clear();
  }
}

/**
 * Redis-based token blacklist implementation
 *
 * Suitable for:
 * - Production environments
 * - Multi-instance/clustered deployments
 * - High-traffic applications
 * - Applications requiring persistence across restarts
 *
 * Requires: ioredis package and a running Redis instance
 */
export class RedisTokenBlacklist implements ITokenBlacklist {
  private redis: any; // ioredis client
  private prefix: string;

  constructor(redisClient: any, prefix = 'token_blacklist:') {
    this.redis = redisClient;
    this.prefix = prefix;
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async addToBlacklist(token: string, expiresAt: Date): Promise<void> {
    const tokenHash = this.hashToken(token);
    const ttl = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));

    if (ttl > 0) {
      await this.redis.setex(`${this.prefix}token:${tokenHash}`, ttl, '1');
    }
  }

  async isBlacklisted(token: string): Promise<boolean> {
    const tokenHash = this.hashToken(token);
    const result = await this.redis.get(`${this.prefix}token:${tokenHash}`);
    return result !== null;
  }

  async blacklistUserTokens(userId: string, expiresAt: Date): Promise<void> {
    const ttl = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
    const invalidBefore = Date.now();

    if (ttl > 0) {
      await this.redis.setex(
        `${this.prefix}user:${userId}`,
        ttl,
        invalidBefore.toString()
      );
    }
  }

  async isUserBlacklisted(userId: string, tokenIssuedAt: Date): Promise<boolean> {
    const invalidBefore = await this.redis.get(`${this.prefix}user:${userId}`);

    if (!invalidBefore) {
      return false;
    }

    return tokenIssuedAt.getTime() < parseInt(invalidBefore, 10);
  }

  async cleanup(): Promise<number> {
    // Redis handles TTL-based expiration automatically
    return 0;
  }
}

// Singleton instance
let tokenBlacklistInstance: ITokenBlacklist | null = null;

/**
 * Get the token blacklist instance
 * Uses Redis if REDIS_URL is configured, otherwise falls back to memory-based
 */
export function getTokenBlacklist(): ITokenBlacklist {
  if (!tokenBlacklistInstance) {
    const redisUrl = process.env.REDIS_URL;

    if (redisUrl) {
      try {
        // Dynamic import to avoid requiring ioredis when not used
        // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
        const Redis = require('ioredis');
        const redisClient = new Redis(redisUrl);
        tokenBlacklistInstance = new RedisTokenBlacklist(redisClient);
        logger.info('[TokenBlacklist] Using Redis-backed token blacklist');
      } catch {
        logger.warn('[TokenBlacklist] Failed to initialize Redis, falling back to memory-based blacklist');
        tokenBlacklistInstance = new MemoryTokenBlacklist();
      }
    } else {
      logger.warn('[TokenBlacklist] REDIS_URL not configured, using memory-based blacklist (not suitable for production)');
      tokenBlacklistInstance = new MemoryTokenBlacklist();
    }
  }
  return tokenBlacklistInstance;
}

/**
 * Set a custom token blacklist implementation
 * Use this to inject a Redis or database-backed implementation
 */
export function setTokenBlacklist(blacklist: ITokenBlacklist): void {
  tokenBlacklistInstance = blacklist;
}

/**
 * Helper to extract token expiration from JWT payload
 * @param token - JWT token string
 * @returns Expiration date or null if invalid
 */
export function getTokenExpiration(token: string): Date | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {return null;}

    const payload = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString('utf8'));
    if (payload.exp) {
      return new Date(payload.exp * 1000);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Helper to extract token issued-at time from JWT payload
 * @param token - JWT token string
 * @returns Issued-at date or null if invalid
 */
export function getTokenIssuedAt(token: string): Date | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {return null;}

    const payload = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString('utf8'));
    if (payload.iat) {
      return new Date(payload.iat * 1000);
    }
    return null;
  } catch {
    return null;
  }
}

export default {
  getTokenBlacklist,
  setTokenBlacklist,
  getTokenExpiration,
  getTokenIssuedAt,
  MemoryTokenBlacklist,
  RedisTokenBlacklist,
};
