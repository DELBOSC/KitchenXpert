/**
 * Product Routes Integration Tests
 *
 * Tests all product-related endpoints for correct behavior including:
 * - GET /products — list products with filters and pagination (public)
 * - GET /products/search — search products (public)
 * - GET /products/filters — get filter options (public)
 * - GET /products/categories — list categories (public)
 * - GET /products/categories/:slug — get category by slug (public)
 * - GET /products/category/:categoryId — get products by category (public)
 * - GET /products/sku/:sku — get product by SKU (public)
 * - GET /products/:id — get product by ID (public)
 * - GET /products/:id/related — get related products (public)
 * - GET /products/:id/compatibility — check compatibility (public)
 * - POST /products — create product (admin only)
 * - PUT /products/:id — update product (admin only)
 * - DELETE /products/:id — delete product (admin only)
 * - Auth guard (401/403 for admin-only write routes)
 * - Validation (duplicate SKU, missing required fields)
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

// Mock product repository
const mockProductRepository = {
  findAll: jest.fn(),
  search: jest.fn(),
  getBrands: jest.fn(),
  getMaterials: jest.fn(),
  getColors: jest.fn(),
  getPriceRange: jest.fn(),
  findById: jest.fn(),
  findBySku: jest.fn(),
  getRelated: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  getCategories: jest.fn(),
  findCategoryBySlug: jest.fn(),
  findByCategory: jest.fn(),
};

jest.mock('../../repositories/product-repository', () => ({
  ProductRepository: jest.fn(() => mockProductRepository),
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
    optionalAuth: jest.fn((req: any, _res: any, next: any) => {
      if (req.cookies?.accessToken || req.headers.authorization) {
        req.user = { ...currentTestUser };
      }
      next();
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
import productRoutes from '../../api/routes/product-routes';
import { errorHandler } from '../../api/middleware/error-middleware';

// ==================== TEST APP SETUP ====================

function createTestApp(): Application {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/products', productRoutes);
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

const mockProduct = {
  id: 'product-1',
  catalogId: 'catalog-1',
  providerId: 'provider-1',
  categoryId: 'cat-1',
  sku: 'SKU-001',
  name: 'Premium Kitchen Sink',
  description: 'A high quality stainless steel sink',
  brand: 'SinkMaster',
  model: 'SM-500',
  price: 299.99,
  currency: 'EUR',
  width: 60,
  depth: 50,
  height: 20,
  weight: 8.5,
  color: 'Silver',
  material: 'Stainless Steel',
  finish: 'Brushed',
  images: ['https://example.com/sink.jpg'],
  specifications: { bowlCount: 2 },
  availability: 'in_stock',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockProduct2 = {
  id: 'product-2',
  sku: 'SKU-002',
  name: 'Modern Faucet',
  brand: 'FaucetPro',
  price: 149.99,
  currency: 'EUR',
  color: 'Chrome',
  material: 'Brass',
  createdAt: new Date('2024-02-01'),
  updatedAt: new Date('2024-02-01'),
};

const mockCategory = {
  id: 'cat-1',
  name: 'Sinks',
  slug: 'sinks',
  description: 'Kitchen sinks',
  parentId: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

// ==================== TESTS ====================

describe('Product Routes', () => {
  let app: Application;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    currentTestUser = { userId: 'test-user-1', email: 'test@test.com', role: 'user' };
  });

  // ==================== PUBLIC ROUTES ====================

  describe('GET /products (public)', () => {
    it('should return products with pagination without authentication', async () => {
      mockProductRepository.findAll.mockResolvedValue({
        data: [mockProduct, mockProduct2],
        page: 1,
        total: 2,
        totalPages: 1,
      });

      const response = await request(app)
        .get('/products')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta).toHaveProperty('page');
      expect(response.body.meta).toHaveProperty('total');
      expect(response.body.meta).toHaveProperty('totalPages');
    });

    it('should pass filter parameters to repository', async () => {
      mockProductRepository.findAll.mockResolvedValue({
        data: [mockProduct],
        page: 1,
        total: 1,
        totalPages: 1,
      });

      await request(app)
        .get('/products?brand=SinkMaster&minPrice=100&maxPrice=500&page=1&limit=10')
        .expect(200);

      expect(mockProductRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          brand: 'SinkMaster',
          minPrice: 100,
          maxPrice: 500,
        }),
        expect.objectContaining({
          page: 1,
          limit: 10,
        })
      );
    });
  });

  describe('GET /products/search (public)', () => {
    it('should return search results', async () => {
      mockProductRepository.search.mockResolvedValue([mockProduct]);

      const response = await request(app)
        .get('/products/search?q=sink')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });

    it('should return 400 when search query is missing', async () => {
      const response = await request(app)
        .get('/products/search')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Search query is required');
    });
  });

  describe('GET /products/filters (public)', () => {
    it('should return available filter options', async () => {
      mockProductRepository.getBrands.mockResolvedValue(['SinkMaster', 'FaucetPro']);
      mockProductRepository.getMaterials.mockResolvedValue(['Stainless Steel', 'Brass']);
      mockProductRepository.getColors.mockResolvedValue(['Silver', 'Chrome']);
      mockProductRepository.getPriceRange.mockResolvedValue({ min: 50, max: 500 });

      const response = await request(app)
        .get('/products/filters')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('brands');
      expect(response.body.data).toHaveProperty('materials');
      expect(response.body.data).toHaveProperty('colors');
      expect(response.body.data).toHaveProperty('priceRange');
    });
  });

  describe('GET /products/categories (public)', () => {
    it('should return all categories', async () => {
      mockProductRepository.getCategories.mockResolvedValue([mockCategory]);

      const response = await request(app)
        .get('/products/categories')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });
  });

  describe('GET /products/categories/:slug (public)', () => {
    it('should return category by slug', async () => {
      mockProductRepository.findCategoryBySlug.mockResolvedValue(mockCategory);

      const response = await request(app)
        .get('/products/categories/sinks')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.slug).toBe('sinks');
    });

    it('should return 404 for unknown category slug', async () => {
      mockProductRepository.findCategoryBySlug.mockResolvedValue(null);

      const response = await request(app)
        .get('/products/categories/unknown')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /products/category/:categoryId (public)', () => {
    it('should return products by category ID', async () => {
      mockProductRepository.findByCategory.mockResolvedValue([mockProduct]);

      const response = await request(app)
        .get('/products/category/cat-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });
  });

  describe('GET /products/sku/:sku (public)', () => {
    it('should return product by SKU', async () => {
      mockProductRepository.findBySku.mockResolvedValue(mockProduct);

      const response = await request(app)
        .get('/products/sku/SKU-001')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sku).toBe('SKU-001');
    });

    it('should return 404 for unknown SKU', async () => {
      mockProductRepository.findBySku.mockResolvedValue(null);

      const response = await request(app)
        .get('/products/sku/UNKNOWN')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /products/:id (public)', () => {
    it('should return product by ID', async () => {
      mockProductRepository.findById.mockResolvedValue(mockProduct);

      const response = await request(app)
        .get('/products/product-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Premium Kitchen Sink');
    });

    it('should return 404 for non-existent product', async () => {
      mockProductRepository.findById.mockResolvedValue(null);

      const response = await request(app)
        .get('/products/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /products/:id/related (public)', () => {
    it('should return related products', async () => {
      mockProductRepository.getRelated.mockResolvedValue([mockProduct2]);

      const response = await request(app)
        .get('/products/product-1/related')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });

    it('should respect limit query parameter', async () => {
      mockProductRepository.getRelated.mockResolvedValue([mockProduct2]);

      await request(app)
        .get('/products/product-1/related?limit=3')
        .expect(200);

      expect(mockProductRepository.getRelated).toHaveBeenCalledWith('product-1', 3);
    });
  });

  describe('GET /products/:id/compatibility (public)', () => {
    it('should return compatibility data for existing product', async () => {
      mockProductRepository.findById.mockResolvedValue(mockProduct);

      const response = await request(app)
        .get('/products/product-1/compatibility')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.productId).toBe('product-1');
      expect(response.body.data.isCompatible).toBe(true);
    });

    it('should return 404 when product not found', async () => {
      mockProductRepository.findById.mockResolvedValue(null);

      const response = await request(app)
        .get('/products/nonexistent/compatibility')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== AUTH GUARD (admin write routes) ====================

  describe('Authentication and Authorization guard for write routes', () => {
    it('should return 401 for unauthenticated POST /products', async () => {
      const response = await request(app)
        .post('/products')
        .send({ name: 'Test Product', sku: 'TST-001', price: 99 })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 for non-admin user on POST /products', async () => {
      currentTestUser = { userId: 'test-user-1', email: 'test@test.com', role: 'user' };

      const response = await authedRequest(app)
        .post('/products')
        .send({ name: 'Test Product', sku: 'TST-001', price: 99 })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 for unauthenticated PUT /products/:id', async () => {
      const response = await request(app)
        .put('/products/product-1')
        .send({ name: 'Updated' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 for unauthenticated DELETE /products/:id', async () => {
      const response = await request(app)
        .delete('/products/product-1')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== ADMIN WRITE ROUTES ====================

  describe('POST /products (admin)', () => {
    it('should create a product successfully', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockProductRepository.findBySku.mockResolvedValue(null);
      mockProductRepository.create.mockResolvedValue(mockProduct);

      const response = await authedRequest(app)
        .post('/products')
        .send({ name: 'Premium Kitchen Sink', sku: 'SKU-001', price: 299.99 })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('created');
    });

    it('should return 409 when SKU already exists', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockProductRepository.findBySku.mockResolvedValue(mockProduct);

      const response = await authedRequest(app)
        .post('/products')
        .send({ name: 'Duplicate Sink', sku: 'SKU-001', price: 199.99 })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('SKU already exists');
    });

    it('should return 400 when required fields are missing (no name)', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };

      const response = await authedRequest(app)
        .post('/products')
        .send({ sku: 'SKU-003', price: 99 })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /products/:id (admin)', () => {
    it('should update a product successfully', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      const updated = { ...mockProduct, name: 'Updated Sink' };
      mockProductRepository.update.mockResolvedValue(updated);

      const response = await authedRequest(app)
        .put('/products/product-1')
        .send({ name: 'Updated Sink' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Sink');
    });
  });

  describe('DELETE /products/:id (admin)', () => {
    it('should delete a product successfully', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockProductRepository.delete.mockResolvedValue(undefined);

      const response = await authedRequest(app)
        .delete('/products/product-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');
    });
  });
});
