import { z } from 'zod';

import { AnthropicService } from './anthropic.service';
import { SYSTEM_PROMPTS } from './prompt-templates';
import logger from '../../utils/logger';

/** Sanitize user-provided text before including in prompts */
function sanitizeQuestionnaireText(obj: unknown, maxLen = 2000): string {
  const str = JSON.stringify(obj, null, 2);
  const sanitized = str
    .replace(/[<>]/g, '') // Strip angle brackets to prevent injection
    .slice(0, maxLen);
  return sanitized;
}

/** Zod schema for SectionAnalysis AI output */
const sectionAnalysisSchema = z.object({
  tips: z.array(z.string().max(500)).max(5).default([]),
  warnings: z.array(z.string().max(500)).max(5).default([]),
  suggestions: z.array(z.string().max(500)).max(5).default([]),
  budgetReality: z
    .object({
      isRealistic: z.boolean(),
      explanation: z.string().max(1000),
      suggestedRange: z.object({
        min: z.number().nonnegative(),
        max: z.number().nonnegative(),
      }),
    })
    .optional(),
});

type SectionAnalysis = z.infer<typeof sectionAnalysisSchema>;

/** Zod schema for AutoBridgePreferences AI output */
const autoBridgeSchema = z.object({
  kitchenStyle: z.enum([
    'modern',
    'traditional',
    'transitional',
    'farmhouse',
    'industrial',
    'scandinavian',
    'contemporary',
    'mediterranean',
  ]),
  colorPalette: z.array(z.string().max(50)).min(1).max(10),
  layoutPreference: z.enum(['galley', 'l-shaped', 'u-shaped', 'open']),
  applianceGrade: z.enum(['standard', 'premium', 'professional']),
  storageEmphasis: z.enum(['minimal', 'moderate', 'maximum']),
  lightingMood: z.enum(['bright', 'warm', 'dramatic', 'natural']),
  includeIsland: z.boolean(),
  includePantry: z.boolean(),
  sustainableOptions: z.boolean(),
});

type AutoBridgePreferences = z.infer<typeof autoBridgeSchema>;

export class QuestionnaireAdvisorService {
  private anthropic: AnthropicService;

  constructor() {
    this.anthropic = AnthropicService.getInstance();
  }

  async analyzeSectionResponse(options: {
    section: string;
    sectionData: Record<string, unknown>;
    previousSections: Record<string, Record<string, unknown>>;
    userId: string;
  }): Promise<SectionAnalysis> {
    const sanitizedSection = sanitizeQuestionnaireText(options.sectionData, 1500);
    const sanitizedPrevious =
      Object.keys(options.previousSections).length > 0
        ? sanitizeQuestionnaireText(options.previousSections, 3000)
        : null;

    const prompt = `Analyse ces reponses au questionnaire de conception de cuisine.

Section actuelle: ${options.section}
Donnees de la section:
${sanitizedSection}

${sanitizedPrevious ? `Sections precedentes:\n${sanitizedPrevious}` : 'Aucune section precedente remplie.'}

Reponds UNIQUEMENT avec un JSON valide:
{
  "tips": ["conseil pratique 1", "conseil pratique 2"],
  "warnings": ["avertissement si incoherence"],
  "suggestions": ["suggestion pour la suite"]
  ${options.section === 'budget-planning' ? ',"budgetReality": {"isRealistic": true/false, "explanation": "...", "suggestedRange": {"min": 0, "max": 0}}' : ''}
}

Regles:
- 2-3 tips maximum, courts et actionables
- Warnings seulement si vraie incoherence (ex: piece 2x2m + layout en U, style industriel + materiaux luxe)
- Pour le budget: compare avec les prix du marche francais (cuisine basique 5000-8000EUR, milieu de gamme 8000-15000EUR, haut de gamme 15000-30000EUR+)
- Tout en francais`;

    try {
      const result = await this.anthropic.generateJSON<SectionAnalysis>({
        system: SYSTEM_PROMPTS.QUESTIONNAIRE_ADVISOR,
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 1024,
        parse: (text: string) => {
          const parsed = JSON.parse(text);
          return sectionAnalysisSchema.parse(parsed);
        },
      });
      return result.data;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.error('[AI:questionnaire] Analysis failed', {
        error: errMsg,
        userId: options.userId,
        section: options.section,
      });
      return {
        tips: ["Une erreur est survenue lors de l'analyse. Vos donnees ont bien ete enregistrees."],
        warnings: [],
        suggestions: ['Vous pouvez continuer vers la section suivante.'],
      };
    }
  }

  async generateAutoBridgePreferences(
    questionnaireData: Record<string, unknown>,
    userId: string
  ): Promise<AutoBridgePreferences> {
    const sanitizedData = sanitizeQuestionnaireText(questionnaireData, 3000);

    const prompt = `A partir de ces reponses au questionnaire de cuisine, genere les preferences pour le generateur de designs.

Donnees questionnaire:
${sanitizedData}

Reponds UNIQUEMENT avec un JSON valide:
{
  "kitchenStyle": "modern|traditional|transitional|farmhouse|industrial|scandinavian|contemporary|mediterranean",
  "colorPalette": ["couleur1", "couleur2"],
  "layoutPreference": "galley|l-shaped|u-shaped|open",
  "applianceGrade": "standard|premium|professional",
  "storageEmphasis": "minimal|moderate|maximum",
  "lightingMood": "bright|warm|dramatic|natural",
  "includeIsland": false,
  "includePantry": false,
  "sustainableOptions": false
}

Deduis les preferences a partir des donnees:
- Style: depuis style-preferences.primaryStyle
- Couleurs: depuis style-preferences.colorScheme
- Layout: depuis spatial-constraints.layoutType
- Grade: depuis budget-planning (budget eleve = professional, moyen = premium, bas = standard)
- Stockage: depuis les priorites du budget
- Si la piece fait plus de 12m2 et le layout est open/island, includeIsland = true`;

    try {
      const result = await this.anthropic.generateJSON<AutoBridgePreferences>({
        system: SYSTEM_PROMPTS.QUESTIONNAIRE_ADVISOR,
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 512,
        parse: (text: string) => {
          const parsed = JSON.parse(text);
          return autoBridgeSchema.parse(parsed);
        },
      });
      return result.data;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.error('[AI:questionnaire] Auto-bridge failed', { error: errMsg, userId });
      // Fallback defaults
      return {
        kitchenStyle: 'modern',
        colorPalette: ['white', 'gray'],
        layoutPreference: 'l-shaped',
        applianceGrade: 'standard',
        storageEmphasis: 'moderate',
        lightingMood: 'bright',
        includeIsland: false,
        includePantry: false,
        sustainableOptions: false,
      };
    }
  }
}

export default QuestionnaireAdvisorService;
