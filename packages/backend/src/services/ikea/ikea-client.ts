/**
 * IKEA API Client
 * Main client for interacting with IKEA APIs
 */

import type {
  IkeaConfig,
  IkeaAuthToken,
  IkeaAuthResponse,
  IkeaProduct,
  SearchParams,
  SearchResponse,
  SearchResult,
  StockResponse,
  StockInfo,
  ApiResponse,
} from './types';

import {
  IKEA_CLIENT_IDS,
  IKEA_AUTH_SECRET,
  IKEA_ENDPOINTS,
} from './types';

import {
  getDefaultHeaders,
  buildUrl,
  formatItemCode,
  parsePrice,
  extractImageUrl,
  buildProductUrl,
  chunk,
  getCurrencyForCountry,
} from './utils';

/**
 * IKEA API Client
 */
export class IkeaClient {
  private config: Required<IkeaConfig>;
  private authToken: IkeaAuthToken | null = null;
  private tokenExpiry: number = 0;

  constructor(config: IkeaConfig) {
    this.config = {
      country: config.country,
      language: config.language,
      baseUrl: config.baseUrl || 'https://www.ikea.com',
      userAgent: config.userAgent || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15',
    };
  }

  // ============================================
  // Authentication
  // ============================================

  /**
   * Get a guest authentication token
   */
  async getGuestToken(): Promise<IkeaAuthToken> {
    // Return cached token if still valid
    if (this.authToken && Date.now() < this.tokenExpiry - 60000) {
      return this.authToken;
    }

    const response = await fetch(IKEA_ENDPOINTS.auth, {
      method: 'POST',
      headers: {
        ...getDefaultHeaders(this.config.language),
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Client-Id': IKEA_CLIENT_IDS.auth,
        'X-Client-Secret': IKEA_AUTH_SECRET,
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        retailUnit: this.config.country.toUpperCase(),
      }).toString(),
    });

