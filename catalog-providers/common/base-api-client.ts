import { ProviderConfig } from '@common/types';
import { IProviderApiClient, ProviderProduct, FetchOptions } from './base-provider';

/**
 * Client API de base avec retry et rate limiting
 */
export abstract class BaseApiClient implements IProviderApiClient {
  protected config: ProviderConfig;
  private requestCount = 0;
  private windowStart = Date.now();

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  /**
   * Effectue une requête HTTP avec retry et rate limiting
   */
  protected async request<T>(url: string, options: RequestInit = {}): Promise<T> {
    // Rate limiting
    await this.checkRateLimit();

    // Retry logic
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.apiKey}`,
            ...options.headers,
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return (await response.json()) as T;
      } catch (error) {
        lastError = error as Error;
        if (attempt < this.config.retryAttempts - 1) {
          await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
        }
      }
    }

    throw lastError || new Error('Request failed');
  }

  /**
   * Vérifie et applique le rate limiting
   */
  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const windowElapsed = now - this.windowStart;

    // Reset si la fenêtre est écoulée
    if (windowElapsed >= this.config.rateLimit.windowMs) {
      this.requestCount = 0;
      this.windowStart = now;
      return;
    }

    // Si limite atteinte, attendre
    if (this.requestCount >= this.config.rateLimit.maxRequests) {
      const waitTime = this.config.rateLimit.windowMs - windowElapsed;
      await this.delay(waitTime);
      this.requestCount = 0;
      this.windowStart = Date.now();
    }

    this.requestCount++;
  }

  /**
   * Utilitaire delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Méthodes abstraites à implémenter par les providers
   */
  abstract fetchProducts(options?: FetchOptions): Promise<ProviderProduct[]>;
  abstract fetchProductById(id: string): Promise<ProviderProduct>;
  abstract testConnection(): Promise<boolean>;
}
