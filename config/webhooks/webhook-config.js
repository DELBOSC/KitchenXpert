/**
 * Webhook Configuration for KitchenXpert
 *
 * Purpose:
 * - Main webhook system configuration
 * - Define supported events and retry policies
 * - Configure security and delivery settings
 * - Production-grade reliability
 *
 * Usage:
 * - Import config: import { WEBHOOK_CONFIG } from './webhook-config';
 * - Send webhook: await sendWebhook(event, payload);
 *
 * @see https://docs.github.com/en/developers/webhooks-and-events/webhooks
 */

// ============================================================
// Supported Webhook Events
// ============================================================

export const WEBHOOK_EVENTS = {
  // Order events
  ORDER_CREATED: 'order.created',
  ORDER_UPDATED: 'order.updated',
  ORDER_CANCELLED: 'order.cancelled',
  ORDER_COMPLETED: 'order.completed',
  ORDER_REFUNDED: 'order.refunded',

  // Design events
  DESIGN_CREATED: 'design.created',
  DESIGN_UPDATED: 'design.updated',
  DESIGN_COMPLETED: 'design.completed',
  DESIGN_SHARED: 'design.shared',
  DESIGN_DELETED: 'design.deleted',

  // Catalog events
  CATALOG_SYNCED: 'catalog.synced',
  PRODUCT_CREATED: 'product.created',
  PRODUCT_UPDATED: 'product.updated',
  PRODUCT_DELETED: 'product.deleted',
  INVENTORY_UPDATED: 'inventory.updated',

  // User events
  USER_REGISTERED: 'user.registered',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  USER_VERIFIED: 'user.verified',

  // Payment events
  PAYMENT_INITIATED: 'payment.initiated',
  PAYMENT_SUCCEEDED: 'payment.succeeded',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',

  // AI events
  AI_RECOMMENDATION_GENERATED: 'ai.recommendation.generated',
  AI_DESIGN_SUGGESTED: 'ai.design.suggested',

  // System events
  SYSTEM_ERROR: 'system.error',
  SYSTEM_WARNING: 'system.warning',
};

// ============================================================
// Retry Policy Configuration
// ============================================================

export const RETRY_POLICY = {
  /**
   * Maximum number of retry attempts
   */
  maxRetries: 5,

  /**
   * Exponential backoff strategy
   * - Attempt 1: 1 second
   * - Attempt 2: 2 seconds
   * - Attempt 3: 4 seconds
   * - Attempt 4: 8 seconds
   * - Attempt 5: 16 seconds
   */
  backoffMultiplier: 2,
  initialDelay: 1000, // 1 second

  /**
   * Maximum delay between retries (30 seconds)
   */
  maxDelay: 30000,

  /**
   * Jitter to prevent thundering herd
   * - Adds random delay up to 20% of backoff time
   */
  jitter: 0.2,

  /**
   * Timeout for each webhook request
   */
  timeout: 30000, // 30 seconds

  /**
   * HTTP status codes that trigger retry
   */
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],

  /**
   * Network errors that trigger retry
   */
  retryableErrors: ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EHOSTUNREACH'],
};

// ============================================================
// Security Configuration
// ============================================================

export const SECURITY_CONFIG = {
  /**
   * HMAC signature algorithm
   */
  signatureAlgorithm: 'sha256',

  /**
   * Signature header name
   */
  signatureHeader: 'X-KitchenXpert-Signature',

  /**
   * Event type header
   */
  eventHeader: 'X-KitchenXpert-Event',

  /**
   * Delivery ID header (unique per delivery attempt)
   */
  deliveryIdHeader: 'X-KitchenXpert-Delivery-ID',

  /**
   * Timestamp header (for replay attack prevention)
   */
  timestampHeader: 'X-KitchenXpert-Timestamp',

  /**
   * Webhook version header
   */
  versionHeader: 'X-KitchenXpert-Version',

  /**
   * Current webhook API version
   */
  apiVersion: '2026-01',

  /**
   * Maximum age of webhook timestamp (5 minutes)
   * - Prevents replay attacks
   */
  maxTimestampAge: 5 * 60 * 1000,

  /**
   * Secret rotation support
   * - Allow multiple secrets for gradual rotation
   */
  allowMultipleSecrets: true,
};

// ============================================================
// Delivery Configuration
// ============================================================

export const DELIVERY_CONFIG = {
  /**
   * Maximum concurrent deliveries per endpoint
   */
  maxConcurrentDeliveries: 10,

  /**
   * Rate limit per endpoint (requests per minute)
   */
  rateLimit: 60,

  /**
   * Batch processing window (milliseconds)
   * - Group events within this window for batch delivery
   */
  batchWindow: 5000, // 5 seconds

  /**
   * Maximum batch size
   */
  maxBatchSize: 100,

  /**
   * Dead letter queue configuration
   */
  deadLetterQueue: {
    enabled: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    storageType: 'database', // 'database' | 'redis' | 's3'
  },

  /**
   * Webhook priority levels
   */
  priorities: {
    HIGH: 1,
    NORMAL: 5,
    LOW: 10,
  },

  /**
   * Default priority
   */
  defaultPriority: 5,
};

