/**
 * Roles Seed
 * Create default roles and assign them to sample users
 *
 * Prisma table: "Role" (PascalCase)
 * Columns: id, name, description, "isSystem", "createdAt", "updatedAt"
 */

import logger from '../../utils/logger';

import type { Seed, Transaction } from './seed-runner';

export const RolesSeed: Seed = {
  id: 'roles-seed',
  name: 'Default Roles',
  order: 10,

  async run(tx: Transaction): Promise<void> {
    const now = new Date().toISOString();

    // Create default roles
    await tx.execute(`
      INSERT INTO "Role" (id, name, description, "isSystem", "createdAt", "updatedAt")
      VALUES
        ('r0000000-0000-0000-0000-000000000001', 'super_admin', 'Super administrateur avec tous les droits', true, $1, $1),
        ('r0000000-0000-0000-0000-000000000002', 'admin', 'Administrateur', true, $1, $1),
        ('r0000000-0000-0000-0000-000000000003', 'professional', 'Utilisateur professionnel (cuisiniste)', true, $1, $1),
        ('r0000000-0000-0000-0000-000000000004', 'user', 'Utilisateur standard', true, $1, $1),
        ('r0000000-0000-0000-0000-000000000005', 'guest', 'Visiteur avec accès limité', true, $1, $1)
      ON CONFLICT (name) DO NOTHING
    `, [now]);

    logger.info('[Seed] Created 5 default roles');
  },

  async cleanup(tx: Transaction): Promise<void> {
    await tx.execute(`DELETE FROM "UserRole" WHERE "roleId" LIKE 'r0000000-%'`);
    await tx.execute(`DELETE FROM "RolePermission" WHERE "roleId" LIKE 'r0000000-%'`);
    await tx.execute(`DELETE FROM "Role" WHERE id LIKE 'r0000000-%'`);
  },
};

export default RolesSeed;
