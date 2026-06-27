/**
 * Authentication Configuration
 * Implements authentication strategies and password policies
 *
 * Dependencies: passport, passport-local, passport-jwt, bcryptjs
 * Usage: Authentication middleware and user verification
 */

const bcrypt = require('bcryptjs');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const { ExtractJwt } = require('passport-jwt');

/**
 * BCrypt configuration
 * Higher salt rounds = more secure but slower
 */
const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;

/**
 * Password policy configuration
 */
const passwordPolicy = {
  minLength: parseInt(process.env.PASSWORD_MIN_LENGTH) || 8,
  maxLength: parseInt(process.env.PASSWORD_MAX_LENGTH) || 128,
  requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false',
  requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE !== 'false',
  requireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS !== 'false',
  requireSpecialChars: process.env.PASSWORD_REQUIRE_SPECIAL !== 'false',
  preventCommonPasswords: process.env.PASSWORD_PREVENT_COMMON !== 'false',
  preventUserInfo: process.env.PASSWORD_PREVENT_USER_INFO !== 'false',
};

/**
 * Common weak passwords to prevent
 */
const commonPasswords = [
  'password',
  'password123',
  '123456',
  '12345678',
  'qwerty',
  'abc123',
  'monkey',
  '1234567',
  'letmein',
  'trustno1',
  'dragon',
  'baseball',
  'iloveyou',
  'master',
  'sunshine',
  'ashley',
  'bailey',
  'passw0rd',
  'shadow',
  '123123',
  '654321',
  'superman',
  'qazwsx',
  'michael',
  'football',
  'welcome',
  'jesus',
  'ninja',
  'mustang',
  'password1',
];

/**
 * Account lockout configuration
 */
const lockoutPolicy = {
  maxAttempts: parseInt(process.env.LOCKOUT_MAX_ATTEMPTS) || 5,
  lockoutDuration: parseInt(process.env.LOCKOUT_DURATION) || 15 * 60 * 1000, // 15 minutes
  resetAfterSuccess: process.env.LOCKOUT_RESET_AFTER_SUCCESS !== 'false',
};

/**
 * Session configuration
 */
const sessionConfig = {
  secret:
    process.env.SESSION_SECRET ||
    (process.env.NODE_ENV === 'production'
      ? (() => {
          throw new Error('SESSION_SECRET is required in production');
        })()
      : 'dev-session-secret'),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,
    maxAge: parseInt(process.env.SESSION_MAX_AGE) || 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict',
  },
  name: 'sessionId', // Don't use default 'connect.sid'
  rolling: true, // Reset maxAge on every response
};

/**
 * MFA (Multi-Factor Authentication) configuration
 */
const mfaConfig = {
  enabled: process.env.MFA_ENABLED === 'true',
  required: process.env.MFA_REQUIRED === 'true',
  issuer: process.env.MFA_ISSUER || 'KitchenXpert',
  window: parseInt(process.env.MFA_WINDOW) || 1, // TOTP time window
  backupCodesCount: parseInt(process.env.MFA_BACKUP_CODES) || 10,
};

/**
 * Validate password against policy
 * @param {string} password - Password to validate
 * @param {Object} userInfo - User information to check against (optional)
 * @returns {Object} Validation result
 */
