import { PrismaClient, QuestionnaireResponse } from '@prisma/client';

/**
 * Maps frontend section names to Prisma model fields
 */
const SECTION_FIELD_MAP: Record<string, string> = {
  'user-profile': 'userProfile',
  'spatial-constraints': 'spatialData',
  'style-preferences': 'aestheticPrefs',
  'budget-planning': 'budgetData',
};

const SECTION_ORDER = ['user-profile', 'spatial-constraints', 'style-preferences', 'budget-planning'];

export class QuestionnaireRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Find the questionnaire response linked to a user's latest project.
   * If no questionnaire exists, returns null.
   */
  async findForUser(userId: string): Promise<QuestionnaireResponse | null> {
    return this.prisma.questionnaireResponse.findFirst({
      where: { project: { userId, deletedAt: null } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Get or create a questionnaire response for the user.
   * Finds the latest project, or creates a draft project if none exists.
   */
  async getOrCreateForUser(userId: string): Promise<QuestionnaireResponse> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Check if a questionnaire already exists for any of the user's projects
        const existing = await tx.questionnaireResponse.findFirst({
          where: { project: { userId, deletedAt: null } },
          orderBy: { updatedAt: 'desc' },
        });
        if (existing) return existing;

        // Find the user's latest project
        let project = await tx.project.findFirst({
          where: { userId, deletedAt: null },
          orderBy: { updatedAt: 'desc' },
        });

        // Create a draft project if none exists
        if (!project) {
          project = await tx.project.create({
            data: {
              userId,
              name: 'Mon projet de cuisine',
            },
          });
        }

        // Check if this project already has a questionnaire (unique constraint)
        const projectQuestionnaire = await tx.questionnaireResponse.findUnique({
          where: { projectId: project.id },
        });
        if (projectQuestionnaire) return projectQuestionnaire;

        // Create a new questionnaire response
        return tx.questionnaireResponse.create({
          data: { projectId: project.id },
        });
      });
    } catch (error) {
      // If duplicate key error from race condition, just fetch the existing one
      const existing = await this.findForUser(userId);
      if (existing) return existing;
      throw error;
    }
  }

  /**
   * Get a specific section's data from the questionnaire
   */
  getSectionData(questionnaire: QuestionnaireResponse, section: string): unknown {
    const field = SECTION_FIELD_MAP[section];
    if (!field) return null;
    return (questionnaire as Record<string, unknown>)[field] ?? null;
  }

  /**
   * Save data for a specific section.
   * Creates the questionnaire if it doesn't exist.
   */
  async saveSection(
    userId: string,
    section: string,
    data: unknown,
  ): Promise<QuestionnaireResponse> {
    const field = SECTION_FIELD_MAP[section];
    if (!field) {
      throw new Error(`Invalid questionnaire section: ${section}`);
    }

    const questionnaire = await this.getOrCreateForUser(userId);

    // Update completedSections (avoid duplicates)
    const completedSections = questionnaire.completedSections.includes(section)
      ? questionnaire.completedSections
      : [...questionnaire.completedSections, section];

    // Determine next section
    const currentIndex = SECTION_ORDER.indexOf(section);
    const nextSection = currentIndex < SECTION_ORDER.length - 1
      ? SECTION_ORDER[currentIndex + 1]
      : null;

    // Check if all sections are now completed
    const allCompleted = SECTION_ORDER.every(s => completedSections.includes(s));

    return this.prisma.questionnaireResponse.update({
      where: { id: questionnaire.id },
      data: {
        [field]: data as any,
        completedSections,
        currentSection: nextSection,
        completedAt: allCompleted ? new Date() : undefined,
      },
    });
  }

  /**
   * Get progress information for the user's questionnaire
   */
  async getProgress(userId: string): Promise<{
    completedSections: string[];
    totalSections: number;
    currentSection: string | null;
    isComplete: boolean;
    percentage: number;
  }> {
    const questionnaire = await this.findForUser(userId);

    if (!questionnaire) {
      return {
        completedSections: [],
        totalSections: SECTION_ORDER.length,
        currentSection: SECTION_ORDER[0] ?? null,
        isComplete: false,
        percentage: 0,
      };
    }

    return {
      completedSections: questionnaire.completedSections,
      totalSections: SECTION_ORDER.length,
      currentSection: questionnaire.currentSection,
      isComplete: questionnaire.completedAt !== null,
      percentage: Math.round(
        (questionnaire.completedSections.length / SECTION_ORDER.length) * 100,
      ),
    };
  }
}
