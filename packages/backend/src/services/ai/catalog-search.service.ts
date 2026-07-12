import { type Product, type ProductCategory } from '@prisma/client';
import { z } from 'zod';

import { AnthropicService } from './anthropic.service';
import { buildTypeWhereOr } from './catalog-type-mapping';
import { SYSTEM_PROMPTS } from './prompt-templates';
import { prisma } from '../../database/client';
import logger from '../../utils/logger';

/** Sanitize user's natural language query before passing to AI */
function sanitizeSearchQuery(query: string): string {
  return query
    .replace(/[<>{}[\]]/g, '') // Strip special chars that could be injection vectors
    .replace(/\n/g, ' ') // Flatten newlines
    .trim()
    .slice(0, 500); // Limit length
}

/** Valid category values for the catalog */
export const VALID_CATEGORIES = [
  'cabinet',
  'countertop',
  'appliance',
  'sink',
  'faucet',
  'lighting',
  'hardware',
  'accessory',
  'base_cabinet',
  'wall_cabinet',
  'tall_cabinet',
  'cooktop',
  'oven',
  'refrigerator',
  'dishwasher',
  'microwave',
  'hood',
] as const;

/** Zod schema for AI-extracted search filters */
const searchFiltersSchema = z.object({
  type: z
    .string()
    .max(100)
    .nullable()
    .optional()
    .transform((v) => v ?? undefined),
  brand: z
    .string()
    .max(100)
    .nullable()
    .optional()
    .transform((v) => v ?? undefined),
  minPrice: z
    .number()
    .nonnegative()
    .nullable()
    .optional()
    .transform((v) => v ?? undefined),
  maxPrice: z
    .number()
    .nonnegative()
    .nullable()
    .optional()
    .transform((v) => v ?? undefined),
  minWidth: z
    .number()
    .nonnegative()
    .nullable()
    .optional()
    .transform((v) => v ?? undefined),
  maxWidth: z
    .number()
    .nonnegative()
    .nullable()
    .optional()
    .transform((v) => v ?? undefined),
  material: z
    .string()
    .max(100)
    .nullable()
    .optional()
    .transform((v) => v ?? undefined),
  color: z
    .string()
    .max(100)
    .nullable()
    .optional()
    .transform((v) => v ?? undefined),
  query: z
    .string()
    .max(200)
    .nullable()
    .optional()
    .transform((v) => v ?? undefined),
});

const searchResultSchema = z.object({
  filters: searchFiltersSchema,
  explanation: z.string().max(500),
  suggestions: z.array(z.string().max(200)).max(5),
});

type SearchFilters = z.infer<typeof searchFiltersSchema>;
type SearchResult = z.infer<typeof searchResultSchema>;

/** A real, purchasable catalog row (the only thing the assistant is allowed to cite). */
export type ProductSearchHit = Product & { category: ProductCategory | null };

const DEFAULT_SEARCH_LIMIT = 20;

/**
 * Build the Prisma WHERE from ALREADY-structured filters. Single source of truth,
 * shared by `AICatalogSearchService.search()` (which extracts the filters with an
 * LLM first) and by the shopping-chat `searchCatalog` tool (whose filters arrive
 * structured from Claude's tool input — re-extracting them would pay for a second
 * LLM call for nothing).
 *
 * `type` is mapped to the REAL category slugs by `buildTypeWhereOr` (the tool's
 * English enum — cabinet/appliance/worktop… — does not match the French DB slugs
 * meubles-bas/plans-de-travail/…; the mapping is what bridges them).
 */
