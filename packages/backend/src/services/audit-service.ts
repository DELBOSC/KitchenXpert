/**
 * Audit Service
 * Handles audit logging, compliance tracking, and activity history
 */

export interface AuditLog {
  id: string;
  timestamp: Date;
  action: AuditAction;
  category: AuditCategory;
  actor: AuditActor;
  target?: AuditTarget;
  changes?: AuditChange[];
  metadata: AuditMetadata;
  result: AuditResult;
}

export type AuditAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'export'
  | 'import'
  | 'share'
  | 'unshare'
  | 'approve'
  | 'reject'
  | 'archive'
  | 'restore'
  | 'configure'
  | 'execute'
  | 'ai_generate'
  | 'ai_suggest';

export type AuditCategory =
  | 'authentication'
  | 'authorization'
  | 'user'
  | 'project'
  | 'order'
  | 'payment'
  | 'partner'
  | 'catalog'
  | 'configuration'
  | 'data'
  | 'integration'
  | 'system'
  | 'ai';

export interface AuditActor {
  id: string;
  type: 'user' | 'system' | 'api' | 'integration' | 'ai';
  name?: string;
  email?: string;
  role?: string;
  ip?: string;
  userAgent?: string;
}

export interface AuditTarget {
  id: string;
  type: string;
  name?: string;
  attributes?: Record<string, unknown>;
}

export interface AuditChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
  displayOldValue?: string;
  displayNewValue?: string;
}

export interface AuditMetadata {
  requestId?: string;
  sessionId?: string;
  source?: string;
  version?: string;
  environment?: string;
  correlationId?: string;
  tags?: string[];
  custom?: Record<string, unknown>;
}

export type AuditResult = 'success' | 'failure' | 'denied' | 'error';

export interface AuditQueryParams {
  startDate?: Date;
  endDate?: Date;
  action?: AuditAction;
  category?: AuditCategory;
  actorId?: string;
  actorType?: AuditActor['type'];
  targetId?: string;
  targetType?: string;
  result?: AuditResult;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'action' | 'category';
  sortOrder?: 'asc' | 'desc';
}

export interface AuditSearchResult {
  logs: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditStats {
  totalLogs: number;
  byAction: Record<AuditAction, number>;
  byCategory: Record<AuditCategory, number>;
  byResult: Record<AuditResult, number>;
  byDay: { date: string; count: number }[];
  topActors: { actorId: string; name: string; count: number }[];
}

export interface AuditRepository {
  create(log: Omit<AuditLog, 'id'>): Promise<AuditLog>;
  findById(id: string): Promise<AuditLog | null>;
  search(params: AuditQueryParams): Promise<AuditSearchResult>;
  getStats(dateRange: { start: Date; end: Date }): Promise<AuditStats>;
  getActivityTimeline(targetId: string, targetType: string): Promise<AuditLog[]>;
  getActorActivity(actorId: string, params?: AuditQueryParams): Promise<AuditLog[]>;
  purge(olderThan: Date): Promise<number>;
}

export interface AuditConfig {
  enabled: boolean;
  logReads: boolean;
  sensitiveFields: string[];
  retentionDays: number;
  asyncLogging: boolean;
}

const defaultConfig: AuditConfig = {
  enabled: true,
  logReads: false,
  sensitiveFields: [
    'password',
    'token',
    'apiKey',
    'secret',
    'creditCard',
    'ssn',
    'phone',
    'cvv',
    'ipAddress',
    'refreshToken',
    'accessToken',
  ],
  retentionDays: 365,
  asyncLogging: true,
};

export class AuditService {
  private config: AuditConfig;
  private pendingLogs: Omit<AuditLog, 'id'>[] = [];
  private flushInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private repository: AuditRepository,
    config: Partial<AuditConfig> = {}
  ) {
    this.config = { ...defaultConfig, ...config };
    if (this.config.asyncLogging) {
      this.startAsyncFlushing();
    }
  }

