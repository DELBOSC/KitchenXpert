/**
 * Projects Migration
 * Creates project and collaboration tables
 */

import type { Migration, Transaction } from './migration-runner';

export const ProjectsMigration: Migration = {
  id: '20240504-projects',
  name: 'Projects Tables',
  timestamp: 20240504000000,

  async up(tx: Transaction): Promise<void> {
    // Projects table
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS projects (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        status project_status DEFAULT 'draft',
        visibility project_visibility DEFAULT 'private',
        dimensions JSONB NOT NULL,
        style JSONB,
        budget JSONB,
        thumbnail VARCHAR(500),
        published_at TIMESTAMP,
        archived_at TIMESTAMP,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Project items table
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS project_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        catalog_item_id UUID,
        item_type VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        position JSONB NOT NULL,
        rotation JSONB NOT NULL,
        dimensions JSONB NOT NULL,
        material VARCHAR(100),
        color VARCHAR(50),
        price DECIMAL(10,2),
        quantity INTEGER DEFAULT 1,
        custom_properties JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Project collaborators table
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS project_collaborators (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL DEFAULT 'viewer',
        permissions JSONB DEFAULT '[]',
        invited_by UUID REFERENCES users(id),
        invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        accepted_at TIMESTAMP,
        last_access_at TIMESTAMP,
        UNIQUE(project_id, user_id)
      )
    `);

    // Project versions (for undo/redo and history)
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS project_versions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        version_number INTEGER NOT NULL,
        snapshot JSONB NOT NULL,
        created_by UUID REFERENCES users(id),
        description VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(project_id, version_number)
      )
    `);

    // Project comments
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS project_comments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        parent_id UUID REFERENCES project_comments(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        position JSONB,
        resolved BOOLEAN DEFAULT FALSE,
        resolved_by UUID REFERENCES users(id),
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id)`);
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)`);
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_projects_visibility ON projects(visibility)`);
    await tx.execute(
      `CREATE INDEX IF NOT EXISTS idx_project_items_project_id ON project_items(project_id)`
    );
    await tx.execute(
      `CREATE INDEX IF NOT EXISTS idx_project_items_catalog_item ON project_items(catalog_item_id)`
    );
    await tx.execute(
      `CREATE INDEX IF NOT EXISTS idx_project_collaborators_project_id ON project_collaborators(project_id)`
    );
    await tx.execute(
      `CREATE INDEX IF NOT EXISTS idx_project_collaborators_user_id ON project_collaborators(user_id)`
    );
    await tx.execute(
      `CREATE INDEX IF NOT EXISTS idx_project_versions_project_id ON project_versions(project_id)`
    );
    await tx.execute(
      `CREATE INDEX IF NOT EXISTS idx_project_comments_project_id ON project_comments(project_id)`
    );

    // Apply updated_at triggers
    await tx.execute(`
      DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
      CREATE TRIGGER update_projects_updated_at
        BEFORE UPDATE ON projects
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `);

    await tx.execute(`
      DROP TRIGGER IF EXISTS update_project_items_updated_at ON project_items;
      CREATE TRIGGER update_project_items_updated_at
        BEFORE UPDATE ON project_items
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `);
  },

  async down(tx: Transaction): Promise<void> {
    await tx.execute(`DROP TRIGGER IF EXISTS update_project_items_updated_at ON project_items`);
    await tx.execute(`DROP TRIGGER IF EXISTS update_projects_updated_at ON projects`);
    await tx.execute(`DROP TABLE IF EXISTS project_comments CASCADE`);
    await tx.execute(`DROP TABLE IF EXISTS project_versions CASCADE`);
    await tx.execute(`DROP TABLE IF EXISTS project_collaborators CASCADE`);
    await tx.execute(`DROP TABLE IF EXISTS project_items CASCADE`);
    await tx.execute(`DROP TABLE IF EXISTS projects CASCADE`);
  },
};

export default ProjectsMigration;
