import { BaseEntity, ID, Metadata } from './base.types';

export type CatalogItemType = 'appliance' | 'furniture' | 'accessory';
export type CatalogItemStatus = 'available' | 'out_of_stock' | 'discontinued';

export interface CatalogProvider extends BaseEntity {
  name: string;
  slug: string;
  country: string;
  website: string;
  apiEndpoint?: string | null;
  apiKey?: string | null;
  isActive: boolean;
  supportedCategories: string[];
  metadata?: Metadata;
}

export interface CatalogItem extends BaseEntity {
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
}

/**
 * Dimensions simplifiées pour les items du catalogue
 * (ProductDimensions dans product.types est plus détaillé pour les produits complets)
 */
export interface CatalogItemDimensions {
  width: number;
  depth: number;
  height: number;
  weight?: number;
  unit: 'mm' | 'cm' | 'm' | 'ft' | 'in';
  weightUnit?: 'kg' | 'g' | 'lb' | 'oz';
}

/**
 * Image simplifiée pour les items du catalogue
 * (ProductImage dans product.types est plus détaillé pour les produits complets)
 */
export interface CatalogItemImage {
  url: string;
  alt?: string;
  isPrimary: boolean;
  order: number;
  thumbnail?: string;
}

export interface CatalogSearchParams {
  query?: string;
  type?: CatalogItemType;
  category?: string;
  providerId?: ID;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  currency?: string;
  status?: CatalogItemStatus;
  tags?: string[];
}

export interface ProviderConfig {
  apiEndpoint: string;
  apiKey: string;
  timeout: number;
  retryAttempts: number;
  rateLimit: {
    maxRequests: number;
    windowMs: number;
  };
}

export interface ProviderSyncResult {
  providerId: ID;
  itemsAdded: number;
  itemsUpdated: number;
  itemsRemoved: number;
  errors: string[];
  syncedAt: Date;
}
