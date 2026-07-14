/**
 * Assistant context router — the ARCHITECTURAL anti-hallucination guardrail.
 *
 * Until now the assistant could not invent a product/price because a prompt block
 * said so. That held by rule, not by construction. Here the rule becomes physics:
 *
 *   the server picks the tool-set per context ⇒ NO TOOL FOR THIS CONTEXT
 *   ⇒ the model has NO fact source ⇒ it CANNOT cite a product, a SKU or a price.
 *
 * The prompt is now a seatbelt, not the harness.
 *
 * Two things follow from that:
 *   1. `tools: []` is the DEFAULT. A context is anchored only if a real tool
 *      backs it (designer → resolve_colors/getBudgetSummary, catalog →
 *      searchCatalog since #237). Everything else answers honestly that it has
 *      no data here — and it structurally cannot do otherwise.
 *   2. The context comes from the CLIENT, so it is never trusted: zod-validated,
 *      then server-VERIFIED (see verifyDesignerPayload — the items are re-priced
 *      from the DB; a forged price never reaches the model).
 */
import { z } from 'zod';

import { ASSISTANT_PROMPTS, buildUnanchoredPrompt } from './prompts';
import { KitchenLayoutEnum } from './schemas';
import { prisma } from '../../database/client';

import type { SHOPPING_CHAT_TOOLS } from './prompts';

// ── Contexts ────────────────────────────────────────────────────────────────

/** Contexts backed by a REAL tool (a verifiable fact source). */
export const ANCHORED_CONTEXTS = ['designer', 'catalog'] as const;

/**
 * Contexts with NO tool yet. They are not "forbidden" — they are honest: the
 * assistant says what it lacks. Each gets its tools when its anchor lands
 * (quote → a get_bom tool, projects → a list_projects tool… cf CLAUDE.md).
 */
export const UNANCHORED_CONTEXTS = [
  'quote',
  'projects',
  'dashboard',
  'questionnaire',
  'financing',
  'pricing',
  'profile',
  'other',
] as const;

export const ASSISTANT_CONTEXTS = [...ANCHORED_CONTEXTS, ...UNANCHORED_CONTEXTS] as const;
export type AssistantContext = (typeof ASSISTANT_CONTEXTS)[number];

/**
 * DERIVED from the tool declarations - never hand-copied. A hand-written union
 * decouples silently: rename a tool in SHOPPING_CHAT_TOOLS and the allowlist below
 * stops matching it, the context falls to `tools: []`, and the assistant loses its
 * anchor while still sounding healthy ("I have no access to that data"). Deriving it
 * turns that silent degradation into a compile error.
 */
export type ShoppingToolName = (typeof SHOPPING_CHAT_TOOLS)[number]['name'];

// ── Payloads (client-supplied → validated, then verified) ────────────────────

const designerItemSchema = z.object({
  id: z.string().min(1).max(64),
  sku: z.string().min(1).max(64),
  label: z.string().max(200).optional(),
  /** Client-supplied — DELIBERATELY IGNORED, the server re-prices from the DB. */
  unitPriceEur: z.number().nonnegative().optional(),
});

const designerPayloadSchema = z.object({
  layout: KitchenLayoutEnum,
  items: z.array(designerItemSchema).max(60),
  budgetLimitEur: z.number().positive().max(500_000).optional(),
});

const catalogPayloadSchema = z
  .object({ providerCode: z.string().max(40).optional() })
  .optional();

/** Unanchored contexts carry nothing the assistant may cite. */
const emptyPayloadSchema = z.unknown().optional();

export const AssistantRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  conversationId: z.string().uuid().optional(),
  context: z.enum(ASSISTANT_CONTEXTS),
  payload: z.unknown().optional(),
});
export type AssistantRequest = z.infer<typeof AssistantRequestSchema>;

// ── Registry: context → (tools, prompt, payload schema) ──────────────────────

export interface ContextSpec {
  /** EMPTY = no fact source = the model cannot assert anything. This is the guardrail. */
  readonly tools: readonly ShoppingToolName[];
  readonly systemPrompt: string;
  readonly payloadSchema: z.ZodTypeAny;
}

function unanchored(pageLabel: string): ContextSpec {
  return {
    tools: [], // ← the whole point of this file
    systemPrompt: buildUnanchoredPrompt(pageLabel),
    payloadSchema: emptyPayloadSchema,
  };
}

export const CONTEXT_REGISTRY: Record<AssistantContext, ContextSpec> = {
  designer: {
    tools: ['resolve_colors', 'getBudgetSummary'],
    systemPrompt: ASSISTANT_PROMPTS.designer,
    payloadSchema: designerPayloadSchema,
  },
  catalog: {
    tools: ['searchCatalog'], // real since #237
    systemPrompt: ASSISTANT_PROMPTS.catalog,
    payloadSchema: catalogPayloadSchema,
  },
  quote: unanchored('le devis'),
  projects: unanchored('tes projets'),
  dashboard: unanchored('le tableau de bord'),
  questionnaire: unanchored('le questionnaire'),
  financing: unanchored('le financement'),
  pricing: unanchored('les tarifs'),
  profile: unanchored('ton profil'),
  other: unanchored('cette page'),
};

export function isAnchored(context: AssistantContext): boolean {
  return CONTEXT_REGISTRY[context].tools.length > 0;
}

// ── Server-side verification (a forged context must not become a fact) ───────

/** The kitchen snapshot AFTER server verification — the ONLY one the model sees. */
export interface VerifiedKitchenContext {
  layout: string;
  /** Only items whose SKU exists in the catalog, priced FROM THE DB. */
  items: Array<{ id: string; sku: string; label: string; unitPriceEur: number }>;
  /** Server-computed from the DB prices — never the client's arithmetic. */
  budgetTotalEur: number;
  budgetLimitEur?: number;
  /** SKUs the client sent that do NOT exist in the catalog. Surfaced, never priced. */
  unverifiedSkus: string[];
}

/**
 * Re-anchor a client designer payload against the DB.
 *
 * Why this exists: `getBudgetSummary` used to sum the CLIENT's `unitPriceEur`.
 * A forged payload could therefore make the assistant state a fake total with
 * full confidence — the anchoring was client-trusted, i.e. not anchoring at all.
 * Here every price comes from the DB, unknown SKUs are dropped (they cannot be
 * cited) and reported, and the total is computed server-side.
 */
export async function verifyDesignerPayload(
  payload: z.infer<typeof designerPayloadSchema>
): Promise<VerifiedKitchenContext> {
  const skus = [...new Set(payload.items.map((i) => i.sku))];

  const rows =
    skus.length > 0
      ? await prisma.product.findMany({
          where: { sku: { in: skus }, isActive: true, deletedAt: null },
          select: { sku: true, name: true, price: true },
        })
      : [];
  const bySku = new Map(rows.map((r) => [r.sku, r]));

  const items = payload.items
    .filter((i) => bySku.has(i.sku))
    .map((i) => {
      const row = bySku.get(i.sku)!;
      return {
        id: i.id,
        sku: i.sku,
        label: row.name, // DB label wins over the client's
        unitPriceEur: Number(row.price), // DB price wins — always
      };
    });

  const unverifiedSkus = payload.items.filter((i) => !bySku.has(i.sku)).map((i) => i.sku);

  return {
    layout: payload.layout,
    items,
    budgetTotalEur: Number(items.reduce((s, i) => s + i.unitPriceEur, 0).toFixed(2)),
    ...(payload.budgetLimitEur !== undefined ? { budgetLimitEur: payload.budgetLimitEur } : {}),
    unverifiedSkus: [...new Set(unverifiedSkus)],
  };
}
