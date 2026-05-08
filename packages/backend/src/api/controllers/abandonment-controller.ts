import { type Request, type Response } from 'express';

import { AbandonmentDetectorService } from '../../services/analytics/abandonment-detector.service';
import logger from '../../utils/logger';
import { asyncHandler } from '../middleware/error-middleware';

/**
 * AbandonmentController
 *
 * Exposes session analysis and abandonment analytics endpoints,
 * delegating to the AbandonmentDetectorService.
 */
export class AbandonmentController {
  private detectorService: AbandonmentDetectorService;

  constructor() {
    this.detectorService = new AbandonmentDetectorService();
  }

  /**
   * POST /abandonment/analyze
   * Analyze a design session for abandonment risk.
   * Body: { sessionData }
   */
  analyzeSession = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const { sessionData } = req.body;
    if (!sessionData || !Array.isArray(sessionData.events)) {
      res.status(400).json({ success: false, error: 'sessionData with events array is required' });
      return;
    }

    logger.info('[Abandonment] Analyzing session', {
      userId,
      eventCount: sessionData.events.length,
    });

    const risk = this.detectorService.analyzeSession(sessionData.events);
    const intervention = this.detectorService.getIntervention(risk);

    res.status(200).json({
      success: true,
      data: {
        risk,
        intervention: risk.suggestedIntervention !== 'none' ? intervention : null,
      },
    });
  });

  /**
   * GET /abandonment/stats
   * Get abandonment analytics (admin only).
   * Returns aggregated statistics about abandonment patterns.
   */
  getStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    logger.info('[Abandonment] Retrieving abandonment stats', { userId });

    // Return aggregated statistics
    // In production, these would come from a database aggregation
    const stats = {
      totalSessionsAnalyzed: 0,
      averageRiskScore: 0,
      riskDistribution: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      },
      topRiskFactors: [],
      interventionsSent: 0,
      interventionConversionRate: 0,
    };

    res.status(200).json({ success: true, data: stats });
  });
}

export const abandonmentController = new AbandonmentController();
export default abandonmentController;
