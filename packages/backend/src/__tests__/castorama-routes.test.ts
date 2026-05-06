/**
 * Castorama Routes Tests
 *
 * Tests Castorama catalog provider endpoints (furniture type via factory):
 * - GET /castorama/info (provider metadata)
 * - GET /castorama/products (list products with pagination)
 * - GET /castorama/products/search (search products)
 * - GET /castorama/products/:id (get product by ID)
 * - GET /castorama/categories (list product categories)
 */

import request from 'supertest';
import express, { type Application, type Request, type Response, type NextFunction } from 'express';
import cookieParser from 'cookie-parser';

// ==================== MOCKS ====================

jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  createModuleLogger: jest.fn(() => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() })),
}));

const mockPrisma = {
  $disconnect: jest.fn(),
  catalogProvider: {
    findFirst: jest.fn().mockResolvedValue({
      id: 'provider-castorama',
      name: 'Castorama',
      code: 'castorama',
      isActive: true,
      _count: { products: 200, appliances: 0, catalogs: 3 },
      catalogs: [{ lastSyncAt: new Date('2025-02-01'), version: '3.0' }],
    }),
  },
  productCategory: {
    findMany: jest.fn().mockResolvedValue([
      { id: 'cat-1', name: 'Meubles Cuisine', slug: 'meubles-cuisine', _count: { products: 80 } },
      { id: 'cat-2', name: 'Plans de travail', slug: 'plans-travail', _count: { products: 40 } },
    ]),
  },
};

jest.mock('../database/client', () => ({
  prisma: mockPrisma,
}));

const mockProductRepository = {
  findAll: jest.fn().mockResolvedValue({
    data: [{ id: 'p1', name: 'GoodHome Alpinia', price: 129.99, provider: 'castorama' }],
    page: 1,
    total: 1,
    totalPages: 1,
  }),
  findById: jest.fn().mockResolvedValue({
    id: 'p1', name: 'GoodHome Alpinia', price: 129.99, provider: 'castorama',
  }),
};

jest.mock('../repositories/product-repository', () => ({
  ProductRepository: jest.fn(() => mockProductRepository),
}));

jest.mock('../repositories/appliance-repository', () => ({
  ApplianceRepository: jest.fn(() => ({
    findAll: jest.fn().mockResolvedValue({ data: [], page: 1, total: 0, totalPages: 0 }),
    search: jest.fn().mockResolvedValue([]),
    getTypes: jest.fn().mockResolvedValue([]),
    findById: jest.fn().mockResolvedValue(null),
  })),
}));

// Mock rate limiter
jest.mock('express-rate-limit', () => ({
  __esModule: true,
  default: () => (_req: Request, _res: Response, next: NextFunction) => next(),
}));

// Mock auth middleware
let mockAuthenticated = true;

jest.mock('../api/middleware/auth-middleware', () => ({
  authenticate: (req: any, res: any, next: any) => {
    if (!mockAuthenticated) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }
    req.user = { userId: 'test-user-1', email: 'user@test.com', role: 'user' };
    next();
  },
  authorize: (roles: string[]) => (req: any, res: any, next: any) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }
    next();
  },
}));

jest.mock('../api/middleware/error-middleware', () => ({
  asyncHandler: (fn: any) => (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  },
}));

import castoramaRoutes from '../api/routes/castorama-routes';

// ==================== TEST APP ====================

function createTestApp(): Application {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/castorama', castoramaRoutes);
  return app;
}

// ==================== TESTS ====================

describe('Castorama Routes', () => {
  let app: Application;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
    mockAuthenticated = true;

    // Reset provider mock
    mockPrisma.catalogProvider.findFirst.mockResolvedValue({
      id: 'provider-castorama',
      name: 'Castorama',
      code: 'castorama',
      isActive: true,
      _count: { products: 200, appliances: 0, catalogs: 3 },
      catalogs: [{ lastSyncAt: new Date('2025-02-01'), version: '3.0' }],
    });
  });

  describe('GET /castorama/info', () => {
    it('should return Castorama provider metadata', async () => {
      const response = await request(app)
        .get('/castorama/info')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.code).toBe('castorama');
      expect(response.body.data).toHaveProperty('productCount');
    });

    it('should return 404 when provider not configured', async () => {
      mockPrisma.catalogProvider.findFirst.mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/castorama/info')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /castorama/products', () => {
    it('should list Castorama products with pagination', async () => {
      const response = await request(app)
        .get('/castorama/products')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.meta).toHaveProperty('page');
      expect(response.body.meta).toHaveProperty('total');
      expect(response.body.meta.provider).toBe('castorama');
    });

    it('should return 404 when provider not found', async () => {
      mockPrisma.catalogProvider.findFirst.mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/castorama/products')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /castorama/products/search', () => {
    it('should search Castorama products', async () => {
      const response = await request(app)
        .get('/castorama/products/search?q=GoodHome')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockProductRepository.findAll).toHaveBeenCalled();
    });

    it('should return 400 when query parameter is missing', async () => {
      const response = await request(app)
        .get('/castorama/products/search')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_QUERY');
    });
  });

  describe('GET /castorama/products/:id', () => {
    it('should return product details by ID', async () => {
      const response = await request(app)
        .get('/castorama/products/p1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(mockProductRepository.findById).toHaveBeenCalledWith('p1');
    });

    it('should return 404 when product not found', async () => {
      mockProductRepository.findById.mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/castorama/products/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /castorama/categories', () => {
    it('should return product categories', async () => {
      const response = await request(app)
        .get('/castorama/categories')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});