// ============================================================
// Event Priority Mapping
// ============================================================

export const EVENT_PRIORITIES = {
  [WEBHOOK_EVENTS.PAYMENT_SUCCEEDED]: DELIVERY_CONFIG.priorities.HIGH,
  [WEBHOOK_EVENTS.PAYMENT_FAILED]: DELIVERY_CONFIG.priorities.HIGH,
  [WEBHOOK_EVENTS.ORDER_CREATED]: DELIVERY_CONFIG.priorities.HIGH,
  [WEBHOOK_EVENTS.ORDER_COMPLETED]: DELIVERY_CONFIG.priorities.NORMAL,
  [WEBHOOK_EVENTS.USER_REGISTERED]: DELIVERY_CONFIG.priorities.NORMAL,
  [WEBHOOK_EVENTS.DESIGN_COMPLETED]: DELIVERY_CONFIG.priorities.NORMAL,
  [WEBHOOK_EVENTS.CATALOG_SYNCED]: DELIVERY_CONFIG.priorities.LOW,
  [WEBHOOK_EVENTS.SYSTEM_WARNING]: DELIVERY_CONFIG.priorities.LOW,
};

// ============================================================
// Monitoring Configuration
// ============================================================

export const MONITORING_CONFIG = {
  /**
   * Enable webhook delivery metrics
   */
  metricsEnabled: true,

  /**
   * Metrics collection interval (milliseconds)
   */
  metricsInterval: 60000, // 1 minute

  /**
   * Alert thresholds
   */
  alerts: {
    failureRateThreshold: 0.1, // 10% failure rate
    avgLatencyThreshold: 5000, // 5 seconds
    queueDepthThreshold: 1000, // 1000 pending webhooks
  },

  /**
   * Enable detailed logging
   */
  detailedLogging: process.env.NODE_ENV === 'development',

  /**
   * Log successful deliveries
   */
  logSuccessfulDeliveries: false,

  /**
   * Log failed deliveries
   */
  logFailedDeliveries: true,
};

// ============================================================
// Webhook Headers
// ============================================================

export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent': 'KitchenXpert-Webhook/2026-01',
  Accept: 'application/json',
};

// ============================================================
// Main Configuration Export
// ============================================================

export const WEBHOOK_CONFIG = {
  events: WEBHOOK_EVENTS,
  retry: RETRY_POLICY,
  security: SECURITY_CONFIG,
  delivery: DELIVERY_CONFIG,
  monitoring: MONITORING_CONFIG,
  headers: DEFAULT_HEADERS,
  eventPriorities: EVENT_PRIORITIES,
};

// ============================================================
// Helper Functions
// ============================================================

/**
 * Get retry delay for attempt number
 */
export const getRetryDelay = (attemptNumber) => {
  const baseDelay =
    RETRY_POLICY.initialDelay * Math.pow(RETRY_POLICY.backoffMultiplier, attemptNumber - 1);

  // Apply max delay cap
  const cappedDelay = Math.min(baseDelay, RETRY_POLICY.maxDelay);

  // Add jitter
  const jitter = cappedDelay * RETRY_POLICY.jitter * Math.random();

  return Math.floor(cappedDelay + jitter);
};

/**
 * Check if error is retryable
 */
export const isRetryableError = (error) => {
  // Check HTTP status code
  if (error.response?.status) {
    return RETRY_POLICY.retryableStatusCodes.includes(error.response.status);
  }

  // Check error code
  if (error.code) {
    return RETRY_POLICY.retryableErrors.includes(error.code);
  }

  // Network errors
  if (error.message?.includes('ECONNREFUSED') || error.message?.includes('timeout')) {
    return true;
  }

  return false;
};

/**
 * Get event priority
 */
export const getEventPriority = (eventType) => {
  return EVENT_PRIORITIES[eventType] || DELIVERY_CONFIG.defaultPriority;
};

/**
 * Validate webhook URL
 */
export const isValidWebhookUrl = (url) => {
  try {
    const parsedUrl = new URL(url);

    // Must use HTTPS in production
    if (process.env.NODE_ENV === 'production' && parsedUrl.protocol !== 'https:') {
      return false;
    }

    // Disallow localhost in production
    if (
      process.env.NODE_ENV === 'production' &&
      (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1')
    ) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
};

export default WEBHOOK_CONFIG;

// TODO: Add webhook endpoint health checks
// TODO: Add automatic circuit breaker for failing endpoints
// TODO: Add webhook delivery analytics dashboard
// TODO: Add support for custom retry strategies per endpoint
// TODO: Consider adding webhook signature verification SDK for clients
