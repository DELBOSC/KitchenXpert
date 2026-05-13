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

const mockCheckKitchenCompliance = jest.fn();
const mockGetCheckHistory = jest.fn();
const mockGetRules = jest.fn();
const mockGetRulesByCode = jest.fn();
const mockSeedDefaultRules = jest.fn();

jest.mock('../services/compliance/compliance.service', () => ({
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

// compliance-routes imports auth from ../../middleware/auth-middleware,
// NOT from ../api/middleware/auth-middleware. Mock BOTH paths since
// hoisting makes function references unavailable.
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
jest.mock('../middleware/auth-middleware', () => {
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

jest.mock('../api/middleware/rate-limit-middleware', () => ({
  generalRateLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

import { errorHandler } from '../api/middleware/error-middleware';
import complianceRoutes from '../api/routes/compliance-routes';

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
    jest.clearAllMocks();
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
      expect(JSON.stringify(response.body)).toContain('Access denied');
    });

    it('should return 404 when kitchen is not found', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(null);

      const response = await authedRequest(app)
        .post(`/compliance/check/${validKitchenId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(JSON.stringify(response.body)).toContain('Kitchen not found');
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
