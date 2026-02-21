import { PrismaClient, Project, ProjectCollaborator, Prisma } from '@prisma/client';

/**
 * Project Repository
 *
 * Handles all project-related database operations using Prisma ORM.
 */

export interface ProjectWithRelations extends Project {
  kitchens?: { id: string; name: string; style: string }[];
  collaborators?: ProjectCollaborator[];
  _count?: { kitchens: number; orders: number };
}

export interface CreateProjectDto {
  userId: string;
  name: string;
  description?: string;
  budget?: number;
  currency?: string;
  deadline?: Date;
  metadata?: Record<string, unknown>;
}

export interface UpdateProjectDto {
  name?: string;
  description?: string;
  status?: string;
  budget?: number;
  currency?: string;
  deadline?: Date;
  metadata?: Record<string, unknown>;
}

export interface ProjectFilters {
  userId?: string;
  status?: string;
  search?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class ProjectRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Find a project by ID
   */
  async findById(id: string, includeRelations = false): Promise<ProjectWithRelations | null> {
    return this.prisma.project.findUnique({
      where: { id, deletedAt: null },
      include: includeRelations ? {
        kitchens: { where: { deletedAt: null }, select: { id: true, name: true, style: true } },
        collaborators: true,
        orders: { select: { id: true, status: true, total: true } },
        questionnaireResponse: { include: { scoringResult: true } },
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        _count: { select: { kitchens: true, orders: true } }
      } : undefined
    });
  }

  /**
   * Find all projects with filters and pagination
   */
  async findAll(
    filters: ProjectFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<{ data: Project[]; total: number; page: number; totalPages: number }> {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
    const skip = (page - 1) * limit;

    const where: Prisma.ProjectWhereInput = {
      deletedAt: null,
      ...(filters.userId && { userId: filters.userId }),
      ...(filters.status && { status: filters.status as any }),
      ...(filters.search && {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } }
        ]
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: { select: { kitchens: true, orders: true } }
        }
      }),
      this.prisma.project.count({ where })
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Find projects by user ID
   */
  async findByUserId(userId: string): Promise<Project[]> {
    return this.prisma.project.findMany({
      where: { userId, deletedAt: null },
      include: {
        _count: { select: { kitchens: true } }
      },
      orderBy: { updatedAt: 'desc' }
    });
  }

  /**
   * Create a new project
   */
  async create(data: CreateProjectDto): Promise<Project> {
    return this.prisma.project.create({
      data: {
        userId: data.userId,
        name: data.name,
        description: data.description,
        budget: data.budget,
        currency: data.currency || 'EUR',
        deadline: data.deadline,
        status: 'draft',
        metadata: data.metadata as any,
      }
    });
  }

  /**
   * Update a project
   */
  async update(id: string, data: UpdateProjectDto): Promise<Project> {
    return this.prisma.project.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.status && { status: data.status as any }),
        ...(data.budget !== undefined && { budget: data.budget }),
        ...(data.currency && { currency: data.currency }),
        ...(data.deadline !== undefined && { deadline: data.deadline }),
        ...(data.metadata && { metadata: data.metadata as any }),
      }
    });
  }

  /**
   * Soft delete a project
   */
  async delete(id: string): Promise<Project> {
    return this.prisma.project.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }

  /**
   * Count projects
   */
  async count(filters: ProjectFilters = {}): Promise<number> {
    return this.prisma.project.count({
      where: {
        deletedAt: null,
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.status && { status: filters.status as any }),
      }
    });
  }

  // ==================== COLLABORATORS ====================

  /**
   * Add a collaborator to a project
   */
  async addCollaborator(projectId: string, email: string, role = 'viewer'): Promise<ProjectCollaborator> {
    return this.prisma.projectCollaborator.create({
      data: { projectId, email: email.toLowerCase(), role }
    });
  }

  /**
   * Remove a collaborator from a project
   */
  async removeCollaborator(projectId: string, email: string): Promise<ProjectCollaborator> {
    return this.prisma.projectCollaborator.delete({
      where: { projectId_email: { projectId, email: email.toLowerCase() } }
    });
  }

  /**
   * Get all collaborators for a project
   */
  async getCollaborators(projectId: string): Promise<ProjectCollaborator[]> {
    return this.prisma.projectCollaborator.findMany({
      where: { projectId }
    });
  }

  /**
   * Accept collaboration invite
   */
  async acceptInvite(projectId: string, email: string): Promise<ProjectCollaborator> {
    return this.prisma.projectCollaborator.update({
      where: { projectId_email: { projectId, email: email.toLowerCase() } },
      data: { acceptedAt: new Date() }
    });
  }

  /**
   * Find projects where user is a collaborator
   */
  async findByCollaborator(email: string): Promise<Project[]> {
    const collaborations = await this.prisma.projectCollaborator.findMany({
      where: { email: email.toLowerCase(), acceptedAt: { not: null } },
      include: { project: true }
    });
    return collaborations.map(c => c.project);
  }

  // ==================== STATUS TRANSITIONS ====================

  /**
   * Update project status with validation
   */
  async updateStatus(id: string, newStatus: string): Promise<Project> {
    // Only select the status field needed for transition validation
    const project = await this.prisma.project.findUnique({
      where: { id, deletedAt: null },
      select: { status: true },
    });
    if (!project) throw new Error('Project not found');

    const validTransitions: Record<string, string[]> = {
      draft: ['in_progress', 'archived'],
      in_progress: ['review', 'draft', 'archived'],
      review: ['approved', 'in_progress'],
      approved: ['completed', 'in_progress'],
      completed: ['archived'],
      archived: ['draft']
    };

    const currentStatus = project.status;
    const allowed = validTransitions[currentStatus] || [];

    if (!allowed.includes(newStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }

    return this.update(id, { status: newStatus });
  }

  // ==================== STATISTICS ====================

  /**
   * Get project statistics for a user.
   * Derives total count from the groupBy result instead of a separate count() query.
   */
  async getUserStats(userId: string): Promise<{
    total: number;
    byStatus: Record<string, number>;
    avgBudget: number | null;
  }> {
    const [statusStats, avgBudget] = await Promise.all([
      this.prisma.project.groupBy({
        by: ['status'],
        where: { userId, deletedAt: null },
        _count: { _all: true }
      }),
      this.prisma.project.aggregate({
        where: { userId, deletedAt: null, budget: { not: null } },
        _avg: { budget: true }
      })
    ]);

    let total = 0;
    const byStatus: Record<string, number> = {};
    statusStats.forEach(stat => {
      byStatus[stat.status] = stat._count._all;
      total += stat._count._all;
    });

    return {
      total,
      byStatus,
      avgBudget: avgBudget._avg.budget ? Number(avgBudget._avg.budget) : null
    };
  }

  /**
   * Duplicate a project
   */
  /**
   * Duplicate a project.
   * Uses select to fetch only the fields needed for duplication
   * instead of loading all relations with findById(true).
   */
  async duplicate(projectId: string, newName?: string): Promise<Project> {
    const original = await this.prisma.project.findUnique({
      where: { id: projectId, deletedAt: null },
      select: {
        userId: true,
        name: true,
        description: true,
        budget: true,
        currency: true,
        metadata: true,
      },
    });
    if (!original) throw new Error('Project not found');

    return this.prisma.project.create({
      data: {
        userId: original.userId,
        name: newName || `${original.name} (Copy)`,
        description: original.description,
        budget: original.budget,
        currency: original.currency,
        status: 'draft',
        metadata: original.metadata as any,
      }
    });
  }
}

export default ProjectRepository;
