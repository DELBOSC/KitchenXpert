import { BaseApiClient } from '../../common/base-api-client';
import { ProviderProduct, FetchOptions } from '../../common/base-provider';

/**
 * Client API Leroy Merlin
 *
 * Fetches kitchen products from Leroy Merlin's product catalog.
 * Uses the structured product API endpoints available on leroymerlin.fr.
 *
 * Catalog paths: /produits/cuisine/
 * Segment: entry_mid | Has prices online: true
 */
export class LeroyMerlinApiClient extends BaseApiClient {
  /**
   * Fetch kitchen products from Leroy Merlin catalog
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

    // Default to kitchen category filter
    if (!options?.category) {
      params.append('category', 'cuisine');
    }

    const url = `${this.config.apiEndpoint}/products?${params.toString()}`;
    const response = await this.request<{ products: ProviderProduct[] }>(url);

    return response.products.map(product => ({
      ...product,
      providerId: 'leroy-merlin-fr',
    }));
  }

  /**
   * Fetch a specific product by ID
   */
  async fetchProductById(id: string): Promise<ProviderProduct> {
    const url = `${this.config.apiEndpoint}/products/${id}`;
    const product = await this.request<ProviderProduct>(url);
    return { ...product, providerId: 'leroy-merlin-fr' };
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

    return response.products.map(product => ({
      ...product,
      providerId: 'leroy-merlin-fr',
    }));
  }

  /**
   * Test connection to the Leroy Merlin API
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
   * Fetch product categories available in the kitchen section
   */
  async fetchCategories(): Promise<Array<{ id: string; name: string; count: number }>> {
    const url = `${this.config.apiEndpoint}/categories?parent=cuisine`;
    return this.request<Array<{ id: string; name: string; count: number }>>(url);
  }
}
