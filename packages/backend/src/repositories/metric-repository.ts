import { type PrismaClient, type Metric } from '@prisma/client';

/**
 * Metric Repository
 * Handles all metrics and analytics database operations using Prisma ORM.
 */

export interface CreateMetricDto {
  name: string;
  value: number;
  unit?: string;
  tags?: Record<string, string>;
  metadata?: Record<string, unknown>;
  timestamp?: Date;
}

export interface MetricFilters {
  name?: string;
  names?: string[];
  startDate?: Date;
  endDate?: Date;
  tags?: Record<string, string>;
}

export interface AggregationResult {
  name: string;
  count: number;
  sum: number;
  avg: number;
  min: number;
  max: number;
}

export class MetricRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Metric | null> {
    return this.prisma.metric.findUnique({ where: { id } });
  }

  async findAll(
    filters: MetricFilters = {},
    pagination: { page?: number; limit?: number } = {}
  ): Promise<{ data: Metric[]; total: number }> {
    const { page = 1, limit = 100 } = pagination;
    const skip = (page - 1) * limit;

    const where = {
      ...(filters.name && { name: filters.name }),
      ...(filters.names && { name: { in: filters.names } }),
      ...((filters.startDate || filters.endDate) && {
        timestamp: {
          ...(filters.startDate && { gte: filters.startDate }),
          ...(filters.endDate && { lte: filters.endDate }),
        }
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.metric.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' }
      }),
      this.prisma.metric.count({ where })
    ]);

    return { data, total };
  }

  async findByName(name: string, limit = 100): Promise<Metric[]> {
    return this.prisma.metric.findMany({
      where: { name },
      orderBy: { timestamp: 'desc' },
      take: limit
    });
  }

  async findByTimeRange(startDate: Date, endDate: Date, name?: string): Promise<Metric[]> {
    return this.prisma.metric.findMany({
      where: {
        timestamp: { gte: startDate, lte: endDate },
        ...(name && { name })
      },
      orderBy: { timestamp: 'asc' },
      take: 10000,
    });
  }

  async create(data: CreateMetricDto): Promise<Metric> {
    return this.prisma.metric.create({
      data: {
        name: data.name,
        value: data.value,
        unit: data.unit,
        tags: data.tags as any,
        metadata: data.metadata as any,
        timestamp: data.timestamp || new Date(),
      }
    });
  }

  async createMany(metrics: CreateMetricDto[]): Promise<{ count: number }> {
    return this.prisma.metric.createMany({
      data: metrics.map(m => ({
        name: m.name,
        value: m.value,
        unit: m.unit,
        tags: m.tags as any,
        metadata: m.metadata as any,
        timestamp: m.timestamp || new Date(),
      }))
    });
  }

  async delete(id: string): Promise<Metric> {
    return this.prisma.metric.delete({ where: { id } });
  }

  async deleteOlderThan(date: Date): Promise<{ count: number }> {
    return this.prisma.metric.deleteMany({
      where: { timestamp: { lt: date } }
    });
  }

  async deleteByName(name: string): Promise<{ count: number }> {
    return this.prisma.metric.deleteMany({ where: { name } });
  }

  async count(filters: MetricFilters = {}): Promise<number> {
    return this.prisma.metric.count({
      where: {
        ...(filters.name && { name: filters.name }),
        ...(filters.startDate && filters.endDate && {
          timestamp: { gte: filters.startDate, lte: filters.endDate }
        }),
      }
    });
  }

  async getNames(): Promise<string[]> {
    const names = await this.prisma.metric.findMany({
      select: { name: true },
      distinct: ['name'],
      orderBy: { name: 'asc' }
    });
    return names.map(n => n.name);
  }

  // ==================== AGGREGATIONS ====================

  async aggregate(name: string, startDate?: Date, endDate?: Date): Promise<AggregationResult> {
    const result = await this.prisma.metric.aggregate({
      where: {
        name,
        ...(startDate && endDate && { timestamp: { gte: startDate, lte: endDate } }),
      },
      _count: { value: true },
      _sum: { value: true },
      _avg: { value: true },
      _min: { value: true },
      _max: { value: true }
    });

    return {
      name,
      count: result._count.value || 0,
      sum: Number(result._sum.value) || 0,
      avg: Number(result._avg.value) || 0,
      min: Number(result._min.value) || 0,
      max: Number(result._max.value) || 0
    };
  }

  async aggregateMultiple(names: string[], startDate?: Date, endDate?: Date): Promise<AggregationResult[]> {
    const results = await Promise.all(
      names.map(name => this.aggregate(name, startDate, endDate))
    );
    return results;
  }

  async getLatestValue(name: string): Promise<number | null> {
    const metric = await this.prisma.metric.findFirst({
      where: { name },
      orderBy: { timestamp: 'desc' }
    });
    return metric ? Number(metric.value) : null;
  }

  async getLatestValues(names: string[]): Promise<Record<string, number | null>> {
    if (names.length === 0) {return {};}

    // Single query: get the latest metric for each name using distinct
    const metrics = await this.prisma.metric.findMany({
      where: { name: { in: names } },
      orderBy: { timestamp: 'desc' },
      distinct: ['name'],
    });

    const result: Record<string, number | null> = {};
    for (const name of names) {
      const metric = metrics.find(m => m.name === name);
      result[name] = metric ? Number(metric.value) : null;
    }
    return result;
  }

  // ==================== TIME SERIES ====================

  async getTimeSeries(
    name: string,
    startDate: Date,
    endDate: Date,
    intervalMinutes = 60
  ): Promise<{ timestamp: Date; value: number }[]> {
    const metrics = await this.findByTimeRange(startDate, endDate, name);

    // Group by interval
    const grouped = new Map<number, number[]>();
    metrics.forEach(m => {
      const intervalStart = Math.floor(m.timestamp.getTime() / (intervalMinutes * 60 * 1000)) * (intervalMinutes * 60 * 1000);
      if (!grouped.has(intervalStart)) {grouped.set(intervalStart, []);}
      grouped.get(intervalStart)!.push(Number(m.value));
    });

    // Calculate averages
    const result: { timestamp: Date; value: number }[] = [];
    grouped.forEach((values, timestamp) => {
      result.push({
        timestamp: new Date(timestamp),
        value: values.reduce((a, b) => a + b, 0) / values.length
      });
    });

    return result.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  // ==================== QUICK METRICS ====================

  async recordPageView(path: string): Promise<Metric> {
    return this.create({ name: 'page_view', value: 1, tags: { path } });
  }

  async recordApiCall(endpoint: string, duration: number, statusCode: number): Promise<Metric> {
    return this.create({
      name: 'api_call',
      value: duration,
      unit: 'ms',
      tags: { endpoint, status: String(statusCode) }
    });
  }

  async recordError(type: string, message: string): Promise<Metric> {
    return this.create({
      name: 'error',
      value: 1,
      tags: { type },
      metadata: { message }
    });
  }

  async recordUserAction(action: string, userId?: string): Promise<Metric> {
    return this.create({
      name: 'user_action',
      value: 1,
      tags: { action, ...(userId && { userId }) }
    });
  }

  async getSystemStats(hours = 24): Promise<{
    pageViews: number;
    apiCalls: number;
    avgResponseTime: number;
    errors: number;
  }> {
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - hours);

    const [pageViews, apiCallsAgg, errors] = await Promise.all([
      this.count({ name: 'page_view', startDate, endDate: new Date() }),
      this.aggregate('api_call', startDate, new Date()),
      this.count({ name: 'error', startDate, endDate: new Date() })
    ]);

    return {
      pageViews,
      apiCalls: apiCallsAgg.count,
      avgResponseTime: apiCallsAgg.avg,
      errors
    };
  }
}

export default MetricRepository;
