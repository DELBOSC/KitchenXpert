/**
 * Auth Service Tests
 * Tests for registration, login, password management, and token operations
 */

import bcrypt from 'bcrypt';
import { UnauthorizedError, ConflictError, BadRequestError } from '@kitchenxpert/common';

// Mock dependencies
jest.mock('bcrypt');
jest.mock('../auth/jwt.service', () => ({
  jwtService: {
    generateTokens: jest.fn(),
    verifyAccessToken: jest.fn(),
    verifyRefreshToken: jest.fn(),
    refreshTokens: jest.fn(),
  },
  JWTService: jest.fn(),
}));
jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Import after mocks
import { AuthService, IUserRepository } from '../auth/auth.service';
import { jwtService } from '../auth/jwt.service';

describe('AuthService', () => {
  let authService: AuthService;
  let mockRepository: jest.Mocked<IUserRepository>;
  let mockEmailTokenService: any;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'user',
    status: 'active',
    emailVerified: true,
    password: 'hashed-password',
  };

  const mockTokens = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresIn: 900,
    tokenType: 'Bearer' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      updateLastLogin: jest.fn(),
      emailExists: jest.fn(),
      updatePassword: jest.fn(),
    };

    mockEmailTokenService = {
      generateVerificationToken: jest.fn(),
      generatePasswordResetToken: jest.fn(),
      verifyPasswordResetToken: jest.fn(),
      verifyEmailToken: jest.fn(),
      markPasswordResetTokenUsed: jest.fn(),
      invalidateAllUserTokens: jest.fn(),
    };

    authService = new AuthService(mockRepository, mockEmailTokenService);
    (jwtService.generateTokens as jest.Mock).mockReturnValue(mockTokens);
  });

  // ==================== REGISTRATION ====================

  describe('register', () => {
    const registrationData = {
      email: 'new@example.com',
      password: 'StrongPass1',
      firstName: 'New',
      lastName: 'User',
    };

    it('should register a new user successfully', async () => {
      mockRepository.emailExists.mockResolvedValue(false);
      mockRepository.create.mockResolvedValue({
        id: 'new-user-id',
        email: registrationData.email,
        firstName: registrationData.firstName,
        lastName: registrationData.lastName,
        role: 'user',
        status: 'pending',
      } as any);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      mockEmailTokenService.generateVerificationToken.mockResolvedValue({ token: 'verify-token' });

      const result = await authService.register(registrationData);

      expect(mockRepository.emailExists).toHaveBeenCalledWith(registrationData.email);
      expect(bcrypt.hash).toHaveBeenCalledWith(registrationData.password, 12);
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: registrationData.email,
          password: 'hashed-password',
          role: 'user',
          status: 'pending',
          emailVerified: false,
        })
      );
      expect(result.user.email).toBe(registrationData.email);
      expect(result.tokens).toEqual(mockTokens);
      expect(result.verificationToken).toBe('verify-token');
    });

    it('should throw ConflictError if email already exists', async () => {
      mockRepository.emailExists.mockResolvedValue(true);

      await expect(authService.register(registrationData)).rejects.toThrow(ConflictError);
    });

    it('should throw BadRequestError for weak password (too short)', async () => {
      mockRepository.emailExists.mockResolvedValue(false);

      await expect(
        authService.register({ ...registrationData, password: 'Ab1' })
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError for password without uppercase', async () => {
      mockRepository.emailExists.mockResolvedValue(false);

      await expect(
        authService.register({ ...registrationData, password: 'weakpass1' })
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError for password without numbers', async () => {
      mockRepository.emailExists.mockResolvedValue(false);

      await expect(
        authService.register({ ...registrationData, password: 'WeakPassword' })
      ).rejects.toThrow(BadRequestError);
    });

    it('should still register if verification token generation fails', async () => {
      mockRepository.emailExists.mockResolvedValue(false);
      mockRepository.create.mockResolvedValue({
        id: 'new-user-id',
        email: registrationData.email,
        firstName: 'New',
        lastName: 'User',
        role: 'user',
      } as any);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      mockEmailTokenService.generateVerificationToken.mockRejectedValue(new Error('token fail'));

      const result = await authService.register(registrationData);

      expect(result.user).toBeDefined();
      expect(result.verificationToken).toBeUndefined();
    });
  });

  // ==================== LOGIN ====================

  describe('login', () => {
    const credentials = { email: 'test@example.com', password: 'StrongPass1' };

    it('should login successfully with valid credentials', async () => {
      mockRepository.findByEmail.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await authService.login(credentials);

      expect(mockRepository.findByEmail).toHaveBeenCalledWith(credentials.email);
      expect(bcrypt.compare).toHaveBeenCalledWith(credentials.password, mockUser.password);
      expect(mockRepository.updateLastLogin).toHaveBeenCalledWith(mockUser.id);
      expect(result.user.email).toBe(mockUser.email);
      expect(result.tokens).toEqual(mockTokens);
    });

    it('should throw UnauthorizedError if user not found', async () => {
      mockRepository.findByEmail.mockResolvedValue(null);

      await expect(authService.login(credentials)).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError if password is invalid', async () => {
      mockRepository.findByEmail.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.login(credentials)).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError if account is not active', async () => {
      mockRepository.findByEmail.mockResolvedValue({
        ...mockUser,
        status: 'suspended',
      } as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(authService.login(credentials)).rejects.toThrow(UnauthorizedError);
    });
  });

  // ==================== TOKEN REFRESH ====================

  describe('refreshTokens', () => {
    it('should refresh tokens successfully', async () => {
      (jwtService.refreshTokens as jest.Mock).mockReturnValue(mockTokens);

      const result = await authService.refreshTokens('valid-refresh-token');

      expect(jwtService.refreshTokens).toHaveBeenCalledWith('valid-refresh-token');
      expect(result).toEqual(mockTokens);
    });

    it('should throw UnauthorizedError for invalid refresh token', async () => {
      (jwtService.refreshTokens as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(authService.refreshTokens('invalid-token')).rejects.toThrow(UnauthorizedError);
    });
  });

  // ==================== PASSWORD RESET ====================

  describe('requestPasswordReset', () => {
    it('should generate a reset token for existing user', async () => {
      mockEmailTokenService.generatePasswordResetToken.mockResolvedValue({ token: 'reset-token' });

      const result = await authService.requestPasswordReset('test@example.com');

      expect(result).toBe('reset-token');
    });

    it('should return null for non-existent user (no enumeration)', async () => {
      mockEmailTokenService.generatePasswordResetToken.mockResolvedValue(null);

      const result = await authService.requestPasswordReset('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      mockEmailTokenService.verifyPasswordResetToken.mockResolvedValue({
        valid: true,
        userId: 'user-123',
        tokenId: 'token-id',
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');

      await authService.resetPassword('valid-token', 'NewStrong1');

      expect(mockRepository.updatePassword).toHaveBeenCalledWith('user-123', 'new-hashed-password');
      expect(mockEmailTokenService.markPasswordResetTokenUsed).toHaveBeenCalledWith('token-id');
      expect(mockEmailTokenService.invalidateAllUserTokens).toHaveBeenCalledWith('user-123');
    });

    it('should throw BadRequestError for invalid reset token', async () => {
      mockEmailTokenService.verifyPasswordResetToken.mockResolvedValue({
        valid: false,
        error: 'Token expired',
      });

      await expect(authService.resetPassword('invalid-token', 'NewStrong1')).rejects.toThrow(BadRequestError);
    });
  });

  // ==================== CHANGE PASSWORD ====================

  describe('changePassword', () => {
    it('should change password for authenticated user', async () => {
      mockRepository.findById.mockResolvedValue(mockUser as any);
      mockRepository.findByEmail.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');

      await authService.changePassword('user-123', 'OldPass1', 'NewStrong1');

      expect(bcrypt.compare).toHaveBeenCalledWith('OldPass1', mockUser.password);
      expect(mockRepository.updatePassword).toHaveBeenCalledWith('user-123', 'new-hashed-password');
    });

    it('should throw UnauthorizedError if current password is incorrect', async () => {
      mockRepository.findById.mockResolvedValue(mockUser as any);
      mockRepository.findByEmail.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        authService.changePassword('user-123', 'WrongPass1', 'NewStrong1')
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError if user not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(
        authService.changePassword('bad-id', 'OldPass1', 'NewStrong1')
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  // ==================== CONFIGURATION SAFETY ====================

  describe('configuration safety', () => {
    it('should throw if repository is not configured', async () => {
      const unconfiguredService = new AuthService();

      await expect(
        unconfiguredService.login({ email: 'test@test.com', password: 'pass' })
      ).rejects.toThrow('CONFIGURATION ERROR');
    });

    it('should throw if email token service is not configured for password reset', async () => {
      const serviceWithoutEmail = new AuthService(mockRepository);

      await expect(
        serviceWithoutEmail.requestPasswordReset('test@test.com')
      ).rejects.toThrow('CONFIGURATION ERROR');
    });
  });
});
