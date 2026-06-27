/**
 * IKEA Scraper
 *
 * Scraper for IKEA kitchen products (METOD system).
 * Uses IKEA's API endpoints for efficient data extraction.
 */

import * as cheerio from 'cheerio';
import { BaseScraper, ScrapedProduct, ScraperOptions } from './base-scraper.js';
import type { BrandScrapingConfig } from '../config/brands.config.js';
import type { CreateCabinetInput, CabinetType, CabinetCategory } from '../models/cabinet.js';
import type { CreateWorktopInput, WorktopMaterial, WorktopFinish } from '../models/worktop.js';
import type { CreateFacadeInput, FacadeStyle, FacadeMaterial } from '../models/facade.js';
import type { CreateApplianceInput, ApplianceType } from '../models/appliance.js';
import type { CreateCollectionInput } from '../models/collection.js';

// ═══════════════════════════════════════════════════════════════════════════
// IKEA API Types
// ═══════════════════════════════════════════════════════════════════════════

interface IkeaProduct {
  id: string;
  name: string;
  typeName: string;
  itemNo: string;
  itemNoGlobal: string;
  pipUrl: string;
  mainImageUrl: string;
  imageUrl: string;
  images: IkeaImage[];
  price: IkeaPrice;
  regularPrice: IkeaPrice;
  colors: string[];
  measurements: string;
  designer?: string;
  validDesign: boolean;
}

interface IkeaImage {
  url: string;
  alt: string;
  width: number;
  height: number;
}

interface IkeaPrice {
  value: number;
  currencyCode: string;
  formattedValue: string;
  isLowerPrice: boolean;
}

