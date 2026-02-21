import { Request, Response } from 'express';
import { PartnerRepository } from '../../repositories/partner-repository';
import { asyncHandler } from '../middleware/error-middleware';
import { prisma } from '../../database/client';
import crypto from 'crypto';
const partnerRepository = new PartnerRepository(prisma);

/**
 * Partner Controller
 * Handles all partner-related HTTP requests
 */
export class PartnerController {
  /**
   * GET /partners
   * Get all partners
   */
  getAll = asyncHandler(async (req: Request, res: Response) => {
    const { isActive } = req.query;
    const partners = await partnerRepository.findAll(
      isActive !== undefined ? isActive === 'true' : undefined
    );
    res.status(200).json({ success: true, data: partners });
  });

  /**
   * GET /partners/:id
   * Get a partner by ID
   */
  getById = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const partner = await partnerRepository.findById(id);
    if (!partner) {
      res.status(404).json({ success: false, error: 'Partner not found' });
      return;
    }
    res.status(200).json({ success: true, data: partner });
  });

  /**
   * GET /partners/code/:code
   * Get a partner by code
   */
  getByCode = asyncHandler(async (req: Request, res: Response) => {
    const code = req.params.code as string;
    const partner = await partnerRepository.findByCode(code);
    if (!partner) {
      res.status(404).json({ success: false, error: 'Partner not found' });
      return;
    }
    res.status(200).json({ success: true, data: partner });
  });

  /**
   * POST /partners
   * Create a new partner
   */
  create = asyncHandler(async (req: Request, res: Response) => {
    const { name, code, email, phone, website, commissionRate, configuration } = req.body;

    // Generate API credentials
    const apiKey = crypto.randomBytes(24).toString('hex');
    const apiSecret = crypto.randomBytes(32).toString('hex');

    // Check for existing code or email
    const existingCode = await partnerRepository.findByCode(code);
    if (existingCode) {
      res.status(409).json({ success: false, error: 'Partner code already exists' });
      return;
    }

    const existingEmail = await partnerRepository.findByEmail(email);
    if (existingEmail) {
      res.status(409).json({ success: false, error: 'Partner email already exists' });
      return;
    }

    const partner = await partnerRepository.create({
      name,
      code,
      email,
      phone,
      website,
      apiKey,
      apiSecret,
      commissionRate,
      configuration,
    });

    res.status(201).json({
      success: true,
      data: { ...partner, apiSecret },
      message: 'Partner created successfully. Save the API secret - it cannot be retrieved later.',
    });
  });

  /**
   * PUT /partners/:id
   * Update a partner
   */
  update = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { name, email, phone, website, isActive, commissionRate, configuration } = req.body;

    const partner = await partnerRepository.update(id, {
      name,
      email,
      phone,
      website,
      isActive,
      commissionRate,
      configuration,
    });

    res.status(200).json({ success: true, data: partner, message: 'Partner updated successfully' });
  });

  /**
   * DELETE /partners/:id
   * Delete a partner
   */
  delete = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    await partnerRepository.delete(id);
    res.status(200).json({ success: true, message: 'Partner deleted successfully' });
  });

  /**
   * POST /partners/:id/toggle
   * Toggle partner active status
   */
  toggle = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const partner = await partnerRepository.toggle(id);
    res.status(200).json({
      success: true,
      data: partner,
      message: `Partner ${partner.isActive ? 'activated' : 'deactivated'} successfully`,
    });
  });

  /**
   * POST /partners/:id/regenerate-credentials
   * Regenerate API credentials for a partner
   */
  regenerateCredentials = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const newApiKey = crypto.randomBytes(24).toString('hex');
    const newApiSecret = crypto.randomBytes(32).toString('hex');

    await partnerRepository.update(id, {
      apiKey: newApiKey,
      apiSecret: newApiSecret,
    });

    res.status(200).json({
      success: true,
      data: { apiKey: newApiKey, apiSecret: newApiSecret },
      message: 'API credentials regenerated successfully. Save these - they cannot be retrieved later.',
    });
  });

  /**
   * POST /partners/validate
   * Validate partner API credentials
   */
  validateCredentials = asyncHandler(async (req: Request, res: Response) => {
    const { apiKey, apiSecret } = req.body;
    const partner = await partnerRepository.validateCredentials(apiKey, apiSecret);

    if (!partner) {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }

    res.status(200).json({ success: true, data: { partnerId: partner.id, name: partner.name } });
  });

  /**
   * GET /partners/count
   * Get partner count
   */
  getCount = asyncHandler(async (req: Request, res: Response) => {
    const { isActive } = req.query;
    const count = await partnerRepository.count(
      isActive !== undefined ? isActive === 'true' : undefined
    );
    res.status(200).json({ success: true, data: { count } });
  });

  // ==================== INTEGRATIONS ====================

  /**
   * GET /partners/:id/integrations
   * Get integrations for a partner
   */
  getIntegrations = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const integrations = await partnerRepository.getIntegrations(id);
    res.status(200).json({ success: true, data: integrations });
  });

  /**
   * POST /partners/:id/integrations
   * Create a new integration for a partner
   */
  createIntegration = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { type, endpoint, credentials, configuration } = req.body;

    // Verify the partner exists and belongs to the admin context
    const partner = await partnerRepository.findById(id);
    if (!partner) {
      res.status(404).json({ success: false, error: 'Partner not found' });
      return;
    }

    // Validate endpoint URL against SSRF
    if (endpoint) {
      try {
        const parsed = new URL(endpoint);
        const hostname = parsed.hostname.toLowerCase();
        const blockedPatterns = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '169.254.169.254', 'metadata.google.internal'];
        const blockedPrefixes = ['10.', '172.16.', '172.17.', '172.18.', '172.19.', '172.20.', '172.21.', '172.22.', '172.23.', '172.24.', '172.25.', '172.26.', '172.27.', '172.28.', '172.29.', '172.30.', '172.31.', '192.168.'];
        if (blockedPatterns.includes(hostname) || blockedPrefixes.some(p => hostname.startsWith(p)) || !['http:', 'https:'].includes(parsed.protocol)) {
          res.status(400).json({ success: false, error: 'Invalid endpoint URL: private/internal addresses are not allowed' });
          return;
        }
      } catch {
        res.status(400).json({ success: false, error: 'Invalid endpoint URL format' });
        return;
      }
    }

    const integration = await partnerRepository.createIntegration({
      partnerId: id,
      type,
      endpoint,
      credentials,
      configuration,
    });

    res.status(201).json({
      success: true,
      data: integration,
      message: 'Integration created successfully',
    });
  });

  /**
   * PUT /partners/:partnerId/integrations/:integrationId
   * Update an integration
   */
  updateIntegration = asyncHandler(async (req: Request, res: Response) => {
    const partnerId = req.params.partnerId as string;
    const integrationId = req.params.integrationId as string;
    const { type, endpoint, credentials, configuration, isActive } = req.body;

    // Verify partner exists before updating its integration
    const partner = await partnerRepository.findById(partnerId);
    if (!partner) {
      res.status(404).json({ success: false, error: 'Partner not found' });
      return;
    }

    // Verify integration belongs to this partner
    const existing = await partnerRepository.findIntegrationByIdAndPartner(integrationId, partnerId);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Integration not found for this partner' });
      return;
    }

    const integration = await partnerRepository.updateIntegration(integrationId, {
      type,
      endpoint,
      credentials,
      configuration,
      isActive,
    });

    res.status(200).json({
      success: true,
      data: integration,
      message: 'Integration updated successfully',
    });
  });

  /**
   * DELETE /partners/:partnerId/integrations/:integrationId
   * Delete an integration
   */
  deleteIntegration = asyncHandler(async (req: Request, res: Response) => {
    const partnerId = req.params.partnerId as string;
    const integrationId = req.params.integrationId as string;

    // Verify integration belongs to this partner
    const existing = await partnerRepository.findIntegrationByIdAndPartner(integrationId, partnerId);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Integration not found for this partner' });
      return;
    }

    await partnerRepository.deleteIntegration(integrationId);
    res.status(200).json({ success: true, message: 'Integration deleted successfully' });
  });

  /**
   * POST /partners/:partnerId/integrations/:integrationId/sync
   * Mark integration as synced
   */
  markIntegrationSynced = asyncHandler(async (req: Request, res: Response) => {
    const integrationId = req.params.integrationId as string;
    const integration = await partnerRepository.markIntegrationSynced(integrationId);
    res.status(200).json({ success: true, data: integration, message: 'Integration marked as synced' });
  });

  /**
   * GET /partners/integrations/type/:type
   * Get integrations by type
   */
  getIntegrationsByType = asyncHandler(async (req: Request, res: Response) => {
    const type = req.params.type as string;
    const integrations = await partnerRepository.getIntegrationsByType(type);
    res.status(200).json({ success: true, data: integrations });
  });
}

export const partnerController = new PartnerController();
export default partnerController;
