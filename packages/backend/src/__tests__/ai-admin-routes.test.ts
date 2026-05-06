/**
 * AI Admin Routes Integration Tests
 *
 * Tests all AI admin endpoints for correct behavior including:
 * - POST /ai-admin/insights — generate AI-powered admin dashboard insights
 * - Auth guard (401 without token)
 * - Admin-only access (403 for non-admin users)
 * - Service integration (AdminInsightsService)
 */

import request from 'supertest';
import express, { Application, Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';

// ==================== MOCKS ====================

// Mock logger before anything else
jest.mock('../utils/logger', () => ({
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

// Mock AdminInsightsService
const mockGenerateDashboardSummary = jest.fn();

jest.mock('../services/ai/admin-insights.service', () => ({
  AdminInsightsService: jest.fn(() => ({
    generateDashboardSummary: mockGenerateDashboardSummary,
  })),
}));

// Mock database client
const mockPrisma = {
  $disconnect: jest.fn(),
};

jest.mock('../database/client', () => ({
  prisma: mockPrisma,
}));

// Mock config
jest.mock('../config/app-config', () => ({
  config: {
    corsOrigins: ['http://localhost:3000'],
    env: 'test',
    port: 3000,
    version: '1.0.0',
    rateLimit: { maxRequests: 100 },
  },
}));

// Mock token blacklist
jest.mock('../auth/token-blacklist', () => ({
  getTokenBlacklist: jest.fn(() => ({
    addToBlacklist: jest.fn().mockResolvedValue(undefined),
    isBlacklisted: jest.fn().mockResolvedValue(false),
    isUserBlacklisted: jest.fn().mockResolvedValue(false),
  })),
  getTokenExpiration: jest.fn(() => new Date(Date.now() + 3600000)),
  getTokenIssuedAt: jest.fn(() => new Date()),
}));

// Mock JWT service
jest.mock('../auth/jwt.service', () => ({
  jwtService: {
    verifyAccessToken: jest.fn().mockReturnValue({
      userId: 'test-user-1',
      email: 'test@test.com',
      role: 'user',
    }),
    generateTokens: jest.fn(),
  },
}));

// ==================== AUTH MIDDLEWARE MOCK ====================

let currentTestUser: { userId: string; email: string; role: string } = {
  userId: 'test-user-1',
  email: 'test@test.com',
  role: 'user',
};

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
    authorize: (roles: string[]) => (req: any, _res: any, next: any) => {
      if (!req.user) {
        return next(new UnauthorizedError('Authentication required'));
      }
      if (!roles.includes(req.user.role)) {
        const { ForbiddenError } = require('@kitchenxpert/common');
        return next(new ForbiddenError('Access denied'));
      }
      next();
    },
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

// Mock rate limiters
jest.mock('../api/middleware/rate-limit-middleware', () => ({
  aiRateLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
  generalRateLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

// Import after mocks
import aiAdminRoutes from '../api/routes/ai-admin-routes';
import { errorHandler } from '../api/middleware/error-middleware';

// ==================== TEST APP SETUP ====================

function createTestApp(): Application {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/ai-admin', aiAdminRoutes);
  app.use(errorHandler);
  return app;
}

function authedRequest(app: Application) {
  return {
    get: (url: string) =>
      request(app).get(url).set('Cookie', ['accessToken=test-token']),
    post: (url: string) =>
      request(app).post(url).set('Cookie', ['accessToken=test-token']),
    put: (url: string) =>
      request(app).put(url).set('Cookie', ['accessToken=test-token']),
    delete: (url: string) =>
      request(app).delete(url).set('Cookie', ['accessToken=test-token']),
  };
}

// ==================== FIXTURES ====================

const mockInsightsSummary = {
  overview: 'Platform is growing steadily with 150 active users.',
  metrics: {
    totalUsers: 150,
    activeProjects: 42,
    generationsThisWeek: 89,
    avgDesignsPerProject: 3.2,
  },
  trends: [
    'User sign-ups increased 15% this month',
    'Modern style remains the most popular choice',
    'AI generation usage is up 23% week-over-week',
  ],
  recommendations: [
    'Consider adding farmhouse style templates to meet growing demand',
    'Optimize image generation for faster thumbnail delivery',
  ],
  alerts: [
    'Storage usage is approaching 80% capacity',
  ],
};

// ==================== TESTS ====================

describe('AI Admin Routes', () => {
  let app: Application;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    currentTestUser = { userId: 'test-user-1', email: 'test@test.com', role: 'user' };
  });

  // ==================== AUTH GUARD ====================

  describe('Authentication guard', () => {
    it('should return 401 for unauthenticated request to POST /ai-admin/insights', async () => {
      const response = await request(app)
        .post('/ai-admin/insights')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== ADMIN-ONLY ACCESS ====================

  describe('Admin-only access control', () => {
    it('should return 403 when a regular user tries to access insights', async () => {
      currentTestUser = { userId: 'test-user-1', email: 'test@test.com', role: 'user' };

      const response = await authedRequest(app)
        .post('/ai-admin/insights')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Admin access required');
    });

    it('should return 403 when a partner user tries to access insights', async () => {
      currentTestUser = { userId: 'partner-1', email: 'partner@test.com', role: 'partner' };

      const response = await authedRequest(app)
        .post('/ai-admin/insights')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Admin access required');
    });

    it('should return 403 when a moderator user tries to access insights', async () => {
      currentTestUser = { userId: 'mod-1', email: 'mod@test.com', role: 'moderator' };

      const response = await authedRequest(app)
        .post('/ai-admin/insights')
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== POST /ai-admin/insights ====================

  describe('POST /ai-admin/insights', () => {
    it('should return dashboard insights for admin user', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockGenerateDashboardSummary.mockResolvedValue(mockInsightsSummary);

      const response = await authedRequest(app)
        .post('/ai-admin/insights')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data.summary).toEqual(mockInsightsSummary);
    });

    it('should call service with admin userId', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockGenerateDashboardSummary.mockResolvedValue(mockInsightsSummary);

      await authedRequest(app)
        .post('/ai-admin/insights')
        .expect(200);

      expect(mockGenerateDashboardSummary).toHaveBeenCalledWith('admin-1');
    });

    it('should handle service errors gracefully', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockGenerateDashboardSummary.mockRejectedValue(new Error('AI insights service unavailable'));

      const response = await authedRequest(app)
        .post('/ai-admin/insights')
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should not call service when user is not admin', async () => {
      currentTestUser = { userId: 'test-user-1', email: 'test@test.com', role: 'user' };

      await authedRequest(app)
        .post('/ai-admin/insights')
        .expect(403);

      expect(mockGenerateDashboardSummary).not.toHaveBeenCalled();
    });

    it('should handle empty insights from service', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockGenerateDashboardSummary.mockResolvedValue({});

      const response = await authedRequest(app)
        .post('/ai-admin/insights')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary).toEqual({});
    });

    it('should handle string summary from service', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockGenerateDashboardSummary.mockResolvedValue('Simple text summary of dashboard metrics.');

      const response = await authedRequest(app)
        .post('/ai-admin/insights')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary).toBe('Simple text summary of dashboard metrics.');
    });

    it('should work with different admin userIds', async () => {
      currentTestUser = { userId: 'admin-99', email: 'superadmin@test.com', role: 'admin' };
      mockGenerateDashboardSummary.mockResolvedValue(mockInsightsSummary);

      const response = await authedRequest(app)
        .post('/ai-admin/insights')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockGenerateDashboardSummary).toHaveBeenCalledWith('admin-99');
    });

    it('should not leak internal error details in production-like responses', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockGenerateDashboardSummary.mockRejectedValue(new Error('Internal: Redis connection refused at 127.0.0.1:6379'));

      const response = await authedRequest(app)
        .post('/ai-admin/insights')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(JSON.stringify(response.body)).not.toContain('Redis connection refused');
    });

    it('should handle null return from service', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockGenerateDashboardSummary.mockResolvedValue(null);

      const response = await authedRequest(app)
        .post('/ai-admin/insights')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary).toBeNull();
    });

    it('should accept request without body (insights endpoint needs no input)', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockGenerateDashboardSummary.mockResolvedValue(mockInsightsSummary);

      const response = await authedRequest(app)
        .post('/ai-admin/insights')
        .send()
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle insights with alerts array', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      const summaryWithAlerts = {
        ...mockInsightsSummary,
        alerts: ['Critical: Database approaching storage limit', 'Warning: High API error rate detected'],
      };
      mockGenerateDashboardSummary.mockResolvedValue(summaryWithAlerts);

      const response = await authedRequest(app)
        .post('/ai-admin/insights')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary.alerts).toHaveLength(2);
    });

    it('should handle concurrent requests from same admin', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockGenerateDashboardSummary.mockResolvedValue(mockInsightsSummary);

      const [response1, response2] = await Promise.all([
        authedRequest(app).post('/ai-admin/insights'),
        authedRequest(app).post('/ai-admin/insights'),
      ]);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(mockGenerateDashboardSummary).toHaveBeenCalledTimes(2);
    });

    it('should verify the role check uses userId from req.user (not req.user.id)', async () => {
      // This test ensures we use req.user?.userId pattern, not req.user?.id
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockGenerateDashboardSummary.mockResolvedValue(mockInsightsSummary);

      await authedRequest(app)
        .post('/ai-admin/insights')
        .expect(200);

      // The service should be called with the userId (not id)
      expect(mockGenerateDashboardSummary).toHaveBeenCalledWith('admin-1');
    });
  });
});
