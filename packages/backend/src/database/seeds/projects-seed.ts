/**
 * Projects Seed
 * Sample projects for testing
 *
 * Prisma tables: "Project", "ProjectCollaborator"
 */

import logger from '../../utils/logger';

import type { Seed, Transaction } from './seed-runner';

export const ProjectsSeed: Seed = {
  id: 'projects-seed',
  name: 'Sample Projects',
  order: 40,

  async run(tx: Transaction): Promise<void> {
    const now = new Date().toISOString();

    await tx.execute(`
      INSERT INTO "Project" (id, "userId", name, description, status, budget, currency, metadata, "createdAt", "updatedAt")
      VALUES
        ('pr100000-0000-0000-0000-000000000001',
         '44444444-4444-4444-4444-444444444444',
         'Renovation cuisine appartement',
         'Projet de renovation complete de la cuisine',
         'completed', 12500.00, 'EUR',
         '{"completedAt": "2024-03-15", "rating": 4.5}',
         $1, $1),

        ('pr100000-0000-0000-0000-000000000002',
         '55555555-5555-5555-5555-555555555555',
         'Cuisine studio etudiant',
         'Amenagement kitchenette optimisee',
         'in_progress', 4000.00, 'EUR',
         '{"startedAt": "2024-04-01"}',
         $1, $1),

        ('pr100000-0000-0000-0000-000000000003',
         '22222222-2222-2222-2222-222222222222',
         'Client Dupont - Maison Vincennes',
         'Cuisine haut de gamme pour villa',
         'in_progress', 45000.00, 'EUR',
         '{"clientName": "M. et Mme Dupont"}',
         $1, $1),

        ('pr100000-0000-0000-0000-000000000004',
         '33333333-3333-3333-3333-333333333333',
         'Showroom Lyon',
         'Cuisine exposition pour showroom',
         'draft', 80000.00, 'EUR',
         '{"purpose": "showroom", "location": "Lyon"}',
         $1, $1)
      ON CONFLICT DO NOTHING
    `, [now]);

    // Collaborators
    await tx.execute(`
      INSERT INTO "ProjectCollaborator" (id, "projectId", email, role, "invitedAt", "acceptedAt")
      VALUES
        (gen_random_uuid(), 'pr100000-0000-0000-0000-000000000003',
         'marie.martin@artisan-cuisine.fr', 'viewer', $1, $1),
        (gen_random_uuid(), 'pr100000-0000-0000-0000-000000000004',
         'jean.dupont@cuisines-pro.fr', 'editor', $1, $1)
      ON CONFLICT ("projectId", email) DO NOTHING
    `, [now]);

    logger.info('[Seed] Created 4 sample projects with collaborators');
  },

  async cleanup(tx: Transaction): Promise<void> {
    await tx.execute(`DELETE FROM "ProjectCollaborator" WHERE "projectId" LIKE 'pr100000-%'`);
    await tx.execute(`DELETE FROM "Project" WHERE id LIKE 'pr100000-%'`);
  },
};

export default ProjectsSeed;
