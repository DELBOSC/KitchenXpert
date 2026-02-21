/**
 * Webhooks Migration
 * Creates webhook management tables
 */

import type { Migration, Transaction } from './migration-runner';

export const WebhooksMigration: Migration = {
  id: '20240509-webhooks',
  name: 'Webhooks Tables',
  timestamp: 20240509000000,

  async up(tx: Transaction): Promise<void> {
    // Webhook status enum
    await tx.execute(`
      DO $$ BEGIN
        CREATE TYPE webhook_status AS ENUM (
          'active', 'paused', 'disabled', 'failed'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$
    `);

    // Webhook delivery status enum
    await tx.execute(`
      DO $$ BEGIN
        CREATE TYPE delivery_status AS ENUM (
          'pending', 'success', 'failed', 'retrying', 'exhausted'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$
    `);

    // Webhooks configuration table
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS webhooks (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        url VARCHAR(2048) NOT NULL,

        -- Authentication
        secret VARCHAR(255),
        auth_type VARCHAR(50) DEFAULT 'hmac_sha256',
        auth_header VARCHAR(100) DEFAULT 'X-Webhook-Signature',

        -- Events configuration
        events JSONB NOT NULL DEFAULT '[]',
        filters JSONB DEFAULT '{}',

        -- Delivery settings
        timeout_ms INTEGER DEFAULT 30000,
        max_retries INTEGER DEFAULT 3,
        retry_delay_ms INTEGER DEFAULT 60000,

        -- Rate limiting
        rate_limit INTEGER DEFAULT 100,
        rate_limit_window_ms INTEGER DEFAULT 60000,

        -- Headers
        custom_headers JSONB DEFAULT '{}',

        -- Status
        status webhook_status DEFAULT 'active',
        failure_count INTEGER DEFAULT 0,
        last_failure_at TIMESTAMP,
        last_success_at TIMESTAMP,

        -- Metadata
        metadata JSONB DEFAULT '{}',

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Webhook deliveries log
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS webhook_deliveries (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,

        -- Event information
        event_type VARCHAR(100) NOT NULL,
        event_id UUID,
        payload JSONB NOT NULL,

        -- Delivery status
        status delivery_status DEFAULT 'pending',
        attempt_count INTEGER DEFAULT 0,

        -- Request details
        request_url VARCHAR(2048),
        request_headers JSONB,
        request_body TEXT,

        -- Response details
        response_status INTEGER,
        response_headers JSONB,
        response_body TEXT,

        -- Timing
        duration_ms INTEGER,
        scheduled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        sent_at TIMESTAMP,
        completed_at TIMESTAMP,
        next_retry_at TIMESTAMP,

        -- Error information
        error_message TEXT,
        error_code VARCHAR(50),

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Webhook event types registry
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS webhook_event_types (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL UNIQUE,
        display_name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        payload_schema JSONB,
        example_payload JSONB,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_webhooks_owner ON webhooks(owner_id)`);
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_webhooks_status ON webhooks(status)`);
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_webhooks_events ON webhooks USING GIN(events)`);

    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id)`);
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status)`);
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_event ON webhook_deliveries(event_type)`);
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_pending ON webhook_deliveries(next_retry_at) WHERE status IN ('pending', 'retrying')`);
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created ON webhook_deliveries(created_at)`);

    // Trigger for updated_at
    await tx.execute(`
      DROP TRIGGER IF EXISTS update_webhooks_updated_at ON webhooks;
      CREATE TRIGGER update_webhooks_updated_at
        BEFORE UPDATE ON webhooks
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `);

    // Insert default webhook event types
    await tx.execute(`
      INSERT INTO webhook_event_types (name, display_name, description, category)
      VALUES
        ('project.created', 'Projet créé', 'Déclenché quand un nouveau projet est créé', 'project'),
        ('project.updated', 'Projet modifié', 'Déclenché quand un projet est modifié', 'project'),
        ('project.deleted', 'Projet supprimé', 'Déclenché quand un projet est supprimé', 'project'),
        ('project.published', 'Projet publié', 'Déclenché quand un projet est publié', 'project'),
        ('kitchen.created', 'Cuisine créée', 'Déclenché quand une nouvelle cuisine est créée', 'kitchen'),
        ('kitchen.updated', 'Cuisine modifiée', 'Déclenché quand une cuisine est modifiée', 'kitchen'),
        ('ai.configuration_generated', 'Configuration IA générée', 'Déclenché quand l''IA génère une configuration', 'ai'),
        ('ai.configuration_applied', 'Configuration IA appliquée', 'Déclenché quand une config IA est appliquée', 'ai'),
        ('user.registered', 'Utilisateur inscrit', 'Déclenché quand un utilisateur s''inscrit', 'user'),
        ('user.updated', 'Utilisateur modifié', 'Déclenché quand un profil est modifié', 'user'),
        ('catalog.item_added', 'Produit ajouté', 'Déclenché quand un produit est ajouté au catalogue', 'catalog'),
        ('catalog.item_updated', 'Produit modifié', 'Déclenché quand un produit est modifié', 'catalog'),
        ('order.created', 'Commande créée', 'Déclenché quand une commande est créée', 'order'),
        ('order.status_changed', 'Statut commande modifié', 'Déclenché quand le statut change', 'order')
      ON CONFLICT (name) DO NOTHING
    `);
  },

  async down(tx: Transaction): Promise<void> {
    await tx.execute(`DROP TRIGGER IF EXISTS update_webhooks_updated_at ON webhooks`);
    await tx.execute(`DROP TABLE IF EXISTS webhook_event_types CASCADE`);
    await tx.execute(`DROP TABLE IF EXISTS webhook_deliveries CASCADE`);
    await tx.execute(`DROP TABLE IF EXISTS webhooks CASCADE`);
    await tx.execute(`DROP TYPE IF EXISTS delivery_status CASCADE`);
    await tx.execute(`DROP TYPE IF EXISTS webhook_status CASCADE`);
  },
};

export default WebhooksMigration;
