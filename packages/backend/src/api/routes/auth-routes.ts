import { Router, IRouter } from 'express';
import { z } from 'zod';
import { authController } from '../controllers/auth-controller';
import { authenticate } from '../middleware/auth-middleware';
import { validateBody, validateParams, commonSchemas } from '../middleware/validation-middleware';
import { loginRateLimiter, authRateLimiter, passwordResetRateLimiter } from '../middleware/rate-limit-middleware';

const router: IRouter = Router();

// ==================== ZOD SCHEMAS ====================

const registerSchema = z.object({
  email: commonSchemas.email,
  password: commonSchemas.password,
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
});

const loginSchema = z.object({
  email: commonSchemas.email,
  password: z.string().min(1, 'Password is required'),
});

const passwordResetRequestSchema = z.object({
  email: commonSchemas.email,
});

const passwordResetConfirmSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: commonSchemas.password,
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: commonSchemas.password,
});

const tokenParamSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

// ==================== PUBLIC ROUTES ====================

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, firstName, lastName]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email already in use
 */
router.post('/register', authRateLimiter, validateBody(registerSchema), authController.register);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Log in with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful, sets httpOnly cookies
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', loginRateLimiter, validateBody(loginSchema), authController.login);

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh access token using refresh token cookie
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: New access token issued
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post('/refresh', authRateLimiter, authController.refresh);

/**
 * @swagger
 * /api/v1/auth/password-reset/request:
 *   post:
 *     summary: Request a password reset email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Reset email sent (always returns 200 for security)
 */
router.post(
  '/password-reset/request',
  passwordResetRateLimiter,
  validateBody(passwordResetRequestSchema),
  authController.requestPasswordReset
);

/**
 * @swagger
 * /api/v1/auth/password-reset/confirm:
 *   post:
 *     summary: Confirm password reset with token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired token
 */
router.post(
  '/password-reset/confirm',
  passwordResetRateLimiter,
  validateBody(passwordResetConfirmSchema),
  authController.confirmPasswordReset
);

/**
 * @swagger
 * /api/v1/auth/forgot-password:
 *   post:
 *     summary: Request password reset (alias)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Reset email sent
 */
router.post(
  '/forgot-password',
  passwordResetRateLimiter,
  validateBody(passwordResetRequestSchema),
  authController.requestPasswordReset
);

/**
 * @swagger
 * /api/v1/auth/reset-password:
 *   post:
 *     summary: Confirm password reset (alias)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired token
 */
router.post(
  '/reset-password',
  passwordResetRateLimiter,
  validateBody(passwordResetConfirmSchema),
  authController.confirmPasswordReset
);

/**
 * @swagger
 * /api/v1/auth/verify-email/{token}:
 *   post:
 *     summary: Verify email address with token
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid or expired token
 */
router.post('/verify-email/:token', validateParams(tokenParamSchema), authController.verifyEmail);

/**
 * @swagger
 * /api/v1/auth/verify-email/{token}/info:
 *   get:
 *     summary: Get verification token info
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Token info returned
 *       404:
 *         description: Token not found
 */
router.get('/verify-email/:token/info', validateParams(tokenParamSchema), authController.getVerificationTokenInfo);

// ==================== PROTECTED ROUTES ====================

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Log out and clear auth cookies
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Current user data
 *       401:
 *         description: Unauthorized
 */
router.get('/me', authenticate, authController.getCurrentUser);

/**
 * @swagger
 * /api/v1/auth/password/change:
 *   post:
 *     summary: Change password for authenticated user
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Current password incorrect
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/password/change',
  authenticate,
  validateBody(changePasswordSchema),
  authController.changePassword
);

/**
 * @swagger
 * /api/v1/auth/resend-verification:
 *   post:
 *     summary: Resend email verification link
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Verification email sent
 *       401:
 *         description: Unauthorized
 */
router.post('/resend-verification', authenticate, authController.resendVerification);

export default router;
