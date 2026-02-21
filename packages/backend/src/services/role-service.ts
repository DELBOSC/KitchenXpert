/**
 * Role Service
 * Manages user roles and role-based features
 */

export interface RoleDefinition {
  id: string;
  name: string;
  slug: string;
  description: string;
  type: RoleType;
  level: number;
  permissions: RolePermission[];
  features: RoleFeature[];
  limits: RoleLimits;
  color?: string;
  icon?: string;
  isDefault?: boolean;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type RoleType = 'system' | 'admin' | 'standard' | 'partner' | 'custom';

export interface RolePermission {
  resource: string;
  actions: string[];
  scope?: 'own' | 'team' | 'all';
  conditions?: Record<string, unknown>;
}

export interface RoleFeature {
  id: string;
  name: string;
  enabled: boolean;
  config?: Record<string, unknown>;
}

export interface RoleLimits {
  maxProjects?: number;
  maxCollaborators?: number;
  maxStorage?: number;
  maxExports?: number;
  maxApiCalls?: number;
  maxAIConfigurations?: number;
  features?: Record<string, number>;
}

export interface RoleAssignment {
  userId: string;
  roleId: string;
  assignedBy: string;
  assignedAt: Date;
  expiresAt?: Date;
  scope?: RoleScope;
}

export interface RoleScope {
  type: 'global' | 'organization' | 'project';
  id?: string;
}

export interface RoleRepository {
  findById(id: string): Promise<RoleDefinition | null>;
  findBySlug(slug: string): Promise<RoleDefinition | null>;
  findAll(type?: RoleType): Promise<RoleDefinition[]>;
  create(data: Omit<RoleDefinition, 'id' | 'createdAt' | 'updatedAt'>): Promise<RoleDefinition>;
  update(id: string, data: Partial<RoleDefinition>): Promise<RoleDefinition | null>;
  delete(id: string): Promise<boolean>;
  getAssignments(userId: string): Promise<RoleAssignment[]>;
  assignRole(assignment: RoleAssignment): Promise<boolean>;
  revokeRole(userId: string, roleId: string): Promise<boolean>;
  getUsersByRole(roleId: string): Promise<string[]>;
}

export const SYSTEM_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  USER: 'user',
  GUEST: 'guest',
  PARTNER_ADMIN: 'partner_admin',
  PARTNER_USER: 'partner_user',
  DESIGNER: 'designer',
  INSTALLER: 'installer',
} as const;

export type SystemRole = typeof SYSTEM_ROLES[keyof typeof SYSTEM_ROLES];

export class RoleService {
  private roleCache: Map<string, RoleDefinition> = new Map();
  private cacheTimestamps: Map<string, number> = new Map();
  private CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private isCacheValid(key: string): boolean {
    const ts = this.cacheTimestamps.get(key);
    return ts ? Date.now() - ts < this.CACHE_TTL : false;
  }

  constructor(private repository: RoleRepository) {}

  async getRoleById(id: string): Promise<RoleDefinition | null> {
    if (this.roleCache.has(id) && this.isCacheValid(id)) {
      return this.roleCache.get(id)!;
    }
    const role = await this.repository.findById(id);
    if (role) {
      this.roleCache.set(id, role);
      this.cacheTimestamps.set(id, Date.now());
    }
    return role;
  }

  async getRoleBySlug(slug: string): Promise<RoleDefinition | null> {
    return this.repository.findBySlug(slug);
  }

  async getAllRoles(type?: RoleType): Promise<RoleDefinition[]> {
    return this.repository.findAll(type);
  }

  async getDefaultRole(): Promise<RoleDefinition | null> {
    const roles = await this.repository.findAll();
    return roles.find(r => r.isDefault) || null;
  }

  async createRole(
    data: Omit<RoleDefinition, 'id' | 'createdAt' | 'updatedAt' | 'isSystem'>
  ): Promise<RoleDefinition> {
    const existing = await this.repository.findBySlug(data.slug);
    if (existing) {
      throw new RoleServiceError('ROLE_EXISTS', 'A role with this slug already exists');
    }
    return this.repository.create({ ...data, isSystem: false });
  }

