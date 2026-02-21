import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError, UserRole, JWTPayload } from '@kitchenxpert/common';
import { jwtService } from '../../auth/jwt.service';
import { getTokenBlacklist, getTokenIssuedAt } from '../../auth/token-blacklist';
import { PrismaUserRepository } from '../../repositories';
import { prisma } from '../../database/client';

/**
 * Étend le type Request d'Express pour inclure l'utilisateur
 */
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * Middleware d'authentification
 * Vérifie le token JWT et attache l'utilisateur à la requête
 * Also checks if the token has been blacklisted (e.g., after logout)
 */
export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Récupérer le token depuis le cookie httpOnly ou le header Authorization
    let token: string | undefined;

    // Priority 1: httpOnly cookie
    if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }
    // Priority 2: Authorization header (for API clients / mobile)
    else if (req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    if (!token) {
      throw new UnauthorizedError('Authentication required');
    }

    // Check if token is blacklisted
    const blacklist = getTokenBlacklist();
    const isBlacklisted = await blacklist.isBlacklisted(token);
    if (isBlacklisted) {
      throw new UnauthorizedError('Token has been revoked');
    }

    // Vérifier et décoder le token
    const payload = jwtService.verifyAccessToken(token);

    // Check if user's tokens are globally blacklisted (e.g., password change)
    const tokenIssuedAt = getTokenIssuedAt(token);
    if (tokenIssuedAt && payload.userId) {
      const isUserBlacklisted = await blacklist.isUserBlacklisted(payload.userId, tokenIssuedAt);
      if (isUserBlacklisted) {
        throw new UnauthorizedError('Token has been revoked due to security event');
      }
    }

    // Attacher l'utilisateur à la requête
    req.user = payload;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware d'authentification optionnel
 * Attache l'utilisateur si le token est présent, sinon continue
 */
export const authenticateOptional = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    // Priority 1: httpOnly cookie
    if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }
    // Priority 2: Authorization header
    else if (req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer' && parts[1]) {
        token = parts[1];
      }
    }

    if (token) {
      // Check blacklist even in optional mode
      const blacklist = getTokenBlacklist();
      const isBlacklisted = await blacklist.isBlacklisted(token);
      if (!isBlacklisted) {
        const payload = jwtService.verifyAccessToken(token);
        req.user = payload;
      }
    }

    next();
  } catch {
    // Ignorer les erreurs en mode optionnel
    next();
  }
};

/**
 * Middleware de vérification de rôle
 * À utiliser après authenticate()
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError(
        `Access denied. Required roles: ${allowedRoles.join(', ')}`
      );
    }

    next();
  };
};

/**
 * Middleware pour vérifier que l'utilisateur accède à ses propres ressources
 * ou est admin
 */
export const requireOwnerOrAdmin = (userIdParam = 'userId') => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const targetUserId = req.params[userIdParam] || req.body[userIdParam];

    // Admin peut tout faire
    if (req.user.role === 'admin') {
      next();
      return;
    }

    // Utilisateur doit accéder à ses propres ressources
    if (req.user.userId !== targetUserId) {
      throw new ForbiddenError('You can only access your own resources');
    }

    next();
  };
};

/**
 * Middleware pour vérifier que l'email est vérifié
 * Checks the database to ensure the user's email has been verified
 */
export const requireVerifiedEmail = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  // Verify email status in database
  const userRepository = new PrismaUserRepository(prisma);
  const user = await userRepository.findById(req.user.userId);

  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  if (!user.emailVerified) {
    throw new ForbiddenError('Email verification required. Please verify your email before accessing this resource.');
  }

  next();
};

/**
 * Authorize middleware - supports both array and spread syntax
 * authorize(['admin', 'provider']) or authorize('admin', 'provider')
 */
export const authorize = (rolesOrFirst: UserRole[] | UserRole, ...rest: UserRole[]) => {
  const roles: UserRole[] = Array.isArray(rolesOrFirst)
    ? rolesOrFirst
    : [rolesOrFirst, ...rest];
  return requireRole(...roles);
};

/**
 * Alias for authenticate
 */
export const authenticateToken = authenticate;

/**
 * Alias for authenticateOptional
 */
export const optionalAuth = authenticateOptional;
