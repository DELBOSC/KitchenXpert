-- ========================================
-- KitchenXpert PostgreSQL Database Initialization
-- ========================================
-- This script initializes the PostgreSQL database for KitchenXpert
-- Run this script as the postgres superuser or database owner
--
-- Usage:
--   psql -U postgres -f init-postgres.sql
--   or from within psql: \i init-postgres.sql
--
-- Version: 1.0.0
-- Requires: PostgreSQL 12+

-- ----------------------------------------
-- Database Creation
-- ----------------------------------------
-- Drop database if exists (CAUTION: This will delete all data!)
-- DROP DATABASE IF EXISTS kitchenxpert;

-- Create database with UTF-8 encoding
CREATE DATABASE kitchenxpert
    WITH
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0
    CONNECTION LIMIT = -1;

-- Connect to the newly created database
\c kitchenxpert

-- ----------------------------------------
-- Extensions
-- ----------------------------------------
-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Cryptographic functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Trigram similarity for full-text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Additional useful extensions
CREATE EXTENSION IF NOT EXISTS "btree_gin";     -- Better indexing for JSONB
CREATE EXTENSION IF NOT EXISTS "btree_gist";    -- Better indexing for ranges
-- CREATE EXTENSION IF NOT EXISTS "postgis";    -- Uncomment if geo features needed

-- ----------------------------------------
-- Custom Types and Enums
-- ----------------------------------------
-- User roles
CREATE TYPE user_role AS ENUM ('admin', 'designer', 'customer', 'guest');

-- Project status
CREATE TYPE project_status AS ENUM ('draft', 'active', 'completed', 'archived', 'deleted');

-- Order status
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');

-- Item category
CREATE TYPE item_category AS ENUM ('cabinet', 'countertop', 'appliance', 'sink', 'fixture', 'hardware', 'accessory', 'other');

-- ----------------------------------------
-- Table: users
-- ----------------------------------------
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'customer',
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    company VARCHAR(255),

    -- Profile
    avatar_url VARCHAR(500),
    bio TEXT,
    preferences JSONB DEFAULT '{}',

    -- Authentication
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    last_login TIMESTAMP,
    login_count INTEGER DEFAULT 0,

    -- Account status
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Indexes for users table
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_is_active ON users(is_active) WHERE is_active = TRUE;

-- ----------------------------------------
-- Table: projects
-- ----------------------------------------
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Basic info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status project_status DEFAULT 'draft',

    -- Project data (stored as JSONB for flexibility)
    data JSONB DEFAULT '{}',  -- Contains 3D layout, dimensions, materials, etc.
    metadata JSONB DEFAULT '{}',  -- Additional metadata

    -- Versioning
    version INTEGER DEFAULT 1,
    parent_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

    -- Sharing and collaboration
    is_public BOOLEAN DEFAULT FALSE,
    shared_with UUID[],  -- Array of user IDs

    -- Analytics
    view_count INTEGER DEFAULT 0,
    last_viewed_at TIMESTAMP,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,

    -- Constraints
    CONSTRAINT name_not_empty CHECK (char_length(name) > 0)
);

-- Indexes for projects table
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX idx_projects_is_public ON projects(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_projects_data_gin ON projects USING GIN (data);

-- Full-text search on project names and descriptions
CREATE INDEX idx_projects_search ON projects USING GIN (
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
);

-- ----------------------------------------
-- Table: catalog_items
-- ----------------------------------------
CREATE TABLE catalog_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Basic info
    sku VARCHAR(100) UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category item_category NOT NULL,
    manufacturer VARCHAR(255),
    model_number VARCHAR(100),

    -- Physical properties
    dimensions JSONB,  -- {width: 24, height: 36, depth: 12, unit: 'inches'}
    weight DECIMAL(10, 2),  -- In pounds or kg
    material VARCHAR(100),
    color VARCHAR(50),
    finish VARCHAR(50),

    -- Pricing
    price DECIMAL(10, 2) NOT NULL,
    list_price DECIMAL(10, 2),  -- MSRP
    cost DECIMAL(10, 2),  -- Internal cost
    currency VARCHAR(3) DEFAULT 'USD',

    -- Inventory
    stock_quantity INTEGER DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 10,
    is_available BOOLEAN DEFAULT TRUE,

    -- Media
    image_url VARCHAR(500),
    images JSONB,  -- Array of image URLs
    model_3d_url VARCHAR(500),  -- URL to 3D model file

    -- Additional metadata
    metadata JSONB DEFAULT '{}',
    tags VARCHAR(50)[],

    -- SEO
    slug VARCHAR(255) UNIQUE,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT price_positive CHECK (price >= 0),
    CONSTRAINT stock_non_negative CHECK (stock_quantity >= 0)
);

-- Indexes for catalog_items table
CREATE INDEX idx_catalog_sku ON catalog_items(sku);
CREATE INDEX idx_catalog_category ON catalog_items(category);
CREATE INDEX idx_catalog_manufacturer ON catalog_items(manufacturer);
CREATE INDEX idx_catalog_price ON catalog_items(price);
CREATE INDEX idx_catalog_is_available ON catalog_items(is_available) WHERE is_available = TRUE;
CREATE INDEX idx_catalog_dimensions_gin ON catalog_items USING GIN (dimensions);

-- Full-text search on catalog items
CREATE INDEX idx_catalog_search ON catalog_items USING GIN (
    to_tsvector('english',
        coalesce(name, '') || ' ' ||
        coalesce(description, '') || ' ' ||
        coalesce(manufacturer, '') || ' ' ||
        coalesce(model_number, '')
    )
);

