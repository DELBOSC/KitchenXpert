/**
 * Email Token Service
 * Handles email verification tokens and password reset tokens
 * Production-ready implementation with proper security measures
 */

import * as crypto from 'crypto';

import winstonLogger from '../utils/logger';

import type { PrismaClient } from '@prisma/client';

const logger = winstonLogger.child({ module: 'EmailTokenService' });

/**
 * Token expiration configuration (in milliseconds)
 */
export const TOKEN_EXPIRATION = {
  EMAIL_VERIFICATION: 24 * 60 * 60 * 1000, // 24 hours
  PASSWORD_RESET: 60 * 60 * 1000, // 1 hour
} as const;

/**
 * Token types for type safety
 */
export type TokenType = 'email_verification' | 'password_reset';

/**
 * Result of token generation
 */
export interface TokenGenerationResult {
  /** The raw token to send to the user (not stored in DB) */
  token: string;
  /** The hashed token stored in the database */
  hashedToken: string;
  /** When the token expires */
  expiresAt: Date;
  /** Database record ID */
  tokenId: string;
}

/**
 * Result of token verification
 */
export interface TokenVerificationResult {
  valid: boolean;
  userId?: string;
  tokenId?: string;
  error?: string;
}

/**
 * Email Token Service Error
 */
export class EmailTokenError extends Error {
  public readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'EmailTokenError';
    this.code = code;
  }
}

/**
 * Email Token Service
 * Handles secure token generation, storage, and verification
 */
