/**
 * Security Headers Configuration
 * Implements security best practices using Helmet.js and custom headers
 *
 * Dependencies: helmet
 * Usage: Apply to Express app as middleware
 */

const helmet = require('helmet');

/**
 * Environment-based configuration
 */
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Content Security Policy (CSP) Configuration
 * Prevents XSS, clickjacking, and other code injection attacks
 */
const contentSecurityPolicy = {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      ...(isDevelopment ? ["'unsafe-inline'", "'unsafe-eval'"] : []),
      'https://cdn.jsdelivr.net',
      'https://unpkg.com',
      ...(process.env.CSP_SCRIPT_SRC?.split(',') || [])
    ],
    styleSrc: [
      "'self'",
      "'unsafe-inline'", // Required for many CSS frameworks
      'https://fonts.googleapis.com',
      ...(process.env.CSP_STYLE_SRC?.split(',') || [])
    ],
    fontSrc: [
      "'self'",
      'https://fonts.gstatic.com',
      'data:',
      ...(process.env.CSP_FONT_SRC?.split(',') || [])
    ],
    imgSrc: [
      "'self'",
      'data:',
      'blob:',
      'https:',
      ...(process.env.CSP_IMG_SRC?.split(',') || [])
    ],
    connectSrc: [
      "'self'",
      process.env.API_URL || 'http://localhost:3000',
      ...(process.env.CSP_CONNECT_SRC?.split(',') || [])
    ],
    frameSrc: ["'none'"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'", 'blob:', 'data:'],
    workerSrc: ["'self'", 'blob:'],
    childSrc: ["'self'", 'blob:'],
    formAction: ["'self'"],
    frameAncestors: ["'none'"], // Equivalent to X-Frame-Options: DENY
    baseUri: ["'self'"],
    manifestSrc: ["'self'"],
    upgradeInsecureRequests: isProduction ? [] : null // Only in production
  },
  reportOnly: isDevelopment // Report violations in dev, block in prod
};

/**
 * Strict Transport Security (HSTS) Configuration
 * Forces HTTPS connections
 */
const hsts = {
  maxAge: parseInt(process.env.HSTS_MAX_AGE) || 31536000, // 1 year in seconds
  includeSubDomains: process.env.HSTS_INCLUDE_SUBDOMAINS !== 'false', // Default true
  preload: process.env.HSTS_PRELOAD === 'true' // Default false (requires submission to browsers)
};

/**
 * Referrer Policy Configuration
 * Controls how much referrer information is shared
 */
const referrerPolicy = {
  policy: process.env.REFERRER_POLICY || 'strict-origin-when-cross-origin'
};

/**
 * Permissions Policy (formerly Feature Policy)
 * Controls which browser features can be used
 */
const permissionsPolicy = {
  features: {
    accelerometer: ["'none'"],
    ambientLightSensor: ["'none'"],
    autoplay: ["'self'"],
    battery: ["'none'"],
    camera: process.env.ALLOW_CAMERA === 'true' ? ["'self'"] : ["'none'"],
    displayCapture: ["'none'"],
    documentDomain: ["'none'"],
    encryptedMedia: ["'self'"],
    fullscreen: ["'self'"],
    geolocation: process.env.ALLOW_GEOLOCATION === 'true' ? ["'self'"] : ["'none'"],
    gyroscope: ["'none'"],
    magnetometer: ["'none'"],
    microphone: process.env.ALLOW_MICROPHONE === 'true' ? ["'self'"] : ["'none'"],
    midi: ["'none'"],
    payment: process.env.ALLOW_PAYMENT === 'true' ? ["'self'"] : ["'none'"],
    pictureInPicture: ["'self'"],
    publicKeyCredentials: ["'self'"],
    speakerSelection: ["'none'"],
    syncXhr: ["'none'"],
    usb: ["'none'"],
    vibrate: ["'none'"],
    vr: ["'none'"],
    wakeLock: ["'none'"],
    webShare: ["'self'"],
    xrSpatialTracking: ["'none'"]
  }
};

/**
 * Expect-CT Configuration
 * Enforces Certificate Transparency
 */
const expectCt = {
  maxAge: parseInt(process.env.EXPECT_CT_MAX_AGE) || 86400, // 24 hours
  enforce: isProduction,
  reportUri: process.env.EXPECT_CT_REPORT_URI || undefined
};

