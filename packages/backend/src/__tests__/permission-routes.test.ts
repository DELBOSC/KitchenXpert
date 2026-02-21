/**
 * Permission Routes Tests
 *
 * Tests permission management endpoints (admin only):
 * - GET /permissions (list all)
 * - POST /permissions (create)
 * - DELETE /permissions/:id (delete)
 * - Auth guard (401 without token)
 * - Admin-only access (403 for non-admin)
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

const mockPermissionController = {
  getAll: vi.fn((_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      data: [{ id: 'p1', name: 'users.read', resource: 'users', action: 'read' }],
    });
  }),
  getById: vi.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true, data: { id: 'p1', name: 'users.read' } });
  }),
  create: vi.fn((_req: Request, res: Response) => {
    res.status(201).json({ success: true, data: { id: 'p-new', name: 'kitchens.write' } });
  }),
  update: vi.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true, data: { id: 'p1', name: 'users.write' } });
  }),
  delete: vi.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true, message: 'Permission deleted' });
  }),
  getResources: vi.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true, data: ['users', 'kitchens'] });
  }),
  getActions: vi.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true, data: ['read', 'write', 'delete'] });
  }),
  getGrouped: vi.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true, data: {} });
  }),
  check: vi.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true, data: { allowed: true } });
  }),
  seedDefaults: vi.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true, message: 'Defaults seeded' });
  }),
  seedResource: vi.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true });
  }),
};

vi.mock('../../api/controllers/permission-controller', () => ({
  permissionController: mockPermissionController,
}));

vi.mock('../../api/middleware/validation-middleware', () => ({
  validateBody: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  validateParams: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  validateQuery: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  commonSchemas: { idParam: {} },
}));

let mockUserRole = 'admin';
let mockAuthenticated = true;

vi.mock('../../api/middleware/auth-middleware', () => ({
  authenticate: (req: any, res: any, next: any) => {
    if (!mockAuthenticated) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }
    req.user = { userId: 'test-user-1', email: 'admin@test.com', role: mockUserRole };
    next();
  },
  authorize: (roles: string[]) => (req: any, res: any, next: any) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }
    next();
  },
}));

import permissionRoutes from '../../api/routes/permission-routes';

// ==================== TEST APP ====================

function createTestApp(): Application {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/permissions', permissionRoutes);
  return app;
}

// ==================== TESTS ====================

describe('Permission Routes', () => {
  let app: Application;

  beforeEach(() => {
    app = createTestApp();
    vi.clearAllMocks();
    mockUserRole = 'admin';
    mockAuthenticated = true;
  });

  describe('GET /permissions', () => {
    it('should return all permissions for admin', async () => {
      const response = await request(app)
        .get('/permissions')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(mockPermissionController.getAll).toHaveBeenCalled();
    });

    it('should return 401 when not authenticated', async () => {
      mockAuthenticated = false;
      const response = await request(app)
        .get('/permissions')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 for non-admin users', async () => {
      mockUserRole = 'user';
      const response = await request(app)
        .get('/permissions')
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /permissions', () => {
    it('should create a new permission for admin', async () => {
      const response = await request(app)
        .post('/permissions')
        .send({ name: 'kitchens.write', resource: 'kitchens', action: 'write' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(mockPermissionController.create).toHaveBeenCalled();
    });

    it('should return 403 for non-admin users', async () => {
      mockUserRole = 'user';
      const response = await request(app)
        .post('/permissions')
        .send({ name: 'kitchens.write' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /permissions/:id', () => {
    it('should delete permission for admin', async () => {
      const response = await request(app)
        .delete('/permissions/p1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockPermissionController.delete).toHaveBeenCalled();
    });

    it('should return 403 for non-admin users', async () => {
      mockUserRole = 'user';
      const response = await request(app)
        .delete('/permissions/p1')
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /permissions/resources', () => {
    it('should return available resources for admin', async () => {
      const response = await request(app)
        .get('/permissions/resources')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockPermissionController.getResources).toHaveBeenCalled();
    });
  });
});
