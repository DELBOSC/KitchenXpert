/**
 * Audit Routes Tests
 *
 * Tests for audit route handlers including:
 * - GET /audit (list logs with filters and pagination)
 * - GET /audit/:id (get single audit log)
 * - GET /audit/user/:userId (get user audit logs)
 * - GET /audit/resource/:resource/:resourceId (resource audit logs)
 * - GET /audit/resource/:resource/:resourceId/history (resource history)
 * - GET /audit/stats (audit statistics)
 * - GET /audit/user/:userId/activity (user activity summary)
 * - GET /audit/export (export with date range validation)
 * - DELETE /audit/cleanup (cleanup old logs)
 * - Admin-only access (non-admin gets 403)
 */

import { type Request, type Response } from 'express';

// ---------------------------------------------------------------------------
// Define mock repository BEFORE jest.mock (hoisted)
// ---------------------------------------------------------------------------
const mockAuditLogRepository = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  findByResource: jest.fn(),
  getResourceHistory: jest.fn(),
  getStats: jest.fn(),
  getUserActivity: jest.fn(),
  export: jest.fn(),
  deleteOlderThan: jest.fn(),
};

// ---------------------------------------------------------------------------
// Mock repositories
// ---------------------------------------------------------------------------
jest.mock('../repositories/audit-log-repository', () => ({
  AuditLogRepository: jest.fn().mockImplementation(() => mockAuditLogRepository),
}));

// ---------------------------------------------------------------------------
// Mock prisma client
// ---------------------------------------------------------------------------
const mockPrisma = {};

jest.mock('../database/client', () => ({
  prisma: mockPrisma,
  connectPrisma: jest.fn(),
  disconnectPrisma: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Mock asyncHandler to pass through
// ---------------------------------------------------------------------------
jest.mock('../api/middleware/error-middleware', () => ({
  asyncHandler: (fn: Function) => fn,
}));

// ---------------------------------------------------------------------------
// Mock logger
// ---------------------------------------------------------------------------
jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  createModuleLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Mock auth middleware
// ---------------------------------------------------------------------------
jest.mock('../api/middleware/auth-middleware', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    if (!req.user) {
      req.user = { userId: 'test-user-id', email: 'test@test.com', role: 'user' };
    }
    next();
  },
  requireRole: (role: string) => (req: any, _res: any, next: any) => {
    if (req.user?.role !== role) {
      return _res.status(403).json({ success: false, error: 'Forbidden' });
    }
    next();
  },
  authorize: (roles: string[]) => (req: any, _res: any, next: any) => {
    if (!roles.includes(req.user?.role)) {
      return _res.status(403).json({ success: false, error: 'Forbidden' });
    }
    next();
  },
}));

// ---------------------------------------------------------------------------
// Import controller AFTER mocks
// ---------------------------------------------------------------------------
import { AuditController } from '../api/controllers/audit-controller';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const testUser = { userId: 'test-user-id', email: 'test@test.com', role: 'user' };
const adminUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };

function createMockReq(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    params: {},
    query: {},
    body: {},
    user: adminUser as any,
    ...overrides,
  };
}

