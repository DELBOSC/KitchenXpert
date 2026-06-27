/**
 * Token Generation and Validation Utilities
 * Provides utility functions for generating and validating tokens.
 */

import { sha256, hmacSha256, constantTimeCompare } from './hash';

/**
 * Token payload structure.
 */
export interface TokenPayload {
  [key: string]: unknown;
  iat?: number; // Issued at
  exp?: number; // Expiration time
  nbf?: number; // Not before
  sub?: string; // Subject
  iss?: string; // Issuer
  aud?: string; // Audience
}

/**
 * Token options.
 */
export interface TokenOptions {
  expiresIn?: number; // Expiration time in seconds
  notBefore?: number; // Not valid before (seconds from now)
  subject?: string;
  issuer?: string;
  audience?: string;
}

/**
 * Decoded token structure.
 */
export interface DecodedToken {
  payload: TokenPayload;
  isValid: boolean;
  isExpired: boolean;
  error?: string;
}

/**
 * Base64URL encodes a string.
 * @param str - The string to encode
 * @returns The base64URL-encoded string
 */
function base64UrlEncode(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Base64URL decodes a string.
 * @param str - The string to decode
 * @returns The decoded string
 */
function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = str.length % 4;
  if (pad) {
    str += '='.repeat(4 - pad);
  }
  return atob(str);
}

/**
 * Generates a random token string.
 * @param length - The length of the token (default: 32)
 * @returns A random token string
 */
export function generateRandomToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generates a URL-safe random token.
 * @param length - The length of the token (default: 32)
 * @returns A URL-safe random token string
 */
export function generateUrlSafeToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return base64UrlEncode(String.fromCharCode(...array)).slice(0, length);
}

/**
 * Generates a simple JWT-like token.
 * Note: This is a simplified implementation. For production, use a proper JWT library.
 * @param payload - The token payload
 * @param secret - The signing secret
 * @param options - Token options
 * @returns A promise that resolves to the token string
 */
export async function createToken(
  payload: TokenPayload,
  secret: string,
  options: TokenOptions = {}
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const tokenPayload: TokenPayload = {
    ...payload,
    iat: now,
  };

  if (options.expiresIn) {
    tokenPayload.exp = now + options.expiresIn;
  }

  if (options.notBefore) {
    tokenPayload.nbf = now + options.notBefore;
  }

  if (options.subject) {
    tokenPayload.sub = options.subject;
  }

  if (options.issuer) {
    tokenPayload.iss = options.issuer;
  }

  if (options.audience) {
    tokenPayload.aud = options.audience;
  }

  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payloadStr = base64UrlEncode(JSON.stringify(tokenPayload));
  const signature = await hmacSha256(`${header}.${payloadStr}`, secret);

  return `${header}.${payloadStr}.${base64UrlEncode(signature)}`;
}

/**
 * Verifies and decodes a token.
 * @param token - The token to verify
 * @param secret - The signing secret
 * @returns A promise that resolves to the decoded token
 */
export async function verifyToken(token: string, secret: string): Promise<DecodedToken> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return {
        payload: {},
        isValid: false,
        isExpired: false,
        error: 'Invalid token format',
      };
    }

    const header = parts[0]!;
    const payloadStr = parts[1]!;
    const signature = parts[2]!;

    // Verify signature
    const expectedSignature = await hmacSha256(`${header}.${payloadStr}`, secret);
    const isValidSignature = constantTimeCompare(base64UrlDecode(signature), expectedSignature);

    if (!isValidSignature) {
      return {
        payload: {},
        isValid: false,
        isExpired: false,
        error: 'Invalid signature',
      };
    }

    // Decode payload
    const payload = JSON.parse(base64UrlDecode(payloadStr)) as TokenPayload;
    const now = Math.floor(Date.now() / 1000);

    // Check expiration
    if (payload.exp && payload.exp < now) {
      return {
        payload,
        isValid: false,
        isExpired: true,
        error: 'Token has expired',
      };
    }

    // Check not before
    if (payload.nbf && payload.nbf > now) {
      return {
        payload,
        isValid: false,
        isExpired: false,
        error: 'Token is not yet valid',
      };
    }

    return {
      payload,
      isValid: true,
      isExpired: false,
    };
  } catch (error) {
    return {
      payload: {},
      isValid: false,
      isExpired: false,
      error: error instanceof Error ? error.message : 'Token verification failed',
    };
  }
}

