/**
 * Design Version Routes Integration Tests
 *
 * Tests all design version endpoints for correct behavior including:
 * - POST /design-versions — create a version snapshot
 * - GET /design-versions/:kitchenId — list versions for a kitchen
 * - GET /design-versions/:kitchenId/:version — get specific version
 * - POST /design-versions/:kitchenId/:version/restore — restore version
 * - DELETE /design-versions/:kitchenId/:version — delete version
 *
 * Focus areas: auth, IDOR prevention via kitchen ownership, param validation, edge cases.
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
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  kitchenItem: {
    findMany: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
  kitchenConfiguration: {
    findFirst: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
  designVersion: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn(),
  $disconnect: jest.fn(),
};

jest.mock('../database/client', () => ({
  prisma: mockPrisma,
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
  const { UnauthorizedError, ForbiddenError } = require('@kitchenxpert/common');

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
import designVersionRoutes from '../api/routes/design-version-routes';

// ==================== TEST APP SETUP ====================

function createTestApp(): Application {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/design-versions', designVersionRoutes);
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

const VALID_KITCHEN_ID = '11111111-1111-1111-1111-111111111111';
const OTHER_KITCHEN_ID = '22222222-2222-2222-2222-222222222222';
const INVALID_UUID = 'not-a-uuid';

const ownedKitchen = {
  id: VALID_KITCHEN_ID,
  userId: 'test-user-1',
};

const otherUserKitchen = {
  id: OTHER_KITCHEN_ID,
  userId: 'other-user-99',
};

const mockSnapshot = {
  kitchen: {
    name: 'Main Kitchen',
    style: 'modern',
    layout: 'L-shaped',
    width: 4000,
    length: 3000,
    height: 2700,
    metadata: null,
  },
  items: [
    {
      type: 'base_cabinet',
      name: 'Base Cabinet',
      positionX: 0,
      positionY: 0,
      positionZ: 0,
      rotationY: 0,
      width: 600,
      depth: 600,
      height: 900,
    },
  ],
  configuration: {
    cabinetStyle: 'shaker',
    cabinetFinish: 'white',
    countertopMaterial: 'granite',
  },
};

const mockDesignVersion = {
  id: 'dv-1',
  kitchenId: VALID_KITCHEN_ID,
  userId: 'test-user-1',
  version: 1,
  label: 'Initial design',
  snapshot: mockSnapshot,
  createdAt: new Date('2024-01-15'),
};

// ==================== TESTS ====================

describe('Design Version Routes', () => {
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
    it('should return 401 for unauthenticated request to POST /design-versions', async () => {
      const response = await request(app)
        .post('/design-versions')
        .send({ kitchenId: VALID_KITCHEN_ID })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 for unauthenticated request to GET /design-versions/:kitchenId', async () => {
      const response = await request(app).get(`/design-versions/${VALID_KITCHEN_ID}`).expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== POST /design-versions ====================

  describe('POST /design-versions', () => {
    it('should create a version snapshot and return 201', async () => {
      mockPrisma.kitchen.findFirst.mockResolvedValue(ownedKitchen);
      mockPrisma.kitchenItem.findMany.mockResolvedValue(mockSnapshot.items);
      mockPrisma.kitchenConfiguration.findFirst.mockResolvedValue(mockSnapshot.configuration);
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockSnapshot.kitchen);
      mockPrisma.designVersion.findFirst.mockResolvedValue(null); // No previous version
      mockPrisma.designVersion.create.mockResolvedValue(mockDesignVersion);

      const response = await authedRequest(app)
        .post('/design-versions')
        .send({ kitchenId: VALID_KITCHEN_ID })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.version).toBe(1);
      expect(response.body.data.kitchenId).toBe(VALID_KITCHEN_ID);
    });

    it('should accept optional label field', async () => {
      mockPrisma.kitchen.findFirst.mockResolvedValue(ownedKitchen);
      mockPrisma.kitchenItem.findMany.mockResolvedValue([]);
      mockPrisma.kitchenConfiguration.findFirst.mockResolvedValue(null);
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockSnapshot.kitchen);
      mockPrisma.designVersion.findFirst.mockResolvedValue(null);
      mockPrisma.designVersion.create.mockResolvedValue({
        ...mockDesignVersion,
        label: 'My custom label',
      });

      const response = await authedRequest(app)
        .post('/design-versions')
        .send({ kitchenId: VALID_KITCHEN_ID, label: 'My custom label' })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should auto-increment version number', async () => {
      mockPrisma.kitchen.findFirst.mockResolvedValue(ownedKitchen);
      mockPrisma.kitchenItem.findMany.mockResolvedValue([]);
      mockPrisma.kitchenConfiguration.findFirst.mockResolvedValue(null);
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockSnapshot.kitchen);
      mockPrisma.designVersion.findFirst.mockResolvedValue({ version: 3 }); // Last version is 3
      mockPrisma.designVersion.create.mockResolvedValue({
        ...mockDesignVersion,
        version: 4,
      });

      const response = await authedRequest(app)
        .post('/design-versions')
        .send({ kitchenId: VALID_KITCHEN_ID })
        .expect(201);

      expect(mockPrisma.designVersion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ version: 4 }),
        })
      );
    });

    it('should return 400 when kitchenId is missing', async () => {
      const response = await authedRequest(app).post('/design-versions').send({}).expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when kitchenId is not a valid UUID', async () => {
      const response = await authedRequest(app)
        .post('/design-versions')
        .send({ kitchenId: INVALID_UUID })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when label exceeds 200 characters', async () => {
      const response = await authedRequest(app)
        .post('/design-versions')
        .send({ kitchenId: VALID_KITCHEN_ID, label: 'x'.repeat(201) })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 when kitchen does not exist', async () => {
      mockPrisma.kitchen.findFirst.mockResolvedValue(null);

      const response = await authedRequest(app)
        .post('/design-versions')
        .send({ kitchenId: VALID_KITCHEN_ID })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Kitchen not found');
    });

    it('should return 403 when user does not own the kitchen (IDOR prevention)', async () => {
      mockPrisma.kitchen.findFirst.mockResolvedValue(otherUserKitchen);

      const response = await authedRequest(app)
        .post('/design-versions')
        .send({ kitchenId: OTHER_KITCHEN_ID })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access denied');
    });

    it('should allow admin to create version for any kitchen', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockPrisma.kitchen.findFirst.mockResolvedValue(otherUserKitchen);
      mockPrisma.kitchenItem.findMany.mockResolvedValue([]);
      mockPrisma.kitchenConfiguration.findFirst.mockResolvedValue(null);
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockSnapshot.kitchen);
      mockPrisma.designVersion.findFirst.mockResolvedValue(null);
      mockPrisma.designVersion.create.mockResolvedValue({
        ...mockDesignVersion,
        userId: 'admin-1',
        kitchenId: OTHER_KITCHEN_ID,
      });

      const response = await authedRequest(app)
        .post('/design-versions')
        .send({ kitchenId: OTHER_KITCHEN_ID })
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  // ==================== GET /design-versions/:kitchenId ====================

  describe('GET /design-versions/:kitchenId', () => {
    it('should list all versions for an owned kitchen (newest first)', async () => {
      mockPrisma.kitchen.findFirst.mockResolvedValue(ownedKitchen);
      const versions = [
        {
          id: 'dv-3',
          version: 3,
          label: 'Final',
          thumbnail: null,
          createdAt: new Date('2024-03-01'),
        },
        {
          id: 'dv-2',
          version: 2,
          label: 'Revision',
          thumbnail: null,
          createdAt: new Date('2024-02-01'),
        },
        {
          id: 'dv-1',
          version: 1,
          label: 'Initial',
          thumbnail: null,
          createdAt: new Date('2024-01-01'),
        },
      ];
      mockPrisma.designVersion.findMany.mockResolvedValue(versions);

      const response = await authedRequest(app)
        .get(`/design-versions/${VALID_KITCHEN_ID}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.data[0].version).toBe(3);
    });

    it('should return empty array when no versions exist', async () => {
      mockPrisma.kitchen.findFirst.mockResolvedValue(ownedKitchen);
      mockPrisma.designVersion.findMany.mockResolvedValue([]);

      const response = await authedRequest(app)
        .get(`/design-versions/${VALID_KITCHEN_ID}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('should return 400 for invalid kitchenId UUID', async () => {
      const response = await authedRequest(app).get(`/design-versions/${INVALID_UUID}`).expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 when kitchen does not exist', async () => {
      mockPrisma.kitchen.findFirst.mockResolvedValue(null);

      const response = await authedRequest(app)
        .get(`/design-versions/${VALID_KITCHEN_ID}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 when user does not own the kitchen (IDOR prevention)', async () => {
      mockPrisma.kitchen.findFirst.mockResolvedValue(otherUserKitchen);

      const response = await authedRequest(app)
        .get(`/design-versions/${OTHER_KITCHEN_ID}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access denied');
    });

    it('should allow admin to list versions for any kitchen', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockPrisma.kitchen.findFirst.mockResolvedValue(otherUserKitchen);
      mockPrisma.designVersion.findMany.mockResolvedValue([]);

      const response = await authedRequest(app)
        .get(`/design-versions/${OTHER_KITCHEN_ID}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  // ==================== GET /design-versions/:kitchenId/:version ====================

  describe('GET /design-versions/:kitchenId/:version', () => {
    it('should return a specific version for an owned kitchen', async () => {
      mockPrisma.kitchen.findFirst.mockResolvedValue(ownedKitchen);
      mockPrisma.designVersion.findUnique.mockResolvedValue(mockDesignVersion);

      const response = await authedRequest(app)
        .get(`/design-versions/${VALID_KITCHEN_ID}/1`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.version).toBe(1);
      expect(response.body.data.snapshot).toBeDefined();
    });

    it('should return 404 when version does not exist', async () => {
      mockPrisma.kitchen.findFirst.mockResolvedValue(ownedKitchen);
      mockPrisma.designVersion.findUnique.mockResolvedValue(null);

      const response = await authedRequest(app)
        .get(`/design-versions/${VALID_KITCHEN_ID}/999`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Version not found');
    });

    it('should return 400 for invalid kitchenId UUID', async () => {
      const response = await authedRequest(app)
        .get(`/design-versions/${INVALID_UUID}/1`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for non-positive version number', async () => {
      const response = await authedRequest(app)
        .get(`/design-versions/${VALID_KITCHEN_ID}/0`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for negative version number', async () => {
      const response = await authedRequest(app)
        .get(`/design-versions/${VALID_KITCHEN_ID}/-1`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for non-integer version number', async () => {
      const response = await authedRequest(app)
        .get(`/design-versions/${VALID_KITCHEN_ID}/abc`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 when user does not own the kitchen (IDOR prevention)', async () => {
      mockPrisma.kitchen.findFirst.mockResolvedValue(otherUserKitchen);

      const response = await authedRequest(app)
        .get(`/design-versions/${OTHER_KITCHEN_ID}/1`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should use compound key for lookup (kitchenId + version)', async () => {
      mockPrisma.kitchen.findFirst.mockResolvedValue(ownedKitchen);
      mockPrisma.designVersion.findUnique.mockResolvedValue(mockDesignVersion);

      await authedRequest(app).get(`/design-versions/${VALID_KITCHEN_ID}/1`).expect(200);

      expect(mockPrisma.designVersion.findUnique).toHaveBeenCalledWith({
        where: {
          kitchenId_version: {
            kitchenId: VALID_KITCHEN_ID,
            version: 1,
          },
        },
      });
    });
  });

  // ==================== POST /design-versions/:kitchenId/:version/restore ====================

  describe('POST /design-versions/:kitchenId/:version/restore', () => {
    it('should restore a version successfully', async () => {
      mockPrisma.kitchen.findFirst.mockResolvedValue(ownedKitchen);
      mockPrisma.designVersion.findUnique.mockResolvedValue(mockDesignVersion);
      // Mock the transaction to execute the callback
      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        return fn({
          kitchenItem: { deleteMany: jest.fn(), create: jest.fn() },
          kitchenConfiguration: { deleteMany: jest.fn(), create: jest.fn() },
          kitchen: { update: jest.fn() },
        });
      });

      const response = await authedRequest(app)
        .post(`/design-versions/${VALID_KITCHEN_ID}/1/restore`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('Restored to version 1');
    });

    it('should return 404 when version does not exist', async () => {
      mockPrisma.kitchen.findFirst.mockResolvedValue(ownedKitchen);
      mockPrisma.designVersion.findUnique.mockResolvedValue(null);

      const response = await authedRequest(app)
        .post(`/design-versions/${VALID_KITCHEN_ID}/999/restore`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Version not found');
    });

    it('should return 404 when kitchen does not exist', async () => {
      mockPrisma.kitchen.findFirst.mockResolvedValue(null);

      const response = await authedRequest(app)
        .post(`/design-versions/${VALID_KITCHEN_ID}/1/restore`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 when user does not own the kitchen (IDOR prevention)', async () => {
      mockPrisma.kitchen.findFirst.mockResolvedValue(otherUserKitchen);

      const response = await authedRequest(app)
        .post(`/design-versions/${OTHER_KITCHEN_ID}/1/restore`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access denied');
    });

    it('should return 400 for invalid kitchenId UUID', async () => {
      const response = await authedRequest(app)
        .post(`/design-versions/${INVALID_UUID}/1/restore`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for non-positive version number', async () => {
      const response = await authedRequest(app)
        .post(`/design-versions/${VALID_KITCHEN_ID}/0/restore`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should execute restore within a transaction', async () => {
      mockPrisma.kitchen.findFirst.mockResolvedValue(ownedKitchen);
      mockPrisma.designVersion.findUnique.mockResolvedValue(mockDesignVersion);
      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        return fn({
          kitchenItem: { deleteMany: jest.fn(), create: jest.fn() },
          kitchenConfiguration: { deleteMany: jest.fn(), create: jest.fn() },
          kitchen: { update: jest.fn() },
        });
      });

      await authedRequest(app).post(`/design-versions/${VALID_KITCHEN_ID}/1/restore`).expect(200);

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should allow admin to restore any kitchen version', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockPrisma.kitchen.findFirst.mockResolvedValue(otherUserKitchen);
      mockPrisma.designVersion.findUnique.mockResolvedValue({
        ...mockDesignVersion,
        kitchenId: OTHER_KITCHEN_ID,
      });
      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        return fn({
          kitchenItem: { deleteMany: jest.fn(), create: jest.fn() },
          kitchenConfiguration: { deleteMany: jest.fn(), create: jest.fn() },
          kitchen: { update: jest.fn() },
        });
      });

      const response = await authedRequest(app)
        .post(`/design-versions/${OTHER_KITCHEN_ID}/1/restore`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  // ==================== DELETE /design-versions/:kitchenId/:version ====================

  describe('DELETE /design-versions/:kitchenId/:version', () => {
    it('should delete a version successfully', async () => {
      mockPrisma.kitchen.findFirst.mockResolvedValue(ownedKitchen);
      mockPrisma.designVersion.findUnique.mockResolvedValue(mockDesignVersion);
      mockPrisma.designVersion.delete.mockResolvedValue(mockDesignVersion);

      const response = await authedRequest(app)
        .delete(`/design-versions/${VALID_KITCHEN_ID}/1`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('Version 1 deleted');
    });

    it('should return 404 when version does not exist', async () => {
      mockPrisma.kitchen.findFirst.mockResolvedValue(ownedKitchen);
      mockPrisma.designVersion.findUnique.mockResolvedValue(null);

      const response = await authedRequest(app)
        .delete(`/design-versions/${VALID_KITCHEN_ID}/999`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Version not found');
    });

    it('should return 404 when kitchen does not exist', async () => {
      mockPrisma.kitchen.findFirst.mockResolvedValue(null);

      const response = await authedRequest(app)
        .delete(`/design-versions/${VALID_KITCHEN_ID}/1`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 when user does not own the kitchen (IDOR prevention)', async () => {
      mockPrisma.kitchen.findFirst.mockResolvedValue(otherUserKitchen);

      const response = await authedRequest(app)
        .delete(`/design-versions/${OTHER_KITCHEN_ID}/1`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access denied');
    });

    it('should return 400 for invalid kitchenId UUID', async () => {
      const response = await authedRequest(app)
        .delete(`/design-versions/${INVALID_UUID}/1`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for non-positive version number', async () => {
      const response = await authedRequest(app)
        .delete(`/design-versions/${VALID_KITCHEN_ID}/0`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should use compound key for deletion', async () => {
      mockPrisma.kitchen.findFirst.mockResolvedValue(ownedKitchen);
      mockPrisma.designVersion.findUnique.mockResolvedValue(mockDesignVersion);
      mockPrisma.designVersion.delete.mockResolvedValue(mockDesignVersion);

      await authedRequest(app).delete(`/design-versions/${VALID_KITCHEN_ID}/1`).expect(200);

      expect(mockPrisma.designVersion.delete).toHaveBeenCalledWith({
        where: {
          kitchenId_version: {
            kitchenId: VALID_KITCHEN_ID,
            version: 1,
          },
        },
      });
    });

    it('should allow admin to delete any kitchen version', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockPrisma.kitchen.findFirst.mockResolvedValue(otherUserKitchen);
      mockPrisma.designVersion.findUnique.mockResolvedValue({
        ...mockDesignVersion,
        kitchenId: OTHER_KITCHEN_ID,
      });
      mockPrisma.designVersion.delete.mockResolvedValue(mockDesignVersion);

      const response = await authedRequest(app)
        .delete(`/design-versions/${OTHER_KITCHEN_ID}/1`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  // ==================== EDGE CASES ====================

  describe('Edge cases', () => {
    it('should handle version with empty snapshot on restore', async () => {
      const emptySnapshotVersion = {
        ...mockDesignVersion,
        snapshot: { kitchen: null, items: [], configuration: null },
      };
      mockPrisma.kitchen.findFirst.mockResolvedValue(ownedKitchen);
      mockPrisma.designVersion.findUnique.mockResolvedValue(emptySnapshotVersion);
      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        return fn({
          kitchenItem: { deleteMany: jest.fn(), create: jest.fn() },
          kitchenConfiguration: { deleteMany: jest.fn(), create: jest.fn() },
          kitchen: { update: jest.fn() },
        });
      });

      const response = await authedRequest(app)
        .post(`/design-versions/${VALID_KITCHEN_ID}/1/restore`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle concurrent version list requests', async () => {
      mockPrisma.kitchen.findFirst.mockResolvedValue(ownedKitchen);
      mockPrisma.designVersion.findMany.mockResolvedValue([]);

      const results = await Promise.all([
        authedRequest(app).get(`/design-versions/${VALID_KITCHEN_ID}`),
        authedRequest(app).get(`/design-versions/${VALID_KITCHEN_ID}`),
      ]);

      results.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    it('should coerce string version parameter to number for lookup', async () => {
      mockPrisma.kitchen.findFirst.mockResolvedValue(ownedKitchen);
      mockPrisma.designVersion.findUnique.mockResolvedValue(mockDesignVersion);

      await authedRequest(app).get(`/design-versions/${VALID_KITCHEN_ID}/1`).expect(200);

      // The version should be passed as a number, not string
      expect(mockPrisma.designVersion.findUnique).toHaveBeenCalledWith({
        where: {
          kitchenId_version: {
            kitchenId: VALID_KITCHEN_ID,
            version: 1,
          },
        },
      });
    });

    it('should handle decimal version parameter gracefully', async () => {
      // z.coerce.number().int().positive() should reject 1.5
      const response = await authedRequest(app)
        .get(`/design-versions/${VALID_KITCHEN_ID}/1.5`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
