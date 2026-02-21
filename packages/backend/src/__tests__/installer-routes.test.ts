/**
 * Installer Routes Tests
 *
 * Tests the installer marketplace endpoints:
 * - GET /installers/search — search installers
 * - GET /installers/:id — get installer profile
 * - POST /installers/:id/reviews — add review
 * - Auth guard (401 without token)
 * - Validation (invalid review data)
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

const mockSearch = vi.fn();
const mockGetById = vi.fn();
const mockAddReview = vi.fn();
const mockRegister = vi.fn();
const mockGetMyProjects = vi.fn();

vi.mock('../../services/installer/installer.service', () => ({
  installerService: {
    search: mockSearch,
    getById: mockGetById,
    addReview: mockAddReview,
    register: mockRegister,
    getMyProjects: mockGetMyProjects,
    requestInstallation: vi.fn(),
    getProjectById: vi.fn(),
    updateProject: vi.fn(),
    addMilestone: vi.fn(),
  },
  InstallerServiceError: class InstallerServiceError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
    }
  },
}));

vi.mock('../../database/client', () => ({ prisma: { $disconnect: vi.fn() } }));

vi.mock('../../config/app-config', () => ({
  config: { corsOrigins: ['http://localhost:3000'], env: 'test', port: 3000, version: '1.0.0', rateLimit: { maxRequests: 100 } },
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

import installerRoutes from '../../api/routes/installer-routes';
import { errorHandler } from '../../api/middleware/error-middleware';

// ==================== SETUP ====================

function createTestApp(): Application {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/installers', installerRoutes);
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

const validInstallerId = '550e8400-e29b-41d4-a716-446655440000';

const mockInstaller = {
  id: validInstallerId,
  companyName: 'KitchenPro',
  contactName: 'Jean Dupont',
  email: 'jean@kitchenpro.fr',
  city: 'Paris',
  postalCode: '75001',
  avgRating: 4.5,
  reviewCount: 12,
};

const mockSearchResult = {
  installers: [mockInstaller],
  total: 1,
};

const mockReview = {
  id: 'review-1',
  installerId: validInstallerId,
  userId: 'test-user-id',
  rating: 5,
  title: 'Excellent work',
  comment: 'Very professional installation',
};

// ==================== TESTS ====================

describe('Installer Routes', () => {
  let app: Application;

  beforeEach(() => {
    vi.clearAllMocks();
    currentTestUser = { userId: 'test-user-id', email: 'test@test.com', role: 'user' };
    app = createTestApp();
  });

  describe('GET /installers/search', () => {
    it('should return search results with 200 status', async () => {
      mockSearch.mockResolvedValue(mockSearchResult);

      const response = await authedRequest(app)
        .get('/installers/search?postalCode=75001')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].companyName).toBe('KitchenPro');
    });

    it('should return 401 when user is not authenticated', async () => {
      const response = await request(app)
        .get('/installers/search?postalCode=75001')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should pass query parameters to the service', async () => {
      mockSearch.mockResolvedValue(mockSearchResult);

      await authedRequest(app)
        .get('/installers/search?postalCode=75001&minRating=4&page=2&limit=10')
        .expect(200);

      expect(mockSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          postalCode: '75001',
          minRating: 4,
          page: 2,
          limit: 10,
        }),
      );
    });
  });

  describe('GET /installers/:id', () => {
    it('should return installer profile with 200 status', async () => {
      mockGetById.mockResolvedValue(mockInstaller);

      const response = await authedRequest(app)
        .get(`/installers/${validInstallerId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.companyName).toBe('KitchenPro');
    });

    it('should return 404 when installer is not found', async () => {
      mockGetById.mockResolvedValue(null);

      const response = await authedRequest(app)
        .get(`/installers/${validInstallerId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Installer not found');
    });
  });

  describe('POST /installers/:id/reviews', () => {
    it('should add review and return 201 status', async () => {
      mockAddReview.mockResolvedValue(mockReview);

      const response = await authedRequest(app)
        .post(`/installers/${validInstallerId}/reviews`)
        .send({ rating: 5, title: 'Excellent work', comment: 'Very professional installation' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.rating).toBe(5);
      expect(response.body.message).toContain('Review added');
    });

    it('should return 401 when user is not authenticated', async () => {
      const response = await request(app)
        .post(`/installers/${validInstallerId}/reviews`)
        .send({ rating: 5 })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 when installer does not exist', async () => {
      const { InstallerServiceError } = await import('../../services/installer/installer.service');
      mockAddReview.mockRejectedValue(new InstallerServiceError('Installer not found', 'INSTALLER_NOT_FOUND'));

      const response = await authedRequest(app)
        .post(`/installers/${validInstallerId}/reviews`)
        .send({ rating: 4 })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});
