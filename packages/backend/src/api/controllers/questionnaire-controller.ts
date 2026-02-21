import { Request, Response } from 'express';
import { QuestionnaireRepository } from '../../repositories/questionnaire-repository';
import { asyncHandler } from '../middleware/error-middleware';
import { prisma } from '../../database/client';
import { QuestionnaireAdvisorService } from '../../services/ai/questionnaire-advisor.service';
import { AutoDesignPipelineService } from '../../services/ai/auto-design-pipeline.service';
import logger from '../../utils/logger';

const questionnaireRepository = new QuestionnaireRepository(prisma);
const advisorService = new QuestionnaireAdvisorService();
const autoDesignPipeline = new AutoDesignPipelineService();

/**
 * Questionnaire Controller
 * Handles GET/POST for each questionnaire section + progress endpoint
 */
export class QuestionnaireController {
  /**
   * GET /questionnaire/:section
   * Retrieve saved data for a specific section
   */
  getSection = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    const section = req.params['section'];

    if (!userId || !section) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const questionnaire = await questionnaireRepository.findForUser(userId);

    if (!questionnaire) {
      // No questionnaire yet — return empty (frontend will use defaults)
      res.status(200).json({ success: true, data: null });
      return;
    }

    const sectionData = questionnaireRepository.getSectionData(questionnaire, section);
    res.status(200).json({ success: true, data: sectionData });
  });

  /**
   * POST /questionnaire/:section
   * Save data for a specific section
   */
  saveSection = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    const section = req.params['section'];

    if (!userId || !section) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const questionnaire = await questionnaireRepository.saveSection(userId, section, req.body);

    const sectionData = questionnaireRepository.getSectionData(questionnaire, section);
    res.status(200).json({
      success: true,
      data: sectionData,
      message: `Section "${section}" saved successfully`,
    });
  });

  /**
   * GET /questionnaire/progress
   * Get questionnaire completion progress
   */
  getProgress = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const progress = await questionnaireRepository.getProgress(userId);
    res.status(200).json({ success: true, data: progress });
  });

  /**
   * POST /questionnaire/:section/ai-tips
   * Get AI-powered tips for a questionnaire section
   */
  getAITips = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    const section = req.params['section'];

    if (!userId || !section) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const sectionData = req.body as Record<string, unknown>;

    // Load previous sections from DB
    const questionnaire = await questionnaireRepository.findForUser(userId);
    const previousSections: Record<string, Record<string, unknown>> = {};

    if (questionnaire) {
      const sectionFieldMap: Record<string, string> = {
        'user-profile': 'userProfile',
        'spatial-constraints': 'spatialData',
        'style-preferences': 'aestheticPrefs',
        'budget-planning': 'budgetData',
      };

      for (const [sectionName, fieldName] of Object.entries(sectionFieldMap)) {
        if (sectionName !== section) {
          const data = (questionnaire as Record<string, unknown>)[fieldName];
          if (data && typeof data === 'object') {
            previousSections[sectionName] = data as Record<string, unknown>;
          }
        }
      }
    }

    const analysis = await advisorService.analyzeSectionResponse({
      section,
      sectionData,
      previousSections,
      userId,
    });

    res.status(200).json({ success: true, data: analysis });
  });

  /**
   * GET /questionnaire/auto-bridge
   * Generate auto-bridge preferences from questionnaire data
   */
  getAutoBridgeData = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const questionnaire = await questionnaireRepository.findForUser(userId);

    if (!questionnaire) {
      res.status(404).json({ success: false, error: 'No questionnaire data found' });
      return;
    }

    // Assemble all questionnaire data
    const questionnaireData: Record<string, unknown> = {
      'user-profile': (questionnaire as Record<string, unknown>).userProfile,
      'spatial-constraints': (questionnaire as Record<string, unknown>).spatialData,
      'style-preferences': (questionnaire as Record<string, unknown>).aestheticPrefs,
      'budget-planning': (questionnaire as Record<string, unknown>).budgetData,
    };

    const preferences = await advisorService.generateAutoBridgePreferences(
      questionnaireData,
      userId,
    );

    res.status(200).json({ success: true, data: preferences });
  });

  /**
   * POST /questionnaire/auto-generate
   * Generate 3 kitchen designs (budget/confort/premium) from questionnaire data
   */
  autoGenerate = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    // Load the user's questionnaire from DB
    const questionnaire = await questionnaireRepository.findForUser(userId);

    if (!questionnaire) {
      res.status(404).json({
        success: false,
        error: 'No questionnaire data found. Please complete the questionnaire first.',
      });
      return;
    }

    // Assemble questionnaire data from all sections
    const questionnaireRecord = questionnaire as Record<string, unknown>;
    const questionnaireData = {
      userProfile: (questionnaireRecord.userProfile as Record<string, unknown>) ?? undefined,
      spatialData: (questionnaireRecord.spatialData as Record<string, unknown>) ?? undefined,
      aestheticPrefs: (questionnaireRecord.aestheticPrefs as Record<string, unknown>) ?? undefined,
      budgetData: (questionnaireRecord.budgetData as Record<string, unknown>) ?? undefined,
    };

    // Verify at least budget data exists (minimum requirement)
    if (!questionnaireData.budgetData) {
      res.status(400).json({
        success: false,
        error: 'Budget data is required. Please complete the budget section first.',
      });
      return;
    }

    logger.info('[QuestionnaireController] Starting auto-generate', {
      userId,
      hasProfile: !!questionnaireData.userProfile,
      hasSpatial: !!questionnaireData.spatialData,
      hasAesthetic: !!questionnaireData.aestheticPrefs,
      hasBudget: !!questionnaireData.budgetData,
    });

    const result = await autoDesignPipeline.generateFromQuestionnaire(
      userId,
      questionnaireData,
    );

    res.status(200).json({
      success: true,
      data: {
        designs: result.designs,
        generationId: result.generationId,
      },
    });
  });
}

export const questionnaireController = new QuestionnaireController();
export default questionnaireController;
