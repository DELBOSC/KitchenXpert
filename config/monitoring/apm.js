/**
 * Application Performance Monitoring (APM) Configuration for KitchenXpert
 *
 * Features:
 * - Elastic APM integration
 * - Transaction tracking
 * - Error tracking and reporting
 * - Distributed tracing
 * - Custom metrics and spans
 * - Database query monitoring
 * - External service call tracking
 */

const apm = require('elastic-apm-node');

// Environment configuration
const NODE_ENV = process.env.NODE_ENV || 'development';
const APM_ENABLED = process.env.APM_ENABLED === 'true' || NODE_ENV === 'production';

/**
 * APM Configuration
 */
const apmConfig = {
  // Service name (used as the primary identifier in the APM UI)
  serviceName: process.env.APM_SERVICE_NAME || 'kitchenxpert-api',

  // Secret token for authentication with APM Server
  secretToken: process.env.APM_SECRET_TOKEN || '',

  // APM Server URL
  serverUrl: process.env.APM_SERVER_URL || 'http://localhost:8200',

  // Environment name (dev, staging, production)
  environment: NODE_ENV,

  // Service version (from package.json or git commit)
  serviceVersion: process.env.APP_VERSION || '1.0.0',

  // Enable/disable APM agent
  active: APM_ENABLED,

  // Capture request body
  captureBody: NODE_ENV === 'production' ? 'errors' : 'all',

  // Capture request headers
  captureHeaders: true,

  // Log level for the agent
  logLevel: process.env.APM_LOG_LEVEL || (NODE_ENV === 'production' ? 'warn' : 'info'),

  // Transaction sample rate (1.0 = 100%, 0.1 = 10%)
  transactionSampleRate: parseFloat(process.env.APM_SAMPLE_RATE || '1.0'),

  // Span stack trace minimum duration (in milliseconds)
  spanStackTraceMinDuration: 5,

  // Stack trace limit
  stackTraceLimit: 50,

  // Capture error log stack traces
  captureErrorLogStackTraces: 'always',

  // Use path as transaction name
  usePathAsTransactionName: false,

  // Ignore certain routes
  ignoreUrls: [
    '/health',
    '/metrics',
    '/favicon.ico',
  ],

  // Transaction ignore patterns
  transactionIgnoreUrls: [
    '/health',
    '/metrics',
  ],

  // Capture exceptions
  captureExceptions: true,

  // Breakdown metrics
  breakdownMetrics: true,

  // Central config
  centralConfig: false,

  // Cloud provider
  cloudProvider: process.env.CLOUD_PROVIDER || 'auto',

  // Metrics interval (in seconds)
  metricsInterval: '30s',

  // API request time
  apiRequestTime: '10s',

  // Server timeout
  serverTimeout: '30s',

  // Disable instrumentations (if needed)
  disableInstrumentations: [],

  // Add custom context
  addPatch: undefined,

  // Global labels (added to all events)
  globalLabels: {
    datacenter: process.env.DATACENTER || 'us-east-1',
    tier: process.env.TIER || 'api',
  },
};

/**
 * Initialize APM agent
 */
let apmInstance = null;

if (APM_ENABLED) {
  apmInstance = apm.start(apmConfig);
  console.log(`APM Agent initialized for service: ${apmConfig.serviceName}`);
}

/**
 * Custom APM utilities
 */
