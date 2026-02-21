/**
 * Kitchens Migration
 * Creates kitchen layout and design tables
 */

import type { Migration, Transaction } from './migration-runner';

export const KitchensMigration: Migration = {
  id: '20240503-kitchens',
  name: 'Kitchens Tables',
  timestamp: 20240503000000,

  async up(tx: Transaction): Promise<void> {
    // Kitchen layouts enum
    await tx.execute(`
      DO $$ BEGIN
        CREATE TYPE layout_type AS ENUM (
          'I-shaped', 'L-shaped', 'U-shaped', 'G-shaped',
          'parallel', 'island', 'peninsula', 'custom'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$
    `);

    await tx.execute(`
      DO $$ BEGIN
        CREATE TYPE kitchen_zone AS ENUM (
          'cooking', 'preparation', 'cleaning', 'storage', 'cold', 'service'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$
    `);

    // Kitchen layouts table
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS kitchen_layouts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id UUID NOT NULL,
        name VARCHAR(255) NOT NULL,
        layout_type layout_type NOT NULL,
        dimensions JSONB NOT NULL,
        walls JSONB DEFAULT '[]',
        openings JSONB DEFAULT '[]',
        zones JSONB DEFAULT '[]',
        work_triangle JSONB,
        metadata JSONB DEFAULT '{}',
        is_active BOOLEAN DEFAULT TRUE,
        version INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Kitchen item placements table
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS kitchen_placements (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        layout_id UUID NOT NULL REFERENCES kitchen_layouts(id) ON DELETE CASCADE,
        catalog_item_id UUID,
        item_type VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        position JSONB NOT NULL,
        rotation DECIMAL(5,2) DEFAULT 0,
        dimensions JSONB NOT NULL,
        wall_side VARCHAR(20),
        zone kitchen_zone,
        connections JSONB DEFAULT '[]',
        customizations JSONB DEFAULT '{}',
        alternative_items JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Kitchen countertops table
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS kitchen_countertops (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        layout_id UUID NOT NULL REFERENCES kitchen_layouts(id) ON DELETE CASCADE,
        points JSONB NOT NULL,
        material VARCHAR(100) NOT NULL,
        color VARCHAR(50),
        thickness DECIMAL(5,2) DEFAULT 3,
        area DECIMAL(10,2),
        cutouts JSONB DEFAULT '[]',
        edge_profiles JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // AI generated configurations table
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS ai_configurations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id UUID NOT NULL,
        user_id UUID NOT NULL,
        room_specifications JSONB NOT NULL,
        user_preferences JSONB DEFAULT '{}',
        layout_type layout_type NOT NULL,
        score INTEGER,
        score_breakdown JSONB,
        cost_estimate JSONB,
        statistics JSONB,
        recommendations JSONB DEFAULT '[]',
        generation_metadata JSONB,
        is_selected BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // AI configuration placements
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS ai_configuration_placements (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        configuration_id UUID NOT NULL REFERENCES ai_configurations(id) ON DELETE CASCADE,
        catalog_item_id UUID,
        position JSONB NOT NULL,
        rotation DECIMAL(5,2) DEFAULT 0,
        wall_side VARCHAR(20),
        zone kitchen_zone,
        connections JSONB DEFAULT '[]',
        alternative_items JSONB DEFAULT '[]'
      )
    `);

    // Create indexes
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_kitchen_layouts_project_id ON kitchen_layouts(project_id)`);
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_kitchen_placements_layout_id ON kitchen_placements(layout_id)`);
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_kitchen_placements_catalog_item ON kitchen_placements(catalog_item_id)`);
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_kitchen_countertops_layout_id ON kitchen_countertops(layout_id)`);
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_ai_configurations_project_id ON ai_configurations(project_id)`);
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_ai_configurations_user_id ON ai_configurations(user_id)`);
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_ai_config_placements_config_id ON ai_configuration_placements(configuration_id)`);

    // Apply updated_at triggers
    await tx.execute(`
      DROP TRIGGER IF EXISTS update_kitchen_layouts_updated_at ON kitchen_layouts;
      CREATE TRIGGER update_kitchen_layouts_updated_at
        BEFORE UPDATE ON kitchen_layouts
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `);

    await tx.execute(`
      DROP TRIGGER IF EXISTS update_kitchen_placements_updated_at ON kitchen_placements;
      CREATE TRIGGER update_kitchen_placements_updated_at
        BEFORE UPDATE ON kitchen_placements
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `);
  },

  async down(tx: Transaction): Promise<void> {
    await tx.execute(`DROP TRIGGER IF EXISTS update_kitchen_placements_updated_at ON kitchen_placements`);
    await tx.execute(`DROP TRIGGER IF EXISTS update_kitchen_layouts_updated_at ON kitchen_layouts`);
    await tx.execute(`DROP TABLE IF EXISTS ai_configuration_placements CASCADE`);
    await tx.execute(`DROP TABLE IF EXISTS ai_configurations CASCADE`);
    await tx.execute(`DROP TABLE IF EXISTS kitchen_countertops CASCADE`);
    await tx.execute(`DROP TABLE IF EXISTS kitchen_placements CASCADE`);
    await tx.execute(`DROP TABLE IF EXISTS kitchen_layouts CASCADE`);
    await tx.execute(`DROP TYPE IF EXISTS kitchen_zone CASCADE`);
    await tx.execute(`DROP TYPE IF EXISTS layout_type CASCADE`);
  },
};

export default KitchensMigration;
