/**
 * Intercepteur de logging
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LoggerInterceptorConfig {
  enabled?: boolean;
  level?: LogLevel;
  logRequest?: boolean;
  logResponse?: boolean;
  logErrors?: boolean;
  redactHeaders?: string[];
  redactBody?: string[];
  customLogger?: Logger;
}

export interface Logger {
  debug: (message: string, data?: unknown) => void;
  info: (message: string, data?: unknown) => void;
  warn: (message: string, data?: unknown) => void;
  error: (message: string, data?: unknown) => void;
}

export interface RequestLog {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  timestamp: number;
}

export interface ResponseLog {
  status: number;
  statusText?: string;
  headers?: Record<string, string>;
  body?: unknown;
  duration: number;
  timestamp: number;
}

const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class LoggerInterceptor {
  private config: Required<LoggerInterceptorConfig>;
  private requestTimestamps: Map<string, number> = new Map();

  constructor(config: LoggerInterceptorConfig = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      level: config.level ?? 'info',
      logRequest: config.logRequest ?? true,
      logResponse: config.logResponse ?? true,
      logErrors: config.logErrors ?? true,
      redactHeaders: config.redactHeaders ?? ['authorization', 'cookie', 'x-api-key'],
      redactBody: config.redactBody ?? ['password', 'token', 'secret', 'apiKey'],
      customLogger: config.customLogger ?? this.createDefaultLogger(),
    };
  }

  /**
   * Log une requête sortante
   */
  logRequest(requestId: string, request: RequestLog): void {
    if (!this.config.enabled || !this.config.logRequest) return;

    // Prevent unbounded growth of requestTimestamps map
    if (this.requestTimestamps.size > 1000) {
      const now = Date.now();
      for (const [key, timestamp] of this.requestTimestamps) {
        // Remove entries older than 5 minutes
        if (now - timestamp > 300000) {
          this.requestTimestamps.delete(key);
        }
      }
      // If still too large after cleanup, clear all
      if (this.requestTimestamps.size > 1000) {
        this.requestTimestamps.clear();
      }
    }

    this.requestTimestamps.set(requestId, request.timestamp);

    const sanitizedRequest = {
      ...request,
      headers: this.redactSensitiveData(request.headers || {}, this.config.redactHeaders),
      body: this.redactSensitiveData(
        request.body as Record<string, unknown>,
        this.config.redactBody
      ),
    };

    this.log('info', `[API Request] ${request.method} ${request.url}`, sanitizedRequest);
  }

  /**
   * Log une réponse reçue
   */
  logResponse(requestId: string, response: ResponseLog): void {
    if (!this.config.enabled || !this.config.logResponse) return;

    const startTime = this.requestTimestamps.get(requestId);
    const duration = startTime ? Date.now() - startTime : response.duration;

    this.requestTimestamps.delete(requestId);

    const level: LogLevel = response.status >= 400 ? 'warn' : 'info';

    const sanitizedResponse = {
      ...response,
      duration,
      headers: this.redactSensitiveData(response.headers || {}, this.config.redactHeaders),
    };

    this.log(level, `[API Response] ${response.status} (${duration}ms)`, sanitizedResponse);
  }

  /**
   * Log une erreur
   */
  logError(requestId: string, error: Error, context?: Record<string, unknown>): void {
    if (!this.config.enabled || !this.config.logErrors) return;

    this.requestTimestamps.delete(requestId);

    this.log('error', `[API Error] ${error.message}`, {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...context,
    });
  }

  private log(level: LogLevel, message: string, data?: unknown): void {
    if (LOG_LEVEL_ORDER[level] < LOG_LEVEL_ORDER[this.config.level]) {
      return;
    }

    this.config.customLogger[level](message, data);
  }

  private redactSensitiveData(
    data: Record<string, unknown>,
    keysToRedact: string[]
  ): Record<string, unknown> {
    if (!data || typeof data !== 'object') return data;

    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();

      if (keysToRedact.some((k) => lowerKey.includes(k.toLowerCase()))) {
        result[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.redactSensitiveData(value as Record<string, unknown>, keysToRedact);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  private createDefaultLogger(): Logger {
    return {
      debug: (message, data) => console.debug(message, data),
      info: (message, data) => console.info(message, data),
      warn: (message, data) => console.warn(message, data),
      error: (message, data) => console.error(message, data),
    };
  }
}

export function createLoggerInterceptor(config?: LoggerInterceptorConfig): LoggerInterceptor {
  return new LoggerInterceptor(config);
}
