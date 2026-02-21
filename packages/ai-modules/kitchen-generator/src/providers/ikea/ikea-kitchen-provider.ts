/**
 * IKEA Kitchen Provider
 * Adapter for IKEA API to kitchen generator
 */

import {
  BaseKitchenProvider,
  KitchenProviderConfig,
  providerRegistry,
} from '../base-kitchen-provider';
import type {
  CatalogProduct,
  ProviderFetchOptions,
  ProviderProductRules,
  CabinetType,
  ProductDimensions,
} from '../../types';

// Import IKEA client from backend services
// In production, this would be imported from @kitchenxpert/backend
// For now, we'll define the interface inline

interface IkeaClientConfig {
  country: string;
  language: string;
}

interface IkeaSearchResult {
  itemCode: string;
  name: string;
  type: string;
  description?: string;
  price: number;
  currency: string;
  imageUrl?: string;
  url?: string;
  rating?: number;
  reviewCount?: number;
}

interface IkeaSearchResponse {
  results: IkeaSearchResult[];
  totalCount: number;
}

interface IkeaApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * IKEA-specific provider configuration
 */
export interface IkeaKitchenProviderConfig extends Omit<KitchenProviderConfig, 'id' | 'name' | 'type'> {
  /** IKEA country code (fr, de, us, etc.) */
  country: string;
  /** Language code */
  language?: string;
}

/**
 * METOD System Rules
 * Based on IKEA METOD kitchen system specifications
 */
export const METOD_RULES: ProviderProductRules = {
  // METOD standard widths in cm
  standardWidths: [20, 30, 40, 60, 80],

  // METOD heights by cabinet type
  standardHeights: {
    base: [80],           // Standard METOD base height
    wall: [40, 60, 80, 100],
    tall: [200, 220, 240],
    corner_base: [80],
    corner_wall: [40, 60, 80, 100],
    drawer: [80],
    sink_base: [80],
    oven_housing: [200, 220, 240],
    fridge_housing: [200, 220, 240],
    pantry: [200, 220, 240],
  },

  // METOD standard depths
  standardDepths: [37, 60],

  // METOD compatibility rules
  compatibility: [
    // Cabinet structure requirements
    {
      sourceType: 'base',
      targetType: 'leg',
      rule: 'requires',
      description: 'METOD base cabinets require legs',
    },
    {
      sourceType: 'base',
      targetType: 'front',
      rule: 'requires',
      description: 'Cabinets require fronts (doors/drawers)',
    },
    {
      sourceType: 'wall',
      targetType: 'suspension_rail',
      rule: 'requires',
      description: 'Wall cabinets require METOD suspension rail',
    },
    // Appliance requirements
    {
      sourceType: 'cooktop',
      targetType: 'range_hood',
      rule: 'requires',
      description: 'Cooktop requires ventilation hood above',
    },
    {
      sourceType: 'sink',
      targetType: 'sink_base',
      rule: 'requires',
      description: 'Sink requires HAVSEN/NORRSJON compatible base',
    },
    {
      sourceType: 'dishwasher',
      targetType: 'front_panel',
      rule: 'optional',
      description: 'Integrated dishwasher can have matching front panel',
    },
    // Interior fittings
    {
      sourceType: 'drawer',
      targetType: 'maximera',
      rule: 'optional',
      description: 'MAXIMERA drawers add soft-close and full extension',
    },
    {
      sourceType: 'base',
      targetType: 'utrusta',
      rule: 'optional',
      description: 'UTRUSTA interior fittings optimize storage',
    },
  ],
};

/**
 * Category mapping from IKEA to kitchen generator types
 */
const IKEA_CATEGORY_MAP: Record<string, CabinetType | string> = {
  'METOD base cabinet': 'base',
  'METOD wall cabinet': 'wall',
  'METOD high cabinet': 'tall',
  'METOD corner base': 'corner_base',
  'METOD corner wall': 'corner_wall',
  'meuble bas': 'base',
  'meuble haut': 'wall',
  'meuble colonne': 'tall',
  'tiroir': 'drawer',
  'sous-évier': 'sink_base',
};

/**
 * IKEA Kitchen Provider Implementation
 */
export class IkeaKitchenProvider extends BaseKitchenProvider {
  private ikeaCountry: string;
  private ikeaLanguage: string;

  constructor(config: IkeaKitchenProviderConfig) {
    super({
      ...config,
      id: `ikea-${config.country}`,
      name: `IKEA ${config.country.toUpperCase()}`,
      type: 'furniture',
    });

    this.ikeaCountry = config.country;
    this.ikeaLanguage = config.language || config.country;
  }

  // ============================================
  // IKEA API Integration
  // ============================================

  /**
   * Get IKEA API base URL
   */
  private getApiBaseUrl(): string {
    return this.config.api?.baseUrl || 'http://localhost:3001/api/v1/ikea';
  }

