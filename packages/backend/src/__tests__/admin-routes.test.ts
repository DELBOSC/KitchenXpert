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

import cookieParser from 'cookie-parser';
import express, { type Application, type Request, type Response, type NextFunction } from 'express';
import request from 'supertest';

// ==================== MOCKS ====================

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

jest.mock('../database/client', () => ({
  prisma: { $disconnect: jest.fn() },
}));

const mockAdminController = {
  getDashboard: jest.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true, data: { totalUsers: 50, totalKitchens: 120 } });
  }),
  getUsers: jest.fn((_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      data: [{ id: 'u1', email: 'user1@test.com', role: 'user' }],
      meta: { page: 1, limit: 20, total: 1 },
    });
  }),
  changeUserRole: jest.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true, message: 'Role updated' });
  }),
  bulkUpdateUsers: jest.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true });
  }),
  toggleUserActive: jest.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true });
  }),
  deleteUser: jest.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true });
  }),
  getSystemInfo: jest.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true, data: {} });
  }),
  getDatabaseStats: jest.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true, data: {} });
  }),
  runCleanup: jest.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true });
  }),
  reindex: jest.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true });
  }),
  getConfig: jest.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true, data: {} });
  }),
  getUsageReport: jest.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true, data: {} });
  }),
  getErrorReport: jest.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true, data: {} });
  }),
};

jest.mock('../api/controllers/admin-controller', () => ({
  adminController: mockAdminController,
}));

jest.mock('../api/middleware/validation-middleware', () => ({
  validateBody: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  validateParams: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  validateQuery: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  commonSchemas: { idParam: {} },
}));

// Track auth state per-request
let mockUserRole = 'admin';
let mockAuthenticated = true;

jest.mock('../api/middleware/auth-middleware', () => ({
  authenticate: (req: any, res: any, next: any) => {
    if (!mockAuthenticated) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }
    req.user = { userId: 'test-user-1', email: 'admin@test.com', role: mockUserRole };
    next();
  },
  authorize: (roles: string[]) => (req: any, res: any, next: any) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions' },
      });
    }
    next();
  },
}));

// Import after mocks
import adminRoutes from '../api/routes/admin-routes';

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
    jest.clearAllMocks();
    mockUserRole = 'admin';
    mockAuthenticated = true;
  });

  describe('GET /admin/dashboard', () => {
    it('should return dashboard data for admin users', async () => {
      const response = await request(app).get('/admin/dashboard').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalUsers');
      expect(mockAdminController.getDashboard).toHaveBeenCalled();
    });

    it('should return 401 when not authenticated', async () => {
      mockAuthenticated = false;
      const response = await request(app).get('/admin/dashboard').expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 for non-admin users', async () => {
      mockUserRole = 'user';
      const response = await request(app).get('/admin/dashboard').expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /admin/users', () => {
    it('should return paginated users list for admin', async () => {
      const response = await request(app).get('/admin/users').expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(mockAdminController.getUsers).toHaveBeenCalled();
    });

    it('should return 403 for non-admin users', async () => {
      mockUserRole = 'user';
      const response = await request(app).get('/admin/users').expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 when not authenticated', async () => {
      mockAuthenticated = false;
      const response = await request(app).get('/admin/users').expect(401);

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
      const response = await request(app).get('/admin/reports/usage').expect(200);

      expect(response.body.success).toBe(true);
      expect(mockAdminController.getUsageReport).toHaveBeenCalled();
    });
  });
});
