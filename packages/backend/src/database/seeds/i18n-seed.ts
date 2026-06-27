/**
 * I18n Seed
 * Sample translations for the application
 */

import logger from '../../utils/logger';

import type { Seed, Transaction } from './seed-runner';

export const I18nSeed: Seed = {
  id: 'i18n-seed',
  name: 'Sample Translations',
  order: 60,

  async run(tx: Transaction): Promise<void> {
    // Get namespace IDs
    const namespaces = await tx.query<{ id: string; name: string }>(
      `SELECT id, name FROM translation_namespaces`
    );
    const nsMap = new Map(namespaces.rows.map((n) => [n.name, n.id]));

    const commonNs = nsMap.get('common');
    const authNs = nsMap.get('auth');
    const kitchenNs = nsMap.get('kitchen');
    const aiNs = nsMap.get('ai');
    const errorsNs = nsMap.get('errors');

    if (!commonNs) {
      logger.info('[Seed] Namespaces not found, skipping i18n seed');
      return;
    }

    // Insert translation keys
    await tx.execute(
      `
      INSERT INTO translation_keys (id, namespace_id, key, description, context)
      VALUES
        -- Common keys
        ('tk100000-0000-0000-0000-000000000001', $1, 'button.save', 'Bouton sauvegarder', 'Bouton d''action'),
        ('tk100000-0000-0000-0000-000000000002', $1, 'button.cancel', 'Bouton annuler', 'Bouton d''action'),
        ('tk100000-0000-0000-0000-000000000003', $1, 'button.delete', 'Bouton supprimer', 'Bouton d''action'),
        ('tk100000-0000-0000-0000-000000000004', $1, 'button.edit', 'Bouton modifier', 'Bouton d''action'),
        ('tk100000-0000-0000-0000-000000000005', $1, 'button.create', 'Bouton créer', 'Bouton d''action'),
        ('tk100000-0000-0000-0000-000000000006', $1, 'button.back', 'Bouton retour', 'Navigation'),
        ('tk100000-0000-0000-0000-000000000007', $1, 'button.next', 'Bouton suivant', 'Navigation'),
        ('tk100000-0000-0000-0000-000000000008', $1, 'label.loading', 'Texte chargement', 'États'),
        ('tk100000-0000-0000-0000-000000000009', $1, 'label.search', 'Label recherche', 'Formulaires'),
        ('tk100000-0000-0000-0000-000000000010', $1, 'message.success', 'Message de succès', 'Notifications'),

        -- Auth keys
        ('tk200000-0000-0000-0000-000000000001', $2, 'login.title', 'Titre page connexion', 'Page connexion'),
        ('tk200000-0000-0000-0000-000000000002', $2, 'login.email', 'Label email', 'Formulaire connexion'),
        ('tk200000-0000-0000-0000-000000000003', $2, 'login.password', 'Label mot de passe', 'Formulaire connexion'),
        ('tk200000-0000-0000-0000-000000000004', $2, 'login.submit', 'Bouton connexion', 'Formulaire connexion'),
        ('tk200000-0000-0000-0000-000000000005', $2, 'register.title', 'Titre inscription', 'Page inscription'),

        -- Kitchen keys
        ('tk300000-0000-0000-0000-000000000001', $3, 'layout.linear', 'Layout linéaire', 'Types de cuisine'),
        ('tk300000-0000-0000-0000-000000000002', $3, 'layout.l_shaped', 'Layout en L', 'Types de cuisine'),
        ('tk300000-0000-0000-0000-000000000003', $3, 'layout.u_shaped', 'Layout en U', 'Types de cuisine'),
        ('tk300000-0000-0000-0000-000000000004', $3, 'layout.island', 'Layout îlot', 'Types de cuisine'),
        ('tk300000-0000-0000-0000-000000000005', $3, 'dimension.width', 'Largeur', 'Dimensions'),
        ('tk300000-0000-0000-0000-000000000006', $3, 'dimension.depth', 'Profondeur', 'Dimensions'),
        ('tk300000-0000-0000-0000-000000000007', $3, 'dimension.height', 'Hauteur', 'Dimensions'),

        -- AI keys
        ('tk400000-0000-0000-0000-000000000001', $4, 'generate.title', 'Titre génération IA', 'Configurateur IA'),
        ('tk400000-0000-0000-0000-000000000002', $4, 'generate.button', 'Bouton générer', 'Configurateur IA'),
        ('tk400000-0000-0000-0000-000000000003', $4, 'generate.loading', 'Message génération en cours', 'Configurateur IA'),
        ('tk400000-0000-0000-0000-000000000004', $4, 'result.score', 'Label score', 'Résultats IA'),
        ('tk400000-0000-0000-0000-000000000005', $4, 'result.apply', 'Bouton appliquer', 'Résultats IA'),

        -- Error keys
        ('tk500000-0000-0000-0000-000000000001', $5, 'error.generic', 'Erreur générique', 'Erreurs'),
        ('tk500000-0000-0000-0000-000000000002', $5, 'error.notFound', 'Erreur non trouvé', 'Erreurs'),
        ('tk500000-0000-0000-0000-000000000003', $5, 'error.unauthorized', 'Erreur non autorisé', 'Erreurs'),
        ('tk500000-0000-0000-0000-000000000004', $5, 'error.validation', 'Erreur validation', 'Erreurs')
      ON CONFLICT DO NOTHING
    `,
      [commonNs, authNs, kitchenNs, aiNs, errorsNs]
    );

    // Insert French translations
    await tx.execute(`
      INSERT INTO translations (key_id, language_code, value, status, reviewed)
      VALUES
        -- Common FR
        ('tk100000-0000-0000-0000-000000000001', 'fr', 'Enregistrer', 'approved', true),
        ('tk100000-0000-0000-0000-000000000002', 'fr', 'Annuler', 'approved', true),
        ('tk100000-0000-0000-0000-000000000003', 'fr', 'Supprimer', 'approved', true),
        ('tk100000-0000-0000-0000-000000000004', 'fr', 'Modifier', 'approved', true),
        ('tk100000-0000-0000-0000-000000000005', 'fr', 'Créer', 'approved', true),
        ('tk100000-0000-0000-0000-000000000006', 'fr', 'Retour', 'approved', true),
        ('tk100000-0000-0000-0000-000000000007', 'fr', 'Suivant', 'approved', true),
        ('tk100000-0000-0000-0000-000000000008', 'fr', 'Chargement...', 'approved', true),
        ('tk100000-0000-0000-0000-000000000009', 'fr', 'Rechercher', 'approved', true),
        ('tk100000-0000-0000-0000-000000000010', 'fr', 'Opération réussie', 'approved', true),

        -- Auth FR
        ('tk200000-0000-0000-0000-000000000001', 'fr', 'Connexion', 'approved', true),
        ('tk200000-0000-0000-0000-000000000002', 'fr', 'Adresse email', 'approved', true),
        ('tk200000-0000-0000-0000-000000000003', 'fr', 'Mot de passe', 'approved', true),
        ('tk200000-0000-0000-0000-000000000004', 'fr', 'Se connecter', 'approved', true),
        ('tk200000-0000-0000-0000-000000000005', 'fr', 'Créer un compte', 'approved', true),

        -- Kitchen FR
        ('tk300000-0000-0000-0000-000000000001', 'fr', 'Linéaire', 'approved', true),
        ('tk300000-0000-0000-0000-000000000002', 'fr', 'En L', 'approved', true),
        ('tk300000-0000-0000-0000-000000000003', 'fr', 'En U', 'approved', true),
        ('tk300000-0000-0000-0000-000000000004', 'fr', 'Avec îlot', 'approved', true),
        ('tk300000-0000-0000-0000-000000000005', 'fr', 'Largeur', 'approved', true),
        ('tk300000-0000-0000-0000-000000000006', 'fr', 'Profondeur', 'approved', true),
        ('tk300000-0000-0000-0000-000000000007', 'fr', 'Hauteur', 'approved', true),

        -- AI FR
        ('tk400000-0000-0000-0000-000000000001', 'fr', 'Générateur de configuration IA', 'approved', true),
        ('tk400000-0000-0000-0000-000000000002', 'fr', 'Générer des configurations', 'approved', true),
        ('tk400000-0000-0000-0000-000000000003', 'fr', 'L''IA génère vos configurations optimales...', 'approved', true),
        ('tk400000-0000-0000-0000-000000000004', 'fr', 'Score d''optimisation', 'approved', true),
        ('tk400000-0000-0000-0000-000000000005', 'fr', 'Appliquer cette configuration', 'approved', true),

        -- Errors FR
        ('tk500000-0000-0000-0000-000000000001', 'fr', 'Une erreur est survenue', 'approved', true),
        ('tk500000-0000-0000-0000-000000000002', 'fr', 'Élément non trouvé', 'approved', true),
        ('tk500000-0000-0000-0000-000000000003', 'fr', 'Accès non autorisé', 'approved', true),
        ('tk500000-0000-0000-0000-000000000004', 'fr', 'Erreur de validation', 'approved', true)
      ON CONFLICT (key_id, language_code) DO NOTHING
    `);

    // Insert English translations
    await tx.execute(`
      INSERT INTO translations (key_id, language_code, value, status, reviewed)
      VALUES
        -- Common EN
        ('tk100000-0000-0000-0000-000000000001', 'en', 'Save', 'approved', true),
        ('tk100000-0000-0000-0000-000000000002', 'en', 'Cancel', 'approved', true),
        ('tk100000-0000-0000-0000-000000000003', 'en', 'Delete', 'approved', true),
        ('tk100000-0000-0000-0000-000000000004', 'en', 'Edit', 'approved', true),
        ('tk100000-0000-0000-0000-000000000005', 'en', 'Create', 'approved', true),
        ('tk100000-0000-0000-0000-000000000006', 'en', 'Back', 'approved', true),
        ('tk100000-0000-0000-0000-000000000007', 'en', 'Next', 'approved', true),
        ('tk100000-0000-0000-0000-000000000008', 'en', 'Loading...', 'approved', true),
        ('tk100000-0000-0000-0000-000000000009', 'en', 'Search', 'approved', true),
        ('tk100000-0000-0000-0000-000000000010', 'en', 'Operation successful', 'approved', true),

        -- Auth EN
        ('tk200000-0000-0000-0000-000000000001', 'en', 'Login', 'approved', true),
        ('tk200000-0000-0000-0000-000000000002', 'en', 'Email address', 'approved', true),
        ('tk200000-0000-0000-0000-000000000003', 'en', 'Password', 'approved', true),
        ('tk200000-0000-0000-0000-000000000004', 'en', 'Sign in', 'approved', true),
        ('tk200000-0000-0000-0000-000000000005', 'en', 'Create an account', 'approved', true),

        -- Kitchen EN
        ('tk300000-0000-0000-0000-000000000001', 'en', 'One wall', 'approved', true),
        ('tk300000-0000-0000-0000-000000000002', 'en', 'L-shaped', 'approved', true),
        ('tk300000-0000-0000-0000-000000000003', 'en', 'U-shaped', 'approved', true),
        ('tk300000-0000-0000-0000-000000000004', 'en', 'With island', 'approved', true),
        ('tk300000-0000-0000-0000-000000000005', 'en', 'Width', 'approved', true),
        ('tk300000-0000-0000-0000-000000000006', 'en', 'Depth', 'approved', true),
        ('tk300000-0000-0000-0000-000000000007', 'en', 'Height', 'approved', true),

        -- AI EN
        ('tk400000-0000-0000-0000-000000000001', 'en', 'AI Configuration Generator', 'approved', true),
        ('tk400000-0000-0000-0000-000000000002', 'en', 'Generate configurations', 'approved', true),
        ('tk400000-0000-0000-0000-000000000003', 'en', 'AI is generating your optimal configurations...', 'approved', true),
        ('tk400000-0000-0000-0000-000000000004', 'en', 'Optimization score', 'approved', true),
        ('tk400000-0000-0000-0000-000000000005', 'en', 'Apply this configuration', 'approved', true),

        -- Errors EN
        ('tk500000-0000-0000-0000-000000000001', 'en', 'An error occurred', 'approved', true),
        ('tk500000-0000-0000-0000-000000000002', 'en', 'Item not found', 'approved', true),
        ('tk500000-0000-0000-0000-000000000003', 'en', 'Unauthorized access', 'approved', true),
        ('tk500000-0000-0000-0000-000000000004', 'en', 'Validation error', 'approved', true)
      ON CONFLICT (key_id, language_code) DO NOTHING
    `);

    // Insert German translations
    await tx.execute(`
      INSERT INTO translations (key_id, language_code, value, status, reviewed)
      VALUES
        ('tk100000-0000-0000-0000-000000000001', 'de', 'Speichern', 'approved', true),
        ('tk100000-0000-0000-0000-000000000002', 'de', 'Abbrechen', 'approved', true),
        ('tk100000-0000-0000-0000-000000000003', 'de', 'Löschen', 'approved', true),
        ('tk100000-0000-0000-0000-000000000004', 'de', 'Bearbeiten', 'approved', true),
        ('tk100000-0000-0000-0000-000000000005', 'de', 'Erstellen', 'approved', true),
        ('tk300000-0000-0000-0000-000000000001', 'de', 'Einzeilig', 'approved', true),
        ('tk300000-0000-0000-0000-000000000002', 'de', 'L-förmig', 'approved', true),
        ('tk300000-0000-0000-0000-000000000003', 'de', 'U-förmig', 'approved', true),
        ('tk300000-0000-0000-0000-000000000004', 'de', 'Mit Kochinsel', 'approved', true),
        ('tk400000-0000-0000-0000-000000000001', 'de', 'KI-Konfigurator', 'approved', true),
        ('tk400000-0000-0000-0000-000000000002', 'de', 'Konfigurationen generieren', 'approved', true)
      ON CONFLICT (key_id, language_code) DO NOTHING
    `);

    // Insert glossary terms
    await tx.execute(`
      INSERT INTO translation_glossary (term, language_code, translation, definition, do_not_translate)
      VALUES
        ('KitchenXpert', 'fr', 'KitchenXpert', 'Nom de l''application', true),
        ('KitchenXpert', 'en', 'KitchenXpert', 'Application name', true),
        ('cuisine', 'fr', 'cuisine', 'Pièce pour préparer les repas', false),
        ('cuisine', 'en', 'kitchen', 'Room for food preparation', false),
        ('îlot', 'fr', 'îlot', 'Meuble central indépendant', false),
        ('îlot', 'en', 'island', 'Freestanding central unit', false),
        ('plan de travail', 'fr', 'plan de travail', 'Surface de préparation', false),
        ('plan de travail', 'en', 'countertop', 'Work surface', false)
      ON CONFLICT (term, language_code) DO NOTHING
    `);

    logger.info('[Seed] Created sample translations for FR, EN, DE');
  },

  async cleanup(tx: Transaction): Promise<void> {
    await tx.execute(`DELETE FROM translation_glossary`);
    await tx.execute(`DELETE FROM translations WHERE key_id LIKE 'tk%00000-%'`);
    await tx.execute(`DELETE FROM translation_keys WHERE id LIKE 'tk%00000-%'`);
  },
};

export default I18nSeed;
