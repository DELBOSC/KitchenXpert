/**
 * Constantes pour le système de permissions
 */

export const PERMISSION_ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  MANAGE: 'manage',
  SHARE: 'share',
  EXPORT: 'export',
  IMPORT: 'import',
} as const;

export type PermissionActionType = (typeof PERMISSION_ACTIONS)[keyof typeof PERMISSION_ACTIONS];

export const RESOURCE_TYPES = {
  USER: 'user',
  KITCHEN: 'kitchen',
  PROJECT: 'project',
  PRODUCT: 'product',
  CATALOG: 'catalog',
  ORDER: 'order',
  PARTNER: 'partner',
  ROLE: 'role',
  PERMISSION: 'permission',
  WEBHOOK: 'webhook',
  SYSTEM: 'system',
} as const;

export type ResourceTypeValue = (typeof RESOURCE_TYPES)[keyof typeof RESOURCE_TYPES];

export const PERMISSION_SCOPES = {
  OWN: 'own',
  TEAM: 'team',
  ORGANIZATION: 'organization',
  ALL: 'all',
} as const;

export type PermissionScope = (typeof PERMISSION_SCOPES)[keyof typeof PERMISSION_SCOPES];

export const SYSTEM_PERMISSIONS = {
  // Users
  'user:create': { resource: 'user', action: 'create', description: 'Créer des utilisateurs' },
  'user:read': { resource: 'user', action: 'read', description: 'Voir les utilisateurs' },
  'user:update': { resource: 'user', action: 'update', description: 'Modifier les utilisateurs' },
  'user:delete': { resource: 'user', action: 'delete', description: 'Supprimer les utilisateurs' },

  // Kitchens
  'kitchen:create': { resource: 'kitchen', action: 'create', description: 'Créer des cuisines' },
  'kitchen:read': { resource: 'kitchen', action: 'read', description: 'Voir les cuisines' },
  'kitchen:update': { resource: 'kitchen', action: 'update', description: 'Modifier les cuisines' },
  'kitchen:delete': {
    resource: 'kitchen',
    action: 'delete',
    description: 'Supprimer les cuisines',
  },
  'kitchen:share': { resource: 'kitchen', action: 'share', description: 'Partager les cuisines' },

  // Projects
  'project:create': { resource: 'project', action: 'create', description: 'Créer des projets' },
  'project:read': { resource: 'project', action: 'read', description: 'Voir les projets' },
  'project:update': { resource: 'project', action: 'update', description: 'Modifier les projets' },
  'project:delete': { resource: 'project', action: 'delete', description: 'Supprimer les projets' },

  // Catalog
  'catalog:manage': { resource: 'catalog', action: 'manage', description: 'Gérer le catalogue' },
  'catalog:import': { resource: 'catalog', action: 'import', description: 'Importer des produits' },
  'catalog:export': { resource: 'catalog', action: 'export', description: 'Exporter des produits' },

  // System
  'system:admin': { resource: 'system', action: 'manage', description: 'Administration système' },
} as const;

export type SystemPermissionCode = keyof typeof SYSTEM_PERMISSIONS;
