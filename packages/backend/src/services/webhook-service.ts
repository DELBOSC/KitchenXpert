/**
 * Webhook Service
 * Handles outbound webhooks, retries, and signature verification
 */

import * as crypto from 'crypto';

import logger from '../utils/logger';

export interface Webhook {
  id: string;
  partnerId?: string;
  url: string;
  secret: string;
  events: WebhookEvent[];
  status: WebhookStatus;
  headers?: Record<string, string>;
  retryPolicy: RetryPolicy;
  createdAt: Date;
  updatedAt: Date;
}

export type WebhookEvent =
  | 'project.created'
  | 'project.updated'
  | 'project.deleted'
  | 'project.shared'
  | 'order.created'
  | 'order.updated'
  | 'order.completed'
  | 'order.cancelled'
  | 'quote.created'
  | 'quote.accepted'
  | 'quote.rejected'
  | 'user.created'
  | 'user.updated'
  | 'ai.configuration.generated'
  | 'partner.sync';

export type WebhookStatus = 'active' | 'inactive' | 'suspended';

export interface RetryPolicy {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  timeout?: number;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: WebhookEvent;
  payload: Record<string, unknown>;
  status: DeliveryStatus;
  attempts: DeliveryAttempt[];
  createdAt: Date;
  completedAt?: Date;
}

export type DeliveryStatus = 'pending' | 'delivered' | 'failed' | 'retrying';

export interface DeliveryAttempt {
  attemptNumber: number;
  timestamp: Date;
  statusCode?: number;
  responseBody?: string;
  error?: string;
  duration: number;
}

export interface WebhookRepository {
  findById(id: string): Promise<Webhook | null>;
  findByPartner(partnerId: string): Promise<Webhook[]>;
  findByEvent(event: WebhookEvent): Promise<Webhook[]>;
  findAll(status?: WebhookStatus): Promise<Webhook[]>;
  create(data: Omit<Webhook, 'id' | 'createdAt' | 'updatedAt'>): Promise<Webhook>;
  update(id: string, data: Partial<Webhook>): Promise<Webhook | null>;
  delete(id: string): Promise<boolean>;

  createDelivery(delivery: Omit<WebhookDelivery, 'id' | 'createdAt'>): Promise<WebhookDelivery>;
  updateDelivery(id: string, data: Partial<WebhookDelivery>): Promise<WebhookDelivery | null>;
  getDeliveries(webhookId: string, limit?: number): Promise<WebhookDelivery[]>;
  getPendingDeliveries(): Promise<WebhookDelivery[]>;
  getFailedDeliveries(): Promise<WebhookDelivery[]>;
}

const defaultRetryPolicy: RetryPolicy = {
  maxRetries: 5,
  initialDelayMs: 1000,
  maxDelayMs: 60000,
  backoffMultiplier: 2,
};

/** HTTP status codes that justify a retry */
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

/** Jitter factor to prevent thundering herd */
const JITTER_FACTOR = 0.2;

export class WebhookService {
  private deliveryQueue: Map<string, NodeJS.Timeout> = new Map();

  constructor(private repository: WebhookRepository) {}

  /**
   * Register a new webhook
   */
  async register(data: {
    url: string;
    events: WebhookEvent[];
    partnerId?: string;
    headers?: Record<string, string>;
    retryPolicy?: Partial<RetryPolicy>;
  }): Promise<Webhook> {
    const secret = this.generateSecret();

    return this.repository.create({
      ...data,
      secret,
      status: 'active',
      retryPolicy: { ...defaultRetryPolicy, ...data.retryPolicy },
    });
  }

  /**
   * Get webhook by ID
   */
  async getById(id: string): Promise<Webhook | null> {
    return this.repository.findById(id);
  }

  /**
   * Get webhooks for a partner
   */
  async getByPartner(partnerId: string): Promise<Webhook[]> {
    return this.repository.findByPartner(partnerId);
  }

  /**
   * Update webhook
   */
  async update(id: string, data: Partial<Webhook>): Promise<Webhook | null> {
    const { secret: _secret, ...updateData } = data;
    return this.repository.update(id, { ...updateData, updatedAt: new Date() });
  }

  /**
   * Regenerate webhook secret
   */
  async regenerateSecret(id: string): Promise<string> {
    const secret = this.generateSecret();
    await this.repository.update(id, { secret, updatedAt: new Date() });
    return secret;
  }

  /**
   * Delete webhook
   */
  async delete(id: string): Promise<boolean> {
    return this.repository.delete(id);
  }

