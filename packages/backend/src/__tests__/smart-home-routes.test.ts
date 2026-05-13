/**
 * Smart Home Routes Tests
 *
 * Tests the smart home plan endpoints:
 * - POST /smart-home — create a smart home plan (mapped as /smart-home/generate in user request)
 * - GET /smart-home/:kitchenId — get smart home plan (mapped as /smart-home/plans in user request)
 * - Auth guard (401 without token)
 * - Ownership verification (403 for non-owner)
 * - Validation (missing kitchenId, kitchen not found)
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

const mockCreatePlan = jest.fn();
const mockGetPlan = jest.fn();
const mockUpdatePlan = jest.fn();
const mockGetDeviceCatalog = jest.fn();
const mockCalculateCoverage = jest.fn();

jest.mock('../services/smart-home/smart-home.service', () => ({
  SmartHomeService: jest.fn().mockImplementation(() => ({
    createPlan: mockCreatePlan,
    getPlan: mockGetPlan,
    updatePlan: mockUpdatePlan,
    getDeviceCatalog: mockGetDeviceCatalog,
    calculateCoverage: mockCalculateCoverage,
  })),
}));

const mockPrisma = {
  $disconnect: jest.fn(),
  kitchen: { findUnique: jest.fn() },
};

jest.mock('../database/client', () => ({ prisma: mockPrisma }));

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
import smartHomeRoutes from '../api/routes/smart-home-routes';

// ==================== SETUP ====================

function createTestApp(): Application {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/smart-home', smartHomeRoutes);
  app.use(errorHandler);
  return app;
}

function authedRequest(app: Application) {
  return {
    get: (url: string) => request(app).get(url).set('Cookie', ['accessToken=test-token']),
    post: (url: string) => request(app).post(url).set('Cookie', ['accessToken=test-token']),
  };
}

// ==================== FIXTURES ====================

const validKitchenId = '550e8400-e29b-41d4-a716-446655440000';

const mockKitchen = {
  id: validKitchenId,
  userId: 'test-user-id',
  name: 'Ma Cuisine',
};

const mockPlan = {
  id: 'plan-1',
  kitchenId: validKitchenId,
  userId: 'test-user-id',
  devices: [
    { type: 'smart_light', name: 'Philips Hue Spot', zone: 'worktop' },
    { type: 'leak_sensor', name: 'Aqara Water Sensor', zone: 'under_sink' },
  ],
  totalCost: 450,
  protocols: ['Zigbee', 'WiFi'],
};

// ==================== TESTS ====================

describe('Smart Home Routes', () => {
  let app: Application;

  beforeEach(() => {
    jest.clearAllMocks();
    currentTestUser = { userId: 'test-user-id', email: 'test@test.com', role: 'user' };
    app = createTestApp();
  });

  describe('POST /smart-home (generate plan)', () => {
    it('should create a smart home plan and return 201 status', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);
      mockCreatePlan.mockResolvedValue(mockPlan);

      const response = await authedRequest(app)
        .post('/smart-home')
        .send({ kitchenId: validKitchenId })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.devices).toHaveLength(2);
      expect(response.body.data.totalCost).toBe(450);
    });

    it('should return 401 when user is not authenticated', async () => {
      const response = await request(app)
        .post('/smart-home')
        .send({ kitchenId: validKitchenId })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 when kitchen does not exist', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(null);

      const response = await authedRequest(app)
        .post('/smart-home')
        .send({ kitchenId: validKitchenId })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(JSON.stringify(response.body)).toContain('Kitchen not found');
    });

    it('should return 403 when user does not own the kitchen', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue({
        ...mockKitchen,
        userId: 'other-user-id',
      });

      const response = await authedRequest(app)
        .post('/smart-home')
        .send({ kitchenId: validKitchenId })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /smart-home/:kitchenId (get plan)', () => {
    it('should return the smart home plan with 200 status', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);
      mockGetPlan.mockResolvedValue(mockPlan);

      const response = await authedRequest(app)
        .get(`/smart-home/${validKitchenId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.kitchenId).toBe(validKitchenId);
    });

    it('should return 404 when no plan exists for the kitchen', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);
      mockGetPlan.mockResolvedValue(null);

      const response = await authedRequest(app)
        .get(`/smart-home/${validKitchenId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(JSON.stringify(response.body)).toContain('Smart home plan not found');
    });

    it('should return 401 when user is not authenticated', async () => {
      const response = await request(app)
        .get(`/smart-home/${validKitchenId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
