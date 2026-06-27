/**
 * Unified Product Schema — re-export shim (CLAUDE.md §15.8 Q3.b).
 *
 * The schema now lives in @kitchenxpert/common as the SINGLE SOURCE OF TRUTH,
 * shared by the scraper (producer) and the backend persistence layer (consumer,
 * roadmap step d). This shim preserves the original local import path so every
 * Strategy/test keeps importing `../schemas/unified-product.schema(.js)`.
 */
export {
  ProductTypeEnum,
  SourceLevelEnum,
  UnifiedProductSchema,
  ParseResultSchema,
  validateUnifiedProduct,
} from '@kitchenxpert/common';
export type { ProductType, SourceLevel, UnifiedProduct, ParseResult } from '@kitchenxpert/common';
