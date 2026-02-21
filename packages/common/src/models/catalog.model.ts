/**
 * Catalog Model Classes
 * Provides methods for working with catalog providers and items
 */

import {
  CatalogProvider,
  CatalogItem,
  CatalogItemType,
  CatalogItemStatus,
  CatalogItemDimensions,
  CatalogItemImage,
  ProviderConfig,
  CatalogSearchParams,
  ID,
  Metadata,
} from '../types';

export interface CatalogProviderCreateInput {
  name: string;
  slug: string;
  country: string;
  website: string;
  apiEndpoint?: string | null;
  apiKey?: string | null;
  supportedCategories: string[];
}

export interface CatalogItemCreateInput {
  providerId: ID;
  providerItemId: string;
  type: CatalogItemType;
  category: string;
  subcategory?: string | null;
  name: string;
  description?: string | null;
  brand: string;
  model: string;
  sku: string;
  price: number;
  currency: string;
  dimensions?: CatalogItemDimensions | null;
  specifications?: Record<string, unknown>;
  images: CatalogItemImage[];
  colors?: string[];
  materials?: string[];
  status?: CatalogItemStatus;
  stock?: number | null;
  url?: string | null;
  energyRating?: string | null;
  warranty?: string | null;
  tags?: string[];
}

export class CatalogProviderModel implements CatalogProvider {
  id: ID;
  name: string;
  slug: string;
  country: string;
  website: string;
  apiEndpoint?: string | null;
  apiKey?: string | null;
  isActive: boolean;
  supportedCategories: string[];
  metadata?: Metadata;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string | null;

  constructor(data: CatalogProvider) {
    this.id = data.id;
    this.name = data.name;
    this.slug = data.slug;
    this.country = data.country;
    this.website = data.website;
    this.apiEndpoint = data.apiEndpoint;
    this.apiKey = data.apiKey;
    this.isActive = data.isActive;
    this.supportedCategories = data.supportedCategories;
    this.metadata = data.metadata;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.deletedAt = data.deletedAt;
  }

  /**
   * Check if the provider is active
   */
  isProviderActive(): boolean {
    return this.isActive;
  }

  /**
   * Check if the provider has API access configured
   */
  hasApiAccess(): boolean {
    return !!(this.apiEndpoint && this.apiKey);
  }

  /**
   * Check if the provider supports a specific category
   */
  supportsCategory(category: string): boolean {
    return this.supportedCategories.includes(category);
  }

  /**
   * Get the provider configuration for API calls
   */
  getApiConfig(): ProviderConfig | null {
    if (!this.apiEndpoint || !this.apiKey) {
      return null;
    }
    return {
      apiEndpoint: this.apiEndpoint,
      apiKey: this.apiKey,
      timeout: 30000,
      retryAttempts: 3,
      rateLimit: {
        maxRequests: 100,
        windowMs: 60000,
      },
    };
  }

  /**
   * Convert to plain object
   */
  toJSON(): CatalogProvider {
    return {
      id: this.id,
      name: this.name,
      slug: this.slug,
      country: this.country,
      website: this.website,
      apiEndpoint: this.apiEndpoint,
      apiKey: this.apiKey,
      isActive: this.isActive,
      supportedCategories: this.supportedCategories,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt,
    };
  }

  /**
   * Create a new CatalogProviderModel from input data
   */
  static create(input: CatalogProviderCreateInput, id: ID): CatalogProviderModel {
    const now = new Date();
    return new CatalogProviderModel({
      id,
      name: input.name,
      slug: input.slug,
      country: input.country,
      website: input.website,
      apiEndpoint: input.apiEndpoint,
      apiKey: input.apiKey,
      isActive: true,
      supportedCategories: input.supportedCategories,
      createdAt: now,
      updatedAt: now,
    });
  }
}

export class CatalogItemModel implements CatalogItem {
  id: ID;
  providerId: ID;
  providerItemId: string;
  type: CatalogItemType;
  category: string;
  subcategory?: string | null;
  name: string;
  description?: string | null;
  brand: string;
  model: string;
  sku: string;
  price: number;
  currency: string;
  dimensions?: CatalogItemDimensions | null;
  specifications?: Record<string, unknown>;
  images: CatalogItemImage[];
  colors?: string[];
  materials?: string[];
  status: CatalogItemStatus;
  stock?: number | null;
  url?: string | null;
  energyRating?: string | null;
  warranty?: string | null;
  tags?: string[];
  metadata?: Metadata;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string | null;

