/**
 * Types du DesignCatalogMatcher (§15.8.2 P4).
 */

/** Type de slot de design (vocabulaire matcher). */
export type SlotType =
  | 'oven'
  | 'fridge'
  | 'dishwasher'
  | 'hood'
  | 'hob'
  | 'base_cabinet'
  | 'wall_cabinet'
  | 'tall_cabinet'
  | 'worktop';

/** Entrée : un emplacement de design à résoudre vers un SKU réel. */
export interface SlotInput {
  type: SlotType;
  /** Cotes souhaitées en CM (cohérent Product.width). `tolerance` en MM (override exact). */
  dimensions: { width: number; height?: number; depth?: number; tolerance?: number };
  /** Budget en euros (prix produit). */
  budget?: { min?: number; max?: number };
  /** Marques préférées (pondération soft, pas un filtre dur). */
  brandPreference?: string[];
}

export type MatchStatus = 'exact_match' | 'matched_degraded' | 'matched_over_budget' | 'no_match';

/** Un candidat retenu, scoré. */
export interface MatchedProduct {
  productId: string;
  sku: string;
  brand: string | null;
  price: number;
  width: number | null;
  height: number | null;
  depth: number | null;
  dimensionConfidence: number | null;
  availability: string;
  /** Statut de CE candidat (jamais 'no_match' ici). */
  status: Exclude<MatchStatus, 'no_match'>;
  /** Score composite (pénalité ; bas = meilleur). */
  score: number;
  reasons: string[];
}

/** Résultat de findMatchingProducts pour un slot. */
export interface MatchResult {
  status: MatchStatus;
  productId: string | null;
  product?: MatchedProduct;
  score: number;
  reasons: string[];
  /** Jusqu'à MAX_ALTERNATIVES autres candidats (tier puis score). */
  alternatives: MatchedProduct[];
}

export interface RankingWeights {
  dim: number;
  price: number;
  brand: number;
  confidence: number;
  availability: number;
}

/**
 * Ligne Product minimale lue par le matcher (Decimal Prisma tolérés -> Number()).
 * Découple le service de PrismaClient (testable avec un mock).
 */
export interface ProductRow {
  id: string;
  sku: string;
  brand: string | null;
  price: unknown;
  width: unknown;
  height: unknown;
  depth: unknown;
  availability: string;
  dimensionConfidence: number | null;
}

/** Port DB minimal (mockable). */
export interface MatcherDb {
  product: {
    findMany(args: { where: Record<string, unknown> }): Promise<ProductRow[]>;
  };
}
