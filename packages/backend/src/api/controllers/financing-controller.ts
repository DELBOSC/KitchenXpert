import { type Request, type Response } from 'express';

import { financingService } from '../../services/financing/financing.service';
import _logger from '../../utils/logger';
import { asyncHandler } from '../middleware/error-middleware';

/**
 * Financing Controller
 * Handles budget planning, financing simulation, eco aids, and AI advice
 */
export class FinancingController {
  /**
   * POST /financing/simulate
   * Run a financing simulation across all providers and durations
   */
  simulate = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const { totalAmount, downPayment, kitchenId, projectId } = req.body;

    const result = await financingService.simulate(userId, {
      totalAmount,
      downPayment,
      kitchenId,
      projectId,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  });

  /**
   * POST /financing/eco-aids
   * Calculate available eco aids (MaPrimeRenov, CEE, TVA reduite, eco-PTZ)
   */
  calculateEcoAids = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const { totalAmount, incomeBracket, householdSize, equipmentTypes, isRenovation, buildingAge } = req.body;

    const result = await financingService.calculateEcoAids({
      totalAmount,
      incomeBracket,
      householdSize,
      equipmentTypes,
      isRenovation,
      buildingAge,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  });

  /**
   * GET /financing/providers
   * List all financing providers with their rates
   */
  getProviders = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const providers = financingService.getProviders();

    res.status(200).json({
      success: true,
      data: providers,
    });
  });

  /**
   * GET /financing/my-simulations
   * Get the authenticated user's simulation history
   */
  getMySimulations = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const simulations = await financingService.getMySimulations(userId);

    res.status(200).json({
      success: true,
      data: simulations,
    });
  });

  /**
   * GET /financing/:id
   * Get a specific simulation detail (with ownership check)
   */
  getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const isAdmin = req.user?.role === 'admin';
    const simulation = await financingService.getSimulationById(userId, id!, isAdmin);

    if (!simulation) {
      res.status(404).json({ success: false, error: 'Simulation not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: simulation,
    });
  });

  /**
   * POST /financing/ai-advice
   * Get AI-powered budget allocation recommendations
   */
  getAIAdvice = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const { totalBudget, categories, style, roomSizeM2, isRenovation } = req.body;

    const advice = await financingService.getAIBudgetAdvice(userId, {
      totalBudget,
      categories: categories || [],
      style,
      roomSizeM2,
      isRenovation,
    });

    res.status(200).json({
      success: true,
      data: advice,
    });
  });
}

export const financingController = new FinancingController();
export default financingController;
