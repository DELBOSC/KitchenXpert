/**
 * Distributed Tracing Configuration for KitchenXpert
 *
 * Features:
 * - OpenTelemetry SDK setup
 * - Jaeger exporter for trace visualization
 * - Automatic instrumentation for HTTP, gRPC, database
 * - Custom span creation and attributes
 * - Trace context propagation
 * - Sampling strategies
 * - Resource detection
 */

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
const { BatchSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { ParentBasedSampler, TraceIdRatioBasedSampler } = require('@opentelemetry/sdk-trace-base');
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');
const { PgInstrumentation } = require('@opentelemetry/instrumentation-pg');
const { MongoDBInstrumentation } = require('@opentelemetry/instrumentation-mongodb');
const { RedisInstrumentation } = require('@opentelemetry/instrumentation-redis-4');

// Environment configuration
const NODE_ENV = process.env.NODE_ENV || 'development';
const TRACING_ENABLED = process.env.TRACING_ENABLED === 'true' || NODE_ENV === 'production';
const SERVICE_NAME = process.env.SERVICE_NAME || 'kitchenxpert-api';
const SERVICE_VERSION = process.env.APP_VERSION || '1.0.0';

// Jaeger configuration
const JAEGER_ENDPOINT = process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces';
const JAEGER_AGENT_HOST = process.env.JAEGER_AGENT_HOST || 'localhost';
const JAEGER_AGENT_PORT = parseInt(process.env.JAEGER_AGENT_PORT || '6832', 10);

// Sampling rate (1.0 = 100%, 0.1 = 10%)
const SAMPLE_RATE = parseFloat(process.env.TRACE_SAMPLE_RATE || '1.0');

/**
 * Create resource with service information
 */
const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: SERVICE_NAME,
  [SemanticResourceAttributes.SERVICE_VERSION]: SERVICE_VERSION,
  [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: NODE_ENV,
  [SemanticResourceAttributes.SERVICE_NAMESPACE]: 'kitchenxpert',
  [SemanticResourceAttributes.SERVICE_INSTANCE_ID]: process.env.HOSTNAME || require('os').hostname(),
  // Additional custom attributes
  'service.tier': process.env.TIER || 'api',
  'datacenter': process.env.DATACENTER || 'us-east-1',
});

/**
 * Configure Jaeger exporter
 */
const jaegerExporter = new JaegerExporter({
  // Use HTTP endpoint (for production)
  endpoint: JAEGER_ENDPOINT,

  // Or use UDP agent (for development)
  // host: JAEGER_AGENT_HOST,
  // port: JAEGER_AGENT_PORT,

  // Maximum packet size
  maxPacketSize: 65000,

  // Custom tags
  tags: [
    { key: 'environment', value: NODE_ENV },
    { key: 'version', value: SERVICE_VERSION },
  ],
});

/**
 * Configure sampling strategy
 * Parent-based sampler: if parent span is sampled, sample this span too
 * Otherwise, use probability-based sampling
 */
const sampler = new ParentBasedSampler({
  root: new TraceIdRatioBasedSampler(SAMPLE_RATE),
});

/**
 * Configure instrumentation libraries
 */
const instrumentations = [
  // HTTP/HTTPS client and server
  new HttpInstrumentation({
    // Ignore health check and metrics endpoints
    ignoreIncomingPaths: [
      '/health',
      '/metrics',
      '/favicon.ico',
    ],
    // Capture request and response headers
    requestHook: (span, request) => {
      span.setAttribute('http.request_id', request.headers['x-request-id'] || 'unknown');
    },
    responseHook: (span, response) => {
      span.setAttribute('http.status_code', response.statusCode);
    },
    // Require parent span for outgoing requests
    requireParentforOutgoingSpans: false,
    // Require parent span for incoming requests
    requireParentforIncomingSpans: false,
  }),

  // Express framework
  new ExpressInstrumentation({
    // Capture request hook
    requestHook: (span, requestInfo) => {
      span.setAttribute('express.type', requestInfo.layerType);
      span.setAttribute('express.route', requestInfo.route);
    },
  }),

  // PostgreSQL database
  new PgInstrumentation({
    // Enhance spans with SQL queries
    enhancedDatabaseReporting: true,
    // Add SQL query as attribute (be careful with sensitive data)
    addSqlCommenterCommentToQueries: NODE_ENV !== 'production',
  }),

  // MongoDB database
  new MongoDBInstrumentation({
    // Enhance spans with database operations
    enhancedDatabaseReporting: true,
  }),

  // Redis cache
  new RedisInstrumentation({
    // Capture database statement
    dbStatementSerializer: (cmdName, cmdArgs) => {
      // Redact sensitive data
      if (cmdName === 'AUTH') return 'AUTH [REDACTED]';
      return `${cmdName} ${cmdArgs.join(' ')}`.substring(0, 1000);
    },
  }),

  // Auto-instrumentations for other common libraries
  getNodeAutoInstrumentations({
    // Disable some instrumentations if needed
    '@opentelemetry/instrumentation-fs': {
      enabled: false, // File system can be noisy
    },
  }),
];

