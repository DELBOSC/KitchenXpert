import crypto from 'crypto';

import { z } from 'zod';

import { AnthropicService } from './anthropic.service';
import { SYSTEM_PROMPTS } from './prompt-templates';
import logger from '../../utils/logger';

/** Sanitize user input to prevent prompt injection */
function sanitizeInput(input: string | undefined | null): string {
  if (!input) {return '';}
  return input
    .replace(/[<>{}[\]]/g, '') // Remove special chars
    .replace(/\n/g, ' ')       // Flatten newlines
    .slice(0, 200);            // Limit length
}

/** Safely stringify objects with length limit */
function safeStringify(obj: unknown, maxLen = 500): string {
  const str = JSON.stringify(obj);
  return str.length > maxLen ? `${str.slice(0, maxLen)  }...` : str;
}

const CostRangeSchema = z.object({
  min: z.number().min(0),
  max: z.number().min(0),
});

const RawAIDesignSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  materialRationale: z.string().optional().default(''),
  layoutExplanation: z.string().optional().default(''),
  costBreakdown: z.object({
    cabinets: CostRangeSchema,
    countertops: CostRangeSchema,
    appliances: CostRangeSchema,
    installation: CostRangeSchema,
    total: CostRangeSchema,
  }),
  features: z.array(z.string()),
  materials: z.object({
    cabinets: z.string(),
    countertops: z.string(),
    backsplash: z.string(),
    flooring: z.string(),
  }),
  layout: z.string().optional().default('l-shaped'),
  style: z.string().optional().default('modern'),
  score: z.number().min(0).max(100).optional().default(75),
  tradeoffs: z.string().optional().default(''),
});

const RawAIDesignArraySchema = z.array(RawAIDesignSchema);

/**
 * Cost breakdown per category with min/max ranges
 */
export interface CostBreakdown {
  cabinets: { min: number; max: number };
  countertops: { min: number; max: number };
  appliances: { min: number; max: number };
  installation: { min: number; max: number };
  total: { min: number; max: number };
}

/**
 * A single AI-generated design concept
 */
export interface AIGeneratedDesign {
  id: string;
  name: string;
  description: string;
  materialRationale: string;
  layoutExplanation: string;
  costBreakdown: CostBreakdown;
  features: string[];
  materials: {
    cabinets: string;
    countertops: string;
    backsplash: string;
    flooring: string;
  };
  layout: string;
  style: string;
  score: number;
  tradeoffs: string;
  thumbnailUrl: string;
  fullImageUrl: string;
  createdAt: string;
  isAIGenerated: boolean;
  estimatedCost: { min: number; max: number; currency: string };
}

/**
 * Raw shape expected from Claude's JSON output (before we add ids/timestamps)
 */
interface RawAIDesign {
  name: string;
  description: string;
  materialRationale: string;
  layoutExplanation: string;
  costBreakdown: {
    cabinets: { min: number; max: number };
    countertops: { min: number; max: number };
    appliances: { min: number; max: number };
    installation: { min: number; max: number };
    total: { min: number; max: number };
  };
  features: string[];
  materials: {
    cabinets: string;
    countertops: string;
    backsplash: string;
    flooring: string;
  };
  layout: string;
  style: string;
  score: number;
  tradeoffs: string;
}

/**
 * Questionnaire data shape (JSON columns from Prisma)
 */
interface QuestionnaireData {
  userProfile?: Record<string, unknown>;
  spatialData?: Record<string, unknown>;
  cookingHabits?: Record<string, unknown>;
  budgetData?: Record<string, unknown>;
  aestheticPrefs?: Record<string, unknown>;
  socialUsage?: Record<string, unknown>;
  futureNeeds?: Record<string, unknown>;
  technologyPrefs?: Record<string, unknown>;
  environmentalPrefs?: Record<string, unknown>;
  maintenancePrefs?: Record<string, unknown>;
}

/**
 * Form preferences passed from the frontend
 */
interface FormPreferences {
  kitchenStyle?: string;
  colorPalette?: string[];
  layoutPreference?: string;
  applianceGrade?: string;
  storageEmphasis?: string;
  lightingMood?: string;
  includeIsland?: boolean;
  includeBreakfastNook?: boolean;
  includePantry?: boolean;
  sustainableOptions?: boolean;
  smartHomeIntegration?: boolean;
  additionalRequirements?: string;
}

