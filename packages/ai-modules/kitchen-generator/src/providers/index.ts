/**
 * Kitchen Product Providers
 *
 * This module provides a unified interface for accessing kitchen products
 * from multiple suppliers (IKEA, appliance manufacturers, etc.)
 *
 * Architecture:
 * - BaseKitchenProvider: Abstract base class for all providers
 * - KitchenProviderRegistry: Singleton registry for managing providers
 * - Individual providers: IKEA, Beko, Bosch, etc.
 *
 * Adding a new provider:
 * 1. Create a new directory under providers/
 * 2. Extend BaseKitchenProvider
 * 3. Implement abstract methods (fetchProducts, fetchProduct, etc.)
 * 4. Register in the provider registry
 * 5. Export from this index
 */

import {
  BaseKitchenProvider,
  KitchenProviderConfig,
  KitchenProviderRegistry,
  providerRegistry,
} from './base-kitchen-provider';

import type { CatalogProduct, KitchenProductProvider } from '../types';

// Re-export base classes and registry
export { BaseKitchenProvider, KitchenProviderConfig, KitchenProviderRegistry, providerRegistry };

// IKEA Provider (Furniture)
export * from './ikea';

// Smart Appliance Providers
export * from './home-connect';
export * from './miele';
export * from './electrolux';

// Smart Appliance Registry
export {
  SmartApplianceRegistry,
  smartApplianceRegistry,
  initializeSmartApplianceProviders,
  matchAppliancesToConfiguration,
} from './smart-appliance-registry';

// Future furniture providers:
// export * from './beko';
// export * from './schmidt';
// export * from './mobalpa';

/**
 * Initialize all default providers
 * Call this function at application startup
 */
export function initializeDefaultProviders(options?: {
  country?: string;
  language?: string;
  enabledProviders?: string[];
}): void {
  const country = options?.country || 'fr';
  const language = options?.language || country;

  // IKEA is always enabled by default
  if (!options?.enabledProviders || options.enabledProviders.includes('ikea')) {
    // IKEA provider is auto-registered on import
    // Additional configuration can be done here
  }

  // Future: Initialize other providers based on configuration
  // if (options?.enabledProviders?.includes('beko')) {
  //   createBekoProvider({ country, language });
  // }
}

/**
 * Get products from all registered providers
 */
export async function getProductsFromAllProviders(
  category: string,
  options?: {
    limit?: number;
    providers?: string[];
    country?: string;
  }
): Promise<Array<{ providerId: string; products: CatalogProduct[] }>> {
  const results: Array<{ providerId: string; products: CatalogProduct[] }> = [];
  const providers: KitchenProductProvider[] = options?.providers
    ? options.providers
        .map((id) => providerRegistry.get(id))
        .filter((p): p is KitchenProductProvider => p !== undefined)
    : providerRegistry.getAll();

  const fetchPromises = providers.map(async (provider) => {
    try {
      const products = await provider.getProducts(category, { limit: options?.limit });
      return { providerId: provider.id, products };
    } catch (error) {
      console.error(`Error fetching from provider ${provider.id}:`, error);
      return { providerId: provider.id, products: [] as CatalogProduct[] };
    }
  });

  const responses = await Promise.all(fetchPromises);

  for (const response of responses) {
    if (response) {
      results.push(response);
    }
  }

  return results;
}

/**
 * Search products across all providers
 */
export async function searchAllProviders(
  query: string,
  options?: {
    limit?: number;
    providers?: string[];
  }
): Promise<CatalogProduct[]> {
  const providers: KitchenProductProvider[] = options?.providers
    ? options.providers
        .map((id) => providerRegistry.get(id))
        .filter((p): p is KitchenProductProvider => p !== undefined)
    : providerRegistry.getAll();

  const searchPromises = providers.map(async (provider) => {
    try {
      return await provider.searchProducts(query, { limit: options?.limit });
    } catch (error) {
      console.error(`Error searching provider ${provider.id}:`, error);
      return [] as CatalogProduct[];
    }
  });

  const results = await Promise.all(searchPromises);

  // Flatten and deduplicate by product ID
  const allProducts = results.flat();
  const seen = new Set<string>();
  const unique: CatalogProduct[] = [];

  for (const product of allProducts) {
    const key = `${product.providerId}:${product.providerProductId}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(product);
    }
  }

  return unique;
}
