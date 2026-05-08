import { type Request, type Response, type NextFunction } from 'express';
import helmet from 'helmet';

/**
 * Security Headers Middleware
 *
 * Configures security-related HTTP headers to protect against common attacks.
 * This builds on helmet's defaults with additional explicit configurations.
 *
 * Headers configured:
 * - Content-Security-Policy: Controls resource loading to prevent XSS
 * - X-Frame-Options: Prevents clickjacking
 * - X-Content-Type-Options: Prevents MIME type sniffing
 * - Referrer-Policy: Controls referrer information in requests
 * - Strict-Transport-Security: Enforces HTTPS
 * - X-XSS-Protection: Disabled (modern approach — rely on CSP instead)
 * - X-Download-Options: Prevents IE from executing downloads in site context
 * - X-Permitted-Cross-Domain-Policies: Prevents Adobe Flash/PDF cross-domain requests
 */

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Content Security Policy configuration
 * Customize based on your application's needs
 */
const contentSecurityPolicy = {
  directives: {
    // Default fallback for all resource types
    defaultSrc: ["'self'"],

    // Scripts - only from same origin, no inline scripts by default
    // Add 'unsafe-inline' or nonces if you need inline scripts
    scriptSrc: ["'self'"],

    // Styles - same origin only
    // Add 'unsafe-inline' if you have inline styles (many CSS-in-JS libs need this)
    styleSrc: ["'self'", "'unsafe-inline'"],

    // Images - same origin, data URIs, blobs, and external HTTPS (product images)
    imgSrc: ["'self'", 'data:', 'https:', 'blob:'],

    // Fonts - same origin
    fontSrc: ["'self'"],

    // Connect - API endpoints, Stripe, and WebSocket
    connectSrc: ["'self'", 'https://api.stripe.com', 'wss:'],

    // Media (audio/video) - same origin
    mediaSrc: ["'self'"],

    // Objects (plugins) - none allowed
    objectSrc: ["'none'"],

    // Frames - allow Stripe Elements iframe
    frameSrc: ['https://js.stripe.com'],

    // Child contexts (workers) - none allowed
    childSrc: ["'none'"],

    // Frame ancestors - no one can embed this site (clickjacking protection)
    frameAncestors: ["'none'"],

    // Form actions - only same origin
    formAction: ["'self'"],

    // Base URI - only same origin
    baseUri: ["'self'"],

    // Upgrade insecure requests in production
    ...(isProduction && {
      upgradeInsecureRequests: [],
    }),
  },
};

/**
 * Create helmet middleware with enhanced security headers
 */
export function createSecurityHeaders() {
  return helmet({
    // Content Security Policy — only enforce in production
    // In development, CSP would block HMR (hot module replacement) and dev tooling
    contentSecurityPolicy: isProduction ? contentSecurityPolicy : false,

    // X-Frame-Options: DENY - prevents any site from framing this page
    frameguard: {
      action: 'deny',
    },

    // X-Content-Type-Options: nosniff - prevents MIME type sniffing
    noSniff: true,

    // Referrer-Policy: strict-origin-when-cross-origin
    // Same-origin requests: full referrer
    // Cross-origin requests: only origin (no path)
    // HTTPS to HTTP: no referrer
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },

    // Strict-Transport-Security (HSTS)
    // Only in production to avoid issues with local development
    hsts: isProduction ? {
      maxAge: 31536000, // 1 year in seconds
      includeSubDomains: true,
      preload: true,
    } : false,

    // X-XSS-Protection: 0 (modern approach — rely on CSP instead of legacy XSS filter)
    // Setting to false disables helmet's default; we set the header manually below
    xXssProtection: false,

    // X-Download-Options: noopen
    // Prevents IE from executing downloads in the site's context
    ieNoOpen: true,

    // X-DNS-Prefetch-Control: off
    // Prevents browsers from doing DNS prefetching
    dnsPrefetchControl: {
      allow: false,
    },

    // X-Permitted-Cross-Domain-Policies: none
    // Prevents Adobe Flash and PDF from making cross-domain requests
    permittedCrossDomainPolicies: {
      permittedPolicies: 'none',
    },

    // Don't set X-Powered-By (remove framework identification)
    hidePoweredBy: true,
  });
}

/**
 * Additional security headers not covered by helmet
 * Apply these manually if needed
 */
export function additionalSecurityHeaders(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  // X-XSS-Protection: 0 — modern approach, rely on CSP instead of legacy XSS filter
  res.setHeader('X-XSS-Protection', '0');

  // Permissions-Policy (formerly Feature-Policy)
  // Restrict access to browser features; allow geolocation for store finder
  res.setHeader(
    'Permissions-Policy',
    [
      'accelerometer=()',
      'camera=()',
      'geolocation=(self)',
      'gyroscope=()',
      'magnetometer=()',
      'microphone=()',
      'payment=()',
      'usb=()',
    ].join(', ')
  );

  // Cross-Origin-Embedder-Policy
  // Requires cross-origin resources to be explicitly allowed
  // Note: Enable this carefully as it can break legitimate cross-origin resources
  // res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

  // Cross-Origin-Opener-Policy
  // Isolates the browsing context
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');

  // Cross-Origin-Resource-Policy
  // Restricts who can load this resource
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

  // Cache-Control for API responses
  // Prevent caching of sensitive data
  if (_req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  next();
}

/**
 * Combined security middleware
 * Applies both helmet and additional headers
 */
export function securityHeaders(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Apply helmet
  createSecurityHeaders()(req, res, (err) => {
    if (err) {
      return next(err);
    }
    // Apply additional headers
    additionalSecurityHeaders(req, res, next);
  });
}

/**
 * Create CSP header for specific use cases
 * Use this for routes that need different CSP settings
 */
export function createCustomCsp(customDirectives: Record<string, string[] | string | boolean>) {
  return helmet.contentSecurityPolicy({
    directives: {
      ...contentSecurityPolicy.directives,
      ...customDirectives,
    },
  });
}

/**
 * Relaxed CSP for development ONLY.
 * WARNING: Never use in production — allows unsafe-eval, unsafe-inline, and wildcard origins.
 */
export const developmentCsp = isProduction
  ? securityHeaders
  : helmet.contentSecurityPolicy({
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:', '*'],
        connectSrc: ["'self'", 'ws:', 'wss:', '*'],
        fontSrc: ["'self'", '*'],
      },
    });

export default securityHeaders;
