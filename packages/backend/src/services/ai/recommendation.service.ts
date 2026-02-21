import { z } from 'zod';
import { AnthropicService } from './anthropic.service';
import { SYSTEM_PROMPTS } from './prompt-templates';
import logger from '../../utils/logger';

/** Sanitize user input to prevent prompt injection */
function sanitizeInput(input: string | undefined | null): string {
  if (!input) return '';
  return input
    .replace(/[<>{}[\]]/g, '') // Remove special chars
    .replace(/\n/g, ' ')       // Flatten newlines
    .slice(0, 200);            // Limit length
}

const RecommendationSchema = z.object({
  recommendations: z.array(z.object({
    productType: z.string().max(100),
    reason: z.string().max(500),
    priority: z.enum(['high', 'medium', 'low']),
    suggestedBrand: z.string().max(100).optional().nullable().transform(v => v ?? undefined),
    priceRange: z.object({
      min: z.number().min(0),
      max: z.number().min(0),
    }).optional().nullable().transform(v => v ?? undefined),
  })).max(10),
});

interface RecommendationItem {
  productType: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  suggestedBrand?: string;
  priceRange?: { min: number; max: number };
}

export class ProductRecommendationService {
  private anthropic: AnthropicService;

  constructor() {
    this.anthropic = AnthropicService.getInstance();
  }

  async getComplementaryProducts(options: {
    currentItems: Array<{ type: string; name?: string }>;
    lastAddedItem: { type: string; name?: string };
    style?: string;
    budget?: { min: number; max: number };
    userId: string;
  }): Promise<{ recommendations: RecommendationItem[] }> {
    const safeItemType = sanitizeInput(options.lastAddedItem.type);
    const safeItemName = sanitizeInput(options.lastAddedItem.name);
    const safeStyle = sanitizeInput(options.style);
    const safeItems = options.currentItems.map(i => sanitizeInput(i.type)).join(', ') || 'aucun';
    const safeBudget = options.budget
      ? `Budget: ${Math.max(0, Math.min(1000000, options.budget.min))}-${Math.max(0, Math.min(1000000, options.budget.max))}EUR`
      : '';

    const prompt = `L'utilisateur vient d'ajouter un element "${safeItemType}${safeItemName ? ` (${safeItemName})` : ''}" a sa cuisine.

Elements deja places: ${safeItems}
Style: ${safeStyle || 'non defini'}
${safeBudget}

Suggere 3-5 produits complementaires. Reponds UNIQUEMENT avec un JSON valide:
{
  "recommendations": [
    {
      "productType": "type de produit",
      "reason": "raison en francais (1 phrase)",
      "priority": "high|medium|low",
      "suggestedBrand": "marque suggeree ou null",
      "priceRange": {"min": 0, "max": 0}
    }
  ]
}

Logique:
- Si evier ajoute -> suggerer lave-vaisselle a cote, robinetterie, meuble sous-evier
- Si plaque ajoute -> suggerer hotte au-dessus, meubles bas adjacents
- Si frigo ajoute -> suggerer meubles colonne, micro-ondes
- Toujours suggerer ce qui manque pour le triangle de travail (evier/plaque/frigo)`;

    try {
      const result = await this.anthropic.generateJSON<{ recommendations: RecommendationItem[] }>({
        system: SYSTEM_PROMPTS.KITCHEN_EXPERT,
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 512,
        parse: (text: string) => {
          const raw = JSON.parse(text);
          return RecommendationSchema.parse(raw);
        },
      });
      return result.data;
    } catch (error) {
      logger.error('[AI:recommendations] Failed', { error, userId: options.userId });
      return { recommendations: [] };
    }
  }
}

export default ProductRecommendationService;
