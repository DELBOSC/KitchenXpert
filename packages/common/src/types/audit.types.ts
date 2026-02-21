/**
 * Types pour l'audit et le logging des actions
 */

import { BaseEntity, ID } from './base.types';

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'view'
  | 'export'
  | 'import'
  | 'login'
  | 'logout'
  | 'password_change'
  | 'permission_change'
  | 'settings_change'
  | 'api_access';

export type AuditResource =
  | 'user'
  | 'kitchen_project'
  | 'product'
  | 'order'
  | 'partner'
  | 'catalog'
  | 'file'
  | 'webhook'
  | 'settings'
  | 'api_key';

export type AuditSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AuditLog extends BaseEntity {
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
}

export interface AuditMetadata {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  changes?: AuditChange[];
  additionalInfo?: Record<string, unknown>;
}

export interface AuditChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface AuditLocation {
  country?: string;
  region?: string;
  city?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface AuditSearchParams {
  userId?: ID;
  action?: AuditAction | AuditAction[];
  resource?: AuditResource | AuditResource[];
  resourceId?: ID;
  severity?: AuditSeverity | AuditSeverity[];
  dateFrom?: Date | string;
  dateTo?: Date | string;
  ipAddress?: string;
  search?: string;
}

export interface AuditReport {
  period: {
    from: Date;
    to: Date;
  };
  summary: {
    totalEvents: number;
    byAction: Record<AuditAction, number>;
    byResource: Record<AuditResource, number>;
    bySeverity: Record<AuditSeverity, number>;
  };
  topUsers: Array<{
    userId: ID;
    email: string;
    eventCount: number;
  }>;
  securityEvents: AuditLog[];
  recentActivity: AuditLog[];
}

export interface AuditRetentionPolicy {
  enabled: boolean;
  retentionDays: number;
  archiveBeforeDelete: boolean;
  archiveLocation?: string;
  excludeSeverities?: AuditSeverity[];
}

export interface AuditExportRequest {
  format: 'json' | 'csv' | 'xlsx';
  filters?: AuditSearchParams;
  includeMetadata?: boolean;
  dateRange: {
    from: Date | string;
    to: Date | string;
  };
}

export interface AuditExportResponse {
  fileUrl: string;
  fileName: string;
  recordCount: number;
  generatedAt: Date;
  expiresAt: Date;
}

export interface SecurityAlert {
  id: ID;
  type: 'suspicious_login' | 'brute_force' | 'data_export' | 'permission_escalation' | 'api_abuse';
  severity: AuditSeverity;
  title: string;
  description: string;
  relatedAuditIds: ID[];
  acknowledgedAt?: Date | null;
  acknowledgedBy?: ID | null;
  createdAt: Date;
}
