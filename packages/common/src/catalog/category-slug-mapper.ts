/**
 * CategorySlugMapper — fonction pure UnifiedProduct -> categorySlug
 * (CLAUDE.md §15.8 Phase 2 : categoryId first-class).
 *
 * Mappe via, dans l'ordre :
 *  1. specifications.applianceGroup (EPREL, explicit, prioritaire)
 *  2. product.type (productType ; explicit)
 *  3. détection au nom pour `cabinet` (colonne / haut / mural / bas)
 *
 * Retourne { slug, detection: 'explicit'|'inferred'|null } pour traçabilité
 * (specifications.categoryDetection). PURE : aucun accès DB/IO, déterministe.
 * Les slugs sont alignés sur catalogs-seed.ts (clé = slug technique FR).
 */
import type { UnifiedProduct } from './unified-product.schema';

export type CategorySlug =
  | 'meubles-bas'
  | 'meubles-hauts'
  | 'colonnes'
  | 'plans-de-travail'
  | 'electromenager-cuisson'
  | 'electromenager-froid'
  | 'electromenager-lavage'
  | 'eviers-robinetterie'
  | 'facades';

export interface CategoryResolution {
  slug: CategorySlug | null;
  detection: 'explicit' | 'inferred' | null;
}

/** Slugs valides du référentiel (pour valider un override explicite). */
const VALID_SLUGS: readonly CategorySlug[] = [
  'meubles-bas',
  'meubles-hauts',
  'colonnes',
  'plans-de-travail',
  'electromenager-cuisson',
  'electromenager-froid',
  'electromenager-lavage',
  'eviers-robinetterie',
  'facades',
];

/** EPREL applianceGroup -> catégorie (mapping explicit). */
const APPLIANCE_GROUP_TO_SLUG: Record<string, CategorySlug> = {
  dishwashers2019: 'electromenager-lavage',
  refrigeratingappliances2019: 'electromenager-froid',
  ovens: 'electromenager-cuisson',
  rangehoods: 'electromenager-cuisson',
};

export function resolveCategorySlug(product: UnifiedProduct): CategoryResolution {
  const specs = (product.specifications ?? {}) as Record<string, unknown>;

  // 0. Override explicite (ingestion PAR CATÉGORIE, ex. Castorama cat_id) :
  // la catégorie est connue par construction -> autoritaire.
  const explicit = specs.categorySlug;
  if (typeof explicit === 'string' && (VALID_SLUGS as readonly string[]).includes(explicit)) {
    return { slug: explicit as CategorySlug, detection: 'explicit' };
  }

  // 1. EPREL applianceGroup (explicit, prioritaire)
  const group = specs.applianceGroup;
  if (typeof group === 'string' && group in APPLIANCE_GROUP_TO_SLUG) {
    return { slug: APPLIANCE_GROUP_TO_SLUG[group]!, detection: 'explicit' };
  }

  // 2. productType
  switch (product.type) {
    case 'worktop':
      return { slug: 'plans-de-travail', detection: 'explicit' };
    case 'sink':
    case 'tap':
      return { slug: 'eviers-robinetterie', detection: 'explicit' };
    case 'facade':
      return { slug: 'facades', detection: 'explicit' };
    case 'appliance':
      // appliance générique SANS applianceGroup -> info insuffisante -> inferred
      return { slug: 'electromenager-cuisson', detection: 'inferred' };
    case 'cabinet':
      return resolveCabinetSlug(product.name ?? '');
    default:
      // storage/handle/lighting/accessory/decoration/unknown : pas de catégorie
      // dans le référentiel (YAGNI, cf §2.0) -> null, résolu plus tard.
      return { slug: null, detection: null };
  }
}

/** Détection cabinet par regex sur le nom (colonne > haut/mural > bas > défaut bas). */
function resolveCabinetSlug(name: string): CategoryResolution {
  const hay = name.toLowerCase();
  if (/\bcolonne\b/.test(hay)) return { slug: 'colonnes', detection: 'inferred' };
  if (/\b(haut|mural)\b/.test(hay)) return { slug: 'meubles-hauts', detection: 'inferred' };
  if (/\bbas\b/.test(hay)) return { slug: 'meubles-bas', detection: 'inferred' };
  // Fallback explicite : meubles-bas (le plus fréquent).
  return { slug: 'meubles-bas', detection: 'inferred' };
}
