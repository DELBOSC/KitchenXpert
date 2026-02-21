/**
 * Compliance Controller
 * Handles HTTP requests for building code compliance checking.
 */

import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/error-middleware';
import { prisma } from '../../database/client';
import { complianceService, ComplianceServiceError } from '../../services/compliance/compliance.service';

/**
 * Helper to verify kitchen ownership.
 * Returns the kitchen if found and owned by the user, or sends an error response.
 */
async function verifyKitchenOwnership(
  req: Request,
  res: Response,
  kitchenId: string,
): Promise<any | null> {
  const userId = req.user?.userId;

  const kitchen = await prisma.kitchen.findUnique({
    where: { id: kitchenId },
  });

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

export class ComplianceController {
  /**
   * POST /compliance/check/:kitchenId
   * Run a full compliance check against all active rules.
   */
  runCheck = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { kitchenId } = req.params;
    const userId = req.user?.userId;

    if (!kitchenId) {
      res.status(400).json({ success: false, error: 'Kitchen ID is required' });
      return;
    }
    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    // Verify ownership
    const kitchen = await verifyKitchenOwnership(req, res, kitchenId);
    if (!kitchen) return;

    try {
      const result = await complianceService.checkKitchenCompliance(kitchenId, userId);

      res.status(200).json({
        success: true,
        data: result,
        message: result.status === 'passed'
          ? 'All compliance checks passed'
          : `${result.failedRules} rule(s) failed, ${result.warningRules} warning(s)`,
      });
    } catch (err) {
      if (err instanceof ComplianceServiceError) {
        const statusCode = err.code === 'KITCHEN_NOT_FOUND' ? 404
          : err.code === 'NO_RULES' ? 422
          : 500;
        res.status(statusCode).json({ success: false, error: err.message });
        return;
      }
      throw err;
    }
  });

  /**
   * GET /compliance/rules
   * List all active compliance rules (optionally filtered by category via query param).
   */
  getRules = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const category = req.query.category as string | undefined;
    const rules = await complianceService.getRules(category);

    res.status(200).json({
      success: true,
      data: rules,
      meta: { total: rules.length },
    });
  });

  /**
   * GET /compliance/rules/:code
   * Get rules by code category (e.g., "NF_C_15_100").
   */
  getRulesByCode = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { code } = req.params;

    if (!code) {
      res.status(400).json({ success: false, error: 'Rule code is required' });
      return;
    }

    const rules = await complianceService.getRulesByCode(code);

    res.status(200).json({
      success: true,
      data: rules,
      meta: { total: rules.length },
    });
  });

  /**
   * GET /compliance/history/:kitchenId
   * Get compliance check history for a kitchen.
   */
  getHistory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { kitchenId } = req.params;

    if (!kitchenId) {
      res.status(400).json({ success: false, error: 'Kitchen ID is required' });
      return;
    }

    // Verify ownership
    const kitchen = await verifyKitchenOwnership(req, res, kitchenId);
    if (!kitchen) return;

    const history = await complianceService.getCheckHistory(kitchenId);

    res.status(200).json({
      success: true,
      data: history,
      meta: { total: history.length },
    });
  });

  /**
   * POST /compliance/seed
   * Seed default French building code rules (admin only).
   */
  seedRules = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const result = await complianceService.seedDefaultRules();

    res.status(200).json({
      success: true,
      data: result,
      message: `Seeded ${result.created} new rules, updated ${result.updated} existing rules`,
    });
  });
}

export const complianceController = new ComplianceController();
export default complianceController;
