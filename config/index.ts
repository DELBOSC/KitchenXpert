/**
 * Configuration centralisée pour KitchenXpert
 *
 * Ce fichier charge et valide toutes les configurations depuis les variables d'environnement.
 * Utilise Zod pour la validation stricte des types.
 */

import { z } from 'zod';

// ============================================================================
// SCHEMAS DE VALIDATION
// ============================================================================

const NodeEnvSchema = z.enum(['development', 'production', 'test', 'staging']);

const DatabaseConfigSchema = z.object({
  postgres: z.object({
    host: z.string(),
    port: z.number().int().positive(),
    database: z.string(),
    username: z.string(),
    password: z.string(),
    ssl: z.boolean(),
    maxConnections: z.number().int().positive().default(20),
    connectionTimeout: z.number().int().positive().default(30000),
  }),
  mongodb: z.object({
    uri: z.string().url(),
    database: z.string(),
    maxPoolSize: z.number().int().positive().default(10),
    retryWrites: z.boolean().default(true),
  }),
  redis: z.object({
    host: z.string(),
    port: z.number().int().positive(),
    password: z.string().optional(),
    db: z.number().int().min(0).default(0),
    keyPrefix: z.string().default('kitchenxpert:'),
    ttl: z.number().int().positive().default(3600),
  }),
});

const AuthConfigSchema = z.object({
  jwt: z.object({
    accessTokenSecret: z.string().min(32),
    refreshTokenSecret: z.string().min(32),
    accessTokenExpiry: z.string().default('15m'),
    refreshTokenExpiry: z.string().default('7d'),
    issuer: z.string().default('kitchenxpert'),
  }),
  bcrypt: z.object({
    saltRounds: z.number().int().min(10).max(15).default(12),
  }),
  session: z.object({
    secret: z.string().min(32),
    maxAge: z.number().int().positive().default(86400000), // 24h
    rolling: z.boolean().default(true),
  }),
  oauth: z.object({
    google: z.object({
      clientId: z.string().optional(),
      clientSecret: z.string().optional(),
      callbackUrl: z.string().url().optional(),
    }).optional(),
    facebook: z.object({
      clientId: z.string().optional(),
      clientSecret: z.string().optional(),
      callbackUrl: z.string().url().optional(),
    }).optional(),
  }),
});

const SecurityConfigSchema = z.object({
  cors: z.object({
    origin: z.union([z.string(), z.array(z.string())]),
    credentials: z.boolean().default(true),
    maxAge: z.number().int().positive().default(86400),
  }),
  rateLimit: z.object({
    windowMs: z.number().int().positive().default(900000), // 15 min
    maxRequests: z.number().int().positive().default(100),
    skipSuccessfulRequests: z.boolean().default(false),
  }),
  csp: z.object({
    enabled: z.boolean().default(true),
    directives: z.record(z.array(z.string())).optional(),
  }),
  helmet: z.object({
    enabled: z.boolean().default(true),
  }),
});

const StorageConfigSchema = z.object({
  provider: z.enum(['local', 's3', 'azure', 'gcs']),
  local: z.object({
    uploadDir: z.string().default('./uploads'),
    publicUrl: z.string().url(),
  }).optional(),
  s3: z.object({
    bucket: z.string(),
    region: z.string(),
    accessKeyId: z.string(),
    secretAccessKey: z.string(),
    endpoint: z.string().url().optional(),
  }).optional(),
  azure: z.object({
    accountName: z.string(),
    accountKey: z.string(),
    containerName: z.string(),
  }).optional(),
  maxFileSize: z.number().int().positive().default(10485760), // 10MB
  allowedMimeTypes: z.array(z.string()).default([
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
  ]),
});

const EmailConfigSchema = z.object({
  provider: z.enum(['smtp', 'sendgrid', 'ses', 'mailgun']),
  smtp: z.object({
    host: z.string(),
    port: z.number().int().positive(),
    secure: z.boolean().default(true),
    auth: z.object({
      user: z.string(),
      pass: z.string(),
    }),
  }).optional(),
  sendgrid: z.object({
    apiKey: z.string(),
  }).optional(),
  from: z.object({
    name: z.string().default('KitchenXpert'),
    email: z.string().email(),
  }),
  templates: z.object({
    welcome: z.string().default('welcome'),
    resetPassword: z.string().default('reset-password'),
    orderConfirmation: z.string().default('order-confirmation'),
  }),
});

