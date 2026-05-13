/**
 * Shopping List Routes Integration Tests
 *
 * Tests all shopping list endpoints for correct behavior including:
 * - GET /shopping-list/:kitchenId — get shopping list for a kitchen
 * - Auth guard (401 without token)
 * - IDOR prevention (403 for non-owner)
 * - Correct item grouping, totals, and tax calculation
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

// Mock database client
const mockPrisma = {
  kitchen: {
    findUnique: jest.fn(),
  },
  kitchenItem: {
    findMany: jest.fn(),
  },
  $transaction: jest.fn(),
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
  generalRateLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

// Import after mocks
import { errorHandler } from '../api/middleware/error-middleware';
import shoppingListRoutes from '../api/routes/shopping-list-routes';

// ==================== TEST APP SETUP ====================

function createTestApp(): Application {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/shopping-list', shoppingListRoutes);
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

const mockKitchen = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  userId: 'test-user-1',
  name: 'My Kitchen',
};

const otherUserKitchen = {
  id: '660e8400-e29b-41d4-a716-446655440001',
  userId: 'other-user-99',
  name: 'Other Kitchen',
};

const mockKitchenItems = [
  {
    id: 'item-1',
    kitchenId: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Base Cabinet',
    type: 'base_cabinet',
    price: 250,
    brand: 'IKEA',
    product: {
      name: 'METOD Base Cabinet',
      price: 250,
      sku: 'MET-001',
      brand: 'IKEA',
    },
    appliance: null,
  },
  {
    id: 'item-2',
    kitchenId: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Wall Cabinet',
    type: 'wall_cabinet',
    price: 180,
    brand: 'IKEA',
    product: {
      name: 'METOD Wall Cabinet',
      price: 180,
      sku: 'MET-002',
      brand: 'IKEA',
    },
    appliance: null,
  },
  {
    id: 'item-3',
    kitchenId: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Oven',
    type: 'oven',
    price: 800,
    brand: 'Bosch',
    product: null,
    appliance: {
      name: 'Bosch Serie 6 Oven',
      price: 800,
      brand: 'Bosch',
    },
  },
  {
    id: 'item-4',
    kitchenId: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Granite Countertop',
    type: 'countertop',
    price: 1500,
    brand: null,
    product: null,
    appliance: null,
  },
];

const duplicateKitchenItems = [
  {
    id: 'item-5',
    kitchenId: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Base Cabinet',
    type: 'base_cabinet',
    price: 250,
    brand: 'IKEA',
    product: {
      name: 'METOD Base Cabinet',
      price: 250,
      sku: 'MET-001',
      brand: 'IKEA',
    },
    appliance: null,
  },
  {
    id: 'item-6',
    kitchenId: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Base Cabinet',
    type: 'base_cabinet',
    price: 250,
    brand: 'IKEA',
    product: {
      name: 'METOD Base Cabinet',
      price: 250,
      sku: 'MET-001',
      brand: 'IKEA',
    },
    appliance: null,
  },
];

// ==================== TESTS ====================

describe('Shopping List Routes', () => {
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
    it('should return 401 for unauthenticated request to GET /shopping-list/:kitchenId', async () => {
      const response = await request(app)
        .get('/shopping-list/kitchen-1')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== GET /shopping-list/:kitchenId ====================

  describe('GET /shopping-list/:kitchenId', () => {
    it('should return shopping list for the kitchen owner', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);
      mockPrisma.kitchenItem.findMany.mockResolvedValue(mockKitchenItems);

      const response = await authedRequest(app)
        .get('/shopping-list/kitchen-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toBeDefined();
      expect(response.body.data.items.length).toBeGreaterThan(0);
      expect(response.body.data.subtotal).toBeDefined();
      expect(response.body.data.tax).toBeDefined();
      expect(response.body.data.total).toBeDefined();
    });

    it('should return 404 when kitchen does not exist', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(null);

      const response = await authedRequest(app)
        .get('/shopping-list/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Kitchen not found');
    });

    it('should return 403 when non-owner tries to access (IDOR prevention)', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(otherUserKitchen);

      const response = await authedRequest(app)
        .get('/shopping-list/kitchen-2')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access denied');
    });

    it('should allow admin to access any shopping list', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockPrisma.kitchen.findUnique.mockResolvedValue(otherUserKitchen);
      mockPrisma.kitchenItem.findMany.mockResolvedValue([]);

      const response = await authedRequest(app)
        .get('/shopping-list/kitchen-2')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return empty items when kitchen has no items', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);
      mockPrisma.kitchenItem.findMany.mockResolvedValue([]);

      const response = await authedRequest(app)
        .get('/shopping-list/kitchen-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toEqual([]);
      expect(response.body.data.subtotal).toBe(0);
      expect(response.body.data.tax).toBe(0);
      expect(response.body.data.total).toBe(0);
    });

    it('should group duplicate items by name+type+price and compute quantities', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);
      mockPrisma.kitchenItem.findMany.mockResolvedValue(duplicateKitchenItems);

      const response = await authedRequest(app)
        .get('/shopping-list/kitchen-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      // Two identical items should be grouped into one with quantity 2
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].quantity).toBe(2);
      expect(response.body.data.items[0].totalPrice).toBe(500);
    });

    it('should correctly categorize items by type', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);
      mockPrisma.kitchenItem.findMany.mockResolvedValue(mockKitchenItems);

      const response = await authedRequest(app)
        .get('/shopping-list/kitchen-1')
        .expect(200);

      const items = response.body.data.items;
      const categories = items.map((item: any) => item.category);

      expect(categories).toContain('Cabinets');
      expect(categories).toContain('Appliances');
      expect(categories).toContain('Countertops');
    });

    it('should calculate tax at 20% (TVA)', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);
      mockPrisma.kitchenItem.findMany.mockResolvedValue(mockKitchenItems);

      const response = await authedRequest(app)
        .get('/shopping-list/kitchen-1')
        .expect(200);

      const { subtotal, tax, total } = response.body.data;
      // TVA = 20%
      expect(tax).toBe(Math.round(subtotal * 0.2 * 100) / 100);
      expect(total).toBe(Math.round((subtotal + tax) * 100) / 100);
    });

    it('should use product name and price when product is available', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);
      mockPrisma.kitchenItem.findMany.mockResolvedValue([mockKitchenItems[0]]);

      const response = await authedRequest(app)
        .get('/shopping-list/kitchen-1')
        .expect(200);

      const item = response.body.data.items[0];
      expect(item.name).toBe('METOD Base Cabinet');
      expect(item.unitPrice).toBe(250);
      expect(item.sku).toBe('MET-001');
      expect(item.brand).toBe('IKEA');
    });

    it('should use appliance name and price when appliance is available', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);
      mockPrisma.kitchenItem.findMany.mockResolvedValue([mockKitchenItems[2]]);

      const response = await authedRequest(app)
        .get('/shopping-list/kitchen-1')
        .expect(200);

      const item = response.body.data.items[0];
      expect(item.name).toBe('Bosch Serie 6 Oven');
      expect(item.unitPrice).toBe(800);
      expect(item.brand).toBe('Bosch');
      expect(item.category).toBe('Appliances');
    });

    it('should fall back to item price when no product or appliance', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);
      mockPrisma.kitchenItem.findMany.mockResolvedValue([mockKitchenItems[3]]);

      const response = await authedRequest(app)
        .get('/shopping-list/kitchen-1')
        .expect(200);

      const item = response.body.data.items[0];
      expect(item.name).toBe('Granite Countertop');
      expect(item.unitPrice).toBe(1500);
      expect(item.category).toBe('Countertops');
    });

    it('should include sku from product when available', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);
      mockPrisma.kitchenItem.findMany.mockResolvedValue([mockKitchenItems[0]]);

      const response = await authedRequest(app)
        .get('/shopping-list/kitchen-1')
        .expect(200);

      expect(response.body.data.items[0].sku).toBe('MET-001');
    });

    it('should verify kitchen query uses correct kitchenId', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);
      mockPrisma.kitchenItem.findMany.mockResolvedValue([]);

      await authedRequest(app)
        .get('/shopping-list/550e8400-e29b-41d4-a716-446655440000')
        .expect(200);

      expect(mockPrisma.kitchen.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: '550e8400-e29b-41d4-a716-446655440000' },
        })
      );
    });
  });

  // ==================== EDGE CASES ====================

  describe('Edge cases', () => {
    it('should handle concurrent requests gracefully', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);
      mockPrisma.kitchenItem.findMany.mockResolvedValue([]);

      const results = await Promise.all([
        authedRequest(app).get('/shopping-list/kitchen-1'),
        authedRequest(app).get('/shopping-list/kitchen-1'),
        authedRequest(app).get('/shopping-list/kitchen-1'),
      ]);

      results.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    it('should handle items with zero price', async () => {
      const zeroItem = {
        id: 'item-free',
        kitchenId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Free Accessory',
        type: 'accessory',
        price: 0,
        brand: null,
        product: null,
        appliance: null,
      };
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);
      mockPrisma.kitchenItem.findMany.mockResolvedValue([zeroItem]);

      const response = await authedRequest(app)
        .get('/shopping-list/kitchen-1')
        .expect(200);

      expect(response.body.data.items[0].unitPrice).toBe(0);
      expect(response.body.data.total).toBe(0);
    });
  });
});
