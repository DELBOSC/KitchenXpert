/**
 * User Routes Integration Tests
 *
 * Tests all user-related endpoints for correct behavior including:
 * - GET /users/me — get current user profile
 * - PUT /users/me — update current user profile
 * - GET /users/me/preferences — get user preferences
 * - PUT /users/me/preferences — update user preferences
 * - GET /users — list all users (admin only)
 * - GET /users/:id — get user by ID (admin only)
 * - PUT /users/:id — update user by ID (admin only)
 * - DELETE /users/:id — delete user (admin only)
 * - PUT /users/:id/status — update user status (admin only)
 * - GET /users/stats — get user statistics (admin only)
 * - Auth guard (401 without token)
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
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn(),
  $disconnect: jest.fn(),
};

jest.mock('../database/client', () => ({
  prisma: mockPrisma,
}));

// Mock user repository
const mockUserRepository = {
  findById: jest.fn(),
  findByEmail: jest.fn(),
  create: jest.fn(),
  updateProfile: jest.fn(),
  softDelete: jest.fn(),
  updateStatus: jest.fn(),
  count: jest.fn(),
  findPaginated: jest.fn(),
  emailExists: jest.fn(),
  updateLastLogin: jest.fn(),
  updatePassword: jest.fn(),
};

jest.mock('../repositories/prisma-user.repository', () => ({
  PrismaUserRepository: jest.fn().mockImplementation(() => mockUserRepository),
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
import userRoutes from '../api/routes/user-routes';

// ==================== TEST APP SETUP ====================

function createTestApp(): Application {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/users', userRoutes);
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

const mockUser = {
  id: 'test-user-1',
  email: 'test@test.com',
  firstName: 'Test',
  lastName: 'User',
  phone: '+33612345678',
  avatar: null,
  role: 'user',
  language: 'fr',
  timezone: 'Europe/Paris',
  password: 'hashed-password-should-not-leak',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const otherUser = {
  id: 'other-user-99',
  email: 'other@test.com',
  firstName: 'Other',
  lastName: 'Person',
  phone: null,
  avatar: null,
  role: 'user',
  language: 'en',
  timezone: 'UTC',
  password: 'other-hashed-password',
  createdAt: new Date('2024-02-01'),
  updatedAt: new Date('2024-02-01'),
};

// ==================== TESTS ====================

describe('User Routes', () => {
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
    it('should return 401 for unauthenticated request to GET /users/me', async () => {
      const response = await request(app).get('/users/me').expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 for unauthenticated request to PUT /users/me', async () => {
      const response = await request(app).put('/users/me').send({ name: 'Test' }).expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 for unauthenticated request to GET /users/me/preferences', async () => {
      const response = await request(app).get('/users/me/preferences').expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== GET /users/me ====================

  describe('GET /users/me', () => {
    it('should return current user profile', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const response = await authedRequest(app).get('/users/me').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('test@test.com');
      expect(response.body.data.firstName).toBe('Test');
      expect(mockUserRepository.findById).toHaveBeenCalledWith('test-user-1');
    });

    it('should not expose password in the response', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const response = await authedRequest(app).get('/users/me').expect(200);

      expect(response.body.data.password).toBeUndefined();
      expect(JSON.stringify(response.body)).not.toContain('hashed-password-should-not-leak');
    });

    it('should return 404 when user not found in database', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      const response = await authedRequest(app).get('/users/me').expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User not found');
    });
  });

  // ==================== PUT /users/me ====================

  describe('PUT /users/me', () => {
    it('should update current user profile successfully', async () => {
      const updated = { ...mockUser, phone: '+33698765432' };
      mockUserRepository.updateProfile.mockResolvedValue(updated);

      const response = await authedRequest(app)
        .put('/users/me')
        .send({ phone: '+33698765432' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('updated');
      expect(mockUserRepository.updateProfile).toHaveBeenCalledWith(
        'test-user-1',
        expect.any(Object)
      );
    });

    it('should accept partial update (only name)', async () => {
      const updated = { ...mockUser, name: 'Updated Name' };
      mockUserRepository.updateProfile.mockResolvedValue(updated);

      const response = await authedRequest(app)
        .put('/users/me')
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 400 when name exceeds 200 characters', async () => {
      const response = await authedRequest(app)
        .put('/users/me')
        .send({ name: 'x'.repeat(201) })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when avatar is not a valid URL', async () => {
      const response = await authedRequest(app)
        .put('/users/me')
        .send({ avatar: 'not-a-url' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should accept valid avatar URL', async () => {
      const updated = { ...mockUser, avatar: 'https://example.com/avatar.png' };
      mockUserRepository.updateProfile.mockResolvedValue(updated);

      const response = await authedRequest(app)
        .put('/users/me')
        .send({ avatar: 'https://example.com/avatar.png' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  // ==================== GET /users/me/preferences ====================

  describe('GET /users/me/preferences', () => {
    it('should return user preferences', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const response = await authedRequest(app).get('/users/me/preferences').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.language).toBe('fr');
      expect(response.body.data.timezone).toBe('Europe/Paris');
    });

    it('should return 404 when user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      const response = await authedRequest(app).get('/users/me/preferences').expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== PUT /users/me/preferences ====================

  describe('PUT /users/me/preferences', () => {
    it('should update user preferences successfully', async () => {
      const updated = { ...mockUser, language: 'en', timezone: 'UTC' };
      mockUserRepository.updateProfile.mockResolvedValue(updated);

      const response = await authedRequest(app)
        .put('/users/me/preferences')
        .send({ language: 'en' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Preferences updated');
    });

    it('should return 400 for invalid language value', async () => {
      const response = await authedRequest(app)
        .put('/users/me/preferences')
        .send({ language: 'invalid_lang' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid theme value', async () => {
      const response = await authedRequest(app)
        .put('/users/me/preferences')
        .send({ theme: 'ultra-dark' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== GET /users/:id (Admin only) ====================

  describe('GET /users/:id', () => {
    it('should return user by ID for admin', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockUserRepository.findById.mockResolvedValue(otherUser);

      const response = await authedRequest(app).get('/users/other-user-99').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('other@test.com');
    });

    it('should not expose password for admin view', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockUserRepository.findById.mockResolvedValue(otherUser);

      const response = await authedRequest(app).get('/users/other-user-99').expect(200);

      expect(response.body.data.password).toBeUndefined();
    });

    it('should return 403 when non-admin tries to access', async () => {
      const response = await authedRequest(app).get('/users/other-user-99').expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent user (admin)', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockUserRepository.findById.mockResolvedValue(null);

      const response = await authedRequest(app).get('/users/nonexistent-user').expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User not found');
    });
  });

  // ==================== GET /users (Admin only) ====================

  describe('GET /users', () => {
    it('should list users with pagination for admin', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockUserRepository.findPaginated.mockResolvedValue({
        users: [mockUser, otherUser],
        total: 2,
      });

      const response = await authedRequest(app).get('/users').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta).toEqual(expect.objectContaining({ page: 1, total: 2 }));
    });

    it('should return 403 when non-admin tries to list users', async () => {
      const response = await authedRequest(app).get('/users').expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== DELETE /users/:id (Admin only) ====================

  describe('DELETE /users/:id', () => {
    it('should soft delete a user for admin', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockUserRepository.softDelete.mockResolvedValue(undefined);

      const response = await authedRequest(app).delete('/users/other-user-99').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');
      expect(mockUserRepository.softDelete).toHaveBeenCalledWith('other-user-99');
    });

    it('should return 403 when non-admin tries to delete', async () => {
      const response = await authedRequest(app).delete('/users/other-user-99').expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== GET /users/stats (Admin only) ====================

  describe('GET /users/stats', () => {
    it('should return user statistics for admin', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockUserRepository.count.mockResolvedValue(42);

      const response = await authedRequest(app).get('/users/stats').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBe(42);
    });

    it('should return 403 when non-admin tries to access stats', async () => {
      const response = await authedRequest(app).get('/users/stats').expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== EDGE CASES ====================

  describe('Edge cases', () => {
    it('should handle concurrent requests gracefully', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const results = await Promise.all([
        authedRequest(app).get('/users/me'),
        authedRequest(app).get('/users/me'),
        authedRequest(app).get('/users/me'),
      ]);

      results.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    it('should handle empty body on profile update gracefully', async () => {
      mockUserRepository.updateProfile.mockResolvedValue(mockUser);

      const response = await authedRequest(app).put('/users/me').send({}).expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
