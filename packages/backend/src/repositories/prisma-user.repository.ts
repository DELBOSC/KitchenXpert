import { PrismaClient, User as PrismaUser, UserStatus, Prisma } from '@prisma/client';
import { User } from '@kitchenxpert/common';
import { IUserRepository } from '../auth/auth.service';

/**
 * Prisma User Repository
 *
 * Implements the IUserRepository interface using Prisma ORM.
 * This class handles all user data operations through the database.
 */
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Transform a Prisma User to the application User type
   */
  private toUser(prismaUser: PrismaUser): User {
    return {
      id: prismaUser.id,
      email: prismaUser.email,
      firstName: prismaUser.firstName,
      lastName: prismaUser.lastName,
      role: prismaUser.role as User['role'],
      status: prismaUser.status as User['status'],
      avatar: prismaUser.avatar,
      phone: prismaUser.phone,
      language: prismaUser.language,
      timezone: prismaUser.timezone,
      emailVerified: prismaUser.emailVerified,
      lastLoginAt: prismaUser.lastLoginAt,
      createdAt: prismaUser.createdAt,
      updatedAt: prismaUser.updatedAt,
    };
  }

  /**
   * Find a user by email address
   * Returns user with password hash for authentication
   */
  async findByEmail(email: string): Promise<(User & { password: string }) | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return null;
    }

    return {
      ...this.toUser(user),
      password: user.password,
    };
  }

  /**
   * Find a user by ID
   */
  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return null;
    }

    return this.toUser(user);
  }

  /**
   * Create a new user
   */
  async create(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: string;
    status: string;
    emailVerified: boolean;
    language: string;
    timezone: string;
  }): Promise<User> {
    const user = await this.prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        status: data.status as any,
        emailVerified: data.emailVerified,
        language: data.language,
        timezone: data.timezone,
      },
    });

    return this.toUser(user);
  }

  /**
   * Update user's last login timestamp
   */
  async updateLastLogin(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  /**
   * Check if an email is already registered
   */
  async emailExists(email: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { email: email.toLowerCase() },
    });

    return count > 0;
  }

  /**
   * Update user password
   * Useful for password reset and change password flows
   */
  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }

  /**
   * Update user email verification status
   */
  async verifyEmail(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
        status: 'active',
      },
    });
  }

  /**
   * Update user status
   */
  async updateStatus(userId: string, status: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { status: status as any },
    });
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    data: Partial<{
      firstName: string;
      lastName: string;
      avatar: string | null;
      phone: string | null;
      language: string;
      timezone: string;
    }>
  ): Promise<User> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
    });

    return this.toUser(user);
  }

  /**
   * Delete user (soft delete by updating status)
   */
  async softDelete(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { status: 'suspended' as any },
    });
  }

  /**
   * Permanently delete user
   * Use with caution - this is irreversible
   */
  async hardDelete(userId: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id: userId },
    });
  }

  /**
   * Find users by status
   */
  async findByStatus(status: string): Promise<User[]> {
    const users = await this.prisma.user.findMany({
      where: { status: status as UserStatus },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user: PrismaUser) => this.toUser(user));
  }

  /**
   * Find users by role
   */
  async findByRole(role: string): Promise<User[]> {
    const users = await this.prisma.user.findMany({
      where: { role },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user: PrismaUser) => this.toUser(user));
  }

  /**
   * Get total user count
   */
  async count(): Promise<number> {
    return this.prisma.user.count();
  }

  /**
   * Get paginated users
   */
  async findPaginated(params: {
    page: number;
    limit: number;
    status?: string;
    role?: string;
  }): Promise<{ users: User[]; total: number }> {
    const where: Prisma.UserWhereInput = {};

    if (params.status) {
      where.status = params.status as UserStatus;
    }

    if (params.role) {
      where.role = params.role;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users: users.map((user: PrismaUser) => this.toUser(user)),
      total,
    };
  }
}

export default PrismaUserRepository;
