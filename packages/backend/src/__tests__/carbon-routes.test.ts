/**
 * Carbon Routes Integration Tests
 *
 * Tests all carbon footprint endpoints for correct behavior including:
 * - POST /carbon/calculate — calculate carbon footprint for a kitchen
 * - GET /carbon/report/:kitchenId — get saved carbon report
 * - GET /carbon/eco-score/:kitchenId — get eco score for a kitchen
 * - Auth guard (401 without token)
 * - IDOR prevention (ownership checks on carbon reports)
 * - Validation (missing kitchenId, empty items)
 * - Eco score grading logic (A-E grades)
 */

import cookieParser from 'cookie-parser';
import express, { type Application, type Request, type Response, type NextFunction } from 'express';
import request from 'supertest';

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

// Mock CarbonCalculatorService
const mockCalculateKitchenCarbon = jest.fn();

jest.mock('../services/sustainability/carbon-calculator.service', () => ({
  CarbonCalculatorService: jest.fn(() => ({
    calculateKitchenCarbon: mockCalculateKitchenCarbon,
  })),
}));

// Mock database client
const mockPrisma = {
  carbonReport: {
    upsert: jest.fn(),
    findUnique: jest.fn(),
  },
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
  generalRateLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

// Import after mocks
import { errorHandler } from '../api/middleware/error-middleware';
import carbonRoutes from '../api/routes/carbon-routes';

// ==================== TEST APP SETUP ====================

function createTestApp(): Application {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/carbon', carbonRoutes);
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

const validKitchenId = '550e8400-e29b-41d4-a716-446655440000';

const mockCarbonReport = {
  totalCO2e: 750,
  totalCarbonKg: 750,
  breakdown: [
    { material: 'wood', co2e: 300 },
    { material: 'steel', co2e: 450 },
  ],
  materialBreakdown: [
    { material: 'wood', percentage: 40 },
    { material: 'steel', percentage: 60 },
  ],
  recommendations: ['Consider bamboo alternatives'],
};

const mockItems = [
  { name: 'Cabinet', material: 'wood', weight: 30, quantity: 4 },
  { name: 'Countertop', material: 'granite', weight: 50, quantity: 1 },
];

const mockSavedReport = {
  id: 'report-1',
  kitchenId: validKitchenId,
  userId: 'test-user-1',
  // The new Prisma schema stores totalCO2kg/breakdown as columns, not
  // inside a JSON `data` blob — surface both fields directly.
  totalCO2kg: mockCarbonReport.totalCarbonKg,
  breakdown: mockCarbonReport.breakdown,
  data: JSON.stringify(mockCarbonReport),
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const otherUserReport = {
  id: 'report-2',
  kitchenId: validKitchenId,
  userId: 'other-user-99',
  data: JSON.stringify(mockCarbonReport),
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

// ==================== TESTS ====================

describe('Carbon Routes', () => {
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
    it('should return 401 for unauthenticated request to POST /carbon/calculate', async () => {
      const response = await request(app)
        .post('/carbon/calculate')
        .send({ kitchenId: validKitchenId, items: mockItems })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 for unauthenticated request to GET /carbon/report/:kitchenId', async () => {
      const response = await request(app)
        .get(`/carbon/report/${validKitchenId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 for unauthenticated request to GET /carbon/eco-score/:kitchenId', async () => {
      const response = await request(app)
        .get(`/carbon/eco-score/${validKitchenId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== POST /carbon/calculate ====================

  describe('POST /carbon/calculate', () => {
    it('should calculate carbon footprint successfully', async () => {
      mockCalculateKitchenCarbon.mockReturnValue(mockCarbonReport);
      mockPrisma.carbonReport.upsert.mockResolvedValue(mockSavedReport);

      const response = await authedRequest(app)
        .post('/carbon/calculate')
        .send({ kitchenId: validKitchenId, items: mockItems })
        .expect(200);

      expect(response.body.success).toBe(true);
      // /calculate returns the service output which uses totalCO2e
      expect(response.body.data).toHaveProperty('totalCO2e');
      expect(response.body.data).toHaveProperty('breakdown');
    });

    it('should return 400 when kitchenId is missing', async () => {
      const response = await authedRequest(app)
        .post('/carbon/calculate')
        .send({ items: mockItems })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(JSON.stringify(response.body)).toContain('kitchenId is required');
    });

    it('should return 400 when items array is missing', async () => {
      const response = await authedRequest(app)
        .post('/carbon/calculate')
        .send({ kitchenId: validKitchenId })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(JSON.stringify(response.body)).toContain('items array is required');
    });

    it('should return 400 when items array is empty', async () => {
      const response = await authedRequest(app)
        .post('/carbon/calculate')
        .send({ kitchenId: validKitchenId, items: [] })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(JSON.stringify(response.body)).toContain('items array is required');
    });

    it('should return 400 when items is not an array', async () => {
      const response = await authedRequest(app)
        .post('/carbon/calculate')
        .send({ kitchenId: validKitchenId, items: 'not-an-array' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should still succeed even if database persistence fails', async () => {
      mockCalculateKitchenCarbon.mockReturnValue(mockCarbonReport);
      mockPrisma.carbonReport.upsert.mockRejectedValue(new Error('DB error'));

      const response = await authedRequest(app)
        .post('/carbon/calculate')
        .send({ kitchenId: validKitchenId, items: mockItems })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalCO2e');
    });

    it('should persist the carbon report to the database', async () => {
      mockCalculateKitchenCarbon.mockReturnValue(mockCarbonReport);
      mockPrisma.carbonReport.upsert.mockResolvedValue(mockSavedReport);

      await authedRequest(app)
        .post('/carbon/calculate')
        .send({ kitchenId: validKitchenId, items: mockItems })
        .expect(200);

      expect(mockPrisma.carbonReport.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { kitchenId: validKitchenId },
          create: expect.objectContaining({
            kitchenId: validKitchenId,
            userId: 'test-user-1',
          }),
        })
      );
    });
  });

  // ==================== GET /carbon/report/:kitchenId ====================

  describe('GET /carbon/report/:kitchenId', () => {
    it('should return a saved carbon report', async () => {
      mockPrisma.carbonReport.findUnique.mockResolvedValue(mockSavedReport);

      const response = await authedRequest(app)
        .get(`/carbon/report/${validKitchenId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalCO2kg');
    });

    it('should return 404 when no report exists for kitchen', async () => {
      mockPrisma.carbonReport.findUnique.mockResolvedValue(null);

      const response = await authedRequest(app)
        .get(`/carbon/report/${validKitchenId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(JSON.stringify(response.body)).toContain('Carbon report not found');
    });

    it('should return 403 when trying to access another user\'s report (IDOR prevention)', async () => {
      mockPrisma.carbonReport.findUnique.mockResolvedValue(otherUserReport);

      const response = await authedRequest(app)
        .get(`/carbon/report/${validKitchenId}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(JSON.stringify(response.body)).toContain('do not have access');
    });

    it('should allow admin to access any report', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockPrisma.carbonReport.findUnique.mockResolvedValue(otherUserReport);

      const response = await authedRequest(app)
        .get(`/carbon/report/${validKitchenId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 400 for invalid kitchenId format (not UUID)', async () => {
      const response = await authedRequest(app)
        .get('/carbon/report/not-a-valid-uuid')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== GET /carbon/eco-score/:kitchenId ====================

  describe('GET /carbon/eco-score/:kitchenId', () => {
    it('should return eco score with grade A for low carbon kitchen', async () => {
      const lowCarbonReport = {
        ...mockSavedReport,
        totalCO2kg: 300,
        breakdown: [],
        data: JSON.stringify({ totalCarbonKg: 300, breakdown: [] }),
      };
      mockPrisma.carbonReport.findUnique.mockResolvedValue(lowCarbonReport);

      const response = await authedRequest(app)
        .get(`/carbon/eco-score/${validKitchenId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.grade).toBe('A');
      expect(response.body.data.ecoScore).toBeGreaterThanOrEqual(90);
    });

    it('should return eco score with grade B for moderate carbon kitchen', async () => {
      const moderateCarbonReport = {
        ...mockSavedReport,
        totalCO2kg: 750,
        breakdown: [],
        data: JSON.stringify({ totalCarbonKg: 750, breakdown: [] }),
      };
      mockPrisma.carbonReport.findUnique.mockResolvedValue(moderateCarbonReport);

      const response = await authedRequest(app)
        .get(`/carbon/eco-score/${validKitchenId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.grade).toBe('B');
      expect(response.body.data.ecoScore).toBeGreaterThanOrEqual(70);
    });

    it('should return eco score with grade C for higher carbon kitchen', async () => {
      const higherCarbonReport = {
        ...mockSavedReport,
        totalCO2kg: 1500,
        breakdown: [],
        data: JSON.stringify({ totalCarbonKg: 1500, breakdown: [] }),
      };
      mockPrisma.carbonReport.findUnique.mockResolvedValue(higherCarbonReport);

      const response = await authedRequest(app)
        .get(`/carbon/eco-score/${validKitchenId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.grade).toBe('C');
    });

    it('should return eco score with grade D for high carbon kitchen', async () => {
      const highCarbonReport = {
        ...mockSavedReport,
        totalCO2kg: 2500,
        breakdown: [],
        data: JSON.stringify({ totalCarbonKg: 2500, breakdown: [] }),
      };
      mockPrisma.carbonReport.findUnique.mockResolvedValue(highCarbonReport);

      const response = await authedRequest(app)
        .get(`/carbon/eco-score/${validKitchenId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.grade).toBe('D');
    });

    it('should return eco score with grade E for very high carbon kitchen', async () => {
      const veryHighCarbonReport = {
        ...mockSavedReport,
        totalCO2kg: 5000,
        breakdown: [],
        data: JSON.stringify({ totalCarbonKg: 5000, breakdown: [] }),
      };
      mockPrisma.carbonReport.findUnique.mockResolvedValue(veryHighCarbonReport);

      const response = await authedRequest(app)
        .get(`/carbon/eco-score/${validKitchenId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.grade).toBe('E');
    });

    it('should return null eco score when no carbon report exists', async () => {
      mockPrisma.carbonReport.findUnique.mockResolvedValue(null);

      const response = await authedRequest(app)
        .get(`/carbon/eco-score/${validKitchenId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.ecoScore).toBeNull();
      expect(response.body.data.grade).toBeNull();
      expect(response.body.data.message).toContain('No carbon report available');
    });

    it('should return 403 when trying to access another user\'s eco score (IDOR prevention)', async () => {
      mockPrisma.carbonReport.findUnique.mockResolvedValue(otherUserReport);

      const response = await authedRequest(app)
        .get(`/carbon/eco-score/${validKitchenId}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(JSON.stringify(response.body)).toContain('do not have access');
    });

    it('should allow admin to access any eco score', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockPrisma.carbonReport.findUnique.mockResolvedValue(otherUserReport);

      const response = await authedRequest(app)
        .get(`/carbon/eco-score/${validKitchenId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 400 for invalid kitchenId format (not UUID)', async () => {
      const response = await authedRequest(app)
        .get('/carbon/eco-score/not-a-valid-uuid')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle report data with "total" field instead of "totalCarbonKg"', async () => {
      const alternateReport = {
        ...mockSavedReport,
        totalCO2kg: 400,
        breakdown: [],
        data: JSON.stringify({ total: 400, breakdown: [] }),
      };
      mockPrisma.carbonReport.findUnique.mockResolvedValue(alternateReport);

      const response = await authedRequest(app)
        .get(`/carbon/eco-score/${validKitchenId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.grade).toBe('A');
      expect(response.body.data.totalCarbonKg).toBe(400);
    });

    it('should clamp eco score between 0 and 100', async () => {
      // Very low carbon should still cap at 100
      const ultraLowCarbonReport = {
        ...mockSavedReport,
        data: JSON.stringify({ totalCarbonKg: 0, breakdown: [] }),
      };
      mockPrisma.carbonReport.findUnique.mockResolvedValue(ultraLowCarbonReport);

      const response = await authedRequest(app)
        .get(`/carbon/eco-score/${validKitchenId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.ecoScore).toBeLessThanOrEqual(100);
      expect(response.body.data.ecoScore).toBeGreaterThanOrEqual(0);
    });
  });
});
