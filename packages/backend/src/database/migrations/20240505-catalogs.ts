/**
 * Catalogs Migration
 * Creates product catalog tables
 */

import type { Migration, Transaction } from './migration-runner';

export const CatalogsMigration: Migration = {
  id: '20240505-catalogs',
  name: 'Catalogs Tables',
  timestamp: 20240505000000,

  async up(tx: Transaction): Promise<void> {
    // Product type enum
    await tx.execute(`
      DO $$ BEGIN
        CREATE TYPE product_type AS ENUM (
          'cabinet', 'countertop', 'appliance', 'sink',
          'faucet', 'lighting', 'hardware', 'accessory'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$
    `);

    // Categories table
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS catalog_categories (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        parent_id UUID REFERENCES catalog_categories(id) ON DELETE SET NULL,
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        image_url VARCHAR(500),
        display_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Brands table
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS catalog_brands (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) NOT NULL UNIQUE,
        logo_url VARCHAR(500),
        website VARCHAR(255),
        description TEXT,
        country VARCHAR(100),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Catalog items table
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS catalog_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        sku VARCHAR(100) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category_id UUID REFERENCES catalog_categories(id),
        brand_id UUID REFERENCES catalog_brands(id),
        product_type product_type NOT NULL,

        -- Dimensions (all in cm for consistency)
        width DECIMAL(10,2) NOT NULL,
        height DECIMAL(10,2) NOT NULL,
        depth DECIMAL(10,2) NOT NULL,
        dimension_unit VARCHAR(10) DEFAULT 'cm',
        weight DECIMAL(10,2),
        weight_unit VARCHAR(10) DEFAULT 'kg',

        -- Pricing
        price DECIMAL(10,2),
        original_price DECIMAL(10,2),
        currency VARCHAR(3) DEFAULT 'EUR',
        discount_percent DECIMAL(5,2),
        discount_valid_until TIMESTAMP,

        -- Availability
        in_stock BOOLEAN DEFAULT TRUE,
        stock_quantity INTEGER DEFAULT 0,
        lead_time_days INTEGER,
        available_regions JSONB DEFAULT '[]',

        -- Product details
        materials JSONB DEFAULT '[]',
        colors JSONB DEFAULT '[]',
        specifications JSONB DEFAULT '{}',
        features JSONB DEFAULT '[]',
        tags JSONB DEFAULT '[]',

        -- Media
        primary_image_url VARCHAR(500),
        images JSONB DEFAULT '[]',
        model_3d_url VARCHAR(500),

        -- Rating
        rating_average DECIMAL(3,2),
        rating_count INTEGER DEFAULT 0,

        -- Status
        is_active BOOLEAN DEFAULT TRUE,
        is_featured BOOLEAN DEFAULT FALSE,

        -- Metadata
        manufacturer_reference VARCHAR(100),
        barcode VARCHAR(50),
        metadata JSONB DEFAULT '{}',

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Catalog item variants (colors, sizes, etc.)
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS catalog_item_variants (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        item_id UUID NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
        sku VARCHAR(100) NOT NULL UNIQUE,
        name VARCHAR(255),

        -- Variant specifics
        color VARCHAR(50),
        color_hex VARCHAR(7),
        material VARCHAR(100),
        finish VARCHAR(100),

        -- Dimensions override
        width DECIMAL(10,2),
        height DECIMAL(10,2),
        depth DECIMAL(10,2),

        -- Pricing override
        price DECIMAL(10,2),
        original_price DECIMAL(10,2),

        -- Availability
        in_stock BOOLEAN DEFAULT TRUE,
        stock_quantity INTEGER DEFAULT 0,

        -- Media
        image_url VARCHAR(500),

        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Product reviews
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS catalog_reviews (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        item_id UUID NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        title VARCHAR(255),
        content TEXT,
        pros JSONB DEFAULT '[]',
        cons JSONB DEFAULT '[]',
        verified_purchase BOOLEAN DEFAULT FALSE,
        helpful_votes INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(item_id, user_id)
      )
    `);

    // Related/compatible products
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS catalog_related_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        item_id UUID NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
        related_item_id UUID NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
        relation_type VARCHAR(50) NOT NULL,
        display_order INTEGER DEFAULT 0,
        UNIQUE(item_id, related_item_id, relation_type)
      )
    `);

    // Create indexes
    await tx.execute(
      `CREATE INDEX IF NOT EXISTS idx_catalog_categories_parent ON catalog_categories(parent_id)`
    );
    await tx.execute(
      `CREATE INDEX IF NOT EXISTS idx_catalog_categories_slug ON catalog_categories(slug)`
    );
    await tx.execute(
      `CREATE INDEX IF NOT EXISTS idx_catalog_items_category ON catalog_items(category_id)`
    );
    await tx.execute(
      `CREATE INDEX IF NOT EXISTS idx_catalog_items_brand ON catalog_items(brand_id)`
    );
    await tx.execute(
      `CREATE INDEX IF NOT EXISTS idx_catalog_items_type ON catalog_items(product_type)`
    );
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_catalog_items_sku ON catalog_items(sku)`);
    await tx.execute(
      `CREATE INDEX IF NOT EXISTS idx_catalog_items_active ON catalog_items(is_active)`
    );
    await tx.execute(
      `CREATE INDEX IF NOT EXISTS idx_catalog_items_featured ON catalog_items(is_featured)`
    );
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_catalog_items_price ON catalog_items(price)`);
    await tx.execute(
      `CREATE INDEX IF NOT EXISTS idx_catalog_variants_item ON catalog_item_variants(item_id)`
    );
    await tx.execute(
      `CREATE INDEX IF NOT EXISTS idx_catalog_reviews_item ON catalog_reviews(item_id)`
    );
    await tx.execute(
      `CREATE INDEX IF NOT EXISTS idx_catalog_reviews_user ON catalog_reviews(user_id)`
    );
    await tx.execute(
      `CREATE INDEX IF NOT EXISTS idx_catalog_related_item ON catalog_related_items(item_id)`
    );

    // Full-text search index
    await tx.execute(`
      CREATE INDEX IF NOT EXISTS idx_catalog_items_search ON catalog_items
      USING gin(to_tsvector('french', name || ' ' || COALESCE(description, '')))
    `);

    // Apply updated_at triggers
    await tx.execute(`
      DROP TRIGGER IF EXISTS update_catalog_items_updated_at ON catalog_items;
      CREATE TRIGGER update_catalog_items_updated_at
        BEFORE UPDATE ON catalog_items
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `);
  },

  async down(tx: Transaction): Promise<void> {
    await tx.execute(`DROP TRIGGER IF EXISTS update_catalog_items_updated_at ON catalog_items`);
    await tx.execute(`DROP TABLE IF EXISTS catalog_related_items CASCADE`);
    await tx.execute(`DROP TABLE IF EXISTS catalog_reviews CASCADE`);
    await tx.execute(`DROP TABLE IF EXISTS catalog_item_variants CASCADE`);
    await tx.execute(`DROP TABLE IF EXISTS catalog_items CASCADE`);
    await tx.execute(`DROP TABLE IF EXISTS catalog_brands CASCADE`);
    await tx.execute(`DROP TABLE IF EXISTS catalog_categories CASCADE`);
    await tx.execute(`DROP TYPE IF EXISTS product_type CASCADE`);
  },
};

export default CatalogsMigration;
