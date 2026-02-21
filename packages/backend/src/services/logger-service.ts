/**
 * Logger Service
 * Structured logging with multiple transports and log levels
 */

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: string;
  metadata?: Record<string, unknown>;
  error?: ErrorInfo;
  requestId?: string;
  userId?: string;
  duration?: number;
  traceId?: string;
  spanId?: string;
}

export interface ErrorInfo {
  name: string;
  message: string;
  stack?: string;
  code?: string;
  cause?: ErrorInfo;
}

export interface LoggerConfig {
  level: LogLevel;
  format: LogFormat;
  transports: TransportConfig[];
  context?: string;
  defaultMetadata?: Record<string, unknown>;
  redactPaths?: string[];
  prettyPrint?: boolean;
}

export type LogFormat = 'json' | 'text' | 'pretty';

export interface TransportConfig {
  type: TransportType;
  level?: LogLevel;
  options?: Record<string, unknown>;
}

export type TransportType = 'console' | 'file' | 'http' | 'stream';

export interface LogTransport {
  log(entry: LogEntry): void;
  flush?(): Promise<void>;
  close?(): Promise<void>;
}

export interface LogQueryParams {
  level?: LogLevel;
  context?: string;
  startTime?: Date;
  endTime?: Date;
  requestId?: string;
  userId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  fatal: 5,
};

const LOG_COLORS: Record<LogLevel, string> = {
  trace: '\x1b[90m',
  debug: '\x1b[36m',
  info: '\x1b[32m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
  fatal: '\x1b[35m',
};

const RESET_COLOR = '\x1b[0m';

const defaultConfig: LoggerConfig = {
  level: 'info',
  format: 'json',
  transports: [{ type: 'console' }],
  redactPaths: ['password', 'token', 'apiKey', 'secret', 'authorization'],
};

