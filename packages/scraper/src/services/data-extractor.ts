/**
 * Data Extractor Service
 *
 * Advanced data extraction using multiple strategies:
 * - JSON-LD structured data
 * - Open Graph / Meta tags
 * - Microdata / RDFa
 * - Custom CSS selectors
 * - AI-like pattern recognition
 */

import * as cheerio from 'cheerio';
import { logger } from '../utils/logger.js';

// ═══════════════════════════════════════════════════════════════════════════
// Types & Interfaces
// ═══════════════════════════════════════════════════════════════════════════

export interface ExtractedData {
  // Basic info
  name?: string;
  description?: string;
  brand?: string;
  manufacturer?: string;
  sku?: string;
  gtin?: string;
  mpn?: string;

  // Pricing
  price?: number;
  priceCurrency?: string;
  originalPrice?: number;
  discount?: number;
  priceValidUntil?: string;

  // Availability
  availability?: 'InStock' | 'OutOfStock' | 'PreOrder' | 'Discontinued';
  deliveryTime?: string;

  // Images
  images: string[];
  mainImage?: string;

  // Categories
  categories: string[];
  breadcrumbs: string[];

  // Specifications
  specifications: Record<string, string>;

  // Dimensions
  dimensions?: {
    width?: number;
    height?: number;
    depth?: number;
    weight?: number;
    unit?: string;
  };

  // Reviews
  rating?: {
    value: number;
    count: number;
    best?: number;
  };

  // Variants
  variants?: ProductVariant[];

  // Related
  relatedProducts?: string[];

  // Raw data for debugging
  jsonLd?: any[];
  openGraph?: Record<string, string>;
  microdata?: any[];

  // Extraction metadata
  extractionMethods: string[];
  confidence: number;
}

export interface ProductVariant {
  id?: string;
  name?: string;
  sku?: string;
  price?: number;
  color?: string;
  size?: string;
  image?: string;
  available?: boolean;
}

export interface ExtractionConfig {
  // Selectors
  selectors?: {
    name?: string[];
    price?: string[];
    description?: string[];
    images?: string[];
    specifications?: string[];
    breadcrumbs?: string[];
  };
  // Options
  extractJsonLd?: boolean;
  extractOpenGraph?: boolean;
  extractMicrodata?: boolean;
  extractFromSelectors?: boolean;
  extractFromPatterns?: boolean;
  // Limits
  maxImages?: number;
  maxVariants?: number;
}

const DEFAULT_CONFIG: ExtractionConfig = {
  extractJsonLd: true,
  extractOpenGraph: true,
  extractMicrodata: true,
  extractFromSelectors: true,
  extractFromPatterns: true,
  maxImages: 20,
  maxVariants: 50,
};