const APMUtils = {
  /**
   * Start a custom transaction
   */
  startTransaction(name, type = 'custom') {
    if (!apmInstance) return null;
    return apm.startTransaction(name, type);
  },

  /**
   * End the current transaction
   */
  endTransaction(result = 'success') {
    if (!apmInstance) return;
    const transaction = apm.currentTransaction;
    if (transaction) {
      transaction.result = result;
      transaction.end();
    }
  },

  /**
   * Start a custom span
   */
  startSpan(name, type = 'custom', subtype = null, action = null) {
    if (!apmInstance) return null;
    return apm.startSpan(name, type, subtype, action);
  },

  /**
   * Capture an error
   */
  captureError(error, options = {}) {
    if (!apmInstance) {
      console.error('APM Error:', error);
      return;
    }
    apm.captureError(error, options);
  },

  /**
   * Set custom context for the current transaction
   */
  setCustomContext(context) {
    if (!apmInstance) return;
    apm.setCustomContext(context);
  },

  /**
   * Set user context
   */
  setUserContext(user) {
    if (!apmInstance) return;
    apm.setUserContext({
      id: user.id,
      username: user.username || user.email,
      email: user.email,
    });
  },

  /**
   * Set label (tag) for the current transaction
   */
  setLabel(key, value) {
    if (!apmInstance) return;
    apm.setLabel(key, value);
  },

  /**
   * Set multiple labels at once
   */
  setLabels(labels) {
    if (!apmInstance) return;
    Object.entries(labels).forEach(([key, value]) => {
      apm.setLabel(key, value);
    });
  },

  /**
   * Add filter to modify events before sending to APM Server
   */
  addFilter(filter) {
    if (!apmInstance) return;
    apm.addFilter(filter);
  },

  /**
   * Track database query
   */
  async trackDatabaseQuery(operation, query, executor) {
    const span = this.startSpan(`DB ${operation}`, 'db', 'postgresql', operation);

    try {
      span?.addLabels({
        'db.statement': query.substring(0, 1000), // Limit query length
      });

      const result = await executor();
      span?.end();
      return result;
    } catch (error) {
      span?.end();
      this.captureError(error, {
        custom: {
          operation,
          query: query.substring(0, 1000),
        },
      });
      throw error;
    }
  },

  /**
   * Track external HTTP call
   */
  async trackExternalCall(name, method, url, executor) {
    const span = this.startSpan(`External ${name}`, 'external', 'http', method);

    try {
      span?.addLabels({
        'http.method': method,
        'http.url': url,
      });

      const result = await executor();
      span?.end();
      return result;
    } catch (error) {
      span?.end();
      this.captureError(error, {
        custom: {
          service: name,
          method,
          url,
        },
      });
      throw error;
    }
  },

  /**
   * Track cache operation
   */
  async trackCacheOperation(operation, key, executor) {
    const span = this.startSpan(`Cache ${operation}`, 'cache', 'redis', operation);

    try {
      span?.addLabels({
        'cache.key': key,
      });

      const result = await executor();
      span?.end();
      return result;
    } catch (error) {
      span?.end();
      this.captureError(error, {
        custom: {
          operation,
          key,
        },
      });
      throw error;
    }
  },

  /**
   * Middleware for Express to enhance APM tracking
   */
  middleware() {
    return (req, res, next) => {
      if (!apmInstance) return next();

      // Set custom context
      this.setCustomContext({
        request_id: req.requestId,
        path: req.path,
        query: req.query,
      });

      // Set user context if available
      if (req.user) {
        this.setUserContext(req.user);
      }

      // Set labels
      this.setLabels({
        method: req.method,
        route: req.route?.path || 'unknown',
        user_agent: req.get('user-agent') || 'unknown',
      });

      next();
    };
  },
};

/**
 * Filter to sanitize sensitive data before sending to APM
 */
if (apmInstance) {
  apmInstance.addFilter((payload) => {
    // Remove sensitive headers
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];

    if (payload.context?.request?.headers) {
      sensitiveHeaders.forEach(header => {
        if (payload.context.request.headers[header]) {
          payload.context.request.headers[header] = '[REDACTED]';
        }
      });
    }

    // Remove sensitive body fields
    if (payload.context?.request?.body) {
      const sensitiveFields = ['password', 'token', 'secret', 'credit_card'];
      sensitiveFields.forEach(field => {
        if (payload.context.request.body[field]) {
          payload.context.request.body[field] = '[REDACTED]';
        }
      });
    }

    return payload;
  });
}

module.exports = {
  apm: apmInstance,
  APMUtils,
  isEnabled: APM_ENABLED,
};
