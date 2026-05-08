import { type PrismaClient, type Catalog, type CatalogProvider, type Prisma } from '@prisma/client';

import { encrypt, decrypt, isEncrypted } from '../utils/crypto';

/**
 * Catalog Repository
 *
 * Handles all catalog and provider-related database operations using Prisma ORM.
 */

export interface CatalogWithProvider extends Catalog {
  provider?: CatalogProvider;
  _count?: { products: number };
}

export interface CreateCatalogDto {
  providerId: string;
  name: string;
  description?: string;
  version?: string;
}

export interface CreateProviderDto {
  name: string;
  code: string;
  apiEndpoint?: string;
  apiKey?: string;
  configuration?: Record<string, unknown>;
}

export interface UpdateProviderDto {
  name?: string;
  apiEndpoint?: string;
  apiKey?: string;
  isActive?: boolean;
  configuration?: Record<string, unknown>;
}

export class CatalogRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // ==================== CATALOGS ====================

  /**
   * Find a catalog by ID
   */
  async findById(id: string): Promise<CatalogWithProvider | null> {
    return this.prisma.catalog.findUnique({
      where: { id },
      include: {
        provider: true,
        _count: { select: { products: true } }
      }
    });
  }

  /**
   * Find all catalogs
   */
  async findAll(
    filters: { providerId?: string; isActive?: boolean } = {},
    pagination: { page?: number; limit?: number } = {}
  ): Promise<{ data: Catalog[]; total: number }> {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const where: Prisma.CatalogWhereInput = {
      ...(filters.providerId && { providerId: filters.providerId }),
      ...(filters.isActive !== undefined && { isActive: filters.isActive }),
    };

    const [data, total] = await Promise.all([
      this.prisma.catalog.findMany({
        where,
        skip,
        take: limit,
        include: {
          provider: true,
          _count: { select: { products: true } }
        },
        orderBy: { updatedAt: 'desc' }
      }),
      this.prisma.catalog.count({ where })
    ]);

    return { data, total };
  }

  /**
   * Find catalogs by provider
   */
  async findByProviderId(providerId: string): Promise<Catalog[]> {
    return this.prisma.catalog.findMany({
      where: { providerId, isActive: true },
      include: { _count: { select: { products: true } } },
      orderBy: { version: 'desc' }
    });
  }

  /**
   * Create a catalog
   */
  async createCatalog(data: CreateCatalogDto): Promise<Catalog> {
    return this.prisma.catalog.create({
      data: {
        providerId: data.providerId,
        name: data.name,
        description: data.description,
        version: data.version || '1.0',
      },
      include: { provider: true }
    });
  }

  /**
   * Update a catalog
   */
  async updateCatalog(id: string, data: Partial<CreateCatalogDto> & { isActive?: boolean; lastSyncAt?: Date }): Promise<Catalog> {
    return this.prisma.catalog.update({
      where: { id },
      data
    });
  }

  /**
   * Delete a catalog
   */
  async deleteCatalog(id: string): Promise<Catalog> {
    return this.prisma.catalog.delete({
      where: { id }
    });
  }

  /**
   * Mark catalog as synced
   */
  async markSynced(id: string): Promise<Catalog> {
    return this.prisma.catalog.update({
      where: { id },
      data: { lastSyncAt: new Date() }
    });
  }

  // ==================== PROVIDERS ====================

  /**
   * Find a provider by ID
   */
  async findProviderById(id: string): Promise<CatalogProvider | null> {
    return this.prisma.catalogProvider.findUnique({
      where: { id },
      include: {
        catalogs: { where: { isActive: true } },
        _count: { select: { products: true, appliances: true, materials: true } }
      }
    });
  }

  /**
   * Find a provider by code
   */
  async findProviderByCode(code: string): Promise<CatalogProvider | null> {
    return this.prisma.catalogProvider.findUnique({
      where: { code }
    });
  }

  /**
   * Find all providers
   */
  async findAllProviders(isActive?: boolean): Promise<CatalogProvider[]> {
    return this.prisma.catalogProvider.findMany({
      where: isActive !== undefined ? { isActive } : undefined,
      include: {
        _count: { select: { catalogs: true, products: true } }
      },
      orderBy: { name: 'asc' }
    });
  }

  /**
   * Create a provider
   */
  async createProvider(data: CreateProviderDto): Promise<CatalogProvider> {
    return this.prisma.catalogProvider.create({
      data: {
        name: data.name,
        code: data.code.toLowerCase(),
        apiEndpoint: data.apiEndpoint,
        apiKey: data.apiKey ? encrypt(data.apiKey) : undefined,
        configuration: data.configuration as Prisma.InputJsonValue,
      }
    });
  }

  /**
   * Update a provider
   */
  async updateProvider(id: string, data: UpdateProviderDto): Promise<CatalogProvider> {
    return this.prisma.catalogProvider.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.apiEndpoint !== undefined && { apiEndpoint: data.apiEndpoint }),
        ...(data.apiKey !== undefined && { apiKey: data.apiKey ? encrypt(data.apiKey) : data.apiKey }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.configuration && { configuration: data.configuration as Prisma.InputJsonValue }),
      }
    });
  }

  /**
   * Delete a provider
   */
  async deleteProvider(id: string): Promise<CatalogProvider> {
    return this.prisma.catalogProvider.delete({
      where: { id }
    });
  }

  /**
   * Toggle provider active status
   */
  async toggleProviderStatus(id: string): Promise<CatalogProvider> {
    return this.prisma.$transaction(async (tx) => {
      const provider = await tx.catalogProvider.findUnique({ where: { id } });
      if (!provider) {throw new Error('Provider not found');}

      return tx.catalogProvider.update({
        where: { id },
        data: { isActive: !provider.isActive },
      });
    });
  }

  /**
   * Get provider's decrypted API key
   */
  async getDecryptedApiKey(providerId: string): Promise<string | null> {
    const provider = await this.prisma.catalogProvider.findUnique({
      where: { id: providerId },
      select: { apiKey: true },
    });
    if (!provider?.apiKey) {return null;}
    try {
      return isEncrypted(provider.apiKey) ? decrypt(provider.apiKey) : provider.apiKey;
    } catch {
      return provider.apiKey;
    }
  }

  // ==================== STATISTICS ====================

  /**
   * Get catalog statistics
   */
  async getStats(): Promise<{
    totalProviders: number;
    activeProviders: number;
    totalCatalogs: number;
    totalProducts: number;
    totalAppliances: number;
    totalMaterials: number;
  }> {
    const [
      totalProviders,
      activeProviders,
      totalCatalogs,
      totalProducts,
      totalAppliances,
      totalMaterials
    ] = await Promise.all([
      this.prisma.catalogProvider.count(),
      this.prisma.catalogProvider.count({ where: { isActive: true } }),
      this.prisma.catalog.count({ where: { isActive: true } }),
      this.prisma.product.count({ where: { isActive: true, deletedAt: null } }),
      this.prisma.appliance.count({ where: { isActive: true, deletedAt: null } }),
      this.prisma.material.count({ where: { isActive: true } })
    ]);

    return {
      totalProviders,
      activeProviders,
      totalCatalogs,
      totalProducts,
      totalAppliances,
      totalMaterials
    };
  }

  /**
   * Get provider statistics.
   * Fetches catalog count and lastSync in a single query using aggregate
   * instead of a findMany that returns full rows.
   */
  async getProviderStats(providerId: string): Promise<{
    products: number;
    appliances: number;
    materials: number;
    catalogs: number;
    lastSync: Date | null;
  }> {
    const [products, appliances, materials, catalogStats] = await Promise.all([
      this.prisma.product.count({ where: { providerId, isActive: true, deletedAt: null } }),
      this.prisma.appliance.count({ where: { providerId, isActive: true, deletedAt: null } }),
      this.prisma.material.count({ where: { providerId, isActive: true } }),
      this.prisma.catalog.aggregate({
        where: { providerId },
        _count: { _all: true },
        _max: { lastSyncAt: true },
      }),
    ]);

    return {
      products,
      appliances,
      materials,
      catalogs: catalogStats._count._all,
      lastSync: catalogStats._max.lastSyncAt,
    };
  }
}

export default CatalogRepository;
