/**
 * Workflow Simulation Service Tests
 *
 * Tests for cooking workflow simulation and optimization:
 * - getScenarios (return available cooking scenarios)
 * - simulate (mock Claude AI for step generation)
 * - getHistory (retrieve past simulations from DB)
 * - optimize (mock Claude AI for layout optimization suggestions)
 */

// ---------------------------------------------------------------------------
// Mock prisma client
// ---------------------------------------------------------------------------
const mockPrisma = {
  kitchen: {
    findUnique: jest.fn(),
  },
  kitchenItem: {
    findMany: jest.fn(),
  },
  workflowSimulation: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  aIUsageLog: {
    create: jest.fn(),
  },
};

jest.mock('../database/client', () => ({
  prisma: mockPrisma,
}));

// ---------------------------------------------------------------------------
// Mock AnthropicService
// ---------------------------------------------------------------------------
const mockGenerateJSON = jest.fn();
const mockLogUsage = jest.fn();

jest.mock('../services/ai/anthropic.service', () => ({
  AnthropicService: {
    getInstance: jest.fn(() => ({
      generateJSON: mockGenerateJSON,
      logUsage: mockLogUsage,
    })),
  },
}));

// ---------------------------------------------------------------------------
// Mock prompt templates
// ---------------------------------------------------------------------------
jest.mock('../services/ai/prompt-templates', () => ({
  SYSTEM_PROMPTS: {
    WORKFLOW_SIMULATOR: 'You are a workflow simulator.',
  },
}));

// ---------------------------------------------------------------------------
// Mock logger
// ---------------------------------------------------------------------------
jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import { WorkflowSimulationService } from '../services/ai/workflow-simulation.service';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const testUserId = 'test-user-id';
const kitchenId = 'kitchen-1';

const mockKitchen = {
  id: kitchenId,
  name: 'Ma cuisine',
  style: 'modern',
  layout: 'L-shape',
  width: 4,
  length: 3,
  height: 2.7,
};

const mockKitchenItems = [
  { id: 'item-1', kitchenId, type: 'refrigerator', name: 'Frigo', positionX: 0.3, positionY: 0, positionZ: 1.5 },
  { id: 'item-2', kitchenId, type: 'sink', name: 'Evier', positionX: 1.3, positionY: 0, positionZ: 0.3 },
  { id: 'item-3', kitchenId, type: 'cooktop', name: 'Plaque', positionX: 2.7, positionY: 0, positionZ: 0.3 },
  { id: 'item-4', kitchenId, type: 'oven', name: 'Four', positionX: 3.2, positionY: 0, positionZ: 0.3 },
  { id: 'item-5', kitchenId, type: 'base_cabinet', name: 'Meuble bas', positionX: 2, positionY: 0, positionZ: 0.3 },
];

const mockAISimulationResponse = {
  steps: [
    { stepNumber: 1, action: 'Sortir les legumes du frigo', fromZone: 'fridge', toZone: 'countertop', timeSeconds: 15 },
    { stepNumber: 2, action: 'Laver les legumes', fromZone: 'countertop', toZone: 'sink', timeSeconds: 60 },
    { stepNumber: 3, action: 'Couper les legumes', fromZone: 'sink', toZone: 'countertop', timeSeconds: 120 },
    { stepNumber: 4, action: 'Faire revenir dans la poele', fromZone: 'countertop', toZone: 'hob', timeSeconds: 300 },
    { stepNumber: 5, action: 'Enfourner le plat', fromZone: 'hob', toZone: 'oven', timeSeconds: 30 },
    { stepNumber: 6, action: 'Ranger les ustensiles', fromZone: 'oven', toZone: 'storage', timeSeconds: 45 },
    { stepNumber: 7, action: 'Nettoyer le plan de travail', fromZone: 'storage', toZone: 'countertop', timeSeconds: 60 },
    { stepNumber: 8, action: 'Laver la vaisselle', fromZone: 'countertop', toZone: 'sink', timeSeconds: 120 },
  ],
  bottlenecks: [
    {
      description: 'Le frigo est eloigne du plan de travail',
      zone: 'fridge',
      suggestion: 'Rapprocher le frigo du plan de travail',
    },
  ],
};

const mockAIOptimizationResponse = {
  suggestions: [
    {
      item: 'Frigo',
      currentZone: 'fridge',
      suggestedZone: 'countertop',
      distanceSaved: 1.5,
      percentImprovement: 12,
      description: 'Rapprocher le frigo du plan de travail',
    },
    {
      item: 'Four',
      currentZone: 'oven',
      suggestedZone: 'hob',
      distanceSaved: 0.5,
      percentImprovement: 5,
      description: 'Rapprocher le four de la plaque de cuisson',
    },
  ],
};

