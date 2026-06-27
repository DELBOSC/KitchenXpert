/**
 * JWT (JSON Web Token) Configuration
 * Handles token generation, validation, and refresh mechanisms
 *
 * Dependencies: jsonwebtoken
 * Usage: Authentication middleware and token utilities
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * Get JWT secret from environment with validation
 * Throws error if not set in production
 */
const getSecret = (envVar, fallback = null) => {
  const secret = process.env[envVar];

  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error(`${envVar} must be set in production environment`);
  }

  if (!secret && fallback) {
    console.warn(`${envVar} not set, using fallback (NOT SECURE FOR PRODUCTION)`);
    return fallback;
  }

  return secret;
};

/**
 * JWT Secrets - Should be strong, random strings
 * Use different secrets for access and refresh tokens
 */
const JWT_ACCESS_SECRET = getSecret(
  'JWT_ACCESS_SECRET',
  'dev-access-secret-change-in-production-' + crypto.randomBytes(32).toString('hex')
);

const JWT_REFRESH_SECRET = getSecret(
  'JWT_REFRESH_SECRET',
  'dev-refresh-secret-change-in-production-' + crypto.randomBytes(32).toString('hex')
);

/**
 * Token expiration times
 */
const ACCESS_TOKEN_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d'; // 7 days
const REMEMBER_ME_EXPIRY = process.env.JWT_REMEMBER_ME_EXPIRY || '30d'; // 30 days

/**
 * JWT Algorithm
 */
const ALGORITHM = process.env.JWT_ALGORITHM || 'HS256';

/**
 * Issuer and Audience for additional validation
 */
const ISSUER = process.env.JWT_ISSUER || 'kitchenxpert-api';
const AUDIENCE = process.env.JWT_AUDIENCE || 'kitchenxpert-client';

/**
 * Token blacklist (in-memory for demo, use Redis in production)
 * Store revoked tokens to prevent their use
 */
class TokenBlacklist {
  constructor() {
    this.tokens = new Map();
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 60 * 1000); // Cleanup every hour
  }

  /**
   * Add token to blacklist
   * @param {string} token - JWT token to blacklist
   * @param {number} expiresIn - Token expiration time in seconds
   */
  add(token, expiresIn) {
    const expiryTime = Date.now() + expiresIn * 1000;
    this.tokens.set(token, expiryTime);
  }

  /**
   * Check if token is blacklisted
   * @param {string} token - JWT token to check
   * @returns {boolean}
   */
  has(token) {
    if (!this.tokens.has(token)) return false;

    const expiryTime = this.tokens.get(token);
    if (Date.now() > expiryTime) {
      this.tokens.delete(token);
      return false;
    }

    return true;
  }

  /**
   * Remove expired tokens from blacklist
   */
  cleanup() {
    const now = Date.now();
    for (const [token, expiryTime] of this.tokens.entries()) {
      if (now > expiryTime) {
        this.tokens.delete(token);
      }
    }
  }

  /**
   * Clear all tokens (for testing)
   */
  clear() {
    this.tokens.clear();
  }

  /**
   * Get blacklist size
   */
  size() {
    return this.tokens.size;
  }

  /**
   * Cleanup interval
   */
  destroy() {
    clearInterval(this.cleanupInterval);
    this.tokens.clear();
  }
}

const tokenBlacklist = new TokenBlacklist();

/**
 * Generate access token
 * @param {Object} payload - User data to encode
 * @param {Object} options - Additional JWT options
 * @returns {string} JWT access token
 */
const generateAccessToken = (payload, options = {}) => {
  const tokenPayload = {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    permissions: payload.permissions || [],
    type: 'access',
  };

  const tokenOptions = {
    expiresIn: options.expiresIn || ACCESS_TOKEN_EXPIRY,
    issuer: ISSUER,
    audience: AUDIENCE,
    algorithm: ALGORITHM,
    ...options,
  };

  return jwt.sign(tokenPayload, JWT_ACCESS_SECRET, tokenOptions);
};

/**
 * Generate refresh token
 * @param {Object} payload - User data to encode
 * @param {Object} options - Additional JWT options
 * @returns {string} JWT refresh token
 */
const generateRefreshToken = (payload, options = {}) => {
  const tokenPayload = {
    userId: payload.userId,
    email: payload.email,
    type: 'refresh',
    tokenVersion: payload.tokenVersion || 0, // For token rotation
  };

  const expiresIn = payload.rememberMe
    ? REMEMBER_ME_EXPIRY
    : options.expiresIn || REFRESH_TOKEN_EXPIRY;

  const tokenOptions = {
    expiresIn,
    issuer: ISSUER,
    audience: AUDIENCE,
    algorithm: ALGORITHM,
    ...options,
  };

  return jwt.sign(tokenPayload, JWT_REFRESH_SECRET, tokenOptions);
};

/**
 * Generate both access and refresh tokens
 * @param {Object} payload - User data
 * @returns {Object} Object containing both tokens
 */