/**
 * DesignGeneratorService
 *
 * Orchestrates Claude to generate personalized kitchen design concepts.
 * Falls back to algorithmic generation if the API call fails.
 */
export class DesignGeneratorService {
  private anthropic: AnthropicService;

  constructor() {
    this.anthropic = AnthropicService.getInstance();
  }

  /**
   * Generate N kitchen design concepts using Claude AI.
   *
   * @param preferences - Form preferences from the frontend
   * @param count - Number of designs to generate (1-5)
   * @param questionnaireData - Optional questionnaire responses for richer context
   * @returns Array of AI-generated designs
   */
  async generateDesigns(
    preferences: FormPreferences,
    count: number,
    questionnaireData?: QuestionnaireData | null,
  ): Promise<AIGeneratedDesign[]> {
    const prompt = this.buildPrompt(preferences, count, questionnaireData);

    logger.info('[DesignGenerator] Calling Claude for design generation', {
      count,
      style: preferences.kitchenStyle,
      hasQuestionnaire: !!questionnaireData,
    });

    const result = await this.anthropic.generateJSON<RawAIDesign[]>({
      system: SYSTEM_PROMPTS.DESIGN_GENERATOR,
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 8192,
      parse: (text: string) => {
        const parsed = JSON.parse(text);
        const rawDesigns = Array.isArray(parsed)
          ? parsed
          : parsed.designs || [parsed];

        // Validate structure with Zod schema
        const designs: RawAIDesign[] = RawAIDesignArraySchema.parse(rawDesigns);

        return designs;
      },
    });

    logger.info('[DesignGenerator] Claude returned designs successfully', {
      count: result.data.length,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    });

    // Transform raw designs into full AIGeneratedDesign objects
    const now = new Date().toISOString();
    return result.data.slice(0, count).map((raw) => ({
      id: crypto.randomUUID(),
      name: raw.name,
      description: raw.description,
      materialRationale: raw.materialRationale || '',
      layoutExplanation: raw.layoutExplanation || '',
      costBreakdown: raw.costBreakdown,
      features: raw.features,
      materials: {
        cabinets: raw.materials.cabinets || 'Melamine',
        countertops: raw.materials.countertops || 'Stratifie',
        backsplash: raw.materials.backsplash || 'Faience',
        flooring: raw.materials.flooring || 'Vinyle',
      },
      layout: raw.layout || preferences.layoutPreference || 'l-shaped',
      style: raw.style || preferences.kitchenStyle || 'modern',
      score: Math.max(0, Math.min(100, raw.score || 75)),
      tradeoffs: raw.tradeoffs || '',
      thumbnailUrl: '',
      fullImageUrl: '',
      createdAt: now,
      isAIGenerated: true,
      estimatedCost: {
        min: raw.costBreakdown.total.min,
        max: raw.costBreakdown.total.max,
        currency: 'EUR',
      },
    }));
  }

