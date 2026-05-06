/**
 * I18n Routes Integration Tests
 *
 * Tests all i18n-related endpoints for correct behavior including:
 * - GET /i18n/locales — get all locales (public)
 * - GET /i18n/locales/default — get default locale (public)
 * - GET /i18n/locales/code/:code — get locale by code (public)
 * - GET /i18n/translations/:localeCode — get translations for locale (public)
 * - GET /i18n/translations/:localeCode/:namespace — get namespace translations (public)
 * - GET /i18n/namespaces — get all namespaces (public)
 * - POST /i18n/locales — create locale (admin only)
 * - PUT /i18n/locales/:id — update locale (admin only)
 * - DELETE /i18n/locales/:id — delete locale (admin only)
 * - POST /i18n/locales/:id/set-default — set default locale (admin only)
 * - GET /i18n/translations — get translations with filters (admin only)
 * - POST /i18n/translations — create translation (admin only)
 * - PUT /i18n/translations — upsert translation (admin only)
 * - PUT /i18n/translations/:id — update translation by ID (admin only)
 * - DELETE /i18n/translations/:id — delete translation (admin only)
 * - POST /i18n/translations/bulk — bulk create translations (admin only)
 * - DELETE /i18n/translations/namespace/:localeId/:namespace — delete namespace (admin only)
 * - GET /i18n/stats — get i18n stats (admin only)
 * - GET /i18n/missing/:sourceLocaleId/:targetLocaleId — missing translations (admin only)
 * - POST /i18n/import/:localeCode — import translations (admin only)
 * - GET /i18n/export/:localeCode — export translations (admin only)
 * - Auth guard (401/403 for admin-only routes)
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

// Mock locale repository
const mockLocaleRepository = {
  findAllLocales: jest.fn(),
  findLocaleById: jest.fn(),
  findLocaleByCode: jest.fn(),
  getDefaultLocale: jest.fn(),
  createLocale: jest.fn(),
  updateLocale: jest.fn(),
  deleteLocale: jest.fn(),
  setDefaultLocale: jest.fn(),
  findTranslations: jest.fn(),
  getNamespaceTranslations: jest.fn(),
  getAllTranslationsForLocale: jest.fn(),
  createTranslation: jest.fn(),
  upsertTranslation: jest.fn(),
  updateTranslation: jest.fn(),
  deleteTranslation: jest.fn(),
  createManyTranslations: jest.fn(),
  deleteNamespaceTranslations: jest.fn(),
  getNamespaces: jest.fn(),
  countTranslations: jest.fn(),
  getMissingTranslations: jest.fn(),
  importTranslations: jest.fn(),
};

jest.mock('../repositories/locale-repository', () => ({
  LocaleRepository: jest.fn(() => mockLocaleRepository),
}));

// Mock database client
const mockPrisma = {
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
import i18nRoutes from '../api/routes/i18n-routes';
import { errorHandler } from '../api/middleware/error-middleware';

// ==================== TEST APP SETUP ====================

function createTestApp(): Application {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/i18n', i18nRoutes);
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

const mockLocale = {
  id: 'locale-1',
  code: 'en',
  name: 'English',
  nativeName: 'English',
  isDefault: true,
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockLocaleFr = {
  id: 'locale-2',
  code: 'fr',
  name: 'French',
  nativeName: 'Francais',
  isDefault: false,
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockTranslation = {
  id: 'trans-1',
  localeId: 'locale-1',
  namespace: 'common',
  key: 'greeting',
  value: 'Hello',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

// ==================== TESTS ====================

describe('I18n Routes', () => {
  let app: Application;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    currentTestUser = { userId: 'test-user-1', email: 'test@test.com', role: 'user' };
  });

  // ==================== PUBLIC ROUTES ====================

  describe('GET /i18n/locales (public)', () => {
    it('should return all locales without authentication', async () => {
      mockLocaleRepository.findAllLocales.mockResolvedValue([mockLocale, mockLocaleFr]);

      const response = await request(app)
        .get('/i18n/locales')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should filter by isActive query parameter', async () => {
      mockLocaleRepository.findAllLocales.mockResolvedValue([mockLocale]);

      const response = await request(app)
        .get('/i18n/locales?isActive=true')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockLocaleRepository.findAllLocales).toHaveBeenCalledWith(true);
    });
  });

  describe('GET /i18n/locales/default (public)', () => {
    it('should return the default locale', async () => {
      mockLocaleRepository.getDefaultLocale.mockResolvedValue(mockLocale);

      const response = await request(app)
        .get('/i18n/locales/default')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.code).toBe('en');
    });

    it('should return 404 when no default locale is configured', async () => {
      mockLocaleRepository.getDefaultLocale.mockResolvedValue(null);

      const response = await request(app)
        .get('/i18n/locales/default')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /i18n/locales/code/:code (public)', () => {
    it('should return locale by code', async () => {
      mockLocaleRepository.findLocaleByCode.mockResolvedValue(mockLocale);

      const response = await request(app)
        .get('/i18n/locales/code/en')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.code).toBe('en');
    });

    it('should return 404 for unknown locale code', async () => {
      mockLocaleRepository.findLocaleByCode.mockResolvedValue(null);

      const response = await request(app)
        .get('/i18n/locales/code/zz')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /i18n/translations/:localeCode (public)', () => {
    it('should return all translations for a locale', async () => {
      mockLocaleRepository.getAllTranslationsForLocale.mockResolvedValue({ common: { greeting: 'Hello' } });

      const response = await request(app)
        .get('/i18n/translations/en')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({ common: { greeting: 'Hello' } });
    });
  });

  describe('GET /i18n/translations/:localeCode/:namespace (public)', () => {
    it('should return namespace translations for a locale', async () => {
      mockLocaleRepository.getNamespaceTranslations.mockResolvedValue({ greeting: 'Hello' });

      const response = await request(app)
        .get('/i18n/translations/en/common')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({ greeting: 'Hello' });
    });
  });

  describe('GET /i18n/namespaces (public)', () => {
    it('should return all namespaces', async () => {
      mockLocaleRepository.getNamespaces.mockResolvedValue(['common', 'auth', 'errors']);

      const response = await request(app)
        .get('/i18n/namespaces')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(['common', 'auth', 'errors']);
    });
  });

  // ==================== AUTH GUARD (admin-only routes) ====================

  describe('Authentication and Authorization guard', () => {
    it('should return 401 for unauthenticated request to POST /i18n/locales', async () => {
      const response = await request(app)
        .post('/i18n/locales')
        .send({ code: 'de', name: 'German' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 for non-admin user on POST /i18n/locales', async () => {
      currentTestUser = { userId: 'test-user-1', email: 'test@test.com', role: 'user' };

      const response = await authedRequest(app)
        .post('/i18n/locales')
        .send({ code: 'de', name: 'German' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 for unauthenticated request to GET /i18n/stats', async () => {
      const response = await request(app)
        .get('/i18n/stats')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 for unauthenticated request to DELETE /i18n/locales/:id', async () => {
      const response = await request(app)
        .delete('/i18n/locales/locale-1')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== ADMIN LOCALE MANAGEMENT ====================

  describe('GET /i18n/locales/:id (admin)', () => {
    it('should return locale by ID for admin', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockLocaleRepository.findLocaleById.mockResolvedValue(mockLocale);

      const response = await authedRequest(app)
        .get('/i18n/locales/locale-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('locale-1');
    });

    it('should return 404 for non-existent locale ID', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockLocaleRepository.findLocaleById.mockResolvedValue(null);

      const response = await authedRequest(app)
        .get('/i18n/locales/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /i18n/locales (admin)', () => {
    it('should create a locale successfully', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockLocaleRepository.findLocaleByCode.mockResolvedValue(null);
      mockLocaleRepository.createLocale.mockResolvedValue(mockLocaleFr);

      const response = await authedRequest(app)
        .post('/i18n/locales')
        .send({ code: 'fr', name: 'French' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.code).toBe('fr');
      expect(response.body.message).toContain('created');
    });

    it('should return 409 when locale code already exists', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockLocaleRepository.findLocaleByCode.mockResolvedValue(mockLocale);

      const response = await authedRequest(app)
        .post('/i18n/locales')
        .send({ code: 'en', name: 'English' })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });

    it('should return 400 for invalid body (missing code)', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };

      const response = await authedRequest(app)
        .post('/i18n/locales')
        .send({ name: 'German' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /i18n/locales/:id (admin)', () => {
    it('should update a locale successfully', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      const updated = { ...mockLocale, name: 'English (US)' };
      mockLocaleRepository.updateLocale.mockResolvedValue(updated);

      const response = await authedRequest(app)
        .put('/i18n/locales/locale-1')
        .send({ name: 'English (US)' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('English (US)');
    });
  });

  describe('DELETE /i18n/locales/:id (admin)', () => {
    it('should delete a locale successfully', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockLocaleRepository.deleteLocale.mockResolvedValue(undefined);

      const response = await authedRequest(app)
        .delete('/i18n/locales/locale-2')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');
    });

    it('should return 400 when trying to delete the default locale', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockLocaleRepository.deleteLocale.mockRejectedValue(new Error('Cannot delete default locale'));

      const response = await authedRequest(app)
        .delete('/i18n/locales/locale-1')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Cannot delete default locale');
    });
  });

  describe('POST /i18n/locales/:id/set-default (admin)', () => {
    it('should set a locale as default', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockLocaleRepository.setDefaultLocale.mockResolvedValue({ ...mockLocaleFr, isDefault: true });

      const response = await authedRequest(app)
        .post('/i18n/locales/locale-2/set-default')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Default locale updated');
    });
  });

  // ==================== ADMIN TRANSLATION MANAGEMENT ====================

  describe('GET /i18n/translations (admin)', () => {
    it('should return translations with filters', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockLocaleRepository.findTranslations.mockResolvedValue([mockTranslation]);

      const response = await authedRequest(app)
        .get('/i18n/translations?localeId=locale-1&namespace=common')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });
  });

  describe('POST /i18n/translations (admin)', () => {
    it('should create a translation successfully', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockLocaleRepository.createTranslation.mockResolvedValue(mockTranslation);

      const response = await authedRequest(app)
        .post('/i18n/translations')
        .send({
          localeId: '550e8400-e29b-41d4-a716-446655440000',
          namespace: 'common',
          key: 'greeting',
          value: 'Hello',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('created');
    });

    it('should return 400 when localeId is not a valid UUID', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };

      const response = await authedRequest(app)
        .post('/i18n/translations')
        .send({
          localeId: 'not-a-uuid',
          namespace: 'common',
          key: 'greeting',
          value: 'Hello',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /i18n/translations (admin)', () => {
    it('should upsert a translation', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockLocaleRepository.upsertTranslation.mockResolvedValue({ ...mockTranslation, value: 'Hi there' });

      const response = await authedRequest(app)
        .put('/i18n/translations')
        .send({
          localeId: '550e8400-e29b-41d4-a716-446655440000',
          namespace: 'common',
          key: 'greeting',
          value: 'Hi there',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('saved');
    });
  });

  describe('POST /i18n/translations/bulk (admin)', () => {
    it('should bulk create translations', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockLocaleRepository.createManyTranslations.mockResolvedValue({ count: 2 });

      const response = await authedRequest(app)
        .post('/i18n/translations/bulk')
        .send({
          translations: [
            { localeId: '550e8400-e29b-41d4-a716-446655440000', namespace: 'common', key: 'yes', value: 'Yes' },
            { localeId: '550e8400-e29b-41d4-a716-446655440000', namespace: 'common', key: 'no', value: 'No' },
          ],
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('2 translations created');
    });
  });

  describe('DELETE /i18n/translations/namespace/:localeId/:namespace (admin)', () => {
    it('should delete all translations in a namespace', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockLocaleRepository.deleteNamespaceTranslations.mockResolvedValue({ count: 5 });

      const response = await authedRequest(app)
        .delete('/i18n/translations/namespace/locale-1/common')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('5 translations deleted');
    });
  });

  // ==================== UTILITIES (admin) ====================

  describe('GET /i18n/stats (admin)', () => {
    it('should return translation statistics', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockLocaleRepository.countTranslations.mockResolvedValue(100);
      mockLocaleRepository.getNamespaces.mockResolvedValue(['common', 'auth']);
      mockLocaleRepository.findAllLocales.mockResolvedValue([mockLocale, mockLocaleFr]);

      const response = await authedRequest(app)
        .get('/i18n/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalTranslations).toBe(100);
      expect(response.body.data.namespaceCount).toBe(2);
      expect(response.body.data.localeCount).toBe(2);
    });
  });

  describe('GET /i18n/missing/:sourceLocaleId/:targetLocaleId (admin)', () => {
    it('should return missing translations between two locales', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockLocaleRepository.getMissingTranslations.mockResolvedValue([
        { namespace: 'common', key: 'farewell' },
      ]);

      const response = await authedRequest(app)
        .get('/i18n/missing/locale-1/locale-2')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.count).toBe(1);
    });
  });

  describe('POST /i18n/import/:localeCode (admin)', () => {
    it('should import translations for a locale', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockLocaleRepository.importTranslations.mockResolvedValue({ count: 10 });

      const response = await authedRequest(app)
        .post('/i18n/import/en')
        .send({ data: { common: { greeting: 'Hello', farewell: 'Goodbye' } } })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('10 translations imported');
    });

    it('should return 404 when locale does not exist for import', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockLocaleRepository.importTranslations.mockRejectedValue(new Error('Locale not found'));

      const response = await authedRequest(app)
        .post('/i18n/import/zz')
        .send({ data: { common: { greeting: 'Hello' } } })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Locale not found');
    });
  });

  describe('GET /i18n/export/:localeCode (admin)', () => {
    it('should export translations for a locale', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockLocaleRepository.getAllTranslationsForLocale.mockResolvedValue({
        common: { greeting: 'Hello' },
      });

      const response = await authedRequest(app)
        .get('/i18n/export/en')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({ common: { greeting: 'Hello' } });
    });
  });
});
