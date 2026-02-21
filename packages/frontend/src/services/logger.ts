/**
 * Frontend Logger Service
 *
 * Provides centralized logging for the frontend application.
 * In production, errors can be sent to monitoring services like Sentry.
 * In development, logs are written to the console.
 *
 * Usage:
 * ```typescript
 * import { logger } from '@/services/logger';
 *
 * logger.error('Failed to fetch data', error);
 * logger.warn('Deprecated API used');
 * logger.info('User logged in');
 * logger.debug('Component rendered');
 * ```
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: Record<string, unknown>;
  error?: Error;
}

interface LoggerConfig {
  /** Minimum log level to output */
  minLevel: LogLevel;
  /** Whether to include timestamps */
  includeTimestamp: boolean;
  /** Whether to send errors to monitoring service */
  reportErrors: boolean;
  /** Custom error reporter (e.g., Sentry) */
  errorReporter?: (entry: LogEntry) => void;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const isProduction = import.meta.env.PROD;
const isDevelopment = import.meta.env.DEV;

const defaultConfig: LoggerConfig = {
  minLevel: isProduction ? 'warn' : 'debug',
  includeTimestamp: true,
  reportErrors: isProduction,
};

class Logger {
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Configure the logger
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Set a custom error reporter (e.g., Sentry.captureException)
   */
  setErrorReporter(reporter: (entry: LogEntry) => void): void {
    this.config.errorReporter = reporter;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.minLevel];
  }

  private formatMessage(entry: LogEntry): string {
    const parts: string[] = [];

    if (this.config.includeTimestamp) {
      parts.push(`[${entry.timestamp}]`);
    }

    parts.push(`[${entry.level.toUpperCase()}]`);
    parts.push(entry.message);

    return parts.join(' ');
  }

  private createEntry(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown> | Error
  ): LogEntry {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
    };

    if (data instanceof Error) {
      entry.error = data;
      entry.data = {
        name: data.name,
        message: data.message,
        stack: data.stack,
      };
    } else if (data) {
      entry.data = data;
    }

    return entry;
  }

  private log(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    const formattedMessage = this.formatMessage(entry);

    // Output to console in development
    if (isDevelopment) {
      const consoleMethod = entry.level === 'debug' ? 'log' : entry.level;
      if (entry.data) {
        console[consoleMethod](formattedMessage, entry.data);
      } else {
        console[consoleMethod](formattedMessage);
      }
    }

    // Report errors to monitoring service in production
    if (entry.level === 'error' && this.config.reportErrors) {
      this.reportError(entry);
    }
  }

  private reportError(entry: LogEntry): void {
    if (this.config.errorReporter) {
      try {
        this.config.errorReporter(entry);
      } catch (e) {
        // Silently fail if error reporting fails
        if (isDevelopment) {
          console.error('Failed to report error:', e);
        }
      }
    }

    // Default: could integrate with Sentry here
    // Example:
    // if (typeof Sentry !== 'undefined' && entry.error) {
    //   Sentry.captureException(entry.error, {
    //     extra: entry.data,
    //     tags: { message: entry.message },
    //   });
    // }
  }

  /**
   * Log debug message (development only by default)
   */
  debug(message: string, data?: Record<string, unknown>): void {
    this.log(this.createEntry('debug', message, data));
  }

  /**
   * Log info message
   */
  info(message: string, data?: Record<string, unknown>): void {
    this.log(this.createEntry('info', message, data));
  }

  /**
   * Log warning message
   */
  warn(message: string, data?: Record<string, unknown>): void {
    this.log(this.createEntry('warn', message, data));
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | Record<string, unknown>): void {
    this.log(this.createEntry('error', message, error));
  }

  /**
   * Create a child logger with a prefix
   */
  child(prefix: string): ChildLogger {
    return new ChildLogger(this, prefix);
  }
}

class ChildLogger {
  constructor(
    private parent: Logger,
    private prefix: string
  ) {}

  debug(message: string, data?: Record<string, unknown>): void {
    this.parent.debug(`[${this.prefix}] ${message}`, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.parent.info(`[${this.prefix}] ${message}`, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.parent.warn(`[${this.prefix}] ${message}`, data);
  }

  error(message: string, error?: Error | Record<string, unknown>): void {
    this.parent.error(`[${this.prefix}] ${message}`, error);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export class for custom instances
export { Logger, ChildLogger };
export type { LoggerConfig, LogEntry, LogLevel };
