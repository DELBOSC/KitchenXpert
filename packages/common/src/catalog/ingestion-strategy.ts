/**
 * IngestionStrategy (CLAUDE.md §15.8 Principe 2)
 *
 * Contract every brand Strategy implements. The IngestionOrchestrator (roadmap
 * step c) will route across brands; each Strategy resolves its own cascade
 * level and returns skip-not-crash ParseResults validated against the unified
 * schema.
 *
 * SINGLE SOURCE OF TRUTH (§15.8 Q3.b). Shared via @kitchenxpert/common so the
 * backend persistence layer (roadmap step d) can type the injected Strategy
 * without depending on the heavy scraper package. The scraper's local
 * strategies/ingestion-strategy.ts is now a re-export shim.
 */
import type { ParseResult, SourceLevel } from './unified-product.schema';

/**
 * Minimal JSON-over-HTTP port every API-first Strategy depends on. The
 * scraper's ApiAdapter (retry/backoff/rate-limit) satisfies it structurally, as
 * does a plain native-fetch wrapper — so a Strategy stays decoupled from any
 * concrete HTTP client and from the heavy scraper package.
 */
export interface JsonFetcher {
  fetchJson<T = unknown>(url: string, options?: { headers?: Record<string, string> }): Promise<T>;
}

export interface IngestionStrategy {
  /** Stable brand id (matches brands.config + backend.Product.brand). */
  readonly brandId: string;
  /** Cascade level this strategy operates at (§15.8 Principe 1). */
  readonly sourceLevel: SourceLevel;

  /** Resolve a single product from its canonical URL. */
  fetchProductByUrl(url: string): Promise<ParseResult>;

  /** Resolve a batch from a category/keyword query. */
  fetchProductsByCategory(categoryOrKeyword: string): Promise<ParseResult[]>;
}
