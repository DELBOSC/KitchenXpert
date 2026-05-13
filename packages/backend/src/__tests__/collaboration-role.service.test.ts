/**
 * Collaboration Role Service Tests
 *
 * Tests for invite, accept, decline, getMembers, updateRole,
 * removeMember, checkPermission, and getMyInvites.
 */

// Mock logger before imports
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

// Mock crypto
jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => ({
    toString: jest.fn(() => 'a'.repeat(64)), // 32 bytes => 64 hex chars
  })),
}));

// Mock database client
const mockPrisma = {
  kitchen: {
    findUnique: jest.fn(),
  },
  collaborationInvite: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
};

jest.mock('../database/client', () => ({
  prisma: mockPrisma,
}));

import { CollaborationRoleService } from '../services/collaboration/collaboration-role.service';

describe('CollaborationRoleService', () => {
  let service: CollaborationRoleService;

  const mockUser = { userId: 'test-user-id', email: 'test@test.com', role: 'user' };

  const mockKitchen = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    userId: mockUser.userId,
    name: 'Ma Cuisine',
  };

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7);

  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 1);

  const mockInvite = {
    id: 'invite-1',
    kitchenId: '550e8400-e29b-41d4-a716-446655440000',
    inviterId: mockUser.userId,
    inviteeEmail: 'collaborator@test.com',
    role: 'designer',
    permissions: {
      canEdit: true,
      canComment: true,
      canExport: true,
      canViewSpecs: true,
      canViewBOM: true,
    },
    token: 'a'.repeat(64),
    status: 'pending',
    expiresAt: futureDate,
    createdAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CollaborationRoleService();
  });

  // ==================== invite ====================

  describe('invite', () => {
    it('should create an invitation with correct role permissions', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);
      mockPrisma.collaborationInvite.create.mockResolvedValue(mockInvite);

      const result = await service.invite({
        kitchenId: '550e8400-e29b-41d4-a716-446655440000',
        inviterId: mockUser.userId,
        inviteeEmail: 'collaborator@test.com',
        role: 'designer',
      });

      expect(result.role).toBe('designer');
      expect(mockPrisma.collaborationInvite.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          kitchenId: '550e8400-e29b-41d4-a716-446655440000',
          inviterId: mockUser.userId,
          inviteeEmail: 'collaborator@test.com',
          role: 'designer',
          status: 'pending',
          token: expect.any(String),
          expiresAt: expect.any(Date),
          permissions: expect.objectContaining({
            canEdit: true,
            canComment: true,
            canExport: true,
          }),
        }),
      });
    });

    it('should throw when kitchen does not exist', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(null);

      await expect(
        service.invite({
          kitchenId: 'non-existent',
          inviterId: mockUser.userId,
          inviteeEmail: 'collab@test.com',
          role: 'viewer',
        }),
      ).rejects.toThrow('Kitchen not found');
    });

    it('should throw when inviter does not own the kitchen', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue({
        ...mockKitchen,
        userId: 'other-owner-id',
      });

      await expect(
        service.invite({
          kitchenId: '550e8400-e29b-41d4-a716-446655440000',
          inviterId: mockUser.userId,
          inviteeEmail: 'collab@test.com',
          role: 'viewer',
        }),
      ).rejects.toThrow('Only the kitchen owner can send invitations');
    });

    it('should assign viewer permissions correctly (no edit, no export)', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);
      mockPrisma.collaborationInvite.create.mockResolvedValue({
        ...mockInvite,
        role: 'viewer',
      });

      await service.invite({
        kitchenId: '550e8400-e29b-41d4-a716-446655440000',
        inviterId: mockUser.userId,
        inviteeEmail: 'viewer@test.com',
        role: 'viewer',
      });

      expect(mockPrisma.collaborationInvite.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          permissions: expect.objectContaining({
            canEdit: false,
            canComment: true,
            canExport: false,
            canViewSpecs: false,
            canViewBOM: false,
          }),
        }),
      });
    });

    it('should normalize invitee email to lowercase', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);
      mockPrisma.collaborationInvite.create.mockResolvedValue(mockInvite);

      await service.invite({
        kitchenId: '550e8400-e29b-41d4-a716-446655440000',
        inviterId: mockUser.userId,
        inviteeEmail: ' Collaborator@Test.COM ',
        role: 'designer',
      });

      expect(mockPrisma.collaborationInvite.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          inviteeEmail: 'collaborator@test.com',
        }),
      });
    });
  });

  // ==================== accept ====================

  describe('accept', () => {
    it('should accept a valid pending invitation', async () => {
      mockPrisma.collaborationInvite.findUnique.mockResolvedValue(mockInvite);
      mockPrisma.collaborationInvite.update.mockResolvedValue({
        ...mockInvite,
        status: 'accepted',
      });

      const result = await service.accept(mockInvite.token, 'accepting-user-id');

      expect(result.status).toBe('accepted');
      expect(mockPrisma.collaborationInvite.update).toHaveBeenCalledWith({
        where: { id: mockInvite.id },
        data: { status: 'accepted' },
      });
    });

    it('should throw when invite is not found', async () => {
      mockPrisma.collaborationInvite.findUnique.mockResolvedValue(null);

      await expect(
        service.accept('invalid-token', 'user-id'),
      ).rejects.toThrow('Invite not found');
    });

    it('should throw when invite has already been accepted', async () => {
      mockPrisma.collaborationInvite.findUnique.mockResolvedValue({
        ...mockInvite,
        status: 'accepted',
      });

      await expect(
        service.accept(mockInvite.token, 'user-id'),
      ).rejects.toThrow('Invite has already been accepted');
    });

    it('should throw and mark as expired when invite has expired', async () => {
      mockPrisma.collaborationInvite.findUnique.mockResolvedValue({
        ...mockInvite,
        expiresAt: pastDate,
      });
      mockPrisma.collaborationInvite.update.mockResolvedValue({});

      await expect(
        service.accept(mockInvite.token, 'user-id'),
      ).rejects.toThrow('Invite has expired');

      // Should update status to expired
      expect(mockPrisma.collaborationInvite.update).toHaveBeenCalledWith({
        where: { id: mockInvite.id },
        data: { status: 'expired' },
      });
    });
  });

  // ==================== decline ====================

  describe('decline', () => {
    it('should decline a pending invitation', async () => {
      mockPrisma.collaborationInvite.findUnique.mockResolvedValue(mockInvite);
      mockPrisma.collaborationInvite.update.mockResolvedValue({
        ...mockInvite,
        status: 'declined',
      });

      await service.decline(mockInvite.token);

      expect(mockPrisma.collaborationInvite.update).toHaveBeenCalledWith({
        where: { id: mockInvite.id },
        data: { status: 'declined' },
      });
    });

    it('should throw when invite is not found', async () => {
      mockPrisma.collaborationInvite.findUnique.mockResolvedValue(null);

      await expect(
        service.decline('invalid-token'),
      ).rejects.toThrow('Invite not found');
    });

    it('should throw when invite is not pending', async () => {
      mockPrisma.collaborationInvite.findUnique.mockResolvedValue({
        ...mockInvite,
        status: 'accepted',
      });

      await expect(
        service.decline(mockInvite.token),
      ).rejects.toThrow('Invite has already been accepted');
    });
  });

  // ==================== getMembers ====================

  describe('getMembers', () => {
    it('should return all collaboration members for a kitchen', async () => {
      mockPrisma.collaborationInvite.findMany.mockResolvedValue([
        mockInvite,
        { ...mockInvite, id: 'invite-2', inviteeEmail: 'another@test.com', role: 'viewer', status: 'accepted' },
      ]);

      const result = await service.getMembers('550e8400-e29b-41d4-a716-446655440000');

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('role');
      expect(result[0]).toHaveProperty('permissions');
      expect(result[0]).toHaveProperty('status');
    });

    it('should return empty array when no members exist', async () => {
      mockPrisma.collaborationInvite.findMany.mockResolvedValue([]);

      const result = await service.getMembers('kitchen-no-collab');

      expect(result).toEqual([]);
    });
  });

  // ==================== updateRole ====================

  describe('updateRole', () => {
    it('should update a member role and recalculate permissions', async () => {
      mockPrisma.collaborationInvite.findUnique.mockResolvedValue(mockInvite);
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);
      mockPrisma.collaborationInvite.update.mockResolvedValue({
        ...mockInvite,
        role: 'installer',
        permissions: {
          canEdit: false,
          canComment: true,
          canExport: true,
          canViewSpecs: true,
          canViewBOM: true,
        },
      });

      const result = await service.updateRole('invite-1', 'installer', mockUser.userId);

      expect(result.role).toBe('installer');
      expect(mockPrisma.collaborationInvite.update).toHaveBeenCalledWith({
        where: { id: 'invite-1' },
        data: {
          role: 'installer',
          permissions: expect.objectContaining({
            canEdit: false,
            canComment: true,
            canExport: true,
            canViewSpecs: true,
            canViewBOM: true,
          }),
        },
      });
    });

    it('should throw when invite does not exist', async () => {
      mockPrisma.collaborationInvite.findUnique.mockResolvedValue(null);

      await expect(
        service.updateRole('non-existent', 'viewer', mockUser.userId),
      ).rejects.toThrow('Collaboration invite not found');
    });

    it('should throw when requester does not own the kitchen', async () => {
      mockPrisma.collaborationInvite.findUnique.mockResolvedValue(mockInvite);
      mockPrisma.kitchen.findUnique.mockResolvedValue({
        ...mockKitchen,
        userId: 'other-owner-id',
      });

      await expect(
        service.updateRole('invite-1', 'viewer', mockUser.userId),
      ).rejects.toThrow('Forbidden: only the kitchen owner can update roles');
    });
  });

  // ==================== removeMember ====================

  describe('removeMember', () => {
    it('should remove a member when requested by kitchen owner', async () => {
      mockPrisma.collaborationInvite.findUnique.mockResolvedValue(mockInvite);
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);
      mockPrisma.collaborationInvite.delete.mockResolvedValue({});

      await service.removeMember('invite-1', mockUser.userId);

      expect(mockPrisma.collaborationInvite.delete).toHaveBeenCalledWith({
        where: { id: 'invite-1' },
      });
    });

    it('should throw when invite does not exist', async () => {
      mockPrisma.collaborationInvite.findUnique.mockResolvedValue(null);

      await expect(
        service.removeMember('non-existent', mockUser.userId),
      ).rejects.toThrow('Collaboration invite not found');
    });

    it('should throw when requester is not the kitchen owner', async () => {
      mockPrisma.collaborationInvite.findUnique.mockResolvedValue(mockInvite);
      mockPrisma.kitchen.findUnique.mockResolvedValue({
        ...mockKitchen,
        userId: 'other-owner-id',
      });

      await expect(
        service.removeMember('invite-1', mockUser.userId),
      ).rejects.toThrow('Forbidden: only the kitchen owner can remove members');
    });
  });

  // ==================== checkPermission ====================

  describe('checkPermission', () => {
    it('should return true for kitchen owner regardless of permission', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);

      const result = await service.checkPermission(mockUser.userId, '550e8400-e29b-41d4-a716-446655440000', 'canEdit');

      expect(result).toBe(true);
    });

    it('should return true when collaborator has the permission', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue({
        ...mockKitchen,
        userId: 'other-owner-id',
      });
      mockPrisma.user.findUnique.mockResolvedValue({ email: 'collaborator@test.com' });
      mockPrisma.collaborationInvite.findFirst.mockResolvedValue({
        ...mockInvite,
        status: 'accepted',
      });

      const result = await service.checkPermission(mockUser.userId, '550e8400-e29b-41d4-a716-446655440000', 'canEdit');

      expect(result).toBe(true);
    });

    it('should return false when collaborator does not have the permission', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue({
        ...mockKitchen,
        userId: 'other-owner-id',
      });
      mockPrisma.user.findUnique.mockResolvedValue({ email: 'viewer@test.com' });
      mockPrisma.collaborationInvite.findFirst.mockResolvedValue({
        ...mockInvite,
        role: 'viewer',
        permissions: {
          canEdit: false,
          canComment: true,
          canExport: false,
          canViewSpecs: false,
          canViewBOM: false,
        },
        status: 'accepted',
      });

      const result = await service.checkPermission(mockUser.userId, '550e8400-e29b-41d4-a716-446655440000', 'canEdit');

      expect(result).toBe(false);
    });

    it('should return false when kitchen does not exist', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(null);

      const result = await service.checkPermission(mockUser.userId, 'non-existent', 'canEdit');

      expect(result).toBe(false);
    });

    it('should return false when user has no accepted invite', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue({
        ...mockKitchen,
        userId: 'other-owner-id',
      });
      mockPrisma.user.findUnique.mockResolvedValue({ email: 'no-invite@test.com' });
      mockPrisma.collaborationInvite.findFirst.mockResolvedValue(null);

      const result = await service.checkPermission(mockUser.userId, '550e8400-e29b-41d4-a716-446655440000', 'canEdit');

      expect(result).toBe(false);
    });
  });
});
