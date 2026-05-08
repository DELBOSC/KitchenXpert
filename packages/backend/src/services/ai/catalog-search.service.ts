import { z } from 'zod';

import { AnthropicService } from './anthropic.service';
import { SYSTEM_PROMPTS } from './prompt-templates';
import { prisma } from '../../database/client';
import logger from '../../utils/logger';

/** Sanitize user's natural language query before passing to AI */
function sanitizeSearchQuery(query: string): string {
  return query
    .replace(/[<>{}[\]]/g, '') // Strip special chars that could be injection vectors
    .replace(/\n/g, ' ')       // Flatten newlines
    .trim()
    .slice(0, 500);            // Limit length
}

/** Valid category values for the catalog */
export const VALID_CATEGORIES = [
  'cabinet', 'countertop', 'appliance', 'sink',
  'faucet', 'lighting', 'hardware', 'accessory',
  'base_cabinet', 'wall_cabinet', 'tall_cabinet',
  'cooktop', 'oven', 'refrigerator', 'dishwasher', 'microwave', 'hood',
] as const;

/** Zod schema for AI-extracted search filters */
const searchFiltersSchema = z.object({
  type: z.string().max(100).nullable().optional().transform(v => v ?? undefined),
  brand: z.string().max(100).nullable().optional().transform(v => v ?? undefined),
  minPrice: z.number().nonnegative().nullable().optional().transform(v => v ?? undefined),
  maxPrice: z.number().nonnegative().nullable().optional().transform(v => v ?? undefined),
  minWidth: z.number().nonnegative().nullable().optional().transform(v => v ?? undefined),
  maxWidth: z.number().nonnegative().nullable().optional().transform(v => v ?? undefined),
  material: z.string().max(100).nullable().optional().transform(v => v ?? undefined),
  color: z.string().max(100).nullable().optional().transform(v => v ?? undefined),
  query: z.string().max(200).nullable().optional().transform(v => v ?? undefined),
});

const searchResultSchema = z.object({
  filters: searchFiltersSchema,
  explanation: z.string().max(500),
  suggestions: z.array(z.string().max(200)).max(5),
});

type SearchFilters = z.infer<typeof searchFiltersSchema>;
type SearchResult = z.infer<typeof searchResultSchema>;

export class AICatalogSearchService {
  private anthropic: AnthropicService;

  constructor() {
    this.anthropic = AnthropicService.getInstance();
  }

  async search(options: {
    query: string;
    userId: string;
    locale?: string;
  }): Promise<{ filters: SearchFilters; results: unknown[]; explanation: string; suggestions: string[] }> {
    // Sanitize user query before processing
    const sanitizedQuery = sanitizeSearchQuery(options.query);

    // Step 1: Extract structured filters from natural language
    const extracted = await this.extractFilters(sanitizedQuery, options.userId);

    // Step 2: Build Prisma query from filters
    const where: Record<string, unknown> = { isActive: true, deletedAt: null };

    // Map type filter to category name search
    if (extracted.filters.type) {
      where.category = { name: { contains: extracted.filters.type, mode: 'insensitive' } };
    }
    if (extracted.filters.brand) {
      where.brand = { contains: extracted.filters.brand, mode: 'insensitive' };
    }
    if (extracted.filters.minPrice || extracted.filters.maxPrice) {
      where.price = {} as Record<string, unknown>;
      if (extracted.filters.minPrice) {(where.price as Record<string, unknown>).gte = extracted.filters.minPrice;}
      if (extracted.filters.maxPrice) {(where.price as Record<string, unknown>).lte = extracted.filters.maxPrice;}
    }
    if (extracted.filters.minWidth || extracted.filters.maxWidth) {
      where.width = {} as Record<string, unknown>;
      if (extracted.filters.minWidth) {(where.width as Record<string, unknown>).gte = extracted.filters.minWidth;}
      if (extracted.filters.maxWidth) {(where.width as Record<string, unknown>).lte = extracted.filters.maxWidth;}
    }
    if (extracted.filters.material) {
      where.material = { contains: extracted.filters.material, mode: 'insensitive' };
    }
    if (extracted.filters.color) {
      where.color = { contains: extracted.filters.color, mode: 'insensitive' };
    }
    if (extracted.filters.query) {
      where.OR = [
        { name: { contains: extracted.filters.query, mode: 'insensitive' } },
        { description: { contains: extracted.filters.query, mode: 'insensitive' } },
      ];
    }

    // Step 3: Query DB
    const results = await prisma.product.findMany({
      where: where as any,
      take: 20,
      orderBy: { name: 'asc' },
      include: { category: true },
    });

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
