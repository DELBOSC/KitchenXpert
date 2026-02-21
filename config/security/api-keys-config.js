/**
 * API Keys Configuration
 * API key generation, validation, and management
 *
 * Dependencies: crypto (built-in)
 * Usage: API authentication and authorization
 */

const crypto = require('crypto');

/**
 * API Key configuration
 */
const apiKeyConfig = {
  prefix: process.env.API_KEY_PREFIX || 'kx', // KitchenXpert prefix
  keyLength: parseInt(process.env.API_KEY_LENGTH) || 32,
  hashAlgorithm: 'sha256',
  defaultRateLimit: parseInt(process.env.API_KEY_RATE_LIMIT) || 1000, // requests per hour
  expirationDays: parseInt(process.env.API_KEY_EXPIRATION_DAYS) || 365, // 1 year
  allowRotation: process.env.API_KEY_ALLOW_ROTATION !== 'false'
};

/**
 * API Key scopes/permissions
 * Define what each API key can access
 */
const apiScopes = {
  // Read-only access
  READ: {
    name: 'read',
    description: 'Read-only access to public resources',
    permissions: ['read:public', 'read:recipes', 'read:ingredients']
  },

  // Write access
  WRITE: {
    name: 'write',
    description: 'Create and update resources',
    permissions: ['read:public', 'write:recipes', 'write:ingredients', 'write:reviews']
  },

  // Full access
  FULL: {
    name: 'full',
    description: 'Full access to all resources',
    permissions: ['read:*', 'write:*', 'delete:*']
  },

  // Admin access
  ADMIN: {
    name: 'admin',
    description: 'Administrative access',
    permissions: ['admin:*', 'read:*', 'write:*', 'delete:*']
  },

  // Analytics access
  ANALYTICS: {
    name: 'analytics',
    description: 'Access to analytics and reporting',
    permissions: ['read:analytics', 'read:statistics', 'read:reports']
  },

  // Webhook access
  WEBHOOK: {
    name: 'webhook',
    description: 'Webhook event access',
    permissions: ['webhook:send', 'webhook:receive']
  }
};

/**
 * Rate limit tiers
 * Different rate limits based on API key tier
 */
const rateLimitTiers = {
  FREE: {
    name: 'free',
    requestsPerHour: 100,
    requestsPerDay: 1000,
    requestsPerMonth: 10000,
    concurrentRequests: 5
  },

  BASIC: {
    name: 'basic',
    requestsPerHour: 1000,
    requestsPerDay: 10000,
    requestsPerMonth: 100000,
    concurrentRequests: 10
  },

  PRO: {
    name: 'pro',
    requestsPerHour: 5000,
    requestsPerDay: 50000,
    requestsPerMonth: 500000,
    concurrentRequests: 25
  },

  ENTERPRISE: {
    name: 'enterprise',
    requestsPerHour: -1, // Unlimited
    requestsPerDay: -1,
    requestsPerMonth: -1,
    concurrentRequests: -1
  }
};

/**
 * Generate API key
 * Format: prefix_publicKey_checksum
 * @param {Object} options - Generation options
 * @returns {Object} { key, hash, metadata }
 */
const generateApiKey = (options = {}) => {
  const {
    userId,
    name = 'Unnamed API Key',
    scopes = [apiScopes.READ.name],
    tier = 'FREE',
    expiresInDays = apiKeyConfig.expirationDays,
    metadata = {}
  } = options;

  // Generate random bytes
  const randomBytes = crypto.randomBytes(apiKeyConfig.keyLength);
  const publicKey = randomBytes.toString('hex');

  // Generate checksum (first 8 chars of hash)
  const checksum = crypto
    .createHash(apiKeyConfig.hashAlgorithm)
    .update(publicKey)
    .digest('hex')
    .substring(0, 8);

  // Format: kx_abc123...xyz_checksum
  const apiKey = `${apiKeyConfig.prefix}_${publicKey}_${checksum}`;

  // Hash for storage (never store plain API key)
  const hash = crypto
    .createHash(apiKeyConfig.hashAlgorithm)
    .update(apiKey)
    .digest('hex');

  // Calculate expiration
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  return {
    key: apiKey,
    hash: hash,
    metadata: {
      userId,
      name,
      scopes: Array.isArray(scopes) ? scopes : [scopes],
      tier,
      createdAt: new Date(),
      expiresAt: expiresInDays > 0 ? expiresAt : null,
      lastUsedAt: null,
      requestCount: 0,
      rateLimit: rateLimitTiers[tier] || rateLimitTiers.FREE,
      ...metadata
    }
  };
};

