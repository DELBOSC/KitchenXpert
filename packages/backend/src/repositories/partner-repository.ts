import { PrismaClient, Partner, PartnerIntegration, Prisma } from '@prisma/client';
import { encrypt, decrypt, isEncrypted } from '../utils/crypto';

/**
 * Partner Repository
 * Handles all partner-related database operations using Prisma ORM.
 */

export interface PartnerWithIntegrations extends Partner {
  integrations?: PartnerIntegration[];
  _count?: { webhooks: number };
}

export interface CreatePartnerDto {
  name: string;
  code: string;
  email: string;
  phone?: string;
  website?: string;
  apiKey: string;
  apiSecret: string;
  commissionRate?: number;
  configuration?: Record<string, unknown>;
}

export interface UpdatePartnerDto {
  name?: string;
  email?: string;
  phone?: string;
  website?: string;
  apiKey?: string;
  apiSecret?: string;
  isActive?: boolean;
  commissionRate?: number;
  configuration?: Record<string, unknown>;
}

export interface CreateIntegrationDto {
  partnerId: string;
  type: string;
  endpoint: string;
  credentials?: Record<string, unknown>;
  configuration?: Record<string, unknown>;
}

export class PartnerRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<PartnerWithIntegrations | null> {
    return this.prisma.partner.findUnique({
      where: { id },
      include: {
        integrations: true,
        _count: { select: { webhooks: true } }
      }
    });
  }

  async findByCode(code: string): Promise<Partner | null> {
    return this.prisma.partner.findUnique({ where: { code } });
  }

  async findByApiKey(apiKey: string): Promise<Partner | null> {
    return this.prisma.partner.findUnique({ where: { apiKey } });
  }

  async findByEmail(email: string): Promise<Partner | null> {
    return this.prisma.partner.findUnique({ where: { email } });
  }

  async findAll(isActive?: boolean): Promise<Partner[]> {
    const partners = await this.prisma.partner.findMany({
      where: isActive !== undefined ? { isActive } : undefined,
      include: {
        _count: { select: { integrations: true, webhooks: true } }
      },
      orderBy: { name: 'asc' }
    });
    // Strip apiSecret from results to prevent exposure in API responses
    return partners.map(({ apiSecret: _, ...rest }) => rest as unknown as Partner);
  }

  async create(data: CreatePartnerDto): Promise<Partner> {
    return this.prisma.partner.create({
      data: {
        name: data.name,
        code: data.code.toLowerCase(),
        email: data.email.toLowerCase(),
        phone: data.phone,
        website: data.website,
        apiKey: data.apiKey,
        apiSecret: encrypt(data.apiSecret),
        commissionRate: data.commissionRate || 0,
        configuration: data.configuration as Prisma.InputJsonValue,
      }
    });
  }

  async update(id: string, data: UpdatePartnerDto): Promise<Partner> {
    return this.prisma.partner.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.email && { email: data.email.toLowerCase() }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.website !== undefined && { website: data.website }),
        ...(data.apiKey && { apiKey: data.apiKey }),
        ...(data.apiSecret && { apiSecret: encrypt(data.apiSecret) }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.commissionRate !== undefined && { commissionRate: data.commissionRate }),
        ...(data.configuration && { configuration: data.configuration as Prisma.InputJsonValue }),
      }
    });
  }

  async delete(id: string): Promise<Partner> {
    return this.prisma.partner.delete({ where: { id } });
  }

  async toggle(id: string): Promise<Partner> {
    return this.prisma.$transaction(async (tx) => {
      const partner = await tx.partner.findUnique({ where: { id } });
      if (!partner) throw new Error('Partner not found');
      return tx.partner.update({
        where: { id },
        data: { isActive: !partner.isActive },
      });
    });
  }

  async count(isActive?: boolean): Promise<number> {
    return this.prisma.partner.count({
      where: isActive !== undefined ? { isActive } : undefined
    });
  }

  async validateCredentials(apiKey: string, apiSecret: string): Promise<Partner | null> {
    const partner = await this.prisma.partner.findFirst({
      where: { apiKey, isActive: true }
    });
    if (!partner) return null;

    try {
      const storedSecret = isEncrypted(partner.apiSecret)
        ? decrypt(partner.apiSecret)
        : partner.apiSecret;

      const crypto = await import('crypto');
      const isValid = crypto.timingSafeEqual(
        Buffer.from(storedSecret),
        Buffer.from(apiSecret)
      );
      return isValid ? partner : null;
    } catch {
      return null;
    }
  }

  // ==================== INTEGRATIONS ====================

  async createIntegration(data: CreateIntegrationDto): Promise<PartnerIntegration> {
    return this.prisma.partnerIntegration.create({
      data: {
        partnerId: data.partnerId,
        type: data.type,
        endpoint: data.endpoint,
        credentials: data.credentials as Prisma.InputJsonValue,
        configuration: data.configuration as Prisma.InputJsonValue,
      }
    });
  }

  async updateIntegration(id: string, data: Partial<CreateIntegrationDto> & { isActive?: boolean; lastSyncAt?: Date }): Promise<PartnerIntegration> {
    return this.prisma.partnerIntegration.update({
      where: { id },
      data: {
        ...(data.type && { type: data.type }),
        ...(data.endpoint && { endpoint: data.endpoint }),
        ...(data.credentials && { credentials: data.credentials as Prisma.InputJsonValue }),
        ...(data.configuration && { configuration: data.configuration as Prisma.InputJsonValue }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.lastSyncAt && { lastSyncAt: data.lastSyncAt }),
      }
    });
  }

  async deleteIntegration(id: string): Promise<PartnerIntegration> {
    return this.prisma.partnerIntegration.delete({ where: { id } });
  }

  async getIntegrations(partnerId: string): Promise<PartnerIntegration[]> {
    return this.prisma.partnerIntegration.findMany({
      where: { partnerId },
      orderBy: { type: 'asc' }
    });
  }

  async getIntegrationsByType(type: string): Promise<PartnerIntegration[]> {
    return this.prisma.partnerIntegration.findMany({
      where: { type, isActive: true },
      include: { partner: true }
    });
  }

  async findIntegrationByIdAndPartner(id: string, partnerId: string): Promise<PartnerIntegration | null> {
    return this.prisma.partnerIntegration.findFirst({
      where: { id, partnerId },
    });
  }

  async markIntegrationSynced(id: string): Promise<PartnerIntegration> {
    return this.prisma.partnerIntegration.update({
      where: { id },
      data: { lastSyncAt: new Date() }
    });
  }
}

export default PartnerRepository;
