import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { AnthropicService } from './anthropic.service';
import { SYSTEM_PROMPTS } from './prompt-templates';
import { prisma } from '../../database/client';
import logger from '../../utils/logger';

// ============================================================================
// TYPES
// ============================================================================

/** Questionnaire data shape (matches Prisma JSON columns) */
export interface QuestionnaireData {
  userProfile?: Record<string, unknown>;
  spatialData?: Record<string, unknown>;
  aestheticPrefs?: Record<string, unknown>;
  budgetData?: Record<string, unknown>;
  cookingHabits?: Record<string, unknown>;
  socialUsage?: Record<string, unknown>;
  futureNeeds?: Record<string, unknown>;
  technologyPrefs?: Record<string, unknown>;
  environmentalPrefs?: Record<string, unknown>;
  maintenancePrefs?: Record<string, unknown>;
}

/** Constraints extracted from questionnaire for design generation */
interface DesignConstraints {
  roomWidth: number;
  roomDepth: number;
  roomHeight: number;
  roomShape: string;
  style: string;
  budgetMin: number;
  budgetMax: number;
  budgetCurrency: string;
  budgetFlexibility: string;
  priorities: string[];
  cookingFrequency: string;
  mealTypes: string;
  includeAppliances: boolean;
  includeIsland: boolean;
  accessibility: boolean;
  colorPreferences: string[];
  layoutPreference: string;
  additionalNotes: string;
}

/** Budget tier definition */
type BudgetTier = 'economique' | 'confort' | 'premium';

interface TierConfig {
  tier: BudgetTier;
  name: string;
  multiplier: number;
  brandProfile: string;
  finishLevel: string;
}

/** Cost breakdown per category */
export interface CostBreakdownFlat {
  cabinets: number;
  countertops: number;
  appliances: number;
  installation: number;
}

/** Product line item in a design */
export interface DesignProduct {
  name: string;
  category: string;
  brand: string;
  reference: string;
  qty: number;
  unitPrice: number;
  totalPrice: number;
}

/** Score breakdown for a design */
export interface DesignScores {
  ergonomics: number;
  storage: number;
  aesthetics: number;
  budget: number;
  overall: number;
}

/** AI explanation for a design */
export interface DesignExplanation {
  materials: string;
  layout: string;
  tradeoffs: string;
}

/** Kitchen layout item */
export interface KitchenLayoutItem {
  id: string;
  type: string;
  name: string;
  x: number;
  y: number;
  width: number;
  depth: number;
  wallSide: string;
}

/** Single design result from the pipeline */
export interface SingleDesignResult {
  id: string;
  tier: BudgetTier;
  name: string;
  description: string;
  layout: {
    type: string;
    items: KitchenLayoutItem[];
  };
  products: DesignProduct[];
  totalCost: number;
  scores: DesignScores;
  explanation: DesignExplanation;
  costBreakdown: CostBreakdownFlat;
  materials: {
    cabinets: string;
    countertops: string;
    backsplash: string;
    flooring: string;
  };
  features: string[];
  style: string;
  createdAt: string;
}

/** Full auto-design result */
export interface AutoDesignResult {
  generationId: string;
  designs: SingleDesignResult[];
  questionnaireId: string;
  createdAt: string;
}

// ============================================================================
// ZOD SCHEMAS for AI output validation
// ============================================================================

const LayoutItemSchema = z.object({
  type: z.string(),
  name: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  depth: z.number(),
  wallSide: z.string().default('north'),
});

const ProductSchema = z.object({
  name: z.string(),
  category: z.string(),
  brand: z.string(),
  reference: z.string().default(''),
  qty: z.number().min(1).default(1),
  unitPrice: z.number().min(0),
  totalPrice: z.number().min(0),
});

const TierDesignSchema = z.object({
  name: z.string(),
  description: z.string(),
  layoutType: z.string().default('l-shaped'),
  layoutItems: z.array(LayoutItemSchema),
  products: z.array(ProductSchema),
  totalCost: z.number().min(0),
  scores: z.object({
    ergonomics: z.number().min(0).max(100),
    storage: z.number().min(0).max(100),
    aesthetics: z.number().min(0).max(100),
    budget: z.number().min(0).max(100),
    overall: z.number().min(0).max(100),
  }),
  explanation: z.object({
    materials: z.string(),
    layout: z.string(),
    tradeoffs: z.string(),
  }),
  costBreakdown: z.object({
    cabinets: z.number().min(0),
    countertops: z.number().min(0),
    appliances: z.number().min(0),
    installation: z.number().min(0),
  }),
  materials: z.object({
    cabinets: z.string(),
    countertops: z.string(),
    backsplash: z.string(),
    flooring: z.string(),
  }),
  features: z.array(z.string()),
  style: z.string().default('modern'),
});

