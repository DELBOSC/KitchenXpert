import { type Request, type Response } from 'express';

import { prisma } from '../../database/client';
import { asyncHandler } from '../middleware/error-middleware';

/**
 * Helper to verify kitchen ownership.
 * Returns the kitchen if owned by the requesting user (or user is admin), otherwise sends error.
 */
async function verifyKitchenOwnership(
  req: Request,
  res: Response,
  kitchenId: string
): Promise<{ id: string; userId: string } | null> {
  const userId = req.user?.userId;

  const kitchen = await prisma.kitchen.findFirst({
    where: { id: kitchenId, deletedAt: null },
    select: { id: true, userId: true },
  });

  if (!kitchen) {
    res.status(404).json({ success: false, error: 'Kitchen not found' });
    return null;
  }

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
 * Design Version Controller
 * Manages version history snapshots for kitchen designs.
 */
export class DesignVersionController {
  /**
   * POST /design-versions
   * Create a new version snapshot for a kitchen.
   * Body: { kitchenId: string, label?: string }
   */
  create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { kitchenId, label } = req.body as { kitchenId: string; label?: string };

    const kitchen = await verifyKitchenOwnership(req, res, kitchenId);
    if (!kitchen) {
      return;
    }

    // Load current items and configuration as snapshot
    const [items, configuration] = await Promise.all([
      prisma.kitchenItem.findMany({ where: { kitchenId } }),
      prisma.kitchenConfiguration.findFirst({ where: { kitchenId } }),
    ]);

    // Load kitchen metadata for the snapshot
    const kitchenData = await prisma.kitchen.findUnique({
      where: { id: kitchenId },
      select: {
        name: true,
        style: true,
        layout: true,
        width: true,
        length: true,
        height: true,
        metadata: true,
      },
    });

    const snapshot = {
      kitchen: kitchenData,
      items,
      configuration,
    };

    // Auto-increment version number
    const lastVersion = await prisma.designVersion.findFirst({
      where: { kitchenId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    const nextVersion = (lastVersion?.version ?? 0) + 1;

    const version = await prisma.designVersion.create({
      data: {
        kitchenId,
        userId,
        version: nextVersion,
        label: label || null,
        snapshot: snapshot as any,
      },
    });

    res.status(201).json({
      success: true,
      data: version,
    });
  });

  /**
   * GET /design-versions/:kitchenId
   * List all versions for a kitchen (newest first).
   */
  listVersions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { kitchenId } = req.params;
    if (!kitchenId) {
      res.status(400).json({ success: false, error: 'Kitchen ID required' });
      return;
    }

    const kitchen = await verifyKitchenOwnership(req, res, kitchenId);
    if (!kitchen) {
      return;
    }

    const versions = await prisma.designVersion.findMany({
      where: { kitchenId },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        version: true,
        label: true,
        thumbnail: true,
        createdAt: true,
      },
    });

    res.status(200).json({
      success: true,
      data: versions,
    });
  });

  /**
   * GET /design-versions/:kitchenId/:version
   * Get a specific version snapshot.
   */
  getVersion = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { kitchenId, version } = req.params;
    if (!kitchenId) {
      res.status(400).json({ success: false, error: 'Kitchen ID required' });
      return;
    }
    if (!version) {
      res.status(400).json({ success: false, error: 'Version required' });
      return;
    }

    const kitchen = await verifyKitchenOwnership(req, res, kitchenId);
    if (!kitchen) {
      return;
    }

    const designVersion = await prisma.designVersion.findUnique({
      where: {
        kitchenId_version: {
          kitchenId,
          version: Number(version),
        },
      },
    });

    if (!designVersion) {
      res.status(404).json({ success: false, error: 'Version not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: designVersion,
    });
  });

  /**
   * POST /design-versions/:kitchenId/:version/restore
   * Restore a version: delete current items/config, recreate from snapshot.
   */
  restoreVersion = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { kitchenId, version } = req.params;
    if (!kitchenId) {
      res.status(400).json({ success: false, error: 'Kitchen ID required' });
      return;
    }
    if (!version) {
      res.status(400).json({ success: false, error: 'Version required' });
      return;
    }

    const kitchen = await verifyKitchenOwnership(req, res, kitchenId);
    if (!kitchen) {
      return;
    }

    const designVersion = await prisma.designVersion.findUnique({
      where: {
        kitchenId_version: {
          kitchenId,
          version: Number(version),
        },
      },
    });

    if (!designVersion) {
      res.status(404).json({ success: false, error: 'Version not found' });
      return;
    }

    const snapshot = designVersion.snapshot as any;

    // Perform restore within a transaction
    await prisma.$transaction(async (tx) => {
      // Delete current items
      await tx.kitchenItem.deleteMany({ where: { kitchenId } });

      // Delete current configuration
      await tx.kitchenConfiguration.deleteMany({ where: { kitchenId } });

      // Restore kitchen base properties if present
      if (snapshot.kitchen) {
        await tx.kitchen.update({
          where: { id: kitchenId },
          data: {
            name: snapshot.kitchen.name,
            style: snapshot.kitchen.style,
            layout: snapshot.kitchen.layout,
            width: snapshot.kitchen.width,
            length: snapshot.kitchen.length,
            height: snapshot.kitchen.height,
            metadata: snapshot.kitchen.metadata,
          },
        });
      }

      // Recreate items from snapshot
      if (snapshot.items && Array.isArray(snapshot.items)) {
        for (const item of snapshot.items) {
          await tx.kitchenItem.create({
            data: {
              kitchenId,
              productId: item.productId || null,
              applianceId: item.applianceId || null,
              type: item.type,
              name: item.name,
              brand: item.brand || null,
              model: item.model || null,
              positionX: item.positionX,
              positionY: item.positionY,
              positionZ: item.positionZ,
              rotationY: item.rotationY,
              width: item.width,
              depth: item.depth,
              height: item.height,
              price: item.price || null,
              metadata: item.metadata || null,
            },
          });
        }
      }

      // Recreate configuration from snapshot
      if (snapshot.configuration) {
        const config = snapshot.configuration;
        await tx.kitchenConfiguration.create({
          data: {
            kitchenId,
            cabinetStyle: config.cabinetStyle || null,
            cabinetFinish: config.cabinetFinish || null,
            countertopMaterial: config.countertopMaterial || null,
            countertopColor: config.countertopColor || null,
            backsplashType: config.backsplashType || null,
            backsplashMaterial: config.backsplashMaterial || null,
            flooringType: config.flooringType || null,
            hardwareStyle: config.hardwareStyle || null,
            hardwareFinish: config.hardwareFinish || null,
            lightingPlan: config.lightingPlan || null,
            colorPalette: config.colorPalette || null,
            appliances: config.appliances || null,
          },
        });
      }
    });

    res.status(200).json({
      success: true,
      data: { message: `Restored to version ${version}` },
    });
  });

  /**
   * DELETE /design-versions/:kitchenId/:version
   * Delete a specific version.
   */
  deleteVersion = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { kitchenId, version } = req.params;
    if (!kitchenId) {
      res.status(400).json({ success: false, error: 'Kitchen ID required' });
      return;
    }
    if (!version) {
      res.status(400).json({ success: false, error: 'Version required' });
      return;
    }

    const kitchen = await verifyKitchenOwnership(req, res, kitchenId);
    if (!kitchen) {
      return;
    }

    const designVersion = await prisma.designVersion.findUnique({
      where: {
        kitchenId_version: {
          kitchenId,
          version: Number(version),
        },
      },
    });

    if (!designVersion) {
      res.status(404).json({ success: false, error: 'Version not found' });
      return;
    }

    await prisma.designVersion.delete({
      where: {
        kitchenId_version: {
          kitchenId,
          version: Number(version),
        },
      },
    });

    res.status(200).json({
      success: true,
      data: { message: `Version ${version} deleted` },
    });
  });
}

export const designVersionController = new DesignVersionController();
