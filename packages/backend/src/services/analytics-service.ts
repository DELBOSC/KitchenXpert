/**
 * Analytics Service
 * Handles business analytics, metrics tracking, and reporting
 */

import { createModuleLogger } from '../utils/logger';

const logger = createModuleLogger('analytics-service');

export interface AnalyticsEvent {
  id: string;
  type: EventType;
  category: EventCategory;
  action: string;
  label?: string;
  value?: number;
  userId?: string;
  sessionId: string;
  properties: Record<string, unknown>;
  timestamp: Date;
  context: EventContext;
}

export type EventType =
  | 'page_view'
  | 'user_action'
  | 'conversion'
  | 'error'
  | 'performance'
  | 'custom';

export type EventCategory =
  | 'navigation'
  | 'design'
  | 'catalog'
  | 'cart'
  | 'checkout'
  | 'account'
  | 'project'
  | 'collaboration'
  | 'export'
  | 'system';

export interface EventContext {
  userAgent?: string;
  ip?: string;
  locale: string;
  timezone: string;
  referrer?: string;
  url?: string;
  screenSize?: { width: number; height: number };
  deviceType: 'desktop' | 'tablet' | 'mobile';
}

export interface MetricDefinition {
  id: string;
  name: string;
  description: string;
  type: MetricType;
  aggregation: AggregationType;
  unit?: string;
  filters?: MetricFilter[];
}

export type MetricType = 'count' | 'sum' | 'average' | 'min' | 'max' | 'rate' | 'percentage';

export type AggregationType = 'total' | 'daily' | 'weekly' | 'monthly' | 'hourly';

export interface MetricFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains';
  value: unknown;
}

export interface MetricValue {
  metric: string;
  value: number;
  previousValue?: number;
  change?: number;
  changePercent?: number;
  period: DateRange;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface DashboardMetrics {
  overview: OverviewMetrics;
  userMetrics: UserMetrics;
  projectMetrics: ProjectMetrics;
  catalogMetrics: CatalogMetrics;
  conversionMetrics: ConversionMetrics;
  performanceMetrics: PerformanceMetrics;
}

export interface OverviewMetrics {
  totalUsers: MetricValue;
  activeUsers: MetricValue;
  totalProjects: MetricValue;
  totalOrders: MetricValue;
  revenue: MetricValue;
  averageOrderValue: MetricValue;
}

export interface UserMetrics {
  newUsers: MetricValue;
  returningUsers: MetricValue;
  userRetention: MetricValue;
  averageSessionDuration: MetricValue;
  bounceRate: MetricValue;
  usersByDevice: Record<string, number>;
  usersByCountry: Record<string, number>;
}

export interface ProjectMetrics {
  projectsCreated: MetricValue;
  projectsCompleted: MetricValue;
  averageProjectDuration: MetricValue;
  averageItemsPerProject: MetricValue;
  popularCategories: { category: string; count: number }[];
  collaborationRate: MetricValue;
}

export interface CatalogMetrics {
  productViews: MetricValue;
  searchQueries: MetricValue;
  topSearchTerms: { term: string; count: number }[];
  topProducts: { productId: string; name: string; views: number }[];
  categoryBreakdown: Record<string, number>;
}

export interface ConversionMetrics {
  visitorToUserRate: MetricValue;
  userToProjectRate: MetricValue;
  projectToQuoteRate: MetricValue;
  quoteToOrderRate: MetricValue;
  overallConversionRate: MetricValue;
  funnelStages: FunnelStage[];
}

export interface FunnelStage {
  name: string;
  count: number;
  percentage: number;
  dropOff: number;
}

export interface PerformanceMetrics {
  pageLoadTime: MetricValue;
  apiResponseTime: MetricValue;
  errorRate: MetricValue;
  uptime: MetricValue;
  renderTime3D: MetricValue;
}

export interface Report {
  id: string;
  name: string;
  type: ReportType;
  parameters: ReportParameters;
  schedule?: ReportSchedule;
  recipients?: string[];
  createdAt: Date;
  lastRunAt?: Date;
}

export type ReportType = 'sales' | 'users' | 'projects' | 'partners' | 'performance' | 'custom';

export interface ReportParameters {
  dateRange: DateRange;
  metrics: string[];
  dimensions?: string[];
  filters?: MetricFilter[];
  groupBy?: string;
  limit?: number;
}

export interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly';
  dayOfWeek?: number;
  dayOfMonth?: number;
  time: string; // HH:mm
  timezone: string;
}

export interface ReportResult {
  reportId: string;
  generatedAt: Date;
  parameters: ReportParameters;
  data: ReportData[];
  summary: Record<string, number>;
}