const ThreeTierDesignSchema = z.object({
  economique: TierDesignSchema,
  confort: TierDesignSchema,
  premium: TierDesignSchema,
});

// ============================================================================
// SERVICE
// ============================================================================

/** Sanitize user input to prevent prompt injection */
function sanitizeInput(input: string | undefined | null): string {
  if (!input) return '';
  return input
    .replace(/[<>{}[\]]/g, '')
    .replace(/\n/g, ' ')
    .slice(0, 300);
}

/** Safely stringify objects with length limit */
export function safeStringify(obj: unknown, maxLen = 500): string {
  try {
    const str = JSON.stringify(obj);
    return str.length > maxLen ? str.slice(0, maxLen) + '...' : str;
  } catch {
    return '{}';
  }
}

const TIER_CONFIGS: TierConfig[] = [
  {
    tier: 'economique',
    name: 'Cuisine Economique',
    multiplier: 0.6,
    brandProfile: 'IKEA METOD, Leroy Merlin, Castorama - gamme entree',
    finishLevel: 'Melamines basiques, stratifie standard, electromenager entree de gamme',
  },
  {
    tier: 'confort',
    name: 'Cuisine Confort',
    multiplier: 1.0,
    brandProfile: 'IKEA METOD haut de gamme, Schmidt, Mobalpa entree/milieu de gamme',
    finishLevel: 'Laque ou plaque, quartz ou stratifie premium, electromenager milieu de gamme (Bosch, Siemens)',
  },
  {
    tier: 'premium',
    name: 'Cuisine Premium',
    multiplier: 1.4,
    brandProfile: 'Schmidt, Mobalpa, SieMatic, Poggenpohl - gamme premium',
    finishLevel: 'Laque vernis, quartz ou granit, electromenager haut de gamme (Miele, Gaggenau, Bora)',
  },
];

/**
 * AutoDesignPipelineService
 *
 * Orchestrates the full pipeline: questionnaire data -> 3 kitchen designs at
 * different budget tiers (economique / confort / premium), each with a layout,
 * product list, cost breakdown, and quality scores.
 */
export class AutoDesignPipelineService {
  private anthropic: AnthropicService;

  constructor() {
    this.anthropic = AnthropicService.getInstance();
  }

