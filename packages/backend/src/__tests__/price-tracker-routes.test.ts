/**
 * Price Tracker Routes Tests
 *
 * Tests the price tracking and alerts endpoints:
 * - GET /price-tracker/history/:productId — get price history
 * - POST /price-tracker/alerts — create price alert
 * - Auth guard (401 without token)
 * - Validation (missing productId, invalid alert data)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express, { type Application, type Request, type Response, type NextFunction } from 'express';
import cookieParser from 'cookie-parser';

// ==================== MOCKS ====================

vi.mock('../../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  createModuleLogger: vi.fn(() => ({
    info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
  })),
}));

const mockGetHistory = vi.fn();
const mockCreateAlert = vi.fn();
const mockGetAlerts = vi.fn();
const mockDeleteAlert = vi.fn();
const mockGetTrends = vi.fn();
const mockGetBestTimeToBuy = vi.fn();

vi.mock('../../services/price-tracker/price-tracker.service', () => ({
  priceTrackerService: {
    getHistory: mockGetHistory,
    createAlert: mockCreateAlert,
    getAlerts: mockGetAlerts,
    deleteAlert: mockDeleteAlert,
    getTrends: mockGetTrends,
    getBestTimeToBuy: mockGetBestTimeToBuy,
  },
}));

vi.mock('../../database/client', () => ({ prisma: { $disconnect: vi.fn() } }));

vi.mock('../../config/app-config', () => ({
  config: { corsOrigins: ['http://localhost:3000'], env: 'test', port: 3000, version: '1.0.0', rateLimit: { maxRequests: 100 } },
}));

vi.mock('../../auth/token-blacklist', () => ({
  getTokenBlacklist: vi.fn(() => ({
    addToBlacklist: vi.fn().mockResolvedValue(undefined),
    isBlacklisted: vi.fn().mockResolvedValue(false),
    isUserBlacklisted: vi.fn().mockResolvedValue(false),
  })),
  getTokenExpiration: vi.fn(() => new Date(Date.now() + 3600000)),
  getTokenIssuedAt: vi.fn(() => new Date()),
}));

vi.mock('../../auth/jwt.service', () => ({
  jwtService: {
    verifyAccessToken: vi.fn().mockReturnValue({
      userId: 'test-user-id', email: 'test@test.com', role: 'user',
    }),
    generateTokens: vi.fn(),
  },
}));

let currentTestUser = { userId: 'test-user-id', email: 'test@test.com', role: 'user' };

vi.mock('../../api/middleware/auth-middleware', async () => {
  const { UnauthorizedError } = await import('@kitchenxpert/common');
  return {
    authenticate: vi.fn((req: any, _res: any, next: any) => {
      if (req.cookies?.accessToken || req.headers.authorization) {
        req.user = { ...currentTestUser };
        next();
      } else {
        next(new UnauthorizedError('Authentication required'));
      }
    }),
    authorize: () => (_req: any, _res: any, next: any) => next(),
    requireRole: () => (_req: any, _res: any, next: any) => next(),
  };
});

vi.mock('../../api/middleware/rate-limit-middleware', () => ({
  generalRateLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

import priceTrackerRoutes from '../../api/routes/price-tracker-routes';
import { errorHandler } from '../../api/middleware/error-middleware';

// ==================== SETUP ====================

function createTestApp(): Application {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/price-tracker', priceTrackerRoutes);
  app.use(errorHandler);
  return app;
}

function authedRequest(app: Application) {
  return {
    get: (url: string) => request(app).get(url).set('Cookie', ['accessToken=test-token']),
    post: (url: string) => request(app).post(url).set('Cookie', ['accessToken=test-token']),
    delete: (url: string) => request(app).delete(url).set('Cookie', ['accessToken=test-token']),
  };
}

// ==================== FIXTURES ====================

const mockPriceHistory = {
  productId: 'product-abc',
  entries: [
    { date: '2024-06-01', price: 149.99 },
    { date: '2024-07-01', price: 139.99 },
    { date: '2024-08-01', price: 129.99 },
  ],
};

const mockAlert = {
  id: 'alert-1',
  userId: 'test-user-id',
  productId: 'product-abc',
  targetPrice: 120,
  direction: 'below',
  active: true,
};

// ==================== TESTS ====================

describe('Price Tracker Routes', () => {
  let app: Application;

  beforeEach(() => {
    vi.clearAllMocks();
    currentTestUser = { userId: 'test-user-id', email: 'test@test.com', role: 'user' };
    app = createTestApp();
  });

  describe('GET /price-tracker/history/:productId', () => {
    it('should return price history with 200 status', async () => {
      mockGetHistory.mockResolvedValue(mockPriceHistory);

      const response = await authedRequest(app)
        .get('/price-tracker/history/product-abc')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.productId).toBe('product-abc');
      expect(response.body.data.entries).toHaveLength(3);
    });

    it('should return 401 when user is not authenticated', async () => {
      const response = await request(app)
        .get('/price-tracker/history/product-abc')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should pass optional days query param to the service', async () => {
      mockGetHistory.mockResolvedValue(mockPriceHistory);

      await authedRequest(app)
        .get('/price-tracker/history/product-abc?days=30')
        .expect(200);

      expect(mockGetHistory).toHaveBeenCalledWith('product-abc', 30);
    });
  });

  describe('POST /price-tracker/alerts', () => {
    it('should create alert and return 201 status', async () => {
      mockCreateAlert.mockResolvedValue(mockAlert);

      const response = await authedRequest(app)
        .post('/price-tracker/alerts')
        .send({ productId: 'product-abc', targetPrice: 120, direction: 'below' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.targetPrice).toBe(120);
      expect(response.body.message).toContain('Price alert created');
    });

    it('should return 401 when user is not authenticated', async () => {
      const response = await request(app)
        .post('/price-tracker/alerts')
        .send({ productId: 'product-abc', targetPrice: 120, direction: 'below' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await authedRequest(app)
        .post('/price-tracker/alerts')
        .send({ productId: 'product-abc' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when direction has invalid value', async () => {
      const response = await authedRequest(app)
        .post('/price-tracker/alerts')
        .send({ productId: 'product-abc', targetPrice: 120, direction: 'invalid' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