  async updateRole(id: string, data: Partial<RoleDefinition>): Promise<RoleDefinition | null> {
    const role = await this.repository.findById(id);
    if (!role) return null;

    if (role.isSystem && data.permissions) {
      throw new RoleServiceError('SYSTEM_ROLE', 'Cannot modify permissions of system role');
    }

    const updated = await this.repository.update(id, { ...data, updatedAt: new Date() });
    if (updated) {
      this.roleCache.set(id, updated);
      this.cacheTimestamps.set(id, Date.now());
    }
    return updated;
  }

  async deleteRole(id: string): Promise<boolean> {
    const role = await this.repository.findById(id);
    if (!role) return false;
    if (role.isSystem) {
      throw new RoleServiceError('SYSTEM_ROLE', 'Cannot delete system role');
    }

    const users = await this.repository.getUsersByRole(id);
    if (users.length > 0) {
      throw new RoleServiceError('ROLE_IN_USE', `Cannot delete role: ${users.length} users are assigned`);
    }

    this.roleCache.delete(id);
    this.cacheTimestamps.delete(id);
    return this.repository.delete(id);
  }

  async assignRole(
    userId: string,
    roleSlug: string,
    options?: { assignedBy?: string; expiresAt?: Date; scope?: RoleScope }
  ): Promise<boolean> {
    const role = await this.repository.findBySlug(roleSlug);
    if (!role) throw new RoleServiceError('ROLE_NOT_FOUND', 'Role not found');

    return this.repository.assignRole({
      userId,
      roleId: role.id,
      assignedBy: options?.assignedBy || 'system',
      assignedAt: new Date(),
      expiresAt: options?.expiresAt,
      scope: options?.scope,
    });
  }

  async revokeRole(userId: string, roleSlug: string): Promise<boolean> {
    const role = await this.repository.findBySlug(roleSlug);
    if (!role) throw new RoleServiceError('ROLE_NOT_FOUND', 'Role not found');
    return this.repository.revokeRole(userId, role.id);
  }

  async getUserRoles(userId: string): Promise<RoleDefinition[]> {
    const assignments = await this.repository.getAssignments(userId);
    const now = new Date();
    const validAssignments = assignments.filter(a => !a.expiresAt || a.expiresAt > now);

    const roles: RoleDefinition[] = [];
    for (const assignment of validAssignments) {
      const role = await this.getRoleById(assignment.roleId);
      if (role) roles.push(role);
    }

    return roles.sort((a, b) => b.level - a.level);
  }

  async getUserHighestRole(userId: string): Promise<RoleDefinition | null> {
    const roles = await this.getUserRoles(userId);
    return roles[0] || null;
  }

  async userHasRole(userId: string, roleSlug: string): Promise<boolean> {
    const roles = await this.getUserRoles(userId);
    return roles.some(r => r.slug === roleSlug);
  }

  async userHasAnyRole(userId: string, roleSlugs: string[]): Promise<boolean> {
    const roles = await this.getUserRoles(userId);
    return roles.some(r => roleSlugs.includes(r.slug));
  }

  async userHasMinimumLevel(userId: string, minLevel: number): Promise<boolean> {
    const roles = await this.getUserRoles(userId);
    return roles.some(r => r.level >= minLevel);
  }

  async getUserLimits(userId: string): Promise<RoleLimits> {
    const roles = await this.getUserRoles(userId);
    const mergedLimits: RoleLimits = {};

    for (const role of roles) {
      if (role.limits.maxProjects !== undefined) {
        mergedLimits.maxProjects = Math.max(mergedLimits.maxProjects || 0, role.limits.maxProjects);
      }
      if (role.limits.maxCollaborators !== undefined) {
        mergedLimits.maxCollaborators = Math.max(mergedLimits.maxCollaborators || 0, role.limits.maxCollaborators);
      }
      if (role.limits.maxStorage !== undefined) {
        mergedLimits.maxStorage = Math.max(mergedLimits.maxStorage || 0, role.limits.maxStorage);
      }
      if (role.limits.maxExports !== undefined) {
        mergedLimits.maxExports = Math.max(mergedLimits.maxExports || 0, role.limits.maxExports);
      }
      if (role.limits.maxAIConfigurations !== undefined) {
        mergedLimits.maxAIConfigurations = Math.max(mergedLimits.maxAIConfigurations || 0, role.limits.maxAIConfigurations);
      }
    }

    return mergedLimits;
  }

