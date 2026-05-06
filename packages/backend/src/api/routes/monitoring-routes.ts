import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { monitoringController } from '../controllers/monitoring-controller';
import { authenticate, authorize } from '../middleware/auth-middleware';
import { validateBody } from '../middleware/validation-middleware';
import { apiRateLimiter } from '../middleware/rate-limit-middleware';

const router: RouterType = Router();

const recordMetricSchema = z.object({
  name: z.string().min(1).max(200),
  value: z.number(),
  unit: z.string().max(50).optional(),
  tags: z.record(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const recordMetricsBulkSchema = z.object({
  metrics: z.array(recordMetricSchema).min(1).max(500),
});

const trackPageViewSchema = z.object({
  path: z.string().min(1).max(2000),
});

const trackErrorSchema = z.object({
  type: z.string().min(1).max(200),
  message: z.string().max(5000),
});

const trackActionSchema = z.object({
  action: z.string().min(1).max(200),
  userId: z.string().max(100).optional(),
});

// Public health checks

/**
 * @swagger
 * /api/v1/monitoring:
 *   get:
 *     summary: Basic health check
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: Service is healthy
 */
router.get('/', monitoringController.healthCheck);

/**
 * @swagger
 * /api/v1/monitoring/health:
 *   get:
 *     summary: Health check
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: Service is healthy
 */
router.get('/health', monitoringController.healthCheck);

/**
 * @swagger
 * /api/v1/monitoring/health/detailed:
 *   get:
 *     summary: Detailed health check with dependency status
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: Detailed health status
 */
router.get('/health/detailed', monitoringController.detailedHealthCheck);

/**
 * @swagger
 * /api/v1/monitoring/health/ready:
 *   get:
 *     summary: Readiness check for load balancers
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: Service is ready
 *       503:
 *         description: Service is not ready
 */
router.get('/health/ready', monitoringController.readinessCheck);

/**
 * @swagger
 * /api/v1/monitoring/health/live:
 *   get:
 *     summary: Liveness check for orchestrators
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: Service is alive
 */
router.get('/health/live', monitoringController.livenessCheck);

// Protected routes (require authentication)
router.use(authenticate);

// System info (admin only)

/**
 * @swagger
 * /api/v1/monitoring/system:
 *   get:
 *     summary: Get system info (admin only)
 *     tags: [Monitoring]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: System information
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.get('/system', authorize(['admin']), monitoringController.getSystemInfo);

/**
 * @swagger
 * /api/v1/monitoring/dashboard:
 *   get:
 *     summary: Get monitoring dashboard stats (admin only)
 *     tags: [Monitoring]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.get('/dashboard', authorize(['admin']), monitoringController.getDashboardStats);

// Metrics (admin only)

/**
 * @swagger
 * /api/v1/monitoring/metrics:
 *   get:
 *     summary: Get all metrics (admin only)
 *     tags: [Monitoring]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Metrics data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.get('/metrics', authorize(['admin']), monitoringController.getMetrics);

/**
 * @swagger
 * /api/v1/monitoring/metrics/names:
 *   get:
 *     summary: Get all metric names (admin only)
 *     tags: [Monitoring]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of metric names
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.get('/metrics/names', authorize(['admin']), monitoringController.getMetricNames);

/**
 * @swagger
 * /api/v1/monitoring/metrics/{name}:
 *   get:
 *     summary: Get metrics by name (admin only)
 *     tags: [Monitoring]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Metric data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.get('/metrics/:name', authorize(['admin']), monitoringController.getMetricsByName);

/**
 * @swagger
 * /api/v1/monitoring/metrics/{name}/aggregate:
 *   get:
 *     summary: Get metric aggregation (admin only)
 *     tags: [Monitoring]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Aggregated metric data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.get('/metrics/:name/aggregate', authorize(['admin']), monitoringController.getAggregation);

/**
 * @swagger
 * /api/v1/monitoring/metrics/{name}/latest:
 *   get:
 *     summary: Get latest metric value (admin only)
 *     tags: [Monitoring]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Latest metric value
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.get('/metrics/:name/latest', authorize(['admin']), monitoringController.getLatestValue);

/**
 * @swagger
 * /api/v1/monitoring/metrics/{name}/timeseries:
 *   get:
 *     summary: Get metric timeseries data (admin only)
 *     tags: [Monitoring]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Timeseries data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.get('/metrics/:name/timeseries', authorize(['admin']), monitoringController.getTimeSeries);

// Record metrics (authenticated users, rate limited)

/**
 * @swagger
 * /api/v1/monitoring/metrics:
 *   post:
 *     summary: Record a metric
 *     tags: [Monitoring]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, value]
 *             properties:
 *               name:
 *                 type: string
 *               value:
 *                 type: number
 *               unit:
 *                 type: string
 *               tags:
 *                 type: object
 *     responses:
 *       201:
 *         description: Metric recorded
 *       401:
 *         description: Unauthorized
 */
router.post('/metrics', apiRateLimiter, validateBody(recordMetricSchema), monitoringController.recordMetric);

/**
 * @swagger
 * /api/v1/monitoring/metrics/bulk:
 *   post:
 *     summary: Record multiple metrics at once
 *     tags: [Monitoring]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [metrics]
 *             properties:
 *               metrics:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [name, value]
 *                   properties:
 *                     name:
 *                       type: string
 *                     value:
 *                       type: number
 *                     unit:
 *                       type: string
 *     responses:
 *       201:
 *         description: Metrics recorded
 *       401:
 *         description: Unauthorized
 */
router.post('/metrics/bulk', apiRateLimiter, validateBody(recordMetricsBulkSchema), monitoringController.recordMetricsBulk);

/**
 * @swagger
 * /api/v1/monitoring/metrics/aggregate:
 *   post:
 *     summary: Get multiple metric aggregations (admin only)
 *     tags: [Monitoring]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Aggregated metrics
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.post('/metrics/aggregate', authorize(['admin']), monitoringController.getMultipleAggregations);

/**
 * @swagger
 * /api/v1/monitoring/metrics/latest:
 *   post:
 *     summary: Get latest values for multiple metrics (admin only)
 *     tags: [Monitoring]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Latest metric values
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.post('/metrics/latest', authorize(['admin']), monitoringController.getLatestValues);

/**
 * @swagger
 * /api/v1/monitoring/stats:
 *   get:
 *     summary: Get system stats including job queue, Redis, and DB (admin only)
 *     tags: [Monitoring]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Aggregated system stats
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.get('/stats', authorize(['admin']), async (_req, res) => {
  try {
    const stats: Record<string, unknown> = {};

    // Job queue stats
    try {
      const { jobQueue } = await import('../../jobs/job-queue');
      stats.jobQueue = await jobQueue.getStats();
    } catch {
      stats.jobQueue = { error: 'unavailable' };
    }

    // Redis status
    try {
      const { getRedisClient } = await import('../../database/redis-client');
      const redis = await getRedisClient();
      stats.redis = { connected: true, ping: await redis.ping() };
    } catch {
      stats.redis = { connected: false };
    }

    // Database stats
    try {
      const { prisma: db } = await import('../../database/client');
      const [users, projects, orders] = await Promise.all([
        db.user.count(),
        db.project.count(),
        db.order.count(),
      ]);
      stats.database = { users, projects, orders };
    } catch {
      stats.database = { error: 'unavailable' };
    }

    res.json({ status: 'ok', timestamp: new Date().toISOString(), stats });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Cleanup (admin only)
const cleanupSchema = z.object({
  olderThanDays: z.number().int().min(1).max(365).default(30),
});

/**
 * @swagger
 * /api/v1/monitoring/metrics/cleanup:
 *   delete:
 *     summary: Cleanup old metrics (admin only)
 *     tags: [Monitoring]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               olderThanDays:
 *                 type: integer
 *                 default: 30
 *     responses:
 *       200:
 *         description: Metrics cleaned up
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.delete('/metrics/cleanup', authorize(['admin']), validateBody(cleanupSchema), monitoringController.cleanupMetrics);

// Quick track endpoints (authenticated, rate limited)

/**
 * @swagger
 * /api/v1/monitoring/track/pageview:
 *   post:
 *     summary: Track a page view
 *     tags: [Monitoring]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [path]
 *             properties:
 *               path:
 *                 type: string
 *     responses:
 *       201:
 *         description: Page view tracked
 *       401:
 *         description: Unauthorized
 */
router.post('/track/pageview', apiRateLimiter, validateBody(trackPageViewSchema), monitoringController.trackPageView);

/**
 * @swagger
 * /api/v1/monitoring/track/error:
 *   post:
 *     summary: Track an error
 *     tags: [Monitoring]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, message]
 *             properties:
 *               type:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       201:
 *         description: Error tracked
 *       401:
 *         description: Unauthorized
 */
router.post('/track/error', apiRateLimiter, validateBody(trackErrorSchema), monitoringController.trackError);

/**
 * @swagger
 * /api/v1/monitoring/track/action:
 *   post:
 *     summary: Track a user action
 *     tags: [Monitoring]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action]
 *             properties:
 *               action:
 *                 type: string
 *               userId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Action tracked
 *       401:
 *         description: Unauthorized
 */
router.post('/track/action', apiRateLimiter, validateBody(trackActionSchema), monitoringController.trackUserAction);

export default router;
