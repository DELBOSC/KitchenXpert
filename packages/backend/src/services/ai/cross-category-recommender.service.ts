/**
 * Cross-Category Product Recommender Service
 *
 * Rules-based recommendation engine that suggests complementary products
 * across categories. E.g., if user selects white shaker doors, recommend
 * matching handles, countertops, backsplash, flooring, etc.
 */

import logger from '../../utils/logger';
import { CacheService } from '../cache.service';

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export interface SelectedProduct {
  type: string;
  style: string;
  material: string;
  color: string;
  brand: string;
}

export interface CategoryRecommendations {
  category: string; // 'countertop', 'backsplash', 'handle', 'flooring', 'sink', 'faucet'
  recommendations: Array<{
    name: string;
    material: string;
    color: string;
    matchScore: number; // 0-1 how well it matches
    matchReason: string; // "Complements white shaker with warm contrast"
    priceRange: { min: number; max: number };
    brand?: string;
  }>;
}

export interface PopularPairing {
  cabinetStyle: string;
  countertop: string;
  backsplash: string;
  handle: string;
  flooring: string;
  popularity: number; // 0-100
}

// ----------------------------------------------------------------
// Style Compatibility Matrix
// ----------------------------------------------------------------

const STYLE_PAIRINGS: Record<string, Record<string, string[]>> = {
  'modern-white-slab': {
    countertop: ['white-quartz', 'grey-quartz', 'marble-carrara', 'concrete'],
    backsplash: ['white-subway', 'large-format-porcelain', 'glass-mosaic'],
    handle: ['bar-pull-stainless', 'integrated-channel', 'hidden-push-open'],
    flooring: ['grey-porcelain', 'light-oak-engineered', 'polished-concrete'],
  },
  'shaker-white': {
    countertop: ['butcher-block-oak', 'granite-black', 'quartz-calacatta', 'marble-carrara'],
    backsplash: ['white-subway-3x6', 'herringbone-marble', 'beadboard'],
    handle: ['cup-pull-brass', 'knob-black', 'bar-pull-brushed-nickel'],
    flooring: ['hardwood-oak', 'terracotta-tile', 'engineered-walnut'],
  },
  industrial: {
    countertop: ['concrete', 'butcher-block-walnut', 'stainless-steel', 'soapstone'],
    backsplash: ['exposed-brick', 'stainless-steel', 'cement-tile'],
    handle: ['bar-pull-matte-black', 'pipe-pull-iron'],
    flooring: ['polished-concrete', 'reclaimed-wood', 'dark-porcelain'],
  },
  scandinavian: {
    countertop: ['birch-butcher-block', 'white-laminate', 'light-quartz'],
    backsplash: ['white-square-tile', 'light-wood-panel', 'painted-white'],
    handle: ['leather-pull', 'wooden-knob', 'minimal-bar-white'],
    flooring: ['light-ash', 'white-oak', 'light-vinyl-plank'],
  },
  farmhouse: {
    countertop: ['butcher-block-maple', 'soapstone', 'honed-marble'],
    backsplash: ['white-subway', 'shiplap', 'vintage-tile'],
    handle: ['cup-pull-antique-brass', 'bin-pull-oil-rubbed-bronze', 'ceramic-knob'],
    flooring: ['wide-plank-oak', 'terracotta', 'patterned-cement-tile'],
  },
};

