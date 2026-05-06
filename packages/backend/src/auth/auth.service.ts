import bcrypt from 'bcrypt';
import {
  User,
  UserCredentials,
  UserRegistration,
  LoginResponse,
  AuthTokens,
  UnauthorizedError,
  ConflictError,
  BadRequestError,
} from '@kitchenxpert/common';
import { jwtService } from './jwt.service';
import logger from '../utils/logger';
import { prisma } from '../database/client';
import crypto from 'crypto';
import {
  EmailTokenService,
  TokenGenerationResult,
  TokenVerificationResult,
  TOKEN_EXPIRATION,
} from '../services/email-token.service';

/**
 * User Repository Interface
 *
 * This interface defines the contract for user data operations.
 * The AuthService depends on this interface to perform authentication.
 * Implementation: PrismaUserRepository in repositories/prisma-user.repository.ts
 */
export interface IUserRepository {
  /**
   * Find a user by email address
   * @param email - User's email address
   * @returns User with password hash if found, null otherwise
   */
  findByEmail(email: string): Promise<(User & { password: string }) | null>;

  /**
   * Find a user by ID
   * @param id - User's unique identifier
   * @returns User if found, null otherwise
   */
  findById(id: string): Promise<User | null>;

  /**
   * Create a new user
   * @param data - User registration data with hashed password
   * @returns Created user object
   */
  create(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: string;
    status: string;
    emailVerified: boolean;
    language: string;
    timezone: string;
  }): Promise<User>;

  /**
   * Update user's last login timestamp
   * @param userId - User's unique identifier
   */
  updateLastLogin(userId: string): Promise<void>;

  /**
   * Check if an email is already registered
   * @param email - Email address to check
   * @returns true if email exists, false otherwise
   */
  emailExists(email: string): Promise<boolean>;

  /**
   * Update user password
   * @param userId - User's unique identifier
   * @param hashedPassword - Already hashed password
   */
  updatePassword(userId: string, hashedPassword: string): Promise<void>;
}

/**
 * Registration result with verification token
 */
export interface RegisterResult extends LoginResponse {
  /** Verification token (only returned if email token service is configured) */
  verificationToken?: string;
}

/**
 * Service d'authentification
 *
 * This service handles user authentication operations including login, registration,
 * password management, and token operations. It requires a UserRepository implementation
 * to function (injected via constructor or setUserRepository).
 *
 * Database Integration: Uses PrismaUserRepository (configured in index.ts bootstrap)
 */
export class AuthService {
  private readonly SALT_ROUNDS = 12;
  private userRepository: IUserRepository | null = null;
  private emailTokenService: EmailTokenService | null = null;

  constructor(userRepository?: IUserRepository, emailTokenService?: EmailTokenService) {
    if (userRepository) {
      this.userRepository = userRepository;
    }
    if (emailTokenService) {
      this.emailTokenService = emailTokenService;
    }
  }

  /**
   * Set the user repository (dependency injection)
   * Must be called before using authentication methods
   */
  setUserRepository(repository: IUserRepository): void {
    this.userRepository = repository;
  }

  /**
   * Set the email token service (dependency injection)
   * Required for email verification and password reset functionality
   */
  setEmailTokenService(service: EmailTokenService): void {
    this.emailTokenService = service;
  }

  /**
   * Ensures the user repository is configured
   * @throws Error if repository is not set
   */
  private ensureRepository(): IUserRepository {
    if (!this.userRepository) {
      throw new Error(
        'CONFIGURATION ERROR: UserRepository is not configured. ' +
        'You must inject a UserRepository implementation before using AuthService. ' +
        'See IUserRepository interface for the required methods to implement.'
      );
    }
    return this.userRepository;
  }

  /**
   * Ensures the email token service is configured
   * @throws Error if service is not set
   */
  private ensureEmailTokenService(): EmailTokenService {
    if (!this.emailTokenService) {
      throw new Error(
        'CONFIGURATION ERROR: EmailTokenService is not configured. ' +
        'You must inject an EmailTokenService before using email verification or password reset.'
      );
    }
    return this.emailTokenService;
  }