    if (!response.ok) {
      throw new Error(`Auth failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as IkeaAuthResponse;

    this.authToken = {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
    };

    // Set expiry time (token usually valid for 30 days)
    this.tokenExpiry = Date.now() + (data.expires_in * 1000);

    return this.authToken;
  }

  /**
   * Get authorization header (for future authenticated requests)
   */
  async getAuthHeader(): Promise<string> {
    const token = await this.getGuestToken();
    return `${token.tokenType} ${token.accessToken}`;
  }

  // ============================================
  // Search
  // ============================================

  /**
   * Search for IKEA products
   */
  async search(params: SearchParams): Promise<ApiResponse<SearchResponse>> {
    try {
      const url = buildUrl(
        IKEA_ENDPOINTS.search(this.config.country, this.config.language),
        {
          q: params.query,
          size: params.limit || 24,
          types: params.types || ['PRODUCT'],
          autocorrect: params.autocorrect !== false,
          c: 'sr', // search results
          v: 20210322,
        }
      );

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          ...getDefaultHeaders(this.config.language),
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: 'SEARCH_ERROR',
            message: `Search failed: ${response.status}`,
          },
        };
      }

      const data = await response.json();
      const results = this.parseSearchResults(data);

      return {
        success: true,
        data: results,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SEARCH_ERROR',
          message: error instanceof Error ? error.message : 'Search failed',
        },
      };
    }
  }

  /**
   * Parse search results from API response
   */
  private parseSearchResults(data: unknown): SearchResponse {
    const results: SearchResult[] = [];
    let totalCount = 0;

    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;

      // Extract products from response
      const searchResultPage = obj.searchResultPage as Record<string, unknown> | undefined;
      if (searchResultPage) {
        const products = searchResultPage.products as Record<string, unknown> | undefined;
        if (products) {
          const productWindow = products.productWindow as unknown[] | undefined;
          totalCount = (products.productCount as number) || 0;

          if (Array.isArray(productWindow)) {
            for (const item of productWindow) {
              if (typeof item === 'object' && item !== null) {
                const product = item as Record<string, unknown>;
                const mainProduct = product.product as Record<string, unknown> | undefined;

                if (mainProduct) {
                  results.push({
                    itemCode: String(mainProduct.itemNo || ''),
                    name: String(mainProduct.name || ''),
                    type: String(mainProduct.itemType || 'ART'),
                    description: mainProduct.typeName as string | undefined,
                    price: parsePrice(mainProduct.price),
                    currency: getCurrencyForCountry(this.config.country),
                    imageUrl: extractImageUrl(mainProduct.mainImageUrl),
                    url: mainProduct.pipUrl as string | undefined,
                    rating: mainProduct.ratingValue as number | undefined,
                    reviewCount: mainProduct.ratingCount as number | undefined,
                  });
                }
              }
            }
          }
        }
      }
    }

    return {
      results,
      totalCount,
    };
  }

  // ============================================
  // Stock
  // ============================================

  /**
   * Get stock availability for an item
   */
  async getStock(itemCode: string): Promise<ApiResponse<StockResponse>> {
    try {
      const formatted = formatItemCode(itemCode);
      if (!formatted) {
        return {
          success: false,
          error: {
            code: 'INVALID_ITEM_CODE',
            message: 'Invalid item code format',
          },
        };
      }

      const url = buildUrl(
        IKEA_ENDPOINTS.stock(this.config.country),
        {
          itemNos: formatted.replace(/\./g, ''),
          expand: 'StoresList,Restocks,SalesLocations',
        }
      );

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          ...getDefaultHeaders(this.config.language),
          'X-Client-Id': IKEA_CLIENT_IDS.stock,
        },
      });

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: 'STOCK_ERROR',
            message: `Stock check failed: ${response.status}`,
          },
        };
      }

      const data = await response.json();
      const stockInfo = this.parseStockResponse(data, formatted);

      return {
        success: true,
        data: stockInfo,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'STOCK_ERROR',
          message: error instanceof Error ? error.message : 'Stock check failed',
        },
      };
    }
  }

  /**
   * Parse stock response
   */
  private parseStockResponse(data: unknown, itemCode: string): StockResponse {
    const availabilities: StockInfo[] = [];

    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;
      const dataArray = obj.data as unknown[] | undefined;

      if (Array.isArray(dataArray)) {
        for (const item of dataArray) {
          if (typeof item === 'object' && item !== null) {
            const storeData = item as Record<string, unknown>;
            const classUnitKey = storeData.classUnitKey as Record<string, unknown> | undefined;
            const availableStocks = storeData.availableStocks as unknown[] | undefined;

            if (classUnitKey && availableStocks && availableStocks.length > 0) {
              const stock = availableStocks[0] as Record<string, unknown>;

              availabilities.push({
                itemCode,
                storeId: String(classUnitKey.classUnitCode || ''),
                storeName: String(storeData.buCode || ''),
                availableStock: Number(stock.quantity || 0),
                inStockProbability: this.mapProbability(stock.probability as string),
                restockDate: stock.restockDateTime as string | undefined,
              });
            }
          }
        }
      }
    }

    return {
      itemCode,
      availabilities,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Map probability string to enum
   */
  private mapProbability(probability?: string): 'HIGH' | 'MEDIUM' | 'LOW' {
    switch (probability?.toUpperCase()) {
      case 'HIGH_IN_STOCK':
      case 'HIGH':
        return 'HIGH';
      case 'MEDIUM':
        return 'MEDIUM';
      default:
        return 'LOW';
    }
  }

  // ============================================
  // Items
  // ============================================

  /**
   * Get product details
   */
  async getProduct(itemCode: string): Promise<ApiResponse<IkeaProduct>> {
    try {
      const formatted = formatItemCode(itemCode);
      if (!formatted) {
        return {
          success: false,
          error: {
            code: 'INVALID_ITEM_CODE',
            message: 'Invalid item code format',
          },
        };
      }

      // Try PIP endpoint first (more detailed info)
      const pipResult = await this.getPipItem(formatted);
      if (pipResult.success && pipResult.data) {
        return pipResult;
      }

      // Fallback to Ingka Items endpoint
      const ingkaResult = await this.getIngkaItem(formatted);
      return ingkaResult;
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ITEM_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get item',
        },
      };
    }
  }

  /**
   * Get item from PIP (Product Information Page) endpoint
   */
  private async getPipItem(itemCode: string): Promise<ApiResponse<IkeaProduct>> {
    const codeNoDelim = itemCode.replace(/\./g, '');

    // Try as combination first (SPR), then as regular item (ART)
    for (const prefix of ['s', '']) {
      const url = `${this.config.baseUrl}/${this.config.country}/${this.config.language}/products/${codeNoDelim.slice(5)}/${prefix}${codeNoDelim}.json`;

      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: getDefaultHeaders(this.config.language),
        });

        if (response.ok) {
          const data = await response.json();
          return {
            success: true,
            data: this.parsePipItem(data, itemCode, prefix === 's'),
          };
        }
      } catch {
        // Try next prefix
      }
    }

    return {
      success: false,
      error: {
        code: 'ITEM_NOT_FOUND',
        message: 'Product not found',
      },
    };
  }

  /**
   * Parse PIP item response
   */
  private parsePipItem(data: unknown, itemCode: string, isCombination: boolean): IkeaProduct {
    const obj = data as Record<string, unknown>;

    return {
      itemCode,
      name: String(obj.name || ''),
      type: isCombination ? 'SPR' : 'ART',
      description: obj.typeName as string | undefined,
      imageUrl: extractImageUrl(obj.mainImageUrl),
      price: parsePrice(obj.price),
      currency: getCurrencyForCountry(this.config.country),
      url: buildProductUrl(
        this.config.baseUrl,
        this.config.country,
        this.config.language,
        itemCode,
        obj.name as string
      ),
      categoryName: obj.categoryName as string | undefined,
      categoryUrl: obj.categoryUrl as string | undefined,
      weight: Number(obj.weight || 0),
      isCombination,
    };
  }

  /**
   * Get item from Ingka Items endpoint
   */
  private async getIngkaItem(itemCode: string): Promise<ApiResponse<IkeaProduct>> {
    const url = buildUrl(
      IKEA_ENDPOINTS.ingkaItems(this.config.language),
      {
        itemNos: itemCode.replace(/\./g, ''),
      }
    );

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...getDefaultHeaders(this.config.language),
        'X-Client-Id': IKEA_CLIENT_IDS.ingkaItems,
      },
    });

    if (!response.ok) {
      return {
        success: false,
        error: {
          code: 'ITEM_NOT_FOUND',
          message: 'Product not found',
        },
      };
    }

    const data = await response.json();
    return {
      success: true,
      data: this.parseIngkaItem(data, itemCode),
    };
  }

  /**
   * Parse Ingka item response
   */
  private parseIngkaItem(data: unknown, itemCode: string): IkeaProduct {
    const obj = data as Record<string, unknown>;
    const dataArray = obj.data as unknown[] | undefined;
    const item = dataArray?.[0] as Record<string, unknown> | undefined;
    const localized = (item?.localisedCommunications as unknown[])?.[0] as Record<string, unknown> | undefined;

    return {
      itemCode,
      name: String(localized?.productName || ''),
      type: 'ART',
      imageUrl: extractImageUrl(localized?.media),
      price: 0, // Ingka endpoint doesn't include price
      currency: getCurrencyForCountry(this.config.country),
      url: buildProductUrl(
        this.config.baseUrl,
        this.config.country,
        this.config.language,
        itemCode
      ),
      weight: 0,
      isCombination: false,
    };
  }

  /**
   * Get multiple products
   */
  async getProducts(itemCodes: string[]): Promise<ApiResponse<IkeaProduct[]>> {
    const products: IkeaProduct[] = [];
    const errors: string[] = [];

    // Process in chunks to avoid rate limiting
    const chunks = chunk(itemCodes, 10);

    for (const codes of chunks) {
      const promises = codes.map(code => this.getProduct(code));
      const results = await Promise.all(promises);

      for (const result of results) {
        if (result.success && result.data) {
          products.push(result.data);
        } else if (result.error) {
          errors.push(result.error.message);
        }
      }
    }

    return {
      success: true,
      data: products,
      error: errors.length > 0 ? {
        code: 'PARTIAL_ERROR',
        message: `Some items failed: ${errors.join(', ')}`,
      } : undefined,
    };
  }

  // ============================================
  // Kitchen-Specific Methods
  // ============================================

  /**
   * Search for kitchen cabinets
   */
  async searchKitchenCabinets(query: string = '', limit: number = 50): Promise<ApiResponse<SearchResponse>> {
    return this.search({
      query: query || 'kitchen cabinet',
      limit,
      types: ['PRODUCT'],
    });
  }

  /**
   * Search for kitchen appliances
   */
  async searchAppliances(query: string = '', limit: number = 50): Promise<ApiResponse<SearchResponse>> {
    return this.search({
      query: query || 'kitchen appliance',
      limit,
      types: ['PRODUCT'],
    });
  }

  /**
   * Search for countertops
   */
  async searchCountertops(query: string = '', limit: number = 50): Promise<ApiResponse<SearchResponse>> {
    return this.search({
      query: query || 'countertop worktop',
      limit,
      types: ['PRODUCT'],
    });
  }

  /**
   * Get METOD kitchen system products
   */
  async getMetodProducts(limit: number = 100): Promise<ApiResponse<SearchResponse>> {
    return this.search({
      query: 'METOD kitchen',
      limit,
      types: ['PRODUCT'],
    });
  }

  /**
   * Get ALL kitchen furniture products from IKEA
   * Aggregates searches across all kitchen product ranges
   */
  async getAllKitchenProducts(limitPerCategory: number = 100): Promise<ApiResponse<{
    results: SearchResult[];
    totalCount: number;
    categories: Record<string, number>;
  }>> {
    // All IKEA kitchen product ranges and categories
    const kitchenSearchTerms = [
      // Kitchen systems
      'METOD',
      'KNOXHULT',
      'ENHET',
      // Cabinet types
      'meuble bas cuisine',
      'meuble haut cuisine',
      'meuble colonne cuisine',
      'armoire cuisine',
      // Fronts and doors
      'façade cuisine',
      'porte cuisine METOD',
      // Drawers
      'tiroir cuisine',
      'MAXIMERA',
      // Worktops
      'plan de travail cuisine',
      'EKBACKEN',
      'SÄLJAN',
      'KARLBY',
      // Sinks
      'évier cuisine',
      'HAVSEN',
      'NORRSJON',
      // Handles
      'poignée cuisine',
      // Interior fittings
      'aménagement intérieur cuisine',
      'UTRUSTA',
      'VARIERA',
      // Lighting
      'éclairage cuisine',
      'OMLOPP',
      'IRSTA',
      // Legs and plinths
      'pied meuble cuisine',
      'plinthe cuisine',
      // Appliances
      'électroménager cuisine IKEA',
      'four encastrable',
      'plaque cuisson',
      'hotte aspirante',
      'réfrigérateur',
      'lave-vaisselle',
    ];

    const allResults: SearchResult[] = [];
    const seenItemCodes = new Set<string>();
    const categories: Record<string, number> = {};
    let totalApiCount = 0;

    // Execute searches in parallel batches to avoid rate limiting
    const batchSize = 5;
    for (let i = 0; i < kitchenSearchTerms.length; i += batchSize) {
      const batch = kitchenSearchTerms.slice(i, i + batchSize);

      const promises = batch.map(term =>
        this.search({
          query: term,
          limit: limitPerCategory,
          types: ['PRODUCT'],
        })
      );

      const results = await Promise.all(promises);

      for (let j = 0; j < batch.length; j++) {
        const result = results[j];
        const term = batch[j];

        if (result && result.success && result.data) {
          totalApiCount += result.data.totalCount;
          let categoryCount = 0;

          for (const product of result.data.results) {
            // Deduplicate by item code
            if (!seenItemCodes.has(product.itemCode)) {
              seenItemCodes.add(product.itemCode);
              allResults.push(product);
              categoryCount++;
            }
          }

          if (term) {
            categories[term] = categoryCount;
          }
        }
      }

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < kitchenSearchTerms.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return {
      success: true,
      data: {
        results: allResults,
        totalCount: allResults.length,
        categories,
      },
    };
  }

  /**
   * Get kitchen products by specific category
   */
  async getKitchenProductsByCategory(
    category: 'cabinets' | 'fronts' | 'worktops' | 'sinks' | 'appliances' | 'fittings' | 'lighting',
    limit: number = 100
  ): Promise<ApiResponse<SearchResponse>> {
    const categoryTerms: Record<string, string[]> = {
      cabinets: ['METOD meuble', 'KNOXHULT', 'ENHET meuble', 'meuble bas cuisine', 'meuble haut cuisine'],
      fronts: ['façade cuisine', 'porte cuisine METOD', 'VOXTORP', 'ASKERSUND', 'BODARP'],
      worktops: ['plan de travail', 'EKBACKEN', 'SÄLJAN', 'KARLBY', 'PINNARP'],
      sinks: ['évier cuisine', 'HAVSEN', 'NORRSJON', 'HILLESJÖN', 'robinet cuisine'],
      appliances: ['four encastrable IKEA', 'plaque cuisson IKEA', 'hotte IKEA', 'réfrigérateur IKEA'],
      fittings: ['UTRUSTA', 'MAXIMERA', 'VARIERA', 'aménagement intérieur cuisine'],
      lighting: ['éclairage cuisine', 'OMLOPP', 'IRSTA', 'MITTLED'],
    };

    const terms = categoryTerms[category] || [];
    const allResults: SearchResult[] = [];
    const seenItemCodes = new Set<string>();

    const promises = terms.map(term =>
      this.search({
        query: term,
        limit: Math.ceil(limit / terms.length),
        types: ['PRODUCT'],
      })
    );

    const results = await Promise.all(promises);

    for (const result of results) {
      if (result.success && result.data) {
        for (const product of result.data.results) {
          if (!seenItemCodes.has(product.itemCode)) {
            seenItemCodes.add(product.itemCode);
            allResults.push(product);
          }
        }
      }
    }

    return {
      success: true,
      data: {
        results: allResults.slice(0, limit),
        totalCount: allResults.length,
      },
    };
  }
}

/**
 * Create IKEA client instance
 */
export function createIkeaClient(config: IkeaConfig): IkeaClient {
  return new IkeaClient(config);
}

export default IkeaClient;
