/**
 * Token Blacklist Service (Redis-backed)
 *
 * Provides token blacklisting via Redis for logout, password changes,
 * and security revocation scenarios.
 *
 * Falls back gracefully if Redis is unavailable — in that case tokens
 * will NOT be blacklisted, which is acceptable for development but
 * should be addressed in production monitoring.
 */

import { getRedisClient } from '../database/redis-client';
import { createModuleLogger } from '../utils/logger';

const logger = createModuleLogger('token-blacklist-service');

const BLACKLIST_PREFIX = 'token:blacklist:';

export class TokenBlacklistService {
  /**
   * Add a single token to the blacklist with TTL matching token expiry.
   * The token will automatically be removed from Redis when its TTL expires.
   */
  static async blacklist(token: string, expiresInSeconds: number): Promise<void> {
    try {
      const redis = await getRedisClient();
      await redis.setEx(`${BLACKLIST_PREFIX}${token}`, expiresInSeconds, '1');
    } catch (error) {
      logger.error('[TokenBlacklist] Failed to blacklist token:', { error });
      // Fallback: continue without blacklisting (graceful degradation)
    }
  }

  /**
   * Check if a specific token is blacklisted.
   * Returns false on Redis errors (graceful degradation).
   */
  static async isBlacklisted(token: string): Promise<boolean> {
    try {
      const redis = await getRedisClient();
      const result = await redis.get(`${BLACKLIST_PREFIX}${token}`);
      return result !== null;
    } catch (error) {
      logger.error('[TokenBlacklist] Failed to check blacklist:', { error });
      return false; // Graceful degradation
    }
  }

  /**
   * Blacklist all tokens for a user (e.g., after password change).
   * Stores the current timestamp; any token issued before this timestamp
   * will be considered invalid.
   *
   * @param userId - The user's ID (from JWTPayload.userId)
   * @param expiresInSeconds - How long the user blacklist entry should persist (default 24h)
   */
  static async blacklistUser(userId: string, expiresInSeconds: number = 86400): Promise<void> {
    try {
      const redis = await getRedisClient();
      await redis.setEx(
        `${BLACKLIST_PREFIX}user:${userId}`,
        expiresInSeconds,
        Date.now().toString()
      );
    } catch (error) {
      logger.error('[TokenBlacklist] Failed to blacklist user tokens:', { error });
    }
  }

  /**
   * Check if a user's tokens are bulk-blacklisted.
   * Compares the token's issued-at time against the blacklist timestamp.
   *
   * @param userId - The user's ID (from JWTPayload.userId)
   * @param tokenIssuedAt - The token's `iat` claim as a Unix timestamp in milliseconds
   * @returns true if the token was issued before the blacklist event
   */
  static async isUserBlacklisted(userId: string, tokenIssuedAt: number): Promise<boolean> {
    try {
      const redis = await getRedisClient();
      const blacklistedAt = await redis.get(`${BLACKLIST_PREFIX}user:${userId}`);
      if (!blacklistedAt) return false;
      return tokenIssuedAt < parseInt(blacklistedAt, 10);
    } catch (error) {
      logger.error('[TokenBlacklist] Failed to check user blacklist:', { error });
      return false; // Graceful degradation
    }
  }
}
