/**
 * Logger Utility
 *
 * Winston-based logging for the backend
 */

import fs from 'fs';
import path from 'path';

import winston from 'winston';

const LOG_DIR = process.env.LOG_FILE_PATH || './logs';
const LOG_LEVEL = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Custom format for console output (development)
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp || ''} ${level}: ${message}${metaStr}`;
  })
);

// JSON format for production
const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// File format (always JSON for easy parsing)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create transports array
const transports: winston.transport[] = [
  // Console output - pretty for dev, JSON for production
  new winston.transports.Console({
    format: IS_PRODUCTION ? jsonFormat : consoleFormat,
  }),
];

// Add file transports only if we have write permissions
try {
  transports.push(
    // Combined log file
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'combined.log'),
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),

    // Error log file
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    })
  );
} catch {
  // File transports not available, continue with console only
}

// Create the logger instance
export const logger = winston.createLogger({
  level: LOG_LEVEL,
  defaultMeta: { service: 'kitchenxpert-backend' },
  transports,
});

/**
 * Create a child logger with additional context
 */
export function createChildLogger(context: string, metadata?: Record<string, unknown>): winston.Logger {
  return logger.child({ context, ...metadata });
}

/**
 * Create a logger for a specific module/service
 */
export function createModuleLogger(moduleName: string): winston.Logger {
  return logger.child({ module: moduleName });
}

export default logger;
