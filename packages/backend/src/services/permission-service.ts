/**
 * Permission Service
 * Handles role-based access control (RBAC) and permission management
 */

export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: PermissionAction;
  conditions?: PermissionCondition[];
  isSystem: boolean;
  createdAt: Date;
}

export type PermissionAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'list'
  | 'export'
  | 'import'
  | 'share'
  | 'manage'
  | 'ai_configure'
  | '*';

export interface PermissionCondition {
  field: string;
  operator: ConditionOperator;
  value: unknown;
}

export type ConditionOperator =
  | 'eq'
  | 'ne'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'nin'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'regex'
  | 'exists';

export interface Role {
  id: string;
  name: string;
  slug: string;
  description: string;
  permissions: string[];
  inheritsFrom?: string[];
  isSystem: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPermissions {
  userId: string;
  roles: string[];
  directPermissions: string[];
  deniedPermissions: string[];
  resourcePermissions: ResourcePermission[];
}

export interface ResourcePermission {
  resourceType: string;
  resourceId: string;
  permissions: string[];
  grantedBy: string;
  grantedAt: Date;
  expiresAt?: Date;
}

export interface PermissionCheck {
  allowed: boolean;
  reason?: string;
  matchedPermission?: string;
  conditions?: PermissionCondition[];
}

export interface PermissionRepository {
  findPermissionById(id: string): Promise<Permission | null>;
  findPermissionByName(name: string): Promise<Permission | null>;
  getAllPermissions(): Promise<Permission[]>;
  getPermissionsByResource(resource: string): Promise<Permission[]>;
  createPermission(data: Omit<Permission, 'id' | 'createdAt'>): Promise<Permission>;
  updatePermission(id: string, data: Partial<Permission>): Promise<Permission | null>;
  deletePermission(id: string): Promise<boolean>;

  findRoleById(id: string): Promise<Role | null>;
  findRoleBySlug(slug: string): Promise<Role | null>;
  getAllRoles(): Promise<Role[]>;
  createRole(data: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>): Promise<Role>;
  updateRole(id: string, data: Partial<Role>): Promise<Role | null>;
  deleteRole(id: string): Promise<boolean>;

  getUserPermissions(userId: string): Promise<UserPermissions | null>;
  saveUserPermissions(permissions: UserPermissions): Promise<UserPermissions>;
  assignRoleToUser(userId: string, roleId: string): Promise<boolean>;
  removeRoleFromUser(userId: string, roleId: string): Promise<boolean>;
  grantResourcePermission(permission: ResourcePermission & { userId: string }): Promise<boolean>;
  revokeResourcePermission(
    userId: string,
    resourceType: string,
    resourceId: string
  ): Promise<boolean>;
}

export class PermissionService {
  private permissionCache: Map<string, Permission> = new Map();
  private roleCache: Map<string, Role> = new Map();
  private cacheTimestamps: Map<string, number> = new Map();
  private CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private isCacheValid(key: string): boolean {
    const ts = this.cacheTimestamps.get(key);
    return ts ? Date.now() - ts < this.CACHE_TTL : false;
  }

  constructor(private repository: PermissionRepository) {}

  async checkPermission(
    userId: string,
    resource: string,
    action: PermissionAction,
    context?: Record<string, unknown>
  ): Promise<PermissionCheck> {
    const userPermissions = await this.repository.getUserPermissions(userId);
    if (!userPermissions) {
      return { allowed: false, reason: 'User has no permissions configured' };
    }

    const deniedCheck = await this.checkDeniedPermissions(
      userPermissions.deniedPermissions,
      resource,
      action
    );
    if (deniedCheck) {
      return {
        allowed: false,
        reason: 'Permission explicitly denied',
        matchedPermission: deniedCheck,
      };
    }

    const directCheck = await this.checkPermissionList(
      userPermissions.directPermissions,
      resource,
      action,
      context
    );
    if (directCheck.allowed) {
      return directCheck;
    }

    const allPermissions = await this.getEffectiveRolePermissions(userPermissions.roles);
    const roleCheck = await this.checkPermissionList(allPermissions, resource, action, context);
    if (roleCheck.allowed) {
      return roleCheck;
    }

    if (context?.resourceId) {
      const resourceCheck = this.checkResourcePermissions(
        userPermissions.resourcePermissions,
        resource,
        String(context.resourceId),
        action
      );
      if (resourceCheck.allowed) {
        return resourceCheck;
      }
    }

    return { allowed: false, reason: 'No matching permission found' };
  }

  async checkAnyPermission(
    userId: string,
    checks: Array<{ resource: string; action: PermissionAction }>
  ): Promise<boolean> {
    for (const check of checks) {
      const result = await this.checkPermission(userId, check.resource, check.action);
      if (result.allowed) {
        return true;
      }
    }
    return false;
  }

