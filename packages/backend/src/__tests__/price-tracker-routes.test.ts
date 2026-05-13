/**
 * Price Tracker Routes Tests
 *
 * Tests the price tracking and alerts endpoints:
 * - GET /price-tracker/history/:productId — get price history
 * - POST /price-tracker/alerts — create price alert
 * - Auth guard (401 without token)
 * - Validation (missing productId, invalid alert data)
 */

import cookieParser from 'cookie-parser';
import express, { type Application, type Request, type Response, type NextFunction } from 'express';
import request from 'supertest';

// ==================== MOCKS ====================

jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  createModuleLogger: jest.fn(() => ({
    info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(),
  })),
}));

const mockGetHistory = jest.fn();
const mockCreateAlert = jest.fn();
const mockGetAlerts = jest.fn();
const mockDeleteAlert = jest.fn();
const mockGetTrends = jest.fn();
const mockGetBestTimeToBuy = jest.fn();

jest.mock('../services/price-tracker/price-tracker.service', () => ({
  priceTrackerService: {
    getHistory: mockGetHistory,
    createAlert: mockCreateAlert,
    getAlerts: mockGetAlerts,
    deleteAlert: mockDeleteAlert,
    getTrends: mockGetTrends,
    getBestTimeToBuy: mockGetBestTimeToBuy,
  },
}));

jest.mock('../database/client', () => ({ prisma: { $disconnect: jest.fn() } }));

jest.mock('../config/app-config', () => ({
  config: { corsOrigins: ['http://localhost:3000'], env: 'test', port: 3000, version: '1.0.0', rateLimit: { maxRequests: 100 } },
}));

jest.mock('../auth/token-blacklist', () => ({
  getTokenBlacklist: jest.fn(() => ({
    addToBlacklist: jest.fn().mockResolvedValue(undefined),
    isBlacklisted: jest.fn().mockResolvedValue(false),
    isUserBlacklisted: jest.fn().mockResolvedValue(false),
  })),
  getTokenExpiration: jest.fn(() => new Date(Date.now() + 3600000)),
  getTokenIssuedAt: jest.fn(() => new Date()),
}));

jest.mock('../auth/jwt.service', () => ({
  jwtService: {
    verifyAccessToken: jest.fn().mockReturnValue({
      userId: 'test-user-id', email: 'test@test.com', role: 'user',
    }),
    generateTokens: jest.fn(),
  },
}));

let currentTestUser = { userId: 'test-user-id', email: 'test@test.com', role: 'user' };

jest.mock('../api/middleware/auth-middleware', () => {
  const { UnauthorizedError } = require('@kitchenxpert/common');
  return {
    authenticate: jest.fn((req: any, _res: any, next: any) => {
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

jest.mock('../api/middleware/rate-limit-middleware', () => ({
  generalRateLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

import { errorHandler } from '../api/middleware/error-middleware';
import priceTrackerRoutes from '../api/routes/price-tracker-routes';

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
    jest.clearAllMocks();
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
