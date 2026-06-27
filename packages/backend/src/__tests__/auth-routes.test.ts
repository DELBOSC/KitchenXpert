/**
 * Auth Routes Integration Tests
 *
 * Tests all authentication endpoints for correct behavior including:
 * - Registration with validation
 * - Login with cookie-based auth
 * - Token refresh
 * - Logout with token blacklisting
 * - Password reset flow
 * - Password change
 * - Email verification
 * - Current user retrieval
 */

import cookieParser from 'cookie-parser';
import express, { type Application, type Request, type Response, type NextFunction } from 'express';
import request from 'supertest';

import { ConflictError, UnauthorizedError, BadRequestError } from '@kitchenxpert/common';

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
jest.mock('../database/client', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    emailToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
    $disconnect: jest.fn(),
  },
}));

// Mock auth service
const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  refreshTokens: jest.fn(),
  requestPasswordReset: jest.fn(),
  resetPassword: jest.fn(),
  verifyEmail: jest.fn(),
  generateNewVerificationToken: jest.fn(),
  changePassword: jest.fn(),
};

jest.mock('../auth/auth.service', () => ({
  authService: mockAuthService,
  AuthService: jest.fn(),
}));

// Mock token blacklist
const mockBlacklist = {
  addToBlacklist: jest.fn().mockResolvedValue(undefined),
  isBlacklisted: jest.fn().mockResolvedValue(false),
  blacklistUserTokens: jest.fn(),
  isUserBlacklisted: jest.fn().mockResolvedValue(false),
  cleanup: jest.fn(),
};

jest.mock('../auth/token-blacklist', () => ({
  getTokenBlacklist: jest.fn(() => mockBlacklist),
  getTokenExpiration: jest.fn(() => new Date(Date.now() + 3600000)),
  getTokenIssuedAt: jest.fn(() => new Date()),
}));

// Mock JWT service
jest.mock('../auth/jwt.service', () => ({
  jwtService: {
    generateTokens: jest.fn(),
    verifyAccessToken: jest.fn().mockReturnValue({
      userId: 'test-user-1',
      email: 'test@test.com',
      role: 'user',
    }),
    verifyRefreshToken: jest.fn(),
    refreshTokens: jest.fn(),
  },
}));

