import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/error-middleware';
import { prisma } from '../../database/client';
import { WorkflowSimulationService } from '../../services/ai/workflow-simulation.service';
import logger from '../../utils/logger';

/**
 * WorkflowSimulationController
 *
 * Handles cooking workflow simulation endpoints.
 * Verifies kitchen ownership before running simulations.
 */
export class WorkflowSimulationController {
  private service: WorkflowSimulationService;

  constructor() {
    this.service = WorkflowSimulationService.getInstance();
  }

  /**
   * POST /workflow-simulation/simulate
   * Run a cooking workflow simulation for a kitchen.
   * Body: { kitchenId: string, scenario: string }
   */
  simulate = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const { kitchenId, scenario } = req.body;

    // Verify the kitchen exists and the user owns it
    const kitchen = await prisma.kitchen.findUnique({
      where: { id: kitchenId },
    });

    if (!kitchen) {
      res.status(404).json({ success: false, error: 'Kitchen not found' });
      return;
    }

    if (kitchen.userId !== userId && req.user?.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    try {
      const result = await this.service.simulate(kitchenId, userId, scenario);

      logger.info('[WorkflowSimulation] Simulation completed via API', {
        simulationId: result.id,
        kitchenId,
        scenario,
        totalDistanceM: result.totalDistanceM,
        efficiencyScore: result.efficiencyScore,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      logger.error('[WorkflowSimulation] Simulation failed', {
        error: err instanceof Error ? err.message : String(err),
        kitchenId,
        scenario,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to run workflow simulation',
      });
    }
  });

  /**
   * GET /workflow-simulation/scenarios
   * List all available cooking scenarios.
   */
  getScenarios = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const scenarios = this.service.getScenarios();

    res.status(200).json({
      success: true,
      data: scenarios,
    });
  });

  /**
   * POST /workflow-simulation/optimize
   * Get AI optimization suggestions for an existing simulation.
   * Body: { simulationId: string }
   */
  optimize = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const { simulationId } = req.body;

    // Verify the simulation exists and user owns it
    const simulation = await prisma.workflowSimulation.findUnique({
      where: { id: simulationId },
    });

    if (!simulation) {
      res.status(404).json({ success: false, error: 'Simulation not found' });
      return;
    }

    if (simulation.userId !== userId && req.user?.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    try {
      const result = await this.service.optimize(simulationId, userId);

      logger.info('[WorkflowSimulation] Optimization completed via API', {
        simulationId,
        suggestionCount: result.suggestions.length,
        percentImprovement: result.percentImprovement,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      logger.error('[WorkflowSimulation] Optimization failed', {
        error: err instanceof Error ? err.message : String(err),
        simulationId,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to generate optimization suggestions',
      });
    }
  });

  /**
   * GET /workflow-simulation/history/:kitchenId
   * Get previous simulations for a kitchen.
   */
  getHistory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const { kitchenId } = req.params;

    // Verify the kitchen exists and the user owns it
    const kitchen = await prisma.kitchen.findUnique({
      where: { id: kitchenId },
    });

    if (!kitchen) {
      res.status(404).json({ success: false, error: 'Kitchen not found' });
      return;
    }

    if (kitchen.userId !== userId && req.user?.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    try {
      const history = await this.service.getHistory(kitchenId!);

      res.status(200).json({
        success: true,
        data: history,
      });
    } catch (err) {
      logger.error('[WorkflowSimulation] History fetch failed', {
        error: err instanceof Error ? err.message : String(err),
        kitchenId,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to fetch simulation history',
      });
    }
  });
}

export const workflowSimulationController = new WorkflowSimulationController();
export default workflowSimulationController;
