/**
 * Kitchen Routes Tests
 *
 * Tests kitchen CRUD endpoints:
 * - GET /kitchens (list all, auth required)
 * - POST /kitchens (create, auth required)
 * - GET /kitchens/:id (get by ID)
 * - PUT /kitchens/:id (update)
 * - DELETE /kitchens/:id (soft delete)
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

vi.mock('../../database/client', () => ({
  prisma: { $disconnect: vi.fn() },
}));

const mockKitchenController = {
  getAll: vi.fn((_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      data: [{ id: 'k1', name: 'My Kitchen', style: 'modern' }],
      meta: { page: 1, limit: 20, total: 1 },
    });
  }),
  create: vi.fn((_req: Request, res: Response) => {
    res.status(201).json({
      success: true,
      data: { id: 'k-new', name: 'New Kitchen', width: 4, length: 3 },
    });
  }),
  getById: vi.fn((_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      data: { id: 'k1', name: 'My Kitchen', style: 'modern' },
    });
  }),
  update: vi.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true, data: { id: 'k1', name: 'Updated Kitchen' } });
  }),
  delete: vi.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true, message: 'Kitchen deleted' });
  }),
  duplicate: vi.fn((_req: Request, res: Response) => {
    res.status(201).json({ success: true, data: { id: 'k-dup' } });
  }),
  getByShareId: vi.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true, data: {} });
  }),
  getStats: vi.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true, data: { total: 5 } });
  }),
  getArchived: vi.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true, data: [] });
  }),
  getByProject: vi.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true, data: [] });
  }),
  getConfiguration: vi.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true, data: {} });
  }),
  updateConfiguration: vi.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true });
  }),
  getItems: vi.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true, data: [] });
  }),
  addItem: vi.fn((_req: Request, res: Response) => {
    res.status(201).json({ success: true });
  }),
  updateItem: vi.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true });
  }),
  removeItem: vi.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true });
  }),
  archive: vi.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true });
  }),
  restore: vi.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true });
  }),
  getModel: vi.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true, data: {} });
  }),
  updateThumbnail: vi.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true });
  }),
  exportKitchen: vi.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true, data: {} });
  }),
  createShareLink: vi.fn((_req: Request, res: Response) => {
    res.status(201).json({ success: true });
  }),
  revokeShareLink: vi.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true });
  }),
};

vi.mock('../../api/controllers/kitchen-controller', () => ({
  kitchenController: mockKitchenController,
}));

vi.mock('../../api/middleware/validation-middleware', () => ({
  validateBody: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  validateParams: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  validateQuery: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  commonSchemas: { idParam: {} },
}));

vi.mock('../../api/middleware/rate-limit-middleware', () => ({
  generalRateLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

let mockAuthenticated = true;

vi.mock('../../api/middleware/auth-middleware', () => ({
  authenticate: (req: any, res: any, next: any) => {
    if (!mockAuthenticated) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }
    req.user = { userId: 'test-user-1', email: 'user@test.com', role: 'user' };
    next();
  },
  authorize: () => (_req: any, _res: any, next: any) => next(),
}));

import kitchenRoutes from '../../api/routes/kitchen-routes';

// ==================== TEST APP ====================

function createTestApp(): Application {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/kitchens', kitchenRoutes);
  return app;
}

// ==================== TESTS ====================

describe('Kitchen Routes', () => {
  let app: Application;

  beforeEach(() => {
    app = createTestApp();
    vi.clearAllMocks();
    mockAuthenticated = true;
  });

  describe('GET /kitchens', () => {
    it('should return paginated list of kitchens', async () => {
      const response = await request(app)
        .get('/kitchens')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(mockKitchenController.getAll).toHaveBeenCalled();
    });

    it('should return 401 when not authenticated', async () => {
      mockAuthenticated = false;
      const response = await request(app)
        .get('/kitchens')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /kitchens', () => {
    it('should create a new kitchen and return 201', async () => {
      const response = await request(app)
        .post('/kitchens')
        .send({
          projectId: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Test Kitchen',
          width: 4,
          length: 3,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(mockKitchenController.create).toHaveBeenCalled();
    });

    it('should return 401 when not authenticated', async () => {
      mockAuthenticated = false;
      const response = await request(app)
        .post('/kitchens')
        .send({ projectId: '550e8400-e29b-41d4-a716-446655440000', name: 'Test', width: 4, length: 3 })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /kitchens/:id', () => {
    it('should return kitchen by ID', async () => {
      const response = await request(app)
        .get('/kitchens/some-uuid')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(mockKitchenController.getById).toHaveBeenCalled();
    });
  });

  describe('PUT /kitchens/:id', () => {
    it('should update kitchen successfully', async () => {
      const response = await request(app)
        .put('/kitchens/some-uuid')
        .send({ name: 'Updated Kitchen' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockKitchenController.update).toHaveBeenCalled();
    });
  });

  describe('DELETE /kitchens/:id', () => {
    it('should soft-delete kitchen successfully', async () => {
      const response = await request(app)
        .delete('/kitchens/some-uuid')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockKitchenController.delete).toHaveBeenCalled();
    });
  });

  describe('POST /kitchens/shared/:shareId (public)', () => {
    it('should allow access to shared kitchen without auth', async () => {
      mockAuthenticated = false;
      const response = await request(app)
        .post('/kitchens/shared/share-abc-123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockKitchenController.getByShareId).toHaveBeenCalled();
    });
  });
});
