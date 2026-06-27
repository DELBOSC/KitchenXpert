import { prisma } from '../../database/client';
import { createModuleLogger } from '../../utils/logger';
import { asyncHandler } from '../middleware/error-middleware';

import type { Request, Response } from 'express';

const logger = createModuleLogger('gdpr-controller');

/**
 * GDPR Controller
 *
 * Implements the user-facing rights from Regulation (EU) 2016/679:
 *   - Art. 15 "Right of access"   → GET /me/gdpr/summary
 *   - Art. 20 "Data portability"  → GET /me/gdpr/export
 *   - Art. 17 "Right to erasure"  → DELETE /me/gdpr/account
 *
 * Erasure schedules a hard-delete after a short retention window so fraud /
 * accounting data required by law (invoices: 10 years, Art. L123-22 Code de
 * commerce) stays accessible until purged by the scheduled job.
 */
export class GDPRController {
  // --- Art. 15 — summarise what we hold on the user ---------------------
  getSummary = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }
    const [user, kitchens, projects, orders, auditEvents] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, createdAt: true, status: true, emailVerified: true },
      }),
      prisma.kitchen.count({ where: { userId } }),
      prisma.project.count({ where: { userId } }),
      prisma.order.count({ where: { userId } }),
      prisma.auditLog.count({ where: { userId } }),
    ]);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    res.json({
      success: true,
      data: {
        account: user,
        holdings: {
          kitchens,
          projects,
          orders,
          auditEvents,
        },
        retention: {
          accountData: '3 ans après dernière activité',
          invoices: '10 ans (Art. L123-22 Code de commerce)',
          auditLogs: '1 an',
        },
      },
    });
  });

  // --- Art. 20 — portable export --------------------------------------------
  exportData = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const [user, kitchens, projects, orders, preferences, notifications] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatar: true,
          language: true,
          timezone: true,
          role: true,
          status: true,
          emailVerified: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.kitchen.findMany({ where: { userId }, include: { configuration: true, items: true } }),
      prisma.project.findMany({ where: { userId } }),
      prisma.order.findMany({ where: { userId } }),
      prisma.userPreference.findFirst({ where: { userId } }).catch(() => null),
      prisma.notification
        .findMany({ where: { userId }, take: 500, orderBy: { createdAt: 'desc' } })
        .catch(() => []),
    ]);

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const payload = {
      meta: {
        exportedAt: new Date().toISOString(),
        regulation: 'EU 2016/679 (GDPR) Art. 20 — Right to data portability',
        format: 'application/json',
      },
      account: user,
      preferences,
      kitchens,
      projects,
      orders,
      notifications,
    };

    await prisma.auditLog
      .create({
        data: {
          userId,
          action: 'export',
          resource: 'user',
          resourceId: userId,
          metadata: { kind: 'gdpr_export_art_20' },
        },
      })
      .catch((err) => logger.warn('audit log failed for gdpr_export', { err: String(err) }));

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="kitchenxpert-export-${userId}-${Date.now()}.json"`
    );
    res.status(200).send(JSON.stringify(payload, null, 2));
  });

  // --- Art. 17 — right to erasure -------------------------------------------
  requestErasure = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.slice(0, 500) : null;

    // Anonymise the account immediately so the user disappears from the UI;
    // a scheduled job (see jobs/gdpr-purge.ts) performs the hard delete after
    // the legal retention window ends for related business records.
    const hash = `deleted-${userId}-${Date.now()}`;
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          email: `${hash}@deleted.invalid`,
          firstName: 'Deleted',
          lastName: 'User',
          phone: null,
          avatar: null,
          status: 'suspended' as never,
          // Overwrite password hash so no session can be re-issued.
          password: hash,
        },
      });
      await tx.userSession.deleteMany({ where: { userId } });
      await tx.emailVerificationToken.deleteMany({ where: { userId } });
      await tx.passwordResetToken.deleteMany({ where: { userId } });
      await tx.auditLog.create({
        data: {
          userId,
          action: 'delete',
          resource: 'user',
          resourceId: userId,
          metadata: { kind: 'gdpr_erasure_art_17', reason },
        },
      });
    });

    // Clear session cookies on the response.
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    res.status(200).json({
      success: true,
      data: {
        message:
          'Compte anonymisé. Les données seront définitivement purgées après la période de conservation légale.',
        scheduledHardDeleteAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    });
  });
}

export const gdprController = new GDPRController();
