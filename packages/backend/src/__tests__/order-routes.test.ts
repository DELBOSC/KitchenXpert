/**
 * Order Routes Integration Tests
 *
 * Tests all order-related endpoints for correct behavior including:
 * - GET /orders — list user's orders with pagination
 * - POST /orders — create order with validation
 * - GET /orders/:id — get by ID with IDOR prevention
 * - PUT /orders/:id — update with IDOR prevention and status checks
 * - POST /orders/:id/cancel — cancel order with IDOR and cancellable status check
 * - GET /orders/stats — order statistics for current user
 * - GET /orders/recent — recent orders for current user
 * - PUT /orders/:id/status — admin-only status update
 */

import request from 'supertest';
import express, { Application, Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';

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
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
  },
  $transaction: jest.fn(),
  $disconnect: jest.fn(),
};

jest.mock('../database/client', () => ({
  prisma: mockPrisma,
}));

// Mock order repository
const mockOrderRepository = {
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  cancel: jest.fn(),
  updateStatus: jest.fn(),
  getUserStats: jest.fn(),
  getRecentOrders: jest.fn(),
};

jest.mock('../repositories/order-repository', () => ({
  OrderRepository: jest.fn().mockImplementation(() => mockOrderRepository),
}));

// Mock mail service
jest.mock('../services/mail.service', () => ({
  getMailService: jest.fn(() => ({
    sendOrderConfirmation: jest.fn().mockResolvedValue(undefined),
  })),
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
  const { UnauthorizedError, ForbiddenError } = require('@kitchenxpert/common');

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
        return next(new ForbiddenError(`Access denied. Required roles: ${roles.join(', ')}`));
      }
      next();
    },
    requireRole: (...roles: string[]) => (req: any, _res: any, next: any) => {
      if (!req.user) {
        return next(new UnauthorizedError('Authentication required'));
      }
      if (!roles.includes(req.user.role)) {
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
import orderRoutes from '../api/routes/order-routes';
import { errorHandler } from '../api/middleware/error-middleware';

// ==================== TEST APP SETUP ====================

function createTestApp(): Application {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/orders', orderRoutes);
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

const validShippingAddress = {
  street: '123 Main St',
  city: 'Paris',
  postalCode: '75001',
  country: 'FR',
};

const validOrderPayload = {
  items: [
    { productId: 'prod-1', name: 'Cabinet', quantity: 2, unitPrice: 500 },
  ],
  shippingAddress: validShippingAddress,
};

const mockOrder = {
  id: 'order-1',
  orderNumber: 'ORD-001',
  userId: 'test-user-1',
  status: 'pending',
  items: [
    { name: 'Cabinet', sku: 'CAB-001', quantity: 2, unitPrice: 500, totalPrice: 1000 },
  ],
  subtotal: 1000,
  tax: 200,
  shipping: 50,
  total: 1250,
  currency: 'EUR',
  shippingAddress: validShippingAddress,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const otherUserOrder = {
  id: 'order-2',
  orderNumber: 'ORD-002',
  userId: 'other-user-99',
  status: 'pending',
  items: [],
  subtotal: 500,
  tax: 100,
  shipping: 25,
  total: 625,
  currency: 'EUR',
  shippingAddress: validShippingAddress,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

// ==================== TESTS ====================

describe('Order Routes', () => {
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
    it('should return 401 for unauthenticated request to GET /orders', async () => {
      const response = await request(app)
        .get('/orders')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 for unauthenticated request to POST /orders', async () => {
      const response = await request(app)
        .post('/orders')
        .send(validOrderPayload)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== GET /orders/stats ====================

  describe('GET /orders/stats', () => {
    it('should return order statistics for the current user', async () => {
      const stats = { totalOrders: 10, totalSpent: 25000, pendingOrders: 2 };
      mockOrderRepository.getUserStats.mockResolvedValue(stats);

      const response = await authedRequest(app)
        .get('/orders/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(stats);
      expect(mockOrderRepository.getUserStats).toHaveBeenCalledWith('test-user-1');
    });
  });

  // ==================== GET /orders/recent ====================

  describe('GET /orders/recent', () => {
    it('should return recent orders for the current user', async () => {
      const recentOrders = [mockOrder];
      mockOrderRepository.getRecentOrders.mockResolvedValue(recentOrders);

      const response = await authedRequest(app)
        .get('/orders/recent')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(mockOrderRepository.getRecentOrders).toHaveBeenCalledWith('test-user-1', 5);
    });

    it('should respect custom limit parameter', async () => {
      mockOrderRepository.getRecentOrders.mockResolvedValue([]);

      await authedRequest(app)
        .get('/orders/recent?limit=10')
        .expect(200);

      expect(mockOrderRepository.getRecentOrders).toHaveBeenCalledWith('test-user-1', 10);
    });

    it('should cap limit to 50', async () => {
      mockOrderRepository.getRecentOrders.mockResolvedValue([]);

      await authedRequest(app)
        .get('/orders/recent?limit=100')
        .expect(200);

      expect(mockOrderRepository.getRecentOrders).toHaveBeenCalledWith('test-user-1', 50);
    });

    it('should default to 5 when limit is not a number', async () => {
      mockOrderRepository.getRecentOrders.mockResolvedValue([]);

      await authedRequest(app)
        .get('/orders/recent?limit=abc')
        .expect(200);

      expect(mockOrderRepository.getRecentOrders).toHaveBeenCalledWith('test-user-1', 5);
    });
  });

  // ==================== GET /orders ====================

  describe('GET /orders', () => {
    it('should list orders for the current user with default pagination', async () => {
      const mockResult = {
        data: [mockOrder],
        page: 1,
        total: 1,
        totalPages: 1,
      };
      mockOrderRepository.findAll.mockResolvedValue(mockResult);

      const response = await authedRequest(app)
        .get('/orders')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.meta).toEqual(
        expect.objectContaining({ page: 1, total: 1, totalPages: 1 })
      );
      expect(mockOrderRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'test-user-1' }),
        expect.objectContaining({ page: 1, limit: 20 })
      );
    });

    it('should pass pagination parameters from query string', async () => {
      mockOrderRepository.findAll.mockResolvedValue({
        data: [], page: 2, total: 30, totalPages: 3,
      });

      await authedRequest(app)
        .get('/orders?page=2&limit=10')
        .expect(200);

      expect(mockOrderRepository.findAll).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ page: 2, limit: 10 })
      );
    });

    it('should pass status filter to the repository', async () => {
      mockOrderRepository.findAll.mockResolvedValue({
        data: [], page: 1, total: 0, totalPages: 0,
      });

      await authedRequest(app)
        .get('/orders?status=pending')
        .expect(200);

      expect(mockOrderRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'pending' }),
        expect.anything()
      );
    });
  });

  // ==================== POST /orders ====================

  describe('POST /orders', () => {
    it('should create an order successfully and return 201', async () => {
      mockOrderRepository.create.mockResolvedValue(mockOrder);
      mockPrisma.user.findUnique.mockResolvedValue({
        email: 'test@test.com',
        firstName: 'Test',
      });

      const response = await authedRequest(app)
        .post('/orders')
        .send(validOrderPayload)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.orderNumber).toBe('ORD-001');
      expect(response.body.message).toContain('created');
      expect(mockOrderRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'test-user-1',
          shippingAddress: validShippingAddress,
        })
      );
    });

    it('should return 400 when items array is empty', async () => {
      const response = await authedRequest(app)
        .post('/orders')
        .send({ items: [], shippingAddress: validShippingAddress })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when items field is missing', async () => {
      const response = await authedRequest(app)
        .post('/orders')
        .send({ shippingAddress: validShippingAddress })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when shippingAddress is missing', async () => {
      const response = await authedRequest(app)
        .post('/orders')
        .send({ items: [{ quantity: 1 }] })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when shippingAddress.street is empty', async () => {
      const response = await authedRequest(app)
        .post('/orders')
        .send({
          items: [{ quantity: 1 }],
          shippingAddress: { street: '', city: 'Paris', postalCode: '75001', country: 'FR' },
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when shippingAddress.city is empty', async () => {
      const response = await authedRequest(app)
        .post('/orders')
        .send({
          items: [{ quantity: 1 }],
          shippingAddress: { street: '123 Main', city: '', postalCode: '75001', country: 'FR' },
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when item quantity is 0', async () => {
      const response = await authedRequest(app)
        .post('/orders')
        .send({
          items: [{ productId: 'prod-1', quantity: 0, unitPrice: 100 }],
          shippingAddress: validShippingAddress,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when item quantity is negative', async () => {
      const response = await authedRequest(app)
        .post('/orders')
        .send({
          items: [{ productId: 'prod-1', quantity: -1, unitPrice: 100 }],
          shippingAddress: validShippingAddress,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when unit price is negative', async () => {
      const response = await authedRequest(app)
        .post('/orders')
        .send({
          items: [{ productId: 'prod-1', quantity: 1, unitPrice: -50 }],
          shippingAddress: validShippingAddress,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should accept optional fields: projectId, billingAddress, notes, currency', async () => {
      mockOrderRepository.create.mockResolvedValue(mockOrder);
      mockPrisma.user.findUnique.mockResolvedValue({ email: 'test@test.com', firstName: 'Test' });

      const response = await authedRequest(app)
        .post('/orders')
        .send({
          ...validOrderPayload,
          projectId: 'project-1',
          billingAddress: validShippingAddress,
          notes: 'Please deliver to back door',
          currency: 'EUR',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should return 400 when notes exceed 2000 characters', async () => {
      const response = await authedRequest(app)
        .post('/orders')
        .send({
          ...validOrderPayload,
          notes: 'x'.repeat(2001),
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when currency is not exactly 3 characters', async () => {
      const response = await authedRequest(app)
        .post('/orders')
        .send({
          ...validOrderPayload,
          currency: 'EURO',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== GET /orders/:id ====================

  describe('GET /orders/:id', () => {
    it('should return order for the owner', async () => {
      mockOrderRepository.findById.mockResolvedValue(mockOrder);

      const response = await authedRequest(app)
        .get('/orders/order-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('order-1');
    });

    it('should return 404 for non-existent order', async () => {
      mockOrderRepository.findById.mockResolvedValue(null);

      const response = await authedRequest(app)
        .get('/orders/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Order not found');
    });

    it('should return 403 when non-owner accesses an order (IDOR prevention)', async () => {
      mockOrderRepository.findById.mockResolvedValue(otherUserOrder);

      const response = await authedRequest(app)
        .get('/orders/order-2')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access denied');
    });

    it('should allow admin to access any order', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockOrderRepository.findById.mockResolvedValue(otherUserOrder);

      const response = await authedRequest(app)
        .get('/orders/order-2')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('order-2');
    });

    it('should fetch order with relations (includeRelations = true)', async () => {
      mockOrderRepository.findById.mockResolvedValue(mockOrder);

      await authedRequest(app)
        .get('/orders/order-1')
        .expect(200);

      expect(mockOrderRepository.findById).toHaveBeenCalledWith('order-1', true);
    });
  });

  // ==================== PUT /orders/:id ====================

  describe('PUT /orders/:id', () => {
    it('should update a pending order owned by the current user', async () => {
      mockOrderRepository.findById.mockResolvedValue(mockOrder);
      const updated = { ...mockOrder, notes: 'Updated notes' };
      mockOrderRepository.update.mockResolvedValue(updated);

      const response = await authedRequest(app)
        .put('/orders/order-1')
        .send({ notes: 'Updated notes' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('updated');
    });

    it('should allow updating shipping address', async () => {
      mockOrderRepository.findById.mockResolvedValue(mockOrder);
      const newAddress = { street: '456 New St', city: 'Lyon', postalCode: '69001', country: 'FR' };
      mockOrderRepository.update.mockResolvedValue({ ...mockOrder, shippingAddress: newAddress });

      const response = await authedRequest(app)
        .put('/orders/order-1')
        .send({ shippingAddress: newAddress })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 404 for non-existent order', async () => {
      mockOrderRepository.findById.mockResolvedValue(null);

      const response = await authedRequest(app)
        .put('/orders/nonexistent')
        .send({ notes: 'test' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 when non-owner tries to update (IDOR prevention)', async () => {
      mockOrderRepository.findById.mockResolvedValue(otherUserOrder);

      const response = await authedRequest(app)
        .put('/orders/order-2')
        .send({ notes: 'Hacked' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access denied');
    });

    it('should allow admin to update any order', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockOrderRepository.findById.mockResolvedValue(otherUserOrder);
      mockOrderRepository.update.mockResolvedValue({ ...otherUserOrder, notes: 'Admin update' });

      const response = await authedRequest(app)
        .put('/orders/order-2')
        .send({ notes: 'Admin update' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 400 when trying to update a shipped order', async () => {
      const shippedOrder = { ...mockOrder, status: 'shipped' };
      mockOrderRepository.findById.mockResolvedValue(shippedOrder);

      const response = await authedRequest(app)
        .put('/orders/order-1')
        .send({ notes: 'Too late' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('cannot be updated');
    });

    it('should return 400 when trying to update a delivered order', async () => {
      const deliveredOrder = { ...mockOrder, status: 'delivered' };
      mockOrderRepository.findById.mockResolvedValue(deliveredOrder);

      const response = await authedRequest(app)
        .put('/orders/order-1')
        .send({ notes: 'Too late' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when trying to update a cancelled order', async () => {
      const cancelledOrder = { ...mockOrder, status: 'cancelled' };
      mockOrderRepository.findById.mockResolvedValue(cancelledOrder);

      const response = await authedRequest(app)
        .put('/orders/order-1')
        .send({ notes: 'Too late' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should allow updating a draft order', async () => {
      const draftOrder = { ...mockOrder, status: 'draft' };
      mockOrderRepository.findById.mockResolvedValue(draftOrder);
      mockOrderRepository.update.mockResolvedValue({ ...draftOrder, notes: 'Updated' });

      const response = await authedRequest(app)
        .put('/orders/order-1')
        .send({ notes: 'Updated' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject unknown fields in update body (strict schema)', async () => {
      mockOrderRepository.findById.mockResolvedValue(mockOrder);

      const response = await authedRequest(app)
        .put('/orders/order-1')
        .send({ notes: 'valid', unknownField: 'invalid' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== POST /orders/:id/cancel ====================

  describe('POST /orders/:id/cancel', () => {
    it('should cancel a pending order successfully', async () => {
      mockOrderRepository.findById.mockResolvedValue(mockOrder);
      const cancelled = { ...mockOrder, status: 'cancelled' };
      mockOrderRepository.cancel.mockResolvedValue(cancelled);

      const response = await authedRequest(app)
        .post('/orders/order-1/cancel')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('cancelled');
    });

    it('should cancel a confirmed order successfully', async () => {
      const confirmedOrder = { ...mockOrder, status: 'confirmed' };
      mockOrderRepository.findById.mockResolvedValue(confirmedOrder);
      mockOrderRepository.cancel.mockResolvedValue({ ...confirmedOrder, status: 'cancelled' });

      const response = await authedRequest(app)
        .post('/orders/order-1/cancel')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should pass cancellation reason to repository', async () => {
      mockOrderRepository.findById.mockResolvedValue(mockOrder);
      mockOrderRepository.cancel.mockResolvedValue({ ...mockOrder, status: 'cancelled' });

      await authedRequest(app)
        .post('/orders/order-1/cancel')
        .send({ reason: 'Changed my mind' })
        .expect(200);

      expect(mockOrderRepository.cancel).toHaveBeenCalledWith('order-1', 'Changed my mind');
    });

    it('should return 400 when trying to cancel a shipped order', async () => {
      const shippedOrder = { ...mockOrder, status: 'shipped' };
      mockOrderRepository.findById.mockResolvedValue(shippedOrder);

      const response = await authedRequest(app)
        .post('/orders/order-1/cancel')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('cannot be cancelled');
    });

    it('should return 400 when trying to cancel a delivered order', async () => {
      const deliveredOrder = { ...mockOrder, status: 'delivered' };
      mockOrderRepository.findById.mockResolvedValue(deliveredOrder);

      const response = await authedRequest(app)
        .post('/orders/order-1/cancel')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when trying to cancel an already cancelled order', async () => {
      const cancelledOrder = { ...mockOrder, status: 'cancelled' };
      mockOrderRepository.findById.mockResolvedValue(cancelledOrder);

      const response = await authedRequest(app)
        .post('/orders/order-1/cancel')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when trying to cancel a processing order', async () => {
      const processingOrder = { ...mockOrder, status: 'processing' };
      mockOrderRepository.findById.mockResolvedValue(processingOrder);

      const response = await authedRequest(app)
        .post('/orders/order-1/cancel')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent order', async () => {
      mockOrderRepository.findById.mockResolvedValue(null);

      const response = await authedRequest(app)
        .post('/orders/nonexistent/cancel')
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 when non-owner tries to cancel (IDOR prevention)', async () => {
      mockOrderRepository.findById.mockResolvedValue(otherUserOrder);

      const response = await authedRequest(app)
        .post('/orders/order-2/cancel')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access denied');
    });

    it('should allow admin to cancel any order', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockOrderRepository.findById.mockResolvedValue(otherUserOrder);
      mockOrderRepository.cancel.mockResolvedValue({ ...otherUserOrder, status: 'cancelled' });

      const response = await authedRequest(app)
        .post('/orders/order-2/cancel')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  // ==================== PUT /orders/:id/status (Admin only) ====================

  describe('PUT /orders/:id/status (Admin only)', () => {
    it('should return 403 for non-admin user', async () => {
      const response = await authedRequest(app)
        .put('/orders/order-1/status')
        .send({ status: 'shipped' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should allow admin to update order status', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      const updated = { ...mockOrder, status: 'shipped' };
      mockOrderRepository.updateStatus.mockResolvedValue(updated);

      const response = await authedRequest(app)
        .put('/orders/order-1/status')
        .send({ status: 'shipped' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('shipped');
      expect(response.body.message).toContain('status updated');
    });

    it('should return 400 when status is missing', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };

      const response = await authedRequest(app)
        .put('/orders/order-1/status')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid status value', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };

      const response = await authedRequest(app)
        .put('/orders/order-1/status')
        .send({ status: 'invalid_status' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should accept all valid order statuses', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];

      for (const status of validStatuses) {
        mockOrderRepository.updateStatus.mockResolvedValue({ ...mockOrder, status });

        const response = await authedRequest(app)
          .put('/orders/order-1/status')
          .send({ status })
          .expect(200);

        expect(response.body.success).toBe(true);
      }
    });
  });

  // ==================== EDGE CASES ====================

  describe('Edge cases', () => {
    it('should handle order creation when email fails to send (non-blocking)', async () => {
      mockOrderRepository.create.mockResolvedValue(mockOrder);
      // User lookup fails, email won't send - but order creation should still succeed
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const response = await authedRequest(app)
        .post('/orders')
        .send(validOrderPayload)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should handle concurrent order listing requests', async () => {
      mockOrderRepository.findAll.mockResolvedValue({
        data: [], page: 1, total: 0, totalPages: 0,
      });

      const results = await Promise.all([
        authedRequest(app).get('/orders'),
        authedRequest(app).get('/orders'),
      ]);

      results.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });
});
