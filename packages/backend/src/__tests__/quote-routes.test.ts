/**
 * Quote Routes Integration Tests
 *
 * Tests all quote-related endpoints for correct behavior including:
 * - POST /quotes/send — send a quote request to a partner
 * - GET /quotes — get all quote requests for the current user
 * - GET /quotes/:id — get a specific quote request
 * - GET /quotes/partners/nearby — find nearby partners
 * - Auth guard (401 without token)
 * - IDOR prevention (ownership checks on kitchens and quotes)
 * - Validation (missing kitchenId, partnerId, contactInfo)
 * - Partner existence and active status checks
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
  kitchen: {
    findUnique: jest.fn(),
  },
  partner: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  quoteRequest: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
  },
  webhookEvent: {
    create: jest.fn(),
  },
  $disconnect: jest.fn(),
};

jest.mock('../database/client', () => ({
  prisma: mockPrisma,
}));

// Mock mail service
const mockMailService = {
  sendMail: jest.fn().mockResolvedValue(undefined),
};

jest.mock('../services/mail.service', () => ({
  getMailService: jest.fn(() => mockMailService),
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
import quoteRoutes from '../api/routes/quote-routes';
import { errorHandler } from '../api/middleware/error-middleware';

// ==================== TEST APP SETUP ====================

function createTestApp(): Application {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/quotes', quoteRoutes);
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

const validKitchenId = '550e8400-e29b-41d4-a716-446655440000';
const validPartnerId = '550e8400-e29b-41d4-a716-446655440001';
const validQuoteId = '550e8400-e29b-41d4-a716-446655440002';

const mockKitchen = {
  id: validKitchenId,
  name: 'Modern Kitchen',
  project: {
    userId: 'test-user-1',
    name: 'My Kitchen Project',
  },
};

const mockPartner = {
  id: validPartnerId,
  name: 'Kitchen Pro',
  email: 'partner@kitchenpro.com',
  isActive: true,
};

const mockInactivePartner = {
  id: 'partner-inactive',
  name: 'Closed Shop',
  email: 'closed@shop.com',
  isActive: false,
};

const mockQuoteRequest = {
  id: validQuoteId,
  reference: 'QR-ABC123-DEF456',
  kitchenId: validKitchenId,
  userId: 'test-user-1',
  partnerId: validPartnerId,
  message: 'Looking forward to your quote',
  timeline: 'flexible',
  contactName: 'John Doe',
  contactEmail: 'john@example.com',
  contactPhone: '+33612345678',
  shareToken: 'token-abc-123',
  status: 'pending',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  partner: { id: validPartnerId, name: 'Kitchen Pro', email: 'partner@kitchenpro.com' },
  kitchen: { id: validKitchenId, name: 'Modern Kitchen' },
};

const otherUserQuote = {
  ...mockQuoteRequest,
  id: 'quote-other',
  userId: 'other-user-99',
  partner: { id: validPartnerId, name: 'Kitchen Pro', email: 'partner@kitchenpro.com' },
  kitchen: { id: validKitchenId, name: 'Modern Kitchen' },
};

const validSendBody = {
  kitchenId: validKitchenId,
  partnerId: validPartnerId,
  message: 'Looking forward to your quote',
  timeline: 'flexible',
  contactInfo: {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+33612345678',
  },
};

// ==================== TESTS ====================

describe('Quote Routes', () => {
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
    it('should return 401 for unauthenticated request to POST /quotes/send', async () => {
      const response = await request(app)
        .post('/quotes/send')
        .send(validSendBody)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 for unauthenticated request to GET /quotes', async () => {
      const response = await request(app)
        .get('/quotes')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 for unauthenticated request to GET /quotes/:id', async () => {
      const response = await request(app)
        .get(`/quotes/${validQuoteId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 for unauthenticated request to GET /quotes/partners/nearby', async () => {
      const response = await request(app)
        .get('/quotes/partners/nearby')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== POST /quotes/send ====================

  describe('POST /quotes/send', () => {
    it('should send a quote request successfully and return 201', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);
      mockPrisma.partner.findUnique.mockResolvedValue(mockPartner);
      mockPrisma.quoteRequest.create.mockResolvedValue(mockQuoteRequest);
      mockPrisma.webhookEvent.create.mockResolvedValue({});

      const response = await authedRequest(app)
        .post('/quotes/send')
        .send(validSendBody)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('reference');
      expect(response.body.data.status).toBe('pending');
      expect(response.body.data.partnerName).toBe('Kitchen Pro');
      expect(response.body.message).toContain('sent');
    });

    it('should return 400 when kitchenId is missing', async () => {
      const response = await authedRequest(app)
        .post('/quotes/send')
        .send({ ...validSendBody, kitchenId: undefined })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when partnerId is missing', async () => {
      const response = await authedRequest(app)
        .post('/quotes/send')
        .send({ ...validSendBody, partnerId: undefined })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when contactInfo is missing', async () => {
      const response = await authedRequest(app)
        .post('/quotes/send')
        .send({ ...validSendBody, contactInfo: undefined })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when contactInfo.email is missing', async () => {
      const response = await authedRequest(app)
        .post('/quotes/send')
        .send({ ...validSendBody, contactInfo: { name: 'John' } })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 when kitchen does not exist', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(null);

      const response = await authedRequest(app)
        .post('/quotes/send')
        .send(validSendBody)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Kitchen not found');
    });

    it('should return 403 when kitchen does not belong to user (IDOR prevention)', async () => {
      const otherUserKitchen = {
        ...mockKitchen,
        project: { userId: 'other-user-99', name: 'Other Project' },
      };
      mockPrisma.kitchen.findUnique.mockResolvedValue(otherUserKitchen);

      const response = await authedRequest(app)
        .post('/quotes/send')
        .send(validSendBody)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Access denied');
    });

    it('should allow admin to send quote for any kitchen', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      const otherUserKitchen = {
        ...mockKitchen,
        project: { userId: 'other-user-99', name: 'Other Project' },
      };
      mockPrisma.kitchen.findUnique.mockResolvedValue(otherUserKitchen);
      mockPrisma.partner.findUnique.mockResolvedValue(mockPartner);
      mockPrisma.quoteRequest.create.mockResolvedValue(mockQuoteRequest);
      mockPrisma.webhookEvent.create.mockResolvedValue({});

      const response = await authedRequest(app)
        .post('/quotes/send')
        .send(validSendBody)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should return 404 when partner does not exist', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);
      mockPrisma.partner.findUnique.mockResolvedValue(null);

      const response = await authedRequest(app)
        .post('/quotes/send')
        .send(validSendBody)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Partner not found');
    });

    it('should return 400 when partner is inactive', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);
      mockPrisma.partner.findUnique.mockResolvedValue(mockInactivePartner);

      const response = await authedRequest(app)
        .post('/quotes/send')
        .send(validSendBody)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not accepting quote requests');
    });

    it('should still succeed even if email sending fails', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);
      mockPrisma.partner.findUnique.mockResolvedValue(mockPartner);
      mockPrisma.quoteRequest.create.mockResolvedValue(mockQuoteRequest);
      mockPrisma.webhookEvent.create.mockResolvedValue({});
      mockMailService.sendMail.mockRejectedValue(new Error('SMTP error'));

      const response = await authedRequest(app)
        .post('/quotes/send')
        .send(validSendBody)
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  // ==================== GET /quotes ====================

  describe('GET /quotes', () => {
    it('should return all quote requests for the current user', async () => {
      mockPrisma.quoteRequest.findMany.mockResolvedValue([mockQuoteRequest]);
      mockPrisma.quoteRequest.count.mockResolvedValue(1);

      const response = await authedRequest(app)
        .get('/quotes')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.meta).toHaveProperty('page');
      expect(response.body.meta).toHaveProperty('total');
      expect(response.body.meta).toHaveProperty('totalPages');
    });

    it('should return empty array when user has no quotes', async () => {
      mockPrisma.quoteRequest.findMany.mockResolvedValue([]);
      mockPrisma.quoteRequest.count.mockResolvedValue(0);

      const response = await authedRequest(app)
        .get('/quotes')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.meta.total).toBe(0);
    });

    it('should support pagination parameters', async () => {
      mockPrisma.quoteRequest.findMany.mockResolvedValue([mockQuoteRequest]);
      mockPrisma.quoteRequest.count.mockResolvedValue(25);

      const response = await authedRequest(app)
        .get('/quotes?page=2&limit=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.meta.page).toBe(2);
    });
  });

  // ==================== GET /quotes/:id ====================

  describe('GET /quotes/:id', () => {
    it('should return a specific quote request', async () => {
      mockPrisma.quoteRequest.findUnique.mockResolvedValue(mockQuoteRequest);

      const response = await authedRequest(app)
        .get(`/quotes/${validQuoteId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reference).toBe('QR-ABC123-DEF456');
    });

    it('should return 404 when quote does not exist', async () => {
      mockPrisma.quoteRequest.findUnique.mockResolvedValue(null);

      const response = await authedRequest(app)
        .get(`/quotes/${validQuoteId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 when trying to access another user\'s quote (IDOR prevention)', async () => {
      mockPrisma.quoteRequest.findUnique.mockResolvedValue(otherUserQuote);

      const response = await authedRequest(app)
        .get('/quotes/quote-other')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Access denied');
    });

    it('should allow admin to access any quote', async () => {
      currentTestUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      mockPrisma.quoteRequest.findUnique.mockResolvedValue(otherUserQuote);

      const response = await authedRequest(app)
        .get('/quotes/quote-other')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  // ==================== GET /quotes/partners/nearby ====================

  describe('GET /quotes/partners/nearby', () => {
    it('should return nearby active partners', async () => {
      mockPrisma.partner.findMany.mockResolvedValue([
        {
          id: validPartnerId,
          name: 'Kitchen Pro',
          email: 'partner@kitchenpro.com',
          phone: '+33612345678',
          website: 'https://kitchenpro.com',
          configuration: { specialties: ['modern'], rating: 4.5 },
        },
      ]);

      const response = await authedRequest(app)
        .get('/quotes/partners/nearby?lat=48.8566&lng=2.3522')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toHaveProperty('name');
      expect(response.body.data[0]).toHaveProperty('specialties');
    });

    it('should return empty array when no partners are found', async () => {
      mockPrisma.partner.findMany.mockResolvedValue([]);

      const response = await authedRequest(app)
        .get('/quotes/partners/nearby?postalCode=75001')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });
  });

  // ==================== EDGE CASES ====================

  describe('Edge cases', () => {
    it('should still create quote even if webhook event creation fails', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);
      mockPrisma.partner.findUnique.mockResolvedValue(mockPartner);
      mockPrisma.quoteRequest.create.mockResolvedValue(mockQuoteRequest);
      mockPrisma.webhookEvent.create.mockRejectedValue(new Error('DB error'));

      const response = await authedRequest(app)
        .post('/quotes/send')
        .send(validSendBody)
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });
});
