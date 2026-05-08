import { type PrismaClient, type Appliance } from '@prisma/client';

/**
 * Appliance Repository
 * Handles all appliance-related database operations using Prisma ORM.
 */

export interface CreateApplianceDto {
  providerId?: string;
  type: string;
  brand: string;
  model: string;
  name: string;
  description?: string;
  price: number;
  currency?: string;
  energyRating?: string;
  powerConsumption?: number;
  width: number;
  depth: number;
  height: number;
  weight?: number;
  color?: string;
  finish?: string;
  features?: Record<string, unknown>;
  specifications?: Record<string, unknown>;
  images?: string[];
  smartFeatures?: Record<string, unknown>;
  warranty?: string;
}

export interface UpdateApplianceDto {
  name?: string;
  description?: string;
  price?: number;
  energyRating?: string;
  powerConsumption?: number;
  color?: string;
  finish?: string;
  features?: Record<string, unknown>;
  specifications?: Record<string, unknown>;
  images?: string[];
  smartFeatures?: Record<string, unknown>;
  warranty?: string;
  availability?: string;
  isActive?: boolean;
}

export interface ApplianceFilters {
  providerId?: string;
  type?: string;
  brand?: string;
  energyRating?: string;
  minPrice?: number;
  maxPrice?: number;
  hasSmart?: boolean;
  isActive?: boolean;
  search?: string;
}

export class ApplianceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Appliance | null> {
    return this.prisma.appliance.findUnique({
      where: { id, deletedAt: null },
      include: { provider: true }
    });
  }

  async findByBrandModel(brand: string, model: string): Promise<Appliance | null> {
    return this.prisma.appliance.findUnique({
      where: { brand_model: { brand, model } }
    });
  }

  async findAll(
    filters: ApplianceFilters = {},
    pagination: { page?: number; limit?: number } = {}
  ): Promise<{ data: Appliance[]; total: number; page: number; totalPages: number }> {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
      isActive: filters.isActive !== false,
      ...(filters.providerId && { providerId: filters.providerId }),
      ...(filters.type && { type: filters.type }),
      ...(filters.brand && { brand: { equals: filters.brand, mode: 'insensitive' as const } }),
      ...(filters.energyRating && { energyRating: filters.energyRating }),
      ...((filters.minPrice || filters.maxPrice) && {
        price: {
          ...(filters.minPrice && { gte: filters.minPrice }),
          ...(filters.maxPrice && { lte: filters.maxPrice }),
        }
      }),
      ...(filters.hasSmart && { smartFeatures: { not: null } }),
      ...(filters.search && {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' as const } },
          { brand: { contains: filters.search, mode: 'insensitive' as const } },
          { model: { contains: filters.search, mode: 'insensitive' as const } }
        ]
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.appliance.findMany({ where, skip, take: limit, orderBy: { name: 'asc' } }),
      this.prisma.appliance.count({ where })
    ]);

    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async findByType(type: string): Promise<Appliance[]> {
    return this.prisma.appliance.findMany({
      where: { type, deletedAt: null, isActive: true },
      orderBy: [{ brand: 'asc' }, { name: 'asc' }]
    });
  }

  async findByBrand(brand: string): Promise<Appliance[]> {
    return this.prisma.appliance.findMany({
      where: { brand: { equals: brand, mode: 'insensitive' }, deletedAt: null, isActive: true },
      orderBy: { name: 'asc' }
    });
  }

  async create(data: CreateApplianceDto): Promise<Appliance> {
    return this.prisma.appliance.create({
      data: {
        ...data,
        currency: data.currency || 'EUR',
        features: data.features as any,
        specifications: data.specifications as any,
        images: data.images as any,
        smartFeatures: data.smartFeatures as any,
      }
    });
  }

  async createMany(appliances: CreateApplianceDto[]): Promise<{ count: number }> {
    return this.prisma.appliance.createMany({
      data: appliances.map(a => ({
        ...a,
        currency: a.currency || 'EUR',
        features: a.features as any,
        specifications: a.specifications as any,
        images: a.images as any,
        smartFeatures: a.smartFeatures as any,
      })),
      skipDuplicates: true
    });
  }

  async update(id: string, data: UpdateApplianceDto): Promise<Appliance> {
    return this.prisma.appliance.update({
      where: { id },
      data: {
        ...data,
        features: data.features as any,
        specifications: data.specifications as any,
        images: data.images as any,
        smartFeatures: data.smartFeatures as any,
      }
    });
  }

  async delete(id: string): Promise<Appliance> {
    return this.prisma.appliance.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false }
    });
  }

  async count(filters: ApplianceFilters = {}): Promise<number> {
    return this.prisma.appliance.count({
      where: {
        deletedAt: null,
        ...(filters.type && { type: filters.type }),
        ...(filters.brand && { brand: filters.brand }),
        ...(filters.isActive !== undefined && { isActive: filters.isActive }),
      }
    });
  }

  async getTypes(): Promise<string[]> {
    const types = await this.prisma.appliance.findMany({
      where: { deletedAt: null, isActive: true },
      select: { type: true },
      distinct: ['type']
    });
    return types.map(t => t.type);
  }

  async getBrands(): Promise<string[]> {
    const brands = await this.prisma.appliance.findMany({
      where: { deletedAt: null, isActive: true },
      select: { brand: true },
      distinct: ['brand']
    });
    return brands.map(b => b.brand);
  }

  async getEnergyRatings(): Promise<string[]> {
    const ratings = await this.prisma.appliance.findMany({
      where: { deletedAt: null, isActive: true, energyRating: { not: null } },
      select: { energyRating: true },
      distinct: ['energyRating']
    });
    return ratings.map(r => r.energyRating).filter(Boolean) as string[];
  }

  async search(query: string, limit = 20): Promise<Appliance[]> {
    return this.prisma.appliance.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { brand: { contains: query, mode: 'insensitive' } },
          { model: { contains: query, mode: 'insensitive' } },
          { type: { contains: query, mode: 'insensitive' } }
        ]
      },
      take: limit
    });
  }
}

export default ApplianceRepository;
