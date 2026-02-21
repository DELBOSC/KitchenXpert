import { Request, Response } from 'express';
import { AuditLogRepository } from '../../repositories/audit-log-repository';
import { asyncHandler } from '../middleware/error-middleware';
import { prisma } from '../../database/client';
const auditLogRepository = new AuditLogRepository(prisma);

/**
 * Audit Controller
 * Handles all audit log HTTP requests (Admin only)
 */
export class AuditController {
  /**
   * GET /audit
   * Get all audit logs with filters
   */
  getAll = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, userId, action, resource, resourceId, startDate, endDate, ipAddress } = req.query;
    const limit = Math.min(Number(req.query.limit) || 50, 100);

    const result = await auditLogRepository.findAll(
      {
        userId: userId as string,
        action: action as string,
        resource: resource as string,
        resourceId: resourceId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        ipAddress: ipAddress as string,
      },
      { page: Number(page), limit: Number(limit) }
    );

    res.status(200).json({
      success: true,
      data: result.data,
      meta: { page: result.page, limit: Number(limit), total: result.total, totalPages: result.totalPages },
    });
  });

  /**
   * GET /audit/:id
   * Get a single audit log entry
   */
  getById = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const log = await auditLogRepository.findById(id);
    if (!log) {
      res.status(404).json({ success: false, error: 'Audit log not found' });
      return;
    }
    res.status(200).json({ success: true, data: log });
  });

  /**
   * GET /audit/user/:userId
   * Get audit logs for a specific user
   */
  getByUser = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.params.userId as string;
    const { limit = 100 } = req.query;
    const logs = await auditLogRepository.findByUserId(userId, Math.min(Number(limit), 100));
    res.status(200).json({ success: true, data: logs });
  });

  /**
   * GET /audit/resource/:resource/:resourceId
   * Get audit logs for a specific resource
   */
  getByResource = asyncHandler(async (req: Request, res: Response) => {
    const resource = req.params.resource as string;
    const resourceId = req.params.resourceId as string;
    const { limit = 100 } = req.query;
    const logs = await auditLogRepository.findByResource(resource, resourceId, Math.min(Number(limit), 100));
    res.status(200).json({ success: true, data: logs });
  });

  /**
   * GET /audit/resource/:resource/:resourceId/history
   * Get full history for a specific resource
   */
  getResourceHistory = asyncHandler(async (req: Request, res: Response) => {
    const resource = req.params.resource as string;
    const resourceId = req.params.resourceId as string;
    const { limit = 1000 } = req.query;
    const history = await auditLogRepository.getResourceHistory(resource, resourceId, Math.min(Number(limit), 1000));
    res.status(200).json({ success: true, data: history });
  });

  /**
   * GET /audit/stats
   * Get audit log statistics
   */
  getStats = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;
    const stats = await auditLogRepository.getStats(
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );
    res.status(200).json({ success: true, data: stats });
  });

  /**
   * GET /audit/user/:userId/activity
   * Get user activity summary
   */
  getUserActivity = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.params.userId as string;
    const { days = 30 } = req.query;
    const activity = await auditLogRepository.getUserActivity(userId, Math.min(Number(days), 365));
    res.status(200).json({ success: true, data: activity });
  });

  /**
   * GET /audit/export
   * Export audit logs
   */
  export = asyncHandler(async (req: Request, res: Response) => {
    const { userId, action, resource, startDate, endDate } = req.query;

    // Require date range to prevent unbounded exports (DoS risk)
    if (!startDate || !endDate) {
      res.status(400).json({ success: false, error: 'startDate and endDate are required for export' });
      return;
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    const maxRangeMs = 90 * 24 * 60 * 60 * 1000; // 90 days
    if (end.getTime() - start.getTime() > maxRangeMs) {
      res.status(400).json({ success: false, error: 'Date range cannot exceed 90 days' });
      return;
    }

    const logs = await auditLogRepository.export({
      userId: userId as string,
      action: action as string,
      resource: resource as string,
      startDate: start,
      endDate: end,
    });

    res.status(200).json({ success: true, data: logs });
  });

  /**
   * DELETE /audit/cleanup
   * Delete old audit logs (retention policy)
   */
  cleanup = asyncHandler(async (req: Request, res: Response) => {
    const { olderThanDays = 90 } = req.body;
    const date = new Date();
    date.setDate(date.getDate() - Number(olderThanDays));

    const result = await auditLogRepository.deleteOlderThan(date);
    res.status(200).json({ success: true, data: result, message: `Deleted ${result.count} old audit logs` });
  });
}

export const auditController = new AuditController();
export default auditController;