/**
 * Validate API key format
 * @param {string} apiKey - API key to validate
 * @returns {boolean}
 */
const validateApiKeyFormat = (apiKey) => {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }

  // Check format: prefix_key_checksum
  const parts = apiKey.split('_');
  if (parts.length !== 3) {
    return false;
  }

  const [prefix, publicKey, providedChecksum] = parts;

  // Validate prefix
  if (prefix !== apiKeyConfig.prefix) {
    return false;
  }

  // Validate key length
  if (publicKey.length !== apiKeyConfig.keyLength * 2) {
    return false;
  }

  // Validate checksum
  const expectedChecksum = crypto
    .createHash(apiKeyConfig.hashAlgorithm)
    .update(publicKey)
    .digest('hex')
    .substring(0, 8);

  if (providedChecksum !== expectedChecksum) {
    return false;
  }

  return true;
};

/**
 * Hash API key for storage
 * @param {string} apiKey - API key to hash
 * @returns {string} Hash
 */
const hashApiKey = (apiKey) => {
  return crypto
    .createHash(apiKeyConfig.hashAlgorithm)
    .update(apiKey)
    .digest('hex');
};

/**
 * Verify API key permissions
 * @param {Object} keyMetadata - API key metadata from database
 * @param {string} requiredPermission - Required permission
 * @returns {boolean}
 */
const hasPermission = (keyMetadata, requiredPermission) => {
  if (!keyMetadata || !keyMetadata.scopes) {
    return false;
  }

  // Get all permissions for the key's scopes
  const permissions = new Set();
  keyMetadata.scopes.forEach(scopeName => {
    const scope = Object.values(apiScopes).find(s => s.name === scopeName);
    if (scope) {
      scope.permissions.forEach(p => permissions.add(p));
    }
  });

  // Check wildcard permissions
  if (permissions.has('admin:*') || permissions.has('*')) {
    return true;
  }

  // Check exact permission
  if (permissions.has(requiredPermission)) {
    return true;
  }

  // Check wildcard for resource type
  const [action, resource] = requiredPermission.split(':');
  if (permissions.has(`${action}:*`)) {
    return true;
  }

  return false;
};

/**
 * Check if API key is expired
 * @param {Object} keyMetadata - API key metadata
 * @returns {boolean}
 */
const isExpired = (keyMetadata) => {
  if (!keyMetadata.expiresAt) {
    return false; // No expiration
  }

  return new Date() > new Date(keyMetadata.expiresAt);
};

/**
 * Check rate limit
 * @param {Object} keyMetadata - API key metadata
 * @param {string} period - Period to check (hour, day, month)
 * @returns {Object} { allowed, remaining, resetAt }
 */
const checkRateLimit = (keyMetadata, period = 'hour') => {
  const tier = keyMetadata.rateLimit || rateLimitTiers.FREE;
  const limitKey = `requestsPer${period.charAt(0).toUpperCase() + period.slice(1)}`;
  const limit = tier[limitKey];

  // Unlimited
  if (limit === -1) {
    return { allowed: true, remaining: -1, resetAt: null };
  }

  // Calculate current usage (would need to query usage tracking)
  // This is a simplified example
  const currentUsage = keyMetadata[`${period}Usage`] || 0;
  const remaining = Math.max(0, limit - currentUsage);

  // Calculate reset time
  const now = new Date();
  let resetAt = new Date(now);

  if (period === 'hour') {
    resetAt.setHours(now.getHours() + 1, 0, 0, 0);
  } else if (period === 'day') {
    resetAt.setDate(now.getDate() + 1);
    resetAt.setHours(0, 0, 0, 0);
  } else if (period === 'month') {
    resetAt.setMonth(now.getMonth() + 1, 1);
    resetAt.setHours(0, 0, 0, 0);
  }

  return {
    allowed: remaining > 0,
    remaining,
    limit,
    resetAt
  };
};

/**
 * Rotate API key (generate new key, invalidate old)
 * @param {Object} oldKeyMetadata - Current key metadata
 * @returns {Object} New API key
 */
