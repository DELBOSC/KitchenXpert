/**
 * @kitchenxpert/common — catalog ingestion contracts (CLAUDE.md §15.8).
 *
 * Single source of truth for the unified product schema + ingestion Strategy
 * interface, shared by the scraper (producer) and the backend (consumer).
 */
export * from './unified-product.schema';
export * from './ingestion-strategy';
export * from './html-fetcher';
export * from './jsonld';
export * from './ikea-strategy';
export * from './lapeyre-strategy';
export * from './eprel-strategy';
export * from './castorama-strategy';
export * from './castorama-spec-table';
export * from './category-slug-mapper';
export * from './ingestion-orchestrator';