// Human-readable product names
const PRODUCT_NAMES: Record<string, string> = {
  // Countertops
  'white-quartz': 'White Quartz Countertop',
  'grey-quartz': 'Grey Quartz Countertop',
  'marble-carrara': 'Carrara Marble Countertop',
  concrete: 'Polished Concrete Countertop',
  'butcher-block-oak': 'Oak Butcher Block',
  'granite-black': 'Black Granite Countertop',
  'quartz-calacatta': 'Calacatta Quartz Countertop',
  'butcher-block-walnut': 'Walnut Butcher Block',
  'stainless-steel': 'Stainless Steel Countertop',
  soapstone: 'Soapstone Countertop',
  'birch-butcher-block': 'Birch Butcher Block',
  'white-laminate': 'White Laminate Countertop',
  'light-quartz': 'Light Quartz Countertop',
  'butcher-block-maple': 'Maple Butcher Block',
  'honed-marble': 'Honed Marble Countertop',
  // Backsplash
  'white-subway': 'White Subway Tile',
  'large-format-porcelain': 'Large Format Porcelain',
  'glass-mosaic': 'Glass Mosaic Tile',
  'white-subway-3x6': 'Classic 3x6 White Subway Tile',
  'herringbone-marble': 'Herringbone Marble Tile',
  beadboard: 'Beadboard Backsplash',
  'exposed-brick': 'Exposed Brick',
  'cement-tile': 'Cement Tile',
  'white-square-tile': 'White Square Tile',
  'light-wood-panel': 'Light Wood Panel',
  'painted-white': 'Painted White Wall',
  shiplap: 'Shiplap Backsplash',
  'vintage-tile': 'Vintage Patterned Tile',
  // Handles
  'bar-pull-stainless': 'Stainless Steel Bar Pull',
  'integrated-channel': 'Integrated Channel Handle',
  'hidden-push-open': 'Push-to-Open Mechanism',
  'cup-pull-brass': 'Brass Cup Pull',
  'knob-black': 'Black Round Knob',
  'bar-pull-brushed-nickel': 'Brushed Nickel Bar Pull',
  'bar-pull-matte-black': 'Matte Black Bar Pull',
  'pipe-pull-iron': 'Iron Pipe Pull',
  'leather-pull': 'Leather Strap Pull',
  'wooden-knob': 'Wooden Round Knob',
  'minimal-bar-white': 'White Minimal Bar Pull',
  'cup-pull-antique-brass': 'Antique Brass Cup Pull',
  'bin-pull-oil-rubbed-bronze': 'Oil-Rubbed Bronze Bin Pull',
  'ceramic-knob': 'Ceramic Knob',
  // Flooring
  'grey-porcelain': 'Grey Porcelain Tile',
  'light-oak-engineered': 'Light Oak Engineered Wood',
  'polished-concrete': 'Polished Concrete Floor',
  'hardwood-oak': 'Hardwood Oak Floor',
  'terracotta-tile': 'Terracotta Tile',
  'engineered-walnut': 'Engineered Walnut Floor',
  'reclaimed-wood': 'Reclaimed Wood Floor',
  'dark-porcelain': 'Dark Porcelain Tile',
  'light-ash': 'Light Ash Floor',
  'white-oak': 'White Oak Floor',
  'light-vinyl-plank': 'Light Vinyl Plank Floor',
  'wide-plank-oak': 'Wide Plank Oak Floor',
  terracotta: 'Terracotta Floor Tile',
  'patterned-cement-tile': 'Patterned Cement Tile Floor',
};

// Material extracted from product name
const PRODUCT_MATERIALS: Record<string, string> = {
  'white-quartz': 'quartz',
  'grey-quartz': 'quartz',
  'quartz-calacatta': 'quartz',
  'light-quartz': 'quartz',
  'marble-carrara': 'marble',
  'herringbone-marble': 'marble',
  'honed-marble': 'marble',
  concrete: 'concrete',
  'polished-concrete': 'concrete',
  'butcher-block-oak': 'wood',
  'butcher-block-walnut': 'wood',
  'birch-butcher-block': 'wood',
  'butcher-block-maple': 'wood',
  'granite-black': 'granite',
  soapstone: 'soapstone',
  'stainless-steel': 'stainless-steel',
  'white-laminate': 'laminate',
  'white-subway': 'ceramic',
  'white-subway-3x6': 'ceramic',
  'white-square-tile': 'ceramic',
  'large-format-porcelain': 'porcelain',
  'grey-porcelain': 'porcelain',
  'dark-porcelain': 'porcelain',
  'glass-mosaic': 'glass',
  beadboard: 'wood',
  shiplap: 'wood',
  'exposed-brick': 'brick',
  'cement-tile': 'cement',
  'light-wood-panel': 'wood',
  'painted-white': 'paint',
  'vintage-tile': 'ceramic',
  'bar-pull-stainless': 'stainless-steel',
  'integrated-channel': 'aluminum',
  'hidden-push-open': 'plastic',
  'cup-pull-brass': 'brass',
  'knob-black': 'metal',
  'bar-pull-brushed-nickel': 'nickel',
  'bar-pull-matte-black': 'metal',
  'pipe-pull-iron': 'iron',
  'leather-pull': 'leather',
  'wooden-knob': 'wood',
  'minimal-bar-white': 'metal',
  'cup-pull-antique-brass': 'brass',
  'bin-pull-oil-rubbed-bronze': 'bronze',
  'ceramic-knob': 'ceramic',
  'light-oak-engineered': 'wood',
  'hardwood-oak': 'wood',
  'terracotta-tile': 'terracotta',
  'engineered-walnut': 'wood',
  'reclaimed-wood': 'wood',
  'light-ash': 'wood',
  'white-oak': 'wood',
  'light-vinyl-plank': 'vinyl',
  'wide-plank-oak': 'wood',
  terracotta: 'terracotta',
  'patterned-cement-tile': 'cement',
};

