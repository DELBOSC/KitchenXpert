/**
 * Webhooks Seed
 * Sample webhook configurations for testing
 *
 * NOTE: Secrets are randomly generated for development/testing only.
 * In production, webhooks should be created through the API with proper secrets.
 */

import crypto from 'crypto';

import logger from '../../utils/logger';

import type { Seed, Transaction } from './seed-runner';

/**
 * Generate a secure random webhook secret
 */
function generateWebhookSecret(): string {
  return `whsec_${crypto.randomBytes(24).toString('hex')}`;
}

export const WebhooksSeed: Seed = {
  id: 'webhooks-seed',
  name: 'Sample Webhooks',
  order: 75,

  async run(tx: Transaction): Promise<void> {
    // Generate secure random secrets for each webhook
    const secrets = {
      crm: generateWebhookSecret(),
      analytics: generateWebhookSecret(),
      artisan: generateWebhookSecret(),
      legacy: generateWebhookSecret(),
    };

    // Sample webhooks for professional users
    // NOTE: Custom headers with API keys are set to empty for seed data
    // Real integrations should configure these through the API
    await tx.execute(`
      INSERT INTO webhooks (
        id, owner_id, name, description, url, secret, events, status, custom_headers
      ) VALUES
        -- Webhook for project notifications
        ('wh100000-0000-0000-0000-000000000001',
         '22222222-2222-2222-2222-222222222222',
         'Notifications CRM',
         'Envoi des événements projets vers notre CRM',
         'https://crm.example.com/api/webhooks/kitchenxpert',
         $1,
         '["project.created", "project.updated", "project.completed"]',
         'active',
         '{}'
        ),

        -- Webhook for AI generation events
        ('wh100000-0000-0000-0000-000000000002',
         '22222222-2222-2222-2222-222222222222',
         'AI Analytics',
         'Suivi des générations IA pour analytics internes',
         'https://analytics.example.com/webhooks',
         $2,
         '["ai.configuration_generated", "ai.configuration_applied"]',
         'active',
         '{}'
        ),

        -- Webhook for partner (Marie Martin)
        ('wh100000-0000-0000-0000-000000000003',
         '33333333-3333-3333-3333-333333333333',
         'Notification clients',
         'Notification automatique des clients',
         'https://partner.example.com/api/notifications',
         $3,
         '["project.published", "project.shared"]',
         'active',
         '{}'
        ),

        -- Paused webhook
        ('wh100000-0000-0000-0000-000000000004',
         '22222222-2222-2222-2222-222222222222',
         'Legacy System',
         'Ancien système - désactivé temporairement',
         'https://old-system.example.com/webhook',
         $4,
         '["project.created"]',
         'paused',
         '{}'
        )
      ON CONFLICT DO NOTHING
    `, [secrets.crm, secrets.analytics, secrets.artisan, secrets.legacy]);

    // Sample webhook deliveries
    await tx.execute(`
      INSERT INTO webhook_deliveries (
        id, webhook_id, event_type, event_id, payload, status,
        attempt_count, response_status, duration_ms, sent_at, completed_at
      ) VALUES
        -- Successful delivery
        ('wd100000-0000-0000-0000-000000000001',
         'wh100000-0000-0000-0000-000000000001',
         'project.created',
         'pr100000-0000-0000-0000-000000000003',
         '{"event": "project.created", "data": {"id": "pr100000-0000-0000-0000-000000000003", "name": "Client Dupont"}}',
         'success',
         1,
         200,
         234,
         CURRENT_TIMESTAMP - INTERVAL '2 hours',
         CURRENT_TIMESTAMP - INTERVAL '2 hours'
        ),

        -- Another successful delivery
        ('wd100000-0000-0000-0000-000000000002',
         'wh100000-0000-0000-0000-000000000002',
         'ai.configuration_generated',
         'ai100000-0000-0000-0000-000000000001',
         '{"event": "ai.configuration_generated", "data": {"kitchen_id": "k1000000-0000-0000-0000-000000000001", "score": 0.87}}',
         'success',
         1,
         200,
         156,
         CURRENT_TIMESTAMP - INTERVAL '1 hour',
         CURRENT_TIMESTAMP - INTERVAL '1 hour'
        ),

        -- Failed delivery (retrying)
        ('wd100000-0000-0000-0000-000000000003',
         'wh100000-0000-0000-0000-000000000003',
         'project.published',
         NULL,
         '{"event": "project.published", "data": {"id": "test"}}',
         'retrying',
         2,
         503,
         5000,
         CURRENT_TIMESTAMP - INTERVAL '30 minutes',
         NULL
        )
      ON CONFLICT DO NOTHING
    `);

    logger.info('[Seed] Created sample webhooks and deliveries');
  },

  async cleanup(tx: Transaction): Promise<void> {
    await tx.execute(`DELETE FROM webhook_deliveries WHERE id LIKE 'wd100000-%'`);
    await tx.execute(`DELETE FROM webhooks WHERE id LIKE 'wh100000-%'`);
  },
};

export default WebhooksSeed;
