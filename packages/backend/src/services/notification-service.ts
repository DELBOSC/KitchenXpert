/**
 * Notification Service
 * Handles in-app notifications, push notifications, and notification preferences
 */

import { getMailService } from './mail.service';
import logger from '../utils/logger';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  status: NotificationStatus;
  priority: NotificationPriority;
  actionUrl?: string;
  imageUrl?: string;
  expiresAt?: Date;
  readAt?: Date;
  sentAt?: Date;
  createdAt: Date;
}

export type NotificationType =
  | 'project_shared'
  | 'project_comment'
  | 'project_updated'
  | 'quote_ready'
  | 'order_status'
  | 'payment_received'
  | 'delivery_update'
  | 'system_alert'
  | 'promotion'
  | 'reminder'
  | 'collaboration_invite'
  | 'ai_suggestion'
  | 'mention';

export type NotificationChannel = 'in_app' | 'push' | 'email' | 'sms';

export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface NotificationPreferences {
  userId: string;
  channels: ChannelPreferences;
  types: TypePreferences;
  quietHours?: QuietHours;
  frequency: NotificationFrequency;
  language: string;
}

export interface ChannelPreferences {
  in_app: boolean;
  push: boolean;
  email: boolean;
  sms: boolean;
}

export interface TypePreferences {
  [key: string]: {
    enabled: boolean;
    channels: NotificationChannel[];
  };
}

export interface QuietHours {
  enabled: boolean;
  start: string;
  end: string;
  timezone: string;
}

export type NotificationFrequency = 'instant' | 'hourly' | 'daily' | 'weekly';

export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  body: string;
  variables: string[];
  language: string;
}

export interface PushSubscription {
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  deviceId?: string;
  deviceType?: 'web' | 'ios' | 'android';
  createdAt: Date;
  lastUsedAt?: Date;
}

export interface NotificationQueryParams {
  userId: string;
  type?: NotificationType;
  channel?: NotificationChannel;
  status?: NotificationStatus;
  unreadOnly?: boolean;
  limit?: number;
  offset?: number;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
  byChannel: Record<NotificationChannel, number>;
}

export interface NotificationRepository {
  create(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification>;
  findById(id: string): Promise<Notification | null>;
  findByUser(params: NotificationQueryParams): Promise<Notification[]>;
  update(id: string, data: Partial<Notification>): Promise<Notification | null>;
  delete(id: string): Promise<boolean>;
  markAsRead(ids: string[]): Promise<number>;
  markAllAsRead(userId: string): Promise<number>;
  getStats(userId: string): Promise<NotificationStats>;
  getPreferences(userId: string): Promise<NotificationPreferences | null>;
  savePreferences(preferences: NotificationPreferences): Promise<NotificationPreferences>;
  getTemplate(type: NotificationType, channel: NotificationChannel, language: string): Promise<NotificationTemplate | null>;
  savePushSubscription(subscription: PushSubscription): Promise<void>;
  getPushSubscriptions(userId: string): Promise<PushSubscription[]>;
  deletePushSubscription(endpoint: string): Promise<boolean>;
}

export interface PushProvider {
  send(subscription: PushSubscription, payload: PushPayload): Promise<boolean>;
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: Record<string, unknown>;
  actions?: PushAction[];
  requireInteraction?: boolean;
  tag?: string;
}

export interface PushAction {
  action: string;
  title: string;
  icon?: string;
}

/**
 * Interface for looking up user email addresses.
 * Allows the notification service to send emails without direct Prisma dependency.
 */
export interface UserEmailLookup {
  findUserEmail(userId: string): Promise<{ email: string; firstName?: string | null } | null>;
}

export class NotificationService {
  private pushProvider: PushProvider | null = null;
  private userLookup: UserEmailLookup | null = null;

  constructor(
    private repository: NotificationRepository,
    pushProvider?: PushProvider,
    userLookup?: UserEmailLookup,
  ) {
    this.pushProvider = pushProvider || null;
    this.userLookup = userLookup || null;
  }

  /**
   * Send a notification
   */
  async send(
    userId: string,
    type: NotificationType,
    data: {
      title?: string;
      body?: string;
      variables?: Record<string, string>;
      priority?: NotificationPriority;
      actionUrl?: string;
      imageUrl?: string;
      channels?: NotificationChannel[];
    }
  ): Promise<Notification[]> {
    const preferences = await this.repository.getPreferences(userId);
    if (!preferences) {
      return this.sendToChannels(userId, type, ['in_app'], data);
    }

    const typePrefs = preferences.types[type];
    if (typePrefs && !typePrefs.enabled) {
      return [];
    }

    if (preferences.quietHours?.enabled && this.isQuietHours(preferences.quietHours)) {
      if (data.priority !== 'high' && data.priority !== 'urgent') {
        return [];
      }
    }

    let channels = data.channels || typePrefs?.channels || ['in_app'];
    channels = channels.filter(ch => preferences.channels[ch]);

    return this.sendToChannels(userId, type, channels, data);
  }

