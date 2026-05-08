import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.DATA_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('[CRYPTO] DATA_ENCRYPTION_KEY environment variable is required for encrypting sensitive data');
  }
  // Key must be 32 bytes for AES-256
  return crypto.scryptSync(key, 'kitchenxpert-salt', 32);
}

/**
 * Encrypt a plaintext string using AES-256-GCM
 * Returns base64-encoded string: iv:authTag:ciphertext
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypt an AES-256-GCM encrypted string
 * Input format: iv:authTag:ciphertext (all base64)
 */
export function decrypt(encryptedData: string): string {
  const key = getEncryptionKey();
  const parts = encryptedData.split(':');

  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
    throw new Error('Invalid encrypted data format');
  }

  const ivStr: string = parts[0];
  const authTagStr: string = parts[1];
  const ciphertext: string = parts[2];

  const iv = Buffer.from(ivStr, 'base64');
  const authTag = Buffer.from(authTagStr, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = decipher.update(ciphertext, 'base64', 'utf8') + decipher.final('utf8');

  return decrypted;
}

/**
 * Check if a string looks like it's already encrypted (has the iv:tag:cipher format)
 */
export function isEncrypted(value: string): boolean {
  const parts = value.split(':');
  if (parts.length !== 3 || !parts[0] || !parts[1]) {return false;}
  try {
    Buffer.from(parts[0], 'base64');
    Buffer.from(parts[1], 'base64');
    return true;
  } catch {
    return false;
  }
}
