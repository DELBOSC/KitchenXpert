/**
 * Price Tracker Service Tests
 *
 * Tests for getHistory, recordPrice, getTrends, getBestTimeToBuy,
 * createAlert, deleteAlert, getAlerts, and checkAlerts.
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
  priceHistory: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  priceAlert: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

jest.mock('../../database/client', () => ({
  prisma: mockPrisma,
}));

import { PriceTrackerService } from '../../services/price-tracker/price-tracker.service';

describe('PriceTrackerService', () => {
  let service: PriceTrackerService;

  const mockUser = { userId: 'test-user-id', email: 'test@test.com', role: 'user' };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PriceTrackerService();
  });

  // ==================== getHistory ====================

  describe('getHistory', () => {
    it('should return price history for a product with default 90 days', async () => {
      const mockHistory = [
        { id: 'ph-1', productId: 'prod-1', price: 499, recordedAt: new Date() },
        { id: 'ph-2', productId: 'prod-1', price: 479, recordedAt: new Date() },
      ];
      mockPrisma.priceHistory.findMany.mockResolvedValue(mockHistory);

      const result = await service.getHistory('prod-1');

      expect(result).toEqual(mockHistory);
      expect(mockPrisma.priceHistory.findMany).toHaveBeenCalledWith({
        where: {
          productId: 'prod-1',
          recordedAt: { gte: expect.any(Date) },
        },
        orderBy: { recordedAt: 'asc' },
      });
    });

    it('should accept a custom number of days', async () => {
      mockPrisma.priceHistory.findMany.mockResolvedValue([]);

      await service.getHistory('prod-1', 30);

      const call = mockPrisma.priceHistory.findMany.mock.calls[0][0];
      const sinceDate = call.where.recordedAt.gte as Date;
      const now = new Date();
      const diffDays = Math.round((now.getTime() - sinceDate.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBeCloseTo(30, 0);
    });

    it('should return empty array when no history exists', async () => {
      mockPrisma.priceHistory.findMany.mockResolvedValue([]);

      const result = await service.getHistory('prod-no-history');

      expect(result).toEqual([]);
    });
  });

  // ==================== recordPrice ====================

  describe('recordPrice', () => {
    it('should record a new price with delta calculation', async () => {
      mockPrisma.priceHistory.findFirst.mockResolvedValue({
        price: 500,
      });
      mockPrisma.priceHistory.create.mockResolvedValue({
        id: 'ph-new',
        productId: 'prod-1',
        providerId: 'provider-1',
        price: 480,
        previousPrice: 500,
        changePercent: -4,
      });

      const result = await service.recordPrice('prod-1', 'provider-1', 480);

      expect(result.price).toBe(480);
      expect(mockPrisma.priceHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          productId: 'prod-1',
          providerId: 'provider-1',
          price: 480,
          previousPrice: 500,
          currency: 'EUR',
        }),
      });
    });

    it('should handle first price record with null previousPrice', async () => {
      mockPrisma.priceHistory.findFirst.mockResolvedValue(null);
      mockPrisma.priceHistory.create.mockResolvedValue({
        id: 'ph-first',
        productId: 'prod-1',
        price: 499,
        previousPrice: null,
        changePercent: null,
      });

      await service.recordPrice('prod-1', 'provider-1', 499);

      expect(mockPrisma.priceHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          previousPrice: null,
          changePercent: null,
        }),
      });
    });
  });

  // ==================== getTrends ====================

  describe('getTrends', () => {
    it('should return null values when no history exists', async () => {
      mockPrisma.priceHistory.findMany.mockResolvedValue([]);

      const result = await service.getTrends('prod-no-data');

      expect(result.productId).toBe('prod-no-data');
      expect(result.currentPrice).toBeNull();
      expect(result.avg30d).toBeNull();
      expect(result.avg90d).toBeNull();
      expect(result.trendDirection).toBe('stable');
    });

    it('should compute correct averages and trend for rising prices', async () => {
      const now = new Date();
      const tenDaysAgo = new Date(now);
      tenDaysAgo.setDate(now.getDate() - 10);
      const twentyDaysAgo = new Date(now);
      twentyDaysAgo.setDate(now.getDate() - 20);

      const history = [
        { price: 400, recordedAt: twentyDaysAgo },
        { price: 450, recordedAt: tenDaysAgo },
        { price: 500, recordedAt: now },
      ];
      mockPrisma.priceHistory.findMany.mockResolvedValue(history);

      const result = await service.getTrends('prod-1');

      expect(result.currentPrice).toBe(500);
      expect(result.avg90d).toBeCloseTo(450, 0);
      expect(result.min90d).toBe(400);
      expect(result.max90d).toBe(500);
      expect(result.trendDirection).toBe('up');
    });

    it('should detect downward trend', async () => {
      const now = new Date();
      const tenDaysAgo = new Date(now);
      tenDaysAgo.setDate(now.getDate() - 10);
      const twentyDaysAgo = new Date(now);
      twentyDaysAgo.setDate(now.getDate() - 20);

      const history = [
        { price: 500, recordedAt: twentyDaysAgo },
        { price: 450, recordedAt: tenDaysAgo },
        { price: 400, recordedAt: now },
      ];
      mockPrisma.priceHistory.findMany.mockResolvedValue(history);

      const result = await service.getTrends('prod-1');

      expect(result.currentPrice).toBe(400);
      expect(result.trendDirection).toBe('down');
    });
  });

  // ==================== getBestTimeToBuy ====================

  describe('getBestTimeToBuy', () => {
    it('should recommend buy_now when price is significantly below average', async () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 30);

      // Price history showing current price well below average
      const history = [
        { price: 500, recordedAt: thirtyDaysAgo },
        { price: 520, recordedAt: new Date(now.getTime() - 20 * 86400000) },
        { price: 510, recordedAt: new Date(now.getTime() - 10 * 86400000) },
        { price: 450, recordedAt: now }, // current price is below average
      ];
      mockPrisma.priceHistory.findMany.mockResolvedValue(history);

      const result = await service.getBestTimeToBuy('prod-1');

      expect(result.productId).toBe('prod-1');
      expect(result.currentPrice).toBe(450);
      expect(result.recommendation).toBe('buy_now');
      expect(result.message).toContain('lower than the 90-day average');
    });

    it('should return wait recommendation when no history available', async () => {
      mockPrisma.priceHistory.findMany.mockResolvedValue([]);

      const result = await service.getBestTimeToBuy('prod-no-data');

      expect(result.recommendation).toBe('wait');
      expect(result.currentPrice).toBeNull();
      expect(result.message).toContain('Not enough price history');
    });
  });

  // ==================== createAlert ====================

  describe('createAlert', () => {
    it('should create a price alert with direction below', async () => {
      mockPrisma.priceHistory.findFirst.mockResolvedValue({ price: 499 });
      mockPrisma.priceAlert.create.mockResolvedValue({
        id: 'alert-1',
        userId: mockUser.userId,
        productId: 'prod-1',
        targetPrice: 400,
        currentPrice: 499,
        direction: 'below',
        isActive: true,
        isTriggered: false,
      });

      const result = await service.createAlert(
        mockUser.userId,
        'prod-1',
        400,
        'below',
      );

      expect(result.targetPrice).toBe(400);
      expect(result.direction).toBe('below');
      expect(result.isActive).toBe(true);
      expect(mockPrisma.priceAlert.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockUser.userId,
          productId: 'prod-1',
          targetPrice: 400,
          direction: 'below',
          isActive: true,
          isTriggered: false,
        }),
      });
    });

    it('should create alert with null currentPrice when no history exists', async () => {
      mockPrisma.priceHistory.findFirst.mockResolvedValue(null);
      mockPrisma.priceAlert.create.mockResolvedValue({
        id: 'alert-2',
        currentPrice: null,
      });

      await service.createAlert(mockUser.userId, 'prod-new', 300, 'below');

      expect(mockPrisma.priceAlert.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          currentPrice: null,
        }),
      });
    });
  });

  // ==================== deleteAlert ====================

  describe('deleteAlert', () => {
    it('should delete an alert owned by the user', async () => {
      mockPrisma.priceAlert.findUnique.mockResolvedValue({
        id: 'alert-1',
        userId: mockUser.userId,
      });
      mockPrisma.priceAlert.delete.mockResolvedValue({});

      await service.deleteAlert('alert-1', mockUser.userId);

      expect(mockPrisma.priceAlert.delete).toHaveBeenCalledWith({
        where: { id: 'alert-1' },
      });
    });

    it('should throw when alert does not exist', async () => {
      mockPrisma.priceAlert.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteAlert('non-existent', mockUser.userId),
      ).rejects.toThrow('Alert not found');
    });

    it('should throw Forbidden when user does not own the alert', async () => {
      mockPrisma.priceAlert.findUnique.mockResolvedValue({
        id: 'alert-1',
        userId: 'other-user-id',
      });

      await expect(
        service.deleteAlert('alert-1', mockUser.userId),
      ).rejects.toThrow('Forbidden: you do not own this alert');
    });
  });

  // ==================== checkAlerts ====================

  describe('checkAlerts', () => {
    it('should trigger alerts whose conditions are met', async () => {
      mockPrisma.priceAlert.findMany.mockResolvedValue([
        {
          id: 'alert-1',
          productId: 'prod-1',
          targetPrice: 450,
          direction: 'below',
        },
      ]);
      mockPrisma.priceHistory.findFirst.mockResolvedValue({ price: 430 });
      mockPrisma.priceAlert.update.mockResolvedValue({});

      const result = await service.checkAlerts();

      expect(result.triggered).toBe(1);
      expect(mockPrisma.priceAlert.update).toHaveBeenCalledWith({
        where: { id: 'alert-1' },
        data: expect.objectContaining({
          isTriggered: true,
          triggeredAt: expect.any(Date),
          currentPrice: 430,
        }),
      });
    });

    it('should not trigger alerts when conditions are not met', async () => {
      mockPrisma.priceAlert.findMany.mockResolvedValue([
        {
          id: 'alert-1',
          productId: 'prod-1',
          targetPrice: 400,
          direction: 'below',
        },
      ]);
      mockPrisma.priceHistory.findFirst.mockResolvedValue({ price: 500 });
      mockPrisma.priceAlert.update.mockResolvedValue({});

      const result = await service.checkAlerts();

      expect(result.triggered).toBe(0);
      // Should still update currentPrice
      expect(mockPrisma.priceAlert.update).toHaveBeenCalledWith({
        where: { id: 'alert-1' },
        data: { currentPrice: 500 },
      });
    });

    it('should return 0 triggered when no active alerts exist', async () => {
      mockPrisma.priceAlert.findMany.mockResolvedValue([]);

      const result = await service.checkAlerts();

      expect(result.triggered).toBe(0);
    });
  });
});
