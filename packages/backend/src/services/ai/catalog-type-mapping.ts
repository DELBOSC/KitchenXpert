/**
 * Catalog type -> category mapping (CLAUDE.md §15.8 Phase 2.4 — categoryId propre).
 *
 * Depuis le backfill Phase 2.3, TOUS les produits (ingérés + seeds) portent un
 * `categoryId` -> on filtre le `type` IA par `category.slug` (indexé), plus par
 * le fallback `specifications` de la Phase 1 (#178, retiré ici).
 *
 * Un type IA (+ synonymes FR) mappe vers 1..N slugs de catégorie (ex. `cabinet`
 * = bas/hauts/colonnes ; `appliance` = les 3 électroménagers). Type inconnu ->
 * fallback legacy `category.name contains` (forward-compat).
 */
import type { CategorySlug } from '@kitchenxpert/common';

const APPLIANCE_ALL: CategorySlug[] = [
  'electromenager-cuisson',
  'electromenager-froid',
  'electromenager-lavage',
];
const CABINETS: CategorySlug[] = ['meubles-bas', 'meubles-hauts', 'colonnes'];

/** Type IA (+ synonymes FR, clés normalisées lowercase) -> slugs de catégorie. */
export const TYPE_TO_CATEGORY_SLUGS: Record<string, CategorySlug[]> = {
  // Électroménager
  appliance: APPLIANCE_ALL,
  'électroménager': APPLIANCE_ALL,
  electromenager: APPLIANCE_ALL,
  dishwasher: ['electromenager-lavage'],
  'lave-vaisselle': ['electromenager-lavage'],
  fridge: ['electromenager-froid'],
  refrigerator: ['electromenager-froid'],
  frigo: ['electromenager-froid'],
  'réfrigérateur': ['electromenager-froid'],
  refrigerateur: ['electromenager-froid'],
  oven: ['electromenager-cuisson'],
  four: ['electromenager-cuisson'],
  hood: ['electromenager-cuisson'],
  hotte: ['electromenager-cuisson'],
  // cooktop / microwave : pas de catégorie dédiée ingérée -> fallback legacy.

  // Meuble
  cabinet: CABINETS,
  caisson: CABINETS,
  meuble: CABINETS,
  base: CABINETS,
  wall: CABINETS,
  tall: CABINETS,
  base_cabinet: ['meubles-bas'],
  wall_cabinet: ['meubles-hauts'],
  tall_cabinet: ['colonnes'],
  worktop: ['plans-de-travail'],
  countertop: ['plans-de-travail'],
  'plan de travail': ['plans-de-travail'],
  sink: ['eviers-robinetterie'],
  'évier': ['eviers-robinetterie'],
  evier: ['eviers-robinetterie'],
  tap: ['eviers-robinetterie'],
  faucet: ['eviers-robinetterie'],
  robinet: ['eviers-robinetterie'],
  mitigeur: ['eviers-robinetterie'],
  facade: ['facades'],
  'façade': ['facades'],
  // lighting/hardware/accessory : absents du référentiel (YAGNI) -> fallback legacy.
};

/**
 * Construit la clause `OR` pour un filtre type :
 *  - type mappé -> `category.slug IN [...]` (indexé, couvre ingérés + seeds).
 *  - type INCONNU -> fallback legacy `category.name contains` (forward-compat,
 *    jamais d'OR vide).
 */
export function buildTypeWhereOr(rawType: string): Record<string, unknown>[] {
  const slugs = TYPE_TO_CATEGORY_SLUGS[rawType.toLowerCase().trim()];
  if (slugs && slugs.length > 0) {
    return [{ category: { slug: { in: slugs } } }];
  }
  return [{ category: { name: { contains: rawType, mode: 'insensitive' } } }];
}
