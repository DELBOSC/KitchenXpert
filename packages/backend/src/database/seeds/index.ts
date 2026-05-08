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
export { ProviderCatalogsSeed } from './provider-catalogs-seed';
export { ProjectsSeed } from './projects-seed';
export { KitchensSeed } from './kitchens-seed';

import { CatalogsSeed } from './catalogs-seed';
import { KitchensSeed } from './kitchens-seed';
import { PermissionsSeed } from './permissions-seed';
import { ProjectsSeed } from './projects-seed';
import { ProviderCatalogsSeed } from './provider-catalogs-seed';
import { RolesSeed } from './roles-seed';
import { UsersSeed } from './users-seed';

import type { Seed } from './seed-runner';

/**
 * All seeds in execution order:
 * 1. Roles (10) — Role records
 * 2. Users (15) — User records
 * 3. Permissions (20) — Permission + RolePermission + UserRole
 * 4. Catalogs (30) — ProductCategory + sample Products (legacy)
 * 5. Provider catalogs (31) — CatalogProvider + Products + Appliances for the
 *    5 providers (IKEA, Leroy Merlin, Castorama, Schmidt, Bosch).
 * 6. Projects (40) — Project + ProjectCollaborator
 * 7. Kitchens (50) — Kitchen (requires Projects)
 */
export const allSeeds: Seed[] = [
  RolesSeed,
  UsersSeed,
  PermissionsSeed,
  CatalogsSeed,
  ProviderCatalogsSeed,
  ProjectsSeed,
  KitchensSeed,
];

export default allSeeds;
