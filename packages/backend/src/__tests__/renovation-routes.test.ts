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

import request from 'supertest';
import express, { type Application, type Request, type Response, type NextFunction } from 'express';
import cookieParser from 'cookie-parser';

// ==================== MOCKS ====================

jest.mock('../utils/logger', () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  createModuleLogger: jest.fn(() => ({
    info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(),
  })),
}));

const mockCreateProject = jest.fn();
const mockGetProject = jest.fn();
const mockListUserProjects = jest.fn();
const mockAnalyzeExistingKitchen = jest.fn();
const mockUpdateProject = jest.fn();
const mockGenerateComparison = jest.fn();

jest.mock('../services/ai/renovation.service', () => ({
  RenovationService: jest.fn().mockImplementation(() => ({
    createProject: mockCreateProject,
    getProject: mockGetProject,
    listUserProjects: mockListUserProjects,
    analyzeExistingKitchen: mockAnalyzeExistingKitchen,
    updateProject: mockUpdateProject,
    generateComparison: mockGenerateComparison,
  })),
}));

jest.mock('../middleware/upload-middleware', () => ({
  uploadSingleImage: jest.fn(() => (_req: any, _res: any, next: any) => next()),
  handleUploadError: (_err: any, _req: any, _res: any, next: any) => next(),
}));

jest.mock('../database/client', () => ({ prisma: { $disconnect: jest.fn() } }));

jest.mock('../config/app-config', () => ({
  config: { corsOrigins: ['http://localhost:3000'], env: 'test', port: 3000, version: '1.0.0', rateLimit: { maxRequests: 100 } },
}));

jest.mock('express-rate-limit', () => ({
  default: jest.fn(() => (_req: Request, _res: Response, next: NextFunction) => next()),
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

jest.mock('../api/middleware/auth-middleware', async () => {
  const { UnauthorizedError } = await import('@kitchenxpert/common');
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

import renovationRoutes from '../api/routes/renovation-routes';
import { errorHandler } from '../api/middleware/error-middleware';

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
    jest.clearAllMocks();
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