const validatePassword = (password, userInfo = {}) => {
  const errors = [];

  // Length check
  if (password.length < passwordPolicy.minLength) {
    errors.push(`Password must be at least ${passwordPolicy.minLength} characters long`);
  }
  if (password.length > passwordPolicy.maxLength) {
    errors.push(`Password must not exceed ${passwordPolicy.maxLength} characters`);
  }

  // Uppercase check
  if (passwordPolicy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  // Lowercase check
  if (passwordPolicy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  // Numbers check
  if (passwordPolicy.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // Special characters check
  if (
    passwordPolicy.requireSpecialChars &&
    !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  ) {
    errors.push('Password must contain at least one special character');
  }

  // Common passwords check
  if (passwordPolicy.preventCommonPasswords && commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common. Please choose a stronger password');
  }

  // User info check (prevent password containing username, email, etc.)
  if (passwordPolicy.preventUserInfo && userInfo) {
    const lowerPassword = password.toLowerCase();
    if (userInfo.username && lowerPassword.includes(userInfo.username.toLowerCase())) {
      errors.push('Password must not contain your username');
    }
    if (userInfo.email && lowerPassword.includes(userInfo.email.split('@')[0].toLowerCase())) {
      errors.push('Password must not contain your email address');
    }
    if (userInfo.name && lowerPassword.includes(userInfo.name.toLowerCase())) {
      errors.push('Password must not contain your name');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Hash password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
const hashPassword = async (password) => {
  try {
    const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
    const hash = await bcrypt.hash(password, salt);
    return hash;
  } catch (error) {
    throw new Error('Error hashing password: ' + error.message);
  }
};

/**
 * Compare password with hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} Match result
 */
const comparePassword = async (password, hash) => {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    throw new Error('Error comparing password: ' + error.message);
  }
};

/**
 * Check if password needs rehashing (salt rounds changed)
 * @param {string} hash - Current password hash
 * @returns {boolean}
 */
const needsRehash = (hash) => {
  try {
    const rounds = bcrypt.getRounds(hash);
    return rounds !== BCRYPT_SALT_ROUNDS;
  } catch (error) {
    return true; // Rehash if we can't determine rounds
  }
};

/**
 * Local authentication strategy (email/password)
 * Used for traditional username/password login
 */
const configureLocalStrategy = (getUserByEmail, verifyUser) => {
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'email', // Use email instead of username
        passwordField: 'password',
        passReqToCallback: true,
      },
      async (req, email, password, done) => {
        try {
          // Get user from database
          const user = await getUserByEmail(email);

          if (!user) {
            return done(null, false, { message: 'Invalid email or password' });
          }

          // Check if account is locked
          if (user.lockedUntil && user.lockedUntil > Date.now()) {
            const minutesLeft = Math.ceil((user.lockedUntil - Date.now()) / 60000);
            return done(null, false, {
              message: `Account locked. Try again in ${minutesLeft} minute(s)`,
            });
          }

          // Check if account is active
          if (user.status === 'suspended' || user.status === 'deleted') {
            return done(null, false, { message: 'Account is not active' });
          }

          // Verify password
          const isMatch = await comparePassword(password, user.password);

          if (!isMatch) {
            // Track failed attempts
            if (verifyUser) {
              await verifyUser(user, false);
            }
            return done(null, false, { message: 'Invalid email or password' });
          }

          // Check if email is verified (if required)
          if (user.emailVerified === false && process.env.REQUIRE_EMAIL_VERIFICATION === 'true') {
            return done(null, false, { message: 'Please verify your email first' });
          }

          // Check if MFA is required
          if (mfaConfig.required && !user.mfaEnabled) {
            return done(null, false, { message: 'MFA setup required' });
          }

          // Reset failed attempts on successful login
          if (verifyUser) {
            await verifyUser(user, true);
          }

          // Check if password needs rehashing
          if (needsRehash(user.password)) {
            req.rehashPassword = true;
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );
};

/**
 * JWT authentication strategy
 * Used for API authentication with JWT tokens
 */
const configureJwtStrategy = (getUserById) => {
  if (!process.env.JWT_ACCESS_SECRET) {
    throw new Error('JWT_ACCESS_SECRET environment variable is required. Do not run without it.');
  }

  const jwtOptions = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_ACCESS_SECRET,
    issuer: process.env.JWT_ISSUER || 'kitchenxpert-api',
    audience: process.env.JWT_AUDIENCE || 'kitchenxpert-client',
    algorithms: [process.env.JWT_ALGORITHM || 'HS256'],
  };

  passport.use(
    new JwtStrategy(jwtOptions, async (payload, done) => {
      try {
        // Verify token type
        if (payload.type !== 'access') {
          return done(null, false, { message: 'Invalid token type' });
        }

        // Get user from database
        const user = await getUserById(payload.userId);

        if (!user) {
          return done(null, false, { message: 'User not found' });
        }

        // Check if account is active
        if (user.status === 'suspended' || user.status === 'deleted') {
          return done(null, false, { message: 'Account is not active' });
        }

        // Check token version (for token rotation)
        if (user.tokenVersion !== undefined && payload.tokenVersion !== user.tokenVersion) {
          return done(null, false, { message: 'Token has been revoked' });
        }

        return done(null, user);
      } catch (error) {
        return done(error, false);
      }
    })
  );
};

/**
 * Serialize user for session
 */
const configurePassportSerialization = () => {
  passport.serializeUser((user, done) => {
    done(null, user.userId);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      // This should call your User model's findById method
      // Implementation depends on your database
      done(null, { id }); // Placeholder
    } catch (error) {
      done(error, null);
    }
  });
};

/**
 * Generate password reset token
 * @returns {string} Random token
 */
const generateResetToken = () => {
  return require('crypto').randomBytes(32).toString('hex');
};

/**
 * Generate email verification token
 * @returns {string} Random token
 */
const generateVerificationToken = () => {
  return require('crypto').randomBytes(32).toString('hex');
};

/**
 * Generate MFA backup codes
 * @param {number} count - Number of codes to generate
 * @returns {Array<string>} Backup codes
 */
const generateBackupCodes = (count = mfaConfig.backupCodesCount) => {
  const codes = [];
  for (let i = 0; i < count; i++) {
    codes.push(require('crypto').randomBytes(4).toString('hex').toUpperCase());
  }
  return codes;
};

module.exports = {
  // Passport configuration
  configureLocalStrategy,
  configureJwtStrategy,
  configurePassportSerialization,
  passport,

  // Password utilities
  validatePassword,
  hashPassword,
  comparePassword,
  needsRehash,

  // Token generation
  generateResetToken,
  generateVerificationToken,
  generateBackupCodes,

  // Configuration objects
  passwordPolicy,
  lockoutPolicy,
  sessionConfig,
  mfaConfig,

  // Constants
  BCRYPT_SALT_ROUNDS,
};
