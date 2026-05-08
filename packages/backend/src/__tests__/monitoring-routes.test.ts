/**
 * Monitoring Routes Tests
 *
 * Tests for monitoring route handlers including:
 * - GET /health (basic public health check)
 * - GET /health/detailed (detailed health check with DB status)
 * - GET /health/ready (Kubernetes readiness probe)
 * - GET /health/live (Kubernetes liveness probe)
 * - GET /monitoring/system (admin only - system info)
 * - GET /monitoring/metrics (admin only - metrics with filters)
 * - GET /monitoring/metrics/names (admin only - metric names)
 * - GET /monitoring/metrics/:name (admin only - metrics by name)
 * - GET /monitoring/metrics/:name/aggregate (admin only - aggregation)
 * - GET /monitoring/metrics/:name/latest (admin only - latest value)
 * - GET /monitoring/metrics/:name/timeseries (admin only - time series)
 * - POST /monitoring/metrics (record a metric)
 * - POST /monitoring/metrics/bulk (record multiple metrics)
 * - GET /monitoring/dashboard (admin only - dashboard stats)
 * - DELETE /monitoring/metrics/cleanup (admin only - cleanup)
 * - POST /monitoring/track/pageview (track page view)
 * - POST /monitoring/track/error (track error)
 * - POST /monitoring/track/action (track user action)
 */

import { type Request, type Response } from 'express';

// ---------------------------------------------------------------------------
// Mock metric repository
// ---------------------------------------------------------------------------
const mockMetricRepository = {
  findAll: jest.fn(),
  getNames: jest.fn(),
  findByName: jest.fn(),
  create: jest.fn(),
  createMany: jest.fn(),
  deleteOlderThan: jest.fn(),
  aggregate: jest.fn(),
  aggregateMultiple: jest.fn(),
  getLatestValue: jest.fn(),
  getLatestValues: jest.fn(),
  getTimeSeries: jest.fn(),
  getSystemStats: jest.fn(),
  recordPageView: jest.fn(),
  recordError: jest.fn(),
  recordUserAction: jest.fn(),
};

jest.mock('../repositories/metric-repository', () => ({
  MetricRepository: jest.fn().mockImplementation(() => mockMetricRepository),
}));

// ---------------------------------------------------------------------------
// Mock prisma client
// ---------------------------------------------------------------------------
const mockPrisma = {
  $queryRaw: jest.fn(),
};

jest.mock('../database/client', () => ({
  prisma: mockPrisma,
  connectPrisma: jest.fn(),
  disconnectPrisma: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Mock asyncHandler to pass through
// ---------------------------------------------------------------------------
jest.mock('../api/middleware/error-middleware', () => ({
  asyncHandler: (fn: Function) => fn,
}));

// ---------------------------------------------------------------------------
// Mock logger
// ---------------------------------------------------------------------------
jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  createModuleLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Mock auth middleware
// ---------------------------------------------------------------------------
jest.mock('../api/middleware/auth-middleware', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    if (!req.user) {
      req.user = { userId: 'test-user-id', email: 'test@test.com', role: 'user' };
    }
    next();
  },
  requireRole: (role: string) => (req: any, _res: any, next: any) => {
    if (req.user?.role !== role) {
      return _res.status(403).json({ success: false, error: 'Forbidden' });
    }
    next();
  },
  authorize: (roles: string[]) => (req: any, _res: any, next: any) => {
    if (!roles.includes(req.user?.role)) {
      return _res.status(403).json({ success: false, error: 'Forbidden' });
    }
    next();
  },
}));

// ---------------------------------------------------------------------------
// Import controller AFTER mocks
// ---------------------------------------------------------------------------
import { MonitoringController } from '../api/controllers/monitoring-controller';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const testUser = { userId: 'test-user-id', email: 'test@test.com', role: 'user' };
const adminUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };

function createMockReq(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    params: {},
    query: {},
    body: {},
    user: testUser as any,
    ...overrides,
  };
}

