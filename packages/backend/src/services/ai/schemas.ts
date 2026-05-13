/**
 * Zod schemas for AI feature inputs + outputs.
 *
 * The OUTPUT schemas are passed to Claude / Gemini as JSON Schema and
 * also used to validate what comes back. A malformed payload throws
 * before it reaches the kitchen engine — never let an LLM hallucinate
 * an item with negative dimensions.
 */
import { z } from 'zod';

// ───────────────────────────────────────────────────────────────────────────
// Common building blocks
// ───────────────────────────────────────────────────────────────────────────

export const KitchenLayoutEnum = z.enum([
  'L_SHAPED', 'U_SHAPED', 'GALLEY', 'ISLAND',
  'PENINSULA', 'ONE_WALL', 'OPEN_PLAN',
]);

export const KitchenStyleEnum = z.enum([
  'scandinavian', 'industrial', 'modern', 'contemporary',
  'farmhouse', 'provencal', 'minimalist', 'bohemian',
  'art-deco', 'japanese', 'traditional',
]);

export const BrandEnum = z.enum([
  'IKEA', 'SCHMIDT', 'MOBALPA', 'CUISINELLA', 'BOSCH',
  'LEROY_MERLIN', 'CASTORAMA', 'LAPEYRE', 'BUT', 'CONFORAMA',
]);

const Vec3 = z.object({
  x: z.number().finite().min(-1000).max(1000),
  y: z.number().finite().min(-1000).max(1000),
  z: z.number().finite().min(-1000).max(1000),
});

const Size = z.object({
  w: z.number().positive().max(500), // cm
  d: z.number().positive().max(500),
  h: z.number().positive().max(300),
});

// ───────────────────────────────────────────────────────────────────────────
// 1) Auto-Layout — INPUT
//
// What the user types in free text. We let Claude parse it; the schema
// here mirrors what we expect Claude to extract.
// ───────────────────────────────────────────────────────────────────────────

export const AutoLayoutInputSchema = z.object({
  /** Free-text user brief. */
  prompt: z.string().min(20).max(2000),
  /** Optional pre-known room dimensions (cm). */
  room: z.object({
    widthCm: z.number().positive().max(2000).optional(),
    depthCm: z.number().positive().max(2000).optional(),
    heightCm: z.number().positive().max(500).default(270),
  }).optional(),
  /** Constraint hint — if the user has a hard preference. */
  preferredLayout: KitchenLayoutEnum.optional(),
  /** Budget in EUR. */
  budgetEur: z.number().positive().max(500_000).optional(),
  /** Brand preference. */
  preferredBrand: BrandEnum.optional(),
});

export type AutoLayoutInput = z.infer<typeof AutoLayoutInputSchema>;

// ───────────────────────────────────────────────────────────────────────────
// 1) Auto-Layout — OUTPUT (what Claude returns; validated before use)
// ───────────────────────────────────────────────────────────────────────────

const ItemPlacement = z.object({
  sku: z.string().min(1).max(64),
  /** Display label (Claude can suggest a generic if SKU is unknown). */
  label: z.string().min(1).max(200),
  /** Brand the item is sourced from (matches our catalog). */
  brand: BrandEnum,
  /** Centre-bottom position in cm, kitchen-local frame. */
  position: Vec3,
  /** Box dimensions in cm. */
  size: Size,
  /** Rotation around Y in degrees. */
  rotation: z.number().finite().min(-360).max(360).default(0),
  /** Estimated unit price. Claude approximates from brand defaults. */
  unitPriceEur: z.number().nonnegative().max(50_000),
  /** Tag for the renderer + the budget breakdown. */
  category: z.enum(['cabinet', 'appliance', 'worktop', 'splashback', 'sink', 'tap', 'accessory']),
});

export const AutoLayoutProposalSchema = z.object({
  /** Short name shown above the rendered card (≤ 60 chars). */
  name: z.string().min(5).max(60),
  /** 2-3 sentence rationale shown under the card. */
  rationale: z.string().min(30).max(400),
  /** Quality score Claude assigns to this proposal (1-100). */
  score: z.number().int().min(1).max(100),
  /** Inferred layout type. */
  layout: KitchenLayoutEnum,
  /** Inferred kitchen dimensions. */
  room: z.object({
    widthCm: z.number().positive(),
    depthCm: z.number().positive(),
    heightCm: z.number().positive(),
  }),
  /** Ordered list of items. */
  items: z.array(ItemPlacement).min(3).max(40),
  /** Total in EUR — Claude pre-computes; we re-verify. */
  totalEur: z.number().nonnegative(),
});

