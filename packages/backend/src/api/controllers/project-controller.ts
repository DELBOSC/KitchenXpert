import { type Request, type Response } from 'express';

import { config } from '../../config/app-config';
import { prisma } from '../../database/client';
import { ProjectRepository } from '../../repositories/project-repository';
import { getMailService } from '../../services/mail.service';
import logger from '../../utils/logger';
import { asyncHandler } from '../middleware/error-middleware';

const projectRepository = new ProjectRepository(prisma);

/**
 * Verify that the authenticated user owns the project.
 * Returns the project if owned, or sends 403/404 and returns null.
 */
async function verifyOwnership(
  req: Request,
  res: Response,
  projectId: string,
  includeRelations = false
): Promise<any | null> {
  const userId = req.user?.userId;
  const project = await projectRepository.findById(projectId, includeRelations);

  if (!project) {
    res.status(404).json({ success: false, error: 'Project not found' });
    return null;
  }

  // Allow access if user owns the project OR is admin
  if (project.userId !== userId && req.user?.role !== 'admin') {
    res.status(403).json({ success: false, error: 'Access denied' });
    return null;
  }

  return project;
}

/**
 * Project Controller
 * Handles all project-related HTTP requests
 */
export class ProjectController {
  /**
   * GET /projects
   * Get all projects for current user
   */
  getAll = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { page = 1, limit = 20, status, search } = req.query;

    const result = await projectRepository.findAll(
      { userId, status: status as string, search: search as string },
      { page: Number(page), limit: Number(limit) }
    );

