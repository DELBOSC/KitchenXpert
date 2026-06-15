/**
 * IkeaStrategy — re-export shim (CLAUDE.md §15.8 Q3.b).
 *
 * Le code vit dans @kitchenxpert/common (single source of truth, partagé avec
 * le backend pour l'orchestration multi-marques). Ce shim préserve le chemin
 * d'import local côté scraper.
 */
export { IkeaStrategy, parseIkeaDims } from '@kitchenxpert/common';
