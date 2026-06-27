/**
 * Database Query Service
 *
 * Provides typed database queries for API routes.
 * Uses Prisma client with proper error handling and null safety.
 * This service gracefully handles cases where the database is not connected
 * or the schema doesn't match expectations.
 */

import { getPrismaClient, isPrismaConnected } from '../database/client.js';
import { logger } from '../utils/logger.js';
import type { CabinetSearchParams } from '../models/cabinet.js';
import type { ApplianceSearchParams } from '../models/appliance.js';
import type { FacadeSearchParams } from '../models/facade.js';
import type { WorktopSearchParams } from '../models/worktop.js';

// ===============================================================================
// Types
// ===============================================================================

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface SearchSuggestion {
  text: string;
  type: 'product' | 'brand' | 'collection' | 'category';
  count?: number;
}

export interface CompatibleProducts {
  handles: unknown[];
  worktops: unknown[];
  accessories: unknown[];
  appliances: unknown[];
}

export interface ProductStats {
  cabinets: number;
  worktops: number;
  facades: number;
  handles: number;
  appliances: number;
  accessories: number;
  total: number;
}

export interface PriceStats {
  min: number;
  max: number;
  avg: number;
}

export interface DimensionCount {
  value: number;
  count: number;
}

// ===============================================================================
// Helper Functions
// ===============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getClient(): any | null {
  if (!isPrismaConnected()) {
    logger.warn('Database not connected, returning null for query');
    return null;
  }
  return getPrismaClient();
}

function handleQueryError(operation: string, error: unknown): void {
  logger.error(`Database query failed: ${operation}`, {
    error: error instanceof Error ? error.message : String(error),
  });
}

function emptyPaginatedResult<T>(limit: number, offset: number): PaginatedResult<T> {
  return { data: [], pagination: { total: 0, limit, offset, hasMore: false } };
}

// ===============================================================================
// Cabinet Queries
// ===============================================================================

export async function queryCabinets(
  params: CabinetSearchParams
): Promise<PaginatedResult<unknown>> {
  const client = getClient();
  const limit = params.limit || 50;
  const offset = params.offset || 0;

  if (!client || !client.cabinet) {
    return emptyPaginatedResult(limit, offset);
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { isActive: true };

    if (params.brandIds?.length) {
      where.brandId = { in: params.brandIds };
    }
    if (params.collectionIds?.length) {
      where.collectionId = { in: params.collectionIds };
    }
    if (params.types?.length) {
      where.type = { in: params.types };
    }
    if (params.categories?.length) {
      where.category = { in: params.categories };
    }
    if (params.widthMin !== undefined || params.widthMax !== undefined) {
      where.width = {
        ...(params.widthMin !== undefined && { gte: params.widthMin }),
        ...(params.widthMax !== undefined && { lte: params.widthMax }),
      };
    }
    if (params.heightMin !== undefined || params.heightMax !== undefined) {
      where.height = {
        ...(params.heightMin !== undefined && { gte: params.heightMin }),
        ...(params.heightMax !== undefined && { lte: params.heightMax }),
      };
    }
    if (params.priceMin !== undefined || params.priceMax !== undefined) {
      where.priceTTC = {
        ...(params.priceMin !== undefined && { gte: params.priceMin }),
        ...(params.priceMax !== undefined && { lte: params.priceMax }),
      };
    }
    if (params.sinkCompatible !== undefined) {
      where.sinkCompatible = params.sinkCompatible;
    }
    if (params.hobCompatible !== undefined) {
      where.hobCompatible = params.hobCompatible;
    }

    const orderByField = params.orderBy || 'createdAt';
    const orderByDir = params.orderDir || 'desc';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orderBy: any = {};
    if (orderByField === 'price') {
      orderBy.priceTTC = orderByDir;
    } else if (orderByField === 'width') {
      orderBy.width = orderByDir;
    } else if (orderByField === 'popularity') {
      orderBy.popularity = orderByDir;
    } else {
      orderBy.createdAt = orderByDir;
    }

    const [cabinets, total] = await Promise.all([
      client.cabinet.findMany({
        where,
        include: {
          brand: { select: { id: true, name: true, slug: true } },
          collection: { select: { id: true, name: true, slug: true } },
        },
        orderBy,
        take: limit,
        skip: offset,
      }),
      client.cabinet.count({ where }),
    ]);

    return {
      data: cabinets,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + cabinets.length < total,
      },
    };
  } catch (error) {
    handleQueryError('queryCabinets', error);
    return emptyPaginatedResult(limit, offset);
  }
}

