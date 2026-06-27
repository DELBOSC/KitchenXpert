/**
 * Users Migration
 * Creates users and authentication tables
 */

import type { Migration, Transaction } from './migration-runner';

export const UsersMigration: Migration = {
  id: '20240502-users',
  name: 'Users Tables',
  timestamp: 20240502000000,

  async up(tx: Transaction): Promise<void> {
    // Users table
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        phone VARCHAR(50),
        avatar_url VARCHAR(500),
        role user_role DEFAULT 'user',
        status user_status DEFAULT 'pending',
        email_verified BOOLEAN DEFAULT FALSE,
        email_verified_at TIMESTAMP,
        email_verification_token VARCHAR(255),
        password_reset_token VARCHAR(255),
        password_reset_expires_at TIMESTAMP,
        last_login_at TIMESTAMP,
        last_login_ip VARCHAR(45),
        preferences JSONB DEFAULT '{}',
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // User sessions table
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) NOT NULL UNIQUE,
        refresh_token VARCHAR(255) UNIQUE,
        device_info JSONB,
        ip_address VARCHAR(45),
        user_agent TEXT,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // OAuth providers table
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS user_oauth_providers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider VARCHAR(50) NOT NULL,
        provider_user_id VARCHAR(255) NOT NULL,
        access_token TEXT,
        refresh_token TEXT,
        token_expires_at TIMESTAMP,
        profile_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(provider, provider_user_id)
      )
    `);

    // User addresses table
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS user_addresses (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        label VARCHAR(50),
        street VARCHAR(255) NOT NULL,
        city VARCHAR(100) NOT NULL,
        state VARCHAR(100),
        postal_code VARCHAR(20) NOT NULL,
        country VARCHAR(100) NOT NULL,
        is_default BOOLEAN DEFAULT FALSE,
        is_billing BOOLEAN DEFAULT FALSE,
        is_shipping BOOLEAN DEFAULT FALSE,
        latitude DECIMAL(10,8),
        longitude DECIMAL(11,8),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)`);
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`);
    await tx.execute(
      `CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)`
    );
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token)`);
    await tx.execute(
      `CREATE INDEX IF NOT EXISTS idx_user_oauth_provider ON user_oauth_providers(provider, provider_user_id)`
    );
    await tx.execute(
      `CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON user_addresses(user_id)`
    );

    // Create updated_at trigger function
    await tx.execute(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);

    // Apply trigger to users table
    await tx.execute(`
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `);
  },

  async down(tx: Transaction): Promise<void> {
    await tx.execute(`DROP TRIGGER IF EXISTS update_users_updated_at ON users`);
    await tx.execute(`DROP TABLE IF EXISTS user_addresses CASCADE`);
    await tx.execute(`DROP TABLE IF EXISTS user_oauth_providers CASCADE`);
    await tx.execute(`DROP TABLE IF EXISTS user_sessions CASCADE`);
    await tx.execute(`DROP TABLE IF EXISTS users CASCADE`);
  },
};

export default UsersMigration;
