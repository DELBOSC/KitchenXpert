/**
 * Project Routes Integration Tests
 *
 * Tests all project-related endpoints for correct behavior including:
 * - GET /projects — list user's projects with pagination
 * - POST /projects — create project with validation
 * - GET /projects/:id — get by ID with IDOR prevention
 * - PUT /projects/:id — update with IDOR prevention
 * - DELETE /projects/:id — soft delete with IDOR prevention
 * - PUT /projects/:id/status — status transition validation
 * - POST /projects/:id/duplicate — duplicate project
 * - GET /projects/:id/collaborators — list collaborators
 * - POST /projects/:id/collaborators — add collaborator (owner only)
 * - DELETE /projects/:id/collaborators/:email — remove collaborator
 * - GET /projects/:id/kitchens — list kitchens in project
 * - GET /projects/:id/stats — project statistics
 */

import request from 'supertest';
import express, { Application, Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';

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
  },
  $transaction: jest.fn(),
  $disconnect: jest.fn(),
};

jest.mock('../database/client', () => ({
  prisma: mockPrisma,
}));

// Mock project repository
const mockProjectRepository = {
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  updateStatus: jest.fn(),
  duplicate: jest.fn(),
  getCollaborators: jest.fn(),
  addCollaborator: jest.fn(),
  removeCollaborator: jest.fn(),
  acceptInvite: jest.fn(),
  getUserStats: jest.fn(),
  findByCollaborator: jest.fn(),
};

jest.mock('../repositories/project-repository', () => ({
  ProjectRepository: jest.fn().mockImplementation(() => mockProjectRepository),
}));

