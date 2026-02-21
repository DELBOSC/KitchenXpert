/**
 * Interfaces pour les fournisseurs de catalogue externes
 */

import { ID } from '../types/base.types';
import { CatalogItem } from '../types/catalog.types';

/**
 * Interface pour un fournisseur de catalogue externe
 */
export interface ICatalogProvider {
  readonly id: string;
  readonly name: string;
  readonly supportedOperations: ProviderOperation[];

  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  fetchProducts(options?: FetchOptions): Promise<ProviderProduct[]>;
  fetchProduct(externalId: string): Promise<ProviderProduct | null>;
  fetchCategories(): Promise<ProviderCategory[]>;
  fetchInventory(productIds?: string[]): Promise<ProviderInventory[]>;
}

export type ProviderOperation = 'fetch_products' | 'fetch_inventory' | 'fetch_categories' | 'search' | 'webhook';

export interface FetchOptions {
  page?: number;
  limit?: number;
  since?: Date;
  categoryId?: string;
  modifiedSince?: Date;
}

export interface ProviderProduct {
  externalId: string;
  sku: string;
  name: string;
  description?: string;
  category: string;
  brand?: string;
  price: number;
  currency: string;
  images: string[];
  specifications?: Record<string, unknown>;
  inventory?: ProviderInventory;
  rawData?: Record<string, unknown>;
}

export interface ProviderCategory {
  externalId: string;
  name: string;
  parentId?: string;
  path?: string;
}

export interface ProviderInventory {
  externalId: string;
  quantity: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  leadTime?: number;
  lastUpdated: Date;
}

/**
 * Interface pour la transformation des données fournisseur
 */
export interface IProviderMapper {
  mapProduct(providerProduct: ProviderProduct, providerId: ID): CatalogItem;
  mapProducts(providerProducts: ProviderProduct[], providerId: ID): CatalogItem[];
  reverseMapProduct?(catalogItem: CatalogItem): Partial<ProviderProduct>;
}

/**
 * Interface pour la configuration complète d'un fournisseur externe
 * (distinct de ProviderConfig dans types qui est une config API simplifiée)
 */
export interface ExternalProviderConfig {
  id: string;
  name: string;
  type: 'api' | 'feed' | 'scraper';
  endpoint?: string;
  credentials?: ProviderCredentials;
  options?: ProviderOptions;
}

export interface ProviderCredentials {
  apiKey?: string;
  apiSecret?: string;
  username?: string;
  password?: string;
  token?: string;
}

export interface ProviderOptions {
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  rateLimit?: {
    requests: number;
    period: number;
  };
  webhookSecret?: string;
}

/**
 * Interface pour le gestionnaire de fournisseurs
 */
export interface IProviderManager {
  registerProvider(config: ExternalProviderConfig): void;
  getProvider(id: string): ICatalogProvider | null;
  getAllProviders(): ICatalogProvider[];
  syncProvider(id: string): Promise<SyncResult>;
  syncAllProviders(): Promise<SyncResult[]>;
}

export interface SyncResult {
  providerId: string;
  success: boolean;
  itemsProcessed: number;
  itemsAdded: number;
  itemsUpdated: number;
  itemsRemoved: number;
  errors: SyncError[];
  duration: number;
  completedAt: Date;
}

export interface SyncError {
  externalId?: string;
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}
