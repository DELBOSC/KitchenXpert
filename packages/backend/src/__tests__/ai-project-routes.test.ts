/**
 * AI Project Routes Integration Tests
 *
 * Tests all AI project assistant endpoints for correct behavior including:
 * - POST /ai-project/describe — generate AI project description
 * - POST /ai-project/compare-designs — compare multiple kitchen designs
 * - GET /ai-project/recommendations/:projectId — get AI progress recommendations
 * - Auth guard (401 without token)
 * - IDOR prevention (ownership checks on projects)
 * - Validation (missing designs, project not found)
 * - Admin bypass for ownership checks
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

// Mock ProjectAssistantService
const mockGenerateProjectDescription = jest.fn();
const mockCompareDesigns = jest.fn();
const mockGetProgressRecommendations = jest.fn();

jest.mock('../services/ai/project-assistant.service', () => ({
  ProjectAssistantService: jest.fn(() => ({
    generateProjectDescription: mockGenerateProjectDescription,
    compareDesigns: mockCompareDesigns,
    getProgressRecommendations: mockGetProgressRecommendations,
  })),
}));

// Mock database client
const mockPrisma = {
  project: {
    findUnique: jest.fn(),
  },
  questionnaireResponse: {
    findUnique: jest.fn(),
  },
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
  aiRateLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
  generalRateLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

// Import after mocks
import { errorHandler } from '../api/middleware/error-middleware';
import aiProjectRoutes from '../api/routes/ai-project-routes';

// ==================== TEST APP SETUP ====================

function createTestApp(): Application {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/ai-project', aiProjectRoutes);
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

const validProjectId = '550e8400-e29b-41d4-a716-446655440000';

const mockProject = {
  id: validProjectId,
  userId: 'test-user-1',
  name: 'Test Kitchen Project',
  status: 'active',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  kitchens: [
    { name: 'Kitchen A', style: 'modern', score: 85 },
    { name: 'Kitchen B', style: 'farmhouse', score: null },
  ],
};

const otherUserProject = {
  id: validProjectId,
  userId: 'other-user-99',
  name: 'Other User Project',
  status: 'active',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  kitchens: [],
};

const mockQuestionnaireResponse = {
  id: 'qr-1',
  projectId: validProjectId,
  spatialData: { width: 3000, depth: 2500 },
  cookingHabits: { frequency: 'daily' },
  userProfile: { familySize: 4 },
  budgetData: { min: 10000, max: 25000 },
  aestheticPrefs: { style: 'modern' },
};

const mockDesignA = {
  id: 'design-a',
  name: 'Modern Kitchen',
  style: 'modern',
  layout: 'l-shaped',
  estimatedCost: { min: 10000, max: 15000 },
};

const mockDesignB = {
  id: 'design-b',
  name: 'Farmhouse Kitchen',
  style: 'farmhouse',
  layout: 'island',
  estimatedCost: { min: 12000, max: 18000 },
};

// ==================== TESTS ====================

describe('AI Project Routes', () => {
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
    it('should return 401 for unauthenticated request to POST /ai-project/describe', async () => {
      const response = await request(app)
        .post('/ai-project/describe')
        .send({ projectName: 'My Kitchen' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 for unauthenticated request to POST /ai-project/compare-designs', async () => {
      const response = await request(app)
        .post('/ai-project/compare-designs')
        .send({ designs: [mockDesignA, mockDesignB] })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 for unauthenticated request to GET /ai-project/recommendations/:projectId', async () => {
      const response = await request(app)
        .get(`/ai-project/recommendations/${validProjectId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== POST /ai-project/describe ====================

  describe('POST /ai-project/describe', () => {
    it('should generate a project description successfully', async () => {
      mockGenerateProjectDescription.mockResolvedValue('A beautiful modern kitchen with clean lines and premium materials.');

      const response = await authedRequest(app)
        .post('/ai-project/describe')
        .send({ projectName: 'Modern Dream Kitchen' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('description');
      expect(typeof response.body.data.description).toBe('string');
    });

    it('should call service with correct userId', async () => {
      mockGenerateProjectDescription.mockResolvedValue('Description text');

      await authedRequest(app)
        .post('/ai-project/describe')
        .send({ projectName: 'My Kitchen' })
        .expect(200);

      expect(mockGenerateProjectDescription).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'test-user-1',
          projectName: 'My Kitchen',
        })
      );
    });

    it('should include questionnaire data when projectId is provided and owned by user', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({ id: validProjectId, userId: 'test-user-1' });
      mockPrisma.questionnaireResponse.findUnique.mockResolvedValue(mockQuestionnaireResponse);
      mockGenerateProjectDescription.mockResolvedValue('Rich description with questionnaire data.');

      const response = await authedRequest(app)
        .post('/ai-project/describe')
        .send({ projectName: 'My Kitchen', projectId: validProjectId })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockGenerateProjectDescription).toHaveBeenCalledWith(
        expect.objectContaining({
          questionnaireData: expect.objectContaining({
            spatialData: mockQuestionnaireResponse.spatialData,
            cookingHabits: mockQuestionnaireResponse.cookingHabits,
          }),
        })
      );
    });

    it('should not include questionnaire data when project belongs to another user (IDOR prevention)', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({ id: validProjectId, userId: 'other-user-99' });
      mockGenerateProjectDescription.mockResolvedValue('Description without questionnaire.');

      const response = await authedRequest(app)
        .post('/ai-project/describe')
        .send({ projectName: 'My Kitchen', projectId: validProjectId })
        .expect(200);

      expect(response.body.success).toBe(true);
      // Questionnaire lookup should be skipped
      expect(mockPrisma.questionnaireResponse.findUnique).not.toHaveBeenCalled();
      expect(mockGenerateProjectDescription).toHaveBeenCalledWith(
        expect.objectContaining({
          questionnaireData: undefined,
        })
      );
    });

    it('should allow admin to access questionnaire data of any project', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockPrisma.project.findUnique.mockResolvedValue({ id: validProjectId, userId: 'other-user-99' });
      mockPrisma.questionnaireResponse.findUnique.mockResolvedValue(mockQuestionnaireResponse);
      mockGenerateProjectDescription.mockResolvedValue('Admin description.');

      const response = await authedRequest(app)
        .post('/ai-project/describe')
        .send({ projectName: 'Other Kitchen', projectId: validProjectId })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockPrisma.questionnaireResponse.findUnique).toHaveBeenCalled();
    });

    it('should work without projectId (no questionnaire enrichment)', async () => {
      mockGenerateProjectDescription.mockResolvedValue('Basic description.');

      const response = await authedRequest(app)
        .post('/ai-project/describe')
        .send({ projectName: 'Quick Kitchen' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockPrisma.project.findUnique).not.toHaveBeenCalled();
    });

    it('should handle service errors gracefully', async () => {
      mockGenerateProjectDescription.mockRejectedValue(new Error('AI service down'));

      const response = await authedRequest(app)
        .post('/ai-project/describe')
        .send({ projectName: 'My Kitchen' })
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should handle project not found in database', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);
      mockGenerateProjectDescription.mockResolvedValue('Description without enrichment.');

      const response = await authedRequest(app)
        .post('/ai-project/describe')
        .send({ projectName: 'My Kitchen', projectId: validProjectId })
        .expect(200);

      // Should still succeed, just without questionnaire data
      expect(response.body.success).toBe(true);
      expect(mockPrisma.questionnaireResponse.findUnique).not.toHaveBeenCalled();
    });
  });

  // ==================== POST /ai-project/compare-designs ====================

  describe('POST /ai-project/compare-designs', () => {
    it('should compare designs successfully', async () => {
      const comparisonResult = {
        winner: 'design-a',
        comparison: [
          { category: 'Cost', designA: 'Lower', designB: 'Higher' },
          { category: 'Style', designA: 'Modern', designB: 'Farmhouse' },
        ],
        summary: 'Design A is more cost-effective while Design B offers a cozier feel.',
      };
      mockCompareDesigns.mockResolvedValue(comparisonResult);

      const response = await authedRequest(app)
        .post('/ai-project/compare-designs')
        .send({ designs: [mockDesignA, mockDesignB] })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(comparisonResult);
    });

    it('should return 400 when designs array is missing', async () => {
      const response = await authedRequest(app)
        .post('/ai-project/compare-designs')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('At least 2 designs are required');
    });

    it('should return 400 when designs has fewer than 2 items', async () => {
      const response = await authedRequest(app)
        .post('/ai-project/compare-designs')
        .send({ designs: [mockDesignA] })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('At least 2 designs are required');
    });

    it('should return 400 when designs is empty array', async () => {
      const response = await authedRequest(app)
        .post('/ai-project/compare-designs')
        .send({ designs: [] })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('At least 2 designs are required');
    });

    it('should return 400 when designs is not an array', async () => {
      const response = await authedRequest(app)
        .post('/ai-project/compare-designs')
        .send({ designs: 'not-an-array' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should call compareDesigns with correct userId', async () => {
      mockCompareDesigns.mockResolvedValue({ summary: 'comparison' });

      await authedRequest(app)
        .post('/ai-project/compare-designs')
        .send({ designs: [mockDesignA, mockDesignB] })
        .expect(200);

      expect(mockCompareDesigns).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'test-user-1',
          designs: [mockDesignA, mockDesignB],
        })
      );
    });

    it('should handle service errors gracefully', async () => {
      mockCompareDesigns.mockRejectedValue(new Error('Comparison service error'));

      const response = await authedRequest(app)
        .post('/ai-project/compare-designs')
        .send({ designs: [mockDesignA, mockDesignB] })
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== GET /ai-project/recommendations/:projectId ====================

  describe('GET /ai-project/recommendations/:projectId', () => {
    it('should return recommendations for an owned project', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(mockProject);
      mockPrisma.questionnaireResponse.findUnique.mockResolvedValue(mockQuestionnaireResponse);
      mockGetProgressRecommendations.mockResolvedValue({
        recommendations: ['Complete the questionnaire', 'Add more design variations'],
        progress: 60,
      });

      const response = await authedRequest(app)
        .get(`/ai-project/recommendations/${validProjectId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('recommendations');
    });

    it('should return 404 when project does not exist', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);

      const response = await authedRequest(app)
        .get(`/ai-project/recommendations/${validProjectId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Project not found');
    });

    it('should return 404 when project belongs to another user (IDOR prevention)', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(otherUserProject);

      const response = await authedRequest(app)
        .get(`/ai-project/recommendations/${validProjectId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Project not found');
    });

    it('should allow admin to access any project recommendations', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockPrisma.project.findUnique.mockResolvedValue(otherUserProject);
      mockPrisma.questionnaireResponse.findUnique.mockResolvedValue(null);
      mockGetProgressRecommendations.mockResolvedValue({
        recommendations: ['Start questionnaire'],
        progress: 10,
      });

      const response = await authedRequest(app)
        .get(`/ai-project/recommendations/${validProjectId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should pass hasQuestionnaire and hasDesigns flags correctly', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(mockProject);
      mockPrisma.questionnaireResponse.findUnique.mockResolvedValue(mockQuestionnaireResponse);
      mockGetProgressRecommendations.mockResolvedValue({ recommendations: [] });

      await authedRequest(app)
        .get(`/ai-project/recommendations/${validProjectId}`)
        .expect(200);

      expect(mockGetProgressRecommendations).toHaveBeenCalledWith(
        expect.objectContaining({
          hasQuestionnaire: true,
          hasDesigns: true, // mockProject has a kitchen with score !== null
          userId: 'test-user-1',
        })
      );
    });

    it('should set hasDesigns to false when no kitchens have scores', async () => {
      const projectNoScores = {
        ...mockProject,
        kitchens: [
          { name: 'Kitchen A', style: 'modern', score: null },
        ],
      };
      mockPrisma.project.findUnique.mockResolvedValue(projectNoScores);
      mockPrisma.questionnaireResponse.findUnique.mockResolvedValue(null);
      mockGetProgressRecommendations.mockResolvedValue({ recommendations: [] });

      await authedRequest(app)
        .get(`/ai-project/recommendations/${validProjectId}`)
        .expect(200);

      expect(mockGetProgressRecommendations).toHaveBeenCalledWith(
        expect.objectContaining({
          hasQuestionnaire: false,
          hasDesigns: false,
        })
      );
    });

    it('should handle service errors gracefully', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(mockProject);
      mockPrisma.questionnaireResponse.findUnique.mockResolvedValue(null);
      mockGetProgressRecommendations.mockRejectedValue(new Error('AI service error'));

      const response = await authedRequest(app)
        .get(`/ai-project/recommendations/${validProjectId}`)
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should include kitchen names and styles in the project data passed to service', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(mockProject);
      mockPrisma.questionnaireResponse.findUnique.mockResolvedValue(null);
      mockGetProgressRecommendations.mockResolvedValue({ recommendations: [] });

      await authedRequest(app)
        .get(`/ai-project/recommendations/${validProjectId}`)
        .expect(200);

      expect(mockGetProgressRecommendations).toHaveBeenCalledWith(
        expect.objectContaining({
          project: expect.objectContaining({
            name: 'Test Kitchen Project',
            status: 'active',
            kitchens: expect.arrayContaining([
              expect.objectContaining({ name: 'Kitchen A', style: 'modern', score: 85 }),
            ]),
          }),
        })
      );
    });
  });
});