  /**
   * Hash un mot de passe
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Compare un mot de passe avec son hash
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Inscription d'un nouvel utilisateur
   * Returns verification token if EmailTokenService is configured
   */
  async register(data: UserRegistration): Promise<RegisterResult> {
    this.ensureRepository();

    // Check if email already exists
    const emailLower = data.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: emailLower } });
    if (existing) {
      throw new ConflictError('Email already registered');
    }

    // Validate password strength
    this.validatePasswordStrength(data.password);

    // Hash the password
    const hashedPassword = await this.hashPassword(data.password);

    // Atomically create the user AND the email verification token so we never
    // end up with an account that has no way to verify itself. If either insert
    // fails, the whole registration is rolled back.
    const shouldIssueToken = !!this.emailTokenService;
    const rawToken = shouldIssueToken ? crypto.randomBytes(32).toString('hex') : null;
    const hashedToken = rawToken ? crypto.createHash('sha256').update(rawToken).digest('hex') : null;
    const tokenExpiresAt = new Date(Date.now() + TOKEN_EXPIRATION.EMAIL_VERIFICATION);

    const { user } = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: emailLower,
          password: hashedPassword,
          firstName: data.firstName,
          lastName: data.lastName,
          role: 'user',
          status: 'pending' as never,
          emailVerified: false,
          language: data.language || 'en',
          timezone: data.timezone || 'UTC',
        },
      });

      if (hashedToken) {
        await tx.emailVerificationToken.create({
          data: {
            userId: createdUser.id,
            token: hashedToken,
            expiresAt: tokenExpiresAt,
          },
        });
      }

      return { user: createdUser };
    });

    const verificationToken = rawToken ?? undefined;
    if (verificationToken) {
      logger.info(`Verification token issued atomically for user ${user.id}`);
    }

    // Generate JWT tokens
    const tokens = jwtService.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role as User['role'],
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role as User['role'],
      },
      tokens,
      verificationToken,
    };
  }

  /**
   * Connexion utilisateur
   */
  async login(credentials: UserCredentials): Promise<LoginResponse> {
    const repository = this.ensureRepository();

    // Retrieve user from database
    const user = await repository.findByEmail(credentials.email);
    if (!user) {
      // Use consistent error message to prevent user enumeration
      throw new UnauthorizedError('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await this.comparePassword(
      credentials.password,
      user.password
    );

    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check account status
    if (user.status !== 'active') {
      throw new UnauthorizedError('Account is not active');
    }

    // Update last login timestamp
    await repository.updateLastLogin(user.id);

    // Generate tokens
    const tokens = jwtService.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      tokens,
    };
  }

  /**
   * Rafraîchir les tokens
   */
  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    try {
      return jwtService.refreshTokens(refreshToken);
    } catch (error) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }

  /**
   * Valide la force d'un mot de passe
   */
  private validatePasswordStrength(password: string): void {
    if (password.length < 8) {
      throw new BadRequestError('Password must be at least 8 characters long');
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    // const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password); // Reserved for stricter validation

    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      throw new BadRequestError(
        'Password must contain uppercase, lowercase, and numbers'
      );
    }
  }

  /**
   * Réinitialisation de mot de passe (étape 1: envoi email)
   * Generates a password reset token and returns it for email sending
   * @param email - User's email address
   * @returns Reset token if user exists, null otherwise (for security)
   */
  async requestPasswordReset(email: string): Promise<string | null> {
    const emailTokenService = this.ensureEmailTokenService();

    // Generate password reset token (handles user lookup internally)
    const tokenResult = await emailTokenService.generatePasswordResetToken(email);

    if (!tokenResult) {
      // User not found - return null but don't reveal this
      logger.info(`Password reset requested for non-existent email: ${email}`);
      return null;
    }

    logger.info(`Password reset token generated for email: ${email}`);
    return tokenResult.token;
  }

  /**
   * Réinitialisation de mot de passe (étape 2: nouveau mot de passe)
   * Verifies token and updates user password
   * @param token - The password reset token
   * @param newPassword - The new password
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const emailTokenService = this.ensureEmailTokenService();
    const repository = this.ensureRepository();

    // Validate password strength first
    this.validatePasswordStrength(newPassword);

    // Verify the reset token
    const verification = await emailTokenService.verifyPasswordResetToken(token);
    if (!verification.valid || !verification.userId || !verification.tokenId) {
      throw new BadRequestError(verification.error || 'Invalid or expired reset token');
    }

    // Hash the new password
    const hashedPassword = await this.hashPassword(newPassword);

    // Update the password
    await repository.updatePassword(verification.userId, hashedPassword);

    // Mark the token as used
    await emailTokenService.markPasswordResetTokenUsed(verification.tokenId);

    // Invalidate all other tokens for this user for security
    await emailTokenService.invalidateAllUserTokens(verification.userId);

    logger.info(`Password reset completed for user ${verification.userId}`);
  }

  /**
   * Verify email using verification token
   * @param token - The email verification token
   * @returns Verification result
   */
  async verifyEmail(token: string): Promise<TokenVerificationResult> {
    const emailTokenService = this.ensureEmailTokenService();

    const result = await emailTokenService.verifyEmailToken(token);

    if (result.valid) {
      logger.info(`Email verified for user ${result.userId}`);
    }

    return result;
  }

  /**
   * Generate a new verification token for a user
   * Useful for resending verification emails
   * @param userId - The user's ID
   * @returns Token generation result
   */
  async generateNewVerificationToken(userId: string): Promise<TokenGenerationResult> {
    const emailTokenService = this.ensureEmailTokenService();
    return emailTokenService.generateVerificationToken(userId);
  }

  /**
   * Changement de mot de passe (utilisateur connecté)
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const repository = this.ensureRepository() as IUserRepository & {
      updatePassword(userId: string, hashedPassword: string): Promise<void>;
    };

    // Validate new password strength
    this.validatePasswordStrength(newPassword);

    // Get user with password - need to find by ID, not email
    const userByEmail = await repository.findById(userId);
    if (!userByEmail) {
      throw new UnauthorizedError('User not found');
    }

    // Get user with password for verification
    const user = await repository.findByEmail(userByEmail.email);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Verify current password
    const isValidPassword = await this.comparePassword(currentPassword, user.password);
    if (!isValidPassword) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    // Hash new password and update
    const hashedPassword = await this.hashPassword(newPassword);
    await repository.updatePassword(userId, hashedPassword);

    logger.info(`Password changed for user ${userId}`);
  }
}

/**
 * Factory function to create AuthService with repository
 *
 * Usage:
 * ```typescript
 * import { PrismaClient } from '@prisma/client';
 * import { createAuthService } from './auth.service';
 * import { PrismaUserRepository } from './repositories/prisma-user.repository';
 *
 * const prisma = new PrismaClient();
 * const userRepository = new PrismaUserRepository(prisma);
 * const authService = createAuthService(userRepository);
 * ```
 */
export function createAuthService(userRepository: IUserRepository): AuthService {
  return new AuthService(userRepository);
}

/**
 * Singleton instance for backward compatibility
 * Repository is configured at application startup in index.ts
 */
export const authService = new AuthService();
