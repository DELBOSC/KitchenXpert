/**
 * IKEA Routes Tests
 *
 * Tests IKEA catalog endpoints:
 * - GET /ikea/search (search products, requires query param)
 * - GET /ikea/products/:itemCode (get product by item code)
 * - POST /ikea/products (get multiple products by item codes)
 * - Auth guard (401 without token)
 * - Missing query parameter validation
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

// Mock IKEA client
const mockIkeaClient = {
  search: jest.fn().mockResolvedValue({
    success: true,
    data: [{ id: 'ikea-1', name: 'METOD Base cabinet', price: 49.99 }],
    total: 1,
  }),
  getProduct: jest.fn().mockResolvedValue({
    success: true,
    data: { id: 'ikea-1', name: 'METOD Base cabinet', price: 49.99 },
  }),
  getProducts: jest.fn().mockResolvedValue({
    success: true,
    data: [{ id: 'ikea-1', name: 'METOD' }, { id: 'ikea-2', name: 'KALLARP' }],
  }),
  getStock: jest.fn().mockResolvedValue({
    success: true,
    data: { available: true, quantity: 10 },
  }),
  searchKitchenCabinets: jest.fn().mockResolvedValue({ success: true, data: [] }),
  searchAppliances: jest.fn().mockResolvedValue({ success: true, data: [] }),
  searchCountertops: jest.fn().mockResolvedValue({ success: true, data: [] }),
  getMetodProducts: jest.fn().mockResolvedValue({ success: true, data: [] }),
  getAllKitchenProducts: jest.fn().mockResolvedValue({ success: true, data: {} }),
  getKitchenProductsByCategory: jest.fn().mockResolvedValue({ success: true, data: [] }),
};

jest.mock('../services/ikea', () => ({
  IkeaClient: jest.fn(),
  createIkeaClient: jest.fn(() => mockIkeaClient),
}));

// Mock rate limiter
jest.mock('express-rate-limit', () => ({
  __esModule: true,
  default: () => (_req: Request, _res: Response, next: NextFunction) => next(),
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

import ikeaRoutes from '../api/routes/ikea-routes';

// ==================== TEST APP ====================

function createTestApp(): Application {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/ikea', ikeaRoutes);
  return app;
}

// ==================== TESTS ====================

describe('IKEA Routes', () => {
  let app: Application;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
    mockAuthenticated = true;
  });

  describe('GET /ikea/search', () => {
    it('should search IKEA products with query', async () => {
      const response = await request(app)
        .get('/ikea/search?q=METOD')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockIkeaClient.search).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'METOD' })
      );
    });

    it('should return 400 when query parameter is missing', async () => {
      const response = await request(app)
        .get('/ikea/search')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_QUERY');
    });

    it('should return 401 when not authenticated', async () => {
      mockAuthenticated = false;
      const response = await request(app)
        .get('/ikea/search?q=METOD')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /ikea/products/:itemCode', () => {
    it('should return product details by item code', async () => {
      const response = await request(app)
        .get('/ikea/products/123.456.78')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockIkeaClient.getProduct).toHaveBeenCalledWith('123.456.78');
    });

    it('should return 404 when product not found', async () => {
      mockIkeaClient.getProduct.mockResolvedValueOnce({
        success: false,
        error: 'Product not found',
      });

      const response = await request(app)
        .get('/ikea/products/000.000.00')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /ikea/products', () => {
    it('should return multiple products by item codes', async () => {
      const response = await request(app)
        .post('/ikea/products')
        .send({ itemCodes: ['123.456.78', '234.567.89'] })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockIkeaClient.getProducts).toHaveBeenCalledWith(['123.456.78', '234.567.89']);
    });

    it('should return 400 when itemCodes array is missing', async () => {
      const response = await request(app)
        .post('/ikea/products')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_ITEMS');
    });

    it('should return 400 when itemCodes is empty array', async () => {
      const response = await request(app)
        .post('/ikea/products')
        .send({ itemCodes: [] })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
