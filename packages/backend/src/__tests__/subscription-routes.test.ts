/**
 * Subscription Routes Tests
 *
 * Tests subscription endpoints:
 * - POST /subscriptions (create subscription)
 * - GET /subscriptions/:id (get subscription)
 * - DELETE /subscriptions/:id (cancel subscription)
 * - GET /subscriptions/customer/:customerId (list customer subscriptions)
 * - Auth guard (401 without token)
 */

import cookieParser from 'cookie-parser';
import express, { type Application, type Request, type Response, type NextFunction } from 'express';
import request from 'supertest';

// ==================== MOCKS ====================

jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  createModuleLogger: jest.fn(() => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() })),
}));

jest.mock('../database/client', () => ({
  prisma: { $disconnect: jest.fn() },
}));

const mockPaymentController = {
  createSubscription: jest.fn((_req: Request, res: Response) => {
    res.status(201).json({
      success: true,
      data: {
        id: 'sub_test_123',
        customerId: 'cus_test_1',
        priceId: 'price_test_1',
        status: 'active',
      },
    });
  }),
  getSubscription: jest.fn((_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      data: {
        id: 'sub_test_123',
        status: 'active',
        currentPeriodEnd: '2025-12-01',
      },
    });
  }),
  cancelSubscription: jest.fn((_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      message: 'Subscription cancelled',
    });
  }),
  listCustomerSubscriptions: jest.fn((_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      data: [
        { id: 'sub_1', status: 'active' },
        { id: 'sub_2', status: 'canceled' },
      ],
    });
  }),
};

jest.mock('../api/controllers/payment-controller', () => ({
  paymentController: mockPaymentController,
}));

jest.mock('../api/middleware/validation-middleware', () => ({
  validateBody: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  validateParams: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  validateQuery: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  commonSchemas: { idParam: {} },
}));

let mockAuthenticated = true;

jest.mock('../api/middleware/auth-middleware', () => ({
  authenticate: (req: any, res: any, next: any) => {
    if (!mockAuthenticated) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }
    req.user = { userId: 'test-user-1', email: 'user@test.com', role: 'user' };
    next();
  },
  authorize: () => (_req: any, _res: any, next: any) => next(),
}));

import subscriptionRoutes from '../api/routes/subscription-routes';

// ==================== TEST APP ====================

function createTestApp(): Application {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/subscriptions', subscriptionRoutes);
  return app;
}

// ==================== TESTS ====================

describe('Subscription Routes', () => {
  let app: Application;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
    mockAuthenticated = true;
  });

  describe('POST /subscriptions', () => {
    it('should create a new subscription', async () => {
      const response = await request(app)
        .post('/subscriptions')
        .send({ customerId: 'cus_test_1', priceId: 'price_test_1' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.status).toBe('active');
      expect(mockPaymentController.createSubscription).toHaveBeenCalled();
    });

    it('should return 401 when not authenticated', async () => {
      mockAuthenticated = false;
      const response = await request(app)
        .post('/subscriptions')
        .send({ customerId: 'cus_test_1', priceId: 'price_test_1' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /subscriptions/:id', () => {
    it('should return subscription details', async () => {
      const response = await request(app)
        .get('/subscriptions/sub_test_123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('status');
      expect(mockPaymentController.getSubscription).toHaveBeenCalled();
    });

    it('should return 401 when not authenticated', async () => {
      mockAuthenticated = false;
      const response = await request(app)
        .get('/subscriptions/sub_test_123')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /subscriptions/:id', () => {
    it('should cancel a subscription', async () => {
      const response = await request(app)
        .delete('/subscriptions/sub_test_123')
        .send({ cancelAtPeriodEnd: true })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockPaymentController.cancelSubscription).toHaveBeenCalled();
    });
  });

  describe('GET /subscriptions/customer/:customerId', () => {
    it('should list subscriptions for a customer', async () => {
      const response = await request(app)
        .get('/subscriptions/customer/cus_test_1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(mockPaymentController.listCustomerSubscriptions).toHaveBeenCalled();
    });
  });
});
