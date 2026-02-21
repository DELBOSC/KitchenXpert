/**
 * Initial Migration
 * Creates extensions and base infrastructure
 */

import type { Migration } from './migration-runner';
import type { Transaction } from '../connection';

export const InitMigration: Migration = {
  id: '20240501-init',
  name: 'Initial Setup',
  timestamp: 20240501000000,

  async up(tx: Transaction): Promise<void> {
    // Create extensions
    await tx.execute(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await tx.execute(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    // Create enum types
    await tx.execute(`
      CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'pending');
      CREATE TYPE user_role AS ENUM ('admin', 'user', 'partner', 'guest');
      CREATE TYPE project_status AS ENUM ('draft', 'in_progress', 'review', 'completed', 'archived');
      CREATE TYPE project_visibility AS ENUM ('private', 'shared', 'public');
      CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');
      CREATE TYPE partner_status AS ENUM ('pending', 'active', 'suspended', 'inactive');
      CREATE TYPE partner_type AS ENUM ('manufacturer', 'retailer', 'installer', 'designer', 'distributor', 'service_provider');
    `);

    // Create base tables schema info
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        description TEXT
      )
    `);

    await tx.execute(
      `INSERT INTO schema_version (version, description) VALUES (1, 'Initial schema setup')`,
    );
  },

  async down(tx: Transaction): Promise<void> {
    await tx.execute(`DROP TABLE IF EXISTS schema_version`);

    await tx.execute(`
      DROP TYPE IF EXISTS user_status CASCADE;
      DROP TYPE IF EXISTS user_role CASCADE;
      DROP TYPE IF EXISTS project_status CASCADE;
      DROP TYPE IF EXISTS project_visibility CASCADE;
      DROP TYPE IF EXISTS order_status CASCADE;
      DROP TYPE IF EXISTS partner_status CASCADE;
      DROP TYPE IF EXISTS partner_type CASCADE;
    `);

    await tx.execute(`DROP EXTENSION IF EXISTS "pgcrypto"`);
    await tx.execute(`DROP EXTENSION IF EXISTS "uuid-ossp"`);
  },
};

export default InitMigration;
