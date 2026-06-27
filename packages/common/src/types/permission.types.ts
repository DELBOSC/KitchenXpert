/**
 * Types pour le système de permissions RBAC
 */

import { BaseEntity, ID } from './base.types';

export type PermissionAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'manage'
  | 'export'
  | 'import';

export type ResourceType =
  | 'user'
  | 'kitchen_project'
  | 'product'
  | 'catalog'
  | 'order'
  | 'partner'
  | 'analytics'
  | 'settings'
  | 'webhook'
  | 'api_key'
  | 'file'
  | 'audit_log';

export interface Permission extends BaseEntity {
  name: string;
  code: string;
  description: string;
  resource: ResourceType;
  actions: PermissionAction[];
  conditions?: PermissionCondition[];
  isSystem: boolean;
}

export interface PermissionCondition {
  field: string;
  operator: 'eq' | 'neq' | 'in' | 'nin' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains';
  value: unknown;
}

export interface PermissionGrant {
  permissionId: ID;
  permissionCode: string;
  grantedAt: Date;
  grantedBy?: ID;
  expiresAt?: Date | null;
  conditions?: PermissionCondition[];
}

export interface PermissionCheck {
  resource: ResourceType;
  action: PermissionAction;
  resourceId?: ID;
  context?: Record<string, unknown>;
}

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  matchedPermission?: string;
  conditions?: PermissionCondition[];
}

export interface PermissionSet {
  userId?: ID;
  roleId?: ID;
  permissions: PermissionGrant[];
  effectivePermissions: ComputedPermission[];
}

export interface ComputedPermission {
  resource: ResourceType;
  actions: PermissionAction[];
  conditions?: PermissionCondition[];
  source: 'role' | 'user' | 'inherited';
  sourceId: ID;
}

export interface PermissionTemplate {
  id: ID;
  name: string;
  description: string;
  permissions: Array<{
    resource: ResourceType;
    actions: PermissionAction[];
  }>;
  isDefault: boolean;
}

export interface BulkPermissionUpdate {
  targetType: 'user' | 'role';
  targetId: ID;
  add?: Array<{
    permissionId: ID;
    conditions?: PermissionCondition[];
    expiresAt?: Date;
  }>;
  remove?: ID[];
}

export interface PermissionAuditEntry {
  id: ID;
  action: 'granted' | 'revoked' | 'modified';
  targetType: 'user' | 'role';
  targetId: ID;
  permissionId: ID;
  performedBy: ID;
  previousState?: PermissionGrant;
  newState?: PermissionGrant;
  reason?: string;
  timestamp: Date;
}

export interface AccessControlList {
  resourceType: ResourceType;
  resourceId: ID;
  entries: ACLEntry[];
}

export interface ACLEntry {
  principalType: 'user' | 'role' | 'group';
  principalId: ID;
  permissions: PermissionAction[];
  inherited: boolean;
  inheritedFrom?: ID;
}
