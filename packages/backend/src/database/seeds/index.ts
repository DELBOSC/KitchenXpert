/**
 * Seeds Index
 * Export all seeds in order
 *
 * NOTE: i18n, audit, webhooks, and monitoring seeds are disabled because
 * their table structures don't match the Prisma schema. They can be
 * re-enabled once rewritten.
 */

export { SeedRunner, createSeedRunner, SeedError } from './seed-runner';
export type { Seed, SeedOptions, SeedResult, SeedStatus } from './seed-runner';

// Seeds in order
export { RolesSeed } from './roles-seed';
export { UsersSeed } from './users-seed';
export { PermissionsSeed } from './permissions-seed';
export { CatalogsSeed } from './catalogs-seed';
export { ProjectsSeed } from './projects-seed';
export { KitchensSeed } from './kitchens-seed';

import { RolesSeed } from './roles-seed';
import { UsersSeed } from './users-seed';
import { PermissionsSeed } from './permissions-seed';
import { CatalogsSeed } from './catalogs-seed';
import { ProjectsSeed } from './projects-seed';
import { KitchensSeed } from './kitchens-seed';
import type { Seed } from './seed-runner';

/**
 * All seeds in execution order:
 * 1. Roles (order 10) — create Role records
 * 2. Users (order 15) — create User records
 * 3. Permissions (order 20) — create Permission + RolePermission + UserRole
 * 4. Catalogs (order 30) — create ProductCategory + Product
 * 5. Projects (order 40) — create Project + ProjectCollaborator
 * 6. Kitchens (order 50) — create Kitchen (requires Projects)
 */
export const allSeeds: Seed[] = [
  RolesSeed,
  UsersSeed,
  PermissionsSeed,
  CatalogsSeed,
  ProjectsSeed,
  KitchensSeed,
];

export default allSeeds;
