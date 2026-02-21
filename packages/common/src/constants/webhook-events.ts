/**
 * Constantes pour les événements webhook
 */

export const WEBHOOK_EVENTS = {
  // User events
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',

  // Kitchen events
  KITCHEN_CREATED: 'kitchen.created',
  KITCHEN_UPDATED: 'kitchen.updated',
  KITCHEN_DELETED: 'kitchen.deleted',
  KITCHEN_SHARED: 'kitchen.shared',
  KITCHEN_EXPORTED: 'kitchen.exported',

  // Project events
  PROJECT_CREATED: 'project.created',
  PROJECT_UPDATED: 'project.updated',
  PROJECT_DELETED: 'project.deleted',
  PROJECT_STATUS_CHANGED: 'project.status_changed',

  // Order events
  ORDER_CREATED: 'order.created',
  ORDER_UPDATED: 'order.updated',
  ORDER_STATUS_CHANGED: 'order.status_changed',
  ORDER_COMPLETED: 'order.completed',
  ORDER_CANCELLED: 'order.cancelled',

  // Catalog events
  CATALOG_SYNC_STARTED: 'catalog.sync.started',
  CATALOG_SYNC_COMPLETED: 'catalog.sync.completed',
  CATALOG_SYNC_FAILED: 'catalog.sync.failed',
  PRODUCT_ADDED: 'catalog.product.added',
  PRODUCT_UPDATED: 'catalog.product.updated',
  PRODUCT_REMOVED: 'catalog.product.removed',

  // System events
  SYSTEM_ALERT: 'system.alert',
  SYSTEM_MAINTENANCE: 'system.maintenance',
} as const;

export type WebhookEvent = typeof WEBHOOK_EVENTS[keyof typeof WEBHOOK_EVENTS];

export const WEBHOOK_STATUSES = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PAUSED: 'paused',
  FAILED: 'failed',
} as const;

export type WebhookStatus = typeof WEBHOOK_STATUSES[keyof typeof WEBHOOK_STATUSES];

export const WEBHOOK_DELIVERY_STATUSES = {
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
  RETRYING: 'retrying',
} as const;

export type WebhookDeliveryStatus = typeof WEBHOOK_DELIVERY_STATUSES[keyof typeof WEBHOOK_DELIVERY_STATUSES];

export const WEBHOOK_RETRY_CONFIG = {
  MAX_RETRIES: 5,
  INITIAL_DELAY_MS: 1000,
  MAX_DELAY_MS: 60000,
  BACKOFF_MULTIPLIER: 2,
  JITTER_FACTOR: 0.2,
} as const;

export const WEBHOOK_TIMEOUT_MS = 30000;
