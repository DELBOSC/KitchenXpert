/**
 * Structured Request Logging Middleware
 *
 * Production-grade HTTP request/response logging that integrates with
 * the existing Winston logger. Outputs structured JSON in production
 * and colored dev-friendly format in development.
 *
 * Features:
 * - Logs method, url, status, response time, and content-length
 * - Skips health check endpoints (/health, /api/v1/health)
 * - Includes X-Request-Id header if present
 * - Status-aware log levels (5xx = error, 4xx = warn, rest = info)
 * - Redacts sensitive query parameters (token, key, secret, password)
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/** Paths to skip logging (health checks generate too much noise) */
const SKIP_PATHS = new Set(['/health', '/api/v1/health']);

/** Query parameter keys whose values should be redacted */
const SENSITIVE_PARAMS = new Set(['token', 'key', 'secret', 'password', 'apikey', 'api_key', 'authorization']);

/**
 * Redact sensitive query parameters from the URL for logging.
 */
function redactUrl(originalUrl: string): string {
  const questionMarkIndex = originalUrl.indexOf('?');
  if (questionMarkIndex === -1) {
    return originalUrl;
  }

  const path = originalUrl.substring(0, questionMarkIndex);
  const queryString = originalUrl.substring(questionMarkIndex + 1);
  const params = new URLSearchParams(queryString);
  let redacted = false;

  for (const key of params.keys()) {
    if (SENSITIVE_PARAMS.has(key.toLowerCase())) {
      params.set(key, '[REDACTED]');
      redacted = true;
    }
  }

  return redacted ? `${path}?${params.toString()}` : originalUrl;
}

/**
 * Get the appropriate winston log level based on HTTP status code.
 */
function getLogLevel(statusCode: number): 'error' | 'warn' | 'info' {
  if (statusCode >= 500) return 'error';
  if (statusCode >= 400) return 'warn';
  return 'info';
}

/**
 * Format bytes into a human-readable string for dev output.
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * Get color code for status in dev format.
 */
function statusColor(status: number): string {
  if (status >= 500) return '\x1b[31m'; // red
  if (status >= 400) return '\x1b[33m'; // yellow
  if (status >= 300) return '\x1b[36m'; // cyan
  if (status >= 200) return '\x1b[32m'; // green
  return '\x1b[0m';
}

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';

/**
 * Express middleware for structured request logging.
 *
 * Place this early in the middleware chain (after security headers, before routes)
 * so it captures the full response lifecycle.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  // Skip health check endpoints to reduce log noise
  if (SKIP_PATHS.has(req.path)) {
    next();
    return;
  }

  const startTime = process.hrtime.bigint();
  const requestId = req.headers['x-request-id'] as string | undefined;

  // Capture the original end method to intercept the response
  const originalEnd = res.end;

  // Override res.end to log after the response is sent
  res.end = function (this: Response, ...args: Parameters<Response['end']>): ReturnType<Response['end']> {
    // Restore original end
    res.end = originalEnd;

    // Call the original end
    const result = res.end.apply(this, args);

    // Calculate response time in milliseconds
    const endTime = process.hrtime.bigint();
    const responseTimeMs = Number(endTime - startTime) / 1_000_000;
    const responseTime = Math.round(responseTimeMs * 100) / 100;

    // Get content length from response header
    const contentLength = parseInt(res.getHeader('content-length') as string, 10) || 0;

    const statusCode = res.statusCode;
    const method = req.method;
    const url = redactUrl(req.originalUrl || req.url);
    const logLevel = getLogLevel(statusCode);

    if (IS_PRODUCTION) {
      // Structured JSON logging for production (parsed by log aggregators)
      const logData: Record<string, unknown> = {
        type: 'http',
        method,
        url,
        statusCode,
        responseTime,
        contentLength,
        userAgent: req.headers['user-agent'],
        ip: req.ip || req.socket.remoteAddress,
      };

      if (requestId) {
        logData.requestId = requestId;
      }

      // Include userId if available (set by auth middleware on authenticated routes)
      if (req.user?.userId) {
        logData.userId = req.user.userId;
      }

      logger.log(logLevel, `${method} ${url} ${statusCode}`, logData);
    } else {
      // Colored dev-friendly format for development
      const sc = statusColor(statusCode);
      const timeStr = responseTime < 100
        ? `${DIM}${responseTime}ms${RESET}`
        : responseTime < 1000
          ? `\x1b[33m${responseTime}ms${RESET}`
          : `\x1b[31m${responseTime}ms${RESET}`;

      const contentStr = contentLength > 0 ? ` ${DIM}${formatBytes(contentLength)}${RESET}` : '';
      const reqIdStr = requestId ? ` ${DIM}[${requestId}]${RESET}` : '';

      const message = `${BOLD}${method}${RESET} ${url} ${sc}${statusCode}${RESET} ${timeStr}${contentStr}${reqIdStr}`;

      logger.log(logLevel, message);
    }

    return result;
  } as typeof res.end;

  next();
}

export default requestLogger;
