/**
 * AI Recommendation Routes Integration Tests
 *
 * Tests all AI product recommendation endpoints for correct behavior including:
 * - POST /ai-recommendations/complementary — get AI-powered complementary product recommendations
 * - Auth guard (401 without token)
 * - Validation (missing lastAddedItem)
 * - Service integration (ProductRecommendationService)
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

// Mock ProductRecommendationService
const mockGetComplementaryProducts = jest.fn();

jest.mock('../services/ai/recommendation.service', () => ({
  ProductRecommendationService: jest.fn(() => ({
    getComplementaryProducts: mockGetComplementaryProducts,
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
import aiRecommendationRoutes from '../api/routes/ai-recommendation-routes';
import { errorHandler } from '../api/middleware/error-middleware';

// ==================== TEST APP SETUP ====================

function createTestApp(): Application {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/ai-recommendations', aiRecommendationRoutes);
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

const mockLastAddedItem = {
  id: 'item-1',
  name: 'Quartz Countertop',
  category: 'countertops',
  style: 'modern',
  price: 1200,
};

const mockCurrentItems = [
  { id: 'item-0', name: 'Base Cabinet', category: 'cabinets', style: 'modern', price: 350 },
];

const mockRecommendations = {
  recommendations: [
    {
      id: 'rec-1',
      name: 'Undermount Sink',
      category: 'sinks',
      price: 450,
      reason: 'Pairs perfectly with quartz countertops',
      confidence: 0.92,
    },
    {
      id: 'rec-2',
      name: 'Modern Faucet',
      category: 'faucets',
      price: 280,
      reason: 'Complements modern style',
      confidence: 0.87,
    },
    {
      id: 'rec-3',
      name: 'LED Under-cabinet Lighting',
      category: 'lighting',
      price: 150,
      reason: 'Enhances the countertop visual appeal',
      confidence: 0.83,
    },
  ],
};

// ==================== TESTS ====================

describe('AI Recommendation Routes', () => {
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
    it('should return 401 for unauthenticated request to POST /ai-recommendations/complementary', async () => {
      const response = await request(app)
        .post('/ai-recommendations/complementary')
        .send({ lastAddedItem: mockLastAddedItem })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== POST /ai-recommendations/complementary ====================

  describe('POST /ai-recommendations/complementary', () => {
    it('should return complementary product recommendations successfully', async () => {
      mockGetComplementaryProducts.mockResolvedValue(mockRecommendations);

      const response = await authedRequest(app)
        .post('/ai-recommendations/complementary')
        .send({ lastAddedItem: mockLastAddedItem, currentItems: mockCurrentItems })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockRecommendations);
    });

    it('should call service with correct parameters including userId', async () => {
      mockGetComplementaryProducts.mockResolvedValue(mockRecommendations);

      await authedRequest(app)
        .post('/ai-recommendations/complementary')
        .send({
          lastAddedItem: mockLastAddedItem,
          currentItems: mockCurrentItems,
          style: 'modern',
          budget: 15000,
        })
        .expect(200);

      expect(mockGetComplementaryProducts).toHaveBeenCalledWith({
        currentItems: mockCurrentItems,
        lastAddedItem: mockLastAddedItem,
        style: 'modern',
        budget: 15000,
        userId: 'test-user-1',
      });
    });

    it('should return 400 when lastAddedItem is missing', async () => {
      const response = await authedRequest(app)
        .post('/ai-recommendations/complementary')
        .send({ currentItems: mockCurrentItems })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('lastAddedItem is required');
    });

    it('should return 400 when lastAddedItem is null', async () => {
      const response = await authedRequest(app)
        .post('/ai-recommendations/complementary')
        .send({ lastAddedItem: null, currentItems: mockCurrentItems })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('lastAddedItem is required');
    });

    it('should return 400 when lastAddedItem is undefined', async () => {
      const response = await authedRequest(app)
        .post('/ai-recommendations/complementary')
        .send({ currentItems: mockCurrentItems })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should default currentItems to empty array when not provided', async () => {
      mockGetComplementaryProducts.mockResolvedValue(mockRecommendations);

      await authedRequest(app)
        .post('/ai-recommendations/complementary')
        .send({ lastAddedItem: mockLastAddedItem })
        .expect(200);

      expect(mockGetComplementaryProducts).toHaveBeenCalledWith(
        expect.objectContaining({
          currentItems: [],
        })
      );
    });

    it('should pass style parameter when provided', async () => {
      mockGetComplementaryProducts.mockResolvedValue(mockRecommendations);

      await authedRequest(app)
        .post('/ai-recommendations/complementary')
        .send({
          lastAddedItem: mockLastAddedItem,
          style: 'farmhouse',
        })
        .expect(200);

      expect(mockGetComplementaryProducts).toHaveBeenCalledWith(
        expect.objectContaining({
          style: 'farmhouse',
        })
      );
    });

    it('should pass budget parameter when provided', async () => {
      mockGetComplementaryProducts.mockResolvedValue(mockRecommendations);

      await authedRequest(app)
        .post('/ai-recommendations/complementary')
        .send({
          lastAddedItem: mockLastAddedItem,
          budget: 25000,
        })
        .expect(200);

      expect(mockGetComplementaryProducts).toHaveBeenCalledWith(
        expect.objectContaining({
          budget: 25000,
        })
      );
    });

    it('should handle service errors gracefully', async () => {
      mockGetComplementaryProducts.mockRejectedValue(new Error('Recommendation service unavailable'));

      const response = await authedRequest(app)
        .post('/ai-recommendations/complementary')
        .send({ lastAddedItem: mockLastAddedItem })
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should handle empty recommendations from service', async () => {
      mockGetComplementaryProducts.mockResolvedValue({ recommendations: [] });

      const response = await authedRequest(app)
        .post('/ai-recommendations/complementary')
        .send({ lastAddedItem: mockLastAddedItem })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.recommendations).toEqual([]);
    });

    it('should pass different userId based on authenticated user', async () => {
      currentTestUser = { userId: 'custom-user-42', email: 'custom@test.com', role: 'user' };
      mockGetComplementaryProducts.mockResolvedValue(mockRecommendations);

      await authedRequest(app)
        .post('/ai-recommendations/complementary')
        .send({ lastAddedItem: mockLastAddedItem })
        .expect(200);

      expect(mockGetComplementaryProducts).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'custom-user-42',
        })
      );
    });

    it('should work with admin user role', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockGetComplementaryProducts.mockResolvedValue(mockRecommendations);

      const response = await authedRequest(app)
        .post('/ai-recommendations/complementary')
        .send({ lastAddedItem: mockLastAddedItem })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should accept lastAddedItem with minimal fields', async () => {
      mockGetComplementaryProducts.mockResolvedValue(mockRecommendations);

      const response = await authedRequest(app)
        .post('/ai-recommendations/complementary')
        .send({ lastAddedItem: { name: 'Simple Item' } })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle request with all optional parameters', async () => {
      mockGetComplementaryProducts.mockResolvedValue(mockRecommendations);

      const response = await authedRequest(app)
        .post('/ai-recommendations/complementary')
        .send({
          lastAddedItem: mockLastAddedItem,
          currentItems: mockCurrentItems,
          style: 'scandinavian',
          budget: 20000,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockGetComplementaryProducts).toHaveBeenCalledWith({
        currentItems: mockCurrentItems,
        lastAddedItem: mockLastAddedItem,
        style: 'scandinavian',
        budget: 20000,
        userId: 'test-user-1',
      });
    });

    it('should not leak internal error messages in response', async () => {
      mockGetComplementaryProducts.mockRejectedValue(new Error('Internal: DB pool exhausted'));

      const response = await authedRequest(app)
        .post('/ai-recommendations/complementary')
        .send({ lastAddedItem: mockLastAddedItem })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(JSON.stringify(response.body)).not.toContain('DB pool exhausted');
    });

    it('should return 400 when request body is empty', async () => {
      const response = await authedRequest(app)
        .post('/ai-recommendations/complementary')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
