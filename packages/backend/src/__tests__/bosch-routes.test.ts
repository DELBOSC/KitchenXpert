/**
 * Bosch Routes Tests
 *
 * Tests Bosch catalog provider endpoints (appliance type via factory):
 * - GET /bosch/info (provider metadata)
 * - GET /bosch/appliances (list appliances with pagination)
 * - GET /bosch/appliances/search (search appliances)
 * - GET /bosch/appliances/:id (get appliance by ID)
 * - GET /bosch/appliances/types (list appliance types)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express, { type Application, type Request, type Response, type NextFunction } from 'express';
import cookieParser from 'cookie-parser';

// ==================== MOCKS ====================

vi.mock('../../utils/logger', () => ({
  __esModule: true,
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  createModuleLogger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() })),
}));

const mockPrisma = {
  $disconnect: vi.fn(),
  catalogProvider: {
    findFirst: vi.fn().mockResolvedValue({
      id: 'provider-bosch',
      name: 'Bosch',
      code: 'bosch',
      isActive: true,
      _count: { products: 0, appliances: 150, catalogs: 2 },
      catalogs: [{ lastSyncAt: new Date('2025-01-15'), version: '2.1' }],
    }),
  },
  productCategory: {
    findMany: vi.fn().mockResolvedValue([]),
  },
};

vi.mock('../../database/client', () => ({
  prisma: mockPrisma,
}));

const mockApplianceRepository = {
  findAll: vi.fn().mockResolvedValue({
    data: [{ id: 'a1', name: 'Bosch Oven Serie 8', type: 'oven', price: 899 }],
    page: 1,
    total: 1,
    totalPages: 1,
  }),
  search: vi.fn().mockResolvedValue([
    { id: 'a1', name: 'Bosch Oven Serie 8', type: 'oven' },
  ]),
  getTypes: vi.fn().mockResolvedValue(['oven', 'cooktop', 'dishwasher', 'refrigerator']),
  findById: vi.fn().mockResolvedValue({
    id: 'a1', name: 'Bosch Oven Serie 8', type: 'oven', price: 899,
  }),
};

vi.mock('../../repositories/appliance-repository', () => ({
  ApplianceRepository: vi.fn(() => mockApplianceRepository),
}));

vi.mock('../../repositories/product-repository', () => ({
  ProductRepository: vi.fn(() => ({
    findAll: vi.fn().mockResolvedValue({ data: [], page: 1, total: 0, totalPages: 0 }),
    findById: vi.fn().mockResolvedValue(null),
  })),
}));

// Mock rate limiter
vi.mock('express-rate-limit', () => ({
  __esModule: true,
  default: () => (_req: Request, _res: Response, next: NextFunction) => next(),
}));

// Mock auth middleware
let mockAuthenticated = true;

vi.mock('../../api/middleware/auth-middleware', () => ({
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

vi.mock('../../api/middleware/error-middleware', () => ({
  asyncHandler: (fn: any) => (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  },
}));

import boschRoutes from '../../api/routes/bosch-routes';

// ==================== TEST APP ====================

function createTestApp(): Application {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/bosch', boschRoutes);
  return app;
}

// ==================== TESTS ====================

describe('Bosch Routes', () => {
  let app: Application;

  beforeEach(() => {
    app = createTestApp();
    vi.clearAllMocks();
    mockAuthenticated = true;

    // Reset the provider mock
    mockPrisma.catalogProvider.findFirst.mockResolvedValue({
      id: 'provider-bosch',
      name: 'Bosch',
      code: 'bosch',
      isActive: true,
      _count: { products: 0, appliances: 150, catalogs: 2 },
      catalogs: [{ lastSyncAt: new Date('2025-01-15'), version: '2.1' }],
    });
  });

  describe('GET /bosch/info', () => {
    it('should return Bosch provider metadata', async () => {
      const response = await request(app)
        .get('/bosch/info')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.code).toBe('bosch');
      expect(response.body.data).toHaveProperty('applianceCount');
    });

    it('should return 404 when provider not configured', async () => {
      mockPrisma.catalogProvider.findFirst.mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/bosch/info')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /bosch/appliances', () => {
    it('should list Bosch appliances with pagination', async () => {
      const response = await request(app)
        .get('/bosch/appliances')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.meta).toHaveProperty('page');
      expect(response.body.meta).toHaveProperty('total');
      expect(response.body.meta.provider).toBe('bosch');
    });

    it('should support filtering by appliance type', async () => {
      await request(app)
        .get('/bosch/appliances?type=oven')
        .expect(200);

      expect(mockApplianceRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'oven' }),
        expect.any(Object)
      );
    });
  });

  describe('GET /bosch/appliances/search', () => {
    it('should search Bosch appliances', async () => {
      const response = await request(app)
        .get('/bosch/appliances/search?q=oven')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockApplianceRepository.search).toHaveBeenCalled();
    });

    it('should return 400 when query parameter is missing', async () => {
      const response = await request(app)
        .get('/bosch/appliances/search')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_QUERY');
    });
  });

  describe('GET /bosch/appliances/:id', () => {
    it('should return appliance details by ID', async () => {
      const response = await request(app)
        .get('/bosch/appliances/a1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(mockApplianceRepository.findById).toHaveBeenCalledWith('a1');
    });

    it('should return 404 when appliance not found', async () => {
      mockApplianceRepository.findById.mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/bosch/appliances/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});
