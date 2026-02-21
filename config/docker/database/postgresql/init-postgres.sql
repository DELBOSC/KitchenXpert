-- KitchenXpert PostgreSQL Initialization Script
-- This script runs on first container startup via docker-entrypoint-initdb.d

-- Create the kitchenxpert database if it does not already exist.
-- Note: The POSTGRES_DB env var in docker-compose already creates the default DB,
-- but this ensures the database exists even when the env var is overridden.
SELECT 'CREATE DATABASE kitchenxpert'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'kitchenxpert')\gexec

-- Connect to the kitchenxpert database
\c kitchenxpert;

-- Create necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Set timezone to UTC
SET timezone = 'UTC';
ALTER DATABASE kitchenxpert SET timezone TO 'UTC';
