/**
 * Interfaces pour le système de webhooks
 */

import { ID } from '../types/base.types';
import {
  Webhook,
  WebhookEvent,
  WebhookDelivery,
  WebhookPayload,
  WebhookTestResult,
  CreateWebhookRequest,
  UpdateWebhookRequest,
  WebhookMetrics,
} from '../types/webhook.types';

/**
 * Interface principale pour le service de webhooks
 */
export interface IWebhookService {
  create(userId: ID, request: CreateWebhookRequest): Promise<Webhook>;
  update(id: ID, request: UpdateWebhookRequest): Promise<Webhook>;
  delete(id: ID): Promise<void>;
  get(id: ID): Promise<Webhook | null>;
  list(userId: ID): Promise<Webhook[]>;
  test(id: ID, event?: WebhookEvent): Promise<WebhookTestResult>;
  regenerateSecret(id: ID): Promise<string>;
}

/**
 * Interface pour le dispatcher de webhooks
 */
export interface IWebhookDispatcher {
  dispatch(event: WebhookEvent, payload: Record<string, unknown>): Promise<void>;
  dispatchToWebhook(webhookId: ID, payload: WebhookPayload): Promise<WebhookDelivery>;
  retryDelivery(deliveryId: ID): Promise<WebhookDelivery>;
}

/**
 * Interface pour la livraison de webhooks
 */
export interface IWebhookDeliveryService {
  getDelivery(id: ID): Promise<WebhookDelivery | null>;
  getDeliveries(webhookId: ID, options?: DeliveryListOptions): Promise<DeliveryListResult>;
  getFailedDeliveries(webhookId: ID): Promise<WebhookDelivery[]>;
  retryFailed(webhookId: ID): Promise<RetryResult>;
}

export interface DeliveryListOptions {
  page?: number;
  limit?: number;
  status?: 'pending' | 'success' | 'failed' | 'retrying';
  startDate?: Date;
  endDate?: Date;
}

export interface DeliveryListResult {
  deliveries: WebhookDelivery[];
  total: number;
  page: number;
  limit: number;
}

export interface RetryResult {
  retried: number;
  successful: number;
  failed: number;
}

/**
 * Interface pour la signature de webhooks
 */
export interface IWebhookSigner {
  sign(payload: string, secret: string, algorithm?: 'sha256' | 'sha512'): string;
  verify(payload: string, signature: string, secret: string): boolean;
  generateSecret(): string;
}

/**
 * Interface pour le gestionnaire d'événements webhook
 */
export interface IWebhookEventManager {
  registerEvent(event: WebhookEvent, description: string): void;
  unregisterEvent(event: WebhookEvent): void;
  getRegisteredEvents(): WebhookEventInfo[];
  isEventRegistered(event: WebhookEvent): boolean;
}

export interface WebhookEventInfo {
  event: WebhookEvent;
  description: string;
  category: string;
  payloadSchema?: Record<string, unknown>;
}

/**
 * Interface pour les métriques de webhooks
 */
export interface IWebhookMetrics {
  getMetrics(webhookId: ID, period?: 'hour' | 'day' | 'week' | 'month'): Promise<WebhookMetrics>;
  recordDelivery(webhookId: ID, success: boolean, latency: number): Promise<void>;
  getAggregatedMetrics(userId: ID): Promise<AggregatedWebhookMetrics>;
}

export interface AggregatedWebhookMetrics {
  totalWebhooks: number;
  activeWebhooks: number;
  totalDeliveries: number;
  successRate: number;
  averageLatency: number;
  byEvent: Record<WebhookEvent, {
    total: number;
    success: number;
    failed: number;
  }>;
}

/**
 * Interface pour la file d'attente de webhooks
 */
export interface IWebhookQueue {
  enqueue(delivery: QueuedDelivery): Promise<void>;
  dequeue(): Promise<QueuedDelivery | null>;
  peek(): Promise<QueuedDelivery | null>;
  size(): Promise<number>;
  clear(): Promise<void>;
}

export interface QueuedDelivery {
  webhookId: ID;
  deliveryId: ID;
  payload: WebhookPayload;
  attempt: number;
  scheduledAt: Date;
  priority?: number;
}
