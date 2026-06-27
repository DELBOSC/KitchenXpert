import { type Request, type Response } from 'express';

import {
  type LoginRequest,
  type UserRegistration,
  type PasswordResetRequest,
  type PasswordResetConfirm,
  type ChangePasswordRequest,
} from '@kitchenxpert/common';

import { authService } from '../../auth/auth.service';
import { getTokenBlacklist, getTokenExpiration } from '../../auth/token-blacklist';
import { config } from '../../config/app-config';
import { prisma } from '../../database/client';
import { PrismaUserRepository } from '../../repositories';
import { getEmailTokenService } from '../../services/email-token.service';
import { getMailService } from '../../services/mail.service';
import logger from '../../utils/logger';
import { asyncHandler } from '../middleware/error-middleware';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Set auth tokens as httpOnly cookies on the response
 */
function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string; expiresIn: number }
): void {
  res.cookie('accessToken', tokens.accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: tokens.expiresIn * 1000,
    path: '/',
  });

  res.cookie('refreshToken', tokens.refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/v1/auth',
  });
}

/**
 * Clear auth cookies from the response
 */
function clearAuthCookies(res: Response): void {
  res.clearCookie('accessToken', { path: '/' });
  res.clearCookie('refreshToken', { path: '/api/v1/auth' });
}

/**
 * Contrôleur d'authentification
 */
export class AuthController {
  /**
   * POST /auth/register
   * Inscription d'un nouvel utilisateur
   * Generates email verification token and optionally sends verification email
   */
  register = asyncHandler(async (req: Request, res: Response) => {
    const data: UserRegistration = req.body;

    // Timing attack mitigation: ensure consistent response time
    // to prevent email enumeration via timing differences
    const MIN_RESPONSE_MS = 200;
    const start = Date.now();

    const result = await authService.register(data);

    // Send verification email if token was generated and mail service is available
    if (result.verificationToken) {
      try {
        const mailService = getMailService();
        const verificationLink = `${config.corsOrigins[0] || 'http://localhost:3000'}/verify-email?token=${result.verificationToken}`;

        await mailService.sendVerificationEmail(
          { email: result.user.email, name: result.user.firstName },
          verificationLink
        );
      } catch (error) {
        // Log but don't fail registration if email sending fails
        logger.error('Failed to send verification email', { error });
      }
    }

    // Send welcome email (non-blocking)
    try {
      const mailService = getMailService();
      await mailService.sendWelcome({ email: result.user.email, name: result.user.firstName });
    } catch (error) {
      logger.error('Failed to send welcome email', { error });
    }

    // Don't expose the verification token in the API response for security
    // The token is sent via email only
    const { verificationToken: _token, ...responseData } = result;

    // Set tokens as httpOnly cookies
    if (responseData.tokens) {
      setAuthCookies(res, responseData.tokens);
    }

    // Pad response time to prevent timing-based email enumeration
    const elapsed = Date.now() - start;
    if (elapsed < MIN_RESPONSE_MS) {
      await new Promise((resolve) => setTimeout(resolve, MIN_RESPONSE_MS - elapsed));
    }

    res.status(201).json({
      success: true,
      data: {
        user: responseData.user,
        tokens: responseData.tokens
          ? { expiresIn: responseData.tokens.expiresIn, tokenType: 'Bearer' }
          : undefined,
      },
      message: 'User registered successfully. Please check your email to verify your account.',
    });
  });

  /**
   * POST /auth/login
   * Connexion utilisateur
   */
  login = asyncHandler(async (req: Request, res: Response) => {
    const credentials: LoginRequest = req.body;

    const result = await authService.login(credentials);

    // Set tokens as httpOnly cookies
    if (result.tokens) {
      setAuthCookies(res, result.tokens);
    }

    res.status(200).json({
      success: true,
      data: {
        user: result.user,
        tokens: result.tokens
          ? { expiresIn: result.tokens.expiresIn, tokenType: 'Bearer' }
          : undefined,
      },
      message: 'Login successful',
    });
  });

  /**
   * POST /auth/refresh
   * Rafraîchir les tokens
   */
  refresh = asyncHandler(async (req: Request, res: Response) => {
    // Read refresh token from cookie or body (backward compatibility)
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

    const tokens = await authService.refreshTokens(refreshToken);

    // Set new tokens as httpOnly cookies
    if (tokens) {
      setAuthCookies(res, tokens);
    }

    res.status(200).json({
      success: true,
      data: { tokens: tokens ? { expiresIn: tokens.expiresIn, tokenType: 'Bearer' } : undefined },
      message: 'Tokens refreshed successfully',
    });
  });

