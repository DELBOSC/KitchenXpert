import os from 'os';

import { type Request, type Response } from 'express';

import { type UserRole } from '@kitchenxpert/common';

import { prisma } from '../../database/client';
import { asyncHandler } from '../middleware/error-middleware';

/**
 * Admin Controller
 * Handles administrative operations (super admin only)
 */
export class AdminController {
  // ==================== DASHBOARD ====================

  /**
   * GET /admin/dashboard
   * Get admin dashboard overview
   */
  getDashboard = asyncHandler(async (_req: Request, res: Response) => {
    const [
      userCount,
      projectCount,
      kitchenCount,
      partnerCount,
      orderCount,
      activeWebhookCount,
      recentUsers,
      recentProjects,
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.project.count({ where: { deletedAt: null } }),
      prisma.kitchen.count({ where: { deletedAt: null } }),
      prisma.partner.count({ where: { isActive: true } }),
      prisma.order.count(),
      prisma.webhook.count({ where: { isActive: true } }),
      prisma.user.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, email: true, firstName: true, lastName: true, createdAt: true },
      }),
      prisma.project.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, name: true, status: true, createdAt: true },
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        stats: {
          users: userCount,
          projects: projectCount,
          kitchens: kitchenCount,
          partners: partnerCount,
          orders: orderCount,
          activeWebhooks: activeWebhookCount,
        },
        recent: {
          users: recentUsers,
          projects: recentProjects,
        },
        timestamp: new Date().toISOString(),
      },
    });
  });

  // ==================== USER MANAGEMENT ====================

  /**
   * GET /admin/users
   * Get all users (admin view)
   */
  getUsers = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, search, isActive, role } = req.query;
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const skip = (Number(page) - 1) * limit;

    const where: any = {
      deletedAt: null,
    };
    if (search) {
      where.OR = [
        { email: { contains: search as string, mode: 'insensitive' } },
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
      ];
    }
    if (isActive !== undefined) {
      where.status = isActive === 'true' ? 'active' : 'suspended';
    }
    if (role) {
      const allowedRoles = ['admin', 'user', 'partner', 'designer'];
      if (!allowedRoles.includes(role as string)) {
        res.status(400).json({
          success: false,
          error: `Invalid role filter. Allowed: ${allowedRoles.join(', ')}`,
        });
        return;
      }
      where.role = role as string;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          emailVerified: true,
          createdAt: true,
          lastLoginAt: true,
          _count: { select: { projects: true, kitchens: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: users,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  });

  /**
   * PUT /admin/users/:id/role
   * Change user role
   */
  changeUserRole = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { role } = req.body;

    const allowedRoles: UserRole[] = ['admin', 'user', 'partner', 'designer'];
    if (!allowedRoles.includes(role)) {
      res.status(400).json({
        success: false,
        error: `Invalid role. Allowed roles: ${allowedRoles.join(', ')}`,
      });
      return;
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, email: true, role: true },
    });

    res.status(200).json({
      success: true,
      data: user,
      message: 'User role updated successfully',
    });
  });

  /**
   * PUT /admin/users/:id/toggle-active
   * Toggle user active status
   */
  toggleUserActive = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    const updated = await prisma.user.update({
      where: { id },
      data: { status: newStatus },
      select: { id: true, email: true, status: true },
    });

    res.status(200).json({
      success: true,
      data: updated,
      message: `User ${updated.status === 'active' ? 'activated' : 'deactivated'} successfully`,
    });
  });

  /**
   * DELETE /admin/users/:id
   * Soft delete a user
   */
  deleteUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'deleted' },
    });

    res.status(200).json({ success: true, message: 'User deleted successfully' });
  });

  // ==================== BULK ACTIONS ====================

  /**
   * PATCH /admin/users/bulk
   * Bulk update users (suspend, activate, changeRole)
   */
  bulkUpdateUsers = asyncHandler(async (req: Request, res: Response) => {
    const { userIds, action, value } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      res.status(400).json({ success: false, error: 'userIds array is required' });
      return;
    }

    if (!['suspend', 'activate', 'changeRole'].includes(action)) {
      res
        .status(400)
        .json({ success: false, error: 'Invalid action. Use: suspend, activate, changeRole' });
      return;
    }

    let updateData: Record<string, unknown> = {};
    switch (action) {
      case 'suspend':
        updateData = { status: 'suspended' };
        break;
      case 'activate':
        updateData = { status: 'active' };
        break;
      case 'changeRole':
        if (!value || !['user', 'admin', 'partner', 'designer'].includes(value)) {
          res
            .status(400)
            .json({ success: false, error: 'Valid role is required for changeRole action' });
          return;
        }
        updateData = { role: value };
        break;
    }

    const result = await prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: updateData,
    });

    res.json({
      success: true,
      updated: result.count,
      action,
    });
  });

  // ==================== SYSTEM MANAGEMENT ====================

  /**
   * GET /admin/system/info
   * Get system information
   */
  getSystemInfo = asyncHandler(async (_req: Request, res: Response) => {
    const memoryUsage = process.memoryUsage();

    res.status(200).json({
      success: true,
      data: {
        node: {
          version: process.version,
          uptime: Math.floor(process.uptime()),
          memory: {
            rss: Math.round(memoryUsage.rss / 1024 / 1024),
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          },
        },
        system: {
          platform: os.platform(),
          arch: os.arch(),
          cpus: os.cpus().length,
          loadAverage: os.loadavg(),
          totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024),
          freeMemory: Math.round(os.freemem() / 1024 / 1024 / 1024),
          uptime: Math.floor(os.uptime()),
        },
        env: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
      },
    });
  });

  /**
   * GET /admin/system/database
   * Get database statistics
   */
  getDatabaseStats = asyncHandler(async (_req: Request, res: Response) => {
    const [users, projects, kitchens, products, materials, orders, webhooks, auditLogs, metrics] =
      await Promise.all([
        prisma.user.count(),
        prisma.project.count(),
        prisma.kitchen.count(),
        prisma.product.count(),
        prisma.material.count(),
        prisma.order.count(),
        prisma.webhook.count(),
        prisma.auditLog.count(),
        prisma.metric.count(),
      ]);

    res.status(200).json({
      success: true,
      data: {
        tables: {
          users,
          projects,
          kitchens,
          products,
          materials,
          orders,
          webhooks,
          auditLogs,
          metrics,
        },
        total:
          users +
          projects +
          kitchens +
          products +
          materials +
          orders +
          webhooks +
          auditLogs +
          metrics,
        timestamp: new Date().toISOString(),
      },
    });
  });

  // ==================== MAINTENANCE ====================

  /**
   * POST /admin/maintenance/cleanup
   * Run maintenance cleanup tasks
   */
  runCleanup = asyncHandler(async (req: Request, res: Response) => {
    const allowedTasks = ['sessions', 'metrics', 'auditLogs', 'webhookEvents'];
    const { tasks = ['sessions', 'metrics', 'auditLogs'] } = req.body;

    if (
      !Array.isArray(tasks) ||
      tasks.some((t: unknown) => typeof t !== 'string' || !allowedTasks.includes(t))
    ) {
      res
        .status(400)
        .json({ success: false, error: `Invalid tasks. Allowed: ${allowedTasks.join(', ')}` });
      return;
    }

    const results: Record<string, number> = {};

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    if (tasks.includes('metrics')) {
      const metricsResult = await prisma.metric.deleteMany({
        where: { timestamp: { lt: thirtyDaysAgo } },
      });
      results.metrics = metricsResult.count;
    }

    if (tasks.includes('auditLogs')) {
      const auditResult = await prisma.auditLog.deleteMany({
        where: { createdAt: { lt: ninetyDaysAgo } },
      });
      results.auditLogs = auditResult.count;
    }

    if (tasks.includes('webhookEvents')) {
      const webhookResult = await prisma.webhookEvent.deleteMany({
        where: { createdAt: { lt: thirtyDaysAgo } },
      });
      results.webhookEvents = webhookResult.count;
    }

    res.status(200).json({
      success: true,
      data: results,
      message: 'Cleanup completed successfully',
    });
  });

  /**
   * POST /admin/maintenance/reindex
   * Trigger database reindexing for all major tables
   */
  reindex = asyncHandler(async (_req: Request, res: Response) => {
    const results: Record<string, string> = {};

    // Reindex all major tables using Prisma's $executeRawUnsafe
    const tables = [
      'User',
      'Kitchen',
      'KitchenItem',
      'Project',
      'Product',
      'Appliance',
      'Material',
      'Order',
    ];

    for (const table of tables) {
      try {
        await prisma.$executeRawUnsafe(`REINDEX TABLE "${table}"`);
        results[table] = 'success';
      } catch (error) {
        results[table] = `failed: ${error instanceof Error ? error.message : 'unknown'}`;
      }
    }

    // Also analyze tables for query optimization
    try {
      await prisma.$executeRawUnsafe('ANALYZE');
      results['ANALYZE'] = 'success';
    } catch (error) {
      results['ANALYZE'] = `failed: ${error instanceof Error ? error.message : 'unknown'}`;
    }

    res.status(200).json({
      success: true,
      data: results,
      message: 'Reindex operation completed',
    });
  });

  // ==================== CONFIGURATION ====================

  /**
   * GET /admin/config
   * Get system configuration
   */
  getConfig = asyncHandler(async (_req: Request, res: Response) => {
    // Return non-sensitive configuration
    res.status(200).json({
      success: true,
      data: {
        environment: process.env.NODE_ENV || 'development',
        features: {
          webhooksEnabled: true,
          metricsEnabled: true,
          auditEnabled: true,
        },
        limits: {
          maxProjectsPerUser: 50,
          maxKitchensPerProject: 10,
          fileUploadMaxSize: '10MB',
        },
        version: process.env.APP_VERSION || '1.0.0',
      },
    });
  });

  // ==================== REPORTS ====================

  /**
   * GET /admin/reports/usage
   * Get usage report
   */
  getUsageReport = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;
    const start = startDate
      ? new Date(startDate as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const [newUsers, newProjects, newKitchens, activeUsers] = await Promise.all([
      prisma.user.count({
        where: { createdAt: { gte: start, lte: end } },
      }),
      prisma.project.count({
        where: { createdAt: { gte: start, lte: end } },
      }),
      prisma.kitchen.count({
        where: { createdAt: { gte: start, lte: end } },
      }),
      prisma.user.count({
        where: { lastLoginAt: { gte: start, lte: end } },
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        period: { start, end },
        newUsers,
        newProjects,
        newKitchens,
        activeUsers,
      },
    });
  });

  /**
   * GET /admin/reports/errors
   * Get error report
   */
  getErrorReport = asyncHandler(async (req: Request, res: Response) => {
    const { hours = 24 } = req.query;
    const cappedHours = Math.min(Math.max(Number(hours), 1), 8760);
    const since = new Date();
    since.setHours(since.getHours() - cappedHours);

    const errors = await prisma.metric.findMany({
      where: {
        name: 'error',
        timestamp: { gte: since },
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    const errorCount = await prisma.metric.count({
      where: {
        name: 'error',
        timestamp: { gte: since },
      },
    });

    res.status(200).json({
      success: true,
      data: {
        period: { since, until: new Date() },
        count: errorCount,
        errors,
      },
    });
  });
}

export const adminController = new AdminController();
export default adminController;