  private async sendToChannels(
    userId: string,
    type: NotificationType,
    channels: NotificationChannel[],
    data: {
      title?: string;
      body?: string;
      variables?: Record<string, string>;
      priority?: NotificationPriority;
      actionUrl?: string;
      imageUrl?: string;
    }
  ): Promise<Notification[]> {
    const notifications: Notification[] = [];
    const preferences = await this.repository.getPreferences(userId);
    const language = preferences?.language || 'fr';

    for (const channel of channels) {
      const template = await this.repository.getTemplate(type, channel, language);

      let title = data.title || template?.title || 'Notification';
      let body = data.body || template?.body || '';

      if (data.variables) {
        for (const [key, value] of Object.entries(data.variables)) {
          title = title.split(`{{${key}}}`).join(value);
          body = body.split(`{{${key}}}`).join(value);
        }
      }

      const notification = await this.repository.create({
        userId,
        type,
        channel,
        title,
        body,
        data: data.variables,
        status: 'pending',
        priority: data.priority || 'normal',
        actionUrl: data.actionUrl,
        imageUrl: data.imageUrl,
      });

      try {
        await this.deliverNotification(notification);
        await this.repository.update(notification.id, {
          status: 'sent',
          sentAt: new Date(),
        });
        notification.status = 'sent';
        notification.sentAt = new Date();
      } catch {
        await this.repository.update(notification.id, { status: 'failed' });
        notification.status = 'failed';
      }

      notifications.push(notification);
    }

    return notifications;
  }

  private async deliverNotification(notification: Notification): Promise<void> {
    switch (notification.channel) {
      case 'in_app':
        break;
      case 'push':
        await this.sendPush(notification);
        break;
      case 'email':
        await this.sendEmail(notification);
        break;
      case 'sms':
        logger.info(`[Notification] SMS delivery not yet implemented for user ${notification.userId}`);
        break;
    }
  }

  private async sendEmail(notification: Notification): Promise<void> {
    if (!this.userLookup) {
      logger.warn('[Notification] UserEmailLookup not configured, cannot send email');
      return;
    }

    const user = await this.userLookup.findUserEmail(notification.userId);
    if (!user) {
      logger.warn(`[Notification] User ${notification.userId} not found for email delivery`);
      return;
    }

    const mailService = getMailService();
    const result = await mailService.send({
      to: { email: user.email, name: user.firstName || undefined },
      subject: notification.title,
      html: this.buildNotificationEmailHtml(notification),
      text: `${notification.title}\n\n${notification.body}${notification.actionUrl ? `\n\nLien : ${notification.actionUrl}` : ''}`,
    });

    if (!result.success) {
      throw new Error(result.error || 'Email delivery failed');
    }

    logger.info(`[Notification] Email sent to ${user.email}`, {
      notificationId: notification.id,
      type: notification.type,
      messageId: result.messageId,
    });
  }

  private buildNotificationEmailHtml(notification: Notification): string {
    const actionButton = notification.actionUrl
      ? `<p style="margin-top:24px"><a href="${notification.actionUrl}" style="background-color:#2563eb;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:600">Voir les details</a></p>`
      : '';

    return `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <div style="background-color:#f8fafc;border-radius:8px;padding:32px">
          <h2 style="color:#1e293b;margin-top:0">${notification.title}</h2>
          <p style="color:#475569;font-size:16px;line-height:1.6">${notification.body}</p>
          ${actionButton}
        </div>
        <p style="color:#94a3b8;font-size:12px;text-align:center;margin-top:24px">
          KitchenXpert — Cet email a ete envoye automatiquement.
        </p>
      </div>
    `;
  }

  private async sendPush(notification: Notification): Promise<void> {
    if (!this.pushProvider) {
      logger.info('[Notification] Push provider not configured');
      return;
    }

    const subscriptions = await this.repository.getPushSubscriptions(notification.userId);

    const results = await Promise.allSettled(
      subscriptions.map(subscription =>
        this.pushProvider!.send(subscription, {
          title: notification.title,
          body: notification.body,
          icon: '/icons/notification-icon.png',
          badge: '/icons/badge-icon.png',
          image: notification.imageUrl,
          data: {
            notificationId: notification.id,
            type: notification.type,
            actionUrl: notification.actionUrl,
            ...notification.data,
          },
          tag: notification.type,
        })
      )
    );

    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      logger.warn(`[Notification] ${failures.length}/${subscriptions.length} push deliveries failed for user ${notification.userId}`);
    }
  }

