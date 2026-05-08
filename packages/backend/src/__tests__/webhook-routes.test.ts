/**
 * Webhook Routes Integration Tests
 *
 * Tests all webhook-related endpoints for correct behavior including:
 * - GET /webhooks — list all webhooks
 * - POST /webhooks — create a new webhook
 * - GET /webhooks/:id — get webhook by ID
 * - PUT /webhooks/:id — update webhook
 * - DELETE /webhooks/:id — delete webhook
 * - POST /webhooks/:id/toggle — toggle webhook active status
 * - POST /webhooks/:id/test — send test webhook
 * - POST /webhooks/:id/regenerate-secret — regenerate secret
 * - GET /webhooks/:id/events — get webhook events
 * - GET /webhooks/:id/stats — get webhook statistics
 * - GET /webhooks/:id/delivery-rate — get delivery rate
 * - GET /webhooks/failed — get failed events
 * - Auth guard (401 without token)
 * - Role guard (403 for non-admin/non-partner)
 */

import cookieParser from 'cookie-parser';
import express, { type Application, type Request, type Response, type NextFunction } from 'express';
import request from 'supertest';

// ==================== MOCKS ====================

// Mock logger before anything else
jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  createModuleLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

// Mock database client
const mockPrisma = {
  $transaction: jest.fn(),
  $disconnect: jest.fn(),
};

jest.mock('../database/client', () => ({
  prisma: mockPrisma,
}));

// Mock webhook repository
const mockWebhookRepository = {
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  toggle: jest.fn(),
  getEvents: jest.fn(),
  getEventStats: jest.fn(),
  getDeliveryRate: jest.fn(),
  getFailedEvents: jest.fn(),
  deleteOldEvents: jest.fn(),
  createEvent: jest.fn(),
  count: jest.fn(),
};

jest.mock('../repositories/webhook-repository', () => ({
  WebhookRepository: jest.fn().mockImplementation(() => mockWebhookRepository),
}));

// Mock webhook middleware (generateWebhookSignature)
jest.mock('../api/middleware/webhook-middleware', () => ({
  generateWebhookSignature: jest.fn().mockReturnValue({
    signature: 'sha256=mock-signature',
    timestamp: '1700000000',
  }),
}));

// Mock config
jest.mock('../config/app-config', () => ({
  config: {
    corsOrigins: ['http://localhost:3000'],
    env: 'test',
    port: 3000,
    version: '1.0.0',
    rateLimit: { maxRequests: 100 },
  },
}));

// Mock token blacklist
jest.mock('../auth/token-blacklist', () => ({
  getTokenBlacklist: jest.fn(() => ({
    addToBlacklist: jest.fn().mockResolvedValue(undefined),
    isBlacklisted: jest.fn().mockResolvedValue(false),
    isUserBlacklisted: jest.fn().mockResolvedValue(false),
  })),
  getTokenExpiration: jest.fn(() => new Date(Date.now() + 3600000)),
  getTokenIssuedAt: jest.fn(() => new Date()),
}));

// Mock JWT service
jest.mock('../auth/jwt.service', () => ({
  jwtService: {
    verifyAccessToken: jest.fn().mockReturnValue({
      userId: 'admin-user-1',
      email: 'admin@test.com',
      role: 'admin',
    }),
    generateTokens: jest.fn(),
  },
}));

// ==================== AUTH MIDDLEWARE MOCK ====================

let currentTestUser: { userId: string; email: string; role: string } = {
  userId: 'admin-user-1',
  email: 'admin@test.com',
  role: 'admin',
};

jest.mock('../api/middleware/auth-middleware', () => {
  const { UnauthorizedError } = require('@kitchenxpert/common');

  return {
    authenticate: jest.fn((req: any, _res: any, next: any) => {
      if (req.cookies?.accessToken || req.headers.authorization) {
        req.user = { ...currentTestUser };
        next();
      } else {
        next(new UnauthorizedError('Authentication required'));
      }
    }),
    authorize: (roles: string[]) => (req: any, _res: any, next: any) => {
      if (!req.user) {
        return next(new UnauthorizedError('Authentication required'));
      }
      if (!roles.includes(req.user.role)) {
        const { ForbiddenError } = require('@kitchenxpert/common');
        return next(new ForbiddenError('Access denied'));
      }
      next();
    },
    requireRole: (...roles: string[]) => (req: any, _res: any, next: any) => {
      if (!req.user) {
        return next(new UnauthorizedError('Authentication required'));
      }
      if (!roles.includes(req.user.role)) {
        const { ForbiddenError } = require('@kitchenxpert/common');
        return next(new ForbiddenError('Access denied'));
      }
      next();
    },
  };
});

