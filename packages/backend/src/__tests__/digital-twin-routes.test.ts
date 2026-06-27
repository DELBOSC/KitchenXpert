/**
 * Digital Twin Routes Integration Tests
 *
 * Tests all digital twin endpoints for correct behavior including:
 * - POST /digital-twin — create a digital twin
 * - GET /digital-twin/:kitchenId — get digital twin
 * - PUT /digital-twin/:kitchenId/sync — sync digital twin
 * - GET /digital-twin/:kitchenId/maintenance — maintenance schedule
 * - Auth guard (401 without token)
 * - IDOR prevention (403 for non-owner)
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
  kitchen: {
    findUnique: jest.fn(),
  },
  digitalTwin: {
    findFirst: jest.fn(),
  },
  $transaction: jest.fn(),
  $disconnect: jest.fn(),
};

jest.mock('../database/client', () => ({
  prisma: mockPrisma,
}));

// Mock DigitalTwinService
const mockTwinService = {
  createDigitalTwin: jest.fn(),
  getMaintenanceSchedule: jest.fn(),
};

jest.mock('../services/digital-twin/digital-twin.service', () => ({
  DigitalTwinService: jest.fn().mockImplementation(() => mockTwinService),
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
      userId: 'test-user-1',
      email: 'test@test.com',
      role: 'user',
    }),
    generateTokens: jest.fn(),
  },
}));

// ==================== AUTH MIDDLEWARE MOCK ====================

let currentTestUser: { userId: string; email: string; role: string } = {
  userId: 'test-user-1',
  email: 'test@test.com',
  role: 'user',
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
    requireRole:
      (...roles: string[]) =>
      (req: any, _res: any, next: any) => {
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
import digitalTwinRoutes from '../api/routes/digital-twin-routes';

// ==================== TEST APP SETUP ====================

function createTestApp(): Application {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/digital-twin', digitalTwinRoutes);
  app.use(errorHandler);
  return app;
}

function authedRequest(app: Application) {
  return {
    get: (url: string) => request(app).get(url).set('Cookie', ['accessToken=test-token']),
    post: (url: string) => request(app).post(url).set('Cookie', ['accessToken=test-token']),
    put: (url: string) => request(app).put(url).set('Cookie', ['accessToken=test-token']),
    delete: (url: string) => request(app).delete(url).set('Cookie', ['accessToken=test-token']),
  };
}

// ==================== FIXTURES ====================

const mockKitchen = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'My Kitchen',
  userId: 'test-user-1',
  projectId: 'project-1',
  createdAt: new Date('2024-01-01'),
};

const otherUserKitchen = {
  id: '660e8400-e29b-41d4-a716-446655440001',
  name: 'Other Kitchen',
  userId: 'other-user-99',
  projectId: 'project-2',
  createdAt: new Date('2024-02-01'),
};

const mockTwinData = {
  items: [
    { name: 'Cabinet', type: 'base_cabinet', brand: 'IKEA' },
    { name: 'Oven', type: 'oven', brand: 'Bosch' },
  ],
  technicalPlan: {
    electricalCircuits: [{ id: 'circuit-1', name: 'Oven circuit' }],
    plumbingConnections: [{ id: 'plumb-1', name: 'Sink connection' }],
  },
};

const mockTwinRecord = {
  id: 'twin-1',
  kitchenId: '550e8400-e29b-41d4-a716-446655440000',
  installedAt: '2024-06-01T00:00:00.000Z',
  data: JSON.stringify(mockTwinData),
  createdAt: new Date('2024-06-01'),
  updatedAt: new Date('2024-06-01'),
};

const mockCreatedTwin = {
  id: 'twin-1',
  kitchenId: '550e8400-e29b-41d4-a716-446655440000',
  installedAt: new Date('2024-06-01'),
  items: mockTwinData.items,
  technicalPlan: mockTwinData.technicalPlan,
};

const mockMaintenanceSchedule = [
  { item: 'Oven', task: 'Clean filter', dueDate: '2025-01-01', priority: 'medium' },
  { item: 'Cabinet', task: 'Lubricate hinges', dueDate: '2025-03-01', priority: 'low' },
];

// ==================== TESTS ====================

describe('Digital Twin Routes', () => {
  let app: Application;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    currentTestUser = { userId: 'test-user-1', email: 'test@test.com', role: 'user' };
  });

  // ==================== AUTH GUARD ====================

  describe('Authentication guard', () => {
    it('should return 401 for unauthenticated request to POST /digital-twin', async () => {
      const response = await request(app)
        .post('/digital-twin')
        .send({ kitchenId: '550e8400-e29b-41d4-a716-446655440000' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 for unauthenticated request to GET /digital-twin/:kitchenId', async () => {
      const response = await request(app)
        .get('/digital-twin/550e8400-e29b-41d4-a716-446655440000')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 for unauthenticated request to PUT /digital-twin/:kitchenId/sync', async () => {
      const response = await request(app)
        .put('/digital-twin/550e8400-e29b-41d4-a716-446655440000/sync')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 for unauthenticated request to GET /digital-twin/:kitchenId/maintenance', async () => {
      const response = await request(app)
        .get('/digital-twin/550e8400-e29b-41d4-a716-446655440000/maintenance')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== POST /digital-twin ====================

  describe('POST /digital-twin', () => {
    it('should create a digital twin successfully and return 201', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);
      mockTwinService.createDigitalTwin.mockResolvedValue(mockCreatedTwin);

      const response = await authedRequest(app)
        .post('/digital-twin')
        .send({ kitchenId: '550e8400-e29b-41d4-a716-446655440000' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.kitchenId).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(mockTwinService.createDigitalTwin).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000'
      );
    });

    it('should return 400 when kitchenId is missing', async () => {
      const response = await authedRequest(app).post('/digital-twin').send({}).expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('kitchenId is required');
    });

    it('should return 404 when kitchen does not exist', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(null);

      const response = await authedRequest(app)
        .post('/digital-twin')
        .send({ kitchenId: '00000000-0000-0000-0000-000000000000' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Kitchen not found');
    });

    it('should return 403 when non-owner tries to create twin (IDOR prevention)', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(otherUserKitchen);

      const response = await authedRequest(app)
        .post('/digital-twin')
        .send({ kitchenId: '660e8400-e29b-41d4-a716-446655440001' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(JSON.stringify(response.body)).toContain('do not have access');
    });

    it('should allow admin to create twin for any kitchen', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockPrisma.kitchen.findUnique.mockResolvedValue(otherUserKitchen);
      mockTwinService.createDigitalTwin.mockResolvedValue(mockCreatedTwin);

      const response = await authedRequest(app)
        .post('/digital-twin')
        .send({ kitchenId: '660e8400-e29b-41d4-a716-446655440001' })
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  // ==================== GET /digital-twin/:kitchenId ====================

  describe('GET /digital-twin/:kitchenId', () => {
    it('should return digital twin for the kitchen owner', async () => {
      mockPrisma.digitalTwin.findFirst.mockResolvedValue(mockTwinRecord);
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);

      const response = await authedRequest(app)
        .get('/digital-twin/550e8400-e29b-41d4-a716-446655440000')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.kitchenId).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(response.body.data.items).toBeDefined();
    });

    it('should return 404 when digital twin does not exist', async () => {
      mockPrisma.digitalTwin.findFirst.mockResolvedValue(null);

      const response = await authedRequest(app)
        .get('/digital-twin/550e8400-e29b-41d4-a716-446655440000')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(JSON.stringify(response.body)).toContain('Digital twin not found');
    });

    it('should return 403 when non-owner tries to access twin (IDOR prevention)', async () => {
      mockPrisma.digitalTwin.findFirst.mockResolvedValue(mockTwinRecord);
      mockPrisma.kitchen.findUnique.mockResolvedValue(otherUserKitchen);

      const response = await authedRequest(app)
        .get('/digital-twin/660e8400-e29b-41d4-a716-446655440001')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(JSON.stringify(response.body)).toContain('do not have access');
    });

    it('should allow admin to access any digital twin', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockPrisma.digitalTwin.findFirst.mockResolvedValue(mockTwinRecord);
      mockPrisma.kitchen.findUnique.mockResolvedValue(otherUserKitchen);

      const response = await authedRequest(app)
        .get('/digital-twin/660e8400-e29b-41d4-a716-446655440001')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  // ==================== PUT /digital-twin/:kitchenId/sync ====================

  describe('PUT /digital-twin/:kitchenId/sync', () => {
    it('should sync digital twin successfully', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);
      mockTwinService.createDigitalTwin.mockResolvedValue(mockCreatedTwin);

      const response = await authedRequest(app)
        .put('/digital-twin/550e8400-e29b-41d4-a716-446655440000/sync')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.kitchenId).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(mockTwinService.createDigitalTwin).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000'
      );
    });

    it('should return 404 when kitchen does not exist', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(null);

      const response = await authedRequest(app)
        .put('/digital-twin/00000000-0000-0000-0000-000000000000/sync')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Kitchen not found');
    });

    it('should return 403 when non-owner tries to sync (IDOR prevention)', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(otherUserKitchen);

      const response = await authedRequest(app)
        .put('/digital-twin/660e8400-e29b-41d4-a716-446655440001/sync')
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should allow admin to sync any digital twin', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockPrisma.kitchen.findUnique.mockResolvedValue(otherUserKitchen);
      mockTwinService.createDigitalTwin.mockResolvedValue(mockCreatedTwin);

      const response = await authedRequest(app)
        .put('/digital-twin/660e8400-e29b-41d4-a716-446655440001/sync')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  // ==================== GET /digital-twin/:kitchenId/maintenance ====================

  describe('GET /digital-twin/:kitchenId/maintenance', () => {
    it('should return maintenance schedule for the kitchen owner', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);
      mockPrisma.digitalTwin.findFirst.mockResolvedValue(mockTwinRecord);
      mockTwinService.getMaintenanceSchedule.mockReturnValue(mockMaintenanceSchedule);

      const response = await authedRequest(app)
        .get('/digital-twin/550e8400-e29b-41d4-a716-446655440000/maintenance')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(mockTwinService.getMaintenanceSchedule).toHaveBeenCalled();
    });

    it('should return 404 when kitchen does not exist', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(null);

      const response = await authedRequest(app)
        .get('/digital-twin/00000000-0000-0000-0000-000000000000/maintenance')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Kitchen not found');
    });

    it('should return 404 when digital twin not found for kitchen', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);
      mockPrisma.digitalTwin.findFirst.mockResolvedValue(null);

      const response = await authedRequest(app)
        .get('/digital-twin/550e8400-e29b-41d4-a716-446655440000/maintenance')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(JSON.stringify(response.body)).toContain('Digital twin not found');
    });

    it('should return 403 when non-owner tries to access maintenance (IDOR prevention)', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(otherUserKitchen);

      const response = await authedRequest(app)
        .get('/digital-twin/660e8400-e29b-41d4-a716-446655440001/maintenance')
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should allow admin to access any maintenance schedule', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockPrisma.kitchen.findUnique.mockResolvedValue(otherUserKitchen);
      mockPrisma.digitalTwin.findFirst.mockResolvedValue(mockTwinRecord);
      mockTwinService.getMaintenanceSchedule.mockReturnValue(mockMaintenanceSchedule);

      const response = await authedRequest(app)
        .get('/digital-twin/660e8400-e29b-41d4-a716-446655440001/maintenance')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  // ==================== EDGE CASES ====================

  describe('Edge cases', () => {
    it('should handle concurrent requests gracefully', async () => {
      mockPrisma.digitalTwin.findFirst.mockResolvedValue(mockTwinRecord);
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);

      const results = await Promise.all([
        authedRequest(app).get('/digital-twin/550e8400-e29b-41d4-a716-446655440000'),
        authedRequest(app).get('/digital-twin/550e8400-e29b-41d4-a716-446655440000'),
        authedRequest(app).get('/digital-twin/550e8400-e29b-41d4-a716-446655440000'),
      ]);

      results.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    it('should parse twin data JSON correctly', async () => {
      mockPrisma.digitalTwin.findFirst.mockResolvedValue(mockTwinRecord);
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);

      const response = await authedRequest(app)
        .get('/digital-twin/550e8400-e29b-41d4-a716-446655440000')
        .expect(200);

      expect(response.body.data.items).toEqual(mockTwinData.items);
      expect(response.body.data.technicalPlan).toEqual(mockTwinData.technicalPlan);
    });
  });
});
