/**
 * Webhook Model Class
 * Provides methods for working with webhook data
 */

import {
  Webhook,
  WebhookEvent,
  WebhookStatus,
  WebhookConfig,
  WebhookStats,
  WebhookPayload,
  ID,
} from '../types';

// Re-export types that may be used externally
export type {
  WebhookDelivery,
  WebhookRequest,
  WebhookResponse,
  DeliveryAttempt,
  DeliveryStatus,
  WebhookTestResult,
  WebhookSignature,
} from '../types';

export interface WebhookCreateInput {
  partnerId?: ID | null;
  userId?: ID | null;
  name: string;
  url: string;
  secret: string;
  events: WebhookEvent[];
  headers?: Record<string, string>;
  config?: Partial<WebhookConfig>;
}

export interface WebhookUpdateInput {
  name?: string;
  url?: string;
  events?: WebhookEvent[];
  status?: WebhookStatus;
  headers?: Record<string, string>;
  config?: Partial<WebhookConfig>;
}

export class WebhookModel implements Webhook {
  id: ID;
  partnerId?: ID | null;
  userId?: ID | null;
  name: string;
  url: string;
  secret: string;
  events: WebhookEvent[];
  status: WebhookStatus;
  headers?: Record<string, string>;
  config: WebhookConfig;
  stats: WebhookStats;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string | null;

  constructor(data: Webhook) {
    this.id = data.id;
    this.partnerId = data.partnerId;
    this.userId = data.userId;
    this.name = data.name;
    this.url = data.url;
    this.secret = data.secret;
    this.events = data.events || [];
    this.status = data.status;
    this.headers = data.headers;
    this.config = data.config;
    this.stats = data.stats;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.deletedAt = data.deletedAt;
  }

  /**
   * Check if the webhook is active
   */
  isActive(): boolean {
    return this.status === 'active';
  }

  /**
   * Check if the webhook is inactive
   */
  isInactive(): boolean {
    return this.status === 'inactive';
  }

  /**
   * Check if the webhook is suspended
   */
  isSuspended(): boolean {
    return this.status === 'suspended';
  }

  /**
   * Check if the webhook is subscribed to a specific event
   */
  isSubscribedTo(event: WebhookEvent): boolean {
    return this.events.includes(event);
  }

  /**
   * Get the number of subscribed events
   */
  getEventCount(): number {
    return this.events.length;
  }

  /**
   * Get the success rate as a percentage
   */
  getSuccessRate(): number {
    if (this.stats.totalDeliveries === 0) return 100;
    return (this.stats.successfulDeliveries / this.stats.totalDeliveries) * 100;
  }

  /**
   * Get the failure rate as a percentage
   */
  getFailureRate(): number {
    if (this.stats.totalDeliveries === 0) return 0;
    return (this.stats.failedDeliveries / this.stats.totalDeliveries) * 100;
  }

  /**
   * Check if the webhook has a high failure rate (> 50%)
   */
  hasHighFailureRate(): boolean {
    return this.getFailureRate() > 50;
  }

  /**
   * Check if the webhook has custom headers
   */
  hasCustomHeaders(): boolean {
    return !!this.headers && Object.keys(this.headers).length > 0;
  }

  /**
   * Get the average latency in milliseconds
   */
  getAverageLatency(): number {
    return this.stats.averageLatencyMs;
  }

  /**
   * Subscribe to an event
   */
  subscribe(event: WebhookEvent): void {
    if (!this.events.includes(event)) {
      this.events.push(event);
    }
  }

  /**
   * Unsubscribe from an event
   */
  unsubscribe(event: WebhookEvent): boolean {
    const index = this.events.indexOf(event);
    if (index !== -1) {
      this.events.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Update stats after a successful delivery
   */
  recordSuccessfulDelivery(latencyMs: number): void {
    this.stats.totalDeliveries++;
    this.stats.successfulDeliveries++;
    this.stats.lastDeliveryAt = new Date();
    this.stats.lastSuccessAt = new Date();

    // Update average latency
    const total = this.stats.averageLatencyMs * (this.stats.totalDeliveries - 1);
    this.stats.averageLatencyMs = (total + latencyMs) / this.stats.totalDeliveries;
  }

  /**
   * Update stats after a failed delivery
   */
  recordFailedDelivery(): void {
    this.stats.totalDeliveries++;
    this.stats.failedDeliveries++;
    this.stats.lastDeliveryAt = new Date();
    this.stats.lastFailureAt = new Date();
  }

  /**
   * Check if SSL verification is enabled
   */
  hasSSLVerification(): boolean {
    return this.config.sslVerification;
  }

  /**
   * Get the retry configuration
   */
  getRetryConfig(): { attempts: number; delayMs: number } {
    return {
      attempts: this.config.retryAttempts,
      delayMs: this.config.retryDelayMs,
    };
  }

  /**
   * Get the timeout in milliseconds
   */
  getTimeout(): number {
    return this.config.timeoutMs;
  }

  /**
   * Convert to plain object
   */
  toJSON(): Webhook {
    return {
      id: this.id,
      partnerId: this.partnerId,
      userId: this.userId,
      name: this.name,
      url: this.url,
      secret: this.secret,
      events: this.events,
      status: this.status,
      headers: this.headers,
      config: this.config,
      stats: this.stats,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt,
    };
  }

  /**
   * Create default webhook configuration
   */
  static createDefaultConfig(): WebhookConfig {
    return {
      retryAttempts: 3,
      retryDelayMs: 1000,
      timeoutMs: 30000,
      signatureHeader: 'X-Webhook-Signature',
      signatureAlgorithm: 'sha256',
      contentType: 'application/json',
      sslVerification: true,
    };
  }

  /**
   * Create initial webhook stats
   */
  static createInitialStats(): WebhookStats {
    return {
      totalDeliveries: 0,
      successfulDeliveries: 0,
      failedDeliveries: 0,
      averageLatencyMs: 0,
      lastDeliveryAt: null,
      lastSuccessAt: null,
      lastFailureAt: null,
    };
  }

  /**
   * Create a webhook payload
   */
  static createPayload(
    event: WebhookEvent,
    data: Record<string, unknown>,
    metadata?: { partnerId?: ID; userId?: ID; requestId?: string }
  ): WebhookPayload {
    return {
      id: crypto.randomUUID(),
      event,
      timestamp: new Date().toISOString(),
      data,
      metadata,
    };
  }

  /**
   * Create a new WebhookModel from input data
   */
  static create(input: WebhookCreateInput, id: ID): WebhookModel {
    const now = new Date();
    const defaultConfig = WebhookModel.createDefaultConfig();

    return new WebhookModel({
      id,
      partnerId: input.partnerId,
      userId: input.userId,
      name: input.name,
      url: input.url,
      secret: input.secret,
      events: input.events,
      status: 'active',
      headers: input.headers,
      config: {
        ...defaultConfig,
        ...input.config,
      },
      stats: WebhookModel.createInitialStats(),
      createdAt: now,
      updatedAt: now,
    });
  }
}

export default WebhookModel;