// Color extracted from product name
const PRODUCT_COLORS: Record<string, string> = {
  'white-quartz': '#F5F5F5',
  'grey-quartz': '#9E9E9E',
  'marble-carrara': '#F0EDE8',
  concrete: '#B0B0B0',
  'butcher-block-oak': '#C4A06A',
  'granite-black': '#2C2C2C',
  'quartz-calacatta': '#FAF7F2',
  'butcher-block-walnut': '#5C3A21',
  'stainless-steel': '#C0C0C0',
  soapstone: '#505050',
  'birch-butcher-block': '#D4B896',
  'white-laminate': '#FFFFFF',
  'light-quartz': '#E8E4DE',
  'butcher-block-maple': '#E0C8A0',
  'honed-marble': '#E8E2D8',
  'white-subway': '#FFFFFF',
  'large-format-porcelain': '#F0F0F0',
  'glass-mosaic': '#B0D4E8',
  'white-subway-3x6': '#FFFFFF',
  'herringbone-marble': '#F0EDE8',
  beadboard: '#F5F5F5',
  'exposed-brick': '#A0522D',
  'cement-tile': '#8C8C8C',
  'white-square-tile': '#FFFFFF',
  'light-wood-panel': '#D2B48C',
  'painted-white': '#FFFFFF',
  shiplap: '#F5F0EB',
  'vintage-tile': '#C4A882',
  'bar-pull-stainless': '#C0C0C0',
  'integrated-channel': '#D0D0D0',
  'hidden-push-open': '#E0E0E0',
  'cup-pull-brass': '#B5A642',
  'knob-black': '#1A1A1A',
  'bar-pull-brushed-nickel': '#A8A8A8',
  'bar-pull-matte-black': '#2C2C2C',
  'pipe-pull-iron': '#3C3C3C',
  'leather-pull': '#8B4513',
  'wooden-knob': '#C4A06A',
  'minimal-bar-white': '#F0F0F0',
  'cup-pull-antique-brass': '#9C8B3C',
  'bin-pull-oil-rubbed-bronze': '#6B4226',
  'ceramic-knob': '#FAF8F5',
  'grey-porcelain': '#808080',
  'light-oak-engineered': '#D4B896',
  'polished-concrete': '#A0A0A0',
  'hardwood-oak': '#C4A06A',
  'terracotta-tile': '#CC6633',
  'engineered-walnut': '#5C3A21',
  'reclaimed-wood': '#8B7355',
  'dark-porcelain': '#404040',
  'light-ash': '#D8CFC0',
  'white-oak': '#E0D4C0',
  'light-vinyl-plank': '#D0C8B8',
  'wide-plank-oak': '#C4A06A',
  terracotta: '#CC6633',
  'patterned-cement-tile': '#7A7A7A',
};

