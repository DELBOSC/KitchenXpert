/**
 * Encryption Utilities
 * Provides utility functions for encryption and decryption.
 * Note: For production use, consider using established libraries like crypto-js or Web Crypto API.
 */

/**
 * Encryption algorithm options.
 */
export type EncryptionAlgorithm = 'AES-GCM' | 'AES-CBC';

/**
 * Encryption options.
 */
export interface EncryptionOptions {
  algorithm?: EncryptionAlgorithm;
  keyLength?: 128 | 192 | 256;
}

/**
 * Encrypted data structure.
 */
export interface EncryptedData {
  ciphertext: string;
  iv: string;
  salt?: string;
  algorithm: EncryptionAlgorithm;
}

/**
 * Converts a string to an ArrayBuffer.
 * @param str - The string to convert
 * @returns The ArrayBuffer
 */
function stringToArrayBuffer(str: string): ArrayBuffer {
  const encoder = new TextEncoder();
  return encoder.encode(str).buffer;
}

/**
 * Converts an ArrayBuffer to a string.
 * @param buffer - The ArrayBuffer to convert
 * @returns The string
 */
function arrayBufferToString(buffer: ArrayBuffer): string {
  const decoder = new TextDecoder();
  return decoder.decode(buffer);
}

/**
 * Converts an ArrayBuffer to a base64 string.
 * @param buffer - The ArrayBuffer to convert
 * @returns The base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

/**
 * Converts a base64 string to an ArrayBuffer.
 * @param base64 - The base64 string to convert
 * @returns The ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Derives a cryptographic key from a password.
 * @param password - The password
 * @param salt - The salt
 * @param options - Encryption options
 * @returns A promise that resolves to the derived key
 */
async function deriveKey(
  password: string,
  salt: Uint8Array,
  options: EncryptionOptions = {}
): Promise<CryptoKey> {
  const { algorithm = 'AES-GCM', keyLength = 256 } = options;

  const passwordKey = await crypto.subtle.importKey(
    'raw',
    stringToArrayBuffer(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: algorithm, length: keyLength },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts plaintext using a password.
 * @param plaintext - The text to encrypt
 * @param password - The password
 * @param options - Encryption options
 * @returns A promise that resolves to the encrypted data
 */
export async function encrypt(
  plaintext: string,
  password: string,
  options: EncryptionOptions = {}
): Promise<EncryptedData> {
  const { algorithm = 'AES-GCM' } = options;

  // Generate random salt and IV
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(algorithm === 'AES-GCM' ? 12 : 16));

  // Derive key from password
  const key = await deriveKey(password, salt, options);

  // Encrypt the plaintext
  const plaintextBuffer = stringToArrayBuffer(plaintext);
  const ciphertextBuffer = await crypto.subtle.encrypt(
    algorithm === 'AES-GCM' ? { name: 'AES-GCM', iv } : { name: 'AES-CBC', iv },
    key,
    plaintextBuffer
  );

  return {
    ciphertext: arrayBufferToBase64(ciphertextBuffer),
    iv: arrayBufferToBase64(iv.buffer),
    salt: arrayBufferToBase64(salt.buffer),
    algorithm,
  };
}

/**
 * Decrypts encrypted data using a password.
 * @param encryptedData - The encrypted data
 * @param password - The password
 * @returns A promise that resolves to the decrypted plaintext
 */
export async function decrypt(encryptedData: EncryptedData, password: string): Promise<string> {
  const { ciphertext, iv, salt, algorithm } = encryptedData;

  if (!salt) {
    throw new Error('Salt is required for decryption');
  }

  // Convert base64 to ArrayBuffer
  const saltBuffer = new Uint8Array(base64ToArrayBuffer(salt));
  const ivBuffer = new Uint8Array(base64ToArrayBuffer(iv));
  const ciphertextBuffer = base64ToArrayBuffer(ciphertext);

  // Derive key from password
  const key = await deriveKey(password, saltBuffer, { algorithm });

  // Decrypt the ciphertext
  const plaintextBuffer = await crypto.subtle.decrypt(
    algorithm === 'AES-GCM' ? { name: 'AES-GCM', iv: ivBuffer } : { name: 'AES-CBC', iv: ivBuffer },
    key,
    ciphertextBuffer
  );

  return arrayBufferToString(plaintextBuffer);
}

/**
 * Encrypts plaintext and returns a single encoded string.
 * @param plaintext - The text to encrypt
 * @param password - The password
 * @param options - Encryption options
 * @returns A promise that resolves to the encrypted string
 */
export async function encryptToString(
  plaintext: string,
  password: string,
  options: EncryptionOptions = {}
): Promise<string> {
  const encryptedData = await encrypt(plaintext, password, options);
  return btoa(JSON.stringify(encryptedData));
}

/**
 * Decrypts an encrypted string.
 * @param encryptedString - The encrypted string
 * @param password - The password
 * @returns A promise that resolves to the decrypted plaintext
 */
export async function decryptFromString(
  encryptedString: string,
  password: string
): Promise<string> {
  const encryptedData = JSON.parse(atob(encryptedString)) as EncryptedData;
  return decrypt(encryptedData, password);
}

/**
 * Generates a random encryption key.
 * @param length - The key length in bits (128, 192, or 256)
 * @returns A promise that resolves to the generated key
 */
export async function generateKey(length: 128 | 192 | 256 = 256): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length }, true, ['encrypt', 'decrypt']);
}