interface IkeaCategoryResponse {
  products: IkeaProduct[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  filters?: IkeaFilter[];
}

interface IkeaFilter {
  id: string;
  name: string;
  values: { id: string; name: string; count: number }[];
}

interface IkeaProductDetails {
  id: string;
  name: string;
  itemNo: string;
  itemNoGlobal: string;
  longDescription: string;
  materialAndCare: string[];
  measurements: IkeaMeasurements;
  packaging: IkeaPackaging[];
  sustainability: string[];
  assemblyInfo?: string;
  designer?: string;
  media: IkeaMedia[];
  price: IkeaPrice;
  variants: IkeaVariant[];
  relatedProducts: string[];
  breadcrumbs: { name: string; url: string }[];
}

interface IkeaMeasurements {
  width?: number;
  height?: number;
  depth?: number;
  weight?: number;
  unit: string;
  display: string;
}

interface IkeaPackaging {
  packages: number;
  weight: number;
  dimensions: string;
}

interface IkeaMedia {
  type: 'image' | 'video' | '360';
  url: string;
  alt?: string;
}

interface IkeaVariant {
  id: string;
  itemNo: string;
  color?: string;
  size?: string;
  price: IkeaPrice;
}

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

const IKEA_API_BASE = 'https://www.ikea.com/fr/fr';
const IKEA_API_SEARCH = 'https://sik.search.blue.cdtapps.com/fr/fr/search';
const IKEA_API_PRODUCT = 'https://www.ikea.com/fr/fr/pip';

// METOD kitchen categories
const KITCHEN_CATEGORIES = {
  // Base cabinets
  'armoires-meubles-bas-cuisine': 'base',
  'meubles-bas-cuisine-metod': 'base',
  'meubles-bas-tiroirs-cuisine': 'base',
  'meubles-bas-evier': 'sink',
  // Wall cabinets
  'meubles-hauts-cuisine': 'wall',
  'meubles-hauts-cuisine-metod': 'wall',
  // Tall cabinets
  'armoires-hautes-cuisine': 'tall',
  'meubles-colonne-cuisine': 'tall',
  // Corner cabinets
  'meubles-angle-cuisine': 'corner',
  // Facades
  'facades-cuisine': 'facade',
  'portes-armoires-cuisine': 'facade',
  'facades-tiroirs-cuisine': 'facade',
  // Worktops
  'plans-travail-cuisine': 'worktop',
  // Handles
  'boutons-poignees-cuisine': 'handle',
  // Appliances
  'electromenager-cuisine': 'appliance',
  'fours-cuisine-encastrables': 'appliance',
  'hottes-aspirantes': 'appliance',
  'plaques-cuisson': 'appliance',
  'refrigerateurs-congelateurs': 'appliance',
  'lave-vaisselle': 'appliance',
  // Accessories
  'accessoires-interieur-cuisine': 'accessory',
  'rangement-interieur-cuisine': 'accessory',
  'eclairage-cuisine': 'accessory',
};

// IKEA facade styles mapping
const FACADE_STYLE_MAP: Record<string, FacadeStyle> = {
  VOXTORP: 'flat',
  AXSTAD: 'shaker',
  BODBYN: 'classic',
  RINGHULT: 'flat',
  LERHYTTAN: 'classic',
  ASKERSUND: 'flat',
  KUNGSBACKA: 'flat',
  HAVSTORP: 'shaker',
  STENSUND: 'flat',
  VEDDINGE: 'flat',
  FORSAND: 'flat',
  SINARP: 'flat',
  NICKEBO: 'handleless',
};

// Cabinet type detection
const CABINET_TYPE_PATTERNS: Record<string, CabinetType> = {
  'meuble bas': 'base_standard',
  'élément bas': 'base_standard',
  'meuble haut': 'wall_standard',
  'élément haut': 'wall_standard',
  armoire: 'tall_pantry',
  colonne: 'tall_pantry',
  "meuble d'angle": 'base_corner',
  "élément d'angle": 'base_corner',
};

// Worktop material detection
const WORKTOP_MATERIAL_PATTERNS: Record<string, WorktopMaterial> = {
  stratifié: 'laminate',
  chêne: 'wood_solid',
  bouleau: 'wood_solid',
  noyer: 'wood_solid',
  hêtre: 'wood_solid',
  quartz: 'quartz',
  'effet pierre': 'laminate',
  'effet bois': 'laminate',
  'effet béton': 'laminate',
  'effet marbre': 'laminate',
};

// ═══════════════════════════════════════════════════════════════════════════
// IKEA Scraper Class
// ═══════════════════════════════════════════════════════════════════════════

export class IkeaScraper extends BaseScraper {
  private productCache: Map<string, IkeaProductDetails> = new Map();

