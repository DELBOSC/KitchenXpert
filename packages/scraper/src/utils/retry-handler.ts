/**
 * Retry Handler
 *
 * Handles automatic retries with exponential backoff
 */

import { logger } from './logger.js';

interface RetryOptions {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Initial delay between retries (ms) */
  initialDelay: number;
  /** Maximum delay between retries (ms) */
  maxDelay: number;
  /** Multiplier for exponential backoff */
  backoffMultiplier: number;
  /** Whether to add jitter to delays */
  addJitter: boolean;
  /** Errors that should trigger a retry */
  retryableErrors?: string[];
  /** HTTP status codes that should trigger a retry */
  retryableStatusCodes?: number[];
  /** Callback for each retry attempt */
  onRetry?: (attempt: number, error: Error, delay: number) => void;
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  addJitter: true,
  retryableErrors: [
    'ECONNRESET',
    'ETIMEDOUT',
    'ECONNREFUSED',
    'ENOTFOUND',
    'ENETUNREACH',
    'EAI_AGAIN',
    'EPIPE',
    'EHOSTUNREACH',
  ],
  retryableStatusCodes: [408, 429, 500, 502, 503, 504, 520, 521, 522, 523, 524],
};

export class RetryError extends Error {
  constructor(
    message: string,
    public readonly attempts: number,
    public readonly lastError: Error
  ) {
    super(message);
    this.name = 'RetryError';
  }
}

export class RetryHandler {
  private options: RetryOptions;

  constructor(options: Partial<RetryOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Calculate delay for a given attempt
   */
  private calculateDelay(attempt: number): number {
    let delay = this.options.initialDelay * Math.pow(this.options.backoffMultiplier, attempt - 1);
    delay = Math.min(delay, this.options.maxDelay);

    if (this.options.addJitter) {
      // Add up to 25% jitter
      const jitter = delay * 0.25 * Math.random();
      delay += jitter;
    }

    return Math.round(delay);
  }

  /**
   * Check if an error is retryable
   */
  private isRetryable(error: Error): boolean {
    // Check error code
    const errorCode = (error as NodeJS.ErrnoException).code;
    if (errorCode && this.options.retryableErrors?.includes(errorCode)) {
      return true;
    }

    // Check HTTP status code
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode && this.options.retryableStatusCodes?.includes(statusCode)) {
      return true;
    }

    // Check for common retryable messages
    const retryableMessages = [
      'socket hang up',
      'network error',
      'timeout',
      'ECONNRESET',
      'ERR_CONNECTION_REFUSED',
    ];

    const errorMessage = error.message.toLowerCase();
    return retryableMessages.some((msg) => errorMessage.includes(msg.toLowerCase()));
  }

  /**
   * Sleep for a specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Execute a function with retry logic
   */
  async execute<T>(fn: () => Promise<T>, context?: string): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.options.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if we should retry
        if (attempt === this.options.maxAttempts || !this.isRetryable(lastError)) {
          throw lastError;
        }

        // Calculate delay
        const delay = this.calculateDelay(attempt);

        // Log retry attempt
        logger.warn(
          `Retry attempt ${attempt}/${this.options.maxAttempts}${context ? ` for ${context}` : ''}`,
          {
            error: lastError.message,
            delay,
          }
        );

        // Call retry callback if provided
        if (this.options.onRetry) {
          this.options.onRetry(attempt, lastError, delay);
        }

        // Wait before retrying
        await this.sleep(delay);
      }
    }

    // Should never reach here, but TypeScript needs this
    throw new RetryError(
      `Failed after ${this.options.maxAttempts} attempts${context ? ` for ${context}` : ''}`,
      this.options.maxAttempts,
      lastError!
    );
  }

  /**
   * Create a retry-wrapped version of a function
   */
  wrap<T, Args extends unknown[]>(
    fn: (...args: Args) => Promise<T>,
    context?: string
  ): (...args: Args) => Promise<T> {
    return (...args: Args) => this.execute(() => fn(...args), context);
  }
}

// Singleton instance with environment-based configuration
export const retryHandler = new RetryHandler({
  maxAttempts: parseInt(process.env.SCRAPE_RETRY_ATTEMPTS || '3', 10),
});

/**
 * Convenience function to execute with retry
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: Partial<RetryOptions>
): Promise<T> {
  const handler = options ? new RetryHandler(options) : retryHandler;
  return handler.execute(fn);
}

export default retryHandler;
