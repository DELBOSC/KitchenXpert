/**
 * Interfaces pour la gestion des rôles
 */

import { ID } from '../types/base.types';
import {
  Role,
  RoleAssignment,
  RoleScope,
  RoleStats,
  BulkRoleAssignment,
} from '../types/role.types';
import { PermissionGrant } from '../types/permission.types';

/**
 * Interface principale pour le service de rôles
 */
export interface IRoleService {
  getRole(id: ID): Promise<Role | null>;
  getRoleByCode(code: string): Promise<Role | null>;
  getAllRoles(): Promise<Role[]>;
  createRole(role: CreateRoleParams): Promise<Role>;
  updateRole(id: ID, updates: UpdateRoleParams): Promise<Role>;
  deleteRole(id: ID): Promise<void>;
}

export interface CreateRoleParams {
  name: string;
  code: string;
  description: string;
  scope: RoleScope;
  scopeId?: ID;
  permissions: PermissionGrant[];
  parentRoleId?: ID;
  isDefault?: boolean;
}

export interface UpdateRoleParams {
  name?: string;
  description?: string;
  permissions?: PermissionGrant[];
  parentRoleId?: ID | null;
  isDefault?: boolean;
}

/**
 * Interface pour l'assignation de rôles
 */
export interface IRoleAssignmentService {
  assignRole(userId: ID, roleId: ID, options?: AssignmentOptions): Promise<RoleAssignment>;
  revokeRole(userId: ID, roleId: ID, scopeId?: ID): Promise<void>;
  getUserRoles(userId: ID): Promise<RoleAssignment[]>;
  getRoleUsers(roleId: ID): Promise<RoleAssignment[]>;
  bulkAssign(assignment: BulkRoleAssignment): Promise<BulkAssignmentResult>;
}

export interface AssignmentOptions {
  scope?: RoleScope;
  scopeId?: ID;
  expiresAt?: Date;
  assignedBy?: ID;
}

export interface BulkAssignmentResult {
  success: boolean;
  assigned: ID[];
  failed: Array<{
    userId: ID;
    error: string;
  }>;
}

/**
 * Interface pour la hiérarchie des rôles
 */
export interface IRoleHierarchy {
  getParentRoles(roleId: ID): Promise<Role[]>;
  getChildRoles(roleId: ID): Promise<Role[]>;
  getEffectivePermissions(roleId: ID): Promise<PermissionGrant[]>;
  isRoleAbove(roleId: ID, otherRoleId: ID): Promise<boolean>;
}

/**
 * Interface pour les statistiques de rôles
 */
export interface IRoleStats {
  getRoleStats(roleId: ID): Promise<RoleStats>;
  getAllStats(): Promise<RoleStats[]>;
  getMostUsedRoles(limit?: number): Promise<Array<RoleStats & { role: Role }>>;
}

/**
 * Interface pour la validation des rôles
 */
export interface IRoleValidator {
  validateAssignment(userId: ID, roleId: ID, assignedBy: ID): Promise<RoleValidationResult>;
  validatePermissions(roleId: ID, permissions: PermissionGrant[]): Promise<RoleValidationResult>;
  validateHierarchy(roleId: ID, parentRoleId: ID): Promise<RoleValidationResult>;
}

/**
 * Résultat de validation spécifique aux rôles
 * (distinct de ValidationResult dans catalog.interface qui est pour l'import)
 */
export interface RoleValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Interface pour le cache des rôles
 */
export interface IRoleCache {
  getRole(id: ID): Promise<Role | null>;
  getUserRoles(userId: ID): Promise<RoleAssignment[] | null>;
  setRole(role: Role, ttl?: number): Promise<void>;
  setUserRoles(userId: ID, roles: RoleAssignment[], ttl?: number): Promise<void>;
  invalidateRole(id: ID): Promise<void>;
  invalidateUserRoles(userId: ID): Promise<void>;
  invalidateAll(): Promise<void>;
}
