import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/error-middleware.js';
import { prisma } from '../../database/client.js';
import logger from '../../utils/logger.js';
import { SmartHomeService } from '../../services/smart-home/smart-home.service.js';
import type { Position3D } from '../../services/smart-home/smart-home.service.js';

/**
 * SmartHomeController
 *
 * Exposes endpoints for creating, retrieving, and updating smart home plans,
 * browsing the device catalog, and computing signal coverage maps.
 */
export class SmartHomeController {
  private smartHomeService: SmartHomeService;

  constructor() {
    this.smartHomeService = new SmartHomeService();
  }

  /**
   * POST /smart-home
   * Create a new smart home plan for a kitchen.
   * Body: { kitchenId, preferences? }
   */
  createPlan = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const { kitchenId, preferences } = req.body;
    if (!kitchenId) {
      res.status(400).json({ success: false, error: 'kitchenId is required' });
      return;
    }

    // Verify the kitchen exists and belongs to the user
    const kitchen = await prisma.kitchen.findUnique({ where: { id: kitchenId } });
    if (!kitchen) {
      res.status(404).json({ success: false, error: 'Kitchen not found' });
      return;
    }

    if ((kitchen as Record<string, unknown>).userId !== userId && req.user?.role !== 'admin') {
      res.status(403).json({ success: false, error: 'You do not have access to this kitchen' });
      return;
    }

    logger.info('[SmartHome] Creating plan', { userId, kitchenId });

    const plan = await this.smartHomeService.createPlan(kitchenId, userId, preferences ?? {});

    res.status(201).json({ success: true, data: plan });
  });

  /**
   * GET /smart-home/:kitchenId
   * Retrieve the smart home plan for a kitchen.
   */
  getPlan = asyncHandler(async (req: Request, res: Response): Promise<void> => {
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
    const kitchen = await prisma.kitchen.findUnique({ where: { id: kitchenId } });
    if (!kitchen) {
      res.status(404).json({ success: false, error: 'Kitchen not found' });
      return;
    }

    if ((kitchen as Record<string, unknown>).userId !== userId && req.user?.role !== 'admin') {
      res.status(403).json({ success: false, error: 'You do not have access to this kitchen' });
      return;
    }

    const plan = await this.smartHomeService.getPlan(kitchenId);
    if (!plan) {
      res.status(404).json({ success: false, error: 'Smart home plan not found for this kitchen' });
      return;
    }

    res.status(200).json({ success: true, data: plan });
  });

  /**
   * PUT /smart-home/:kitchenId
   * Update the smart home plan for a kitchen.
   */
  updatePlan = asyncHandler(async (req: Request, res: Response): Promise<void> => {
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
    const kitchen = await prisma.kitchen.findUnique({ where: { id: kitchenId } });
    if (!kitchen) {
      res.status(404).json({ success: false, error: 'Kitchen not found' });
      return;
    }

    if ((kitchen as Record<string, unknown>).userId !== userId && req.user?.role !== 'admin') {
      res.status(403).json({ success: false, error: 'You do not have access to this kitchen' });
      return;
    }

    logger.info('[SmartHome] Updating plan', { userId, kitchenId });

    const plan = await this.smartHomeService.updatePlan(kitchenId, userId, req.body);

    res.status(200).json({ success: true, data: plan });
  });

  /**
   * GET /smart-home/devices
   * Return the full smart device catalog.
   */
  getDeviceCatalog = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const catalog = this.smartHomeService.getDeviceCatalog();
    res.status(200).json({ success: true, data: catalog });
  });

  /**
   * GET /smart-home/:kitchenId/coverage
   * Calculate WiFi/Zigbee/Thread signal coverage for a kitchen.
   * Query: routerX, routerY, routerZ, protocol
   */
  getCoverage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
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
    const kitchen = await prisma.kitchen.findUnique({ where: { id: kitchenId } });
    if (!kitchen) {
      res.status(404).json({ success: false, error: 'Kitchen not found' });
      return;
    }

    if ((kitchen as Record<string, unknown>).userId !== userId && req.user?.role !== 'admin') {
      res.status(403).json({ success: false, error: 'You do not have access to this kitchen' });
      return;
    }

    const routerPosition: Position3D = {
      x: parseFloat(req.query.routerX as string) || 0,
      y: parseFloat(req.query.routerY as string) || 1,
      z: parseFloat(req.query.routerZ as string) || 0,
    };
    const protocol = (req.query.protocol as string) || 'WiFi';

    const coverage = await this.smartHomeService.calculateCoverage(kitchenId, routerPosition, protocol);

    res.status(200).json({ success: true, data: coverage });
  });
}

export const smartHomeController = new SmartHomeController();
export default smartHomeController;
