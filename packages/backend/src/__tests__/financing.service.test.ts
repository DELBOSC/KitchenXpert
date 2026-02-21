/**
 * Financing Service Tests
 *
 * Tests for simulate, calculateEcoAids, calculateMonthlyPayment,
 * getProviders, getMySimulations, and getSimulationById.
 */

// Mock logger before imports
jest.mock('../../utils/logger', () => ({
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
  financingSimulation: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
};

jest.mock('../../database/client', () => ({
  prisma: mockPrisma,
}));

// Mock AnthropicService
jest.mock('../../services/ai/anthropic.service', () => ({
  AnthropicService: {
    getInstance: jest.fn(() => ({
      generateJSON: jest.fn().mockResolvedValue({
        data: {
          recommendations: [],
          totalSuggested: 0,
          savingsTips: [],
          warnings: [],
        },
        inputTokens: 100,
        outputTokens: 200,
      }),
      logUsage: jest.fn().mockResolvedValue(undefined),
    })),
  },
}));

// Mock prompt templates
jest.mock('../../services/ai/prompt-templates', () => ({
  SYSTEM_PROMPTS: {
    FINANCING_ADVISOR: 'You are a financing advisor.',
  },
}));

import { FinancingService } from '../../services/financing/financing.service';
import type { EcoAidsDto, SimulateDto, IncomeBracket, EquipmentType } from '../../services/financing/financing.service';

describe('FinancingService', () => {
  let service: FinancingService;

  const mockUser = { userId: 'test-user-id', email: 'test@test.com', role: 'user' };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FinancingService();
  });

  // ==================== calculateMonthlyPayment ====================

  describe('calculateMonthlyPayment', () => {
    it('should calculate correct monthly payment for standard loan', () => {
      // 10000 EUR at 5% for 12 months
      const payment = service.calculateMonthlyPayment(10000, 5, 12);

      expect(payment).toBeGreaterThan(0);
      // Total paid should be more than principal
      expect(payment * 12).toBeGreaterThan(10000);
      // But not excessively (< 6% total interest for 1 year at 5%)
      expect(payment * 12).toBeLessThan(10600);
    });

    it('should return 0 for zero amount', () => {
      const payment = service.calculateMonthlyPayment(0, 5, 12);
      expect(payment).toBe(0);
    });

    it('should return 0 for zero months', () => {
      const payment = service.calculateMonthlyPayment(10000, 5, 0);
      expect(payment).toBe(0);
    });

    it('should return simple division when rate is 0', () => {
      const payment = service.calculateMonthlyPayment(12000, 0, 12);
      expect(payment).toBe(1000);
    });
  });

  // ==================== simulate ====================

  describe('simulate', () => {
    it('should run a full financing simulation across all providers', async () => {
      mockPrisma.financingSimulation.create.mockResolvedValue({
        id: 'sim-1',
        createdAt: new Date(),
      });

      const data: SimulateDto = {
        totalAmount: 15000,
        downPayment: 3000,
      };

      const result = await service.simulate(mockUser.userId, data);

      expect(result.id).toBe('sim-1');
      expect(result.totalAmount).toBe(15000);
      expect(result.downPayment).toBe(3000);
      expect(result.loanAmount).toBe(12000);
      expect(result.durations.length).toBeGreaterThan(0);
      expect(result.bestOverall).toBeDefined();
      expect(result.bestOverall.monthlyPayment).toBeGreaterThan(0);
    });

    it('should throw when loan amount is zero or negative', async () => {
      const data: SimulateDto = {
        totalAmount: 5000,
        downPayment: 5000, // Down payment equals total
      };

      await expect(
        service.simulate(mockUser.userId, data),
      ).rejects.toThrow('Loan amount must be positive after down payment');
    });

    it('should throw when down payment exceeds total amount', async () => {
      const data: SimulateDto = {
        totalAmount: 5000,
        downPayment: 6000,
      };

      await expect(
        service.simulate(mockUser.userId, data),
      ).rejects.toThrow('Loan amount must be positive after down payment');
    });

    it('should store the simulation in the database', async () => {
      mockPrisma.financingSimulation.create.mockResolvedValue({
        id: 'sim-stored',
        createdAt: new Date(),
      });

      const data: SimulateDto = {
        totalAmount: 20000,
        downPayment: 5000,
        kitchenId: 'kitchen-1',
        projectId: 'project-1',
      };

      await service.simulate(mockUser.userId, data);

      expect(mockPrisma.financingSimulation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockUser.userId,
          kitchenId: 'kitchen-1',
          projectId: 'project-1',
          totalAmount: 20000,
          downPayment: 5000,
          loanAmount: 15000,
          status: 'simulation',
        }),
      });
    });

    it('should find the best overall option with lowest total cost', async () => {
      mockPrisma.financingSimulation.create.mockResolvedValue({
        id: 'sim-best',
        createdAt: new Date(),
      });

      const result = await service.simulate(mockUser.userId, {
        totalAmount: 10000,
        downPayment: 2000,
      });

      // The best overall should be a 12-month option (shortest = lowest total cost)
      expect(result.bestOverall.months).toBe(12);
    });
  });

  // ==================== calculateEcoAids ====================

  describe('calculateEcoAids', () => {
    it('should calculate MaPrimeRenov for eligible renovation with modest income', async () => {
      const data: EcoAidsDto = {
        totalAmount: 15000,
        incomeBracket: 'modeste' as IncomeBracket,
        householdSize: 3,
        equipmentTypes: ['pompe_a_chaleur' as EquipmentType],
        isRenovation: true,
        buildingAge: 15,
      };

      const result = await service.calculateEcoAids(data);

      expect(result.maprimerenov.eligible).toBe(true);
      expect(result.maprimerenov.amount).toBeGreaterThan(0);
      expect(result.maprimerenov.bracket).toBe('modeste');
    });

    it('should not grant MaPrimeRenov for new construction', async () => {
      const data: EcoAidsDto = {
        totalAmount: 15000,
        incomeBracket: 'modeste' as IncomeBracket,
        householdSize: 3,
        equipmentTypes: ['pompe_a_chaleur' as EquipmentType],
        isRenovation: false,
      };

      const result = await service.calculateEcoAids(data);

      expect(result.maprimerenov.eligible).toBe(false);
      expect(result.maprimerenov.amount).toBe(0);
    });

    it('should not grant MaPrimeRenov for superior income bracket', async () => {
      const data: EcoAidsDto = {
        totalAmount: 15000,
        incomeBracket: 'superieur' as IncomeBracket,
        householdSize: 2,
        equipmentTypes: ['pompe_a_chaleur' as EquipmentType],
        isRenovation: true,
        buildingAge: 20,
      };

      const result = await service.calculateEcoAids(data);

      // superieur bracket has maxAid = 0
      expect(result.maprimerenov.amount).toBe(0);
    });

    it('should calculate CEE amounts for eligible equipment', async () => {
      const data: EcoAidsDto = {
        totalAmount: 20000,
        incomeBracket: 'intermediaire' as IncomeBracket,
        householdSize: 4,
        equipmentTypes: [
          'pompe_a_chaleur' as EquipmentType,
          'chauffe_eau_thermodynamique' as EquipmentType,
        ],
        isRenovation: true,
        buildingAge: 10,
      };

      const result = await service.calculateEcoAids(data);

      expect(result.cee.eligible).toBe(true);
      expect(result.cee.amount).toBeGreaterThan(0);
      expect(result.cee.perEquipment).toHaveLength(2);
    });

    it('should apply reduced TVA 5.5% for energy renovation on old buildings', async () => {
      const data: EcoAidsDto = {
        totalAmount: 10000,
        incomeBracket: 'modeste' as IncomeBracket,
        householdSize: 2,
        equipmentTypes: ['pompe_a_chaleur' as EquipmentType],
        isRenovation: true,
        buildingAge: 10,
      };

      const result = await service.calculateEcoAids(data);

      expect(result.tvaReduite.applicable).toBe(true);
      expect(result.tvaReduite.rate).toBe(5.5);
      expect(result.tvaReduite.savings).toBeGreaterThan(0);
    });

    it('should apply standard TVA 20% for new construction', async () => {
      const data: EcoAidsDto = {
        totalAmount: 10000,
        incomeBracket: 'modeste' as IncomeBracket,
        householdSize: 2,
        equipmentTypes: ['pompe_a_chaleur' as EquipmentType],
        isRenovation: false,
      };

      const result = await service.calculateEcoAids(data);

      expect(result.tvaReduite.applicable).toBe(false);
      expect(result.tvaReduite.rate).toBe(20);
      expect(result.tvaReduite.savings).toBe(0);
    });

    it('should grant eco-PTZ for eligible energy renovation', async () => {
      const data: EcoAidsDto = {
        totalAmount: 30000,
        incomeBracket: 'modeste' as IncomeBracket,
        householdSize: 3,
        equipmentTypes: ['pompe_a_chaleur' as EquipmentType],
        isRenovation: true,
        buildingAge: 20,
      };

      const result = await service.calculateEcoAids(data);

      expect(result.ecoPtz.eligible).toBe(true);
      expect(result.ecoPtz.maxAmount).toBe(50000);
      expect(result.ecoPtz.interestRate).toBe(0);
      expect(result.ecoPtz.maxDurationMonths).toBe(240);
    });

    it('should compute correct netCostAfterAids', async () => {
      const data: EcoAidsDto = {
        totalAmount: 20000,
        incomeBracket: 'tres_modeste' as IncomeBracket,
        householdSize: 2,
        equipmentTypes: ['pompe_a_chaleur' as EquipmentType],
        isRenovation: true,
        buildingAge: 15,
      };

      const result = await service.calculateEcoAids(data);

      expect(result.totalAids).toBeGreaterThan(0);
      expect(result.netCostAfterAids).toBeLessThan(data.totalAmount);
      expect(result.netCostAfterAids).toBeGreaterThanOrEqual(0);
    });
  });

  // ==================== getProviders ====================

  describe('getProviders', () => {
    it('should return the list of financing providers', () => {
      const providers = service.getProviders();

      expect(providers.length).toBeGreaterThan(0);
      expect(providers[0]).toHaveProperty('id');
      expect(providers[0]).toHaveProperty('name');
      expect(providers[0]).toHaveProperty('rates');
      expect(providers[0]).toHaveProperty('minAmount');
      expect(providers[0]).toHaveProperty('maxAmount');
    });
  });

  // ==================== getSimulationById ====================

  describe('getSimulationById', () => {
    it('should return simulation when user is the owner', async () => {
      const mockSim = {
        id: 'sim-1',
        userId: mockUser.userId,
        totalAmount: 15000,
      };
      mockPrisma.financingSimulation.findUnique.mockResolvedValue(mockSim);

      const result = await service.getSimulationById(mockUser.userId, 'sim-1', false);

      expect(result).toBeDefined();
      expect(result!.id).toBe('sim-1');
    });

    it('should return simulation when requester is admin even if not owner', async () => {
      const mockSim = {
        id: 'sim-1',
        userId: 'other-user-id',
        totalAmount: 15000,
      };
      mockPrisma.financingSimulation.findUnique.mockResolvedValue(mockSim);

      const result = await service.getSimulationById(mockUser.userId, 'sim-1', true);

      expect(result).toBeDefined();
    });

    it('should return null when non-admin user tries to access another user simulation', async () => {
      const mockSim = {
        id: 'sim-1',
        userId: 'other-user-id',
        totalAmount: 15000,
      };
      mockPrisma.financingSimulation.findUnique.mockResolvedValue(mockSim);

      const result = await service.getSimulationById(mockUser.userId, 'sim-1', false);

      expect(result).toBeNull();
    });

    it('should return null when simulation does not exist', async () => {
      mockPrisma.financingSimulation.findUnique.mockResolvedValue(null);

      const result = await service.getSimulationById(mockUser.userId, 'non-existent', false);

      expect(result).toBeNull();
    });
  });
});
