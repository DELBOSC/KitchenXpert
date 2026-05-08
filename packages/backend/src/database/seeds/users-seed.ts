/**
 * Users Seed
 * Sample users for development and testing
 *
 * Prisma table: "User" (PascalCase)
 * Columns: id, email, password, "firstName", "lastName", role, status,
 *          "emailVerified", language, timezone, phone, "updatedAt"
 *
 * NOTE: Uses bcrypt for password hashing, matching the production auth system.
 */

import crypto from 'crypto';

import bcrypt from 'bcrypt';

import logger from '../../utils/logger';

import type { Seed, Transaction } from './seed-runner';


const SALT_ROUNDS = 12;

export const UsersSeed: Seed = {
  id: 'users-seed',
  name: 'Sample Users',
  order: 15,

  async run(tx: Transaction): Promise<void> {
    const seedPassword = process.env.SEED_USER_PASSWORD || crypto.randomBytes(12).toString('base64');

    if (!process.env.SEED_USER_PASSWORD && process.env.NODE_ENV !== 'production') {
      logger.info('[Seed] Generated random password for seed users (not logged for security)');
      logger.info('[Seed] Set SEED_USER_PASSWORD env var to use a specific password');
    }

    const passwordHash = await bcrypt.hash(seedPassword, SALT_ROUNDS);
    const now = new Date().toISOString();

    await tx.execute(`
      INSERT INTO "User" (id, email, password, "firstName", "lastName", role, status, "emailVerified", language, timezone, phone, "createdAt", "updatedAt")
      VALUES
        -- Super Admin
        ('11111111-1111-1111-1111-111111111111', 'admin@kitchenxpert.com', $1,
         'Admin', 'System', 'admin', 'active', true, 'fr', 'Europe/Paris', '+33600000001', $2, $2),

        -- Professional users (cuisinistes)
        ('22222222-2222-2222-2222-222222222222', 'jean.dupont@cuisines-pro.fr', $1,
         'Jean', 'Dupont', 'professional', 'active', true, 'fr', 'Europe/Paris', '+33612345678', $2, $2),
        ('33333333-3333-3333-3333-333333333333', 'marie.martin@artisan-cuisine.fr', $1,
         'Marie', 'Martin', 'professional', 'active', true, 'fr', 'Europe/Paris', '+33623456789', $2, $2),

        -- Regular users
        ('44444444-4444-4444-4444-444444444444', 'pierre.bernard@email.fr', $1,
         'Pierre', 'Bernard', 'user', 'active', true, 'fr', 'Europe/Paris', '+33634567890', $2, $2),
        ('55555555-5555-5555-5555-555555555555', 'sophie.leroy@email.fr', $1,
         'Sophie', 'Leroy', 'user', 'active', true, 'fr', 'Europe/Paris', '+33645678901', $2, $2),
        ('66666666-6666-6666-6666-666666666666', 'thomas.moreau@email.de', $1,
         'Thomas', 'Moreau', 'user', 'active', true, 'de', 'Europe/Berlin', '+49123456789', $2, $2),

        -- Guest user for demo
        ('77777777-7777-7777-7777-777777777777', 'demo@kitchenxpert.com', $1,
         'Demo', 'User', 'user', 'active', false, 'fr', 'UTC', NULL, $2, $2)
      ON CONFLICT (email) DO NOTHING
    `, [passwordHash, now]);

    logger.info('[Seed] Created 7 sample users');
  },

  async cleanup(tx: Transaction): Promise<void> {
    await tx.execute(`
      DELETE FROM "User" WHERE id IN (
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222',
        '33333333-3333-3333-3333-333333333333',
        '44444444-4444-4444-4444-444444444444',
        '55555555-5555-5555-5555-555555555555',
        '66666666-6666-6666-6666-666666666666',
        '77777777-7777-7777-7777-777777777777'
      )
    `);
  },
};

export default UsersSeed;
