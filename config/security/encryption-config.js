/**
 * Encryption Configuration
 * Encryption at rest for sensitive data using AES-256-GCM
 *
 * Dependencies: crypto (built-in Node.js module)
 * Usage: Field-level encryption for sensitive database fields
 */

const crypto = require('crypto');

/**
 * Encryption algorithm
 * AES-256-GCM provides encryption + authentication
 */
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 64;

/**
 * Get encryption key from environment
 * Should be a 32-byte (64 hex characters) random string
 */
const getEncryptionKey = () => {
  const key = process.env.ENCRYPTION_KEY;

  if (!key && process.env.NODE_ENV === 'production') {
    throw new Error('ENCRYPTION_KEY must be set in production environment');
  }

  if (!key) {
    console.warn('ENCRYPTION_KEY not set, generating random key (NOT SECURE FOR PRODUCTION)');
    return crypto.randomBytes(KEY_LENGTH);
  }

  // Convert hex string to buffer
  if (key.length !== KEY_LENGTH * 2) {
    throw new Error(`ENCRYPTION_KEY must be ${KEY_LENGTH * 2} hex characters (${KEY_LENGTH} bytes)`);
  }

  return Buffer.from(key, 'hex');
};

const ENCRYPTION_KEY = getEncryptionKey();

/**
 * Key rotation configuration
 * Supports multiple keys for key rotation
 */
const keyRotationConfig = {
  enabled: process.env.KEY_ROTATION_ENABLED === 'true',
  currentKeyId: process.env.CURRENT_KEY_ID || 'key_1',
  keys: {}
};

// Load encryption keys (current and old keys for rotation)
keyRotationConfig.keys[keyRotationConfig.currentKeyId] = ENCRYPTION_KEY;

// Load old keys for decryption of old data
if (process.env.OLD_ENCRYPTION_KEYS) {
  try {
    const oldKeys = JSON.parse(process.env.OLD_ENCRYPTION_KEYS);
    Object.entries(oldKeys).forEach(([keyId, keyHex]) => {
      keyRotationConfig.keys[keyId] = Buffer.from(keyHex, 'hex');
    });
  } catch (error) {
    console.error('Error loading old encryption keys:', error);
  }
}

/**
 * Encrypt data using AES-256-GCM
 * @param {string|Object} data - Data to encrypt
 * @param {string} keyId - Key ID for key rotation (optional)
 * @returns {string} Encrypted data (base64 encoded)
 */
const encrypt = (data, keyId = null) => {
  try {
    // Convert object to string if necessary
    const plaintext = typeof data === 'string' ? data : JSON.stringify(data);

    // Use current key if no keyId specified
    const activeKeyId = keyId || keyRotationConfig.currentKeyId;
    const key = keyRotationConfig.keys[activeKeyId];

    if (!key) {
      throw new Error(`Encryption key not found: ${activeKeyId}`);
    }

    // Generate random IV (initialization vector)
    const iv = crypto.randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Encrypt data
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    // Combine: keyId:iv:authTag:encrypted
    const result = {
      keyId: activeKeyId,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      data: encrypted
    };

    return Buffer.from(JSON.stringify(result)).toString('base64');
  } catch (error) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
};

/**
 * Decrypt data using AES-256-GCM
 * @param {string} encryptedData - Encrypted data (base64 encoded)
 * @returns {string|Object} Decrypted data
 */