  async checkAllPermissions(
    userId: string,
    checks: Array<{ resource: string; action: PermissionAction }>
  ): Promise<boolean> {
    for (const check of checks) {
      const result = await this.checkPermission(userId, check.resource, check.action);
      if (!result.allowed) {
        return false;
      }
    }
    return true;
  }

  async getUserEffectivePermissions(userId: string): Promise<Permission[]> {
    const userPermissions = await this.repository.getUserPermissions(userId);
    if (!userPermissions) {
      return [];
    }

    const permissionIds = new Set<string>();
    userPermissions.directPermissions.forEach((id) => permissionIds.add(id));

    const rolePermissions = await this.getEffectiveRolePermissions(userPermissions.roles);
    rolePermissions.forEach((id) => permissionIds.add(id));
    userPermissions.deniedPermissions.forEach((id) => permissionIds.delete(id));

    const permissions: Permission[] = [];
    for (const id of permissionIds) {
      const permission = await this.getPermission(id);
      if (permission) {
        permissions.push(permission);
      }
    }

    return permissions;
  }

  async getPermission(id: string): Promise<Permission | null> {
    const cacheKey = `perm:${id}`;
    if (this.permissionCache.has(id) && this.isCacheValid(cacheKey)) {
      return this.permissionCache.get(id)!;
    }
    const permission = await this.repository.findPermissionById(id);
    if (permission) {
      this.permissionCache.set(id, permission);
      this.cacheTimestamps.set(cacheKey, Date.now());
    }
    return permission;
  }

  async getRole(id: string): Promise<Role | null> {
    const cacheKey = `role:${id}`;
    if (this.roleCache.has(id) && this.isCacheValid(cacheKey)) {
      return this.roleCache.get(id)!;
    }
    const role = await this.repository.findRoleById(id);
    if (role) {
      this.roleCache.set(id, role);
      this.cacheTimestamps.set(cacheKey, Date.now());
    }
    return role;
  }

  async getAllPermissions(): Promise<Permission[]> {
    return this.repository.getAllPermissions();
  }

  async getPermissionsByResource(resource: string): Promise<Permission[]> {
    return this.repository.getPermissionsByResource(resource);
  }

  async createPermission(data: Omit<Permission, 'id' | 'createdAt'>): Promise<Permission> {
    const existing = await this.repository.findPermissionByName(data.name);
    if (existing) {
      throw new PermissionServiceError(
        'PERMISSION_EXISTS',
        'A permission with this name already exists'
      );
    }
    return this.repository.createPermission(data);
  }

  async updatePermission(id: string, data: Partial<Permission>): Promise<Permission | null> {
    const permission = await this.repository.updatePermission(id, data);
    if (permission) {
      this.permissionCache.set(id, permission);
    }
    return permission;
  }

  async deletePermission(id: string): Promise<boolean> {
    const permission = await this.repository.findPermissionById(id);
    if (permission?.isSystem) {
      throw new PermissionServiceError('SYSTEM_PERMISSION', 'Cannot delete system permission');
    }
    this.permissionCache.delete(id);
    return this.repository.deletePermission(id);
  }

  async getAllRoles(): Promise<Role[]> {
    return this.repository.getAllRoles();
  }

  async getRoleBySlug(slug: string): Promise<Role | null> {
    return this.repository.findRoleBySlug(slug);
  }

  async createRole(data: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>): Promise<Role> {
    const existing = await this.repository.findRoleBySlug(data.slug);
    if (existing) {
      throw new PermissionServiceError('ROLE_EXISTS', 'A role with this slug already exists');
    }
    return this.repository.createRole(data);
  }

  async assignRoleToUser(userId: string, roleSlug: string): Promise<boolean> {
    const role = await this.repository.findRoleBySlug(roleSlug);
    if (!role) {
      throw new PermissionServiceError('ROLE_NOT_FOUND', 'Role not found');
    }
    return this.repository.assignRoleToUser(userId, role.id);
  }

  async removeRoleFromUser(userId: string, roleSlug: string): Promise<boolean> {
    const role = await this.repository.findRoleBySlug(roleSlug);
    if (!role) {
      throw new PermissionServiceError('ROLE_NOT_FOUND', 'Role not found');
    }
    return this.repository.removeRoleFromUser(userId, role.id);
  }

  async grantResourcePermission(
    userId: string,
    resourceType: string,
    resourceId: string,
    permissions: string[],
    options?: { expiresAt?: Date; grantedBy?: string }
  ): Promise<boolean> {
    return this.repository.grantResourcePermission({
      userId,
      resourceType,
      resourceId,
      permissions,
      grantedBy: options?.grantedBy || 'system',
      grantedAt: new Date(),
      expiresAt: options?.expiresAt,
    });
  }

