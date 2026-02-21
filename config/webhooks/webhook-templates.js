/**
 * Webhook Event Payload Templates for KitchenXpert
 *
 * Purpose:
 * - Standard payload structure for each event type
 * - Metadata fields (timestamp, event_id, version)
 * - Sample payloads for testing
 * - JSON Schema validation support
 *
 * Usage:
 * - Get template: getEventTemplate('order.created', orderData)
 * - Validate payload: validateEventPayload(event, payload)
 */

import { v4 as uuidv4 } from 'uuid';
import { WEBHOOK_EVENTS } from './webhook-config';

/**
 * Base webhook payload structure
 */
const createBasePayload = (eventType, data) => ({
  event_id: uuidv4(),
  event_type: eventType,
  timestamp: new Date().toISOString(),
  api_version: '2026-01',
  data,
});

/**
 * Order event templates
 */
export const ORDER_TEMPLATES = {
  [WEBHOOK_EVENTS.ORDER_CREATED]: (order) =>
    createBasePayload(WEBHOOK_EVENTS.ORDER_CREATED, {
      order_id: order.id,
      order_number: order.orderNumber,
      customer: {
        id: order.customerId,
        email: order.customerEmail,
        name: order.customerName,
      },
      items: order.items,
      total_amount: order.totalAmount,
      currency: order.currency,
      status: order.status,
      created_at: order.createdAt,
    }),

  [WEBHOOK_EVENTS.ORDER_UPDATED]: (order) =>
    createBasePayload(WEBHOOK_EVENTS.ORDER_UPDATED, {
      order_id: order.id,
      order_number: order.orderNumber,
      previous_status: order.previousStatus,
      new_status: order.status,
      updated_at: order.updatedAt,
      changes: order.changes,
    }),
};

/**
 * Design event templates
 */
export const DESIGN_TEMPLATES = {
  [WEBHOOK_EVENTS.DESIGN_CREATED]: (design) =>
    createBasePayload(WEBHOOK_EVENTS.DESIGN_CREATED, {
      design_id: design.id,
      user_id: design.userId,
      name: design.name,
      dimensions: design.dimensions,
      total_price: design.totalPrice,
      created_at: design.createdAt,
    }),

  [WEBHOOK_EVENTS.DESIGN_COMPLETED]: (design) =>
    createBasePayload(WEBHOOK_EVENTS.DESIGN_COMPLETED, {
      design_id: design.id,
      user_id: design.userId,
      name: design.name,
      preview_url: design.previewUrl,
      pdf_url: design.pdfUrl,
      completed_at: design.completedAt,
    }),
};

/**
 * Payment event templates
 */
export const PAYMENT_TEMPLATES = {
  [WEBHOOK_EVENTS.PAYMENT_SUCCEEDED]: (payment) =>
    createBasePayload(WEBHOOK_EVENTS.PAYMENT_SUCCEEDED, {
      payment_id: payment.id,
      order_id: payment.orderId,
      amount: payment.amount,
      currency: payment.currency,
      payment_method: payment.paymentMethod,
      status: 'succeeded',
      processed_at: payment.processedAt,
    }),

  [WEBHOOK_EVENTS.PAYMENT_FAILED]: (payment) =>
    createBasePayload(WEBHOOK_EVENTS.PAYMENT_FAILED, {
      payment_id: payment.id,
      order_id: payment.orderId,
      amount: payment.amount,
      currency: payment.currency,
      error_code: payment.errorCode,
      error_message: payment.errorMessage,
      failed_at: payment.failedAt,
    }),
};

/**
 * User event templates
 */
export const USER_TEMPLATES = {
  [WEBHOOK_EVENTS.USER_REGISTERED]: (user) =>
    createBasePayload(WEBHOOK_EVENTS.USER_REGISTERED, {
      user_id: user.id,
      email: user.email,
      name: user.name,
      registration_source: user.source,
      registered_at: user.createdAt,
    }),
};

/**
 * Catalog event templates
 */
export const CATALOG_TEMPLATES = {
  [WEBHOOK_EVENTS.PRODUCT_CREATED]: (product) =>
    createBasePayload(WEBHOOK_EVENTS.PRODUCT_CREATED, {
      product_id: product.id,
      sku: product.sku,
      name: product.name,
      category: product.category,
      price: product.price,
      currency: product.currency,
      created_at: product.createdAt,
    }),

  [WEBHOOK_EVENTS.CATALOG_SYNCED]: (sync) =>
    createBasePayload(WEBHOOK_EVENTS.CATALOG_SYNCED, {
      sync_id: sync.id,
      products_added: sync.added,
      products_updated: sync.updated,
      products_deleted: sync.deleted,
      synced_at: sync.syncedAt,
    }),
};

/**
 * Get event template
 */
export const getEventTemplate = (eventType, data) => {
  const templates = {
    ...ORDER_TEMPLATES,
    ...DESIGN_TEMPLATES,
    ...PAYMENT_TEMPLATES,
    ...USER_TEMPLATES,
    ...CATALOG_TEMPLATES,
  };

  const template = templates[eventType];
  if (!template) {
    throw new Error(`No template found for event: ${eventType}`);
  }

  return template(data);
};

/**
 * Sample payloads for testing
 */
export const SAMPLE_PAYLOADS = {
  [WEBHOOK_EVENTS.ORDER_CREATED]: {
    id: 'ord_1234567890',
    orderNumber: 'KX-2026-001',
    customerId: 'cust_123',
    customerEmail: 'customer@example.com',
    customerName: 'Jean Dupont',
    items: [
      { sku: 'CAB-001', quantity: 2, price: 299.99 },
      { sku: 'WKT-002', quantity: 1, price: 599.99 },
    ],
    totalAmount: 1199.97,
    currency: 'EUR',
    status: 'pending',
    createdAt: '2026-01-10T10:00:00Z',
  },

  [WEBHOOK_EVENTS.PAYMENT_SUCCEEDED]: {
    id: 'pay_9876543210',
    orderId: 'ord_1234567890',
    amount: 1199.97,
    currency: 'EUR',
    paymentMethod: 'card',
    processedAt: '2026-01-10T10:05:00Z',
  },

  [WEBHOOK_EVENTS.DESIGN_COMPLETED]: {
    id: 'dsg_456789',
    userId: 'user_123',
    name: 'Ma Cuisine Moderne',
    previewUrl: 'https://cdn.kitchenxpert.com/designs/456789/preview.jpg',
    pdfUrl: 'https://cdn.kitchenxpert.com/designs/456789/plan.pdf',
    completedAt: '2026-01-10T11:00:00Z',
  },
};

export default {
  getEventTemplate,
  ORDER_TEMPLATES,
  DESIGN_TEMPLATES,
  PAYMENT_TEMPLATES,
  USER_TEMPLATES,
  CATALOG_TEMPLATES,
  SAMPLE_PAYLOADS,
};
