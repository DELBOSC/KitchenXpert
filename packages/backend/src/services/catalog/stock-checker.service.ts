/**
 * Stock Checker Service
 *
 * Checks product availability across suppliers and finds alternatives
 * for out-of-stock items. Uses mock data since real supplier APIs
 * are not yet connected — interfaces are ready for future integration.
 */

import logger from '../../utils/logger.js';
import { CacheService } from '../cache.service.js';

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export interface StockCheckItem {
  sku: string;
  brand: string;
  quantity: number;
}

export interface StockResult {
  sku: string;
  brand: string;
  available: boolean;
  quantity?: number;
  estimatedDelivery?: string; // "2-3 weeks", "In stock", "Backordered"
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'backordered' | 'discontinued';
  lastChecked: Date;
  storeAvailability?: Array<{
    storeName: string;
    storeId: string;
    inStock: boolean;
    quantity: number;
  }>;
}

export interface AlternativeSearchItem {
  sku: string;
  brand: string;
  type: string;
  dimensions: { width: number; height: number; depth: number };
}

export interface AlternativeProduct {
  sku: string;
  brand: string;
  name: string;
  matchScore: number; // 0-1 how similar
  priceDiff: number; // price difference vs original (EUR)
  inStock: boolean;
  reason: string; // "Same dimensions, similar style from different brand"
}

// ----------------------------------------------------------------
// Mock Data & Constants
// ----------------------------------------------------------------

/** Brand delivery time estimates */
const BRAND_DELIVERY: Record<string, { inStock: string; lowStock: string; backorder: string }> = {
  'IKEA': { inStock: 'In stock', lowStock: '1-2 weeks', backorder: '3-5 weeks' },
  'Schmidt': { inStock: 'In stock', lowStock: '2-3 weeks', backorder: '6-8 weeks' },
  'Mobalpa': { inStock: 'In stock', lowStock: '2-4 weeks', backorder: '8-10 weeks' },
  'Leroy Merlin': { inStock: 'In stock', lowStock: '1 week', backorder: '3-4 weeks' },
  'Castorama': { inStock: 'In stock', lowStock: '1 week', backorder: '3-4 weeks' },
  'Lapeyre': { inStock: 'In stock', lowStock: '2-3 weeks', backorder: '5-7 weeks' },
  'SieMatic': { inStock: 'In stock', lowStock: '3-4 weeks', backorder: '10-12 weeks' },
  'Kvik': { inStock: 'In stock', lowStock: '1-2 weeks', backorder: '4-6 weeks' },
};

/** Mock store locations */
const MOCK_STORES: Record<string, Array<{ storeName: string; storeId: string }>> = {
  'IKEA': [
    { storeName: 'IKEA Paris Nord', storeId: 'ikea-paris-nord' },
    { storeName: 'IKEA Velizy', storeId: 'ikea-velizy' },
    { storeName: 'IKEA Franconville', storeId: 'ikea-franconville' },
  ],
  'Leroy Merlin': [
    { storeName: 'Leroy Merlin Ivry', storeId: 'lm-ivry' },
    { storeName: 'Leroy Merlin Madeleine', storeId: 'lm-madeleine' },
  ],
  'Castorama': [
    { storeName: 'Castorama Paris 19e', storeId: 'casto-paris19' },
    { storeName: 'Castorama Gennevilliers', storeId: 'casto-gennevilliers' },
  ],
};

