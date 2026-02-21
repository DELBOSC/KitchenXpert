/**
 * Catalog Service
 * Handles product catalog, search, and category management
 */

export interface CatalogItem {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  subcategory?: string;
  brand: string;
  manufacturer?: string;
  type: ProductType;
  dimensions: ProductDimensions;
  price: ProductPrice;
  images: ProductImage[];
  specifications: Record<string, string | number | boolean>;
  materials: string[];
  colors: ProductColor[];
  tags: string[];
  availability: ProductAvailability;
  rating?: ProductRating;
  createdAt: Date;
  updatedAt: Date;
}

export type ProductType =
  | 'cabinet'
  | 'countertop'
  | 'appliance'
  | 'sink'
  | 'faucet'
  | 'lighting'
  | 'hardware'
  | 'accessory';

export interface ProductDimensions {
  width: number;
  height: number;
  depth: number;
  unit: 'cm' | 'mm' | 'inch';
  weight?: number;
  weightUnit?: 'kg' | 'lb';
}

export interface ProductPrice {
  amount: number;
  currency: string;
  originalAmount?: number;
  discount?: number;
  discountType?: 'percentage' | 'fixed';
  validUntil?: Date;
}

export interface ProductImage {
  id: string;
  url: string;
  alt: string;
  isPrimary: boolean;
  order: number;
  type: 'main' | 'thumbnail' | '3d' | 'lifestyle';
}

export interface ProductColor {
  name: string;
  hex: string;
  imageUrl?: string;
}

export interface ProductAvailability {
  inStock: boolean;
  quantity: number;
  leadTime?: number;
  leadTimeUnit?: 'days' | 'weeks';
  regions?: string[];
}

export interface ProductRating {
  average: number;
  count: number;
  distribution?: Record<number, number>;
}

export interface CatalogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  imageUrl?: string;
  order: number;
  itemCount: number;
}

export interface CatalogSearchParams {
  query?: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  type?: ProductType;
  priceMin?: number;
  priceMax?: number;
  inStock?: boolean;
  materials?: string[];
  colors?: string[];
  tags?: string[];
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'price' | 'rating' | 'newest';
  sortOrder?: 'asc' | 'desc';
}

export interface CatalogSearchResult {
  items: CatalogItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  facets?: CatalogFacets;
}

export interface CatalogFacets {
  categories: FacetValue[];
  brands: FacetValue[];
  types: FacetValue[];
  materials: FacetValue[];
  colors: FacetValue[];
  priceRanges: PriceRangeFacet[];
}

export interface FacetValue {
  value: string;
  count: number;
}

export interface PriceRangeFacet {
  min: number;
  max: number;
  count: number;
}

export interface CatalogRepository {
  findById(id: string): Promise<CatalogItem | null>;
  findBySku(sku: string): Promise<CatalogItem | null>;
  search(params: CatalogSearchParams): Promise<CatalogSearchResult>;
  create(data: Omit<CatalogItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<CatalogItem>;
  update(id: string, data: Partial<CatalogItem>): Promise<CatalogItem | null>;
  delete(id: string): Promise<boolean>;
  getCategories(): Promise<CatalogCategory[]>;
  getCategoryById(id: string): Promise<CatalogCategory | null>;
  getBrands(): Promise<string[]>;
  getFacets(params: CatalogSearchParams): Promise<CatalogFacets>;
}

export class CatalogService {
  constructor(private repository: CatalogRepository) {}

  /**
   * Get product by ID
   */
  async getProductById(id: string): Promise<CatalogItem | null> {
    return this.repository.findById(id);
  }

  /**
   * Get product by SKU
   */
  async getProductBySku(sku: string): Promise<CatalogItem | null> {
    return this.repository.findBySku(sku);
  }

