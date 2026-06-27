/**
 * Features Migration
 * Creates tables for compliance, installers, renovation, financing,
 * pricing, collaboration, smart home, quotes, workflow, and product enrichment
 */

import type { Migration, Transaction } from './migration-runner';

export const FeaturesMigration: Migration = {
  id: '20240512-features',
  name: 'Features Tables',
  timestamp: 20240512000000,

  async up(tx: Transaction): Promise<void> {
    // 1. Compliance rules
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS compliance_rules (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        code VARCHAR(50) NOT NULL UNIQUE,
        category VARCHAR(50),
        title VARCHAR(255),
        description TEXT,
        severity VARCHAR(20) DEFAULT 'warning',
        condition JSONB,
        fix_suggestion TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        source VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Compliance checks
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS compliance_checks (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        kitchen_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        rules_checked INTEGER DEFAULT 0,
        violations_count INTEGER DEFAULT 0,
        warnings_count INTEGER DEFAULT 0,
        passed BOOLEAN DEFAULT FALSE,
        results JSONB,
        score FLOAT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Installers
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS installers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id VARCHAR(255) NOT NULL UNIQUE,
        company_name VARCHAR(255),
        siret VARCHAR(14),
        description TEXT,
        specialties TEXT[] DEFAULT '{}',
        certifications TEXT[] DEFAULT '{}',
        service_area JSONB,
        avg_rating FLOAT DEFAULT 0,
        review_count INTEGER DEFAULT 0,
        is_verified BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        portfolio JSONB,
        hourly_rate FLOAT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. Installer reviews
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS installer_reviews (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        installer_id UUID REFERENCES installers(id) ON DELETE CASCADE,
        user_id VARCHAR(255) NOT NULL,
        project_id UUID,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        photos TEXT[] DEFAULT '{}',
        is_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 5. Installation projects
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS installation_projects (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        installer_id UUID REFERENCES installers(id),
        user_id VARCHAR(255) NOT NULL,
        kitchen_id VARCHAR(255),
        status VARCHAR(30) DEFAULT 'pending',
        description TEXT,
        estimated_cost FLOAT,
        final_cost FLOAT,
        scheduled_date TIMESTAMP,
        completed_date TIMESTAMP,
        milestones JSONB DEFAULT '[]',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 6. Renovation projects
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS renovation_projects (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id VARCHAR(255) NOT NULL,
        kitchen_id VARCHAR(255),
        before_photos TEXT[] DEFAULT '{}',
        after_design_id VARCHAR(255),
        analysis JSONB,
        comparison JSONB,
        status VARCHAR(30) DEFAULT 'created',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 7. Financing simulations
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS financing_simulations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id VARCHAR(255) NOT NULL,
        total_amount FLOAT NOT NULL,
        down_payment FLOAT DEFAULT 0,
        loan_amount FLOAT NOT NULL,
        duration_months INTEGER NOT NULL,
        results JSONB,
        eco_aids JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 8. Price history
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS price_history (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        product_id VARCHAR(255) NOT NULL,
        brand_id VARCHAR(255) NOT NULL,
        price FLOAT NOT NULL,
        currency VARCHAR(3) DEFAULT 'EUR',
        source VARCHAR(100),
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 9. Price alerts
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS price_alerts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id VARCHAR(255) NOT NULL,
        product_id VARCHAR(255) NOT NULL,
        target_price FLOAT NOT NULL,
        direction VARCHAR(10) NOT NULL DEFAULT 'below',
        is_active BOOLEAN DEFAULT TRUE,
        triggered_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 10. Collaboration invites
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS collaboration_invites (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        kitchen_id VARCHAR(255) NOT NULL,
        inviter_id VARCHAR(255) NOT NULL,
        invitee_email VARCHAR(255) NOT NULL,
        role VARCHAR(30) NOT NULL DEFAULT 'viewer',
        permissions JSONB DEFAULT '{}',
        token VARCHAR(255) NOT NULL UNIQUE,
        status VARCHAR(20) DEFAULT 'pending',
        accepted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP
      )
    `);

    // 11. Smart home plans
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS smart_home_plans (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        kitchen_id VARCHAR(255) NOT NULL UNIQUE,
        user_id VARCHAR(255) NOT NULL,
        devices JSONB DEFAULT '[]',
        automations JSONB DEFAULT '[]',
        coverage JSONB,
        total_watts FLOAT DEFAULT 0,
        estimated_cost FLOAT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 12. Certified quotes
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS certified_quotes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id VARCHAR(255) NOT NULL,
        kitchen_id VARCHAR(255) NOT NULL,
        project_id VARCHAR(255),
        quote_number VARCHAR(50) NOT NULL UNIQUE,
        client_name VARCHAR(200) NOT NULL,
        client_email VARCHAR(255),
        client_address TEXT,
        items JSONB NOT NULL,
        total_ht FLOAT NOT NULL,
        total_tva FLOAT NOT NULL,
        total_ttc FLOAT NOT NULL,
        tva_rate FLOAT DEFAULT 20,
        validity_days INTEGER DEFAULT 30,
        status VARCHAR(20) DEFAULT 'draft',
        signature JSONB,
        signed_at TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 13. Workflow simulations
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS workflow_simulations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        kitchen_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        scenario VARCHAR(100) NOT NULL,
        steps JSONB NOT NULL,
        total_distance FLOAT,
        total_time FLOAT,
        efficiency_score FLOAT,
        bottlenecks JSONB DEFAULT '[]',
        suggestions JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 14. Product enrichments
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS product_enrichments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        product_type VARCHAR(50) NOT NULL,
        product_id VARCHAR(255) NOT NULL,
        brand_id VARCHAR(255) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        raw_description TEXT,
        raw_html TEXT,
        enriched_specs JSONB,
        installation_reqs JSONB,
        warranty JSONB,
        certifications TEXT[] DEFAULT '{}',
        energy_details JSONB,
        confidence FLOAT DEFAULT 0,
        enriched_at TIMESTAMP,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(product_type, product_id)
      )
    `);

    // 15. Compatibility rules catalog
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS compatibility_rules_catalog (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        cabinet_type VARCHAR(100) NOT NULL,
        appliance_type VARCHAR(100) NOT NULL,
        cabinet_width_min INTEGER,
        cabinet_width_max INTEGER,
        cabinet_depth_min INTEGER,
        requires_cutout BOOLEAN DEFAULT FALSE,
        cutout_width INTEGER,
        cutout_depth INTEGER,
        ventilation_gap INTEGER,
        electrical_req VARCHAR(20),
        water_req BOOLEAN DEFAULT FALSE,
        notes TEXT,
        source VARCHAR(20) DEFAULT 'ai',
        confidence FLOAT DEFAULT 0.8,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(cabinet_type, appliance_type, cabinet_width_min)
      )
    `);

    // 16. Product matches
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS product_matches (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        product_type_a VARCHAR(50),
        product_id_a VARCHAR(255),
        brand_id_a VARCHAR(255),
        product_type_b VARCHAR(50),
        product_id_b VARCHAR(255),
        brand_id_b VARCHAR(255),
        match_score FLOAT,
        match_reason TEXT,
        is_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(product_id_a, product_id_b)
      )
    `);

    // ===== Indexes =====

    // Compliance checks indexes
    await tx.execute(
      `CREATE INDEX IF NOT EXISTS idx_compliance_checks_kitchen ON compliance_checks(kitchen_id)`
    );
    await tx.execute(
      `CREATE INDEX IF NOT EXISTS idx_compliance_checks_user ON compliance_checks(user_id)`
    );

    // Installer reviews indexes
    await tx.execute(
      `CREATE INDEX IF NOT EXISTS idx_installer_reviews_installer ON installer_reviews(installer_id)`
    );

    // Installation projects indexes
    await tx.execute(
      `CREATE INDEX IF NOT EXISTS idx_installation_projects_installer ON installation_projects(installer_id)`
    );
    await tx.execute(
      `CREATE INDEX IF NOT EXISTS idx_installation_projects_user ON installation_projects(user_id)`
    );

    // Renovation projects indexes
    await tx.execute(
      `CREATE INDEX IF NOT EXISTS idx_renovation_projects_user ON renovation_projects(user_id)`
    );

    // Financing simulations indexes
    await tx.execute(
      `CREATE INDEX IF NOT EXISTS idx_financing_simulations_user ON financing_simulations(user_id)`
    );

    // Price history indexes
    await tx.execute(
      `CREATE INDEX IF NOT EXISTS idx_price_history_product_recorded ON price_history(product_id, recorded_at)`
    );

    // Price alerts indexes
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_price_alerts_user ON price_alerts(user_id)`);
    await tx.execute(
      `CREATE INDEX IF NOT EXISTS idx_price_alerts_product ON price_alerts(product_id)`
    );

    // Collaboration invites indexes
    await tx.execute(
      `CREATE INDEX IF NOT EXISTS idx_collaboration_invites_kitchen ON collaboration_invites(kitchen_id)`
    );
    await tx.execute(
      `CREATE INDEX IF NOT EXISTS idx_collaboration_invites_email ON collaboration_invites(invitee_email)`
    );
    await tx.execute(
      `CREATE INDEX IF NOT EXISTS idx_collaboration_invites_token ON collaboration_invites(token)`
    );

    // Certified quotes indexes
    await tx.execute(
      `CREATE INDEX IF NOT EXISTS idx_certified_quotes_user ON certified_quotes(user_id)`
    );
    await tx.execute(
      `CREATE INDEX IF NOT EXISTS idx_certified_quotes_kitchen ON certified_quotes(kitchen_id)`
    );

    // Workflow simulations indexes
    await tx.execute(
      `CREATE INDEX IF NOT EXISTS idx_workflow_simulations_kitchen ON workflow_simulations(kitchen_id)`
    );

    // Product enrichments indexes
    await tx.execute(
      `CREATE INDEX IF NOT EXISTS idx_product_enrichments_status ON product_enrichments(status)`
    );
    await tx.execute(
      `CREATE INDEX IF NOT EXISTS idx_product_enrichments_brand ON product_enrichments(brand_id)`
    );
    await tx.execute(
      `CREATE INDEX IF NOT EXISTS idx_product_enrichments_type ON product_enrichments(product_type)`
    );

    // Compatibility rules catalog indexes
    await tx.execute(
      `CREATE INDEX IF NOT EXISTS idx_compatibility_rules_catalog_cabinet ON compatibility_rules_catalog(cabinet_type)`
    );
    await tx.execute(
      `CREATE INDEX IF NOT EXISTS idx_compatibility_rules_catalog_appliance ON compatibility_rules_catalog(appliance_type)`
    );

    // Product matches indexes
    await tx.execute(
      `CREATE INDEX IF NOT EXISTS idx_product_matches_product_a ON product_matches(product_id_a)`
    );
    await tx.execute(
      `CREATE INDEX IF NOT EXISTS idx_product_matches_product_b ON product_matches(product_id_b)`
    );
    await tx.execute(
      `CREATE INDEX IF NOT EXISTS idx_product_matches_score ON product_matches(match_score)`
    );

    // ===== Triggers for updated_at =====

    await tx.execute(`
      DROP TRIGGER IF EXISTS update_compliance_rules_updated_at ON compliance_rules;
      CREATE TRIGGER update_compliance_rules_updated_at
        BEFORE UPDATE ON compliance_rules
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `);

    await tx.execute(`
      DROP TRIGGER IF EXISTS update_installers_updated_at ON installers;
      CREATE TRIGGER update_installers_updated_at
        BEFORE UPDATE ON installers
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `);

    await tx.execute(`
      DROP TRIGGER IF EXISTS update_installation_projects_updated_at ON installation_projects;
      CREATE TRIGGER update_installation_projects_updated_at
        BEFORE UPDATE ON installation_projects
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `);

    await tx.execute(`
      DROP TRIGGER IF EXISTS update_renovation_projects_updated_at ON renovation_projects;
      CREATE TRIGGER update_renovation_projects_updated_at
        BEFORE UPDATE ON renovation_projects
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `);

    await tx.execute(`
      DROP TRIGGER IF EXISTS update_smart_home_plans_updated_at ON smart_home_plans;
      CREATE TRIGGER update_smart_home_plans_updated_at
        BEFORE UPDATE ON smart_home_plans
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `);

    await tx.execute(`
      DROP TRIGGER IF EXISTS update_certified_quotes_updated_at ON certified_quotes;
      CREATE TRIGGER update_certified_quotes_updated_at
        BEFORE UPDATE ON certified_quotes
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `);

    await tx.execute(`
      DROP TRIGGER IF EXISTS update_product_enrichments_updated_at ON product_enrichments;
      CREATE TRIGGER update_product_enrichments_updated_at
        BEFORE UPDATE ON product_enrichments
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `);

    await tx.execute(`
      DROP TRIGGER IF EXISTS update_compatibility_rules_catalog_updated_at ON compatibility_rules_catalog;
      CREATE TRIGGER update_compatibility_rules_catalog_updated_at
        BEFORE UPDATE ON compatibility_rules_catalog
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `);
  },

  async down(tx: Transaction): Promise<void> {
    // Drop triggers first
    await tx.execute(
      `DROP TRIGGER IF EXISTS update_compatibility_rules_catalog_updated_at ON compatibility_rules_catalog`
    );
    await tx.execute(
      `DROP TRIGGER IF EXISTS update_product_enrichments_updated_at ON product_enrichments`
    );
    await tx.execute(
      `DROP TRIGGER IF EXISTS update_certified_quotes_updated_at ON certified_quotes`
    );
    await tx.execute(
      `DROP TRIGGER IF EXISTS update_smart_home_plans_updated_at ON smart_home_plans`
    );
    await tx.execute(
      `DROP TRIGGER IF EXISTS update_renovation_projects_updated_at ON renovation_projects`
    );
    await tx.execute(
      `DROP TRIGGER IF EXISTS update_installation_projects_updated_at ON installation_projects`
    );
    await tx.execute(`DROP TRIGGER IF EXISTS update_installers_updated_at ON installers`);
    await tx.execute(
      `DROP TRIGGER IF EXISTS update_compliance_rules_updated_at ON compliance_rules`
    );

    // Drop tables in reverse order (respecting foreign key dependencies)
    await tx.execute(`DROP TABLE IF EXISTS product_matches CASCADE`);
    await tx.execute(`DROP TABLE IF EXISTS compatibility_rules_catalog CASCADE`);
    await tx.execute(`DROP TABLE IF EXISTS product_enrichments CASCADE`);
    await tx.execute(`DROP TABLE IF EXISTS workflow_simulations CASCADE`);
    await tx.execute(`DROP TABLE IF EXISTS certified_quotes CASCADE`);
    await tx.execute(`DROP TABLE IF EXISTS smart_home_plans CASCADE`);
    await tx.execute(`DROP TABLE IF EXISTS collaboration_invites CASCADE`);
    await tx.execute(`DROP TABLE IF EXISTS price_alerts CASCADE`);
    await tx.execute(`DROP TABLE IF EXISTS price_history CASCADE`);
    await tx.execute(`DROP TABLE IF EXISTS financing_simulations CASCADE`);
    await tx.execute(`DROP TABLE IF EXISTS renovation_projects CASCADE`);
    await tx.execute(`DROP TABLE IF EXISTS installation_projects CASCADE`);
    await tx.execute(`DROP TABLE IF EXISTS installer_reviews CASCADE`);
    await tx.execute(`DROP TABLE IF EXISTS installers CASCADE`);
    await tx.execute(`DROP TABLE IF EXISTS compliance_checks CASCADE`);
    await tx.execute(`DROP TABLE IF EXISTS compliance_rules CASCADE`);
  },
};

export default FeaturesMigration;