const rotateApiKey = (oldKeyMetadata) => {
  if (!apiKeyConfig.allowRotation) {
    throw new Error('API key rotation is disabled');
  }

  // Generate new key with same settings
  return generateApiKey({
    userId: oldKeyMetadata.userId,
    name: oldKeyMetadata.name,
    scopes: oldKeyMetadata.scopes,
    tier: oldKeyMetadata.tier,
    metadata: {
      ...oldKeyMetadata,
      rotatedFrom: oldKeyMetadata.hash,
      rotatedAt: new Date()
    }
  });
};

/**
 * Redact API key for logging/display
 * Shows only prefix and last 4 characters
 * @param {string} apiKey - API key to redact
 * @returns {string} Redacted key
 */
const redactApiKey = (apiKey) => {
  if (!apiKey || typeof apiKey !== 'string') {
    return 'invalid';
  }

  const parts = apiKey.split('_');
  if (parts.length !== 3) {
    return 'invalid';
  }

  const [prefix, publicKey, checksum] = parts;
  const lastFour = publicKey.slice(-4);

  return `${prefix}_${'*'.repeat(publicKey.length - 4)}${lastFour}_${checksum}`;
};

/**
 * Express middleware for API key authentication
 * @param {Object} options - Middleware options
 * @returns {Function} Express middleware
 */
const apiKeyAuthMiddleware = (options = {}) => {
  const {
    headerName = 'X-API-Key',
    queryParam = 'api_key',
    required = true,
    getKeyFromDatabase = null // Function to retrieve key metadata
  } = options;

  return async (req, res, next) => {
    try {
      // Extract API key from header or query parameter
      const apiKey = req.headers[headerName.toLowerCase()] || req.query[queryParam];

      if (!apiKey) {
        if (required) {
          return res.status(401).json({
            success: false,
            error: 'API key required',
            message: `Please provide an API key in the ${headerName} header or ${queryParam} query parameter`
          });
        }
        return next();
      }

      // Validate format
      if (!validateApiKeyFormat(apiKey)) {
        return res.status(401).json({
          success: false,
          error: 'Invalid API key format'
        });
      }

      // Hash and retrieve from database
      const hash = hashApiKey(apiKey);
      const keyMetadata = getKeyFromDatabase
        ? await getKeyFromDatabase(hash)
        : null;

      if (!keyMetadata) {
        return res.status(401).json({
          success: false,
          error: 'Invalid API key'
        });
      }

      // Check expiration
      if (isExpired(keyMetadata)) {
        return res.status(401).json({
          success: false,
          error: 'API key has expired'
        });
      }

      // Check rate limit
      const rateLimit = checkRateLimit(keyMetadata);
      if (!rateLimit.allowed) {
        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          resetAt: rateLimit.resetAt
        });
      }

      // Attach to request
      req.apiKey = {
        hash,
        metadata: keyMetadata,
        rateLimit
      };

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', rateLimit.limit);
      res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);
      if (rateLimit.resetAt) {
        res.setHeader('X-RateLimit-Reset', rateLimit.resetAt.toISOString());
      }

      next();
    } catch (error) {
      console.error('API key authentication error:', error);
      res.status(500).json({
        success: false,
        error: 'Authentication error'
      });
    }
  };
};

/**
 * Permission check middleware
 * @param {string|Array<string>} requiredPermissions - Required permission(s)
 * @returns {Function} Express middleware
 */
const requirePermission = (requiredPermissions) => {
  const permissions = Array.isArray(requiredPermissions)
    ? requiredPermissions
    : [requiredPermissions];

  return (req, res, next) => {
    if (!req.apiKey || !req.apiKey.metadata) {
      return res.status(401).json({
        success: false,
        error: 'API key required'
      });
    }

    const hasAllPermissions = permissions.every(permission =>
      hasPermission(req.apiKey.metadata, permission)
    );

    if (!hasAllPermissions) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        required: permissions
      });
    }

    next();
  };
};

module.exports = {
  // API key generation and management
  generateApiKey,
  rotateApiKey,
  redactApiKey,

  // Validation
  validateApiKeyFormat,
  hashApiKey,
  isExpired,

  // Permissions
  hasPermission,
  requirePermission,

  // Rate limiting
  checkRateLimit,

  // Middleware
  apiKeyAuthMiddleware,

  // Configuration
  apiKeyConfig,
  apiScopes,
  rateLimitTiers
};