/** Mock alternative products database */
const ALTERNATIVE_DB: Record<string, AlternativeProduct[]> = {
  'cabinet': [
    { sku: 'ALT-CAB-001', brand: 'IKEA', name: 'METOD Base Cabinet 60cm', matchScore: 0.92, priceDiff: -30, inStock: true, reason: 'Same dimensions, IKEA equivalent with similar finish' },
    { sku: 'ALT-CAB-002', brand: 'Leroy Merlin', name: 'Delinia ID Base 60cm', matchScore: 0.85, priceDiff: -15, inStock: true, reason: 'Same dimensions, comparable quality from Leroy Merlin range' },
    { sku: 'ALT-CAB-003', brand: 'Castorama', name: 'GoodHome Caraway Base 60cm', matchScore: 0.78, priceDiff: -25, inStock: true, reason: 'Similar dimensions and style, budget-friendly alternative' },
  ],
  'countertop': [
    { sku: 'ALT-CT-001', brand: 'IKEA', name: 'EKBACKEN Laminate Countertop', matchScore: 0.80, priceDiff: -80, inStock: true, reason: 'Same width, laminate alternative at lower price point' },
    { sku: 'ALT-CT-002', brand: 'Leroy Merlin', name: 'Quartz Composite Worktop', matchScore: 0.88, priceDiff: 20, inStock: true, reason: 'Same dimensions, quartz composite with similar appearance' },
  ],
  'appliance': [
    { sku: 'ALT-APP-001', brand: 'Bosch', name: 'Serie 4 Built-in Oven', matchScore: 0.90, priceDiff: 50, inStock: true, reason: 'Same installation dimensions, equivalent energy rating' },
    { sku: 'ALT-APP-002', brand: 'Whirlpool', name: 'W Collection Built-in Oven', matchScore: 0.82, priceDiff: -40, inStock: true, reason: 'Compatible dimensions, similar features at lower price' },
  ],
  'handle': [
    { sku: 'ALT-HDL-001', brand: 'IKEA', name: 'BAGGANÄS Handle 143mm', matchScore: 0.88, priceDiff: -5, inStock: true, reason: 'Similar style and finish, standard hole spacing' },
    { sku: 'ALT-HDL-002', brand: 'Leroy Merlin', name: 'GoodHome Annatto Bar Handle', matchScore: 0.85, priceDiff: -2, inStock: true, reason: 'Same finish and mounting, comparable design' },
  ],
};

// ----------------------------------------------------------------
// Deterministic Mock Helpers
// ----------------------------------------------------------------

/**
 * Generate a deterministic stock status based on the SKU hash.
 * ~85% in_stock, ~10% low_stock, ~5% out_of_stock/backordered/discontinued
 */
function mockStockStatus(sku: string): 'in_stock' | 'low_stock' | 'out_of_stock' | 'backordered' | 'discontinued' {
  let hash = 0;
  for (let i = 0; i < sku.length; i++) {
    hash = ((hash << 5) - hash + sku.charCodeAt(i)) | 0;
  }
  const value = Math.abs(hash % 100);

  if (value < 85) return 'in_stock';
  if (value < 95) return 'low_stock';
  if (value < 97) return 'out_of_stock';
  if (value < 99) return 'backordered';
  return 'discontinued';
}

/** Generate a deterministic mock quantity */
function mockQuantity(sku: string, status: string): number {
  let hash = 0;
  for (let i = 0; i < sku.length; i++) {
    hash = ((hash << 3) - hash + sku.charCodeAt(i)) | 0;
  }
  const absHash = Math.abs(hash);

  switch (status) {
    case 'in_stock': return 10 + (absHash % 90); // 10-99
    case 'low_stock': return 1 + (absHash % 5); // 1-5
    case 'out_of_stock': return 0;
    case 'backordered': return 0;
    case 'discontinued': return 0;
    default: return 0;
  }
}

/** Generate mock store availability */
function mockStoreAvailability(
  sku: string,
  brand: string,
  overallStatus: string,
): StockResult['storeAvailability'] {
  const stores = MOCK_STORES[brand];
  if (!stores) return undefined;

  let hash = 0;
  for (let i = 0; i < sku.length; i++) {
    hash = ((hash << 4) - hash + sku.charCodeAt(i)) | 0;
  }

  return stores.map((store, idx) => {
    const storeHash = Math.abs(hash + idx * 137);
    const inStock = overallStatus === 'in_stock' || (overallStatus === 'low_stock' && storeHash % 3 > 0);
    return {
      ...store,
      inStock,
      quantity: inStock ? 1 + (storeHash % 8) : 0,
    };
  });
}

