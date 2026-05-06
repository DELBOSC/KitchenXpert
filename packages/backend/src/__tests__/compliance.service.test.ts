/**
 * Compliance Service Tests
 *
 * Tests for checkKitchenCompliance, getRules, getRulesByCode,
 * getCheckHistory, and seedDefaultRules.
 */

// Mock logger before imports
jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  createModuleLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

// Mock database client
const mockPrisma = {
  kitchen: {
    findUnique: jest.fn(),
  },
  complianceRule: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  complianceCheck: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
};

jest.mock('../database/client', () => ({
  prisma: mockPrisma,
}));

// Mock AnthropicService
jest.mock('../services/ai/anthropic.service', () => ({
  AnthropicService: {
    getInstance: jest.fn(() => ({
      generateJSON: jest.fn().mockResolvedValue({
        data: [],
        inputTokens: 0,
        outputTokens: 0,
      }),
    })),
  },
}));

import { ComplianceService, ComplianceServiceError } from '../services/compliance/compliance.service';

describe('ComplianceService', () => {
  let service: ComplianceService;

  const mockUser = { userId: 'test-user-id', email: 'test@test.com', role: 'user' };

  const mockKitchen = {
    id: 'kitchen-1',
    userId: 'test-user-id',
    width: 400,
    length: 300,
    height: 250,
    metadata: null,
    items: [
      {
        id: 'item-1',
        position: { x: 100, y: 100 },
        rotation: 0,
        metadata: {},
        product: { name: 'Plaque induction', category: 'hob', dimensions: { width: 60, depth: 50, height: 5 } },
      },
      {
        id: 'item-2',
        position: { x: 200, y: 100 },
        rotation: 0,
        metadata: {},
        product: { name: 'Evier standard', category: 'sink', dimensions: { width: 80, depth: 50, height: 20 } },
      },
    ],
  };

  const mockRules = [
    {
      id: 'rule-1',
      code: 'NF_C_15_100',
      category: 'electrical',
      name: 'Circuit dedié plaque de cuisson 32A',
      description: 'La plaque de cuisson doit être alimentée par un circuit dédié 32A.',
      condition: { type: 'dedicated_circuit', source: 'hob', amperage: 32, circuit: 'dedicated' },
      severity: 'error',
      isActive: true,
    },
    {
      id: 'rule-2',
      code: 'NF_EN_1116',
      category: 'safety',
      name: 'Distance min plaque — point d\'eau (60 cm)',
      description: 'La plaque de cuisson doit être à au moins 60 cm de tout point d\'eau.',
      condition: { type: 'min_distance', source: 'hob', target: 'sink', minCm: 60 },
      severity: 'error',
      isActive: true,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ComplianceService();
  });

  // ==================== checkKitchenCompliance ====================

  describe('checkKitchenCompliance', () => {
    it('should run compliance checks and return results for a valid kitchen', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);
      mockPrisma.complianceRule.findMany.mockResolvedValue(mockRules);
      mockPrisma.complianceCheck.create.mockResolvedValue({
        id: 'check-1',
        kitchenId: 'kitchen-1',
        userId: mockUser.userId,
        status: 'passed',
        totalRules: 2,
        passedRules: 2,
        failedRules: 0,
        warningRules: 0,
        checkedAt: new Date(),
      });

      const result = await service.checkKitchenCompliance('kitchen-1', mockUser.userId);

      expect(result.kitchenId).toBe('kitchen-1');
      expect(result.userId).toBe(mockUser.userId);
      expect(result.totalRules).toBe(2);
      expect(result.results).toHaveLength(2);
      expect(mockPrisma.kitchen.findUnique).toHaveBeenCalledWith({
        where: { id: 'kitchen-1' },
        include: { items: { include: { product: true } } },
      });
    });

    it('should throw KITCHEN_NOT_FOUND when kitchen does not exist', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(null);

      await expect(
        service.checkKitchenCompliance('non-existent', mockUser.userId),
      ).rejects.toThrow(ComplianceServiceError);

      await expect(
        service.checkKitchenCompliance('non-existent', mockUser.userId),
      ).rejects.toThrow('Kitchen non-existent not found');
    });

    it('should throw NO_RULES when no active rules exist', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);
      mockPrisma.complianceRule.findMany.mockResolvedValue([]);

      await expect(
        service.checkKitchenCompliance('kitchen-1', mockUser.userId),
      ).rejects.toThrow('No active compliance rules found');
    });

    it('should detect failed min_distance rule when elements are too close', async () => {
      // Position hob and sink only 30cm apart (less than required 60cm)
      const closeKitchen = {
        ...mockKitchen,
        items: [
          {
            id: 'item-1',
            position: { x: 100, y: 100 },
            rotation: 0,
            metadata: {},
            product: { name: 'Plaque', category: 'hob', dimensions: null },
          },
          {
            id: 'item-2',
            position: { x: 120, y: 100 },
            rotation: 0,
            metadata: {},
            product: { name: 'Evier', category: 'sink', dimensions: null },
          },
        ],
      };

      // Only use the min_distance rule
      const distanceRule = [mockRules[1]];

      mockPrisma.kitchen.findUnique.mockResolvedValue(closeKitchen);
      mockPrisma.complianceRule.findMany.mockResolvedValue(distanceRule);
      mockPrisma.complianceCheck.create.mockResolvedValue({
        id: 'check-2',
        checkedAt: new Date(),
      });

      const result = await service.checkKitchenCompliance('kitchen-1', mockUser.userId);

      const failedResult = result.results.find(r => r.status === 'failed');
      expect(failedResult).toBeDefined();
      expect(failedResult!.message).toContain('< 60 cm');
    });

    it('should pass min_distance rule when elements are far enough apart', async () => {
      // Position hob and sink 100cm apart (more than required 60cm)
      const farKitchen = {
        ...mockKitchen,
        items: [
          {
            id: 'item-1',
            position: { x: 50, y: 100 },
            rotation: 0,
            metadata: {},
            product: { name: 'Plaque', category: 'hob', dimensions: null },
          },
          {
            id: 'item-2',
            position: { x: 150, y: 100 },
            rotation: 0,
            metadata: {},
            product: { name: 'Evier', category: 'sink', dimensions: null },
          },
        ],
      };

      const distanceRule = [mockRules[1]];

      mockPrisma.kitchen.findUnique.mockResolvedValue(farKitchen);
      mockPrisma.complianceRule.findMany.mockResolvedValue(distanceRule);
      mockPrisma.complianceCheck.create.mockResolvedValue({
        id: 'check-3',
        checkedAt: new Date(),
      });

      const result = await service.checkKitchenCompliance('kitchen-1', mockUser.userId);

      expect(result.results[0].status).toBe('passed');
    });

    it('should store check result in the database', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);
      mockPrisma.complianceRule.findMany.mockResolvedValue(mockRules);
      mockPrisma.complianceCheck.create.mockResolvedValue({
        id: 'check-stored',
        checkedAt: new Date(),
      });

      await service.checkKitchenCompliance('kitchen-1', mockUser.userId);

      expect(mockPrisma.complianceCheck.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          kitchenId: 'kitchen-1',
          userId: mockUser.userId,
          totalRules: 2,
        }),
      });
    });
  });

  // ==================== getRules ====================

  describe('getRules', () => {
    it('should return all active rules when no category filter is provided', async () => {
      mockPrisma.complianceRule.findMany.mockResolvedValue(mockRules);

      const result = await service.getRules();

      expect(result).toEqual(mockRules);
      expect(mockPrisma.complianceRule.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { code: 'asc' },
      });
    });

    it('should filter rules by category', async () => {
      const electricalRules = [mockRules[0]];
      mockPrisma.complianceRule.findMany.mockResolvedValue(electricalRules);

      const result = await service.getRules('electrical');

      expect(result).toEqual(electricalRules);
      expect(mockPrisma.complianceRule.findMany).toHaveBeenCalledWith({
        where: { isActive: true, category: 'electrical' },
        orderBy: { code: 'asc' },
      });
    });
  });

  // ==================== getRulesByCode ====================

  describe('getRulesByCode', () => {
    it('should return rules matching the specified code', async () => {
      const nfcRules = [mockRules[0]];
      mockPrisma.complianceRule.findMany.mockResolvedValue(nfcRules);

      const result = await service.getRulesByCode('NF_C_15_100');

      expect(result).toEqual(nfcRules);
      expect(mockPrisma.complianceRule.findMany).toHaveBeenCalledWith({
        where: { code: 'NF_C_15_100', isActive: true },
        orderBy: { name: 'asc' },
      });
    });
  });

  // ==================== getCheckHistory ====================

  describe('getCheckHistory', () => {
    it('should return check history for a kitchen ordered by date desc', async () => {
      const mockHistory = [
        { id: 'check-2', kitchenId: 'kitchen-1', status: 'passed', checkedAt: new Date() },
        { id: 'check-1', kitchenId: 'kitchen-1', status: 'failed', checkedAt: new Date() },
      ];
      mockPrisma.complianceCheck.findMany.mockResolvedValue(mockHistory);

      const result = await service.getCheckHistory('kitchen-1');

      expect(result).toEqual(mockHistory);
      expect(mockPrisma.complianceCheck.findMany).toHaveBeenCalledWith({
        where: { kitchenId: 'kitchen-1' },
        orderBy: { checkedAt: 'desc' },
        take: 50,
      });
    });

    it('should return empty array when no history exists', async () => {
      mockPrisma.complianceCheck.findMany.mockResolvedValue([]);

      const result = await service.getCheckHistory('kitchen-no-history');

      expect(result).toEqual([]);
    });
  });

  // ==================== seedDefaultRules ====================

  describe('seedDefaultRules', () => {
    it('should create new rules when they do not exist', async () => {
      mockPrisma.complianceRule.findFirst.mockResolvedValue(null);
      mockPrisma.complianceRule.create.mockResolvedValue({ id: 'new-rule' });

      const result = await service.seedDefaultRules();

      expect(result.created).toBeGreaterThan(0);
      expect(result.updated).toBe(0);
      expect(mockPrisma.complianceRule.create).toHaveBeenCalled();
    });

    it('should update existing rules on re-seed', async () => {
      mockPrisma.complianceRule.findFirst.mockResolvedValue({ id: 'existing-rule' });
      mockPrisma.complianceRule.update.mockResolvedValue({ id: 'existing-rule' });

      const result = await service.seedDefaultRules();

      expect(result.updated).toBeGreaterThan(0);
      expect(result.created).toBe(0);
      expect(mockPrisma.complianceRule.update).toHaveBeenCalled();
    });
  });
});
