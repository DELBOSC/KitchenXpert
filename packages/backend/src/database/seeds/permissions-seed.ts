/**
 * Permissions Seed
 * Default permissions and role-permission assignments
 *
 * Prisma table: "Permission" — Columns: id, name, resource, action, description, "createdAt", "updatedAt"
 * Prisma table: "RolePermission" — Columns: id, "roleId", "permissionId", "createdAt"
 * Prisma table: "UserRole" — Columns: id, "userId", "roleId", "createdAt"
 */

import type { Seed, Transaction } from './seed-runner';
import logger from '../../utils/logger';

export const PermissionsSeed: Seed = {
  id: 'permissions-seed',
  name: 'Default Permissions',
  order: 20,

  async run(tx: Transaction): Promise<void> {
    const now = new Date().toISOString();

    // Insert all permissions
    await tx.execute(`
      INSERT INTO "Permission" (id, name, resource, action, description, "createdAt", "updatedAt")
      VALUES
        ('pm000000-0000-0000-0000-000000000001', 'project.create', 'project', 'create', 'Créer de nouveaux projets', $1, $1),
        ('pm000000-0000-0000-0000-000000000002', 'project.read', 'project', 'read', 'Visualiser les projets', $1, $1),
        ('pm000000-0000-0000-0000-000000000003', 'project.update', 'project', 'update', 'Modifier des projets', $1, $1),
        ('pm000000-0000-0000-0000-000000000004', 'project.delete', 'project', 'delete', 'Supprimer des projets', $1, $1),
        ('pm000000-0000-0000-0000-000000000005', 'kitchen.create', 'kitchen', 'create', 'Créer des cuisines', $1, $1),
        ('pm000000-0000-0000-0000-000000000006', 'kitchen.read', 'kitchen', 'read', 'Visualiser les cuisines', $1, $1),
        ('pm000000-0000-0000-0000-000000000007', 'kitchen.update', 'kitchen', 'update', 'Modifier des cuisines', $1, $1),
        ('pm000000-0000-0000-0000-000000000008', 'kitchen.delete', 'kitchen', 'delete', 'Supprimer des cuisines', $1, $1),
        ('pm000000-0000-0000-0000-000000000009', 'catalog.read', 'catalog', 'read', 'Consulter le catalogue', $1, $1),
        ('pm000000-0000-0000-0000-000000000010', 'catalog.create', 'catalog', 'create', 'Ajouter au catalogue', $1, $1),
        ('pm000000-0000-0000-0000-000000000011', 'catalog.update', 'catalog', 'update', 'Modifier le catalogue', $1, $1),
        ('pm000000-0000-0000-0000-000000000012', 'catalog.delete', 'catalog', 'delete', 'Supprimer du catalogue', $1, $1),
        ('pm000000-0000-0000-0000-000000000013', 'user.read', 'user', 'read', 'Voir les utilisateurs', $1, $1),
        ('pm000000-0000-0000-0000-000000000014', 'user.update', 'user', 'update', 'Modifier les utilisateurs', $1, $1),
        ('pm000000-0000-0000-0000-000000000015', 'user.delete', 'user', 'delete', 'Supprimer des utilisateurs', $1, $1),
        ('pm000000-0000-0000-0000-000000000016', 'role.read', 'role', 'read', 'Voir les rôles', $1, $1),
        ('pm000000-0000-0000-0000-000000000017', 'role.create', 'role', 'create', 'Créer des rôles', $1, $1),
        ('pm000000-0000-0000-0000-000000000018', 'role.update', 'role', 'update', 'Modifier des rôles', $1, $1),
        ('pm000000-0000-0000-0000-000000000019', 'role.delete', 'role', 'delete', 'Supprimer des rôles', $1, $1),
        ('pm000000-0000-0000-0000-000000000020', 'audit.read', 'audit', 'read', 'Voir les logs d''audit', $1, $1),
        ('pm000000-0000-0000-0000-000000000021', 'audit.export', 'audit', 'export', 'Exporter les audits', $1, $1)
      ON CONFLICT (name) DO NOTHING
    `, [now]);

    // Super admin gets ALL permissions
    await tx.execute(`
      INSERT INTO "RolePermission" (id, "roleId", "permissionId", "createdAt")
      SELECT gen_random_uuid(), r.id, p.id, $1
      FROM "Role" r CROSS JOIN "Permission" p
      WHERE r.name = 'super_admin'
      ON CONFLICT ("roleId", "permissionId") DO NOTHING
    `, [now]);

    // Admin gets all except role.delete
    await tx.execute(`
      INSERT INTO "RolePermission" (id, "roleId", "permissionId", "createdAt")
      SELECT gen_random_uuid(), r.id, p.id, $1
      FROM "Role" r CROSS JOIN "Permission" p
      WHERE r.name = 'admin' AND p.name != 'role.delete'
      ON CONFLICT ("roleId", "permissionId") DO NOTHING
    `, [now]);

    // Professional: project, kitchen, catalog.read, user.read/update
    await tx.execute(`
      INSERT INTO "RolePermission" (id, "roleId", "permissionId", "createdAt")
      SELECT gen_random_uuid(), r.id, p.id, $1
      FROM "Role" r CROSS JOIN "Permission" p
      WHERE r.name = 'professional' AND p.name IN (
        'project.create','project.read','project.update','project.delete',
        'kitchen.create','kitchen.read','kitchen.update','kitchen.delete',
        'catalog.read','user.read','user.update'
      )
      ON CONFLICT ("roleId", "permissionId") DO NOTHING
    `, [now]);

    // Regular user: same as professional for now
    await tx.execute(`
      INSERT INTO "RolePermission" (id, "roleId", "permissionId", "createdAt")
      SELECT gen_random_uuid(), r.id, p.id, $1
      FROM "Role" r CROSS JOIN "Permission" p
      WHERE r.name = 'user' AND p.name IN (
        'project.create','project.read','project.update','project.delete',
        'kitchen.create','kitchen.read','kitchen.update','kitchen.delete',
        'catalog.read','user.read','user.update'
      )
      ON CONFLICT ("roleId", "permissionId") DO NOTHING
    `, [now]);

    // Guest: catalog.read only
    await tx.execute(`
      INSERT INTO "RolePermission" (id, "roleId", "permissionId", "createdAt")
      SELECT gen_random_uuid(), r.id, p.id, $1
      FROM "Role" r CROSS JOIN "Permission" p
      WHERE r.name = 'guest' AND p.name = 'catalog.read'
      ON CONFLICT ("roleId", "permissionId") DO NOTHING
    `, [now]);

    // Assign roles to sample users via UserRole
    await tx.execute(`
      INSERT INTO "UserRole" (id, "userId", "roleId", "createdAt")
      SELECT gen_random_uuid(), u.id, r.id, $1
      FROM "User" u CROSS JOIN "Role" r
      WHERE
        (u.email = 'admin@kitchenxpert.com' AND r.name = 'super_admin')
        OR (u.email = 'jean.dupont@cuisines-pro.fr' AND r.name = 'professional')
        OR (u.email = 'marie.martin@artisan-cuisine.fr' AND r.name = 'professional')
        OR (u.email = 'pierre.bernard@email.fr' AND r.name = 'user')
        OR (u.email = 'sophie.leroy@email.fr' AND r.name = 'user')
        OR (u.email = 'thomas.moreau@email.de' AND r.name = 'user')
        OR (u.email = 'demo@kitchenxpert.com' AND r.name = 'guest')
      ON CONFLICT ("userId", "roleId") DO NOTHING
    `, [now]);

    logger.info('[Seed] Created permissions, role-permission and user-role assignments');
  },

  async cleanup(tx: Transaction): Promise<void> {
    await tx.execute(`DELETE FROM "UserRole"`);
    await tx.execute(`DELETE FROM "RolePermission"`);
    await tx.execute(`DELETE FROM "Permission" WHERE id LIKE 'pm000000-%'`);
  },
};

export default PermissionsSeed;
