import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../database/client';
import { Prisma, WebhookEventType } from '@prisma/client';
import crypto from 'crypto';
import logger from '../../utils/logger';

interface WebhookRequest extends Request {
  webhookPayload?: unknown;
  webhookSignature?: string;
  webhookTimestamp?: string;
  partnerId?: string;
}

/**
 * Webhook Middleware
 * Handles webhook signature verification, payload processing, and outbound delivery with retry
 */

// Signature verification tolerance (5 minutes)
const TIMESTAMP_TOLERANCE = 5 * 60 * 1000;

// ==================== RETRY CONFIGURATION ====================

const RETRY_CONFIG = {
  maxRetries: 5,
  initialDelayMs: 1000,
  maxDelayMs: 60000,
  backoffMultiplier: 2,
  jitter: 0.2,
  /** HTTP status codes that justify a retry */
  retryableStatusCodes: new Set([408, 429, 500, 502, 503, 504]),
  /** Network error codes that justify a retry */
  retryableErrorCodes: new Set([
    'ECONNREFUSED',
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'EHOSTUNREACH',
    'UND_ERR_CONNECT_TIMEOUT',
  ]),
};

/**
 * Calculate retry delay with exponential backoff + jitter
 */
function calculateRetryDelay(attempt: number): number {
  const baseDelay = RETRY_CONFIG.initialDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1);
  const cappedDelay = Math.min(baseDelay, RETRY_CONFIG.maxDelayMs);
  const jitter = cappedDelay * RETRY_CONFIG.jitter * Math.random();
  return Math.floor(cappedDelay + jitter);
}

/**
 * Check whether a failed delivery should be retried
 */
function isRetryable(statusCode?: number, error?: Error): boolean {
  if (statusCode !== undefined) {
    return RETRY_CONFIG.retryableStatusCodes.has(statusCode);
  }
  if (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code && RETRY_CONFIG.retryableErrorCodes.has(code)) return true;
    if (error.name === 'AbortError' || error.name === 'TimeoutError') return true;
    if (error.message?.includes('ECONNREFUSED') || error.message?.includes('timeout')) return true;
  }
  return false;
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ==================== SIGNATURE ====================

/**
 * Generate HMAC-SHA256 signature in the canonical format:
 *   message = `${unixTimestamp}.${payloadJSON}`
 *   signature = `sha256=` + hex(HMAC-SHA256(secret, message))
 */
export function generateWebhookSignature(payload: unknown, secret: string): { signature: string; timestamp: string } {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const signature = `sha256=${crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${payloadString}`)
    .digest('hex')}`;
  return { signature, timestamp };
}

/**
 * Verify webhook signature (for inbound webhooks)
 */
function verifySignature(
  payload: string,
  signature: string,
  secret: string,
  timestamp: string
): boolean {
  const rawHex = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`)
    .digest('hex');

  // Accept both `sha256=<hex>` and raw `<hex>` formats
  const expectedVariants = [`sha256=${rawHex}`, rawHex];

  try {
    return expectedVariants.some(expected =>
      crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    );
  } catch {
    return false;
  }
}

/**
 * Verify webhook timestamp is recent
 */
function verifyTimestamp(timestamp: string): boolean {
  const webhookTime = parseInt(timestamp, 10) * 1000;
  const now = Date.now();
  return Math.abs(now - webhookTime) <= TIMESTAMP_TOLERANCE;
}

// ==================== INBOUND VERIFICATION MIDDLEWARE ====================

/**
 * Verify incoming webhook request
 */