/**
 * Initialize OpenTelemetry SDK
 */
let sdk = null;

if (TRACING_ENABLED) {
  sdk = new NodeSDK({
    resource,
    sampler,
    instrumentations,
    spanProcessor: new BatchSpanProcessor(jaegerExporter, {
      // Maximum queue size
      maxQueueSize: 2048,
      // Maximum batch size
      maxExportBatchSize: 512,
      // Scheduled delay in milliseconds
      scheduledDelayMillis: 5000,
      // Export timeout in milliseconds
      exportTimeoutMillis: 30000,
    }),
  });

  // Start the SDK
  sdk.start();
  console.log(`OpenTelemetry tracing initialized for service: ${SERVICE_NAME}`);

  // Graceful shutdown
  process.on('SIGTERM', () => {
    sdk.shutdown()
      .then(() => console.log('Tracing terminated'))
      .catch((error) => console.error('Error terminating tracing', error))
      .finally(() => process.exit(0));
  });
}

/**
 * Tracing utilities
 */
const { trace, context, SpanStatusCode } = require('@opentelemetry/api');

const TracingUtils = {
  /**
   * Get the active tracer
   */
  getTracer() {
    return trace.getTracer(SERVICE_NAME, SERVICE_VERSION);
  },

  /**
   * Start a new span
   */
  startSpan(name, options = {}) {
    if (!TRACING_ENABLED) return { end: () => {}, setAttribute: () => {} };
    return this.getTracer().startSpan(name, options);
  },

  /**
   * Start an active span with automatic context propagation
   */
  startActiveSpan(name, options = {}, fn) {
    if (!TRACING_ENABLED) return fn({ end: () => {}, setAttribute: () => {} });
    return this.getTracer().startActiveSpan(name, options, fn);
  },

  /**
   * Wrap an async function with tracing
   */
  async traceAsync(name, attributes = {}, fn) {
    return this.startActiveSpan(name, { attributes }, async (span) => {
      try {
        const result = await fn(span);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.recordException(error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.message,
        });
        throw error;
      } finally {
        span.end();
      }
    });
  },

  /**
   * Wrap a synchronous function with tracing
   */
  traceSync(name, attributes = {}, fn) {
    return this.startActiveSpan(name, { attributes }, (span) => {
      try {
        const result = fn(span);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.recordException(error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.message,
        });
        throw error;
      } finally {
        span.end();
      }
    });
  },

  /**
   * Get current span
   */
  getCurrentSpan() {
    return trace.getSpan(context.active());
  },

  /**
   * Add event to current span
   */
  addEvent(name, attributes = {}) {
    const span = this.getCurrentSpan();
    if (span) {
      span.addEvent(name, attributes);
    }
  },

  /**
   * Set attribute on current span
   */
  setAttribute(key, value) {
    const span = this.getCurrentSpan();
    if (span) {
      span.setAttribute(key, value);
    }
  },

  /**
   * Set multiple attributes on current span
   */
  setAttributes(attributes) {
    const span = this.getCurrentSpan();
    if (span) {
      span.setAttributes(attributes);
    }
  },

  /**
   * Record exception on current span
   */
  recordException(error) {
    const span = this.getCurrentSpan();
    if (span) {
      span.recordException(error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
    }
  },

  /**
   * Express middleware to add tracing
   */
  middleware() {
    return (req, res, next) => {
      if (!TRACING_ENABLED) return next();

      const span = this.getCurrentSpan();
      if (span) {
        // Add custom attributes
        span.setAttribute('http.request_id', req.requestId || 'unknown');
        span.setAttribute('http.user_agent', req.get('user-agent') || 'unknown');

        if (req.user) {
          span.setAttribute('user.id', req.user.id);
          span.setAttribute('user.email', req.user.email);
        }
      }

      next();
    };
  },
};

module.exports = {
  sdk,
  TracingUtils,
  isEnabled: TRACING_ENABLED,
};
