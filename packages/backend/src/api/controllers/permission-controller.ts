import { type Request, type Response } from 'express';

import { prisma } from '../../database/client';
import { PermissionRepository } from '../../repositories/permission-repository';
import { asyncHandler } from '../middleware/error-middleware';
const permissionRepository = new PermissionRepository(prisma);

/**
 * Permission Controller
 * Handles all permission-related HTTP requests (Admin only)
 */
export class PermissionController {
  /**
   * GET /permissions
   * Get all permissions
   */
  getAll = asyncHandler(async (req: Request, res: Response) => {
    const { resource, action, search } = req.query;
    const permissions = await permissionRepository.findAll({
      resource: resource as string,
      action: action as string,
      search: search as string,
    });
    res.status(200).json({ success: true, data: permissions });
  });

  /**
   * GET /permissions/:id
   * Get a permission by ID
   */
  getById = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const permission = await permissionRepository.findById(id);
    if (!permission) {
      res.status(404).json({ success: false, error: 'Permission not found' });
      return;
    }
    res.status(200).json({ success: true, data: permission });
  });

  /**
   * POST /permissions
   * Create a new permission
   */
  create = asyncHandler(async (req: Request, res: Response) => {
    const { name, resource, action, description } = req.body;
    const permission = await permissionRepository.create({ name, resource, action, description });
    res
      .status(201)
      .json({ success: true, data: permission, message: 'Permission created successfully' });
  });

  /**
   * PUT /permissions/:id
   * Update a permission
   */
  update = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { name, description } = req.body;
    const permission = await permissionRepository.update(id, { name, description });
    res
      .status(200)
      .json({ success: true, data: permission, message: 'Permission updated successfully' });
  });

  /**
   * DELETE /permissions/:id
   * Delete a permission
   */
  delete = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    await permissionRepository.delete(id);
    res.status(200).json({ success: true, message: 'Permission deleted successfully' });
  });

  /**
   * GET /permissions/resources
   * Get all unique resources
   */
  getResources = asyncHandler(async (_req: Request, res: Response) => {
    const resources = await permissionRepository.getResources();
    res.status(200).json({ success: true, data: resources });
  });

  /**
   * GET /permissions/actions
   * Get all unique actions
   */
  getActions = asyncHandler(async (_req: Request, res: Response) => {
    const actions = await permissionRepository.getActions();
    res.status(200).json({ success: true, data: actions });
  });

  /**
   * GET /permissions/grouped
   * Get permissions grouped by resource
   */
  getGrouped = asyncHandler(async (_req: Request, res: Response) => {
    const grouped = await permissionRepository.getGroupedByResource();
    res.status(200).json({ success: true, data: grouped });
  });

  /**
   * POST /permissions/seed
   * Seed default permissions
   */
  seedDefaults = asyncHandler(async (_req: Request, res: Response) => {
    await permissionRepository.seedDefaults();
    res.status(200).json({ success: true, message: 'Default permissions seeded successfully' });
  });

  /**
   * POST /permissions/seed/:resource
   * Seed permissions for a specific resource
   */
  seedResource = asyncHandler(async (req: Request, res: Response) => {
    const resource = req.params.resource as string;
    const { actions } = req.body;
    const result = await permissionRepository.seedResourcePermissions(resource, actions);
    res
      .status(200)
      .json({ success: true, data: result, message: 'Resource permissions seeded successfully' });
  });

  /**
   * GET /permissions/check
   * Check if a permission exists
   */
  check = asyncHandler(async (req: Request, res: Response) => {
    const { resource, action } = req.query;
    const exists = await permissionRepository.exists(resource as string, action as string);
    res.status(200).json({ success: true, data: { exists } });
  });
}

export const permissionController = new PermissionController();
export default permissionController;
