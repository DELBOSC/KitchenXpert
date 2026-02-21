/**
 * Rate Limiter Configuration
 * Protects against DoS/DDoS attacks and brute force attempts
 *
 * Dependencies: express-rate-limit, rate-limit-redis
 * Usage: Apply to Express routes/middleware
 */

const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redis = require('redis');

/**
 * Create Redis client for distributed rate limiting
 * Falls back to memory store if Redis is unavailable
 */
const createRedisClient = () => {
  if (!process.env.REDIS_URL) {
    console.warn('REDIS_URL not configured. Using memory store for rate limiting (not recommended for production)');
    return null;
  }

  try {
    const client = redis.createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('Redis connection failed after 10 retries');
            return new Error('Redis connection failed');
          }
          return Math.min(retries * 50, 500);
        }
      }
    });

    client.on('error', (err) => console.error('Redis Client Error', err));
    client.on('connect', () => console.log('Redis Client Connected for Rate Limiting'));

    return client;
  } catch (error) {
    console.error('Failed to create Redis client:', error);
    return null;
  }
};

const redisClient = createRedisClient();

/**
 * Custom handler for rate limit exceeded
 */
const rateLimitHandler = (req, res) => {
  res.status(429).json({
    success: false,
    error: 'Too many requests',
    message: 'You have exceeded the rate limit. Please try again later.',
    retryAfter: res.getHeader('Retry-After')
  });
};

/**
 * Custom key generator for IP and user-based limiting
 */
const keyGenerator = (req) => {
  // Prefer authenticated user ID over IP
  if (req.user && req.user.id) {
    return `user:${req.user.id}`;
  }

  // Get IP from various headers (proxy-aware)
  const ip = req.ip
    || req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || req.connection.remoteAddress
    || 'unknown';

  return `ip:${ip}`;
};

/**
 * Skip rate limiting in certain conditions
 */
const skipSuccessfulRequests = false; // Count all requests
const skipFailedRequests = false; // Count failed requests too

/**
 * Base configuration factory
 */
const createRateLimiter = (options = {}) => {
  const config = {
    windowMs: options.windowMs || 60 * 1000, // Default: 1 minute
    max: options.max || 100, // Default: 100 requests per window
    message: options.message || 'Too many requests, please try again later.',
    handler: options.handler || rateLimitHandler,
    keyGenerator: options.keyGenerator || keyGenerator,
    skipSuccessfulRequests: options.skipSuccessfulRequests || skipSuccessfulRequests,
    skipFailedRequests: options.skipFailedRequests || skipFailedRequests,
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    ...options
  };

  // Add Redis store if available
  if (redisClient) {
    config.store = new RedisStore({
      client: redisClient,
      prefix: options.prefix || 'rl:',
      sendCommand: (...args) => redisClient.sendCommand(args)
    });
  }

  return rateLimit(config);
};

/**
 * Authentication endpoints rate limiter
 * Very strict to prevent brute force attacks
 */
const authLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_AUTH_MAX) || 5, // 5 requests per minute
  message: 'Too many authentication attempts. Please try again later.',
  prefix: 'rl:auth:',
  skipSuccessfulRequests: false // Count successful login attempts too
});

/**
 * Strict login rate limiter (per IP)
 * Prevents credential stuffing
 */
const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_LOGIN_MAX) || 10, // 10 attempts per 15 min
  message: 'Too many login attempts. Please try again after 15 minutes.',
  prefix: 'rl:login:',
  skipSuccessfulRequests: true, // Only count failed attempts
  skipFailedRequests: false
});

/**
 * Registration rate limiter
 * Prevents mass account creation
 */
const registerLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: parseInt(process.env.RATE_LIMIT_REGISTER_MAX) || 3, // 3 registrations per hour
  message: 'Too many accounts created. Please try again later.',
  prefix: 'rl:register:'
});

/**
 * Password reset rate limiter
 * Prevents abuse of password reset functionality
 */
const passwordResetLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: parseInt(process.env.RATE_LIMIT_PASSWORD_RESET_MAX) || 3, // 3 resets per hour
  message: 'Too many password reset requests. Please try again later.',
  prefix: 'rl:password-reset:'
});

/**
 * API endpoints rate limiter
 * Moderate limits for general API usage
 */
const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_API_MAX) || 100, // 100 requests per minute
  message: 'API rate limit exceeded. Please slow down your requests.',
  prefix: 'rl:api:'
});

/**
 * Strict API limiter for sensitive operations
 */
const strictApiLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_API_STRICT_MAX) || 20, // 20 requests per minute
  message: 'API rate limit exceeded for sensitive operation.',
  prefix: 'rl:api:strict:'
});

/**
 * Public endpoints rate limiter
 * More generous limits for public access
 */
const publicLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_PUBLIC_MAX) || 1000, // 1000 requests per minute
  message: 'Too many requests. Please try again later.',
  prefix: 'rl:public:'
});

/**
 * File upload rate limiter
 * Prevents abuse of upload endpoints
 */
const uploadLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: parseInt(process.env.RATE_LIMIT_UPLOAD_MAX) || 50, // 50 uploads per hour
  message: 'Too many file uploads. Please try again later.',
  prefix: 'rl:upload:'
});

/**
 * Search/Query rate limiter
 * Prevents expensive search operations abuse
 */
const searchLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_SEARCH_MAX) || 30, // 30 searches per minute
  message: 'Too many search requests. Please slow down.',
  prefix: 'rl:search:'
});

/**
 * Global rate limiter (fallback)
 * Catches all endpoints not covered by specific limiters
 */
const globalLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_GLOBAL_MAX) || 500, // 500 requests per minute
  message: 'Too many requests from this IP. Please try again later.',
  prefix: 'rl:global:'
});

/**
 * Create custom rate limiter with specific options
 * @param {Object} options - Rate limiter options
 * @returns {Function} Express middleware
 */
const createCustomLimiter = (options) => {
  return createRateLimiter(options);
};

/**
 * Cleanup function for graceful shutdown
 */
const cleanup = async () => {
  if (redisClient) {
    try {
      await redisClient.quit();
      console.log('Redis client disconnected for rate limiting');
    } catch (error) {
      console.error('Error disconnecting Redis client:', error);
    }
  }
};

module.exports = {
  // Pre-configured limiters
  authLimiter,
  loginLimiter,
  registerLimiter,
  passwordResetLimiter,
  apiLimiter,
  strictApiLimiter,
  publicLimiter,
  uploadLimiter,
  searchLimiter,
  globalLimiter,

  // Factory functions
  createRateLimiter,
  createCustomLimiter,

  // Utilities
  keyGenerator,
  rateLimitHandler,
  cleanup,

  // Redis client (for external use if needed)
  redisClient
};