export interface ReportData {
  dimensions: Record<string, string>;
  metrics: Record<string, number>;
}

export interface AnalyticsRepository {
  trackEvent(event: Omit<AnalyticsEvent, 'id'>): Promise<AnalyticsEvent>;
  getEvents(params: EventQueryParams): Promise<AnalyticsEvent[]>;
  getMetric(metricId: string, params: MetricQueryParams): Promise<MetricValue>;
  getTimeSeries(metricId: string, params: TimeSeriesParams): Promise<TimeSeriesData>;
  saveReport(report: Omit<Report, 'id' | 'createdAt'>): Promise<Report>;
  getReport(id: string): Promise<Report | null>;
  generateReport(report: Report): Promise<ReportResult>;
}

export interface EventQueryParams {
  type?: EventType;
  category?: EventCategory;
  userId?: string;
  sessionId?: string;
  dateRange: DateRange;
  limit?: number;
  offset?: number;
}

export interface MetricQueryParams {
  dateRange: DateRange;
  filters?: MetricFilter[];
  comparePrevious?: boolean;
}

export interface TimeSeriesParams {
  dateRange: DateRange;
  granularity: 'hour' | 'day' | 'week' | 'month';
  filters?: MetricFilter[];
}

export interface TimeSeriesData {
  metric: string;
  granularity: string;
  dataPoints: TimeSeriesPoint[];
}

export interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
}

