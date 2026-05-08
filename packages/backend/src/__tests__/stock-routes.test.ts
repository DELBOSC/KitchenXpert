/**
 * Stock Routes Tests
 *
 * Tests stock checking endpoints:
 * - POST /stock/check (single product stock check)
 * - POST /stock/bulk (bulk stock check)
 * - Auth guard (401 without token)
 * - Validation (missing required fields)
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

const mockStockController = {
  checkStock: jest.fn((_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      data: { productId: 'prod-1', available: true, quantity: 15 },
    });
  }),
  getBulkStock: jest.fn((_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      data: [
        { productId: 'prod-1', available: true, quantity: 15 },
        { productId: 'prod-2', available: false, quantity: 0 },
      ],
    });
  }),
};

jest.mock('../api/controllers/stock-controller', () => ({
  stockController: mockStockController,
}));

// Mock validation middleware -- for body validation tests, we implement a simple check
let enableValidation = false;

jest.mock('../api/middleware/validation-middleware', () => ({
  validateBody: (schema: any) => (req: Request, res: Response, next: NextFunction) => {
    if (!enableValidation) {return next();}
    // Simple required-field check for stock check endpoint
    if (schema && req.body) {
      if (!req.body.productId && !req.body.items) {
        return res.status(400).json({ success: false, error: 'Validation failed' });
      }
    }
    next();
  },
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

import stockRoutes from '../api/routes/stock-routes';

// ==================== TEST APP ====================

function createTestApp(): Application {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/stock', stockRoutes);
  return app;
}

// ==================== TESTS ====================

describe('Stock Routes', () => {
  let app: Application;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
    mockAuthenticated = true;
    enableValidation = false;
  });

  describe('POST /stock/check', () => {
    it('should check stock for a single product', async () => {
      const response = await request(app)
        .post('/stock/check')
        .send({ productId: 'prod-1', providerId: 'ikea' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('available');
      expect(response.body.data).toHaveProperty('quantity');
      expect(mockStockController.checkStock).toHaveBeenCalled();
    });

    it('should return 401 when not authenticated', async () => {
      mockAuthenticated = false;
      const response = await request(app)
        .post('/stock/check')
        .send({ productId: 'prod-1', providerId: 'ikea' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when missing required fields', async () => {
      enableValidation = true;
      const response = await request(app)
        .post('/stock/check')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /stock/bulk', () => {
    it('should check stock for multiple products', async () => {
      const response = await request(app)
        .post('/stock/bulk')
        .send({
          items: [
            { productId: 'prod-1', providerId: 'ikea' },
            { productId: 'prod-2', providerId: 'ikea' },
          ],
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(mockStockController.getBulkStock).toHaveBeenCalled();
    });

    it('should return 401 when not authenticated', async () => {
      mockAuthenticated = false;
      const response = await request(app)
        .post('/stock/bulk')
        .send({ items: [{ productId: 'prod-1', providerId: 'ikea' }] })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
