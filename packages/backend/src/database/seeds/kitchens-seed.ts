/**
 * Kitchens Seed
 * Sample kitchens linked to projects
 *
 * Prisma table: "Kitchen"
 * Columns: id, "projectId", "userId", name, style, layout, width, length, height,
 *          "isGenerated", score, metadata, "updatedAt"
 */

import type { Seed, Transaction } from './seed-runner';
import logger from '../../utils/logger';

export const KitchensSeed: Seed = {
  id: 'kitchens-seed',
  name: 'Sample Kitchens',
  order: 50,

  async run(tx: Transaction): Promise<void> {
    const now = new Date().toISOString();

    await tx.execute(`
      INSERT INTO "Kitchen" (id, "projectId", "userId", name, style, layout, width, length, height, "isGenerated", score, metadata, "createdAt", "updatedAt")
      VALUES
        ('k1000000-0000-0000-0000-000000000001',
         'pr100000-0000-0000-0000-000000000001',
         '44444444-4444-4444-4444-444444444444',
         'Ma cuisine moderne', 'modern', 'l_shaped',
         380.00, 320.00, 250.00,
         false, 87,
         '{"windowPosition": {"x": 100, "y": 0, "width": 120, "height": 100}}',
         $1, $1),

        ('k1000000-0000-0000-0000-000000000002',
         'pr100000-0000-0000-0000-000000000002',
         '55555555-5555-5555-5555-555555555555',
         'Cuisine studio', 'contemporary', 'one_wall',
         280.00, 60.00, 250.00,
         false, NULL,
         '{"compact": true}',
         $1, $1),

        ('k1000000-0000-0000-0000-000000000003',
         'pr100000-0000-0000-0000-000000000003',
         '22222222-2222-2222-2222-222222222222',
         'Cuisine familiale', 'traditional', 'u_shaped',
         450.00, 400.00, 260.00,
         false, NULL,
         '{"doubleOven": true}',
         $1, $1),

        ('k1000000-0000-0000-0000-000000000004',
         'pr100000-0000-0000-0000-000000000004',
         '33333333-3333-3333-3333-333333333333',
         'Cuisine design ilot', 'modern', 'island',
         500.00, 450.00, 260.00,
         true, 89,
         '{"island": {"width": 180, "depth": 90}}',
         $1, $1)
      ON CONFLICT DO NOTHING
    `, [now]);

    logger.info('[Seed] Created 4 sample kitchens');
  },

  async cleanup(tx: Transaction): Promise<void> {
    await tx.execute(`DELETE FROM "Kitchen" WHERE id LIKE 'k1000000-%'`);
  },
};

export default KitchensSeed;
