import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { getRedisClient } from '../../database/redis-client';
import logger from '../../utils/logger';

/**
 * CSRF Protection Middleware
 *
 * This middleware provides Cross-Site Request Forgery protection for traditional
 * form-based requests. API endpoints using JWT authentication in the Authorization
 * header are inherently protected against CSRF and can skip this validation.
 *
 * Token storage uses Redis with automatic TTL-based expiry, making this safe
 * for distributed / multi-instance deployments.
 *
 * Usage:
 * - Generate a token using generateCsrfToken() and include it in forms
 * - Send the token via the X-CSRF-Token header or _csrf body/query parameter
 * - Validate on state-changing requests (POST, PUT, PATCH, DELETE)
 */

// Configuration
const CSRF_TOKEN_TTL_SECONDS = 3600; // 1 hour
const CSRF_TOKEN_EXPIRY_MS = CSRF_TOKEN_TTL_SECONDS * 1000;
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_COOKIE_NAME = 'csrf-token';

/**
 * Build the Redis key for a CSRF token.
 * Pattern: csrf:{sessionId}:{token}
 */
function csrfRedisKey(sessionId: string, token: string): string {
  return `csrf:${sessionId}:${token}`;
}

/**
 * Generate a CSRF token for a session and store it in Redis.
 * @param sessionId - Unique session identifier (can be user ID or session ID)
 * @returns Generated CSRF token
 */
export async function generateCsrfToken(sessionId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');

  try {
    const redis = await getRedisClient();
    await redis.set(csrfRedisKey(sessionId, token), '1', { EX: CSRF_TOKEN_TTL_SECONDS });
  } catch (err) {
    logger.warn('[CSRF] Failed to store token in Redis, token will not be validatable', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return token;
}

/**
 * Validate a CSRF token by checking Redis.
 * @param sessionId - Unique session identifier
 * @param token - Token to validate
 * @returns True if token exists (and has not expired via Redis TTL)
 */
export async function validateCsrfToken(sessionId: string, token: string): Promise<boolean> {
  try {
    const redis = await getRedisClient();
    const key = csrfRedisKey(sessionId, token);
    const value = await redis.get(key);

    if (!value) {
      return false;
    }

    // Consume the token after validation (single-use)
    await redis.del(key);
    return true;
  } catch (err) {
    logger.warn('[CSRF] Failed to validate token in Redis', {
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

/**
 * Remove a CSRF token from Redis (e.g., on logout).
 * When sessionId is provided without a specific token this is a no-op;
 * callers who need to revoke a specific token should pass both values.
 * @param sessionId - Unique session identifier
 * @param token - Optional specific token to remove
 */
export async function removeCsrfToken(sessionId: string, token?: string): Promise<void> {
  if (!token) {
    // Without a specific token we cannot construct the key.
    // In the Redis model, tokens expire via TTL automatically.
    return;
  }

  try {
    const redis = await getRedisClient();
    await redis.del(csrfRedisKey(sessionId, token));
  } catch (err) {
    logger.warn('[CSRF] Failed to remove token from Redis', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Check if a request uses JWT authentication
 * API requests with JWT Bearer tokens are protected by the token itself
 */
function hasJwtAuthentication(req: Request): boolean {
  const authHeader = req.headers.authorization;
  return !!authHeader && authHeader.startsWith('Bearer ');
}

/**
 * Check if the request method requires CSRF validation
 */
function isStateChangingMethod(method: string): boolean {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
}

/**
 * Extract CSRF token from request
 * Checks header, body, and query parameters
 */
function extractCsrfToken(req: Request): string | undefined {
  // Check header first (preferred method)
  const headerToken = req.headers[CSRF_HEADER_NAME] as string | undefined;
  if (headerToken) {
    return headerToken;
  }

  // Check body
  if (req.body && typeof req.body._csrf === 'string') {
    return req.body._csrf;
  }

  // Check query
  if (req.query && typeof req.query._csrf === 'string') {
    return req.query._csrf;
  }

  return undefined;
}

/**
 * Get session identifier from request
 * Uses user ID if authenticated, falls back to session cookie
 */
function getSessionId(req: Request): string | undefined {
  // If user is authenticated, use their ID
  if (req.user?.userId) {
    return req.user.userId;
  }

  // Fall back to session cookie or IP-based identifier
  // In production, use a proper session ID from cookie-session or express-session
  const sessionCookie = req.cookies?.[CSRF_COOKIE_NAME];
  if (sessionCookie) {
    return sessionCookie;
  }

  return undefined;
}

/**
 * CSRF Protection Middleware
 *
 * Skips validation for:
 * - Safe methods (GET, HEAD, OPTIONS)
 * - Requests with JWT Bearer authentication (protected by token)
 *
 * Validates for:
 * - State-changing requests (POST, PUT, PATCH, DELETE) without JWT
 */
export function csrfProtection(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Skip for safe methods
  if (!isStateChangingMethod(req.method)) {
    return next();
  }

  // Skip for API requests with JWT authentication
  // JWT tokens in Authorization header provide inherent CSRF protection
  if (hasJwtAuthentication(req)) {
    return next();
  }

  // For cookie-based auth or form submissions, validate CSRF token
  const sessionId = getSessionId(req);
  if (!sessionId) {
    // No session, no CSRF validation needed (will fail auth anyway)
    return next();
  }

  const token = extractCsrfToken(req);

  if (!token) {
    res.status(403).json({
      success: false,
      error: {
        message: 'CSRF token missing',
        code: 'CSRF_TOKEN_MISSING',
      },
    });
    return;
  }

  validateCsrfToken(sessionId, token)
    .then((isValid) => {
      if (!isValid) {
        res.status(403).json({
          success: false,
          error: {
            message: 'CSRF token invalid or expired',
            code: 'CSRF_TOKEN_INVALID',
          },
        });
        return;
      }

      next();
    })
    .catch((err) => {
      logger.error('[CSRF] Unexpected error during token validation', {
        error: err instanceof Error ? err.message : String(err),
      });
      res.status(500).json({
        success: false,
        error: {
          message: 'Internal server error',
          code: 'CSRF_VALIDATION_ERROR',
        },
      });
    });
}

/**
 * Middleware to generate and attach CSRF token
 * Use this for routes that render forms
 */
export function attachCsrfToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const sessionId = getSessionId(req);

  if (sessionId) {
    generateCsrfToken(sessionId)
      .then((token) => {
        // Attach token to response locals for template rendering
        res.locals.csrfToken = token;

        // Also set as cookie for JavaScript access
        res.cookie(CSRF_COOKIE_NAME, token, {
          httpOnly: false, // Allow JS access for AJAX requests
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: CSRF_TOKEN_EXPIRY_MS,
        });

        next();
      })
      .catch((err) => {
        logger.error('[CSRF] Failed to generate token', {
          error: err instanceof Error ? err.message : String(err),
        });
        next();
      });
  } else {
    next();
  }
}

/**
 * Create CSRF protection middleware with custom options
 */
export interface CsrfOptions {
  /**
   * Skip CSRF validation for specific paths
   */
  skipPaths?: string[];

  /**
   * Custom function to determine if CSRF should be skipped
   */
  shouldSkip?: (req: Request) => boolean;
}

export function createCsrfProtection(options: CsrfOptions = {}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Check custom skip function
    if (options.shouldSkip && options.shouldSkip(req)) {
      return next();
    }

    // Check skip paths
    if (options.skipPaths && options.skipPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    return csrfProtection(req, res, next);
  };
}

export default csrfProtection;