  /**
   * Dispatch event to all registered webhooks
   */
  async dispatch(event: WebhookEvent, payload: Record<string, unknown>): Promise<void> {
    const webhooks = await this.repository.findByEvent(event);
    const activeWebhooks = webhooks.filter(w => w.status === 'active');

    await Promise.all(
      activeWebhooks.map(webhook => this.queueDelivery(webhook, event, payload))
    );
  }

  /**
   * Queue delivery for a webhook
   */
  private async queueDelivery(
    webhook: Webhook,
    event: WebhookEvent,
    payload: Record<string, unknown>
  ): Promise<void> {
    const delivery = await this.repository.createDelivery({
      webhookId: webhook.id,
      event,
      payload,
      status: 'pending',
      attempts: [],
    });

    await this.attemptDelivery(webhook, delivery);
  }

  /**
   * Attempt to deliver a webhook
   */
  private async attemptDelivery(
    webhook: Webhook,
    delivery: WebhookDelivery,
    attemptNumber: number = 1
  ): Promise<void> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    const signature = this.generateSignature(webhook.secret, delivery.payload, timestamp);

    try {
      const response = await this.sendRequest(webhook, delivery, timestamp, signature);
      const duration = Date.now() - startTime;

      const attempt: DeliveryAttempt = {
        attemptNumber,
        timestamp: new Date(),
        statusCode: response.status,
        responseBody: response.body?.substring(0, 1000),
        duration,
      };

      if (response.status >= 200 && response.status < 300) {
        await this.repository.updateDelivery(delivery.id, {
          status: 'delivered',
          attempts: [...delivery.attempts, attempt],
          completedAt: new Date(),
        });
      } else {
        await this.handleFailedAttempt(webhook, delivery, attempt, attemptNumber);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const attempt: DeliveryAttempt = {
        attemptNumber,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
      };

      await this.handleFailedAttempt(webhook, delivery, attempt, attemptNumber);
    }
  }