  /**
   * Main pipeline: questionnaire data -> 3 designs with quotes.
   *
   * @param userId - The authenticated user's ID
   * @param questionnaireData - Aggregated questionnaire sections
   * @returns AutoDesignResult with 3 designs and a generationId
   */
  async generateFromQuestionnaire(
    userId: string,
    questionnaireData: QuestionnaireData,
  ): Promise<AutoDesignResult> {
    const startTime = Date.now();
    const generationId = crypto.randomUUID();

    logger.info('[AutoDesignPipeline] Starting 3-tier generation', {
      userId,
      generationId,
      hasProfile: !!questionnaireData.userProfile,
      hasSpatial: !!questionnaireData.spatialData,
      hasAesthetic: !!questionnaireData.aestheticPrefs,
      hasBudget: !!questionnaireData.budgetData,
    });

    // 1. Create the AIGeneration record (pending)
    await prisma.aIGeneration.create({
      data: {
        id: generationId,
        userId,
        status: 'pending',
        preferences: questionnaireData as unknown as Prisma.InputJsonValue,
        designs: [],
        isAIGenerated: true,
      },
    });

    try {
      // 2. Extract constraints from questionnaire
      const constraints = this.extractConstraints(questionnaireData);

      // 3. Generate all 3 tiers in a single AI call for efficiency
      const designs = await this.generateAllTiers(constraints, generationId);

      // 4. Store the results
      const now = new Date();
      await prisma.aIGeneration.update({
        where: { id: generationId },
        data: {
          status: 'completed',
          designs: designs as unknown as Prisma.InputJsonValue,
          completedAt: now,
        },
      });

      const durationMs = Date.now() - startTime;
      logger.info('[AutoDesignPipeline] Generation completed', {
        userId,
        generationId,
        durationMs,
        designCount: designs.length,
      });

      return {
        generationId,
        designs,
        questionnaireId: generationId,
        createdAt: now.toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Update AIGeneration with error
      await prisma.aIGeneration.update({
        where: { id: generationId },
        data: {
          status: 'failed',
          errorMessage,
        },
      });

      logger.error('[AutoDesignPipeline] Generation failed', {
        userId,
        generationId,
        error: errorMessage,
      });

      throw error;
    }
  }

  /**
   * Extract design constraints from raw questionnaire data.
   */
  private extractConstraints(data: QuestionnaireData): DesignConstraints {
    const spatial = (data.spatialData ?? {}) as Record<string, unknown>;
    const budget = (data.budgetData ?? {}) as Record<string, unknown>;
    const aesthetic = (data.aestheticPrefs ?? {}) as Record<string, unknown>;
    const profile = (data.userProfile ?? {}) as Record<string, unknown>;
    const cooking = (data.cookingHabits ?? {}) as Record<string, unknown>;

    // Extract room dimensions (defaulting to typical French kitchen)
    const roomWidth = Number(spatial.width || spatial.roomWidth || 350);
    const roomDepth = Number(spatial.depth || spatial.roomDepth || spatial.length || 300);
    const roomHeight = Number(spatial.height || spatial.roomHeight || 250);
    const roomShape = String(spatial.shape || spatial.roomShape || 'rectangular');

    // Extract budget
    const budgetTotal = Number(budget.totalBudget || budget.max || 15000);
    const budgetMin = Number(budget.min || budgetTotal * 0.6);
    const budgetMax = Number(budget.max || budgetTotal);
    const budgetCurrency = String(budget.currency || 'EUR');
    const budgetFlexibility = String(budget.budgetFlexibility || 'moderate');

    // Extract style
    const style = String(
      aesthetic.kitchenStyle || aesthetic.style || profile.preferredStyle || 'modern',
    );

    // Extract priorities
    const priorities = Array.isArray(budget.priorityAreas)
      ? (budget.priorityAreas as string[])
      : Array.isArray(aesthetic.priorities)
        ? (aesthetic.priorities as string[])
        : ['storage', 'aesthetics'];

    // Cooking habits
    const cookingFrequency = String(cooking.frequency || profile.cookingFrequency || 'daily');
    const mealTypes = String(cooking.mealTypes || '');

    // Booleans
    const includeAppliances = budget.includeAppliances !== false;
    const includeIsland = Boolean(aesthetic.includeIsland || spatial.includeIsland);
    const accessibility = Boolean(profile.accessibility || spatial.accessibility);

    // Colors
    const colorPreferences = Array.isArray(aesthetic.colorPalette)
      ? (aesthetic.colorPalette as string[])
      : [];

    const layoutPreference = String(
      aesthetic.layoutPreference || spatial.layoutPreference || '',
    );

    const additionalNotes = sanitizeInput(
      String(aesthetic.additionalRequirements || profile.additionalNotes || ''),
    );

    return {
      roomWidth,
      roomDepth,
      roomHeight,
      roomShape,
      style,
      budgetMin,
      budgetMax,
      budgetCurrency,
      budgetFlexibility,
      priorities,
      cookingFrequency,
      mealTypes,
      includeAppliances,
      includeIsland,
      accessibility,
      colorPreferences,
      layoutPreference,
      additionalNotes,
    };
  }

  /**
   * Generate all 3 tier designs in a single AI call.
   * This is more token-efficient than 3 separate calls.
   */
  private async generateAllTiers(
    constraints: DesignConstraints,
    generationId: string,
  ): Promise<SingleDesignResult[]> {
    const prompt = this.buildThreeTierPrompt(constraints);

    const result = await this.anthropic.generateJSON<{
      economique: z.infer<typeof TierDesignSchema>;
      confort: z.infer<typeof TierDesignSchema>;
      premium: z.infer<typeof TierDesignSchema>;
    }>({
      system: SYSTEM_PROMPTS.DESIGN_GENERATOR,
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 12000,
      parse: (text: string) => {
        const parsed = JSON.parse(text);
        return ThreeTierDesignSchema.parse(parsed);
      },
    });

    logger.info('[AutoDesignPipeline] AI returned 3-tier designs', {
      generationId,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    });

    const now = new Date().toISOString();

    return TIER_CONFIGS.map((config) => {
      const tierData = result.data[config.tier];
      return {
        id: crypto.randomUUID(),
        tier: config.tier,
        name: tierData.name || config.name,
        description: tierData.description,
        layout: {
          type: tierData.layoutType,
          items: tierData.layoutItems.map((item) => ({
            ...item,
            id: crypto.randomUUID(),
          })),
        },
        products: tierData.products,
        totalCost: tierData.totalCost,
        scores: tierData.scores,
        explanation: tierData.explanation,
        costBreakdown: tierData.costBreakdown,
        materials: tierData.materials,
        features: tierData.features,
        style: tierData.style || constraints.style,
        createdAt: now,
      };
    });
  }

  /**
   * Build the prompt for generating 3 budget tiers simultaneously.
   */
  private buildThreeTierPrompt(constraints: DesignConstraints): string {
    const sections: string[] = [];

    sections.push('Genere 3 concepts de cuisine a 3 niveaux de budget differents.');
    sections.push('');

    // Room data
    sections.push('=== PIECE ===');
    sections.push(`- Dimensions: ${constraints.roomWidth}cm x ${constraints.roomDepth}cm, hauteur ${constraints.roomHeight}cm`);
    sections.push(`- Forme: ${constraints.roomShape}`);
    if (constraints.layoutPreference) {
      sections.push(`- Disposition preferee: ${constraints.layoutPreference}`);
    }
    sections.push('');

    // Style & preferences
    sections.push('=== STYLE & PREFERENCES ===');
    sections.push(`- Style: ${constraints.style}`);
    if (constraints.colorPreferences.length > 0) {
      sections.push(`- Couleurs: ${constraints.colorPreferences.join(', ')}`);
    }
    sections.push(`- Priorites: ${constraints.priorities.join(', ')}`);
    sections.push(`- Frequence cuisine: ${constraints.cookingFrequency}`);
    if (constraints.mealTypes) {
      sections.push(`- Types de repas: ${constraints.mealTypes}`);
    }
    if (constraints.includeIsland) {
      sections.push('- Ilot central souhaite');
    }
    if (constraints.accessibility) {
      sections.push('- Accessibilite PMR requise');
    }
    if (constraints.additionalNotes) {
      sections.push(`- Notes: ${constraints.additionalNotes}`);
    }
    sections.push('');

    // Budget tiers
    sections.push('=== BUDGET ===');
    sections.push(`- Budget de reference: ${constraints.budgetMax} ${constraints.budgetCurrency}`);
    sections.push(`- Flexibilite: ${constraints.budgetFlexibility}`);
    sections.push('');

    sections.push('=== 3 NIVEAUX A GENERER ===');
    for (const config of TIER_CONFIGS) {
      const tierBudget = Math.round(constraints.budgetMax * config.multiplier);
      sections.push(`\n--- ${config.tier.toUpperCase()} (budget: ~${tierBudget} ${constraints.budgetCurrency}) ---`);
      sections.push(`- Marques cibles: ${config.brandProfile}`);
      sections.push(`- Niveau de finition: ${config.finishLevel}`);
    }
    sections.push('');

    // Output format
    sections.push('=== FORMAT DE SORTIE ===');
    sections.push('Reponds avec un objet JSON contenant 3 cles: "economique", "confort", "premium".');
    sections.push('Chaque cle doit avoir EXACTEMENT cette structure:');
    sections.push(`{
  "name": "Nom du concept (en francais)",
  "description": "2-3 phrases expliquant pourquoi ce design convient",
  "layoutType": "l-shaped|u-shaped|galley|open|island|peninsula",
  "layoutItems": [
    {
      "type": "base_cabinet|wall_cabinet|tall_cabinet|countertop|appliance|sink|island",
      "name": "Description courte",
      "x": number (position en cm depuis coin gauche),
      "y": number (position en cm depuis mur nord),
      "width": number (largeur en cm),
      "depth": number (profondeur en cm),
      "wallSide": "north|south|east|west|center"
    }
  ],
  "products": [
    {
      "name": "Nom produit",
      "category": "cabinets|countertops|appliances|installation|accessories",
      "brand": "Nom marque",
      "reference": "Reference si connue",
      "qty": number,
      "unitPrice": number (en EUR),
      "totalPrice": number
    }
  ],
  "totalCost": number,
  "scores": {
    "ergonomics": number (0-100),
    "storage": number (0-100),
    "aesthetics": number (0-100),
    "budget": number (0-100, ratio qualite/prix),
    "overall": number (0-100)
  },
  "explanation": {
    "materials": "Justification des materiaux choisis",
    "layout": "Explication de la disposition et du triangle de travail",
    "tradeoffs": "Compromis de ce niveau de budget"
  },
  "costBreakdown": {
    "cabinets": number,
    "countertops": number,
    "appliances": number,
    "installation": number
  },
  "materials": {
    "cabinets": "Type caisson",
    "countertops": "Type plan de travail",
    "backsplash": "Type credence",
    "flooring": "Type sol"
  },
  "features": ["liste", "des", "fonctionnalites"],
  "style": "modern|traditional|scandinavian|industrial|etc"
}`);
    sections.push('');
    sections.push('REGLES IMPORTANTES:');
    sections.push('- Les prix doivent etre en euros, realistes pour le marche francais 2024-2026');
    sections.push('- Le total des produits doit correspondre au totalCost');
    sections.push('- costBreakdown.cabinets + countertops + appliances + installation = totalCost');
    sections.push('- Les layoutItems doivent respecter les dimensions de la piece');
    sections.push('- Chaque tier doit avoir une philosophie distincte (economie vs qualite vs luxe)');
    sections.push('- Le tier economique doit etre fonctionnel malgre le budget reduit');
    sections.push('- Le tier premium doit justifier son surplus par des materiaux et equipements superieurs');
    sections.push('- Reponds UNIQUEMENT avec le JSON, sans texte avant ou apres');

    return sections.join('\n');
  }
}

export default AutoDesignPipelineService;
