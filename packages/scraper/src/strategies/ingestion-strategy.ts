/**
 * IngestionStrategy (CLAUDE.md §15.8 Principe 2)
 *
 * Contract every brand Strategy implements. The IngestionOrchestrator (roadmap
 * step c) will route across brands; each Strategy resolves its own cascade
 * level and returns skip-not-crash ParseResults validated against the unified
 * schema.
 */
import type { ParseResult } from '../schemas/unified-product.schema.js';
import type { SourceLevel } from '../schemas/unified-product.schema.js';

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
