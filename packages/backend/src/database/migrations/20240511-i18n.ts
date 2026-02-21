/**
 * I18n Migration
 * Creates internationalization tables
 */

import type { Migration, Transaction } from './migration-runner';

export const I18nMigration: Migration = {
  id: '20240511-i18n',
  name: 'I18n Tables',
  timestamp: 20240511000000,

  async up(tx: Transaction): Promise<void> {
    // Supported languages
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS languages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        code VARCHAR(10) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        native_name VARCHAR(100) NOT NULL,
        direction VARCHAR(3) DEFAULT 'ltr',
        flag_emoji VARCHAR(10),
        is_default BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        completion_percent INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Translation namespaces (for organizing translations)
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS translation_namespaces (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        parent_id UUID REFERENCES translation_namespaces(id),
        key_count INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Translation keys
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS translation_keys (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        namespace_id UUID REFERENCES translation_namespaces(id) ON DELETE CASCADE,
        key VARCHAR(255) NOT NULL,
        description TEXT,
        context TEXT,
        max_length INTEGER,
        placeholders JSONB DEFAULT '[]',
        tags JSONB DEFAULT '[]',
        is_plural BOOLEAN DEFAULT FALSE,
        is_html BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(namespace_id, key)
      )
    `);

    // Translation values
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS translations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        key_id UUID NOT NULL REFERENCES translation_keys(id) ON DELETE CASCADE,
        language_code VARCHAR(10) NOT NULL,
        value TEXT NOT NULL,
        plural_forms JSONB,
        status VARCHAR(20) DEFAULT 'draft',
        reviewed BOOLEAN DEFAULT FALSE,
        reviewed_by UUID,
        reviewed_at TIMESTAMP,
        translator_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(key_id, language_code)
      )
    `);

    // Translation history for audit
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS translation_history (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        translation_id UUID NOT NULL REFERENCES translations(id) ON DELETE CASCADE,
        old_value TEXT,
        new_value TEXT NOT NULL,
        changed_by UUID,
        reason VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Glossary for consistency
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS translation_glossary (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        term VARCHAR(255) NOT NULL,
        language_code VARCHAR(10) NOT NULL,
        translation VARCHAR(500) NOT NULL,
        definition TEXT,
        context TEXT,
        do_not_translate BOOLEAN DEFAULT FALSE,
        case_sensitive BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(term, language_code)
      )
    `);

    // Create indexes
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_languages_code ON languages(code)`);
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_languages_active ON languages(is_active)`);

    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_translation_keys_namespace ON translation_keys(namespace_id)`);
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_translation_keys_key ON translation_keys(key)`);

    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_translations_key ON translations(key_id)`);
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_translations_language ON translations(language_code)`);
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_translations_status ON translations(status)`);

    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_glossary_term ON translation_glossary(term)`);
    await tx.execute(`CREATE INDEX IF NOT EXISTS idx_glossary_language ON translation_glossary(language_code)`);

    // Triggers for updated_at
    await tx.execute(`
      DROP TRIGGER IF EXISTS update_languages_updated_at ON languages;
      CREATE TRIGGER update_languages_updated_at
        BEFORE UPDATE ON languages
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `);

    await tx.execute(`
      DROP TRIGGER IF EXISTS update_translations_updated_at ON translations;
      CREATE TRIGGER update_translations_updated_at
        BEFORE UPDATE ON translations
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `);

    // Insert default languages
    await tx.execute(`
      INSERT INTO languages (code, name, native_name, flag_emoji, is_default, is_active, completion_percent)
      VALUES
        ('fr', 'French', 'Français', '🇫🇷', true, true, 100),
        ('en', 'English', 'English', '🇬🇧', false, true, 100),
        ('de', 'German', 'Deutsch', '🇩🇪', false, true, 80),
        ('es', 'Spanish', 'Español', '🇪🇸', false, true, 75),
        ('it', 'Italian', 'Italiano', '🇮🇹', false, true, 70),
        ('nl', 'Dutch', 'Nederlands', '🇳🇱', false, true, 60),
        ('pt', 'Portuguese', 'Português', '🇵🇹', false, true, 50),
        ('pl', 'Polish', 'Polski', '🇵🇱', false, false, 30),
        ('ar', 'Arabic', 'العربية', '🇸🇦', false, false, 20)
      ON CONFLICT (code) DO NOTHING
    `);

    // Insert default namespaces
    await tx.execute(`
      INSERT INTO translation_namespaces (name, description)
      VALUES
        ('common', 'Traductions communes (boutons, labels, messages)'),
        ('auth', 'Authentification et sécurité'),
        ('kitchen', 'Interface de conception cuisine'),
        ('catalog', 'Catalogue produits'),
        ('ai', 'Configurateur IA'),
        ('errors', 'Messages d''erreur'),
        ('notifications', 'Notifications'),
        ('settings', 'Paramètres utilisateur'),
        ('admin', 'Panneau d''administration'),
        ('emails', 'Templates d''emails')
      ON CONFLICT (name) DO NOTHING
    `);
  },

  async down(tx: Transaction): Promise<void> {
    await tx.execute(`DROP TRIGGER IF EXISTS update_translations_updated_at ON translations`);
    await tx.execute(`DROP TRIGGER IF EXISTS update_languages_updated_at ON languages`);
    await tx.execute(`DROP TABLE IF EXISTS translation_glossary CASCADE`);
    await tx.execute(`DROP TABLE IF EXISTS translation_history CASCADE`);
    await tx.execute(`DROP TABLE IF EXISTS translations CASCADE`);
    await tx.execute(`DROP TABLE IF EXISTS translation_keys CASCADE`);
    await tx.execute(`DROP TABLE IF EXISTS translation_namespaces CASCADE`);
    await tx.execute(`DROP TABLE IF EXISTS languages CASCADE`);
  },
};

export default I18nMigration;
