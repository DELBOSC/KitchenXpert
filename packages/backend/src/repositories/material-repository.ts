import { type PrismaClient, type Material } from '@prisma/client';

/**
 * Material Repository
 * Handles all material-related database operations using Prisma ORM.
 */

export interface CreateMaterialDto {
  providerId?: string;
  type: string;
  name: string;
  description?: string;
  category: string;
  pricePerUnit: number;
  unit?: string;
  currency?: string;
  color?: string;
  finish?: string;
  durability?: number;
  maintenanceLevel?: string;
  ecoRating?: string;
  specifications?: Record<string, unknown>;
  images?: string[];
}

export interface UpdateMaterialDto {
  name?: string;
  description?: string;
  pricePerUnit?: number;
  color?: string;
  finish?: string;
  durability?: number;
  maintenanceLevel?: string;
  ecoRating?: string;
  specifications?: Record<string, unknown>;
  images?: string[];
  isActive?: boolean;
}

export interface MaterialFilters {
  providerId?: string;
  type?: string;
  category?: string;
  maintenanceLevel?: string;
  ecoRating?: string;
  minPrice?: number;
  maxPrice?: number;
  isActive?: boolean;
  search?: string;
}

export class MaterialRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Material | null> {
    return this.prisma.material.findUnique({
      where: { id },
      include: { provider: true }
    });
  }

  async findAll(
    filters: MaterialFilters = {},
    pagination: { page?: number; limit?: number } = {}
  ): Promise<{ data: Material[]; total: number; page: number; totalPages: number }> {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const where = {
      isActive: filters.isActive !== false,
      ...(filters.providerId && { providerId: filters.providerId }),
      ...(filters.type && { type: filters.type }),
      ...(filters.category && { category: filters.category }),
      ...(filters.maintenanceLevel && { maintenanceLevel: filters.maintenanceLevel }),
      ...(filters.ecoRating && { ecoRating: filters.ecoRating }),
      ...((filters.minPrice || filters.maxPrice) && {
        pricePerUnit: {
          ...(filters.minPrice && { gte: filters.minPrice }),
          ...(filters.maxPrice && { lte: filters.maxPrice }),
        }
      }),
      ...(filters.search && {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' as const } },
          { description: { contains: filters.search, mode: 'insensitive' as const } }
        ]
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.material.findMany({ where, skip, take: limit, orderBy: { name: 'asc' } }),
      this.prisma.material.count({ where })
    ]);

    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async findByType(type: string): Promise<Material[]> {
    return this.prisma.material.findMany({
      where: { type, isActive: true },
      orderBy: { name: 'asc' }
    });
  }

  async findByCategory(category: string): Promise<Material[]> {
    return this.prisma.material.findMany({
      where: { category, isActive: true },
      orderBy: { name: 'asc' }
    });
  }

  async create(data: CreateMaterialDto): Promise<Material> {
    return this.prisma.material.create({
      data: {
        ...data,
        unit: data.unit || 'sqm',
        currency: data.currency || 'EUR',
        specifications: data.specifications as any,
        images: data.images as any,
      }
    });
  }

  async createMany(materials: CreateMaterialDto[]): Promise<{ count: number }> {
    return this.prisma.material.createMany({
      data: materials.map(m => ({
        ...m,
        unit: m.unit || 'sqm',
        currency: m.currency || 'EUR',
        specifications: m.specifications as any,
        images: m.images as any,
      })),
      skipDuplicates: true
    });
  }

  async update(id: string, data: UpdateMaterialDto): Promise<Material> {
    return this.prisma.material.update({
      where: { id },
      data: {
        ...data,
        specifications: data.specifications as any,
        images: data.images as any,
      }
    });
  }

  async delete(id: string): Promise<Material> {
    return this.prisma.material.update({
      where: { id },
      data: { isActive: false }
    });
  }

  async count(filters: MaterialFilters = {}): Promise<number> {
    return this.prisma.material.count({
      where: {
        ...(filters.type && { type: filters.type }),
        ...(filters.category && { category: filters.category }),
        ...(filters.isActive !== undefined && { isActive: filters.isActive }),
      }
    });
  }

  async getTypes(): Promise<string[]> {
    const types = await this.prisma.material.findMany({
      where: { isActive: true },
      select: { type: true },
      distinct: ['type']
    });
    return types.map(t => t.type);
  }

  async getCategories(): Promise<string[]> {
    const categories = await this.prisma.material.findMany({
      where: { isActive: true },
      select: { category: true },
      distinct: ['category']
    });
    return categories.map(c => c.category);
  }

  async getMaintenanceLevels(): Promise<string[]> {
    const levels = await this.prisma.material.findMany({
      where: { isActive: true, maintenanceLevel: { not: null } },
      select: { maintenanceLevel: true },
      distinct: ['maintenanceLevel']
    });
    return levels.map(l => l.maintenanceLevel).filter(Boolean) as string[];
  }

  async search(query: string, limit = 20): Promise<Material[]> {
    return this.prisma.material.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { type: { contains: query, mode: 'insensitive' } },
          { category: { contains: query, mode: 'insensitive' } }
        ]
      },
      take: limit
    });
  }

  async getByMaintenanceLevel(level: string): Promise<Material[]> {
    return this.prisma.material.findMany({
      where: { maintenanceLevel: level, isActive: true },
      orderBy: { name: 'asc' }
    });
  }

  async getEcoFriendly(_minRating = 'A'): Promise<Material[]> {
    return this.prisma.material.findMany({
      where: {
        isActive: true,
        ecoRating: { in: ['A', 'A+', 'A++', 'A+++'] }
      },
      orderBy: { ecoRating: 'asc' }
    });
  }
}

export default MaterialRepository;