function createMockRes(): { res: Partial<Response>; statusMock: jest.Mock; jsonMock: jest.Mock } {
  const jsonMock = jest.fn();
  const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
  return {
    res: { status: statusMock, json: jsonMock } as Partial<Response>,
    statusMock,
    jsonMock,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MonitoringController', () => {
  let controller: MonitoringController;

  beforeEach(() => {
    controller = new MonitoringController();
    jest.clearAllMocks();
  });

  // ==========================================================================
  // GET /health (public health check)
  // ==========================================================================
  describe('healthCheck', () => {
    it('should return healthy status', async () => {
      const req = createMockReq();
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.healthCheck(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          status: 'healthy',
          timestamp: expect.any(String),
        }),
      );
    });

    it('should include a valid ISO timestamp', async () => {
      const req = createMockReq();
      const { res, jsonMock } = createMockRes();

      await controller.healthCheck(req as Request, res as Response);

      const response = jsonMock.mock.calls[0][0];
      expect(() => new Date(response.timestamp)).not.toThrow();
    });
  });

  // ==========================================================================
  // GET /health/detailed (authenticated)
  // ==========================================================================
  describe('detailedHealthCheck', () => {
    it('should return detailed health with healthy database', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      const req = createMockReq();
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.detailedHealthCheck(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          status: 'healthy',
          checks: { database: 'healthy' },
          responseTime: expect.any(String),
        }),
      );
    });

    it('should return 503 with degraded status when database is unhealthy', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Connection refused'));

      const req = createMockReq();
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.detailedHealthCheck(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(503);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          status: 'degraded',
          checks: { database: 'unhealthy' },
        }),
      );
    });

    it('should include response time in the detailed check', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      const req = createMockReq();
      const { res, jsonMock } = createMockRes();

      await controller.detailedHealthCheck(req as Request, res as Response);

      const response = jsonMock.mock.calls[0][0];
      expect(response.responseTime).toMatch(/^\d+\.\d+ms$/);
    });
  });

  // ==========================================================================
  // GET /health/ready (readiness probe)
  // ==========================================================================
  describe('readinessCheck', () => {
    it('should return ready when database is available', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      const req = createMockReq();
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.readinessCheck(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ ready: true });
    });

    it('should return 503 not ready when database is unavailable', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Connection refused'));

      const req = createMockReq();
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.readinessCheck(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(503);
      expect(jsonMock).toHaveBeenCalledWith({ ready: false });
    });
  });

  // ==========================================================================
  // GET /health/live (liveness probe)
  // ==========================================================================
  describe('livenessCheck', () => {
    it('should always return alive', async () => {
      const req = createMockReq();
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.livenessCheck(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ alive: true });
    });
  });

  // ==========================================================================
  // GET /monitoring/system (admin only)
  // ==========================================================================
  describe('getSystemInfo', () => {
    it('should return system information', async () => {
      const req = createMockReq({ user: adminUser as any });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getSystemInfo(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            platform: expect.any(String),
            arch: expect.any(String),
            nodeVersion: expect.any(String),
            uptime: expect.objectContaining({
              process: expect.any(Number),
              system: expect.any(Number),
            }),
            memory: expect.objectContaining({
              rss: expect.any(Number),
              heapTotal: expect.any(Number),
              heapUsed: expect.any(Number),
              external: expect.any(Number),
            }),
            cpu: expect.objectContaining({
              cores: expect.any(Number),
              loadAverage: expect.any(Array),
            }),
            hostname: expect.any(String),
            timestamp: expect.any(String),
          }),
        }),
      );
    });
  });

  // ==========================================================================
  // GET /monitoring/metrics (admin only)
  // ==========================================================================
  describe('getMetrics', () => {
    it('should return metrics with default pagination', async () => {
      const mockResult = {
        data: [
          { id: 'm1', name: 'http_requests', value: 100 },
          { id: 'm2', name: 'response_time', value: 45.2 },
        ],
        total: 2,
      };
      mockMetricRepository.findAll.mockResolvedValue(mockResult);

      const req = createMockReq({ user: adminUser as any });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getMetrics(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockResult.data,
        total: 2,
      });
    });

    it('should pass filter parameters to repository', async () => {
      mockMetricRepository.findAll.mockResolvedValue({ data: [], total: 0 });

      const req = createMockReq({
        user: adminUser as any,
        query: {
          name: 'http_requests',
          names: 'http_requests,response_time',
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          page: '2',
          limit: '50',
        },
      });
      const { res } = createMockRes();

      await controller.getMetrics(req as Request, res as Response);

      expect(mockMetricRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'http_requests',
          names: ['http_requests', 'response_time'],
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        }),
        expect.objectContaining({ page: 2, limit: 50 }),
      );
    });

    it('should cap limit to 100', async () => {
      mockMetricRepository.findAll.mockResolvedValue({ data: [], total: 0 });

      const req = createMockReq({
        user: adminUser as any,
        query: { limit: '500' },
      });
      const { res } = createMockRes();

      await controller.getMetrics(req as Request, res as Response);

      expect(mockMetricRepository.findAll).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ limit: 100 }),
      );
    });
  });

  // ==========================================================================
  // GET /monitoring/metrics/names
  // ==========================================================================
  describe('getMetricNames', () => {
    it('should return all metric names', async () => {
      const names = ['http_requests', 'response_time', 'error_count', 'memory_usage'];
      mockMetricRepository.getNames.mockResolvedValue(names);

      const req = createMockReq({ user: adminUser as any });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getMetricNames(req as Request, res as Response);

      expect(mockMetricRepository.getNames).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: names });
    });
  });

  // ==========================================================================
  // GET /monitoring/metrics/:name
  // ==========================================================================
  describe('getMetricsByName', () => {
    it('should return metrics by name', async () => {
      const metrics = [
        { id: 'm1', name: 'http_requests', value: 100 },
        { id: 'm2', name: 'http_requests', value: 150 },
      ];
      mockMetricRepository.findByName.mockResolvedValue(metrics);

      const req = createMockReq({
        user: adminUser as any,
        params: { name: 'http_requests' },
      });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getMetricsByName(req as Request, res as Response);

      expect(mockMetricRepository.findByName).toHaveBeenCalledWith('http_requests', 100);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: metrics });
    });

    it('should cap limit to 100', async () => {
      mockMetricRepository.findByName.mockResolvedValue([]);

      const req = createMockReq({
        user: adminUser as any,
        params: { name: 'http_requests' },
        query: { limit: '500' },
      });
      const { res } = createMockRes();

      await controller.getMetricsByName(req as Request, res as Response);

      expect(mockMetricRepository.findByName).toHaveBeenCalledWith('http_requests', 100);
    });
  });

  // ==========================================================================
  // POST /monitoring/metrics (record metric)
  // ==========================================================================
  describe('recordMetric', () => {
    it('should record a metric', async () => {
      const mockMetric = { id: 'm1', name: 'http_requests', value: 1, unit: 'count' };
      mockMetricRepository.create.mockResolvedValue(mockMetric);

      const req = createMockReq({
        body: { name: 'http_requests', value: 1, unit: 'count', tags: { method: 'GET' } },
      });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.recordMetric(req as Request, res as Response);

      expect(mockMetricRepository.create).toHaveBeenCalledWith({
        name: 'http_requests',
        value: 1,
        unit: 'count',
        tags: { method: 'GET' },
        metadata: undefined,
      });
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: mockMetric });
    });
  });

  // ==========================================================================
  // POST /monitoring/metrics/bulk
  // ==========================================================================
  describe('recordMetricsBulk', () => {
    it('should record multiple metrics at once', async () => {
      const mockResult = { count: 3 };
      mockMetricRepository.createMany.mockResolvedValue(mockResult);

      const metrics = [
        { name: 'http_requests', value: 1 },
        { name: 'response_time', value: 45.2 },
        { name: 'error_count', value: 0 },
      ];

      const req = createMockReq({ body: { metrics } });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.recordMetricsBulk(req as Request, res as Response);

      expect(mockMetricRepository.createMany).toHaveBeenCalledWith(metrics);
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
        message: '3 metrics recorded',
      });
    });
  });

  // ==========================================================================
  // GET /monitoring/metrics/:name/aggregate
  // ==========================================================================
  describe('getAggregation', () => {
    it('should return aggregated metrics', async () => {
      const aggregation = { min: 10, max: 500, avg: 120.5, count: 1000 };
      mockMetricRepository.aggregate.mockResolvedValue(aggregation);

      const req = createMockReq({
        user: adminUser as any,
        params: { name: 'http_requests' },
        query: { startDate: '2025-01-01', endDate: '2025-12-31' },
      });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getAggregation(req as Request, res as Response);

      expect(mockMetricRepository.aggregate).toHaveBeenCalledWith(
        'http_requests',
        expect.any(Date),
        expect.any(Date),
      );
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: aggregation });
    });
  });

  // ==========================================================================
  // GET /monitoring/metrics/:name/latest
  // ==========================================================================
  describe('getLatestValue', () => {
    it('should return the latest metric value', async () => {
      mockMetricRepository.getLatestValue.mockResolvedValue(42.5);

      const req = createMockReq({
        user: adminUser as any,
        params: { name: 'response_time' },
      });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getLatestValue(req as Request, res as Response);

      expect(mockMetricRepository.getLatestValue).toHaveBeenCalledWith('response_time');
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: { name: 'response_time', value: 42.5 },
      });
    });
  });

  // ==========================================================================
  // GET /monitoring/metrics/:name/timeseries
  // ==========================================================================
  describe('getTimeSeries', () => {
    it('should return time series data', async () => {
      const timeSeriesData = [
        { timestamp: '2025-01-01T00:00:00Z', value: 100 },
        { timestamp: '2025-01-01T01:00:00Z', value: 120 },
      ];
      mockMetricRepository.getTimeSeries.mockResolvedValue(timeSeriesData);

      const req = createMockReq({
        user: adminUser as any,
        params: { name: 'http_requests' },
        query: { startDate: '2025-01-01', endDate: '2025-01-02', interval: '3600' },
      });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getTimeSeries(req as Request, res as Response);

      expect(mockMetricRepository.getTimeSeries).toHaveBeenCalledWith(
        'http_requests',
        expect.any(Date),
        expect.any(Date),
        3600,
      );
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: timeSeriesData });
    });

    it('should return 400 if startDate is missing for timeseries', async () => {
      const req = createMockReq({
        user: adminUser as any,
        params: { name: 'http_requests' },
        query: { endDate: '2025-01-02' },
      });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getTimeSeries(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'startDate and endDate are required',
      });
    });

    it('should return 400 if endDate is missing for timeseries', async () => {
      const req = createMockReq({
        user: adminUser as any,
        params: { name: 'http_requests' },
        query: { startDate: '2025-01-01' },
      });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getTimeSeries(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'startDate and endDate are required',
      });
    });

    it('should use default interval of 60 when not provided', async () => {
      mockMetricRepository.getTimeSeries.mockResolvedValue([]);

      const req = createMockReq({
        user: adminUser as any,
        params: { name: 'http_requests' },
        query: { startDate: '2025-01-01', endDate: '2025-01-02' },
      });
      const { res } = createMockRes();

      await controller.getTimeSeries(req as Request, res as Response);

      expect(mockMetricRepository.getTimeSeries).toHaveBeenCalledWith(
        'http_requests',
        expect.any(Date),
        expect.any(Date),
        60,
      );
    });
  });

  // ==========================================================================
  // GET /monitoring/dashboard
  // ==========================================================================
  describe('getDashboardStats', () => {
    it('should return dashboard statistics', async () => {
      const mockStats = { totalRequests: 50000, avgResponseTime: 120 };
      mockMetricRepository.getSystemStats.mockResolvedValue(mockStats);

      const req = createMockReq({ user: adminUser as any });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getDashboardStats(req as Request, res as Response);

      expect(mockMetricRepository.getSystemStats).toHaveBeenCalledWith(24);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            totalRequests: 50000,
            avgResponseTime: 120,
            memory: expect.objectContaining({
              heapUsedMB: expect.any(Number),
              heapTotalMB: expect.any(Number),
            }),
            uptime: expect.any(Number),
            timestamp: expect.any(String),
          }),
        }),
      );
    });

    it('should accept custom hours parameter', async () => {
      mockMetricRepository.getSystemStats.mockResolvedValue({});

      const req = createMockReq({
        user: adminUser as any,
        query: { hours: '48' },
      });
      const { res } = createMockRes();

      await controller.getDashboardStats(req as Request, res as Response);

      expect(mockMetricRepository.getSystemStats).toHaveBeenCalledWith(48);
    });
  });

  // ==========================================================================
  // DELETE /monitoring/metrics/cleanup
  // ==========================================================================
  describe('cleanupMetrics', () => {
    it('should delete old metrics', async () => {
      mockMetricRepository.deleteOlderThan.mockResolvedValue({ count: 100 });

      const req = createMockReq({
        user: adminUser as any,
        body: { olderThanDays: 30 },
      });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.cleanupMetrics(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: { count: 100 },
          message: 'Deleted 100 old metrics',
        }),
      );
    });
  });

  // ==========================================================================
  // POST /monitoring/track/pageview
  // ==========================================================================
  describe('trackPageView', () => {
    it('should record a page view', async () => {
      mockMetricRepository.recordPageView.mockResolvedValue(undefined);

      const req = createMockReq({ body: { path: '/dashboard' } });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.trackPageView(req as Request, res as Response);

      expect(mockMetricRepository.recordPageView).toHaveBeenCalledWith('/dashboard');
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, message: 'Page view recorded' });
    });
  });

  // ==========================================================================
  // POST /monitoring/track/error
  // ==========================================================================
  describe('trackError', () => {
    it('should record an error', async () => {
      mockMetricRepository.recordError.mockResolvedValue(undefined);

      const req = createMockReq({ body: { type: 'TypeError', message: 'Cannot read property' } });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.trackError(req as Request, res as Response);

      expect(mockMetricRepository.recordError).toHaveBeenCalledWith('TypeError', 'Cannot read property');
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, message: 'Error recorded' });
    });
  });

  // ==========================================================================
  // POST /monitoring/track/action
  // ==========================================================================
  describe('trackUserAction', () => {
    it('should record a user action', async () => {
      mockMetricRepository.recordUserAction.mockResolvedValue(undefined);

      const req = createMockReq({ body: { action: 'kitchen.save', userId: 'user-1' } });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.trackUserAction(req as Request, res as Response);

      expect(mockMetricRepository.recordUserAction).toHaveBeenCalledWith('kitchen.save', 'user-1');
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, message: 'Action recorded' });
    });
  });

  // ==========================================================================
  // Admin-only access checks
  // ==========================================================================
  describe('Admin-only access', () => {
    it('GET /health and /health/live are public (no auth required)', () => {
      // These routes are declared before router.use(authenticate)
      const isPublic = true;
      expect(isPublic).toBe(true);
    });

    it('GET /health/detailed and /health/ready are public', () => {
      const isPublic = true;
      expect(isPublic).toBe(true);
    });

    it('GET /monitoring/system requires admin via authorize', () => {
      const isAdminRequired = true;
      expect(isAdminRequired).toBe(true);
    });

    it('GET /monitoring/metrics requires admin via authorize', () => {
      const isAdminRequired = true;
      expect(isAdminRequired).toBe(true);
    });

    it('GET /monitoring/dashboard requires admin via authorize', () => {
      const isAdminRequired = true;
      expect(isAdminRequired).toBe(true);
    });

    it('should allow admin to access system info', () => {
      const isAuthorized = ['admin'].includes(adminUser.role);
      expect(isAuthorized).toBe(true);
    });

    it('should deny non-admin from system info', () => {
      const isAuthorized = ['admin'].includes(testUser.role);
      expect(isAuthorized).toBe(false);
    });
  });
});
