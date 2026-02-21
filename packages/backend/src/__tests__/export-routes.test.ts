/**
 * Export Routes Integration Tests
 *
 * Tests all export-related endpoints for correct behavior including:
 * - GET /export/:entity — export entity data as CSV or JSON (admin only)
 * - Auth guard (401 without token, 403 for non-admin)
 * - Validation (invalid entity, invalid format)
 * - CSV and JSON format responses
 * - Content-Disposition headers
 * - Error handling (export failure)
 */

import request from 'supertest';
import express, { Application, Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';

// ==================== MOCKS ====================

// Mock logger before anything else
jest.mock('../../utils/logger', () => ({
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

// Mock ExportService
const mockExportData = jest.fn();

jest.mock('../../services/export.service', () => ({
  ExportService: {
    exportData: (...args: any[]) => mockExportData(...args),
  },
  // Re-export types used by route
}));

// Mock database client
const mockPrisma = {
  $disconnect: jest.fn(),
};

jest.mock('../../database/client', () => ({
  prisma: mockPrisma,
}));

// Mock config
jest.mock('../../config/app-config', () => ({
  config: {
    corsOrigins: ['http://localhost:3000'],
    env: 'test',
    port: 3000,
    version: '1.0.0',
    rateLimit: { maxRequests: 100 },
  },
}));

// Mock token blacklist
jest.mock('../../auth/token-blacklist', () => ({
  getTokenBlacklist: jest.fn(() => ({
    addToBlacklist: jest.fn().mockResolvedValue(undefined),
    isBlacklisted: jest.fn().mockResolvedValue(false),
    isUserBlacklisted: jest.fn().mockResolvedValue(false),
  })),
  getTokenExpiration: jest.fn(() => new Date(Date.now() + 3600000)),
  getTokenIssuedAt: jest.fn(() => new Date()),
}));

// Mock JWT service
jest.mock('../../auth/jwt.service', () => ({
  jwtService: {
    verifyAccessToken: jest.fn().mockReturnValue({
      userId: 'test-user-1',
      email: 'test@test.com',
      role: 'user',
    }),
    generateTokens: jest.fn(),
  },
}));

// ==================== AUTH MIDDLEWARE MOCK ====================

let currentTestUser: { userId: string; email: string; role: string } = {
  userId: 'admin-1',
  email: 'admin@test.com',
  role: 'admin',
};

jest.mock('../../api/middleware/auth-middleware', () => {
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
jest.mock('../../api/middleware/rate-limit-middleware', () => ({
  generalRateLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

// Import after mocks
import exportRoutes from '../../api/routes/export-routes';
import { errorHandler } from '../../api/middleware/error-middleware';

// ==================== TEST APP SETUP ====================

function createTestApp(): Application {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/export', exportRoutes);
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

const mockCsvResult = {
  data: '\ufeffid,email,name\n1,john@test.com,John\n2,jane@test.com,Jane',
  filename: 'users_export_2024-01-15.csv',
  contentType: 'text/csv; charset=utf-8',
};

const mockJsonResult = {
  data: JSON.stringify([
    { id: '1', email: 'john@test.com', name: 'John' },
    { id: '2', email: 'jane@test.com', name: 'Jane' },
  ], null, 2),
  filename: 'users_export_2024-01-15.json',
  contentType: 'application/json',
};

const mockOrdersCsvResult = {
  data: '\ufeffid,orderNumber,total\n1,ORD-001,1500\n2,ORD-002,2300',
  filename: 'orders_export_2024-01-15.csv',
  contentType: 'text/csv; charset=utf-8',
};

// ==================== TESTS ====================

describe('Export Routes', () => {
  let app: Application;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
  });

  // ==================== AUTH GUARD ====================

  describe('Authentication guard', () => {
    it('should return 401 for unauthenticated request to GET /export/users', async () => {
      const response = await request(app)
        .get('/export/users')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 for unauthenticated request to GET /export/orders', async () => {
      const response = await request(app)
        .get('/export/orders')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 for non-admin user on GET /export/users', async () => {
      currentTestUser = { userId: 'test-user-1', email: 'test@test.com', role: 'user' };

      const response = await authedRequest(app)
        .get('/export/users')
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 for non-admin user on GET /export/orders', async () => {
      currentTestUser = { userId: 'test-user-1', email: 'test@test.com', role: 'user' };

      const response = await authedRequest(app)
        .get('/export/orders')
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 for non-admin user on GET /export/projects', async () => {
      currentTestUser = { userId: 'test-user-1', email: 'test@test.com', role: 'user' };

      const response = await authedRequest(app)
        .get('/export/projects')
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== GET /export/:entity (CSV) ====================

  describe('GET /export/:entity (CSV format)', () => {
    it('should export users as CSV by default', async () => {
      mockExportData.mockResolvedValue(mockCsvResult);

      const response = await authedRequest(app)
        .get('/export/users')
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('users_export');
      expect(response.headers['content-disposition']).toContain('.csv');
      expect(mockExportData).toHaveBeenCalledWith('users', 'csv');
    });

    it('should export orders as CSV', async () => {
      mockExportData.mockResolvedValue(mockOrdersCsvResult);

      const response = await authedRequest(app)
        .get('/export/orders?format=csv')
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(mockExportData).toHaveBeenCalledWith('orders', 'csv');
    });

    it('should export projects as CSV', async () => {
      mockExportData.mockResolvedValue({
        data: '\ufeffid,name\n1,Kitchen Reno',
        filename: 'projects_export_2024-01-15.csv',
        contentType: 'text/csv; charset=utf-8',
      });

      const response = await authedRequest(app)
        .get('/export/projects?format=csv')
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(mockExportData).toHaveBeenCalledWith('projects', 'csv');
    });

    it('should export kitchens as CSV', async () => {
      mockExportData.mockResolvedValue({
        data: '\ufeffid,name,style\n1,My Kitchen,modern',
        filename: 'kitchens_export_2024-01-15.csv',
        contentType: 'text/csv; charset=utf-8',
      });

      const response = await authedRequest(app)
        .get('/export/kitchens?format=csv')
        .expect(200);

      expect(mockExportData).toHaveBeenCalledWith('kitchens', 'csv');
    });

    it('should export products as CSV', async () => {
      mockExportData.mockResolvedValue({
        data: '\ufeffid,name,price\n1,Cabinet,150',
        filename: 'products_export_2024-01-15.csv',
        contentType: 'text/csv; charset=utf-8',
      });

      const response = await authedRequest(app)
        .get('/export/products?format=csv')
        .expect(200);

      expect(mockExportData).toHaveBeenCalledWith('products', 'csv');
    });
  });

  // ==================== GET /export/:entity (JSON) ====================

  describe('GET /export/:entity (JSON format)', () => {
    it('should export users as JSON', async () => {
      mockExportData.mockResolvedValue(mockJsonResult);

      const response = await authedRequest(app)
        .get('/export/users?format=json')
        .expect(200);

      expect(response.headers['content-type']).toContain('application/json');
      expect(response.headers['content-disposition']).toContain('users_export');
      expect(response.headers['content-disposition']).toContain('.json');
      expect(mockExportData).toHaveBeenCalledWith('users', 'json');
    });

    it('should export orders as JSON', async () => {
      mockExportData.mockResolvedValue({
        data: JSON.stringify([{ id: '1', orderNumber: 'ORD-001' }], null, 2),
        filename: 'orders_export_2024-01-15.json',
        contentType: 'application/json',
      });

      const response = await authedRequest(app)
        .get('/export/orders?format=json')
        .expect(200);

      expect(mockExportData).toHaveBeenCalledWith('orders', 'json');
    });
  });

  // ==================== VALIDATION ====================

  describe('Validation', () => {
    it('should return 400 for invalid entity', async () => {
      const response = await authedRequest(app)
        .get('/export/invalid-entity')
        .expect(400);

      expect(response.body.error).toContain('Invalid entity');
      expect(response.body.error).toContain('users');
    });

    it('should return 400 for unknown entity type', async () => {
      const response = await authedRequest(app)
        .get('/export/subscriptions')
        .expect(400);

      expect(response.body.error).toContain('Invalid entity');
    });

    it('should return 400 for invalid format', async () => {
      const response = await authedRequest(app)
        .get('/export/users?format=xml')
        .expect(400);

      expect(response.body.error).toContain('Invalid format');
    });

    it('should return 400 for another invalid format', async () => {
      const response = await authedRequest(app)
        .get('/export/users?format=pdf')
        .expect(400);

      expect(response.body.error).toContain('Invalid format');
    });
  });

  // ==================== ERROR HANDLING ====================

  describe('Error handling', () => {
    it('should return 500 when ExportService throws', async () => {
      mockExportData.mockRejectedValue(new Error('Database connection failed'));

      const response = await authedRequest(app)
        .get('/export/users')
        .expect(500);

      expect(response.body.error).toContain('Export failed');
    });

    it('should return 500 for unexpected service errors', async () => {
      mockExportData.mockRejectedValue(new Error('Unexpected error'));

      const response = await authedRequest(app)
        .get('/export/orders?format=json')
        .expect(500);

      expect(response.body.error).toContain('Export failed');
    });
  });

  // ==================== CONTENT HEADERS ====================

  describe('Content headers', () => {
    it('should set Content-Disposition header with attachment filename for CSV', async () => {
      mockExportData.mockResolvedValue(mockCsvResult);

      const response = await authedRequest(app)
        .get('/export/users')
        .expect(200);

      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('filename=');
    });

    it('should set Content-Disposition header with attachment filename for JSON', async () => {
      mockExportData.mockResolvedValue(mockJsonResult);

      const response = await authedRequest(app)
        .get('/export/users?format=json')
        .expect(200);

      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('filename=');
    });
  });
});
