/**
 * Admin Routes Tests
 *
 * Tests admin endpoints for correct behavior including:
 * - GET /admin/users (paginated, admin only)
 * - GET /admin/dashboard (admin only)
 * - PUT /admin/users/:id/role (change user role)
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
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  createModuleLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

vi.mock('../../database/client', () => ({
  prisma: { $disconnect: vi.fn() },
}));

const mockAdminController = {
  getDashboard: vi.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true, data: { totalUsers: 50, totalKitchens: 120 } });
  }),
  getUsers: vi.fn((_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      data: [{ id: 'u1', email: 'user1@test.com', role: 'user' }],
      meta: { page: 1, limit: 20, total: 1 },
    });
  }),
  changeUserRole: vi.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true, message: 'Role updated' });
  }),
  bulkUpdateUsers: vi.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true });
  }),
  toggleUserActive: vi.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true });
  }),
  deleteUser: vi.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true });
  }),
  getSystemInfo: vi.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true, data: {} });
  }),
  getDatabaseStats: vi.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true, data: {} });
  }),
  runCleanup: vi.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true });
  }),
  reindex: vi.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true });
  }),
  getConfig: vi.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true, data: {} });
  }),
  getUsageReport: vi.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true, data: {} });
  }),
  getErrorReport: vi.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true, data: {} });
  }),
};

vi.mock('../../api/controllers/admin-controller', () => ({
  adminController: mockAdminController,
}));

vi.mock('../../api/middleware/validation-middleware', () => ({
  validateBody: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  validateParams: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  validateQuery: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  commonSchemas: { idParam: {} },
}));

// Track auth state per-request
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

// Import after mocks
import adminRoutes from '../../api/routes/admin-routes';

// ==================== TEST APP ====================

function createTestApp(): Application {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/admin', adminRoutes);
  return app;
}

// ==================== TESTS ====================

describe('Admin Routes', () => {
  let app: Application;

  beforeEach(() => {
    app = createTestApp();
    vi.clearAllMocks();
    mockUserRole = 'admin';
    mockAuthenticated = true;
  });

  describe('GET /admin/dashboard', () => {
    it('should return dashboard data for admin users', async () => {
      const response = await request(app)
        .get('/admin/dashboard')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalUsers');
      expect(mockAdminController.getDashboard).toHaveBeenCalled();
    });

    it('should return 401 when not authenticated', async () => {
      mockAuthenticated = false;
      const response = await request(app)
        .get('/admin/dashboard')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 for non-admin users', async () => {
      mockUserRole = 'user';
      const response = await request(app)
        .get('/admin/dashboard')
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /admin/users', () => {
    it('should return paginated users list for admin', async () => {
      const response = await request(app)
        .get('/admin/users')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(mockAdminController.getUsers).toHaveBeenCalled();
    });

    it('should return 403 for non-admin users', async () => {
      mockUserRole = 'user';
      const response = await request(app)
        .get('/admin/users')
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 when not authenticated', async () => {
      mockAuthenticated = false;
      const response = await request(app)
        .get('/admin/users')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /admin/users/:id/role', () => {
    it('should change user role successfully for admin', async () => {
      const response = await request(app)
        .put('/admin/users/some-uuid/role')
        .send({ role: 'designer' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockAdminController.changeUserRole).toHaveBeenCalled();
    });

    it('should return 403 for non-admin users', async () => {
      mockUserRole = 'user';
      const response = await request(app)
        .put('/admin/users/some-uuid/role')
        .send({ role: 'designer' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /admin/reports/usage', () => {
    it('should return usage report for admin', async () => {
      const response = await request(app)
        .get('/admin/reports/usage')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockAdminController.getUsageReport).toHaveBeenCalled();
    });
  });
});
