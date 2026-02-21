import { AnthropicService } from './anthropic.service';
import { SYSTEM_PROMPTS } from './prompt-templates';
import { prisma } from '../../database/client';
import logger from '../../utils/logger';

export class AdminInsightsService {
  private anthropic: AnthropicService;

  constructor() {
    this.anthropic = AnthropicService.getInstance();
  }

  async generateDashboardSummary(userId: string): Promise<string> {
    // Gather stats
    const [userCount, projectCount, kitchenCount, recentUsers] = await Promise.all([
      prisma.user.count(),
      prisma.project.count(),
      prisma.kitchen.count({ where: { deletedAt: null } }),
      prisma.user.count({
        where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      }),
    ]);

    const prompt = `Genere un resume executif court (3-4 phrases) du dashboard admin d'une plateforme de design de cuisine.

Statistiques:
- Utilisateurs totaux: ${userCount}
- Nouveaux utilisateurs (7 derniers jours): ${recentUsers}
- Projets: ${projectCount}
- Cuisines creees: ${kitchenCount}

Reponds avec juste le texte du resume (pas de JSON).
Sois factuel, mentionne les tendances, et suggere une action si pertinent.`;

    try {
      const result = await this.anthropic.generateText({
        system: SYSTEM_PROMPTS.ADMIN_INSIGHTS,
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 256,
      });
      return result.text.trim();
    } catch (error) {
      logger.error('[AI:admin] Dashboard summary failed', { error, userId });
      return '';
    }
  }
}

export default AdminInsightsService;
