/**
 * Leroy Merlin Scraper
 *
 * Scraper for Leroy Merlin kitchen products.
 * Handles multiple kitchen systems and brands available at Leroy Merlin.
 */

import * as cheerio from 'cheerio';
import { BaseScraper, ScrapedProduct, ScraperOptions } from './base-scraper.js';
import type { BrandScrapingConfig } from '../config/brands.config.js';
import type { CreateCabinetInput, CabinetType, CabinetCategory } from '../models/cabinet.js';
import type { CreateWorktopInput, WorktopMaterial, WorktopFinish } from '../models/worktop.js';
import type { CreateFacadeInput, FacadeStyle, FacadeMaterial } from '../models/facade.js';
import type { CreateApplianceInput, ApplianceType } from '../models/appliance.js';
import type { CreateAccessoryInput, AccessoryType } from '../models/accessory.js';
import type { CreateCollectionInput } from '../models/collection.js';

// ═══════════════════════════════════════════════════════════════════════════
// Leroy Merlin API Types
// ═══════════════════════════════════════════════════════════════════════════

interface LMProduct {
  id: string;
  title: string;
  subtitle?: string;
  reference: string;
  ean: string;
  brand?: string;
  price: {
    value: number;
    currency: string;
    unit?: string;
    pricePerUnit?: number;
  };
  availability: {
    available: boolean;
    stock: number;
    deliveryInfo?: string;
  };
  images: {
    main: string;
    thumbnails: string[];
    gallery: string[];
  };
  attributes: LMAttribute[];
  description: string;
  technicalSheet?: string;
  category: string[];
  rating?: {
    average: number;
    count: number;
  };
}

interface LMAttribute {
  name: string;
  value: string;
  unit?: string;
}

interface LMSearchResponse {
  products: LMProduct[];
  total: number;
  page: number;
  pageSize: number;
  facets: LMFacet[];
}

interface LMFacet {
  name: string;
  values: { value: string; count: number }[];
}

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

const LM_BASE_URL = 'https://www.leroymerlin.fr';

// Kitchen categories at Leroy Merlin
const KITCHEN_CATEGORIES = {
  // Cabinets
  'meuble-de-cuisine': 'cabinet',
  'meuble-bas-de-cuisine': 'base',
  'meuble-haut-de-cuisine': 'wall',
  'meuble-colonne-de-cuisine': 'tall',
  'meuble-d-angle-de-cuisine': 'corner',
  'meuble-sous-evier': 'sink',
  // Worktops
  'plan-de-travail-cuisine': 'worktop',
  'plan-de-travail-stratifie': 'worktop',
  'plan-de-travail-bois': 'worktop',
  'plan-de-travail-quartz': 'worktop',
  // Facades
  'facade-de-cuisine': 'facade',
  'porte-de-cuisine': 'facade',
  'facade-de-tiroir': 'facade',
  // Appliances
  'electromenager-encastrable': 'appliance',
  'four-encastrable': 'appliance',
  'plaque-de-cuisson': 'appliance',
  'hotte-de-cuisine': 'appliance',
  'refrigerateur-encastrable': 'appliance',
  'lave-vaisselle-encastrable': 'appliance',
  // Sinks & Faucets
  'evier-de-cuisine': 'appliance',
  'robinet-de-cuisine': 'appliance',
  // Accessories
  'accessoire-de-cuisine': 'accessory',
  'rangement-interieur-meuble': 'accessory',
  'eclairage-de-cuisine': 'accessory',
  // Handles
  'poignee-de-meuble': 'handle',
  'bouton-de-meuble': 'handle',
};

// Leroy Merlin kitchen collections/brands
const LM_KITCHEN_BRANDS = ['DELINIA', 'DELINIA ID', 'GOODHOME', 'CARAWAY', 'PELIPAL', 'PRAGMA'];

// Product selectors
const SELECTORS = {
  productGrid: '[data-testid="product-grid"]',
  productCard: '[data-testid="product-card"]',
  productLink: 'a[href*="/produits/"]',
  productTitle: '[data-testid="product-title"]',
  productPrice: '[data-testid="product-price"]',
  productImage: '[data-testid="product-image"] img',
  pagination: '[data-testid="pagination"]',
  nextPage: '[data-testid="pagination-next"]',
  filterPanel: '[data-testid="filter-panel"]',
  loadMore: '[data-testid="load-more"]',
  // Product page selectors
  mainImage: '.product-media-gallery__main img',
  gallery: '.product-media-gallery__thumbnails img',
  title: 'h1.product-title',
  price: '.product-price__value',
  reference: '.product-ref',
  attributes: '.product-attributes__item',
  description: '.product-description',
  techSpecs: '.product-technical-sheet',
};

