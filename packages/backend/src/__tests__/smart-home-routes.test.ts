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

const mockCreatePlan = vi.fn();
const mockGetPlan = vi.fn();
const mockUpdatePlan = vi.fn();
const mockGetDeviceCatalog = vi.fn();
const mockCalculateCoverage = vi.fn();

vi.mock('../../services/smart-home/smart-home.service', () => ({
  SmartHomeService: vi.fn().mockImplementation(() => ({
    createPlan: mockCreatePlan,
    getPlan: mockGetPlan,
    updatePlan: mockUpdatePlan,
    getDeviceCatalog: mockGetDeviceCatalog,
    calculateCoverage: mockCalculateCoverage,
  })),
}));

const mockPrisma = {
  $disconnect: vi.fn(),
  kitchen: { findUnique: vi.fn() },
};

vi.mock('../../database/client', () => ({ prisma: mockPrisma }));

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

import smartHomeRoutes from '../../api/routes/smart-home-routes';
import { errorHandler } from '../../api/middleware/error-middleware';

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
    vi.clearAllMocks();
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
      expect(response.body.error).toContain('Kitchen not found');
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
      expect(response.body.error).toContain('Smart home plan not found');
    });

    it('should return 401 when user is not authenticated', async () => {
      const response = await request(app)
        .get(`/smart-home/${validKitchenId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
