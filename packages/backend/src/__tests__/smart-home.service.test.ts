/**
 * Smart Home Service Tests
 *
 * Tests for smart home planning and IoT integration:
 * - getDeviceCatalog (return device list)
 * - createPlan (mock Claude AI suggestions)
 * - getPlan (retrieve from DB)
 * - updatePlan (with ownership verification)
 * - calculateCoverage (WiFi/Zigbee signal simulation)
 */

// ---------------------------------------------------------------------------
// Mock prisma client
// ---------------------------------------------------------------------------
const mockPrisma = {
  kitchen: {
    findUnique: jest.fn(),
  },
  smartHomePlan: {
    create: jest.fn(),
    findUnique: jest.fn(),
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
  __esModule: true,
  default: {
    getInstance: jest.fn(() => ({
      generateJSON: mockGenerateJSON,
      logUsage: mockLogUsage,
    })),
  },
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
    SMART_HOME_PLANNER: 'You are a smart home planner.',
  },
  PROMPT_VERSIONS: {
    SMART_HOME_PLANNER: '1.0.0',
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
import { SmartHomeService } from '../services/smart-home/smart-home.service';
import type { PlacedDevice, AutomationRule, CoverageMap } from '../services/smart-home/smart-home.service';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const testUserId = 'test-user-id';
const otherUserId = 'other-user-99';
const kitchenId = 'kitchen-1';

const mockKitchen = {
  id: kitchenId,
  name: 'Ma cuisine',
  width: 4,
  length: 3,
  height: 2.7,
  layoutData: { roomWidth: 4, roomDepth: 3 },
};

const mockAISuggestion = {
  devices: [
    {
      type: 'smart_outlet',
      brand: 'Legrand',
      model: 'Celiane with Netatmo',
      protocol: 'WiFi',
      powerW: 3680,
      price: 89,
      suggestedPosition: { x: 1, y: 1, z: 0 },
      zone: 'countertop',
      reason: 'Prise connectee pour le plan de travail',
    },
    {
      type: 'smart_light',
      brand: 'Philips Hue',
      model: 'White Ambiance GU10',
      protocol: 'Zigbee',
      powerW: 5.7,
      price: 25,
      suggestedPosition: { x: 2, y: 2.5, z: 1.5 },
      zone: 'ceiling',
      reason: 'Eclairage principal',
    },
  ],
  automations: [
    {
      name: 'Allumer lumiere en entrant',
      trigger: { event: 'motion_detected', condition: 'after_sunset' },
      action: { command: 'turn_on', params: { brightness: 80 } },
      description: 'Allumer la lumiere automatiquement',
    },
  ],
  circuits: [
    {
      name: 'Circuit cuisine 1',
      type: 'dedicated' as const,
      amperage: 20,
      outlets: [{ position: { x: 1, y: 1, z: 0 }, amperage: 16 }],
    },
  ],
  estimatedTotalPower: 3685.7,
  estimatedTotalCost: 114,
  recommendations: ['Ajouter un hub Matter pour compatibilite future'],
};

const mockPlanRecord = {
  id: 'plan-1',
  kitchenId,
  userId: testUserId,
  devices: [
    {
      id: 'shd_kitchen-_0',
      type: 'smart_outlet',
      brand: 'Legrand',
      model: 'Celiane with Netatmo',
      protocol: 'WiFi',
      powerW: 3680,
      price: 89,
      position: { x: 1, y: 1, z: 0 },
      zone: 'countertop',
    },
  ],
  wifiCoverage: null,
  circuits: [],
  automations: [],
  matterDevices: [],
  totalPowerDraw: 3680,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SmartHomeService', () => {
  let service: SmartHomeService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SmartHomeService();
  });

  // ==================== getDeviceCatalog ====================

  describe('getDeviceCatalog', () => {
    it('should return the full device catalog as a new array', () => {
      const catalog = service.getDeviceCatalog();

      expect(catalog.length).toBeGreaterThan(0);
      expect(catalog[0]).toHaveProperty('type');
      expect(catalog[0]).toHaveProperty('brand');
      expect(catalog[0]).toHaveProperty('model');
      expect(catalog[0]).toHaveProperty('protocol');
      expect(catalog[0]).toHaveProperty('powerW');
      expect(catalog[0]).toHaveProperty('price');
    });

    it('should return a copy (not a reference to the internal array)', () => {
      const catalog1 = service.getDeviceCatalog();
      const catalog2 = service.getDeviceCatalog();

      expect(catalog1).not.toBe(catalog2);
      expect(catalog1).toEqual(catalog2);
    });
  });

  // ==================== createPlan ====================

  describe('createPlan', () => {
    it('should create a smart home plan using AI suggestions', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);
      mockGenerateJSON.mockResolvedValue({
        data: mockAISuggestion,
        inputTokens: 3000,
        outputTokens: 1200,
      });
      mockLogUsage.mockResolvedValue(undefined);
      mockPrisma.smartHomePlan.create.mockResolvedValue({
        id: 'plan-1',
        kitchenId,
        userId: testUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createPlan(kitchenId, testUserId, {
        budget: 500,
        protocols: ['WiFi', 'Zigbee'],
        priorities: ['comfort'],
      });

      expect(result.id).toBe('plan-1');
      expect(result.kitchenId).toBe(kitchenId);
      expect(result.userId).toBe(testUserId);
      expect(result.devices).toHaveLength(2);
      expect(result.automations).toHaveLength(1);
      expect(result.circuits).toHaveLength(1);
      expect(result.totalPowerDraw).toBeGreaterThan(0);
      expect(result.totalCost).toBeGreaterThan(0);

      expect(mockGenerateJSON).toHaveBeenCalledTimes(1);
      expect(mockLogUsage).toHaveBeenCalledWith(
        testUserId,
        'anthropic',
        'claude-sonnet-4-5-20250929',
        3000,
        1200,
        expect.any(Number),
        expect.objectContaining({ feature: 'smart_home_planner' }),
      );
      expect(mockPrisma.smartHomePlan.create).toHaveBeenCalledTimes(1);
    });

    it('should throw when kitchen is not found', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(null);

      await expect(
        service.createPlan(kitchenId, testUserId, {}),
      ).rejects.toThrow('Kitchen not found');

      expect(mockGenerateJSON).not.toHaveBeenCalled();
    });

    it('should propagate AI service errors', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);
      mockGenerateJSON.mockRejectedValue(new Error('Rate limit exceeded'));

      await expect(
        service.createPlan(kitchenId, testUserId, {}),
      ).rejects.toThrow('Rate limit exceeded');
    });
  });

  // ==================== getPlan ====================

  describe('getPlan', () => {
    it('should return a plan for the given kitchen', async () => {
      mockPrisma.smartHomePlan.findUnique.mockResolvedValue(mockPlanRecord);

      const result = await service.getPlan(kitchenId);

      expect(result).not.toBeNull();
      expect(result!.id).toBe('plan-1');
      expect(result!.kitchenId).toBe(kitchenId);
      expect(result!.devices).toHaveLength(1);
      expect(result!.totalPowerDraw).toBe(3680);
    });

    it('should return null when no plan exists for the kitchen', async () => {
      mockPrisma.smartHomePlan.findUnique.mockResolvedValue(null);

      const result = await service.getPlan('nonexistent-kitchen');

      expect(result).toBeNull();
    });

    it('should correctly calculate totalCost from device prices', async () => {
      mockPrisma.smartHomePlan.findUnique.mockResolvedValue(mockPlanRecord);

      const result = await service.getPlan(kitchenId);

      expect(result!.totalCost).toBe(89); // single device with price 89
    });
  });

  // ==================== updatePlan ====================

  describe('updatePlan', () => {
    it('should update a plan owned by the user', async () => {
      mockPrisma.smartHomePlan.findUnique.mockResolvedValue(mockPlanRecord);
      mockPrisma.smartHomePlan.update.mockResolvedValue({
        ...mockPlanRecord,
        updatedAt: new Date(),
      });

      const newDevices: PlacedDevice[] = [
        {
          id: 'shd_new_0',
          type: 'smart_light',
          brand: 'Philips Hue',
          model: 'White GU10',
          protocol: 'Zigbee',
          powerW: 5.7,
          price: 25,
          position: { x: 2, y: 2.5, z: 1.5 },
          zone: 'ceiling',
        },
      ];

      const result = await service.updatePlan(kitchenId, testUserId, {
        devices: newDevices,
      });

      expect(result).toBeDefined();
      expect(result.devices).toEqual(newDevices);
      expect(mockPrisma.smartHomePlan.update).toHaveBeenCalledTimes(1);
    });

    it('should throw when plan is not found', async () => {
      mockPrisma.smartHomePlan.findUnique.mockResolvedValue(null);

      await expect(
        service.updatePlan(kitchenId, testUserId, {}),
      ).rejects.toThrow('Smart home plan not found');
    });

    it('should throw when user does not own the plan (IDOR prevention)', async () => {
      mockPrisma.smartHomePlan.findUnique.mockResolvedValue(mockPlanRecord);

      await expect(
        service.updatePlan(kitchenId, otherUserId, {}),
      ).rejects.toThrow('Unauthorized: you do not own this plan');

      expect(mockPrisma.smartHomePlan.update).not.toHaveBeenCalled();
    });

    it('should filter Matter-compatible devices from the updated device list', async () => {
      mockPrisma.smartHomePlan.findUnique.mockResolvedValue(mockPlanRecord);
      mockPrisma.smartHomePlan.update.mockResolvedValue({
        ...mockPlanRecord,
        updatedAt: new Date(),
      });

      const devicesWithMatter: PlacedDevice[] = [
        {
          id: 'shd_m_0',
          type: 'matter_hub',
          brand: 'Apple',
          model: 'HomePod Mini',
          protocol: 'Matter/Thread',
          powerW: 10,
          price: 110,
          position: { x: 0, y: 0, z: 0 },
          zone: 'counter',
        },
        {
          id: 'shd_w_1',
          type: 'smart_outlet',
          brand: 'Legrand',
          model: 'Celiane',
          protocol: 'WiFi',
          powerW: 3680,
          price: 89,
          position: { x: 1, y: 0, z: 0 },
          zone: 'counter',
        },
      ];

      const result = await service.updatePlan(kitchenId, testUserId, {
        devices: devicesWithMatter,
      });

      expect(result.matterDevices).toHaveLength(1);
      expect(result.matterDevices[0].protocol).toContain('Matter');
    });
  });

  // ==================== calculateCoverage ====================

  describe('calculateCoverage', () => {
    it('should calculate WiFi coverage for a kitchen', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);
      mockPrisma.smartHomePlan.findUnique.mockResolvedValue(mockPlanRecord);
      mockPrisma.smartHomePlan.update.mockResolvedValue(mockPlanRecord);

      const result = await service.calculateCoverage(
        kitchenId,
        { x: 2, y: 1, z: 1.5 },
        'WiFi',
      );

      expect(result).toBeDefined();
      expect(result.protocol).toBe('WiFi');
      expect(result.routerPosition).toEqual({ x: 2, y: 1, z: 1.5 });
      expect(result.points.length).toBeGreaterThan(0);
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });

    it('should throw when kitchen is not found', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(null);

      await expect(
        service.calculateCoverage('nonexistent', { x: 0, y: 0, z: 0 }, 'WiFi'),
      ).rejects.toThrow('Kitchen not found');
    });

    it('should persist coverage data to the plan if one exists', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);
      mockPrisma.smartHomePlan.findUnique.mockResolvedValue(mockPlanRecord);
      mockPrisma.smartHomePlan.update.mockResolvedValue(mockPlanRecord);

      await service.calculateCoverage(kitchenId, { x: 2, y: 1, z: 1.5 });

      expect(mockPrisma.smartHomePlan.update).toHaveBeenCalledWith({
        where: { kitchenId },
        data: {
          wifiCoverage: expect.objectContaining({
            protocol: expect.any(String),
            routerPosition: expect.any(Object),
            points: expect.any(Array),
          }),
        },
      });
    });
  });
});