// Price ranges per category product (EUR)
const PRICE_RANGES: Record<string, { min: number; max: number }> = {
  // Countertops (per linear meter)
  'white-quartz': { min: 200, max: 450 },
  'grey-quartz': { min: 200, max: 450 },
  'marble-carrara': { min: 350, max: 800 },
  concrete: { min: 150, max: 350 },
  'butcher-block-oak': { min: 80, max: 200 },
  'granite-black': { min: 180, max: 400 },
  'quartz-calacatta': { min: 250, max: 550 },
  'butcher-block-walnut': { min: 120, max: 280 },
  'stainless-steel': { min: 200, max: 500 },
  soapstone: { min: 250, max: 500 },
  'birch-butcher-block': { min: 60, max: 160 },
  'white-laminate': { min: 30, max: 80 },
  'light-quartz': { min: 180, max: 400 },
  'butcher-block-maple': { min: 90, max: 220 },
  'honed-marble': { min: 300, max: 700 },
  // Backsplash (per m2)
  'white-subway': { min: 15, max: 40 },
  'large-format-porcelain': { min: 30, max: 80 },
  'glass-mosaic': { min: 40, max: 120 },
  'white-subway-3x6': { min: 15, max: 45 },
  'herringbone-marble': { min: 60, max: 150 },
  beadboard: { min: 20, max: 50 },
  'exposed-brick': { min: 40, max: 100 },
  'cement-tile': { min: 35, max: 90 },
  'white-square-tile': { min: 10, max: 30 },
  'light-wood-panel': { min: 25, max: 60 },
  'painted-white': { min: 5, max: 15 },
  shiplap: { min: 20, max: 55 },
  'vintage-tile': { min: 30, max: 80 },
  // Handles (per piece)
  'bar-pull-stainless': { min: 5, max: 20 },
  'integrated-channel': { min: 10, max: 35 },
  'hidden-push-open': { min: 8, max: 25 },
  'cup-pull-brass': { min: 10, max: 30 },
  'knob-black': { min: 3, max: 12 },
  'bar-pull-brushed-nickel': { min: 6, max: 22 },
  'bar-pull-matte-black': { min: 5, max: 18 },
  'pipe-pull-iron': { min: 12, max: 35 },
  'leather-pull': { min: 8, max: 25 },
  'wooden-knob': { min: 4, max: 15 },
  'minimal-bar-white': { min: 5, max: 18 },
  'cup-pull-antique-brass': { min: 10, max: 30 },
  'bin-pull-oil-rubbed-bronze': { min: 12, max: 35 },
  'ceramic-knob': { min: 5, max: 15 },
  // Flooring (per m2)
  'grey-porcelain': { min: 25, max: 60 },
  'light-oak-engineered': { min: 35, max: 80 },
  'polished-concrete': { min: 50, max: 120 },
  'hardwood-oak': { min: 40, max: 100 },
  'terracotta-tile': { min: 30, max: 70 },
  'engineered-walnut': { min: 45, max: 110 },
  'reclaimed-wood': { min: 60, max: 150 },
  'dark-porcelain': { min: 25, max: 65 },
  'light-ash': { min: 30, max: 70 },
  'white-oak': { min: 40, max: 95 },
  'light-vinyl-plank': { min: 15, max: 40 },
  'wide-plank-oak': { min: 50, max: 120 },
  terracotta: { min: 30, max: 70 },
  'patterned-cement-tile': { min: 40, max: 100 },
};

// Match reasons per style-category pairing
const MATCH_REASONS: Record<string, Record<string, string>> = {
  'modern-white-slab': {
    countertop: 'Clean lines complement the modern slab doors with a minimalist aesthetic',
    backsplash: 'Provides a sleek, unified backdrop for modern white cabinetry',
    handle: 'Minimal hardware maintains the streamlined modern look',
    flooring: 'Creates a harmonious neutral base that enhances the modern design',
  },
  'shaker-white': {
    countertop: 'Classic pairing that adds warmth and character to white shaker cabinets',
    backsplash: 'Timeless tile pattern that complements the traditional shaker profile',
    handle: 'Traditional hardware that enhances the classic shaker door detail',
    flooring: 'Warm natural tones balance the crisp white shaker cabinetry',
  },
  industrial: {
    countertop: 'Raw, honest materials that reinforce the industrial design language',
    backsplash: 'Textured surfaces add authentic industrial character',
    handle: 'Robust hardware in dark finishes suits the utilitarian industrial style',
    flooring: 'Hard-wearing surfaces with an urban, factory-inspired aesthetic',
  },
  scandinavian: {
    countertop: 'Light, natural surfaces embody the Scandinavian design philosophy',
    backsplash: 'Simple, bright surfaces maximize the airy Scandinavian feel',
    handle: 'Organic materials and minimal profiles suit the Nordic design ethos',
    flooring: 'Light-toned wood creates the warm, bright Scandinavian atmosphere',
  },
  farmhouse: {
    countertop: 'Natural materials that evoke rustic farmhouse charm and durability',
    backsplash: 'Handcrafted textures add authentic farmhouse character',
    handle: 'Vintage-inspired hardware with patina completes the farmhouse look',
    flooring: 'Wide planks and natural tones ground the farmhouse aesthetic',
  },
};

// Brands commonly associated with each style
const STYLE_BRANDS: Record<string, string[]> = {
  'modern-white-slab': ['Schmidt', 'Mobalpa', 'SieMatic'],
  'shaker-white': ['IKEA', 'Leroy Merlin', 'Castorama'],
  industrial: ['Mobalpa', 'Lapeyre'],
  scandinavian: ['IKEA', 'Kvik'],
  farmhouse: ['Leroy Merlin', 'Castorama', 'Lapeyre'],
};