export const AutoLayoutResponseSchema = z.object({
  /** Constraints Claude extracted from the prompt. */
  parsed: z.object({
    surfaceM2: z.number().positive().optional(),
    style: KitchenStyleEnum.optional(),
    budgetEur: z.number().positive().optional(),
    extraConstraints: z.array(z.string()).default([]),
  }),
  /** Exactly 3 proposals — sorted by `score` desc. */
  proposals: z.array(AutoLayoutProposalSchema).length(3),
});

export type AutoLayoutResponse = z.infer<typeof AutoLayoutResponseSchema>;

// ───────────────────────────────────────────────────────────────────────────
// 2) SnapIt — photo recognition
// ───────────────────────────────────────────────────────────────────────────

export const SnapItInputSchema = z.object({
  /** Public URL of the uploaded image (already in S3, lifecycle 30 d). */
  imageUrl: z.string().url(),
  /** Optional context the user typed when uploading. */
  contextNote: z.string().max(500).optional(),
  /** Where the photo comes from — drives the heuristics. */
  source: z.enum(['user-kitchen', 'inspiration-pinterest', 'inspiration-magazine']).default('user-kitchen'),
});

export type SnapItInput = z.infer<typeof SnapItInputSchema>;

const DetectedItem = z.object({
  /** What Gemini sees ("white wall cabinet, ~60 cm", "induction cooktop 4 zones"). */
  description: z.string().min(5).max(200),
  /** Generic category. */
  category: z.enum(['cabinet', 'appliance', 'worktop', 'splashback', 'sink', 'tap', 'lighting', 'flooring', 'accessory', 'unknown']),
  /** Confidence Gemini assigns (0..1). */
  confidence: z.number().min(0).max(1),
  /** Estimated dimensions in cm (best guess). */
  estimatedSize: Size.optional(),
  /** Bounding box in normalised image coordinates [0..1]. */
  bbox: z.object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    w: z.number().min(0).max(1),
    h: z.number().min(0).max(1),
  }).optional(),
});

const CatalogMatch = z.object({
  sku: z.string(),
  brand: BrandEnum,
  label: z.string(),
  unitPriceEur: z.number().nonnegative(),
  /** Matching score from our retrieval layer (cosine sim text + size). */
  score: z.number().min(0).max(1),
  thumbnailUrl: z.string().url().optional(),
});

export const SnapItResponseSchema = z.object({
  detectedItems: z.array(DetectedItem.extend({
    /** Top 3 catalog matches for this detected item, sorted by score desc. */
    matches: z.array(CatalogMatch).max(3),
  })).min(0).max(30),
  /** Overall scene description (style, mood, era). */
  sceneSummary: z.object({
    inferredStyle: KitchenStyleEnum.optional(),
    palette: z.array(z.string()).max(5).default([]),
    moodKeywords: z.array(z.string()).max(10).default([]),
  }),
});

export type SnapItResponse = z.infer<typeof SnapItResponseSchema>;

// ───────────────────────────────────────────────────────────────────────────
// 3) Style Transfer — input + output
// ───────────────────────────────────────────────────────────────────────────

export const StyleTransferInputSchema = z.object({
  /** URL of the source render (current kitchen, path-traced). */
  sourceImageUrl: z.string().url(),
  targetStyle: KitchenStyleEnum,
  /** Whether to also remap material slots in the 3D model after preview. */
  applyToModel: z.boolean().default(false),
});

export type StyleTransferInput = z.infer<typeof StyleTransferInputSchema>;

export const StyleTransferResponseSchema = z.object({
  /** URL of the generated re-styled image. */
  resultImageUrl: z.string().url(),
  /** Material remapping proposal (only relevant if user clicks "apply"). */
  materialMap: z.array(z.object({
    slot: z.string(), // e.g. "façade", "plan-de-travail", "credence"
    fromMaterial: z.string(),
    toMaterial: z.string(),
    color: z.string().regex(/^#([0-9a-f]{3}){1,2}$/i),
  })).default([]),
});

export type StyleTransferResponse = z.infer<typeof StyleTransferResponseSchema>;

// ───────────────────────────────────────────────────────────────────────────
// 4) Shopping chat — turn-by-turn message schema
// ───────────────────────────────────────────────────────────────────────────

export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'tool']),
  content: z.string(),
  toolName: z.string().optional(),
  toolPayload: z.record(z.unknown()).optional(),
});

export const ChatRequestSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1).max(2000),
  /** Snapshot of the kitchen sent as context. */
  kitchenContext: z.object({
    layout: KitchenLayoutEnum,
    items: z.array(z.object({
      id: z.string(),
      sku: z.string(),
      label: z.string(),
      unitPriceEur: z.number(),
    })).max(60), // beyond that, summarise
    budgetTotalEur: z.number().nonnegative(),
    budgetLimitEur: z.number().positive().optional(),
  }).optional(),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;
