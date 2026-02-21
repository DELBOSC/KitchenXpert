/**
 * Constantes pour le système d'audit
 */

export const AUDIT_ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  LOGIN: 'login',
  LOGOUT: 'logout',
  EXPORT: 'export',
  IMPORT: 'import',
  SHARE: 'share',
  PERMISSION_CHANGE: 'permission_change',
} as const;

export type AuditAction = typeof AUDIT_ACTIONS[keyof typeof AUDIT_ACTIONS];

export const AUDIT_RESOURCES = {
  USER: 'user',
  KITCHEN: 'kitchen',
  PROJECT: 'project',
  PRODUCT: 'product',
  CATALOG: 'catalog',
  ORDER: 'order',
  PARTNER: 'partner',
  ROLE: 'role',
  PERMISSION: 'permission',
  SYSTEM: 'system',
} as const;

export type AuditResource = typeof AUDIT_RESOURCES[keyof typeof AUDIT_RESOURCES];

export const AUDIT_RETENTION_DAYS = {
  DEFAULT: 90,
  SECURITY: 365,
  GDPR: 1095, // 3 years
} as const;

export const AUDIT_LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  CRITICAL: 'critical',
} as const;

export type AuditLogLevel = typeof AUDIT_LOG_LEVELS[keyof typeof AUDIT_LOG_LEVELS];
