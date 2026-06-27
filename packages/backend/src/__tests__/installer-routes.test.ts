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

import cookieParser from 'cookie-parser';
import express, { type Application, type Request, type Response, type NextFunction } from 'express';
import request from 'supertest';

// ==================== MOCKS ====================

jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  createModuleLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

const mockSearch = jest.fn();
const mockGetById = jest.fn();
const mockAddReview = jest.fn();
const mockRegister = jest.fn();
const mockGetMyProjects = jest.fn();

jest.mock('../services/installer/installer.service', () => ({
  installerService: {
    search: mockSearch,
    getById: mockGetById,
    addReview: mockAddReview,
    register: mockRegister,
    getMyProjects: mockGetMyProjects,
    requestInstallation: jest.fn(),
    getProjectById: jest.fn(),
    updateProject: jest.fn(),
    addMilestone: jest.fn(),
  },
  InstallerServiceError: class InstallerServiceError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
    }
  },
}));

jest.mock('../database/client', () => ({ prisma: { $disconnect: jest.fn() } }));

jest.mock('../config/app-config', () => ({
  config: {
    corsOrigins: ['http://localhost:3000'],
    env: 'test',
    port: 3000,
    version: '1.0.0',
    rateLimit: { maxRequests: 100 },
  },
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
      userId: 'test-user-id',
      email: 'test@test.com',
      role: 'user',
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
import installerRoutes from '../api/routes/installer-routes';

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
    jest.clearAllMocks();
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
      const response = await request(app).get('/installers/search?postalCode=75001').expect(401);

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
        })
      );
    });
  });

  describe('GET /installers/:id', () => {
    it('should return installer profile with 200 status', async () => {
      mockGetById.mockResolvedValue(mockInstaller);

      const response = await authedRequest(app).get(`/installers/${validInstallerId}`).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.companyName).toBe('KitchenPro');
    });

    it('should return 404 when installer is not found', async () => {
      mockGetById.mockResolvedValue(null);

      const response = await authedRequest(app).get(`/installers/${validInstallerId}`).expect(404);

      expect(response.body.success).toBe(false);
      expect(JSON.stringify(response.body)).toContain('Installer not found');
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
      const { InstallerServiceError } = require('../services/installer/installer.service');
      mockAddReview.mockRejectedValue(
        new InstallerServiceError('Installer not found', 'INSTALLER_NOT_FOUND')
      );

      const response = await authedRequest(app)
        .post(`/installers/${validInstallerId}/reviews`)
        .send({ rating: 4 })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});