  async getUserRoles(userId: string): Promise<Role[]> {
    const userPermissions = await this.repository.getUserPermissions(userId);
    if (!userPermissions) {
      return [];
    }

    const roles: Role[] = [];
    for (const roleId of userPermissions.roles) {
      const role = await this.getRole(roleId);
      if (role) {
        roles.push(role);
      }
    }
    return roles.sort((a, b) => b.priority - a.priority);
  }

  clearCache(): void {
    this.permissionCache.clear();
    this.roleCache.clear();
    this.cacheTimestamps.clear();
  }

  private async checkDeniedPermissions(
    deniedIds: string[],
    resource: string,
    action: PermissionAction
  ): Promise<string | null> {
    for (const id of deniedIds) {
      const permission = await this.getPermission(id);
      if (permission && this.matchesPermission(permission, resource, action)) {
        return id;
      }
    }
    return null;
  }

  private async checkPermissionList(
    permissionIds: string[],
    resource: string,
    action: PermissionAction,
    context?: Record<string, unknown>
  ): Promise<PermissionCheck> {
    for (const id of permissionIds) {
      const permission = await this.getPermission(id);
      if (!permission) {
        continue;
      }

      if (this.matchesPermission(permission, resource, action)) {
        if (permission.conditions && permission.conditions.length > 0) {
          if (this.evaluateConditions(permission.conditions, context)) {
            return { allowed: true, matchedPermission: id, conditions: permission.conditions };
          }
        } else {
          return { allowed: true, matchedPermission: id };
        }
      }
    }
    return { allowed: false };
  }

  private matchesPermission(
    permission: Permission,
    resource: string,
    action: PermissionAction
  ): boolean {
    const resourceMatch =
      permission.resource === '*' ||
      permission.resource === resource ||
      (permission.resource.endsWith('*') && resource.startsWith(permission.resource.slice(0, -1)));
    const actionMatch = permission.action === '*' || permission.action === action;
    return resourceMatch && actionMatch;
  }

  private evaluateConditions(
    conditions: PermissionCondition[],
    context?: Record<string, unknown>
  ): boolean {
    if (!context) {
      return false;
    }
    for (const condition of conditions) {
      const value = context[condition.field];
      if (!this.evaluateCondition(condition, value)) {
        return false;
      }
    }
    return true;
  }

  private evaluateCondition(condition: PermissionCondition, value: unknown): boolean {
    switch (condition.operator) {
      case 'eq':
        return value === condition.value;
      case 'ne':
        return value !== condition.value;
      case 'gt':
        return typeof value === 'number' && value > (condition.value as number);
      case 'gte':
        return typeof value === 'number' && value >= (condition.value as number);
      case 'lt':
        return typeof value === 'number' && value < (condition.value as number);
      case 'lte':
        return typeof value === 'number' && value <= (condition.value as number);
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(value);
      case 'nin':
        return Array.isArray(condition.value) && !condition.value.includes(value);
      case 'contains':
        return typeof value === 'string' && value.includes(condition.value as string);
      case 'startsWith':
        return typeof value === 'string' && value.startsWith(condition.value as string);
      case 'endsWith':
        return typeof value === 'string' && value.endsWith(condition.value as string);
      case 'regex':
        return typeof value === 'string' && new RegExp(condition.value as string).test(value);
      case 'exists':
        return condition.value ? value !== undefined : value === undefined;
      default:
        return false;
    }
  }

  private async getEffectiveRolePermissions(roleIds: string[]): Promise<string[]> {
    const allPermissions = new Set<string>();
    const processedRoles = new Set<string>();

    const processRole = async (roleId: string) => {
      if (processedRoles.has(roleId)) {
        return;
      }
      processedRoles.add(roleId);

      const role = await this.getRole(roleId);
      if (!role) {
        return;
      }

      role.permissions.forEach((p) => allPermissions.add(p));

      if (role.inheritsFrom) {
        for (const inheritedRoleId of role.inheritsFrom) {
          await processRole(inheritedRoleId);
        }
      }
    };

    for (const roleId of roleIds) {
      await processRole(roleId);
    }

    return Array.from(allPermissions);
  }

  private checkResourcePermissions(
    resourcePermissions: ResourcePermission[],
    resourceType: string,
    resourceId: string,
    action: PermissionAction
  ): PermissionCheck {
    for (const rp of resourcePermissions) {
      if (rp.resourceType !== resourceType || rp.resourceId !== resourceId) {
        continue;
      }
      if (rp.expiresAt && new Date() > rp.expiresAt) {
        continue;
      }

      const actionPermission = `${resourceType}:${action}`;
      if (
        rp.permissions.includes(actionPermission) ||
        rp.permissions.includes(`${resourceType}:*`)
      ) {
        return { allowed: true, reason: 'Resource-specific permission' };
      }
    }
    return { allowed: false };
  }
}

export class PermissionServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'PermissionServiceError';
  }
}

export function createPermissionService(repository: PermissionRepository): PermissionService {
  return new PermissionService(repository);
}

export default PermissionService;