// Popular pairings database
const POPULAR_PAIRINGS: PopularPairing[] = [
  {
    cabinetStyle: 'shaker-white',
    countertop: 'quartz-calacatta',
    backsplash: 'white-subway-3x6',
    handle: 'cup-pull-brass',
    flooring: 'hardwood-oak',
    popularity: 95,
  },
  {
    cabinetStyle: 'modern-white-slab',
    countertop: 'grey-quartz',
    backsplash: 'large-format-porcelain',
    handle: 'hidden-push-open',
    flooring: 'light-oak-engineered',
    popularity: 90,
  },
  {
    cabinetStyle: 'scandinavian',
    countertop: 'birch-butcher-block',
    backsplash: 'white-square-tile',
    handle: 'leather-pull',
    flooring: 'white-oak',
    popularity: 85,
  },
  {
    cabinetStyle: 'farmhouse',
    countertop: 'butcher-block-maple',
    backsplash: 'white-subway',
    handle: 'cup-pull-antique-brass',
    flooring: 'wide-plank-oak',
    popularity: 88,
  },
  {
    cabinetStyle: 'industrial',
    countertop: 'concrete',
    backsplash: 'exposed-brick',
    handle: 'bar-pull-matte-black',
    flooring: 'polished-concrete',
    popularity: 82,
  },
  {
    cabinetStyle: 'shaker-white',
    countertop: 'marble-carrara',
    backsplash: 'herringbone-marble',
    handle: 'knob-black',
    flooring: 'engineered-walnut',
    popularity: 78,
  },
  {
    cabinetStyle: 'modern-white-slab',
    countertop: 'white-quartz',
    backsplash: 'white-subway',
    handle: 'bar-pull-stainless',
    flooring: 'grey-porcelain',
    popularity: 75,
  },
  {
    cabinetStyle: 'farmhouse',
    countertop: 'soapstone',
    backsplash: 'shiplap',
    handle: 'bin-pull-oil-rubbed-bronze',
    flooring: 'terracotta',
    popularity: 72,
  },
];

// ----------------------------------------------------------------
// Style Detection Helpers
// ----------------------------------------------------------------

/** Normalize user-supplied style string to a recognized style key */
function normalizeStyle(style: string): string | null {
  const lower = style
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-');

  const styleMap: Record<string, string> = {
    modern: 'modern-white-slab',
    'modern-white': 'modern-white-slab',
    'modern-white-slab': 'modern-white-slab',
    'modern-slab': 'modern-white-slab',
    contemporary: 'modern-white-slab',
    shaker: 'shaker-white',
    'shaker-white': 'shaker-white',
    'white-shaker': 'shaker-white',
    traditional: 'shaker-white',
    classic: 'shaker-white',
    industrial: 'industrial',
    loft: 'industrial',
    urban: 'industrial',
    scandinavian: 'scandinavian',
    nordic: 'scandinavian',
    scandi: 'scandinavian',
    farmhouse: 'farmhouse',
    country: 'farmhouse',
    rustic: 'farmhouse',
    campagne: 'farmhouse',
  };

  return styleMap[lower] ?? null;
}

/** Calculate match score based on position in the pairing list and style alignment */
function calculateMatchScore(
  productIndex: number,
  totalProducts: number,
  styleMatch: boolean
): number {
  // Base score: higher for products earlier in the list (more recommended)
  const positionScore = 1 - (productIndex / Math.max(totalProducts, 1)) * 0.3;
  // Bonus for exact style match
  const styleBonus = styleMatch ? 0.1 : 0;
  return Math.min(1, Math.max(0, Number((positionScore + styleBonus).toFixed(2))));
}

// ----------------------------------------------------------------
// Service
// ----------------------------------------------------------------

export class CrossCategoryRecommenderService {
  private static readonly CACHE_TTL = 1800; // 30 minutes

  /**
   * Given a selected product, recommend complementary products from other categories.
   * E.g., if user selects white shaker doors, recommend matching handles, countertops, backsplash.
   */
  async getComplementaryProducts(
    selectedProduct: SelectedProduct,
    categories: string[],
    maxPerCategory: number = 3
  ): Promise<CategoryRecommendations[]> {
    const cacheKey = `cross-rec:${selectedProduct.style}:${categories.join(',')}:${maxPerCategory}`;

    try {
      const cached = await CacheService.get<CategoryRecommendations[]>(cacheKey);
      if (cached) {
        logger.debug('[CrossCategoryRecommender] Cache hit', { cacheKey });
        return cached;
      }
    } catch {
      // Cache miss or unavailable — proceed
    }

    const normalizedStyle = normalizeStyle(selectedProduct.style);
    const results: CategoryRecommendations[] = [];

    for (const category of categories) {
      const recommendations = this.getRecommendationsForCategory(
        normalizedStyle,
        category,
        selectedProduct,
        maxPerCategory
      );
      results.push({ category, recommendations });
    }

    // Cache the results
    try {
      await CacheService.set(cacheKey, results, CrossCategoryRecommenderService.CACHE_TTL);
    } catch {
      // Non-critical — log and continue
    }

    logger.info('[CrossCategoryRecommender] Generated recommendations', {
      style: selectedProduct.style,
      normalizedStyle,
      categories,
      totalRecommendations: results.reduce((sum, r) => sum + r.recommendations.length, 0),
    });

    return results;
  }

