/**
 * Hashing Utilities
 * Provides utility functions for generating hashes.
 */

/**
 * Supported hash algorithms.
 */
export type HashAlgorithm = 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512';

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
 * Converts an ArrayBuffer to a hexadecimal string.
 * @param buffer - The ArrayBuffer to convert
 * @returns The hexadecimal string
 */
function arrayBufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
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
 * Generates a hash of a string using the Web Crypto API.
 * @param data - The data to hash
 * @param algorithm - The hash algorithm (default: SHA-256)
 * @returns A promise that resolves to the hash as a hex string
 */
export async function hash(data: string, algorithm: HashAlgorithm = 'SHA-256'): Promise<string> {
  const buffer = stringToArrayBuffer(data);
  const hashBuffer = await crypto.subtle.digest(algorithm, buffer);
  return arrayBufferToHex(hashBuffer);
}

/**
 * Generates a SHA-256 hash of a string.
 * @param data - The data to hash
 * @returns A promise that resolves to the hash as a hex string
 */
export async function sha256(data: string): Promise<string> {
  return hash(data, 'SHA-256');
}

/**
 * Generates a SHA-512 hash of a string.
 * @param data - The data to hash
 * @returns A promise that resolves to the hash as a hex string
 */
export async function sha512(data: string): Promise<string> {
  return hash(data, 'SHA-512');
}

/**
 * Generates a SHA-1 hash of a string.
 * Note: SHA-1 is considered cryptographically weak.
 * @param data - The data to hash
 * @returns A promise that resolves to the hash as a hex string
 */
export async function sha1(data: string): Promise<string> {
  return hash(data, 'SHA-1');
}

/**
 * Generates a hash and returns it as base64.
 * @param data - The data to hash
 * @param algorithm - The hash algorithm (default: SHA-256)
 * @returns A promise that resolves to the hash as a base64 string
 */
export async function hashBase64(
  data: string,
  algorithm: HashAlgorithm = 'SHA-256'
): Promise<string> {
  const buffer = stringToArrayBuffer(data);
  const hashBuffer = await crypto.subtle.digest(algorithm, buffer);
  return arrayBufferToBase64(hashBuffer);
}

/**
 * Generates an HMAC hash.
 * @param data - The data to hash
 * @param key - The secret key
 * @param algorithm - The hash algorithm (default: SHA-256)
 * @returns A promise that resolves to the HMAC as a hex string
 */
export async function hmac(
  data: string,
  key: string,
  algorithm: HashAlgorithm = 'SHA-256'
): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    stringToArrayBuffer(key),
    { name: 'HMAC', hash: algorithm },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, stringToArrayBuffer(data));

  return arrayBufferToHex(signature);
}

/**
 * Generates an HMAC-SHA256 hash.
 * @param data - The data to hash
 * @param key - The secret key
 * @returns A promise that resolves to the HMAC as a hex string
 */
export async function hmacSha256(data: string, key: string): Promise<string> {
  return hmac(data, key, 'SHA-256');
}

/**
 * Verifies that a hash matches the expected value.
 * @param data - The data to verify
 * @param expectedHash - The expected hash
 * @param algorithm - The hash algorithm (default: SHA-256)
 * @returns A promise that resolves to true if the hashes match
 */
export async function verifyHash(
  data: string,
  expectedHash: string,
  algorithm: HashAlgorithm = 'SHA-256'
): Promise<boolean> {
  const computedHash = await hash(data, algorithm);
  return constantTimeCompare(computedHash, expectedHash);
}

/**
 * Compares two strings in constant time to prevent timing attacks.
 * @param a - The first string
 * @param b - The second string
 * @returns True if the strings are equal
 */
export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Generates a hash of a file.
 * @param file - The file to hash
 * @param algorithm - The hash algorithm (default: SHA-256)
 * @returns A promise that resolves to the hash as a hex string
 */
export async function hashFile(file: File, algorithm: HashAlgorithm = 'SHA-256'): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest(algorithm, buffer);
  return arrayBufferToHex(hashBuffer);
}

/**
 * Generates a hash of an ArrayBuffer.
 * @param buffer - The buffer to hash
 * @param algorithm - The hash algorithm (default: SHA-256)
 * @returns A promise that resolves to the hash as a hex string
 */
export async function hashBuffer(
  buffer: ArrayBuffer,
  algorithm: HashAlgorithm = 'SHA-256'
): Promise<string> {
  const hashBuffer = await crypto.subtle.digest(algorithm, buffer);
  return arrayBufferToHex(hashBuffer);
}

/**
 * Simple non-cryptographic hash function (DJB2).
 * Fast but NOT suitable for security purposes.
 * @param str - The string to hash
 * @returns A 32-bit hash number
 */
export function djb2Hash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return hash >>> 0; // Convert to unsigned 32-bit integer
}

/**
 * Simple non-cryptographic hash function (FNV-1a).
 * Fast but NOT suitable for security purposes.
 * @param str - The string to hash
 * @returns A 32-bit hash number
 */
export function fnv1aHash(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }
  return hash;
}

/**
 * Generates a simple hash string for use as a cache key or identifier.
 * NOT suitable for security purposes.
 * @param str - The string to hash
 * @returns A hash string
 */
export function simpleHash(str: string): string {
  return djb2Hash(str).toString(36);
}

/**
 * Generates a content hash for a string (for caching/comparison).
 * @param content - The content to hash
 * @returns A promise that resolves to a short hash string
 */
export async function contentHash(content: string): Promise<string> {
  const fullHash = await sha256(content);
  return fullHash.slice(0, 16); // Return first 16 characters
}

/**
 * Generates a checksum for data integrity verification.
 * @param data - The data to checksum
 * @returns A promise that resolves to the checksum
 */
export async function checksum(data: string): Promise<string> {
  return sha256(data);
}

/**
 * Verifies a checksum.
 * @param data - The data to verify
 * @param expectedChecksum - The expected checksum
 * @returns A promise that resolves to true if the checksum is valid
 */
export async function verifyChecksum(data: string, expectedChecksum: string): Promise<boolean> {
  const computedChecksum = await checksum(data);
  return constantTimeCompare(computedChecksum, expectedChecksum);
}

/**
 * @deprecated Use bcrypt or Argon2 instead. SHA-256 is not suitable for password hashing
 * as it lacks key stretching and is vulnerable to brute-force attacks.
 * @param password - The password to hash
 * @param salt - Optional salt (auto-generated if not provided)
 * @returns A promise that resolves to the hashed password with salt
 */
export async function hashPassword(
  password: string,
  salt?: string
): Promise<{ hash: string; salt: string }> {
  const usedSalt = salt ?? generateSalt();
  const saltedPassword = usedSalt + password;
  const hashedPassword = await sha256(saltedPassword);
  return { hash: hashedPassword, salt: usedSalt };
}

/**
 * Verifies a password against a hash.
 * @param password - The password to verify
 * @param hash - The expected hash
 * @param salt - The salt used during hashing
 * @returns A promise that resolves to true if the password is correct
 */
export async function verifyPassword(
  password: string,
  hash: string,
  salt: string
): Promise<boolean> {
  const { hash: computedHash } = await hashPassword(password, salt);
  return constantTimeCompare(computedHash, hash);
}

/**
 * Generates a random salt.
 * @param length - The length of the salt (default: 32)
 * @returns A random salt string
 */
export function generateSalt(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return arrayBufferToHex(array.buffer);
}
