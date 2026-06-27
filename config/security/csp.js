/**
 * Content Security Policy (CSP) Configuration
 *
 * Protection contre:
 * - Cross-Site Scripting (XSS)
 * - Injection de code malveillant
 * - Clickjacking
 * - Data injection attacks
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

const cspDirectives = {
  'script-src': [
    "'self'",
    ...(isDevelopment ? ["'unsafe-eval'"] : []),
    'https://cdn.jsdelivr.net',
    'https://unpkg.com',
  ],
  'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
  'img-src': ["'self'", 'data:', 'blob:', 'https:'],
  'media-src': ["'self'", 'blob:'],
  'object-src': ["'none'"],
  'frame-src': ["'self'", 'https://js.stripe.com'],
  'worker-src': ["'self'", 'blob:'],
  'connect-src': [
    "'self'",
    process.env.API_URL || 'http://localhost:4000',
    process.env.WS_URL || 'ws://localhost:4000',
  ],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
  'base-uri': ["'self'"],
  'manifest-src': ["'self'"],
  ...(isProduction && { 'upgrade-insecure-requests': [] }),
};

function generateCspHeader() {
  return Object.entries(cspDirectives)
    .map(([directive, values]) => {
      if (Array.isArray(values) && values.length > 0) {
        return `${directive} ${values.join(' ')}`;
      }
      return directive;
    })
    .join('; ');
}

function cspMiddleware(req, res, next) {
  const reportOnly = isDevelopment;
  const headerName = reportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy';

  res.setHeader(headerName, generateCspHeader());
  next();
}

module.exports = {
  cspDirectives,
  cspMiddleware,
  generateCspHeader,
};
