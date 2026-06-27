import { type PrismaClient, type Permission, type Prisma } from '@prisma/client';

/**
 * Permission Repository
 *
 * Handles all permission-related database operations using Prisma ORM.
 */

export interface CreatePermissionDto {
  name: string;
  resource: string;
  action: string;
  description?: string;
}

export interface UpdatePermissionDto {
  name?: string;
  description?: string;
}

export interface PermissionFilters {
  resource?: string;
  action?: string;
  search?: string;
}

export class PermissionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Find a permission by ID
   */
  async findById(id: string): Promise<Permission | null> {
    return this.prisma.permission.findUnique({
      where: { id },
    });
  }

  /**
   * Find a permission by name
   */
  async findByName(name: string): Promise<Permission | null> {
    return this.prisma.permission.findUnique({
      where: { name },
    });
  }

  /**
   * Find a permission by resource and action
   */
  async findByResourceAction(resource: string, action: string): Promise<Permission | null> {
    return this.prisma.permission.findUnique({
      where: { resource_action: { resource, action } },
    });
  }

  /**
   * Find all permissions with optional filters
   */
  async findAll(filters: PermissionFilters = {}): Promise<Permission[]> {
    const where: Prisma.PermissionWhereInput = {
      ...(filters.resource && { resource: filters.resource }),
      ...(filters.action && { action: filters.action }),
      ...(filters.search && {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
          { resource: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
    };

    return this.prisma.permission.findMany({
      where,
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });
  }

  /**
   * Find permissions by resource
   */
  async findByResource(resource: string): Promise<Permission[]> {
    return this.prisma.permission.findMany({
      where: { resource },
      orderBy: { action: 'asc' },
    });
  }

  /**
   * Get all unique resources
   */
  async getResources(): Promise<string[]> {
    const resources = await this.prisma.permission.findMany({
      select: { resource: true },
      distinct: ['resource'],
      orderBy: { resource: 'asc' },
    });
    return resources.map((r) => r.resource);
  }

  /**
   * Get all unique actions
   */
  async getActions(): Promise<string[]> {
    const actions = await this.prisma.permission.findMany({
      select: { action: true },
      distinct: ['action'],
      orderBy: { action: 'asc' },
    });
    return actions.map((a) => a.action);
  }

  /**
   * Create a new permission
   */
  async create(data: CreatePermissionDto): Promise<Permission> {
    return this.prisma.permission.create({
      data: {
        name: data.name,
        resource: data.resource,
        action: data.action,
        description: data.description,
      },
    });
  }

  /**
   * Create many permissions (bulk insert)
   */
  async createMany(permissions: CreatePermissionDto[]): Promise<{ count: number }> {
    return this.prisma.permission.createMany({
      data: permissions,
      skipDuplicates: true,
    });
  }

  /**
   * Update a permission
   */
  async update(id: string, data: UpdatePermissionDto): Promise<Permission> {
    return this.prisma.permission.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
      },
    });
  }

  /**
   * Delete a permission
   */
  async delete(id: string): Promise<Permission> {
    return this.prisma.permission.delete({
      where: { id },
    });
  }

  /**
   * Count permissions
   */
  async count(filters: PermissionFilters = {}): Promise<number> {
    return this.prisma.permission.count({
      where: {
        ...(filters.resource && { resource: filters.resource }),
        ...(filters.action && { action: filters.action }),
      },
    });
  }

  /**
   * Check if a permission exists
   */
  async exists(resource: string, action: string): Promise<boolean> {
    const count = await this.prisma.permission.count({
      where: { resource, action },
    });
    return count > 0;
  }

  /**
   * Get grouped permissions by resource
   */
  async getGroupedByResource(): Promise<Record<string, Permission[]>> {
    const permissions = await this.findAll();
    const grouped: Record<string, Permission[]> = {};

    permissions.forEach((permission) => {
      if (!grouped[permission.resource]) {
        grouped[permission.resource] = [];
      }
      grouped[permission.resource]!.push(permission);
    });

    return grouped;
  }

  /**
   * Seed default permissions for a resource
   */
  async seedResourcePermissions(
    resource: string,
    actions = ['create', 'read', 'update', 'delete']
  ): Promise<{ count: number }> {
    const permissions = actions.map((action) => ({
      name: `${resource}:${action}`,
      resource,
      action,
      description: `Permission to ${action} ${resource}`,
    }));

    return this.createMany(permissions);
  }

  /**
   * Seed all default permissions
   */
  async seedDefaults(): Promise<void> {
    const resources = [
      'user',
      'project',
      'kitchen',
      'product',
      'appliance',
      'material',
      'catalog',
      'order',
      'partner',
      'webhook',
      'audit',
      'role',
      'permission',
      'locale',
      'notification',
    ];

    for (const resource of resources) {
      await this.seedResourcePermissions(resource);
    }

    // Add special permissions
    await this.createMany([
      {
        name: 'admin:access',
        resource: 'admin',
        action: 'access',
        description: 'Access admin panel',
      },
      {
        name: 'analytics:view',
        resource: 'analytics',
        action: 'view',
        description: 'View analytics',
      },
      { name: 'export:data', resource: 'export', action: 'data', description: 'Export data' },
      { name: 'import:data', resource: 'import', action: 'data', description: 'Import data' },
    ]);
  }
}

export default PermissionRepository;
