/**
 * Enrichment Routes Integration Tests
 *
 * Tests all enrichment-related endpoints for correct behavior including:
 * - POST /enrichment/enrich — enrich specific products (admin only)
 * - POST /enrichment/enrich-all — enrich all pending products (admin only)
 * - GET /enrichment/status — get enrichment processing status
 * - GET /enrichment/product/:type/:id — get enrichment data for a product
 * - POST /enrichment/compatibility/generate — generate compatibility matrix (admin only)
 * - GET /enrichment/compatibility/check — check compatibility between products
 * - GET /enrichment/compatibility/:cabinetType — get compatibility rules
 * - POST /enrichment/match/:brandA/:brandB — cross-match brands (admin only)
 * - GET /enrichment/matches/:productId — get product matches
 * - Auth guard (401 without token, 403 for non-admin on admin routes)
 * - Validation (param schemas, missing body fields)
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

// Mock enrichment services
const mockEnrichBatch = jest.fn();
const mockGetStats = jest.fn();
const mockProcessPendingBatch = jest.fn();
const mockGenerateFullMatrix = jest.fn();
const mockGetRulesForCabinet = jest.fn();
const mockCheckCompatibility = jest.fn();
const mockCrossMatchBrands = jest.fn();
const mockGetMatchesForProduct = jest.fn();

jest.mock('../services/ai/product-enrichment.service', () => ({
  ProductEnrichmentService: {
    getInstance: jest.fn(() => ({
      enrichBatch: mockEnrichBatch,
      getStats: mockGetStats,
      processPendingBatch: mockProcessPendingBatch,
    })),
  },
}));

jest.mock('../services/ai/compatibility-generator.service', () => ({
  CompatibilityGeneratorService: {
    getInstance: jest.fn(() => ({
      generateFullMatrix: mockGenerateFullMatrix,
      getRulesForCabinet: mockGetRulesForCabinet,
      checkCompatibility: mockCheckCompatibility,
    })),
  },
}));

jest.mock('../services/ai/product-matcher.service', () => ({
  ProductMatcherService: {
    getInstance: jest.fn(() => ({
      crossMatchBrands: mockCrossMatchBrands,
      getMatchesForProduct: mockGetMatchesForProduct,
    })),
  },
}));

// Mock database client
const mockPrisma = {
  $disconnect: jest.fn(),
  productEnrichment: {
    findUnique: jest.fn(),
  },
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
  userId: 'admin-1',
  email: 'admin@test.com',
  role: 'admin',
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
    requireRole:
      (...roles: string[]) =>
      (req: any, _res: any, next: any) => {
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
import enrichmentRoutes from '../api/routes/enrichment-routes';

// ==================== TEST APP SETUP ====================

function createTestApp(): Application {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/enrichment', enrichmentRoutes);
  app.use(errorHandler);
  return app;
}

function authedRequest(app: Application) {
  return {
    get: (url: string) => request(app).get(url).set('Cookie', ['accessToken=test-token']),
    post: (url: string) => request(app).post(url).set('Cookie', ['accessToken=test-token']),
    put: (url: string) => request(app).put(url).set('Cookie', ['accessToken=test-token']),
    delete: (url: string) => request(app).delete(url).set('Cookie', ['accessToken=test-token']),
  };
}

// ==================== FIXTURES ====================

const mockEnrichmentResult = [
  {
    productId: 'p1',
    specifications: { installationDepth: 560 },
    warranty: { duration: '25 years' },
    certifications: ['FSC'],
    confidence: 0.85,
  },
  {
    productId: 'p2',
    specifications: { installationDepth: 320 },
    warranty: {},
    certifications: [],
    confidence: 0.9,
  },
];

const mockStatsResult = {
  total: 100,
  enriched: 75,
  pending: 25,
  failed: 0,
};

const mockProductEnrichment = {
  id: 'enrich-1',
  productType: 'cabinet',
  productId: '550e8400-e29b-41d4-a716-446655440000',
  specifications: { material: 'MDF' },
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockCompatibilityMatrix = {
  generated: 150,
  updated: 30,
  errors: 0,
};

const mockCompatibilityRules = [
  {
    id: 'rule-1',
    cabinetType: 'base_standard',
    applianceType: 'dishwasher_full',
    cabinetWidthMin: 600,
    requiresCutout: false,
    confidence: 0.95,
  },
];

const mockCompatibilityCheckResult = {
  compatible: true,
  rule: {
    cabinetType: 'base_standard',
    applianceType: 'dishwasher_full',
    confidence: 0.95,
  },
};

const mockMatches = [
  { id: 'match-1', productIdA: 'p1', productIdB: 'p2', matchScore: 0.92 },
  { id: 'match-2', productIdA: 'p1', productIdB: 'p3', matchScore: 0.85 },
];

// ==================== TESTS ====================

describe('Enrichment Routes', () => {
  let app: Application;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
  });

  // ==================== AUTH GUARD ====================

  describe('Authentication guard', () => {
    it('should return 401 for unauthenticated request to POST /enrichment/enrich', async () => {
      const response = await request(app)
        .post('/enrichment/enrich')
        .send({ products: [{ type: 'cabinet', id: '1', name: 'Test' }] })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 for unauthenticated request to GET /enrichment/status', async () => {
      const response = await request(app).get('/enrichment/status').expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 for unauthenticated request to POST /enrichment/enrich-all', async () => {
      const response = await request(app).post('/enrichment/enrich-all').expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 for non-admin user on POST /enrichment/enrich', async () => {
      currentTestUser = { userId: 'test-user-1', email: 'test@test.com', role: 'user' };

      const response = await authedRequest(app)
        .post('/enrichment/enrich')
        .send({ products: [{ type: 'cabinet', id: '1', name: 'Test' }] })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 for non-admin user on POST /enrichment/enrich-all', async () => {
      currentTestUser = { userId: 'test-user-1', email: 'test@test.com', role: 'user' };

      const response = await authedRequest(app).post('/enrichment/enrich-all').expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 for non-admin user on POST /enrichment/compatibility/generate', async () => {
      currentTestUser = { userId: 'test-user-1', email: 'test@test.com', role: 'user' };

      const response = await authedRequest(app)
        .post('/enrichment/compatibility/generate')
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 for non-admin user on POST /enrichment/match/ikea/leroy', async () => {
      currentTestUser = { userId: 'test-user-1', email: 'test@test.com', role: 'user' };

      const response = await authedRequest(app).post('/enrichment/match/ikea/leroy').expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== POST /enrichment/enrich ====================

  describe('POST /enrichment/enrich', () => {
    it('should enrich a batch of products successfully', async () => {
      mockEnrichBatch.mockResolvedValue(mockEnrichmentResult);

      const response = await authedRequest(app)
        .post('/enrichment/enrich')
        .send({
          products: [
            { type: 'cabinet', id: 'p1', name: 'Base Cabinet 60cm', brand: 'IKEA' },
            { type: 'cabinet', id: 'p2', name: 'Wall Cabinet 80cm', brand: 'IKEA' },
          ],
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(mockEnrichBatch).toHaveBeenCalledTimes(1);
    });

    it('should return 400 when products array is missing', async () => {
      const response = await authedRequest(app).post('/enrichment/enrich').send({}).expect(400);

      expect(response.body.success).toBe(false);
      expect(JSON.stringify(response.body)).toContain('products');
    });

    it('should return 400 when products array is empty', async () => {
      const response = await authedRequest(app)
        .post('/enrichment/enrich')
        .send({ products: [] })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when products is not an array', async () => {
      const response = await authedRequest(app)
        .post('/enrichment/enrich')
        .send({ products: 'not-an-array' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== POST /enrichment/enrich-all ====================

  describe('POST /enrichment/enrich-all', () => {
    it('should start enrichment for all pending products', async () => {
      mockGetStats.mockResolvedValue(mockStatsResult);
      mockProcessPendingBatch.mockResolvedValue(0);

      const response = await authedRequest(app).post('/enrichment/enrich-all').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pendingCount).toBe(25);
      expect(response.body.data.message).toContain('Enrichment started');
    });
  });

  // ==================== GET /enrichment/status ====================

  describe('GET /enrichment/status', () => {
    it('should return enrichment status for any authenticated user', async () => {
      currentTestUser = { userId: 'test-user-1', email: 'test@test.com', role: 'user' };
      mockGetStats.mockResolvedValue(mockStatsResult);

      const response = await authedRequest(app).get('/enrichment/status').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockStatsResult);
    });

    it('should return enrichment stats for admin user', async () => {
      mockGetStats.mockResolvedValue(mockStatsResult);

      const response = await authedRequest(app).get('/enrichment/status').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pending).toBe(25);
    });
  });

  // ==================== GET /enrichment/product/:type/:id ====================

  describe('GET /enrichment/product/:type/:id', () => {
    const validUuid = '550e8400-e29b-41d4-a716-446655440000';

    it('should return enrichment data for a product', async () => {
      mockPrisma.productEnrichment.findUnique.mockResolvedValue(mockProductEnrichment);

      const response = await authedRequest(app)
        .get(`/enrichment/product/cabinet/${validUuid}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.productType).toBe('cabinet');
      expect(mockPrisma.productEnrichment.findUnique).toHaveBeenCalledWith({
        where: {
          productType_productId: {
            productType: 'cabinet',
            productId: validUuid,
          },
        },
      });
    });

    it('should return 404 when product enrichment not found', async () => {
      mockPrisma.productEnrichment.findUnique.mockResolvedValue(null);

      const response = await authedRequest(app)
        .get(`/enrichment/product/cabinet/${validUuid}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(JSON.stringify(response.body)).toContain('not found');
    });

    it('should return 400 for invalid UUID in id param', async () => {
      const response = await authedRequest(app)
        .get('/enrichment/product/cabinet/not-a-uuid')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should allow non-admin users to access product enrichment', async () => {
      currentTestUser = { userId: 'test-user-1', email: 'test@test.com', role: 'user' };
      mockPrisma.productEnrichment.findUnique.mockResolvedValue(mockProductEnrichment);

      const response = await authedRequest(app)
        .get(`/enrichment/product/cabinet/${validUuid}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  // ==================== POST /enrichment/compatibility/generate ====================

  describe('POST /enrichment/compatibility/generate', () => {
    it('should generate compatibility matrix successfully', async () => {
      mockGenerateFullMatrix.mockResolvedValue(mockCompatibilityMatrix);

      const response = await authedRequest(app)
        .post('/enrichment/compatibility/generate')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.generated).toBe(150);
      expect(mockGenerateFullMatrix).toHaveBeenCalled();
    });
  });

  // ==================== GET /enrichment/compatibility/check ====================

  describe('GET /enrichment/compatibility/check', () => {
    it('should check compatibility between cabinet and appliance types', async () => {
      currentTestUser = { userId: 'test-user-1', email: 'test@test.com', role: 'user' };
      mockCheckCompatibility.mockResolvedValue(mockCompatibilityCheckResult);

      const response = await authedRequest(app)
        .get(
          '/enrichment/compatibility/check?cabinetType=base_standard&applianceType=dishwasher_full'
        )
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.compatible).toBe(true);
      expect(mockCheckCompatibility).toHaveBeenCalledWith('base_standard', 'dishwasher_full');
    });

    it('should return 400 when cabinetType query param is missing', async () => {
      const response = await authedRequest(app)
        .get('/enrichment/compatibility/check?applianceType=dishwasher_full')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(JSON.stringify(response.body)).toContain('cabinetType and applianceType');
    });

    it('should return 400 when applianceType query param is missing', async () => {
      const response = await authedRequest(app)
        .get('/enrichment/compatibility/check?cabinetType=base_standard')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when both query params are missing', async () => {
      const response = await authedRequest(app).get('/enrichment/compatibility/check').expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== GET /enrichment/compatibility/:cabinetType ====================

  describe('GET /enrichment/compatibility/:cabinetType', () => {
    it('should return compatibility rules for a cabinet type', async () => {
      mockGetRulesForCabinet.mockResolvedValue(mockCompatibilityRules);

      const response = await authedRequest(app)
        .get('/enrichment/compatibility/base_standard')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(mockGetRulesForCabinet).toHaveBeenCalledWith('base_standard');
    });

    it('should allow non-admin users to access compatibility rules', async () => {
      currentTestUser = { userId: 'test-user-1', email: 'test@test.com', role: 'user' };
      mockGetRulesForCabinet.mockResolvedValue([]);

      const response = await authedRequest(app)
        .get('/enrichment/compatibility/base_standard')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  // ==================== POST /enrichment/match/:brandA/:brandB ====================

  describe('POST /enrichment/match/:brandA/:brandB', () => {
    it('should cross-match products between two brands', async () => {
      mockCrossMatchBrands.mockResolvedValue(15);

      const response = await authedRequest(app)
        .post('/enrichment/match/ikea/leroy-merlin')
        .send({ productType: 'cabinet' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.matchCount).toBe(15);
      expect(response.body.data.brandA).toBe('ikea');
      expect(response.body.data.brandB).toBe('leroy-merlin');
      expect(response.body.data.productType).toBe('cabinet');
      expect(mockCrossMatchBrands).toHaveBeenCalledWith('ikea', 'leroy-merlin', 'cabinet');
    });

    it('should default productType to all when not provided', async () => {
      mockCrossMatchBrands.mockResolvedValue(8);

      const response = await authedRequest(app)
        .post('/enrichment/match/bosch/siemens')
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.productType).toBe('all');
      expect(mockCrossMatchBrands).toHaveBeenCalledWith('bosch', 'siemens', '');
    });
  });

  // ==================== GET /enrichment/matches/:productId ====================

  describe('GET /enrichment/matches/:productId', () => {
    const validProductId = '550e8400-e29b-41d4-a716-446655440000';

    it('should return matches for a specific product', async () => {
      mockGetMatchesForProduct.mockResolvedValue(mockMatches);

      const response = await authedRequest(app)
        .get(`/enrichment/matches/${validProductId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(mockGetMatchesForProduct).toHaveBeenCalledWith(validProductId);
    });

    it('should return empty array when no matches exist', async () => {
      mockGetMatchesForProduct.mockResolvedValue([]);

      const response = await authedRequest(app)
        .get(`/enrichment/matches/${validProductId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });

    it('should return 400 for invalid product ID format', async () => {
      const response = await authedRequest(app).get('/enrichment/matches/not-a-uuid').expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should allow non-admin users to access product matches', async () => {
      currentTestUser = { userId: 'test-user-1', email: 'test@test.com', role: 'user' };
      mockGetMatchesForProduct.mockResolvedValue(mockMatches);

      const response = await authedRequest(app)
        .get(`/enrichment/matches/${validProductId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
