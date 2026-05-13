/**
 * Collaboration Role Routes Tests
 *
 * Tests the collaboration invite and member management endpoints:
 * - POST /collaboration-roles/invite — send collaboration invite
 * - GET /collaboration-roles/members/:kitchenId — list members
 * - Auth guard (401 without token)
 * - Ownership verification (403 for non-owner on invite)
 * - Validation (missing fields, invalid email)
 */

import cookieParser from 'cookie-parser';
import express, { type Application, type Request, type Response, type NextFunction } from 'express';
import request from 'supertest';

// ==================== MOCKS ====================

jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  createModuleLogger: jest.fn(() => ({
    info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(),
  })),
}));

const mockInvite = jest.fn();
const mockGetMyInvites = jest.fn();
const mockAccept = jest.fn();
const mockDecline = jest.fn();
const mockGetMembers = jest.fn();
const mockUpdateRole = jest.fn();
const mockRemoveMember = jest.fn();
const mockCheckPermission = jest.fn();

jest.mock('../services/collaboration/collaboration-role.service', () => ({
  collaborationRoleService: {
    invite: mockInvite,
    getMyInvites: mockGetMyInvites,
    accept: mockAccept,
    decline: mockDecline,
    getMembers: mockGetMembers,
    updateRole: mockUpdateRole,
    removeMember: mockRemoveMember,
    checkPermission: mockCheckPermission,
  },
}));

const mockPrisma = {
  $disconnect: jest.fn(),
  kitchen: { findUnique: jest.fn() },
  user: { findUnique: jest.fn() },
};

jest.mock('../database/client', () => ({ prisma: mockPrisma }));

jest.mock('../config/app-config', () => ({
  config: { corsOrigins: ['http://localhost:3000'], env: 'test', port: 3000, version: '1.0.0', rateLimit: { maxRequests: 100 } },
}));

jest.mock('../auth/token-blacklist', () => ({
  getTokenBlacklist: jest.fn(() => ({
    addToBlacklist: jest.fn().mockResolvedValue(undefined),
    isBlacklisted: jest.fn().mockResolvedValue(false),
    isUserBlacklisted: jest.fn().mockResolvedValue(false),
  })),
  getTokenExpiration: jest.fn(() => new Date(Date.now() + 3600000)),
  getTokenIssuedAt: jest.fn(() => new Date()),
}));

jest.mock('../auth/jwt.service', () => ({
  jwtService: {
    verifyAccessToken: jest.fn().mockReturnValue({
      userId: 'test-user-id', email: 'test@test.com', role: 'user',
    }),
    generateTokens: jest.fn(),
  },
}));

let currentTestUser = { userId: 'test-user-id', email: 'test@test.com', role: 'user' };

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
    authorize: () => (_req: any, _res: any, next: any) => next(),
    requireRole: () => (_req: any, _res: any, next: any) => next(),
  };
});

jest.mock('../api/middleware/rate-limit-middleware', () => ({
  generalRateLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

import { errorHandler } from '../api/middleware/error-middleware';
import collaborationRoleRoutes from '../api/routes/collaboration-role-routes';

// ==================== SETUP ====================

function createTestApp(): Application {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/collaboration-roles', collaborationRoleRoutes);
  app.use(errorHandler);
  return app;
}

function authedRequest(app: Application) {
  return {
    get: (url: string) => request(app).get(url).set('Cookie', ['accessToken=test-token']),
    post: (url: string) => request(app).post(url).set('Cookie', ['accessToken=test-token']),
  };
}

// ==================== FIXTURES ====================

const validKitchenId = '550e8400-e29b-41d4-a716-446655440000';

const mockKitchen = {
  id: validKitchenId,
  userId: 'test-user-id',
  name: 'Test Kitchen',
};

const mockInviteResult = {
  id: 'invite-1',
  kitchenId: validKitchenId,
  inviterId: 'test-user-id',
  inviteeEmail: 'collaborator@example.com',
  role: 'designer',
  token: 'invite-token-abc',
  status: 'pending',
};

const mockMembers = [
  { id: 'invite-1', email: 'designer@example.com', role: 'designer', status: 'accepted' },
  { id: 'invite-2', email: 'installer@example.com', role: 'installer', status: 'accepted' },
];

// ==================== TESTS ====================

describe('Collaboration Role Routes', () => {
  let app: Application;

  beforeEach(() => {
    jest.clearAllMocks();
    currentTestUser = { userId: 'test-user-id', email: 'test@test.com', role: 'user' };
    app = createTestApp();
  });

  describe('POST /collaboration-roles/invite', () => {
    it('should send invitation and return 201 status', async () => {
      mockInvite.mockResolvedValue(mockInviteResult);

      const response = await authedRequest(app)
        .post('/collaboration-roles/invite')
        .send({
          kitchenId: validKitchenId,
          inviteeEmail: 'collaborator@example.com',
          role: 'designer',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.role).toBe('designer');
      expect(response.body.message).toContain('Invitation sent');
    });

    it('should return 401 when user is not authenticated', async () => {
      const response = await request(app)
        .post('/collaboration-roles/invite')
        .send({
          kitchenId: validKitchenId,
          inviteeEmail: 'collaborator@example.com',
          role: 'designer',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 when user is not the kitchen owner', async () => {
      mockInvite.mockRejectedValue(new Error('Only the kitchen owner can invite'));

      const response = await authedRequest(app)
        .post('/collaboration-roles/invite')
        .send({
          kitchenId: validKitchenId,
          inviteeEmail: 'collaborator@example.com',
          role: 'designer',
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 when kitchen does not exist', async () => {
      mockInvite.mockRejectedValue(new Error('Kitchen not found'));

      const response = await authedRequest(app)
        .post('/collaboration-roles/invite')
        .send({
          kitchenId: validKitchenId,
          inviteeEmail: 'collaborator@example.com',
          role: 'designer',
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Kitchen not found');
    });

    it('should return 400 when role is invalid', async () => {
      const response = await authedRequest(app)
        .post('/collaboration-roles/invite')
        .send({
          kitchenId: validKitchenId,
          inviteeEmail: 'collaborator@example.com',
          role: 'invalid_role',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /collaboration-roles/members/:kitchenId', () => {
    it('should return members list with 200 status', async () => {
      mockCheckPermission.mockResolvedValue(true);
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);
      mockGetMembers.mockResolvedValue(mockMembers);

      const response = await authedRequest(app)
        .get(`/collaboration-roles/members/${validKitchenId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should return 401 when user is not authenticated', async () => {
      const response = await request(app)
        .get(`/collaboration-roles/members/${validKitchenId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 when kitchen does not exist', async () => {
      mockCheckPermission.mockResolvedValue(false);
      mockPrisma.kitchen.findUnique.mockResolvedValue(null);

      const response = await authedRequest(app)
        .get(`/collaboration-roles/members/${validKitchenId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(JSON.stringify(response.body)).toContain('Kitchen not found');
    });

    it('should return 403 when user has no access to the kitchen', async () => {
      mockCheckPermission.mockResolvedValue(false);
      mockPrisma.kitchen.findUnique.mockResolvedValue({
        ...mockKitchen,
        userId: 'other-user-id',
      });

      const response = await authedRequest(app)
        .get(`/collaboration-roles/members/${validKitchenId}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(JSON.stringify(response.body)).toContain('Access denied');
    });
  });
});
