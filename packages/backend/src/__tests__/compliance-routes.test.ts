/**
 * Compliance Routes Tests
 *
 * Tests the building code compliance endpoints:
 * - POST /compliance/check/:kitchenId — run compliance check
 * - GET /compliance/history/:kitchenId — get check history
 * - Auth guard (401 without token)
 * - Ownership verification (403 for non-owner)
 * - Validation (invalid kitchenId format)
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

const mockCheckKitchenCompliance = vi.fn();
const mockGetCheckHistory = vi.fn();
const mockGetRules = vi.fn();
const mockGetRulesByCode = vi.fn();
const mockSeedDefaultRules = vi.fn();

vi.mock('../../services/compliance/compliance.service', () => ({
  complianceService: {
    checkKitchenCompliance: mockCheckKitchenCompliance,
    getCheckHistory: mockGetCheckHistory,
    getRules: mockGetRules,
    getRulesByCode: mockGetRulesByCode,
    seedDefaultRules: mockSeedDefaultRules,
  },
  ComplianceServiceError: class ComplianceServiceError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
    }
  },
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
    requireRole: (...roles: string[]) => (req: any, _res: any, next: any) => {
      if (!req.user) {
        return next(new UnauthorizedError('Authentication required'));
      }
      if (!roles.includes(req.user.role)) {
        const { ForbiddenError } = require('@kitchenxpert/common');
        return next(new ForbiddenError('Access denied'));
      }
      next();
    },
  };
});

vi.mock('../../api/middleware/rate-limit-middleware', () => ({
  generalRateLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

import complianceRoutes from '../../api/routes/compliance-routes';
import { errorHandler } from '../../api/middleware/error-middleware';

// ==================== SETUP ====================

function createTestApp(): Application {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/compliance', complianceRoutes);
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

const mockComplianceResult = {
  status: 'passed',
  totalRules: 10,
  passedRules: 10,
  failedRules: 0,
  warningRules: 0,
  results: [],
};

const mockHistory = [
  { id: 'check-1', kitchenId: validKitchenId, status: 'passed', createdAt: new Date() },
  { id: 'check-2', kitchenId: validKitchenId, status: 'failed', createdAt: new Date() },
];

// ==================== TESTS ====================

describe('Compliance Routes', () => {
  let app: Application;

  beforeEach(() => {
    vi.clearAllMocks();
    currentTestUser = { userId: 'test-user-id', email: 'test@test.com', role: 'user' };
    app = createTestApp();
  });

  describe('POST /compliance/check/:kitchenId', () => {
    it('should run compliance check and return 200 with results', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);
      mockCheckKitchenCompliance.mockResolvedValue(mockComplianceResult);

      const response = await authedRequest(app)
        .post(`/compliance/check/${validKitchenId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('passed');
      expect(mockCheckKitchenCompliance).toHaveBeenCalledWith(validKitchenId, 'test-user-id');
    });

    it('should return 401 when user is not authenticated', async () => {
      const response = await request(app)
        .post(`/compliance/check/${validKitchenId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 when user does not own the kitchen', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue({
        ...mockKitchen,
        userId: 'other-user-id',
      });

      const response = await authedRequest(app)
        .post(`/compliance/check/${validKitchenId}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Access denied');
    });

    it('should return 404 when kitchen is not found', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(null);

      const response = await authedRequest(app)
        .post(`/compliance/check/${validKitchenId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Kitchen not found');
    });
  });

  describe('GET /compliance/history/:kitchenId', () => {
    it('should return compliance check history with 200 status', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);
      mockGetCheckHistory.mockResolvedValue(mockHistory);

      const response = await authedRequest(app)
        .get(`/compliance/history/${validKitchenId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta.total).toBe(2);
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .get(`/compliance/history/${validKitchenId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 when kitchen does not exist', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(null);

      const response = await authedRequest(app)
        .get(`/compliance/history/${validKitchenId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});