const MonitoringConfigSchema = z.object({
  logging: z.object({
    level: z.enum(['error', 'warn', 'info', 'debug', 'trace']).default('info'),
    format: z.enum(['json', 'pretty']).default('json'),
    destination: z.enum(['console', 'file', 'both']).default('console'),
    filePath: z.string().optional(),
  }),
  apm: z.object({
    enabled: z.boolean().default(false),
    serviceName: z.string().default('kitchenxpert-api'),
    serverUrl: z.string().url().optional(),
    environment: z.string(),
  }),
  metrics: z.object({
    enabled: z.boolean().default(true),
    port: z.number().int().positive().default(9090),
    path: z.string().default('/metrics'),
  }),
  tracing: z.object({
    enabled: z.boolean().default(false),
    jaegerEndpoint: z.string().url().optional(),
    samplingRate: z.number().min(0).max(1).default(0.1),
  }),
});

const AIConfigSchema = z.object({
  openai: z.object({
    apiKey: z.string().optional(),
    model: z.string().default('gpt-4'),
    maxTokens: z.number().int().positive().default(2000),
    temperature: z.number().min(0).max(2).default(0.7),
  }).optional(),
  anthropic: z.object({
    apiKey: z.string().optional(),
    model: z.string().default('claude-3-sonnet-20240229'),
  }).optional(),
  huggingface: z.object({
    apiKey: z.string().optional(),
    model: z.string().default('mistralai/Mixtral-8x7B-Instruct-v0.1'),
  }).optional(),
  features: z.object({
    autoComplete: z.boolean().default(true),
    imageGeneration: z.boolean().default(false),
    voiceCommands: z.boolean().default(false),
  }),
});

const WebhookConfigSchema = z.object({
  enabled: z.boolean().default(true),
  maxRetries: z.number().int().min(0).max(10).default(3),
  retryDelay: z.number().int().positive().default(5000),
  timeout: z.number().int().positive().default(30000),
  signature: z.object({
    enabled: z.boolean().default(true),
    secret: z.string().min(32),
    algorithm: z.enum(['sha256', 'sha512']).default('sha256'),
  }),
});