export function verifyWebhook(options?: { secretHeader?: string; signatureHeader?: string; timestampHeader?: string }) {
  const secretHeader = options?.secretHeader || 'X-Webhook-Secret';
  const signatureHeader = options?.signatureHeader || 'X-Webhook-Signature';
  const timestampHeader = options?.timestampHeader || 'X-Webhook-Timestamp';

  return async (req: WebhookRequest, res: Response, next: NextFunction): Promise<void> => {
    const signature = req.get(signatureHeader);
    const timestamp = req.get(timestampHeader);
    const secret = req.get(secretHeader);

    if (!signature || !timestamp) {
      res.status(401).json({
        success: false,
        error: 'Missing webhook signature or timestamp',
      });
      return;
    }

    // Verify timestamp
    if (!verifyTimestamp(timestamp)) {
      res.status(401).json({
        success: false,
        error: 'Webhook timestamp expired',
      });
      return;
    }

    // Get raw body for signature verification
    const rawBody = JSON.stringify(req.body);

    // If secret provided in header, use it directly
    if (secret) {
      if (!verifySignature(rawBody, signature, secret, timestamp)) {
        res.status(401).json({
          success: false,
          error: 'Invalid webhook signature',
        });
        return;
      }
    }

    req.webhookPayload = req.body;
    req.webhookSignature = signature;
    req.webhookTimestamp = timestamp;

    next();
  };
}

/**
 * Verify partner webhook
 */
export function verifyPartnerWebhook() {
  return async (req: WebhookRequest, res: Response, next: NextFunction): Promise<void> => {
    const apiKey = req.get('X-API-Key');
    const signature = req.get('X-Webhook-Signature');
    const timestamp = req.get('X-Webhook-Timestamp');

    if (!apiKey || !signature || !timestamp) {
      res.status(401).json({
        success: false,
        error: 'Missing API key, signature, or timestamp',
      });
      return;
    }

    // Verify timestamp
    if (!verifyTimestamp(timestamp)) {
      res.status(401).json({
        success: false,
        error: 'Webhook timestamp expired',
      });
      return;
    }

    try {
      // Find partner by API key
      const partner = await prisma.partner.findUnique({
        where: { apiKey },
      });

      if (!partner || !partner.isActive) {
        res.status(401).json({
          success: false,
          error: 'Invalid or inactive partner',
        });
        return;
      }

      // Verify signature using partner's API secret
      const rawBody = JSON.stringify(req.body);
      if (!verifySignature(rawBody, signature, partner.apiSecret, timestamp)) {
        res.status(401).json({
          success: false,
          error: 'Invalid webhook signature',
        });
        return;
      }

      req.partnerId = partner.id;
      req.webhookPayload = req.body;

      next();
    } catch (_error) {
      res.status(500).json({
        success: false,
        error: 'Failed to verify webhook',
      });
    }
  };
}

/**
 * Log incoming webhook
 */
export function logWebhook() {
  return async (req: WebhookRequest, _res: Response, next: NextFunction): Promise<void> => {
    _res.on('finish', async () => {
      try {
        await prisma.webhookEvent.create({
          data: {
            webhookId: req.params.webhookId || 'incoming',
            eventType: req.body?.type || 'project_created',
            payload: req.body,
            statusCode: _res.statusCode,
            attempts: 1,
            deliveredAt: _res.statusCode >= 200 && _res.statusCode < 300 ? new Date() : null,
            failedAt: _res.statusCode >= 400 ? new Date() : null,
          },
        });
      } catch (error) {
        logger.error('Failed to log webhook', { error });
      }
    });

    next();
  };
}

// ==================== OUTBOUND DELIVERY WITH EXPONENTIAL RETRY ====================

/**
 * Attempt a single HTTP delivery to a webhook endpoint
 */
async function attemptDelivery(
  url: string,
  payloadString: string,
  headers: Record<string, string>,
  timeoutMs: number
): Promise<{ status: number; body?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: payloadString,
      signal: controller.signal,
    });
    const body = await response.text();
    return { status: response.status, body };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Send webhook with exponential backoff retry
 *
 * Retry policy:
 * - Up to 5 retries (configurable per-webhook via retryCount)
 * - Exponential backoff: 1s → 2s → 4s → 8s → 16s (capped at 60s)
 * - 20% jitter to prevent thundering herd
 * - Only retries on retryable errors (5xx, 408, 429, network errors)
 * - 4xx client errors (except 408/429) are NOT retried
 */
