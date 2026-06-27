/**
 * Endpoints catalogue produits
 */

import { ApiClient } from '../client';

export interface CatalogItem {
  id: string;
  providerId: string;
  type: 'appliance' | 'furniture' | 'accessory';
  category: string;
  subcategory?: string;
  name: string;
  description?: string;
  brand: string;
  model: string;
  sku: string;
  price: number;
  currency: string;
  dimensions?: {
    width: number;
    depth: number;
    height: number;
    unit: string;
  };
  images: Array<{
    url: string;
    alt?: string;
    isPrimary: boolean;
  }>;
  specifications?: Record<string, unknown>;
  status: 'available' | 'out_of_stock' | 'discontinued';
  stock?: number;
}

export interface CatalogSearchParams {
  query?: string;
  type?: string;
  category?: string;
  brand?: string;
  providerId?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedCatalog {
  data: CatalogItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  facets?: CatalogFacets;
}

export interface CatalogFacets {
  categories: FacetItem[];
  brands: FacetItem[];
  priceRange: { min: number; max: number };
}

export interface FacetItem {
  value: string;
  label: string;
  count: number;
}

export interface CatalogCategory {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  parentId?: string;
  children?: CatalogCategory[];
  itemCount: number;
}

export interface CatalogProvider {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  website?: string;
  isActive: boolean;
}

export class CatalogEndpoints {
  constructor(private client: ApiClient) {}

  async search(params?: CatalogSearchParams): Promise<PaginatedCatalog> {
    const response = await this.client.get<PaginatedCatalog>('/catalog/search', {
      params: params as Record<string, unknown> | undefined,
    });
    return response.data;
  }

  async getItem(id: string): Promise<CatalogItem> {
    const response = await this.client.get<CatalogItem>(`/catalog/items/${id}`);
    return response.data;
  }

  async getItemBySku(sku: string): Promise<CatalogItem> {
    const response = await this.client.get<CatalogItem>(`/catalog/items/sku/${sku}`);
    return response.data;
  }

  async getCategories(): Promise<CatalogCategory[]> {
    const response = await this.client.get<CatalogCategory[]>('/catalog/categories');
    return response.data;
  }

  async getCategory(slug: string): Promise<CatalogCategory> {
    const response = await this.client.get<CatalogCategory>(`/catalog/categories/${slug}`);
    return response.data;
  }

  async getCategoryItems(
    categorySlug: string,
    params?: Omit<CatalogSearchParams, 'category'>
  ): Promise<PaginatedCatalog> {
    const response = await this.client.get<PaginatedCatalog>(
      `/catalog/categories/${categorySlug}/items`,
      { params: params as Record<string, unknown> | undefined }
    );
    return response.data;
  }

  async getBrands(): Promise<Array<{ name: string; slug: string; count: number }>> {
    const response =
      await this.client.get<Array<{ name: string; slug: string; count: number }>>(
        '/catalog/brands'
      );
    return response.data;
  }

  async getBrandItems(
    brandSlug: string,
    params?: Omit<CatalogSearchParams, 'brand'>
  ): Promise<PaginatedCatalog> {
    const response = await this.client.get<PaginatedCatalog>(`/catalog/brands/${brandSlug}/items`, {
      params: params as Record<string, unknown> | undefined,
    });
    return response.data;
  }

  async getProviders(): Promise<CatalogProvider[]> {
    const response = await this.client.get<CatalogProvider[]>('/catalog/providers');
    return response.data;
  }

  async getRelatedItems(itemId: string, limit = 5): Promise<CatalogItem[]> {
    const response = await this.client.get<CatalogItem[]>(`/catalog/items/${itemId}/related`, {
      params: { limit },
    });
    return response.data;
  }

  async getSimilarItems(itemId: string, limit = 5): Promise<CatalogItem[]> {
    const response = await this.client.get<CatalogItem[]>(`/catalog/items/${itemId}/similar`, {
      params: { limit },
    });
    return response.data;
  }

  async getFeaturedItems(limit = 10): Promise<CatalogItem[]> {
    const response = await this.client.get<CatalogItem[]>('/catalog/featured', {
      params: { limit },
    });
    return response.data;
  }

  async getNewArrivals(limit = 10): Promise<CatalogItem[]> {
    const response = await this.client.get<CatalogItem[]>('/catalog/new-arrivals', {
      params: { limit },
    });
    return response.data;
  }
}

export function createCatalogEndpoints(client: ApiClient): CatalogEndpoints {
  return new CatalogEndpoints(client);
}
