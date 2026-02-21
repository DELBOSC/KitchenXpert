import { ApiError } from './api-error';

/**
 * Erreur de limite de taux (429)
 */
export class RateLimitError extends ApiError {
  constructor(retryAfter?: number, message = 'Too Many Requests') {
    const details = retryAfter ? { retryAfter } : undefined;
    super(message, 429, 'RATE_LIMIT_EXCEEDED', true, details);
  }
}
