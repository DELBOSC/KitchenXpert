/**
 * Permissions Migration
 * Creates permission management tables
 */

import type { Migration, Transaction } from './migration-runner';

export const PermissionsMigration: Migration = {
  id: '20240506-permissions',
  name: 'Permissions Tables',
  timestamp: 20240506000000,

  async up(tx: Transaction): Promise<void> {
    // Permission resource types
    await tx.execute(`
      DO $$ BEGIN
        CREATE TYPE permission_resource AS ENUM (
          'project', 'kitchen', 'catalog', 'user', 'role',
          'partner', 'webhook', 'analytics', 'audit', 'ai_config',
          'file', 'notification', 'comment', 'settings'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$
    `);

    // Permission action types
    await tx.execute(`
      DO $$ BEGIN
        CREATE TYPE permission_action AS ENUM (
          'create', 'read', 'update', 'delete', 'list',
          'export', 'import', 'share', 'publish', 'archive',
          'manage', 'execute', 'approve', 'reject'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$
    `);

    // Permissions table
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS permissions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        code VARCHAR(100) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        resource permission_resource NOT NULL,
        action permission_action NOT NULL,
        scope VARCHAR(50) DEFAULT 'own',
        conditions JSONB DEFAULT '{}',
        is_system BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Permission groups for easier management
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS permission_groups (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        permissions JSONB DEFAULT '[]',
        is_system BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Role permissions junction table
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        role_id UUID NOT NULL,
        permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
        granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        granted_by UUID,
        conditions JSONB DEFAULT '{}',
        UNIQUE(role_id, permission_id)
      )
    `);

    // User-specific permission overrides
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS user_permissions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
        granted BOOLEAN DEFAULT TRUE,
        granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        granted_by UUID REFERENCES users(id),
        expires_at TIMESTAMP,
        reason VARCHAR(500),
        UNIQUE(user_id, permission_id)
      )
    `);

    // Permission check cache for performance
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS permission_cache (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        permission_code VARCHAR(100) NOT NULL,
        resource_id UUID,
        has_permission BOOLEAN NOT NULL,
        computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        UNIQUE(user_id, permission_code, resource_id)
      )
    `);

    // Create indexes
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_permissions_code ON permissions(code)`);
    await tx.execute(
      `CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource)`
    );
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_permissions_action ON permissions(action)`);
    await tx.execute(
      `CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id)`
    );
    await tx.execute(
      `CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id)`
    );
    await tx.execute(
      `CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id)`
    );
    await tx.execute(
      `CREATE INDEX IF NOT EXISTS idx_permission_cache_user ON permission_cache(user_id)`
    );
    await tx.execute(
      `CREATE INDEX IF NOT EXISTS idx_permission_cache_expires ON permission_cache(expires_at)`
    );

    // Trigger for updated_at
    await tx.execute(`
      DROP TRIGGER IF EXISTS update_permissions_updated_at ON permissions;
      CREATE TRIGGER update_permissions_updated_at
        BEFORE UPDATE ON permissions
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `);
  },

  async down(tx: Transaction): Promise<void> {
    await tx.execute(`DROP TRIGGER IF EXISTS update_permissions_updated_at ON permissions`);
    await tx.execute(`DROP TABLE IF EXISTS permission_cache CASCADE`);
    await tx.execute(`DROP TABLE IF EXISTS user_permissions CASCADE`);
    await tx.execute(`DROP TABLE IF EXISTS role_permissions CASCADE`);
    await tx.execute(`DROP TABLE IF EXISTS permission_groups CASCADE`);
    await tx.execute(`DROP TABLE IF EXISTS permissions CASCADE`);
    await tx.execute(`DROP TYPE IF EXISTS permission_action CASCADE`);
    await tx.execute(`DROP TYPE IF EXISTS permission_resource CASCADE`);
  },
};

export default PermissionsMigration;