-- Trigram index for fuzzy search
CREATE INDEX idx_catalog_name_trgm ON catalog_items USING GIN (name gin_trgm_ops);

-- ----------------------------------------
-- Table: orders
-- ----------------------------------------
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

    -- Order details
    order_number VARCHAR(50) UNIQUE NOT NULL,
    status order_status DEFAULT 'pending',

    -- Items (stored as JSONB array)
    items JSONB NOT NULL,  -- [{item_id, quantity, price, ...}]

    -- Pricing
    subtotal DECIMAL(10, 2) NOT NULL,
    tax DECIMAL(10, 2) DEFAULT 0,
    shipping DECIMAL(10, 2) DEFAULT 0,
    discount DECIMAL(10, 2) DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',

    -- Shipping
    shipping_address JSONB,
    billing_address JSONB,
    shipping_method VARCHAR(100),
    tracking_number VARCHAR(100),

    -- Payment
    payment_method VARCHAR(50),
    payment_status VARCHAR(50),
    payment_id VARCHAR(255),  -- External payment processor ID

    -- Notes
    customer_notes TEXT,
    internal_notes TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP,
    shipped_at TIMESTAMP,
    delivered_at TIMESTAMP,
    cancelled_at TIMESTAMP,

    -- Constraints
    CONSTRAINT total_positive CHECK (total >= 0),
    CONSTRAINT subtotal_positive CHECK (subtotal >= 0)
);

-- Indexes for orders table
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_project_id ON orders(project_id);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_items_gin ON orders USING GIN (items);

-- ----------------------------------------
-- Table: sessions (for authentication)
-- ----------------------------------------
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token VARCHAR(500) NOT NULL UNIQUE,
    user_agent TEXT,
    ip_address INET,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Index for cleanup
    CONSTRAINT expires_in_future CHECK (expires_at > created_at)
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_refresh_token ON sessions(refresh_token);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- ----------------------------------------
-- Triggers
-- ----------------------------------------
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_catalog_items_updated_at BEFORE UPDATE ON catalog_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------
-- Functions
-- ----------------------------------------
-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS VARCHAR AS $$
DECLARE
    new_order_number VARCHAR;
BEGIN
    new_order_number := 'KX' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') ||
                        LPAD(nextval('order_number_seq')::TEXT, 6, '0');
    RETURN new_order_number;
END;
$$ LANGUAGE plpgsql;

-- Sequence for order numbers
CREATE SEQUENCE IF NOT EXISTS order_number_seq;

-- Function to search projects
CREATE OR REPLACE FUNCTION search_projects(search_query TEXT)
RETURNS TABLE(project_id UUID, rank REAL) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        ts_rank(to_tsvector('english', coalesce(p.name, '') || ' ' || coalesce(p.description, '')),
                plainto_tsquery('english', search_query)) AS rank
    FROM projects p
    WHERE to_tsvector('english', coalesce(p.name, '') || ' ' || coalesce(p.description, '')) @@
          plainto_tsquery('english', search_query)
    ORDER BY rank DESC;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------
-- Views
-- ----------------------------------------
-- View for active projects with user info
CREATE OR REPLACE VIEW active_projects_with_users AS
SELECT
    p.id,
    p.name,
    p.status,
    p.created_at,
    p.updated_at,
    u.id as user_id,
    u.email,
    u.first_name,
    u.last_name
FROM projects p
JOIN users u ON p.user_id = u.id
WHERE p.status IN ('draft', 'active')
    AND u.is_active = TRUE
    AND u.is_deleted = FALSE;

-- View for catalog items with stock status
CREATE OR REPLACE VIEW catalog_items_with_stock_status AS
SELECT
    *,
    CASE
        WHEN stock_quantity = 0 THEN 'out_of_stock'
        WHEN stock_quantity <= low_stock_threshold THEN 'low_stock'
        ELSE 'in_stock'
    END as stock_status
FROM catalog_items
WHERE is_available = TRUE;

-- ----------------------------------------
-- Initial Data (Optional)
-- ----------------------------------------
-- Create default admin user (CHANGE PASSWORD IMMEDIATELY!)
INSERT INTO users (email, password_hash, role, first_name, last_name, email_verified)
VALUES (
    'admin@kitchenxpert.com',
    crypt('change_me_immediately', gen_salt('bf', 12)),
    'admin',
    'System',
    'Administrator',
    TRUE
)
ON CONFLICT (email) DO NOTHING;

-- ----------------------------------------
-- Permissions
-- ----------------------------------------
-- Create application user (use this for app connections, not superuser)
-- DO $$
-- BEGIN
--     IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'kitchenxpert_app') THEN
--         CREATE USER kitchenxpert_app WITH PASSWORD 'secure_password_here';
--     END IF;
-- END
-- $$;

-- Grant permissions
-- GRANT CONNECT ON DATABASE kitchenxpert TO kitchenxpert_app;
-- GRANT USAGE ON SCHEMA public TO kitchenxpert_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO kitchenxpert_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO kitchenxpert_app;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO kitchenxpert_app;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO kitchenxpert_app;

-- ----------------------------------------
-- Completion
-- ----------------------------------------
-- Display summary
SELECT 'Database initialized successfully!' AS status;
SELECT COUNT(*) AS table_count FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
SELECT COUNT(*) AS extension_count FROM pg_extension WHERE extname NOT IN ('plpgsql');