  constructor(config: BrandScrapingConfig, options: Partial<ScraperOptions> = {}) {
    super(config, options);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Collection URLs
  // ═══════════════════════════════════════════════════════════════════════════

  protected async getCollectionUrls(): Promise<string[]> {
    const urls: string[] = [];

    // METOD kitchen system is the main collection
    const kitchenPaths = Object.keys(KITCHEN_CATEGORIES);

    for (const path of kitchenPaths) {
      urls.push(`${IKEA_API_BASE}/cat/${path}/`);
    }

    this.logger.info(`Found ${urls.length} IKEA kitchen categories`);
    return urls;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Product URLs from Category
  // ═══════════════════════════════════════════════════════════════════════════

  protected async getProductUrls(collectionUrl: string): Promise<string[]> {
    const urls: string[] = [];

    try {
      // Navigate to category page
      await this.navigateTo(collectionUrl, { waitUntil: 'networkidle2' });
      await this.acceptCookies();

      // Wait for products to load
      await this.humanWait(2000);

      // Scroll to load all products (IKEA uses infinite scroll)
      await this.loadAllProducts();

      // Extract product URLs from page
      const html = await this.getPageContent();
      const $ = this.parseHtml(html);

      // IKEA product links
      $('a[href*="/p/"]').each((_: number, el: cheerio.Element) => {
        const href = $(el).attr('href');
        if (href) {
          const fullUrl = this.resolveUrl(href);
          if (!urls.includes(fullUrl) && this.isKitchenProduct(fullUrl)) {
            urls.push(fullUrl);
          }
        }
      });

      // Also try to use API if available
      const apiProducts = await this.fetchCategoryProducts(collectionUrl);
      for (const product of apiProducts) {
        const productUrl = `${IKEA_API_BASE}${product.pipUrl}`;
        if (!urls.includes(productUrl)) {
          urls.push(productUrl);
        }
      }

      this.logger.info(`Found ${urls.length} products in category`);
    } catch (error) {
      this.logger.error('Error getting product URLs', { error });
    }

    return urls;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Scrape Single Product
  // ═══════════════════════════════════════════════════════════════════════════

  protected async scrapeProduct(url: string): Promise<ScrapedProduct | null> {
    try {
      await this.navigateTo(url, { waitUntil: 'networkidle2' });
      await this.humanWait(1500);

      const html = await this.getPageContent();
      const $ = this.parseHtml(html);

      // Extract product data
      const productData = await this.extractProductData($, url);

      if (!productData) {
        this.logger.warn('Could not extract product data', { url });
        return null;
      }

      // Determine product type and create appropriate product
      const productType = this.determineProductType(productData);

      switch (productType) {
        case 'cabinet':
          return this.createCabinet(productData, url);
        case 'worktop':
          return this.createWorktop(productData, url);
        case 'facade':
          return this.createFacade(productData, url);
        case 'appliance':
          return this.createAppliance(productData, url);
        default:
          return null;
      }
    } catch (error) {
      this.logger.error('Error scraping product', { url, error });
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Scrape Collection
  // ═══════════════════════════════════════════════════════════════════════════

  protected async scrapeCollection(url: string): Promise<CreateCollectionInput | null> {
    try {
      const html = await this.getPageContent();
      const $ = this.parseHtml(html);

      // Extract category name from breadcrumbs or title
      const name = $('h1').first().text().trim() || $('.plp-title').text().trim() || 'IKEA Kitchen';

      const description =
        $('.plp-description').text().trim() || $('meta[name="description"]').attr('content');

      // Get category path for slug
      const pathMatch = url.match(/\/cat\/([^\/]+)/);
      const slug = pathMatch?.[1] ?? this.slugify(name);

      // Get banner image
      const bannerImage =
        $('.plp-hero-image img').attr('src') || $('header img').first().attr('src');

      return {
        brandId: this.config.id,
        name,
        slug,
        description: description ?? undefined,
        isActive: true,
        launchYear: new Date().getFullYear(),
        images: bannerImage ? [this.resolveUrl(bannerImage)] : [],
        url,
      };
    } catch (error) {
      this.logger.error('Error scraping collection', { url, error });
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Product Data Extraction
  // ═══════════════════════════════════════════════════════════════════════════

  private async extractProductData($: cheerio.CheerioAPI, url: string): Promise<any> {
    // Try to get product data from script tag (IKEA embeds JSON)
    const scriptTags = $('script[type="application/ld+json"]');
    let jsonData: any = null;

    scriptTags.each((_: number, script: cheerio.Element) => {
      try {
        const content = $(script).html();
        if (content) {
          const parsed = JSON.parse(content);
          if (parsed['@type'] === 'Product') {
            jsonData = parsed;
          }
        }
      } catch {
        // Ignore parse errors
      }
    });

    // Extract from page if JSON not available
    const name =
      jsonData?.name ||
      $('h1.pip-header-section__title--big').text().trim() ||
      $('h1').first().text().trim();

    const articleNumber =
      jsonData?.sku ||
      $('[data-article-number]').attr('data-article-number') ||
      $('.pip-product-identifier__value').text().trim();

    const description =
      jsonData?.description ||
      $('[data-testid="product-description"]').text().trim() ||
      $('.pip-product-details__container').text().trim();

    // Price extraction
    const priceText =
      $('[data-price]').attr('data-price') ||
      $('.pip-temp-price__integer').text().trim() ||
      $('.pip-price__integer').text().trim();
    const price = this.parsePrice(priceText);

    // Dimensions
    const dimensionsText =
      $('[data-testid="product-dimensions"]').text().trim() ||
      $('.pip-product-dimensions').text().trim();
    const dimensions = this.parseDimensions(dimensionsText);

    // Images
    const images: string[] = [];
    $('[data-testid="product-image"] img, .pip-media-grid img').each(
      (_: number, img: cheerio.Element) => {
        const src = $(img).attr('src') || $(img).attr('data-src');
        if (src && !src.includes('placeholder')) {
          images.push(this.resolveUrl(src));
        }
      }
    );

    // Material
    const materialText =
      $('[data-testid="product-materials"]').text().trim() ||
      $('.pip-product-details__material').text().trim();

    // Color
    const color =
      $('[data-testid="product-color"]').text().trim() ||
      $('[aria-label*="couleur"]').text().trim();

    // Category from breadcrumbs
    const categories: string[] = [];
    $('.pip-breadcrumb__item, [data-testid="breadcrumb"] a').each(
      (_: number, el: cheerio.Element) => {
        const text = $(el).text().trim();
        if (text) categories.push(text);
      }
    );

    return {
      name,
      articleNumber,
      description,
      price,
      dimensions,
      images,
      material: materialText,
      color,
      categories,
      url,
      jsonData,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Product Type Detection
  // ═══════════════════════════════════════════════════════════════════════════

  private determineProductType(data: any): string {
    const name = (data.name || '').toLowerCase();
    const categories = (data.categories || []).map((c: string) => c.toLowerCase());
    const combined = `${name} ${categories.join(' ')}`;

    // Check for specific product types
    if (combined.includes('plan de travail') || combined.includes('worktop')) {
      return 'worktop';
    }

    if (
      combined.includes('porte') ||
      combined.includes('façade') ||
      combined.includes('tiroir') ||
      combined.includes('façade')
    ) {
      return 'facade';
    }

    if (
      combined.includes('four') ||
      combined.includes('réfrigérateur') ||
      combined.includes('hotte') ||
      combined.includes('plaque') ||
      combined.includes('lave-vaisselle') ||
      combined.includes('congélateur')
    ) {
      return 'appliance';
    }

    if (
      combined.includes('meuble') ||
      combined.includes('armoire') ||
      combined.includes('élément') ||
      combined.includes('colonne') ||
      combined.includes('metod')
    ) {
      return 'cabinet';
    }

    return 'unknown';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Product Creation Methods
  // ═══════════════════════════════════════════════════════════════════════════

  private createCabinet(data: any, url: string): ScrapedProduct | null {
    const cabinetType = this.detectCabinetType(data.name);
    const cabinetCategory = this.detectCabinetCategory(data.name);

    const cabinet: CreateCabinetInput = {
      brandId: this.config.id,
      reference: data.articleNumber || this.generateReference(url, 'IKEA'),
      name: data.name,
      description: data.description,
      type: cabinetType,
      category: cabinetCategory,
      width: data.dimensions?.width || 600,
      height: data.dimensions?.height || 800,
      depth: data.dimensions?.depth || 600,
      doors: this.extractDoorCount(data.name),
      drawers: this.extractDrawerCount(data.name),
      shelves: 1,
      priceTTC: data.price,
      priceType: 'fixed',
      imageMain: data.images?.[0],
      imageThumbnails: data.images?.slice(1),
      url,
    };

    return { type: 'cabinet', data: cabinet };
  }

  private createWorktop(data: any, url: string): ScrapedProduct | null {
    const material = this.detectWorktopMaterial(data.material || data.name);
    const finish = this.detectWorktopFinish(data.name) as WorktopFinish;
    const thickness = this.extractThickness(data.dimensions?.depth || data.name) || 28;

    const worktop: CreateWorktopInput = {
      brandId: this.config.id,
      reference: data.articleNumber || this.generateReference(url, 'IKEA'),
      name: data.name,
      description: data.description,
      material,
      thicknesses: [thickness],
      depths: [600, 636],
      maxLength: 2460, // IKEA standard
      finishes: [finish],
      pricePerMeter: data.price,
      priceType: 'fixed',
      images: data.images,
      url,
    };

    return { type: 'worktop', data: worktop };
  }

  private createFacade(data: any, url: string): ScrapedProduct | null {
    const style = this.detectFacadeStyle(data.name);
    const material = this.detectFacadeMaterial(data.material || data.name);

    const facade: CreateFacadeInput = {
      brandId: this.config.id,
      reference: data.articleNumber || this.generateReference(url, 'IKEA'),
      name: data.name,
      description: data.description,
      type: 'door',
      style,
      material,
      thickness: 18,
      colors: data.color ? [{ name: data.color }] : [],
      pricePerSquareMeter: data.price ? data.price * 10 : undefined, // Estimate
      priceType: 'fixed',
      images: data.images,
      url,
    };

    return { type: 'facade', data: facade };
  }

  private createAppliance(data: any, url: string): ScrapedProduct | null {
    const applianceType = this.detectApplianceType(data.name);

    const appliance: CreateApplianceInput = {
      brandId: this.config.id,
      manufacturerBrand: 'IKEA',
      reference: data.articleNumber || this.generateReference(url, 'IKEA'),
      name: data.name,
      description: data.description,
      type: applianceType,
      width: data.dimensions?.width || 600,
      height: data.dimensions?.height || 600,
      depth: data.dimensions?.depth || 600,
      priceTTC: data.price,
      priceType: 'fixed',
      images: data.images,
      url,
    };

    return { type: 'appliance', data: appliance };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Helper Methods
  // ═══════════════════════════════════════════════════════════════════════════

  private async loadAllProducts(): Promise<void> {
    if (!this.page) return;

    let previousHeight = 0;
    let attempts = 0;
    const maxAttempts = 20;

    while (attempts < maxAttempts) {
      // Get current scroll height
      const currentHeight = await this.page.evaluate(() => document.body.scrollHeight);

      if (currentHeight === previousHeight) {
        // Try clicking "Load more" button if exists
        const loadMoreClicked = await this.clickElement('[data-testid="load-more-btn"]');
        if (!loadMoreClicked) break;
      }

      previousHeight = currentHeight;

      // Scroll to bottom
      await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await this.humanWait(1500);

      attempts++;
    }
  }

  private async fetchCategoryProducts(categoryUrl: string): Promise<IkeaProduct[]> {
    const products: IkeaProduct[] = [];

    try {
      // Extract category ID from URL
      const categoryMatch = categoryUrl.match(/\/cat\/([^\/]+)/);
      if (!categoryMatch) return products;

      const categoryId = categoryMatch[1];

      // Try to fetch from IKEA's search API
      const searchUrl = `${IKEA_API_SEARCH}?q=*&category=${categoryId}&size=100`;

      const response = await this.fetchJson<IkeaCategoryResponse>(searchUrl);
      if (response?.products) {
        products.push(...response.products);
      }
    } catch (error) {
      // API might not be accessible, rely on page scraping
      this.logger.debug('Could not fetch from API', { error });
    }

    return products;
  }

  private isKitchenProduct(url: string): boolean {
    const kitchenKeywords = ['metod', 'cuisine', 'kitchen', 'knoxhult', 'sektion'];
    return kitchenKeywords.some((kw) => url.toLowerCase().includes(kw));
  }

  private detectCabinetType(name: string): CabinetType {
    const lower = name.toLowerCase();

    for (const [pattern, type] of Object.entries(CABINET_TYPE_PATTERNS)) {
      if (lower.includes(pattern)) {
        return type;
      }
    }

    // Default based on height
    if (lower.includes('200') || lower.includes('220')) return 'tall_pantry';
    if (lower.includes('80') || (lower.includes('60') && !lower.includes('haut')))
      return 'base_standard';

    return 'base_standard';
  }

  private detectCabinetCategory(name: string): CabinetCategory {
    const lower = name.toLowerCase();

    if (lower.includes('tiroir')) return 'base';
    if (lower.includes('évier')) return 'base';
    if (lower.includes('four')) return 'tall';
    if (lower.includes('plaque') || lower.includes('cuisson')) return 'base';
    if (lower.includes('réfrigérateur') || lower.includes('frigo')) return 'tall';
    if (lower.includes('lave-vaisselle')) return 'base';
    if (lower.includes('angle')) return 'corner';

    return 'base';
  }

  private detectWorktopMaterial(text: string): WorktopMaterial {
    const lower = text.toLowerCase();

    for (const [pattern, material] of Object.entries(WORKTOP_MATERIAL_PATTERNS)) {
      if (lower.includes(pattern)) {
        return material;
      }
    }

    return 'laminate';
  }

  private detectWorktopFinish(text: string): string {
    const lower = text.toLowerCase();

    if (lower.includes('mat')) return 'matte';
    if (lower.includes('brillant') || lower.includes('gloss')) return 'polished';
    if (lower.includes('brossé')) return 'brushed';

    return 'matte';
  }

  private detectFacadeStyle(name: string): FacadeStyle {
    const upper = name.toUpperCase();

    for (const [facadeName, style] of Object.entries(FACADE_STYLE_MAP)) {
      if (upper.includes(facadeName)) {
        return style;
      }
    }

    return 'flat';
  }

  private detectFacadeMaterial(text: string): FacadeMaterial {
    const lower = text.toLowerCase();

    if (lower.includes('laqué') || lower.includes('high-gloss')) return 'lacquer_gloss';
    if (lower.includes('chêne') || lower.includes('bois')) return 'veneer';
    if (lower.includes('mélaminé')) return 'melamine';
    if (lower.includes('stratifié')) return 'laminate';

    return 'melamine';
  }

  private detectApplianceType(name: string): ApplianceType {
    const lower = name.toLowerCase();

    if (lower.includes('four')) return 'oven_single';
    if (lower.includes('micro-ondes')) return 'microwave';
    if (lower.includes('réfrigérateur') || lower.includes('frigo')) return 'fridge_integrated';
    if (lower.includes('congélateur')) return 'freezer';
    if (lower.includes('lave-vaisselle')) return 'dishwasher_full';
    if (lower.includes('plaque') || lower.includes('cuisson')) return 'hob_induction';
    if (lower.includes('hotte')) return 'hood_integrated';
    if (lower.includes('évier')) return 'sink_single';
    if (lower.includes('robinet') || lower.includes('mitigeur')) return 'tap_standard';

    return 'oven_single';
  }

  private extractDoorCount(name: string): number {
    const lower = name.toLowerCase();

    if (lower.includes('2 portes')) return 2;
    if (lower.includes('3 portes')) return 3;
    if (lower.includes('porte')) return 1;

    return 0;
  }

  private extractDrawerCount(name: string): number {
    const lower = name.toLowerCase();

    const match = lower.match(/(\d+)\s*tiroirs?/);
    if (match?.[1]) return parseInt(match[1], 10);

    if (lower.includes('tiroir')) return 1;

    return 0;
  }

  private extractThickness(text: string | number): number | undefined {
    if (typeof text === 'number') return text;

    const match = text.match(/(\d+)\s*(?:mm|cm)/);
    if (match?.[1]) {
      let value = parseInt(match[1], 10);
      if (text.includes('cm')) value *= 10;
      return value;
    }

    return undefined;
  }
}

export default IkeaScraper;