export async function sendWebhook(
  webhookId: string,
  eventType: string,
  payload: unknown
): Promise<{ success: boolean; statusCode?: number; error?: string; attempts: number }> {
  const webhook = await prisma.webhook.findUnique({
    where: { id: webhookId },
  });

  if (!webhook || !webhook.isActive) {
    return { success: false, error: 'Webhook not found or inactive', attempts: 0 };
  }

  // Check if webhook is subscribed to this event type
  const events = webhook.events as string[];
  if (!events.includes(eventType) && !events.includes('*')) {
    return { success: false, error: 'Webhook not subscribed to this event', attempts: 0 };
  }

  const maxRetries = Math.min(webhook.retryCount ?? RETRY_CONFIG.maxRetries, 10);
  const maxAttempts = maxRetries + 1; // first attempt + retries
  const timeoutMs = webhook.timeout || 30000;
  const payloadString = JSON.stringify(payload);

  let lastStatusCode: number | undefined;
  let lastError: string | undefined;
  let eventRecordId: string | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Wait before retry (not before the first attempt)
    if (attempt > 1) {
      const delay = calculateRetryDelay(attempt - 1);
      logger.info(`[Webhook] Retry ${attempt - 1}/${maxRetries} for ${webhook.url} in ${delay}ms`, {
        webhookId,
        eventType,
        attempt,
      });
      await sleep(delay);
    }

    // Generate fresh signature for each attempt (timestamp changes)
    const { signature, timestamp } = generateWebhookSignature(payload, webhook.secret);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signature,
      'X-Webhook-Timestamp': timestamp,
      'X-Webhook-ID': webhookId,
      'X-Webhook-Event': eventType,
      'User-Agent': 'KitchenXpert-Webhooks/1.0',
      ...(webhook.headers as Record<string, string> || {}),
    };

    try {
      const response = await attemptDelivery(webhook.url, payloadString, headers, timeoutMs);
      lastStatusCode = response.status;
      const isSuccess = response.status >= 200 && response.status < 300;

      if (isSuccess) {
        // Record successful delivery
        if (eventRecordId) {
          await prisma.webhookEvent.update({
            where: { id: eventRecordId },
            data: {
              statusCode: response.status,
              response: response.body ? { body: response.body.substring(0, 2000) } : undefined,
              attempts: attempt,
              deliveredAt: new Date(),
              failedAt: null,
              error: null,
            },
          });
        } else {
          await prisma.webhookEvent.create({
            data: {
              webhookId,
              eventType: eventType as WebhookEventType,
              payload: payload as Prisma.InputJsonValue,
              statusCode: response.status,
              attempts: attempt,
              deliveredAt: new Date(),
            },
          });
        }

        logger.info(`[Webhook] Delivered to ${webhook.url}`, {
          webhookId,
          eventType,
          statusCode: response.status,
          attempt,
        });

        return { success: true, statusCode: response.status, attempts: attempt };
      }

      // Non-success status code
      lastError = `HTTP ${response.status}`;

      // Record/update the event as failing
      eventRecordId = await upsertEventRecord(eventRecordId, {
        webhookId,
        eventType,
        payload,
        statusCode: response.status,
        attempt,
        error: lastError,
        response: response.body ? { body: response.body.substring(0, 2000) } : undefined,
      });

      // Don't retry non-retryable status codes (4xx except 408, 429)
      if (!isRetryable(response.status)) {
        logger.warn(`[Webhook] Non-retryable status ${response.status} from ${webhook.url}`, {
          webhookId,
          eventType,
        });
        break;
      }
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      lastError = err.message;

      // Record/update the event as failing
      eventRecordId = await upsertEventRecord(eventRecordId, {
        webhookId,
        eventType,
        payload,
        attempt,
        error: lastError,
      });

      // Don't retry non-retryable network errors
      if (!isRetryable(undefined, err)) {
        logger.warn(`[Webhook] Non-retryable error from ${webhook.url}: ${err.message}`, {
          webhookId,
          eventType,
        });
        break;
      }

      logger.error(`[Webhook] Attempt ${attempt} failed for ${webhook.url}: ${err.message}`, {
        webhookId,
        eventType,
      });
    }
  }

  // All attempts exhausted or non-retryable error
  // Mark the event as definitively failed
  if (eventRecordId) {
    await prisma.webhookEvent.update({
      where: { id: eventRecordId },
      data: { failedAt: new Date() },
    });
  }

  // Check if we should suspend the webhook (>80% failure over last 10 deliveries)
  await checkSuspension(webhookId);

  logger.error(`[Webhook] All attempts exhausted for ${webhook.url}`, {
    webhookId,
    eventType,
    lastStatusCode,
    lastError,
  });

  return { success: false, statusCode: lastStatusCode, error: lastError, attempts: maxRetries + 1 };
}