export class Logger {
  private config: LoggerConfig;
  private transports: LogTransport[] = [];
  private childLoggers: Map<string, Logger> = new Map();

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.initializeTransports();
  }

  /**
   * Create a child logger with additional context
   */
  child(context: string, metadata?: Record<string, unknown>): Logger {
    const existingChild = this.childLoggers.get(context);
    if (existingChild) {
      return existingChild;
    }

    const childLogger = new Logger({
      ...this.config,
      context: this.config.context ? `${this.config.context}:${context}` : context,
      defaultMetadata: {
        ...this.config.defaultMetadata,
        ...metadata,
      },
    });

    this.childLoggers.set(context, childLogger);
    return childLogger;
  }

  /**
   * Log at trace level
   */
  trace(message: string, metadata?: Record<string, unknown>): void {
    this.log('trace', message, metadata);
  }

  /**
   * Log at debug level
   */
  debug(message: string, metadata?: Record<string, unknown>): void {
    this.log('debug', message, metadata);
  }

  /**
   * Log at info level
   */
  info(message: string, metadata?: Record<string, unknown>): void {
    this.log('info', message, metadata);
  }

  /**
   * Log at warn level
   */
  warn(message: string, metadata?: Record<string, unknown>): void {
    this.log('warn', message, metadata);
  }

  /**
   * Log at error level
   */
  error(message: string, error?: Error | Record<string, unknown>, metadata?: Record<string, unknown>): void {
    if (error instanceof Error) {
      this.log('error', message, {
        ...metadata,
        error: this.formatError(error),
      });
    } else {
      this.log('error', message, { ...error, ...metadata });
    }
  }

  /**
   * Log at fatal level
   */
  fatal(message: string, error?: Error | Record<string, unknown>, metadata?: Record<string, unknown>): void {
    if (error instanceof Error) {
      this.log('fatal', message, {
        ...metadata,
        error: this.formatError(error),
      });
    } else {
      this.log('fatal', message, { ...error, ...metadata });
    }
  }

  /**
   * Log HTTP request
   */
  logRequest(req: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
    requestId?: string;
    userId?: string;
  }): void {
    this.info('HTTP Request', {
      method: req.method,
      url: req.url,
      headers: this.redactSensitiveData(req.headers || {}),
      requestId: req.requestId,
      userId: req.userId,
    });
  }

  /**
   * Log HTTP response
   */
  logResponse(res: {
    statusCode: number;
    duration: number;
    requestId?: string;
    userId?: string;
  }): void {
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    this.log(level, 'HTTP Response', {
      statusCode: res.statusCode,
      duration: res.duration,
      requestId: res.requestId,
      userId: res.userId,
    });
  }

  /**
   * Log database query
   */
  logQuery(query: {
    sql?: string;
    operation: string;
    table?: string;
    duration: number;
    rowCount?: number;
  }): void {
    this.debug('Database Query', {
      operation: query.operation,
      table: query.table,
      duration: query.duration,
      rowCount: query.rowCount,
    });
  }

  /**
   * Log external service call
   */
  logExternalCall(call: {
    service: string;
    operation: string;
    duration: number;
    success: boolean;
    error?: Error;
  }): void {
    const level = call.success ? 'info' : 'error';
    this.log(level, `External call: ${call.service}`, {
      service: call.service,
      operation: call.operation,
      duration: call.duration,
      success: call.success,
      error: call.error ? this.formatError(call.error) : undefined,
    });
  }

  /**
   * Start a timer for measuring duration
   */
  startTimer(label: string): () => number {
    const start = process.hrtime.bigint();
    return () => {
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1_000_000; // Convert to ms
      this.debug(`Timer: ${label}`, { duration, label });
      return duration;
    };
  }

  /**
   * Flush all transports
   */
  async flush(): Promise<void> {
    await Promise.all(
      this.transports
        .filter(t => t.flush)
        .map(t => t.flush!())
    );
  }

  /**
   * Close all transports
   */
  async close(): Promise<void> {
    await this.flush();
    await Promise.all(
      this.transports
        .filter(t => t.close)
        .map(t => t.close!())
    );
  }

  // Private methods

  private log(level: LogLevel, message: string, metadata?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context: this.config.context,
      metadata: this.redactSensitiveData({
        ...this.config.defaultMetadata,
        ...metadata,
      }),
    };

    // Extract special fields
    if (metadata?.error && typeof metadata.error === 'object') {
      entry.error = metadata.error as ErrorInfo;
    }
    if (metadata?.requestId && typeof metadata.requestId === 'string') {
      entry.requestId = metadata.requestId;
    }
    if (metadata?.userId && typeof metadata.userId === 'string') {
      entry.userId = metadata.userId;
    }
    if (metadata?.duration && typeof metadata.duration === 'number') {
      entry.duration = metadata.duration;
    }

    this.transports.forEach(transport => transport.log(entry));
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.level];
  }

  private initializeTransports(): void {
    for (const transportConfig of this.config.transports) {
      const transport = this.createTransport(transportConfig);
      if (transport) {
        this.transports.push(transport);
      }
    }
  }

  private createTransport(config: TransportConfig): LogTransport | null {
    switch (config.type) {
      case 'console':
        return this.createConsoleTransport(config);
      case 'file':
        return this.createFileTransport(config);
      case 'http':
        return this.createHttpTransport(config);
      default:
        return null;
    }
  }

  private createConsoleTransport(config: TransportConfig): LogTransport {
    const minLevel = config.level || this.config.level;
    const format = this.config.format;
    const prettyPrint = this.config.prettyPrint;

    return {
      log: (entry: LogEntry) => {
        if (LOG_LEVELS[entry.level] < LOG_LEVELS[minLevel]) {
          return;
        }

        const output = format === 'json'
          ? this.formatJson(entry)
          : format === 'pretty' || prettyPrint
            ? this.formatPretty(entry)
            : this.formatText(entry);

        if (entry.level === 'error' || entry.level === 'fatal') {
          console.error(output);
        } else {
          console.log(output);
        }
      },
    };
  }

  private createFileTransport(_config: TransportConfig): LogTransport {
    // In a real implementation, this would write to a file
    const buffer: string[] = [];

    return {
      log: (entry: LogEntry) => {
        buffer.push(this.formatJson(entry));
      },
      flush: async () => {
        // Would write buffer to file
        buffer.length = 0;
      },
    };
  }

  private createHttpTransport(_config: TransportConfig): LogTransport {
    const buffer: LogEntry[] = [];

    return {
      log: (entry: LogEntry) => {
        buffer.push(entry);
      },
      flush: async () => {
        if (buffer.length === 0) return;
        // Would send logs to remote endpoint
        buffer.length = 0;
      },
    };
  }

  private formatJson(entry: LogEntry): string {
    return JSON.stringify({
      timestamp: entry.timestamp.toISOString(),
      level: entry.level,
      message: entry.message,
      context: entry.context,
      ...entry.metadata,
      error: entry.error,
      requestId: entry.requestId,
      userId: entry.userId,
      duration: entry.duration,
    });
  }

  private formatText(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const level = entry.level.toUpperCase().padEnd(5);
    const context = entry.context ? `[${entry.context}]` : '';
    const metadata = entry.metadata ? ` ${JSON.stringify(entry.metadata)}` : '';

    return `${timestamp} ${level} ${context} ${entry.message}${metadata}`;
  }

  private formatPretty(entry: LogEntry): string {
    const color = LOG_COLORS[entry.level];
    const timestamp = entry.timestamp.toISOString();
    const level = entry.level.toUpperCase().padEnd(5);
    const context = entry.context ? `[${entry.context}]` : '';

    let output = `${color}${timestamp} ${level}${RESET_COLOR} ${context} ${entry.message}`;

    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      output += `\n  ${JSON.stringify(entry.metadata, null, 2).replace(/\n/g, '\n  ')}`;
    }

    if (entry.error) {
      output += `\n  Error: ${entry.error.message}`;
      if (entry.error.stack) {
        output += `\n  ${entry.error.stack.replace(/\n/g, '\n  ')}`;
      }
    }

    return output;
  }

  private formatError(error: Error): ErrorInfo {
    const errorInfo: ErrorInfo = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };

    if ('code' in error && typeof error.code === 'string') {
      errorInfo.code = error.code;
    }

    if (error.cause instanceof Error) {
      errorInfo.cause = this.formatError(error.cause);
    }

    return errorInfo;
  }

  private redactSensitiveData<T extends Record<string, unknown>>(data: T): T {
    if (!this.config.redactPaths || this.config.redactPaths.length === 0) {
      return data;
    }

    const redacted = { ...data };

    for (const path of this.config.redactPaths) {
      if (path in redacted) {
        (redacted as Record<string, unknown>)[path] = '[REDACTED]';
      }
    }

    return redacted;
  }
}

/**
 * Request context for logging
 */
export class LogContext {
  private data: Map<string, unknown> = new Map();

  set(key: string, value: unknown): this {
    this.data.set(key, value);
    return this;
  }

  get(key: string): unknown {
    return this.data.get(key);
  }

  toObject(): Record<string, unknown> {
    const obj: Record<string, unknown> = {};
    for (const [key, value] of this.data) {
      obj[key] = value;
    }
    return obj;
  }
}

/**
 * Async local storage for request context
 */
let currentContext: LogContext | null = null;

export function setLogContext(context: LogContext): void {
  currentContext = context;
}

export function getLogContext(): LogContext | null {
  return currentContext;
}

export function clearLogContext(): void {
  currentContext = null;
}

// Singleton logger instance
let loggerInstance: Logger | null = null;

export function getLogger(config?: Partial<LoggerConfig>): Logger {
  if (!loggerInstance) {
    loggerInstance = new Logger(config);
  }
  return loggerInstance;
}

export function createLogger(config?: Partial<LoggerConfig>): Logger {
  return new Logger(config);
}

export default Logger;