  /**
   * Build a detailed prompt combining form preferences and questionnaire data.
   */
  private buildPrompt(
    preferences: FormPreferences,
    count: number,
    questionnaireData?: QuestionnaireData | null,
  ): string {
    const sections: string[] = [];

    sections.push(
      `Genere exactement ${count} concepts de cuisine uniques en JSON.`,
    );
    sections.push('');

    // --- Form preferences ---
    sections.push('=== PREFERENCES DU FORMULAIRE ===');
    if (preferences.kitchenStyle) {
      sections.push(`- Style souhaite: ${preferences.kitchenStyle}`);
    }
    if (preferences.colorPalette?.length) {
      sections.push(
        `- Palette de couleurs: ${preferences.colorPalette.join(', ')}`,
      );
    }
    if (preferences.layoutPreference) {
      sections.push(`- Disposition preferee: ${preferences.layoutPreference}`);
    }
    if (preferences.applianceGrade) {
      sections.push(
        `- Gamme electromenager: ${preferences.applianceGrade}`,
      );
    }
    if (preferences.storageEmphasis) {
      sections.push(
        `- Importance rangement: ${preferences.storageEmphasis}`,
      );
    }
    if (preferences.lightingMood) {
      sections.push(`- Ambiance lumineuse: ${preferences.lightingMood}`);
    }

    const features: string[] = [];
    if (preferences.includeIsland) {features.push('ilot central');}
    if (preferences.includeBreakfastNook)
      {features.push('coin petit-dejeuner');}
    if (preferences.includePantry) {features.push('cellier/garde-manger');}
    if (preferences.sustainableOptions) {features.push('materiaux eco-responsables');}
    if (preferences.smartHomeIntegration) {features.push('domotique');}
    if (features.length > 0) {
      sections.push(`- Fonctionnalites souhaitees: ${features.join(', ')}`);
    }

    if (preferences.additionalRequirements) {
      sections.push(
        `- Exigences supplementaires: ${sanitizeInput(preferences.additionalRequirements)}`,
      );
    }

    // --- Questionnaire data (extract key fields to save tokens) ---
    if (questionnaireData) {
      sections.push('');
      sections.push('=== DONNEES DU QUESTIONNAIRE ===');

      if (questionnaireData.spatialData) {
        const spatial = questionnaireData.spatialData;
        sections.push(`- Dimensions piece: ${spatial.width || '?'}mm x ${spatial.depth || '?'}mm, hauteur ${spatial.height || '?'}mm`);
        if (spatial.shape) {sections.push(`- Forme: ${spatial.shape}`);}
      }
      if (questionnaireData.budgetData) {
        const budget = questionnaireData.budgetData;
        sections.push(`- Budget: ${budget.min || '?'} - ${budget.max || '?'} ${budget.currency || 'EUR'}`);
      }
      if (questionnaireData.cookingHabits) {
        const habits = questionnaireData.cookingHabits;
        if (habits.frequency) {sections.push(`- Frequence cuisine: ${habits.frequency}`);}
        if (habits.mealTypes) {sections.push(`- Types repas: ${habits.mealTypes}`);}
      }
      if (questionnaireData.aestheticPrefs) {
        sections.push(`- Preferences esthetiques: ${safeStringify(questionnaireData.aestheticPrefs, 300)}`);
      }
      // Keep other sections but with length limits
      for (const [key, value] of Object.entries(questionnaireData)) {
        if (!['spatialData', 'budgetData', 'cookingHabits', 'aestheticPrefs', 'userProfile'].includes(key) && value) {
          sections.push(`- ${key}: ${safeStringify(value, 200)}`);
        }
      }
    }

    // --- Output format ---
    sections.push('');
    sections.push('=== FORMAT DE SORTIE ===');
    sections.push(
      `Reponds avec un tableau JSON de ${count} objets. Chaque concept doit avoir une philosophie distincte (ex: budget-friendly, ergonomique, premium, ecologique, technologique).`,
    );
    sections.push('');
    sections.push('Chaque objet doit avoir EXACTEMENT cette structure:');
    sections.push(`{
  "name": "Nom du concept (en francais)",
  "description": "3-4 phrases expliquant POURQUOI ce design convient a l'utilisateur",
  "materialRationale": "Justification du choix des materiaux",
  "layoutExplanation": "Explication de la disposition choisie et du triangle de travail",
  "costBreakdown": {
    "cabinets": { "min": number, "max": number },
    "countertops": { "min": number, "max": number },
    "appliances": { "min": number, "max": number },
    "installation": { "min": number, "max": number },
    "total": { "min": number, "max": number }
  },
  "features": ["liste", "des", "fonctionnalites"],
  "materials": {
    "cabinets": "type de caisson",
    "countertops": "type de plan de travail",
    "backsplash": "type de credence",
    "flooring": "type de sol"
  },
  "layout": "l-shaped|u-shaped|galley|open|island|peninsula",
  "style": "modern|traditional|transitional|farmhouse|industrial|scandinavian|contemporary|mediterranean",
  "score": number (0-100, pertinence par rapport aux preferences),
  "tradeoffs": "Compromis et points d'attention de ce concept"
}`);
    sections.push('');
    sections.push(
      'Les prix doivent etre en euros, realistes pour le marche francais 2024-2026.',
    );
    sections.push(
      'Le score doit refleter la pertinence du concept par rapport aux preferences exprimees.',
    );
    sections.push(
      'Chaque concept doit etre UNIQUE dans sa philosophie et son approche.',
    );
    sections.push('Reponds UNIQUEMENT avec le JSON, sans texte avant ou apres.');

    return sections.join('\n');
  }
}

export default DesignGeneratorService;
