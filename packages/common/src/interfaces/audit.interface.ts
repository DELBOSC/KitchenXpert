/**
 * Interfaces pour le système d'audit
 */

import { ID } from '../types/base.types';
import {
  AuditLog,
  AuditAction,
  AuditResource,
  AuditSeverity,
  AuditSearchParams,
  AuditReport,
  SecurityAlert,
} from '../types/audit.types';

/**
 * Interface principale pour le service d'audit
 */
export interface IAuditService {
  log(entry: AuditEntry): Promise<AuditLog>;
  search(params: AuditSearchParams): Promise<AuditSearchResult>;
  getById(id: ID): Promise<AuditLog | null>;
  generateReport(options: ReportOptions): Promise<AuditReport>;
  exportLogs(params: ExportParams): Promise<ExportResult>;
}

export interface AuditEntry {
  userId?: ID;
  sessionId?: string;
  action: AuditAction;
  resource: AuditResource;
  resourceId?: ID;
  severity?: AuditSeverity;
  description: string;
  metadata?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    additionalInfo?: Record<string, unknown>;
  };
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditSearchResult {
  logs: AuditLog[];
  total: number;
  page: number;
  limit: number;
}

export interface ReportOptions {
  startDate: Date;
  endDate: Date;
  groupBy?: 'day' | 'week' | 'month';
  includeSecurityEvents?: boolean;
  userIds?: ID[];
  actions?: AuditAction[];
  resources?: AuditResource[];
}

export interface ExportParams {
  format: 'json' | 'csv' | 'xlsx';
  filters?: AuditSearchParams;
  fields?: string[];
  dateRange: {
    from: Date;
    to: Date;
  };
}

export interface ExportResult {
  url: string;
  filename: string;
  size: number;
  recordCount: number;
  expiresAt: Date;
}

/**
 * Interface pour les alertes de sécurité
 */
export interface ISecurityAlertService {
  createAlert(alert: CreateAlertParams): Promise<SecurityAlert>;
  getActiveAlerts(): Promise<SecurityAlert[]>;
  acknowledgeAlert(id: ID, userId: ID): Promise<SecurityAlert>;
  resolveAlert(id: ID, userId: ID, resolution?: string): Promise<SecurityAlert>;
  getAlertHistory(params?: AlertHistoryParams): Promise<SecurityAlert[]>;
}

export interface CreateAlertParams {
  type: SecurityAlert['type'];
  severity: AuditSeverity;
  title: string;
  description: string;
  relatedAuditIds?: ID[];
}

export interface AlertHistoryParams {
  startDate?: Date;
  endDate?: Date;
  type?: SecurityAlert['type'];
  severity?: AuditSeverity;
  acknowledged?: boolean;
  resolved?: boolean;
}

/**
 * Interface pour le middleware d'audit
 */
export interface IAuditMiddleware {
  trackRequest(context: RequestContext): Promise<void>;
  trackResponse(context: ResponseContext): Promise<void>;
  trackError(context: ErrorContext): Promise<void>;
}

export interface RequestContext {
  requestId: string;
  userId?: ID;
  method: string;
  path: string;
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
  ip: string;
  userAgent: string;
  timestamp: Date;
}

export interface ResponseContext extends RequestContext {
  statusCode: number;
  responseTime: number;
  responseSize?: number;
}

export interface ErrorContext extends RequestContext {
  error: Error;
  statusCode: number;
}
