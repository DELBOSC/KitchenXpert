/**
 * Environment Variable Validator
 *
 * This module validates all required environment variables at application startup.
 * It MUST be imported and executed before any other imports to catch configuration
 * errors early and provide clear error messages.
 *
 * Usage:
 *   import { validateEnv } from './config/env-validator';
 *   validateEnv(); // Call this FIRST, before other imports
 */

import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
// Try CWD first (packages/backend/), then monorepo root
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '..', '.env') });

// =================================
// Schema Definitions
// =================================

/**
 * PostgreSQL DATABASE_URL format validator
 * Expected format: postgresql://user:password@host:port/database
 */
const databaseUrlSchema = z.string().refine(
  (url) => {
    try {
      const parsed = new URL(url);
      return (
        (parsed.protocol === 'postgresql:' || parsed.protocol === 'postgres:') &&
        parsed.hostname &&
        parsed.pathname.length > 1 // Must have database name
      );
    } catch {
      return false;
    }
  },
  {
    message:
      'DATABASE_URL must be a valid PostgreSQL connection string (postgresql://user:password@host:port/database)',
  }
);

/**
 * Redis URL format validator
 * Expected format: redis://[:password@]host:port[/db]
 */
const redisUrlSchema = z
  .string()
  .optional()
  .refine(
    (url) => {
      if (!url) return true; // Optional in development
      try {
        const parsed = new URL(url);
        return parsed.protocol === 'redis:' || parsed.protocol === 'rediss:';
      } catch {
        return false;
      }
    },
    {
      message: 'REDIS_URL must be a valid Redis connection string (redis://host:port)',
    }
  );

/**
 * JWT secret validator - must be at least 32 characters for security
 */
const jwtSecretSchema = z.string().min(32, {
  message: 'JWT secrets must be at least 32 characters for security',
});

/**
 * Node environment validator
 */
const nodeEnvSchema = z.enum(['development', 'production', 'test']).default('development');

/**
 * Mail provider validator
 */
const mailProviderSchema = z.enum(['console', 'smtp', 'sendgrid']).default('console');

/**
 * Log level validator
 */
const logLevelSchema = z
  .enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'])
  .default('info');

// =================================
// Complete Environment Schema
// =================================

const envSchema = z.object({
  // Database - REQUIRED
  DATABASE_URL: databaseUrlSchema,
  DB_HOST: z.string().optional(),
  DB_PORT: z.coerce.number().int().positive().optional(),
  DB_NAME: z.string().optional(),
  DB_USER: z.string().optional(),
  DB_PASSWORD: z.string().optional(),
  DB_SSL: z.enum(['true', 'false']).optional(),

  // Redis - RECOMMENDED for production
  REDIS_URL: redisUrlSchema,
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.coerce.number().int().positive().optional(),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().int().min(0).optional(),

  // JWT - REQUIRED
  JWT_ACCESS_SECRET: jwtSecretSchema,
  JWT_REFRESH_SECRET: jwtSecretSchema,
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  // Server - REQUIRED
  NODE_ENV: nodeEnvSchema,
  PORT: z.coerce.number().int().positive().default(3000),
  API_HOST: z.string().default('localhost'),
  HOST: z.string().default('localhost'),
  APP_NAME: z.string().default('KitchenXpert'),
  APP_URL: z.string().url().optional(),
  API_URL: z.string().url().optional(),

  // CORS - REQUIRED
  CORS_ORIGINS: z.string().optional(),
  CORS_ORIGIN: z.string().optional(),

  // Email - RECOMMENDED
  MAIL_PROVIDER: mailProviderSchema,
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.enum(['true', 'false']).default('false'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  MAIL_FROM: z.string().email().optional(),
  EMAIL_FROM: z.string().email().optional(),
  SENDGRID_API_KEY: z.string().optional(),

  // Monitoring - RECOMMENDED
  SENTRY_DSN: z.string().url().optional().or(z.literal('')),
  LOG_LEVEL: logLevelSchema,

  // External APIs - OPTIONAL
  STRIPE_PUBLIC_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  AI_MODULES_ENDPOINT: z.string().url().optional(),

  // AWS S3 - OPTIONAL
  AWS_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),

  // Security - RECOMMENDED
  DATA_ENCRYPTION_KEY: z.string().optional(),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(31).default(10),
  ENABLE_RATE_LIMIT: z.enum(['true', 'false']).default('true'),
  ENABLE_HELMET: z.enum(['true', 'false']).default('true'),
  ENABLE_CORS: z.enum(['true', 'false']).default('true'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),

  // Feature Flags - OPTIONAL
  FEATURE_AI_ENABLED: z.enum(['true', 'false']).default('true'),
  FEATURE_3D_ENABLED: z.enum(['true', 'false']).default('true'),
  FEATURE_PARTNERS_ENABLED: z.enum(['true', 'false']).default('true'),
});

