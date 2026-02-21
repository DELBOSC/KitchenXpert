/**
 * AI Search Routes Integration Tests
 *
 * Tests all AI catalog search endpoints for correct behavior including:
 * - POST /ai-search/catalog — AI-powered catalog search
 * - Auth guard (401 without token)
 * - Validation (missing or invalid query)
 * - Service integration (AICatalogSearchService)
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

// Mock AICatalogSearchService
const mockSearch = jest.fn();

jest.mock('../../services/ai/catalog-search.service', () => ({
  AICatalogSearchService: jest.fn(() => ({
    search: mockSearch,
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
  aiRateLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
  generalRateLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

// Import after mocks
import aiSearchRoutes from '../../api/routes/ai-search-routes';
import { errorHandler } from '../../api/middleware/error-middleware';

// ==================== TEST APP SETUP ====================

function createTestApp(): Application {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/ai-search', aiSearchRoutes);
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

const mockSearchResults = {
  results: [
    {
      id: 'product-1',
      name: 'Modern Cabinet',
      category: 'cabinets',
      price: 350,
      relevanceScore: 0.95,
    },
    {
      id: 'product-2',
      name: 'Quartz Countertop',
      category: 'countertops',
      price: 1200,
      relevanceScore: 0.88,
    },
  ],
  totalCount: 2,
  query: 'modern white cabinets',
};

// ==================== TESTS ====================

describe('AI Search Routes', () => {
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
    it('should return 401 for unauthenticated request to POST /ai-search/catalog', async () => {
      const response = await request(app)
        .post('/ai-search/catalog')
        .send({ query: 'modern cabinets' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== POST /ai-search/catalog ====================

  describe('POST /ai-search/catalog', () => {
    it('should return search results for a valid query', async () => {
      mockSearch.mockResolvedValue(mockSearchResults);

      const response = await authedRequest(app)
        .post('/ai-search/catalog')
        .send({ query: 'modern white cabinets' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockSearchResults);
    });

    it('should call search service with correct parameters', async () => {
      mockSearch.mockResolvedValue(mockSearchResults);

      await authedRequest(app)
        .post('/ai-search/catalog')
        .send({ query: 'modern white cabinets' })
        .expect(200);

      expect(mockSearch).toHaveBeenCalledWith({
        query: 'modern white cabinets',
        userId: 'test-user-1',
      });
    });

    it('should return 400 when query is missing', async () => {
      const response = await authedRequest(app)
        .post('/ai-search/catalog')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('query is required');
    });

    it('should return 400 when query is empty string', async () => {
      const response = await authedRequest(app)
        .post('/ai-search/catalog')
        .send({ query: '' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('query is required');
    });

    it('should return 400 when query is not a string', async () => {
      const response = await authedRequest(app)
        .post('/ai-search/catalog')
        .send({ query: 12345 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('query is required');
    });

    it('should return 400 when query is null', async () => {
      const response = await authedRequest(app)
        .post('/ai-search/catalog')
        .send({ query: null })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle search service returning empty results', async () => {
      mockSearch.mockResolvedValue({ results: [], totalCount: 0, query: 'nonexistent' });

      const response = await authedRequest(app)
        .post('/ai-search/catalog')
        .send({ query: 'nonexistent product xyz' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.results).toEqual([]);
      expect(response.body.data.totalCount).toBe(0);
    });

    it('should handle search service errors gracefully', async () => {
      mockSearch.mockRejectedValue(new Error('AI service unavailable'));

      const response = await authedRequest(app)
        .post('/ai-search/catalog')
        .send({ query: 'modern cabinets' })
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should pass userId from authenticated user to the search service', async () => {
      currentTestUser = { userId: 'custom-user-42', email: 'custom@test.com', role: 'user' };
      mockSearch.mockResolvedValue(mockSearchResults);

      await authedRequest(app)
        .post('/ai-search/catalog')
        .send({ query: 'granite countertops' })
        .expect(200);

      expect(mockSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'custom-user-42',
        })
      );
    });

    it('should handle long query strings', async () => {
      mockSearch.mockResolvedValue(mockSearchResults);
      const longQuery = 'a'.repeat(500);

      const response = await authedRequest(app)
        .post('/ai-search/catalog')
        .send({ query: longQuery })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle special characters in query', async () => {
      mockSearch.mockResolvedValue(mockSearchResults);

      const response = await authedRequest(app)
        .post('/ai-search/catalog')
        .send({ query: 'cabinet <script>alert("xss")</script>' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockSearch).toHaveBeenCalled();
    });

    it('should not expose internal errors in production-like responses', async () => {
      mockSearch.mockRejectedValue(new Error('Internal database connection failed'));

      const response = await authedRequest(app)
        .post('/ai-search/catalog')
        .send({ query: 'modern cabinets' })
        .expect(500);

      expect(response.body.success).toBe(false);
      // Should not leak internal error details
      expect(JSON.stringify(response.body)).not.toContain('database connection');
    });

    it('should accept query with whitespace and still process it', async () => {
      mockSearch.mockResolvedValue(mockSearchResults);

      const response = await authedRequest(app)
        .post('/ai-search/catalog')
        .send({ query: '  modern cabinets  ' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockSearch).toHaveBeenCalled();
    });

    it('should work with admin user role', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockSearch.mockResolvedValue(mockSearchResults);

      const response = await authedRequest(app)
        .post('/ai-search/catalog')
        .send({ query: 'industrial kitchen' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
