import { type PrismaClient, type Product, type ProductCategory, type Prisma } from '@prisma/client';

/**
 * Product Repository
 *
 * Handles all product-related database operations using Prisma ORM.
 */

export interface ProductWithCategory extends Product {
  category?: ProductCategory | null;
}

export interface CreateProductDto {
  catalogId?: string;
  providerId?: string;
  categoryId?: string;
  sku: string;
  name: string;
  description?: string;
  brand?: string;
  model?: string;
  price: number;
  currency?: string;
  width?: number;
  depth?: number;
  height?: number;
  weight?: number;
  color?: string;
  material?: string;
  finish?: string;
  images?: string[];
  specifications?: Record<string, unknown>;
  availability?: string;
  // Ingestion provenance (CLAUDE.md §15.8 step d) — populated by the catalog
  // ingestion pipeline from a UnifiedProduct. All nullable/additive.
  dimensionConfidence?: number;
  sourceLevel?: number;
  sourceUrl?: string;
  lastVerifiedAt?: Date;
}

/**
 * Payload for {@link ProductRepository.upsertBySku} — every creatable field
 * except `sku` (which is the upsert key, passed separately).
 */
export type UpsertProductDto = Omit<CreateProductDto, 'sku'>;

export interface UpdateProductDto {
  name?: string;
  description?: string;
  price?: number;
  currency?: string;
  width?: number;
  depth?: number;
  height?: number;
  weight?: number;
  color?: string;
  material?: string;
  finish?: string;
  images?: string[];
  specifications?: Record<string, unknown>;
  availability?: string;
  isActive?: boolean;
  dimensionConfidence?: number;
  sourceLevel?: number;
  sourceUrl?: string;
  lastVerifiedAt?: Date;
}

export interface ProductFilters {
  catalogId?: string;
  providerId?: string;
  categoryId?: string;
  brand?: string;
  material?: string;
  color?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  isActive?: boolean;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class ProductRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Find a product by ID
   */
  async findById(id: string): Promise<ProductWithCategory | null> {
    return this.prisma.product.findUnique({
      where: { id, deletedAt: null },
      include: { category: true, catalog: true, provider: true },
    });
  }

  /**
   * Find a product by SKU
   */
  async findBySku(sku: string): Promise<Product | null> {
    return this.prisma.product.findUnique({
      where: { sku },
      include: { category: true },
    });
  }