  /**
   * POST /auth/logout
   * Déconnexion - adds the token to blacklist to prevent reuse
   */
  logout = asyncHandler(async (req: Request, res: Response) => {
    const blacklist = getTokenBlacklist();

    // Blacklist access token
    const accessToken =
      req.cookies?.accessToken ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.substring(7)
        : null);

    if (accessToken) {
      const expiresAt = getTokenExpiration(accessToken);
      await blacklist.addToBlacklist(
        accessToken,
        expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000)
      );
    }

    // Blacklist refresh token to prevent reuse
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      await blacklist.addToBlacklist(
        refreshToken,
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7-day TTL
      );
    }

    // Clear auth cookies
    clearAuthCookies(res);

    res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  });

  /**
   * POST /auth/password-reset/request
   * Demander une réinitialisation de mot de passe
   * Generates a password reset token and sends email
   */
  requestPasswordReset = asyncHandler(async (req: Request, res: Response) => {
    const { email }: PasswordResetRequest = req.body;

    const resetToken = await authService.requestPasswordReset(email);

    // Send password reset email if token was generated
    if (resetToken) {
      try {
        const mailService = getMailService();
        const resetLink = `${config.corsOrigins[0] || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

        await mailService.sendPasswordReset({ email }, resetLink);
      } catch (error) {
        // Log but don't fail the request if email sending fails
        logger.error('Failed to send password reset email', { error });
      }
    }

    // Always return success to prevent email enumeration
    res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  });

  /**
   * POST /auth/password-reset/confirm
   * Confirmer la réinitialisation avec le token
   */
  confirmPasswordReset = asyncHandler(async (req: Request, res: Response) => {
    const { token, newPassword }: PasswordResetConfirm = req.body;

    await authService.resetPassword(token, newPassword);

    res.status(200).json({
      success: true,
      message: 'Password reset successful',
    });
  });

  /**
   * POST /auth/password/change
   * Changer le mot de passe (utilisateur connecté)
   */
  changePassword = asyncHandler(async (req: Request, res: Response) => {
    const { currentPassword, newPassword }: ChangePasswordRequest = req.body;
    const userId = req.user!.userId; // authenticate() garantit que user existe

    await authService.changePassword(userId, currentPassword, newPassword);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  });

  /**
   * GET /auth/me
   * Récupérer les informations de l'utilisateur connecté
   */
  getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    // Fetch full user from database
    const userRepository = new PrismaUserRepository(prisma);
    const user = await userRepository.findById(userId);

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        avatar: user.avatar,
        emailVerified: user.emailVerified,
        language: user.language,
        timezone: user.timezone,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
    });
  });

  /**
   * POST /auth/verify-email/:token
   * Vérifier l'email avec le token
   * Verifies the email verification token and activates the user account
   */
  verifyEmail = asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.params;

    if (!token) {
      res.status(400).json({
        success: false,
        error: 'Verification token is required',
      });
      return;
    }

    const result = await authService.verifyEmail(token);

    if (!result.valid) {
      res.status(400).json({
        success: false,
        error: result.error || 'Invalid or expired verification token',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Email verified successfully. Your account is now active.',
    });
  });

  /**
   * GET /auth/verify-email/:token/info
   * Get user info for a verification token (for display purposes)
   */
  getVerificationTokenInfo = asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.params;

    if (!token) {
      res.status(400).json({
        success: false,
        error: 'Verification token is required',
      });
      return;
    }

    const emailTokenService = getEmailTokenService(prisma);
    const user = await emailTokenService.getUserByVerificationToken(token);

    if (!user) {
      res.status(400).json({
        success: false,
        error: 'Invalid or expired verification token',
      });
      return;
    }

    // Only return masked email to prevent information disclosure
    const [localPart, domain] = user.email.split('@');
    const maskedEmail = `${localPart!.charAt(0)}***@${domain}`;

    res.status(200).json({
      success: true,
      data: {
        email: maskedEmail,
        firstName: user.firstName,
      },
    });
  });

  /**
   * POST /auth/resend-verification
   * Renvoyer l'email de vérification
   * Generates a new verification token and sends email
   */
  resendVerification = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    // Get user info
    const userRepository = new PrismaUserRepository(prisma);
    const user = await userRepository.findById(userId);

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    // Check if email is already verified
    if (user.emailVerified) {
      res.status(400).json({
        success: false,
        error: 'Email is already verified',
      });
      return;
    }

    // Generate new verification token
    const tokenResult = await authService.generateNewVerificationToken(userId);

    // Send verification email
    try {
      const mailService = getMailService();
      const verificationLink = `${config.corsOrigins[0] || 'http://localhost:3000'}/verify-email?token=${tokenResult.token}`;

      await mailService.sendVerificationEmail(
        { email: user.email, name: user.firstName },
        verificationLink
      );
    } catch (error) {
      logger.error('Failed to send verification email', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to send verification email. Please try again later.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Verification email sent. Please check your inbox.',
    });
  });
}

// Export instance
export const authController = new AuthController();