export class EmailTokenService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Generate a cryptographically secure token
   * Returns both the raw token (to send to user) and hashed version (to store)
   */
  private generateSecureToken(): { raw: string; hashed: string } {
    // Generate 32 bytes of random data for a secure token
    const rawToken = crypto.randomBytes(32).toString('hex');
    // Hash the token for storage using SHA-256
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    return { raw: rawToken, hashed: hashedToken };
  }

  /**
   * Hash a raw token for comparison
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generate an email verification token for a user
   * @param userId - The user's ID
   * @returns Token generation result with raw token to send to user
   */
  async generateVerificationToken(userId: string): Promise<TokenGenerationResult> {
    const { raw, hashed } = this.generateSecureToken();
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRATION.EMAIL_VERIFICATION);

    // Delete any existing unused verification tokens for this user atomically
    // (prevents token reuse race conditions)
    await this.prisma.emailVerificationToken.deleteMany({
      where: {
        userId,
        usedAt: null,
      },
    });

    // Create new verification token
    const tokenRecord = await this.prisma.emailVerificationToken.create({
      data: {
        userId,
        token: hashed,
        expiresAt,
      },
    });

    logger.info('Generated email verification token', {
      userId,
      tokenId: tokenRecord.id,
      expiresAt: expiresAt.toISOString(),
    });

    return {
      token: raw,
      hashedToken: hashed,
      expiresAt,
      tokenId: tokenRecord.id,
    };
  }

  /**
   * Verify an email verification token and mark user as verified
   * @param token - The raw token from the verification link
   * @returns Verification result
   */
  async verifyEmailToken(token: string): Promise<TokenVerificationResult> {
    const hashedToken = this.hashToken(token);

    // Find the token record
    const tokenRecord = await this.prisma.emailVerificationToken.findUnique({
      where: { token: hashedToken },
      include: { user: true },
    });

    if (!tokenRecord) {
      logger.warn('Email verification token not found');
      return { valid: false, error: 'Invalid or expired token' };
    }

    // Check if token has already been used
    if (tokenRecord.usedAt) {
      logger.warn('Email verification token already used', {
        tokenId: tokenRecord.id,
        usedAt: tokenRecord.usedAt,
      });
      return { valid: false, error: 'Token has already been used' };
    }

    // Check if token has expired
    if (new Date() > tokenRecord.expiresAt) {
      logger.warn('Email verification token expired', {
        tokenId: tokenRecord.id,
        expiresAt: tokenRecord.expiresAt,
      });
      return { valid: false, error: 'Token has expired' };
    }

    // Mark token as used and update user's email verification status
    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: tokenRecord.userId },
        data: {
          emailVerified: true,
          status: 'active', // Activate the user account
        },
      }),
    ]);

    logger.info('Email verified successfully', {
      userId: tokenRecord.userId,
      tokenId: tokenRecord.id,
    });

    return {
      valid: true,
      userId: tokenRecord.userId,
      tokenId: tokenRecord.id,
    };
  }

  /**
   * Generate a password reset token for a user by email
   * @param email - The user's email address
   * @returns Token generation result, or null if user not found (for security, don't reveal user existence)
   */
  async generatePasswordResetToken(email: string): Promise<TokenGenerationResult | null> {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Don't reveal that user doesn't exist - log for monitoring
      logger.info('Password reset requested for non-existent email', { email });
      return null;
    }

    const { raw, hashed } = this.generateSecureToken();
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRATION.PASSWORD_RESET);

    // Delete any existing unused password reset tokens for this user atomically
    // (prevents token reuse race conditions)
    await this.prisma.passwordResetToken.deleteMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
    });

    // Create new password reset token
    const tokenRecord = await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: hashed,
        expiresAt,
      },
    });

    logger.info('Generated password reset token', {
      userId: user.id,
      tokenId: tokenRecord.id,
      expiresAt: expiresAt.toISOString(),
    });

    return {
      token: raw,
      hashedToken: hashed,
      expiresAt,
      tokenId: tokenRecord.id,
    };
  }

  /**
   * Verify a password reset token
   * @param token - The raw token from the reset link
   * @returns Verification result with userId if valid
   */
  async verifyPasswordResetToken(token: string): Promise<TokenVerificationResult> {
    const hashedToken = this.hashToken(token);

    // Find the token record
    const tokenRecord = await this.prisma.passwordResetToken.findUnique({
      where: { token: hashedToken },
      include: { user: true },
    });

    if (!tokenRecord) {
      logger.warn('Password reset token not found');
      return { valid: false, error: 'Invalid or expired token' };
    }

    // Check if token has already been used
    if (tokenRecord.usedAt) {
      logger.warn('Password reset token already used', {
        tokenId: tokenRecord.id,
        usedAt: tokenRecord.usedAt,
      });
      return { valid: false, error: 'Token has already been used' };
    }

    // Check if token has expired
    if (new Date() > tokenRecord.expiresAt) {
      logger.warn('Password reset token expired', {
        tokenId: tokenRecord.id,
        expiresAt: tokenRecord.expiresAt,
      });
      return { valid: false, error: 'Token has expired' };
    }

    logger.info('Password reset token verified', {
      userId: tokenRecord.userId,
      tokenId: tokenRecord.id,
    });

    return {
      valid: true,
      userId: tokenRecord.userId,
      tokenId: tokenRecord.id,
    };
  }

  /**
   * Mark a password reset token as used
   * Call this after successfully resetting the password
   * @param tokenId - The token record ID
   */
  async markPasswordResetTokenUsed(tokenId: string): Promise<void> {
    await this.prisma.passwordResetToken.update({
      where: { id: tokenId },
      data: { usedAt: new Date() },
    });

    logger.info('Password reset token marked as used', { tokenId });
  }

  /**
   * Invalidate a specific token
   * @param tokenId - The token record ID
   * @param tokenType - Type of token to invalidate
   */
  async invalidateToken(tokenId: string, tokenType: TokenType): Promise<void> {
    if (tokenType === 'email_verification') {
      await this.prisma.emailVerificationToken.update({
        where: { id: tokenId },
        data: { usedAt: new Date() },
      });
    } else {
      await this.prisma.passwordResetToken.update({
        where: { id: tokenId },
        data: { usedAt: new Date() },
      });
    }

    logger.info('Token invalidated', { tokenId, tokenType });
  }

  /**
   * Invalidate all tokens for a user
   * Useful when user changes password or for security reasons
   * @param userId - The user's ID
   */
  async invalidateAllUserTokens(userId: string): Promise<void> {
    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.updateMany({
        where: { userId, usedAt: null },
        data: { usedAt: now },
      }),
      this.prisma.passwordResetToken.updateMany({
        where: { userId, usedAt: null },
        data: { usedAt: now },
      }),
    ]);

    logger.info('All tokens invalidated for user', { userId });
  }

  /**
   * Clean up expired tokens (maintenance task)
   * Should be called periodically (e.g., daily cron job)
   * @returns Number of tokens deleted
   */
  async cleanupExpiredTokens(): Promise<{ emailTokens: number; passwordTokens: number }> {
    const now = new Date();

    // Delete expired and used tokens older than 30 days
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [emailResult, passwordResult] = await this.prisma.$transaction([
      this.prisma.emailVerificationToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: thirtyDaysAgo } },
            { usedAt: { lt: thirtyDaysAgo } },
          ],
        },
      }),
      this.prisma.passwordResetToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: thirtyDaysAgo } },
            { usedAt: { lt: thirtyDaysAgo } },
          ],
        },
      }),
    ]);

    logger.info('Cleaned up expired tokens', {
      emailTokens: emailResult.count,
      passwordTokens: passwordResult.count,
    });

    return {
      emailTokens: emailResult.count,
      passwordTokens: passwordResult.count,
    };
  }

  /**
   * Check if a user has a pending (unused, non-expired) verification token
   * @param userId - The user's ID
   */
  async hasPendingVerificationToken(userId: string): Promise<boolean> {
    const token = await this.prisma.emailVerificationToken.findFirst({
      where: {
        userId,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    return !!token;
  }

  /**
   * Get user by verification token (without verifying)
   * Useful for displaying user info on verification page
   * @param token - The raw token
   */
  async getUserByVerificationToken(token: string): Promise<{ id: string; email: string; firstName: string } | null> {
    const hashedToken = this.hashToken(token);

    const tokenRecord = await this.prisma.emailVerificationToken.findUnique({
      where: { token: hashedToken },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
          },
        },
      },
    });

    if (!tokenRecord || tokenRecord.usedAt || new Date() > tokenRecord.expiresAt) {
      return null;
    }

    return tokenRecord.user;
  }
}

// Singleton instance
let emailTokenServiceInstance: EmailTokenService | null = null;

/**
 * Get or create the singleton email token service instance
 * @param prisma - Prisma client instance
 */
export function getEmailTokenService(prisma: PrismaClient): EmailTokenService {
  if (!emailTokenServiceInstance) {
    emailTokenServiceInstance = new EmailTokenService(prisma);
  }
  return emailTokenServiceInstance;
}

/**
 * Create a new email token service instance (non-singleton)
 * @param prisma - Prisma client instance
 */
export function createEmailTokenService(prisma: PrismaClient): EmailTokenService {
  return new EmailTokenService(prisma);
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetEmailTokenService(): void {
  emailTokenServiceInstance = null;
}

export default EmailTokenService;
