/// <reference types="node" />
import cors, { CorsOptions } from 'cors';
import { RequestHandler } from 'express';
import logger from '../../utils/logger';

/**
 * CORS Configuration for KitchenXpert API
 *
 * Configures Cross-Origin Resource Sharing to control which domains
 * can access the API.
 *
 * ENVIRONMENT VARIABLES:
 * - CORS_ORIGINS: Comma-separated list of allowed origins
 *   Example: "https://app.example.com,https://admin.example.com"
 *   If not set, falls back to environment-specific defaults
 *
 * - CORS_CREDENTIALS: Set to "true" to allow credentials (default: true)
 *
 * - CORS_MAX_AGE: Preflight cache duration in seconds (default: 86400 = 24h)
 *
 * SECURITY NOTES:
 * - Never use wildcard (*) origins in production with credentials
 * - Always explicitly list allowed origins in production
 * - The CORS_ORIGINS env var takes precedence over defaults when set
 */


/**
 * Parse CORS_ORIGINS environment variable
 * @returns Array of allowed origins or null if not configured
 */
const parseEnvOrigins = (): string[] | null => {
  const envOrigins = process.env.CORS_ORIGINS;

  if (!envOrigins || envOrigins.trim() === '') {
    return null;
  }

  // Parse comma-separated origins, trim whitespace, filter empty
  const origins = envOrigins
    .split(',')
    .map(origin => origin.trim())
    .filter(origin => origin.length > 0);

  // Validate origins in production
  if (process.env.NODE_ENV === 'production') {
    const invalidOrigins = origins.filter(origin => {
      // Check for wildcard
      if (origin === '*') {
        logger.error('CORS SECURITY ERROR: Wildcard origin (*) is not allowed in production');
        return true;
      }
      // Check for http in production (should be https)
      if (origin.startsWith('http://') && !origin.includes('localhost')) {
        logger.warn(`CORS SECURITY WARNING: Non-HTTPS origin "${origin}" in production`);
      }
      return false;
    });

    if (invalidOrigins.length > 0) {
      throw new Error(
        'CORS SECURITY ERROR: Invalid origins detected in production. ' +
        'Wildcard (*) is not allowed. Use explicit HTTPS origins.'
      );
    }
  }

  return origins.length > 0 ? origins : null;
};

// Allowed origins based on environment (fallback if CORS_ORIGINS not set)
const getDefaultOrigins = (): string[] => {
  const env: string = process.env.NODE_ENV || 'development';

  switch (env) {
    case 'production':
      return [
        'https://www.kitchenxpert.com',
        'https://kitchenxpert.com',
        'https://app.kitchenxpert.com',
        'https://partner.kitchenxpert.com',
        'https://admin.kitchenxpert.com',
      ];

    case 'staging':
      return [
        'https://staging.kitchenxpert.com',
        'https://staging-app.kitchenxpert.com',
        'https://staging-partner.kitchenxpert.com',
      ];

    case 'development':
    default:
      return [
        'http://localhost:3000',      // Frontend
        'http://localhost:3001',      // Partner Portal
        'http://localhost:3002',      // Admin
        'http://localhost:6006',      // Storybook
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
      ];
  }
};

// Get allowed origins (env var takes precedence)
const getAllowedOrigins = (): string[] => {
  const envOrigins = parseEnvOrigins();
  if (envOrigins) {
    logger.info(`CORS: Using origins from CORS_ORIGINS env var: ${envOrigins.join(', ')}`);
    return envOrigins;
  }
  return getDefaultOrigins();
};

// Dynamic origin validation
const validateOrigin = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void
): void => {
  const allowedOrigins = getAllowedOrigins();

  // Allow requests with no origin (mobile apps, curl, Postman)
  if (!origin) {
    callback(null, true);
    return;
  }

  // Check if origin is in allowed list
  if (allowedOrigins.includes(origin)) {
    callback(null, true);
    return;
  }

  // In development, allow all localhost origins
  if (process.env.NODE_ENV === 'development' && origin.includes('localhost')) {
    callback(null, true);
    return;
  }

  // Reject unknown origins in production
  if (process.env.NODE_ENV === 'production') {
    callback(new Error(`CORS: Origin ${origin} not allowed`), false);
    return;
  }

  // Allow in non-production for easier development
  callback(null, true);
};

// Parse credentials setting from env (default: true)
const getCredentialsSetting = (): boolean => {
  const envCredentials = process.env.CORS_CREDENTIALS;
  if (envCredentials === 'false' || envCredentials === '0') {
    return false;
  }
  return true; // Default to true for security with explicit origins
};

// Parse max age from env (default: 86400 = 24 hours)
const getMaxAgeSetting = (): number => {
  const envMaxAge = process.env.CORS_MAX_AGE;
  if (envMaxAge) {
    const parsed = parseInt(envMaxAge, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 86400; // Default 24 hours
};

// CORS options
const corsOptions: CorsOptions = {
  origin: validateOrigin,

  // Allowed HTTP methods
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

  // Allowed headers
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-CSRF-Token',
    'X-Request-ID',
    'X-API-Key',
  ],

  // Headers exposed to the client
  exposedHeaders: [
    'X-Request-ID',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'Content-Disposition',
  ],

  // Allow credentials (cookies, authorization headers)
  // Configurable via CORS_CREDENTIALS env var
  credentials: getCredentialsSetting(),

  // Preflight cache duration
  // Configurable via CORS_MAX_AGE env var (default: 24 hours)
  maxAge: getMaxAgeSetting(),

  // Pass preflight response to next handler
  preflightContinue: false,

  // Provide status code for successful OPTIONS
  optionsSuccessStatus: 204,
};

/**
 * CORS middleware instance
 */
export const corsMiddleware: RequestHandler = cors(corsOptions);

/**
 * Strict CORS for sensitive endpoints (e.g., admin routes)
 * Only allows specific origins
 */
export const strictCorsMiddleware: RequestHandler = cors({
  ...corsOptions,
  origin: (origin, callback) => {
    const strictOrigins = process.env.NODE_ENV === 'production'
      ? ['https://admin.kitchenxpert.com']
      : ['http://localhost:3002'];

    if (!origin || strictOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS: Access denied for this origin'), false);
    }
  },
  credentials: true,
});

/**
 * API CORS for external API consumers
 * More permissive but requires API key
 */
const partnerOrigins = (process.env.PARTNER_ALLOWED_ORIGINS || '').split(',').filter(Boolean);
export const apiCorsMiddleware: RequestHandler = cors({
  ...corsOptions,
  origin: partnerOrigins.length > 0 ? partnerOrigins : false,
  credentials: false, // No cookies for API
  allowedHeaders: [
    ...corsOptions.allowedHeaders as string[],
    'X-API-Key',
  ],
});

export default corsMiddleware;