/**
 * Decodes a token without verification.
 * @param token - The token to decode
 * @returns The decoded payload or null if invalid
 */
export function decodeToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    return JSON.parse(base64UrlDecode(parts[1]!)) as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Checks if a token is expired.
 * @param token - The token to check
 * @returns True if the token is expired
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeToken(token);
  if (!payload || !payload.exp) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  return payload.exp < now;
}

/**
 * Gets the expiration time of a token.
 * @param token - The token
 * @returns The expiration date or null if not set
 */
export function getTokenExpiration(token: string): Date | null {
  const payload = decodeToken(token);
  if (!payload || !payload.exp) {
    return null;
  }

  return new Date(payload.exp * 1000);
}

/**
 * Generates an API key.
 * @param prefix - Optional prefix for the key
 * @returns An API key string
 */
export function generateApiKey(prefix: string = 'sk'): string {
  const randomPart = generateRandomToken(32);
  return `${prefix}_${randomPart}`;
}

/**
 * Validates an API key format.
 * @param apiKey - The API key to validate
 * @param expectedPrefix - The expected prefix
 * @returns True if the API key format is valid
 */
export function validateApiKeyFormat(apiKey: string, expectedPrefix: string = 'sk'): boolean {
  const pattern = new RegExp(`^${expectedPrefix}_[a-f0-9]{64}$`);
  return pattern.test(apiKey);
}

/**
 * Generates a refresh token.
 * @returns A refresh token string
 */
export function generateRefreshToken(): string {
  return generateRandomToken(64);
}

/**
 * Generates a verification token (e.g., for email verification).
 * @returns A verification token string
 */
export function generateVerificationToken(): string {
  return generateRandomToken(32);
}

/**
 * Generates a password reset token.
 * @returns A password reset token string
 */
export function generatePasswordResetToken(): string {
  return generateRandomToken(32);
}

/**
 * Creates a signed URL token.
 * @param url - The URL to sign
 * @param secret - The signing secret
 * @param expiresIn - Expiration time in seconds
 * @returns A promise that resolves to the signed URL
 */
export async function createSignedUrl(
  url: string,
  secret: string,
  expiresIn: number
): Promise<string> {
  const expires = Math.floor(Date.now() / 1000) + expiresIn;
  const dataToSign = `${url}${expires}`;
  const signature = await hmacSha256(dataToSign, secret);

  const urlObj = new URL(url);
  urlObj.searchParams.set('expires', expires.toString());
  urlObj.searchParams.set('signature', signature);

  return urlObj.toString();
}

/**
 * Verifies a signed URL.
 * @param signedUrl - The signed URL
 * @param secret - The signing secret
 * @returns A promise that resolves to true if the URL is valid
 */
export async function verifySignedUrl(signedUrl: string, secret: string): Promise<boolean> {
  try {
    const urlObj = new URL(signedUrl);
    const expires = urlObj.searchParams.get('expires');
    const signature = urlObj.searchParams.get('signature');

    if (!expires || !signature) {
      return false;
    }

    // Check expiration
    const expiresNum = parseInt(expires, 10);
    if (expiresNum < Math.floor(Date.now() / 1000)) {
      return false;
    }

    // Remove signature from URL for verification
    urlObj.searchParams.delete('expires');
    urlObj.searchParams.delete('signature');
    const originalUrl = urlObj.toString();

    // Verify signature
    const expectedSignature = await hmacSha256(`${originalUrl}${expires}`, secret);
    return constantTimeCompare(signature, expectedSignature);
  } catch {
    return false;
  }
}

/**
 * Generates a CSRF token.
 * @returns A CSRF token string
 */
export function generateCsrfToken(): string {
  return generateRandomToken(32);
}

/**
 * Hashes a token for secure storage.
 * @param token - The token to hash
 * @returns A promise that resolves to the hashed token
 */
export async function hashToken(token: string): Promise<string> {
  return sha256(token);
}

/**
 * Verifies a token against its hash.
 * @param token - The token to verify
 * @param hash - The expected hash
 * @returns A promise that resolves to true if the token matches
 */
export async function verifyTokenHash(token: string, hash: string): Promise<boolean> {
  const computedHash = await sha256(token);
  return constantTimeCompare(computedHash, hash);
}
