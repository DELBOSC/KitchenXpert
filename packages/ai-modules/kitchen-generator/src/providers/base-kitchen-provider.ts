/**
 * Base Kitchen Product Provider
 * Abstract class for kitchen product catalog providers
 */

import type {
  KitchenProductProvider,
  CatalogProduct,
  ProviderFetchOptions,
  ProviderProductRules,
  CabinetType,
} from '../types';

/**
 * Provider configuration
 */
export interface KitchenProviderConfig {
  /** Provider unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Provider type */
  type: 'furniture' | 'appliance' | 'mixed';
  /** Country code (ISO 3166-1 alpha-2) */
  country: string;
  /** Language code */
  language?: string;
  /** API configuration */
  api?: {
    baseUrl?: string;
    apiKey?: string;
    timeout?: number;
    retryAttempts?: number;
    rateLimit?: {
      maxRequests: number;
      windowMs: number;
    };
  };
  /** Cache configuration */
  cache?: {
    enabled: boolean;
    ttlMs: number;
  };
}

/**
 * Abstract base class for kitchen product providers
 */
export abstract class BaseKitchenProvider implements KitchenProductProvider {
  public readonly id: string;
  public readonly name: string;
  public readonly type: 'furniture' | 'appliance' | 'mixed';
  public readonly country: string;

  protected config: KitchenProviderConfig;
  protected productCache: Map<string, { product: CatalogProduct; timestamp: number }> = new Map();
  protected categoriesCache: { categories: string[]; timestamp: number } | null = null;

  constructor(config: KitchenProviderConfig) {
    this.config = config;
    this.id = config.id;
    this.name = config.name;
    this.type = config.type;
    this.country = config.country;
  }

  // ============================================
  // Abstract methods - must be implemented
  // ============================================

  /**
   * Fetch products from the provider's API
   */
  protected abstract fetchProducts(
    category: string,
    options?: ProviderFetchOptions
  ): Promise<CatalogProduct[]>;

  /**
   * Fetch a single product by ID
   */
  protected abstract fetchProduct(productId: string): Promise<CatalogProduct | null>;

  /**
   * Search products by query
   */
  protected abstract fetchSearch(
    query: string,
    options?: ProviderFetchOptions
  ): Promise<CatalogProduct[]>;

  /**
   * Fetch available categories
   */
  protected abstract fetchCategories(): Promise<string[]>;

  /**
   * Check stock for multiple products
   */
  protected abstract fetchStock(productIds: string[]): Promise<Map<string, boolean>>;

  // ============================================
  // Public API methods with caching
  // ============================================

  async getProducts(category: string, options?: ProviderFetchOptions): Promise<CatalogProduct[]> {
    const products = await this.fetchProducts(category, options);

    // Cache individual products
    for (const product of products) {
      this.cacheProduct(product);
    }

    return products;
  }

  async getProduct(productId: string): Promise<CatalogProduct | null> {
    // Check cache first
    const cached = this.getCachedProduct(productId);
    if (cached) {
      return cached;
    }

    const product = await this.fetchProduct(productId);
    if (product) {
      this.cacheProduct(product);
    }

    return product;
  }

  async searchProducts(query: string, options?: ProviderFetchOptions): Promise<CatalogProduct[]> {
    const products = await this.fetchSearch(query, options);

    // Cache individual products
    for (const product of products) {
      this.cacheProduct(product);
    }

    return products;
  }

  async getCategories(): Promise<string[]> {
    // Check cache
    if (this.categoriesCache && this.isCacheValid(this.categoriesCache.timestamp)) {
      return this.categoriesCache.categories;
    }

    const categories = await this.fetchCategories();
    this.categoriesCache = { categories, timestamp: Date.now() };

    return categories;
  }

  async checkStock(productIds: string[]): Promise<Map<string, boolean>> {
    return this.fetchStock(productIds);
  }

  /**
   * Get provider-specific product rules
   * Override in subclass for provider-specific rules
   */
  async getProductRules(): Promise<ProviderProductRules> {
    return this.getDefaultProductRules();
  }

  // ============================================
  // Cache helpers
  // ============================================

  protected cacheProduct(product: CatalogProduct): void {
    if (!this.config.cache?.enabled) return;

    this.productCache.set(product.id, {
      product,
      timestamp: Date.now(),
    });
  }

  protected getCachedProduct(productId: string): CatalogProduct | null {
    if (!this.config.cache?.enabled) return null;

    const cached = this.productCache.get(productId);
    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.product;
    }

    // Remove stale cache entry
    if (cached) {
      this.productCache.delete(productId);
    }