// ----------------------------------------------------------------
// Service
// ----------------------------------------------------------------

export class StockCheckerService {
  private static readonly CACHE_TTL = 3600; // 1 hour

  /**
   * Check availability for a list of products across suppliers.
   */
  async checkAvailability(
    items: StockCheckItem[],
  ): Promise<StockResult[]> {
    const results: StockResult[] = [];

    for (const item of items) {
      const cacheKey = `stock:${item.brand}:${item.sku}`;

      // Try cache first
      try {
        const cached = await CacheService.get<StockResult>(cacheKey);
        if (cached) {
          logger.debug('[StockChecker] Cache hit', { sku: item.sku, brand: item.brand });
          results.push({ ...cached, lastChecked: new Date(cached.lastChecked) });
          continue;
        }
      } catch {
        // Cache unavailable — proceed
      }

      // Generate mock result
      const status = mockStockStatus(item.sku);
      const quantity = mockQuantity(item.sku, status);
      const brandDelivery = BRAND_DELIVERY[item.brand] ?? BRAND_DELIVERY['IKEA']!;

      let estimatedDelivery: string;
      switch (status) {
        case 'in_stock':
          estimatedDelivery = brandDelivery.inStock;
          break;
        case 'low_stock':
          estimatedDelivery = brandDelivery.lowStock;
          break;
        case 'backordered':
          estimatedDelivery = brandDelivery.backorder;
          break;
        case 'out_of_stock':
          estimatedDelivery = 'Unavailable';
          break;
        case 'discontinued':
          estimatedDelivery = 'Discontinued - see alternatives';
          break;
        default:
          estimatedDelivery = 'Unknown';
      }

      const result: StockResult = {
        sku: item.sku,
        brand: item.brand,
        available: status === 'in_stock' || status === 'low_stock',
        quantity,
        estimatedDelivery,
        status,
        lastChecked: new Date(),
        storeAvailability: mockStoreAvailability(item.sku, item.brand, status),
      };

      // Cache the result
      try {
        await CacheService.set(cacheKey, result, StockCheckerService.CACHE_TTL);
      } catch {
        // Non-critical
      }

      results.push(result);
    }

    logger.info('[StockChecker] Checked availability', {
      itemCount: items.length,
      inStock: results.filter((r) => r.status === 'in_stock').length,
      lowStock: results.filter((r) => r.status === 'low_stock').length,
      outOfStock: results.filter((r) => r.status === 'out_of_stock').length,
    });

    return results;
  }

  /**
   * Find alternatives for out-of-stock items.
   */
  async findAlternatives(
    item: AlternativeSearchItem,
  ): Promise<AlternativeProduct[]> {
    const cacheKey = `stock-alt:${item.brand}:${item.sku}:${item.type}`;

    try {
      const cached = await CacheService.get<AlternativeProduct[]>(cacheKey);
      if (cached) {
        logger.debug('[StockChecker] Alternatives cache hit', { sku: item.sku });
        return cached;
      }
    } catch {
      // Cache unavailable
    }

    // Look up alternatives by product type
    const typeAlternatives = ALTERNATIVE_DB[item.type] || [];

    // Filter out same brand and adjust match scores based on dimension similarity
    const alternatives = typeAlternatives
      .filter((alt) => alt.brand !== item.brand || alt.sku !== item.sku)
      .map((alt) => ({
        ...alt,
        // Slightly randomize match score based on dimensions for realism
        matchScore: Number(
          Math.min(1, Math.max(0, alt.matchScore + (item.dimensions.width % 7 - 3) * 0.01)).toFixed(2),
        ),
      }))
      .sort((a, b) => b.matchScore - a.matchScore);

    // Cache the result
    try {
      await CacheService.set(cacheKey, alternatives, StockCheckerService.CACHE_TTL);
    } catch {
      // Non-critical
    }

    logger.info('[StockChecker] Found alternatives', {
      sku: item.sku,
      type: item.type,
      count: alternatives.length,
    });

    return alternatives;
  }
}

export default StockCheckerService;
