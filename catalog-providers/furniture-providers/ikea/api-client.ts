import { BaseApiClient } from '../../common/base-api-client';
import { ProviderProduct, FetchOptions } from '../../common/base-provider';

/**
 * Client API IKEA
 * Exemple d'implémentation utilisant BaseApiClient
 */
export class IkeaApiClient extends BaseApiClient {
  /**
   * Récupère tous les produits
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

    const url = `${this.config.apiEndpoint}/products?${params.toString()}`;
    const response = await this.request<{ products: ProviderProduct[] }>(url);

    return response.products;
  }

  /**
   * Récupère un produit par ID
   */
  async fetchProductById(id: string): Promise<ProviderProduct> {
    const url = `${this.config.apiEndpoint}/products/${id}`;
    return this.request<ProviderProduct>(url);
  }

  /**
   * Teste la connexion à l'API
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