export async function getCabinetById(id: string): Promise<unknown | null> {
  const client = getClient();
  if (!client || !client.cabinet) return null;

  try {
    return await client.cabinet.findUnique({
      where: { id },
      include: { brand: true, collection: true },
    });
  } catch (error) {
    handleQueryError('getCabinetById', error);
    return null;
  }
}

export async function getCabinetByReference(
  brandId: string,
  reference: string
): Promise<unknown | null> {
  const client = getClient();
  if (!client || !client.cabinet) return null;

  try {
    return await client.cabinet.findUnique({
      where: { brandId_reference: { brandId, reference } },
      include: { brand: true, collection: true },
    });
  } catch (error) {
    handleQueryError('getCabinetByReference', error);
    return null;
  }
}

export async function getCabinetTypesCounts(): Promise<Array<{ type: string; count: number }>> {
  const client = getClient();
  if (!client || !client.cabinet) return [];

  try {
    const result = await client.cabinet.groupBy({
      by: ['type'],
      _count: { type: true },
      where: { isActive: true },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return result.map((r: any) => ({
      type: r.type,
      count: r._count?.type || 0,
    }));
  } catch (error) {
    handleQueryError('getCabinetTypesCounts', error);
    return [];
  }
}

export async function getCabinetWidthsCounts(): Promise<DimensionCount[]> {
  const client = getClient();
  if (!client || !client.cabinet) return [];

  try {
    const result = await client.cabinet.groupBy({
      by: ['width'],
      _count: { width: true },
      where: { isActive: true },
      orderBy: { width: 'asc' },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return result.map((r: any) => ({
      value: r.width,
      count: r._count?.width || 0,
    }));
  } catch (error) {
    handleQueryError('getCabinetWidthsCounts', error);
    return [];
  }
}

// ===============================================================================
// Appliance Queries
// ===============================================================================

export async function queryAppliances(
  params: ApplianceSearchParams
): Promise<PaginatedResult<unknown>> {
  const client = getClient();
  const limit = params.limit || 50;
  const offset = params.offset || 0;

  if (!client || !client.appliance) {
    return emptyPaginatedResult(limit, offset);
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { isActive: true };

    if (params.brandIds?.length) {
      where.brandId = { in: params.brandIds };
    }
    if (params.manufacturerBrands?.length) {
      where.manufacturerBrand = { in: params.manufacturerBrands };
    }
    if (params.types?.length) {
      where.type = { in: params.types };
    }
    if (params.categories?.length) {
      // Appliances might not have categories field, handle gracefully
      // where.category = { in: params.categories };
    }
    if (params.energyClasses?.length) {
      where.energyClass = { in: params.energyClasses };
    }
    if (params.widthMin !== undefined || params.widthMax !== undefined) {
      where.width = {
        ...(params.widthMin !== undefined && { gte: params.widthMin }),
        ...(params.widthMax !== undefined && { lte: params.widthMax }),
      };
    }
    if (params.priceMin !== undefined || params.priceMax !== undefined) {
      where.priceTTC = {
        ...(params.priceMin !== undefined && { gte: params.priceMin }),
        ...(params.priceMax !== undefined && { lte: params.priceMax }),
      };
    }
    if (params.connectivity !== undefined) {
      where.connectivity = params.connectivity;
    }

    const [appliances, total] = await Promise.all([
      client.appliance.findMany({
        where,
        include: { brand: { select: { id: true, name: true, slug: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      client.appliance.count({ where }),
    ]);

    return {
      data: appliances,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + appliances.length < total,
      },
    };
  } catch (error) {
    handleQueryError('queryAppliances', error);
    return emptyPaginatedResult(limit, offset);
  }
}

export async function getApplianceById(id: string): Promise<unknown | null> {
  const client = getClient();
  if (!client || !client.appliance) return null;

  try {
    return await client.appliance.findUnique({
      where: { id },
      include: { brand: true },
    });
  } catch (error) {
    handleQueryError('getApplianceById', error);
    return null;
  }
}

export async function getApplianceTypesCounts(): Promise<Array<{ type: string; count: number }>> {
  const client = getClient();
  if (!client || !client.appliance) return [];

  try {
    const result = await client.appliance.groupBy({
      by: ['type'],
      _count: { type: true },
      where: { isActive: true },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return result.map((r: any) => ({
      type: r.type,
      count: r._count?.type || 0,
    }));
  } catch (error) {
    handleQueryError('getApplianceTypesCounts', error);
    return [];
  }
}

export async function getManufacturersCounts(): Promise<Array<{ name: string; count: number }>> {
  const client = getClient();
  if (!client || !client.appliance) return [];

  try {
    const result = await client.appliance.groupBy({
      by: ['manufacturerBrand'],
      _count: { _all: true },
      where: { isActive: true },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return result.map((r: any) => ({
      name: r.manufacturerBrand,
      count: r._count?._all || 0,
    }));
  } catch (error) {
    handleQueryError('getManufacturersCounts', error);
    return [];
  }
}

// ===============================================================================
// Facade Queries
// ===============================================================================

export async function queryFacades(params: FacadeSearchParams): Promise<PaginatedResult<unknown>> {
  const client = getClient();
  const limit = params.limit || 50;
  const offset = params.offset || 0;

  if (!client || !client.facade) {
    return emptyPaginatedResult(limit, offset);
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { isActive: true };

    if (params.brandIds?.length) {
      where.brandId = { in: params.brandIds };
    }
    if (params.collectionIds?.length) {
      where.collectionId = { in: params.collectionIds };
    }
    if (params.styles?.length) {
      where.style = { in: params.styles };
    }
    if (params.materials?.length) {
      where.material = { in: params.materials };
    }
    if (params.priceMin !== undefined || params.priceMax !== undefined) {
      where.pricePerSquareMeter = {
        ...(params.priceMin !== undefined && { gte: params.priceMin }),
        ...(params.priceMax !== undefined && { lte: params.priceMax }),
      };
    }

    const [facades, total] = await Promise.all([
      client.facade.findMany({
        where,
        include: {
          brand: { select: { id: true, name: true, slug: true } },
          collection: { select: { id: true, name: true, slug: true } },
          colors: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      client.facade.count({ where }),
    ]);

    return {
      data: facades,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + facades.length < total,
      },
    };
  } catch (error) {
    handleQueryError('queryFacades', error);
    return emptyPaginatedResult(limit, offset);
  }
}

export async function getFacadeById(id: string): Promise<unknown | null> {
  const client = getClient();
  if (!client || !client.facade) return null;

  try {
    return await client.facade.findUnique({
      where: { id },
      include: { brand: true, collection: true, colors: true, doorPrices: true },
    });
  } catch (error) {
    handleQueryError('getFacadeById', error);
    return null;
  }
}

export async function getFacadeColors(facadeId: string): Promise<unknown[]> {
  const client = getClient();
  if (!client || !client.facadeColor) return [];

  try {
    return await client.facadeColor.findMany({ where: { facadeId } });
  } catch (error) {
    handleQueryError('getFacadeColors', error);
    return [];
  }
}

export async function getFacadeStylesCounts(): Promise<Array<{ style: string; count: number }>> {
  const client = getClient();
  if (!client || !client.facade) return [];

  try {
    const result = await client.facade.groupBy({
      by: ['style'],
      _count: { style: true },
      where: { isActive: true },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return result.map((r: any) => ({
      style: r.style,
      count: r._count?.style || 0,
    }));
  } catch (error) {
    handleQueryError('getFacadeStylesCounts', error);
    return [];
  }
}

// ===============================================================================
// Worktop Queries
// ===============================================================================

export async function queryWorktops(
  params: WorktopSearchParams
): Promise<PaginatedResult<unknown>> {
  const client = getClient();
  const limit = params.limit || 50;
  const offset = params.offset || 0;

  if (!client || !client.worktop) {
    return emptyPaginatedResult(limit, offset);
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { isActive: true };

    if (params.brandIds?.length) {
      where.brandId = { in: params.brandIds };
    }
    if (params.materials?.length) {
      where.material = { in: params.materials };
    }
    if (params.thickness !== undefined) {
      where.thicknesses = { has: params.thickness };
    }
    if (params.priceMin !== undefined || params.priceMax !== undefined) {
      where.pricePerSquareMeter = {
        ...(params.priceMin !== undefined && { gte: params.priceMin }),
        ...(params.priceMax !== undefined && { lte: params.priceMax }),
      };
    }

    const [worktops, total] = await Promise.all([
      client.worktop.findMany({
        where,
        include: {
          brand: { select: { id: true, name: true, slug: true } },
          colors: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      client.worktop.count({ where }),
    ]);

    return {
      data: worktops,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + worktops.length < total,
      },
    };
  } catch (error) {
    handleQueryError('queryWorktops', error);
    return emptyPaginatedResult(limit, offset);
  }
}

export async function getWorktopById(id: string): Promise<unknown | null> {
  const client = getClient();
  if (!client || !client.worktop) return null;

  try {
    return await client.worktop.findUnique({
      where: { id },
      include: { brand: true, colors: true },
    });
  } catch (error) {
    handleQueryError('getWorktopById', error);
    return null;
  }
}

export async function getWorktopMaterialsCounts(): Promise<
  Array<{ material: string; count: number }>
> {
  const client = getClient();
  if (!client || !client.worktop) return [];

  try {
    const result = await client.worktop.groupBy({
      by: ['material'],
      _count: { material: true },
      where: { isActive: true },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return result.map((r: any) => ({
      material: r.material,
      count: r._count?.material || 0,
    }));
  } catch (error) {
    handleQueryError('getWorktopMaterialsCounts', error);
    return [];
  }
}

// ===============================================================================
// Brand/Collection Queries
// ===============================================================================

export async function getBrandStatsById(brandId: string): Promise<{
  collectionsCount: number;
  cabinetsCount: number;
  facadesCount: number;
  worktopsCount: number;
  appliancesCount: number;
  lastScrapedAt: Date | null;
} | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const queries: Promise<unknown>[] = [];

    // Safely try to query each model
    if (client.brand) {
      queries.push(
        client.brand.findUnique({ where: { id: brandId }, select: { lastScrapedAt: true } })
      );
    } else {
      queries.push(Promise.resolve(null));
    }

    if (client.collection) {
      queries.push(client.collection.count({ where: { brandId } }));
    } else {
      queries.push(Promise.resolve(0));
    }

    if (client.cabinet) {
      queries.push(client.cabinet.count({ where: { brandId, isActive: true } }));
    } else {
      queries.push(Promise.resolve(0));
    }

    if (client.facade) {
      queries.push(client.facade.count({ where: { brandId, isActive: true } }));
    } else {
      queries.push(Promise.resolve(0));
    }

    if (client.worktop) {
      queries.push(client.worktop.count({ where: { brandId, isActive: true } }));
    } else {
      queries.push(Promise.resolve(0));
    }

    if (client.appliance) {
      queries.push(client.appliance.count({ where: { brandId, isActive: true } }));
    } else {
      queries.push(Promise.resolve(0));
    }

    const [brand, collectionsCount, cabinetsCount, facadesCount, worktopsCount, appliancesCount] =
      await Promise.all(queries);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const brandData = brand as any;

    return {
      collectionsCount: collectionsCount as number,
      cabinetsCount: cabinetsCount as number,
      facadesCount: facadesCount as number,
      worktopsCount: worktopsCount as number,
      appliancesCount: appliancesCount as number,
      lastScrapedAt: brandData?.lastScrapedAt || null,
    };
  } catch (error) {
    handleQueryError('getBrandStatsById', error);
    return null;
  }
}

export async function getCollectionsByBrandId(brandId: string): Promise<unknown[]> {
  const client = getClient();
  if (!client || !client.collection) return [];

  try {
    return await client.collection.findMany({
      where: { brandId },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    handleQueryError('getCollectionsByBrandId', error);
    return [];
  }
}

// ===============================================================================
// Search Queries
// ===============================================================================

export async function searchAllProducts(
  query: string,
  options: {
    types?: string[];
    brands?: string[];
    limit?: number;
    offset?: number;
  }
): Promise<PaginatedResult<unknown>> {
  const client = getClient();
  const limit = options.limit || 20;
  const offset = options.offset || 0;

  if (!client) {
    return emptyPaginatedResult(limit, offset);
  }

  try {
    const results: unknown[] = [];
    let total = 0;

    // Search cabinets
    if ((!options.types || options.types.includes('cabinet')) && client.cabinet) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = {
        isActive: true,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { reference: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      };
      if (options.brands?.length) {
        where.brandId = { in: options.brands };
      }

      const [cabinets, cabinetCount] = await Promise.all([
        client.cabinet.findMany({
          where,
          include: { brand: { select: { id: true, name: true } } },
          take: limit,
          skip: offset,
        }),
        client.cabinet.count({ where }),
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      results.push(...cabinets.map((c: any) => ({ ...c, productType: 'cabinet' })));
      total += cabinetCount;
    }

    // Search appliances
    if ((!options.types || options.types.includes('appliance')) && client.appliance) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = {
        isActive: true,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { reference: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { manufacturerBrand: { contains: query, mode: 'insensitive' } },
        ],
      };
      if (options.brands?.length) {
        where.brandId = { in: options.brands };
      }

      const [appliances, applianceCount] = await Promise.all([
        client.appliance.findMany({
          where,
          include: { brand: { select: { id: true, name: true } } },
          take: limit,
          skip: offset,
        }),
        client.appliance.count({ where }),
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      results.push(...appliances.map((a: any) => ({ ...a, productType: 'appliance' })));
      total += applianceCount;
    }

    // Search facades
    if ((!options.types || options.types.includes('facade')) && client.facade) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = {
        isActive: true,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { reference: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      };
      if (options.brands?.length) {
        where.brandId = { in: options.brands };
      }

      const [facades, facadeCount] = await Promise.all([
        client.facade.findMany({
          where,
          include: { brand: { select: { id: true, name: true } } },
          take: limit,
          skip: offset,
        }),
        client.facade.count({ where }),
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      results.push(...facades.map((f: any) => ({ ...f, productType: 'facade' })));
      total += facadeCount;
    }

    // Search worktops
    if ((!options.types || options.types.includes('worktop')) && client.worktop) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = {
        isActive: true,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { reference: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      };
      if (options.brands?.length) {
        where.brandId = { in: options.brands };
      }

      const [worktops, worktopCount] = await Promise.all([
        client.worktop.findMany({
          where,
          include: { brand: { select: { id: true, name: true } } },
          take: limit,
          skip: offset,
        }),
        client.worktop.count({ where }),
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      results.push(...worktops.map((w: any) => ({ ...w, productType: 'worktop' })));
      total += worktopCount;
    }

    return {
      data: results.slice(0, limit),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  } catch (error) {
    handleQueryError('searchAllProducts', error);
    return emptyPaginatedResult(limit, offset);
  }
}

export async function getSearchSuggestions(
  query: string,
  type?: string,
  limit: number = 10
): Promise<SearchSuggestion[]> {
  const client = getClient();
  if (!client || query.length < 2) return [];

  try {
    const suggestions: SearchSuggestion[] = [];

    // Get brand suggestions
    if ((!type || type === 'brand') && client.brand) {
      const brands = await client.brand.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { slug: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: { name: true, productsCount: true },
        take: limit,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      suggestions.push(
        ...brands.map((b: any) => ({
          text: b.name,
          type: 'brand' as const,
          count: b.productsCount,
        }))
      );
    }

    // Get collection suggestions
    if ((!type || type === 'collection') && client.collection) {
      const collections = await client.collection.findMany({
        where: { name: { contains: query, mode: 'insensitive' } },
        select: { name: true },
        take: limit,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      suggestions.push(
        ...collections.map((c: any) => ({
          text: c.name,
          type: 'collection' as const,
        }))
      );
    }

    // Get product name suggestions from cabinets
    if ((!type || type === 'product') && client.cabinet) {
      const cabinets = await client.cabinet.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { reference: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: { name: true },
        distinct: ['name'],
        take: limit,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      suggestions.push(
        ...cabinets.map((c: any) => ({
          text: c.name,
          type: 'product' as const,
        }))
      );
    }

    return suggestions.slice(0, limit);
  } catch (error) {
    handleQueryError('getSearchSuggestions', error);
    return [];
  }
}

export async function findCompatibleProducts(
  productId: string,
  productType: string
): Promise<CompatibleProducts> {
  const client = getClient();
  const emptyResult: CompatibleProducts = {
    handles: [],
    worktops: [],
    accessories: [],
    appliances: [],
  };

  if (!client) return emptyResult;

  try {
    const compatible: CompatibleProducts = { ...emptyResult };

    if (productType === 'cabinet' && client.cabinet) {
      const cabinet = await client.cabinet.findUnique({
        where: { id: productId },
        select: { brandId: true, width: true, type: true, category: true },
      });

      if (cabinet) {
        // Find compatible handles from same brand
        if (client.handle) {
          compatible.handles = await client.handle.findMany({
            where: { brandId: cabinet.brandId, isActive: true },
            take: 10,
          });
        }

        // Find compatible accessories based on cabinet width
        if (client.accessory) {
          compatible.accessories = await client.accessory.findMany({
            where: {
              brandId: cabinet.brandId,
              isActive: true,
              cabinetWidths: { has: cabinet.width },
            },
            take: 10,
          });
        }

        // Find compatible appliances
        if (
          client.appliance &&
          (cabinet.type.includes('hob') ||
            cabinet.type.includes('oven') ||
            cabinet.type.includes('sink'))
        ) {
          compatible.appliances = await client.appliance.findMany({
            where: {
              brandId: cabinet.brandId,
              isActive: true,
              width: { lte: cabinet.width },
            },
            take: 10,
          });
        }
      }
    } else if (productType === 'facade' && client.facade) {
      const facade = await client.facade.findUnique({
        where: { id: productId },
        select: { brandId: true },
      });

      if (facade && client.handle) {
        compatible.handles = await client.handle.findMany({
          where: { brandId: facade.brandId, isActive: true },
          take: 10,
        });
      }
    }

    return compatible;
  } catch (error) {
    handleQueryError('findCompatibleProducts', error);
    return emptyResult;
  }
}

export async function findSimilarProducts(
  productId: string,
  productType: string,
  maxResults: number = 10
): Promise<unknown[]> {
  const client = getClient();
  if (!client) return [];

  try {
    if (productType === 'cabinet' && client.cabinet) {
      const cabinet = await client.cabinet.findUnique({
        where: { id: productId },
        select: { width: true, height: true, type: true, category: true, priceTTC: true },
      });

      if (!cabinet) return [];

      const priceRange = cabinet.priceTTC ? cabinet.priceTTC * 0.3 : 500;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = {
        id: { not: productId },
        isActive: true,
        type: cabinet.type,
        width: { gte: cabinet.width - 100, lte: cabinet.width + 100 },
      };
      if (cabinet.priceTTC) {
        where.priceTTC = { gte: cabinet.priceTTC - priceRange, lte: cabinet.priceTTC + priceRange };
      }

      return await client.cabinet.findMany({
        where,
        include: { brand: { select: { id: true, name: true } } },
        take: maxResults,
      });
    } else if (productType === 'appliance' && client.appliance) {
      const appliance = await client.appliance.findUnique({
        where: { id: productId },
        select: { type: true, width: true, priceTTC: true },
      });

      if (!appliance) return [];

      const priceRange = appliance.priceTTC ? appliance.priceTTC * 0.3 : 200;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = {
        id: { not: productId },
        isActive: true,
        type: appliance.type,
      };
      if (appliance.priceTTC) {
        where.priceTTC = {
          gte: appliance.priceTTC - priceRange,
          lte: appliance.priceTTC + priceRange,
        };
      }

      return await client.appliance.findMany({
        where,
        include: { brand: { select: { id: true, name: true } } },
        take: maxResults,
      });
    }

    return [];
  } catch (error) {
    handleQueryError('findSimilarProducts', error);
    return [];
  }
}

// ===============================================================================
// Stats Queries
// ===============================================================================

export async function getProductStats(): Promise<ProductStats> {
  const client = getClient();
  const defaultStats = {
    cabinets: 0,
    worktops: 0,
    facades: 0,
    handles: 0,
    appliances: 0,
    accessories: 0,
    total: 0,
  };

  if (!client) return defaultStats;

  try {
    const queries: Promise<number>[] = [];

    queries.push(
      client.cabinet ? client.cabinet.count({ where: { isActive: true } }) : Promise.resolve(0)
    );
    queries.push(
      client.worktop ? client.worktop.count({ where: { isActive: true } }) : Promise.resolve(0)
    );
    queries.push(
      client.facade ? client.facade.count({ where: { isActive: true } }) : Promise.resolve(0)
    );
    queries.push(
      client.handle ? client.handle.count({ where: { isActive: true } }) : Promise.resolve(0)
    );
    queries.push(
      client.appliance ? client.appliance.count({ where: { isActive: true } }) : Promise.resolve(0)
    );
    queries.push(
      client.accessory ? client.accessory.count({ where: { isActive: true } }) : Promise.resolve(0)
    );

    const results = await Promise.all(queries);
    const [cabinets, worktops, facades, handles, appliances, accessories] = results;

    return {
      cabinets: cabinets ?? 0,
      worktops: worktops ?? 0,
      facades: facades ?? 0,
      handles: handles ?? 0,
      appliances: appliances ?? 0,
      accessories: accessories ?? 0,
      total:
        (cabinets ?? 0) +
        (worktops ?? 0) +
        (facades ?? 0) +
        (handles ?? 0) +
        (appliances ?? 0) +
        (accessories ?? 0),
    };
  } catch (error) {
    handleQueryError('getProductStats', error);
    return defaultStats;
  }
}

export async function getCollectionsCount(): Promise<number> {
  const client = getClient();
  if (!client || !client.collection) return 0;

  try {
    return await client.collection.count();
  } catch (error) {
    handleQueryError('getCollectionsCount', error);
    return 0;
  }
}

export async function getImagesCount(): Promise<number> {
  const client = getClient();
  if (!client) return 0;

  try {
    // Simple count - just count products with images
    let count = 0;
    if (client.cabinet) {
      count += await client.cabinet.count({ where: { imageMain: { not: null } } });
    }
    return count;
  } catch (error) {
    handleQueryError('getImagesCount', error);
    return 0;
  }
}

export async function getLastUpdatedDate(): Promise<Date | null> {
  const client = getClient();
  if (!client || !client.cabinet) return null;

  try {
    const cabinet = await client.cabinet.findFirst({
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    });
    return cabinet?.updatedAt || null;
  } catch (error) {
    handleQueryError('getLastUpdatedDate', error);
    return null;
  }
}

export async function getBrandProductStats(brandId: string): Promise<{
  cabinets: number;
  worktops: number;
  facades: number;
  appliances: number;
}> {
  const client = getClient();
  const defaultStats = { cabinets: 0, worktops: 0, facades: 0, appliances: 0 };

  if (!client) return defaultStats;

  try {
    const queries: Promise<number>[] = [];

    queries.push(
      client.cabinet
        ? client.cabinet.count({ where: { brandId, isActive: true } })
        : Promise.resolve(0)
    );
    queries.push(
      client.worktop
        ? client.worktop.count({ where: { brandId, isActive: true } })
        : Promise.resolve(0)
    );
    queries.push(
      client.facade
        ? client.facade.count({ where: { brandId, isActive: true } })
        : Promise.resolve(0)
    );
    queries.push(
      client.appliance
        ? client.appliance.count({ where: { brandId, isActive: true } })
        : Promise.resolve(0)
    );

    const results = await Promise.all(queries);
    const [cabinets, worktops, facades, appliances] = results;

    return {
      cabinets: cabinets ?? 0,
      worktops: worktops ?? 0,
      facades: facades ?? 0,
      appliances: appliances ?? 0,
    };
  } catch (error) {
    handleQueryError('getBrandProductStats', error);
    return defaultStats;
  }
}

export async function getPriceStatsByCabinet(): Promise<{
  min: number;
  max: number;
  avg: number;
  median: number;
  byCategory: Record<string, PriceStats>;
}> {
  const client = getClient();
  const defaultStats = { min: 0, max: 0, avg: 0, median: 0, byCategory: {} };

  if (!client || !client.cabinet) return defaultStats;

  try {
    const stats = await client.cabinet.aggregate({
      where: { isActive: true, priceTTC: { not: null } },
      _min: { priceTTC: true },
      _max: { priceTTC: true },
      _avg: { priceTTC: true },
    });

    // Get stats by category
    const categoryStats = await client.cabinet.groupBy({
      by: ['category'],
      where: { isActive: true, priceTTC: { not: null } },
      _min: { priceTTC: true },
      _max: { priceTTC: true },
      _avg: { priceTTC: true },
    });

    const byCategory: Record<string, PriceStats> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const cs of categoryStats as any[]) {
      byCategory[cs.category] = {
        min: cs._min?.priceTTC || 0,
        max: cs._max?.priceTTC || 0,
        avg: cs._avg?.priceTTC || 0,
      };
    }

    return {
      min: stats._min?.priceTTC || 0,
      max: stats._max?.priceTTC || 0,
      avg: stats._avg?.priceTTC || 0,
      median: 0,
      byCategory,
    };
  } catch (error) {
    handleQueryError('getPriceStatsByCabinet', error);
    return defaultStats;
  }
}

export async function getDimensionStats(): Promise<{
  widths: DimensionCount[];
  heights: DimensionCount[];
  depths: DimensionCount[];
}> {
  const client = getClient();
  const defaultStats = { widths: [], heights: [], depths: [] };

  if (!client || !client.cabinet) return defaultStats;

  try {
    const [widths, heights, depths] = await Promise.all([
      client.cabinet.groupBy({
        by: ['width'],
        _count: { width: true },
        where: { isActive: true },
        orderBy: { width: 'asc' },
      }),
      client.cabinet.groupBy({
        by: ['height'],
        _count: { height: true },
        where: { isActive: true },
        orderBy: { height: 'asc' },
      }),
      client.cabinet.groupBy({
        by: ['depth'],
        _count: { depth: true },
        where: { isActive: true },
        orderBy: { depth: 'asc' },
      }),
    ]);

    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      widths: widths.map((w: any) => ({ value: w.width, count: w._count?.width || 0 })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      heights: heights.map((h: any) => ({ value: h.height, count: h._count?.height || 0 })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      depths: depths.map((d: any) => ({ value: d.depth, count: d._count?.depth || 0 })),
    };
  } catch (error) {
    handleQueryError('getDimensionStats', error);
    return defaultStats;
  }
}

// ===============================================================================
// Scraping Stats Queries
// ===============================================================================

export async function getScrapingStats(): Promise<{
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  partialRuns: number;
  averageDuration: number;
  totalProductsScraped: number;
}> {
  const client = getClient();
  const defaultStats = {
    totalRuns: 0,
    successfulRuns: 0,
    failedRuns: 0,
    partialRuns: 0,
    averageDuration: 0,
    totalProductsScraped: 0,
  };

  if (!client || !client.scrapeLog) return defaultStats;

  try {
    const [totalRuns, successfulRuns, failedRuns, partialRuns, durationStats, productsStats] =
      await Promise.all([
        client.scrapeLog.count(),
        client.scrapeLog.count({ where: { status: 'completed' } }),
        client.scrapeLog.count({ where: { status: 'failed' } }),
        client.scrapeLog.count({ where: { status: 'partial' } }),
        client.scrapeLog.aggregate({
          where: { duration: { not: null } },
          _avg: { duration: true },
        }),
        client.scrapeLog.aggregate({
          _sum: { productsFound: true },
        }),
      ]);

    return {
      totalRuns,
      successfulRuns,
      failedRuns,
      partialRuns,
      averageDuration: durationStats._avg?.duration || 0,
      totalProductsScraped: productsStats._sum?.productsFound || 0,
    };
  } catch (error) {
    handleQueryError('getScrapingStats', error);
    return defaultStats;
  }
}

export async function getScrapingLogsByBrand(
  brandId: string,
  limit: number = 10
): Promise<unknown[]> {
  const client = getClient();
  if (!client || !client.scrapeLog) return [];

  try {
    return await client.scrapeLog.findMany({
      where: { brandId },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  } catch (error) {
    handleQueryError('getScrapingLogsByBrand', error);
    return [];
  }
}

export async function getRecentScrapingRuns(limit: number = 20): Promise<unknown[]> {
  const client = getClient();
  if (!client || !client.scrapeLog) return [];

  try {
    return await client.scrapeLog.findMany({
      orderBy: { startedAt: 'desc' },
      include: { brand: { select: { id: true, name: true } } },
      take: limit,
    });
  } catch (error) {
    handleQueryError('getRecentScrapingRuns', error);
    return [];
  }
}

export async function getBrandScrapingStatus(brandId: string): Promise<{
  lastRun: Date | null;
  lastStatus: string;
  productsFound: number;
}> {
  const client = getClient();
  const defaultStatus = { lastRun: null, lastStatus: 'never', productsFound: 0 };

  if (!client || !client.scrapeLog) return defaultStatus;

  try {
    const lastLog = await client.scrapeLog.findFirst({
      where: { brandId },
      orderBy: { startedAt: 'desc' },
      select: { startedAt: true, status: true, productsFound: true },
    });

    return {
      lastRun: lastLog?.startedAt || null,
      lastStatus: lastLog?.status || 'never',
      productsFound: lastLog?.productsFound || 0,
    };
  } catch (error) {
    handleQueryError('getBrandScrapingStatus', error);
    return defaultStatus;
  }
}
