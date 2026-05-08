/**
 * Migrations Index
 * Export all migrations in order
 */

export { MigrationRunner, createMigrationRunner } from './migration-runner';
export type { Migration, MigrationResult, MigrationStatus, Transaction } from './migration-runner';

// Migrations in order
export { InitMigration } from './20240501-init';
export { UsersMigration } from './20240502-users';
export { KitchensMigration } from './20240503-kitchens';
export { ProjectsMigration } from './20240504-projects';
export { CatalogsMigration } from './20240505-catalogs';
export { PermissionsMigration } from './20240506-permissions';
export { RolesMigration } from './20240507-roles';
export { AuditMigration } from './20240508-audit';
export { WebhooksMigration } from './20240509-webhooks';
export { MonitoringMigration } from './20240510-monitoring';
export { I18nMigration } from './20240511-i18n';
export { FeaturesMigration } from './20240512-features';

import { InitMigration } from './20240501-init';
import { UsersMigration } from './20240502-users';
import { KitchensMigration } from './20240503-kitchens';
import { ProjectsMigration } from './20240504-projects';
import { CatalogsMigration } from './20240505-catalogs';
import { PermissionsMigration } from './20240506-permissions';
import { RolesMigration } from './20240507-roles';
import { AuditMigration } from './20240508-audit';
import { WebhooksMigration } from './20240509-webhooks';
import { MonitoringMigration } from './20240510-monitoring';
import { I18nMigration } from './20240511-i18n';
import { FeaturesMigration } from './20240512-features';

import type { Migration } from './migration-runner';

/**
 * All migrations in execution order
 */
export const allMigrations: Migration[] = [
  InitMigration,
  UsersMigration,
  KitchensMigration,
  ProjectsMigration,
  CatalogsMigration,
  PermissionsMigration,
  RolesMigration,
  AuditMigration,
  WebhooksMigration,
  MonitoringMigration,
  I18nMigration,
  FeaturesMigration,
];

export default allMigrations;
