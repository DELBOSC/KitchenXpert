/**
 * Catalog Sync Service
 *
 * Orchestrates synchronization of product data from external providers
 * into the local database. Uses Prisma to persist and Redis to cache.
 */

import { type Prisma, type PrismaClient } from '@prisma/client';

import { cacheGet, cacheSet, cacheDel, CACHE_TTL } from '../database/redis-client';
import { createModuleLogger } from '../utils/logger';

const logger = createModuleLogger('catalog-sync');

export interface ProviderAdapter {
  providerId: string;
  providerName: string;
  fetchProducts(options?: {
    category?: string;
    limit?: number;
    offset?: number;
  }): Promise<ProviderProductData[]>;
  testConnection(): Promise<boolean>;
}

export interface ProviderProductData {
  id: string;
  providerId: string;
  name: string;
  sku?: string;
  brand?: string;
  model?: string;
  description?: string;
  price?: number;
  currency?: string;
  type?: 'product' | 'appliance';
  category?: string;
  width?: number;
  depth?: number;
  height?: number;
  weight?: number;
  color?: string;
  material?: string;
  finish?: string;
  images?: any;
  specifications?: Record<string, unknown>;
  energyRating?: string;
  powerConsumption?: number;
  features?: any;
  availability?: string;
  [key: string]: any;
}

export interface SyncResult {
  providerId: string;
  providerName: string;
  success: boolean;
  productsAdded: number;
  productsUpdated: number;
  errors: string[];
  durationMs: number;
  syncedAt: Date;
}

export class CatalogSyncService {
  private providers: Map<string, ProviderAdapter> = new Map();

  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Register a provider adapter for synchronization
   */
  registerProvider(adapter: ProviderAdapter): void {
    this.providers.set(adapter.providerId, adapter);
    logger.info(`Provider registered: ${adapter.providerName}`, { providerId: adapter.providerId });
  }

  /**
   * Unregister a provider
   */
  unregisterProvider(providerId: string): void {
    this.providers.delete(providerId);
  }

  /**
   * Get all registered provider IDs
   */
  getRegisteredProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Sync a single provider's catalog
   */
  async syncProvider(providerId: string): Promise<SyncResult> {
    const adapter = this.providers.get(providerId);
    if (!adapter) {
      return {
        providerId,
        providerName: 'unknown',
        success: false,
        productsAdded: 0,
        productsUpdated: 0,
        errors: [`Provider "${providerId}" not registered`],
        durationMs: 0,
        syncedAt: new Date(),
      };
    }

    const startTime = Date.now();
    let productsAdded = 0;
    let productsUpdated = 0;
    const errors: string[] = [];

    try {
      // Test connection first
      const connected = await adapter.testConnection();
      if (!connected) {
        throw new Error(`Failed to connect to ${adapter.providerName} API`);
      }

      // Ensure CatalogProvider record exists
      const dbProvider = await this.ensureProvider(adapter);

      // Fetch products from provider
      const products = await adapter.fetchProducts({ limit: 500 });
      logger.info(`Fetched ${products.length} products from ${adapter.providerName}`);

      for (const product of products) {
        try {
          if (product.type === 'appliance') {
            const result = await this.upsertAppliance(product, dbProvider.id);
            if (result === 'created') {
              productsAdded++;
            } else if (result === 'updated') {
              productsUpdated++;
            }
          } else {
            const result = await this.upsertProduct(product, dbProvider.id);
            if (result === 'created') {
              productsAdded++;
            } else if (result === 'updated') {
              productsUpdated++;
            }
          }
        } catch (err: unknown) {
          const error = err instanceof Error ? err : new Error(String(err));
          errors.push(`Product ${product.id}: ${error.message}`);
        }
      }

      // Invalidate cache for this provider
      await cacheDel(`catalog:${providerId}:products`, `catalog:${providerId}:meta`);

      // Cache sync metadata
      const syncMeta = {
        lastSync: new Date().toISOString(),
        productsAdded,
        productsUpdated,
        totalProducts: products.length,
      };
      await cacheSet(`catalog:${providerId}:meta`, syncMeta, CACHE_TTL.SYNC_META);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      errors.push(error.message);
      logger.error(`Sync failed for ${adapter.providerName}`, { error: error.message });
    }

    const durationMs = Date.now() - startTime;
    const result: SyncResult = {
      providerId,
      providerName: adapter.providerName,
      success: errors.length === 0,
      productsAdded,
      productsUpdated,
      errors,
      durationMs,
      syncedAt: new Date(),
    };

    logger.info(`Sync completed for ${adapter.providerName}`, {
      added: productsAdded,
      updated: productsUpdated,
      errors: errors.length,
      durationMs,
    });

    return result;
  }

