import jwt from 'jsonwebtoken';
import { JWTPayload, AuthTokens, UnauthorizedError } from '@kitchenxpert/common';
import logger from '../utils/logger';

/**
 * Service de gestion des JWT
 *
 * REQUIRED ENVIRONMENT VARIABLES:
 * - JWT_ACCESS_SECRET: Secret key for signing access tokens (min 32 characters)
 * - JWT_REFRESH_SECRET: Secret key for signing refresh tokens (min 32 characters)
 *
 * OPTIONAL ENVIRONMENT VARIABLES:
 * - JWT_ACCESS_EXPIRY: Access token expiry (default: '15m'). Format: <number><unit>
 *   where unit is 's' (seconds), 'm' (minutes), 'h' (hours), or 'd' (days)
 * - JWT_REFRESH_EXPIRY: Refresh token expiry (default: '7d')
 *
 * SECURITY NOTES:
 * - Never commit JWT secrets to version control
 * - Use cryptographically secure random strings for secrets
 * - Rotate secrets periodically in production
 * - Consider using a secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.)
 */
export class JWTService {
  private accessTokenSecret: string;
  private refreshTokenSecret: string;
  private accessTokenExpiry: string;
  private refreshTokenExpiry: string;

  constructor() {
    const accessSecret = process.env.JWT_ACCESS_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET;

    // SECURITY: Always require JWT secrets - no fallback values allowed
    if (!accessSecret) {
      throw new Error(
        'SECURITY ERROR: JWT_ACCESS_SECRET environment variable is required. ' +
        'Please set a cryptographically secure secret of at least 32 characters.'
      );
    }

    if (!refreshSecret) {
      throw new Error(
        'SECURITY ERROR: JWT_REFRESH_SECRET environment variable is required. ' +
        'Please set a cryptographically secure secret of at least 32 characters.'
      );
    }

    // Validate minimum secret length for security
    if (accessSecret.length < 32) {
      throw new Error(
        'SECURITY ERROR: JWT_ACCESS_SECRET must be at least 32 characters long for adequate security.'
      );
    }

    if (refreshSecret.length < 32) {
      throw new Error(
        'SECURITY ERROR: JWT_REFRESH_SECRET must be at least 32 characters long for adequate security.'
      );
    }

    // Warn if secrets appear to be weak (common patterns)
    this.validateSecretStrength(accessSecret, 'JWT_ACCESS_SECRET');
    this.validateSecretStrength(refreshSecret, 'JWT_REFRESH_SECRET');

    this.accessTokenSecret = accessSecret;
    this.refreshTokenSecret = refreshSecret;
    this.accessTokenExpiry = process.env.JWT_ACCESS_EXPIRY || '15m';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';
  }

  /**
   * Validates that a secret doesn't follow weak patterns
   */
  private validateSecretStrength(secret: string, name: string): void {
    const weakPatterns = [
      /^(.)\1+$/, // All same character
      /^(012345|123456|abcdef|qwerty)/i, // Sequential patterns
      /^(secret|password|jwt|token)/i, // Common weak prefixes
    ];

    for (const pattern of weakPatterns) {
      if (pattern.test(secret)) {
        logger.warn(
          `SECURITY WARNING: ${name} appears to follow a weak pattern. ` +
          'Consider using a cryptographically secure random string.'
        );
        break;
      }
    }
  }

  /**
   * Génère une paire de tokens (access + refresh)
   */
  generateTokens(payload: Omit<JWTPayload, 'iat' | 'exp'>): AuthTokens {
    // Parse expiry to seconds for jwt.sign
    const accessExpirySeconds = this.parseExpiry(this.accessTokenExpiry);
    const refreshExpirySeconds = this.parseExpiry(this.refreshTokenExpiry);

    const accessToken = jwt.sign(payload, this.accessTokenSecret, {
      expiresIn: accessExpirySeconds,
    });

    const refreshToken = jwt.sign(payload, this.refreshTokenSecret, {
      expiresIn: refreshExpirySeconds,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: accessExpirySeconds,
      tokenType: 'Bearer',
    };
  }

  /**
   * Vérifie et décode un access token
   */
  verifyAccessToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret) as JWTPayload;
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Access token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedError('Invalid access token');
      }
      throw new UnauthorizedError('Token verification failed');
    }
  }

  /**
   * Vérifie et décode un refresh token
   */
  verifyRefreshToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, this.refreshTokenSecret) as JWTPayload;
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Refresh token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedError('Invalid refresh token');
      }
      throw new UnauthorizedError('Token verification failed');
    }
  }

  /**
   * Rafraîchit les tokens
   */
  refreshTokens(refreshToken: string): AuthTokens {
    const payload = this.verifyRefreshToken(refreshToken);

    // Créer un nouveau payload sans iat et exp
    const newPayload = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    };

    return this.generateTokens(newPayload);
  }

  /**
   * Parse une durée (ex: "15m", "7d") en secondes
   */
  private parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match || !match[1] || !match[2]) return 900; // Default 15 minutes

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };

    return value * (multipliers[unit] ?? 60);
  }
}

// Export singleton instance
export const jwtService = new JWTService();