  async getUserFeatures(userId: string): Promise<RoleFeature[]> {
    const roles = await this.getUserRoles(userId);
    const featureMap = new Map<string, RoleFeature>();

    for (const role of roles.reverse()) {
      for (const feature of role.features) {
        featureMap.set(feature.id, feature);
      }
    }

    return Array.from(featureMap.values());
  }

  async userHasFeature(userId: string, featureId: string): Promise<boolean> {
    const features = await this.getUserFeatures(userId);
    const feature = features.find(f => f.id === featureId);
    return feature?.enabled || false;
  }

  async getUsersByRole(roleSlug: string): Promise<string[]> {
    const role = await this.repository.findBySlug(roleSlug);
    if (!role) return [];
    return this.repository.getUsersByRole(role.id);
  }

  async canManageUser(managerId: string, targetUserId: string): Promise<boolean> {
    const [managerRoles, targetRoles] = await Promise.all([
      this.getUserRoles(managerId),
      this.getUserRoles(targetUserId),
    ]);

    const managerMaxLevel = Math.max(...managerRoles.map(r => r.level), 0);
    const targetMaxLevel = Math.max(...targetRoles.map(r => r.level), 0);

    return managerMaxLevel > targetMaxLevel;
  }

  async initializeSystemRoles(): Promise<void> {
    const defaultRoles: Array<Omit<RoleDefinition, 'id' | 'createdAt' | 'updatedAt'>> = [
      {
        name: 'Super Administrateur',
        slug: SYSTEM_ROLES.SUPER_ADMIN,
        description: 'Accès complet à toutes les fonctionnalités',
        type: 'system',
        level: 100,
        permissions: [{ resource: '*', actions: ['*'], scope: 'all' }],
        features: [{ id: 'ai_configuration', name: 'Configuration IA', enabled: true }],
        limits: { maxAIConfigurations: -1 },
        color: '#8B0000',
        icon: 'shield-check',
        isSystem: true,
      },
      {
        name: 'Administrateur',
        slug: SYSTEM_ROLES.ADMIN,
        description: 'Gestion des utilisateurs et configuration',
        type: 'admin',
        level: 90,
        permissions: [
          { resource: 'users', actions: ['*'], scope: 'all' },
          { resource: 'projects', actions: ['*'], scope: 'all' },
          { resource: 'ai', actions: ['*'], scope: 'all' },
        ],
        features: [{ id: 'ai_configuration', name: 'Configuration IA', enabled: true }],
        limits: { maxAIConfigurations: 100 },
        color: '#DC143C',
        icon: 'shield',
        isSystem: true,
      },
      {
        name: 'Utilisateur',
        slug: SYSTEM_ROLES.USER,
        description: 'Utilisateur standard',
        type: 'standard',
        level: 10,
        permissions: [
          { resource: 'projects', actions: ['*'], scope: 'own' },
          { resource: 'catalog', actions: ['read'], scope: 'all' },
          { resource: 'ai', actions: ['read', 'create'], scope: 'own' },
        ],
        features: [{ id: 'ai_configuration', name: 'Configuration IA', enabled: true }],
        limits: {
          maxProjects: 10,
          maxCollaborators: 5,
          maxStorage: 1024,
          maxAIConfigurations: 20,
        },
        color: '#4169E1',
        icon: 'user',
        isDefault: true,
        isSystem: true,
      },
      {
        name: 'Invité',
        slug: SYSTEM_ROLES.GUEST,
        description: 'Accès limité en lecture seule',
        type: 'standard',
        level: 1,
        permissions: [
          { resource: 'projects', actions: ['read'], scope: 'own' },
          { resource: 'catalog', actions: ['read'], scope: 'all' },
        ],
        features: [{ id: 'ai_configuration', name: 'Configuration IA', enabled: false }],
        limits: { maxProjects: 0, maxCollaborators: 0, maxStorage: 0, maxAIConfigurations: 0 },
        color: '#808080',
        icon: 'eye',
        isSystem: true,
      },
    ];

    for (const roleData of defaultRoles) {
      const existing = await this.repository.findBySlug(roleData.slug);
      if (!existing) {
        await this.repository.create(roleData);
      }
    }
  }

  clearCache(): void {
    this.roleCache.clear();
    this.cacheTimestamps.clear();
  }
}

export class RoleServiceError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'RoleServiceError';
  }
}

export function createRoleService(repository: RoleRepository): RoleService {
  return new RoleService(repository);
}

export default RoleService;
