/**
 * Repository exports
 *
 * This module exports all repository implementations for the application.
 */

import { type PrismaClient } from '@prisma/client';

// Export all repository classes
export { PrismaUserRepository } from './prisma-user.repository';
export { KitchenRepository } from './kitchen-repository';
export { ProjectRepository } from './project-repository';
export { ProductRepository } from './product-repository';
export { CatalogRepository } from './catalog-repository';
export { ApplianceRepository } from './appliance-repository';
export { MaterialRepository } from './material-repository';
export { RoleRepository } from './role-repository';
export { PermissionRepository } from './permission-repository';
export { PartnerRepository } from './partner-repository';
export { AuditLogRepository } from './audit-log-repository';
export { WebhookRepository } from './webhook-repository';
export { LocaleRepository } from './locale-repository';
export { MetricRepository } from './metric-repository';

// Import classes for factory function
import { ApplianceRepository } from './appliance-repository';
import { AuditLogRepository } from './audit-log-repository';
import { CatalogRepository } from './catalog-repository';
import { KitchenRepository } from './kitchen-repository';
import { LocaleRepository } from './locale-repository';
import { MaterialRepository } from './material-repository';
import { MetricRepository } from './metric-repository';
import { PartnerRepository } from './partner-repository';
import { PermissionRepository } from './permission-repository';
import { PrismaUserRepository } from './prisma-user.repository';
import { ProductRepository } from './product-repository';
import { ProjectRepository } from './project-repository';
import { RoleRepository } from './role-repository';
import { WebhookRepository } from './webhook-repository';

// Re-export the IUserRepository interface from auth service
export type { IUserRepository } from '../auth/auth.service';

/**
 * Repository container type
 */
export interface Repositories {
  user: PrismaUserRepository;
  kitchen: KitchenRepository;
  project: ProjectRepository;
  product: ProductRepository;
  catalog: CatalogRepository;
  appliance: ApplianceRepository;
  material: MaterialRepository;
  role: RoleRepository;
  permission: PermissionRepository;
  partner: PartnerRepository;
  auditLog: AuditLogRepository;
  webhook: WebhookRepository;
  locale: LocaleRepository;
  metric: MetricRepository;
}

/**
 * Create all repositories with a shared Prisma client instance
 */
export function createRepositories(prisma: PrismaClient): Repositories {
  return {
    user: new PrismaUserRepository(prisma),
    kitchen: new KitchenRepository(prisma),
    project: new ProjectRepository(prisma),
    product: new ProductRepository(prisma),
    catalog: new CatalogRepository(prisma),
    appliance: new ApplianceRepository(prisma),
    material: new MaterialRepository(prisma),
    role: new RoleRepository(prisma),
    permission: new PermissionRepository(prisma),
    partner: new PartnerRepository(prisma),
    auditLog: new AuditLogRepository(prisma),
    webhook: new WebhookRepository(prisma),
    locale: new LocaleRepository(prisma),
    metric: new MetricRepository(prisma),
  };
}

export default {
  PrismaUserRepository,
  KitchenRepository,
  ProjectRepository,
  ProductRepository,
  CatalogRepository,
  ApplianceRepository,
  MaterialRepository,
  RoleRepository,
  PermissionRepository,
  PartnerRepository,
  AuditLogRepository,
  WebhookRepository,
  LocaleRepository,
  MetricRepository,
  createRepositories,
};
