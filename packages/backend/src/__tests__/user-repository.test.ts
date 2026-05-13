/**
 * User Repository Tests
 * Tests for PrismaUserRepository
 */

import { PrismaUserRepository } from '../repositories/prisma-user.repository';
import { mockPrismaClient } from '../test/setup';

describe('UserRepository', () => {
  let repository: PrismaUserRepository;

  beforeEach(() => {
    repository = new PrismaUserRepository(mockPrismaClient as any);
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should find a user by ID', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
        status: 'active',
        avatar: null,
        phone: null,
        language: 'en',
        timezone: 'UTC',
        emailVerified: true,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        password: 'hashed',
      };

      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);

      const result = await repository.findById('user-1');

      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
      expect(result).toEqual(expect.objectContaining({
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      }));
    });

    it('should return null when user not found', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(null);

      const result = await repository.findById('00000000-0000-0000-0000-000000000000');

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should find a user by email', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
        status: 'active',
        avatar: null,
        phone: null,
        language: 'en',
        timezone: 'UTC',
        emailVerified: true,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        password: 'hashed-password',
      };
      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);

      const result = await repository.findByEmail('Test@Example.com');

      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(result).toEqual(expect.objectContaining({
        id: 'user-1',
        email: 'test@example.com',
        password: 'hashed-password',
      }));
    });

    it('should return null when user not found', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(null);

      const result = await repository.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findPaginated', () => {
    it('should find users with pagination', async () => {
      const mockUsers = [
        {
          id: 'u1',
          email: 'user1@example.com',
          firstName: 'User',
          lastName: 'One',
          role: 'user',
          status: 'active',
          avatar: null,
          phone: null,
          language: 'en',
          timezone: 'UTC',
          emailVerified: true,
          lastLoginAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          password: 'hash1',
        },
        {
          id: 'u2',
          email: 'user2@example.com',
          firstName: 'User',
          lastName: 'Two',
          role: 'user',
          status: 'active',
          avatar: null,
          phone: null,
          language: 'en',
          timezone: 'UTC',
          emailVerified: true,
          lastLoginAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          password: 'hash2',
        },
      ];

      mockPrismaClient.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaClient.user.count.mockResolvedValue(2);

      const result = await repository.findPaginated({ page: 1, limit: 10 });

      expect(result).toEqual({
        users: expect.arrayContaining([
          expect.objectContaining({ id: 'u1', email: 'user1@example.com' }),
          expect.objectContaining({ id: 'u2', email: 'user2@example.com' }),
        ]),
        total: 2,
      });
    });

    it('should apply filters correctly', async () => {
      mockPrismaClient.user.findMany.mockResolvedValue([]);
      mockPrismaClient.user.count.mockResolvedValue(0);

      await repository.findPaginated({ page: 1, limit: 10, role: 'admin', status: 'active' });

      expect(mockPrismaClient.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: 'admin',
            status: 'active',
          }),
        })
      );
    });
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const createData = {
        email: 'New@Example.com',
        password: 'hashed-password',
        firstName: 'New',
        lastName: 'User',
        role: 'user',
        status: 'pending',
        emailVerified: false,
        language: 'en',
        timezone: 'UTC',
      };

      const mockCreated = {
        id: 'new-id',
        email: 'new@example.com',
        password: 'hashed-password',
        firstName: 'New',
        lastName: 'User',
        role: 'user',
        status: 'pending',
        avatar: null,
        phone: null,
        language: 'en',
        timezone: 'UTC',
        emailVerified: false,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrismaClient.user.create.mockResolvedValue(mockCreated);

      const result = await repository.create(createData);

      expect(mockPrismaClient.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'new@example.com',
          firstName: 'New',
          lastName: 'User',
        }),
      });
      expect(result).toEqual(expect.objectContaining({
        id: 'new-id',
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'User',
      }));
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const mockUpdated = {
        id: 'u1',
        email: 'test@example.com',
        firstName: 'Updated',
        lastName: 'User',
        role: 'user',
        status: 'active',
        avatar: null,
        phone: null,
        language: 'en',
        timezone: 'UTC',
        emailVerified: true,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        password: 'hash',
      };
      mockPrismaClient.user.update.mockResolvedValue(mockUpdated);

      const result = await repository.updateProfile('u1', { firstName: 'Updated' });

      expect(mockPrismaClient.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { firstName: 'Updated' },
      });
      expect(result).toEqual(expect.objectContaining({
        id: 'u1',
        firstName: 'Updated',
      }));
    });
  });

  describe('softDelete', () => {
    it('should soft delete a user by setting status to suspended', async () => {
      mockPrismaClient.user.update.mockResolvedValue({ id: 'u1', status: 'suspended' });

      await repository.softDelete('u1');

      expect(mockPrismaClient.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { status: 'suspended' },
      });
    });
  });

  describe('hardDelete', () => {
    it('should permanently delete a user', async () => {
      mockPrismaClient.user.delete.mockResolvedValue({ id: 'u1' });

      await repository.hardDelete('u1');

      expect(mockPrismaClient.user.delete).toHaveBeenCalledWith({
        where: { id: 'u1' },
      });
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login time', async () => {
      mockPrismaClient.user.update.mockResolvedValue({ id: 'u1' });

      await repository.updateLastLogin('u1');

      expect(mockPrismaClient.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { lastLoginAt: expect.any(Date) },
      });
    });
  });

  describe('emailExists', () => {
    it('should return true if email exists', async () => {
      mockPrismaClient.user.count.mockResolvedValue(1);

      const result = await repository.emailExists('existing@example.com');

      expect(mockPrismaClient.user.count).toHaveBeenCalledWith({
        where: { email: 'existing@example.com' },
      });
      expect(result).toBe(true);
    });

    it('should return false if email does not exist', async () => {
      mockPrismaClient.user.count.mockResolvedValue(0);

      const result = await repository.emailExists('new@example.com');

      expect(result).toBe(false);
    });
  });

  describe('updatePassword', () => {
    it('should update user password', async () => {
      mockPrismaClient.user.update.mockResolvedValue({ id: 'u1' });

      await repository.updatePassword('u1', 'new-hashed-password');

      expect(mockPrismaClient.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { password: 'new-hashed-password' },
      });
    });
  });

  describe('verifyEmail', () => {
    it('should verify user email and set status to active', async () => {
      mockPrismaClient.user.update.mockResolvedValue({ id: 'u1', emailVerified: true, status: 'active' });

      await repository.verifyEmail('u1');

      expect(mockPrismaClient.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { emailVerified: true, status: 'active' },
      });
    });
  });
});
