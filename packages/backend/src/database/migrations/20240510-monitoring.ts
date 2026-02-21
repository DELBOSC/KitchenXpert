/**
 * Monitoring Migration
 * Creates health monitoring and metrics tables
 */

import type { Migration, Transaction } from './migration-runner';

export const MonitoringMigration: Migration = {
  id: '20240510-monitoring',
  name: 'Monitoring Tables',
  timestamp: 20240510000000,

  async up(tx: Transaction): Promise<void> {
    // Health check status enum
    await tx.execute(`
      DO $$ BEGIN
        CREATE TYPE health_status AS ENUM (
          'healthy', 'degraded', 'unhealthy', 'unknown'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$
    `);

    // Alert severity enum
    await tx.execute(`
      DO $$ BEGIN
        CREATE TYPE alert_severity AS ENUM (
          'info', 'warning', 'error', 'critical'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$
    `);

    // Health check configurations
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS health_checks (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL UNIQUE,
        display_name VARCHAR(255) NOT NULL,
        description TEXT,
        check_type VARCHAR(50) NOT NULL,
        target VARCHAR(500),
        interval_ms INTEGER DEFAULT 60000,
        timeout_ms INTEGER DEFAULT 10000,
        retries INTEGER DEFAULT 3,
        config JSONB DEFAULT '{}',
        is_critical BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Health check results
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS health_check_results (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        check_id UUID NOT NULL REFERENCES health_checks(id) ON DELETE CASCADE,
        status health_status NOT NULL,
        response_time_ms INTEGER,
        message TEXT,
        details JSONB DEFAULT '{}',
        checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // System metrics storage
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS system_metrics (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        metric_name VARCHAR(100) NOT NULL,
        metric_type VARCHAR(50) NOT NULL,
        value DECIMAL(20,6) NOT NULL,
        unit VARCHAR(20),
        tags JSONB DEFAULT '{}',
        dimensions JSONB DEFAULT '{}',
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Application performance metrics
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS performance_metrics (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        endpoint VARCHAR(255) NOT NULL,
        method VARCHAR(10) NOT NULL,
        status_code INTEGER,
        response_time_ms INTEGER NOT NULL,
        request_size_bytes INTEGER,
        response_size_bytes INTEGER,
        user_id UUID,
        error_type VARCHAR(100),
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Alert rules
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS alert_rules (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        metric_name VARCHAR(100) NOT NULL,
        condition VARCHAR(50) NOT NULL,
        threshold DECIMAL(20,6) NOT NULL,
        duration_ms INTEGER DEFAULT 300000,
        severity alert_severity DEFAULT 'warning',
        notification_channels JSONB DEFAULT '[]',
        cooldown_ms INTEGER DEFAULT 3600000,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Active alerts
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS alerts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        rule_id UUID REFERENCES alert_rules(id) ON DELETE SET NULL,
        name VARCHAR(255) NOT NULL,
        severity alert_severity NOT NULL,
        message TEXT NOT NULL,
        details JSONB DEFAULT '{}',
        status VARCHAR(20) DEFAULT 'active',
        acknowledged BOOLEAN DEFAULT FALSE,
        acknowledged_by UUID,
        acknowledged_at TIMESTAMP,
        resolved BOOLEAN DEFAULT FALSE,
        resolved_at TIMESTAMP,
        triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Error tracking
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS error_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        error_type VARCHAR(100) NOT NULL,
        error_message TEXT NOT NULL,
        stack_trace TEXT,
        fingerprint VARCHAR(64),
        occurrence_count INTEGER DEFAULT 1,
        user_id UUID,
        request_id VARCHAR(100),
        endpoint VARCHAR(255),
        context JSONB DEFAULT '{}',
        environment VARCHAR(20),
        release_version VARCHAR(50),
        first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // AI performance tracking
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS ai_metrics (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        operation_type VARCHAR(50) NOT NULL,
        user_id UUID,
        kitchen_id UUID,
        input_dimensions JSONB,
        configurations_generated INTEGER,
        best_score DECIMAL(5,4),
        processing_time_ms INTEGER,
        catalog_items_evaluated INTEGER,
        constraints_count INTEGER,
        success BOOLEAN DEFAULT TRUE,
        error_message TEXT,
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_health_check_results_check ON health_check_results(check_id)`);
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_health_check_results_status ON health_check_results(status)`);
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_health_check_results_time ON health_check_results(checked_at)`);

    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_system_metrics_name ON system_metrics(metric_name)`);
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_system_metrics_time ON system_metrics(recorded_at)`);
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_system_metrics_tags ON system_metrics USING GIN(tags)`);

    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_performance_metrics_endpoint ON performance_metrics(endpoint)`);
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_performance_metrics_time ON performance_metrics(recorded_at)`);
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_performance_metrics_status ON performance_metrics(status_code)`);

    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status)`);
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity)`);
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_alerts_triggered ON alerts(triggered_at)`);

    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_error_logs_type ON error_logs(error_type)`);
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_error_logs_fingerprint ON error_logs(fingerprint)`);
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_error_logs_last_seen ON error_logs(last_seen_at)`);

    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_ai_metrics_user ON ai_metrics(user_id)`);
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_ai_metrics_operation ON ai_metrics(operation_type)`);
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_ai_metrics_time ON ai_metrics(recorded_at)`);

    // Insert default health checks
    await tx.execute(`
      INSERT INTO health_checks (name, display_name, check_type, target, is_critical, config)
      VALUES
        ('database', 'Base de données PostgreSQL', 'database', 'postgresql', true,
          '{"query": "SELECT 1"}'
        ),
        ('redis', 'Cache Redis', 'redis', 'redis://localhost:6379', false,
          '{"command": "PING"}'
        ),
        ('storage', 'Stockage S3/MinIO', 'storage', 's3://kitchen-assets', false,
          '{"operation": "list"}'
        ),
        ('memory', 'Mémoire système', 'system', 'memory', true,
          '{"threshold": 90}'
        ),
        ('disk', 'Espace disque', 'system', 'disk', true,
          '{"threshold": 85, "path": "/"}'
        ),
        ('api_latency', 'Latence API', 'http', '/api/health', false,
          '{"maxLatencyMs": 500}'
        )
      ON CONFLICT (name) DO NOTHING
    `);

    // Insert default alert rules
    await tx.execute(`
      INSERT INTO alert_rules (name, metric_name, condition, threshold, severity, description)
      VALUES
        ('high_error_rate', 'error_rate', 'greater_than', 5.0, 'error',
          'Taux d''erreur supérieur à 5%'),
        ('high_latency_p95', 'api_latency_p95', 'greater_than', 2000, 'warning',
          'Latence P95 supérieure à 2 secondes'),
        ('low_disk_space', 'disk_usage_percent', 'greater_than', 85, 'warning',
          'Espace disque utilisé supérieur à 85%'),
        ('high_memory_usage', 'memory_usage_percent', 'greater_than', 90, 'error',
          'Utilisation mémoire supérieure à 90%'),
        ('ai_failure_rate', 'ai_failure_rate', 'greater_than', 10, 'warning',
          'Taux d''échec des configurations IA supérieur à 10%'),
        ('database_connections', 'db_active_connections', 'greater_than', 80, 'warning',
          'Nombre de connexions DB actives supérieur à 80%')
      ON CONFLICT (name) DO NOTHING
    `);
  },

  async down(tx: Transaction): Promise<void> {
    await tx.execute(`DROP TABLE IF EXISTS ai_metrics CASCADE`);
    await tx.execute(`DROP TABLE IF EXISTS error_logs CASCADE`);
    await tx.execute(`DROP TABLE IF EXISTS alerts CASCADE`);
    await tx.execute(`DROP TABLE IF EXISTS alert_rules CASCADE`);
    await tx.execute(`DROP TABLE IF EXISTS performance_metrics CASCADE`);
    await tx.execute(`DROP TABLE IF EXISTS system_metrics CASCADE`);
    await tx.execute(`DROP TABLE IF EXISTS health_check_results CASCADE`);
    await tx.execute(`DROP TABLE IF EXISTS health_checks CASCADE`);
    await tx.execute(`DROP TYPE IF EXISTS alert_severity CASCADE`);
    await tx.execute(`DROP TYPE IF EXISTS health_status CASCADE`);
  },
};

export default MonitoringMigration;