  constructor(data: CatalogItem) {
    this.id = data.id;
    this.providerId = data.providerId;
    this.providerItemId = data.providerItemId;
    this.type = data.type;
    this.category = data.category;
    this.subcategory = data.subcategory;
    this.name = data.name;
    this.description = data.description;
    this.brand = data.brand;
    this.model = data.model;
    this.sku = data.sku;
    this.price = data.price;
    this.currency = data.currency;
    this.dimensions = data.dimensions;
    this.specifications = data.specifications;
    this.images = data.images || [];
    this.colors = data.colors;
    this.materials = data.materials;
    this.status = data.status;
    this.stock = data.stock;
    this.url = data.url;
    this.energyRating = data.energyRating;
    this.warranty = data.warranty;
    this.tags = data.tags;
    this.metadata = data.metadata;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.deletedAt = data.deletedAt;
  }

  /**
   * Check if the item is available
   */
  isAvailable(): boolean {
    return this.status === 'available';
  }

  /**
   * Check if the item is out of stock
   */
  isOutOfStock(): boolean {
    return this.status === 'out_of_stock';
  }

  /**
   * Check if the item is discontinued
   */
  isDiscontinued(): boolean {
    return this.status === 'discontinued';
  }

  /**
   * Check if the item is an appliance
   */
  isAppliance(): boolean {
    return this.type === 'appliance';
  }

  /**
   * Check if the item is furniture
   */
  isFurniture(): boolean {
    return this.type === 'furniture';
  }

  /**
   * Check if the item is an accessory
   */
  isAccessory(): boolean {
    return this.type === 'accessory';
  }

  /**
   * Get the primary image
   */
  getPrimaryImage(): CatalogItemImage | null {
    return this.images.find((img) => img.isPrimary) || this.images[0] || null;
  }

  /**
   * Get formatted price
   */
  getFormattedPrice(locale: string = 'en-US'): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: this.currency,
    }).format(this.price);
  }

  /**
   * Check if the item matches search params
   */
  matchesSearchParams(params: CatalogSearchParams): boolean {
    if (params.type && this.type !== params.type) return false;
    if (params.category && this.category !== params.category) return false;
    if (params.providerId && this.providerId !== params.providerId) return false;
    if (params.brand && this.brand !== params.brand) return false;
    if (params.status && this.status !== params.status) return false;
    if (params.minPrice !== undefined && this.price < params.minPrice) return false;
    if (params.maxPrice !== undefined && this.price > params.maxPrice) return false;
    if (params.query) {
      const query = params.query.toLowerCase();
      const searchable = `${this.name} ${this.brand} ${this.model} ${this.description || ''}`.toLowerCase();
      if (!searchable.includes(query)) return false;
    }
    return true;
  }

  /**
   * Get display name with brand
   */
  getDisplayName(): string {
    return `${this.brand} ${this.name}`;
  }

  /**
   * Convert to plain object
   */
  toJSON(): CatalogItem {
    return {
      id: this.id,
      providerId: this.providerId,
      providerItemId: this.providerItemId,
      type: this.type,
      category: this.category,
      subcategory: this.subcategory,
      name: this.name,
      description: this.description,
      brand: this.brand,
      model: this.model,
      sku: this.sku,
      price: this.price,
      currency: this.currency,
      dimensions: this.dimensions,
      specifications: this.specifications,
      images: this.images,
      colors: this.colors,
      materials: this.materials,
      status: this.status,
      stock: this.stock,
      url: this.url,
      energyRating: this.energyRating,
      warranty: this.warranty,
      tags: this.tags,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt,
    };
  }

  /**
   * Create a new CatalogItemModel from input data
   */
  static create(input: CatalogItemCreateInput, id: ID): CatalogItemModel {
    const now = new Date();
    return new CatalogItemModel({
      id,
      providerId: input.providerId,
      providerItemId: input.providerItemId,
      type: input.type,
      category: input.category,
      subcategory: input.subcategory,
      name: input.name,
      description: input.description,
      brand: input.brand,
      model: input.model,
      sku: input.sku,
      price: input.price,
      currency: input.currency,
      dimensions: input.dimensions,
      specifications: input.specifications,
      images: input.images,
      colors: input.colors,
      materials: input.materials,
      status: input.status || 'available',
      stock: input.stock,
      url: input.url,
      energyRating: input.energyRating,
      warranty: input.warranty,
      tags: input.tags,
      createdAt: now,
      updatedAt: now,
    });
  }
}

export default CatalogItemModel;
