/**
 * DesignCatalogMatcher (§15.8.2 P4 — matcher catalogue↔design).
 *
 * Résout un SLOT de design (type + cotes + budget) vers le meilleur SKU RÉEL du
 * catalogue. 100% DÉTERMINISTE (aucun appel LLM). Service pur : ne fait QUE
 * lire le catalogue (db.product.findMany) ; aucune écriture DB (le binding
 * KitchenItem.productId est posé par une couche au-dessus — chantier #3).
 *
 * Cascade de statut (cf décisions 19/06) :
 *   exact_match        : cotes dans la tolérance exacte ET prix <= budget.max
 *   matched_degraded   : cotes dans la tolérance dégradée ET prix <= budget.max
 *   matched_over_budget: cotes OK mais prix > budget.max (<= max×1.5)
 *   no_match           : rien de compatible -> productId null
 */
import {
  CONFIDENCE_THRESHOLDS,
  DIM_TOLERANCE_MM,
  BUDGET_DEGRADED_MULTIPLIER,
  RANKING_WEIGHTS,
  MAX_ALTERNATIVES,
} from './design-catalog-matcher.constants';

import type {
  SlotInput,
  SlotType,
  MatchResult,
  MatchedProduct,
  MatcherDb,
  ProductRow,
  RankingWeights,
} from './design-catalog-matcher.types';

type PoolKind = 'electro' | 'meuble';
interface SlotCategory {
  slug: string;
  /** 'ovens' | 'rangehoods' | '__none__' (cuisson sans groupe = plaque) | undefined */
  applianceGroup?: 'ovens' | 'rangehoods' | '__none__';
  poolKind: PoolKind;
}

/** SlotType -> catégorie catalogue (dérivé de buildTypeWhereOr / Phase 2). */
const SLOT_CATEGORY: Record<SlotType, SlotCategory> = {
  oven: { slug: 'electromenager-cuisson', applianceGroup: 'ovens', poolKind: 'electro' },
  hood: { slug: 'electromenager-cuisson', applianceGroup: 'rangehoods', poolKind: 'electro' },
  hob: { slug: 'electromenager-cuisson', applianceGroup: '__none__', poolKind: 'electro' },
  fridge: { slug: 'electromenager-froid', poolKind: 'electro' },
  dishwasher: { slug: 'electromenager-lavage', poolKind: 'electro' },
  base_cabinet: { slug: 'meubles-bas', poolKind: 'meuble' },
  wall_cabinet: { slug: 'meubles-hauts', poolKind: 'meuble' },
  tall_cabinet: { slug: 'colonnes', poolKind: 'meuble' },
  worktop: { slug: 'plans-de-travail', poolKind: 'meuble' },
};

const GROUP = (g: string) => ({ specifications: { path: ['applianceGroup'], equals: g } });
const num = (v: unknown): number | null => {
  if (v == null) {
    return null;
  }
  const n = Number(v as number);
  return Number.isFinite(n) ? n : null;
};
const STATUS_TIER: Record<Exclude<MatchResult['status'], 'no_match'>, number> = {
  exact_match: 0,
  matched_degraded: 1,
  matched_over_budget: 2,
};

export class DesignCatalogMatcher {
  constructor(
    private readonly db: MatcherDb,
    private readonly weights: RankingWeights = RANKING_WEIGHTS
  ) {}

  /** Résout un slot vers le meilleur SKU réel + alternatives. Ne touche pas la DB en écriture. */
  async findMatchingProducts(slot: SlotInput): Promise<MatchResult> {
    const cat = SLOT_CATEGORY[slot.type];
    const confMin = CONFIDENCE_THRESHOLDS[cat.poolKind] ?? CONFIDENCE_THRESHOLDS.default;

    const where: Record<string, unknown> = {
      isActive: true,
      deletedAt: null,
      // Canonicals only (§15.8.4 P6): colour variants (parentSku set) are hidden
      // from results — their canonical gamme stands in for them.
      isCanonical: true,
      width: { not: null },
      dimensionConfidence: { gte: confMin },
      category: { slug: cat.slug },
    };
    if (cat.applianceGroup === 'ovens' || cat.applianceGroup === 'rangehoods') {
      Object.assign(where, GROUP(cat.applianceGroup));
    } else if (cat.applianceGroup === '__none__') {
      // plaque = cuisson SANS groupe four/hotte
      where.NOT = { OR: [GROUP('ovens'), GROUP('rangehoods')] };
    }

    const rows = await this.db.product.findMany({ where });

    const exactTol = slot.dimensions.tolerance ?? DIM_TOLERANCE_MM.exact;
    const degradedTol = Math.max(DIM_TOLERANCE_MM.degraded, exactTol);
    const budgetMax = slot.budget?.max;

    const candidates: MatchedProduct[] = [];
    for (const r of rows) {
      const c = this.evaluate(r, slot, exactTol, degradedTol, budgetMax);
      if (c) {
        candidates.push(c);
      }
    }

    if (candidates.length === 0) {
      return {
        status: 'no_match',
        productId: null,
        score: 1,
        reasons: [`Aucun SKU compatible (type=${slot.type}, slug=${cat.slug}, conf>=${confMin})`],
        alternatives: [],
      };
    }

    // Pénalité prix normalisée min-max sur le pool retenu, puis recalcul du score.
    const prices = candidates.map((c) => c.price);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    for (const c of candidates) {
      const pricePenalty = maxP > minP ? (c.price - minP) / (maxP - minP) : 0;
      c.score = this.score(c, pricePenalty, slot, degradedTol);
    }

    // Tri : tier de statut (exact > degraded > over_budget) puis score croissant.
    candidates.sort((a, b) => STATUS_TIER[a.status] - STATUS_TIER[b.status] || a.score - b.score);
    const [best, ...rest] = candidates;

    return {
      status: best!.status,
      productId: best!.productId,
      product: best,
      score: best!.score,
      reasons: best!.reasons,
      alternatives: rest.slice(0, MAX_ALTERNATIVES),
    };
  }

