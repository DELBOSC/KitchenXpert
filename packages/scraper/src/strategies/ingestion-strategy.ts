/**
 * IngestionStrategy — re-export shim (CLAUDE.md §15.8 Q3.b).
 *
 * The contract now lives in @kitchenxpert/common as the SINGLE SOURCE OF TRUTH
 * (shared with the backend persistence layer, roadmap step d). This shim
 * preserves the original local import path `./ingestion-strategy(.js)`.
 */
export type { IngestionStrategy } from '@kitchenxpert/common';
