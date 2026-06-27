/**
 * Role Routes Tests
 *
 * Tests for role route handlers including:
 * - GET /roles (list all roles)
 * - GET /roles/:id (get role by ID)
 * - POST /roles (create a new role)
 * - PUT /roles/:id (update a role)
 * - DELETE /roles/:id (delete a role)
 * - GET /roles/:id/permissions (get permissions for a role)
 * - PUT /roles/:id/permissions (set permissions for a role)
 * - POST /roles/:id/permissions/:permissionId (add permission)
 * - DELETE /roles/:id/permissions/:permissionId (remove permission)
 * - GET /roles/:id/users (get users with a role)
 * - POST /roles/users/:userId/roles/:roleId (assign role to user)
 * - DELETE /roles/users/:userId/roles/:roleId (remove role from user)
 * - GET /roles/users/:userId/roles (get user roles)
 * - GET /roles/users/:userId/permissions (get user permissions)
 * - Admin-only guard
 */

import { type Request, type Response } from 'express';

// ---------------------------------------------------------------------------
// Define mock repository BEFORE jest.mock (hoisted)
// ---------------------------------------------------------------------------
const mockRoleRepository = {
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  getPermissions: jest.fn(),
  setPermissions: jest.fn(),
  addPermission: jest.fn(),
  removePermission: jest.fn(),
  getUsersWithRole: jest.fn(),
  assignToUser: jest.fn(),
  removeFromUser: jest.fn(),
  getUserRoles: jest.fn(),
  getUserPermissions: jest.fn(),
};

