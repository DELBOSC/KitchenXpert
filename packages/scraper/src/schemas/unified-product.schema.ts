/**
 * Unified Product Schema (CLAUDE.md §15.8 Principe 3)
 *
 * Strict Zod schema = the single output contract every ingestion Strategy
 * must satisfy. Validation runs at the output of each Strategy: invalid ->
 * log warning + skip (never crash). Dimensions are integer millimetres;
 * price is integer euro-cents (no dirty floats).
 */
import { z } from 'zod';

/** Product family (mapped from brand-specific taxonomies by each Strategy). */
export const ProductTypeEnum = z.enum([
  'cabinet',
  'worktop',
  'facade',
  'appliance',
  'sink',
  'tap',
  'lighting',
  'storage',
  'handle',
  'accessory',
  'decoration',
  'unknown',
]);
export type ProductType = z.infer<typeof ProductTypeEnum>;

/** Cascade level that produced the data (§15.8 Principe 1). */
export const SourceLevelEnum = z.union([
  z.literal(1), // API officielle gratuite + JSON-LD
  z.literal(2), // API interne site (cas IKEA: sik.search.blue.cdtapps.com)
  z.literal(3), // Scraping HTML cheerio
  z.literal(4), // Playwright + stealth
]);
export type SourceLevel = z.infer<typeof SourceLevelEnum>;

export const UnifiedProductSchema = z.object({
  sku: z.string().min(1),
  // EAN/GTIN — pivot du matcher cross-marque (§15.4 ProductMatch). Souvent
  // absent des APIs (IKEA ne l'expose pas systématiquement) -> nullable/optional.
  ean: z.string().nullable().optional(),
  name: z.string().min(1),
  brand: z.string().min(1),
  type: ProductTypeEnum,

  // Dimensions en mm entiers (norme §15.8). Nullable: certaines sources ne
  // fournissent pas toutes les cotes -> dimensionConfidence reflète le manque.
  widthMm: z.number().int().positive().nullable(),
  heightMm: z.number().int().positive().nullable(),
  depthMm: z.number().int().positive().nullable(),

  // Confiance dimensionnelle 0.0-1.0 (§15.8 Principe 3).
  dimensionConfidence: z.number().min(0).max(1),

  // Prix en cents (int) pour éviter les floats sales.
  priceEurCents: z.number().int().nonnegative().nullable(),
  // Code devise ISO 4217 (préparation multi-pays).
  currency: z.string().length(3).default('EUR'),

  // Traçabilité (§15.8 Principe 3 / Principe 5 légal défensif).
  sourceLevel: SourceLevelEnum,
  sourceUrl: z.string().url(),
  lastVerifiedAt: z.date(),

  /**
   * Métadonnées marque-spécifiques -> backend.Product.specifications Json.
   * CONVENTION :
   * - `specifications.rawMeasureText` : string original des cotes (ex.
   *   "60x60x80 cm"). OBLIGATOIRE si widthMm/heightMm/depthMm sont extraits,
   *   pour audit du drift de parsing (§15.4 couche 3) et traçabilité
   *   (§15.5 défense légale).
   * - Autres clés : libres par Strategy.
   */
  specifications: z.record(z.string(), z.unknown()).optional(),

  // Images.
  imageUrls: z.array(z.string().url()).optional(),
});
export type UnifiedProduct = z.infer<typeof UnifiedProductSchema>;

/** Result wrapper: a Strategy returns this so callers can skip-not-crash. */
export const ParseResultSchema = z.object({
  success: z.boolean(),
  product: UnifiedProductSchema.optional(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
});
export type ParseResult = z.infer<typeof ParseResultSchema>;

/**
 * Validate an unknown object against the unified schema, returning a
 * skip-not-crash ParseResult (never throws). Use at every Strategy output.
 */
export function validateUnifiedProduct(candidate: unknown): ParseResult {
  const parsed = UnifiedProductSchema.safeParse(candidate);
  if (parsed.success) {
    return { success: true, product: parsed.data, errors: [], warnings: [] };
  }
  return {
    success: false,
    errors: parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`),
    warnings: [],
  };
}
