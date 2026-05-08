/**
 * AI Generator Routes Integration Tests
 *
 * Tests all AI generator endpoints for correct behavior including:
 * - GET /ai-generator/preferences/:projectId — get generation preferences
 * - POST /ai-generator/generate — generate AI kitchen designs
 * - GET /ai-generator/results/:generationId — poll for generation results
 * - POST /ai-generator/save-design — save a generated design to a project
 * - Auth guard (401 without token)
 * - IDOR prevention (ownership checks on projects and generations)
 * - Validation (Zod schema enforcement)
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

// Mock DesignGeneratorService
const mockGenerateDesigns = jest.fn();

jest.mock('../services/ai/design-generator.service', () => ({
  DesignGeneratorService: jest.fn(() => ({
    generateDesigns: mockGenerateDesigns,
  })),
}));

// Mock ImageGeneratorService
const mockGenerateThumbnail = jest.fn();

jest.mock('../services/ai/image-generator.service', () => ({
  ImageGeneratorService: {
    getInstance: jest.fn(() => ({
      generateThumbnail: mockGenerateThumbnail,
    })),
  },
}));

// Mock database client
const mockPrisma = {
  project: {
    findUnique: jest.fn(),
  },
  kitchen: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  kitchenConfiguration: {
    create: jest.fn(),
  },
  aIGeneration: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  questionnaireResponse: {
    findFirst: jest.fn(),
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
  generalRateLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

// Import after mocks
import { errorHandler } from '../api/middleware/error-middleware';
import aiGeneratorRoutes from '../api/routes/ai-generator-routes';

// ==================== TEST APP SETUP ====================

function createTestApp(): Application {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/ai-generator', aiGeneratorRoutes);
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
const validGenerationId = 'gen-uuid-1234';

const mockProject = {
  id: validProjectId,
  userId: 'test-user-1',
  name: 'Test Kitchen Project',
  status: 'active',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const otherUserProject = {
  id: validProjectId,
  userId: 'other-user-99',
  name: 'Other User Project',
  status: 'active',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockKitchenWithDesigns = {
  id: 'kitchen-1',
  projectId: validProjectId,
  layout: 'l_shaped',
  designs: {
    personaMatch: 'modern',
    colorScheme: 'white,grey,blue',
    materialPreferences: { applianceGrade: 'premium' },
  },
};

const mockGeneration = {
  id: validGenerationId,
  userId: 'test-user-1',
  projectId: validProjectId,
  status: 'completed',
  preferences: { kitchenStyle: 'modern', colorPalette: 'blue,white' },
  designs: [
    {
      id: 'design-1',
      name: 'Modern Kitchen',
      description: 'A sleek modern kitchen',
      thumbnailUrl: '',
      fullImageUrl: '',
      style: 'modern',
      estimatedCost: { min: 8000, max: 12000, currency: 'EUR' },
      features: ['LED lighting'],
      materials: { cabinets: 'Laque mate', countertops: 'Quartz', backsplash: 'Metro', flooring: 'Parquet' },
      layout: 'l-shaped',
      score: 85,
      createdAt: '2024-01-01T00:00:00.000Z',
      isAIGenerated: true,
    },
  ],
  isAIGenerated: true,
  createdAt: new Date('2024-01-01'),
  completedAt: new Date('2024-01-01'),
  errorMessage: null,
};

const otherUserGeneration = {
  ...mockGeneration,
  userId: 'other-user-99',
};

// ==================== TESTS ====================

describe('AI Generator Routes', () => {
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
    it('should return 401 for unauthenticated request to GET /ai-generator/preferences/:projectId', async () => {
      const response = await request(app)
        .get(`/ai-generator/preferences/${validProjectId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 for unauthenticated request to POST /ai-generator/generate', async () => {
      const response = await request(app)
        .post('/ai-generator/generate')
        .send({ projectId: validProjectId, kitchenStyle: 'modern' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 for unauthenticated request to GET /ai-generator/results/:generationId', async () => {
      const response = await request(app)
        .get(`/ai-generator/results/${validGenerationId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 for unauthenticated request to POST /ai-generator/save-design', async () => {
      const response = await request(app)
        .post('/ai-generator/save-design')
        .send({ generationId: validGenerationId, designId: 'design-1', projectId: validProjectId })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== GET /ai-generator/preferences/:projectId ====================

  describe('GET /ai-generator/preferences/:projectId', () => {
    it('should return preferences for a valid project owned by user', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(mockProject);
      mockPrisma.kitchen.findFirst.mockResolvedValue(mockKitchenWithDesigns);

      const response = await authedRequest(app)
        .get(`/ai-generator/preferences/${validProjectId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('kitchenStyle');
      expect(response.body.data.projectId).toBe(validProjectId);
    });

    it('should return 404 when project does not exist', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);

      const response = await authedRequest(app)
        .get(`/ai-generator/preferences/${validProjectId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Project not found');
    });

    it('should return 403 when accessing another user\'s project (IDOR prevention)', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(otherUserProject);

      const response = await authedRequest(app)
        .get(`/ai-generator/preferences/${validProjectId}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Access denied');
    });

    it('should allow admin to access any project preferences', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockPrisma.project.findUnique.mockResolvedValue(otherUserProject);
      mockPrisma.kitchen.findFirst.mockResolvedValue(null);

      const response = await authedRequest(app)
        .get(`/ai-generator/preferences/${validProjectId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeNull();
    });

    it('should return null data when no kitchen with designs exists', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(mockProject);
      mockPrisma.kitchen.findFirst.mockResolvedValue(null);

      const response = await authedRequest(app)
        .get(`/ai-generator/preferences/${validProjectId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeNull();
    });
  });

  // ==================== POST /ai-generator/generate ====================

  describe('POST /ai-generator/generate', () => {
    it('should start generation and return a generationId', async () => {
      mockPrisma.aIGeneration.create.mockResolvedValue({ id: validGenerationId });
      mockPrisma.questionnaireResponse.findFirst.mockResolvedValue(null);
      mockPrisma.aIGeneration.update.mockResolvedValue({});
      // No ANTHROPIC_API_KEY, so it falls back to algorithmic generation
      delete process.env.ANTHROPIC_API_KEY;

      const response = await authedRequest(app)
        .post('/ai-generator/generate')
        .send({ projectId: validProjectId, kitchenStyle: 'modern' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('generationId');
      expect(response.body.data.generationId).toBe(validGenerationId);
    });

    it('should return validation error when projectId is not a valid UUID', async () => {
      const response = await authedRequest(app)
        .post('/ai-generator/generate')
        .send({ projectId: 'not-a-uuid', kitchenStyle: 'modern' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return validation error when kitchenStyle is missing', async () => {
      const response = await authedRequest(app)
        .post('/ai-generator/generate')
        .send({ projectId: validProjectId })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return validation error when kitchenStyle is empty', async () => {
      const response = await authedRequest(app)
        .post('/ai-generator/generate')
        .send({ projectId: validProjectId, kitchenStyle: '' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should cap numberOfDesigns at 5', async () => {
      mockPrisma.aIGeneration.create.mockResolvedValue({ id: validGenerationId });
      mockPrisma.questionnaireResponse.findFirst.mockResolvedValue(null);
      mockPrisma.aIGeneration.update.mockResolvedValue({});
      delete process.env.ANTHROPIC_API_KEY;

      const response = await authedRequest(app)
        .post('/ai-generator/generate')
        .send({ projectId: validProjectId, kitchenStyle: 'modern', numberOfDesigns: 3 })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return validation error when numberOfDesigns exceeds 5', async () => {
      const response = await authedRequest(app)
        .post('/ai-generator/generate')
        .send({ projectId: validProjectId, kitchenStyle: 'modern', numberOfDesigns: 10 })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should persist AIGeneration record to database', async () => {
      mockPrisma.aIGeneration.create.mockResolvedValue({ id: validGenerationId });
      mockPrisma.questionnaireResponse.findFirst.mockResolvedValue(null);
      mockPrisma.aIGeneration.update.mockResolvedValue({});
      delete process.env.ANTHROPIC_API_KEY;

      await authedRequest(app)
        .post('/ai-generator/generate')
        .send({ projectId: validProjectId, kitchenStyle: 'modern' })
        .expect(200);

      expect(mockPrisma.aIGeneration.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'test-user-1',
            status: 'processing',
          }),
        })
      );
    });
  });

  // ==================== GET /ai-generator/results/:generationId ====================

  describe('GET /ai-generator/results/:generationId', () => {
    it('should return generation results for own generation', async () => {
      mockPrisma.aIGeneration.findUnique.mockResolvedValue(mockGeneration);

      const response = await authedRequest(app)
        .get(`/ai-generator/results/${validGenerationId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('status', 'completed');
      expect(response.body.data).toHaveProperty('designs');
      expect(response.body.data.designs).toHaveLength(1);
    });

    it('should return 404 when generation does not exist', async () => {
      mockPrisma.aIGeneration.findUnique.mockResolvedValue(null);

      const response = await authedRequest(app)
        .get(`/ai-generator/results/${validGenerationId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Generation not found');
    });

    it('should return 403 when accessing another user\'s generation (IDOR prevention)', async () => {
      mockPrisma.aIGeneration.findUnique.mockResolvedValue(otherUserGeneration);

      const response = await authedRequest(app)
        .get(`/ai-generator/results/${validGenerationId}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Access denied');
    });

    it('should allow admin to access any generation results', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockPrisma.aIGeneration.findUnique.mockResolvedValue(otherUserGeneration);

      const response = await authedRequest(app)
        .get(`/ai-generator/results/${validGenerationId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('status');
    });

    it('should include isAIGenerated flag in response', async () => {
      mockPrisma.aIGeneration.findUnique.mockResolvedValue(mockGeneration);

      const response = await authedRequest(app)
        .get(`/ai-generator/results/${validGenerationId}`)
        .expect(200);

      expect(response.body.data.isAIGenerated).toBe(true);
    });
  });

  // ==================== POST /ai-generator/save-design ====================

  describe('POST /ai-generator/save-design', () => {
    it('should save a generated design successfully', async () => {
      mockPrisma.aIGeneration.findUnique.mockResolvedValue(mockGeneration);
      mockPrisma.project.findUnique.mockResolvedValue(mockProject);
      mockPrisma.kitchen.create.mockResolvedValue({ id: 'kitchen-new-1' });
      mockPrisma.kitchenConfiguration.create.mockResolvedValue({});

      const response = await authedRequest(app)
        .post('/ai-generator/save-design')
        .send({
          generationId: validGenerationId,
          designId: 'design-1',
          projectId: validProjectId,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('kitchenId', 'kitchen-new-1');
      expect(response.body.message).toContain('Design saved');
    });

    it('should return validation error when generationId is missing', async () => {
      const response = await authedRequest(app)
        .post('/ai-generator/save-design')
        .send({ designId: 'design-1', projectId: validProjectId })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return validation error when designId is missing', async () => {
      const response = await authedRequest(app)
        .post('/ai-generator/save-design')
        .send({ generationId: validGenerationId, projectId: validProjectId })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return validation error when projectId is not a UUID', async () => {
      const response = await authedRequest(app)
        .post('/ai-generator/save-design')
        .send({ generationId: validGenerationId, designId: 'design-1', projectId: 'not-uuid' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 when generation does not exist', async () => {
      mockPrisma.aIGeneration.findUnique.mockResolvedValue(null);

      const response = await authedRequest(app)
        .post('/ai-generator/save-design')
        .send({
          generationId: validGenerationId,
          designId: 'design-1',
          projectId: validProjectId,
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Generation not found');
    });

    it('should return 404 when generation belongs to another user (IDOR prevention)', async () => {
      mockPrisma.aIGeneration.findUnique.mockResolvedValue(otherUserGeneration);

      const response = await authedRequest(app)
        .post('/ai-generator/save-design')
        .send({
          generationId: validGenerationId,
          designId: 'design-1',
          projectId: validProjectId,
        })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 when designId is not found in generation designs', async () => {
      mockPrisma.aIGeneration.findUnique.mockResolvedValue(mockGeneration);

      const response = await authedRequest(app)
        .post('/ai-generator/save-design')
        .send({
          generationId: validGenerationId,
          designId: 'nonexistent-design',
          projectId: validProjectId,
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Design not found');
    });

    it('should return 403 when project belongs to another user', async () => {
      mockPrisma.aIGeneration.findUnique.mockResolvedValue(mockGeneration);
      mockPrisma.project.findUnique.mockResolvedValue(otherUserProject);

      const response = await authedRequest(app)
        .post('/ai-generator/save-design')
        .send({
          generationId: validGenerationId,
          designId: 'design-1',
          projectId: validProjectId,
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Access denied');
    });

    it('should create Kitchen and KitchenConfiguration records', async () => {
      mockPrisma.aIGeneration.findUnique.mockResolvedValue(mockGeneration);
      mockPrisma.project.findUnique.mockResolvedValue(mockProject);
      mockPrisma.kitchen.create.mockResolvedValue({ id: 'kitchen-new-1' });
      mockPrisma.kitchenConfiguration.create.mockResolvedValue({});

      await authedRequest(app)
        .post('/ai-generator/save-design')
        .send({
          generationId: validGenerationId,
          designId: 'design-1',
          projectId: validProjectId,
        })
        .expect(201);

      expect(mockPrisma.kitchen.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            projectId: validProjectId,
            userId: 'test-user-1',
            isGenerated: true,
          }),
        })
      );
      expect(mockPrisma.kitchenConfiguration.create).toHaveBeenCalled();
    });
  });
});