    return null;
  }

  protected isCacheValid(timestamp: number): boolean {
    const ttl = this.config.cache?.ttlMs || 300000; // 5 minutes default
    return Date.now() - timestamp < ttl;
  }

  public clearCache(): void {
    this.productCache.clear();
    this.categoriesCache = null;
  }

  // ============================================
  // Default product rules (common across providers)
  // ============================================

  protected getDefaultProductRules(): ProviderProductRules {
    return {
      standardWidths: [20, 30, 40, 45, 50, 60, 80, 90, 100, 120],
      standardHeights: {
        base: [72, 80, 88],
        wall: [40, 60, 80, 100],
        tall: [200, 210, 220, 230, 240],
        corner_base: [72, 80, 88],
        corner_wall: [40, 60, 80],
        drawer: [72, 80, 88],
        sink_base: [72, 80, 88],
        oven_housing: [200, 210, 220],
        fridge_housing: [200, 210, 220],
        pantry: [200, 210, 220],
      },
      standardDepths: [37, 58, 60, 62],
      compatibility: [
        {
          sourceType: 'base',
          targetType: 'worktop',
          rule: 'requires',
          description: 'Base cabinets require a worktop',
        },
        {
          sourceType: 'cooktop',
          targetType: 'range_hood',
          rule: 'requires',
          description: 'Cooktop requires ventilation',
        },
        {
          sourceType: 'sink',
          targetType: 'sink_base',
          rule: 'requires',
          description: 'Sink requires sink base cabinet',
        },
        {
          sourceType: 'oven',
          targetType: 'oven_housing',
          rule: 'optional',
          description: 'Oven can be in housing or under cooktop',
        },
      ],
    };
  }

  // ============================================
  // Utility methods
  // ============================================

  /**
   * Filter products by dimensions
   */
  protected filterByDimensions(
    products: CatalogProduct[],
    options?: ProviderFetchOptions
  ): CatalogProduct[] {
    if (!options?.dimensions) return products;

    const { minWidth, maxWidth, minHeight, maxHeight } = options.dimensions;

    return products.filter((p) => {
      const { width, height } = p.dimensions;
      if (minWidth && width < minWidth) return false;
      if (maxWidth && width > maxWidth) return false;
      if (minHeight && height < minHeight) return false;
      if (maxHeight && height > maxHeight) return false;
      return true;
    });
  }

  /**
   * Filter products by price
   */
  protected filterByPrice(
    products: CatalogProduct[],
    options?: ProviderFetchOptions
  ): CatalogProduct[] {
    if (!options?.minPrice && !options?.maxPrice) return products;

    return products.filter((p) => {
      if (options.minPrice && p.price < options.minPrice) return false;
      if (options.maxPrice && p.price > options.maxPrice) return false;
      return true;
    });
  }

  /**
   * Filter products by stock
   */
  protected filterByStock(
    products: CatalogProduct[],
    options?: ProviderFetchOptions
  ): CatalogProduct[] {
    if (!options?.inStockOnly) return products;
    return products.filter((p) => p.inStock);
  }

  /**
   * Apply all filters
   */
  protected applyFilters(
    products: CatalogProduct[],
    options?: ProviderFetchOptions
  ): CatalogProduct[] {
    let filtered = products;
    filtered = this.filterByDimensions(filtered, options);
    filtered = this.filterByPrice(filtered, options);
    filtered = this.filterByStock(filtered, options);

    // Apply pagination
    if (options?.offset || options?.limit) {
      const offset = options.offset || 0;
      const limit = options.limit || filtered.length;
      filtered = filtered.slice(offset, offset + limit);
    }

    return filtered;
  }
}

/**
 * Provider registry for managing multiple providers
 */
export class KitchenProviderRegistry {
  private static instance: KitchenProviderRegistry;
  private providers: Map<string, KitchenProductProvider> = new Map();

  private constructor() {}

  public static getInstance(): KitchenProviderRegistry {
    if (!KitchenProviderRegistry.instance) {
      KitchenProviderRegistry.instance = new KitchenProviderRegistry();
    }
    return KitchenProviderRegistry.instance;
  }

  /**
   * Register a provider
   */
  public register(provider: KitchenProductProvider): void {
    this.providers.set(provider.id, provider);
  }

  /**
   * Unregister a provider
   */
  public unregister(providerId: string): boolean {
    return this.providers.delete(providerId);
  }

  /**
   * Get a provider by ID
   */
  public get(providerId: string): KitchenProductProvider | undefined {
    return this.providers.get(providerId);
  }

  /**
   * Get all providers
   */
  public getAll(): KitchenProductProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get providers by type
   */
  public getByType(type: 'furniture' | 'appliance' | 'mixed'): KitchenProductProvider[] {
    return this.getAll().filter((p) => p.type === type || p.type === 'mixed');
  }

  /**
   * Get providers by country
   */
  public getByCountry(country: string): KitchenProductProvider[] {
    return this.getAll().filter((p) => p.country === country);
  }

  /**
   * Get provider IDs
   */
  public getProviderIds(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if provider exists
   */
  public has(providerId: string): boolean {
    return this.providers.has(providerId);
  }

  /**
   * Clear all providers
   */
  public clear(): void {
    this.providers.clear();
  }
}

// Export singleton instance
export const providerRegistry = KitchenProviderRegistry.getInstance();
