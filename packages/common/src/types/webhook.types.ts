/**
 * Types pour le système de webhooks
 */

import { BaseEntity, ID } from './base.types';

export type WebhookEvent =
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'project.created'
  | 'project.updated'
  | 'project.completed'
  | 'project.deleted'
  | 'order.created'
  | 'order.updated'
  | 'order.completed'
  | 'order.cancelled'
  | 'product.created'
  | 'product.updated'
  | 'product.deleted'
  | 'product.stock_low'
  | 'catalog.synced'
  | 'partner.activated'
  | 'partner.suspended'
  | 'payment.completed'
  | 'payment.failed';

export type WebhookStatus = 'active' | 'inactive' | 'suspended';
export type DeliveryStatus = 'pending' | 'success' | 'failed' | 'retrying';

export interface Webhook extends BaseEntity {
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
}

export interface WebhookConfig {
  retryAttempts: number;
  retryDelayMs: number;
  timeoutMs: number;
  signatureHeader: string;
  signatureAlgorithm: 'sha256' | 'sha512';
  contentType: 'application/json' | 'application/x-www-form-urlencoded';
  sslVerification: boolean;
}

export interface WebhookStats {
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  averageLatencyMs: number;
  lastDeliveryAt?: Date | null;
  lastSuccessAt?: Date | null;
  lastFailureAt?: Date | null;
}

export interface WebhookDelivery extends BaseEntity {
  webhookId: ID;
  event: WebhookEvent;
  status: DeliveryStatus;
  payload: WebhookPayload;
  request: WebhookRequest;
  response?: WebhookResponse;
  attempts: DeliveryAttempt[];
  nextRetryAt?: Date | null;
}

export interface WebhookPayload {
  id: string;
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, unknown>;
  metadata?: {
    partnerId?: ID;
    userId?: ID;
    requestId?: string;
  };
}

export interface WebhookRequest {
  url: string;
  method: 'POST';
  headers: Record<string, string>;
  body: string;
  signature: string;
}

export interface WebhookResponse {
  statusCode: number;
  headers: Record<string, string>;
  body?: string;
  latencyMs: number;
  receivedAt: Date;
}

export interface DeliveryAttempt {
  attemptNumber: number;
  timestamp: Date;
  statusCode?: number;
  error?: string;
  latencyMs?: number;
}

export interface CreateWebhookRequest {
  name: string;
  url: string;
  events: WebhookEvent[];
  headers?: Record<string, string>;
  config?: Partial<WebhookConfig>;
}

export interface UpdateWebhookRequest {
  name?: string;
  url?: string;
  events?: WebhookEvent[];
  status?: WebhookStatus;
  headers?: Record<string, string>;
  config?: Partial<WebhookConfig>;
}

export interface WebhookTestRequest {
  webhookId: ID;
  event?: WebhookEvent;
  payload?: Record<string, unknown>;
}

export interface WebhookTestResult {
  success: boolean;
  statusCode?: number;
  latencyMs?: number;
  error?: string;
  response?: {
    headers: Record<string, string>;
    body?: string;
  };
}

export interface WebhookSignature {
  algorithm: 'sha256' | 'sha512';
  timestamp: number;
  signature: string;
}

export interface WebhookEventFilter {
  events?: WebhookEvent[];
  resourceType?: string;
  resourceId?: ID;
  partnerId?: ID;
}

export interface WebhookLog {
  id: ID;
  webhookId: ID;
  deliveryId: ID;
  event: WebhookEvent;
  status: DeliveryStatus;
  statusCode?: number;
  latencyMs?: number;
  error?: string;
  timestamp: Date;
}

export interface WebhookMetrics {
  webhookId: ID;
  period: 'hour' | 'day' | 'week' | 'month';
  deliveryRate: number;
  successRate: number;
  averageLatency: number;
  eventBreakdown: Record<
    WebhookEvent,
    {
      total: number;
      success: number;
      failed: number;
    }
  >;
}
