import crypto from 'crypto';

import { type Request, type Response } from 'express';

import { prisma } from '../../database/client';
import { WebhookRepository } from '../../repositories/webhook-repository';
import logger from '../../utils/logger';
import { asyncHandler } from '../middleware/error-middleware';
import { generateWebhookSignature } from '../middleware/webhook-middleware';

const webhookRepository = new WebhookRepository(prisma);

function stripSecret<T extends Record<string, unknown>>(webhook: T): Omit<T, 'secret'> {
  const { secret: _, ...rest } = webhook;
  return rest;
}

/**
 * Verify the calling user has access to this webhook.
 * - Admins can access all webhooks.
 * - Partners can only access webhooks where partnerId matches.
 */
function assertWebhookAccess(req: Request, webhook: { partnerId?: string | null }): boolean {
  const user = req.user;
  if (!user) {return false;}
  if (user.role === 'admin') {return true;}
  // Partner users can only access their own webhooks
  if (webhook.partnerId && req.partnerId === webhook.partnerId) {return true;}
  if (webhook.partnerId && user.userId === webhook.partnerId) {return true;}
  return false;
}

/**
 * Validate URL against SSRF — blocks private/internal addresses
 */
function validateWebhookUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    const blockedExact = new Set([
      'localhost', '127.0.0.1', '0.0.0.0', '::1',
      '169.254.169.254', 'metadata.google.internal',
    ]);

    const blockedPrefixes = [
      '10.', '192.168.',
      // 172.16.0.0 – 172.31.255.255
      ...Array.from({ length: 16 }, (_, i) => `172.${16 + i}.`),
      // IPv4-mapped IPv6
      '::ffff:10.', '::ffff:192.168.', '::ffff:127.',
    ];

    if (blockedExact.has(hostname)) {
      return 'Invalid webhook URL: private/internal addresses are not allowed';
    }
    if (blockedPrefixes.some(p => hostname.startsWith(p))) {
      return 'Invalid webhook URL: private/internal addresses are not allowed';
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return 'Invalid webhook URL: only HTTP and HTTPS are allowed';
    }
    return null;
  } catch {
    return 'Invalid webhook URL format';
  }
}

/**
 * Webhook Controller
 * Handles all webhook-related HTTP requests
 */
export class WebhookController {
  /**
   * GET /webhooks
   * Get all webhooks (admin sees all, partner sees own)
   */
  getAll = asyncHandler(async (req: Request, res: Response) => {
    const { partnerId, isActive, eventType } = req.query;

    // Partners can only see their own webhooks
    const effectivePartnerId = req.user?.role === 'admin'
      ? partnerId as string | undefined
      : req.partnerId || req.user?.userId;

    const webhooks = await webhookRepository.findAll({
      partnerId: effectivePartnerId,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      eventType: eventType as string,
    });
    res.status(200).json({ success: true, data: webhooks.map(stripSecret) });
  });

  /**
   * GET /webhooks/:id
   * Get a webhook by ID
   */
  getById = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const webhook = await webhookRepository.findById(id);
    if (!webhook) {
      res.status(404).json({ success: false, error: 'Webhook not found' });
      return;
    }