/**
 * Create or update the webhook event record during delivery attempts
 */
async function upsertEventRecord(
  existingId: string | undefined,
  data: {
    webhookId: string;
    eventType: string;
    payload: unknown;
    statusCode?: number;
    attempt: number;
    error?: string;
    response?: Record<string, unknown>;
  }
): Promise<string> {
  if (existingId) {
    await prisma.webhookEvent.update({
      where: { id: existingId },
      data: {
        statusCode: data.statusCode,
        attempts: data.attempt,
        error: data.error,
        response: (data.response as Prisma.InputJsonValue | undefined) ?? undefined,
      },
    });
    return existingId;
  }

  const record = await prisma.webhookEvent.create({
    data: {
      webhookId: data.webhookId,
      eventType: data.eventType as WebhookEventType,
      payload: data.payload as Prisma.InputJsonValue,
      statusCode: data.statusCode,
      attempts: data.attempt,
      error: data.error,
      response: (data.response as Prisma.InputJsonValue | undefined) ?? undefined,
      failedAt: new Date(),
    },
  });

  return record.id;
}

/**
 * Check if a webhook should be auto-suspended due to repeated failures
 * Threshold: >80% failure rate over the last 10 deliveries
 */
async function checkSuspension(webhookId: string): Promise<void> {
  try {
    const recentEvents = await prisma.webhookEvent.findMany({
      where: { webhookId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { deliveredAt: true, failedAt: true },
    });

    if (recentEvents.length < 5) return;

    const failedCount = recentEvents.filter(e => e.failedAt !== null && e.deliveredAt === null).length;
    const failureRate = failedCount / recentEvents.length;

    if (failureRate > 0.8) {
      await prisma.webhook.update({
        where: { id: webhookId },
        data: { isActive: false },
      });

      logger.warn(`[Webhook] Auto-suspended webhook ${webhookId} due to ${(failureRate * 100).toFixed(0)}% failure rate`);
    }
  } catch (error) {
    logger.error(`[Webhook] Failed to check suspension for ${webhookId}`, { error });
  }
}

/**
 * Trigger webhooks for an event (dispatches to all matching active webhooks)
 */
export async function triggerWebhooks(
  eventType: string,
  payload: unknown,
  partnerId?: string
): Promise<{ sent: number; failed: number }> {
  try {
    const webhooks = await prisma.webhook.findMany({
      where: {
        isActive: true,
        ...(partnerId && { partnerId }),
        OR: [
          { events: { has: eventType as WebhookEventType } },
        ],
      },
    });

    let sent = 0;
    let failed = 0;

    // Dispatch in parallel (each webhook has its own retry loop)
    const results = await Promise.allSettled(
      webhooks.map(webhook => sendWebhook(webhook.id, eventType, payload))
    );

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.success) {
        sent++;
      } else {
        failed++;
      }
    }

    return { sent, failed };
  } catch (error) {
    logger.error('Failed to trigger webhooks', { error });
    return { sent: 0, failed: 0 };
  }
}

export default {
  verifyWebhook,
  verifyPartnerWebhook,
  logWebhook,
  sendWebhook,
  triggerWebhooks,
  generateWebhookSignature,
};
