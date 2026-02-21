/**
 * Kitchen Generator Routes Integration Tests
 *
 * Tests all kitchen generator endpoints for correct behavior including:
 * - POST /kitchen-generator/generate — generate kitchen configurations
 * - POST /kitchen-generator/validate — validate a kitchen configuration
 * - POST /kitchen-generator/optimize — optimize a kitchen configuration
 * - GET /kitchen-generator/shapes — get available kitchen shapes
 * - GET /kitchen-generator/styles — get available kitchen styles
 * - GET /kitchen-generator/providers — get available providers
 * - GET /kitchen-generator/constraints — get default constraints
 * - POST /kitchen-generator/recommend-shape — recommend shape for room
 * - Auth guard (401 without token for protected routes)
 * - Validation (missing room, missing preferences, invalid dimensions, invalid budget)
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

// Mock AI service client
const mockIsAvailable = jest.fn();
const mockOptimizeLayout = jest.fn();
const mockAnalyzeSpace = jest.fn();
const mockOptimizeBudget = jest.fn();
const mockResetHealth = jest.fn();

jest.mock('../../services/ai-service-client', () => ({
  aiServiceClient: {
    isAvailable: mockIsAvailable,
    optimizeLayout: mockOptimizeLayout,
    analyzeSpace: mockAnalyzeSpace,
    optimizeBudget: mockOptimizeBudget,
    resetHealth: mockResetHealth,
  },
}));

// Mock AI service transformers
jest.mock('../../services/ai-service-transformers', () => ({
  transformGenerateRequest: jest.fn((body: any) => body),
  transformLayoutResult: jest.fn((result: any) => result),
  transformValidateRequest: jest.fn((body: any) => body),
  transformValidateResult: jest.fn((result: any) => result),
  transformOptimizeRequest: jest.fn((_body: any, optimization: string) => ({
    endpoint: optimization,
    payload: {},
  })),
  transformOptimizeResult: jest.fn((result: any, optimization: string) => ({
    optimizedConfiguration: result,
    improvements: { optimizedFor: optimization },
  })),
}));

// Mock rate limiter
jest.mock('express-rate-limit', () => {
  return jest.fn(() => (_req: Request, _res: Response, next: NextFunction) => next());
});

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
import kitchenGeneratorRoutes from '../../api/routes/kitchen-generator-routes';
import { errorHandler } from '../../api/middleware/error-middleware';

// ==================== TEST APP SETUP ====================

function createTestApp(): Application {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/kitchen-generator', kitchenGeneratorRoutes);
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

const validGenerateBody = {
  room: {
    dimensions: { width: 400, length: 300 },
    walls: [],
    utilities: [],
  },
  preferences: {
    budget: { min: 3000, max: 10000 },
    style: 'modern',
    requiredAppliances: ['oven', 'dishwasher'],
  },
};

const validValidateBody = {
  configuration: {
    items: [
      { category: 'sink', name: 'Sink', type: 'appliance' },
      { category: 'cooktop', name: 'Cooktop', type: 'appliance' },
      { category: 'refrigerator', name: 'Fridge', type: 'appliance' },
      { category: 'base_cabinet', name: 'Cabinet 1', type: 'cabinet' },
      { category: 'base_cabinet', name: 'Cabinet 2', type: 'cabinet' },
      { category: 'base_cabinet', name: 'Cabinet 3', type: 'cabinet' },
    ],
    workTriangle: { isOptimal: true },
  },
};

const validOptimizeBody = {
  configuration: {
    items: [{ category: 'sink', name: 'Sink' }],
    pricing: { total: 5000 },
    score: { overall: 70, storage: 60, ergonomics: 65 },
  },
  optimizeFor: 'budget',
};

// ==================== TESTS ====================

describe('Kitchen Generator Routes', () => {
  let app: Application;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    currentTestUser = { userId: 'test-user-1', email: 'test@test.com', role: 'user' };
    // Default: AI service not available, so fallback logic runs
    mockIsAvailable.mockResolvedValue(false);
  });

  // ==================== AUTH GUARD ====================

  describe('Authentication guard', () => {
    it('should return 401 for unauthenticated request to POST /kitchen-generator/generate', async () => {
      const response = await request(app)
        .post('/kitchen-generator/generate')
        .send(validGenerateBody)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 for unauthenticated request to POST /kitchen-generator/validate', async () => {
      const response = await request(app)
        .post('/kitchen-generator/validate')
        .send(validValidateBody)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 for unauthenticated request to POST /kitchen-generator/optimize', async () => {
      const response = await request(app)
        .post('/kitchen-generator/optimize')
        .send(validOptimizeBody)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== POST /kitchen-generator/generate ====================

  describe('POST /kitchen-generator/generate', () => {
    it('should generate kitchen configurations with fallback algorithm', async () => {
      const response = await authedRequest(app)
        .post('/kitchen-generator/generate')
        .send(validGenerateBody)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.configurations).toBeDefined();
      expect(Array.isArray(response.body.configurations)).toBe(true);
      expect(response.body.recommended).toBeDefined();
      expect(response.body.stats).toBeDefined();
      expect(response.body.stats.algorithm).toBe('local-fallback');
    });

    it('should return 400 when room is missing', async () => {
      const response = await authedRequest(app)
        .post('/kitchen-generator/generate')
        .send({
          preferences: { budget: { min: 3000, max: 10000 }, style: 'modern', requiredAppliances: [] },
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_REQUEST');
      expect(response.body.error.message).toContain('Room configuration');
    });

    it('should return 400 when room dimensions are missing', async () => {
      const response = await authedRequest(app)
        .post('/kitchen-generator/generate')
        .send({
          room: { walls: [] },
          preferences: { budget: { min: 3000, max: 10000 }, style: 'modern', requiredAppliances: [] },
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_REQUEST');
    });

    it('should return 400 when preferences are missing', async () => {
      const response = await authedRequest(app)
        .post('/kitchen-generator/generate')
        .send({
          room: { dimensions: { width: 400, length: 300 } },
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_REQUEST');
      expect(response.body.error.message).toContain('preferences');
    });

    it('should return 400 when budget is missing from preferences', async () => {
      const response = await authedRequest(app)
        .post('/kitchen-generator/generate')
        .send({
          room: { dimensions: { width: 400, length: 300 } },
          preferences: { style: 'modern', requiredAppliances: [] },
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('budget');
    });

    it('should return 400 when dimensions are too small', async () => {
      const response = await authedRequest(app)
        .post('/kitchen-generator/generate')
        .send({
          room: { dimensions: { width: 50, length: 50 } },
          preferences: { budget: { min: 3000, max: 10000 }, style: 'modern', requiredAppliances: [] },
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_DIMENSIONS');
    });

    it('should return 400 when budget min is greater than max', async () => {
      const response = await authedRequest(app)
        .post('/kitchen-generator/generate')
        .send({
          room: { dimensions: { width: 400, length: 300 } },
          preferences: { budget: { min: 10000, max: 3000 }, style: 'modern', requiredAppliances: [] },
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_BUDGET');
    });

    it('should return 400 when budget min is negative', async () => {
      const response = await authedRequest(app)
        .post('/kitchen-generator/generate')
        .send({
          room: { dimensions: { width: 400, length: 300 } },
          preferences: { budget: { min: -100, max: 5000 }, style: 'modern', requiredAppliances: [] },
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_BUDGET');
    });

    it('should limit numConfigurations to 5', async () => {
      const response = await authedRequest(app)
        .post('/kitchen-generator/generate')
        .send({
          ...validGenerateBody,
          numConfigurations: 10,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.configurations.length).toBeLessThanOrEqual(5);
    });

    it('should sort configurations by overall score descending', async () => {
      const response = await authedRequest(app)
        .post('/kitchen-generator/generate')
        .send(validGenerateBody)
        .expect(200);

      const scores = response.body.configurations.map((c: any) => c.score.overall);
      for (let i = 0; i < scores.length - 1; i++) {
        expect(scores[i]).toBeGreaterThanOrEqual(scores[i + 1]);
      }
    });

    it('should include work triangle in each configuration', async () => {
      const response = await authedRequest(app)
        .post('/kitchen-generator/generate')
        .send(validGenerateBody)
        .expect(200);

      response.body.configurations.forEach((config: any) => {
        expect(config.workTriangle).toBeDefined();
        expect(config.workTriangle.sink).toBeDefined();
        expect(config.workTriangle.cooktop).toBeDefined();
        expect(config.workTriangle.refrigerator).toBeDefined();
        expect(config.workTriangle.perimeter).toBeGreaterThan(0);
      });
    });
  });

  // ==================== POST /kitchen-generator/validate ====================

  describe('POST /kitchen-generator/validate', () => {
    it('should validate a kitchen configuration', async () => {
      const response = await authedRequest(app)
        .post('/kitchen-generator/validate')
        .send(validValidateBody)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.validation).toBeDefined();
      expect(response.body.validation).toHaveProperty('valid');
      expect(response.body.validation).toHaveProperty('errors');
      expect(response.body.validation).toHaveProperty('warnings');
      expect(response.body.validation).toHaveProperty('passedChecks');
    });

    it('should return 400 when configuration is missing', async () => {
      const response = await authedRequest(app)
        .post('/kitchen-generator/validate')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_REQUEST');
      expect(response.body.error.message).toContain('Configuration is required');
    });

    it('should detect missing sink in configuration', async () => {
      const response = await authedRequest(app)
        .post('/kitchen-generator/validate')
        .send({
          configuration: {
            items: [
              { category: 'cooktop', name: 'Cooktop', type: 'appliance' },
              { category: 'refrigerator', name: 'Fridge', type: 'appliance' },
            ],
          },
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.validation.valid).toBe(false);
      expect(response.body.validation.errors.some((e: any) => e.code === 'MISSING_SINK')).toBe(true);
    });

    it('should detect missing cooktop in configuration', async () => {
      const response = await authedRequest(app)
        .post('/kitchen-generator/validate')
        .send({
          configuration: {
            items: [
              { category: 'sink', name: 'Sink', type: 'appliance' },
              { category: 'refrigerator', name: 'Fridge', type: 'appliance' },
            ],
          },
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.validation.valid).toBe(false);
      expect(response.body.validation.errors.some((e: any) => e.code === 'MISSING_COOKTOP')).toBe(true);
    });

    it('should warn about missing refrigerator', async () => {
      const response = await authedRequest(app)
        .post('/kitchen-generator/validate')
        .send({
          configuration: {
            items: [
              { category: 'sink', name: 'Sink', type: 'appliance' },
              { category: 'cooktop', name: 'Cooktop', type: 'appliance' },
            ],
          },
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.validation.warnings.some((w: any) => w.code === 'MISSING_FRIDGE')).toBe(true);
    });
  });

  // ==================== POST /kitchen-generator/optimize ====================

  describe('POST /kitchen-generator/optimize', () => {
    it('should optimize a kitchen configuration for budget', async () => {
      const response = await authedRequest(app)
        .post('/kitchen-generator/optimize')
        .send(validOptimizeBody)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.optimizedConfiguration).toBeDefined();
      expect(response.body.improvements).toBeDefined();
      expect(response.body.improvements.optimizedFor).toBe('budget');
    });

    it('should return 400 when configuration is missing', async () => {
      const response = await authedRequest(app)
        .post('/kitchen-generator/optimize')
        .send({ optimizeFor: 'budget' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_REQUEST');
    });

    it('should return 400 for invalid optimization target', async () => {
      const response = await authedRequest(app)
        .post('/kitchen-generator/optimize')
        .send({
          configuration: { items: [] },
          optimizeFor: 'invalid-target',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_OPTIMIZATION');
    });

    it('should default to budget optimization when optimizeFor is not specified', async () => {
      const response = await authedRequest(app)
        .post('/kitchen-generator/optimize')
        .send({ configuration: validOptimizeBody.configuration })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.improvements.optimizedFor).toBe('budget');
    });

    it('should accept storage optimization', async () => {
      const response = await authedRequest(app)
        .post('/kitchen-generator/optimize')
        .send({
          configuration: validOptimizeBody.configuration,
          optimizeFor: 'storage',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.improvements.optimizedFor).toBe('storage');
    });

    it('should accept ergonomics optimization', async () => {
      const response = await authedRequest(app)
        .post('/kitchen-generator/optimize')
        .send({
          configuration: validOptimizeBody.configuration,
          optimizeFor: 'ergonomics',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.improvements.optimizedFor).toBe('ergonomics');
    });
  });

  // ==================== GET /kitchen-generator/shapes ====================

  describe('GET /kitchen-generator/shapes', () => {
    it('should return all available kitchen shapes', async () => {
      const response = await request(app)
        .get('/kitchen-generator/shapes')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(7);

      const shapeIds = response.body.data.map((s: any) => s.id);
      expect(shapeIds).toContain('I');
      expect(shapeIds).toContain('L');
      expect(shapeIds).toContain('U');
      expect(shapeIds).toContain('G');
      expect(shapeIds).toContain('parallel');
      expect(shapeIds).toContain('island');
      expect(shapeIds).toContain('peninsula');
    });

    it('should include dimension requirements for each shape', async () => {
      const response = await request(app)
        .get('/kitchen-generator/shapes')
        .expect(200);

      response.body.data.forEach((shape: any) => {
        expect(shape).toHaveProperty('minWidth');
        expect(shape).toHaveProperty('minLength');
        expect(shape).toHaveProperty('recommendedArea');
      });
    });
  });

  // ==================== GET /kitchen-generator/styles ====================

  describe('GET /kitchen-generator/styles', () => {
    it('should return all available kitchen styles', async () => {
      const response = await request(app)
        .get('/kitchen-generator/styles')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(8);

      const styleIds = response.body.data.map((s: any) => s.id);
      expect(styleIds).toContain('modern');
      expect(styleIds).toContain('classic');
      expect(styleIds).toContain('scandinavian');
      expect(styleIds).toContain('industrial');
    });

    it('should include colors for each style', async () => {
      const response = await request(app)
        .get('/kitchen-generator/styles')
        .expect(200);

      response.body.data.forEach((style: any) => {
        expect(style).toHaveProperty('colors');
        expect(Array.isArray(style.colors)).toBe(true);
        expect(style.colors.length).toBeGreaterThan(0);
      });
    });
  });

  // ==================== GET /kitchen-generator/providers ====================

  describe('GET /kitchen-generator/providers', () => {
    it('should return all available providers', async () => {
      const response = await request(app)
        .get('/kitchen-generator/providers')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should include provider metadata', async () => {
      const response = await request(app)
        .get('/kitchen-generator/providers')
        .expect(200);

      response.body.data.forEach((provider: any) => {
        expect(provider).toHaveProperty('id');
        expect(provider).toHaveProperty('name');
        expect(provider).toHaveProperty('type');
        expect(provider).toHaveProperty('available');
      });
    });

    it('should include ikea-fr provider', async () => {
      const response = await request(app)
        .get('/kitchen-generator/providers')
        .expect(200);

      const ikea = response.body.data.find((p: any) => p.id === 'ikea-fr');
      expect(ikea).toBeDefined();
      expect(ikea.name).toContain('IKEA');
      expect(ikea.type).toBe('furniture');
    });
  });

  // ==================== GET /kitchen-generator/constraints ====================

  describe('GET /kitchen-generator/constraints', () => {
    it('should return default generation constraints', async () => {
      const response = await request(app)
        .get('/kitchen-generator/constraints')
        .expect(200);

      expect(response.body.success).toBe(true);
      const data = response.body.data;
      expect(data).toHaveProperty('minPassageWidth');
      expect(data).toHaveProperty('maxWorkTrianglePerimeter');
      expect(data).toHaveProperty('minCooktopSinkDistance');
      expect(data).toHaveProperty('maxCooktopSinkDistance');
      expect(data).toHaveProperty('requireVentilation');
      expect(data).toHaveProperty('standardCabinetWidths');
      expect(data).toHaveProperty('standardCabinetHeights');
    });

    it('should return constraint values with correct units', async () => {
      const response = await request(app)
        .get('/kitchen-generator/constraints')
        .expect(200);

      expect(response.body.data.minPassageWidth.value).toBe(90);
      expect(response.body.data.minPassageWidth.unit).toBe('cm');
      expect(response.body.data.maxWorkTrianglePerimeter.value).toBe(600);
    });
  });

  // ==================== POST /kitchen-generator/recommend-shape ====================

  describe('POST /kitchen-generator/recommend-shape', () => {
    it('should recommend I-shape for narrow small kitchen', async () => {
      const response = await request(app)
        .post('/kitchen-generator/recommend-shape')
        .send({ dimensions: { width: 150, length: 400 } })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.recommendation).toBeDefined();
      expect(response.body.recommendation.shape).toBe('I');
      expect(response.body.recommendation.analysis.areaCategory).toBe('small');
    });

    it('should recommend L-shape for small square kitchen', async () => {
      const response = await request(app)
        .post('/kitchen-generator/recommend-shape')
        .send({ dimensions: { width: 250, length: 280 } })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.recommendation.shape).toBe('L');
    });

    it('should recommend U-shape for medium kitchen with 3+ walls', async () => {
      const response = await request(app)
        .post('/kitchen-generator/recommend-shape')
        .send({ dimensions: { width: 350, length: 320 }, wallsAvailable: 3 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.recommendation.shape).toBe('U');
      expect(response.body.recommendation.analysis.areaCategory).toBe('medium');
    });

    it('should recommend island for large open kitchen', async () => {
      const response = await request(app)
        .post('/kitchen-generator/recommend-shape')
        .send({ dimensions: { width: 500, length: 400 }, wallsAvailable: 3 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.recommendation.shape).toBe('island');
      expect(response.body.recommendation.analysis.areaCategory).toBe('large');
    });

    it('should return 400 when dimensions are missing', async () => {
      const response = await request(app)
        .post('/kitchen-generator/recommend-shape')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('dimensions');
    });

    it('should return 400 when width is missing', async () => {
      const response = await request(app)
        .post('/kitchen-generator/recommend-shape')
        .send({ dimensions: { length: 300 } })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when length is missing', async () => {
      const response = await request(app)
        .post('/kitchen-generator/recommend-shape')
        .send({ dimensions: { width: 300 } })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should include alternatives in recommendation', async () => {
      const response = await request(app)
        .post('/kitchen-generator/recommend-shape')
        .send({ dimensions: { width: 350, length: 320 }, wallsAvailable: 3 })
        .expect(200);

      expect(response.body.recommendation.alternatives).toBeDefined();
      expect(Array.isArray(response.body.recommendation.alternatives)).toBe(true);
      expect(response.body.recommendation.alternatives.length).toBeGreaterThan(0);
    });

    it('should include analysis with area and ratio', async () => {
      const response = await request(app)
        .post('/kitchen-generator/recommend-shape')
        .send({ dimensions: { width: 350, length: 320 } })
        .expect(200);

      expect(response.body.recommendation.analysis).toBeDefined();
      expect(response.body.recommendation.analysis.area).toBe(112000);
      expect(response.body.recommendation.analysis.ratio).toBeDefined();
    });
  });
});
