/**
 * Financing Routes Tests
 *
 * Tests the financing simulation and eco-aids endpoints:
 * - POST /financing/simulate — run financing simulation
 * - POST /financing/eco-aids — calculate eco aids eligibility
 * - Auth guard (401 without token)
 * - Validation (invalid amounts, missing fields)
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

const mockSimulate = vi.fn();
const mockCalculateEcoAids = vi.fn();
const mockGetProviders = vi.fn();

vi.mock('../../services/financing/financing.service', () => ({
  financingService: {
    simulate: mockSimulate,
    calculateEcoAids: mockCalculateEcoAids,
    getProviders: mockGetProviders,
    getMySimulations: vi.fn(),
    getSimulationById: vi.fn(),
    getAIBudgetAdvice: vi.fn(),
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

import financingRoutes from '../../api/routes/financing-routes';
import { errorHandler } from '../../api/middleware/error-middleware';

// ==================== SETUP ====================

function createTestApp(): Application {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/financing', financingRoutes);
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

const mockSimulationResult = {
  id: 'sim-1',
  providers: [
    { name: 'Sofinco', rate: 3.9, durations: [{ months: 36, monthly: 295.50, totalCost: 10638 }] },
    { name: 'Cetelem', rate: 4.2, durations: [{ months: 36, monthly: 298.20, totalCost: 10735 }] },
  ],
};

const mockEcoAidsResult = {
  maprimerenov: { eligible: true, amount: 3000 },
  cee: { eligible: true, amount: 800 },
  tvaReduite: { eligible: true, rate: 5.5 },
  ecoPTZ: { eligible: false, amount: 0 },
  totalAids: 3800,
};

// ==================== TESTS ====================

describe('Financing Routes', () => {
  let app: Application;

  beforeEach(() => {
    vi.clearAllMocks();
    currentTestUser = { userId: 'test-user-id', email: 'test@test.com', role: 'user' };
    app = createTestApp();
  });

  describe('POST /financing/simulate', () => {
    it('should return simulation results with 200 status', async () => {
      mockSimulate.mockResolvedValue(mockSimulationResult);

      const response = await authedRequest(app)
        .post('/financing/simulate')
        .send({ totalAmount: 15000, downPayment: 5000 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.providers).toHaveLength(2);
      expect(mockSimulate).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({ totalAmount: 15000, downPayment: 5000 }),
      );
    });

    it('should return 401 when user is not authenticated', async () => {
      const response = await request(app)
        .post('/financing/simulate')
        .send({ totalAmount: 15000, downPayment: 5000 })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when downPayment exceeds totalAmount', async () => {
      const response = await authedRequest(app)
        .post('/financing/simulate')
        .send({ totalAmount: 5000, downPayment: 10000 })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when totalAmount is missing', async () => {
      const response = await authedRequest(app)
        .post('/financing/simulate')
        .send({ downPayment: 5000 })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /financing/eco-aids', () => {
    it('should return eco aids calculation with 200 status', async () => {
      mockCalculateEcoAids.mockResolvedValue(mockEcoAidsResult);

      const response = await authedRequest(app)
        .post('/financing/eco-aids')
        .send({
          totalAmount: 20000,
          incomeBracket: 'modeste',
          householdSize: 3,
          equipmentTypes: ['pompe_a_chaleur', 'isolation_murs'],
          isRenovation: true,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalAids).toBe(3800);
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await authedRequest(app)
        .post('/financing/eco-aids')
        .send({ totalAmount: 20000 })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when incomeBracket has invalid value', async () => {
      const response = await authedRequest(app)
        .post('/financing/eco-aids')
        .send({
          totalAmount: 20000,
          incomeBracket: 'invalid_bracket',
          householdSize: 3,
          equipmentTypes: ['pompe_a_chaleur'],
          isRenovation: true,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
