import { BaseApiClient } from '../../common/base-api-client';
import { ProviderProduct, FetchOptions } from '../../common/base-provider';

/**
 * Client API Castorama
 *
 * Fetches kitchen products from Castorama's product catalog.
 * Covers: kitchen furniture (GoodHome range), worktops, appliances.
 *
 * Catalog paths: /cuisine/
 * Segment: entry_mid | Has prices online: true
 */
export class CastoramaApiClient extends BaseApiClient {
  /**
   * Fetch kitchen products from Castorama catalog
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

    if (!options?.category) {
      params.append('category', 'cuisine');
    }

    const url = `${this.config.apiEndpoint}/products?${params.toString()}`;
    const response = await this.request<{ products: ProviderProduct[] }>(url);

    return response.products.map((product) => ({
      ...product,
      providerId: 'castorama-fr',
    }));
  }

  /**
   * Fetch a specific product by ID
   */
  async fetchProductById(id: string): Promise<ProviderProduct> {
    const url = `${this.config.apiEndpoint}/products/${id}`;
    const product = await this.request<ProviderProduct>(url);
    return { ...product, providerId: 'castorama-fr' };
  }

  /**
   * Search products by keyword
   */
  async searchProducts(query: string, options?: FetchOptions): Promise<ProviderProduct[]> {
    const params = new URLSearchParams();
    params.append('q', query);
    if (options?.limit) params.append('limit', String(options.limit));
    if (options?.offset) params.append('offset', String(options.offset));

    const url = `${this.config.apiEndpoint}/products/search?${params.toString()}`;
    const response = await this.request<{ products: ProviderProduct[] }>(url);

    return response.products.map((product) => ({
      ...product,
      providerId: 'castorama-fr',
    }));
  }

  /**
   * Test connection to the Castorama API
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

  /**
   * Fetch GoodHome range products specifically
   */
  async fetchGoodHomeProducts(options?: FetchOptions): Promise<ProviderProduct[]> {
    return this.fetchProducts({ ...options, filters: { ...options?.filters, brand: 'GoodHome' } });
  }
}
