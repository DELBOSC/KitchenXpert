/**
 * Rate Limiter
 *
 * Prevents overwhelming target websites with requests
 */

import { logger } from './logger.js';

export class RateLimiterTimeoutError extends Error {
  constructor(domain: string, timeoutMs: number) {
    super(`Rate limiter timeout: waited ${timeoutMs}ms for slot on domain ${domain}`);
    this.name = 'RateLimiterTimeoutError';
  }
}

export class RateLimiterQueueFullError extends Error {
  constructor(domain: string, maxSize: number) {
    super(`Rate limiter queue full: domain ${domain} has reached max queue size of ${maxSize}`);
    this.name = 'RateLimiterQueueFullError';
  }
}

interface RateLimiterOptions {
  /** Minimum delay between requests (ms) */
  minDelay: number;
  /** Maximum delay between requests (ms) */
  maxDelay: number;
  /** Maximum concurrent requests */
  maxConcurrent: number;
  /** Whether to add random jitter */
  addJitter: boolean;
  /** Jitter range (ms) */
  jitterRange: number;
  /** Timeout for waiting for a slot (ms) */
  waitTimeout: number;
  /** Maximum queue size per domain */
  maxQueueSize: number;
}

interface RequestRecord {
  timestamp: number;
  domain: string;
}

const DEFAULT_OPTIONS: RateLimiterOptions = {
  minDelay: 2000, // 2 seconds minimum
  maxDelay: 5000, // 5 seconds maximum
  maxConcurrent: 3,
  addJitter: true,
  jitterRange: 1000,
  waitTimeout: 30000, // 30 seconds timeout
  maxQueueSize: 100, // max 100 queued requests per domain
};

export class RateLimiter {
  private options: RateLimiterOptions;
  private lastRequests: Map<string, RequestRecord> = new Map();
  private activeRequests: Map<string, number> = new Map();
  private queue: Map<string, Array<() => void>> = new Map();

  constructor(options: Partial<RateLimiterOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Extract domain from URL
   */
  private getDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url;
    }
  }

  /**
   * Calculate delay with optional jitter
   */
  private calculateDelay(): number {
    let delay =
      this.options.minDelay + Math.random() * (this.options.maxDelay - this.options.minDelay);

    if (this.options.addJitter) {
      delay += Math.random() * this.options.jitterRange;
    }

    return Math.round(delay);
  }

  /**
   * Wait before making a request
   */
  async waitForSlot(url: string): Promise<void> {
    const domain = this.getDomain(url);

    // Check concurrent requests limit
    const activeCount = this.activeRequests.get(domain) || 0;
    if (activeCount >= this.options.maxConcurrent) {
      // Check queue size before adding
      const currentQueue = this.queue.get(domain);
      if (currentQueue && currentQueue.length >= this.options.maxQueueSize) {
        throw new RateLimiterQueueFullError(domain, this.options.maxQueueSize);
      }

      // Wait in queue with timeout
      const timeoutMs = this.options.waitTimeout;
      await Promise.race([
        this.waitInQueue(domain),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new RateLimiterTimeoutError(domain, timeoutMs)), timeoutMs)
        ),
      ]);
    }

    // Check time since last request
    const lastRequest = this.lastRequests.get(domain);
    if (lastRequest) {
      const elapsed = Date.now() - lastRequest.timestamp;
      const requiredDelay = this.calculateDelay();

      if (elapsed < requiredDelay) {
        const waitTime = requiredDelay - elapsed;
        logger.debug(`Rate limiting: waiting ${waitTime}ms for ${domain}`);
        await this.sleep(waitTime);
      }
    }

    // Mark request as active
    this.activeRequests.set(domain, (this.activeRequests.get(domain) || 0) + 1);
  }

  /**
   * Mark request as completed
   */
  completeRequest(url: string): void {
    const domain = this.getDomain(url);

    // Update last request time
    this.lastRequests.set(domain, {
      timestamp: Date.now(),
      domain,
    });

    // Decrease active count
    const activeCount = this.activeRequests.get(domain) || 1;
    this.activeRequests.set(domain, Math.max(0, activeCount - 1));

    // Process queue
    this.processQueue(domain);
  }

  /**
   * Wait in queue when too many concurrent requests
   */
  private async waitInQueue(domain: string): Promise<void> {
    return new Promise((resolve) => {
      if (!this.queue.has(domain)) {
        this.queue.set(domain, []);
      }
      this.queue.get(domain)!.push(resolve);
      logger.debug(`Added to queue for ${domain}, position: ${this.queue.get(domain)!.length}`);
    });
  }

  /**
   * Process the queue for a domain
   */
  private processQueue(domain: string): void {
    const domainQueue = this.queue.get(domain);
    if (!domainQueue || domainQueue.length === 0) return;

    const activeCount = this.activeRequests.get(domain) || 0;
    if (activeCount < this.options.maxConcurrent) {
      const resolve = domainQueue.shift();
      if (resolve) {
        resolve();
      }
    }
  }

  /**
   * Sleep for a specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Wrapper to make a rate-limited request
   */
  async throttle<T>(url: string, fn: () => Promise<T>): Promise<T> {
    await this.waitForSlot(url);
    try {
      const result = await fn();
      return result;
    } finally {
      this.completeRequest(url);
    }
  }

  /**
   * Reset rate limiter for a domain
   */
  reset(domain?: string): void {
    if (domain) {
      this.lastRequests.delete(domain);
      this.activeRequests.delete(domain);
      this.queue.delete(domain);
    } else {
      this.lastRequests.clear();
      this.activeRequests.clear();
      this.queue.clear();
    }
  }

  /**
   * Get stats for monitoring
   */
  getStats(): Record<string, { active: number; lastRequest?: number }> {
    const stats: Record<string, { active: number; lastRequest?: number }> = {};

    for (const [domain, record] of this.lastRequests) {
      stats[domain] = {
        active: this.activeRequests.get(domain) || 0,
        lastRequest: record.timestamp,
      };
    }

    return stats;
  }
}

// Singleton instance with environment-based configuration
export const rateLimiter = new RateLimiter({
  minDelay: parseInt(process.env.SCRAPE_RATE_LIMIT_MS || '3000', 10),
  maxConcurrent: parseInt(process.env.SCRAPE_MAX_CONCURRENT || '3', 10),
});

export default rateLimiter;