  async getNotifications(
    userId: string,
    options?: {
      type?: NotificationType;
      unreadOnly?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Promise<Notification[]> {
    return this.repository.findByUser({
      userId,
      channel: 'in_app',
      ...options,
    });
  }

  async getNotificationById(id: string): Promise<Notification | null> {
    return this.repository.findById(id);
  }

  async markAsRead(notificationIds: string[]): Promise<number> {
    return this.repository.markAsRead(notificationIds);
  }

  async markAllAsRead(userId: string): Promise<number> {
    return this.repository.markAllAsRead(userId);
  }

  async deleteNotification(id: string): Promise<boolean> {
    return this.repository.delete(id);
  }

  async getStats(userId: string): Promise<NotificationStats> {
    return this.repository.getStats(userId);
  }

  async getUnreadCount(userId: string): Promise<number> {
    const stats = await this.repository.getStats(userId);
    return stats.unread;
  }

  async getPreferences(userId: string): Promise<NotificationPreferences> {
    const prefs = await this.repository.getPreferences(userId);
    if (prefs) {return prefs;}

    return {
      userId,
      channels: { in_app: true, push: true, email: true, sms: false },
      types: {},
      frequency: 'instant',
      language: 'fr',
    };
  }

  async updatePreferences(
    userId: string,
    updates: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    const existing = await this.getPreferences(userId);
    const preferences: NotificationPreferences = { ...existing, ...updates, userId };
    return this.repository.savePreferences(preferences);
  }

  async subscribeToPush(
    userId: string,
    subscription: Omit<PushSubscription, 'userId' | 'createdAt'>
  ): Promise<void> {
    await this.repository.savePushSubscription({
      ...subscription,
      userId,
      createdAt: new Date(),
    });
  }

  async unsubscribeFromPush(endpoint: string): Promise<boolean> {
    return this.repository.deletePushSubscription(endpoint);
  }

  async notifyProjectShared(
    recipientId: string,
    data: { projectId: string; projectName: string; ownerName: string }
  ): Promise<Notification[]> {
    return this.send(recipientId, 'project_shared', {
      variables: { projectName: data.projectName, ownerName: data.ownerName },
      actionUrl: `/projects/${data.projectId}`,
      priority: 'normal',
    });
  }

  async notifyAISuggestion(
    userId: string,
    data: { projectId: string; projectName: string; suggestionsCount: number }
  ): Promise<Notification[]> {
    return this.send(userId, 'ai_suggestion', {
      title: 'Nouvelles configurations suggérées',
      body: `L'IA a généré ${data.suggestionsCount} configurations pour "${data.projectName}"`,
      actionUrl: `/projects/${data.projectId}/suggestions`,
      priority: 'normal',
    });
  }

  async notifyQuoteReady(
    userId: string,
    data: { projectId: string; projectName: string; quoteId: string; totalAmount: string }
  ): Promise<Notification[]> {
    return this.send(userId, 'quote_ready', {
      variables: { projectName: data.projectName, totalAmount: data.totalAmount },
      actionUrl: `/quotes/${data.quoteId}`,
      priority: 'high',
    });
  }

  async notifyOrderStatus(
    userId: string,
    data: { orderId: string; orderNumber: string; status: string; trackingUrl?: string }
  ): Promise<Notification[]> {
    return this.send(userId, 'order_status', {
      variables: { orderNumber: data.orderNumber, status: data.status },
      actionUrl: data.trackingUrl || `/orders/${data.orderId}`,
      priority: data.status === 'delivered' ? 'high' : 'normal',
    });
  }

  async broadcast(
    userIds: string[],
    type: NotificationType,
    data: { title: string; body: string; priority?: NotificationPriority; actionUrl?: string }
  ): Promise<void> {
    const batchSize = 100;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      await Promise.all(batch.map(userId => this.send(userId, type, data)));
    }
  }

  private isQuietHours(quietHours: QuietHours): boolean {
    // Convert current time to the user's timezone
    const now = new Date();
    const userTimeStr = now.toLocaleString('en-US', { timeZone: quietHours.timezone || 'UTC' });
    const userDate = new Date(userTimeStr);
    const currentHour = userDate.getHours();
    const currentMinute = userDate.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    const [startHour, startMinute] = quietHours.start.split(':').map(Number);
    const [endHour, endMinute] = quietHours.end.split(':').map(Number);

    if (startHour === undefined || startMinute === undefined ||
        endHour === undefined || endMinute === undefined) {
      return false;
    }

    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    if (startTime < endTime) {
      return currentTime >= startTime && currentTime < endTime;
    } else {
      return currentTime >= startTime || currentTime < endTime;
    }
  }
}

export class NotificationServiceError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'NotificationServiceError';
  }
}

export function createNotificationService(
  repository: NotificationRepository,
  pushProvider?: PushProvider,
  userLookup?: UserEmailLookup
): NotificationService {
  return new NotificationService(repository, pushProvider, userLookup);
}

export default NotificationService;
