import { z } from 'zod';
import { AnthropicService } from './anthropic.service';
import { SYSTEM_PROMPTS } from './prompt-templates';
import logger from '../../utils/logger';

/** Sanitize user input to prevent prompt injection */
function sanitizeInput(input: string | undefined | null): string {
  if (!input) return '';
  return input
    .replace(/[<>{}[\]]/g, '')
    .replace(/\n/g, ' ')
    .slice(0, 500);
}

const CompareDesignsResponseSchema = z.object({
  comparison: z.string(),
  recommendation: z.string(),
  tradeoffs: z.string(),
});

const ProgressRecommendationsResponseSchema = z.object({
  completionPercentage: z.number().min(0).max(100),
  nextSteps: z.array(z.string()),
  tips: z.array(z.string()),
});

export class ProjectAssistantService {
  private anthropic: AnthropicService;

  constructor() {
    this.anthropic = AnthropicService.getInstance();
  }

  async generateProjectDescription(options: {
    projectName: string;
    questionnaireData?: Record<string, unknown>;
    userId: string;
  }): Promise<string> {
    const safeName = sanitizeInput(options.projectName);
    const safeQuestionnaire = options.questionnaireData
      ? sanitizeInput(JSON.stringify(options.questionnaireData))
      : '';

    const prompt = `Genere une description de projet de cuisine en 2-3 phrases, professionnelle et motivante.

Nom du projet: "${safeName}"
${safeQuestionnaire ? `Donnees questionnaire: ${safeQuestionnaire}` : 'Aucun questionnaire rempli.'}

Reponds avec juste le texte de la description (pas de JSON, pas de guillemets).`;

    try {
      const result = await this.anthropic.generateText({
        system: SYSTEM_PROMPTS.PROJECT_ASSISTANT,
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 256,
      });
      return result.text.trim();
    } catch (error) {
      logger.error('[AI:project] Description generation failed', { error, userId: options.userId });
      return '';
    }
  }

  async compareDesigns(options: {
    designs: Array<{
      name: string;
      style: string;
      estimatedCost: { min: number; max: number };
      features: string[];
      score: number;
      materials: Record<string, string>;
    }>;
    userId: string;
  }): Promise<{ comparison: string; recommendation: string; tradeoffs: string }> {
    const prompt = `Compare ces ${options.designs.length} designs de cuisine et fais une recommandation.

Designs:
${options.designs
  .map(
    (d, i) =>
      `${i + 1}. "${sanitizeInput(d.name)}" - Style: ${sanitizeInput(d.style)}, Budget: ${d.estimatedCost.min}-${d.estimatedCost.max}EUR, Score: ${d.score}/100, Features: ${d.features.map(f => sanitizeInput(f)).join(', ')}`
  )
  .join('\n')}

Reponds UNIQUEMENT avec un JSON valide:
{
  "comparison": "Resume comparatif en 3-4 phrases",
  "recommendation": "Le design recommande et pourquoi (2 phrases)",
  "tradeoffs": "Ce que chaque design sacrifie vs les autres (2-3 phrases)"
}`;

    try {
      const result = await this.anthropic.generateJSON<{
        comparison: string;
        recommendation: string;
        tradeoffs: string;
      }>({
        system: SYSTEM_PROMPTS.PROJECT_ASSISTANT,
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 512,
        parse: (text: string) => {
          const parsed = JSON.parse(text);
          const validated = CompareDesignsResponseSchema.parse(parsed);
          return validated;
        },
      });
      return result.data;
    } catch (error) {
      logger.error('[AI:project] Comparison failed', { error, userId: options.userId });
      return { comparison: '', recommendation: '', tradeoffs: '' };
    }
  }

  async getProgressRecommendations(options: {
    project: {
      name: string;
      status: string;
      kitchens: Array<{ name: string; style?: string; score?: number | null }>;
      createdAt: string;
    };
    hasQuestionnaire: boolean;
    hasDesigns: boolean;
    userId: string;
  }): Promise<{ completionPercentage: number; nextSteps: string[]; tips: string[] }> {
    const safeName = sanitizeInput(options.project.name);
    const safeStatus = sanitizeInput(options.project.status);

    const prompt = `Analyse l'avancement de ce projet de cuisine et recommande les prochaines etapes.

Projet: "${safeName}" (statut: ${safeStatus})
Cree le: ${options.project.createdAt}
Cuisines: ${
      options.project.kitchens.length > 0
        ? options.project.kitchens
            .map((k) => `${sanitizeInput(k.name)} (style: ${sanitizeInput(k.style) || 'non defini'}, score: ${k.score ?? 'non evalue'})`)
            .join(', ')
        : 'aucune'
    }
Questionnaire rempli: ${options.hasQuestionnaire ? 'oui' : 'non'}
Designs generes: ${options.hasDesigns ? 'oui' : 'non'}

Reponds UNIQUEMENT avec un JSON valide:
{
  "completionPercentage": 0-100,
  "nextSteps": ["etape suivante 1", "etape suivante 2"],
  "tips": ["conseil 1"]
}`;

    try {
      const result = await this.anthropic.generateJSON<{
        completionPercentage: number;
        nextSteps: string[];
        tips: string[];
      }>({
        system: SYSTEM_PROMPTS.PROJECT_ASSISTANT,
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 512,
        parse: (text: string) => {
          const parsed = JSON.parse(text);
          const validated = ProgressRecommendationsResponseSchema.parse(parsed);
          return validated;
        },
      });
      return result.data;
    } catch (error) {
      logger.error('[AI:project] Recommendations failed', { error, userId: options.userId });
      return { completionPercentage: 0, nextSteps: [], tips: [] };
    }
  }
}

export default ProjectAssistantService;