  /** Évalue un candidat : cotes/budget -> statut + reasons, ou null si exclu. */
  private evaluate(
    r: ProductRow,
    slot: SlotInput,
    exactTol: number,
    degradedTol: number,
    budgetMax?: number
  ): MatchedProduct | null {
    const pw = num(r.width);
    const ph = num(r.height);
    const pd = num(r.depth);
    const price = num(r.price) ?? 0;

    // Distance dimensionnelle (mm) sur les cotes FOURNIES par le slot.
    const diffs: number[] = [];
    diffs.push(this.dimDiffMm(slot.dimensions.width, pw));
    if (slot.dimensions.height != null) {
      diffs.push(this.dimDiffMm(slot.dimensions.height, ph));
    }
    if (slot.dimensions.depth != null) {
      diffs.push(this.dimDiffMm(slot.dimensions.depth, pd));
    }
    const dimMaxMm = Math.max(...diffs);
    if (!Number.isFinite(dimMaxMm) || dimMaxMm > degradedTol) {
      return null;
    } // cotes incompatibles / inconnues

    // Budget : au-delà de max×facteur = exclu.
    if (budgetMax != null && price > budgetMax * BUDGET_DEGRADED_MULTIPLIER) {
      return null;
    }

    let status: MatchedProduct['status'];
    const reasons: string[] = [`cotes à ${Math.round(dimMaxMm)}mm de l'objectif`];
    if (budgetMax != null && price > budgetMax) {
      status = 'matched_over_budget';
      reasons.push(`prix ${price}EUR > budget ${budgetMax}EUR`);
    } else if (dimMaxMm <= exactTol) {
      status = 'exact_match';
    } else {
      status = 'matched_degraded';
    }
    if (budgetMax != null && price <= budgetMax) {
      reasons.push(`prix ${price}EUR dans le budget`);
    }

    return {
      productId: r.id,
      sku: r.sku,
      brand: r.brand,
      price,
      width: pw,
      height: ph,
      depth: pd,
      dimensionConfidence: r.dimensionConfidence,
      availability: r.availability,
      status,
      score: 0, // calculé après (besoin du pool pour la normalisation prix)
      reasons,
    };
  }

  /** Diff en mm entre une cote slot (cm) et une cote produit (cm). null produit -> Infinity. */
  private dimDiffMm(slotCm: number, prodCm: number | null): number {
    if (prodCm == null) {
      return Infinity;
    }
    return Math.abs(slotCm - prodCm) * 10;
  }

  /** Score composite (pénalités, bas = meilleur). */
  private score(
    c: MatchedProduct,
    pricePenalty: number,
    slot: SlotInput,
    degradedTol: number
  ): number {
    const dimMm = Math.max(
      this.dimDiffMm(slot.dimensions.width, c.width),
      slot.dimensions.height != null ? this.dimDiffMm(slot.dimensions.height, c.height) : 0,
      slot.dimensions.depth != null ? this.dimDiffMm(slot.dimensions.depth, c.depth) : 0
    );
    const dimPenalty = Math.min(1, dimMm / degradedTol);
    const pref = slot.brandPreference;
    const hasPref = pref != null && pref.length > 0;
    const brandMatches = c.brand != null && hasPref && pref.includes(c.brand);
    const brandPenalty = hasPref && !brandMatches ? 1 : 0;
    const confPenalty = 1 - (c.dimensionConfidence ?? 0);
    const availPenalty = c.availability === 'in_stock' ? 0 : 1;
    const w = this.weights;
    return (
      w.dim * dimPenalty +
      w.price * pricePenalty +
      w.brand * brandPenalty +
      w.confidence * confPenalty +
      w.availability * availPenalty
    );
  }
}

export default DesignCatalogMatcher;
