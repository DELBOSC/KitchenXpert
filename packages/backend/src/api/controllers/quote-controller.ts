import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/error-middleware';
import { Prisma } from '@prisma/client';
import { prisma } from '../../database/client';
import { getMailService } from '../../services/mail.service';
import logger from '../../utils/logger';
import crypto from 'crypto';

/**
 * Quote Controller
 * Handles sending kitchen design quote requests to partners/installers
 */
export class QuoteController {
  /**
   * POST /quotes/send
   * Send a quote request to a partner with the complete design package
   */
  send = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const { kitchenId, partnerId, message, timeline, contactInfo } = req.body;

    // Validate required fields
    if (!kitchenId) {
      res.status(400).json({ success: false, error: 'Kitchen ID is required' });
      return;
    }

    if (!partnerId) {
      res.status(400).json({ success: false, error: 'Partner ID is required' });
      return;
    }

    if (!contactInfo || !contactInfo.email) {
      res.status(400).json({ success: false, error: 'Contact information with email is required' });
      return;
    }

    // Verify kitchen exists and belongs to user
    const kitchen = await prisma.kitchen.findUnique({
      where: { id: kitchenId },
      include: {
        project: { select: { userId: true, name: true } },
      },
    });

    if (!kitchen) {
      res.status(404).json({ success: false, error: 'Kitchen not found' });
      return;
    }

