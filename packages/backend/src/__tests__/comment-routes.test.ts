/**
 * Comment Routes Integration Tests
 *
 * Tests all comment-related endpoints for correct behavior including:
 * - POST /comments — create a new comment
 * - GET /comments?projectId=xxx — get comments for a project
 * - PUT /comments/:id — update a comment (ownership required)
 * - DELETE /comments/:id — soft delete a comment (owner or admin)
 * - IDOR prevention: can't update/delete others' comments
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
  project: {
    findUnique: jest.fn(),
  },
  projectComment: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
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
import commentRoutes from '../api/routes/comment-routes';

// ==================== TEST APP SETUP ====================

function createTestApp(): Application {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/comments', commentRoutes);
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

const mockProject = {
  id: 'project-1',
  name: 'Test Kitchen Project',
  userId: 'test-user-1',
  status: 'draft',
};

const mockComment = {
  id: 'comment-1',
  projectId: 'project-1',
  userId: 'test-user-1',
  content: 'This looks great!',
  parentId: null,
  deletedAt: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  user: {
    id: 'test-user-1',
    firstName: 'Test',
    lastName: 'User',
    avatar: null,
  },
};

const otherUserComment = {
  id: 'comment-2',
  projectId: 'project-1',
  userId: 'other-user-99',
  content: 'I disagree.',
  parentId: null,
  deletedAt: null,
  createdAt: new Date('2024-01-02'),
  updatedAt: new Date('2024-01-02'),
  user: {
    id: 'other-user-99',
    firstName: 'Other',
    lastName: 'Person',
    avatar: null,
  },
};

const deletedComment = {
  id: 'comment-deleted',
  projectId: 'project-1',
  userId: 'test-user-1',
  content: 'Deleted content',
  parentId: null,
  deletedAt: new Date('2024-01-05'),
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-05'),
};

// ==================== TESTS ====================

describe('Comment Routes', () => {
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
    it('should return 401 for unauthenticated request to GET /comments', async () => {
      const response = await request(app)
        .get('/comments?projectId=project-1')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 for unauthenticated request to POST /comments', async () => {
      const response = await request(app)
        .post('/comments')
        .send({ projectId: 'project-1', content: 'Test' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 for unauthenticated request to PUT /comments/:id', async () => {
      const response = await request(app)
        .put('/comments/comment-1')
        .send({ content: 'Updated' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 for unauthenticated request to DELETE /comments/:id', async () => {
      const response = await request(app)
        .delete('/comments/comment-1')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== POST /comments ====================

  describe('POST /comments', () => {
    it('should create a comment successfully and return 201', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(mockProject);
      mockPrisma.projectComment.create.mockResolvedValue(mockComment);

      const response = await authedRequest(app)
        .post('/comments')
        .send({ projectId: 'project-1', content: 'This looks great!' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe('This looks great!');
      expect(response.body.data.user.firstName).toBe('Test');
    });

    it('should return 400 when projectId is missing', async () => {
      const response = await authedRequest(app)
        .post('/comments')
        .send({ content: 'No project' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when content is missing', async () => {
      const response = await authedRequest(app)
        .post('/comments')
        .send({ projectId: 'project-1' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 when project does not exist', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);

      const response = await authedRequest(app)
        .post('/comments')
        .send({ projectId: 'nonexistent', content: 'Test' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should create a reply comment with parentId', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(mockProject);
      mockPrisma.projectComment.findUnique.mockResolvedValue(mockComment);
      const reply = {
        ...mockComment,
        id: 'comment-reply',
        parentId: 'comment-1',
        content: 'I agree!',
      };
      mockPrisma.projectComment.create.mockResolvedValue(reply);

      const response = await authedRequest(app)
        .post('/comments')
        .send({ projectId: 'project-1', content: 'I agree!', parentId: 'comment-1' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.parentId).toBe('comment-1');
    });

    it('should return 404 when parent comment does not exist', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(mockProject);
      mockPrisma.projectComment.findUnique.mockResolvedValue(null);

      const response = await authedRequest(app)
        .post('/comments')
        .send({ projectId: 'project-1', content: 'Reply', parentId: 'nonexistent' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 when parent comment is deleted', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(mockProject);
      mockPrisma.projectComment.findUnique.mockResolvedValue(deletedComment);

      const response = await authedRequest(app)
        .post('/comments')
        .send({ projectId: 'project-1', content: 'Reply', parentId: 'comment-deleted' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when parent comment belongs to a different project', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(mockProject);
      const differentProjectComment = { ...mockComment, projectId: 'project-other' };
      mockPrisma.projectComment.findUnique.mockResolvedValue(differentProjectComment);

      const response = await authedRequest(app)
        .post('/comments')
        .send({ projectId: 'project-1', content: 'Reply', parentId: 'comment-1' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== GET /comments ====================

  describe('GET /comments', () => {
    it('should return comments for a project', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(mockProject);
      mockPrisma.projectComment.findMany.mockResolvedValue([mockComment, otherUserComment]);

      const response = await authedRequest(app)
        .get('/comments?projectId=project-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should return 400 when projectId query is missing', async () => {
      const response = await authedRequest(app)
        .get('/comments')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 when project does not exist', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);

      const response = await authedRequest(app)
        .get('/comments?projectId=nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return empty array when project has no comments', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(mockProject);
      mockPrisma.projectComment.findMany.mockResolvedValue([]);

      const response = await authedRequest(app)
        .get('/comments?projectId=project-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });
  });

  // ==================== PUT /comments/:id ====================

  describe('PUT /comments/:id', () => {
    it('should update own comment successfully', async () => {
      mockPrisma.projectComment.findUnique.mockResolvedValue(mockComment);
      const updated = { ...mockComment, content: 'Updated content' };
      mockPrisma.projectComment.update.mockResolvedValue(updated);

      const response = await authedRequest(app)
        .put('/comments/comment-1')
        .send({ content: 'Updated content' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe('Updated content');
    });

    it('should return 400 when content is missing', async () => {
      const response = await authedRequest(app)
        .put('/comments/comment-1')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent comment', async () => {
      mockPrisma.projectComment.findUnique.mockResolvedValue(null);

      const response = await authedRequest(app)
        .put('/comments/nonexistent')
        .send({ content: 'Test' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for deleted comment', async () => {
      mockPrisma.projectComment.findUnique.mockResolvedValue(deletedComment);

      const response = await authedRequest(app)
        .put('/comments/comment-deleted')
        .send({ content: 'Test' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 when trying to update another user\'s comment (IDOR prevention)', async () => {
      mockPrisma.projectComment.findUnique.mockResolvedValue(otherUserComment);

      const response = await authedRequest(app)
        .put('/comments/comment-2')
        .send({ content: 'Trying to edit others comment' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== DELETE /comments/:id ====================

  describe('DELETE /comments/:id', () => {
    it('should soft delete own comment successfully', async () => {
      mockPrisma.projectComment.findUnique.mockResolvedValue(mockComment);
      mockPrisma.projectComment.update.mockResolvedValue({ ...mockComment, deletedAt: new Date() });

      const response = await authedRequest(app)
        .delete('/comments/comment-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');
      expect(mockPrisma.projectComment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'comment-1' },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        })
      );
    });

    it('should return 404 for non-existent comment', async () => {
      mockPrisma.projectComment.findUnique.mockResolvedValue(null);

      const response = await authedRequest(app)
        .delete('/comments/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for already-deleted comment', async () => {
      mockPrisma.projectComment.findUnique.mockResolvedValue(deletedComment);

      const response = await authedRequest(app)
        .delete('/comments/comment-deleted')
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 when trying to delete another user\'s comment (IDOR prevention)', async () => {
      mockPrisma.projectComment.findUnique.mockResolvedValue(otherUserComment);

      const response = await authedRequest(app)
        .delete('/comments/comment-2')
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should allow admin to delete any comment', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockPrisma.projectComment.findUnique.mockResolvedValue(otherUserComment);
      mockPrisma.projectComment.update.mockResolvedValue({ ...otherUserComment, deletedAt: new Date() });

      const response = await authedRequest(app)
        .delete('/comments/comment-2')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');
    });
  });

  // ==================== EDGE CASES ====================

  describe('Edge cases', () => {
    it('should handle concurrent comment creation gracefully', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(mockProject);
      mockPrisma.projectComment.create.mockResolvedValue(mockComment);

      const results = await Promise.all([
        authedRequest(app).post('/comments').send({ projectId: 'project-1', content: 'Comment 1' }),
        authedRequest(app).post('/comments').send({ projectId: 'project-1', content: 'Comment 2' }),
        authedRequest(app).post('/comments').send({ projectId: 'project-1', content: 'Comment 3' }),
      ]);

      results.forEach((response) => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });
    });
  });
});
