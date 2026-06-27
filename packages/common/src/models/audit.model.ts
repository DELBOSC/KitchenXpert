/**
 * Audit Model Class
 * Provides methods for working with audit log data
 */

import {
  AuditLog,
  AuditAction,
  AuditResource,
  AuditSeverity,
  AuditMetadata,
  AuditChange,
  AuditLocation,
  AuditSearchParams,
  ID,
} from '../types';

// Re-export types that may be used externally
export type { AuditReport, SecurityAlert } from '../types';

export interface AuditLogCreateInput {
  userId?: ID | null;
  sessionId?: string | null;
  action: AuditAction;
  resource: AuditResource;
  resourceId?: ID | null;
  severity?: AuditSeverity;
  description: string;
  metadata?: AuditMetadata;
  ipAddress?: string | null;
  userAgent?: string | null;
  location?: AuditLocation | null;
}

export class AuditModel implements AuditLog {
  id: ID;
  userId?: ID | null;
  sessionId?: string | null;
  action: AuditAction;
  resource: AuditResource;
  resourceId?: ID | null;
  severity: AuditSeverity;
  description: string;
  metadata: AuditMetadata;
  ipAddress?: string | null;
  userAgent?: string | null;
  location?: AuditLocation | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string | null;

  constructor(data: AuditLog) {
    this.id = data.id;
    this.userId = data.userId;
    this.sessionId = data.sessionId;
    this.action = data.action;
    this.resource = data.resource;
    this.resourceId = data.resourceId;
    this.severity = data.severity;
    this.description = data.description;
    this.metadata = data.metadata || {};
    this.ipAddress = data.ipAddress;
    this.userAgent = data.userAgent;
    this.location = data.location;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.deletedAt = data.deletedAt;
  }

  /**
   * Check if this is a security-related event
   */
  isSecurityEvent(): boolean {
    const securityActions: AuditAction[] = [
      'login',
      'logout',
      'password_change',
      'permission_change',
    ];
    return securityActions.includes(this.action);
  }

  /**
   * Check if this is a high severity event
   */
  isHighSeverity(): boolean {
    return this.severity === 'high' || this.severity === 'critical';
  }

  /**
   * Check if this is a critical event
   */
  isCritical(): boolean {
    return this.severity === 'critical';
  }

  /**
   * Check if the event is a create action
   */
  isCreateAction(): boolean {
    return this.action === 'create';
  }

  /**
   * Check if the event is an update action
   */
  isUpdateAction(): boolean {
    return this.action === 'update';
  }

  /**
   * Check if the event is a delete action
   */
  isDeleteAction(): boolean {
    return this.action === 'delete';
  }

  /**
   * Check if the event is a data modification
   */
  isDataModification(): boolean {
    return ['create', 'update', 'delete', 'import'].includes(this.action);
  }

  /**
   * Get the changes made in this audit event
   */
  getChanges(): AuditChange[] {
    return this.metadata.changes || [];
  }

  /**
   * Get the state before the change
   */
  getStateBefore(): Record<string, unknown> | undefined {
    return this.metadata.before;
  }

  /**
   * Get the state after the change
   */
  getStateAfter(): Record<string, unknown> | undefined {
    return this.metadata.after;
  }

  /**
   * Check if the event has location data
   */
  hasLocation(): boolean {
    return !!this.location;
  }

  /**
   * Get the location as a formatted string
   */
  getLocationString(): string | null {
    if (!this.location) return null;
    const parts = [this.location.city, this.location.region, this.location.country].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  }

  /**
   * Check if the event matches search parameters
   */
  matchesSearchParams(params: AuditSearchParams): boolean {
    if (params.userId && this.userId !== params.userId) return false;
    if (params.resourceId && this.resourceId !== params.resourceId) return false;
    if (params.ipAddress && this.ipAddress !== params.ipAddress) return false;

    if (params.action) {
      const actions = Array.isArray(params.action) ? params.action : [params.action];
      if (!actions.includes(this.action)) return false;
    }

    if (params.resource) {
      const resources = Array.isArray(params.resource) ? params.resource : [params.resource];
      if (!resources.includes(this.resource)) return false;
    }

    if (params.severity) {
      const severities = Array.isArray(params.severity) ? params.severity : [params.severity];
      if (!severities.includes(this.severity)) return false;
    }

    if (params.dateFrom) {
      const fromDate = new Date(params.dateFrom);
      const eventDate = new Date(this.createdAt);
      if (eventDate < fromDate) return false;
    }

    if (params.dateTo) {
      const toDate = new Date(params.dateTo);
      const eventDate = new Date(this.createdAt);
      if (eventDate > toDate) return false;
    }

    return true;
  }

  /**
   * Convert to plain object
   */
  toJSON(): AuditLog {
    return {
      id: this.id,
      userId: this.userId,
      sessionId: this.sessionId,
      action: this.action,
      resource: this.resource,
      resourceId: this.resourceId,
      severity: this.severity,
      description: this.description,
      metadata: this.metadata,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
      location: this.location,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt,
    };
  }

  /**
   * Determine severity based on action and resource
   */
  static determineSeverity(action: AuditAction, resource: AuditResource): AuditSeverity {
    // Critical severity
    if (action === 'permission_change' && resource === 'user') return 'critical';
    if (action === 'delete' && ['user', 'partner'].includes(resource)) return 'high';

    // High severity
    if (['permission_change', 'settings_change'].includes(action)) return 'high';
    if (action === 'delete') return 'medium';

    // Medium severity
    if (['create', 'update', 'import', 'export'].includes(action)) return 'medium';

    // Low severity
    return 'low';
  }

  /**
   * Create a new AuditModel from input data
   */
  static create(input: AuditLogCreateInput, id: ID): AuditModel {
    const now = new Date();
    const severity = input.severity || AuditModel.determineSeverity(input.action, input.resource);

    return new AuditModel({
      id,
      userId: input.userId,
      sessionId: input.sessionId,
      action: input.action,
      resource: input.resource,
      resourceId: input.resourceId,
      severity,
      description: input.description,
      metadata: input.metadata || {},
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      location: input.location,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Create an audit log for a login event
   */
  static createLoginEvent(userId: ID, ipAddress: string, userAgent: string, id: ID): AuditModel {
    return AuditModel.create(
      {
        userId,
        action: 'login',
        resource: 'user',
        resourceId: userId,
        description: 'User logged in',
        ipAddress,
        userAgent,
      },
      id
    );
  }

  /**
   * Create an audit log for a logout event
   */
  static createLogoutEvent(userId: ID, id: ID): AuditModel {
    return AuditModel.create(
      {
        userId,
        action: 'logout',
        resource: 'user',
        resourceId: userId,
        description: 'User logged out',
      },
      id
    );
  }
}

export default AuditModel;
