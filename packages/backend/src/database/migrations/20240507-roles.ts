/**
 * Roles Migration
 * Creates role management tables
 */

import type { Migration, Transaction } from './migration-runner';

export const RolesMigration: Migration = {
  id: '20240507-roles',
  name: 'Roles Tables',
  timestamp: 20240507000000,

  async up(tx: Transaction): Promise<void> {
    // Role hierarchy levels
    await tx.execute(`
      DO $$ BEGIN
        CREATE TYPE role_level AS ENUM (
          'system', 'admin', 'manager', 'professional', 'user', 'guest'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$
    `);

    // Roles table
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS roles (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL UNIQUE,
        display_name VARCHAR(255) NOT NULL,
        description TEXT,
        level role_level NOT NULL DEFAULT 'user',
        priority INTEGER DEFAULT 0,
        features JSONB DEFAULT '{}',
        limits JSONB DEFAULT '{}',
        color VARCHAR(7),
        icon VARCHAR(50),
        badge VARCHAR(50),
        is_system BOOLEAN DEFAULT FALSE,
        is_default BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Role hierarchy for inheritance
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS role_hierarchy (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        parent_role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        child_role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        inherit_permissions BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(parent_role_id, child_role_id),
        CHECK(parent_role_id != child_role_id)
      )
    `);

    // User roles junction table
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS user_roles (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        assigned_by UUID REFERENCES users(id),
        expires_at TIMESTAMP,
        is_primary BOOLEAN DEFAULT FALSE,
        context JSONB DEFAULT '{}',
        UNIQUE(user_id, role_id)
      )
    `);

    // Role change history
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS role_changes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        from_role_id UUID REFERENCES roles(id),
        to_role_id UUID REFERENCES roles(id),
        changed_by UUID REFERENCES users(id),
        reason VARCHAR(500),
        change_type VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name)`);
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_roles_level ON roles(level)`);
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_roles_priority ON roles(priority)`);
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id)`);
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id)`);
    await tx.execute(
      `CREATE INDEX IF NOT EXISTS idx_user_roles_primary ON user_roles(user_id, is_primary)`
    );
    await tx.execute(
      `CREATE INDEX IF NOT EXISTS idx_role_hierarchy_parent ON role_hierarchy(parent_role_id)`
    );
    await tx.execute(
      `CREATE INDEX IF NOT EXISTS idx_role_hierarchy_child ON role_hierarchy(child_role_id)`
    );
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_role_changes_user ON role_changes(user_id)`);

    // Trigger for updated_at
    await tx.execute(`
      DROP TRIGGER IF EXISTS update_roles_updated_at ON roles;
      CREATE TRIGGER update_roles_updated_at
        BEFORE UPDATE ON roles
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `);

    // Insert default roles
    await tx.execute(`
      INSERT INTO roles (name, display_name, description, level, priority, is_system, is_default, features, limits)
      VALUES
        ('super_admin', 'Super Administrateur', 'Accès complet au système', 'system', 100, true, false,
          '{"all": true}',
          '{"maxProjects": -1, "maxAIConfigurations": -1, "maxStorage": -1}'
        ),
        ('admin', 'Administrateur', 'Administration de la plateforme', 'admin', 90, true, false,
          '{"adminPanel": true, "userManagement": true, "analytics": true}',
          '{"maxProjects": -1, "maxAIConfigurations": 100, "maxStorage": 10737418240}'
        ),
        ('professional', 'Professionnel', 'Compte professionnel (cuisiniste, architecte)', 'professional', 50, true, false,
          '{"aiConfigurator": true, "advancedExport": true, "clientManagement": true, "catalogAccess": true}',
          '{"maxProjects": 50, "maxAIConfigurations": 50, "maxStorage": 5368709120}'
        ),
        ('user', 'Utilisateur', 'Utilisateur standard', 'user', 10, true, true,
          '{"aiConfigurator": true, "basicExport": true}',
          '{"maxProjects": 5, "maxAIConfigurations": 10, "maxStorage": 1073741824}'
        ),
        ('guest', 'Invité', 'Accès limité en lecture seule', 'guest', 0, true, false,
          '{"readOnly": true}',
          '{"maxProjects": 0, "maxAIConfigurations": 1, "maxStorage": 0}'
        )
      ON CONFLICT (name) DO NOTHING
    `);
  },

  async down(tx: Transaction): Promise<void> {
    await tx.execute(`DROP TRIGGER IF EXISTS update_roles_updated_at ON roles`);
    await tx.execute(`DROP TABLE IF EXISTS role_changes CASCADE`);
    await tx.execute(`DROP TABLE IF EXISTS user_roles CASCADE`);
    await tx.execute(`DROP TABLE IF EXISTS role_hierarchy CASCADE`);
    await tx.execute(`DROP TABLE IF EXISTS roles CASCADE`);
    await tx.execute(`DROP TYPE IF EXISTS role_level CASCADE`);
  },
};

export default RolesMigration;
