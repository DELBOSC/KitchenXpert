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
import { resolveCategorySlug, type IngestionStrategy, type CategorySlug, type UnifiedProduct } from '@kitchenxpert/common';

import { mapUnifiedProductToUpsert } from './unified-product-mapper';

import type { ProductRepository } from '../../repositories/product-repository';

/**
 * Résout un slug de catégorie (§15.8 Phase 2) en categoryId. Injecté pour
 * garder le service testable + découplé de Prisma. Si absent -> pas de
 * categoryId posé (comportement Phase 1, backward-compat).
 */
export interface CategoryIdResolver {
  idForSlug(slug: CategorySlug): Promise<string | null> | string | null;
}

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
    private readonly categoryResolver?: CategoryIdResolver,
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
        const category = await this.resolveCategory(r.product);
        const { sku, data } = mapUnifiedProductToUpsert(r.product, category);
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

  /**
   * Résout la catégorie (§15.8 Phase 2) : slug via le mapper pur, puis id via le
   * resolver injecté. Sans resolver -> {} (pas de categoryId). Slug absent du
   * référentiel -> categoryId null + warning (skip-not-crash).
   */
  private async resolveCategory(product: UnifiedProduct): Promise<{
    categoryId?: string | null;
    detection?: 'explicit' | 'inferred' | null;
  }> {
    if (!this.categoryResolver) {return {};}
    const { slug, detection } = resolveCategorySlug(product);
    if (!slug) {return { detection };}
    const categoryId = await this.categoryResolver.idForSlug(slug);
    if (categoryId == null) {
      this.logger?.warn(`[ingestion] category slug "${slug}" introuvable -> categoryId NULL`);
    }
    return { categoryId, detection };
  }
}
