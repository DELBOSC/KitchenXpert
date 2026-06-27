import { type PrismaClient, type Webhook, type WebhookEvent } from '@prisma/client';

/**
 * Webhook Repository
 *
 * Handles all webhook-related database operations using Prisma ORM.
 */

export interface WebhookWithEvents extends Webhook {
  eventLogs?: WebhookEvent[];
  _count?: { eventLogs: number };
}

export interface CreateWebhookDto {
  partnerId?: string;
  name: string;
  url: string;
  secret: string;
  events: string[];
  headers?: Record<string, string>;
  retryCount?: number;
  timeout?: number;
}

export interface UpdateWebhookDto {
  name?: string;
  url?: string;
  secret?: string;
  events?: string[];
  headers?: Record<string, string>;
  isActive?: boolean;
  retryCount?: number;
  timeout?: number;
}

export interface CreateWebhookEventDto {
  webhookId: string;
  eventType: string;
  payload: Record<string, unknown>;
  response?: Record<string, unknown>;
  statusCode?: number;
  error?: string;
}

export interface WebhookFilters {
  partnerId?: string;
  isActive?: boolean;
  eventType?: string;
}

export class WebhookRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // ==================== WEBHOOKS ====================

  /**
   * Find a webhook by ID
   */
  async findById(id: string): Promise<WebhookWithEvents | null> {
    return this.prisma.webhook.findUnique({
      where: { id },
      include: {
        partner: true,
        _count: { select: { eventLogs: true } },
      },
    });
  }

  /**
   * Find all webhooks with optional filters
   */
  async findAll(filters: WebhookFilters = {}): Promise<Webhook[]> {
    return this.prisma.webhook.findMany({
      where: {
        ...(filters.partnerId && { partnerId: filters.partnerId }),
        ...(filters.isActive !== undefined && { isActive: filters.isActive }),
        ...(filters.eventType && { events: { has: filters.eventType as any } }),
      },
      include: {
        partner: { select: { id: true, name: true, code: true } },
        _count: { select: { eventLogs: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find webhooks by event type
   */
  async findByEventType(eventType: string): Promise<Webhook[]> {
    return this.prisma.webhook.findMany({
      where: {
        isActive: true,
        events: { has: eventType as any },
      },
    });
  }

  /**
   * Find webhooks by partner
   */
  async findByPartnerId(partnerId: string): Promise<Webhook[]> {
    return this.prisma.webhook.findMany({
      where: { partnerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create a webhook
   */
  async create(data: CreateWebhookDto): Promise<Webhook> {
    return this.prisma.webhook.create({
      data: {
        partnerId: data.partnerId,
        name: data.name,
        url: data.url,
        secret: data.secret,
        events: data.events as any,
        headers: data.headers as any,
        retryCount: data.retryCount || 3,
        timeout: data.timeout || 30000,
      },
    });
  }

  /**
   * Update a webhook
   */
  async update(id: string, data: UpdateWebhookDto): Promise<Webhook> {
    return this.prisma.webhook.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.url && { url: data.url }),
        ...(data.secret && { secret: data.secret }),
        ...(data.events && { events: data.events as any }),
        ...(data.headers && { headers: data.headers as any }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.retryCount !== undefined && { retryCount: data.retryCount }),
        ...(data.timeout !== undefined && { timeout: data.timeout }),
      },
    });
  }

  /**
   * Delete a webhook
   */
  async delete(id: string): Promise<Webhook> {
    return this.prisma.webhook.delete({
      where: { id },
    });
  }

  /**
   * Toggle webhook active status
   */
  async toggle(id: string): Promise<Webhook> {
    return this.prisma.$transaction(async (tx) => {
      const webhook = await tx.webhook.findUnique({ where: { id } });
      if (!webhook) {
        throw new Error('Webhook not found');
      }

      return tx.webhook.update({
        where: { id },
        data: { isActive: !webhook.isActive },
      });
    });
  }

  /**
   * Count webhooks
   */
  async count(filters: WebhookFilters = {}): Promise<number> {
    return this.prisma.webhook.count({
      where: {
        ...(filters.partnerId && { partnerId: filters.partnerId }),
        ...(filters.isActive !== undefined && { isActive: filters.isActive }),
      },
    });
  }

  // ==================== WEBHOOK EVENTS ====================

  /**
   * Create a webhook event log
   */
  async createEvent(data: CreateWebhookEventDto): Promise<WebhookEvent> {
    return this.prisma.webhookEvent.create({
      data: {
        webhookId: data.webhookId,
        eventType: data.eventType as any,
        payload: data.payload as any,
        response: data.response as any,
        statusCode: data.statusCode,
        error: data.error,
        attempts: 1,
        ...(data.statusCode &&
          data.statusCode >= 200 &&
          data.statusCode < 300 && {
            deliveredAt: new Date(),
          }),
        ...(data.error && { failedAt: new Date() }),
      },
    });
  }

  /**
   * Update webhook event (for retries)
   */
  async updateEvent(
    id: string,
    data: {
      response?: Record<string, unknown>;
      statusCode?: number;
      error?: string;
      delivered?: boolean;
    }
  ): Promise<WebhookEvent> {
    return this.prisma.webhookEvent.update({
      where: { id },
      data: {
        ...(data.response && { response: data.response as any }),
        ...(data.statusCode && { statusCode: data.statusCode }),
        ...(data.error && { error: data.error, failedAt: new Date() }),
        ...(data.delivered && { deliveredAt: new Date() }),
        attempts: { increment: 1 },
      },
    });
  }

  /**
   * Get events for a webhook
   */
  async getEvents(webhookId: string, limit = 50): Promise<WebhookEvent[]> {
    return this.prisma.webhookEvent.findMany({
      where: { webhookId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get failed events (for retry queue)
   */
  async getFailedEvents(maxAttempts = 3): Promise<WebhookEvent[]> {
    return this.prisma.webhookEvent.findMany({
      where: {
        deliveredAt: null,
        failedAt: { not: null },
        attempts: { lt: maxAttempts },
      },
      include: { webhook: true },
      orderBy: { createdAt: 'asc' },
      take: 1000,
    });
  }

  /**
   * Get event statistics for a webhook
   */
  async getEventStats(
    webhookId: string,
    days = 30
  ): Promise<{
    total: number;
    delivered: number;
    failed: number;
    pending: number;
    avgResponseTime: number | null;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [total, delivered, failed, pending] = await Promise.all([
      this.prisma.webhookEvent.count({
        where: { webhookId, createdAt: { gte: startDate } },
      }),
      this.prisma.webhookEvent.count({
        where: { webhookId, createdAt: { gte: startDate }, deliveredAt: { not: null } },
      }),
      this.prisma.webhookEvent.count({
        where: { webhookId, createdAt: { gte: startDate }, failedAt: { not: null } },
      }),
      this.prisma.webhookEvent.count({
        where: { webhookId, createdAt: { gte: startDate }, deliveredAt: null, failedAt: null },
      }),
    ]);

    return {
      total,
      delivered,
      failed,
      pending,
      avgResponseTime: null, // Would need to track response time in the model
    };
  }

  /**
   * Delete old events (retention policy)
   */
  async deleteOldEvents(olderThan: Date): Promise<{ count: number }> {
    return this.prisma.webhookEvent.deleteMany({
      where: { createdAt: { lt: olderThan } },
    });
  }

  /**
   * Get webhook delivery rate
   */
  async getDeliveryRate(webhookId: string): Promise<number> {
    const [total, delivered] = await Promise.all([
      this.prisma.webhookEvent.count({ where: { webhookId } }),
      this.prisma.webhookEvent.count({ where: { webhookId, deliveredAt: { not: null } } }),
    ]);

    return total > 0 ? (delivered / total) * 100 : 0;
  }
}

export default WebhookRepository;