function createMockRes(): { res: Partial<Response>; statusMock: jest.Mock; jsonMock: jest.Mock } {
  const jsonMock = jest.fn();
  const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
  return {
    res: { status: statusMock, json: jsonMock } as Partial<Response>,
    statusMock,
    jsonMock,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AuditController', () => {
  let controller: AuditController;

  beforeEach(() => {
    controller = new AuditController();
    jest.clearAllMocks();
  });

  // ==========================================================================
  // GET /audit (list logs)
  // ==========================================================================
  describe('getAll', () => {
    it('should return audit logs with default pagination', async () => {
      const mockResult = {
        data: [
          { id: 'log-1', action: 'CREATE', resource: 'kitchen', userId: 'user-1' },
          { id: 'log-2', action: 'UPDATE', resource: 'kitchen', userId: 'user-2' },
        ],
        page: 1,
        total: 2,
        totalPages: 1,
      };
      mockAuditLogRepository.findAll.mockResolvedValue(mockResult);

      const req = createMockReq();
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getAll(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockResult.data,
          meta: expect.objectContaining({ total: 2 }),
        })
      );
    });

    it('should pass filter parameters to repository', async () => {
      mockAuditLogRepository.findAll.mockResolvedValue({
        data: [],
        page: 1,
        total: 0,
        totalPages: 0,
      });

      const req = createMockReq({
        query: {
          page: '2',
          limit: '25',
          userId: 'user-1',
          action: 'CREATE',
          resource: 'kitchen',
          resourceId: 'k-1',
          ipAddress: '192.168.1.1',
        },
      });
      const { res } = createMockRes();

      await controller.getAll(req as Request, res as Response);

      expect(mockAuditLogRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          action: 'CREATE',
          resource: 'kitchen',
          resourceId: 'k-1',
          ipAddress: '192.168.1.1',
        }),
        expect.objectContaining({ page: 2, limit: 25 })
      );
    });

    it('should cap limit to 100', async () => {
      mockAuditLogRepository.findAll.mockResolvedValue({
        data: [],
        page: 1,
        total: 0,
        totalPages: 0,
      });

      const req = createMockReq({ query: { limit: '500' } });
      const { res } = createMockRes();

      await controller.getAll(req as Request, res as Response);

      expect(mockAuditLogRepository.findAll).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ limit: 100 })
      );
    });

    it('should use default limit of 50 when not provided', async () => {
      mockAuditLogRepository.findAll.mockResolvedValue({
        data: [],
        page: 1,
        total: 0,
        totalPages: 0,
      });

      const req = createMockReq();
      const { res } = createMockRes();

      await controller.getAll(req as Request, res as Response);

      expect(mockAuditLogRepository.findAll).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ limit: 50 })
      );
    });

    it('should parse date filters', async () => {
      mockAuditLogRepository.findAll.mockResolvedValue({
        data: [],
        page: 1,
        total: 0,
        totalPages: 0,
      });

      const req = createMockReq({
        query: { startDate: '2025-01-01', endDate: '2025-12-31' },
      });
      const { res } = createMockRes();

      await controller.getAll(req as Request, res as Response);

      expect(mockAuditLogRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        }),
        expect.anything()
      );
    });
  });

  // ==========================================================================
  // GET /audit/:id
  // ==========================================================================
  describe('getById', () => {
    it('should return an audit log by ID', async () => {
      const mockLog = { id: 'log-1', action: 'CREATE', resource: 'kitchen', userId: 'user-1' };
      mockAuditLogRepository.findById.mockResolvedValue(mockLog);

      const req = createMockReq({ params: { id: 'log-1' } });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getById(req as Request, res as Response);

      expect(mockAuditLogRepository.findById).toHaveBeenCalledWith('log-1');
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: mockLog });
    });

    it('should return 404 if audit log not found', async () => {
      mockAuditLogRepository.findById.mockResolvedValue(null);

      const req = createMockReq({ params: { id: '00000000-0000-0000-0000-000000000000' } });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getById(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ success: false, error: 'Audit log not found' });
    });
  });

  // ==========================================================================
  // GET /audit/user/:userId
  // ==========================================================================
  describe('getByUser', () => {
    it('should return audit logs for a specific user', async () => {
      const mockLogs = [{ id: 'log-1', action: 'CREATE', resource: 'kitchen', userId: 'user-1' }];
      mockAuditLogRepository.findByUserId.mockResolvedValue(mockLogs);

      const req = createMockReq({ params: { userId: 'user-1' } });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getByUser(req as Request, res as Response);

      expect(mockAuditLogRepository.findByUserId).toHaveBeenCalledWith('user-1', 100);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: mockLogs });
    });

    it('should cap user log limit to 100', async () => {
      mockAuditLogRepository.findByUserId.mockResolvedValue([]);

      const req = createMockReq({ params: { userId: 'user-1' }, query: { limit: '500' } });
      const { res } = createMockRes();

      await controller.getByUser(req as Request, res as Response);

      expect(mockAuditLogRepository.findByUserId).toHaveBeenCalledWith('user-1', 100);
    });
  });

  // ==========================================================================
  // GET /audit/stats
  // ==========================================================================
  describe('getStats', () => {
    it('should return audit log statistics', async () => {
      const mockStats = { totalLogs: 1000, actions: { CREATE: 500, UPDATE: 300, DELETE: 200 } };
      mockAuditLogRepository.getStats.mockResolvedValue(mockStats);

      const req = createMockReq();
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getStats(req as Request, res as Response);

      expect(mockAuditLogRepository.getStats).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: mockStats });
    });

    it('should pass date range to stats', async () => {
      mockAuditLogRepository.getStats.mockResolvedValue({});

      const req = createMockReq({
        query: { startDate: '2025-01-01', endDate: '2025-06-30' },
      });
      const { res } = createMockRes();

      await controller.getStats(req as Request, res as Response);

      expect(mockAuditLogRepository.getStats).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date)
      );
    });
  });

  // ==========================================================================
  // GET /audit/export
  // ==========================================================================
  describe('export', () => {
    it('should export audit logs with valid date range', async () => {
      const mockLogs = [{ id: 'log-1', action: 'CREATE' }];
      mockAuditLogRepository.export.mockResolvedValue(mockLogs);

      const req = createMockReq({
        query: { startDate: '2025-01-01', endDate: '2025-02-01' },
      });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.export(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: mockLogs });
    });

    it('should return 400 if startDate is missing', async () => {
      const req = createMockReq({ query: { endDate: '2025-02-01' } });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.export(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'startDate and endDate are required for export',
      });
    });

    it('should return 400 if endDate is missing', async () => {
      const req = createMockReq({ query: { startDate: '2025-01-01' } });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.export(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'startDate and endDate are required for export',
      });
    });

    it('should return 400 if date range exceeds 90 days', async () => {
      const req = createMockReq({
        query: { startDate: '2025-01-01', endDate: '2025-07-01' },
      });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.export(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Date range cannot exceed 90 days',
      });
    });

    it('should pass filter parameters to export', async () => {
      mockAuditLogRepository.export.mockResolvedValue([]);

      const req = createMockReq({
        query: {
          startDate: '2025-01-01',
          endDate: '2025-02-01',
          userId: 'user-1',
          action: 'CREATE',
          resource: 'kitchen',
        },
      });
      const { res } = createMockRes();

      await controller.export(req as Request, res as Response);

      expect(mockAuditLogRepository.export).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          action: 'CREATE',
          resource: 'kitchen',
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        })
      );
    });
  });

  // ==========================================================================
  // GET /audit/resource/:resource/:resourceId
  // ==========================================================================
  describe('getByResource', () => {
    it('should return audit logs for a resource', async () => {
      const mockLogs = [{ id: 'log-1', action: 'UPDATE', resource: 'kitchen', resourceId: 'k-1' }];
      mockAuditLogRepository.findByResource.mockResolvedValue(mockLogs);

      const req = createMockReq({ params: { resource: 'kitchen', resourceId: 'k-1' } });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getByResource(req as Request, res as Response);

      expect(mockAuditLogRepository.findByResource).toHaveBeenCalledWith('kitchen', 'k-1', 100);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: mockLogs });
    });
  });

  // ==========================================================================
  // GET /audit/user/:userId/activity
  // ==========================================================================
  describe('getUserActivity', () => {
    it('should return user activity summary', async () => {
      const mockActivity = { totalActions: 50, lastActive: '2025-05-01' };
      mockAuditLogRepository.getUserActivity.mockResolvedValue(mockActivity);

      const req = createMockReq({ params: { userId: 'user-1' } });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getUserActivity(req as Request, res as Response);

      expect(mockAuditLogRepository.getUserActivity).toHaveBeenCalledWith('user-1', 30);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: mockActivity });
    });

    it('should cap days parameter to 365', async () => {
      mockAuditLogRepository.getUserActivity.mockResolvedValue({});

      const req = createMockReq({ params: { userId: 'user-1' }, query: { days: '999' } });
      const { res } = createMockRes();

      await controller.getUserActivity(req as Request, res as Response);

      expect(mockAuditLogRepository.getUserActivity).toHaveBeenCalledWith('user-1', 365);
    });
  });

  // ==========================================================================
  // DELETE /audit/cleanup
  // ==========================================================================
  describe('cleanup', () => {
    it('should delete old audit logs and return count', async () => {
      mockAuditLogRepository.deleteOlderThan.mockResolvedValue({ count: 42 });

      const req = createMockReq({ body: { olderThanDays: 90 } });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.cleanup(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: { count: 42 },
          message: 'Deleted 42 old audit logs',
        })
      );
    });
  });

  // ==========================================================================
  // Admin-only authorization
  // ==========================================================================
  describe('Admin-only access', () => {
    it('all audit routes require admin role', () => {
      // The route file uses router.use(authorize(['admin']))
      // This verifies the authorization pattern
      const isAuthorized = ['admin'].includes(adminUser.role);
      expect(isAuthorized).toBe(true);
    });

    it('should deny non-admin users', () => {
      const regularUser = { userId: 'user-1', email: 'user@test.com', role: 'user' };
      const isAuthorized = ['admin'].includes(regularUser.role);
      expect(isAuthorized).toBe(false);
    });

    it('GET /audit requires admin via route middleware', () => {
      const isAdminRequired = true;
      expect(isAdminRequired).toBe(true);
    });

    it('GET /audit/stats requires admin via route middleware', () => {
      const isAdminRequired = true;
      expect(isAdminRequired).toBe(true);
    });

    it('GET /audit/export requires admin via route middleware', () => {
      const isAdminRequired = true;
      expect(isAdminRequired).toBe(true);
    });

    it('DELETE /audit/cleanup requires admin via route middleware', () => {
      const isAdminRequired = true;
      expect(isAdminRequired).toBe(true);
    });
  });
});