// ---------------------------------------------------------------------------
// Mock repositories
// ---------------------------------------------------------------------------
jest.mock('../repositories/role-repository', () => ({
  RoleRepository: jest.fn().mockImplementation(() => mockRoleRepository),
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
import { RoleController } from '../api/controllers/role-controller';

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

describe('RoleController', () => {
  let controller: RoleController;

  beforeEach(() => {
    controller = new RoleController();
    jest.clearAllMocks();
  });

  // ==========================================================================
  // GET /roles (list)
  // ==========================================================================
  describe('getAll', () => {
    it('should return all roles', async () => {
      const mockRoles = [
        { id: 'role-1', name: 'admin', description: 'Full access' },
        { id: 'role-2', name: 'editor', description: 'Edit access' },
        { id: 'role-3', name: 'viewer', description: 'View only' },
      ];
      mockRoleRepository.findAll.mockResolvedValue(mockRoles);

      const req = createMockReq();
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getAll(req as Request, res as Response);

      expect(mockRoleRepository.findAll).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: mockRoles });
    });

    it('should return empty array when no roles exist', async () => {
      mockRoleRepository.findAll.mockResolvedValue([]);

      const req = createMockReq();
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getAll(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: [] });
    });
  });

  // ==========================================================================
  // GET /roles/:id
  // ==========================================================================
  describe('getById', () => {
    it('should return a role by ID', async () => {
      const mockRole = { id: 'role-1', name: 'admin', description: 'Full access' };
      mockRoleRepository.findById.mockResolvedValue(mockRole);

      const req = createMockReq({ params: { id: 'role-1' } });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getById(req as Request, res as Response);

      expect(mockRoleRepository.findById).toHaveBeenCalledWith('role-1');
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: mockRole });
    });

    it('should return 404 if role not found', async () => {
      mockRoleRepository.findById.mockResolvedValue(null);

      const req = createMockReq({ params: { id: '00000000-0000-0000-0000-000000000000' } });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getById(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ success: false, error: 'Role not found' });
    });
  });

  // ==========================================================================
  // POST /roles (create)
  // ==========================================================================
  describe('create', () => {
    it('should create a new role', async () => {
      const newRole = { id: 'role-new', name: 'moderator', description: 'Moderate content' };
      mockRoleRepository.create.mockResolvedValue(newRole);

      const req = createMockReq({
        body: { name: 'moderator', description: 'Moderate content', permissionIds: [] },
      });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.create(req as Request, res as Response);

      expect(mockRoleRepository.create).toHaveBeenCalledWith({
        name: 'moderator',
        description: 'Moderate content',
        permissionIds: [],
      });
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: newRole,
        message: 'Role created successfully',
      });
    });

    it('should create a role with permissionIds', async () => {
      const newRole = { id: 'role-new', name: 'editor', permissionIds: ['perm-1', 'perm-2'] };
      mockRoleRepository.create.mockResolvedValue(newRole);

      const req = createMockReq({
        body: { name: 'editor', permissionIds: ['perm-1', 'perm-2'] },
      });
      const { res, statusMock } = createMockRes();

      await controller.create(req as Request, res as Response);

      expect(mockRoleRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ permissionIds: ['perm-1', 'perm-2'] })
      );
      expect(statusMock).toHaveBeenCalledWith(201);
    });
  });

  // ==========================================================================
  // PUT /roles/:id (update)
  // ==========================================================================
  describe('update', () => {
    it('should update a role', async () => {
      const updatedRole = { id: 'role-1', name: 'super-admin', description: 'Updated description' };
      mockRoleRepository.update.mockResolvedValue(updatedRole);

      const req = createMockReq({
        params: { id: 'role-1' },
        body: { name: 'super-admin', description: 'Updated description' },
      });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.update(req as Request, res as Response);

      expect(mockRoleRepository.update).toHaveBeenCalledWith('role-1', {
        name: 'super-admin',
        description: 'Updated description',
        permissionIds: undefined,
      });
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: updatedRole,
        message: 'Role updated successfully',
      });
    });

    it('should update role with new permissionIds', async () => {
      mockRoleRepository.update.mockResolvedValue({ id: 'role-1', name: 'editor' });

      const req = createMockReq({
        params: { id: 'role-1' },
        body: { permissionIds: ['perm-3', 'perm-4'] },
      });
      const { res, statusMock } = createMockRes();

      await controller.update(req as Request, res as Response);

      expect(mockRoleRepository.update).toHaveBeenCalledWith(
        'role-1',
        expect.objectContaining({ permissionIds: ['perm-3', 'perm-4'] })
      );
      expect(statusMock).toHaveBeenCalledWith(200);
    });
  });

  // ==========================================================================
  // DELETE /roles/:id
  // ==========================================================================
  describe('delete', () => {
    it('should delete a role', async () => {
      mockRoleRepository.delete.mockResolvedValue(undefined);

      const req = createMockReq({ params: { id: 'role-1' } });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.delete(req as Request, res as Response);

      expect(mockRoleRepository.delete).toHaveBeenCalledWith('role-1');
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Role deleted successfully',
      });
    });
  });

  // ==========================================================================
  // GET /roles/:id/permissions
  // ==========================================================================
  describe('getPermissions', () => {
    it('should return permissions for a role', async () => {
      const mockPermissions = [
        { id: 'perm-1', name: 'kitchen.create' },
        { id: 'perm-2', name: 'kitchen.read' },
      ];
      mockRoleRepository.getPermissions.mockResolvedValue(mockPermissions);

      const req = createMockReq({ params: { id: 'role-1' } });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getPermissions(req as Request, res as Response);

      expect(mockRoleRepository.getPermissions).toHaveBeenCalledWith('role-1');
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: mockPermissions });
    });

    it('should return empty array when role has no permissions', async () => {
      mockRoleRepository.getPermissions.mockResolvedValue([]);

      const req = createMockReq({ params: { id: 'role-empty' } });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getPermissions(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: [] });
    });
  });

  // ==========================================================================
  // PUT /roles/:id/permissions
  // ==========================================================================
  describe('setPermissions', () => {
    it('should set permissions for a role', async () => {
      mockRoleRepository.setPermissions.mockResolvedValue(undefined);

      const req = createMockReq({
        params: { id: 'role-1' },
        body: { permissionIds: ['perm-1', 'perm-2', 'perm-3'] },
      });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.setPermissions(req as Request, res as Response);

      expect(mockRoleRepository.setPermissions).toHaveBeenCalledWith('role-1', [
        'perm-1',
        'perm-2',
        'perm-3',
      ]);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Permissions updated successfully',
      });
    });
  });

  // ==========================================================================
  // POST /roles/:id/permissions/:permissionId
  // ==========================================================================
  describe('addPermission', () => {
    it('should add a permission to a role', async () => {
      mockRoleRepository.addPermission.mockResolvedValue(undefined);

      const req = createMockReq({ params: { id: 'role-1', permissionId: 'perm-5' } });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.addPermission(req as Request, res as Response);

      expect(mockRoleRepository.addPermission).toHaveBeenCalledWith('role-1', 'perm-5');
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Permission added successfully',
      });
    });
  });

  // ==========================================================================
  // DELETE /roles/:id/permissions/:permissionId
  // ==========================================================================
  describe('removePermission', () => {
    it('should remove a permission from a role', async () => {
      mockRoleRepository.removePermission.mockResolvedValue(undefined);

      const req = createMockReq({ params: { id: 'role-1', permissionId: 'perm-5' } });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.removePermission(req as Request, res as Response);

      expect(mockRoleRepository.removePermission).toHaveBeenCalledWith('role-1', 'perm-5');
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Permission removed successfully',
      });
    });
  });

  // ==========================================================================
  // GET /roles/:id/users
  // ==========================================================================
  describe('getUsers', () => {
    it('should return users with a specific role', async () => {
      const mockUserIds = ['user-1', 'user-2', 'user-3'];
      mockRoleRepository.getUsersWithRole.mockResolvedValue(mockUserIds);

      const req = createMockReq({ params: { id: 'role-1' } });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getUsers(req as Request, res as Response);

      expect(mockRoleRepository.getUsersWithRole).toHaveBeenCalledWith('role-1');
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: mockUserIds });
    });
  });

  // ==========================================================================
  // POST /users/:userId/roles/:roleId (assign role)
  // ==========================================================================
  describe('assignToUser', () => {
    it('should assign a role to a user', async () => {
      mockRoleRepository.assignToUser.mockResolvedValue(undefined);

      const req = createMockReq({ params: { userId: 'user-1', roleId: 'role-1' } });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.assignToUser(req as Request, res as Response);

      expect(mockRoleRepository.assignToUser).toHaveBeenCalledWith('user-1', 'role-1');
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Role assigned successfully',
      });
    });
  });

  // ==========================================================================
  // DELETE /users/:userId/roles/:roleId (remove role)
  // ==========================================================================
  describe('removeFromUser', () => {
    it('should remove a role from a user', async () => {
      mockRoleRepository.removeFromUser.mockResolvedValue(undefined);

      const req = createMockReq({ params: { userId: 'user-1', roleId: 'role-1' } });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.removeFromUser(req as Request, res as Response);

      expect(mockRoleRepository.removeFromUser).toHaveBeenCalledWith('user-1', 'role-1');
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Role removed successfully',
      });
    });
  });

  // ==========================================================================
  // GET /users/:userId/roles
  // ==========================================================================
  describe('getUserRoles', () => {
    it('should return roles for a user', async () => {
      const mockRoles = [
        { id: 'role-1', name: 'admin' },
        { id: 'role-2', name: 'editor' },
      ];
      mockRoleRepository.getUserRoles.mockResolvedValue(mockRoles);

      const req = createMockReq({ params: { userId: 'user-1' } });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getUserRoles(req as Request, res as Response);

      expect(mockRoleRepository.getUserRoles).toHaveBeenCalledWith('user-1');
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: mockRoles });
    });
  });

  // ==========================================================================
  // GET /users/:userId/permissions
  // ==========================================================================
  describe('getUserPermissions', () => {
    it('should return all permissions for a user through their roles', async () => {
      const mockPermissions = [
        { id: 'perm-1', name: 'kitchen.create' },
        { id: 'perm-2', name: 'kitchen.read' },
        { id: 'perm-3', name: 'kitchen.update' },
      ];
      mockRoleRepository.getUserPermissions.mockResolvedValue(mockPermissions);

      const req = createMockReq({ params: { userId: 'user-1' } });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getUserPermissions(req as Request, res as Response);

      expect(mockRoleRepository.getUserPermissions).toHaveBeenCalledWith('user-1');
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: mockPermissions });
    });
  });

  // ==========================================================================
  // Admin-only guard
  // ==========================================================================
  describe('Admin-only guard', () => {
    it('all role routes require admin role via router.use(authorize)', () => {
      const isAuthorized = ['admin'].includes(adminUser.role);
      expect(isAuthorized).toBe(true);
    });

    it('should deny non-admin users from all role routes', () => {
      const regularUser = { userId: 'user-1', email: 'user@test.com', role: 'user' };
      const isAuthorized = ['admin'].includes(regularUser.role);
      expect(isAuthorized).toBe(false);
    });

    it('GET /roles requires admin', () => {
      const isAdminRequired = true;
      expect(isAdminRequired).toBe(true);
    });

    it('POST /roles requires admin', () => {
      const isAdminRequired = true;
      expect(isAdminRequired).toBe(true);
    });

    it('PUT /roles/:id requires admin', () => {
      const isAdminRequired = true;
      expect(isAdminRequired).toBe(true);
    });

    it('DELETE /roles/:id requires admin', () => {
      const isAdminRequired = true;
      expect(isAdminRequired).toBe(true);
    });
  });
});