  /**
   * Get popular pairings for a cabinet style.
   */
  async getPopularPairings(cabinetStyle: string): Promise<PopularPairing[]> {
    const normalizedStyle = normalizeStyle(cabinetStyle);

    if (!normalizedStyle) {
      // Return all pairings sorted by popularity if no match
      return [...POPULAR_PAIRINGS].sort((a, b) => b.popularity - a.popularity);
    }

    // Filter and sort pairings for the given style
    const stylePairings = POPULAR_PAIRINGS.filter((p) => p.cabinetStyle === normalizedStyle).sort(
      (a, b) => b.popularity - a.popularity
    );

    // If we have style-specific pairings, return them; otherwise return top overall
    if (stylePairings.length > 0) {
      return stylePairings;
    }

    return [...POPULAR_PAIRINGS].sort((a, b) => b.popularity - a.popularity).slice(0, 3);
  }

  /**
   * Generate recommendations for a single category based on the style pairing matrix.
   */
  private getRecommendationsForCategory(
    normalizedStyle: string | null,
    category: string,
    selectedProduct: SelectedProduct,
    maxItems: number
  ): CategoryRecommendations['recommendations'] {
    // Try to find style pairings
    let productKeys: string[] = [];
    let styleMatch = false;

    if (normalizedStyle && STYLE_PAIRINGS[normalizedStyle]?.[category]) {
      productKeys = STYLE_PAIRINGS[normalizedStyle][category];
      styleMatch = true;
    } else {
      // Fallback: aggregate products from all styles for this category
      const allProducts = new Set<string>();
      for (const style of Object.values(STYLE_PAIRINGS)) {
        const catProducts = style[category];
        if (catProducts) {
          for (const p of catProducts) {
            allProducts.add(p);
          }
        }
      }
      productKeys = Array.from(allProducts);
    }

    // Limit to maxItems
    const limitedKeys = productKeys.slice(0, maxItems);
    const brands = normalizedStyle ? STYLE_BRANDS[normalizedStyle] : undefined;

    return limitedKeys.map((key, index) => ({
      name: PRODUCT_NAMES[key] || key.replace(/-/g, ' '),
      material: PRODUCT_MATERIALS[key] || 'mixed',
      color: PRODUCT_COLORS[key] || '#CCCCCC',
      matchScore: calculateMatchScore(index, limitedKeys.length, styleMatch),
      matchReason: this.buildMatchReason(normalizedStyle, category, key, selectedProduct),
      priceRange: PRICE_RANGES[key] || { min: 50, max: 200 },
      brand: brands?.[index % brands.length],
    }));
  }

  /**
   * Build a human-readable match reason.
   */
  private buildMatchReason(
    normalizedStyle: string | null,
    category: string,
    _productKey: string,
    selectedProduct: SelectedProduct
  ): string {
    // Use the pre-defined match reason if available
    if (normalizedStyle && MATCH_REASONS[normalizedStyle]?.[category]) {
      return MATCH_REASONS[normalizedStyle][category];
    }

    // Generic fallback reasons
    const genericReasons: Record<string, string> = {
      countertop: `Complements ${selectedProduct.style} cabinetry with a coordinated surface`,
      backsplash: `Pairs well with ${selectedProduct.style} style for a cohesive wall treatment`,
      handle: `Hardware that matches the ${selectedProduct.style} design language`,
      flooring: `Flooring that grounds the ${selectedProduct.style} kitchen design`,
      sink: `Functional addition that complements the ${selectedProduct.style} aesthetic`,
      faucet: `Faucet style that matches the ${selectedProduct.style} kitchen finish`,
    };

    return genericReasons[category] || `Recommended complement for ${selectedProduct.style} style`;
  }
}

export default CrossCategoryRecommenderService;
