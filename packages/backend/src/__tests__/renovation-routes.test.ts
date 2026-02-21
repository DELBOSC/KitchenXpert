/**
 * Renovation Routes Tests
 *
 * Tests the renovation before/after workflow endpoints:
 * - POST /renovation — create a renovation project
 * - GET /renovation/:id — get a renovation project
 * - Auth guard (401 without token)
 * - Ownership verification (404 for not found or access denied)
 * - Validation (invalid ID format)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express, { type Application, type Request, type Response, type NextFunction } from 'express';
import cookieParser from 'cookie-parser';

// ==================== MOCKS ====================

vi.mock('../../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  createModuleLogger: vi.fn(() => ({
    info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
  })),
}));

const mockCreateProject = vi.fn();
const mockGetProject = vi.fn();
const mockListUserProjects = vi.fn();
const mockAnalyzeExistingKitchen = vi.fn();
const mockUpdateProject = vi.fn();
const mockGenerateComparison = vi.fn();

vi.mock('../../services/ai/renovation.service', () => ({
  RenovationService: vi.fn().mockImplementation(() => ({
    createProject: mockCreateProject,
    getProject: mockGetProject,
    listUserProjects: mockListUserProjects,
    analyzeExistingKitchen: mockAnalyzeExistingKitchen,
    updateProject: mockUpdateProject,
    generateComparison: mockGenerateComparison,
  })),
}));

vi.mock('../../middleware/upload-middleware', () => ({
  uploadSingleImage: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  handleUploadError: (_err: any, _req: any, _res: any, next: any) => next(),
}));

vi.mock('../../database/client', () => ({ prisma: { $disconnect: vi.fn() } }));

vi.mock('../../config/app-config', () => ({
  config: { corsOrigins: ['http://localhost:3000'], env: 'test', port: 3000, version: '1.0.0', rateLimit: { maxRequests: 100 } },
}));

vi.mock('express-rate-limit', () => ({
  default: vi.fn(() => (_req: Request, _res: Response, next: NextFunction) => next()),
}));

vi.mock('../../auth/token-blacklist', () => ({
  getTokenBlacklist: vi.fn(() => ({
    addToBlacklist: vi.fn().mockResolvedValue(undefined),
    isBlacklisted: vi.fn().mockResolvedValue(false),
    isUserBlacklisted: vi.fn().mockResolvedValue(false),
  })),
  getTokenExpiration: vi.fn(() => new Date(Date.now() + 3600000)),
  getTokenIssuedAt: vi.fn(() => new Date()),
}));

vi.mock('../../auth/jwt.service', () => ({
  jwtService: {
    verifyAccessToken: vi.fn().mockReturnValue({
      userId: 'test-user-id', email: 'test@test.com', role: 'user',
    }),
    generateTokens: vi.fn(),
  },
}));

let currentTestUser = { userId: 'test-user-id', email: 'test@test.com', role: 'user' };

vi.mock('../../api/middleware/auth-middleware', async () => {
  const { UnauthorizedError } = await import('@kitchenxpert/common');
  return {
    authenticate: vi.fn((req: any, _res: any, next: any) => {
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

vi.mock('../../api/middleware/rate-limit-middleware', () => ({
  generalRateLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

import renovationRoutes from '../../api/routes/renovation-routes';
import { errorHandler } from '../../api/middleware/error-middleware';

// ==================== SETUP ====================

function createTestApp(): Application {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/renovation', renovationRoutes);
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

const validProjectId = '550e8400-e29b-41d4-a716-446655440000';

const mockProject = {
  id: validProjectId,
  userId: 'test-user-id',
  status: 'created',
  beforePhotos: [],
  createdAt: new Date().toISOString(),
};

// ==================== TESTS ====================

describe('Renovation Routes', () => {
  let app: Application;

  beforeEach(() => {
    vi.clearAllMocks();
    currentTestUser = { userId: 'test-user-id', email: 'test@test.com', role: 'user' };
    app = createTestApp();
  });

  describe('POST /renovation', () => {
    it('should create a renovation project and return 201 status', async () => {
      mockCreateProject.mockResolvedValue(mockProject);

      const response = await authedRequest(app)
        .post('/renovation')
        .send({})
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(validProjectId);
      expect(mockCreateProject).toHaveBeenCalledWith('test-user-id', expect.any(Object));
    });

    it('should return 401 when user is not authenticated', async () => {
      const response = await request(app)
        .post('/renovation')
        .send({})
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should accept optional kitchenId in the body', async () => {
      const kitchenId = '660e8400-e29b-41d4-a716-446655440001';
      mockCreateProject.mockResolvedValue({ ...mockProject, kitchenId });

      const response = await authedRequest(app)
        .post('/renovation')
        .send({ kitchenId })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(mockCreateProject).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({ kitchenId }),
      );
    });
  });

  describe('GET /renovation/:id', () => {
    it('should return renovation project with 200 status', async () => {
      mockGetProject.mockResolvedValue(mockProject);

      const response = await authedRequest(app)
        .get(`/renovation/${validProjectId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(validProjectId);
    });

    it('should return 404 when project is not found', async () => {
      mockGetProject.mockResolvedValue(null);

      const response = await authedRequest(app)
        .get(`/renovation/${validProjectId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 when user is not authenticated', async () => {
      const response = await request(app)
        .get(`/renovation/${validProjectId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid ID format', async () => {
      const response = await authedRequest(app)
        .get('/renovation/not-a-uuid')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