const decrypt = (encryptedData) => {
  try {
    // Parse encrypted data
    const decoded = JSON.parse(Buffer.from(encryptedData, 'base64').toString('utf8'));
    const { keyId, iv, authTag, data } = decoded;

    // Get decryption key
    const key = keyRotationConfig.keys[keyId];
    if (!key) {
      throw new Error(`Decryption key not found: ${keyId}`);
    }

    // Convert from base64
    const ivBuffer = Buffer.from(iv, 'base64');
    const authTagBuffer = Buffer.from(authTag, 'base64');

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, ivBuffer);
    decipher.setAuthTag(authTagBuffer);

    // Decrypt data
    let decrypted = decipher.update(data, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    // Try to parse as JSON, return string if fails
    try {
      return JSON.parse(decrypted);
    } catch {
      return decrypted;
    }
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
};

/**
 * Re-encrypt data with new key (for key rotation)
 * @param {string} encryptedData - Data encrypted with old key
 * @param {string} newKeyId - New key ID
 * @returns {string} Data encrypted with new key
 */
const reencrypt = (encryptedData, newKeyId = null) => {
  const decrypted = decrypt(encryptedData);
  return encrypt(decrypted, newKeyId);
};

/**
 * Hash data using SHA-256 (one-way)
 * Used for data that needs to be searchable but not reversible
 * @param {string} data - Data to hash
 * @returns {string} Hash (hex encoded)
 */
const hash = (data) => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * Hash data with HMAC (keyed hash)
 * More secure than plain SHA-256
 * @param {string} data - Data to hash
 * @param {string} key - Secret key (optional, uses encryption key if not provided)
 * @returns {string} HMAC hash (hex encoded)
 */
const hmac = (data, key = null) => {
  const secretKey = key || ENCRYPTION_KEY;
  return crypto.createHmac('sha256', secretKey).update(data).digest('hex');
};

/**
 * Derive key from password using PBKDF2
 * Used for key derivation from user passwords
 * @param {string} password - Password
 * @param {string} salt - Salt (optional, generates random if not provided)
 * @param {number} iterations - Number of iterations (default: 100000)
 * @returns {Object} { key, salt }
 */
const deriveKey = (password, salt = null, iterations = 100000) => {
  const saltBuffer = salt ? Buffer.from(salt, 'hex') : crypto.randomBytes(SALT_LENGTH);
  const key = crypto.pbkdf2Sync(password, saltBuffer, iterations, KEY_LENGTH, 'sha256');

  return {
    key: key.toString('hex'),
    salt: saltBuffer.toString('hex')
  };
};

/**
 * Generate random encryption key
 * @returns {string} Random key (hex encoded)
 */
const generateKey = () => {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
};

/**
 * Generate random token
 * @param {number} length - Token length in bytes (default: 32)
 * @returns {string} Random token (hex encoded)
 */
const generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Field-level encryption helpers
 * Encrypt/decrypt specific database fields
 */
const fieldEncryption = {
  /**
   * Encrypt multiple fields in an object
   * @param {Object} obj - Object with fields to encrypt
   * @param {Array<string>} fields - Field names to encrypt
   * @returns {Object} Object with encrypted fields
   */
  encryptFields: (obj, fields) => {
    const result = { ...obj };
    fields.forEach(field => {
      if (result[field] !== undefined && result[field] !== null) {
        result[field] = encrypt(result[field]);
      }
    });
    return result;
  },

  /**
   * Decrypt multiple fields in an object
   * @param {Object} obj - Object with encrypted fields
   * @param {Array<string>} fields - Field names to decrypt
   * @returns {Object} Object with decrypted fields
   */
  decryptFields: (obj, fields) => {
    const result = { ...obj };
    fields.forEach(field => {
      if (result[field] !== undefined && result[field] !== null) {
        try {
          result[field] = decrypt(result[field]);
        } catch (error) {
          console.error(`Error decrypting field ${field}:`, error.message);
        }
      }
    });
    return result;
  },

  /**
   * Create encrypted searchable hash
   * Encrypts the value and creates a hash for searching
   * @param {string} value - Value to encrypt and hash
   * @returns {Object} { encrypted, hash }
   */
  encryptAndHash: (value) => {
    return {
      encrypted: encrypt(value),
      hash: hmac(value.toLowerCase()) // Case-insensitive search
    };
  }
};

/**
 * Sensitive fields configuration
 * Define which fields should be encrypted in your models
 */
const sensitiveFields = {
  user: ['ssn', 'taxId', 'creditCard', 'bankAccount'],
  payment: ['cardNumber', 'cvv', 'accountNumber'],
  medical: ['diagnosis', 'prescription', 'medicalHistory'],
  personal: ['address', 'phone', 'dateOfBirth']
};

/**
 * Mongoose plugin for automatic field encryption
 * @param {Object} schema - Mongoose schema
 * @param {Object} options - Plugin options
 */
const encryptionPlugin = (schema, options = {}) => {
  const encryptedFields = options.fields || [];

  // Pre-save hook to encrypt fields
  schema.pre('save', function(next) {
    encryptedFields.forEach(field => {
      if (this[field] && this.isModified(field)) {
        this[field] = encrypt(this[field]);
      }
    });
    next();
  });

  // Post-find hook to decrypt fields
  schema.post('find', function(docs) {
    docs.forEach(doc => {
      encryptedFields.forEach(field => {
        if (doc[field]) {
          try {
            doc[field] = decrypt(doc[field]);
          } catch (error) {
            console.error(`Error decrypting field ${field}:`, error.message);
          }
        }
      });
    });
  });

  // Post-findOne hook
  schema.post('findOne', function(doc) {
    if (doc) {
      encryptedFields.forEach(field => {
        if (doc[field]) {
          try {
            doc[field] = decrypt(doc[field]);
          } catch (error) {
            console.error(`Error decrypting field ${field}:`, error.message);
          }
        }
      });
    }
  });
};

/**
 * Validate encryption key format
 * @param {string} key - Key to validate
 * @returns {boolean}
 */
const validateKey = (key) => {
  if (!key) return false;
  if (typeof key !== 'string') return false;
  if (key.length !== KEY_LENGTH * 2) return false;
  if (!/^[0-9a-f]+$/i.test(key)) return false;
  return true;
};

module.exports = {
  // Encryption/Decryption
  encrypt,
  decrypt,
  reencrypt,

  // Hashing
  hash,
  hmac,
  deriveKey,

  // Key management
  generateKey,
  generateToken,
  validateKey,

  // Field-level encryption
  fieldEncryption,
  encryptionPlugin,
  sensitiveFields,

  // Configuration
  keyRotationConfig,

  // Constants
  ALGORITHM,
  KEY_LENGTH,
  IV_LENGTH,
  AUTH_TAG_LENGTH
};