function buildProductWhere(filters: Partial<SearchFilters>): Record<string, unknown> {
  const where: Record<string, unknown> = { isActive: true, deletedAt: null };
  // OR-groups combinés via AND (évite la collision de clé `OR` entre type et query).
  const and: Record<string, unknown>[] = [];

  if (filters.type) {
    and.push({ OR: buildTypeWhereOr(filters.type) });
  }
  if (filters.brand) {
    where.brand = { contains: filters.brand, mode: 'insensitive' };
  }
  if (filters.minPrice || filters.maxPrice) {
    const price: Record<string, unknown> = {};
    if (filters.minPrice) {
      price.gte = filters.minPrice;
    }
    if (filters.maxPrice) {
      price.lte = filters.maxPrice;
    }
    where.price = price;
  }
  if (filters.minWidth || filters.maxWidth) {
    const width: Record<string, unknown> = {};
    if (filters.minWidth) {
      width.gte = filters.minWidth;
    }
    if (filters.maxWidth) {
      width.lte = filters.maxWidth;
    }
    where.width = width;
  }
  if (filters.material) {
    where.material = { contains: filters.material, mode: 'insensitive' };
  }
  if (filters.color) {
    where.color = { contains: filters.color, mode: 'insensitive' };
  }
  if (filters.query) {
    and.push({
      OR: [
        { name: { contains: filters.query, mode: 'insensitive' } },
        { description: { contains: filters.query, mode: 'insensitive' } },
      ],
    });
  }

  if (and.length > 0) {
    where.AND = and;
  }
  return where;
}

/**
 * Deterministic catalog lookup — NO LLM. Returns real rows (or an empty array).
 * This is the only fact source the shopping assistant has for products/prices:
 * if it returns nothing, the assistant must say so, never invent (system prompt).
 */
export async function searchProductsStructured(
  filters: Partial<SearchFilters>,
  limit: number = DEFAULT_SEARCH_LIMIT
): Promise<ProductSearchHit[]> {
  return prisma.product.findMany({
    where: buildProductWhere(filters) as never,
    take: limit,
    orderBy: { name: 'asc' },
    include: { category: true },
  });
}

export class AICatalogSearchService {
  private anthropic: AnthropicService;

  constructor() {
    this.anthropic = AnthropicService.getInstance();
  }

  async search(options: { query: string; userId: string; locale?: string }): Promise<{
    filters: SearchFilters;
    results: unknown[];
    explanation: string;
    suggestions: string[];
  }> {
    // Sanitize user query before processing
    const sanitizedQuery = sanitizeSearchQuery(options.query);

    // Step 1: Extract structured filters from natural language (LLM).
    const extracted = await this.extractFilters(sanitizedQuery, options.userId);

    // Steps 2+3 — shared with the shopping-chat `searchCatalog` tool.
    const results = await searchProductsStructured(extracted.filters, DEFAULT_SEARCH_LIMIT);

    return {
      filters: extracted.filters,
      results,
      explanation: extracted.explanation,
      suggestions: extracted.suggestions,
    };
  }

  private async extractFilters(query: string, userId: string): Promise<SearchResult> {
    const prompt = `Extrait les filtres de recherche de cette requete utilisateur pour un catalogue de cuisine.

Requete: "${query}"

Categories disponibles: cabinet, countertop, appliance, sink, faucet, lighting, hardware, accessory
Sous-types: base_cabinet, wall_cabinet, tall_cabinet, cooktop, oven, refrigerator, dishwasher, microwave, hood

Reponds UNIQUEMENT avec un JSON valide:
{
  "filters": {
    "type": "categorie ou null",
    "brand": "marque ou null",
    "minPrice": null,
    "maxPrice": null,
    "minWidth": null,
    "maxWidth": null,
    "material": "materiau ou null",
    "color": "couleur ou null",
    "query": "mots-cles restants pour recherche textuelle ou null"
  },
  "explanation": "Je recherche... (explication courte en francais)",
  "suggestions": ["recherche alternative 1"]
}`;

    try {
      const result = await this.anthropic.generateJSON<SearchResult>({
        system: SYSTEM_PROMPTS.CATALOG_SEARCH,
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 256,
        parse: (text: string) => {
          const parsed = JSON.parse(text);
          return searchResultSchema.parse(parsed);
        },
      });
      return result.data;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.error('[AI:catalog-search] Filter extraction failed', { error: errMsg, userId });
      return {
        filters: { query },
        explanation: `Recherche textuelle pour "${query}"`,
        suggestions: [],
      };
    }
  }
}

export default AICatalogSearchService;
