/**
 * CatalogIngestionService (CLAUDE.md §15.8 step d).
 *
 * Orchestrates one brand ingestion run: pull a batch from an injected
 * {@link IngestionStrategy} (a scraper Strategy, typed via the shared
 * @kitchenxpert/common contract — the backend never imports the heavy scraper
 * package), map each UnifiedProduct, and upsert it into backend.Product by SKU.
 *
 * Skip-not-crash throughout (§15.8 Principe 4): a strategy-level failure, an
 * invalid ParseResult, or a single failed upsert never aborts the run — each is
 * counted and recorded so the caller gets an honest tally.
 */
import type { IngestionStrategy } from '@kitchenxpert/common';

import type { ProductRepository } from '../../repositories/product-repository';
import { mapUnifiedProductToUpsert } from './unified-product-mapper';

/** Outcome of a single {@link CatalogIngestionService.ingestByCategory} run. */
export interface IngestResult {
  brand: string;
  query: string;
  fetched: number;
  ingested: number;
  skipped: number;
  errors: string[];
}

/** Minimal logger shape (keeps the service decoupled from winston). */
export interface IngestionLogger {
  info(message: string, meta?: unknown): void;
  warn(message: string, meta?: unknown): void;
}

export class CatalogIngestionService {
  constructor(
    private readonly repo: ProductRepository,
    private readonly strategy: IngestionStrategy,
    private readonly logger?: IngestionLogger,
  ) {}

  /**
   * Ingest every product the strategy returns for a category/keyword query.
   * Returns a tally; never throws.
   */
  async ingestByCategory(query: string): Promise<IngestResult> {
    const result: IngestResult = {
      brand: this.strategy.brandId,
      query,
      fetched: 0,
      ingested: 0,
      skipped: 0,
      errors: [],
    };

    let parsed;
    try {
      parsed = await this.strategy.fetchProductsByCategory(query);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      result.errors.push(`fetch failed: ${msg}`);
      this.logger?.warn(
        `[ingestion] ${this.strategy.brandId} fetch failed for "${query}"`,
        { error: msg },
      );
      return result;
    }

    result.fetched = parsed.length;

    for (const r of parsed) {
      if (!r.success || !r.product) {
        result.skipped++;
        result.errors.push(...r.errors);
        continue;
      }
      try {
        const { sku, data } = mapUnifiedProductToUpsert(r.product);
        await this.repo.upsertBySku(sku, data);
        result.ingested++;
      } catch (e) {
        result.skipped++;
        result.errors.push(e instanceof Error ? e.message : String(e));
      }
    }

    this.logger?.info(
      `[ingestion] ${this.strategy.brandId} "${query}": ` +
        `${result.ingested}/${result.fetched} ingested, ${result.skipped} skipped`,
    );
    return result;
  }
}
