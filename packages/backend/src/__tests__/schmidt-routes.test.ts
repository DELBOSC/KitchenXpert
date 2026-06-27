/**
 * Schmidt Routes Tests
 *
 * Tests the Schmidt catalog provider endpoints:
 * - GET /schmidt/products — list products with pagination
 * - GET /schmidt/products/search — search products by query
 * - GET /schmidt/info — provider metadata
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

// Import after mocks
import { errorHandler } from '../api/middleware/error-middleware';
import { createProviderRoutes } from '../api/routes/provider-routes-factory';

// ==================== SETUP ====================

function createTestApp(): Application {
  const app = express();
  app.use(express.json());
  const schmidtRoutes = createProviderRoutes({
    providerCode: 'schmidt',
    displayName: 'Schmidt',
    type: 'furniture',
    rateLimit: 30,
    categories: ['cuisines', 'rangements', 'arcos', 'loft'],
  });
  app.use('/schmidt', schmidtRoutes);
  app.use(errorHandler);
  return app;
}

// ==================== FIXTURES ====================

const mockProvider = {
  id: 'provider-schmidt',
  name: 'Schmidt',
  code: 'schmidt',
  isActive: true,
  _count: { products: 120, appliances: 0, catalogs: 2 },
};

const mockProductList = {
  data: [{ id: 'p1', name: 'Schmidt Arcos Cabinet', sku: 'SCH-ARC-01', price: 399.99 }],
  page: 1,
  total: 1,
  totalPages: 1,
};

// ==================== TESTS ====================

describe('Schmidt Routes', () => {
  let app: Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createTestApp();
  });

  describe('GET /schmidt/products', () => {
    it('should return paginated product list with 200 status', async () => {
      mockPrisma.catalogProvider.findFirst.mockResolvedValue(mockProvider);
      mockProductFindAll.mockResolvedValue(mockProductList);

      const response = await request(app).get('/schmidt/products').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.meta.provider).toBe('schmidt');
    });

    it('should return 404 when Schmidt provider is not configured', async () => {
      mockPrisma.catalogProvider.findFirst.mockResolvedValue(null);

      const response = await request(app).get('/schmidt/products').expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should pass filter query parameters to the repository', async () => {
      mockPrisma.catalogProvider.findFirst.mockResolvedValue(mockProvider);
      mockProductFindAll.mockResolvedValue(mockProductList);

      await request(app)
        .get('/schmidt/products?page=2&limit=10&material=oak&color=white')
        .expect(200);

      expect(mockProductFindAll).toHaveBeenCalledWith(
        expect.objectContaining({
          providerId: 'provider-schmidt',
          material: 'oak',
          color: 'white',
        }),
        expect.objectContaining({ page: 2, limit: 10 })
      );
    });
  });

  describe('GET /schmidt/products/search', () => {
    it('should search products and return results with 200 status', async () => {
      mockPrisma.catalogProvider.findFirst.mockResolvedValue(mockProvider);
      mockProductFindAll.mockResolvedValue(mockProductList);

      const response = await request(app).get('/schmidt/products/search?q=arcos').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.meta.provider).toBe('schmidt');
    });

    it('should return 400 when search query "q" is missing', async () => {
      const response = await request(app).get('/schmidt/products/search').expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_QUERY');
    });
  });

  describe('GET /schmidt/info', () => {
    it('should return provider metadata with product counts', async () => {
      mockPrisma.catalogProvider.findFirst.mockResolvedValue(mockProvider);

      const response = await request(app).get('/schmidt/info').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.code).toBe('schmidt');
      expect(response.body.data.productCount).toBe(120);
    });
  });
});
