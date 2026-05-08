/**
 * Monitoring Seed
 * Sample monitoring data for testing dashboards
 */

import logger from '../../utils/logger';

import type { Seed, Transaction } from './seed-runner';

export const MonitoringSeed: Seed = {
  id: 'monitoring-seed',
  name: 'Sample Monitoring Data',
  order: 80,

  async run(tx: Transaction): Promise<void> {
    // Sample health check results
    await tx.execute(`
      INSERT INTO health_check_results (check_id, status, response_time_ms, message, details)
      SELECT
        hc.id,
        status::health_status,
        response_time_ms,
        message,
        details::jsonb
      FROM health_checks hc
      CROSS JOIN (VALUES
        ('healthy', 12, 'Database responding', '{"connections": 15, "maxConnections": 100}'),
        ('healthy', 8, 'Database responding', '{"connections": 18, "maxConnections": 100}'),
        ('healthy', 15, 'Database responding', '{"connections": 12, "maxConnections": 100}')
      ) AS t(status, response_time_ms, message, details)
      WHERE hc.name = 'database'
      LIMIT 3
    `);

    await tx.execute(`
      INSERT INTO health_check_results (check_id, status, response_time_ms, message, details)
      SELECT
        hc.id,
        status::health_status,
        response_time_ms,
        message,
        details::jsonb
      FROM health_checks hc
      CROSS JOIN (VALUES
        ('healthy', 2, 'Redis PONG', '{"usedMemory": "45MB", "connectedClients": 8}'),
        ('healthy', 1, 'Redis PONG', '{"usedMemory": "46MB", "connectedClients": 10}')
      ) AS t(status, response_time_ms, message, details)
      WHERE hc.name = 'redis'
      LIMIT 2
    `);

    // Sample system metrics
    await tx.execute(`
      INSERT INTO system_metrics (metric_name, metric_type, value, unit, tags, recorded_at)
      VALUES
        -- CPU metrics
        ('cpu_usage', 'gauge', 45.5, 'percent', '{"host": "app-server-1"}', CURRENT_TIMESTAMP - INTERVAL '5 minutes'),
        ('cpu_usage', 'gauge', 52.3, 'percent', '{"host": "app-server-1"}', CURRENT_TIMESTAMP - INTERVAL '4 minutes'),
        ('cpu_usage', 'gauge', 38.7, 'percent', '{"host": "app-server-1"}', CURRENT_TIMESTAMP - INTERVAL '3 minutes'),
        ('cpu_usage', 'gauge', 41.2, 'percent', '{"host": "app-server-1"}', CURRENT_TIMESTAMP - INTERVAL '2 minutes'),
        ('cpu_usage', 'gauge', 44.8, 'percent', '{"host": "app-server-1"}', CURRENT_TIMESTAMP - INTERVAL '1 minute'),

        -- Memory metrics
        ('memory_usage', 'gauge', 68.2, 'percent', '{"host": "app-server-1"}', CURRENT_TIMESTAMP - INTERVAL '5 minutes'),
        ('memory_usage', 'gauge', 69.1, 'percent', '{"host": "app-server-1"}', CURRENT_TIMESTAMP - INTERVAL '4 minutes'),
        ('memory_usage', 'gauge', 67.8, 'percent', '{"host": "app-server-1"}', CURRENT_TIMESTAMP - INTERVAL '3 minutes'),
        ('memory_usage', 'gauge', 70.2, 'percent', '{"host": "app-server-1"}', CURRENT_TIMESTAMP - INTERVAL '2 minutes'),
        ('memory_usage', 'gauge', 69.5, 'percent', '{"host": "app-server-1"}', CURRENT_TIMESTAMP - INTERVAL '1 minute'),

        -- Disk metrics
        ('disk_usage', 'gauge', 54.3, 'percent', '{"host": "app-server-1", "mount": "/"}', CURRENT_TIMESTAMP),

        -- Network metrics
        ('network_in', 'counter', 1567890, 'bytes', '{"host": "app-server-1"}', CURRENT_TIMESTAMP),
        ('network_out', 'counter', 2345678, 'bytes', '{"host": "app-server-1"}', CURRENT_TIMESTAMP),

        -- Application metrics
        ('active_users', 'gauge', 42, 'count', '{}', CURRENT_TIMESTAMP),
        ('api_requests', 'counter', 15678, 'count', '{"endpoint": "/api"}', CURRENT_TIMESTAMP),
        ('ai_generations', 'counter', 234, 'count', '{}', CURRENT_TIMESTAMP)
    `);

    // Sample performance metrics
    await tx.execute(`
      INSERT INTO performance_metrics (endpoint, method, status_code, response_time_ms, user_id, recorded_at)
      VALUES
        ('/api/projects', 'GET', 200, 45, '44444444-4444-4444-4444-444444444444', CURRENT_TIMESTAMP - INTERVAL '10 minutes'),
        ('/api/projects', 'POST', 201, 234, '44444444-4444-4444-4444-444444444444', CURRENT_TIMESTAMP - INTERVAL '9 minutes'),
        ('/api/catalog/items', 'GET', 200, 89, '22222222-2222-2222-2222-222222222222', CURRENT_TIMESTAMP - INTERVAL '8 minutes'),
        ('/api/ai/generate', 'POST', 200, 3456, '22222222-2222-2222-2222-222222222222', CURRENT_TIMESTAMP - INTERVAL '7 minutes'),
        ('/api/ai/generate', 'POST', 200, 4123, '33333333-3333-3333-3333-333333333333', CURRENT_TIMESTAMP - INTERVAL '6 minutes'),
        ('/api/kitchens', 'GET', 200, 67, '44444444-4444-4444-4444-444444444444', CURRENT_TIMESTAMP - INTERVAL '5 minutes'),
        ('/api/projects/export', 'GET', 200, 1890, '22222222-2222-2222-2222-222222222222', CURRENT_TIMESTAMP - INTERVAL '4 minutes'),
        ('/api/auth/login', 'POST', 200, 156, NULL, CURRENT_TIMESTAMP - INTERVAL '3 minutes'),
        ('/api/users/me', 'GET', 200, 23, '44444444-4444-4444-4444-444444444444', CURRENT_TIMESTAMP - INTERVAL '2 minutes'),
        ('/api/catalog/search', 'GET', 200, 178, '55555555-5555-5555-5555-555555555555', CURRENT_TIMESTAMP - INTERVAL '1 minute')
    `);

    // Sample AI metrics
    await tx.execute(`
      INSERT INTO ai_metrics (
        operation_type, user_id, kitchen_id, input_dimensions,
        configurations_generated, best_score, processing_time_ms,
        catalog_items_evaluated, constraints_count, success
      ) VALUES
        ('generate_configuration', '44444444-4444-4444-4444-444444444444', 'k1000000-0000-0000-0000-000000000001',
         '{"width": 380, "length": 320, "height": 250}',
         5, 0.87, 3420, 28, 3, true),
        ('generate_configuration', '22222222-2222-2222-2222-222222222222', 'k1000000-0000-0000-0000-000000000003',
         '{"width": 450, "length": 400, "height": 260}',
         5, 0.92, 4150, 35, 5, true),
        ('generate_configuration', '33333333-3333-3333-3333-333333333333', 'k1000000-0000-0000-0000-000000000004',
         '{"width": 500, "length": 450, "height": 260}',
         5, 0.89, 3890, 42, 4, true),
        ('optimize_layout', '44444444-4444-4444-4444-444444444444', 'k1000000-0000-0000-0000-000000000001',
         '{"width": 380, "length": 320, "height": 250}',
         3, 0.91, 1250, 28, 3, true),
        ('suggest_products', '55555555-5555-5555-5555-555555555555', 'k1000000-0000-0000-0000-000000000002',
         '{"width": 280, "length": 60, "height": 250}',
         10, NULL, 890, 45, 1, true)
    `);

    // Sample alerts
    await tx.execute(`
      INSERT INTO alerts (name, severity, message, status, details, triggered_at)
      VALUES
        ('Latence API élevée', 'warning',
         'Latence P95 API supérieure à 2s sur /api/ai/generate',
         'resolved',
         '{"endpoint": "/api/ai/generate", "p95": 4500, "threshold": 2000}',
         CURRENT_TIMESTAMP - INTERVAL '2 hours'),
        ('Utilisation mémoire', 'info',
         'Utilisation mémoire proche du seuil (85%)',
         'resolved',
         '{"current": 82, "threshold": 90}',
         CURRENT_TIMESTAMP - INTERVAL '1 day')
    `);

    // Sample error logs
    await tx.execute(`
      INSERT INTO error_logs (
        error_type, error_message, stack_trace, fingerprint,
        occurrence_count, user_id, endpoint, environment
      ) VALUES
        ('ValidationError', 'Dimensions de cuisine invalides: largeur minimum 200cm',
         'ValidationError: Dimensions de cuisine invalides\n  at KitchenService.validate (kitchen-service.ts:234)\n  at async createKitchen (kitchen-controller.ts:45)',
         'abc123def456',
         3, '77777777-7777-7777-7777-777777777777', '/api/kitchens', 'production'),
        ('CatalogError', 'Produit non trouvé dans le catalogue',
         'CatalogError: Product not found\n  at CatalogService.getById (catalog-service.ts:89)',
         'def456ghi789',
         1, '44444444-4444-4444-4444-444444444444', '/api/catalog/items/xxx', 'production')
    `);

    logger.info('[Seed] Created sample monitoring metrics, alerts, and error logs');
  },

  async cleanup(tx: Transaction): Promise<void> {
    await tx.execute(`DELETE FROM error_logs`);
    await tx.execute(`DELETE FROM alerts`);
    await tx.execute(`DELETE FROM ai_metrics`);
    await tx.execute(`DELETE FROM performance_metrics`);
    await tx.execute(`DELETE FROM system_metrics`);
    await tx.execute(`DELETE FROM health_check_results`);
  },
};

export default MonitoringSeed;
