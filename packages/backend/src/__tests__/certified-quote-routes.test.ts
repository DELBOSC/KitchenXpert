/**
 * Certified Quote Routes Tests
 *
 * Tests the certified quote (devis) endpoints:
 * - POST /certified-quotes — create a new certified quote
 * - GET /certified-quotes — list quotes for current user
 * - POST /certified-quotes/:id/sign — sign quote with eIDAS signature
 * - Auth guard (401 without token)
 * - Validation (missing items, invalid data)
 */

import cookieParser from 'cookie-parser';
import express, { type Application, type Request, type Response, type NextFunction } from 'express';
import request from 'supertest';

// ==================== MOCKS ====================

jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  createModuleLogger: jest.fn(() => ({
    info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(),
  })),
}));

const mockCreate = jest.fn();
const mockList = jest.fn();
const mockSign = jest.fn();
const mockGetById = jest.fn();
const mockGetNextNumber = jest.fn();
const mockSend = jest.fn();
const mockGeneratePDF = jest.fn();

jest.mock('../services/quote/certified-quote.service', () => ({
  getCertifiedQuoteService: jest.fn(() => ({
    create: mockCreate,
    list: mockList,
    sign: mockSign,
    getById: mockGetById,
    getNextNumber: mockGetNextNumber,
    send: mockSend,
    generatePDF: mockGeneratePDF,
  })),
}));

jest.mock('../database/client', () => ({ prisma: { $disconnect: jest.fn() } }));

jest.mock('../config/app-config', () => ({
  config: { corsOrigins: ['http://localhost:3000'], env: 'test', port: 3000, version: '1.0.0', rateLimit: { maxRequests: 100 } },
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
import certifiedQuoteRoutes from '../api/routes/certified-quote-routes';

// ==================== SETUP ====================

function createTestApp(): Application {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/certified-quotes', certifiedQuoteRoutes);
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

const validKitchenId = '550e8400-e29b-41d4-a716-446655440000';
const validQuoteId = '660e8400-e29b-41d4-a716-446655440001';

const validQuoteBody = {
  kitchenId: validKitchenId,
  clientName: 'Marie Dupont',
  clientEmail: 'marie@example.com',
  items: [
    { ref: 'CAB-01', name: 'Base Cabinet 60cm', qty: 3, unitPriceHT: 250 },
    { ref: 'WKT-01', name: 'Worktop 2m', qty: 1, unitPriceHT: 400 },
  ],
};

const mockQuote = {
  id: validQuoteId,
  quoteNumber: 'DEV-2024-001',
  userId: 'test-user-id',
  kitchenId: validKitchenId,
  clientName: 'Marie Dupont',
  totalHT: 1150,
  totalTVA: 230,
  totalTTC: 1380,
  status: 'draft',
  items: validQuoteBody.items,
};

const mockSignedQuote = {
  ...mockQuote,
  status: 'signed',
  signedAt: new Date().toISOString(),
  signatureHash: 'sha256:abc123...',
};

// ==================== TESTS ====================

describe('Certified Quote Routes', () => {
  let app: Application;

  beforeEach(() => {
    jest.clearAllMocks();
    currentTestUser = { userId: 'test-user-id', email: 'test@test.com', role: 'user' };
    app = createTestApp();
  });

  describe('POST /certified-quotes', () => {
    it('should create a quote and return 201 status', async () => {
      mockCreate.mockResolvedValue(mockQuote);

      const response = await authedRequest(app)
        .post('/certified-quotes')
        .send(validQuoteBody)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.quoteNumber).toBe('DEV-2024-001');
      expect(response.body.message).toContain('Certified quote created');
    });

    it('should return 401 when user is not authenticated', async () => {
      const response = await request(app)
        .post('/certified-quotes')
        .send(validQuoteBody)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when items array is empty', async () => {
      const response = await authedRequest(app)
        .post('/certified-quotes')
        .send({ ...validQuoteBody, items: [] })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when clientName is missing', async () => {
      const { clientName, ...bodyWithoutClient } = validQuoteBody;
      const response = await authedRequest(app)
        .post('/certified-quotes')
        .send(bodyWithoutClient)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /certified-quotes', () => {
    it('should return list of user quotes with 200 status', async () => {
      mockList.mockResolvedValue([mockQuote]);

      const response = await authedRequest(app)
        .get('/certified-quotes')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].quoteNumber).toBe('DEV-2024-001');
    });

    it('should return 401 when user is not authenticated', async () => {
      const response = await request(app)
        .get('/certified-quotes')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /certified-quotes/:id/sign', () => {
    it('should sign the quote and return 200 status', async () => {
      mockSign.mockResolvedValue(mockSignedQuote);

      const response = await authedRequest(app)
        .post(`/certified-quotes/${validQuoteId}/sign`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('signed');
      expect(response.body.message).toContain('Quote signed');
    });

    it('should return 404 when quote does not exist', async () => {
      mockSign.mockRejectedValue(new Error('Quote not found'));

      const response = await authedRequest(app)
        .post(`/certified-quotes/${validQuoteId}/sign`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Quote not found');
    });

    it('should return 400 when quote is already signed', async () => {
      mockSign.mockRejectedValue(new Error('Quote has already signed'));

      const response = await authedRequest(app)
        .post(`/certified-quotes/${validQuoteId}/sign`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
