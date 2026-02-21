import { BaseApiClient } from '../../../common/base-api-client';
import { ProviderProduct, FetchOptions } from '../../../common/base-provider';

/**
 * Client API Bosch (BSH Group)
 *
 * Fetches kitchen appliance products from Bosch's product catalog.
 * Covers: ovens, cooktops, range hoods, dishwashers, refrigerators, microwaves.
 * Series: Serie 2, Serie 4, Serie 6, Serie 8.
 *
 * Segment: mid_premium appliances
 */
export class BoschApiClient extends BaseApiClient {
  private static readonly APPLIANCE_CATEGORIES = [
    'oven',
    'cooktop',
    'range_hood',
    'dishwasher',
    'refrigerator',
    'freezer',
    'fridge_freezer',
    'microwave',
    'washing_machine',
  ];

  /**
   * Fetch appliance products from Bosch catalog
   */
  async fetchProducts(options?: FetchOptions): Promise<ProviderProduct[]> {
    const params = new URLSearchParams();

    if (options?.category) {
      params.append('category', options.category);
    }
    if (options?.limit) {
      params.append('limit', String(options.limit));
    }
    if (options?.offset) {
      params.append('offset', String(options.offset));
    }

    // Filter by series if specified
    if (options?.filters?.series) {
      params.append('series', String(options.filters.series));
    }

    // Filter by appliance type
    if (options?.filters?.applianceType) {
      params.append('type', String(options.filters.applianceType));
    }

    const url = `${this.config.apiEndpoint}/products?${params.toString()}`;
    const response = await this.request<{ products: ProviderProduct[] }>(url);

    return response.products.map(product => ({
      ...product,
      providerId: 'bosch',
    }));
  }

  /**
   * Fetch a specific product by ID (article number)
   */
  async fetchProductById(id: string): Promise<ProviderProduct> {
    const url = `${this.config.apiEndpoint}/products/${id}`;
    const product = await this.request<ProviderProduct>(url);
    return { ...product, providerId: 'bosch' };
  }

  /**
   * Fetch products by series (Serie 2, Serie 4, Serie 6, Serie 8)
   */
  async fetchBySeries(series: string, options?: FetchOptions): Promise<ProviderProduct[]> {
    return this.fetchProducts({ ...options, filters: { ...options?.filters, series } });
  }

  /**
   * Fetch products by appliance type (oven, cooktop, etc.)
   */
  async fetchByType(applianceType: string, options?: FetchOptions): Promise<ProviderProduct[]> {
    return this.fetchProducts({ ...options, filters: { ...options?.filters, applianceType } });
  }

  /**
   * Fetch all built-in kitchen appliances (excludes freestanding)
   */
  async fetchBuiltInAppliances(options?: FetchOptions): Promise<ProviderProduct[]> {
    return this.fetchProducts({
      ...options,
      filters: { ...options?.filters, installation: 'built-in' },
    });
  }

  /**
   * Get energy ratings for a product
   */
  async fetchProductSpecs(id: string): Promise<Record<string, unknown>> {
    const url = `${this.config.apiEndpoint}/products/${id}/specifications`;
    return this.request<Record<string, unknown>>(url);
  }

  /**
   * Get supported appliance categories
   */
  getCategories(): string[] {
    return [...BoschApiClient.APPLIANCE_CATEGORIES];
  }

  /**
   * Test connection to the Bosch API
   */
  async testConnection(): Promise<boolean> {
    try {
      const url = `${this.config.apiEndpoint}/health`;
      await this.request<{ status: string }>(url);
      return true;
    } catch {
      return false;
    }
  }
}
