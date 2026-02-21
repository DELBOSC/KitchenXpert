/**
 * Abandonment Routes Integration Tests
 *
 * Tests all abandonment-related endpoints for correct behavior including:
 * - POST /abandonment/analyze — analyze session for abandonment signals
 * - GET /abandonment/stats — get abandonment statistics (admin only)
 * - Auth guard (401 without token, 403 for non-admin on stats)
 * - Validation (missing sessionData, missing events)
 * - Success responses with risk and intervention data
 */

import request from 'supertest';
import express, { Application, Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';

// ==================== MOCKS ====================

// Mock logger before anything else
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

// Mock AbandonmentDetectorService
const mockAnalyzeSession = jest.fn();
const mockGetIntervention = jest.fn();

jest.mock('../../services/analytics/abandonment-detector.service', () => ({
  AbandonmentDetectorService: jest.fn().mockImplementation(() => ({
    analyzeSession: mockAnalyzeSession,
    getIntervention: mockGetIntervention,
  })),
}));

// Mock database client
const mockPrisma = {
  $disconnect: jest.fn(),
};

jest.mock('../../database/client', () => ({
  prisma: mockPrisma,
}));

// Mock config
jest.mock('../../config/app-config', () => ({
  config: {
    corsOrigins: ['http://localhost:3000'],
    env: 'test',
    port: 3000,
    version: '1.0.0',
    rateLimit: { maxRequests: 100 },
  },
}));

// Mock token blacklist
jest.mock('../../auth/token-blacklist', () => ({
  getTokenBlacklist: jest.fn(() => ({
    addToBlacklist: jest.fn().mockResolvedValue(undefined),
    isBlacklisted: jest.fn().mockResolvedValue(false),
    isUserBlacklisted: jest.fn().mockResolvedValue(false),
  })),
  getTokenExpiration: jest.fn(() => new Date(Date.now() + 3600000)),
  getTokenIssuedAt: jest.fn(() => new Date()),
}));

// Mock JWT service
jest.mock('../../auth/jwt.service', () => ({
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

jest.mock('../../api/middleware/auth-middleware', () => {
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
jest.mock('../../api/middleware/rate-limit-middleware', () => ({
  generalRateLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

// Import after mocks
import abandonmentRoutes from '../../api/routes/abandonment-routes';
import { errorHandler } from '../../api/middleware/error-middleware';

// ==================== TEST APP SETUP ====================

function createTestApp(): Application {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/abandonment', abandonmentRoutes);
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

const mockLowRiskResult = {
  score: 0.2,
  level: 'low',
  factors: ['short_session'],
  suggestedIntervention: 'none',
};

const mockHighRiskResult = {
  score: 0.85,
  level: 'high',
  factors: ['price_comparison', 'long_idle', 'cart_abandonment'],
  suggestedIntervention: 'discount_popup',
};

const mockCriticalRiskResult = {
  score: 0.95,
  level: 'critical',
  factors: ['exit_intent', 'price_shock', 'repeated_comparison'],
  suggestedIntervention: 'live_chat',
};

const mockIntervention = {
  type: 'discount_popup',
  message: 'We noticed you are hesitating. Here is a 10% discount!',
  discountCode: 'SAVE10',
};

const mockSessionEvents = [
  { type: 'page_view', page: '/kitchens', timestamp: Date.now() - 60000 },
  { type: 'product_click', productId: 'p1', timestamp: Date.now() - 50000 },
  { type: 'price_comparison', products: ['p1', 'p2'], timestamp: Date.now() - 30000 },
  { type: 'idle', duration: 120, timestamp: Date.now() - 10000 },
];

const mockStatsResult = {
  totalSessionsAnalyzed: 1500,
  averageRiskScore: 0.45,
  riskDistribution: {
    low: 800,
    medium: 400,
    high: 200,
    critical: 100,
  },
  topRiskFactors: ['price_comparison', 'long_idle', 'cart_abandonment'],
  interventionsSent: 300,
  interventionConversionRate: 0.15,
};

// ==================== TESTS ====================

describe('Abandonment Routes', () => {
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
    it('should return 401 for unauthenticated request to POST /abandonment/analyze', async () => {
      const response = await request(app)
        .post('/abandonment/analyze')
        .send({ sessionData: { events: [] } })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 for unauthenticated request to GET /abandonment/stats', async () => {
      const response = await request(app)
        .get('/abandonment/stats')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 for non-admin user on GET /abandonment/stats', async () => {
      currentTestUser = { userId: 'test-user-1', email: 'test@test.com', role: 'user' };

      const response = await authedRequest(app)
        .get('/abandonment/stats')
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should allow regular user to POST /abandonment/analyze', async () => {
      mockAnalyzeSession.mockReturnValue(mockLowRiskResult);
      mockGetIntervention.mockReturnValue(null);

      const response = await authedRequest(app)
        .post('/abandonment/analyze')
        .send({ sessionData: { events: mockSessionEvents } })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  // ==================== POST /abandonment/analyze ====================

  describe('POST /abandonment/analyze', () => {
    it('should analyze session and return low risk with no intervention', async () => {
      mockAnalyzeSession.mockReturnValue(mockLowRiskResult);

      const response = await authedRequest(app)
        .post('/abandonment/analyze')
        .send({ sessionData: { events: mockSessionEvents } })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.risk).toEqual(mockLowRiskResult);
      expect(response.body.data.intervention).toBeNull();
      expect(mockAnalyzeSession).toHaveBeenCalledWith(mockSessionEvents);
    });

    it('should analyze session and return high risk with intervention', async () => {
      mockAnalyzeSession.mockReturnValue(mockHighRiskResult);
      mockGetIntervention.mockReturnValue(mockIntervention);

      const response = await authedRequest(app)
        .post('/abandonment/analyze')
        .send({ sessionData: { events: mockSessionEvents } })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.risk.level).toBe('high');
      expect(response.body.data.risk.score).toBe(0.85);
      expect(response.body.data.intervention).toEqual(mockIntervention);
      expect(mockGetIntervention).toHaveBeenCalledWith(mockHighRiskResult);
    });

    it('should analyze session and return critical risk with intervention', async () => {
      mockAnalyzeSession.mockReturnValue(mockCriticalRiskResult);
      mockGetIntervention.mockReturnValue({ type: 'live_chat', message: 'Need help?' });

      const response = await authedRequest(app)
        .post('/abandonment/analyze')
        .send({ sessionData: { events: mockSessionEvents } })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.risk.level).toBe('critical');
      expect(response.body.data.intervention).toBeTruthy();
    });

    it('should return 400 when sessionData is missing', async () => {
      const response = await authedRequest(app)
        .post('/abandonment/analyze')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('sessionData');
    });

    it('should return 400 when sessionData.events is not an array', async () => {
      const response = await authedRequest(app)
        .post('/abandonment/analyze')
        .send({ sessionData: { events: 'not-an-array' } })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('sessionData');
    });

    it('should return 400 when sessionData.events is missing', async () => {
      const response = await authedRequest(app)
        .post('/abandonment/analyze')
        .send({ sessionData: {} })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle empty events array', async () => {
      mockAnalyzeSession.mockReturnValue({
        score: 0,
        level: 'low',
        factors: [],
        suggestedIntervention: 'none',
      });

      const response = await authedRequest(app)
        .post('/abandonment/analyze')
        .send({ sessionData: { events: [] } })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.risk.score).toBe(0);
    });
  });

  // ==================== GET /abandonment/stats ====================

  describe('GET /abandonment/stats', () => {
    it('should return abandonment statistics for admin', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };

      const response = await authedRequest(app)
        .get('/abandonment/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalSessionsAnalyzed');
      expect(response.body.data).toHaveProperty('riskDistribution');
      expect(response.body.data).toHaveProperty('interventionsSent');
    });

    it('should return stats with correct structure', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };

      const response = await authedRequest(app)
        .get('/abandonment/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      const data = response.body.data;
      expect(data).toHaveProperty('averageRiskScore');
      expect(data.riskDistribution).toHaveProperty('low');
      expect(data.riskDistribution).toHaveProperty('medium');
      expect(data.riskDistribution).toHaveProperty('high');
      expect(data.riskDistribution).toHaveProperty('critical');
    });
  });

  // ==================== AUTHORIZATION PATTERNS ====================

  describe('Authorization patterns', () => {
    it('POST /analyze requires authentication but not admin', async () => {
      currentTestUser = { userId: 'regular-user', email: 'user@test.com', role: 'user' };
      mockAnalyzeSession.mockReturnValue(mockLowRiskResult);

      const response = await authedRequest(app)
        .post('/abandonment/analyze')
        .send({ sessionData: { events: [] } })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('GET /stats requires admin role', async () => {
      currentTestUser = { userId: 'test-user-1', email: 'test@test.com', role: 'user' };

      const response = await authedRequest(app)
        .get('/abandonment/stats')
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('GET /stats should succeed for admin', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };

      const response = await authedRequest(app)
        .get('/abandonment/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
