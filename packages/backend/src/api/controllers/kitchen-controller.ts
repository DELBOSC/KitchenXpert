import bcrypt from 'bcrypt';
import { type Request, type Response } from 'express';

import { prisma } from '../../database/client';
import { KitchenRepository, type KitchenItemInput } from '../../repositories/kitchen-repository';
import { ProjectRepository } from '../../repositories/project-repository';
import { asyncHandler } from '../middleware/error-middleware';

const kitchenRepository = new KitchenRepository(prisma);

/**
 * Helper to verify kitchen ownership.
 * Returns the kitchen if found and owned by the user, or sends an error response.
 */
async function verifyKitchenOwnership(
  req: Request,
  res: Response,
  kitchenId: string
): Promise<any | null> {
  const userId = req.user?.userId;
  const kitchen = await kitchenRepository.findById(kitchenId, true);

  if (!kitchen) {
    res.status(404).json({ success: false, error: 'Kitchen not found' });
    return null;
  }

  // Admin can access any kitchen
  if (req.user?.role === 'admin') {
    return kitchen;
  }

  if (kitchen.userId !== userId) {
    res.status(403).json({ success: false, error: 'Access denied' });
    return null;
  }

  return kitchen;
}

/**
 * Kitchen Controller
 * Handles all kitchen-related HTTP requests
 */
export class KitchenController {
  /**
   * GET /kitchens
   * Get all kitchens for current user
   */
  getAll = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    const { page = 1, limit = 20, style, layout, isGenerated } = req.query;

    const result = await kitchenRepository.findAll(
      {
        userId,
        style: style as string | undefined,
        layout: layout as string | undefined,
        isGenerated: isGenerated === 'true' ? true : isGenerated === 'false' ? false : undefined,
      },
      {
        page: Number(page),
        limit: Number(limit),
      }
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
   * GET /kitchens/:id
   * Get a single kitchen by ID
   */
  getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({ success: false, error: 'Kitchen ID is required' });
      return;
    }
    const kitchen = await verifyKitchenOwnership(req, res, id);
    if (!kitchen) {
      return;
    }