const AppConfigSchema = z.object({
  name: z.string().default('KitchenXpert'),
  version: z.string().default('1.0.0'),
  env: NodeEnvSchema,
  host: z.string().default('localhost'),
  port: z.number().int().positive().default(3000),
  apiPrefix: z.string().default('/api/v1'),
  frontendUrl: z.string().url(),
  database: DatabaseConfigSchema,
  auth: AuthConfigSchema,
  security: SecurityConfigSchema,
  storage: StorageConfigSchema,
  email: EmailConfigSchema,
  monitoring: MonitoringConfigSchema,
  ai: AIConfigSchema,
  webhooks: WebhookConfigSchema,
  features: z.object({
    registration: z.boolean().default(true),
    socialLogin: z.boolean().default(true),
    twoFactorAuth: z.boolean().default(false),
    apiDocs: z.boolean().default(true),
  }),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;
export type NodeEnv = z.infer<typeof NodeEnvSchema>;

// ============================================================================
// CHARGEMENT DE LA CONFIGURATION
// ============================================================================

/**
 * Parse une valeur d'environnement en nombre
 */
function parseNumber(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse une valeur d'environnement en boolean
 */
function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (!value) return defaultValue;
  return value === 'true' || value === '1' || value === 'yes';
}

/**
 * Parse une liste séparée par des virgules
 */
function parseArray(value: string | undefined, defaultValue: string[] = []): string[] {
  if (!value) return defaultValue;
  return value.split(',').map((v) => v.trim()).filter(Boolean);
}

/**
 * Charge la configuration depuis les variables d'environnement
 */
export function loadConfig(): AppConfig {
  const env = process.env;

  const rawConfig = {
    name: env.APP_NAME || 'KitchenXpert',
    version: env.APP_VERSION || '1.0.0',
    env: (env.NODE_ENV || 'development') as NodeEnv,
    host: env.HOST || 'localhost',
    port: parseNumber(env.PORT, 3000),
    apiPrefix: env.API_PREFIX || '/api/v1',
    frontendUrl: env.FRONTEND_URL || 'http://localhost:3000',

    database: {
      postgres: {
        host: env.POSTGRES_HOST || 'localhost',
        port: parseNumber(env.POSTGRES_PORT, 5432),
        database: env.POSTGRES_DB || 'kitchenxpert',
        username: env.POSTGRES_USER || 'postgres',
        password: env.POSTGRES_PASSWORD || 'postgres',
        ssl: parseBoolean(env.POSTGRES_SSL, false),
        maxConnections: parseNumber(env.POSTGRES_MAX_CONNECTIONS, 20),
        connectionTimeout: parseNumber(env.POSTGRES_TIMEOUT, 30000),
      },
      mongodb: {
        uri: env.MONGODB_URI || 'mongodb://localhost:27017',
        database: env.MONGODB_DB || 'kitchenxpert',
        maxPoolSize: parseNumber(env.MONGODB_POOL_SIZE, 10),
        retryWrites: parseBoolean(env.MONGODB_RETRY_WRITES, true),
      },
      redis: {
        host: env.REDIS_HOST || 'localhost',
        port: parseNumber(env.REDIS_PORT, 6379),
        password: env.REDIS_PASSWORD,
        db: parseNumber(env.REDIS_DB, 0),
        keyPrefix: env.REDIS_KEY_PREFIX || 'kitchenxpert:',
        ttl: parseNumber(env.REDIS_TTL, 3600),
      },
    },

    auth: {
      jwt: {
        accessTokenSecret: env.JWT_ACCESS_SECRET || '',
        refreshTokenSecret: env.JWT_REFRESH_SECRET || '',
        accessTokenExpiry: env.JWT_ACCESS_EXPIRY || '15m',
        refreshTokenExpiry: env.JWT_REFRESH_EXPIRY || '7d',
        issuer: env.JWT_ISSUER || 'kitchenxpert',
      },
      bcrypt: {
        saltRounds: parseNumber(env.BCRYPT_SALT_ROUNDS, 12),
      },
      session: {
        secret: env.SESSION_SECRET || '',
        maxAge: parseNumber(env.SESSION_MAX_AGE, 86400000),
        rolling: parseBoolean(env.SESSION_ROLLING, true),
      },
      oauth: {
        google: env.GOOGLE_CLIENT_ID ? {
          clientId: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
          callbackUrl: env.GOOGLE_CALLBACK_URL,
        } : undefined,
        facebook: env.FACEBOOK_CLIENT_ID ? {
          clientId: env.FACEBOOK_CLIENT_ID,
          clientSecret: env.FACEBOOK_CLIENT_SECRET,
          callbackUrl: env.FACEBOOK_CALLBACK_URL,
        } : undefined,
      },
    },

    security: {
      cors: {
        origin: parseArray(env.CORS_ORIGIN, ['http://localhost:3000']),
        credentials: parseBoolean(env.CORS_CREDENTIALS, true),
        maxAge: parseNumber(env.CORS_MAX_AGE, 86400),
      },
      rateLimit: {
        windowMs: parseNumber(env.RATE_LIMIT_WINDOW, 900000),
        maxRequests: parseNumber(env.RATE_LIMIT_MAX, 100),
        skipSuccessfulRequests: parseBoolean(env.RATE_LIMIT_SKIP_SUCCESS, false),
      },
      csp: {
        enabled: parseBoolean(env.CSP_ENABLED, true),
      },
      helmet: {
        enabled: parseBoolean(env.HELMET_ENABLED, true),
      },
    },

    storage: {
      provider: (env.STORAGE_PROVIDER || 'local') as 'local' | 's3' | 'azure' | 'gcs',
      local: env.STORAGE_PROVIDER === 'local' ? {
        uploadDir: env.UPLOAD_DIR || './uploads',
        publicUrl: env.STORAGE_PUBLIC_URL || 'http://localhost:3000/uploads',
      } : undefined,
      s3: env.STORAGE_PROVIDER === 's3' ? {
        bucket: env.S3_BUCKET || '',
        region: env.S3_REGION || '',
        accessKeyId: env.S3_ACCESS_KEY_ID || '',
        secretAccessKey: env.S3_SECRET_ACCESS_KEY || '',
        endpoint: env.S3_ENDPOINT,
      } : undefined,
      azure: env.STORAGE_PROVIDER === 'azure' ? {
        accountName: env.AZURE_STORAGE_ACCOUNT || '',
        accountKey: env.AZURE_STORAGE_KEY || '',
        containerName: env.AZURE_CONTAINER || '',
      } : undefined,
      maxFileSize: parseNumber(env.MAX_FILE_SIZE, 10485760),
      allowedMimeTypes: parseArray(env.ALLOWED_MIME_TYPES, [
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/pdf',
      ]),
    },

    email: {
      provider: (env.EMAIL_PROVIDER || 'smtp') as 'smtp' | 'sendgrid' | 'ses' | 'mailgun',
      smtp: env.EMAIL_PROVIDER === 'smtp' ? {
        host: env.SMTP_HOST || '',
        port: parseNumber(env.SMTP_PORT, 587),
        secure: parseBoolean(env.SMTP_SECURE, true),
        auth: {
          user: env.SMTP_USER || '',
          pass: env.SMTP_PASS || '',
        },
      } : undefined,
      sendgrid: env.EMAIL_PROVIDER === 'sendgrid' ? {
        apiKey: env.SENDGRID_API_KEY || '',
      } : undefined,
      from: {
        name: env.EMAIL_FROM_NAME || 'KitchenXpert',
        email: env.EMAIL_FROM_ADDRESS || '',
      },
      templates: {
        welcome: env.EMAIL_TEMPLATE_WELCOME || 'welcome',
        resetPassword: env.EMAIL_TEMPLATE_RESET || 'reset-password',
        orderConfirmation: env.EMAIL_TEMPLATE_ORDER || 'order-confirmation',
      },
    },

    monitoring: {
      logging: {
        level: (env.LOG_LEVEL || 'info') as 'error' | 'warn' | 'info' | 'debug' | 'trace',
        format: (env.LOG_FORMAT || 'json') as 'json' | 'pretty',
        destination: (env.LOG_DESTINATION || 'console') as 'console' | 'file' | 'both',
        filePath: env.LOG_FILE_PATH,
      },
      apm: {
        enabled: parseBoolean(env.APM_ENABLED, false),
        serviceName: env.APM_SERVICE_NAME || 'kitchenxpert-api',
        serverUrl: env.APM_SERVER_URL,
        environment: env.NODE_ENV || 'development',
      },
      metrics: {
        enabled: parseBoolean(env.METRICS_ENABLED, true),
        port: parseNumber(env.METRICS_PORT, 9090),
        path: env.METRICS_PATH || '/metrics',
      },
      tracing: {
        enabled: parseBoolean(env.TRACING_ENABLED, false),
        jaegerEndpoint: env.JAEGER_ENDPOINT,
        samplingRate: parseNumber(env.TRACING_SAMPLING_RATE, 0.1) / 100,
      },
    },

    ai: {
      openai: env.OPENAI_API_KEY ? {
        apiKey: env.OPENAI_API_KEY,
        model: env.OPENAI_MODEL || 'gpt-4',
        maxTokens: parseNumber(env.OPENAI_MAX_TOKENS, 2000),
        temperature: parseNumber(env.OPENAI_TEMPERATURE, 0.7),
      } : undefined,
      anthropic: env.ANTHROPIC_API_KEY ? {
        apiKey: env.ANTHROPIC_API_KEY,
        model: env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229',
      } : undefined,
      huggingface: env.HUGGINGFACE_API_KEY ? {
        apiKey: env.HUGGINGFACE_API_KEY,
        model: env.HUGGINGFACE_MODEL || 'mistralai/Mixtral-8x7B-Instruct-v0.1',
      } : undefined,
      features: {
        autoComplete: parseBoolean(env.AI_AUTOCOMPLETE, true),
        imageGeneration: parseBoolean(env.AI_IMAGE_GEN, false),
        voiceCommands: parseBoolean(env.AI_VOICE, false),
      },
    },

    webhooks: {
      enabled: parseBoolean(env.WEBHOOKS_ENABLED, true),
      maxRetries: parseNumber(env.WEBHOOK_MAX_RETRIES, 3),
      retryDelay: parseNumber(env.WEBHOOK_RETRY_DELAY, 5000),
      timeout: parseNumber(env.WEBHOOK_TIMEOUT, 30000),
      signature: {
        enabled: parseBoolean(env.WEBHOOK_SIGNATURE_ENABLED, true),
        secret: env.WEBHOOK_SECRET || '',
        algorithm: (env.WEBHOOK_SIGNATURE_ALGO || 'sha256') as 'sha256' | 'sha512',
      },
    },

    features: {
      registration: parseBoolean(env.FEATURE_REGISTRATION, true),
      socialLogin: parseBoolean(env.FEATURE_SOCIAL_LOGIN, true),
      twoFactorAuth: parseBoolean(env.FEATURE_2FA, false),
      apiDocs: parseBoolean(env.FEATURE_API_DOCS, true),
    },
  };

  // Valider la configuration
  try {
    return AppConfigSchema.parse(rawConfig);
  } catch (error) {
    console.error('❌ Configuration validation failed:');
    if (error instanceof z.ZodError) {
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    }
    throw new Error('Invalid configuration. Please check your environment variables.');
  }
}

// Instance singleton de la configuration
let configInstance: AppConfig | null = null;

/**
 * Récupère la configuration (singleton)
 */
export function getConfig(): AppConfig {
  if (!configInstance) {
    configInstance = loadConfig();
  }
  return configInstance;
}

/**
 * Vérifie si on est en développement
 */
export function isDevelopment(): boolean {
  return getConfig().env === 'development';
}

/**
 * Vérifie si on est en production
 */
export function isProduction(): boolean {
  return getConfig().env === 'production';
}

/**
 * Vérifie si on est en test
 */
export function isTest(): boolean {
  return getConfig().env === 'test';
}

/**
 * Réinitialise la configuration (utile pour les tests)
 */
export function resetConfig(): void {
  configInstance = null;
}
