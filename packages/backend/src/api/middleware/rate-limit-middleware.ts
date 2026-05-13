import { type Request, type Response } from 'express';
import rateLimit, { type RateLimitRequestHandler, type Options } from 'express-rate-limit';

/**
 * Rate Limiting Middleware for KitchenXpert API
 *
 * Protects against brute force attacks and API abuse by limiting
 * the number of requests a client can make within a time window.
 *
 * IMPORTANT: Memory Store Limitation
 * ==================================
 * This implementation uses the default memory store, which:
 * - Does NOT persist across server restarts
 * - Does NOT share state across multiple server instances
 * - Is NOT suitable for production deployments with load balancing
 *
 * PRODUCTION RECOMMENDATION: Use Redis Store
 * ==========================================
 * For production environments, use rate-limit-redis package:
 *
 * ```typescript
 * import RedisStore from 'rate-limit-redis';
 * import { createClient } from 'redis';
 *
 * const redisClient = createClient({
 *   url: process.env.REDIS_URL || 'redis://localhost:6379',
 * });
 *
 * await redisClient.connect();
 *
 * const redisStore = new RedisStore({
 *   sendCommand: (...args: string[]) => redisClient.sendCommand(args),
 *   prefix: 'rl:', // Rate limit key prefix
 * });
 *
 * // Use in rate limiter options:
 * const rateLimiterWithRedis = rateLimit({
 *   ...baseOptions,
 *   store: redisStore,
 * });
 * ```
 *
 * ENVIRONMENT VARIABLES:
 * - REDIS_URL: Redis connection URL for distributed rate limiting
 * - INTERNAL_API_KEY: Key to bypass rate limiting for internal services
 *
 * CONFIGURATION:
 * Rate limits can be customized via environment variables (recommended for production):
 * - RATE_LIMIT_GENERAL_MAX: Max requests for general endpoints (default: 100)
 * - RATE_LIMIT_AUTH_MAX: Max requests for auth endpoints (default: 5)
 * - RATE_LIMIT_WINDOW_MS: Time window in ms (default: 900000 = 15 min)
 */

// Custom key generator - uses IP + user ID if authenticated
const keyGenerator = (req: Request): string => {
  const userId = req.user?.userId;
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  // Combine IP and user ID for more granular limiting
  return userId ? `${ip}-${userId}` : ip;
};

// Custom handler for rate limit exceeded
const rateLimitHandler = (_req: Request, res: Response): void => {
  res.status(429).json({
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
      retryAfter: res.getHeader('Retry-After'),
    },
  });
};

// Skip rate limiting for certain conditions
const skipFunction = (req: Request): boolean => {
  // Skip for health checks
  if (req.path === '/health' || req.path === '/api/health') {
    return true;
  }

  // Skip for internal requests (if configured)
  const internalKey = req.headers['x-internal-key'];
  if (internalKey && internalKey === process.env.INTERNAL_API_KEY) {
    return true;
  }

  return false;
};

// Base rate limit options
const baseOptions: Partial<Options> = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  keyGenerator,
  handler: rateLimitHandler,
  skip: skipFunction,
};

/**
 * General API rate limiter
 * 100 requests per 15 minutes
 */
export const generalRateLimiter: RateLimitRequestHandler = rateLimit({
  ...baseOptions,
  max: 100,
  message: 'Too many requests from this IP, please try again after 15 minutes',
});

/**
 * Strict rate limiter for authentication endpoints
 * 5 requests per 15 minutes (login, register, password reset)
 */
export const authRateLimiter: RateLimitRequestHandler = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many authentication attempts, please try again after 15 minutes',
  skipSuccessfulRequests: false, // Count all requests
});

/**
 * Login-specific rate limiter
 * 5 failed attempts per 15 minutes, then block
 */
export const loginRateLimiter: RateLimitRequestHandler = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again after 15 minutes',
  skipSuccessfulRequests: true, // Only count failed attempts
});

/**
 * Password reset rate limiter
 * 3 requests per hour
 */