/**
 * Exports a CryptoKey to a base64 string.
 * @param key - The key to export
 * @returns A promise that resolves to the base64-encoded key
 */
export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('raw', key);
  return arrayBufferToBase64(exported);
}

/**
 * Imports a base64-encoded key.
 * @param keyString - The base64-encoded key
 * @param algorithm - The algorithm to use
 * @returns A promise that resolves to the imported key
 */
export async function importKey(
  keyString: string,
  algorithm: EncryptionAlgorithm = 'AES-GCM'
): Promise<CryptoKey> {
  const keyBuffer = base64ToArrayBuffer(keyString);
  return crypto.subtle.importKey('raw', keyBuffer, { name: algorithm }, true, [
    'encrypt',
    'decrypt',
  ]);
}

/**
 * Encrypts plaintext using a CryptoKey directly.
 * @param plaintext - The text to encrypt
 * @param key - The encryption key
 * @param algorithm - The algorithm to use
 * @returns A promise that resolves to the encrypted data
 */
export async function encryptWithKey(
  plaintext: string,
  key: CryptoKey,
  algorithm: EncryptionAlgorithm = 'AES-GCM'
): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(algorithm === 'AES-GCM' ? 12 : 16));
  const plaintextBuffer = stringToArrayBuffer(plaintext);

  const ciphertextBuffer = await crypto.subtle.encrypt(
    algorithm === 'AES-GCM' ? { name: 'AES-GCM', iv } : { name: 'AES-CBC', iv },
    key,
    plaintextBuffer
  );

  return {
    ciphertext: arrayBufferToBase64(ciphertextBuffer),
    iv: arrayBufferToBase64(iv.buffer),
  };
}

/**
 * Decrypts ciphertext using a CryptoKey directly.
 * @param ciphertext - The base64-encoded ciphertext
 * @param iv - The base64-encoded IV
 * @param key - The decryption key
 * @param algorithm - The algorithm to use
 * @returns A promise that resolves to the decrypted plaintext
 */
export async function decryptWithKey(
  ciphertext: string,
  iv: string,
  key: CryptoKey,
  algorithm: EncryptionAlgorithm = 'AES-GCM'
): Promise<string> {
  const ivBuffer = new Uint8Array(base64ToArrayBuffer(iv));
  const ciphertextBuffer = base64ToArrayBuffer(ciphertext);

  const plaintextBuffer = await crypto.subtle.decrypt(
    algorithm === 'AES-GCM' ? { name: 'AES-GCM', iv: ivBuffer } : { name: 'AES-CBC', iv: ivBuffer },
    key,
    ciphertextBuffer
  );

  return arrayBufferToString(plaintextBuffer);
}

/**
 * Checks if the Web Crypto API is available.
 * @returns True if Web Crypto API is available
 */
export function isWebCryptoAvailable(): boolean {
  return (
    typeof crypto !== 'undefined' &&
    typeof crypto.subtle !== 'undefined' &&
    typeof crypto.getRandomValues !== 'undefined'
  );
}
