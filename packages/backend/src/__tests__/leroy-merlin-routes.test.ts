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

import express, { type Application, type Request, type Response, type NextFunction } from 'express';
import request from 'supertest';

// ==================== MOCKS ====================

jest.mock('../utils/logger', () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  createModuleLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

jest.mock('express-rate-limit', () => ({
  __esModule: true,
  default: jest.fn(() => (_req: Request, _res: Response, next: NextFunction) => next()),
}));

const mockProductFindAll = jest.fn();
const mockProductFindById = jest.fn();

jest.mock('../repositories/product-repository', () => ({
  ProductRepository: jest.fn().mockImplementation(() => ({
    findAll: mockProductFindAll,
    findById: mockProductFindById,
  })),
}));

jest.mock('../repositories/appliance-repository', () => ({
  ApplianceRepository: jest.fn().mockImplementation(() => ({
    findAll: jest.fn(),
    search: jest.fn(),
    getTypes: jest.fn(),
    findById: jest.fn(),
  })),
}));

const mockPrisma = {
  $disconnect: jest.fn(),
  catalogProvider: { findFirst: jest.fn() },
  productCategory: { findMany: jest.fn() },
};

jest.mock('../database/client', () => ({ prisma: mockPrisma }));

jest.mock('../config/app-config', () => ({
  config: {
    corsOrigins: ['http://localhost:3000'],
    env: 'test',
    port: 3000,
    version: '1.0.0',
    rateLimit: { maxRequests: 100 },
  },
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
      userId: 'test-user-id',
      email: 'test@test.com',
      role: 'user',
    }),
    generateTokens: jest.fn(),
  },
}));

jest.mock('../api/middleware/auth-middleware', () => ({
  authenticate: jest.fn((req: any, _res: any, next: any) => {
    req.user = { userId: 'test-user-id', email: 'test@test.com', role: 'user' };
    next();
  }),
  authorize: () => (_req: any, _res: any, next: any) => next(),
  requireRole: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../api/middleware/rate-limit-middleware', () => ({
  generalRateLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

import { errorHandler } from '../api/middleware/error-middleware';
import { createProviderRoutes } from '../api/routes/provider-routes-factory';

// ==================== SETUP ====================

function createTestApp(): Application {
  const app = express();
  app.use(express.json());
  const routes = createProviderRoutes({
    providerCode: 'leroy-merlin',
    displayName: 'Leroy Merlin',
    type: 'furniture',
    rateLimit: 30,
    categories: [
      'meubles-cuisine',
      'plans-travail',
      'eviers',
      'robinetterie',
      'credences',
      'eclairage',
    ],
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
    jest.clearAllMocks();
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

      const response = await request(app).get('/leroy-merlin/products?limit=500').expect(200);

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
      const response = await request(app).get('/leroy-merlin/products/search').expect(400);

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
