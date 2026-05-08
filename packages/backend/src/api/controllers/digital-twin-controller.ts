import { type Request, type Response } from 'express';

import { prisma } from '../../database/client';
import { DigitalTwinService } from '../../services/digital-twin/digital-twin.service';
import logger from '../../utils/logger';
import { asyncHandler } from '../middleware/error-middleware';

/**
 * DigitalTwinController
 *
 * Exposes digital twin creation, retrieval, sync, and maintenance
 * schedule endpoints, delegating to the DigitalTwinService.
 */
export class DigitalTwinController {
  private twinService: DigitalTwinService;

  constructor() {
    this.twinService = new DigitalTwinService();
  }

  /**
   * POST /digital-twin/
   * Create a digital twin from a kitchen design.
   * Body: { kitchenId }
   */
  createTwin = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const { kitchenId } = req.body;
    if (!kitchenId) {
      res.status(400).json({ success: false, error: 'kitchenId is required' });
      return;
    }

    // Verify the kitchen exists and belongs to the user
    const kitchen = await prisma.kitchen.findUnique({
      where: { id: kitchenId },
    });

    if (!kitchen) {
      res.status(404).json({ success: false, error: 'Kitchen not found' });
      return;
    }

    if ((kitchen as Record<string, unknown>).userId !== userId && req.user?.role !== 'admin') {
      res.status(403).json({ success: false, error: 'You do not have access to this kitchen' });
      return;
    }

    logger.info('[DigitalTwin] Creating digital twin', { userId, kitchenId });

    const twin = await this.twinService.createDigitalTwin(kitchenId);

    res.status(201).json({ success: true, data: twin });
  });

  /**
   * GET /digital-twin/:kitchenId
   * Retrieve digital twin data for a kitchen.
   */
  getTwin = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const { kitchenId } = req.params;
    if (!kitchenId) {
      res.status(400).json({ success: false, error: 'kitchenId is required' });
      return;
    }

    logger.info('[DigitalTwin] Retrieving digital twin', { userId, kitchenId });

    const twinRecord = await prisma.digitalTwin.findFirst({
      where: { kitchenId },
    });

    if (!twinRecord) {
      res.status(404).json({ success: false, error: 'Digital twin not found for this kitchen' });
      return;
    }

    // Verify ownership through the linked kitchen
    const kitchen = await prisma.kitchen.findUnique({
      where: { id: kitchenId },
    });

    if (kitchen && (kitchen as Record<string, unknown>).userId !== userId && req.user?.role !== 'admin') {
      res.status(403).json({ success: false, error: 'You do not have access to this digital twin' });
      return;
    }

    const data = JSON.parse((twinRecord as Record<string, unknown>).data as string);

    res.status(200).json({
      success: true,
      data: {
        id: twinRecord.id,
        kitchenId: twinRecord.kitchenId,
        installedAt: (twinRecord as Record<string, unknown>).installedAt,
        ...data,
      },
    });
  });

  /**
   * PUT /digital-twin/:kitchenId/sync
   * Sync digital twin data with the current kitchen state.
   */
  syncTwin = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const { kitchenId } = req.params;
    if (!kitchenId) {
      res.status(400).json({ success: false, error: 'kitchenId is required' });
      return;
    }

    // Verify the kitchen exists and belongs to the user
    const kitchen = await prisma.kitchen.findUnique({
      where: { id: kitchenId },
    });

    if (!kitchen) {
      res.status(404).json({ success: false, error: 'Kitchen not found' });
      return;
    }

    if ((kitchen as Record<string, unknown>).userId !== userId && req.user?.role !== 'admin') {
      res.status(403).json({ success: false, error: 'You do not have access to this kitchen' });
      return;
    }

    logger.info('[DigitalTwin] Syncing digital twin', { userId, kitchenId });

    // Re-create the digital twin to sync with current kitchen state
    const twin = await this.twinService.createDigitalTwin(kitchenId);

    res.status(200).json({ success: true, data: twin });
  });

  /**
   * GET /digital-twin/:kitchenId/maintenance
   * Get maintenance schedule for a kitchen's digital twin.
   */
  getMaintenanceSchedule = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const { kitchenId } = req.params;
    if (!kitchenId) {
      res.status(400).json({ success: false, error: 'kitchenId is required' });
      return;
    }

    // Verify ownership through the linked kitchen
    const kitchen = await prisma.kitchen.findUnique({
      where: { id: kitchenId },
    });

    if (!kitchen) {
      res.status(404).json({ success: false, error: 'Kitchen not found' });
      return;
    }

    if ((kitchen as Record<string, unknown>).userId !== userId && req.user?.role !== 'admin') {
      res.status(403).json({ success: false, error: 'You do not have access to this kitchen' });
      return;
    }

    logger.info('[DigitalTwin] Retrieving maintenance schedule', { userId, kitchenId });

    // Load the digital twin
    const twinRecord = await prisma.digitalTwin.findFirst({
      where: { kitchenId },
    });

    if (!twinRecord) {
      res.status(404).json({ success: false, error: 'Digital twin not found for this kitchen' });
      return;
    }

    const twinData = JSON.parse((twinRecord as Record<string, unknown>).data as string);

    // Reconstruct the DigitalTwin object for the service
    const twin = {
      id: twinRecord.id,
      kitchenId: twinRecord.kitchenId,
      installedAt: new Date((twinRecord as Record<string, unknown>).installedAt as string),
      items: twinData.items || [],
      technicalPlan: twinData.technicalPlan || { electricalCircuits: [], plumbingConnections: [] },
    };

    const schedule = this.twinService.getMaintenanceSchedule(twin);

    res.status(200).json({ success: true, data: schedule });
  });
}

export const digitalTwinController = new DigitalTwinController();
export default digitalTwinController;
