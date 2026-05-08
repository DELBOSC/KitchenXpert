import os from 'os';

import { type Request, type Response } from 'express';

import { prisma } from '../../database/client';
import { MetricRepository } from '../../repositories/metric-repository';
import { asyncHandler } from '../middleware/error-middleware';
const metricRepository = new MetricRepository(prisma);

/**
 * Monitoring Controller
 * Handles all metrics, health checks, and monitoring HTTP requests
 */
export class MonitoringController {
  // ==================== HEALTH CHECKS ====================

  /**
   * GET /health
   * Basic health check
   */
  healthCheck = asyncHandler(async (_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /health/detailed
   * Detailed health check with system info
   */
  detailedHealthCheck = asyncHandler(async (_req: Request, res: Response) => {
    const startTime = process.hrtime();

    // Check database connectivity
    let databaseStatus = 'healthy';
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      databaseStatus = 'unhealthy';
    }

    const [seconds, nanoseconds] = process.hrtime(startTime);
    const responseTime = (seconds * 1000 + nanoseconds / 1000000).toFixed(2);

    res.status(databaseStatus === 'healthy' ? 200 : 503).json({
      success: databaseStatus === 'healthy',
      status: databaseStatus === 'healthy' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: {
        database: databaseStatus,
      },
      responseTime: `${responseTime}ms`,
    });
  });

  /**
   * GET /health/ready
   * Kubernetes readiness probe
   */
  readinessCheck = asyncHandler(async (_req: Request, res: Response) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.status(200).json({ ready: true });
    } catch {
      res.status(503).json({ ready: false });
    }
  });

  /**
   * GET /health/live
   * Kubernetes liveness probe
   */
  livenessCheck = asyncHandler(async (_req: Request, res: Response) => {
    res.status(200).json({ alive: true });
  });

  // ==================== SYSTEM INFO ====================

  /**
   * GET /monitoring/system
   * Get system information
   */
  getSystemInfo = asyncHandler(async (_req: Request, res: Response) => {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();

    res.status(200).json({
      success: true,
      data: {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        uptime: {
          process: Math.floor(uptime),
          system: Math.floor(os.uptime()),
        },
        memory: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024),
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          external: Math.round(memoryUsage.external / 1024 / 1024),
        },
        cpu: {
          cores: os.cpus().length,
          loadAverage: os.loadavg(),
        },
        hostname: os.hostname(),
        timestamp: new Date().toISOString(),
      },
    });
  });

  // ==================== METRICS ====================

  /**
   * GET /monitoring/metrics
   * Get metrics with filters
   */
  getMetrics = asyncHandler(async (req: Request, res: Response) => {
    const { name, names, startDate, endDate, page = 1, limit = 100 } = req.query;

    const result = await metricRepository.findAll(
      {
        name: name as string,
        names: names ? (names as string).split(',') : undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      },
      { page: Number(page), limit: Math.min(Number(limit), 100) }
    );

    res.status(200).json({ success: true, data: result.data, total: result.total });
  });

  /**
   * GET /monitoring/metrics/names
   * Get all metric names
   */
  getMetricNames = asyncHandler(async (_req: Request, res: Response) => {
    const names = await metricRepository.getNames();
    res.status(200).json({ success: true, data: names });
  });

  /**
   * GET /monitoring/metrics/:name
   * Get metrics by name
   */
  getMetricsByName = asyncHandler(async (req: Request, res: Response) => {
    const name = req.params.name as string;
    const { limit = 100 } = req.query;
    const metrics = await metricRepository.findByName(name, Math.min(Number(limit), 100));
    res.status(200).json({ success: true, data: metrics });
  });

  /**
   * POST /monitoring/metrics
   * Record a metric
   */
  recordMetric = asyncHandler(async (req: Request, res: Response) => {
    const { name, value, unit, tags, metadata } = req.body;
    const metric = await metricRepository.create({ name, value, unit, tags, metadata });
    res.status(201).json({ success: true, data: metric });
  });

  /**
   * POST /monitoring/metrics/bulk
   * Record multiple metrics
   */
  recordMetricsBulk = asyncHandler(async (req: Request, res: Response) => {
    const { metrics } = req.body;
    const result = await metricRepository.createMany(metrics);
    res.status(201).json({ success: true, data: result, message: `${result.count} metrics recorded` });
  });

  /**
   * DELETE /monitoring/metrics/cleanup
   * Clean up old metrics
   */
  cleanupMetrics = asyncHandler(async (req: Request, res: Response) => {
    const { olderThanDays = 30 } = req.body;
    const date = new Date();
    date.setDate(date.getDate() - Number(olderThanDays));

    const result = await metricRepository.deleteOlderThan(date);
    res.status(200).json({ success: true, data: result, message: `Deleted ${result.count} old metrics` });
  });

  // ==================== AGGREGATIONS ====================

  /**
   * GET /monitoring/metrics/:name/aggregate
   * Get aggregated metrics
   */
  getAggregation = asyncHandler(async (req: Request, res: Response) => {
    const name = req.params.name as string;
    const { startDate, endDate } = req.query;

    const result = await metricRepository.aggregate(
      name,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.status(200).json({ success: true, data: result });
  });

  /**
   * POST /monitoring/metrics/aggregate
   * Get aggregated metrics for multiple names
   */
  getMultipleAggregations = asyncHandler(async (req: Request, res: Response) => {
    const { names, startDate, endDate } = req.body;

    const results = await metricRepository.aggregateMultiple(
      names,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );

    res.status(200).json({ success: true, data: results });
  });

  /**
   * GET /monitoring/metrics/:name/latest
   * Get latest metric value
   */
  getLatestValue = asyncHandler(async (req: Request, res: Response) => {
    const name = req.params.name as string;
    const value = await metricRepository.getLatestValue(name);
    res.status(200).json({ success: true, data: { name, value } });
  });

  /**
   * POST /monitoring/metrics/latest
   * Get latest values for multiple metrics
   */
  getLatestValues = asyncHandler(async (req: Request, res: Response) => {
    const { names } = req.body;
    const values = await metricRepository.getLatestValues(names);
    res.status(200).json({ success: true, data: values });
  });

  // ==================== TIME SERIES ====================

  /**
   * GET /monitoring/metrics/:name/timeseries
   * Get time series data
   */
  getTimeSeries = asyncHandler(async (req: Request, res: Response) => {
    const name = req.params.name as string;
    const { startDate, endDate, interval = 60 } = req.query;

    if (!startDate || !endDate) {
      res.status(400).json({
        success: false,
        error: 'startDate and endDate are required',
      });
      return;
    }

    const data = await metricRepository.getTimeSeries(
      name,
      new Date(startDate as string),
      new Date(endDate as string),
      Number(interval)
    );

    res.status(200).json({ success: true, data });
  });

  // ==================== DASHBOARD ====================

  /**
   * GET /monitoring/dashboard
   * Get dashboard statistics
   */
  getDashboardStats = asyncHandler(async (req: Request, res: Response) => {
    const { hours = 24 } = req.query;
    const stats = await metricRepository.getSystemStats(Number(hours));

    const memoryUsage = process.memoryUsage();

    res.status(200).json({
      success: true,
      data: {
        ...stats,
        memory: {
          heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        },
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      },
    });
  });

  // ==================== QUICK RECORD ENDPOINTS ====================

  /**
   * POST /monitoring/track/pageview
   * Record a page view
   */
  trackPageView = asyncHandler(async (req: Request, res: Response) => {
    const { path } = req.body;
    await metricRepository.recordPageView(path);
    res.status(201).json({ success: true, message: 'Page view recorded' });
  });

  /**
   * POST /monitoring/track/error
   * Record an error
   */
  trackError = asyncHandler(async (req: Request, res: Response) => {
    const { type, message } = req.body;
    await metricRepository.recordError(type, message);
    res.status(201).json({ success: true, message: 'Error recorded' });
  });

  /**
   * POST /monitoring/track/action
   * Record a user action
   */
  trackUserAction = asyncHandler(async (req: Request, res: Response) => {
    const { action, userId } = req.body;
    await metricRepository.recordUserAction(action, userId);
    res.status(201).json({ success: true, message: 'Action recorded' });
  });
}

export const monitoringController = new MonitoringController();
export default monitoringController;
