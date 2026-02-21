import { PrismaClient, Role, Permission, RolePermission, UserRole } from '@prisma/client';

/**
 * Role Repository
 *
 * Handles all role and permission assignment database operations using Prisma ORM.
 */

export interface RoleWithPermissions extends Role {
  rolePermissions?: (RolePermission & { permission: Permission })[];
  _count?: { userRoles: number };
}

export interface CreateRoleDto {
  name: string;
  description?: string;
  isSystem?: boolean;
  permissionIds?: string[];
}

export interface UpdateRoleDto {
  name?: string;
  description?: string;
  permissionIds?: string[];
}

export class RoleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Find a role by ID
   */
  async findById(id: string): Promise<RoleWithPermissions | null> {
    return this.prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: { include: { permission: true } },
        _count: { select: { userRoles: true } }
      }
    });
  }

  /**
   * Find a role by name
   */
  async findByName(name: string): Promise<Role | null> {
    return this.prisma.role.findUnique({
      where: { name },
      include: { rolePermissions: { include: { permission: true } } }
    });
  }

  /**
   * Find all roles
   */
  async findAll(): Promise<RoleWithPermissions[]> {
    return this.prisma.role.findMany({
      include: {
        rolePermissions: { include: { permission: true } },
        _count: { select: { userRoles: true } }
      },
      orderBy: { name: 'asc' }
    });
  }

  /**
   * Create a new role
   */
  async create(data: CreateRoleDto): Promise<Role> {
    return this.prisma.$transaction(async (tx) => {
      const role = await tx.role.create({
        data: {
          name: data.name,
          description: data.description,
          isSystem: data.isSystem || false,
        }
      });

      if (data.permissionIds && data.permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: data.permissionIds.map(permissionId => ({
            roleId: role.id,
            permissionId
          }))
        });
      }

      return role;
    });
  }

  /**
   * Update a role
   */
  async update(id: string, data: UpdateRoleDto): Promise<Role> {
    const role = await this.findById(id);
    if (!role) throw new Error('Role not found');
    if (role.isSystem) throw new Error('Cannot modify system role');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.role.update({
        where: { id },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.description !== undefined && { description: data.description }),
        }
      });

      if (data.permissionIds !== undefined) {
        await tx.rolePermission.deleteMany({ where: { roleId: id } });
        if (data.permissionIds.length > 0) {
          await tx.rolePermission.createMany({
            data: data.permissionIds.map(permissionId => ({
              roleId: id,
              permissionId
            }))
          });
        }
      }

      return updated;
    });
  }

  /**
   * Delete a role
   */
  async delete(id: string): Promise<Role> {
    const role = await this.findById(id);
    if (!role) throw new Error('Role not found');
    if (role.isSystem) throw new Error('Cannot delete system role');
    if (role._count && role._count.userRoles > 0) {
      throw new Error('Cannot delete role with assigned users');
    }

    return this.prisma.role.delete({ where: { id } });
  }

  /**
   * Count roles
   */
  async count(): Promise<number> {
    return this.prisma.role.count();
  }

  // ==================== ROLE PERMISSIONS ====================

  /**
   * Add permission to role
   */
  async addPermission(roleId: string, permissionId: string): Promise<RolePermission> {
    return this.prisma.rolePermission.create({
      data: { roleId, permissionId }
    });
  }

  /**
   * Remove permission from role
   */
  async removePermission(roleId: string, permissionId: string): Promise<RolePermission> {
    return this.prisma.rolePermission.delete({
      where: { roleId_permissionId: { roleId, permissionId } }
    });
  }

  /**
   * Get permissions for a role
   */
  async getPermissions(roleId: string): Promise<Permission[]> {
    const rolePerms = await this.prisma.rolePermission.findMany({
      where: { roleId },
      include: { permission: true }
    });
    return rolePerms.map(rp => rp.permission);
  }

  /**
   * Set all permissions for a role (replace existing)
   */
  async setPermissions(roleId: string, permissionIds: string[]): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId } }),
      this.prisma.rolePermission.createMany({
        data: permissionIds.map(permissionId => ({ roleId, permissionId }))
      })
    ]);
  }

  // ==================== USER ROLES ====================

  /**
   * Assign role to user
   */
  async assignToUser(userId: string, roleId: string): Promise<UserRole> {
    return this.prisma.userRole.create({
      data: { userId, roleId }
    });
  }

  /**
   * Remove role from user
   */
  async removeFromUser(userId: string, roleId: string): Promise<UserRole> {
    return this.prisma.userRole.delete({
      where: { userId_roleId: { userId, roleId } }
    });
  }

  /**
   * Get roles for a user
   */
  async getUserRoles(userId: string): Promise<Role[]> {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: { include: { rolePermissions: { include: { permission: true } } } } }
    });
    return userRoles.map(ur => ur.role);
  }

  /**
   * Get users with a specific role
   */
  async getUsersWithRole(roleId: string): Promise<string[]> {
    const userRoles = await this.prisma.userRole.findMany({
      where: { roleId },
      select: { userId: true }
    });
    return userRoles.map(ur => ur.userId);
  }

  /**
   * Check if user has role
   */
  async userHasRole(userId: string, roleName: string): Promise<boolean> {
    const count = await this.prisma.userRole.count({
      where: {
        userId,
        role: { name: roleName }
      }
    });
    return count > 0;
  }

  /**
   * Get all permissions for a user (through their roles)
   */
  async getUserPermissions(userId: string): Promise<Permission[]> {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            rolePermissions: { include: { permission: true } }
          }
        }
      }
    });

    const permissions = new Map<string, Permission>();
    userRoles.forEach(ur => {
      ur.role.rolePermissions.forEach(rp => {
        permissions.set(rp.permission.id, rp.permission);
      });
    });

    return Array.from(permissions.values());
  }
}

export default RoleRepository;