const mockSimulationRecord = {
  id: 'sim-1',
  kitchenId,
  userId: testUserId,
  scenario: 'quick_breakfast',
  steps: mockAISimulationResponse.steps.map((s, i) => ({
    ...s,
    distanceM: 1.0 + i * 0.5,
    position3D: {
      from: { x: 0, y: 0, z: 0 },
      to: { x: 1, y: 0, z: 0 },
    },
  })),
  totalDistanceM: 12.5,
  totalTimeS: 750,
  bottlenecks: [{ description: 'Test bottleneck', position: { x: 0, y: 0, z: 0 }, suggestion: 'Fix it' }],
  efficiencyScore: 75,
  optimizedSteps: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WorkflowSimulationService', () => {
  let service: WorkflowSimulationService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the singleton instance by accessing private static member
    (WorkflowSimulationService as any).instance = undefined;
    service = WorkflowSimulationService.getInstance();
  });

  // ==================== getScenarios ====================

  describe('getScenarios', () => {
    it('should return all available cooking scenarios', () => {
      const scenarios = service.getScenarios();

      expect(scenarios.length).toBeGreaterThanOrEqual(4);
      expect(scenarios.map(s => s.key)).toContain('dinner_for_6');
      expect(scenarios.map(s => s.key)).toContain('quick_breakfast');
      expect(scenarios.map(s => s.key)).toContain('meal_prep');
      expect(scenarios.map(s => s.key)).toContain('baking');
    });

    it('should return scenarios with valid stepsRange', () => {
      const scenarios = service.getScenarios();

      scenarios.forEach(scenario => {
        expect(scenario.stepsRange.min).toBeGreaterThan(0);
        expect(scenario.stepsRange.max).toBeGreaterThanOrEqual(scenario.stepsRange.min);
        expect(scenario.name).toBeTruthy();
        expect(scenario.description).toBeTruthy();
      });
    });
  });

  // ==================== simulate ====================

  describe('simulate', () => {
    it('should simulate a cooking workflow and return enriched results', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);
      mockPrisma.kitchenItem.findMany.mockResolvedValue(mockKitchenItems);
      mockGenerateJSON.mockResolvedValue({
        data: mockAISimulationResponse,
        inputTokens: 4000,
        outputTokens: 2000,
      });
      mockLogUsage.mockResolvedValue(undefined);
      mockPrisma.workflowSimulation.create.mockResolvedValue({
        id: 'sim-new',
        ...mockSimulationRecord,
      });

      const result = await service.simulate(kitchenId, testUserId, 'quick_breakfast');

      expect(result.id).toBeDefined();
      expect(result.scenario).toBe('quick_breakfast');
      expect(result.steps.length).toBe(8);
      expect(result.totalDistanceM).toBeGreaterThanOrEqual(0);
      expect(result.totalTimeMinutes).toBeGreaterThan(0);
      expect(result.efficiencyScore).toBeGreaterThanOrEqual(0);
      expect(result.efficiencyScore).toBeLessThanOrEqual(100);
      expect(result.bottlenecks).toHaveLength(1);
      expect(result.zoneUsage).toBeDefined();

      // Verify each step has enriched position data
      result.steps.forEach(step => {
        expect(step.position3D).toBeDefined();
        expect(step.position3D.from).toHaveProperty('x');
        expect(step.position3D.to).toHaveProperty('x');
        expect(step.distanceM).toBeGreaterThanOrEqual(0);
      });

      expect(mockGenerateJSON).toHaveBeenCalledTimes(1);
      expect(mockLogUsage).toHaveBeenCalledWith(
        testUserId,
        'anthropic',
        'claude-sonnet-4-5-20250929',
        4000,
        2000,
        expect.any(Number),
        expect.objectContaining({ feature: 'workflow_simulation', scenario: 'quick_breakfast' }),
      );
      expect(mockPrisma.workflowSimulation.create).toHaveBeenCalledTimes(1);
    });

    it('should throw for an unknown scenario', async () => {
      await expect(
        service.simulate(kitchenId, testUserId, 'unknown_scenario'),
      ).rejects.toThrow('Unknown scenario: unknown_scenario');

      expect(mockPrisma.kitchen.findUnique).not.toHaveBeenCalled();
      expect(mockGenerateJSON).not.toHaveBeenCalled();
    });

    it('should throw when kitchen is not found', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(null);

      await expect(
        service.simulate(kitchenId, testUserId, 'quick_breakfast'),
      ).rejects.toThrow('Kitchen not found');

      expect(mockGenerateJSON).not.toHaveBeenCalled();
    });

    it('should propagate AI service errors', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);
      mockPrisma.kitchenItem.findMany.mockResolvedValue(mockKitchenItems);
      mockGenerateJSON.mockRejectedValue(new Error('API timeout'));

      await expect(
        service.simulate(kitchenId, testUserId, 'dinner_for_6'),
      ).rejects.toThrow('API timeout');
    });

    it('should calculate zone usage from simulation steps', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);
      mockPrisma.kitchenItem.findMany.mockResolvedValue(mockKitchenItems);
      mockGenerateJSON.mockResolvedValue({
        data: mockAISimulationResponse,
        inputTokens: 4000,
        outputTokens: 2000,
      });
      mockLogUsage.mockResolvedValue(undefined);
      mockPrisma.workflowSimulation.create.mockResolvedValue({
        id: 'sim-new',
        ...mockSimulationRecord,
      });

      const result = await service.simulate(kitchenId, testUserId, 'quick_breakfast');

      // countertop appears in multiple steps
      expect(result.zoneUsage['countertop']).toBeGreaterThan(1);
      expect(result.zoneUsage['sink']).toBeGreaterThan(0);
    });
  });

  // ==================== getHistory ====================

  describe('getHistory', () => {
    it('should return simulation history for a kitchen', async () => {
      mockPrisma.workflowSimulation.findMany.mockResolvedValue([
        mockSimulationRecord,
        { ...mockSimulationRecord, id: 'sim-2', scenario: 'dinner_for_6' },
      ]);

      const result = await service.getHistory(kitchenId);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('sim-1');
      expect(result[0].scenario).toBe('quick_breakfast');
      expect(result[0].efficiencyScore).toBe(75);
      expect(mockPrisma.workflowSimulation.findMany).toHaveBeenCalledWith({
        where: { kitchenId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
    });

    it('should return empty array when no simulations exist', async () => {
      mockPrisma.workflowSimulation.findMany.mockResolvedValue([]);

      const result = await service.getHistory(kitchenId);

      expect(result).toEqual([]);
    });

    it('should handle simulations with empty steps gracefully', async () => {
      mockPrisma.workflowSimulation.findMany.mockResolvedValue([
        {
          ...mockSimulationRecord,
          steps: [],
          bottlenecks: [],
        },
      ]);

      const result = await service.getHistory(kitchenId);

      expect(result).toHaveLength(1);
      expect(result[0].steps).toEqual([]);
      expect(result[0].totalTimeMinutes).toBe(0);
    });
  });

  // ==================== optimize ====================

  describe('optimize', () => {
    it('should return optimization suggestions for an existing simulation', async () => {
      mockPrisma.workflowSimulation.findUnique.mockResolvedValue(mockSimulationRecord);
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);
      mockPrisma.kitchenItem.findMany.mockResolvedValue(mockKitchenItems);
      mockGenerateJSON.mockResolvedValue({
        data: mockAIOptimizationResponse,
        inputTokens: 3000,
        outputTokens: 1000,
      });
      mockLogUsage.mockResolvedValue(undefined);
      mockPrisma.workflowSimulation.update.mockResolvedValue(mockSimulationRecord);

      const result = await service.optimize('sim-1', testUserId);

      expect(result.simulationId).toBe('sim-1');
      expect(result.suggestions).toHaveLength(2);
      expect(result.currentTotalDistance).toBe(12.5);
      expect(result.optimizedTotalDistance).toBeLessThan(result.currentTotalDistance);
      expect(result.percentImprovement).toBeGreaterThan(0);

      result.suggestions.forEach(suggestion => {
        expect(suggestion.currentPosition).toHaveProperty('x');
        expect(suggestion.suggestedPosition).toHaveProperty('x');
        expect(suggestion.distanceSaved).toBeGreaterThanOrEqual(0);
      });

      expect(mockPrisma.workflowSimulation.update).toHaveBeenCalledWith({
        where: { id: 'sim-1' },
        data: { optimizedSteps: expect.any(Array) },
      });
    });

    it('should throw when simulation is not found', async () => {
      mockPrisma.workflowSimulation.findUnique.mockResolvedValue(null);

      await expect(
        service.optimize('nonexistent', testUserId),
      ).rejects.toThrow('Simulation not found');
    });

    it('should throw when kitchen for the simulation is not found', async () => {
      mockPrisma.workflowSimulation.findUnique.mockResolvedValue(mockSimulationRecord);
      mockPrisma.kitchen.findUnique.mockResolvedValue(null);

      await expect(
        service.optimize('sim-1', testUserId),
      ).rejects.toThrow('Kitchen not found');
    });
  });
});
