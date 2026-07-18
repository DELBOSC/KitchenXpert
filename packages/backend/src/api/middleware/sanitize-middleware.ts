import { type Request, type Response, type NextFunction } from 'express';

/** Property names that corrupt an object's prototype when written via bracket access. */
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Input Sanitization Middleware
 *
 * Sanitizes user input to prevent XSS (Cross-Site Scripting) attacks.
 * This middleware sanitizes string values in:
 * - Request body
 * - Request query parameters
 * - Request params
 *
 * IMPORTANT: This is a defense-in-depth measure. You should also:
 * - Use Content-Security-Policy headers
 * - Encode output when rendering HTML
 * - Use parameterized queries for database operations
 *
 * For rich text content that needs HTML, consider using a library like
 * sanitize-html or DOMPurify with an allowlist of safe tags.
 */

/**
 * HTML entities to escape for XSS prevention
 */
const htmlEntities: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

/**
 * Escape HTML special characters in a string
 * @param str - String to escape
 * @returns Escaped string
 */
export function escapeHtml(str: string): string {
  return str.replace(/[&<>"'`=/]/g, (char) => htmlEntities[char] || char);
}

/**
 * Remove potentially dangerous patterns from input
 * This is a more aggressive sanitization for when HTML is not expected
 */
export function stripDangerousPatterns(str: string): string {
  return (
    str
      // Remove script tags and their content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remove event handlers
      .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '')
      // Remove javascript: and data: URLs
      .replace(/javascript\s*:/gi, '')
      .replace(/data\s*:/gi, '')
      // Remove vbscript: URLs (IE)
      .replace(/vbscript\s*:/gi, '')
      // Remove expression() CSS (IE)
      .replace(/expression\s*\([^)]*\)/gi, '')
  );
}

/**
 * Sanitization options
 */
export interface SanitizeOptions {
  /**
   * Whether to escape HTML entities (default: true)
   * Set to false if you need to allow some HTML
   */
  escapeHtml?: boolean;

  /**
   * Whether to strip dangerous patterns like script tags (default: true)
   */
  stripDangerous?: boolean;

  /**
   * Whether to trim whitespace from strings (default: true)
   */
  trim?: boolean;

  /**
   * Maximum string length (default: no limit)
   * Strings longer than this will be truncated
   */
  maxLength?: number;

  /**
   * Fields to skip sanitization (by path, e.g., 'body.htmlContent')
   */
  skipFields?: string[];

  /**
   * Whether to sanitize nested objects (default: true)
   */
  deep?: boolean;
}

const defaultOptions: SanitizeOptions = {
  escapeHtml: true,
  stripDangerous: true,
  trim: true,
  deep: true,
};

/**
 * Recursively sanitize a value
 */
function sanitizeValue(value: unknown, options: SanitizeOptions, path: string = ''): unknown {
  // Skip if path is in skipFields
  if (options.skipFields && options.skipFields.includes(path)) {
    return value;
  }

  // Handle null/undefined
  if (value === null || value === undefined) {
    return value;
  }

  // Handle strings
  if (typeof value === 'string') {
    let sanitized = value;

    // Trim whitespace
    if (options.trim) {
      sanitized = sanitized.trim();
    }

    // Strip dangerous patterns first
    if (options.stripDangerous) {
      sanitized = stripDangerousPatterns(sanitized);
    }

    // Then escape HTML
    if (options.escapeHtml) {
      sanitized = escapeHtml(sanitized);
    }

    // Truncate if needed
    if (options.maxLength && sanitized.length > options.maxLength) {
      sanitized = sanitized.substring(0, options.maxLength);
    }

    return sanitized;
  }

  // Handle arrays
  if (Array.isArray(value)) {
    if (!options.deep) {
      return value;
    }
    return value.map((item, index) => sanitizeValue(item, options, `${path}[${index}]`));
  }

  // Handle objects
  if (typeof value === 'object') {
    if (!options.deep) {
      return value;
    }

    const sanitizedObj: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      // Drop __proto__/constructor/prototype: a request body's own __proto__ key would
      // otherwise rebind this object's prototype (js/remote-property-injection).
      if (UNSAFE_KEYS.has(key)) {
        continue;
      }
      const newPath = path ? `${path}.${key}` : key;
      sanitizedObj[key] = sanitizeValue(val, options, newPath);
    }
    return sanitizedObj;
  }

  // Return numbers, booleans, etc. as-is
  return value;
}

/**
 * Create input sanitization middleware with custom options
 */
export function createSanitizeMiddleware(customOptions: SanitizeOptions = {}) {
  const options = { ...defaultOptions, ...customOptions };

  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      // Sanitize body
      if (req.body && typeof req.body === 'object') {
        req.body = sanitizeValue(req.body, options, 'body') as typeof req.body;
      }

      // Sanitize query parameters
      if (req.query && typeof req.query === 'object') {
        // Create a new query object since req.query might be read-only
        const sanitizedQuery: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(req.query)) {
          if (UNSAFE_KEYS.has(key)) {
            continue;
          }
          sanitizedQuery[key] = sanitizeValue(val, options, `query.${key}`);
        }
        req.query = sanitizedQuery as typeof req.query;
      }

      // Sanitize params
      if (req.params && typeof req.params === 'object') {
        const sanitizedParams: Record<string, string> = {};
        for (const [key, val] of Object.entries(req.params)) {
          if (UNSAFE_KEYS.has(key)) {
            continue;
          }
          const sanitized = sanitizeValue(val, options, `params.${key}`);
          sanitizedParams[key] = typeof sanitized === 'string' ? sanitized : String(sanitized);
        }
        req.params = sanitizedParams;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Default sanitization middleware
 * Sanitizes all string inputs with default options
 */
export const sanitizeInput = createSanitizeMiddleware();

// REMOVED: sanitizeInputLight (escapeHtml: false). It was never mounted on any route, and
// it was a footgun: escape-off makes the hand-rolled stripDangerousPatterns the SOLE XSS
// defense — and that stripper is single-pass (CodeQL js/incomplete-multi-character-
// sanitization / bad-tag-filter), so `<scr<script>ipt>` survives it. The mounted paths
// (sanitizeInput / sanitizeInputStrict) run escapeHtml AFTER, which neutralises anything
// the stripper misses. Nothing needed the escape-off variant, so the capability is gone
// rather than guarded — a route that mounted it would have turned those alerts real.

/**
 * Strict sanitization - escape HTML and limit string length
 * Use for user-facing inputs like comments
 */
export const sanitizeInputStrict = createSanitizeMiddleware({
  escapeHtml: true,
  stripDangerous: true,
  trim: true,
  maxLength: 10000,
});

/**
 * Utility to sanitize a single string value
 * Useful for sanitizing individual values outside the middleware
 */
export function sanitizeString(value: string, options: Partial<SanitizeOptions> = {}): string {
  const opts = { ...defaultOptions, ...options };
  const result = sanitizeValue(value, opts);
  return typeof result === 'string' ? result : value;
}

/**
 * Utility to check if a string contains potentially dangerous content
 * Use for validation before processing
 */
export function containsDangerousContent(str: string): boolean {
  const dangerousPatterns = [
    /<script/i,
    /javascript\s*:/i,
    /data\s*:/i,
    /vbscript\s*:/i,
    /on\w+\s*=/i,
    /expression\s*\(/i,
  ];

  return dangerousPatterns.some((pattern) => pattern.test(str));
}

export default sanitizeInput;