  async log(
    action: AuditAction,
    category: AuditCategory,
    data: {
      actor: AuditActor;
      target?: AuditTarget;
      changes?: AuditChange[];
      result?: AuditResult;
      metadata?: Partial<AuditMetadata>;
    }
  ): Promise<AuditLog | null> {
    if (!this.config.enabled) {
      return null;
    }
    if (action === 'read' && !this.config.logReads) {
      return null;
    }

    const sanitizedChanges = this.sanitizeChanges(data.changes);

    const auditLog: Omit<AuditLog, 'id'> = {
      timestamp: new Date(),
      action,
      category,
      actor: data.actor,
      target: data.target,
      changes: sanitizedChanges,
      metadata: {
        environment: process.env['NODE_ENV'] || 'development',
        ...data.metadata,
      },
      result: data.result || 'success',
    };

    if (this.config.asyncLogging) {
      this.pendingLogs.push(auditLog);
      return null;
    }

    return this.repository.create(auditLog);
  }

  async logAuth(
    action: 'login' | 'logout',
    actor: AuditActor,
    result: AuditResult,
    metadata?: Partial<AuditMetadata>
  ): Promise<AuditLog | null> {
    return this.log(action, 'authentication', {
      actor,
      result,
      metadata: { ...metadata, source: 'auth' },
    });
  }

  async logCreate(
    category: AuditCategory,
    actor: AuditActor,
    target: AuditTarget,
    metadata?: Partial<AuditMetadata>
  ): Promise<AuditLog | null> {
    return this.log('create', category, { actor, target, result: 'success', metadata });
  }

  async logUpdate(
    category: AuditCategory,
    actor: AuditActor,
    target: AuditTarget,
    changes: AuditChange[],
    metadata?: Partial<AuditMetadata>
  ): Promise<AuditLog | null> {
    return this.log('update', category, { actor, target, changes, result: 'success', metadata });
  }

  async logDelete(
    category: AuditCategory,
    actor: AuditActor,
    target: AuditTarget,
    metadata?: Partial<AuditMetadata>
  ): Promise<AuditLog | null> {
    return this.log('delete', category, { actor, target, result: 'success', metadata });
  }

  async logAIGeneration(
    actor: AuditActor,
    target: AuditTarget,
    data: { configurationsGenerated: number; processingTime: number },
    metadata?: Partial<AuditMetadata>
  ): Promise<AuditLog | null> {
    return this.log('ai_generate', 'ai', {
      actor,
      target,
      result: 'success',
      metadata: { ...metadata, custom: data },
    });
  }

  async search(params: AuditQueryParams): Promise<AuditSearchResult> {
    return this.repository.search({
      limit: 50,
      offset: 0,
      sortBy: 'timestamp',
      sortOrder: 'desc',
      ...params,
    });
  }

  async getById(id: string): Promise<AuditLog | null> {
    return this.repository.findById(id);
  }

  async getActivityTimeline(targetId: string, targetType: string): Promise<AuditLog[]> {
    return this.repository.getActivityTimeline(targetId, targetType);
  }

  async getActorActivity(actorId: string, params?: AuditQueryParams): Promise<AuditLog[]> {
    return this.repository.getActorActivity(actorId, params);
  }

  async getStats(dateRange?: { start: Date; end: Date }): Promise<AuditStats> {
    const range = dateRange || {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date(),
    };
    return this.repository.getStats(range);
  }

  async purgeOldLogs(): Promise<number> {
    const cutoffDate = new Date(Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000);
    return this.repository.purge(cutoffDate);
  }

  async flush(): Promise<void> {
    if (this.pendingLogs.length === 0) {
      return;
    }
    const logs = [...this.pendingLogs];
    this.pendingLogs = [];
    await Promise.allSettled(logs.map((log) => this.repository.create(log)));
  }

  async stop(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    await this.flush();
  }

  private startAsyncFlushing(): void {
    this.flushInterval = setInterval(() => this.flush(), 5000);
  }

  private sanitizeChanges(changes?: AuditChange[]): AuditChange[] | undefined {
    if (!changes) {
      return undefined;
    }
    return changes.map((change) => {
      if (this.config.sensitiveFields.includes(change.field.toLowerCase())) {
        return { ...change, oldValue: '[REDACTED]', newValue: '[REDACTED]' };
      }
      return change;
    });
  }
}

export class AuditServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'AuditServiceError';
  }
}

export function createAuditService(
  repository: AuditRepository,
  config?: Partial<AuditConfig>
): AuditService {
  return new AuditService(repository, config);
}

export default AuditService;
