/**
 * Admin Controller Tests
 * Tests for dashboard, user management, and system operations
 */

import { Request, Response } from 'express';

// Create comprehensive mock prisma client with all models used by admin-controller
const mockPrisma = {
  user: {
    count: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  project: {
    count: jest.fn(),
    findMany: jest.fn(),
  },
  kitchen: {
    count: jest.fn(),
  },
  partner: {
    count: jest.fn(),
  },
  order: {
    count: jest.fn(),
  },
  webhook: {
    count: jest.fn(),
  },
  product: {
    count: jest.fn(),
  },
  material: {
    count: jest.fn(),
  },
  metric: {
    count: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  auditLog: {
    count: jest.fn(),
    deleteMany: jest.fn(),
  },
  webhookEvent: {
    deleteMany: jest.fn(),
  },
};

// Mock database client
jest.mock('../database/client', () => ({
  prisma: mockPrisma,
  connectPrisma: jest.fn(),
  disconnectPrisma: jest.fn(),
}));

// Mock asyncHandler to pass through
jest.mock('../api/middleware/error-middleware', () => ({
  asyncHandler: (fn: Function) => fn,
}));

// Mock logger
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

// Import after mocks
import { AdminController } from '../api/controllers/admin-controller';

describe('AdminController', () => {
  let controller: AdminController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    controller = new AdminController();

    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockReq = {
      user: { userId: 'admin-1', email: 'admin@test.com', role: 'admin' } as any,
      params: {},
      query: {},
      body: {},
    };

    mockRes = {
      status: statusMock,
      json: jsonMock,
    };
  });

  // ==================== DASHBOARD ====================

  describe('getDashboard', () => {
    it('should return dashboard statistics', async () => {
      mockPrisma.user.count.mockResolvedValue(50);
      mockPrisma.project.count.mockResolvedValue(100);
      mockPrisma.kitchen.count.mockResolvedValue(200);
      mockPrisma.partner.count.mockResolvedValue(5);
      mockPrisma.order.count.mockResolvedValue(30);
      mockPrisma.webhook.count.mockResolvedValue(3);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: '1', email: 'u1@test.com', createdAt: new Date() },
      ]);
      mockPrisma.project.findMany.mockResolvedValue([
        { id: '1', name: 'Project 1', createdAt: new Date() },
      ]);

      await controller.getDashboard(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            stats: expect.objectContaining({
              users: 50,
              projects: 100,
              kitchens: 200,
            }),
            recent: expect.any(Object),
          }),
        })
      );
    });
  });

  // ==================== USER MANAGEMENT ====================

  describe('getUsers', () => {
    it('should list users with pagination', async () => {
      mockReq.query = { page: '1', limit: '10' };

      mockPrisma.user.findMany.mockResolvedValue([
        { id: '1', email: 'user1@test.com', role: 'user', status: 'active' },
        { id: '2', email: 'user2@test.com', role: 'admin', status: 'active' },
      ]);
      mockPrisma.user.count.mockResolvedValue(2);

      await controller.getUsers(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Array),
          meta: expect.objectContaining({
            total: 2,
          }),
        })
      );
    });
  });

  describe('changeUserRole', () => {
    it('should change user role to valid role', async () => {
      mockReq.params = { id: 'user-123' };
      mockReq.body = { role: 'designer' };

      mockPrisma.user.update.mockResolvedValue({
        id: 'user-123',
        role: 'designer',
      });

      await controller.changeUserRole(mockReq as Request, mockRes as Response);

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-123' },
          data: { role: 'designer' },
        })
      );
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should reject invalid role', async () => {
      mockReq.params = { id: 'user-123' };
      mockReq.body = { role: 'superadmin' };

      await controller.changeUserRole(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('Invalid role'),
        })
      );
    });
  });

  describe('toggleUserActive', () => {
    it('should toggle user from active to suspended', async () => {
      mockReq.params = { id: 'user-123' };

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        status: 'active',
      });
      mockPrisma.user.update.mockResolvedValue({
        id: 'user-123',
        email: 'test@test.com',
        status: 'suspended',
      });

      await controller.toggleUserActive(mockReq as Request, mockRes as Response);

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-123' },
          data: { status: 'suspended' },
        })
      );
      expect(statusMock).toHaveBeenCalledWith(200);
    });
  });

  describe('deleteUser', () => {
    it('should soft-delete a user', async () => {
      mockReq.params = { id: 'user-123' };

      mockPrisma.user.update.mockResolvedValue({
        id: 'user-123',
        status: 'deleted',
        deletedAt: new Date(),
      });

      await controller.deleteUser(mockReq as Request, mockRes as Response);

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-123' },
          data: expect.objectContaining({
            status: 'deleted',
            deletedAt: expect.any(Date),
          }),
        })
      );
      expect(statusMock).toHaveBeenCalledWith(200);
    });
  });

  // ==================== SYSTEM INFO ====================

  describe('getSystemInfo', () => {
    it('should return system information', async () => {
      await controller.getSystemInfo(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            node: expect.objectContaining({
              version: expect.any(String),
              uptime: expect.any(Number),
            }),
            system: expect.any(Object),
          }),
        })
      );
    });
  });

  // ==================== DATABASE STATS ====================

  describe('getDatabaseStats', () => {
    it('should return counts for all tables', async () => {
      mockPrisma.user.count.mockResolvedValue(10);
      mockPrisma.project.count.mockResolvedValue(20);
      mockPrisma.kitchen.count.mockResolvedValue(30);
      mockPrisma.product.count.mockResolvedValue(100);
      mockPrisma.material.count.mockResolvedValue(50);
      mockPrisma.order.count.mockResolvedValue(15);
      mockPrisma.webhook.count.mockResolvedValue(5);
      mockPrisma.auditLog.count.mockResolvedValue(200);
      mockPrisma.metric.count.mockResolvedValue(1000);

      await controller.getDatabaseStats(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            tables: expect.objectContaining({
              users: 10,
              projects: 20,
              kitchens: 30,
            }),
          }),
        })
      );
    });
  });
});
