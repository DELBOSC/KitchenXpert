/**
 * Audit Seed
 * Sample audit logs for testing and demo
 */

import type { Seed, Transaction } from './seed-runner';
import logger from '../../utils/logger';

export const AuditSeed: Seed = {
  id: 'audit-seed',
  name: 'Sample Audit Logs',
  order: 70,

  async run(tx: Transaction): Promise<void> {
    // Sample audit log entries
    await tx.execute(`
      INSERT INTO audit_logs (
        user_id, user_email, user_role, action, resource_type, resource_id,
        description, severity, ip_address, endpoint, method, status_code, duration_ms
      )
      SELECT
        '44444444-4444-4444-4444-444444444444',
        'pierre.bernard@email.fr',
        'user',
        action,
        resource_type,
        resource_id::uuid,
        description,
        severity::audit_severity,
        '192.168.1.100'::inet,
        endpoint,
        method,
        status_code,
        duration_ms
      FROM (VALUES
        ('login', 'user', '44444444-4444-4444-4444-444444444444', 'Connexion utilisateur', 'info', '/api/auth/login', 'POST', 200, 156),
        ('create', 'project', 'pr100000-0000-0000-0000-000000000001', 'Création projet: Rénovation cuisine', 'info', '/api/projects', 'POST', 201, 245),
        ('update', 'project', 'pr100000-0000-0000-0000-000000000001', 'Modification dimensions projet', 'info', '/api/projects/pr100000-0000-0000-0000-000000000001', 'PATCH', 200, 89),
        ('ai_generate', 'ai_config', 'ai100000-0000-0000-0000-000000000001', 'Génération configuration IA', 'info', '/api/ai/generate', 'POST', 200, 3420),
        ('read', 'catalog', NULL, 'Consultation catalogue produits', 'debug', '/api/catalog/items', 'GET', 200, 45),
        ('export', 'project', 'pr100000-0000-0000-0000-000000000001', 'Export projet en PDF', 'info', '/api/projects/pr100000-0000-0000-0000-000000000001/export', 'GET', 200, 1890)
      ) AS t(action, resource_type, resource_id, description, severity, endpoint, method, status_code, duration_ms)
    `);

    // Professional user logs
    await tx.execute(`
      INSERT INTO audit_logs (
        user_id, user_email, user_role, action, resource_type, resource_id,
        description, severity, ip_address, endpoint, method, status_code, duration_ms
      )
      SELECT
        '22222222-2222-2222-2222-222222222222',
        'jean.dupont@cuisines-pro.fr',
        'professional',
        action,
        resource_type,
        resource_id::uuid,
        description,
        severity::audit_severity,
        '82.123.45.67'::inet,
        endpoint,
        method,
        status_code,
        duration_ms
      FROM (VALUES
        ('login', 'user', '22222222-2222-2222-2222-222222222222', 'Connexion compte professionnel', 'info', '/api/auth/login', 'POST', 200, 134),
        ('create', 'project', 'pr100000-0000-0000-0000-000000000003', 'Création projet client', 'info', '/api/projects', 'POST', 201, 267),
        ('ai_generate', 'ai_config', NULL, 'Génération configuration IA pour client', 'info', '/api/ai/generate', 'POST', 200, 4150),
        ('ai_generate', 'ai_config', NULL, 'Génération alternative', 'info', '/api/ai/generate', 'POST', 200, 3890),
        ('share', 'project', 'pr100000-0000-0000-0000-000000000003', 'Partage projet avec client', 'info', '/api/projects/pr100000-0000-0000-0000-000000000003/share', 'POST', 200, 78)
      ) AS t(action, resource_type, resource_id, description, severity, endpoint, method, status_code, duration_ms)
    `);

    // Admin user logs
    await tx.execute(`
      INSERT INTO audit_logs (
        user_id, user_email, user_role, action, resource_type, resource_id,
        description, severity, ip_address, endpoint, method, status_code, duration_ms
      )
      SELECT
        '11111111-1111-1111-1111-111111111111',
        'admin@kitchenxpert.com',
        'super_admin',
        action,
        resource_type,
        resource_id,
        description,
        severity::audit_severity,
        '10.0.0.1'::inet,
        endpoint,
        method,
        status_code,
        duration_ms
      FROM (VALUES
        ('login', 'user', NULL, 'Connexion administrateur', 'info', '/api/auth/login', 'POST', 200, 98),
        ('read', 'analytics', NULL, 'Consultation tableau de bord', 'debug', '/api/admin/analytics', 'GET', 200, 234),
        ('create', 'catalog', NULL, 'Import catalogue produits', 'info', '/api/admin/catalog/import', 'POST', 201, 5670),
        ('update', 'role', NULL, 'Modification permissions rôle professional', 'warning', '/api/admin/roles', 'PATCH', 200, 156),
        ('config_change', 'settings', NULL, 'Modification paramètres système', 'warning', '/api/admin/settings', 'PATCH', 200, 89)
      ) AS t(action, resource_type, resource_id, description, severity, endpoint, method, status_code, duration_ms)
    `);

    // Sample security events
    await tx.execute(`
      INSERT INTO security_events (
        user_id, event_type, severity, description, source, ip_address, risk_score
      ) VALUES
        ('77777777-7777-7777-7777-777777777777', 'failed_login', 'warning',
         'Tentative de connexion échouée (3 essais)', 'auth', '185.234.12.45'::inet, 30),
        (NULL, 'rate_limit_exceeded', 'warning',
         'Limite de requêtes dépassée sur /api/catalog', 'api', '203.45.67.89'::inet, 25),
        ('44444444-4444-4444-4444-444444444444', 'password_change', 'info',
         'Changement de mot de passe réussi', 'auth', '192.168.1.100'::inet, 5)
    `);

    // Sample data access logs (GDPR)
    await tx.execute(`
      INSERT INTO data_access_logs (
        accessor_id, data_subject_id, access_type, data_category, purpose, legal_basis, fields_accessed
      ) VALUES
        ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444',
         'read', 'personal_data', 'Support client', 'legitimate_interest',
         '["email", "first_name", "last_name", "phone"]'),
        ('22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444',
         'read', 'project_data', 'Collaboration projet', 'contract',
         '["projects", "kitchens"]'),
        ('11111111-1111-1111-1111-111111111111', NULL,
         'export', 'analytics_data', 'Rapport mensuel', 'legitimate_interest',
         '["aggregated_metrics"]')
    `);

    logger.info('[Seed] Created sample audit logs, security events, and data access logs');
  },

  async cleanup(tx: Transaction): Promise<void> {
    await tx.execute(`DELETE FROM data_access_logs`);
    await tx.execute(`DELETE FROM security_events`);
    await tx.execute(`DELETE FROM audit_logs`);
  },
};

export default AuditSeed;
