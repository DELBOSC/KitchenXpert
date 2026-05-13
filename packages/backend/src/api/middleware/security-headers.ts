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

// AR/VR routes legitimately need camera/microphone for room scanning and
// VR walkthroughs. Listed here so the Permissions-Policy can grant the
// capability narrowly instead of site-wide. The frontend router maps to
// /ar and /vr; everything else gets `camera=()` `microphone=()`.
const AR_VR_PATH_PREFIXES = ['/ar', '/vr', '/api/v1/room-scan'] as const;

/**
 * External origins the SPA must reach. Kept as named constants so
 * adding/removing a sub-processor only touches one place — and so the
 * compliance review can cross-check them against the Privacy page
 * sub-processor list (`packages/frontend/src/config/legal.ts`).
 */
const CSP_CONNECT_ALLOWLIST = [
  // Payments — Stripe.js + tokenisation
  'https://api.stripe.com',
  'https://m.stripe.network',
  // AI — direct Anthropic + Google Gemini endpoints (proxied via backend
  // in normal flow, but the SPA also calls them when the user enables
  // streaming chat client-side).
  'https://api.anthropic.com',
  'https://generativelanguage.googleapis.com',
  // Catalog providers — static product images + price lookups
  'https://api.ikea.com',
  'https://www.ikea.com',
  'https://api.leroymerlin.fr',
  'https://api.castorama.fr',
  'https://api.bosch-home.com',
  // Observability — Sentry ingestion + Plausible analytics
  'https://o0.ingest.sentry.io',
  'https://*.ingest.sentry.io',
  'https://plausible.io',
  'https://plausible.kitchenxpert.com',
  // Real-time collaboration (Yjs over WebSocket)
  'wss:',
] as const;

const CSP_IMG_ALLOWLIST = [
  "'self'",
  'data:',
  'blob:',
  // CDNs that serve our product photos. `https:` would be wider but
  // browsers report CSP violations on bare `https:` for images served
  // via mixed-case, which makes Sentry noisy.
  'https://www.ikea.com',
  'https://images.ikea.com',
  'https://media.castorama.fr',
  'https://media.leroymerlin.fr',
  'https://kitchenxpert-prod-uploads.s3.fr-par.scw.cloud',
  'https://*.scw.cloud',
] as const;

const CSP_SCRIPT_ALLOWLIST = [
  "'self'",
  // Stripe.js loader — must come from js.stripe.com per Stripe docs
  'https://js.stripe.com',
  // Plausible script (deferred, no cookies)
  'https://plausible.io',
  'https://plausible.kitchenxpert.com',
] as const;

const CSP_FRAME_ALLOWLIST = [
  // Stripe Elements (3DS challenge frame)
  'https://js.stripe.com',
  'https://hooks.stripe.com',
] as const;

/**
 * Content Security Policy configuration.
 *
 * Strict-by-default. No `'unsafe-inline'` for scripts (Stripe + Plausible
 * are loaded from external origins; React is bundled). `'unsafe-inline'`
 * remains for styles only because Tailwind/Framer-Motion injects style
 * tags at runtime — switching to nonces would require a bundler rewrite
 * tracked separately.
 */