// Type export for validated environment
export type ValidatedEnv = z.infer<typeof envSchema>;

// =================================
// Validation Result Storage
// =================================

let validatedEnv: ValidatedEnv | null = null;

// =================================
// Validation Functions
// =================================

/**
 * Format Zod errors into a readable string
 */
function formatZodErrors(errors: z.ZodError): string {
  return errors.issues
    .map((issue) => {
      const path = issue.path.join('.');
      return `  - ${path}: ${issue.message}`;
    })
    .join('\n');
}

/**
 * Check for recommended but missing environment variables and log warnings
 */
function checkRecommendedVars(env: Record<string, string | undefined>): void {
  const recommendations: Array<{ key: string; message: string; condition?: boolean }> = [
    {
      key: 'REDIS_URL',
      message: 'Redis is recommended for production caching and session management',
      condition: env.NODE_ENV === 'production',
    },
    {
      key: 'SENTRY_DSN',
      message: 'Sentry is recommended for production error tracking',
      condition: env.NODE_ENV === 'production',
    },
    {
      key: 'MAIL_PROVIDER',
      message: "Mail provider is 'console' - emails will only be logged, not sent",
      condition: env.MAIL_PROVIDER === 'console' && env.NODE_ENV === 'production',
    },
    {
      key: 'SMTP_HOST',
      message: "SMTP is not configured - set MAIL_PROVIDER to 'smtp' and configure SMTP settings",
      condition:
        env.MAIL_PROVIDER === 'smtp' &&
        !env.SMTP_HOST &&
        env.NODE_ENV !== 'test',
    },
    {
      key: 'BCRYPT_ROUNDS',
      message: 'Consider using BCRYPT_ROUNDS=12 or higher for production',
      condition:
        env.NODE_ENV === 'production' &&
        (!env.BCRYPT_ROUNDS || parseInt(env.BCRYPT_ROUNDS, 10) < 12),
    },
    {
      key: 'DATA_ENCRYPTION_KEY',
      message: 'DATA_ENCRYPTION_KEY is required for encrypting API keys and secrets in the database',
      condition: !env.DATA_ENCRYPTION_KEY,
    },
  ];

  const warnings: string[] = [];

  for (const rec of recommendations) {
    if (rec.condition === true || (rec.condition === undefined && !env[rec.key])) {
      warnings.push(`  [WARN] ${rec.key}: ${rec.message}`);
    }
  }

  if (warnings.length > 0) {
    console.warn('\n[ENV] Configuration warnings:');
    warnings.forEach((w) => console.warn(w));
    console.warn('');
  }
}

/**
 * Validates environment variables at startup.
 *
 * This function MUST be called at the very beginning of the application,
 * before any other imports that might depend on environment variables.
 *
 * @throws {Error} If required environment variables are missing or invalid
 * @returns {ValidatedEnv} The validated and typed environment variables
 */
export function validateEnv(): ValidatedEnv {
  // Return cached result if already validated
  if (validatedEnv) {
    return validatedEnv;
  }

  console.info('[ENV] Validating environment variables...');

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errorMessage = formatZodErrors(result.error);
    console.error('\n[ENV] Environment validation failed!\n');
    console.error('The following environment variables are missing or invalid:\n');
    console.error(errorMessage);
    console.error('\nPlease check your .env file and ensure all required variables are set.');
    console.error('See .env.example for a complete list of required variables.\n');

    // Exit with error code
    process.exit(1);
  }

  // Check for recommended variables and log warnings
  checkRecommendedVars(process.env as Record<string, string | undefined>);

  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('⚠️  ANTHROPIC_API_KEY not set — AI generation features will use fallback algorithm');
  }

  // Cache the validated environment
  validatedEnv = result.data;

  console.info('[ENV] Environment validation successful');

  return validatedEnv;
}

/**
 * Get the validated environment variables.
 * Throws if validateEnv() has not been called yet.
 */
export function getEnv(): ValidatedEnv {
  if (!validatedEnv) {
    throw new Error(
      'Environment has not been validated yet. Call validateEnv() at application startup.'
    );
  }
  return validatedEnv;
}

/**
 * Check if environment is production
 */
export function isProduction(): boolean {
  return getEnv().NODE_ENV === 'production';
}

/**
 * Check if environment is development
 */
export function isDevelopment(): boolean {
  return getEnv().NODE_ENV === 'development';
}

/**
 * Check if environment is test
 */
export function isTest(): boolean {
  return getEnv().NODE_ENV === 'test';
}

export default { validateEnv, getEnv, isProduction, isDevelopment, isTest };
