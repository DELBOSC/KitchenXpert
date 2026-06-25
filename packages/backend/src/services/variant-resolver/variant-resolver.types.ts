/**
 * Types for VariantResolverService (CLAUDE.md §15.8.4 P7 — chatbot couleur).
 *
 * DI mirrors the matcher's `MatcherDb` pattern (mockable, no Prisma import in
 * the service) but with a row shape that carries what the color resolver needs:
 * the parentSku graph (isCanonical/parentSku), the raw color (in
 * `specifications`), the display name, price and optional images.
 */

/** Minimal Product row the resolver reads (subset of Prisma Product). */
export interface ResolverProductRow {
  sku: string;
  isCanonical: boolean;
  parentSku: string | null;
  name: string;
  /** Prisma Decimal — coerced with Number() at use site. */
  price: unknown;
  /** Prisma Json — the raw color lives at `specifications.color`. */
  specifications: unknown;
  isActive: boolean;
  deletedAt: Date | null;
  /** Prisma Json — array of image URLs (optional). */
  images?: unknown;
}

/** Injected data access (mock in tests, real Prisma client in production). */
export interface ResolverDb {
  product: {
    findMany(args: { where: Record<string, unknown> }): Promise<ResolverProductRow[]>;
  };
}

/** One offerable color/material choice for a gamme. */
export interface ColorOption {
  /** Normalized family key (e.g. 'blanc', 'chene'). */
  key: string;
  /** Display label (e.g. 'Blanc', 'Chêne'). */
  label: string;
  kind: 'color' | 'material';
  /** Trend score from normalizeColor (dict tier, or 50 neutral). */
  score: number;
  /** True if the gamme's canonical SKU carries this color. */
  isCanonicalColor: boolean;
  /** Purchasable SKU representing this color (canonical if present, else cheapest). */
  representativeSku: string;
  /** Price of the representative SKU (EUR). */
  priceFrom: number;
  /** Number of SKUs in this color group. */
  skuCount: number;
  /** All SKUs sharing this normalized color. */
  skus: string[];
  /** Display name of the representative SKU. */
  name?: string;
  /** First image URL of the representative SKU, if any. */
  imageUrl?: string;
}