    // Ownership check
    if (kitchen.project?.userId !== userId && req.user?.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    // Verify partner exists
    const partner = await prisma.partner.findUnique({
      where: { id: partnerId },
      select: { id: true, name: true, email: true, isActive: true },
    });

    if (!partner) {
      res.status(404).json({ success: false, error: 'Partner not found' });
      return;
    }

    if (!partner.isActive) {
      res.status(400).json({ success: false, error: 'This partner is currently not accepting quote requests' });
      return;
    }

    // Generate a unique reference for this quote request
    const quoteRef = `QR-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    // Generate a secure share link for the design package
    const shareToken = crypto.randomBytes(32).toString('hex');
    const designPackageUrl = `${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/shared/kitchen/${kitchenId}?token=${shareToken}`;

    // Create the quote request record
    const quoteRequest = await (prisma as any).quoteRequest.create({
      data: {
        reference: quoteRef,
        kitchenId,
        userId,
        partnerId,
        message: message || '',
        timeline: timeline || 'flexible',
        contactName: contactInfo.name || '',
        contactEmail: contactInfo.email,
        contactPhone: contactInfo.phone || '',
        shareToken,
        status: 'pending',
      },
    });

    // Send email to partner (non-blocking)
    try {
      const mailService = getMailService();
      await mailService.send({
        to: { email: partner.email, name: partner.name },
        subject: `New Kitchen Quote Request - ${quoteRef}`,
        html: buildPartnerEmailHtml({
          partnerName: partner.name,
          quoteRef,
          projectName: kitchen.project?.name || kitchen.name || 'Kitchen Design',
          kitchenName: kitchen.name || 'Kitchen',
          contactInfo,
          message: message || '',
          timeline: timeline || 'flexible',
          designPackageUrl,
        }),
      });
    } catch (error) {
      logger.error('Failed to send quote request email to partner', {
        error,
        quoteRequestId: quoteRequest.id,
        partnerId,
      });
    }

    // Create webhook event for the quote request
    try {
      await (prisma as any).webhookEvent.create({
        data: {
          type: 'quote_request.created',
          payload: {
            quoteRequestId: quoteRequest.id,
            reference: quoteRef,
            kitchenId,
            partnerId,
            userId,
            timeline,
          } as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      logger.error('Failed to create webhook event for quote request', {
        error,
        quoteRequestId: quoteRequest.id,
      });
    }

    res.status(201).json({
      success: true,
      data: {
        id: quoteRequest.id,
        reference: quoteRef,
        status: 'pending',
        partnerName: partner.name,
      },
      message: `Your quote request has been sent to ${partner.name}. They will respond within 48h.`,
    });
  });

  /**
   * GET /quotes
   * Get all quote requests for the current user
   */
  getAll = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [quotes, total] = await Promise.all([
      (prisma as any).quoteRequest.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          partner: { select: { id: true, name: true, email: true } },
          kitchen: { select: { id: true, name: true } },
        },
      }),
      (prisma as any).quoteRequest.count({ where: { userId } }),
    ]);

    res.status(200).json({
      success: true,
      data: quotes,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  });

  /**
   * GET /quotes/:id
   * Get a specific quote request
   */
  getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const quote = await (prisma as any).quoteRequest.findUnique({
      where: { id },
      include: {
        partner: { select: { id: true, name: true, email: true } },
        kitchen: { select: { id: true, name: true } },
      },
    });

    if (!quote) {
      res.status(404).json({ success: false, error: 'Quote request not found' });
      return;
    }

    // Ownership check
    if (quote.userId !== userId && req.user?.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    res.status(200).json({ success: true, data: quote });
  });

  /**
   * GET /quotes/partners/nearby
   * Find partners near a given location
   */
  findNearbyPartners = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const { lat, lng, postalCode, radius: _radius = 50 } = req.query;

    // Fetch active partners -- in a real implementation, filter by geolocation
    const partners = await prisma.partner.findMany({
      where: {
        isActive: true,
        ...(postalCode ? { configuration: { path: ['postalCode'], equals: postalCode as string } } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        website: true,
        configuration: true,
      },
      take: 20,
    });

    // Map to a consumer-friendly format
    const mapped = partners.map((p) => {
      const config = (p.configuration as Record<string, unknown>) || {};
      return {
        id: p.id,
        name: p.name,
        email: p.email,
        phone: p.phone,
        website: p.website,
        specialties: (config.specialties as string[]) || [],
        rating: (config.rating as number) || null,
        distance: lat && lng ? null : null, // Would be computed from actual geolocation
        postalCode: (config.postalCode as string) || null,
      };
    });

    res.status(200).json({
      success: true,
      data: mapped,
    });
  });
}

// ─── Email HTML Builder ───────────────────────────────────────────────────────

function buildPartnerEmailHtml(data: {
  partnerName: string;
  quoteRef: string;
  projectName: string;
  kitchenName: string;
  contactInfo: { name?: string; email: string; phone?: string };
  message: string;
  timeline: string;
  designPackageUrl: string;
}): string {
  const timelineLabels: Record<string, string> = {
    '1-3months': '1 to 3 months',
    '3-6months': '3 to 6 months',
    '6-12months': '6 to 12 months',
    flexible: 'Flexible',
  };

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1e293b;">New Kitchen Quote Request</h2>
      <p>Hello ${data.partnerName},</p>
      <p>You have received a new kitchen quote request <strong>${data.quoteRef}</strong>.</p>

      <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <h3 style="margin-top: 0; color: #334155;">Project Details</h3>
        <p><strong>Project:</strong> ${data.projectName}</p>
        <p><strong>Kitchen:</strong> ${data.kitchenName}</p>
        <p><strong>Preferred Timeline:</strong> ${timelineLabels[data.timeline] || data.timeline}</p>
      </div>

      <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <h3 style="margin-top: 0; color: #334155;">Contact Information</h3>
        <p><strong>Name:</strong> ${data.contactInfo.name || 'N/A'}</p>
        <p><strong>Email:</strong> ${data.contactInfo.email}</p>
        ${data.contactInfo.phone ? `<p><strong>Phone:</strong> ${data.contactInfo.phone}</p>` : ''}
      </div>

      ${data.message ? `
        <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h3 style="margin-top: 0; color: #334155;">Additional Notes</h3>
          <p>${data.message}</p>
        </div>
      ` : ''}

      <div style="margin: 24px 0;">
        <a href="${data.designPackageUrl}" style="display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold;">
          View Design Package
        </a>
      </div>

      <p style="color: #64748b; font-size: 14px;">Please respond to this quote request within 48 hours.</p>
    </div>
  `;
}

export const quoteController = new QuoteController();
export default quoteController;
