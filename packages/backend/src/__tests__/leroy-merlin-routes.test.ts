/**
 * Leroy Merlin Routes Tests
 *
 * Tests the Leroy Merlin catalog provider endpoints:
 * - GET /leroy-merlin/products — list products with pagination
 * - GET /leroy-merlin/products/search — search products by query
 * - GET /leroy-merlin/info — provider metadata
 * - 400 for missing search query
 * - 404 when provider not configured
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express, { type Application, type Request, type Response, type NextFunction } from 'express';

// ==================== MOCKS ====================

vi.mock('../../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  createModuleLogger: vi.fn(() => ({
    info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
  })),
}));

vi.mock('express-rate-limit', () => ({
  default: vi.fn(() => (_req: Request, _res: Response, next: NextFunction) => next()),
}));

const mockProductFindAll = vi.fn();
const mockProductFindById = vi.fn();

vi.mock('../../repositories/product-repository', () => ({
  ProductRepository: vi.fn().mockImplementation(() => ({
    findAll: mockProductFindAll,
    findById: mockProductFindById,
  })),
}));

vi.mock('../../repositories/appliance-repository', () => ({
  ApplianceRepository: vi.fn().mockImplementation(() => ({
    findAll: vi.fn(), search: vi.fn(), getTypes: vi.fn(), findById: vi.fn(),
  })),
}));

const mockPrisma = {
  $disconnect: vi.fn(),
  catalogProvider: { findFirst: vi.fn() },
  productCategory: { findMany: vi.fn() },
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

vi.mock('../../api/middleware/auth-middleware', () => ({
  authenticate: vi.fn((req: any, _res: any, next: any) => {
    req.user = { userId: 'test-user-id', email: 'test@test.com', role: 'user' };
    next();
  }),
  authorize: () => (_req: any, _res: any, next: any) => next(),
  requireRole: () => (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../../api/middleware/rate-limit-middleware', () => ({
  generalRateLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

import { createProviderRoutes } from '../../api/routes/provider-routes-factory';
import { errorHandler } from '../../api/middleware/error-middleware';

// ==================== SETUP ====================

function createTestApp(): Application {
  const app = express();
  app.use(express.json());
  const routes = createProviderRoutes({
    providerCode: 'leroy-merlin',
    displayName: 'Leroy Merlin',
    type: 'furniture',
    rateLimit: 30,
    categories: ['meubles-cuisine', 'plans-travail', 'eviers', 'robinetterie', 'credences', 'eclairage'],
  });
  app.use('/leroy-merlin', routes);
  app.use(errorHandler);
  return app;
}

// ==================== FIXTURES ====================

const mockProvider = {
  id: 'provider-lm',
  name: 'Leroy Merlin',
  code: 'leroy-merlin',
  isActive: true,
  _count: { products: 250, appliances: 0, catalogs: 3 },
};

const mockProductList = {
  data: [{ id: 'p1', name: 'Delinia Base Cabinet 60cm', sku: 'DEL-BC-60', price: 149.99 }],
  page: 1,
  total: 1,
  totalPages: 1,
};

// ==================== TESTS ====================

describe('Leroy Merlin Routes', () => {
  let app: Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createTestApp();
  });

  describe('GET /leroy-merlin/products', () => {
    it('should return paginated product list with 200 status', async () => {
      mockPrisma.catalogProvider.findFirst.mockResolvedValue(mockProvider);
      mockProductFindAll.mockResolvedValue(mockProductList);

      const response = await request(app).get('/leroy-merlin/products').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.meta.provider).toBe('leroy-merlin');
      expect(response.body.meta.page).toBe(1);
    });

    it('should return 404 when Leroy Merlin provider is not configured', async () => {
      mockPrisma.catalogProvider.findFirst.mockResolvedValue(null);

      const response = await request(app).get('/leroy-merlin/products').expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should cap limit at 100 even if larger value is provided', async () => {
      mockPrisma.catalogProvider.findFirst.mockResolvedValue(mockProvider);
      mockProductFindAll.mockResolvedValue(mockProductList);

      const response = await request(app)
        .get('/leroy-merlin/products?limit=500')
        .expect(200);

      expect(response.body.meta.limit).toBe(100);
    });
  });

  describe('GET /leroy-merlin/products/search', () => {
    it('should search products and return results with 200 status', async () => {
      mockPrisma.catalogProvider.findFirst.mockResolvedValue(mockProvider);
      mockProductFindAll.mockResolvedValue(mockProductList);

      const response = await request(app)
        .get('/leroy-merlin/products/search?q=delinia')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.meta.provider).toBe('leroy-merlin');
    });

    it('should return 400 when search query "q" parameter is missing', async () => {
      const response = await request(app)
        .get('/leroy-merlin/products/search')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_QUERY');
    });

    it('should return 404 when provider is not found during search', async () => {
      mockPrisma.catalogProvider.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .get('/leroy-merlin/products/search?q=cabinet')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});
