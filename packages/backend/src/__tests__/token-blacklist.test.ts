/**
 * Token Blacklist Tests
 * Tests for MemoryTokenBlacklist, helper functions, and Redis blacklist interface
 */

import jwt from 'jsonwebtoken';

import {
  MemoryTokenBlacklist,
  RedisTokenBlacklist,
  getTokenExpiration,
  getTokenIssuedAt,
} from '../auth/token-blacklist';
import { getRedisClient } from '../database/redis-client';
import logger from '../utils/logger';

jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// The Redis-backed blacklist now uses the shared node-redis singleton — mock it
// so we can drive both normal operation and the circuit-open (throw) path.
jest.mock('../database/redis-client', () => ({
  getRedisClient: jest.fn(),
}));

describe('MemoryTokenBlacklist', () => {
  let blacklist: MemoryTokenBlacklist;

  beforeEach(() => {
    // Disable auto-cleanup for tests
    blacklist = new MemoryTokenBlacklist(0);
  });

  afterEach(() => {
    blacklist.stopAutoCleanup();
    blacklist.clear();
  });

  // ==================== TOKEN BLACKLISTING ====================

  describe('addToBlacklist / isBlacklisted', () => {
    it('should blacklist a token', async () => {
      const token = 'test-token-123';
      const expiresAt = new Date(Date.now() + 60000);

      await blacklist.addToBlacklist(token, expiresAt);

      expect(await blacklist.isBlacklisted(token)).toBe(true);
    });

    it('should return false for non-blacklisted token', async () => {
      expect(await blacklist.isBlacklisted('unknown-token')).toBe(false);
    });

    it('should auto-expire blacklisted tokens', async () => {
      const token = 'expired-token';
      const expiresAt = new Date(Date.now() - 1000); // Already expired

      await blacklist.addToBlacklist(token, expiresAt);

      expect(await blacklist.isBlacklisted(token)).toBe(false);
    });

    it('should hash tokens (same token matches)', async () => {
      const token = 'my-secret-token';
      const expiresAt = new Date(Date.now() + 60000);

      await blacklist.addToBlacklist(token, expiresAt);

      // Same token string should still be found
      expect(await blacklist.isBlacklisted(token)).toBe(true);
      // Different token should not match
      expect(await blacklist.isBlacklisted('different-token')).toBe(false);
    });
  });

  // ==================== USER BLACKLISTING ====================

  describe('blacklistUserTokens / isUserBlacklisted', () => {
    it('should blacklist all user tokens', async () => {
      const userId = 'user-123';
      const expiresAt = new Date(Date.now() + 60000);
      const tokenIssuedBefore = new Date(Date.now() - 1000);

      await blacklist.blacklistUserTokens(userId, expiresAt);

      expect(await blacklist.isUserBlacklisted(userId, tokenIssuedBefore)).toBe(true);
    });

    it('should allow tokens issued after blacklist time', async () => {
      const userId = 'user-123';
      const expiresAt = new Date(Date.now() + 60000);

      await blacklist.blacklistUserTokens(userId, expiresAt);

      // Token issued AFTER blacklisting should be valid
      const tokenIssuedAfter = new Date(Date.now() + 1000);
      expect(await blacklist.isUserBlacklisted(userId, tokenIssuedAfter)).toBe(false);
    });

    it('should return false for non-blacklisted user', async () => {
      expect(await blacklist.isUserBlacklisted('unknown-user', new Date())).toBe(false);
    });

    it('should auto-expire user blacklist entries', async () => {
      const userId = 'user-123';
      const expiresAt = new Date(Date.now() - 1000); // Already expired

      await blacklist.blacklistUserTokens(userId, expiresAt);

      expect(await blacklist.isUserBlacklisted(userId, new Date(Date.now() - 2000))).toBe(false);
    });
  });

  // ==================== CLEANUP ====================

  describe('cleanup', () => {
    it('should clean up expired token entries', async () => {
      await blacklist.addToBlacklist('token-1', new Date(Date.now() - 1000));
      await blacklist.addToBlacklist('token-2', new Date(Date.now() + 60000));

      const cleaned = await blacklist.cleanup();

      expect(cleaned).toBe(1);
      expect(await blacklist.isBlacklisted('token-2')).toBe(true);
    });

    it('should clean up expired user entries', async () => {
      await blacklist.blacklistUserTokens('user-1', new Date(Date.now() - 1000));
      await blacklist.blacklistUserTokens('user-2', new Date(Date.now() + 60000));

      const cleaned = await blacklist.cleanup();

      expect(cleaned).toBe(1);
    });
  });

  // ==================== STATS ====================

  describe('getStats', () => {
    it('should return correct counts', async () => {
      await blacklist.addToBlacklist('token-1', new Date(Date.now() + 60000));
      await blacklist.addToBlacklist('token-2', new Date(Date.now() + 60000));
      await blacklist.blacklistUserTokens('user-1', new Date(Date.now() + 60000));

      const stats = blacklist.getStats();

      expect(stats.tokenCount).toBe(2);
      expect(stats.userCount).toBe(1);
    });
  });

  describe('clear', () => {
    it('should clear all entries', async () => {
      await blacklist.addToBlacklist('token-1', new Date(Date.now() + 60000));
      await blacklist.blacklistUserTokens('user-1', new Date(Date.now() + 60000));

      blacklist.clear();

      const stats = blacklist.getStats();
      expect(stats.tokenCount).toBe(0);
      expect(stats.userCount).toBe(0);
    });
  });
});

