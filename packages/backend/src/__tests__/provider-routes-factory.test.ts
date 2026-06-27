/**
 * Provider Routes Factory Integration Tests
 *
 * Tests the createProviderRoutes factory for correct behavior including:
 * - GET /{provider}/info — get provider metadata
 * - GET /{provider}/products — list products (furniture type)
 * - GET /{provider}/products/search — search products (furniture type)
 * - GET /{provider}/products/:id — get product by ID (furniture type)
 * - GET /{provider}/categories — get categories (furniture type)
 * - GET /{provider}/appliances — list appliances (appliance type)
 * - GET /{provider}/appliances/search — search appliances (appliance type)
 * - GET /{provider}/appliances/types — get appliance types (appliance type)
 * - GET /{provider}/appliances/:id — get appliance by ID (appliance type)
 * - GET /{provider}/sync/status — get sync status (authenticated)
 * - POST /{provider}/sync/trigger — trigger sync (admin only)
 * - Auth guard (401 without token, 403 for non-admin on sync/trigger)
 * - Validation (missing query param, not found)
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

// Mock rate limiter
jest.mock('express-rate-limit', () => {
  return jest.fn(() => (_req: Request, _res: Response, next: NextFunction) => next());
});

// Mock repositories
const mockProductFindAll = jest.fn();
const mockProductFindById = jest.fn();

jest.mock('../repositories/product-repository', () => ({
  ProductRepository: jest.fn().mockImplementation(() => ({
    findAll: mockProductFindAll,
    findById: mockProductFindById,
  })),
}));

const mockApplianceFindAll = jest.fn();
const mockApplianceSearch = jest.fn();
const mockApplianceGetTypes = jest.fn();
const mockApplianceFindById = jest.fn();

jest.mock('../repositories/appliance-repository', () => ({
  ApplianceRepository: jest.fn().mockImplementation(() => ({
    findAll: mockApplianceFindAll,
    search: mockApplianceSearch,
    getTypes: mockApplianceGetTypes,
    findById: mockApplianceFindById,
  })),
}));

// Mock database client
const mockPrisma = {
  $disconnect: jest.fn(),
  catalogProvider: {
    findFirst: jest.fn(),
  },
  productCategory: {
    findMany: jest.fn(),
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

// Mock provider-sync job — POST /sync/trigger dynamically imports it.
jest.mock('../jobs/provider-sync.job.js', () => ({
  runProviderSync: jest.fn(async () => [
    { provider: 'leroy-merlin', inserted: 0, updated: 0, skipped: 0, durationMs: 12 },
  ]),
}));
jest.mock('../jobs/provider-sync.job', () => ({
  runProviderSync: jest.fn(async () => [
    { provider: 'leroy-merlin', inserted: 0, updated: 0, skipped: 0, durationMs: 12 },
  ]),
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
import { createProviderRoutes } from '../api/routes/provider-routes-factory';

// ==================== TEST APP SETUP ====================

function createFurnitureTestApp(): Application {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  const furnitureRoutes = createProviderRoutes({
    providerCode: 'leroy-merlin',
    displayName: 'Leroy Merlin',
    type: 'furniture',
    rateLimit: 100,
  });
  app.use('/leroy-merlin', furnitureRoutes);
  app.use(errorHandler);
  return app;
}

function createApplianceTestApp(): Application {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  const applianceRoutes = createProviderRoutes({
    providerCode: 'bosch',
    displayName: 'Bosch',
    type: 'appliance',
    rateLimit: 100,
  });
  app.use('/bosch', applianceRoutes);
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

const mockProvider = {
  id: 'provider-1',
  name: 'Leroy Merlin',
  code: 'leroy-merlin',
  isActive: true,
  _count: {
    products: 250,
    appliances: 0,
    catalogs: 3,
  },
};

const mockBoschProvider = {
  id: 'provider-2',
  name: 'Bosch',
  code: 'bosch',
  isActive: true,
  _count: {
    products: 0,
    appliances: 150,
    catalogs: 2,
  },
};

const mockProduct = {
  id: 'product-1',
  name: 'Delinia Base Cabinet 60cm',
  sku: 'DEL-BC-60',
  price: 149.99,
  brand: 'Delinia',
  providerId: 'provider-1',
};

const mockProductList = {
  data: [mockProduct],
  page: 1,
  total: 1,
  totalPages: 1,
};

const mockAppliance = {
  id: 'appliance-1',
  name: 'Bosch Serie 6 Dishwasher',
  brand: 'Bosch',
  type: 'dishwasher',
  price: 599.99,
  energyRating: 'A+++',
};

const mockApplianceList = {
  data: [mockAppliance],
  page: 1,
  total: 1,
  totalPages: 1,
};

const mockCategories = [
  { id: 'cat-1', name: 'Base Cabinets', _count: { products: 50 } },
  { id: 'cat-2', name: 'Wall Cabinets', _count: { products: 30 } },
];

const mockProviderWithCatalogs = {
  ...mockProvider,
  catalogs: [
    {
      lastSyncAt: new Date('2024-06-01'),
      version: '2.1.0',
    },
  ],
};

// ==================== TESTS ====================

describe('Provider Routes Factory', () => {
  // ==================== FURNITURE PROVIDER ====================

  describe('Furniture Provider (Leroy Merlin)', () => {
    let app: Application;

    beforeAll(() => {
      app = createFurnitureTestApp();
    });

    beforeEach(() => {
      jest.clearAllMocks();
      currentTestUser = { userId: 'test-user-1', email: 'test@test.com', role: 'user' };
    });

    // ==================== GET /info ====================

    describe('GET /leroy-merlin/info', () => {
      it('should return provider info', async () => {
        mockPrisma.catalogProvider.findFirst.mockResolvedValue(mockProvider);

        const response = await request(app).get('/leroy-merlin/info').expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.code).toBe('leroy-merlin');
        expect(response.body.data.productCount).toBe(250);
      });

      it('should return 404 when provider not configured', async () => {
        mockPrisma.catalogProvider.findFirst.mockResolvedValue(null);

        const response = await request(app).get('/leroy-merlin/info').expect(404);

        expect(response.body.success).toBe(false);
        expect(JSON.stringify(response.body)).toContain('Leroy Merlin');
      });
    });

    // ==================== GET /products ====================

    describe('GET /leroy-merlin/products', () => {
      it('should list products with pagination', async () => {
        mockPrisma.catalogProvider.findFirst.mockResolvedValue(mockProvider);
        mockProductFindAll.mockResolvedValue(mockProductList);

        const response = await request(app).get('/leroy-merlin/products').expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.meta.provider).toBe('leroy-merlin');
        expect(response.body.meta.page).toBe(1);
      });

      it('should accept filter parameters', async () => {
        mockPrisma.catalogProvider.findFirst.mockResolvedValue(mockProvider);
        mockProductFindAll.mockResolvedValue(mockProductList);

        const response = await request(app)
          .get(
            '/leroy-merlin/products?page=2&limit=10&material=wood&color=white&minPrice=50&maxPrice=200'
          )
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(mockProductFindAll).toHaveBeenCalledWith(
          expect.objectContaining({
            providerId: 'provider-1',
            material: 'wood',
            color: 'white',
            minPrice: 50,
            maxPrice: 200,
          }),
          expect.objectContaining({
            page: 2,
            limit: 10,
          })
        );
      });

      it('should cap limit at 100', async () => {
        mockPrisma.catalogProvider.findFirst.mockResolvedValue(mockProvider);
        mockProductFindAll.mockResolvedValue(mockProductList);

        const response = await request(app).get('/leroy-merlin/products?limit=500').expect(200);

        expect(response.body.meta.limit).toBe(100);
      });

      it('should return 404 when provider not found', async () => {
        mockPrisma.catalogProvider.findFirst.mockResolvedValue(null);

        const response = await request(app).get('/leroy-merlin/products').expect(404);

        expect(response.body.success).toBe(false);
      });
    });

    // ==================== GET /products/search ====================

    describe('GET /leroy-merlin/products/search', () => {
      it('should search products', async () => {
        mockPrisma.catalogProvider.findFirst.mockResolvedValue(mockProvider);
        mockProductFindAll.mockResolvedValue(mockProductList);

        const response = await request(app)
          .get('/leroy-merlin/products/search?q=cabinet')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.meta.provider).toBe('leroy-merlin');
      });

      it('should return 400 when query is missing', async () => {
        const response = await request(app).get('/leroy-merlin/products/search').expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('MISSING_QUERY');
      });

      it('should return 404 when provider not found for search', async () => {
        mockPrisma.catalogProvider.findFirst.mockResolvedValue(null);

        const response = await request(app)
          .get('/leroy-merlin/products/search?q=cabinet')
          .expect(404);

        expect(response.body.success).toBe(false);
      });
    });

    // ==================== GET /products/:id ====================

    describe('GET /leroy-merlin/products/:id', () => {
      it('should return a product by ID', async () => {
        mockProductFindById.mockResolvedValue(mockProduct);

        const response = await request(app).get('/leroy-merlin/products/product-1').expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe('product-1');
      });

      it('should return 404 when product not found', async () => {
        mockProductFindById.mockResolvedValue(null);

        const response = await request(app).get('/leroy-merlin/products/nonexistent').expect(404);

        expect(response.body.success).toBe(false);
        expect(JSON.stringify(response.body)).toContain('Product not found');
      });
    });

    // ==================== GET /categories ====================

    describe('GET /leroy-merlin/categories', () => {
      it('should return categories for the provider', async () => {
        mockPrisma.catalogProvider.findFirst.mockResolvedValue(mockProvider);
        mockPrisma.productCategory.findMany.mockResolvedValue(mockCategories);

        const response = await request(app).get('/leroy-merlin/categories').expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(2);
      });

      it('should return 404 when provider not found', async () => {
        mockPrisma.catalogProvider.findFirst.mockResolvedValue(null);

        const response = await request(app).get('/leroy-merlin/categories').expect(404);

        expect(response.body.success).toBe(false);
      });
    });

    // ==================== SYNC ROUTES ====================

    describe('GET /leroy-merlin/sync/status', () => {
      it('should return sync status for authenticated user', async () => {
        mockPrisma.catalogProvider.findFirst.mockResolvedValue(mockProviderWithCatalogs);

        const response = await authedRequest(app).get('/leroy-merlin/sync/status').expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.providerCode).toBe('leroy-merlin');
        expect(response.body.data.lastSyncAt).toBeDefined();
        expect(response.body.data.catalogVersion).toBe('2.1.0');
      });

      it('should return 401 for unauthenticated request', async () => {
        const response = await request(app).get('/leroy-merlin/sync/status').expect(401);

        expect(response.body.success).toBe(false);
      });

      it('should return 404 when provider not found', async () => {
        mockPrisma.catalogProvider.findFirst.mockResolvedValue(null);

        const response = await authedRequest(app).get('/leroy-merlin/sync/status').expect(404);

        expect(response.body.success).toBe(false);
      });

      it('should handle provider with no catalogs', async () => {
        mockPrisma.catalogProvider.findFirst.mockResolvedValue({
          ...mockProvider,
          catalogs: [],
        });

        const response = await authedRequest(app).get('/leroy-merlin/sync/status').expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.lastSyncAt).toBeNull();
        expect(response.body.data.catalogVersion).toBeNull();
      });
    });

    describe('POST /leroy-merlin/sync/trigger', () => {
      it('should trigger sync for admin', async () => {
        currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
        mockPrisma.catalogProvider.findFirst.mockResolvedValue(mockProvider);

        const response = await authedRequest(app).post('/leroy-merlin/sync/trigger').expect(202);
        expect(response.body.success).toBe(true);
        expect(response.body.data.providerCode).toBe('leroy-merlin');
      });

      it('should return 401 for unauthenticated request', async () => {
        const response = await request(app).post('/leroy-merlin/sync/trigger').expect(401);

        expect(response.body.success).toBe(false);
      });

      it('should return 403 for non-admin user', async () => {
        currentTestUser = { userId: 'test-user-1', email: 'test@test.com', role: 'user' };

        const response = await authedRequest(app).post('/leroy-merlin/sync/trigger').expect(403);

        expect(response.body.success).toBe(false);
      });

      it('should return 404 when provider not found', async () => {
        currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
        mockPrisma.catalogProvider.findFirst.mockResolvedValue(null);

        const response = await authedRequest(app).post('/leroy-merlin/sync/trigger').expect(404);

        expect(response.body.success).toBe(false);
      });
    });
  });

  // ==================== APPLIANCE PROVIDER ====================

  describe('Appliance Provider (Bosch)', () => {
    let app: Application;

    beforeAll(() => {
      app = createApplianceTestApp();
    });

    beforeEach(() => {
      jest.clearAllMocks();
      currentTestUser = { userId: 'test-user-1', email: 'test@test.com', role: 'user' };
    });

    // ==================== GET /info ====================

    describe('GET /bosch/info', () => {
      it('should return provider info for appliance provider', async () => {
        mockPrisma.catalogProvider.findFirst.mockResolvedValue(mockBoschProvider);

        const response = await request(app).get('/bosch/info').expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.code).toBe('bosch');
        expect(response.body.data.applianceCount).toBe(150);
      });
    });

    // ==================== GET /appliances ====================

    describe('GET /bosch/appliances', () => {
      it('should list appliances with pagination', async () => {
        mockApplianceFindAll.mockResolvedValue(mockApplianceList);

        const response = await request(app).get('/bosch/appliances').expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.meta.provider).toBe('bosch');
      });

      it('should accept filter parameters', async () => {
        mockApplianceFindAll.mockResolvedValue(mockApplianceList);

        const response = await request(app)
          .get(
            '/bosch/appliances?page=1&limit=10&type=dishwasher&energyRating=A%2B%2B%2B&minPrice=300&maxPrice=800'
          )
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(mockApplianceFindAll).toHaveBeenCalledWith(
          expect.objectContaining({
            brand: 'Bosch',
            type: 'dishwasher',
            energyRating: 'A+++',
          }),
          expect.objectContaining({
            page: 1,
            limit: 10,
          })
        );
      });

      it('should cap limit at 100', async () => {
        mockApplianceFindAll.mockResolvedValue(mockApplianceList);

        const response = await request(app).get('/bosch/appliances?limit=500').expect(200);

        expect(response.body.meta.limit).toBe(100);
      });
    });

    // ==================== GET /appliances/search ====================

    describe('GET /bosch/appliances/search', () => {
      it('should search appliances', async () => {
        mockApplianceSearch.mockResolvedValue([mockAppliance]);

        const response = await request(app)
          .get('/bosch/appliances/search?q=dishwasher')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.meta.provider).toBe('bosch');
      });

      it('should return 400 when query is missing', async () => {
        const response = await request(app).get('/bosch/appliances/search').expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('MISSING_QUERY');
      });
    });

    // ==================== GET /appliances/types ====================

    describe('GET /bosch/appliances/types', () => {
      it('should return appliance types', async () => {
        mockApplianceGetTypes.mockResolvedValue(['oven', 'dishwasher', 'cooktop', 'refrigerator']);

        const response = await request(app).get('/bosch/appliances/types').expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toContain('oven');
        expect(response.body.data).toContain('dishwasher');
      });
    });

    // ==================== GET /appliances/:id ====================

    describe('GET /bosch/appliances/:id', () => {
      it('should return an appliance by ID', async () => {
        mockApplianceFindById.mockResolvedValue(mockAppliance);

        const response = await request(app).get('/bosch/appliances/appliance-1').expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe('appliance-1');
      });

      it('should return 404 when appliance not found', async () => {
        mockApplianceFindById.mockResolvedValue(null);

        const response = await request(app).get('/bosch/appliances/nonexistent').expect(404);

        expect(response.body.success).toBe(false);
        expect(JSON.stringify(response.body)).toContain('Appliance not found');
      });
    });

    // ==================== SYNC ROUTES ====================

    describe('POST /bosch/sync/trigger', () => {
      it('should trigger sync for admin on appliance provider', async () => {
        currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
        mockPrisma.catalogProvider.findFirst.mockResolvedValue(mockBoschProvider);

        const response = await authedRequest(app).post('/bosch/sync/trigger').expect(202);

        // The handler now runs the sync inline and reports stats; no
        // message envelope is included any more.
        expect(response.body.success).toBe(true);
        expect(response.body.data.providerCode).toBe('bosch');
      });

      it('should return 403 for non-admin on appliance provider', async () => {
        currentTestUser = { userId: 'test-user-1', email: 'test@test.com', role: 'user' };

        const response = await authedRequest(app).post('/bosch/sync/trigger').expect(403);

        expect(response.body.success).toBe(false);
      });
    });
  });

  // ==================== FACTORY CONFIGURATION ====================

  describe('Factory configuration', () => {
    it('should create furniture routes with products endpoint', async () => {
      const router = createProviderRoutes({
        providerCode: 'test-furniture',
        displayName: 'Test Furniture',
        type: 'furniture',
      });

      expect(router).toBeDefined();
      // Verify router has stacks (routes registered)
      expect(router.stack.length).toBeGreaterThan(0);
    });

    it('should create appliance routes with appliances endpoint', async () => {
      const router = createProviderRoutes({
        providerCode: 'test-appliance',
        displayName: 'Test Appliance',
        type: 'appliance',
      });

      expect(router).toBeDefined();
      expect(router.stack.length).toBeGreaterThan(0);
    });
  });
});
