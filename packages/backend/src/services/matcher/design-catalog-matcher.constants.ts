/**
 * Constantes du DesignCatalogMatcher (§15.8.2 P4 — matcher catalogue↔design).
 * Toutes AJUSTABLES ici, sans toucher la logique.
 */

/** Seuil dimensionConfidence minimal du pool, PAR type de produit (audit Étape 0). */
export const CONFIDENCE_THRESHOLDS = {
  /** Électroménager : cotes web fiables (conf ~1). */
  electro: 0.7,
  /** Meuble Castorama : cotes parsées du nom (conf 0.3-0.5) -> seuil plus bas
   *  sinon le pool meuble est VIDE (caisson/plan = 0 à conf>=0.7, prouvé Étape 0). */
  meuble: 0.5,
  /** Fallback prudent. */
  default: 0.7,
} as const;

/**
 * Tolérances dimensionnelles, en MILLIMÈTRES.
 * NB exact=10mm (PAS 2mm) : §15.8.2 L2 — le drift fabricant (largeur four
 * 59.2/59.4/59.5/59.6/59.8/60.0) = MÊME classe produit ; et les tests de
 * référence (slot 60 vs candidat 59.5 = 5mm) attendent `exact_match`.
 * Surchargeable par slot via SlotInput.dimensions.tolerance.
 */
export const DIM_TOLERANCE_MM = {
  exact: 10,
  degraded: 20,
} as const;

/** Au-delà de budget.max × ce facteur, le candidat est exclu (trop cher). */
export const BUDGET_DEGRADED_MULTIPLIER = 1.5;

/** Pondérations du score composite (pénalités, total bas = meilleur). Ajustables. */
export const RANKING_WEIGHTS = {
  dim: 0.5,
  price: 0.25,
  brand: 0.1,
  confidence: 0.1,
  availability: 0.05,
} as const;

/** Nombre max d'alternatives retournées (hors le top). */
export const MAX_ALTERNATIVES = 5;
