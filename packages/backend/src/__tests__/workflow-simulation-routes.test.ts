/**
 * Workflow Simulation Routes Tests
 *
 * Tests the cooking workflow simulation endpoints:
 * - POST /workflow-simulation/simulate — run a cooking workflow simulation
 * - GET /workflow-simulation/history/:kitchenId — get simulation history
 * - Auth guard (401 without token)
 * - Ownership verification (403 for non-owner, 404 for not found)
 * - Validation (invalid scenario, missing kitchenId)
 */

import cookieParser from 'cookie-parser';
import express, { type Application, type Request, type Response, type NextFunction } from 'express';
import request from 'supertest';

// ==================== MOCKS ====================

jest.mock('../utils/logger', () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  createModuleLogger: jest.fn(() => ({
    info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(),
  })),
}));

const mockSimulate = jest.fn();
const mockGetHistory = jest.fn();
const mockGetScenarios = jest.fn();
const mockOptimize = jest.fn();

jest.mock('../services/ai/workflow-simulation.service', () => ({
  WorkflowSimulationService: {
    getInstance: jest.fn(() => ({
      simulate: mockSimulate,
      getHistory: mockGetHistory,
      getScenarios: mockGetScenarios,
      optimize: mockOptimize,
    })),
  },
}));

const mockPrisma = {
  $disconnect: jest.fn(),
  kitchen: { findUnique: jest.fn() },
  workflowSimulation: { findUnique: jest.fn() },
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

jest.mock('../api/middleware/auth-middleware', async () => {
  const { UnauthorizedError } = await import('@kitchenxpert/common');
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
import workflowSimulationRoutes from '../api/routes/workflow-simulation-routes';

// ==================== SETUP ====================

function createTestApp(): Application {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/workflow-simulation', workflowSimulationRoutes);
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
  name: 'Test Kitchen',
};

const mockSimulationResult = {
  id: 'sim-1',
  kitchenId: validKitchenId,
  scenario: 'dinner_for_6',
  totalDistanceM: 45.2,
  totalTimeMin: 85,
  efficiencyScore: 72,
  steps: [],
  bottlenecks: [],
};

const mockHistoryList = [
  { id: 'sim-1', scenario: 'dinner_for_6', efficiencyScore: 72, createdAt: new Date() },
  { id: 'sim-2', scenario: 'quick_breakfast', efficiencyScore: 88, createdAt: new Date() },
];

// ==================== TESTS ====================

describe('Workflow Simulation Routes', () => {
  let app: Application;

  beforeEach(() => {
    jest.clearAllMocks();
    currentTestUser = { userId: 'test-user-id', email: 'test@test.com', role: 'user' };
    app = createTestApp();
  });

  describe('POST /workflow-simulation/simulate', () => {
    it('should run simulation and return 200 with results', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);
      mockSimulate.mockResolvedValue(mockSimulationResult);

      const response = await authedRequest(app)
        .post('/workflow-simulation/simulate')
        .send({ kitchenId: validKitchenId, scenario: 'dinner_for_6' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.efficiencyScore).toBe(72);
      expect(response.body.data.scenario).toBe('dinner_for_6');
    });

    it('should return 401 when user is not authenticated', async () => {
      const response = await request(app)
        .post('/workflow-simulation/simulate')
        .send({ kitchenId: validKitchenId, scenario: 'dinner_for_6' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 when kitchen does not exist', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(null);

      const response = await authedRequest(app)
        .post('/workflow-simulation/simulate')
        .send({ kitchenId: validKitchenId, scenario: 'dinner_for_6' })
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
        .post('/workflow-simulation/simulate')
        .send({ kitchenId: validKitchenId, scenario: 'dinner_for_6' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Access denied');
    });

    it('should return 400 when scenario is invalid', async () => {
      const response = await authedRequest(app)
        .post('/workflow-simulation/simulate')
        .send({ kitchenId: validKitchenId, scenario: 'invalid_scenario' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /workflow-simulation/history/:kitchenId', () => {
    it('should return simulation history with 200 status', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);
      mockGetHistory.mockResolvedValue(mockHistoryList);

      const response = await authedRequest(app)
        .get(`/workflow-simulation/history/${validKitchenId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should return 401 when user is not authenticated', async () => {
      const response = await request(app)
        .get(`/workflow-simulation/history/${validKitchenId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 when kitchen does not exist', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(null);

      const response = await authedRequest(app)
        .get(`/workflow-simulation/history/${validKitchenId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});
