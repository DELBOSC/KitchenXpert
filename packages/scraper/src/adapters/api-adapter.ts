/**
 * ApiAdapter (CLAUDE.md §15.8 Principe 2 — Adapter réutilisable)
 *
 * Generic JSON-over-HTTP client for the cascade levels N1/N2 (official or
 * internal site APIs). Self-contained on purpose: native fetch (Node 20+),
 * inline exponential backoff, min-interval rate-limit, typed errors, optional
 * injected logger. No external retry/limit dep and no relative imports, so it
 * stays brand-agnostic and unaffected by the package's legacy module config.
 *
 * NOTE (deviation from the v1 plan): uses an inline backoff instead of
 * p-retry/p-limit. Same behaviour (exponential backoff + rate-limit), but
 * avoids ESM-only interop under `module: Node16` and coupling to the legacy
 * utils. Easy to swap later if a shared retry util is consolidated.
 */

// ── Typed errors ────────────────────────────────────────────────────────────
export class ApiError extends Error {
  constructor(
    message: string,
    readonly url: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
/** Network failure / non-retryable-after-retries HTTP status. */
export class NetworkError extends ApiError {
  constructor(
    message: string,
    url: string,
    readonly status?: number
  ) {
    super(message, url);
    this.name = 'NetworkError';
  }
}
/** Response body was not valid JSON. */
export class ParseError extends ApiError {
  constructor(message: string, url: string) {
    super(message, url);
    this.name = 'ParseError';
  }
}
/** Rate limited (429) and retries exhausted. */
export class RateLimitError extends ApiError {
  constructor(
    message: string,
    url: string,
    readonly retryAfterMs?: number
  ) {
    super(message, url);
    this.name = 'RateLimitError';
  }
}
/** Request exceeded the configured timeout. */
export class TimeoutError extends ApiError {
  constructor(message: string, url: string) {
    super(message, url);
    this.name = 'TimeoutError';
  }
}

// ── Config ──────────────────────────────────────────────────────────────────
export interface AdapterLogger {
  debug: (msg: string, meta?: unknown) => void;
  warn: (msg: string, meta?: unknown) => void;
}
const NOOP_LOGGER: AdapterLogger = { debug: () => {}, warn: () => {} };

export interface ApiAdapterConfig {
  /** Prepended to relative URLs passed to fetchJson. */
  baseUrl?: string;
  /** Identifying UA (legal defensive, §15.8 Principe 5). */
  userAgent?: string;
  /** Per-request timeout. Default 15000ms. */
  timeoutMs?: number;
  /** Retry attempts after the first try. Default 3. */
  maxRetries?: number;
  /** Base backoff delay (doubles each retry). Default 500ms. */
  baseRetryDelayMs?: number;
  /** Minimum interval between two requests from this adapter. Default 0. */
  rateLimitMs?: number;
  /** Optional logger; defaults to no-op. */
  logger?: AdapterLogger;
  /** Injectable fetch (tests). Defaults to global fetch. */
  fetchFn?: typeof fetch;
  /** Injectable sleep (tests). Defaults to setTimeout. */
  sleepFn?: (ms: number) => Promise<void>;
}

const DEFAULTS = {
  userAgent: 'KitchenXpert-research/0.2 (+catalog ingestion; contact: dev)',
  timeoutMs: 15_000,
  maxRetries: 3,
  baseRetryDelayMs: 500,
  rateLimitMs: 0,
};

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

export class ApiAdapter {
  private readonly cfg: Required<
    Omit<ApiAdapterConfig, 'baseUrl' | 'logger' | 'fetchFn' | 'sleepFn'>
  > & {
    baseUrl?: string;
  };
  private readonly log: AdapterLogger;
  private readonly fetchFn: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;
  private lastRequestAt = 0;

  constructor(config: ApiAdapterConfig = {}) {
    this.cfg = {
      baseUrl: config.baseUrl,
      userAgent: config.userAgent ?? DEFAULTS.userAgent,
      timeoutMs: config.timeoutMs ?? DEFAULTS.timeoutMs,
      maxRetries: config.maxRetries ?? DEFAULTS.maxRetries,
      baseRetryDelayMs: config.baseRetryDelayMs ?? DEFAULTS.baseRetryDelayMs,
      rateLimitMs: config.rateLimitMs ?? DEFAULTS.rateLimitMs,
    };
    this.log = config.logger ?? NOOP_LOGGER;
    this.fetchFn = config.fetchFn ?? globalThis.fetch.bind(globalThis);
    this.sleep = config.sleepFn ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  }

  /** Fetch + parse JSON with retry/backoff/rate-limit. Throws typed errors. */
  async fetchJson<T = unknown>(
    url: string,
    options?: { headers?: Record<string, string> }
  ): Promise<T> {
    const fullUrl =
      this.cfg.baseUrl && !/^https?:\/\//i.test(url) ? `${this.cfg.baseUrl}${url}` : url;
    let attempt = 0;
    // attempts = 1 initial + maxRetries
    for (;;) {
      await this.applyRateLimit();
      try {
        return await this.attempt<T>(fullUrl, options);
      } catch (err) {
        const retryable = this.isRetryable(err);
        if (!retryable || attempt >= this.cfg.maxRetries) {
          throw err;
        }
        const wait = this.backoffMs(attempt, err);
        this.log.warn('[ApiAdapter] retrying', {
          url: fullUrl,
          attempt: attempt + 1,
          waitMs: wait,
          error: err instanceof Error ? err.message : String(err),
        });
        await this.sleep(wait);
        attempt++;
      }
    }
  }

  private async attempt<T>(
    url: string,
    options?: { headers?: Record<string, string> }
  ): Promise<T> {
    let res: Response;
    try {
      res = await this.fetchFn(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': this.cfg.userAgent,
          ...options?.headers,
        },
        signal: AbortSignal.timeout(this.cfg.timeoutMs),
      });
    } catch (err) {
      // AbortSignal.timeout fires a TimeoutError-named DOMException.
      if (err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
        throw new TimeoutError(`Request timed out after ${this.cfg.timeoutMs}ms`, url);
      }
      throw new NetworkError(
        `Network request failed: ${err instanceof Error ? err.message : String(err)}`,
        url
      );
    }

    if (res.status === 429) {
      const retryAfterMs = this.parseRetryAfter(res.headers.get('retry-after'));
      throw new RateLimitError(`Rate limited (429)`, url, retryAfterMs);
    }
    if (!res.ok) {
      throw new NetworkError(`HTTP ${res.status} ${res.statusText}`, url, res.status);
    }

    const text = await res.text();
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new ParseError(`Response is not valid JSON (${text.slice(0, 80)}…)`, url);
    }
  }

  private isRetryable(err: unknown): boolean {
    if (err instanceof RateLimitError) return true;
    if (err instanceof TimeoutError) return true;
    if (err instanceof NetworkError)
      return err.status === undefined || RETRYABLE_STATUS.has(err.status);
    return false; // ParseError + anything else: not retryable
  }

  private backoffMs(attempt: number, err: unknown): number {
    if (err instanceof RateLimitError && err.retryAfterMs != null) return err.retryAfterMs;
    return this.cfg.baseRetryDelayMs * 2 ** attempt;
  }

  private parseRetryAfter(header: string | null): number | undefined {
    if (!header) return undefined;
    const secs = Number(header);
    return Number.isFinite(secs) ? secs * 1000 : undefined;
  }

  private async applyRateLimit(): Promise<void> {
    if (this.cfg.rateLimitMs <= 0) return;
    const now = Date.now();
    const since = now - this.lastRequestAt;
    if (since < this.cfg.rateLimitMs) {
      await this.sleep(this.cfg.rateLimitMs - since);
    }
    this.lastRequestAt = Date.now();
  }
}
