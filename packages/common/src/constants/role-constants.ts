/**
 * Constantes pour le système de rôles
 */

export const DEFAULT_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  DESIGNER: 'designer',
  SALES: 'sales',
  USER: 'user',
  GUEST: 'guest',
} as const;

export type DefaultRole = (typeof DEFAULT_ROLES)[keyof typeof DEFAULT_ROLES];

export const ROLE_HIERARCHY: Record<DefaultRole, number> = {
  super_admin: 100,
  admin: 90,
  manager: 70,
  designer: 50,
  sales: 50,
  user: 20,
  guest: 10,
};

export const ROLE_DESCRIPTIONS: Record<DefaultRole, string> = {
  super_admin: 'Super administrateur avec accès complet au système',
  admin: 'Administrateur avec accès étendu',
  manager: "Gestionnaire d'équipe",
  designer: 'Concepteur de cuisines',
  sales: 'Commercial',
  user: 'Utilisateur standard',
  guest: 'Invité avec accès limité',
};

export const ROLE_COLORS: Record<DefaultRole, string> = {
  super_admin: '#ef4444',
  admin: '#f97316',
  manager: '#eab308',
  designer: '#22c55e',
  sales: '#3b82f6',
  user: '#6b7280',
  guest: '#9ca3af',
};

export const ROLE_DEFAULT_PERMISSIONS: Record<DefaultRole, string[]> = {
  super_admin: ['*'],
  admin: ['user:*', 'kitchen:*', 'project:*', 'catalog:*', 'system:admin'],
  manager: ['user:read', 'kitchen:*', 'project:*', 'catalog:read'],
  designer: [
    'kitchen:create',
    'kitchen:read',
    'kitchen:update',
    'project:create',
    'project:read',
    'project:update',
    'catalog:read',
  ],
  sales: ['kitchen:read', 'project:read', 'catalog:read'],
  user: [
    'kitchen:create',
    'kitchen:read:own',
    'kitchen:update:own',
    'project:read:own',
    'catalog:read',
  ],
  guest: ['catalog:read'],
};
