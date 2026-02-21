/**
 * Partner Routes Integration Tests
 *
 * Tests all partner-related endpoints for correct behavior including:
 * - GET /partners — get all partners (admin only)
 * - GET /partners/count — get partner count (admin only)
 * - GET /partners/:id — get partner by ID (admin only)
 * - GET /partners/code/:code — get partner by code (admin only)
 * - POST /partners — create a new partner (admin only)
 * - PUT /partners/:id — update a partner (admin only)
 * - DELETE /partners/:id — delete a partner (admin only)
 * - POST /partners/:id/toggle — toggle active status (admin only)
 * - POST /partners/:id/regenerate-credentials — regenerate API creds (admin only)
 * - POST /partners/validate — validate partner credentials (admin only)
 * - GET /partners/:id/integrations — get integrations (admin only)
 * - POST /partners/:id/integrations — create integration (admin only)
 * - PUT /partners/:partnerId/integrations/:integrationId — update integration (admin only)
 * - DELETE /partners/:partnerId/integrations/:integrationId — delete integration (admin only)
 * - POST /partners/:partnerId/integrations/:integrationId/sync — mark synced (admin only)
 * - GET /partners/integrations/type/:type — get integrations by type (admin only)
 * - Auth guard (401 without token, 403 for non-admin)
 * - SSRF prevention for integration endpoints
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

// Mock partner repository
const mockPartnerRepository = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByCode: jest.fn(),
  findByEmail: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  toggle: jest.fn(),
  validateCredentials: jest.fn(),
  count: jest.fn(),
  getIntegrations: jest.fn(),
  createIntegration: jest.fn(),
  findIntegrationByIdAndPartner: jest.fn(),
  updateIntegration: jest.fn(),
  deleteIntegration: jest.fn(),
  markIntegrationSynced: jest.fn(),
  getIntegrationsByType: jest.fn(),
};

jest.mock('../../repositories/partner-repository', () => ({
  PartnerRepository: jest.fn(() => mockPartnerRepository),
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
import partnerRoutes from '../../api/routes/partner-routes';
import { errorHandler } from '../../api/middleware/error-middleware';

// ==================== TEST APP SETUP ====================

function createTestApp(): Application {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/partners', partnerRoutes);
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

const mockPartner = {
  id: 'partner-1',
  name: 'Kitchen Pro',
  code: 'KPRO',
  email: 'contact@kitchenpro.com',
  phone: '+33612345678',
  website: 'https://kitchenpro.com',
  apiKey: 'abc123key',
  apiSecret: 'secret456',
  commissionRate: 10,
  isActive: true,
  configuration: {},
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockPartner2 = {
  id: 'partner-2',
  name: 'Design Kitchens',
  code: 'DK',
  email: 'info@designkitchens.com',
  phone: '+33698765432',
  website: 'https://designkitchens.com',
  apiKey: 'xyz789key',
  apiSecret: 'secret012',
  commissionRate: 15,
  isActive: false,
  configuration: {},
  createdAt: new Date('2024-02-01'),
  updatedAt: new Date('2024-02-01'),
};

const mockIntegration = {
  id: 'integration-1',
  partnerId: 'partner-1',
  type: 'webhook',
  endpoint: 'https://example.com/webhook',
  credentials: {},
  configuration: {},
  isActive: true,
  lastSyncedAt: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

// ==================== TESTS ====================

describe('Partner Routes', () => {
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
    it('should return 401 for unauthenticated request to GET /partners', async () => {
      const response = await request(app)
        .get('/partners')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 for unauthenticated request to POST /partners', async () => {
      const response = await request(app)
        .post('/partners')
        .send({ name: 'Test', code: 'TST', email: 'test@test.com' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 for non-admin user on GET /partners', async () => {
      currentTestUser = { userId: 'test-user-1', email: 'test@test.com', role: 'user' };

      const response = await authedRequest(app)
        .get('/partners')
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 for non-admin user on POST /partners', async () => {
      currentTestUser = { userId: 'test-user-1', email: 'test@test.com', role: 'user' };

      const response = await authedRequest(app)
        .post('/partners')
        .send({ name: 'Test', code: 'TST', email: 'test@test.com' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== GET /partners ====================

  describe('GET /partners', () => {
    it('should return all partners', async () => {
      mockPartnerRepository.findAll.mockResolvedValue([mockPartner, mockPartner2]);

      const response = await authedRequest(app)
        .get('/partners')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should filter by isActive', async () => {
      mockPartnerRepository.findAll.mockResolvedValue([mockPartner]);

      const response = await authedRequest(app)
        .get('/partners?isActive=true')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockPartnerRepository.findAll).toHaveBeenCalledWith(true);
    });
  });

  // ==================== GET /partners/count ====================

  describe('GET /partners/count', () => {
    it('should return partner count', async () => {
      mockPartnerRepository.count.mockResolvedValue(5);

      const response = await authedRequest(app)
        .get('/partners/count')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.count).toBe(5);
    });

    it('should return active partner count when filtered', async () => {
      mockPartnerRepository.count.mockResolvedValue(3);

      const response = await authedRequest(app)
        .get('/partners/count?isActive=true')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockPartnerRepository.count).toHaveBeenCalledWith(true);
    });
  });

  // ==================== GET /partners/:id ====================

  describe('GET /partners/:id', () => {
    it('should return partner by ID', async () => {
      mockPartnerRepository.findById.mockResolvedValue(mockPartner);

      const response = await authedRequest(app)
        .get('/partners/partner-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Kitchen Pro');
    });

    it('should return 404 for non-existent partner', async () => {
      mockPartnerRepository.findById.mockResolvedValue(null);

      const response = await authedRequest(app)
        .get('/partners/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== GET /partners/code/:code ====================

  describe('GET /partners/code/:code', () => {
    it('should return partner by code', async () => {
      mockPartnerRepository.findByCode.mockResolvedValue(mockPartner);

      const response = await authedRequest(app)
        .get('/partners/code/KPRO')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.code).toBe('KPRO');
    });

    it('should return 404 for unknown code', async () => {
      mockPartnerRepository.findByCode.mockResolvedValue(null);

      const response = await authedRequest(app)
        .get('/partners/code/UNKNOWN')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== POST /partners ====================

  describe('POST /partners', () => {
    it('should create a partner successfully', async () => {
      mockPartnerRepository.findByCode.mockResolvedValue(null);
      mockPartnerRepository.findByEmail.mockResolvedValue(null);
      mockPartnerRepository.create.mockResolvedValue(mockPartner);

      const response = await authedRequest(app)
        .post('/partners')
        .send({ name: 'Kitchen Pro', code: 'KPRO', email: 'contact@kitchenpro.com' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('created');
    });

    it('should return 409 when partner code already exists', async () => {
      mockPartnerRepository.findByCode.mockResolvedValue(mockPartner);

      const response = await authedRequest(app)
        .post('/partners')
        .send({ name: 'Kitchen Pro', code: 'KPRO', email: 'new@email.com' })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('code already exists');
    });

    it('should return 409 when partner email already exists', async () => {
      mockPartnerRepository.findByCode.mockResolvedValue(null);
      mockPartnerRepository.findByEmail.mockResolvedValue(mockPartner);

      const response = await authedRequest(app)
        .post('/partners')
        .send({ name: 'New Partner', code: 'NEW', email: 'contact@kitchenpro.com' })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('email already exists');
    });

    it('should return 400 for invalid body (missing name)', async () => {
      const response = await authedRequest(app)
        .post('/partners')
        .send({ code: 'TST', email: 'test@test.com' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid email format', async () => {
      const response = await authedRequest(app)
        .post('/partners')
        .send({ name: 'Test', code: 'TST', email: 'not-an-email' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== PUT /partners/:id ====================

  describe('PUT /partners/:id', () => {
    it('should update a partner successfully', async () => {
      const updated = { ...mockPartner, name: 'Kitchen Pro Plus' };
      mockPartnerRepository.update.mockResolvedValue(updated);

      const response = await authedRequest(app)
        .put('/partners/partner-1')
        .send({ name: 'Kitchen Pro Plus' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Kitchen Pro Plus');
    });
  });

  // ==================== DELETE /partners/:id ====================

  describe('DELETE /partners/:id', () => {
    it('should delete a partner successfully', async () => {
      mockPartnerRepository.delete.mockResolvedValue(undefined);

      const response = await authedRequest(app)
        .delete('/partners/partner-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');
    });
  });

  // ==================== POST /partners/:id/toggle ====================

  describe('POST /partners/:id/toggle', () => {
    it('should toggle partner active status to inactive', async () => {
      mockPartnerRepository.toggle.mockResolvedValue({ ...mockPartner, isActive: false });

      const response = await authedRequest(app)
        .post('/partners/partner-1/toggle')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deactivated');
    });

    it('should toggle partner active status to active', async () => {
      mockPartnerRepository.toggle.mockResolvedValue({ ...mockPartner2, isActive: true });

      const response = await authedRequest(app)
        .post('/partners/partner-2/toggle')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('activated');
    });
  });

  // ==================== POST /partners/:id/regenerate-credentials ====================

  describe('POST /partners/:id/regenerate-credentials', () => {
    it('should regenerate API credentials', async () => {
      mockPartnerRepository.update.mockResolvedValue(mockPartner);

      const response = await authedRequest(app)
        .post('/partners/partner-1/regenerate-credentials')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('apiKey');
      expect(response.body.data).toHaveProperty('apiSecret');
      expect(response.body.message).toContain('regenerated');
    });
  });

  // ==================== POST /partners/validate ====================

  describe('POST /partners/validate', () => {
    it('should validate correct credentials', async () => {
      mockPartnerRepository.validateCredentials.mockResolvedValue(mockPartner);

      const response = await authedRequest(app)
        .post('/partners/validate')
        .send({ apiKey: 'abc123key', apiSecret: 'secret456' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.partnerId).toBe('partner-1');
    });

    it('should return 401 for invalid credentials', async () => {
      mockPartnerRepository.validateCredentials.mockResolvedValue(null);

      const response = await authedRequest(app)
        .post('/partners/validate')
        .send({ apiKey: 'wrong', apiSecret: 'wrong' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid credentials');
    });

    it('should return 400 for missing credentials in body', async () => {
      const response = await authedRequest(app)
        .post('/partners/validate')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== INTEGRATIONS ====================

  describe('GET /partners/:id/integrations', () => {
    it('should return integrations for a partner', async () => {
      mockPartnerRepository.getIntegrations.mockResolvedValue([mockIntegration]);

      const response = await authedRequest(app)
        .get('/partners/partner-1/integrations')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });
  });

  describe('POST /partners/:id/integrations', () => {
    it('should create an integration successfully', async () => {
      mockPartnerRepository.findById.mockResolvedValue(mockPartner);
      mockPartnerRepository.createIntegration.mockResolvedValue(mockIntegration);

      const response = await authedRequest(app)
        .post('/partners/partner-1/integrations')
        .send({ type: 'webhook', endpoint: 'https://example.com/webhook' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Integration created');
    });

    it('should return 404 when partner does not exist', async () => {
      mockPartnerRepository.findById.mockResolvedValue(null);

      const response = await authedRequest(app)
        .post('/partners/nonexistent/integrations')
        .send({ type: 'webhook', endpoint: 'https://example.com/webhook' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should reject integration with localhost endpoint (SSRF prevention)', async () => {
      mockPartnerRepository.findById.mockResolvedValue(mockPartner);

      const response = await authedRequest(app)
        .post('/partners/partner-1/integrations')
        .send({ type: 'webhook', endpoint: 'http://localhost:8080/hook' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('private/internal');
    });

    it('should reject integration with private IP endpoint (SSRF prevention)', async () => {
      mockPartnerRepository.findById.mockResolvedValue(mockPartner);

      const response = await authedRequest(app)
        .post('/partners/partner-1/integrations')
        .send({ type: 'webhook', endpoint: 'http://192.168.1.1:8080/hook' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('private/internal');
    });

    it('should reject integration with metadata endpoint (SSRF prevention)', async () => {
      mockPartnerRepository.findById.mockResolvedValue(mockPartner);

      const response = await authedRequest(app)
        .post('/partners/partner-1/integrations')
        .send({ type: 'webhook', endpoint: 'http://169.254.169.254/latest/meta-data' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /partners/:partnerId/integrations/:integrationId', () => {
    it('should update an integration', async () => {
      mockPartnerRepository.findById.mockResolvedValue(mockPartner);
      mockPartnerRepository.findIntegrationByIdAndPartner.mockResolvedValue(mockIntegration);
      mockPartnerRepository.updateIntegration.mockResolvedValue({ ...mockIntegration, isActive: false });

      const response = await authedRequest(app)
        .put('/partners/partner-1/integrations/integration-1')
        .send({ isActive: false })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('updated');
    });

    it('should return 404 when partner not found for integration update', async () => {
      mockPartnerRepository.findById.mockResolvedValue(null);

      const response = await authedRequest(app)
        .put('/partners/nonexistent/integrations/integration-1')
        .send({ isActive: false })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 when integration does not belong to partner', async () => {
      mockPartnerRepository.findById.mockResolvedValue(mockPartner);
      mockPartnerRepository.findIntegrationByIdAndPartner.mockResolvedValue(null);

      const response = await authedRequest(app)
        .put('/partners/partner-1/integrations/wrong-integration')
        .send({ isActive: false })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Integration not found');
    });
  });

  describe('DELETE /partners/:partnerId/integrations/:integrationId', () => {
    it('should delete an integration', async () => {
      mockPartnerRepository.findIntegrationByIdAndPartner.mockResolvedValue(mockIntegration);
      mockPartnerRepository.deleteIntegration.mockResolvedValue(undefined);

      const response = await authedRequest(app)
        .delete('/partners/partner-1/integrations/integration-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');
    });

    it('should return 404 when integration not found for deletion', async () => {
      mockPartnerRepository.findIntegrationByIdAndPartner.mockResolvedValue(null);

      const response = await authedRequest(app)
        .delete('/partners/partner-1/integrations/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /partners/integrations/type/:type', () => {
    it('should return integrations by type', async () => {
      mockPartnerRepository.getIntegrationsByType.mockResolvedValue([mockIntegration]);

      const response = await authedRequest(app)
        .get('/partners/integrations/type/webhook')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });
  });
});
