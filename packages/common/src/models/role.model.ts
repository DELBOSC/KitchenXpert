/**
 * Role Model Class
 * Provides methods for working with role data
 */

import {
  Role,
  RoleType,
  RoleScope,
  RoleComparisonResult,
  PermissionGrant,
  PermissionAction,
  ResourceType,
  SYSTEM_ROLE_CODES,
  ID,
} from '../types';

// Re-export types that may be used externally
export type { RoleAssignment, RoleHierarchy, RoleStats, RoleTemplate } from '../types';

export interface RoleCreateInput {
  name: string;
  code: string;
  description: string;
  type?: RoleType;
  scope: RoleScope;
  scopeId?: ID | null;
  permissions?: PermissionGrant[];
  parentRoleId?: ID | null;
  isDefault?: boolean;
  priority?: number;
}

export interface RoleUpdateInput {
  name?: string;
  description?: string;
  permissions?: PermissionGrant[];
  parentRoleId?: ID | null;
  isDefault?: boolean;
  priority?: number;
}

export class RoleModel implements Role {
  id: ID;
  name: string;
  code: string;
  description: string;
  type: RoleType;
  scope: RoleScope;
  scopeId?: ID | null;
  permissions: PermissionGrant[];
  parentRoleId?: ID | null;
  isDefault: boolean;
  priority: number;
  metadata?: Record<string, unknown>;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string | null;

  constructor(data: Role) {
    this.id = data.id;
    this.name = data.name;
    this.code = data.code;
    this.description = data.description;
    this.type = data.type;
    this.scope = data.scope;
    this.scopeId = data.scopeId;
    this.permissions = data.permissions || [];
    this.parentRoleId = data.parentRoleId;
    this.isDefault = data.isDefault;
    this.priority = data.priority;
    this.metadata = data.metadata;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.deletedAt = data.deletedAt;
  }

  /**
   * Check if this is a system role
   */
  isSystemRole(): boolean {
    return this.type === 'system';
  }

  /**
   * Check if this is a custom role
   */
  isCustomRole(): boolean {
    return this.type === 'custom';
  }

  /**
   * Check if this is a global role
   */
  isGlobalRole(): boolean {
    return this.scope === 'global';
  }

  /**
   * Check if this is a partner-scoped role
   */
  isPartnerRole(): boolean {
    return this.scope === 'partner';
  }

  /**
   * Check if this is a project-scoped role
   */
  isProjectRole(): boolean {
    return this.scope === 'project';
  }

  /**
   * Check if this role has a parent role
   */
  hasParentRole(): boolean {
    return !!this.parentRoleId;
  }

  /**
   * Check if this is a default role
   */
  isDefaultRole(): boolean {
    return this.isDefault;
  }

  /**
   * Check if the role is the super admin role
   */
  isSuperAdmin(): boolean {
    return this.code === SYSTEM_ROLE_CODES.SUPER_ADMIN;
  }

  /**
   * Check if the role is an admin role
   */
  isAdmin(): boolean {
    return this.code === SYSTEM_ROLE_CODES.ADMIN || this.isSuperAdmin();
  }

  /**
   * Get the number of permissions
   */
  getPermissionCount(): number {
    return this.permissions.length;
  }

  /**
   * Check if the role has a specific permission
   */
  hasPermission(permissionCode: string): boolean {
    return this.permissions.some((p) => p.permissionCode === permissionCode);
  }

  /**
   * Check if the role has permission for a resource and action
   */
  hasPermissionFor(resource: ResourceType, action: PermissionAction): boolean {
    // Super admin has all permissions
    if (this.isSuperAdmin()) return true;

    // Check for manage permission on the resource
    const manageCode = `${resource}:manage`;
    if (this.hasPermission(manageCode)) return true;

    // Check for specific permission
    const specificCode = `${resource}:${action}`;
    return this.hasPermission(specificCode);
  }

  /**
   * Add a permission to the role
   */
  addPermission(grant: PermissionGrant): void {
    if (!this.hasPermission(grant.permissionCode)) {
      this.permissions.push(grant);
    }
  }

  /**
   * Remove a permission from the role
   */
  removePermission(permissionId: ID): boolean {
    const index = this.permissions.findIndex((p) => p.permissionId === permissionId);
    if (index !== -1) {
      this.permissions.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get permissions grouped by resource
   */
  getPermissionsByResource(): Map<ResourceType, PermissionGrant[]> {
    const grouped = new Map<ResourceType, PermissionGrant[]>();

    for (const permission of this.permissions) {
      const resource = permission.permissionCode.split(':')[0] as ResourceType;
      const existing = grouped.get(resource) || [];
      existing.push(permission);
      grouped.set(resource, existing);
    }

    return grouped;
  }

  /**
   * Check if the role can be edited
   */
  canBeEdited(): boolean {
    // System roles cannot be edited
    return !this.isSystemRole();
  }

  /**
   * Check if the role can be deleted
   */
  canBeDeleted(): boolean {
    // System roles and default roles cannot be deleted
    return !this.isSystemRole() && !this.isDefault;
  }

  /**
   * Convert to plain object
   */
  toJSON(): Role {
    return {
      id: this.id,
      name: this.name,
      code: this.code,
      description: this.description,
      type: this.type,
      scope: this.scope,
      scopeId: this.scopeId,
      permissions: this.permissions,
      parentRoleId: this.parentRoleId,
      isDefault: this.isDefault,
      priority: this.priority,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt,
    };
  }

  /**
   * Compare two roles and return the differences
   */
  static compare(role1: RoleModel, role2: RoleModel): RoleComparisonResult {
    const role1Codes = new Set(role1.permissions.map((p) => p.permissionCode));
    const role2Codes = new Set(role2.permissions.map((p) => p.permissionCode));

    const commonPermissions: string[] = [];
    const uniqueToRole1: string[] = [];
    const uniqueToRole2: string[] = [];

    for (const code of role1Codes) {
      if (role2Codes.has(code)) {
        commonPermissions.push(code);
      } else {
        uniqueToRole1.push(code);
      }
    }

    for (const code of role2Codes) {
      if (!role1Codes.has(code)) {
        uniqueToRole2.push(code);
      }
    }

    return {
      role1: role1.id,
      role2: role2.id,
      commonPermissions,
      uniqueToRole1,
      uniqueToRole2,
      effectiveDifferences: [],
    };
  }

  /**
   * Generate a role code from name
   */
  static generateCode(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  /**
   * Create a new RoleModel from input data
   */
  static create(input: RoleCreateInput, id: ID): RoleModel {
    const now = new Date();
    return new RoleModel({
      id,
      name: input.name,
      code: input.code,
      description: input.description,
      type: input.type || 'custom',
      scope: input.scope,
      scopeId: input.scopeId,
      permissions: input.permissions || [],
      parentRoleId: input.parentRoleId,
      isDefault: input.isDefault || false,
      priority: input.priority || 0,
      createdAt: now,
      updatedAt: now,
    });
  }
}

export default RoleModel;
