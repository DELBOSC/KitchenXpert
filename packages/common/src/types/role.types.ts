/**
 * Types pour les rôles utilisateurs
 */

import { BaseEntity, ID } from './base.types';
import { PermissionGrant, ResourceType, PermissionAction } from './permission.types';

export type RoleType = 'system' | 'custom';
export type RoleScope = 'global' | 'partner' | 'project';

export interface Role extends BaseEntity {
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
}

export interface RoleHierarchy {
  roleId: ID;
  parentRoleId: ID;
  inheritedPermissions: boolean;
}

export interface RoleAssignment extends BaseEntity {
  userId: ID;
  roleId: ID;
  scope: RoleScope;
  scopeId?: ID | null;
  assignedBy: ID;
  expiresAt?: Date | null;
  isActive: boolean;
}

export interface SystemRoles {
  SUPER_ADMIN: 'super_admin';
  ADMIN: 'admin';
  USER: 'user';
  PARTNER_ADMIN: 'partner_admin';
  PARTNER_MANAGER: 'partner_manager';
  PARTNER_EDITOR: 'partner_editor';
  PARTNER_VIEWER: 'partner_viewer';
  DESIGNER: 'designer';
  GUEST: 'guest';
}

export const SYSTEM_ROLE_CODES: Record<keyof SystemRoles, string> = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  USER: 'user',
  PARTNER_ADMIN: 'partner_admin',
  PARTNER_MANAGER: 'partner_manager',
  PARTNER_EDITOR: 'partner_editor',
  PARTNER_VIEWER: 'partner_viewer',
  DESIGNER: 'designer',
  GUEST: 'guest',
};

export interface RolePermissionMatrix {
  roleCode: string;
  permissions: Array<{
    resource: ResourceType;
    actions: PermissionAction[];
  }>;
}

export interface CreateRoleRequest {
  name: string;
  code: string;
  description: string;
  scope: RoleScope;
  scopeId?: ID;
  permissions: Array<{
    permissionId: ID;
    conditions?: Record<string, unknown>;
  }>;
  parentRoleId?: ID;
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  permissions?: Array<{
    permissionId: ID;
    conditions?: Record<string, unknown>;
  }>;
  parentRoleId?: ID | null;
  isActive?: boolean;
}

export interface RoleStats {
  roleId: ID;
  userCount: number;
  permissionCount: number;
  lastAssignedAt?: Date;
  createdAt: Date;
}

export interface RoleComparisonResult {
  role1: ID;
  role2: ID;
  commonPermissions: string[];
  uniqueToRole1: string[];
  uniqueToRole2: string[];
  effectiveDifferences: Array<{
    resource: ResourceType;
    role1Actions: PermissionAction[];
    role2Actions: PermissionAction[];
  }>;
}

export interface BulkRoleAssignment {
  userIds: ID[];
  roleId: ID;
  scope: RoleScope;
  scopeId?: ID;
  expiresAt?: Date;
}

export interface RoleTemplate {
  id: ID;
  name: string;
  description: string;
  baseRole: string;
  additionalPermissions: Array<{
    resource: ResourceType;
    actions: PermissionAction[];
  }>;
  removedPermissions: Array<{
    resource: ResourceType;
    actions: PermissionAction[];
  }>;
}