// Mock mail service
jest.mock('../services/mail.service', () => ({
  getMailService: jest.fn(() => ({
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    sendPasswordReset: jest.fn().mockResolvedValue(undefined),
    sendWelcome: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Mock email token service — return the SAME instance each call so the
// controller and tests share mock state.
jest.mock('../services/email-token.service', () => {
  const sharedService = {
    generateVerificationToken: jest.fn(),
    generatePasswordResetToken: jest.fn(),
    verifyPasswordResetToken: jest.fn(),
    verifyEmailToken: jest.fn(),
    getUserByVerificationToken: jest.fn(),
  };
  return {
    getEmailTokenService: jest.fn(() => sharedService),
  };
});

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

// Mock rate limiters to pass through in tests
jest.mock('../api/middleware/rate-limit-middleware', () => ({
  authRateLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
  loginRateLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
  passwordResetRateLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
  generalRateLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

// Mock PrismaUserRepository
jest.mock('../repositories', () => ({
  PrismaUserRepository: jest.fn().mockImplementation(() => ({
    findById: jest.fn(),
    findByEmail: jest.fn(),
    create: jest.fn(),
    emailExists: jest.fn(),
    updateLastLogin: jest.fn(),
    updatePassword: jest.fn(),
  })),
}));

// Import after mocks
import { errorHandler } from '../api/middleware/error-middleware';
import authRoutes from '../api/routes/auth-routes';
import { PrismaUserRepository } from '../repositories';

// ==================== TEST APP SETUP ====================

function createTestApp(): Application {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());

  // Simulate the authenticate middleware for protected routes
  // The real authenticate middleware is used in auth-routes.ts
  // We need to mock the auth-middleware module so the imported routes use our mock
  app.use('/auth', authRoutes);
  app.use(errorHandler);

  return app;
}

// Mock auth middleware to inject user for protected routes
jest.mock('../api/middleware/auth-middleware', () => {
  const original = jest.requireActual('../api/middleware/auth-middleware');
  return {
    ...original,
    authenticate: jest.fn((req: any, _res: any, next: any) => {
      // Only set user if cookie or header present (to simulate real behavior)
      if (req.cookies?.accessToken || req.headers.authorization) {
        req.user = { userId: 'test-user-1', email: 'test@test.com', role: 'user' };
      } else {
        // Simulate unauthorized if no token
        const { UnauthorizedError: UE } = require('@kitchenxpert/common');
        return next(new UE('Authentication required'));
      }
      next();
    }),
    authorize: () => (_req: any, _res: any, next: any) => next(),
    requireRole: () => (_req: any, _res: any, next: any) => next(),
  };
});

// ==================== TESTS ====================

describe('Auth Routes', () => {
  let app: Application;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==================== POST /auth/register ====================

  describe('POST /auth/register', () => {
    const validRegistration = {
      email: 'newuser@example.com',
      password: 'StrongPass1',
      firstName: 'John',
      lastName: 'Doe',
    };

    const mockRegisterResult = {
      user: {
        id: 'new-user-id',
        email: 'newuser@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user',
      },
      tokens: {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 900,
        tokenType: 'Bearer' as const,
      },
      verificationToken: 'verify-token-123',
    };

    it('should register a new user successfully and return 201', async () => {
      mockAuthService.register.mockResolvedValue(mockRegisterResult);

      const response = await request(app)
        .post('/auth/register')
        .send(validRegistration)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('newuser@example.com');
      expect(response.body.data.user.firstName).toBe('John');
      expect(response.body.message).toContain('registered successfully');
      // Verification token should NOT be in the response (sent via email only)
      expect(response.body.data.verificationToken).toBeUndefined();
    });

    it('should set httpOnly cookies on successful registration', async () => {
      mockAuthService.register.mockResolvedValue(mockRegisterResult);

      const response = await request(app)
        .post('/auth/register')
        .send(validRegistration)
        .expect(201);

      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();

      const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : cookies;
      expect(cookieStr).toContain('accessToken');
      expect(cookieStr).toContain('HttpOnly');
    });

    it('should return 409 when email already exists', async () => {
      mockAuthService.register.mockRejectedValue(new ConflictError('Email already registered'));

      const response = await request(app)
        .post('/auth/register')
        .send(validRegistration)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CONFLICT');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({ email: 'test@test.com' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          ...validRegistration,
          email: 'not-an-email',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for weak password (too short)', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          ...validRegistration,
          password: 'Ab1',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for password without uppercase', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          ...validRegistration,
          password: 'weakpass1',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for password without numbers', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          ...validRegistration,
          password: 'WeakPassword',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for empty firstName', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          ...validRegistration,
          firstName: '',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for empty lastName', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          ...validRegistration,
          lastName: '',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should not expose verification token in the response body', async () => {
      mockAuthService.register.mockResolvedValue(mockRegisterResult);

      const response = await request(app)
        .post('/auth/register')
        .send(validRegistration)
        .expect(201);

      // The verification token must not leak through the API
      expect(response.body.data.verificationToken).toBeUndefined();
      expect(JSON.stringify(response.body)).not.toContain('verify-token-123');
    });

    it('should return token metadata (expiresIn, tokenType) but not raw tokens in body', async () => {
      mockAuthService.register.mockResolvedValue(mockRegisterResult);

      const response = await request(app)
        .post('/auth/register')
        .send(validRegistration)
        .expect(201);

      expect(response.body.data.tokens.expiresIn).toBe(900);
      expect(response.body.data.tokens.tokenType).toBe('Bearer');
      // Raw tokens should not be in the JSON body
      expect(response.body.data.tokens.accessToken).toBeUndefined();
      expect(response.body.data.tokens.refreshToken).toBeUndefined();
    });
  });

  // ==================== POST /auth/login ====================

  describe('POST /auth/login', () => {
    const validCredentials = {
      email: 'test@example.com',
      password: 'StrongPass1',
    };

    const mockLoginResult = {
      user: {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
      },
      tokens: {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 900,
        tokenType: 'Bearer' as const,
      },
    };

    it('should login successfully with valid credentials', async () => {
      mockAuthService.login.mockResolvedValue(mockLoginResult);

      const response = await request(app).post('/auth/login').send(validCredentials).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.message).toBe('Login successful');
    });

    it('should set httpOnly cookies on successful login', async () => {
      mockAuthService.login.mockResolvedValue(mockLoginResult);

      const response = await request(app).post('/auth/login').send(validCredentials).expect(200);

      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();

      const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : cookies;
      expect(cookieStr).toContain('accessToken');
      expect(cookieStr).toContain('HttpOnly');
      expect(cookieStr).toContain('refreshToken');
    });

    it('should return 401 for wrong password', async () => {
      mockAuthService.login.mockRejectedValue(new UnauthorizedError('Invalid credentials'));

      const response = await request(app)
        .post('/auth/login')
        .send({ ...validCredentials, password: 'WrongPass1' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 for non-existent user', async () => {
      mockAuthService.login.mockRejectedValue(new UnauthorizedError('Invalid credentials'));

      const response = await request(app)
        .post('/auth/login')
        .send({ email: 'noone@example.com', password: 'SomePass1' })
        .expect(401);

      expect(response.body.success).toBe(false);
      // Error message should not reveal whether user exists
      expect(response.body.error.message).toBe('Invalid credentials');
    });

    it('should return 401 for suspended account', async () => {
      mockAuthService.login.mockRejectedValue(new UnauthorizedError('Account is not active'));

      const response = await request(app).post('/auth/login').send(validCredentials).expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for missing email', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ password: 'StrongPass1' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for missing password', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ email: 'test@example.com' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ email: 'bad-email', password: 'StrongPass1' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should not expose raw tokens in the JSON body', async () => {
      mockAuthService.login.mockResolvedValue(mockLoginResult);

      const response = await request(app).post('/auth/login').send(validCredentials).expect(200);

      expect(response.body.data.tokens.accessToken).toBeUndefined();
      expect(response.body.data.tokens.refreshToken).toBeUndefined();
      expect(response.body.data.tokens.expiresIn).toBe(900);
    });
  });

  // ==================== POST /auth/refresh ====================

  describe('POST /auth/refresh', () => {
    const mockTokens = {
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      expiresIn: 900,
      tokenType: 'Bearer' as const,
    };

    it('should refresh tokens successfully via cookie', async () => {
      mockAuthService.refreshTokens.mockResolvedValue(mockTokens);

      const response = await request(app)
        .post('/auth/refresh')
        .set('Cookie', ['refreshToken=valid-refresh-token'])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Tokens refreshed');
      expect(mockAuthService.refreshTokens).toHaveBeenCalledWith('valid-refresh-token');
    });

    it('should refresh tokens via body for backward compatibility', async () => {
      mockAuthService.refreshTokens.mockResolvedValue(mockTokens);

      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'valid-refresh-token' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockAuthService.refreshTokens).toHaveBeenCalledWith('valid-refresh-token');
    });

    it('should set new httpOnly cookies after refresh', async () => {
      mockAuthService.refreshTokens.mockResolvedValue(mockTokens);

      const response = await request(app)
        .post('/auth/refresh')
        .set('Cookie', ['refreshToken=valid-refresh-token'])
        .expect(200);

      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();

      const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : cookies;
      expect(cookieStr).toContain('accessToken');
      expect(cookieStr).toContain('refreshToken');
    });

    it('should return 401 for expired refresh token', async () => {
      mockAuthService.refreshTokens.mockRejectedValue(
        new UnauthorizedError('Invalid or expired refresh token')
      );

      const response = await request(app)
        .post('/auth/refresh')
        .set('Cookie', ['refreshToken=expired-token'])
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 for invalid refresh token', async () => {
      mockAuthService.refreshTokens.mockRejectedValue(
        new UnauthorizedError('Invalid or expired refresh token')
      );

      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== POST /auth/logout ====================

  describe('POST /auth/logout', () => {
    it('should logout successfully and clear cookies', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .set('Cookie', ['accessToken=test-access-token; refreshToken=test-refresh-token'])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logout successful');

      // Verify cookies are cleared
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : cookies;
      expect(cookieStr).toContain('accessToken=;');
      expect(cookieStr).toContain('refreshToken=;');
    });

    it('should blacklist the access token on logout', async () => {
      await request(app)
        .post('/auth/logout')
        .set('Cookie', ['accessToken=test-access-token; refreshToken=test-refresh-token'])
        .expect(200);

      expect(mockBlacklist.addToBlacklist).toHaveBeenCalled();
    });

    it('should blacklist the refresh token on logout', async () => {
      await request(app)
        .post('/auth/logout')
        .set('Cookie', ['accessToken=test-access-token; refreshToken=test-refresh-token'])
        .expect(200);

      // Should be called at least twice: once for access, once for refresh
      expect(mockBlacklist.addToBlacklist).toHaveBeenCalledTimes(2);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app).post('/auth/logout').expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should handle logout with Authorization header', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', 'Bearer test-access-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockBlacklist.addToBlacklist).toHaveBeenCalled();
    });
  });

  // ==================== POST /auth/forgot-password ====================

  describe('POST /auth/forgot-password', () => {
    it('should return 200 for existing email (sends reset link)', async () => {
      mockAuthService.requestPasswordReset.mockResolvedValue('reset-token-123');

      const response = await request(app)
        .post('/auth/forgot-password')
        .send({ email: 'test@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('If an account with that email exists');
      expect(mockAuthService.requestPasswordReset).toHaveBeenCalledWith('test@example.com');
    });

    it('should return 200 for non-existent email (no user enumeration)', async () => {
      mockAuthService.requestPasswordReset.mockResolvedValue(null);

      const response = await request(app)
        .post('/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      // Same message as for existing emails to prevent enumeration
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('If an account with that email exists');
    });

    it('should not expose the reset token in the response', async () => {
      mockAuthService.requestPasswordReset.mockResolvedValue('reset-token-123');

      const response = await request(app)
        .post('/auth/forgot-password')
        .send({ email: 'test@example.com' })
        .expect(200);

      expect(JSON.stringify(response.body)).not.toContain('reset-token-123');
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/auth/forgot-password')
        .send({ email: 'not-an-email' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for missing email', async () => {
      const response = await request(app).post('/auth/forgot-password').send({}).expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== POST /auth/password-reset/request ====================

  describe('POST /auth/password-reset/request', () => {
    it('should work as alias for forgot-password', async () => {
      mockAuthService.requestPasswordReset.mockResolvedValue('reset-token');

      const response = await request(app)
        .post('/auth/password-reset/request')
        .send({ email: 'test@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockAuthService.requestPasswordReset).toHaveBeenCalledWith('test@example.com');
    });
  });

  // ==================== POST /auth/reset-password ====================

  describe('POST /auth/reset-password', () => {
    it('should reset password successfully with valid token', async () => {
      mockAuthService.resetPassword.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/auth/reset-password')
        .send({ token: 'valid-reset-token', password: 'NewStrong1' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Password reset successful');
    });

    it('should return 400 for expired token', async () => {
      mockAuthService.resetPassword.mockRejectedValue(
        new BadRequestError('Invalid or expired reset token')
      );

      const response = await request(app)
        .post('/auth/reset-password')
        .send({ token: 'expired-token', password: 'NewStrong1' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid token', async () => {
      mockAuthService.resetPassword.mockRejectedValue(
        new BadRequestError('Invalid or expired reset token')
      );

      const response = await request(app)
        .post('/auth/reset-password')
        .send({ token: 'invalid-token', password: 'NewStrong1' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for missing token field', async () => {
      const response = await request(app)
        .post('/auth/reset-password')
        .send({ password: 'NewStrong1' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for weak new password', async () => {
      const response = await request(app)
        .post('/auth/reset-password')
        .send({ token: 'valid-token', password: 'weak' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for new password without uppercase', async () => {
      const response = await request(app)
        .post('/auth/reset-password')
        .send({ token: 'valid-token', password: 'nouppercase1' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== POST /auth/password-reset/confirm ====================

  describe('POST /auth/password-reset/confirm', () => {
    it('should work as alias for reset-password', async () => {
      mockAuthService.resetPassword.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/auth/password-reset/confirm')
        .send({ token: 'valid-token', password: 'NewStrong1' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  // ==================== POST /auth/verify-email/:token ====================

  describe('POST /auth/verify-email/:token', () => {
    it('should verify email successfully with valid token', async () => {
      mockAuthService.verifyEmail.mockResolvedValue({ valid: true, userId: 'user-123' });

      const response = await request(app)
        .post('/auth/verify-email/valid-verification-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Email verified successfully');
    });

    it('should return 400 for invalid verification token', async () => {
      mockAuthService.verifyEmail.mockResolvedValue({
        valid: false,
        error: 'Invalid or expired verification token',
      });

      const response = await request(app).post('/auth/verify-email/invalid-token').expect(400);

      expect(response.body.success).toBe(false);
      expect(JSON.stringify(response.body)).toContain('Invalid or expired verification token');
    });

    it('should return 400 for expired verification token', async () => {
      mockAuthService.verifyEmail.mockResolvedValue({
        valid: false,
        error: 'Token has expired',
      });

      const response = await request(app).post('/auth/verify-email/expired-token').expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== GET /auth/verify-email/:token/info ====================

  describe('GET /auth/verify-email/:token/info', () => {
    it('should return masked email for valid token', async () => {
      const { getEmailTokenService } = require('../services/email-token.service');
      const mockService = getEmailTokenService();
      mockService.getUserByVerificationToken.mockResolvedValue({
        email: 'testuser@example.com',
        firstName: 'Test',
      });

      const response = await request(app).get('/auth/verify-email/valid-token/info').expect(200);

      expect(response.body.success).toBe(true);
      // Email should be masked
      expect(response.body.data.email).not.toBe('testuser@example.com');
      expect(response.body.data.email).toContain('***@');
      expect(response.body.data.firstName).toBe('Test');
    });

    it('should return 400 for invalid token', async () => {
      const { getEmailTokenService } = require('../services/email-token.service');
      const mockService = getEmailTokenService();
      mockService.getUserByVerificationToken.mockResolvedValue(null);

      const response = await request(app).get('/auth/verify-email/bad-token/info').expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== GET /auth/me ====================

  describe('GET /auth/me', () => {
    it('should return current user info when authenticated', async () => {
      const mockUser = {
        id: 'test-user-1',
        email: 'test@test.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
        status: 'active',
        avatar: null,
        emailVerified: true,
        language: 'en',
        timezone: 'UTC',
        createdAt: new Date('2024-01-01'),
        lastLoginAt: new Date('2024-06-01'),
      };

      const mockRepo = (PrismaUserRepository as jest.Mock).mock.results[0]?.value || {
        findById: jest.fn(),
      };
      // Reset the mock to return a new repository
      (PrismaUserRepository as jest.Mock).mockImplementation(() => ({
        findById: jest.fn().mockResolvedValue(mockUser),
      }));

      const response = await request(app)
        .get('/auth/me')
        .set('Cookie', ['accessToken=test-token'])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('test@test.com');
      expect(response.body.data.firstName).toBe('Test');
      expect(response.body.data.role).toBe('user');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app).get('/auth/me').expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 when authenticated user not found in database', async () => {
      (PrismaUserRepository as jest.Mock).mockImplementation(() => ({
        findById: jest.fn().mockResolvedValue(null),
      }));

      const response = await request(app)
        .get('/auth/me')
        .set('Cookie', ['accessToken=test-token'])
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User not found');
    });
  });

  // ==================== POST /auth/password/change ====================

  describe('POST /auth/password/change', () => {
    it('should change password successfully', async () => {
      mockAuthService.changePassword.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/auth/password/change')
        .set('Cookie', ['accessToken=test-token'])
        .send({
          currentPassword: 'OldStrong1',
          newPassword: 'NewStrong1',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Password changed successfully');
      expect(mockAuthService.changePassword).toHaveBeenCalledWith(
        'test-user-1',
        'OldStrong1',
        'NewStrong1'
      );
    });

    it('should return 401 for incorrect current password', async () => {
      mockAuthService.changePassword.mockRejectedValue(
        new UnauthorizedError('Current password is incorrect')
      );

      const response = await request(app)
        .post('/auth/password/change')
        .set('Cookie', ['accessToken=test-token'])
        .send({
          currentPassword: 'WrongPass1',
          newPassword: 'NewStrong1',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for missing currentPassword', async () => {
      const response = await request(app)
        .post('/auth/password/change')
        .set('Cookie', ['accessToken=test-token'])
        .send({ newPassword: 'NewStrong1' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for weak new password', async () => {
      const response = await request(app)
        .post('/auth/password/change')
        .set('Cookie', ['accessToken=test-token'])
        .send({
          currentPassword: 'OldStrong1',
          newPassword: 'weak',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post('/auth/password/change')
        .send({
          currentPassword: 'OldStrong1',
          newPassword: 'NewStrong1',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== POST /auth/resend-verification ====================

  describe('POST /auth/resend-verification', () => {
    it('should resend verification email for unverified user', async () => {
      (PrismaUserRepository as jest.Mock).mockImplementation(() => ({
        findById: jest.fn().mockResolvedValue({
          id: 'test-user-1',
          email: 'test@test.com',
          firstName: 'Test',
          emailVerified: false,
        }),
      }));

      mockAuthService.generateNewVerificationToken.mockResolvedValue({
        token: 'new-verify-token',
      });

      const response = await request(app)
        .post('/auth/resend-verification')
        .set('Cookie', ['accessToken=test-token'])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Verification email sent');
    });

    it('should return 400 if email is already verified', async () => {
      (PrismaUserRepository as jest.Mock).mockImplementation(() => ({
        findById: jest.fn().mockResolvedValue({
          id: 'test-user-1',
          email: 'test@test.com',
          firstName: 'Test',
          emailVerified: true,
        }),
      }));

      const response = await request(app)
        .post('/auth/resend-verification')
        .set('Cookie', ['accessToken=test-token'])
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(JSON.stringify(response.body)).toContain('already verified');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app).post('/auth/resend-verification').expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== SECURITY TESTS ====================

  describe('Security', () => {
    it('should normalize email to lowercase on login', async () => {
      mockAuthService.login.mockResolvedValue({
        user: { id: '1', email: 'test@test.com', firstName: 'T', lastName: 'U', role: 'user' },
        tokens: {
          accessToken: 'a',
          refreshToken: 'r',
          expiresIn: 900,
          tokenType: 'Bearer' as const,
        },
      });

      await request(app)
        .post('/auth/login')
        .send({ email: 'TEST@TEST.COM', password: 'StrongPass1' })
        .expect(200);

      // Zod schema lowercases email via .toLowerCase()
      expect(mockAuthService.login).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'test@test.com' })
      );
    });

    it('should normalize email to lowercase on registration', async () => {
      mockAuthService.register.mockResolvedValue({
        user: { id: '1', email: 'new@test.com', firstName: 'N', lastName: 'U', role: 'user' },
        tokens: {
          accessToken: 'a',
          refreshToken: 'r',
          expiresIn: 900,
          tokenType: 'Bearer' as const,
        },
      });

      await request(app)
        .post('/auth/register')
        .send({
          email: 'NEW@TEST.COM',
          password: 'StrongPass1',
          firstName: 'N',
          lastName: 'U',
        })
        .expect(201);

      expect(mockAuthService.register).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'new@test.com' })
      );
    });

    it('should use consistent error messages to prevent user enumeration on login', async () => {
      // Both wrong password and non-existent user should return same message
      mockAuthService.login.mockRejectedValue(new UnauthorizedError('Invalid credentials'));

      const response1 = await request(app)
        .post('/auth/login')
        .send({ email: 'existing@test.com', password: 'WrongPass1' })
        .expect(401);

      const response2 = await request(app)
        .post('/auth/login')
        .send({ email: 'nonexistent@test.com', password: 'SomePass1' })
        .expect(401);

      expect(response1.body.error.message).toBe(response2.body.error.message);
    });

    it('should use consistent response for password reset regardless of email existence', async () => {
      // Existing email
      mockAuthService.requestPasswordReset.mockResolvedValueOnce('reset-token');
      const response1 = await request(app)
        .post('/auth/forgot-password')
        .send({ email: 'existing@test.com' })
        .expect(200);

      // Non-existent email
      mockAuthService.requestPasswordReset.mockResolvedValueOnce(null);
      const response2 = await request(app)
        .post('/auth/forgot-password')
        .send({ email: 'nobody@test.com' })
        .expect(200);

      // Both should return same status and message structure
      expect(response1.body.message).toBe(response2.body.message);
      expect(response1.body.success).toBe(response2.body.success);
    });
  });
});