    res.status(200).json({
      success: true,
      data: result.data,
      meta: {
        page: result.page,
        limit: Number(limit),
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  });

  /**
   * GET /projects/:id
   * Get a single project by ID
   */
  getById = asyncHandler(async (req: Request, res: Response) => {
    const project = await verifyOwnership(req, res, req.params.id as string, true);
    if (!project) {
      return;
    }

    res.status(200).json({ success: true, data: project });
  });

  /**
   * POST /projects/import-sandbox
   *
   * Atomically promotes a sandbox project (sent in the body, see
   * `importSandboxSchema` in project-routes.ts) into a real
   * Project + Kitchen + KitchenItem chain owned by the authenticated
   * user. Returns `{ projectId, kitchenId }`.
   *
   * The whole graph is created in one Prisma transaction so a partial
   * failure (e.g. a malformed item) leaves the database untouched.
   */
  importSandbox = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const { project: payload } = req.body as {
      project: {
        name: string;
        fromTemplate: string | null;
        kitchen: {
          name: string;
          layout:
            | 'L_SHAPED'
            | 'U_SHAPED'
            | 'GALLEY'
            | 'ISLAND'
            | 'PENINSULA'
            | 'ONE_WALL'
            | 'OPEN_PLAN';
          widthCm: number;
          depthCm: number;
          heightCm: number;
          items: Array<{
            sku: string | null;
            label: string;
            providerCode: 'IKEA' | 'LEROY_MERLIN' | 'CASTORAMA' | 'SCHMIDT' | 'BOSCH' | null;
            unitPrice: number;
            quantity: number;
            position: { x: number; y: number; z: number };
            rotation: number;
            size: { w: number; d: number; h: number };
          }>;
        };
      };
    };

    const created = await prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          userId,
          name: payload.name,
          description: payload.fromTemplate
            ? `Importé depuis le template sandbox « ${payload.fromTemplate} »`
            : 'Importé depuis le mode démo',
          status: 'in_progress',
          metadata: { source: 'sandbox', fromTemplate: payload.fromTemplate },
        },
      });

      const kitchen = await tx.kitchen.create({
        data: {
          projectId: project.id,
          userId,
          name: payload.kitchen.name,
          // Cast to the Prisma enum value names the schema uses; the
          // route validator already accepted the canonical labels.
          layout: payload.kitchen.layout.toLowerCase() as never,
          // The Kitchen schema uses Decimal — Prisma accepts numbers
          // and serialises them.
          width: payload.kitchen.widthCm,
          length: payload.kitchen.depthCm,
          height: payload.kitchen.heightCm,
          isGenerated: false,
          metadata: { source: 'sandbox' },
          // Default style — user can refine later in the UI.
          style: 'modern' as never,
        },
      });

      if (payload.kitchen.items.length > 0) {
        await tx.kitchenItem.createMany({
          data: payload.kitchen.items.map((it) => ({
            kitchenId: kitchen.id,
            type: 'cabinet',
            name: it.label,
            brand: it.providerCode,
            model: it.sku ?? undefined,
            positionX: it.position.x,
            positionY: it.position.y,
            positionZ: it.position.z,
            rotationY: it.rotation,
            width: it.size.w,
            depth: it.size.d,
            height: it.size.h,
            price: it.unitPrice * it.quantity,
            metadata: { source: 'sandbox', quantity: it.quantity },
          })),
        });
      }

      return { projectId: project.id, kitchenId: kitchen.id };
    });

    logger.info('Sandbox project imported', {
      userId,
      projectId: created.projectId,
      itemCount: payload.kitchen.items.length,
    });

    res.status(201).json({
      success: true,
      data: created,
      message: 'Sandbox project imported successfully',
    });
  });

  /**
   * POST /projects
   * Create a new project
   */
  create = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }
    const { name, description, budget, currency, deadline, metadata } = req.body;

    const project = await projectRepository.create({
      userId,
      name,
      description,
      budget: budget ? Number(budget) : undefined,
      currency,
      deadline: deadline ? new Date(deadline) : undefined,
      metadata,
    });

    res.status(201).json({
      success: true,
      data: project,
      message: 'Project created successfully',
    });
  });

  /**
   * PUT /projects/:id
   * Update a project
   */
  update = asyncHandler(async (req: Request, res: Response) => {
    const project = await verifyOwnership(req, res, req.params.id as string);
    if (!project) {
      return;
    }

    const { name, description, status, budget, currency, deadline, metadata } = req.body;

    const updated = await projectRepository.update(project.id, {
      name,
      description,
      status,
      budget: budget !== undefined ? Number(budget) : undefined,
      currency,
      deadline: deadline ? new Date(deadline) : undefined,
      metadata,
    });

    res.status(200).json({
      success: true,
      data: updated,
      message: 'Project updated successfully',
    });
  });

  /**
   * DELETE /projects/:id
   * Delete a project (soft delete)
   */
  delete = asyncHandler(async (req: Request, res: Response) => {
    const project = await verifyOwnership(req, res, req.params.id as string);
    if (!project) {
      return;
    }

    await projectRepository.delete(project.id);

    res.status(200).json({ success: true, message: 'Project deleted successfully' });
  });

  /**
   * PUT /projects/:id/status
   * Update project status
   */
  updateStatus = asyncHandler(async (req: Request, res: Response) => {
    const project = await verifyOwnership(req, res, req.params.id as string);
    if (!project) {
      return;
    }

    const { status } = req.body;
    const updated = await projectRepository.updateStatus(project.id, status);

    res.status(200).json({
      success: true,
      data: updated,
      message: 'Project status updated successfully',
    });
  });

  /**
   * POST /projects/:id/duplicate
   * Duplicate a project
   */
  duplicate = asyncHandler(async (req: Request, res: Response) => {
    const project = await verifyOwnership(req, res, req.params.id as string);
    if (!project) {
      return;
    }

    const { name } = req.body;
    const duplicated = await projectRepository.duplicate(project.id, name);

    res.status(201).json({
      success: true,
      data: duplicated,
      message: 'Project duplicated successfully',
    });
  });

  /**
   * GET /projects/:id/collaborators
   * Get project collaborators
   */
  getCollaborators = asyncHandler(async (req: Request, res: Response) => {
    const project = await verifyOwnership(req, res, req.params.id as string);
    if (!project) {
      return;
    }

    const collaborators = await projectRepository.getCollaborators(project.id);

    res.status(200).json({ success: true, data: collaborators });
  });

  /**
   * POST /projects/:id/collaborators
   * Add a collaborator to project
   */
  addCollaborator = asyncHandler(async (req: Request, res: Response) => {
    const project = await verifyOwnership(req, res, req.params.id as string);
    if (!project) {
      return;
    }

    const { email, role } = req.body;
    const collaborator = await projectRepository.addCollaborator(project.id, email, role);

    // Send project shared email to the collaborator (non-blocking)
    try {
      const owner = await prisma.user.findUnique({
        where: { id: project.userId },
        select: { firstName: true, lastName: true },
      });

      const ownerName = owner
        ? `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || 'Un utilisateur'
        : 'Un utilisateur';

      const mailService = getMailService();
      await mailService.sendProjectShared(
        { email, name: email.split('@')[0] },
        {
          recipientName: email.split('@')[0] || 'Collaborateur',
          ownerName,
          projectName: project.name || 'Projet sans nom',
          projectUrl: `${config.corsOrigins[0] || 'http://localhost:3000'}/projects/${project.id}`,
        }
      );
    } catch (error) {
      logger.error('Failed to send project shared email', { error, projectId: project.id, email });
    }

    res.status(201).json({
      success: true,
      data: collaborator,
      message: 'Collaborator added successfully',
    });
  });

  /**
   * DELETE /projects/:id/collaborators/:email
   * Remove a collaborator from project
   */
  removeCollaborator = asyncHandler(async (req: Request, res: Response) => {
    const project = await verifyOwnership(req, res, req.params.id as string);
    if (!project) {
      return;
    }

    const email = req.params.email as string;
    await projectRepository.removeCollaborator(project.id, email);

    res.status(200).json({ success: true, message: 'Collaborator removed successfully' });
  });

  /**
   * POST /projects/:id/collaborators/:email/accept
   * Accept collaboration invite
   */
  acceptInvite = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const email = req.params.email as string;
    const collaborator = await projectRepository.acceptInvite(id, email);

    res.status(200).json({
      success: true,
      data: collaborator,
      message: 'Invitation accepted successfully',
    });
  });

  /**
   * GET /projects/:id/kitchens
   * Get kitchens for a project
   */
  getKitchens = asyncHandler(async (req: Request, res: Response) => {
    const project = await verifyOwnership(req, res, req.params.id as string);
    if (!project) {
      return;
    }

    const full = await projectRepository.findById(project.id, true);

    res.status(200).json({
      success: true,
      data: full?.kitchens || [],
    });
  });

  /**
   * GET /projects/stats
   * Get project statistics for current user
   */
  getStats = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }
    const stats = await projectRepository.getUserStats(userId);

    res.status(200).json({ success: true, data: stats });
  });

  /**
   * GET /projects/shared
   * Get projects shared with current user
   */
  getShared = asyncHandler(async (req: Request, res: Response) => {
    const email = req.user?.email;
    if (!email) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }
    const projects = await projectRepository.findByCollaborator(email);

    res.status(200).json({ success: true, data: projects });
  });
}

export const projectController = new ProjectController();
export default projectController;
