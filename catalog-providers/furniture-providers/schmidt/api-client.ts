import { BaseApiClient } from '../../common/base-api-client';
import { ProviderProduct, FetchOptions } from '../../common/base-provider';

/**
 * Client API Schmidt
 *
 * Fetches kitchen products from Schmidt's catalog.
 * Schmidt is a premium French kitchen manufacturer with ranges like Arcos and Loft.
 *
 * Website: https://www.home-design.schmidt
 * Catalog paths: /fr-fr/cuisines, /fr-fr/rangements
 * Segment: mid_premium | Has prices online: false (devis only)
 */
export class SchmidtApiClient extends BaseApiClient {
  /**
   * Fetch kitchen products from Schmidt catalog
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

    // Filter by kitchen range if specified
    if (options?.filters?.range) {
      params.append('range', String(options.filters.range));
    }

    const url = `${this.config.apiEndpoint}/products?${params.toString()}`;
    const response = await this.request<{ products: ProviderProduct[] }>(url);

    return response.products.map((product) => ({
      ...product,
      providerId: 'schmidt-fr',
    }));
  }

  /**
   * Fetch a specific product by ID
   */
  async fetchProductById(id: string): Promise<ProviderProduct> {
    const url = `${this.config.apiEndpoint}/products/${id}`;
    const product = await this.request<ProviderProduct>(url);
    return { ...product, providerId: 'schmidt-fr' };
  }

  /**
   * Fetch products from a specific range (Arcos, Loft, etc.)
   */
  async fetchByRange(range: string, options?: FetchOptions): Promise<ProviderProduct[]> {
    return this.fetchProducts({ ...options, filters: { ...options?.filters, range } });
  }

  /**
   * Fetch available kitchen ranges
   */
  async fetchRanges(): Promise<Array<{ id: string; name: string; description: string }>> {
    const url = `${this.config.apiEndpoint}/ranges`;
    return this.request<Array<{ id: string; name: string; description: string }>>(url);
  }

  /**
   * Test connection to the Schmidt API
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