  /**
   * Send HTTP request to webhook endpoint
   */
  private async sendRequest(
    webhook: Webhook,
    delivery: WebhookDelivery,
    timestamp: string,
    signature: string
  ): Promise<{ status: number; body?: string }> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Id': webhook.id,
      'X-Webhook-Event': delivery.event,
      'X-Webhook-Timestamp': timestamp,
      'X-Webhook-Signature': signature,
      'User-Agent': 'KitchenXpert-Webhooks/1.0',
      ...webhook.headers,
    };

    try {
      const controller = new AbortController();
      const MAX_TIMEOUT_MS = 60000; // 60 seconds max
      const timeout = Math.min(webhook.retryPolicy.timeout || 30000, MAX_TIMEOUT_MS);
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(delivery.payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const body = await response.text();

      logger.info(`[Webhook] Sent to ${webhook.url}`, {
        status: response.status,
        event: delivery.event,
      });

      return { status: response.status, body };
    } catch (error) {
      logger.error(`[Webhook] Failed to send to ${webhook.url}`, { error });
      throw error;
    }
  }

  /**
   * Handle failed delivery attempt
   */
  private async handleFailedAttempt(
    webhook: Webhook,
    delivery: WebhookDelivery,
    attempt: DeliveryAttempt,
    attemptNumber: number
  ): Promise<void> {
    const updatedAttempts = [...delivery.attempts, attempt];

    // Don't retry non-retryable status codes (4xx except 408, 429)
    const isNonRetryableStatus = attempt.statusCode !== undefined
      && !RETRYABLE_STATUS_CODES.has(attempt.statusCode);

    if (attemptNumber >= webhook.retryPolicy.maxRetries || isNonRetryableStatus) {
      await this.repository.updateDelivery(delivery.id, {
        status: 'failed',
        attempts: updatedAttempts,
        completedAt: new Date(),
      });

      // Check if we should suspend the webhook
      await this.checkSuspension(webhook);
    } else {
      await this.repository.updateDelivery(delivery.id, {
        status: 'retrying',
        attempts: updatedAttempts,
      });

      // Schedule retry with exponential backoff + jitter
      const delay = this.calculateRetryDelay(webhook.retryPolicy, attemptNumber);
      const updatedDelivery = { ...delivery, attempts: updatedAttempts };

      const timeout = setTimeout(
        () => this.attemptDelivery(webhook, updatedDelivery, attemptNumber + 1),
        delay
      );

      this.deliveryQueue.set(delivery.id, timeout);
    }
  }

  /**
   * Calculate retry delay with exponential backoff + jitter
   */
  private calculateRetryDelay(policy: RetryPolicy, attemptNumber: number): number {
    const baseDelay = policy.initialDelayMs * Math.pow(policy.backoffMultiplier, attemptNumber - 1);
    const cappedDelay = Math.min(baseDelay, policy.maxDelayMs);
    // Add jitter (up to JITTER_FACTOR of the capped delay) to prevent thundering herd
    const jitter = cappedDelay * JITTER_FACTOR * (crypto.randomInt(1000) / 1000);
    return Math.floor(cappedDelay + jitter);
  }

  /**
   * Check if webhook should be suspended due to repeated failures
   */
  private async checkSuspension(webhook: Webhook): Promise<void> {
    const recentDeliveries = await this.repository.getDeliveries(webhook.id, 10);
    const failedCount = recentDeliveries.filter(d => d.status === 'failed').length;

    // Suspend if more than 80% of recent deliveries failed
    if (recentDeliveries.length >= 5 && failedCount / recentDeliveries.length > 0.8) {
      await this.repository.update(webhook.id, {
        status: 'suspended',
        updatedAt: new Date(),
      });
    }
  }

  /**
   * Generate webhook signature
   */
  generateSignature(
    secret: string,
    payload: Record<string, unknown> | string,
    timestamp: string
  ): string {
    const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const message = `${timestamp}.${payloadStr}`;
    return `sha256=${crypto.createHmac('sha256', secret).update(message).digest('hex')}`;
  }

  /**
   * Verify incoming webhook signature
   */
  verifySignature(
    secret: string,
    payload: string,
    timestamp: string,
    signature: string
  ): boolean {
    const expectedSignature = `sha256=${crypto.createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex')}`;

    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch {
      return false;
    }
  }

  /**
   * Get delivery history for a webhook
   */
  async getDeliveries(webhookId: string, limit: number = 50): Promise<WebhookDelivery[]> {
    return this.repository.getDeliveries(webhookId, limit);
  }

  /**
   * Retry failed deliveries
   */
  async retryFailedDeliveries(): Promise<number> {
    const failedDeliveries = await this.repository.getFailedDeliveries();
    let retriedCount = 0;

    for (const delivery of failedDeliveries) {
      const webhook = await this.repository.findById(delivery.webhookId);
      if (webhook && webhook.status === 'active') {
        // Reset status to pending but preserve attempt history
        await this.repository.updateDelivery(delivery.id, {
          status: 'pending',
        });

        const updatedDelivery = { ...delivery, status: 'pending' as DeliveryStatus };
        const nextAttempt = delivery.attempts.length + 1;
        await this.attemptDelivery(webhook, updatedDelivery, nextAttempt);
        retriedCount++;
      }
    }

    return retriedCount;
  }

  /**
   * Test webhook endpoint
   */
  async testWebhook(id: string): Promise<{ success: boolean; statusCode?: number; error?: string }> {
    const webhook = await this.repository.findById(id);
    if (!webhook) {
      return { success: false, error: 'Webhook not found' };
    }

    const testPayload = {
      type: 'test',
      timestamp: new Date().toISOString(),
      message: 'This is a test webhook delivery',
    };

    const timestamp = new Date().toISOString();
    const signature = this.generateSignature(webhook.secret, testPayload, timestamp);

    try {
      const response = await this.sendRequest(
        webhook,
        { id: 'test', webhookId: id, event: 'project.created', payload: testPayload, status: 'pending', attempts: [], createdAt: new Date() },
        timestamp,
        signature
      );

      return {
        success: response.status >= 200 && response.status < 300,
        statusCode: response.status,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Cancel pending retries
   */
  cancelPendingRetries(deliveryId: string): void {
    const timeout = this.deliveryQueue.get(deliveryId);
    if (timeout) {
      clearTimeout(timeout);
      this.deliveryQueue.delete(deliveryId);
    }
  }

  /**
   * Stop the service and cancel all pending retries
   */
  stop(): void {
    for (const timeout of this.deliveryQueue.values()) {
      clearTimeout(timeout);
    }
    this.deliveryQueue.clear();
  }

  /**
   * Generate webhook secret
   */
  private generateSecret(): string {
    return `whsec_${crypto.randomBytes(24).toString('hex')}`;
  }
}

export class WebhookServiceError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'WebhookServiceError';
  }
}

export function createWebhookService(repository: WebhookRepository): WebhookService {
  return new WebhookService(repository);
}

export default WebhookService;