export class AnalyticsService {
  private eventBuffer: Omit<AnalyticsEvent, 'id'>[] = [];
  private flushInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private repository: AnalyticsRepository,
    private config: AnalyticsConfig = defaultConfig
  ) {
    if (config.batchEvents) {
      this.startEventFlushing();
    }
  }

  /**
   * Track an analytics event
   */
  async track(
    type: EventType,
    category: EventCategory,
    action: string,
    data: {
      label?: string;
      value?: number;
      userId?: string;
      sessionId: string;
      properties?: Record<string, unknown>;
      context: EventContext;
    }
  ): Promise<void> {
    const event: Omit<AnalyticsEvent, 'id'> = {
      type,
      category,
      action,
      label: data.label,
      value: data.value,
      userId: data.userId,
      sessionId: data.sessionId,
      properties: data.properties || {},
      timestamp: new Date(),
      context: data.context,
    };

    if (this.config.batchEvents) {
      this.eventBuffer.push(event);
      if (this.eventBuffer.length >= this.config.batchSize) {
        await this.flushEvents();
      }
    } else {
      await this.repository.trackEvent(event);
    }
  }

  /**
   * Track page view
   */
  async trackPageView(
    url: string,
    sessionId: string,
    context: EventContext,
    userId?: string
  ): Promise<void> {
    await this.track('page_view', 'navigation', 'view', {
      label: url,
      userId,
      sessionId,
      properties: { url },
      context: { ...context, url },
    });
  }

  /**
   * Track user action
   */
  async trackAction(
    category: EventCategory,
    action: string,
    sessionId: string,
    context: EventContext,
    data?: {
      label?: string;
      value?: number;
      userId?: string;
      properties?: Record<string, unknown>;
    }
  ): Promise<void> {
    await this.track('user_action', category, action, {
      ...data,
      sessionId,
      context,
    });
  }

  /**
   * Track conversion event
   */
  async trackConversion(
    action: string,
    value: number,
    sessionId: string,
    context: EventContext,
    userId?: string,
    properties?: Record<string, unknown>
  ): Promise<void> {
    await this.track('conversion', 'checkout', action, {
      value,
      userId,
      sessionId,
      properties,
      context,
    });
  }

  /**
   * Track error
   */
  async trackError(
    error: Error,
    sessionId: string,
    context: EventContext,
    userId?: string
  ): Promise<void> {
    await this.track('error', 'system', error.name, {
      label: error.message,
      userId,
      sessionId,
      properties: {
        stack: error.stack,
        name: error.name,
        message: error.message,
      },
      context,
    });
  }

  /**
   * Track performance metric
   */
  async trackPerformance(
    metric: string,
    value: number,
    sessionId: string,
    context: EventContext
  ): Promise<void> {
    await this.track('performance', 'system', metric, {
      value,
      sessionId,
      properties: { metric, value },
      context,
    });
  }

  /**
   * Get dashboard metrics
   */
  async getDashboardMetrics(dateRange: DateRange): Promise<DashboardMetrics> {
    const [overview, users, projects, catalog, conversion, performance] = await Promise.all([
      this.getOverviewMetrics(dateRange),
      this.getUserMetrics(dateRange),
      this.getProjectMetrics(dateRange),
      this.getCatalogMetrics(dateRange),
      this.getConversionMetrics(dateRange),
      this.getPerformanceMetrics(dateRange),
    ]);

    return {
      overview,
      userMetrics: users,
      projectMetrics: projects,
      catalogMetrics: catalog,
      conversionMetrics: conversion,
      performanceMetrics: performance,
    };
  }

  /**
   * Get overview metrics
   */
  async getOverviewMetrics(dateRange: DateRange): Promise<OverviewMetrics> {
    const params: MetricQueryParams = { dateRange, comparePrevious: true };

    const [totalUsers, activeUsers, totalProjects, totalOrders, revenue, aov] = await Promise.all([
      this.repository.getMetric('total_users', params),
      this.repository.getMetric('active_users', params),
      this.repository.getMetric('total_projects', params),
      this.repository.getMetric('total_orders', params),
      this.repository.getMetric('revenue', params),
      this.repository.getMetric('average_order_value', params),
    ]);

    return {
      totalUsers,
      activeUsers,
      totalProjects,
      totalOrders,
      revenue,
      averageOrderValue: aov,
    };
  }

  /**
   * Get user metrics
   */
  async getUserMetrics(dateRange: DateRange): Promise<UserMetrics> {
    const params: MetricQueryParams = { dateRange, comparePrevious: true };

    const [newUsers, returningUsers, retention, sessionDuration, bounceRate] = await Promise.all([
      this.repository.getMetric('new_users', params),
      this.repository.getMetric('returning_users', params),
      this.repository.getMetric('user_retention', params),
      this.repository.getMetric('avg_session_duration', params),
      this.repository.getMetric('bounce_rate', params),
    ]);

    // Get user distributions
    const deviceEvents = await this.repository.getEvents({
      type: 'page_view',
      dateRange,
      limit: 10000,
    });

    const usersByDevice: Record<string, number> = {};
    const usersByCountry: Record<string, number> = {};

    for (const event of deviceEvents) {
      const device = event.context.deviceType;
      usersByDevice[device] = (usersByDevice[device] || 0) + 1;
    }

    return {
      newUsers,
      returningUsers,
      userRetention: retention,
      averageSessionDuration: sessionDuration,
      bounceRate,
      usersByDevice,
      usersByCountry,
    };
  }

  /**
   * Get project metrics
   */
  async getProjectMetrics(dateRange: DateRange): Promise<ProjectMetrics> {
    const params: MetricQueryParams = { dateRange, comparePrevious: true };

    const [created, completed, duration, items, collabRate] = await Promise.all([
      this.repository.getMetric('projects_created', params),
      this.repository.getMetric('projects_completed', params),
      this.repository.getMetric('avg_project_duration', params),
      this.repository.getMetric('avg_items_per_project', params),
      this.repository.getMetric('collaboration_rate', params),
    ]);

    return {
      projectsCreated: created,
      projectsCompleted: completed,
      averageProjectDuration: duration,
      averageItemsPerProject: items,
      popularCategories: [],
      collaborationRate: collabRate,
    };
  }

  /**
   * Get catalog metrics
   */
  async getCatalogMetrics(dateRange: DateRange): Promise<CatalogMetrics> {
    const params: MetricQueryParams = { dateRange, comparePrevious: true };

    const [views, searches] = await Promise.all([
      this.repository.getMetric('product_views', params),
      this.repository.getMetric('search_queries', params),
    ]);

    return {
      productViews: views,
      searchQueries: searches,
      topSearchTerms: [],
      topProducts: [],
      categoryBreakdown: {},
    };
  }

  /**
   * Get conversion metrics
   */
  async getConversionMetrics(dateRange: DateRange): Promise<ConversionMetrics> {
    const params: MetricQueryParams = { dateRange, comparePrevious: true };

    const [v2u, u2p, p2q, q2o, overall] = await Promise.all([
      this.repository.getMetric('visitor_to_user_rate', params),
      this.repository.getMetric('user_to_project_rate', params),
      this.repository.getMetric('project_to_quote_rate', params),
      this.repository.getMetric('quote_to_order_rate', params),
      this.repository.getMetric('overall_conversion_rate', params),
    ]);

    return {
      visitorToUserRate: v2u,
      userToProjectRate: u2p,
      projectToQuoteRate: p2q,
      quoteToOrderRate: q2o,
      overallConversionRate: overall,
      funnelStages: this.calculateFunnel([v2u, u2p, p2q, q2o]),
    };
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(dateRange: DateRange): Promise<PerformanceMetrics> {
    const params: MetricQueryParams = { dateRange, comparePrevious: true };

    const [pageLoad, apiResponse, errorRate, uptime, render3D] = await Promise.all([
      this.repository.getMetric('page_load_time', params),
      this.repository.getMetric('api_response_time', params),
      this.repository.getMetric('error_rate', params),
      this.repository.getMetric('uptime', params),
      this.repository.getMetric('render_time_3d', params),
    ]);

    return {
      pageLoadTime: pageLoad,
      apiResponseTime: apiResponse,
      errorRate,
      uptime,
      renderTime3D: render3D,
    };
  }

  /**
   * Get time series data for a metric
   */
  async getTimeSeries(
    metricId: string,
    dateRange: DateRange,
    granularity: 'hour' | 'day' | 'week' | 'month' = 'day'
  ): Promise<TimeSeriesData> {
    return this.repository.getTimeSeries(metricId, {
      dateRange,
      granularity,
    });
  }

  /**
   * Create a report
   */
  async createReport(data: Omit<Report, 'id' | 'createdAt' | 'lastRunAt'>): Promise<Report> {
    return this.repository.saveReport(data);
  }

  /**
   * Run a report
   */
  async runReport(reportId: string): Promise<ReportResult> {
    const report = await this.repository.getReport(reportId);
    if (!report) {
      throw new AnalyticsServiceError('REPORT_NOT_FOUND', 'Report not found');
    }

    return this.repository.generateReport(report);
  }

  /**
   * Get real-time stats
   */
  async getRealTimeStats(): Promise<RealTimeStats> {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    const events = await this.repository.getEvents({
      dateRange: { start: fiveMinutesAgo, end: now },
      limit: 1000,
    });

    const activeUsers = new Set(events.map((e) => e.sessionId)).size;
    const pageViews = events.filter((e) => e.type === 'page_view').length;

    const topPages: Record<string, number> = {};
    for (const event of events) {
      if (event.type === 'page_view' && event.context.url) {
        topPages[event.context.url] = (topPages[event.context.url] || 0) + 1;
      }
    }

    return {
      activeUsers,
      pageViews,
      eventsPerMinute: events.length / 5,
      topPages: Object.entries(topPages)
        .map(([url, count]) => ({ url, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    };
  }

  /**
   * Flush buffered events
   */
  async flushEvents(): Promise<void> {
    if (this.eventBuffer.length === 0) {
      return;
    }

    const events = [...this.eventBuffer];
    this.eventBuffer = [];

    const results = await Promise.allSettled(
      events.map((event) => this.repository.trackEvent(event))
    );
    const failures = results.filter((r) => r.status === 'rejected');
    if (failures.length > 0) {
      logger.warn(`[Analytics] Failed to flush ${failures.length}/${events.length} events`);
    }
  }

  /**
   * Stop event flushing
   */
  stop(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }

  // Private helper methods

  private startEventFlushing(): void {
    this.flushInterval = setInterval(() => {
      this.flushEvents().catch((err) => {
        logger.warn('[Analytics] Failed to flush events', {
          error: err instanceof Error ? err.message : String(err),
        });
      });
    }, this.config.flushIntervalMs);
  }

  private calculateFunnel(metrics: MetricValue[]): FunnelStage[] {
    const stages = ['Visiteurs', 'Utilisateurs', 'Projets', 'Devis', 'Commandes'];
    const funnel: FunnelStage[] = [];

    let previousCount = 100; // Start at 100%

    for (let i = 0; i < stages.length; i++) {
      const metric = metrics[i];
      const percentage = metric ? metric.value : previousCount * 0.5;
      const dropOff = previousCount - percentage;

      funnel.push({
        name: stages[i] || `Stage ${i}`,
        count: Math.round(percentage * 1000),
        percentage,
        dropOff,
      });

      previousCount = percentage;
    }

    return funnel;
  }
}

export interface RealTimeStats {
  activeUsers: number;
  pageViews: number;
  eventsPerMinute: number;
  topPages: { url: string; count: number }[];
}

export interface AnalyticsConfig {
  batchEvents: boolean;
  batchSize: number;
  flushIntervalMs: number;
}

const defaultConfig: AnalyticsConfig = {
  batchEvents: true,
  batchSize: 100,
  flushIntervalMs: 5000,
};

export class AnalyticsServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'AnalyticsServiceError';
  }
}

export function createAnalyticsService(
  repository: AnalyticsRepository,
  config?: Partial<AnalyticsConfig>
): AnalyticsService {
  return new AnalyticsService(repository, { ...defaultConfig, ...config });
}

export default AnalyticsService;
