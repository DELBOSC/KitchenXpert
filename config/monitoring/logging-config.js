/**
 * Centralized Logging Configuration for KitchenXpert
 *
 * Features:
 * - Winston logger with multiple transports
 * - Environment-based log levels
 * - Structured JSON logging
 * - Log rotation for file transports
 * - Sensitive data redaction
 * - Request/Response logging
 */

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Environment configuration
const NODE_ENV = process.env.NODE_ENV || 'development';
const LOG_LEVEL = process.env.LOG_LEVEL || (NODE_ENV === 'production' ? 'info' : 'debug');
const LOG_DIR = process.env.LOG_DIR || path.join(__dirname, '../../logs');

// Sensitive data patterns to redact
const SENSITIVE_PATTERNS = [
  /password['":\s]*['"]([^'"]+)['"]/gi,
  /token['":\s]*['"]([^'"]+)['"]/gi,
  /authorization['":\s]*['"]([^'"]+)['"]/gi,
  /api[_-]?key['":\s]*['"]([^'"]+)['"]/gi,
  /secret['":\s]*['"]([^'"]+)['"]/gi,
  /credit[_-]?card['":\s]*['"]([^'"]+)['"]/gi,
  /ssn['":\s]*['"]([^'"]+)['"]/gi,
];

/**
 * Redact sensitive information from log messages
 */
const redactSensitiveData = winston.format((info) => {
  let message = typeof info.message === 'string' ? info.message : JSON.stringify(info.message);

  SENSITIVE_PATTERNS.forEach((pattern) => {
    message = message.replace(pattern, (match, group) => {
      return match.replace(group, '***REDACTED***');
    });
  });

  if (typeof info.message === 'string') {
    info.message = message;
  }

  // Redact from metadata objects
  if (info.metadata) {
    info.metadata = JSON.parse(
      JSON.stringify(info.metadata).replace(
        /("password"|"token"|"secret"):"[^"]*"/g,
        '$1:"***REDACTED***"'
      )
    );
  }

  return info;
});

/**
 * Custom format for console output (human-readable)
 */
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.errors({ stack: true }),
  redactSensitiveData(),
  winston.format.printf(
    ({ timestamp, level, message, service, requestId, userId, ...metadata }) => {
      let log = `${timestamp} [${level}]`;

      if (service) log += ` [${service}]`;
      if (requestId) log += ` [req:${requestId}]`;
      if (userId) log += ` [user:${userId}]`;

      log += `: ${message}`;

      if (Object.keys(metadata).length > 0) {
        log += ` ${JSON.stringify(metadata)}`;
      }

      return log;
    }
  )
);

/**
 * JSON format for file and HTTP transports
 */
const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  redactSensitiveData(),
  winston.format.json()
);

/**
 * Create daily rotate file transport
 */
const createRotateTransport = (filename, level = LOG_LEVEL) => {
  return new DailyRotateFile({
    filename: path.join(LOG_DIR, `${filename}-%DATE%.log`),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d', // Keep logs for 14 days
    level: level,
    format: jsonFormat,
  });
};

/**
 * Transports configuration
 */
const transports = [];

// Console transport (always enabled)
transports.push(
  new winston.transports.Console({
    level: LOG_LEVEL,
    format: consoleFormat,
    handleExceptions: true,
    handleRejections: true,
  })
);

// File transports (disabled in test environment)
if (NODE_ENV !== 'test') {
  // Combined log (all levels)
  transports.push(createRotateTransport('combined', LOG_LEVEL));

  // Error log (error level only)
  transports.push(createRotateTransport('error', 'error'));

  // Audit log (info level and above)
  transports.push(
    new DailyRotateFile({
      filename: path.join(LOG_DIR, 'audit-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d', // Keep audit logs for 30 days
      level: 'info',
      format: jsonFormat,
    })
  );
}

// HTTP transport for centralized logging (production only)
if (NODE_ENV === 'production' && process.env.LOG_HTTP_ENDPOINT) {
  transports.push(
    new winston.transports.Http({
      host: process.env.LOG_HTTP_HOST || 'localhost',
      port: process.env.LOG_HTTP_PORT || 3000,
      path: process.env.LOG_HTTP_PATH || '/logs',
      ssl: process.env.LOG_HTTP_SSL === 'true',
      level: 'info',
      format: jsonFormat,
    })
  );
}

/**
 * Create Winston logger instance
 */
const logger = winston.createLogger({
  level: LOG_LEVEL,
  levels: winston.config.npm.levels,
  defaultMeta: {
    service: process.env.SERVICE_NAME || 'kitchenxpert-api',
    environment: NODE_ENV,
    hostname: process.env.HOSTNAME || require('os').hostname(),
  },
  transports,
  exitOnError: false,
});

/**
 * Create child logger with additional context
 */
logger.createChild = (metadata) => {
  return logger.child(metadata);
};

/**
 * Request logger middleware for Express
 */
logger.requestLogger = () => {
  return (req, res, next) => {
    const requestId = req.headers['x-request-id'] || require('crypto').randomUUID();
    req.requestId = requestId;

    const startTime = Date.now();

    // Log request
    logger.info('Incoming request', {
      requestId,
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user?.id,
    });

    // Log response
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

      logger.log(level, 'Request completed', {
        requestId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        userId: req.user?.id,
      });
    });

    next();
  };
};

/**
 * Error logger middleware for Express
 */
logger.errorLogger = () => {
  return (err, req, res, next) => {
    logger.error('Unhandled error', {
      requestId: req.requestId,
      error: err.message,
      stack: err.stack,
      method: req.method,
      url: req.url,
      userId: req.user?.id,
    });
    next(err);
  };
};

/**
 * Performance logger
 */
logger.logPerformance = (operation, duration, metadata = {}) => {
  const level = duration > 1000 ? 'warn' : 'debug';
  logger.log(level, `Performance: ${operation}`, {
    operation,
    duration: `${duration}ms`,
    ...metadata,
  });
};

/**
 * Business event logger
 */
logger.logBusinessEvent = (event, data = {}) => {
  logger.info(`Business Event: ${event}`, {
    event,
    eventType: 'business',
    ...data,
  });
};

/**
 * Security event logger
 */
logger.logSecurityEvent = (event, data = {}) => {
  logger.warn(`Security Event: ${event}`, {
    event,
    eventType: 'security',
    ...data,
  });
};

// Handle uncaught exceptions and rejections
if (NODE_ENV === 'production') {
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', { reason, promise });
  });
}

module.exports = logger;