const contentSecurityPolicy = {
  directives: {
    defaultSrc: ["'self'"],

    // Scripts: external allow-list, no inline. If adding a tag manager
    // becomes unavoidable, switch to nonce-based inline injection (helmet
    // supports `'nonce-…'` directives via `useDefaults: false`).
    scriptSrc: [...CSP_SCRIPT_ALLOWLIST],

    // Styles: 'unsafe-inline' tolerated for Tailwind JIT + Framer Motion
    // until we move to a nonce strategy.
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],

    imgSrc: [...CSP_IMG_ALLOWLIST],

    fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],

    connectSrc: ["'self'", ...CSP_CONNECT_ALLOWLIST],

    // Audio/video for AR room-scan playback + VR voiceover
    mediaSrc: ["'self'", 'blob:'],

    // No <object>, <embed>, <applet>
    objectSrc: ["'none'"],

    // Allow Stripe iframes for Elements + 3DS
    frameSrc: [...CSP_FRAME_ALLOWLIST],

    // No <iframe>/<frame>/<object> children of our own
    childSrc: ["'none'"],

    // Hard-deny: nobody can frame us (clickjacking)
    frameAncestors: ["'none'"],

    // Forms only POST back to us
    formAction: ["'self'"],

    // <base href> locked to same-origin
    baseUri: ["'self'"],

    // Worker scripts (the 3D engine spins web workers for THREE.js)
    workerSrc: ["'self'", 'blob:'],

    // Manifest for PWA install prompt
    manifestSrc: ["'self'"],

    ...(isProduction && {
      upgradeInsecureRequests: [],
      blockAllMixedContent: [],
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
 * Build the Permissions-Policy value.
 *
 * Camera + microphone + accelerometer + gyroscope are required for the
 * AR room scan and VR walkthrough. Granting them site-wide is what
 * lets ad libraries silently activate the camera once a user grants it
 * once — so we keep the default `=()` and only relax it for the routes
 * that actually need each feature.
 *
 * The Permissions-Policy header takes the *most permissive* match
 * because it is a delegation policy, not a content-route policy — so
 * the relaxed variant is sent only for `/ar`, `/vr`, and the
 * `/api/v1/room-scan` upload endpoint.
 */
function buildPermissionsPolicy(reqPath: string): string {
  const isArVr = AR_VR_PATH_PREFIXES.some((p) => reqPath.startsWith(p));

  const directives: Array<[string, string]> = [
    ['accelerometer',     isArVr ? '(self)' : '()'],
    ['ambient-light-sensor', '()'],
    ['autoplay',          '(self)'],   // <video autoplay> for product demos
    ['battery',           '()'],
    ['camera',            isArVr ? '(self)' : '()'],
    ['display-capture',   '()'],
    ['document-domain',   '()'],
    ['encrypted-media',   '()'],
    ['fullscreen',        '(self)'],   // 3D designer fullscreen mode
    ['geolocation',       '(self)'],   // store finder
    ['gyroscope',         isArVr ? '(self)' : '()'],
    ['hid',               '()'],
    ['idle-detection',    '()'],
    ['interest-cohort',   '()'],       // FLoC opt-out (RGPD)
    ['magnetometer',      '()'],
    ['microphone',        isArVr ? '(self)' : '()'],
    ['midi',              '()'],
    ['payment',           '(self "https://js.stripe.com")'],
    ['picture-in-picture','()'],
    ['publickey-credentials-get', '(self)'], // future WebAuthn
    ['screen-wake-lock',  isArVr ? '(self)' : '()'],
    ['serial',            '()'],
    ['sync-xhr',          '()'],
    ['usb',               '()'],
    ['xr-spatial-tracking', isArVr ? '(self)' : '()'],
  ];

  return directives.map(([k, v]) => `${k}=${v}`).join(', ');
}

/**
 * Additional security headers not covered by helmet.
 */
export function additionalSecurityHeaders(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // X-XSS-Protection: 0 — modern approach, rely on CSP instead of legacy XSS filter
  res.setHeader('X-XSS-Protection', '0');

  // Permissions-Policy — narrow per-route (see buildPermissionsPolicy)
  res.setHeader('Permissions-Policy', buildPermissionsPolicy(req.path));

  // Cross-Origin-Embedder-Policy
  // `credentialless` is the sweet spot: enables COEP isolation (required
  // for SharedArrayBuffer in the 3D engine WebWorker) without breaking
  // CDN images that don't send CORP headers.
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');

  // Cross-Origin-Opener-Policy: isolate the browsing context
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');

  // Cross-Origin-Resource-Policy: same-site so subdomains of
  // kitchenxpert.com (api.*, app.*, 3d.*) can fetch our assets.
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');

  // Cache-Control for API responses — never cache personalised data
  if (req.path.startsWith('/api/')) {
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
