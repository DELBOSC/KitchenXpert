/**
 * Permission Model Class
 * Provides methods for working with permission data
 */

import {
  Permission,
  PermissionAction,
  ResourceType,
  PermissionCondition,
  PermissionGrant,
  PermissionCheck,
  PermissionCheckResult,
  PermissionSet,
  ID,
} from '../types';

// Re-export types that may be used externally
export type { ComputedPermission, PermissionTemplate } from '../types';

export interface PermissionCreateInput {
  name: string;
  code: string;
  description: string;
  resource: ResourceType;
  actions: PermissionAction[];
  conditions?: PermissionCondition[];
  isSystem?: boolean;
}

export interface PermissionUpdateInput {
  name?: string;
  description?: string;
  actions?: PermissionAction[];
  conditions?: PermissionCondition[];
}

export class PermissionModel implements Permission {
  id: ID;
  name: string;
  code: string;
  description: string;
  resource: ResourceType;
  actions: PermissionAction[];
  conditions?: PermissionCondition[];
  isSystem: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string | null;

  constructor(data: Permission) {
    this.id = data.id;
    this.name = data.name;
    this.code = data.code;
    this.description = data.description;
    this.resource = data.resource;
    this.actions = data.actions || [];
    this.conditions = data.conditions;
    this.isSystem = data.isSystem;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.deletedAt = data.deletedAt;
  }

  /**
   * Check if this is a system permission
   */
  isSystemPermission(): boolean {
    return this.isSystem;
  }

  /**
   * Check if the permission allows a specific action
   */
  allowsAction(action: PermissionAction): boolean {
    return this.actions.includes(action) || this.actions.includes('manage');
  }

  /**
   * Check if the permission allows read access
   */
  allowsRead(): boolean {
    return this.allowsAction('read');
  }

  /**
   * Check if the permission allows create access
   */
  allowsCreate(): boolean {
    return this.allowsAction('create');
  }

  /**
   * Check if the permission allows update access
   */
  allowsUpdate(): boolean {
    return this.allowsAction('update');
  }

  /**
   * Check if the permission allows delete access
   */
  allowsDelete(): boolean {
    return this.allowsAction('delete');
  }

  /**
   * Check if the permission has full management access
   */
  hasFullAccess(): boolean {
    return this.actions.includes('manage');
  }

  /**
   * Check if the permission has conditions
   */
  hasConditions(): boolean {
    return !!this.conditions && this.conditions.length > 0;
  }

  /**
   * Evaluate conditions against a context
   */
  evaluateConditions(context: Record<string, unknown>): boolean {
    if (!this.conditions || this.conditions.length === 0) {
      return true;
    }

    return this.conditions.every((condition) => {
      const value = context[condition.field];
      return PermissionModel.evaluateCondition(condition, value);
    });
  }

  /**
   * Check if the permission matches a permission check request
   */
  matches(check: PermissionCheck): boolean {
    if (this.resource !== check.resource) {
      return false;
    }

    if (!this.allowsAction(check.action)) {
      return false;
    }

    if (check.context && this.hasConditions()) {
      return this.evaluateConditions(check.context);
    }

    return true;
  }

  /**
   * Create a permission grant
   */
  createGrant(grantedBy?: ID, expiresAt?: Date | null): PermissionGrant {
    return {
      permissionId: this.id,
      permissionCode: this.code,
      grantedAt: new Date(),
      grantedBy,
      expiresAt,
      conditions: this.conditions,
    };
  }

  /**
   * Convert to plain object
   */
  toJSON(): Permission {
    return {
      id: this.id,
      name: this.name,
      code: this.code,
      description: this.description,
      resource: this.resource,
      actions: this.actions,
      conditions: this.conditions,
      isSystem: this.isSystem,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt,
    };
  }

  /**
   * Evaluate a single condition
   */
  static evaluateCondition(condition: PermissionCondition, value: unknown): boolean {
    switch (condition.operator) {
      case 'eq':
        return value === condition.value;
      case 'neq':
        return value !== condition.value;
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(value);
      case 'nin':
        return Array.isArray(condition.value) && !condition.value.includes(value);
      case 'gt':
        return typeof value === 'number' && typeof condition.value === 'number' && value > condition.value;
      case 'gte':
        return typeof value === 'number' && typeof condition.value === 'number' && value >= condition.value;
      case 'lt':
        return typeof value === 'number' && typeof condition.value === 'number' && value < condition.value;
      case 'lte':
        return typeof value === 'number' && typeof condition.value === 'number' && value <= condition.value;
      case 'contains':
        return typeof value === 'string' && typeof condition.value === 'string' && value.includes(condition.value);
      default:
        return false;
    }
  }

  /**
   * Check permissions for a given permission set
   */
  static checkPermission(
    permissionSet: PermissionSet,
    check: PermissionCheck
  ): PermissionCheckResult {
    for (const computed of permissionSet.effectivePermissions) {
      if (computed.resource !== check.resource) {
        continue;
      }

      if (!computed.actions.includes(check.action) && !computed.actions.includes('manage')) {
        continue;
      }

      // Check conditions if present
      if (computed.conditions && check.context) {
        const conditionsMet = computed.conditions.every((condition) =>
          PermissionModel.evaluateCondition(condition, check.context?.[condition.field])
        );
        if (!conditionsMet) {
          continue;
        }
      }

      return {
        allowed: true,
        matchedPermission: `${computed.resource}:${check.action}`,
        conditions: computed.conditions,
      };
    }

    return {
      allowed: false,
      reason: `No permission found for ${check.action} on ${check.resource}`,
    };
  }

  /**
   * Generate a permission code from resource and actions
   */
  static generateCode(resource: ResourceType, actions: PermissionAction[]): string {
    if (actions.includes('manage')) {
      return `${resource}:manage`;
    }
    return `${resource}:${actions.sort().join(',')}`;
  }

  /**
   * Create a new PermissionModel from input data
   */
  static create(input: PermissionCreateInput, id: ID): PermissionModel {
    const now = new Date();
    return new PermissionModel({
      id,
      name: input.name,
      code: input.code,
      description: input.description,
      resource: input.resource,
      actions: input.actions,
      conditions: input.conditions,
      isSystem: input.isSystem || false,
      createdAt: now,
      updatedAt: now,
    });
  }
}

export default PermissionModel;