// Mock rate limiters
jest.mock('../api/middleware/rate-limit-middleware', () => ({
  generalRateLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

// Import after mocks
import { errorHandler } from '../api/middleware/error-middleware';
import webhookRoutes from '../api/routes/webhook-routes';

// ==================== TEST APP SETUP ====================

function createTestApp(): Application {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/webhooks', webhookRoutes);
  app.use(errorHandler);
  return app;
}

function authedRequest(app: Application) {
  return {
    get: (url: string) =>
      request(app).get(url).set('Cookie', ['accessToken=test-token']),
    post: (url: string) =>
      request(app).post(url).set('Cookie', ['accessToken=test-token']),
    put: (url: string) =>
      request(app).put(url).set('Cookie', ['accessToken=test-token']),
    delete: (url: string) =>
      request(app).delete(url).set('Cookie', ['accessToken=test-token']),
  };
}

// ==================== FIXTURES ====================

const validUuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

const mockWebhook = {
  id: 'webhook-1',
  partnerId: validUuid,
  name: 'Test Webhook',
  url: 'https://example.com/webhook',
  secret: 'super-secret-key',
  events: ['order.created', 'order.updated'],
  headers: { 'X-Custom': 'value' },
  isActive: true,
  retryCount: 3,
  timeout: 5000,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const otherWebhook = {
  id: 'webhook-2',
  partnerId: 'other-partner-id',
  name: 'Other Webhook',
  url: 'https://other.com/webhook',
  secret: 'other-secret',
  events: ['kitchen.updated'],
  headers: null,
  isActive: false,
  retryCount: 5,
  timeout: 10000,
  createdAt: new Date('2024-02-01'),
  updatedAt: new Date('2024-02-01'),
};

// ==================== TESTS ====================

describe('Webhook Routes', () => {
  let app: Application;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    currentTestUser = { userId: 'admin-user-1', email: 'admin@test.com', role: 'admin' };
  });

  // ==================== AUTH GUARD ====================

  describe('Authentication guard', () => {
    it('should return 401 for unauthenticated request to GET /webhooks', async () => {
      const response = await request(app)
        .get('/webhooks')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 for unauthenticated request to POST /webhooks', async () => {
      const response = await request(app)
        .post('/webhooks')
        .send({ name: 'Test' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== ROLE GUARD ====================

  describe('Role guard', () => {
    it('should return 403 for regular user accessing webhooks', async () => {
      currentTestUser = { userId: 'user-1', email: 'user@test.com', role: 'user' };

      const response = await authedRequest(app)
        .get('/webhooks')
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should allow partner to access webhooks', async () => {
      currentTestUser = { userId: 'partner-1', email: 'partner@test.com', role: 'partner' };
      mockWebhookRepository.findAll.mockResolvedValue([mockWebhook]);

      const response = await authedRequest(app)
        .get('/webhooks')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  // ==================== GET /webhooks ====================

  describe('GET /webhooks', () => {
    it('should list all webhooks for admin', async () => {
      mockWebhookRepository.findAll.mockResolvedValue([mockWebhook, otherWebhook]);

      const response = await authedRequest(app)
        .get('/webhooks')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should strip secret from webhook data', async () => {
      mockWebhookRepository.findAll.mockResolvedValue([mockWebhook]);

      const response = await authedRequest(app)
        .get('/webhooks')
        .expect(200);

      expect(response.body.data[0].secret).toBeUndefined();
      expect(response.body.data[0].name).toBe('Test Webhook');
    });
  });

  // ==================== POST /webhooks ====================

  describe('POST /webhooks', () => {
    const validWebhook = {
      partnerId: validUuid,
      name: 'New Webhook',
      url: 'https://example.com/hook',
      events: ['order.created'],
    };

    it('should create a webhook successfully and return 201', async () => {
      const created = { id: 'new-webhook', ...validWebhook, secret: 'generated-secret', isActive: true };
      mockWebhookRepository.create.mockResolvedValue(created);

      const response = await authedRequest(app)
        .post('/webhooks')
        .send(validWebhook)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('New Webhook');
      expect(response.body.data.secret).toBeUndefined();
      expect(response.body.message).toContain('created');
    });

    it('should return 400 when name is missing', async () => {
      const response = await authedRequest(app)
        .post('/webhooks')
        .send({ partnerId: validUuid, url: 'https://example.com/hook', events: ['test'] })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when URL is invalid', async () => {
      const response = await authedRequest(app)
        .post('/webhooks')
        .send({ ...validWebhook, url: 'not-a-url' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when events array is empty', async () => {
      const response = await authedRequest(app)
        .post('/webhooks')
        .send({ ...validWebhook, events: [] })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when partnerId is not a valid UUID', async () => {
      const response = await authedRequest(app)
        .post('/webhooks')
        .send({ ...validWebhook, partnerId: 'not-a-uuid' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should accept optional retryCount and timeout', async () => {
      const created = { id: 'new-webhook', ...validWebhook, secret: 's', retryCount: 5, timeout: 10000 };
      mockWebhookRepository.create.mockResolvedValue(created);

      const response = await authedRequest(app)
        .post('/webhooks')
        .send({ ...validWebhook, retryCount: 5, timeout: 10000 })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should return 400 when retryCount exceeds maximum (10)', async () => {
      const response = await authedRequest(app)
        .post('/webhooks')
        .send({ ...validWebhook, retryCount: 11 })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== GET /webhooks/:id ====================

  describe('GET /webhooks/:id', () => {
    it('should return webhook by ID for admin', async () => {
      mockWebhookRepository.findById.mockResolvedValue(mockWebhook);

      const response = await authedRequest(app)
        .get('/webhooks/webhook-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test Webhook');
      expect(response.body.data.secret).toBeUndefined();
    });

    it('should return 404 for non-existent webhook', async () => {
      mockWebhookRepository.findById.mockResolvedValue(null);

      const response = await authedRequest(app)
        .get('/webhooks/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Webhook not found');
    });
  });

  // ==================== PUT /webhooks/:id ====================

  describe('PUT /webhooks/:id', () => {
    it('should update a webhook successfully', async () => {
      mockWebhookRepository.findById.mockResolvedValue(mockWebhook);
      const updated = { ...mockWebhook, name: 'Updated Webhook' };
      mockWebhookRepository.update.mockResolvedValue(updated);

      const response = await authedRequest(app)
        .put('/webhooks/webhook-1')
        .send({ name: 'Updated Webhook' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('updated');
    });

    it('should return 404 for non-existent webhook', async () => {
      mockWebhookRepository.findById.mockResolvedValue(null);

      const response = await authedRequest(app)
        .put('/webhooks/nonexistent')
        .send({ name: 'Test' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when update URL is invalid', async () => {
      const response = await authedRequest(app)
        .put('/webhooks/webhook-1')
        .send({ url: 'not-a-url' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should allow toggling isActive via update', async () => {
      mockWebhookRepository.findById.mockResolvedValue(mockWebhook);
      const updated = { ...mockWebhook, isActive: false };
      mockWebhookRepository.update.mockResolvedValue(updated);

      const response = await authedRequest(app)
        .put('/webhooks/webhook-1')
        .send({ isActive: false })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  // ==================== DELETE /webhooks/:id ====================

  describe('DELETE /webhooks/:id', () => {
    it('should delete a webhook successfully', async () => {
      mockWebhookRepository.findById.mockResolvedValue(mockWebhook);
      mockWebhookRepository.delete.mockResolvedValue(mockWebhook);

      const response = await authedRequest(app)
        .delete('/webhooks/webhook-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');
      expect(mockWebhookRepository.delete).toHaveBeenCalledWith('webhook-1');
    });

    it('should return 404 for non-existent webhook', async () => {
      mockWebhookRepository.findById.mockResolvedValue(null);

      const response = await authedRequest(app)
        .delete('/webhooks/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== POST /webhooks/:id/toggle ====================

  describe('POST /webhooks/:id/toggle', () => {
    it('should toggle webhook active status', async () => {
      mockWebhookRepository.findById.mockResolvedValue(mockWebhook);
      mockWebhookRepository.toggle.mockResolvedValue({ ...mockWebhook, isActive: false });

      const response = await authedRequest(app)
        .post('/webhooks/webhook-1/toggle')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deactivated');
    });

    it('should return 404 for non-existent webhook', async () => {
      mockWebhookRepository.findById.mockResolvedValue(null);

      const response = await authedRequest(app)
        .post('/webhooks/nonexistent/toggle')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== POST /webhooks/:id/test ====================

  describe('POST /webhooks/:id/test', () => {
    it('should return 404 for non-existent webhook', async () => {
      mockWebhookRepository.findById.mockResolvedValue(null);

      const response = await authedRequest(app)
        .post('/webhooks/nonexistent/test')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Webhook not found');
    });
  });

  // ==================== POST /webhooks/:id/regenerate-secret ====================

  describe('POST /webhooks/:id/regenerate-secret', () => {
    it('should regenerate webhook secret', async () => {
      mockWebhookRepository.findById.mockResolvedValue(mockWebhook);
      mockWebhookRepository.update.mockResolvedValue(mockWebhook);

      const response = await authedRequest(app)
        .post('/webhooks/webhook-1/regenerate-secret')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.secret).toBeDefined();
      expect(response.body.message).toContain('regenerated');
    });

    it('should return 404 for non-existent webhook', async () => {
      mockWebhookRepository.findById.mockResolvedValue(null);

      const response = await authedRequest(app)
        .post('/webhooks/nonexistent/regenerate-secret')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== GET /webhooks/:id/events ====================

  describe('GET /webhooks/:id/events', () => {
    it('should return events for a webhook', async () => {
      mockWebhookRepository.findById.mockResolvedValue(mockWebhook);
      const mockEvents = [
        { id: 'event-1', webhookId: 'webhook-1', eventType: 'order.created', statusCode: 200 },
        { id: 'event-2', webhookId: 'webhook-1', eventType: 'order.updated', statusCode: 500 },
      ];
      mockWebhookRepository.getEvents.mockResolvedValue(mockEvents);

      const response = await authedRequest(app)
        .get('/webhooks/webhook-1/events')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should return 404 for non-existent webhook', async () => {
      mockWebhookRepository.findById.mockResolvedValue(null);

      const response = await authedRequest(app)
        .get('/webhooks/nonexistent/events')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== GET /webhooks/:id/stats ====================

  describe('GET /webhooks/:id/stats', () => {
    it('should return webhook statistics', async () => {
      mockWebhookRepository.findById.mockResolvedValue(mockWebhook);
      const mockStats = { total: 100, succeeded: 95, failed: 5 };
      mockWebhookRepository.getEventStats.mockResolvedValue(mockStats);

      const response = await authedRequest(app)
        .get('/webhooks/webhook-1/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBe(100);
    });

    it('should return 404 for non-existent webhook', async () => {
      mockWebhookRepository.findById.mockResolvedValue(null);

      const response = await authedRequest(app)
        .get('/webhooks/nonexistent/stats')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== GET /webhooks/:id/delivery-rate ====================

  describe('GET /webhooks/:id/delivery-rate', () => {
    it('should return delivery rate', async () => {
      mockWebhookRepository.findById.mockResolvedValue(mockWebhook);
      mockWebhookRepository.getDeliveryRate.mockResolvedValue(95.5);

      const response = await authedRequest(app)
        .get('/webhooks/webhook-1/delivery-rate')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.deliveryRate).toBe(95.5);
    });

    it('should return 404 for non-existent webhook', async () => {
      mockWebhookRepository.findById.mockResolvedValue(null);

      const response = await authedRequest(app)
        .get('/webhooks/nonexistent/delivery-rate')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== GET /webhooks/failed ====================

  describe('GET /webhooks/failed', () => {
    it('should return failed webhook events', async () => {
      const failedEvents = [
        { id: 'event-1', webhookId: 'webhook-1', error: 'Connection timeout', attempts: 3 },
      ];
      mockWebhookRepository.getFailedEvents.mockResolvedValue(failedEvents);

      const response = await authedRequest(app)
        .get('/webhooks/failed')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });

    it('should pass maxAttempts query parameter', async () => {
      mockWebhookRepository.getFailedEvents.mockResolvedValue([]);

      await authedRequest(app)
        .get('/webhooks/failed?maxAttempts=5')
        .expect(200);

      expect(mockWebhookRepository.getFailedEvents).toHaveBeenCalledWith(5);
    });
  });

  // ==================== EDGE CASES ====================

  describe('Edge cases', () => {
    it('should handle concurrent requests gracefully', async () => {
      mockWebhookRepository.findAll.mockResolvedValue([]);

      const results = await Promise.all([
        authedRequest(app).get('/webhooks'),
        authedRequest(app).get('/webhooks'),
        authedRequest(app).get('/webhooks'),
      ]);

      results.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });
});