// ═══════════════════════════════════════════════════════════════════════════
// Leroy Merlin Scraper Class
// ═══════════════════════════════════════════════════════════════════════════

export class LeroyMerlinScraper extends BaseScraper {
  constructor(config: BrandScrapingConfig, options: Partial<ScraperOptions> = {}) {
    super(config, options);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Collection URLs
  // ═══════════════════════════════════════════════════════════════════════════

  protected async getCollectionUrls(): Promise<string[]> {
    const urls: string[] = [];

    // Navigate to main kitchen page
    await this.navigateTo(`${LM_BASE_URL}/c/cuisine`, { waitUntil: 'networkidle2' });
    await this.acceptCookies();

    // Get all subcategory links
    const html = await this.getPageContent();
    const $ = this.parseHtml(html);

    // Extract category links
    $('a[href*="/c/"]').each((_: number, el: cheerio.Element) => {
      const href = $(el).attr('href');
      if (href) {
        const fullUrl = this.resolveUrl(href);
        // Filter for kitchen-related categories
        const isKitchenCategory = Object.keys(KITCHEN_CATEGORIES).some((cat) =>
          fullUrl.toLowerCase().includes(cat)
        );
        if (isKitchenCategory && !urls.includes(fullUrl)) {
          urls.push(fullUrl);
        }
      }
    });

    // Add main category URLs if not found
    for (const category of Object.keys(KITCHEN_CATEGORIES)) {
      const categoryUrl = `${LM_BASE_URL}/c/${category}`;
      if (!urls.includes(categoryUrl)) {
        urls.push(categoryUrl);
      }
    }

    this.logger.info(`Found ${urls.length} Leroy Merlin kitchen categories`);
    return urls;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Product URLs from Category
  // ═══════════════════════════════════════════════════════════════════════════

  protected async getProductUrls(collectionUrl: string): Promise<string[]> {
    const urls: string[] = [];

    try {
      await this.navigateTo(collectionUrl, { waitUntil: 'networkidle2' });
      await this.humanWait(2000);

      let hasNextPage = true;
      let pageCount = 0;
      const maxPages = this.options.testMode ? 1 : 50;

      while (hasNextPage && pageCount < maxPages) {
        // Extract product URLs from current page
        const html = await this.getPageContent();
        const $ = this.parseHtml(html);

        $(SELECTORS.productLink).each((_: number, el: cheerio.Element) => {
          const href = $(el).attr('href');
          if (href) {
            const fullUrl = this.resolveUrl(href);
            if (!urls.includes(fullUrl) && fullUrl.includes('/produits/')) {
              urls.push(fullUrl);
            }
          }
        });

        // Also try product cards
        $(SELECTORS.productCard).each((_: number, el: cheerio.Element) => {
          const link = $(el).find('a').first().attr('href');
          if (link) {
            const fullUrl = this.resolveUrl(link);
            if (!urls.includes(fullUrl)) {
              urls.push(fullUrl);
            }
          }
        });

        // Check for next page
        const nextPageButton = await this.page?.$(SELECTORS.nextPage);
        if (nextPageButton) {
          await this.clickElement(SELECTORS.nextPage);
          await this.humanWait(2000);
          pageCount++;
        } else {
          // Try load more button
          const loadMoreButton = await this.page?.$(SELECTORS.loadMore);
          if (loadMoreButton) {
            await this.clickElement(SELECTORS.loadMore);
            await this.humanWait(2000);
          } else {
            hasNextPage = false;
          }
        }
      }

      this.logger.info(`Found ${urls.length} products in category`, { collectionUrl });
    } catch (error) {
      this.logger.error('Error getting product URLs', { collectionUrl, error });
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
      const productData = this.extractProductData($, url);

      if (!productData || !productData.name) {
        this.logger.warn('Could not extract product data', { url });
        return null;
      }

      // Determine product type
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
        case 'accessory':
          return this.createAccessory(productData, url);
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

      const name = $('h1').first().text().trim() || 'Leroy Merlin Cuisine';
      const description = $('meta[name="description"]').attr('content');

      // Extract slug from URL
      const pathMatch = url.match(/\/c\/([^\/\?]+)/);
      const slug = pathMatch?.[1] ?? this.slugify(name);

      const bannerImage =
        $('.category-banner img').attr('src') || $('header img').first().attr('src');

      return {
        brandId: this.config.id,
        name,
        slug,
        description,
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

  private extractProductData($: cheerio.CheerioAPI, url: string): Record<string, unknown> {
    // Try JSON-LD first
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let jsonData: any = null;
    $('script[type="application/ld+json"]').each((_: number, script: cheerio.Element) => {
      try {
        const content = $(script).html();
        if (content) {
          const parsed = JSON.parse(content);
          if (parsed['@type'] === 'Product') {
            jsonData = parsed;
          }
        }
      } catch {
        // Ignore
      }
    });

    // Extract from page
    const name =
      (jsonData?.name as string) ||
      $(SELECTORS.title).text().trim() ||
      $('h1').first().text().trim();

    const reference =
      $(SELECTORS.reference).text().trim().replace(/[^\d]/g, '') || (jsonData?.sku as string);

    const description = $(SELECTORS.description).text().trim() || (jsonData?.description as string);

    // Price extraction
    const priceText = $(SELECTORS.price).text().trim();
    const price = this.parsePrice(priceText);

    // Extract attributes
    const attributes: Record<string, string> = {};
    $(SELECTORS.attributes).each((_: number, el: cheerio.Element) => {
      const label = $(el).find('.label, dt').text().trim();
      const value = $(el).find('.value, dd').text().trim();
      if (label && value) {
        attributes[this.normalizeAttributeName(label)] = value;
      }
    });

    // Technical specifications
    $(SELECTORS.techSpecs + ' tr, .tech-specs-row').each((_: number, el: cheerio.Element) => {
      const label = $(el).find('th, .label').text().trim();
      const value = $(el).find('td, .value').text().trim();
      if (label && value) {
        attributes[this.normalizeAttributeName(label)] = value;
      }
    });

    // Parse dimensions from attributes
    const dimensions = this.parseDimensionsFromAttributes(attributes);

    // Images
    const images: string[] = [];
    $(SELECTORS.mainImage).each((_: number, img: cheerio.Element) => {
      const src = $(img).attr('src') || $(img).attr('data-src');
      if (src) images.push(this.resolveUrl(src));
    });
    $(SELECTORS.gallery).each((_: number, img: cheerio.Element) => {
      const src = $(img).attr('src') || $(img).attr('data-src');
      if (src && !images.includes(this.resolveUrl(src))) {
        images.push(this.resolveUrl(src));
      }
    });

    // Brand detection
    const brand = this.detectBrand(name, attributes);

    // Category from breadcrumbs
    const categories: string[] = [];
    $('.breadcrumb a, [data-testid="breadcrumb"] a').each((_: number, el: cheerio.Element) => {
      const text = $(el).text().trim();
      if (text) categories.push(text);
    });

    return {
      name,
      reference,
      description,
      price,
      dimensions,
      attributes,
      images,
      brand,
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

    // Check URL patterns first
    const url = (data.url || '').toLowerCase();
    for (const [pattern, type] of Object.entries(KITCHEN_CATEGORIES)) {
      if (url.includes(pattern)) {
        if (
          type === 'base' ||
          type === 'wall' ||
          type === 'tall' ||
          type === 'corner' ||
          type === 'sink'
        ) {
          return 'cabinet';
        }
        return type;
      }
    }

    // Then check name/categories
    if (combined.includes('plan de travail') || combined.includes('plan-de-travail')) {
      return 'worktop';
    }

    if (
      combined.includes('façade') ||
      combined.includes('porte de cuisine') ||
      combined.includes('facade')
    ) {
      return 'facade';
    }

    if (
      combined.includes('four') ||
      combined.includes('hotte') ||
      combined.includes('plaque') ||
      combined.includes('réfrigérateur') ||
      combined.includes('lave-vaisselle') ||
      combined.includes('évier') ||
      combined.includes('robinet')
    ) {
      return 'appliance';
    }

    if (
      combined.includes('meuble') ||
      combined.includes('colonne') ||
      combined.includes('caisson')
    ) {
      return 'cabinet';
    }

    if (
      combined.includes('accessoire') ||
      combined.includes('rangement') ||
      combined.includes('éclairage')
    ) {
      return 'accessory';
    }

    return 'unknown';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Product Creation Methods
  // ═══════════════════════════════════════════════════════════════════════════

  private createCabinet(data: Record<string, unknown>, url: string): ScrapedProduct | null {
    const cabinetType = this.detectCabinetType(data.name as string, url);
    const cabinetCategory = this.detectCabinetCategory(data.name as string);

    const cabinet: CreateCabinetInput = {
      brandId: this.config.id,
      reference: (data.reference as string) || this.generateReference(url, 'LM'),
      name: data.name as string,
      description: data.description as string | undefined,
      type: cabinetType,
      category: cabinetCategory,
      width: (data.dimensions as Record<string, number> | undefined)?.width || 600,
      height: (data.dimensions as Record<string, number> | undefined)?.height || 720,
      depth: (data.dimensions as Record<string, number> | undefined)?.depth || 560,
      doors:
        this.extractNumber((data.attributes as Record<string, string>)?.['nombre_portes']) || 0,
      drawers:
        this.extractNumber((data.attributes as Record<string, string>)?.['nombre_tiroirs']) || 0,
      shelves:
        this.extractNumber((data.attributes as Record<string, string>)?.['nombre_etageres']) || 1,
      priceTTC: data.price as number | undefined,
      url,
    };

    return { type: 'cabinet', data: cabinet };
  }

  private createWorktop(data: Record<string, unknown>, url: string): ScrapedProduct | null {
    const attributes = data.attributes as Record<string, string> | undefined;
    const material = this.detectWorktopMaterial(data.name as string, attributes || {});

    const worktop: CreateWorktopInput = {
      brandId: this.config.id,
      reference: (data.reference as string) || this.generateReference(url, 'LM'),
      name: data.name as string,
      description: data.description as string | undefined,
      material,
      thicknesses: [this.extractNumber(attributes?.['epaisseur']) || 28],
      depths: [600, 650],
      maxLength: this.extractNumber(attributes?.['longueur']) || 3050,
      colors: attributes?.['couleur'] ? [{ name: attributes['couleur'] }] : [],
      pricePerMeter: data.price as number | undefined,
      url,
    };

    return { type: 'worktop', data: worktop };
  }

  private createFacade(data: Record<string, unknown>, url: string): ScrapedProduct | null {
    const attributes = data.attributes as Record<string, string> | undefined;
    const name = data.name as string;
    const brand = data.brand as string | undefined;

    const facade: CreateFacadeInput = {
      brandId: this.config.id,
      reference: (data.reference as string) || this.generateReference(url, 'LM'),
      name,
      description: data.description as string | undefined,
      type: 'door',
      style: this.detectFacadeStyle(name, brand || ''),
      material: this.detectFacadeMaterial(attributes || {}),
      thickness: this.extractNumber(attributes?.['epaisseur']) || 18,
      colors: attributes?.['couleur'] ? [{ name: attributes['couleur'] }] : [],
      url,
    };

    return { type: 'facade', data: facade };
  }

  private createAppliance(data: Record<string, unknown>, url: string): ScrapedProduct | null {
    const name = data.name as string;
    const attributes = data.attributes as Record<string, string> | undefined;
    const dimensions = data.dimensions as Record<string, number> | undefined;
    const applianceType = this.detectApplianceType(name, url);

    const appliance: CreateApplianceInput = {
      brandId: this.config.id,
      manufacturerBrand: attributes?.['marque'] || (data.brand as string) || 'Unknown',
      reference: (data.reference as string) || this.generateReference(url, 'LM'),
      name,
      description: data.description as string | undefined,
      type: applianceType,
      width: dimensions?.width || 600,
      height: dimensions?.height || 600,
      depth: dimensions?.depth || 600,
      energyClass: attributes?.['classe_energetique'] as
        | 'A+++'
        | 'A++'
        | 'A+'
        | 'A'
        | 'B'
        | 'C'
        | 'D'
        | 'E'
        | 'F'
        | 'G'
        | undefined,
      power: this.extractNumber(attributes?.['puissance']),
      capacity:
        this.extractNumber(attributes?.['volume']) || this.extractNumber(attributes?.['capacite']),
      noiseLevel: this.extractNumber(attributes?.['niveau_sonore']),
      priceTTC: data.price as number | undefined,
      url,
    };

    return { type: 'appliance', data: appliance };
  }

  private createAccessory(data: Record<string, unknown>, url: string): ScrapedProduct | null {
    const name = data.name as string;
    const dimensions = data.dimensions as Record<string, number> | undefined;

    const accessory: CreateAccessoryInput = {
      brandId: this.config.id,
      reference: (data.reference as string) || this.generateReference(url, 'LM'),
      name,
      description: data.description as string | undefined,
      type: this.detectAccessoryType(name),
      width: dimensions?.width,
      height: dimensions?.height,
      depth: dimensions?.depth,
      priceTTC: data.price as number | undefined,
      url,
    };

    return { type: 'accessory', data: accessory };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Helper Methods
  // ═══════════════════════════════════════════════════════════════════════════

  private detectBrand(name: string, attributes: Record<string, string>): string {
    const upper = name.toUpperCase();

    for (const brand of LM_KITCHEN_BRANDS) {
      if (upper.includes(brand)) {
        return brand;
      }
    }

    return attributes['marque'] || 'LEROY MERLIN';
  }

  private detectCabinetType(name: string, url: string): CabinetType {
    const lower = name.toLowerCase();
    const lowerUrl = url.toLowerCase();

    // Tall cabinets
    if (
      lower.includes('colonne') ||
      lower.includes('armoire haute') ||
      lowerUrl.includes('colonne')
    ) {
      if (lower.includes('four')) return 'tall_oven';
      if (lower.includes('frigo') || lower.includes('réfrigérateur')) return 'tall_fridge';
      if (lower.includes('balai') || lower.includes('ménager')) return 'tall_broom';
      return 'tall_pantry';
    }
    // Corner cabinets
    if (lower.includes('angle') || lowerUrl.includes('angle')) {
      if (lower.includes('haut')) return 'wall_corner';
      if (lower.includes('carousel') || lower.includes('tournant')) return 'base_corner_carousel';
      return 'base_corner';
    }
    // Wall cabinets
    if (lower.includes('haut') || lowerUrl.includes('haut')) {
      if (lower.includes('relevable') || lower.includes('lift')) return 'wall_lift_up';
      if (lower.includes('hotte') || lower.includes('extracteur')) return 'wall_extractor';
      if (lower.includes('verre') || lower.includes('vitré')) return 'wall_glass';
      return 'wall_standard';
    }
    // Base cabinets
    if (lower.includes('évier') || lower.includes('sous-évier')) return 'base_sink';
    if (lower.includes('tiroir')) return 'base_drawer';
    if (lower.includes('plaque') || lower.includes('cuisson')) return 'base_hob';
    if (lower.includes('poubelle') || lower.includes('tri')) return 'base_trash';
    if (lower.includes('bouteille')) return 'base_bottle';

    return 'base_standard';
  }

  private detectCabinetCategory(name: string): CabinetCategory {
    const lower = name.toLowerCase();

    if (lower.includes('colonne') || lower.includes('armoire haute')) return 'tall';
    if (lower.includes('angle')) return 'corner';
    if (lower.includes('haut')) return 'wall';
    if (lower.includes('îlot') || lower.includes('ilot')) return 'island';

    return 'base';
  }

  private detectWorktopMaterial(name: string, attributes: Record<string, string>): WorktopMaterial {
    const combined = `${name} ${attributes['materiau'] || ''}`.toLowerCase();

    if (combined.includes('stratifié')) return 'laminate';
    if (
      combined.includes('chêne') ||
      combined.includes('bois massif') ||
      combined.includes('hêtre')
    )
      return 'wood_solid';
    if (combined.includes('placage') || combined.includes('plaqué')) return 'wood_veneer';
    if (combined.includes('quartz')) return 'quartz';
    if (combined.includes('granit')) return 'granite';
    if (combined.includes('marbre')) return 'marble';
    if (combined.includes('céramique')) return 'ceramic';
    if (combined.includes('compact') || combined.includes('résine')) return 'compact';
    if (combined.includes('inox') || combined.includes('acier')) return 'stainless';
    if (combined.includes('béton') || combined.includes('concrete')) return 'concrete';
    if (combined.includes('corian')) return 'corian';
    if (combined.includes('verre')) return 'glass';

    return 'laminate';
  }

  private detectWorktopFinish(attributes: Record<string, string>): WorktopFinish {
    const finish = (attributes['finition'] || '').toLowerCase();

    if (finish.includes('mat')) return 'matte';
    if (finish.includes('brillant')) return 'gloss';
    if (finish.includes('satiné')) return 'satin';
    if (finish.includes('brossé')) return 'brushed';
    if (finish.includes('poli')) return 'polished';
    if (finish.includes('texturé')) return 'textured';

    return 'matte';
  }

  private detectFacadeStyle(name: string, brand: string): FacadeStyle {
    const combined = `${name} ${brand}`.toLowerCase();

    if (combined.includes('shaker')) return 'shaker';
    if (combined.includes('classique') || combined.includes('tradition')) return 'classic';
    if (combined.includes('sans poignée') || combined.includes('intégré')) return 'handleless';
    if (combined.includes('rustique')) return 'rustic';
    if (combined.includes('cannelé') || combined.includes('rainuré')) return 'beaded';
    if (combined.includes('dalle') || combined.includes('slab')) return 'slab';

    return 'flat';
  }

  private detectFacadeMaterial(attributes: Record<string, string>): FacadeMaterial {
    const material = (attributes['materiau'] || '').toLowerCase();

    if (material.includes('laqué mat')) return 'lacquer_matte';
    if (material.includes('laqué brillant')) return 'lacquer_gloss';
    if (material.includes('laqué satin')) return 'lacquer_satin';
    if (material.includes('laqué')) return 'lacquer_matte';
    if (material.includes('mélaminé')) return 'melamine';
    if (material.includes('stratifié')) return 'laminate';
    if (material.includes('bois massif')) return 'solid_wood';
    if (material.includes('placage') || material.includes('plaqué')) return 'veneer';
    if (material.includes('verre')) return 'glass';
    if (material.includes('acrylique')) return 'acrylic';
    if (material.includes('pet')) return 'pet';
    if (material.includes('fenix')) return 'fenix';
    if (material.includes('céramique')) return 'ceramic';

    return 'melamine';
  }

  private detectApplianceType(name: string, url: string): ApplianceType {
    const combined = `${name} ${url}`.toLowerCase();

    // Ovens
    if (combined.includes('four compact')) return 'oven_compact';
    if (combined.includes('four double')) return 'oven_double';
    if (combined.includes('four vapeur')) return 'steam_oven';
    if (combined.includes('four')) return 'oven_single';

    // Microwaves
    if (combined.includes('micro-ondes combiné') || combined.includes('combi'))
      return 'microwave_combi';
    if (combined.includes('micro-ondes')) return 'microwave';

    // Hobs
    if (combined.includes('induction')) return 'hob_induction';
    if (combined.includes('gaz')) return 'hob_gas';
    if (combined.includes('vitrocéramique') || combined.includes('céramique')) return 'hob_ceramic';
    if (combined.includes('plaque mixte')) return 'hob_mixed';
    if (combined.includes('plaque')) return 'hob_induction';

    // Refrigeration
    if (combined.includes('américain')) return 'fridge_american';
    if (combined.includes('réfrigérateur') && combined.includes('congélateur'))
      return 'fridge_freezer';
    if (combined.includes('réfrigérateur') || combined.includes('frigo'))
      return 'fridge_integrated';
    if (combined.includes('congélateur')) return 'freezer';
    if (combined.includes('cave')) return 'wine_cooler';

    // Dishwashers
    if (combined.includes('lave-vaisselle') && combined.includes('45')) return 'dishwasher_compact';
    if (combined.includes('lave-vaisselle')) return 'dishwasher_full';

    // Hoods
    if (combined.includes('hotte îlot') || combined.includes('hotte ilot')) return 'hood_island';
    if (combined.includes('hotte plafond')) return 'hood_ceiling';
    if (combined.includes('hotte escamotable') || combined.includes('downdraft'))
      return 'hood_downdraft';
    if (combined.includes('hotte intégrée') || combined.includes('groupe'))
      return 'hood_integrated';
    if (combined.includes('hotte')) return 'hood_wall';

    // Sinks
    if (combined.includes('évier double') || combined.includes('2 bacs')) return 'sink_double';
    if (combined.includes('évier 1.5') || combined.includes('1,5 bac')) return 'sink_1_5';
    if (combined.includes('évier')) return 'sink_single';

    // Taps
    if (combined.includes('eau bouillante')) return 'tap_boiling';
    if (combined.includes('douchette') || combined.includes('extractible')) return 'tap_pull_out';
    if (combined.includes('filtrant')) return 'tap_filtered';
    if (combined.includes('robinet') || combined.includes('mitigeur')) return 'tap_standard';

    // Others
    if (combined.includes('tiroir chauffant')) return 'warming_drawer';
    if (combined.includes('café') || combined.includes('expresso')) return 'coffee_machine';
    if (combined.includes('broyeur')) return 'waste_disposal';

    return 'oven_single';
  }

  private detectInstallationType(
    name: string
  ): 'built_in' | 'freestanding' | 'integrated' | undefined {
    const lower = name.toLowerCase();

    if (lower.includes('encastrable') || lower.includes('intégr')) return 'built_in';
    if (lower.includes('pose libre') || lower.includes('indépendant')) return 'freestanding';

    return 'built_in';
  }

  private detectAccessoryType(name: string): AccessoryType {
    const lower = name.toLowerCase();

    // Lighting
    if (lower.includes('éclairage sous') || lower.includes('sous meuble'))
      return 'under_cabinet_lighting';
    if (lower.includes('éclairage') || lower.includes('led')) return 'led_lighting';
    if (lower.includes('capteur') || lower.includes('détecteur')) return 'motion_sensor';

    // Organization
    if (lower.includes('range-couverts') || lower.includes('couverts')) return 'cutlery_tray';
    if (lower.includes('couteaux')) return 'knife_block';
    if (lower.includes('épices')) return 'spice_rack';
    if (lower.includes('assiettes')) return 'plate_holder';
    if (lower.includes('casseroles')) return 'pot_organizer';
    if (lower.includes('couvercles')) return 'lid_holder';
    if (lower.includes('insert tiroir') || lower.includes('organisateur tiroir'))
      return 'drawer_insert';
    if (lower.includes('séparateur') || lower.includes('diviseur')) return 'divider';

    // Storage
    if (lower.includes('étagère')) return 'shelf';
    if (lower.includes('panier coulissant') || lower.includes('tiroir coulissant'))
      return 'pull_out_basket';
    if (lower.includes('panier')) return 'basket';
    if (lower.includes('barre') || lower.includes('rail')) return 'rail';
    if (lower.includes('carousel') || lower.includes('tournant')) return 'corner_carousel';
    if (lower.includes('magic corner')) return 'magic_corner';
    if (lower.includes('colonne coulissante') || lower.includes('tall pull'))
      return 'tall_pull_out';
    if (lower.includes('bouteille')) return 'bottle_rack';

    // Waste
    if (lower.includes('tri sélectif') || lower.includes('recyclage')) return 'recycling_bin';
    if (lower.includes('poubelle')) return 'bin';

    // Hardware
    if (lower.includes('fermeture douce') || lower.includes('soft close')) return 'soft_close';
    if (lower.includes('push to open') || lower.includes('tip-on')) return 'push_to_open';

    // Convenience
    if (lower.includes('serviette')) return 'towel_rail';
    if (lower.includes('crochet')) return 'hooks';
    if (lower.includes('charge') || lower.includes('usb')) return 'charging_station';
    if (lower.includes('tablette') || lower.includes('support')) return 'tablet_holder';

    return 'drawer_insert';
  }

  private parseDimensionsFromAttributes(attributes: Record<string, string>): {
    width?: number;
    height?: number;
    depth?: number;
  } {
    return {
      width: this.extractNumber(attributes['largeur']) || this.extractNumber(attributes['l']),
      height: this.extractNumber(attributes['hauteur']) || this.extractNumber(attributes['h']),
      depth: this.extractNumber(attributes['profondeur']) || this.extractNumber(attributes['p']),
    };
  }

  private normalizeAttributeName(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
  }

  private extractNumber(value: string | undefined): number | undefined {
    if (!value) return undefined;
    const match = value.match(/[\d,.]+/);
    if (!match) return undefined;
    const num = parseFloat(match[0].replace(',', '.'));
    return isNaN(num) ? undefined : num;
  }

  private extractFeatures(attributes: Record<string, string>): string[] {
    const features: string[] = [];

    const featureKeys = ['fonctionnalites', 'caracteristiques', 'options', 'programmes'];

    for (const key of Object.keys(attributes)) {
      if (featureKeys.some((fk) => key.includes(fk))) {
        const value = attributes[key];
        if (value) {
          features.push(...value.split(/[,;]/).map((f) => f.trim()));
        }
      }
    }

    return features.filter((f) => f.length > 0);
  }
}

export default LeroyMerlinScraper;