/**
 * Cross-Origin Embedder Policy (COEP)
 */
const crossOriginEmbedderPolicy = {
  policy: process.env.COEP_POLICY || 'require-corp'
};

/**
 * Cross-Origin Opener Policy (COOP)
 */
const crossOriginOpenerPolicy = {
  policy: process.env.COOP_POLICY || 'same-origin'
};

/**
 * Cross-Origin Resource Policy (CORP)
 */
const crossOriginResourcePolicy = {
  policy: process.env.CORP_POLICY || 'same-origin'
};

/**
 * Main Helmet configuration
 */
const helmetConfig = {
  contentSecurityPolicy: process.env.DISABLE_CSP === 'true' ? false : contentSecurityPolicy,
  crossOriginEmbedderPolicy: process.env.DISABLE_COEP === 'true' ? false : crossOriginEmbedderPolicy,
  crossOriginOpenerPolicy: process.env.DISABLE_COOP === 'true' ? false : crossOriginOpenerPolicy,
  crossOriginResourcePolicy: process.env.DISABLE_CORP === 'true' ? false : crossOriginResourcePolicy,
  dnsPrefetchControl: {
    allow: false // Disable DNS prefetching for privacy
  },
  expectCt: isProduction ? expectCt : false,
  frameguard: {
    action: 'deny' // X-Frame-Options: DENY
  },
  hidePoweredBy: true, // Remove X-Powered-By header
  hsts: isProduction ? hsts : false, // Only enable HSTS in production
  ieNoOpen: true, // X-Download-Options: noopen for IE8+
  noSniff: true, // X-Content-Type-Options: nosniff
  originAgentCluster: true, // Origin-Agent-Cluster: ?1
  permittedCrossDomainPolicies: {
    permittedPolicies: 'none' // X-Permitted-Cross-Domain-Policies
  },
  referrerPolicy: referrerPolicy,
  xssFilter: true // X-XSS-Protection: 1; mode=block
};

/**
 * Custom security headers middleware
 * Adds additional security headers not covered by Helmet
 */
const customSecurityHeaders = (req, res, next) => {
  // Remove server header (hide server technology)
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');

  // Add custom headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

  // Add Permissions-Policy header (custom implementation)
  const permissionsPolicyHeader = Object.entries(permissionsPolicy.features)
    .map(([feature, allowList]) => `${feature}=${allowList.join(' ')}`)
    .join(', ');
  res.setHeader('Permissions-Policy', permissionsPolicyHeader);

  // Add cache control for sensitive pages
  if (req.path.includes('/api/') || req.path.includes('/admin/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }

  // CORS preflight cache
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  }

  next();
};

/**
 * Security headers for API responses
 * More restrictive headers for API endpoints
 */
const apiSecurityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  next();
};

/**
 * Security headers for static files
 * More permissive for CSS, JS, images
 */
const staticSecurityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Allow caching for static assets
  const maxAge = parseInt(process.env.STATIC_MAX_AGE) || 31536000; // 1 year
  res.setHeader('Cache-Control', `public, max-age=${maxAge}, immutable`);

  next();
};

/**
 * Disable caching for sensitive routes
 */
const noCacheHeaders = (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
};

/**
 * Main security headers middleware (combines Helmet + custom)
 */
const securityHeaders = [
  helmet(helmetConfig),
  customSecurityHeaders
];

/**
 * CSP violation reporting endpoint handler
 */
const cspReportHandler = (req, res) => {
  if (req.body && req.body['csp-report']) {
    console.warn('CSP Violation:', JSON.stringify(req.body['csp-report'], null, 2));

    // Log to monitoring service if configured
    if (process.env.CSP_REPORT_URL) {
      // Send to external monitoring service
      // Implementation depends on your monitoring stack
    }
  }

  res.status(204).end(); // No content
};

module.exports = {
  // Main middleware
  securityHeaders,
  helmet: helmet(helmetConfig),
  customSecurityHeaders,

  // Specialized middleware
  apiSecurityHeaders,
  staticSecurityHeaders,
  noCacheHeaders,

  // Handlers
  cspReportHandler,

  // Configuration objects (for external use)
  helmetConfig,
  contentSecurityPolicy,
  hsts,
  referrerPolicy,
  permissionsPolicy,
  expectCt
};