export const passwordResetRateLimiter: RateLimitRequestHandler = rateLimit({
  ...baseOptions,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: 'Too many password reset requests, please try again after 1 hour',
});

/**
 * API rate limiter for authenticated users
 * 1000 requests per 15 minutes
 */
export const apiRateLimiter: RateLimitRequestHandler = rateLimit({
  ...baseOptions,
  max: 1000,
  message: 'API rate limit exceeded, please try again later',
});

/**
 * Upload rate limiter
 * 10 uploads per hour
 */
export const uploadRateLimiter: RateLimitRequestHandler = rateLimit({
  ...baseOptions,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Too many uploads, please try again after 1 hour',
});

/**
 * AI endpoint rate limiter
 * 20 AI requests per hour (expensive operations)
 */
export const aiRateLimiter: RateLimitRequestHandler = rateLimit({
  ...baseOptions,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: 'AI rate limit exceeded, please try again after 1 hour',
});

/**
 * Partner API rate limiter
 * Based on partner tier:
 * - Basic: 100/hour
 * - Pro: 1000/hour
 * - Enterprise: 10000/hour
 */
export const partnerRateLimiter: RateLimitRequestHandler = rateLimit({
  ...baseOptions,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: (req: Request): number => {
    const partnerTier = (req as any).partner?.tier;
    switch (partnerTier) {
      case 'enterprise':
        return 10000;
      case 'pro':
        return 1000;
      case 'basic':
      default:
        return 100;
    }
  },
  message: 'Partner API rate limit exceeded',
});

/**
 * Webhook rate limiter
 * 50 webhook registrations per hour
 */
export const webhookRateLimiter: RateLimitRequestHandler = rateLimit({
  ...baseOptions,
  windowMs: 60 * 60 * 1000,
  max: 50,
  message: 'Too many webhook operations, please try again later',
});

/**
 * Catalog browsing rate limiter
 * 60 requests per minute per IP. The catalog endpoints (`/catalog`,
 * `/products`, `/ikea`, `/leroy-merlin`, `/castorama`, `/bosch`,
 * `/schmidt`) are unauthenticated discovery surfaces, so we cap them
 * tightly to deter scrapers and keep our partner-API quotas safe.
 */
export const catalogRateLimiter: RateLimitRequestHandler = rateLimit({
  ...baseOptions,
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: 'Catalog browse rate limit exceeded — slow down or sign in for a higher quota',
});

/**
 * Renovation Vision rate limiter — Claude Vision is expensive,
 * cap to 10 analyses/hour per user. Lives here instead of inline in
 * renovation-routes.ts because ts-jest mishandles the express-rate-limit
 * default export when the import is in a route file directly loaded by
 * a test that mocks this middleware. Centralising the import here works.
 */
export const renovationAnalysisRateLimiter: RateLimitRequestHandler = rateLimit({
  ...baseOptions,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT', message: 'Trop d\'analyses. Réessayez dans une heure.' },
  },
});

/**
 * AI rate limiter for UNAUTHENTICATED users.
 * 5 AI requests per hour per IP. Authenticated users use `aiRateLimiter`
 * (20/hour). The split prevents anonymous abuse of expensive Anthropic
 * / Gemini calls while keeping a small free trial alive.
 *
 * `skip` lets authenticated users through immediately so they hit the
 * downstream per-user limit instead of being throttled at the IP layer.
 */
export const aiUnauthRateLimiter: RateLimitRequestHandler = rateLimit({
  ...baseOptions,
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyGenerator: (req: Request): string => req.ip || req.socket.remoteAddress || 'unknown',
  skip: (req: Request): boolean => {
    if (skipFunction(req)) {return true;}          // /health + INTERNAL_API_KEY
    return Boolean(req.user?.userId);            // logged-in user → use aiRateLimiter
  },
  message: 'AI usage limit reached — sign in to continue using the assistant',
});

/**
 * Export default general limiter
 */
export default generalRateLimiter;