// ═══════════════════════════════════════════════════════════════════════════
// Default Selectors
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_SELECTORS = {
  name: [
    'h1[itemprop="name"]',
    'h1.product-title',
    'h1.product-name',
    '[data-testid="product-title"]',
    '.product-detail h1',
    '.pdp-title',
    'h1',
  ],
  price: [
    '[itemprop="price"]',
    '[data-price]',
    '.product-price',
    '.price-current',
    '.price-value',
    '.pdp-price',
    '[data-testid="product-price"]',
  ],
  description: [
    '[itemprop="description"]',
    '.product-description',
    '.product-detail-description',
    '[data-testid="product-description"]',
    '.pdp-description',
  ],
  images: [
    '.product-gallery img',
    '.product-images img',
    '[data-testid="product-image"] img',
    '.pdp-gallery img',
    '.product-media img',
  ],
  specifications: [
    '.product-specifications',
    '.product-specs',
    '.tech-specs',
    '[data-testid="specifications"]',
    '.product-attributes',
  ],
  breadcrumbs: [
    '.breadcrumb a',
    '.breadcrumbs a',
    '[data-testid="breadcrumb"] a',
    'nav[aria-label="breadcrumb"] a',
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// Data Extractor Class
// ═══════════════════════════════════════════════════════════════════════════

export class DataExtractor {
  private config: ExtractionConfig;

  constructor(config?: Partial<ExtractionConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Extract all available data from HTML
   */
  extract(html: string, baseUrl?: string): ExtractedData {
    const $ = cheerio.load(html);
    const extractionMethods: string[] = [];

    let data: ExtractedData = {
      images: [],
      categories: [],
      breadcrumbs: [],
      specifications: {},
      extractionMethods: [],
      confidence: 0,
    };

    // Extract from JSON-LD
    if (this.config.extractJsonLd) {
      const jsonLdData = this.extractJsonLd($);
      if (jsonLdData.length > 0) {
        data = this.mergeData(data, this.parseJsonLd(jsonLdData));
        data.jsonLd = jsonLdData;
        extractionMethods.push('json-ld');
      }
    }

    // Extract from Open Graph
    if (this.config.extractOpenGraph) {
      const ogData = this.extractOpenGraph($);
      if (Object.keys(ogData).length > 0) {
        data = this.mergeData(data, this.parseOpenGraph(ogData));
        data.openGraph = ogData;
        extractionMethods.push('opengraph');
      }
    }

    // Extract from Microdata
    if (this.config.extractMicrodata) {
      const microdata = this.extractMicrodata($);
      if (microdata.length > 0) {
        data = this.mergeData(data, this.parseMicrodata(microdata));
        data.microdata = microdata;
        extractionMethods.push('microdata');
      }
    }

    // Extract from CSS selectors
    if (this.config.extractFromSelectors) {
      const selectorData = this.extractFromSelectors($, baseUrl);
      data = this.mergeData(data, selectorData);
      extractionMethods.push('selectors');
    }

    // Extract from patterns
    if (this.config.extractFromPatterns) {
      const patternData = this.extractFromPatterns($, html);
      data = this.mergeData(data, patternData);
      extractionMethods.push('patterns');
    }

    // Extract specifications table
    const specs = this.extractSpecifications($);
    data.specifications = { ...data.specifications, ...specs };

    // Clean and normalize images
    data.images = this.normalizeImages(data.images, baseUrl);
    if (data.images.length > 0 && !data.mainImage) {
      data.mainImage = data.images[0];
    }

    // Limit arrays
    if (data.images.length > (this.config.maxImages || 20)) {
      data.images = data.images.slice(0, this.config.maxImages);
    }

    // Calculate confidence
    data.extractionMethods = extractionMethods;
    data.confidence = this.calculateConfidence(data);

    return data;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // JSON-LD Extraction
  // ═══════════════════════════════════════════════════════════════════════════

  private extractJsonLd($: cheerio.CheerioAPI): any[] {
    const results: any[] = [];

    $('script[type="application/ld+json"]').each((_: number, el: cheerio.Element) => {
      try {
        const content = $(el).html();
        if (content) {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
            results.push(...parsed);
          } else {
            results.push(parsed);
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
    });

    return results;
  }

  private parseJsonLd(jsonLdArray: any[]): Partial<ExtractedData> {
    const data: Partial<ExtractedData> = {
      images: [],
      categories: [],
      breadcrumbs: [],
      specifications: {},
    };

    for (const item of jsonLdArray) {
      // Handle @graph
      if (item['@graph']) {
        const graphData = this.parseJsonLd(item['@graph']);
        Object.assign(data, graphData);
        continue;
      }

      const type = item['@type'];

      if (type === 'Product' || type?.includes('Product')) {
        // Basic info
        data.name = data.name || item.name;
        data.description = data.description || item.description;
        data.brand = data.brand || item.brand?.name || item.brand;
        data.manufacturer = data.manufacturer || item.manufacturer?.name;
        data.sku = data.sku || item.sku;
        data.gtin = data.gtin || item.gtin13 || item.gtin12 || item.gtin;
        data.mpn = data.mpn || item.mpn;

        // Images
        if (item.image) {
          const images = Array.isArray(item.image) ? item.image : [item.image];
          data.images!.push(...images.map((img: any) => typeof img === 'string' ? img : img.url));
        }

        // Offers (pricing)
        if (item.offers) {
          const offers = Array.isArray(item.offers) ? item.offers[0] : item.offers;
          data.price = data.price || parseFloat(offers.price);
          data.priceCurrency = data.priceCurrency || offers.priceCurrency;
          data.availability = data.availability || this.parseAvailability(offers.availability);
          data.priceValidUntil = data.priceValidUntil || offers.priceValidUntil;
        }

        // Rating
        if (item.aggregateRating) {
          data.rating = {
            value: parseFloat(item.aggregateRating.ratingValue),
            count: parseInt(item.aggregateRating.reviewCount || item.aggregateRating.ratingCount, 10),
            best: parseFloat(item.aggregateRating.bestRating) || 5,
          };
        }

        // Additional properties
        if (item.additionalProperty) {
          for (const prop of item.additionalProperty) {
            if (prop.name && prop.value) {
              data.specifications![prop.name] = String(prop.value);
            }
          }
        }
      }

      // Breadcrumbs
      if (type === 'BreadcrumbList' && item.itemListElement) {
        data.breadcrumbs = item.itemListElement
          .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
          .map((el: any) => el.item?.name || el.name)
          .filter(Boolean);
      }
    }

    return data;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Open Graph Extraction
  // ═══════════════════════════════════════════════════════════════════════════

  private extractOpenGraph($: cheerio.CheerioAPI): Record<string, string> {
    const og: Record<string, string> = {};

    $('meta[property^="og:"]').each((_: number, el: cheerio.Element) => {
      const property = $(el).attr('property')?.replace('og:', '');
      const content = $(el).attr('content');
      if (property && content) {
        og[property] = content;
      }
    });

    // Also extract product-specific meta
    $('meta[property^="product:"]').each((_: number, el: cheerio.Element) => {
      const property = $(el).attr('property')?.replace('product:', '');
      const content = $(el).attr('content');
      if (property && content) {
        og[`product_${property}`] = content;
      }
    });

    return og;
  }

  private parseOpenGraph(og: Record<string, string>): Partial<ExtractedData> {
    const data: Partial<ExtractedData> = {
      images: [],
      categories: [],
      breadcrumbs: [],
      specifications: {},
    };

    data.name = og.title;
    data.description = og.description;

    if (og.image) {
      data.images!.push(og.image);
    }

    // Product-specific
    if (og.product_price_amount) {
      data.price = parseFloat(og.product_price_amount);
      data.priceCurrency = og.product_price_currency;
    }

    if (og.product_availability) {
      data.availability = this.parseAvailability(og.product_availability);
    }

    if (og.product_brand) {
      data.brand = og.product_brand;
    }

    return data;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Microdata Extraction
  // ═══════════════════════════════════════════════════════════════════════════

  private extractMicrodata($: cheerio.CheerioAPI): any[] {
    const items: any[] = [];

    $('[itemscope]').each((_: number, el: cheerio.Element) => {
      const $el = $(el);
      const itemType = $el.attr('itemtype');

      if (itemType?.includes('Product') || itemType?.includes('Offer')) {
        const item: any = { '@type': itemType };

        $el.find('[itemprop]').each((_: number, prop: cheerio.Element) => {
          const $prop = $(prop);
          const propName = $prop.attr('itemprop');

          if (propName) {
            // Get value based on element type
            let value: string | undefined;

            if ($prop.is('meta')) {
              value = $prop.attr('content');
            } else if ($prop.is('link')) {
              value = $prop.attr('href');
            } else if ($prop.is('img')) {
              value = $prop.attr('src');
            } else if ($prop.is('time')) {
              value = $prop.attr('datetime');
            } else {
              value = $prop.text().trim();
            }

            if (value) {
              item[propName] = value;
            }
          }
        });

        items.push(item);
      }
    });

    return items;
  }

  private parseMicrodata(microdata: any[]): Partial<ExtractedData> {
    const data: Partial<ExtractedData> = {
      images: [],
      categories: [],
      breadcrumbs: [],
      specifications: {},
    };

    for (const item of microdata) {
      data.name = data.name || item.name;
      data.description = data.description || item.description;
      data.brand = data.brand || item.brand;
      data.sku = data.sku || item.sku;

      if (item.price) {
        data.price = data.price || parseFloat(item.price);
      }
      if (item.priceCurrency) {
        data.priceCurrency = data.priceCurrency || item.priceCurrency;
      }

      if (item.image) {
        data.images!.push(item.image);
      }
    }

    return data;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CSS Selector Extraction
  // ═══════════════════════════════════════════════════════════════════════════

  private extractFromSelectors($: cheerio.CheerioAPI, baseUrl?: string): Partial<ExtractedData> {
    const data: Partial<ExtractedData> = {
      images: [],
      categories: [],
      breadcrumbs: [],
      specifications: {},
    };

    const selectors = { ...DEFAULT_SELECTORS, ...this.config.selectors };

    // Name
    for (const selector of selectors.name || []) {
      const name = $(selector).first().text().trim();
      if (name) {
        data.name = name;
        break;
      }
    }

    // Price
    for (const selector of selectors.price || []) {
      const $el = $(selector).first();
      const priceText = $el.attr('data-price') || $el.attr('content') || $el.text();
      if (priceText) {
        const price = this.parsePrice(priceText);
        if (price) {
          data.price = price;
          break;
        }
      }
    }

    // Description
    for (const selector of selectors.description || []) {
      const desc = $(selector).first().text().trim();
      if (desc && desc.length > 20) {
        data.description = desc;
        break;
      }
    }

    // Images
    for (const selector of selectors.images || []) {
      $(selector).each((_: number, img: cheerio.Element) => {
        const src = $(img).attr('src') || $(img).attr('data-src') || $(img).attr('data-lazy-src');
        if (src && !src.includes('placeholder')) {
          data.images!.push(src);
        }
      });
    }

    // Breadcrumbs
    for (const selector of selectors.breadcrumbs || []) {
      $(selector).each((_: number, el: cheerio.Element) => {
        const text = $(el).text().trim();
        if (text && text !== 'Accueil' && text !== 'Home') {
          data.breadcrumbs!.push(text);
        }
      });
      if (data.breadcrumbs!.length > 0) break;
    }

    return data;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Pattern-based Extraction
  // ═══════════════════════════════════════════════════════════════════════════

  private extractFromPatterns($: cheerio.CheerioAPI, html: string): Partial<ExtractedData> {
    const data: Partial<ExtractedData> = {
      images: [],
      categories: [],
      breadcrumbs: [],
      specifications: {},
      dimensions: {},
    };

    const text = $('body').text();

    // Extract dimensions
    const dimPatterns = [
      // L x P x H format
      /(?:dimensions?|taille)\s*[:=]?\s*(\d+)\s*[xX×]\s*(\d+)\s*[xX×]\s*(\d+)\s*(?:mm|cm)?/i,
      // Individual dimensions
      /(?:largeur|width|l\.?)\s*[:=]?\s*(\d+)\s*(?:mm|cm)?/i,
      /(?:hauteur|height|h\.?)\s*[:=]?\s*(\d+)\s*(?:mm|cm)?/i,
      /(?:profondeur|depth|p\.?)\s*[:=]?\s*(\d+)\s*(?:mm|cm)?/i,
    ];

    const dim3Match = text.match(dimPatterns[0]);
    if (dim3Match) {
      data.dimensions!.width = parseInt(dim3Match[1], 10);
      data.dimensions!.depth = parseInt(dim3Match[2], 10);
      data.dimensions!.height = parseInt(dim3Match[3], 10);
    } else {
      const widthMatch = text.match(dimPatterns[1]);
      const heightMatch = text.match(dimPatterns[2]);
      const depthMatch = text.match(dimPatterns[3]);

      if (widthMatch) data.dimensions!.width = parseInt(widthMatch[1], 10);
      if (heightMatch) data.dimensions!.height = parseInt(heightMatch[1], 10);
      if (depthMatch) data.dimensions!.depth = parseInt(depthMatch[1], 10);
    }

    // Extract weight
    const weightMatch = text.match(/(?:poids|weight)\s*[:=]?\s*(\d+[.,]?\d*)\s*(?:kg|g)/i);
    if (weightMatch) {
      data.dimensions!.weight = parseFloat(weightMatch[1].replace(',', '.'));
    }

    // Extract reference/SKU from patterns
    const refMatch = text.match(/(?:réf(?:érence)?|ref|sku|article|art\.?)\s*[:=.]?\s*([A-Z0-9-]{4,20})/i);
    if (refMatch) {
      data.sku = refMatch[1];
    }

    // Extract EAN
    const eanMatch = text.match(/(?:EAN|GTIN|code-barre)\s*[:=]?\s*(\d{13})/i);
    if (eanMatch) {
      data.gtin = eanMatch[1];
    }

    // Extract currency from price patterns
    if (text.includes('€')) {
      data.priceCurrency = 'EUR';
    } else if (text.includes('$')) {
      data.priceCurrency = 'USD';
    } else if (text.includes('£')) {
      data.priceCurrency = 'GBP';
    }

    return data;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Specifications Extraction
  // ═══════════════════════════════════════════════════════════════════════════

  private extractSpecifications($: cheerio.CheerioAPI): Record<string, string> {
    const specs: Record<string, string> = {};

    // Common table patterns
    const tableSelectors = [
      '.specifications-table tr',
      '.product-specs tr',
      '.tech-specs tr',
      '.product-attributes tr',
      '.product-details tr',
      'table.specifications tr',
      '[data-testid="specifications"] tr',
    ];

    for (const selector of tableSelectors) {
      $(selector).each((_: number, row: cheerio.Element) => {
        const $row = $(row);
        const cells = $row.find('td, th');

        if (cells.length >= 2) {
          const key = $(cells[0]).text().trim();
          const value = $(cells[1]).text().trim();

          if (key && value && key !== value) {
            specs[this.normalizeKey(key)] = value;
          }
        }
      });
    }

    // Definition list patterns
    $('dl.product-specs, dl.specifications').each((_: number, dl: cheerio.Element) => {
      const $dl = $(dl);
      $dl.find('dt').each((_i: number, dt: cheerio.Element) => {
        const key = $(dt).text().trim();
        const value = $(dt).next('dd').text().trim();
        if (key && value) {
          specs[this.normalizeKey(key)] = value;
        }
      });
    });

    // Key-value patterns
    $('.spec-item, .attribute-item').each((_: number, item: cheerio.Element) => {
      const $item = $(item);
      const key = $item.find('.spec-label, .attribute-label, .key').text().trim();
      const value = $item.find('.spec-value, .attribute-value, .value').text().trim();
      if (key && value) {
        specs[this.normalizeKey(key)] = value;
      }
    });

    return specs;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Helper Methods
  // ═══════════════════════════════════════════════════════════════════════════

  private mergeData(base: ExtractedData, addition: Partial<ExtractedData>): ExtractedData {
    const result = { ...base };

    for (const [key, value] of Object.entries(addition)) {
      if (value === undefined || value === null) continue;

      if (key === 'images' && Array.isArray(value)) {
        result.images = [...new Set([...result.images, ...value])];
      } else if (key === 'categories' && Array.isArray(value)) {
        result.categories = [...new Set([...result.categories, ...value])];
      } else if (key === 'breadcrumbs' && Array.isArray(value)) {
        if (value.length > result.breadcrumbs.length) {
          result.breadcrumbs = value as string[];
        }
      } else if (key === 'specifications' && typeof value === 'object' && !Array.isArray(value)) {
        result.specifications = { ...result.specifications, ...(value as Record<string, string>) };
      } else if (key === 'dimensions' && typeof value === 'object' && !Array.isArray(value)) {
        result.dimensions = { ...result.dimensions, ...value };
      } else if (!(result as any)[key]) {
        (result as any)[key] = value;
      }
    }

    return result;
  }

  private parsePrice(text: string): number | undefined {
    if (!text) return undefined;

    // Clean the string
    let cleaned = text
      .replace(/[^\d.,]/g, '')
      .replace(/\s/g, '')
      .trim();

    // Handle French format (1 234,56)
    if (cleaned.includes(',') && !cleaned.includes('.')) {
      cleaned = cleaned.replace(',', '.');
    }

    // Handle format with both (1.234,56)
    if (cleaned.includes(',') && cleaned.includes('.')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    }

    const price = parseFloat(cleaned);
    return isNaN(price) ? undefined : price;
  }

  private parseAvailability(text?: string): ExtractedData['availability'] {
    if (!text) return undefined;

    const lower = text.toLowerCase();

    if (lower.includes('instock') || lower.includes('in_stock') || lower.includes('en stock')) {
      return 'InStock';
    }
    if (lower.includes('outofstock') || lower.includes('out_of_stock') || lower.includes('rupture')) {
      return 'OutOfStock';
    }
    if (lower.includes('preorder') || lower.includes('précommande')) {
      return 'PreOrder';
    }
    if (lower.includes('discontinued') || lower.includes('arrêté')) {
      return 'Discontinued';
    }

    return undefined;
  }

  private normalizeImages(images: string[], baseUrl?: string): string[] {
    return images
      .map((img) => {
        if (!img) return '';

        // Handle protocol-relative URLs
        if (img.startsWith('//')) {
          return 'https:' + img;
        }

        // Handle relative URLs
        if (!img.startsWith('http') && baseUrl) {
          try {
            return new URL(img, baseUrl).toString();
          } catch {
            return '';
          }
        }

        return img;
      })
      .filter((img) => img && !img.includes('placeholder') && !img.includes('loading'))
      .filter((img, index, self) => self.indexOf(img) === index); // Unique
  }

  private normalizeKey(key: string): string {
    return key
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
  }

  private calculateConfidence(data: ExtractedData): number {
    let score = 0;
    const weights = {
      name: 0.2,
      price: 0.15,
      description: 0.1,
      images: 0.15,
      sku: 0.1,
      specifications: 0.1,
      brand: 0.05,
      availability: 0.05,
      rating: 0.05,
      dimensions: 0.05,
    };

    if (data.name) score += weights.name;
    if (data.price) score += weights.price;
    if (data.description && data.description.length > 50) score += weights.description;
    if (data.images.length > 0) score += weights.images;
    if (data.sku || data.gtin) score += weights.sku;
    if (Object.keys(data.specifications).length > 2) score += weights.specifications;
    if (data.brand) score += weights.brand;
    if (data.availability) score += weights.availability;
    if (data.rating) score += weights.rating;
    if (data.dimensions && (data.dimensions.width || data.dimensions.height)) {
      score += weights.dimensions;
    }

    return Math.min(1, score);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Factory Function
// ═══════════════════════════════════════════════════════════════════════════

export function createDataExtractor(config?: Partial<ExtractionConfig>): DataExtractor {
  return new DataExtractor(config);
}

export default DataExtractor;
