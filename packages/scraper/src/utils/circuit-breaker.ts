/**
 * Circuit Breaker Pattern
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Too many failures, requests are rejected immediately
 * - HALF_OPEN: Testing if the service has recovered
 */

export class CircuitOpenError extends Error {
  constructor(message: string = 'Circuit breaker is open') {
    super(message);
    this.name = 'CircuitOpenError';
  }
}

interface CircuitBreakerOptions {
  failureThreshold: number; // Number of consecutive failures before opening (default: 5)
  resetTimeout: number; // Time in ms before trying half-open (default: 60000)
  halfOpenMax: number; // Max requests in half-open state (default: 1)
  name?: string; // Optional name for logging
}

type CircuitState = 'closed' | 'open' | 'half-open';

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private halfOpenAttempts = 0;
  private options: Required<CircuitBreakerOptions>;

  constructor(options: CircuitBreakerOptions) {
    this.options = {
      failureThreshold: options.failureThreshold,
      resetTimeout: options.resetTimeout,
      halfOpenMax: options.halfOpenMax,
      name: options.name ?? 'circuit-breaker',
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed >= this.options.resetTimeout) {
        // Transition to half-open
        this.state = 'half-open';
        this.halfOpenAttempts = 0;
      } else {
        throw new CircuitOpenError(
          `Circuit breaker "${this.options.name}" is open. ` +
            `Retry after ${Math.ceil((this.options.resetTimeout - elapsed) / 1000)}s.`
        );
      }
    }

    if (this.state === 'half-open' && this.halfOpenAttempts >= this.options.halfOpenMax) {
      throw new CircuitOpenError(
        `Circuit breaker "${this.options.name}" is half-open and at max attempts (${this.options.halfOpenMax}).`
      );
    }

    if (this.state === 'half-open') {
      this.halfOpenAttempts++;
    }

    try {
      const result = await fn();

      // On success
      if (this.state === 'half-open') {
        // Service has recovered, close the circuit
        this.state = 'closed';
        this.failureCount = 0;
        this.halfOpenAttempts = 0;
      }

      this.successCount++;
      return result;
    } catch (error) {
      // On failure
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.state === 'half-open') {
        // Failed during half-open, reopen the circuit
        this.state = 'open';
        this.halfOpenAttempts = 0;
      } else if (this.failureCount >= this.options.failureThreshold) {
        // Too many failures, open the circuit
        this.state = 'open';
      }

      throw error;
    }
  }

  get currentState(): CircuitState {
    return this.state;
  }

  get stats(): {
    state: CircuitState;
    failures: number;
    successes: number;
    lastFailure: number;
  } {
    return {
      state: this.state,
      failures: this.failureCount,
      successes: this.successCount,
      lastFailure: this.lastFailureTime,
    };
  }

  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    this.halfOpenAttempts = 0;
  }
}

export default CircuitBreaker;
