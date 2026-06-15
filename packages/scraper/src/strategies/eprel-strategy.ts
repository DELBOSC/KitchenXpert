/**
 * EprelApplianceStrategy — re-export shim (CLAUDE.md §15.8 Q3.b / step b-ter).
 *
 * Le code vit dans @kitchenxpert/common (single source of truth, partagé avec
 * le backend). Ce shim préserve le chemin d'import local côté scraper.
 */
export { EprelApplianceStrategy, EPREL_KITCHEN_GROUPS } from '@kitchenxpert/common';
export type { JsonFetcher } from '@kitchenxpert/common';