const generateTokenPair = (payload) => {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
    expiresIn: ACCESS_TOKEN_EXPIRY,
  };
};

/**
 * Verify access token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or blacklisted
 */
const verifyAccessToken = (token) => {
  // Check blacklist first
  if (tokenBlacklist.has(token)) {
    throw new Error('Token has been revoked');
  }

  try {
    const decoded = jwt.verify(token, JWT_ACCESS_SECRET, {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: [ALGORITHM],
    });

    // Verify token type
    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }

    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Access token has expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid access token');
    }
    throw error;
  }
};

/**
 * Verify refresh token
 * @param {string} token - JWT refresh token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or blacklisted
 */
const verifyRefreshToken = (token) => {
  // Check blacklist first
  if (tokenBlacklist.has(token)) {
    throw new Error('Refresh token has been revoked');
  }

  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: [ALGORITHM],
    });

    // Verify token type
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Refresh token has expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid refresh token');
    }
    throw error;
  }
};

/**
 * Refresh access token using refresh token
 * @param {string} refreshToken - Valid refresh token
 * @param {Object} userData - Updated user data (optional)
 * @returns {Object} New token pair
 */
const refreshAccessToken = (refreshToken, userData = null) => {
  const decoded = verifyRefreshToken(refreshToken);

  // Prepare payload for new tokens
  const payload = userData || {
    userId: decoded.userId,
    email: decoded.email,
    role: decoded.role,
    permissions: decoded.permissions,
    tokenVersion: decoded.tokenVersion,
  };

  // Generate new access token
  const accessToken = generateAccessToken(payload);

  return {
    accessToken,
    expiresIn: ACCESS_TOKEN_EXPIRY,
  };
};

/**
 * Rotate refresh token (generate new refresh token)
 * @param {string} oldRefreshToken - Current refresh token
 * @param {Object} userData - Updated user data (optional)
 * @returns {Object} New token pair
 */
const rotateRefreshToken = (oldRefreshToken, userData = null) => {
  const decoded = verifyRefreshToken(oldRefreshToken);

  // Blacklist old refresh token
  const ttl = decoded.exp - Math.floor(Date.now() / 1000);
  tokenBlacklist.add(oldRefreshToken, ttl);

  // Increment token version for additional security
  const payload = userData || {
    userId: decoded.userId,
    email: decoded.email,
    role: decoded.role,
    permissions: decoded.permissions,
    tokenVersion: (decoded.tokenVersion || 0) + 1,
  };

  // Generate new token pair
  return generateTokenPair(payload);
};

/**
 * Revoke token (add to blacklist)
 * @param {string} token - Token to revoke
 */
const revokeToken = (token) => {
  try {
    // Decode without verification to get expiry
    const decoded = jwt.decode(token);
    if (decoded && decoded.exp) {
      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        tokenBlacklist.add(token, ttl);
      }
    }
  } catch (error) {
    console.error('Error revoking token:', error);
  }
};

/**
 * Revoke all tokens for a user (requires token version tracking)
 * This should be used with database-backed token version management
 * @param {string} userId - User ID
 */
const revokeAllUserTokens = (userId) => {
  // In production, increment user's token version in database
  // All tokens with old version will be invalid
  console.log(`Revoking all tokens for user: ${userId}`);
  // Implementation depends on your database schema
};

/**
 * Decode token without verification (for inspection)
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded payload or null
 */
const decodeToken = (token) => {
  try {
    return jwt.decode(token, { complete: true });
  } catch (error) {
    return null;
  }
};

/**
 * Get token expiration time
 * @param {string} token - JWT token
 * @returns {Date|null} Expiration date or null
 */
const getTokenExpiration = (token) => {
  const decoded = decodeToken(token);
  if (decoded && decoded.payload.exp) {
    return new Date(decoded.payload.exp * 1000);
  }
  return null;
};

/**
 * Check if token is expired
 * @param {string} token - JWT token
 * @returns {boolean}
 */
const isTokenExpired = (token) => {
  const expiration = getTokenExpiration(token);
  return expiration ? expiration < new Date() : true;
};

/**
 * Cleanup function for graceful shutdown
 */
const cleanup = () => {
  tokenBlacklist.destroy();
};

module.exports = {
  // Token generation
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,

  // Token verification
  verifyAccessToken,
  verifyRefreshToken,

  // Token refresh and rotation
  refreshAccessToken,
  rotateRefreshToken,

  // Token revocation
  revokeToken,
  revokeAllUserTokens,

  // Token utilities
  decodeToken,
  getTokenExpiration,
  isTokenExpired,

  // Blacklist management
  tokenBlacklist,

  // Configuration
  config: {
    accessTokenExpiry: ACCESS_TOKEN_EXPIRY,
    refreshTokenExpiry: REFRESH_TOKEN_EXPIRY,
    rememberMeExpiry: REMEMBER_ME_EXPIRY,
    algorithm: ALGORITHM,
    issuer: ISSUER,
    audience: AUDIENCE,
  },

  // Cleanup
  cleanup,
};