  /**
   * Make API request to IKEA endpoints
   */
  private async apiRequest<T>(endpoint: string, options?: RequestInit): Promise<IkeaApiResponse<T>> {
    const url = `${this.getApiBaseUrl()}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      return await response.json() as IkeaApiResponse<T>;
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'REQUEST_ERROR',
          message: error instanceof Error ? error.message : 'Request failed',
        },
      };
    }
  }

  // ============================================
  // Abstract method implementations
  // ============================================

  protected async fetchProducts(
    category: string,
    options?: ProviderFetchOptions
  ): Promise<CatalogProduct[]> {
    // Map category to IKEA endpoint
    const endpoint = this.getCategoryEndpoint(category);
    const limit = options?.limit || 100;

    const response = await this.apiRequest<IkeaSearchResponse>(
      `${endpoint}?country=${this.ikeaCountry}&language=${this.ikeaLanguage}&limit=${limit}`
    );

    if (!response.success || !response.data) {
      return [];
    }

    const products = response.data.results.map((item) =>
      this.transformIkeaProduct(item, category)
    );

    return this.applyFilters(products, options);
  }

  protected async fetchProduct(productId: string): Promise<CatalogProduct | null> {
    const response = await this.apiRequest<IkeaSearchResult>(
      `/products/${productId}?country=${this.ikeaCountry}&language=${this.ikeaLanguage}`
    );

    if (!response.success || !response.data) {
      return null;
    }

    return this.transformIkeaProduct(response.data, 'unknown');
  }

  protected async fetchSearch(
    query: string,
    options?: ProviderFetchOptions
  ): Promise<CatalogProduct[]> {
    const limit = options?.limit || 50;

    const response = await this.apiRequest<IkeaSearchResponse>(
      `/search?q=${encodeURIComponent(query)}&country=${this.ikeaCountry}&language=${this.ikeaLanguage}&limit=${limit}`
    );

    if (!response.success || !response.data) {
      return [];
    }

    const products = response.data.results.map((item) =>
      this.transformIkeaProduct(item, this.detectCategory(item))
    );

    return this.applyFilters(products, options);
  }

  protected async fetchCategories(): Promise<string[]> {
    // IKEA kitchen categories
    return [
      'cabinets',
      'fronts',
      'worktops',
      'sinks',
      'appliances',
      'fittings',
      'lighting',
      'handles',
    ];
  }

  protected async fetchStock(productIds: string[]): Promise<Map<string, boolean>> {
    const stockMap = new Map<string, boolean>();

    // Fetch stock for each product (could be optimized with batch endpoint)
    for (const productId of productIds) {
      const response = await this.apiRequest<{ availabilities: Array<{ availableStock: number }> }>(
        `/stock/${productId}?country=${this.ikeaCountry}&language=${this.ikeaLanguage}`
      );

      if (response.success && response.data) {
        const totalStock = response.data.availabilities.reduce(
          (sum, a) => sum + a.availableStock,
          0
        );
        stockMap.set(productId, totalStock > 0);
      } else {
        stockMap.set(productId, false);
      }
    }

    return stockMap;
  }

  // ============================================
  // IKEA-specific methods
  // ============================================

  /**
   * Get all kitchen products aggregated
   */
  async getAllKitchenProducts(limitPerCategory: number = 100): Promise<CatalogProduct[]> {
    const response = await this.apiRequest<{
      results: IkeaSearchResult[];
      totalCount: number;
      categories: Record<string, number>;
    }>(`/kitchen/all?country=${this.ikeaCountry}&language=${this.ikeaLanguage}&limitPerCategory=${limitPerCategory}`);

    if (!response.success || !response.data) {
      return [];
    }

    return response.data.results.map((item) =>
      this.transformIkeaProduct(item, this.detectCategory(item))
    );
  }

  /**
   * Get METOD system rules
   */
  override async getProductRules(): Promise<ProviderProductRules> {
    return METOD_RULES;
  }

  /**
   * Get products compatible with METOD system
   */
  async getMetodCompatibleProducts(
    cabinetWidth: number,
    cabinetType: CabinetType
  ): Promise<CatalogProduct[]> {
    // Search for fronts that match the cabinet dimensions
    const query = cabinetType === 'wall' ? 'porte METOD' : 'façade METOD';
    const products = await this.searchProducts(query, { limit: 100 });

    // Filter by matching width
    return products.filter((p) => {
      const tolerance = 2; // 2cm tolerance
      return Math.abs(p.dimensions.width - cabinetWidth) <= tolerance;
    });
  }

  // ============================================
  // Transform helpers
  // ============================================

  /**
   * Transform IKEA API response to CatalogProduct
   */
  private transformIkeaProduct(item: IkeaSearchResult, category: string): CatalogProduct {
    return {
      id: item.itemCode,
      providerId: this.id,
      providerProductId: item.itemCode,
      name: item.name,
      type: this.mapToProductType(category, item.name),
      category: category,
      subcategory: item.type,
      dimensions: this.parseDimensions(item.name, item.description),
      price: item.price,
      currency: item.currency || 'EUR',
      imageUrl: item.imageUrl,
      specifications: {
        rating: item.rating,
        reviewCount: item.reviewCount,
        url: item.url,
      },
      inStock: true, // Assume in stock, check separately if needed
    };
  }

  /**
   * Parse dimensions from product name/description
   * IKEA often includes dimensions in the name like "60x60 cm"
   */
  private parseDimensions(name: string, description?: string): ProductDimensions {
    const text = `${name} ${description || ''}`;

    // Try to match patterns like "60x40 cm", "80 cm", "W60xD60 cm"
    const patterns = [
      /(\d+)\s*x\s*(\d+)\s*x\s*(\d+)\s*cm/i, // WxDxH
      /(\d+)\s*x\s*(\d+)\s*cm/i,              // WxD or WxH
      /largeur[:\s]*(\d+)\s*cm/i,             // largeur: XX cm
      /(\d+)\s*cm/i,                          // XX cm (width only)
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        if (match.length === 4) {
          // WxDxH
          return {
            width: parseInt(match[1] || '60', 10),
            depth: parseInt(match[2] || '60', 10),
            height: parseInt(match[3] || '80', 10),
            unit: 'cm',
          };
        } else if (match.length === 3) {
          // WxD (assume standard height)
          return {
            width: parseInt(match[1] || '60', 10),
            depth: parseInt(match[2] || '60', 10),
            height: 80, // Default METOD height
            unit: 'cm',
          };
        } else if (match.length === 2) {
          // Width only
          return {
            width: parseInt(match[1] || '60', 10),
            depth: 60, // Default METOD depth
            height: 80,
            unit: 'cm',
          };
        }
      }
    }

    // Default dimensions if parsing fails
    return {
      width: 60,
      depth: 60,
      height: 80,
      unit: 'cm',
    };
  }

  /**
   * Map to product type based on category and name
   */
  private mapToProductType(category: string, name: string): string {
    const nameLower = name.toLowerCase();

    // Check IKEA category map
    for (const [key, value] of Object.entries(IKEA_CATEGORY_MAP)) {
      if (nameLower.includes(key.toLowerCase())) {
        return value;
      }
    }

    // Infer from category
    switch (category) {
      case 'cabinets':
        if (nameLower.includes('haut') || nameLower.includes('wall')) return 'wall';
        if (nameLower.includes('colonne') || nameLower.includes('high')) return 'tall';
        return 'base';
      case 'worktops':
        return 'worktop';
      case 'fronts':
        return 'front';
      case 'handles':
        return 'handle';
      case 'fittings':
        return 'fitting';
      default:
        return category;
    }
  }

  /**
   * Detect category from product info
   */
  private detectCategory(item: IkeaSearchResult): string {
    const name = item.name.toLowerCase();
    const desc = (item.description || '').toLowerCase();
    const text = `${name} ${desc}`;

    if (text.includes('meuble') || text.includes('cabinet') || text.includes('metod')) {
      return 'cabinets';
    }
    if (text.includes('plan de travail') || text.includes('worktop') || text.includes('countertop')) {
      return 'worktops';
    }
    if (text.includes('façade') || text.includes('porte') || text.includes('front') || text.includes('door')) {
      return 'fronts';
    }
    if (text.includes('évier') || text.includes('sink')) {
      return 'sinks';
    }
    if (text.includes('four') || text.includes('oven') || text.includes('plaque') || text.includes('hotte')) {
      return 'appliances';
    }
    if (text.includes('poignée') || text.includes('handle')) {
      return 'handles';
    }
    if (text.includes('éclairage') || text.includes('light')) {
      return 'lighting';
    }

    return 'other';
  }

  /**
   * Get category-specific endpoint
   */
  private getCategoryEndpoint(category: string): string {
    switch (category) {
      case 'cabinets':
        return '/kitchen/cabinets';
      case 'worktops':
        return '/kitchen/countertops';
      case 'appliances':
        return '/kitchen/appliances';
      case 'metod':
        return '/kitchen/metod';
      default:
        return `/kitchen/category/${category}`;
    }
  }
}

/**
 * Factory function to create IKEA provider
 */
export function createIkeaKitchenProvider(config: IkeaKitchenProviderConfig): IkeaKitchenProvider {
  const provider = new IkeaKitchenProvider(config);
  providerRegistry.register(provider);
  return provider;
}

// Register default French IKEA provider
export const defaultIkeaProvider = createIkeaKitchenProvider({
  country: 'fr',
  language: 'fr',
  cache: {
    enabled: true,
    ttlMs: 300000, // 5 minutes
  },
});