  /**
   * Sync all registered providers
   */
  async syncAll(): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    for (const [providerId] of this.providers) {
      const result = await this.syncProvider(providerId);
      results.push(result);
    }

    return results;
  }

  /**
   * Get cached products for a provider, or fetch from DB
   */
  async getProviderProducts(
    providerId: string,
    options?: { category?: string; limit?: number; offset?: number }
  ): Promise<any[]> {
    const cacheKey = `catalog:${providerId}:products:${options?.category || 'all'}:${options?.offset || 0}:${options?.limit || 50}`;

    // Try cache first
    const cached = await cacheGet<any[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from DB
    const dbProvider = await this.prisma.catalogProvider.findUnique({
      where: { code: providerId },
    });
    if (!dbProvider) {
      return [];
    }

    const products = await this.prisma.product.findMany({
      where: {
        providerId: dbProvider.id,
        isActive: true,
        ...(options?.category && { category: { slug: options.category } }),
      },
      take: options?.limit || 50,
      skip: options?.offset || 0,
      orderBy: { updatedAt: 'desc' },
    });

    // Cache the results
    await cacheSet(cacheKey, products, CACHE_TTL.PRICES);

    return products;
  }

  /**
   * Ensure CatalogProvider record exists in DB
   */
  private async ensureProvider(adapter: ProviderAdapter): Promise<{ id: string }> {
    const existing = await this.prisma.catalogProvider.findUnique({
      where: { code: adapter.providerId },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.catalogProvider.create({
      data: {
        name: adapter.providerName,
        code: adapter.providerId,
        isActive: true,
      },
    });
  }

  /**
   * Upsert a product into the database
   */
  private async upsertProduct(
    product: ProviderProductData,
    dbProviderId: string
  ): Promise<'created' | 'updated'> {
    const sku = product.sku || `${product.providerId}-${product.id}`;

    const existing = await this.prisma.product.findUnique({ where: { sku } });

    const data = {
      providerId: dbProviderId,
      name: product.name,
      description: product.description,
      brand: product.brand,
      model: product.model,
      price: product.price || 0,
      currency: product.currency || 'EUR',
      width: product.width,
      depth: product.depth,
      height: product.height,
      weight: product.weight,
      color: product.color,
      material: product.material,
      finish: product.finish,
      images: product.images,
      specifications: product.specifications as Prisma.InputJsonValue,
      availability: product.availability || 'in_stock',
      isActive: true,
    };

    if (existing) {
      await this.prisma.product.update({
        where: { sku },
        data,
      });
      return 'updated';
    }

    await this.prisma.product.create({
      data: { ...data, sku },
    });
    return 'created';
  }

  /**
   * Upsert an appliance into the database
   */
  private async upsertAppliance(
    product: ProviderProductData,
    dbProviderId: string
  ): Promise<'created' | 'updated'> {
    const brand = product.brand || product.providerId;
    const modelName = product.model || product.id;

    const existing = await this.prisma.appliance.findUnique({
      where: { brand_model: { brand, model: modelName } },
    });

    const data = {
      providerId: dbProviderId,
      type: product.category || 'general',
      brand,
      model: modelName,
      name: product.name,
      description: product.description,
      price: product.price || 0,
      currency: product.currency || 'EUR',
      energyRating: product.energyRating,
      powerConsumption: product.powerConsumption,
      width: product.width || 60,
      depth: product.depth || 60,
      height: product.height || 85,
      weight: product.weight,
      color: product.color,
      finish: product.finish,
      features: product.features,
      specifications: product.specifications as Prisma.InputJsonValue,
      images: product.images,
      availability: product.availability || 'in_stock',
      isActive: true,
    };

    if (existing) {
      await this.prisma.appliance.update({
        where: { brand_model: { brand, model: modelName } },
        data,
      });
      return 'updated';
    }

    await this.prisma.appliance.create({ data });
    return 'created';
  }
}

export default CatalogSyncService;