// Mock mail service
jest.mock('../services/mail.service', () => ({
  getMailService: jest.fn(() => ({
    sendProjectShared: jest.fn().mockResolvedValue(undefined),
  })),
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
import projectRoutes from '../api/routes/project-routes';
import { errorHandler } from '../api/middleware/error-middleware';

// ==================== TEST APP SETUP ====================

function createTestApp(): Application {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/projects', projectRoutes);
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
  description: 'A kitchen renovation project',
  userId: 'test-user-1',
  status: 'draft',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const otherUserProject = {
  id: 'project-2',
  name: 'Other User Project',
  description: 'Not my project',
  userId: 'other-user-99',
  status: 'in_progress',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

// ==================== TESTS ====================

describe('Project Routes', () => {
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
    it('should return 401 for unauthenticated request to GET /projects', async () => {
      const response = await request(app)
        .get('/projects')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 for unauthenticated request to POST /projects', async () => {
      const response = await request(app)
        .post('/projects')
        .send({ name: 'Test' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== GET /projects ====================

  describe('GET /projects', () => {
    it('should list projects for the current user with default pagination', async () => {
      const mockResult = {
        data: [mockProject],
        page: 1,
        total: 1,
        totalPages: 1,
      };
      mockProjectRepository.findAll.mockResolvedValue(mockResult);

      const response = await authedRequest(app)
        .get('/projects')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.meta).toEqual(
        expect.objectContaining({ page: 1, total: 1, totalPages: 1 })
      );
      expect(mockProjectRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'test-user-1' }),
        expect.objectContaining({ page: 1, limit: 20 })
      );
    });

    it('should pass pagination parameters from query string', async () => {
      mockProjectRepository.findAll.mockResolvedValue({
        data: [], page: 3, total: 50, totalPages: 5,
      });

      await authedRequest(app)
        .get('/projects?page=3&limit=10')
        .expect(200);

      expect(mockProjectRepository.findAll).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ page: 3, limit: 10 })
      );
    });

    it('should pass status filter to the repository', async () => {
      mockProjectRepository.findAll.mockResolvedValue({
        data: [], page: 1, total: 0, totalPages: 0,
      });

      await authedRequest(app)
        .get('/projects?status=draft')
        .expect(200);

      expect(mockProjectRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'draft' }),
        expect.anything()
      );
    });

    it('should pass search query to the repository', async () => {
      mockProjectRepository.findAll.mockResolvedValue({
        data: [], page: 1, total: 0, totalPages: 0,
      });

      await authedRequest(app)
        .get('/projects?search=kitchen')
        .expect(200);

      expect(mockProjectRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'kitchen' }),
        expect.anything()
      );
    });
  });

  // ==================== POST /projects ====================

  describe('POST /projects', () => {
    const validProject = {
      name: 'New Kitchen Project',
      description: 'My new project',
    };

    it('should create a project successfully and return 201', async () => {
      const created = { id: 'new-project', ...validProject, userId: 'test-user-1', status: 'draft' };
      mockProjectRepository.create.mockResolvedValue(created);

      const response = await authedRequest(app)
        .post('/projects')
        .send(validProject)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('New Kitchen Project');
      expect(response.body.message).toContain('created');
      expect(mockProjectRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'test-user-1',
          name: 'New Kitchen Project',
        })
      );
    });

    it('should return 400 when name is missing', async () => {
      const response = await authedRequest(app)
        .post('/projects')
        .send({ description: 'No name' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when name is empty string', async () => {
      const response = await authedRequest(app)
        .post('/projects')
        .send({ name: '' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when name exceeds 200 characters', async () => {
      const response = await authedRequest(app)
        .post('/projects')
        .send({ name: 'x'.repeat(201) })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when description exceeds 2000 characters', async () => {
      const response = await authedRequest(app)
        .post('/projects')
        .send({ name: 'Valid Name', description: 'x'.repeat(2001) })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should accept optional status field with valid value', async () => {
      const created = { id: 'new-project', name: 'Test', userId: 'test-user-1', status: 'in_progress' };
      mockProjectRepository.create.mockResolvedValue(created);

      const response = await authedRequest(app)
        .post('/projects')
        .send({ name: 'Test', status: 'in_progress' })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should return 400 for invalid status value', async () => {
      const response = await authedRequest(app)
        .post('/projects')
        .send({ name: 'Test', status: 'invalid_status' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should accept optional metadata as a record', async () => {
      const created = { id: 'new-project', name: 'Test', userId: 'test-user-1', status: 'draft', metadata: { key: 'value' } };
      mockProjectRepository.create.mockResolvedValue(created);

      const response = await authedRequest(app)
        .post('/projects')
        .send({ name: 'Test', metadata: { key: 'value' } })
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  // ==================== GET /projects/:id ====================

  describe('GET /projects/:id', () => {
    it('should return project for the owner', async () => {
      mockProjectRepository.findById.mockResolvedValue(mockProject);

      const response = await authedRequest(app)
        .get('/projects/project-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('project-1');
    });

    it('should return 404 for non-existent project', async () => {
      mockProjectRepository.findById.mockResolvedValue(null);

      const response = await authedRequest(app)
        .get('/projects/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Project not found');
    });

    it('should return 403 when non-owner accesses a project (IDOR prevention)', async () => {
      mockProjectRepository.findById.mockResolvedValue(otherUserProject);

      const response = await authedRequest(app)
        .get('/projects/project-2')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access denied');
    });

    it('should allow admin to access any project', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockProjectRepository.findById.mockResolvedValue(otherUserProject);

      const response = await authedRequest(app)
        .get('/projects/project-2')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('project-2');
    });

    it('should request project with relations (includeRelations = true)', async () => {
      mockProjectRepository.findById.mockResolvedValue(mockProject);

      await authedRequest(app)
        .get('/projects/project-1')
        .expect(200);

      // The getById controller calls verifyOwnership with includeRelations=true
      expect(mockProjectRepository.findById).toHaveBeenCalledWith('project-1', true);
    });
  });

  // ==================== PUT /projects/:id ====================

  describe('PUT /projects/:id', () => {
    it('should update a project owned by the current user', async () => {
      mockProjectRepository.findById.mockResolvedValue(mockProject);
      const updated = { ...mockProject, name: 'Updated Name' };
      mockProjectRepository.update.mockResolvedValue(updated);

      const response = await authedRequest(app)
        .put('/projects/project-1')
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Name');
      expect(response.body.message).toContain('updated');
    });

    it('should return 404 for non-existent project', async () => {
      mockProjectRepository.findById.mockResolvedValue(null);

      const response = await authedRequest(app)
        .put('/projects/nonexistent')
        .send({ name: 'Test' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 when non-owner tries to update (IDOR prevention)', async () => {
      mockProjectRepository.findById.mockResolvedValue(otherUserProject);

      const response = await authedRequest(app)
        .put('/projects/project-2')
        .send({ name: 'Hacked Name' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access denied');
    });

    it('should allow admin to update any project', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockProjectRepository.findById.mockResolvedValue(otherUserProject);
      mockProjectRepository.update.mockResolvedValue({ ...otherUserProject, name: 'Admin Updated' });

      const response = await authedRequest(app)
        .put('/projects/project-2')
        .send({ name: 'Admin Updated' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should allow partial updates (only description)', async () => {
      mockProjectRepository.findById.mockResolvedValue(mockProject);
      mockProjectRepository.update.mockResolvedValue({ ...mockProject, description: 'New desc' });

      const response = await authedRequest(app)
        .put('/projects/project-1')
        .send({ description: 'New desc' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 400 for invalid status in update', async () => {
      mockProjectRepository.findById.mockResolvedValue(mockProject);

      const response = await authedRequest(app)
        .put('/projects/project-1')
        .send({ status: 'totally_invalid' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== DELETE /projects/:id ====================

  describe('DELETE /projects/:id', () => {
    it('should soft delete a project owned by the current user', async () => {
      mockProjectRepository.findById.mockResolvedValue(mockProject);
      mockProjectRepository.delete.mockResolvedValue(undefined);

      const response = await authedRequest(app)
        .delete('/projects/project-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');
      expect(mockProjectRepository.delete).toHaveBeenCalledWith('project-1');
    });

    it('should return 404 for non-existent project', async () => {
      mockProjectRepository.findById.mockResolvedValue(null);

      const response = await authedRequest(app)
        .delete('/projects/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 when non-owner tries to delete (IDOR prevention)', async () => {
      mockProjectRepository.findById.mockResolvedValue(otherUserProject);

      const response = await authedRequest(app)
        .delete('/projects/project-2')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access denied');
    });

    it('should allow admin to delete any project', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockProjectRepository.findById.mockResolvedValue(otherUserProject);
      mockProjectRepository.delete.mockResolvedValue(undefined);

      const response = await authedRequest(app)
        .delete('/projects/project-2')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  // ==================== PUT /projects/:id/status ====================

  describe('PUT /projects/:id/status', () => {
    it('should update project status with valid value', async () => {
      mockProjectRepository.findById.mockResolvedValue(mockProject);
      const updated = { ...mockProject, status: 'in_progress' };
      mockProjectRepository.updateStatus.mockResolvedValue(updated);

      const response = await authedRequest(app)
        .put('/projects/project-1/status')
        .send({ status: 'in_progress' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('in_progress');
      expect(response.body.message).toContain('status updated');
    });

    it('should return 400 when status is missing', async () => {
      const response = await authedRequest(app)
        .put('/projects/project-1/status')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid status value', async () => {
      const response = await authedRequest(app)
        .put('/projects/project-1/status')
        .send({ status: 'invalid' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should accept all valid status transitions', async () => {
      const validStatuses = ['draft', 'in_progress', 'review', 'approved', 'completed', 'archived'];

      for (const status of validStatuses) {
        mockProjectRepository.findById.mockResolvedValue(mockProject);
        mockProjectRepository.updateStatus.mockResolvedValue({ ...mockProject, status });

        const response = await authedRequest(app)
          .put('/projects/project-1/status')
          .send({ status })
          .expect(200);

        expect(response.body.success).toBe(true);
      }
    });

    it('should return 403 when non-owner tries to update status (IDOR prevention)', async () => {
      mockProjectRepository.findById.mockResolvedValue(otherUserProject);

      const response = await authedRequest(app)
        .put('/projects/project-2/status')
        .send({ status: 'approved' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent project', async () => {
      mockProjectRepository.findById.mockResolvedValue(null);

      const response = await authedRequest(app)
        .put('/projects/nonexistent/status')
        .send({ status: 'draft' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== POST /projects/:id/duplicate ====================

  describe('POST /projects/:id/duplicate', () => {
    it('should duplicate a project and return 201', async () => {
      mockProjectRepository.findById.mockResolvedValue(mockProject);
      const duplicated = { ...mockProject, id: 'project-dup', name: 'Copy of Test Kitchen Project' };
      mockProjectRepository.duplicate.mockResolvedValue(duplicated);

      const response = await authedRequest(app)
        .post('/projects/project-1/duplicate')
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('project-dup');
      expect(response.body.message).toContain('duplicated');
    });

    it('should pass custom name for duplicate', async () => {
      mockProjectRepository.findById.mockResolvedValue(mockProject);
      mockProjectRepository.duplicate.mockResolvedValue({ ...mockProject, id: 'dup-2', name: 'Custom Name' });

      await authedRequest(app)
        .post('/projects/project-1/duplicate')
        .send({ name: 'Custom Name' })
        .expect(201);

      expect(mockProjectRepository.duplicate).toHaveBeenCalledWith('project-1', 'Custom Name');
    });

    it('should return 403 when non-owner tries to duplicate (IDOR prevention)', async () => {
      mockProjectRepository.findById.mockResolvedValue(otherUserProject);

      const response = await authedRequest(app)
        .post('/projects/project-2/duplicate')
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent project', async () => {
      mockProjectRepository.findById.mockResolvedValue(null);

      const response = await authedRequest(app)
        .post('/projects/nonexistent/duplicate')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== GET /projects/:id/collaborators ====================

  describe('GET /projects/:id/collaborators', () => {
    it('should list collaborators for a project the user owns', async () => {
      mockProjectRepository.findById.mockResolvedValue(mockProject);
      const collabs = [
        { email: 'collab1@test.com', role: 'editor' },
        { email: 'collab2@test.com', role: 'viewer' },
      ];
      mockProjectRepository.getCollaborators.mockResolvedValue(collabs);

      const response = await authedRequest(app)
        .get('/projects/project-1/collaborators')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should return 403 when non-owner tries to list collaborators (IDOR prevention)', async () => {
      mockProjectRepository.findById.mockResolvedValue(otherUserProject);

      const response = await authedRequest(app)
        .get('/projects/project-2/collaborators')
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent project', async () => {
      mockProjectRepository.findById.mockResolvedValue(null);

      const response = await authedRequest(app)
        .get('/projects/nonexistent/collaborators')
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return empty array when project has no collaborators', async () => {
      mockProjectRepository.findById.mockResolvedValue(mockProject);
      mockProjectRepository.getCollaborators.mockResolvedValue([]);

      const response = await authedRequest(app)
        .get('/projects/project-1/collaborators')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });
  });

  // ==================== POST /projects/:id/collaborators ====================

  describe('POST /projects/:id/collaborators', () => {
    const validCollaborator = {
      email: 'newcollab@test.com',
      role: 'editor',
    };

    it('should add a collaborator successfully and return 201', async () => {
      mockProjectRepository.findById.mockResolvedValue(mockProject);
      mockProjectRepository.addCollaborator.mockResolvedValue({
        id: 'collab-1',
        email: 'newcollab@test.com',
        role: 'editor',
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        firstName: 'Test',
        lastName: 'User',
      });

      const response = await authedRequest(app)
        .post('/projects/project-1/collaborators')
        .send(validCollaborator)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('newcollab@test.com');
      expect(response.body.message).toContain('Collaborator added');
    });

    it('should return 400 when email is missing', async () => {
      const response = await authedRequest(app)
        .post('/projects/project-1/collaborators')
        .send({ role: 'editor' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when email is invalid', async () => {
      const response = await authedRequest(app)
        .post('/projects/project-1/collaborators')
        .send({ email: 'not-an-email', role: 'editor' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid collaborator role', async () => {
      const response = await authedRequest(app)
        .post('/projects/project-1/collaborators')
        .send({ email: 'test@test.com', role: 'superadmin' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should accept collaborator without explicit role (optional field)', async () => {
      mockProjectRepository.findById.mockResolvedValue(mockProject);
      mockProjectRepository.addCollaborator.mockResolvedValue({
        id: 'collab-2',
        email: 'newcollab@test.com',
        role: 'viewer',
      });
      mockPrisma.user.findUnique.mockResolvedValue({ firstName: 'Test', lastName: 'User' });

      const response = await authedRequest(app)
        .post('/projects/project-1/collaborators')
        .send({ email: 'newcollab@test.com' })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should return 403 when non-owner tries to add collaborator (IDOR prevention)', async () => {
      mockProjectRepository.findById.mockResolvedValue(otherUserProject);

      const response = await authedRequest(app)
        .post('/projects/project-2/collaborators')
        .send(validCollaborator)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent project', async () => {
      mockProjectRepository.findById.mockResolvedValue(null);

      const response = await authedRequest(app)
        .post('/projects/nonexistent/collaborators')
        .send(validCollaborator)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for email exceeding 255 characters', async () => {
      const longEmail = 'a'.repeat(246) + '@test.com';

      const response = await authedRequest(app)
        .post('/projects/project-1/collaborators')
        .send({ email: longEmail })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== DELETE /projects/:id/collaborators/:email ====================

  describe('DELETE /projects/:id/collaborators/:email', () => {
    it('should remove a collaborator successfully', async () => {
      mockProjectRepository.findById.mockResolvedValue(mockProject);
      mockProjectRepository.removeCollaborator.mockResolvedValue(undefined);

      const response = await authedRequest(app)
        .delete('/projects/project-1/collaborators/collab@test.com')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('removed');
      expect(mockProjectRepository.removeCollaborator).toHaveBeenCalledWith(
        'project-1',
        'collab@test.com'
      );
    });

    it('should return 403 when non-owner tries to remove collaborator (IDOR prevention)', async () => {
      mockProjectRepository.findById.mockResolvedValue(otherUserProject);

      const response = await authedRequest(app)
        .delete('/projects/project-2/collaborators/collab@test.com')
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent project', async () => {
      mockProjectRepository.findById.mockResolvedValue(null);

      const response = await authedRequest(app)
        .delete('/projects/nonexistent/collaborators/collab@test.com')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== GET /projects/:id/kitchens ====================

  describe('GET /projects/:id/kitchens', () => {
    it('should return kitchens for a project the user owns', async () => {
      const projectWithKitchens = {
        ...mockProject,
        kitchens: [
          { id: 'kitchen-1', name: 'Main Kitchen' },
          { id: 'kitchen-2', name: 'Guest Kitchen' },
        ],
      };
      // First call is for verifyOwnership, second for findById with relations
      mockProjectRepository.findById
        .mockResolvedValueOnce(mockProject)
        .mockResolvedValueOnce(projectWithKitchens);

      const response = await authedRequest(app)
        .get('/projects/project-1/kitchens')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should return 403 when non-owner tries to access kitchens (IDOR prevention)', async () => {
      mockProjectRepository.findById.mockResolvedValue(otherUserProject);

      const response = await authedRequest(app)
        .get('/projects/project-2/kitchens')
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return empty array when project has no kitchens', async () => {
      mockProjectRepository.findById
        .mockResolvedValueOnce(mockProject)
        .mockResolvedValueOnce({ ...mockProject, kitchens: [] });

      const response = await authedRequest(app)
        .get('/projects/project-1/kitchens')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });
  });

  // ==================== GET /projects/:id/stats ====================

  describe('GET /projects/:id/stats', () => {
    it('should return project statistics for the owner', async () => {
      mockProjectRepository.findById.mockResolvedValue(mockProject);
      const stats = { totalKitchens: 3, totalItems: 25, estimatedCost: 15000 };
      mockProjectRepository.getUserStats.mockResolvedValue(stats);

      const response = await authedRequest(app)
        .get('/projects/project-1/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(stats);
    });
  });

  // ==================== EDGE CASES ====================

  describe('Edge cases', () => {
    it('should handle concurrent requests gracefully', async () => {
      mockProjectRepository.findAll.mockResolvedValue({
        data: [], page: 1, total: 0, totalPages: 0,
      });

      const results = await Promise.all([
        authedRequest(app).get('/projects'),
        authedRequest(app).get('/projects'),
        authedRequest(app).get('/projects'),
      ]);

      results.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    it('should handle empty body on update gracefully', async () => {
      mockProjectRepository.findById.mockResolvedValue(mockProject);
      mockProjectRepository.update.mockResolvedValue(mockProject);

      const response = await authedRequest(app)
        .put('/projects/project-1')
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
