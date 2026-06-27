import { type PrismaClient, type AuditLog, type Prisma } from '@prisma/client';

/**
 * Audit Log Repository
 *
 * Handles all audit logging database operations using Prisma ORM.
 */

export interface CreateAuditLogDto {
  userId?: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'login' | 'logout' | 'export' | 'import';
  resource: string;
  resourceId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogFilters {
  userId?: string;
  action?: string;
  resource?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  ipAddress?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class AuditLogRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Find an audit log by ID
   */
  async findById(id: string): Promise<AuditLog | null> {
    return this.prisma.auditLog.findUnique({
      where: { id },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  /**
   * Find all audit logs with filters and pagination
   */
  async findAll(
    filters: AuditLogFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<{ data: AuditLog[]; total: number; page: number; totalPages: number }> {
    const { page = 1, limit = 50, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {
      ...(filters.userId && { userId: filters.userId }),
      ...(filters.action && { action: filters.action as any }),
      ...(filters.resource && { resource: filters.resource }),
      ...(filters.resourceId && { resourceId: filters.resourceId }),
      ...(filters.ipAddress && { ipAddress: filters.ipAddress }),
      ...((filters.startDate || filters.endDate) && {
        createdAt: {
          ...(filters.startDate && { gte: filters.startDate }),
          ...(filters.endDate && { lte: filters.endDate }),
        },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find audit logs by user ID
   */
  async findByUserId(userId: string, limit = 100): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Find audit logs by resource
   */
  async findByResource(resource: string, resourceId?: string, limit = 100): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: { resource, ...(resourceId && { resourceId }) },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  /**
   * Create an audit log entry
   */
  async create(data: CreateAuditLogDto): Promise<AuditLog> {
    return this.prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action as any,
        resource: data.resource,
        resourceId: data.resourceId,
        oldValues: data.oldValues as any,
        newValues: data.newValues as any,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        metadata: data.metadata as any,
      },
    });
  }

  /**
   * Create multiple audit logs (bulk insert)
   */
  async createMany(logs: CreateAuditLogDto[]): Promise<{ count: number }> {
    return this.prisma.auditLog.createMany({
      data: logs.map((log) => ({
        ...log,
        action: log.action as any,
        oldValues: log.oldValues as any,
        newValues: log.newValues as any,
        metadata: log.metadata as any,
      })),
    });
  }

  /**
   * Count audit logs
   */
  async count(filters: AuditLogFilters = {}): Promise<number> {
    return this.prisma.auditLog.count({
      where: {
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.action && { action: filters.action as any }),
        ...(filters.resource && { resource: filters.resource }),
      },
    });
  }

  /**
   * Delete old audit logs (retention policy)
   */
  async deleteOlderThan(date: Date): Promise<{ count: number }> {
    return this.prisma.auditLog.deleteMany({
      where: { createdAt: { lt: date } },
    });
  }

  /**
   * Get audit log statistics
   */
  async getStats(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalLogs: number;
    byAction: Record<string, number>;
    byResource: Record<string, number>;
    topUsers: { userId: string; count: number }[];
  }> {
    const dateFilter =
      startDate && endDate
        ? {
            createdAt: { gte: startDate, lte: endDate },
          }
        : {};

    const [totalLogs, actionStats, resourceStats, topUsers] = await Promise.all([
      this.prisma.auditLog.count({ where: dateFilter }),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where: dateFilter,
        _count: { action: true },
      }),
      this.prisma.auditLog.groupBy({
        by: ['resource'],
        where: dateFilter,
        _count: { resource: true },
      }),
      this.prisma.auditLog.groupBy({
        by: ['userId'],
        where: { ...dateFilter, userId: { not: null } },
        _count: { userId: true },
        orderBy: { _count: { userId: 'desc' } },
        take: 10,
      }),
    ]);

    const byAction: Record<string, number> = {};
    actionStats.forEach((stat) => {
      byAction[stat.action] = stat._count.action;
    });

    const byResource: Record<string, number> = {};
    resourceStats.forEach((stat) => {
      byResource[stat.resource] = stat._count.resource;
    });

    return {
      totalLogs,
      byAction,
      byResource,
      topUsers: topUsers.map((u) => ({ userId: u.userId!, count: u._count.userId })),
    };
  }

  /**
   * Get user activity summary
   */
  async getUserActivity(
    userId: string,
    days = 30
  ): Promise<{
    totalActions: number;
    actionBreakdown: Record<string, number>;
    recentActivity: AuditLog[];
    lastLogin: Date | null;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [totalActions, actionBreakdown, recentActivity, lastLogin] = await Promise.all([
      this.prisma.auditLog.count({
        where: { userId, createdAt: { gte: startDate } },
      }),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where: { userId, createdAt: { gte: startDate } },
        _count: { action: true },
      }),
      this.prisma.auditLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.auditLog.findFirst({
        where: { userId, action: 'login' },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);

    const breakdown: Record<string, number> = {};
    actionBreakdown.forEach((stat) => {
      breakdown[stat.action] = stat._count.action;
    });

    return {
      totalActions,
      actionBreakdown: breakdown,
      recentActivity,
      lastLogin: lastLogin?.createdAt || null,
    };
  }

  /**
   * Get resource history
   */
  async getResourceHistory(
    resource: string,
    resourceId: string,
    limit?: number
  ): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: { resource, resourceId },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
      ...(limit && { take: limit }),
    });
  }

  /**
   * Export audit logs as JSON
   */
  async export(filters: AuditLogFilters = {}): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: {
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.action && { action: filters.action as any }),
        ...(filters.resource && { resource: filters.resource }),
        ...(filters.startDate &&
          filters.endDate && {
            createdAt: { gte: filters.startDate, lte: filters.endDate },
          }),
      },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
      take: 10000,
    });
  }
}

export default AuditLogRepository;
