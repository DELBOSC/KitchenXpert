/**
 * Webhook Event Emission Service
 * Emits webhook events to all subscribed partners/endpoints.
 * Uses the existing Prisma Webhook and WebhookEvent models.
 */

import * as crypto from 'crypto';

import { type WebhookEventType } from '@prisma/client';

import { prisma } from '../database/client';
import logger from '../utils/logger';

export interface WebhookPayload {
  event: WebhookEventType;
  timestamp: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export class WebhookEventService {
  /**
   * Emit a webhook event to all subscribed active webhooks.
   * This is fire-and-forget: errors are logged but do not propagate.
   */
  static async emit(
    event: WebhookEventType,
    data: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      // Find all active webhooks subscribed to this event type
      const webhooks = await prisma.webhook.findMany({
        where: {
          isActive: true,
          events: { has: event },
        },
        include: {
          partner: {
            select: { id: true, name: true, isActive: true },
          },
        },
      });

      // Filter to only webhooks whose partner (if any) is active
      const activeWebhooks = webhooks.filter((w) => !w.partner || w.partner.isActive);

      if (activeWebhooks.length === 0) {
        return;
      }

      const payload: WebhookPayload = {
        event,
        timestamp: new Date().toISOString(),
        data,
        metadata,
      };

      // Dispatch webhooks asynchronously (fire-and-forget with logging)
      const deliveryPromises = activeWebhooks.map((webhook) =>
        WebhookEventService.deliver(webhook.id, webhook.url, payload, webhook.secret)
      );

      // Don't await in the caller — fire and forget
      Promise.allSettled(deliveryPromises).catch((err) => {
        logger.error('[WebhookEvent] Batch delivery error:', err);
      });
    } catch (error) {
      logger.error(`[WebhookEvent] Failed to emit event: ${event}`, error);
    }
  }

  /**
   * Deliver a webhook payload to a single endpoint and log the result
   * in the WebhookEvent table.
   */
  private static async deliver(
    webhookId: string,
    url: string,
    payload: WebhookPayload,
    secret: string | null
  ): Promise<void> {
    const body = JSON.stringify(payload);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Event': payload.event,
      'X-Webhook-Timestamp': payload.timestamp,
      'User-Agent': 'KitchenXpert-WebhookEmitter/1.0',
    };

    // Sign payload with HMAC if secret is configured
    if (secret) {
      const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');
      headers['X-Webhook-Signature'] = `sha256=${signature}`;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
        signal: AbortSignal.timeout(10000), // 10s timeout
      });

      const responseBody = await response.text().catch(() => '');

      // Log delivery in WebhookEvent table
      await prisma.webhookEvent
        .create({
          data: {
            webhookId,
            eventType: payload.event,
            payload: payload as object,
            response: responseBody ? { body: responseBody } : undefined,
            statusCode: response.status,
            attempts: 1,
            deliveredAt: response.ok ? new Date() : undefined,
            failedAt: response.ok ? undefined : new Date(),
            error: response.ok ? undefined : `HTTP ${response.status}`,
          },
        })
        .catch((logErr) => {
          logger.warn('[WebhookEvent] Failed to log delivery:', logErr);
        });

      if (!response.ok) {
        logger.warn(`[WebhookEvent] Delivery to ${url} failed with status ${response.status}`);
      }
    } catch (error) {
      // Log failed delivery
      await prisma.webhookEvent
        .create({
          data: {
            webhookId,
            eventType: payload.event,
            payload: payload as object,
            statusCode: 0,
            attempts: 1,
            failedAt: new Date(),
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        })
        .catch((logErr) => {
          logger.warn('[WebhookEvent] Failed to log failed delivery:', logErr);
        });

      logger.error(`[WebhookEvent] Delivery to ${url} failed:`, error);
    }
  }
}