    if (!assertWebhookAccess(req, webhook)) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    res.status(200).json({ success: true, data: stripSecret(webhook as unknown as Record<string, unknown>) });
  });

  /**
   * POST /webhooks
   * Create a new webhook
   */
  create = asyncHandler(async (req: Request, res: Response) => {
    const { partnerId, name, url, events, headers, retryCount, timeout } = req.body;

    // Validate URL against SSRF
    if (url) {
      const urlError = validateWebhookUrl(url);
      if (urlError) {
        res.status(400).json({ success: false, error: urlError });
        return;
      }
    }

    // Generate a secret for the webhook
    const secret = crypto.randomBytes(32).toString('hex');

    const webhook = await webhookRepository.create({
      partnerId,
      name,
      url,
      secret,
      events,
      headers,
      retryCount,
      timeout,
    });

    const { secret: _secret, ...safeWebhook } = webhook as any;
    res.status(201).json({ success: true, data: safeWebhook, message: 'Webhook created successfully' });
  });

  /**
   * PUT /webhooks/:id
   * Update a webhook
   */
  update = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { name, url, events, headers, isActive, retryCount, timeout } = req.body;

    // Verify webhook exists before updating
    const existing = await webhookRepository.findById(id);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Webhook not found' });
      return;
    }

    if (!assertWebhookAccess(req, existing)) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    // Validate URL if being changed
    if (url) {
      const urlError = validateWebhookUrl(url);
      if (urlError) {
        res.status(400).json({ success: false, error: urlError });
        return;
      }
    }

    // Note: 'secret' is intentionally excluded — use regenerateSecret endpoint instead
    const webhook = await webhookRepository.update(id, {
      name,
      url,
      events,
      headers,
      isActive,
      retryCount,
      timeout,
    });

    res.status(200).json({ success: true, data: stripSecret(webhook as Record<string, unknown>), message: 'Webhook updated successfully' });
  });

  /**
   * DELETE /webhooks/:id
   * Delete a webhook
   */
  delete = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;

    const existing = await webhookRepository.findById(id);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Webhook not found' });
      return;
    }

    if (!assertWebhookAccess(req, existing)) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    await webhookRepository.delete(id);
    res.status(200).json({ success: true, message: 'Webhook deleted successfully' });
  });

  /**
   * POST /webhooks/:id/toggle
   * Toggle webhook active status
   */
  toggle = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;

    const existing = await webhookRepository.findById(id);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Webhook not found' });
      return;
    }

    if (!assertWebhookAccess(req, existing)) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    const webhook = await webhookRepository.toggle(id);
    res.status(200).json({
      success: true,
      data: stripSecret(webhook as Record<string, unknown>),
      message: `Webhook ${webhook.isActive ? 'activated' : 'deactivated'} successfully`,
    });
  });

  /**
   * GET /webhooks/:id/events
   * Get events for a webhook
   */
  getEvents = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { limit = 50 } = req.query;

    const existing = await webhookRepository.findById(id);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Webhook not found' });
      return;
    }

    if (!assertWebhookAccess(req, existing)) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    const events = await webhookRepository.getEvents(id, Number(limit));
    res.status(200).json({ success: true, data: events });
  });

  /**
   * GET /webhooks/:id/stats
   * Get statistics for a webhook
   */
  getStats = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { days = 30 } = req.query;

    const existing = await webhookRepository.findById(id);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Webhook not found' });
      return;
    }

    if (!assertWebhookAccess(req, existing)) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    const stats = await webhookRepository.getEventStats(id, Number(days));
    res.status(200).json({ success: true, data: stats });
  });

  /**
   * GET /webhooks/:id/delivery-rate
   * Get delivery rate for a webhook
   */
  getDeliveryRate = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;

    const existing = await webhookRepository.findById(id);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Webhook not found' });
      return;
    }

    if (!assertWebhookAccess(req, existing)) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    const rate = await webhookRepository.getDeliveryRate(id);
    res.status(200).json({ success: true, data: { deliveryRate: rate } });
  });

  /**
   * POST /webhooks/:id/test
   * Actually send a test webhook to the endpoint and report the result
   */
  test = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const webhook = await webhookRepository.findById(id);

    if (!webhook) {
      res.status(404).json({ success: false, error: 'Webhook not found' });
      return;
    }

    if (!assertWebhookAccess(req, webhook)) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    // Build test payload
    const testPayload = {
      type: 'test',
      timestamp: new Date().toISOString(),
      data: { message: 'This is a test webhook delivery from KitchenXpert' },
    };

    // Generate signature and send actual HTTP request
    const { signature, timestamp } = generateWebhookSignature(testPayload, webhook.secret);

    const timeoutMs = webhook.timeout || 30000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Timestamp': timestamp,
          'X-Webhook-ID': id,
          'X-Webhook-Event': 'test',
          'User-Agent': 'KitchenXpert-Webhooks/1.0',
          ...(webhook.headers as Record<string, string> || {}),
        },
        body: JSON.stringify(testPayload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const responseBody = await response.text();
      const isSuccess = response.status >= 200 && response.status < 300;

      // Record the event
      const event = await webhookRepository.createEvent({
        webhookId: id,
        eventType: 'test' as any,
        payload: testPayload,
        statusCode: response.status,
        response: responseBody ? { body: responseBody.substring(0, 2000) } as any : undefined,
      });

      res.status(200).json({
        success: isSuccess,
        data: {
          event,
          statusCode: response.status,
          responseBody: responseBody?.substring(0, 500),
        },
        message: isSuccess
          ? 'Test webhook delivered successfully'
          : `Test webhook received HTTP ${response.status}`,
      });
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      const err = error instanceof Error ? error : new Error(String(error));

      // Record the failed event
      const event = await webhookRepository.createEvent({
        webhookId: id,
        eventType: 'test' as any,
        payload: testPayload,
        error: err.message,
      });

      logger.error(`[Webhook] Test delivery failed for ${webhook.url}`, { error: err.message });

      res.status(200).json({
        success: false,
        data: { event },
        error: err.message,
        message: `Test webhook failed: ${err.message}`,
      });
    }
  });

  /**
   * POST /webhooks/:id/regenerate-secret
   * Regenerate webhook secret
   */
  regenerateSecret = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;

    const existing = await webhookRepository.findById(id);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Webhook not found' });
      return;
    }

    if (!assertWebhookAccess(req, existing)) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    const newSecret = crypto.randomBytes(32).toString('hex');
    await webhookRepository.update(id, { secret: newSecret });

    res.status(200).json({
      success: true,
      data: { secret: newSecret },
      message: 'Webhook secret regenerated successfully. Store it securely — it will not be shown again.',
    });
  });

  /**
   * GET /webhooks/failed
   * Get failed webhook events (for retry queue)
   */
  getFailedEvents = asyncHandler(async (req: Request, res: Response) => {
    const { maxAttempts = 3 } = req.query;
    const events = await webhookRepository.getFailedEvents(Number(maxAttempts));
    res.status(200).json({ success: true, data: events });
  });

  /**
   * DELETE /webhooks/events/cleanup
   * Clean up old webhook events
   */
  cleanupEvents = asyncHandler(async (req: Request, res: Response) => {
    const { olderThanDays = 30 } = req.body;
    const date = new Date();
    date.setDate(date.getDate() - Number(olderThanDays));

    const result = await webhookRepository.deleteOldEvents(date);
    res.status(200).json({ success: true, data: result, message: `Deleted ${result.count} old events` });
  });
}

export const webhookController = new WebhookController();
export default webhookController;
