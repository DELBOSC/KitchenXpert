/**
 * Interfaces pour le système de permissions
 */

import { ID } from '../types/base.types';
import {
  Permission,
  PermissionCheck,
  PermissionCheckResult,
  PermissionSet,
  PermissionAction,
  ResourceType,
  PermissionCondition,
} from '../types/permission.types';

/**
 * Interface principale pour le service de permissions
 */
export interface IPermissionService {
  check(userId: ID, check: PermissionCheck): Promise<PermissionCheckResult>;
  checkMany(userId: ID, checks: PermissionCheck[]): Promise<PermissionCheckResult[]>;
  getUserPermissions(userId: ID): Promise<PermissionSet>;
  grantPermission(userId: ID, permissionId: ID, options?: GrantOptions): Promise<void>;
  revokePermission(userId: ID, permissionId: ID): Promise<void>;
}

export interface GrantOptions {
  conditions?: PermissionCondition[];
  expiresAt?: Date;
  grantedBy?: ID;
}

/**
 * Interface pour le gestionnaire de permissions
 */
export interface IPermissionManager {
  getPermission(id: ID): Promise<Permission | null>;
  getPermissionByCode(code: string): Promise<Permission | null>;
  getAllPermissions(): Promise<Permission[]>;
  getPermissionsByResource(resource: ResourceType): Promise<Permission[]>;
  createPermission(permission: CreatePermissionParams): Promise<Permission>;
  updatePermission(id: ID, updates: Partial<Permission>): Promise<Permission>;
  deletePermission(id: ID): Promise<void>;
}

export interface CreatePermissionParams {
  name: string;
  code: string;
  description: string;
  resource: ResourceType;
  actions: PermissionAction[];
  conditions?: PermissionCondition[];
}

/**
 * Interface pour l'évaluation des permissions
 */
export interface IPermissionEvaluator {
  evaluate(userPermissions: PermissionSet, check: PermissionCheck): PermissionCheckResult;
  evaluateConditions(conditions: PermissionCondition[], context: Record<string, unknown>): boolean;
}

/**
 * Interface pour le cache des permissions
 */
export interface IPermissionCache {
  get(userId: ID): Promise<PermissionSet | null>;
  set(userId: ID, permissions: PermissionSet, ttl?: number): Promise<void>;
  invalidate(userId: ID): Promise<void>;
  invalidateAll(): Promise<void>;
}

/**
 * Interface pour les politiques de permissions
 */
export interface IPermissionPolicy {
  name: string;
  evaluate(context: PolicyContext): Promise<PolicyResult>;
}

export interface PolicyContext {
  userId: ID;
  resource: ResourceType;
  resourceId?: ID;
  action: PermissionAction;
  attributes?: Record<string, unknown>;
}

export interface PolicyResult {
  allowed: boolean;
  reason?: string;
  conditions?: PermissionCondition[];
}

/**
 * Interface pour l'audit des permissions
 */
export interface IPermissionAuditor {
  logGrant(userId: ID, permissionId: ID, grantedBy: ID): Promise<void>;
  logRevoke(userId: ID, permissionId: ID, revokedBy: ID): Promise<void>;
  logCheck(userId: ID, check: PermissionCheck, result: PermissionCheckResult): Promise<void>;
  getAuditLog(
    userId: ID,
    options?: PermissionAuditLogOptions
  ): Promise<PermissionCheckAuditEntry[]>;
}

export interface PermissionAuditLogOptions {
  startDate?: Date;
  endDate?: Date;
  action?: 'grant' | 'revoke' | 'check';
  limit?: number;
}

/**
 * Entrée d'audit pour les vérifications de permissions
 * (distinct de PermissionAuditEntry dans types qui trace les modifications de permissions)
 */
export interface PermissionCheckAuditEntry {
  id: ID;
  userId: ID;
  action: 'grant' | 'revoke' | 'check';
  permissionId?: ID;
  check?: PermissionCheck;
  result?: PermissionCheckResult;
  performedBy?: ID;
  timestamp: Date;
}