// ==================== HELPER FUNCTIONS ====================

describe('getTokenExpiration', () => {
  it('should extract expiration from a valid JWT', () => {
    const token = jwt.sign({ userId: 'test' }, 'test-secret-32-chars-long-for-test', {
      expiresIn: 900,
    });

    const expiration = getTokenExpiration(token);

    expect(expiration).toBeInstanceOf(Date);
    expect(expiration!.getTime()).toBeGreaterThan(Date.now());
  });

  it('should return null for invalid token', () => {
    expect(getTokenExpiration('not-a-jwt')).toBeNull();
  });

  it('should return null for token without exp claim', () => {
    // Create a token without exp by manually encoding
    const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ userId: 'test' })).toString('base64url');
    const token = `${header}.${payload}.sig`;

    expect(getTokenExpiration(token)).toBeNull();
  });
});

describe('getTokenIssuedAt', () => {
  it('should extract iat from a valid JWT', () => {
    const token = jwt.sign({ userId: 'test' }, 'test-secret-32-chars-long-for-test');

    const issuedAt = getTokenIssuedAt(token);

    expect(issuedAt).toBeInstanceOf(Date);
    expect(issuedAt!.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('should return null for invalid token', () => {
    expect(getTokenIssuedAt('invalid')).toBeNull();
  });
});

describe('RedisTokenBlacklist', () => {
  const mockGetRedisClient = getRedisClient as jest.MockedFunction<typeof getRedisClient>;
  const warn = (logger as unknown as { warn: jest.Mock }).warn;

  let redisMock: { setEx: jest.Mock; get: jest.Mock };
  let blacklist: RedisTokenBlacklist;

  beforeEach(() => {
    jest.clearAllMocks();
    redisMock = { setEx: jest.fn().mockResolvedValue('OK'), get: jest.fn() };
    mockGetRedisClient.mockResolvedValue(redisMock as never);
    blacklist = new RedisTokenBlacklist();
  });

  describe('normal operation (client reachable)', () => {
    it('addToBlacklist writes via setEx (key, positive ttl, "1")', async () => {
      await blacklist.addToBlacklist('tok', new Date(Date.now() + 60_000));
      expect(redisMock.setEx).toHaveBeenCalledTimes(1);
      const [key, ttl, val] = redisMock.setEx.mock.calls[0] as [string, number, string];
      expect(key).toMatch(/^token_blacklist:token:/);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(60);
      expect(val).toBe('1');
    });

    it('does NOT write when the token is already expired (ttl <= 0)', async () => {
      await blacklist.addToBlacklist('tok', new Date(Date.now() - 1000));
      expect(redisMock.setEx).not.toHaveBeenCalled();
    });

    it('isBlacklisted → true when the key exists, false when null', async () => {
      redisMock.get.mockResolvedValueOnce('1');
      await expect(blacklist.isBlacklisted('tok')).resolves.toBe(true);
      redisMock.get.mockResolvedValueOnce(null);
      await expect(blacklist.isBlacklisted('tok')).resolves.toBe(false);
    });

    it('isUserBlacklisted compares tokenIssuedAt to the stored invalidBefore', async () => {
      const invalidBefore = Date.now();
      redisMock.get.mockResolvedValue(String(invalidBefore));
      // issued before the cutoff → blacklisted
      await expect(blacklist.isUserBlacklisted('u1', new Date(invalidBefore - 1000))).resolves.toBe(
        true
      );
      // issued after → not
      await expect(blacklist.isUserBlacklisted('u1', new Date(invalidBefore + 1000))).resolves.toBe(
        false
      );
    });
  });

  describe('circuit-open / Redis unreachable (fail-open, per audit decision)', () => {
    beforeEach(() => {
      // Mirrors getRedisClient throwing RedisCircuitOpenError when the breaker is open.
      mockGetRedisClient.mockRejectedValue(
        new Error('Redis circuit open (500ms ago); retry after cooldown')
      );
    });

    it('isBlacklisted → false (fail-open) + logs a warning (never silent)', async () => {
      await expect(blacklist.isBlacklisted('tok')).resolves.toBe(false);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toMatch(/fail-open|NOT checked/i);
    });

    it('isUserBlacklisted → false (fail-open) + warning', async () => {
      await expect(blacklist.isUserBlacklisted('u1', new Date())).resolves.toBe(false);
      expect(warn).toHaveBeenCalledTimes(1);
    });

    it('addToBlacklist does NOT throw on outage (logout stays functional) + warning', async () => {
      await expect(
        blacklist.addToBlacklist('tok', new Date(Date.now() + 60_000))
      ).resolves.toBeUndefined();
      expect(warn).toHaveBeenCalledTimes(1);
    });

    it('blacklistUserTokens does NOT throw on outage + warning', async () => {
      await expect(
        blacklist.blacklistUserTokens('u1', new Date(Date.now() + 60_000))
      ).resolves.toBeUndefined();
      expect(warn).toHaveBeenCalledTimes(1);
    });
  });
});
