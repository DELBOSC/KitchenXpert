/**
 * Audit Migration
 * Creates audit logging and compliance tables
 */

import type { Migration, Transaction } from './migration-runner';

export const AuditMigration: Migration = {
  id: '20240508-audit',
  name: 'Audit Tables',
  timestamp: 20240508000000,

  async up(tx: Transaction): Promise<void> {
    // Audit action types
    await tx.execute(`
      DO $$ BEGIN
        CREATE TYPE audit_action AS ENUM (
          'create', 'read', 'update', 'delete', 'list',
          'login', 'logout', 'register', 'password_change', 'password_reset',
          'export', 'import', 'share', 'publish', 'archive',
          'ai_generate', 'ai_suggest', 'ai_optimize',
          'payment', 'subscription', 'refund',
          'approve', 'reject', 'suspend', 'restore',
          'config_change', 'permission_change', 'role_change'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$
    `);

    // Audit severity levels
    await tx.execute(`
      DO $$ BEGIN
        CREATE TYPE audit_severity AS ENUM (
          'debug', 'info', 'warning', 'error', 'critical'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$
    `);

    // Main audit log table (partitioned by date)
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID,
        user_email VARCHAR(255),
        user_role VARCHAR(100),
        actor_type VARCHAR(50) DEFAULT 'user',
        action audit_action NOT NULL,
        resource_type VARCHAR(100) NOT NULL,
        resource_id UUID,
        resource_name VARCHAR(255),
        old_values JSONB,
        new_values JSONB,
        changes JSONB,
        description TEXT,
        severity audit_severity DEFAULT 'info',
        tags JSONB DEFAULT '[]',
        ip_address INET,
        user_agent TEXT,
        request_id VARCHAR(100),
        session_id VARCHAR(100),
        country VARCHAR(2),
        region VARCHAR(100),
        city VARCHAR(100),
        endpoint VARCHAR(255),
        method VARCHAR(10),
        status_code INTEGER,
        duration_ms INTEGER,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Security events table for critical security-related events
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS security_events (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID,
        event_type VARCHAR(100) NOT NULL,
        severity audit_severity DEFAULT 'warning',
        description TEXT NOT NULL,
        source VARCHAR(100),
        target VARCHAR(255),
        risk_score INTEGER DEFAULT 0,
        is_blocked BOOLEAN DEFAULT FALSE,
        requires_action BOOLEAN DEFAULT FALSE,
        ip_address INET,
        user_agent TEXT,
        geolocation JSONB,
        resolved BOOLEAN DEFAULT FALSE,
        resolved_by UUID,
        resolved_at TIMESTAMP,
        resolution_notes TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Data access log for GDPR compliance
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS data_access_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        accessor_id UUID,
        data_subject_id UUID,
        access_type VARCHAR(50) NOT NULL,
        data_category VARCHAR(100) NOT NULL,
        purpose VARCHAR(255),
        legal_basis VARCHAR(100),
        fields_accessed JSONB DEFAULT '[]',
        ip_address INET,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Audit retention policies
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS audit_retention_policies (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL UNIQUE,
        resource_type VARCHAR(100),
        severity audit_severity,
        retention_days INTEGER NOT NULL,
        archive_before_delete BOOLEAN DEFAULT TRUE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id)`);
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)`);
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id)`);
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at)`);
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity)`);
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_audit_logs_ip ON audit_logs(ip_address)`);

    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(user_id)`);
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type)`);
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity)`);
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_security_events_unresolved ON security_events(resolved) WHERE resolved = FALSE`);

    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_data_access_accessor ON data_access_logs(accessor_id)`);
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_data_access_subject ON data_access_logs(data_subject_id)`);

    // Insert default retention policies
    await tx.execute(`
      INSERT INTO audit_retention_policies (name, resource_type, severity, retention_days, archive_before_delete)
      VALUES
        ('security_critical', NULL, 'critical', 2555, true),
        ('security_error', NULL, 'error', 365, true),
        ('security_warning', NULL, 'warning', 180, true),
        ('general_info', NULL, 'info', 90, false),
        ('debug_logs', NULL, 'debug', 30, false),
        ('gdpr_data_access', 'data_access', NULL, 2555, true),
        ('ai_operations', 'ai_config', NULL, 365, true)
      ON CONFLICT (name) DO NOTHING
    `);
  },

  async down(tx: Transaction): Promise<void> {
    await tx.execute(`DROP TABLE IF EXISTS audit_retention_policies CASCADE`);
    await tx.execute(`DROP TABLE IF EXISTS data_access_logs CASCADE`);
    await tx.execute(`DROP TABLE IF EXISTS security_events CASCADE`);
    await tx.execute(`DROP TABLE IF EXISTS audit_logs CASCADE`);
    await tx.execute(`DROP TYPE IF EXISTS audit_severity CASCADE`);
    await tx.execute(`DROP TYPE IF EXISTS audit_action CASCADE`);
  },
};

export default AuditMigration;