  /**
   * Search products with filters
   */
  async searchProducts(params: CatalogSearchParams): Promise<CatalogSearchResult> {
    // Apply defaults
    const searchParams: CatalogSearchParams = {
      page: 1,
      limit: 20,
      sortBy: 'name',
      sortOrder: 'asc',
      ...params,
    };

    return this.repository.search(searchParams);
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(
    category: string,
    params?: Omit<CatalogSearchParams, 'category'>
  ): Promise<CatalogSearchResult> {
    return this.searchProducts({ ...params, category });
  }

  /**
   * Get products by type
   */
  async getProductsByType(
    type: ProductType,
    params?: Omit<CatalogSearchParams, 'type'>
  ): Promise<CatalogSearchResult> {
    return this.searchProducts({ ...params, type });
  }

  /**
   * Get featured products
   */
  async getFeaturedProducts(limit: number = 10): Promise<CatalogItem[]> {
    const result = await this.searchProducts({
      tags: ['featured'],
      limit,
      sortBy: 'rating',
      sortOrder: 'desc',
    });
    return result.items;
  }

  /**
   * Get new arrivals
   */
  async getNewArrivals(limit: number = 10): Promise<CatalogItem[]> {
    const result = await this.searchProducts({
      limit,
      sortBy: 'newest',
      sortOrder: 'desc',
    });
    return result.items;
  }

  /**
   * Get related products
   */
  async getRelatedProducts(productId: string, limit: number = 6): Promise<CatalogItem[]> {
    const product = await this.repository.findById(productId);
    if (!product) return [];

    const result = await this.searchProducts({
      category: product.category,
      limit: limit + 1, // Get extra in case current product is included
    });

    // Filter out the current product
    return result.items.filter(item => item.id !== productId).slice(0, limit);
  }

  /**
   * Get all categories
   */
  async getCategories(): Promise<CatalogCategory[]> {
    return this.repository.getCategories();
  }

  /**
   * Get category tree
   */
  async getCategoryTree(): Promise<CategoryTreeNode[]> {
    const categories = await this.repository.getCategories();
    return this.buildCategoryTree(categories);
  }

  /**
   * Get all brands
   */
  async getBrands(): Promise<string[]> {
    return this.repository.getBrands();
  }

  /**
   * Get search facets
   */
  async getFacets(params: CatalogSearchParams): Promise<CatalogFacets> {
    return this.repository.getFacets(params);
  }

  /**
   * Create a new product (admin)
   */
  async createProduct(
    data: Omit<CatalogItem, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<CatalogItem> {
    // Validate required fields
    if (!data.name || !data.sku || !data.category) {
      throw new CatalogServiceError('VALIDATION_ERROR', 'Name, SKU, and category are required');
    }

    // Check for duplicate SKU
    const existing = await this.repository.findBySku(data.sku);
    if (existing) {
      throw new CatalogServiceError('DUPLICATE_SKU', 'A product with this SKU already exists');
    }

    return this.repository.create(data);
  }

  /**
   * Update a product (admin)
   */
  async updateProduct(id: string, data: Partial<CatalogItem>): Promise<CatalogItem | null> {
    // If SKU is being updated, check for duplicates
    if (data.sku) {
      const existing = await this.repository.findBySku(data.sku);
      if (existing && existing.id !== id) {
        throw new CatalogServiceError('DUPLICATE_SKU', 'A product with this SKU already exists');
      }
    }

    return this.repository.update(id, {
      ...data,
      updatedAt: new Date(),
    });
  }

  /**
   * Delete a product (admin)
   */
  async deleteProduct(id: string): Promise<boolean> {
    return this.repository.delete(id);
  }

  /**
   * Build category tree from flat list
   */
  private buildCategoryTree(categories: CatalogCategory[]): CategoryTreeNode[] {
    const categoryMap = new Map<string, CategoryTreeNode>();
    const roots: CategoryTreeNode[] = [];

    // First pass: create nodes
    for (const category of categories) {
      categoryMap.set(category.id, { ...category, children: [] });
    }

    // Second pass: build tree
    for (const category of categories) {
      const node = categoryMap.get(category.id)!;
      if (category.parentId) {
        const parent = categoryMap.get(category.parentId);
        if (parent) {
          parent.children.push(node);
        }
      } else {
        roots.push(node);
      }
    }

    // Sort by order
    const sortByOrder = (a: CategoryTreeNode, b: CategoryTreeNode) => a.order - b.order;
    roots.sort(sortByOrder);
    for (const node of categoryMap.values()) {
      node.children.sort(sortByOrder);
    }

    return roots;
  }
}

export interface CategoryTreeNode extends CatalogCategory {
  children: CategoryTreeNode[];
}

export class CatalogServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'CatalogServiceError';
  }
}

export function createCatalogService(repository: CatalogRepository): CatalogService {
  return new CatalogService(repository);
}

export default CatalogService;