  /**
   * Find all products with filters and pagination
   */
  async findAll(
    filters: ProductFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<{ data: Product[]; total: number; page: number; totalPages: number }> {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
    // sortBy is client-supplied and flows into `orderBy: { [sortBy]: ... }` — an
    // arbitrary property write (CodeQL js/remote-property-injection). Prisma rejects an
    // unknown column with a 500, so it never leaked, but a 500 on a query string is a
    // defect, not a defense. Whitelist the sortable columns; anything else → createdAt.
    const SORTABLE = new Set(['name', 'sku', 'brand', 'price', 'createdAt', 'updatedAt']);
    const safeSortBy = SORTABLE.has(sortBy) ? sortBy : 'createdAt';
    const safeSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      isActive: filters.isActive !== false,
      ...(filters.catalogId && { catalogId: filters.catalogId }),
      ...(filters.providerId && { providerId: filters.providerId }),
      ...(filters.categoryId && { categoryId: filters.categoryId }),
      ...(filters.brand && { brand: { equals: filters.brand, mode: 'insensitive' } }),
      ...(filters.material && { material: { equals: filters.material, mode: 'insensitive' } }),
      ...(filters.color && { color: { equals: filters.color, mode: 'insensitive' } }),
      ...((filters.minPrice || filters.maxPrice) && {
        price: {
          ...(filters.minPrice && { gte: filters.minPrice }),
          ...(filters.maxPrice && { lte: filters.maxPrice }),
        },
      }),
      ...(filters.search && {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
          { brand: { contains: filters.search, mode: 'insensitive' } },
          { sku: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [safeSortBy]: safeSortOrder },
        include: { category: true },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find products by category
   */
  async findByCategory(categoryId: string): Promise<Product[]> {
    return this.prisma.product.findMany({
      where: { categoryId, deletedAt: null, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Find products by brand
   */
  async findByBrand(brand: string): Promise<Product[]> {
    return this.prisma.product.findMany({
      where: { brand: { equals: brand, mode: 'insensitive' }, deletedAt: null, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Create a new product
   */
  async create(data: CreateProductDto): Promise<Product> {
    return this.prisma.product.create({
      data: {
        catalogId: data.catalogId,
        providerId: data.providerId,
        categoryId: data.categoryId,
        sku: data.sku,
        name: data.name,
        description: data.description,
        brand: data.brand,
        model: data.model,
        price: data.price,
        currency: data.currency || 'EUR',
        width: data.width,
        depth: data.depth,
        height: data.height,
        weight: data.weight,
        color: data.color,
        material: data.material,
        finish: data.finish,
        images: data.images as any,
        specifications: data.specifications as any,
        availability: data.availability || 'in_stock',
      },
      include: { category: true },
    });
  }

  /**
   * Create many products (bulk insert)
   */
  async createMany(products: CreateProductDto[]): Promise<{ count: number }> {
    return this.prisma.product.createMany({
      data: products.map((p) => ({
        ...p,
        currency: p.currency || 'EUR',
        availability: p.availability || 'in_stock',
        images: p.images as any,
        specifications: p.specifications as any,
      })),
      skipDuplicates: true,
    });
  }

  /**
   * Upsert (create-or-update) a product by its unique SKU.
   *
   * Used by the catalog ingestion pipeline (CLAUDE.md §15.8 step d): each run
   * re-ingests the same SKUs, so this is idempotent — `lastVerifiedAt` and the
   * ingestion provenance fields are refreshed on every pass. `sku` is the
   * upsert key (passed separately); `data` carries every other writable field.
   * Prisma manages `createdAt`/`updatedAt` automatically.
   */
  async upsertBySku(sku: string, data: UpsertProductDto): Promise<Product> {
    const write = {
      catalogId: data.catalogId,
      providerId: data.providerId,
      categoryId: data.categoryId,
      name: data.name,
      description: data.description,
      brand: data.brand,
      model: data.model,
      price: data.price,
      currency: data.currency || 'EUR',
      width: data.width,
      depth: data.depth,
      height: data.height,
      weight: data.weight,
      color: data.color,
      material: data.material,
      finish: data.finish,
      images: data.images as any,
      specifications: data.specifications as any,
      availability: data.availability || 'in_stock',
      dimensionConfidence: data.dimensionConfidence,
      sourceLevel: data.sourceLevel,
      sourceUrl: data.sourceUrl,
      lastVerifiedAt: data.lastVerifiedAt ?? new Date(),
    };

    return this.prisma.product.upsert({
      where: { sku },
      create: { sku, ...write },
      update: write,
    });
  }

  /**
   * Update a product
   */
  async update(id: string, data: UpdateProductDto): Promise<Product> {
    return this.prisma.product.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.currency && { currency: data.currency }),
        ...(data.width !== undefined && { width: data.width }),
        ...(data.depth !== undefined && { depth: data.depth }),
        ...(data.height !== undefined && { height: data.height }),
        ...(data.weight !== undefined && { weight: data.weight }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.material !== undefined && { material: data.material }),
        ...(data.finish !== undefined && { finish: data.finish }),
        ...(data.images && { images: data.images as any }),
        ...(data.specifications && { specifications: data.specifications as any }),
        ...(data.availability && { availability: data.availability }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: { category: true },
    });
  }

  /**
   * Soft delete a product
   */
  async delete(id: string): Promise<Product> {
    return this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  /**
   * Count products
   */
  async count(filters: ProductFilters = {}): Promise<number> {
    return this.prisma.product.count({
      where: {
        deletedAt: null,
        ...(filters.catalogId && { catalogId: filters.catalogId }),
        ...(filters.providerId && { providerId: filters.providerId }),
        ...(filters.categoryId && { categoryId: filters.categoryId }),
        ...(filters.brand && { brand: filters.brand }),
        ...(filters.isActive !== undefined && { isActive: filters.isActive }),
      },
    });
  }

  // ==================== CATEGORIES ====================

  /**
   * Find a category by ID
   */
  async findCategoryById(id: string): Promise<ProductCategory | null> {
    return this.prisma.productCategory.findUnique({
      where: { id },
      include: { children: true, parent: true },
    });
  }

  /**
   * Find a category by slug
   */
  async findCategoryBySlug(slug: string): Promise<ProductCategory | null> {
    return this.prisma.productCategory.findUnique({
      where: { slug },
      include: { children: true },
    });
  }

  /**
   * Get all categories (tree structure)
   */
  async getCategories(): Promise<ProductCategory[]> {
    return this.prisma.productCategory.findMany({
      where: { parentId: null, isActive: true },
      include: {
        children: {
          where: { isActive: true },
          include: { children: { where: { isActive: true } } },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * Create a category
   */
  async createCategory(data: {
    name: string;
    slug: string;
    description?: string;
    parentId?: string;
    image?: string;
  }): Promise<ProductCategory> {
    return this.prisma.productCategory.create({ data });
  }

  // ==================== SEARCH & FILTER ====================

  /**
   * Get all unique brands
   */
  async getBrands(): Promise<string[]> {
    const brands = await this.prisma.product.findMany({
      where: { deletedAt: null, isActive: true, brand: { not: null } },
      select: { brand: true },
      distinct: ['brand'],
    });
    return brands.map((b) => b.brand).filter(Boolean) as string[];
  }

  /**
   * Get all unique materials
   */
  async getMaterials(): Promise<string[]> {
    const materials = await this.prisma.product.findMany({
      where: { deletedAt: null, isActive: true, material: { not: null } },
      select: { material: true },
      distinct: ['material'],
    });
    return materials.map((m) => m.material).filter(Boolean) as string[];
  }

  /**
   * Get all unique colors
   */
  async getColors(): Promise<string[]> {
    const colors = await this.prisma.product.findMany({
      where: { deletedAt: null, isActive: true, color: { not: null } },
      select: { color: true },
      distinct: ['color'],
    });
    return colors.map((c) => c.color).filter(Boolean) as string[];
  }

  /**
   * Get price range
   */
  async getPriceRange(filters: ProductFilters = {}): Promise<{ min: number; max: number }> {
    const result = await this.prisma.product.aggregate({
      where: {
        deletedAt: null,
        isActive: true,
        ...(filters.categoryId && { categoryId: filters.categoryId }),
        ...(filters.brand && { brand: filters.brand }),
      },
      _min: { price: true },
      _max: { price: true },
    });

    return {
      min: Number(result._min.price) || 0,
      max: Number(result._max.price) || 0,
    };
  }

  /**
   * Search products with full-text search
   */
  async search(query: string, limit = 20): Promise<Product[]> {
    return this.prisma.product.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { brand: { contains: query, mode: 'insensitive' } },
          { sku: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit,
      include: { category: true },
    });
  }

  /**
   * Get related products.
   * Uses select to fetch only the fields needed for the filter query
   * instead of loading the full product with all relations.
   */
  async getRelated(productId: string, limit = 5): Promise<Product[]> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId, deletedAt: null },
      select: { categoryId: true, brand: true, material: true },
    });
    if (!product) {
      return [];
    }

    return this.prisma.product.findMany({
      where: {
        id: { not: productId },
        deletedAt: null,
        isActive: true,
        OR: [
          ...(product.categoryId ? [{ categoryId: product.categoryId }] : []),
          ...(product.brand ? [{ brand: product.brand }] : []),
          ...(product.material ? [{ material: product.material }] : []),
        ],
      },
      take: limit,
      include: { category: true },
    });
  }
}

export default ProductRepository;
