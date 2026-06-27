/**
 * Webhook Signature Validator for KitchenXpert
 *
 * Purpose:
 * - HMAC signature verification for webhook security
 * - Timestamp validation to prevent replay attacks
 * - Payload integrity checking
 * - Secret rotation support
 *
 * Usage:
 * - Verify webhook: validateWebhook(req.body, req.headers, secret)
 * - Generate signature: generateSignature(payload, secret)
 */

import crypto from 'crypto';
import { SECURITY_CONFIG } from './webhook-config';

/**
 * Generate HMAC signature for payload
 * Signs "${timestamp}.${payloadJSON}" for replay-attack protection.
 * If timestamp is omitted, generates a fresh one.
 */
export const generateSignature = (payload, secret, timestamp) => {
  const ts = timestamp || Date.now().toString();
  const hmac = crypto.createHmac(SECURITY_CONFIG.signatureAlgorithm, secret);
  const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
  hmac.update(`${ts}.${payloadString}`);
  return { signature: `sha256=${hmac.digest('hex')}`, timestamp: ts };
};

/**
 * Verify webhook signature
 */
export const verifySignature = (payload, signature, secret, timestamp) => {
  if (!timestamp) {
    throw new Error('Timestamp is required for signature verification');
  }
  const { signature: expectedSignature } = generateSignature(payload, secret, timestamp);
  // Accept both "sha256=<hex>" and raw "<hex>" formats
  const normalizedSignature = signature.startsWith('sha256=') ? signature : `sha256=${signature}`;
  return crypto.timingSafeEqual(Buffer.from(normalizedSignature), Buffer.from(expectedSignature));
};

/**
 * Validate timestamp (prevent replay attacks)
 */
export const validateTimestamp = (timestamp) => {
  const now = Date.now();
  const webhookTime = new Date(timestamp).getTime();
  const age = now - webhookTime;
  return age >= 0 && age <= SECURITY_CONFIG.maxTimestampAge;
};

/**
 * Main webhook validation function
 */
export const validateWebhook = (payload, headers, secrets) => {
  const signature = headers[SECURITY_CONFIG.signatureHeader.toLowerCase()];
  const timestamp = headers[SECURITY_CONFIG.timestampHeader.toLowerCase()];

  if (!signature) {
    throw new Error('Missing signature header');
  }

  if (!timestamp) {
    throw new Error('Missing timestamp header');
  }

  if (!validateTimestamp(timestamp)) {
    throw new Error('Timestamp too old or invalid');
  }

  // Support multiple secrets for rotation
  const secretArray = Array.isArray(secrets) ? secrets : [secrets];
  const isValid = secretArray.some((secret) => {
    try {
      return verifySignature(payload, signature, secret, timestamp);
    } catch {
      return false;
    }
  });

  if (!isValid) {
    throw new Error('Invalid signature');
  }

  return true;
};

/**
 * Extract webhook metadata from headers
 */
export const extractWebhookMetadata = (headers) => {
  return {
    event: headers[SECURITY_CONFIG.eventHeader.toLowerCase()],
    deliveryId: headers[SECURITY_CONFIG.deliveryIdHeader.toLowerCase()],
    timestamp: headers[SECURITY_CONFIG.timestampHeader.toLowerCase()],
    version: headers[SECURITY_CONFIG.versionHeader.toLowerCase()],
  };
};

export default {
  generateSignature,
  verifySignature,
  validateTimestamp,
  validateWebhook,
  extractWebhookMetadata,
};