    res.status(200).json({
      success: true,
      data: kitchen,
    });
  });

  /**
   * POST /kitchens
   * Create a new kitchen
   */
  create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    const { projectId, name, style, layout, width, length, height, metadata } = req.body;

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const kitchen = await kitchenRepository.create({
      projectId,
      userId,
      name,
      style,
      layout,
      width: Number(width),
      length: Number(length),
      height: height ? Number(height) : undefined,
      metadata,
    });

    res.status(201).json({
      success: true,
      data: kitchen,
      message: 'Kitchen created successfully',
    });
  });

  /**
   * PUT /kitchens/:id
   * Update a kitchen
   */
  update = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({ success: false, error: 'Kitchen ID is required' });
      return;
    }
    const existing = await verifyKitchenOwnership(req, res, id);
    if (!existing) {
      return;
    }

    const { name, style, layout, width, length, height, isGenerated, score, thumbnail, metadata } =
      req.body;

    const kitchen = await kitchenRepository.update(id, {
      name,
      style,
      layout,
      width: width ? Number(width) : undefined,
      length: length ? Number(length) : undefined,
      height: height ? Number(height) : undefined,
      isGenerated,
      score,
      thumbnail,
      metadata,
    });

    res.status(200).json({
      success: true,
      data: kitchen,
      message: 'Kitchen updated successfully',
    });
  });

  /**
   * DELETE /kitchens/:id
   * Delete a kitchen (soft delete)
   */
  delete = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({ success: false, error: 'Kitchen ID is required' });
      return;
    }
    const existing = await verifyKitchenOwnership(req, res, id);
    if (!existing) {
      return;
    }

    await kitchenRepository.delete(id);

    res.status(200).json({
      success: true,
      message: 'Kitchen deleted successfully',
    });
  });

  /**
   * POST /kitchens/:id/duplicate
   * Duplicate a kitchen
   */
  duplicate = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({ success: false, error: 'Kitchen ID is required' });
      return;
    }
    const existing = await verifyKitchenOwnership(req, res, id);
    if (!existing) {
      return;
    }

    const { name } = req.body;

    const kitchen = await kitchenRepository.duplicate(id, name);

    res.status(201).json({
      success: true,
      data: kitchen,
      message: 'Kitchen duplicated successfully',
    });
  });

  /**
   * GET /kitchens/:id/configuration
   * Get kitchen configuration
   */
  getConfiguration = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({ success: false, error: 'Kitchen ID is required' });
      return;
    }
    const existing = await verifyKitchenOwnership(req, res, id);
    if (!existing) {
      return;
    }

    const config = await kitchenRepository.getConfiguration(id);

    res.status(200).json({
      success: true,
      data: config,
    });
  });

  /**
   * PUT /kitchens/:id/configuration
   * Update kitchen configuration
   */
  updateConfiguration = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({ success: false, error: 'Kitchen ID is required' });
      return;
    }
    const existing = await verifyKitchenOwnership(req, res, id);
    if (!existing) {
      return;
    }

    const configData = req.body;

    const config = await kitchenRepository.upsertConfiguration(id, configData);

    res.status(200).json({
      success: true,
      data: config,
      message: 'Configuration updated successfully',
    });
  });

  /**
   * GET /kitchens/:id/items
   * Get all items in a kitchen
   */
  getItems = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({ success: false, error: 'Kitchen ID is required' });
      return;
    }
    const existing = await verifyKitchenOwnership(req, res, id);
    if (!existing) {
      return;
    }

    const items = await kitchenRepository.getItems(id);

    res.status(200).json({
      success: true,
      data: items,
    });
  });

  /**
   * POST /kitchens/:id/items
   * Add an item to a kitchen
   */
  addItem = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({ success: false, error: 'Kitchen ID is required' });
      return;
    }
    const existing = await verifyKitchenOwnership(req, res, id);
    if (!existing) {
      return;
    }

    const itemData = req.body;

    const item = await kitchenRepository.addItem(id, itemData);

    res.status(201).json({
      success: true,
      data: item,
      message: 'Item added successfully',
    });
  });

  /**
   * PUT /kitchens/:id/items
   * Replace the entire set of items (the saved 3D arrangement). Ownership-checked.
   */
  setItems = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({ success: false, error: 'Kitchen ID is required' });
      return;
    }
    const existing = await verifyKitchenOwnership(req, res, id);
    if (!existing) {
      return;
    }

    const { items } = req.body as { items: KitchenItemInput[] };
    const result = await kitchenRepository.replaceItems(id, items);

    res.status(200).json({
      success: true,
      data: { count: result.count },
      message: 'Items saved',
    });
  });

  /**
   * PUT /kitchens/:kitchenId/items/:itemId
   * Update a kitchen item
   */
  updateItem = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { kitchenId, itemId } = req.params;
    if (!kitchenId || !itemId) {
      res.status(400).json({ success: false, error: 'Kitchen ID and Item ID are required' });
      return;
    }

    // Verify ownership of the parent kitchen
    const kitchen = await verifyKitchenOwnership(req, res, kitchenId);
    if (!kitchen) {
      return;
    }

    // Verify item belongs to this kitchen
    const existingItem = await kitchenRepository.findItemInKitchen(kitchenId, itemId);
    if (!existingItem) {
      res.status(404).json({ success: false, error: 'Item not found in this kitchen' });
      return;
    }

    const itemData = req.body;
    const item = await kitchenRepository.updateItem(itemId, itemData);

    res.status(200).json({
      success: true,
      data: item,
      message: 'Item updated successfully',
    });
  });

  /**
   * DELETE /kitchens/:kitchenId/items/:itemId
   * Remove an item from a kitchen
   */
  removeItem = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { kitchenId, itemId } = req.params;
    if (!kitchenId || !itemId) {
      res.status(400).json({ success: false, error: 'Kitchen ID and Item ID are required' });
      return;
    }

    // Verify ownership of the parent kitchen
    const kitchen = await verifyKitchenOwnership(req, res, kitchenId);
    if (!kitchen) {
      return;
    }

    // Verify item belongs to this kitchen
    const existingItem = await kitchenRepository.findItemInKitchen(kitchenId, itemId);
    if (!existingItem) {
      res.status(404).json({ success: false, error: 'Item not found in this kitchen' });
      return;
    }

    await kitchenRepository.removeItem(itemId);

    res.status(200).json({
      success: true,
      message: 'Item removed successfully',
    });
  });

  /**
   * GET /kitchens/stats
   * Get kitchen statistics for current user
   */
  getStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }
    const stats = await kitchenRepository.getUserStats(userId);

    res.status(200).json({
      success: true,
      data: stats,
    });
  });

  /**
   * GET /kitchens/project/:projectId
   * Get kitchens by project
   */
  getByProject = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const projectId = req.params.projectId;
    const userId = req.user?.userId;

    if (!projectId) {
      res.status(400).json({ success: false, error: 'Project ID is required' });
      return;
    }

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    // Verify the project belongs to the current user (or user is admin)
    const projectRepository = new ProjectRepository(prisma);
    const project = await projectRepository.findById(projectId, false);

    if (!project) {
      res.status(404).json({ success: false, error: 'Project not found' });
      return;
    }

    if (project.userId !== userId && req.user?.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    const kitchens = await kitchenRepository.findByProjectId(projectId);

    res.status(200).json({
      success: true,
      data: kitchens,
    });
  });

  // ==================== ARCHIVE / RESTORE ====================

  /**
   * POST /kitchens/:id/archive
   * Archive a kitchen
   */
  archive = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({ success: false, error: 'Kitchen ID is required' });
      return;
    }
    const existing = await verifyKitchenOwnership(req, res, id);
    if (!existing) {
      return;
    }

    const kitchen = await kitchenRepository.archive(id);

    res.status(200).json({
      success: true,
      data: kitchen,
      message: 'Kitchen archived successfully',
    });
  });

  /**
   * POST /kitchens/:id/restore
   * Restore an archived or deleted kitchen
   */
  restore = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({ success: false, error: 'Kitchen ID is required' });
      return;
    }
    const existing = await verifyKitchenOwnership(req, res, id);
    if (!existing) {
      return;
    }

    const kitchen = await kitchenRepository.restore(id);

    res.status(200).json({
      success: true,
      data: kitchen,
      message: 'Kitchen restored successfully',
    });
  });

  /**
   * GET /kitchens/archived
   * Get all archived kitchens for current user
   */
  getArchived = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }
    const kitchens = await kitchenRepository.findArchived(userId);

    res.status(200).json({
      success: true,
      data: kitchens,
    });
  });

  // ==================== 3D MODEL ====================

  /**
   * GET /kitchens/:id/model
   * Get 3D model data for a kitchen
   */
  getModel = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({ success: false, error: 'Kitchen ID is required' });
      return;
    }
    const existing = await verifyKitchenOwnership(req, res, id);
    if (!existing) {
      return;
    }

    const modelData = await kitchenRepository.getModel(id);

    res.status(200).json({
      success: true,
      data: modelData,
    });
  });

  /**
   * PUT /kitchens/:id/thumbnail
   * Update kitchen thumbnail
   */
  updateThumbnail = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({ success: false, error: 'Kitchen ID is required' });
      return;
    }
    const existing = await verifyKitchenOwnership(req, res, id);
    if (!existing) {
      return;
    }

    const { thumbnailUrl } = req.body;
    if (!thumbnailUrl) {
      res.status(400).json({ success: false, error: 'Thumbnail URL is required' });
      return;
    }
    const kitchen = await kitchenRepository.updateModelThumbnail(id, thumbnailUrl);

    res.status(200).json({
      success: true,
      data: kitchen,
      message: 'Thumbnail updated successfully',
    });
  });

  // ==================== EXPORT ====================

  /**
   * GET /kitchens/:id/export
   * Export kitchen data
   */
  exportKitchen = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({ success: false, error: 'Kitchen ID is required' });
      return;
    }
    const existing = await verifyKitchenOwnership(req, res, id);
    if (!existing) {
      return;
    }

    const format = (req.query.format as 'json' | 'pdf' | 'csv') || 'json';
    const exportData = await kitchenRepository.exportData(id, format);

    res.status(200).json({
      success: true,
      data: exportData,
    });
  });

  // ==================== SHARING ====================

  /**
   * POST /kitchens/:id/share
   * Create a share link for a kitchen
   */
  createShareLink = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({ success: false, error: 'Kitchen ID is required' });
      return;
    }
    const existing = await verifyKitchenOwnership(req, res, id);
    if (!existing) {
      return;
    }

    const { expiresIn, allowEdit, password } = req.body;
    const shareData = await kitchenRepository.createShareLink(id, {
      expiresIn,
      allowEdit,
      password,
    });

    res.status(201).json({
      success: true,
      data: shareData,
      message: 'Share link created successfully',
    });
  });

  /**
   * GET /kitchens/shared/:shareId
   * Get kitchen by share link
   */
  getByShareId = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const shareId = req.params.shareId;
    if (!shareId) {
      res.status(400).json({ success: false, error: 'Share ID is required' });
      return;
    }
    const kitchen = await kitchenRepository.findByShareId(shareId);

    if (!kitchen) {
      res.status(404).json({
        success: false,
        error: 'Kitchen not found or share link has expired',
      });
      return;
    }

    // Verify share link password if one is set
    const metadata = kitchen.metadata as Record<string, any>;
    const share = metadata?.shares?.find((s: any) => s.shareId === shareId);
    if (share?.password) {
      const password = req.body.password as string;
      if (!password) {
        res.status(401).json({
          success: false,
          error: 'Password is required to access this shared kitchen',
        });
        return;
      }
      const isMatch = await bcrypt.compare(password, share.password);
      if (!isMatch) {
        res.status(401).json({
          success: false,
          error: 'Invalid password for this shared kitchen',
        });
        return;
      }
    }

    res.status(200).json({
      success: true,
      data: kitchen,
    });
  });

  /**
   * DELETE /kitchens/:id/share/:shareId
   * Revoke a share link
   */
  revokeShareLink = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id, shareId } = req.params;
    if (!id || !shareId) {
      res.status(400).json({ success: false, error: 'Kitchen ID and Share ID are required' });
      return;
    }
    const existing = await verifyKitchenOwnership(req, res, id);
    if (!existing) {
      return;
    }

    await kitchenRepository.revokeShareLink(id, shareId);

    res.status(200).json({
      success: true,
      message: 'Share link revoked successfully',
    });
  });
}

export const kitchenController = new KitchenController();
export default kitchenController;
