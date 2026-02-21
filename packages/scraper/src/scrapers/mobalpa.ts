/**
 * Mobalpa Scraper
 *
 * Scraper for Mobalpa kitchen products.
 * Mobalpa is a premium French kitchen brand with a 3D configurator.
 */

import * as cheerio from 'cheerio';
import { BaseScraper, ScrapedProduct, ScraperOptions } from './base-scraper.js';
import type { BrandScrapingConfig } from '../config/brands.config.js';
import type { CreateCabinetInput, CabinetType, CabinetCategory } from '../models/cabinet.js';
import type { CreateWorktopInput, WorktopMaterial, WorktopFinish } from '../models/worktop.js';
import type { CreateFacadeInput, FacadeStyle, FacadeMaterial } from '../models/facade.js';
import type { CreateHandleInput, HandleStyle, HandleMaterial } from '../models/handle.js';
import type { CreateApplianceInput, ApplianceType } from '../models/appliance.js';
import type { CreateCollectionInput } from '../models/collection.js';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

const MOBALPA_BASE_URL = 'https://www.mobalpa.fr';

// Mobalpa kitchen collections (façade styles)
const MOBALPA_COLLECTIONS = [
  { name: 'Moderna', slug: 'moderna', style: 'modern' },
  { name: 'Epura', slug: 'epura', style: 'minimalist' },
  { name: 'Quadra', slug: 'quadra', style: 'modern' },
  { name: 'Legato', slug: 'legato', style: 'modern' },
  { name: 'Allure', slug: 'allure', style: 'modern' },
  { name: 'Ambiance', slug: 'ambiance', style: 'traditional' },
  { name: 'Attitude', slug: 'attitude', style: 'modern' },
  { name: 'Osmose', slug: 'osmose', style: 'modern' },
  { name: 'Créativa', slug: 'creativa', style: 'modern' },
  { name: 'Harmonie', slug: 'harmonie', style: 'shaker' },
  { name: 'Intuition', slug: 'intuition', style: 'handleless' },
  { name: 'Origin', slug: 'origin', style: 'rustic' },
  { name: 'Caractère', slug: 'caractere', style: 'industrial' },
];

// Kitchen page categories
const KITCHEN_PAGES = {
  'cuisines-equipees': 'collection',
  'meubles-cuisine': 'cabinet',
  'facades-cuisine': 'facade',
  'plans-de-travail': 'worktop',
  'electromenager': 'appliance',
  'poignees': 'handle',
  'accessoires-rangement': 'accessory',
};

// Page selectors
const SELECTORS = {
  // Catalog pages
  productGrid: '.product-grid, .products-list',
  productCard: '.product-card, .product-item',
  productLink: 'a[href*="/cuisine/"], a[href*="/produit/"]',
  // Product page
  title: 'h1.product-title, .product-name h1',
  price: '.product-price, .price-value',
  reference: '.product-reference, .ref-number',
  description: '.product-description, .description-content',
  gallery: '.product-gallery img, .gallery-image',
  mainImage: '.product-main-image img, .main-visual img',
  specs: '.product-specs tr, .specifications-row',
  colors: '.color-swatch, .color-option',
  dimensions: '.product-dimensions, .dimensions-table',
  // Navigation
  pagination: '.pagination',
  nextPage: '.pagination-next, .next-page',
  // Collection page
  collectionItems: '.collection-item, .style-card',
};

// ═══════════════════════════════════════════════════════════════════════════
// Mobalpa Scraper Class
// ═══════════════════════════════════════════════════════════════════════════

export class MobalpaScraper extends BaseScraper {
  private currentCollection: string = '';

  constructor(config: BrandScrapingConfig, options: Partial<ScraperOptions> = {}) {
    super(config, options);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Collection URLs
  // ═══════════════════════════════════════════════════════════════════════════

  protected async getCollectionUrls(): Promise<string[]> {
    const urls: string[] = [];

    try {
      // Navigate to kitchen main page
      await this.navigateTo(`${MOBALPA_BASE_URL}/cuisines-equipees`, { waitUntil: 'networkidle2' });
      await this.acceptCookies();
      await this.humanWait(2000);

      // Get collection URLs from page
      const html = await this.getPageContent();
      const $ = this.parseHtml(html);

      // Extract collection links
      $(SELECTORS.collectionItems + ' a, a[href*="/cuisine/"]').each((_: number, el: cheerio.Element) => {
        const href = $(el).attr('href');
        if (href) {
          const fullUrl = this.resolveUrl(href);
          if (!urls.includes(fullUrl) && this.isKitchenUrl(fullUrl)) {
            urls.push(fullUrl);
          }
        }
      });

      // Add known collection URLs if not found
      for (const collection of MOBALPA_COLLECTIONS) {
        const collectionUrl = `${MOBALPA_BASE_URL}/cuisine/${collection.slug}`;
        if (!urls.includes(collectionUrl)) {
          urls.push(collectionUrl);
        }
      }

      // Add other category pages
      for (const category of Object.keys(KITCHEN_PAGES)) {
        const categoryUrl = `${MOBALPA_BASE_URL}/${category}`;
        if (!urls.includes(categoryUrl)) {
          urls.push(categoryUrl);
        }
      }

      this.logger.info(`Found ${urls.length} Mobalpa kitchen pages`);
    } catch (error) {
      this.logger.error('Error getting collection URLs', { error });

      // Fallback to known URLs
      for (const collection of MOBALPA_COLLECTIONS) {
        urls.push(`${MOBALPA_BASE_URL}/cuisine/${collection.slug}`);
      }
    }

    return urls;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Product URLs from Collection
  // ═══════════════════════════════════════════════════════════════════════════

  protected async getProductUrls(collectionUrl: string): Promise<string[]> {
    const urls: string[] = [];

    try {
      // Set current collection for context
      this.currentCollection = this.extractCollectionFromUrl(collectionUrl);

      await this.navigateTo(collectionUrl, { waitUntil: 'networkidle2' });
      await this.humanWait(2000);

      // Scroll to load dynamic content
      await this.humanScroll();

      let hasNextPage = true;
      let pageCount = 0;
      const maxPages = this.options.testMode ? 1 : 20;

      while (hasNextPage && pageCount < maxPages) {
        const html = await this.getPageContent();
        const $ = this.parseHtml(html);

        // Extract product links
        $(SELECTORS.productLink).each((_: number, el: cheerio.Element) => {
          const href = $(el).attr('href');
          if (href) {
            const fullUrl = this.resolveUrl(href);
            if (!urls.includes(fullUrl) && this.isProductUrl(fullUrl)) {
              urls.push(fullUrl);
            }
          }
        });

        // Also check product cards
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
        const nextButton = await this.page?.$(SELECTORS.nextPage);
        if (nextButton) {
          const isDisabled = await this.page?.evaluate(
            (sel: string) => document.querySelector(sel)?.classList.contains('disabled'),
            SELECTORS.nextPage
          );

          if (!isDisabled) {
            await this.clickElement(SELECTORS.nextPage);
            await this.humanWait(2000);
            pageCount++;
          } else {
            hasNextPage = false;
          }
        } else {
          hasNextPage = false;
        }
      }

      this.logger.info(`Found ${urls.length} products in ${collectionUrl}`);
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

      const productData = this.extractProductData($, url);

      if (!productData || !productData.name) {
        this.logger.warn('Could not extract product data', { url });
        return null;
      }

      const productType = this.determineProductType(productData, url);

      switch (productType) {
        case 'cabinet':
          return this.createCabinet(productData, url);
        case 'worktop':
          return this.createWorktop(productData, url);
        case 'facade':
          return this.createFacade(productData, url);
        case 'handle':
          return this.createHandle(productData, url);
        case 'appliance':
          return this.createAppliance(productData, url);
        default:
          // For collection pages, create collection entry
          if (productType === 'collection') {
            const collection = await this.scrapeCollection(url);
            if (collection) {
              return { type: 'collection', data: collection };
            }
          }
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

      const name = $('h1').first().text().trim() ||
                   $('.collection-title').text().trim() ||
                   'Mobalpa Collection';

      const description = $('.collection-description, .intro-text').text().trim() ||
                         $('meta[name="description"]').attr('content');

      // Extract collection slug
      const slugMatch = url.match(/\/cuisine\/([^\/\?]+)/);
      const slug = slugMatch?.[1] ?? this.slugify(name);

      // Find collection style
      const collectionInfo = MOBALPA_COLLECTIONS.find((c) => c.slug === slug);

      // Get hero/banner image
      const imageUrl = $('.collection-hero img, .hero-image img').attr('src') ||
                      $('.banner img').first().attr('src');

      // Extract available colors
      const colors: string[] = [];
      $(SELECTORS.colors).each((_: number, el: cheerio.Element) => {
        const colorName = $(el).attr('title') || $(el).attr('data-color') || $(el).text().trim();
        if (colorName && !colors.includes(colorName)) {
          colors.push(colorName);
        }
      });

      // Map collection style to valid FacadeStyle
      const styleMap: Record<string, FacadeStyle> = {
        'modern': 'flat',
        'minimalist': 'flat',
        'traditional': 'classic',
        'shaker': 'shaker',
        'handleless': 'handleless',
        'rustic': 'rustic',
        'industrial': 'flat',
      };
      const collectionStyle = collectionInfo?.style ? styleMap[collectionInfo.style] || 'flat' : undefined;

      return {
        brandId: this.config.id,
        name: collectionInfo?.name || name,
        slug,
        description,
        style: collectionStyle,
        isActive: true,
        launchYear: new Date().getFullYear(),
        images: imageUrl ? [this.resolveUrl(imageUrl)] : [],
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
    // Try JSON-LD
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

    // Extract main data
    const name = (jsonData?.name as string) ||
                 $(SELECTORS.title).text().trim() ||
                 $('h1').first().text().trim();

    const reference = $(SELECTORS.reference).text().trim().replace(/[^\w-]/g, '') ||
                     (jsonData?.sku as string);

    const description = $(SELECTORS.description).text().trim() ||
                       (jsonData?.description as string);

    // Price (Mobalpa often doesn't show prices online)
    const priceText = $(SELECTORS.price).text().trim();
    const price = this.parsePrice(priceText);

    // Specifications
    const specs: Record<string, string> = {};
    $(SELECTORS.specs).each((_: number, el: cheerio.Element) => {
      const label = $(el).find('th, .spec-label, td:first-child').text().trim();
      const value = $(el).find('td:last-child, .spec-value').text().trim();
      if (label && value) {
        specs[this.normalizeKey(label)] = value;
      }
    });

    // Dimensions
    const dimensions: { width?: number; height?: number; depth?: number } = {};
    $(SELECTORS.dimensions + ' tr, .dimension-item').each((_: number, el: cheerio.Element) => {
      const text = $(el).text();
      const widthMatch = text.match(/largeur\s*[:=]?\s*(\d+)/i);
      const heightMatch = text.match(/hauteur\s*[:=]?\s*(\d+)/i);
      const depthMatch = text.match(/profondeur\s*[:=]?\s*(\d+)/i);

      if (widthMatch) dimensions.width = parseInt(widthMatch[1], 10);
      if (heightMatch) dimensions.height = parseInt(heightMatch[1], 10);
      if (depthMatch) dimensions.depth = parseInt(depthMatch[1], 10);
    });

    // Also check specs for dimensions
    if (!dimensions.width && specs['largeur']) {
      dimensions.width = parseInt(specs['largeur'], 10);
    }
    if (!dimensions.height && specs['hauteur']) {
      dimensions.height = parseInt(specs['hauteur'], 10);
    }
    if (!dimensions.depth && specs['profondeur']) {
      dimensions.depth = parseInt(specs['profondeur'], 10);
    }

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

    // Colors
    const colors: Array<{ name: string; hex?: string }> = [];
    $(SELECTORS.colors).each((_: number, el: cheerio.Element) => {
      const colorName = $(el).attr('title') || $(el).attr('data-color') || $(el).text().trim();
      const colorHex = $(el).attr('data-hex') ||
                      this.extractColorFromStyle($(el).attr('style'));
      if (colorName) {
        colors.push({ name: colorName, hex: colorHex });
      }
    });

    // Material
    const material = specs['materiau'] || specs['matiere'] ||
                    this.extractMaterial(name + ' ' + description);

    // Categories from breadcrumb
    const categories: string[] = [];
    $('.breadcrumb a, .breadcrumbs a').each((_: number, el: cheerio.Element) => {
      const text = $(el).text().trim();
      if (text) categories.push(text);
    });

    return {
      name,
      reference,
      description,
      price,
      dimensions,
      specs,
      images,
      colors,
      material,
      categories,
      collection: this.currentCollection,
      url,
      jsonData,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Product Type Detection
  // ═══════════════════════════════════════════════════════════════════════════

  private determineProductType(data: any, url: string): string {
    const lowerUrl = url.toLowerCase();
    const lowerName = (data.name || '').toLowerCase();
    const categories = (data.categories || []).map((c: string) => c.toLowerCase());

    // Check URL patterns
    for (const [pattern, type] of Object.entries(KITCHEN_PAGES)) {
      if (lowerUrl.includes(pattern)) {
        return type;
      }
    }

    // Check if it's a collection page
    if (lowerUrl.includes('/cuisine/') && !lowerUrl.includes('/produit/')) {
      return 'collection';
    }

    // Check name/categories
    const combined = `${lowerName} ${categories.join(' ')}`;

    if (combined.includes('plan de travail') || combined.includes('plans-de-travail')) {
      return 'worktop';
    }

    if (combined.includes('façade') || combined.includes('porte')) {
      return 'facade';
    }

    if (combined.includes('poignée') || combined.includes('bouton')) {
      return 'handle';
    }

    if (combined.includes('four') || combined.includes('hotte') ||
        combined.includes('réfrigérateur') || combined.includes('lave-vaisselle') ||
        combined.includes('plaque') || combined.includes('évier')) {
      return 'appliance';
    }

    if (combined.includes('meuble') || combined.includes('caisson') ||
        combined.includes('colonne') || combined.includes('élément')) {
      return 'cabinet';
    }

    return 'unknown';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Product Creation Methods
  // ═══════════════════════════════════════════════════════════════════════════

  private createCabinet(data: Record<string, unknown>, url: string): ScrapedProduct | null {
    const name = data.name as string;
    const specs = data.specs as Record<string, string> | undefined;
    const dimensions = data.dimensions as { width?: number; height?: number; depth?: number } | undefined;
    const cabinetType = this.detectCabinetType(name);
    const cabinetCategory = this.detectCabinetCategory(name);

    const cabinet: CreateCabinetInput = {
      brandId: this.config.id,
      collectionId: undefined,
      reference: (data.reference as string) || this.generateReference(url, 'MOB'),
      name,
      description: data.description as string | undefined,
      type: cabinetType,
      category: cabinetCategory,
      width: dimensions?.width || 600,
      height: dimensions?.height || 720,
      depth: dimensions?.depth || 560,
      doors: this.extractNumber(specs?.['nombre_portes']) || 0,
      drawers: this.extractNumber(specs?.['nombre_tiroirs']) || 0,
      shelves: this.extractNumber(specs?.['nombre_etageres']) || 1,
      priceTTC: data.price as number | undefined,
      url,
    };

    return { type: 'cabinet', data: cabinet };
  }

  private createWorktop(data: Record<string, unknown>, url: string): ScrapedProduct | null {
    const name = data.name as string;
    const specs = data.specs as Record<string, string> | undefined;
    const colors = data.colors as Array<{ name: string }> | undefined;
    const material = this.detectWorktopMaterial((data.material as string) || name);

    const worktop: CreateWorktopInput = {
      brandId: this.config.id,
      reference: (data.reference as string) || this.generateReference(url, 'MOB'),
      name,
      description: data.description as string | undefined,
      material,
      thicknesses: [this.extractNumber(specs?.['epaisseur']) || 38],
      depths: [600, 650, 900],
      maxLength: this.extractNumber(specs?.['longueur_max']) || 4100,
      colors: colors?.map(c => ({ name: c.name })),
      pricePerSquareMeter: data.price as number | undefined,
      url,
    };

    return { type: 'worktop', data: worktop };
  }

  private createFacade(data: Record<string, unknown>, url: string): ScrapedProduct | null {
    const name = data.name as string;
    const specs = data.specs as Record<string, string> | undefined;
    const colors = data.colors as Array<{ name: string }> | undefined;
    const collection = data.collection as string | undefined;
    const collectionInfo = MOBALPA_COLLECTIONS.find((c) => c.slug === collection);

    // Map collection style to valid FacadeStyle
    const styleMap: Record<string, FacadeStyle> = {
      'modern': 'flat',
      'minimalist': 'flat',
      'traditional': 'classic',
      'shaker': 'shaker',
      'handleless': 'handleless',
      'rustic': 'rustic',
      'industrial': 'flat',
    };

    const facade: CreateFacadeInput = {
      brandId: this.config.id,
      collectionId: undefined,
      reference: (data.reference as string) || this.generateReference(url, 'MOB'),
      name,
      description: data.description as string | undefined,
      type: 'door',
      style: collectionInfo?.style ? styleMap[collectionInfo.style] || 'flat' : this.detectFacadeStyle(name),
      material: this.detectFacadeMaterial((data.material as string) || specs?.['materiau'] || ''),
      thickness: this.extractNumber(specs?.['epaisseur']) || 18,
      colors: colors?.map(c => ({ name: c.name })),
      url,
    };

    return { type: 'facade', data: facade };
  }

  private createHandle(data: Record<string, unknown>, url: string): ScrapedProduct | null {
    const name = data.name as string;
    const specs = data.specs as Record<string, string> | undefined;
    const dimensions = data.dimensions as { width?: number } | undefined;

    const handle: CreateHandleInput = {
      brandId: this.config.id,
      reference: (data.reference as string) || this.generateReference(url, 'MOB'),
      name,
      description: data.description as string | undefined,
      type: this.detectHandleType(name),
      style: this.detectHandleStyle(name),
      material: this.detectHandleMaterial((data.material as string) || specs?.['materiau'] || ''),
      finish: specs?.['finition'] as 'brushed' | 'polished' | 'matte' | 'painted' | 'antique' | 'chrome' | 'black' | 'gold' | undefined,
      length: dimensions?.width || this.extractNumber(specs?.['longueur']),
      priceUnit: data.price as number | undefined,
      url,
    };

    return { type: 'handle', data: handle };
  }

  private createAppliance(data: Record<string, unknown>, url: string): ScrapedProduct | null {
    const name = data.name as string;
    const specs = data.specs as Record<string, string> | undefined;
    const dimensions = data.dimensions as { width?: number; height?: number; depth?: number } | undefined;

    const appliance: CreateApplianceInput = {
      brandId: this.config.id,
      manufacturerBrand: specs?.['marque'] || 'Mobalpa',
      reference: (data.reference as string) || this.generateReference(url, 'MOB'),
      name,
      description: data.description as string | undefined,
      type: this.detectApplianceType(name),
      width: dimensions?.width || 600,
      height: dimensions?.height || 600,
      depth: dimensions?.depth || 600,
      energyClass: specs?.['classe_energetique'] as 'A+++' | 'A++' | 'A+' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | undefined,
      power: this.extractNumber(specs?.['puissance']),
      capacity: this.extractNumber(specs?.['capacite']),
      noiseLevel: this.extractNumber(specs?.['niveau_sonore']),
      priceTTC: data.price as number | undefined,
      url,
    };

    return { type: 'appliance', data: appliance };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Helper Methods
  // ═══════════════════════════════════════════════════════════════════════════

  private isKitchenUrl(url: string): boolean {
    const lower = url.toLowerCase();
    return lower.includes('cuisine') ||
           lower.includes('meuble') ||
           lower.includes('plan-de-travail') ||
           lower.includes('electromenager');
  }

  private isProductUrl(url: string): boolean {
    const lower = url.toLowerCase();
    return lower.includes('/produit/') ||
           (lower.includes('/cuisine/') && Boolean(lower.match(/\/[^\/]+\/[^\/]+$/)));
  }

  private extractCollectionFromUrl(url: string): string {
    const match = url.match(/\/cuisine\/([^\/\?]+)/);
    return match?.[1] ?? '';
  }

  private normalizeKey(key: string): string {
    return key
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
    return parseFloat(match[0].replace(',', '.'));
  }

  private extractMaterial(text: string): string | undefined {
    const lower = text.toLowerCase();

    if (lower.includes('bois')) return 'bois';
    if (lower.includes('laqué')) return 'laqué';
    if (lower.includes('mélaminé')) return 'mélaminé';
    if (lower.includes('stratifié')) return 'stratifié';
    if (lower.includes('verre')) return 'verre';
    if (lower.includes('inox')) return 'inox';

    return undefined;
  }

  private extractColorFromStyle(style: string | undefined): string | undefined {
    if (!style) return undefined;
    const match = style.match(/background(?:-color)?:\s*(#[a-fA-F0-9]{6}|#[a-fA-F0-9]{3})/i);
    return match ? match[1] : undefined;
  }

  private detectCabinetType(name: string): CabinetType {
    const lower = name.toLowerCase();

    // Tall cabinets
    if (lower.includes('colonne') || lower.includes('armoire')) {
      if (lower.includes('four')) return 'tall_oven';
      if (lower.includes('frigo') || lower.includes('réfrigérateur')) return 'tall_fridge';
      if (lower.includes('balai')) return 'tall_broom';
      return 'tall_pantry';
    }
    // Corner
    if (lower.includes('angle')) {
      if (lower.includes('haut')) return 'wall_corner';
      return 'base_corner';
    }
    // Wall
    if (lower.includes('haut')) {
      if (lower.includes('verre') || lower.includes('vitré')) return 'wall_glass';
      return 'wall_standard';
    }
    // Base specifics
    if (lower.includes('évier')) return 'base_sink';
    if (lower.includes('tiroir')) return 'base_drawer';
    if (lower.includes('plaque')) return 'base_hob';

    return 'base_standard';
  }

  private detectCabinetCategory(name: string): CabinetCategory {
    const lower = name.toLowerCase();

    if (lower.includes('colonne') || lower.includes('armoire')) return 'tall';
    if (lower.includes('angle')) return 'corner';
    if (lower.includes('haut')) return 'wall';
    if (lower.includes('îlot') || lower.includes('ilot')) return 'island';

    return 'base';
  }

  private detectWorktopMaterial(text: string): WorktopMaterial {
    const lower = text.toLowerCase();

    if (lower.includes('stratifié')) return 'laminate';
    if (lower.includes('quartz')) return 'quartz';
    if (lower.includes('granit')) return 'granite';
    if (lower.includes('marbre')) return 'marble';
    if (lower.includes('bois') || lower.includes('chêne') || lower.includes('noyer')) return 'wood_solid';
    if (lower.includes('placage') || lower.includes('plaqué')) return 'wood_veneer';
    if (lower.includes('céramique')) return 'ceramic';
    if (lower.includes('compact') || lower.includes('dekton')) return 'compact';
    if (lower.includes('corian')) return 'corian';
    if (lower.includes('inox') || lower.includes('acier')) return 'stainless';
    if (lower.includes('béton')) return 'concrete';
    if (lower.includes('verre')) return 'glass';

    return 'laminate';
  }

  private detectFacadeStyle(name: string): FacadeStyle {
    const lower = name.toLowerCase();

    if (lower.includes('shaker')) return 'shaker';
    if (lower.includes('classique') || lower.includes('tradition')) return 'classic';
    if (lower.includes('rustique')) return 'rustic';
    if (lower.includes('sans poignée') || lower.includes('intégré')) return 'handleless';
    if (lower.includes('cannelé') || lower.includes('rainuré')) return 'beaded';
    if (lower.includes('dalle') || lower.includes('slab')) return 'slab';

    return 'flat';
  }

  private detectFacadeMaterial(text: string): FacadeMaterial {
    const lower = (text || '').toLowerCase();

    if (lower.includes('laqué mat')) return 'lacquer_matte';
    if (lower.includes('laqué brillant')) return 'lacquer_gloss';
    if (lower.includes('laqué satin')) return 'lacquer_satin';
    if (lower.includes('laqué')) return 'lacquer_matte';
    if (lower.includes('mélaminé')) return 'melamine';
    if (lower.includes('stratifié')) return 'laminate';
    if (lower.includes('bois massif')) return 'solid_wood';
    if (lower.includes('placage') || lower.includes('plaqué')) return 'veneer';
    if (lower.includes('verre')) return 'glass';
    if (lower.includes('acrylique')) return 'acrylic';
    if (lower.includes('pet')) return 'pet';
    if (lower.includes('fenix')) return 'fenix';
    if (lower.includes('céramique')) return 'ceramic';

    return 'melamine';
  }

  private detectHandleStyle(name: string): HandleStyle {
    const lower = name.toLowerCase();

    if (lower.includes('moderne') || lower.includes('contemporary')) return 'modern';
    if (lower.includes('classique') || lower.includes('tradition')) return 'classic';
    if (lower.includes('industriel')) return 'industrial';
    if (lower.includes('scandinave') || lower.includes('nordic')) return 'scandinavian';

    return 'modern';
  }

  private detectHandleMaterial(text: string): HandleMaterial {
    const lower = (text || '').toLowerCase();

    if (lower.includes('inox') || lower.includes('acier')) return 'stainless';
    if (lower.includes('aluminium') || lower.includes('alu')) return 'aluminum';
    if (lower.includes('laiton')) return 'brass';
    if (lower.includes('zinc')) return 'zinc';
    if (lower.includes('bois')) return 'wood';
    if (lower.includes('cuir')) return 'leather';
    if (lower.includes('céramique')) return 'ceramic';
    if (lower.includes('plastique')) return 'plastic';

    return 'stainless';
  }

  private detectHandleType(name: string): 'bar' | 'knob' | 'profile' | 'integrated' | 'recessed' | 'cup' | 'edge_pull' {
    const lower = name.toLowerCase();

    if (lower.includes('bouton')) return 'knob';
    if (lower.includes('barre')) return 'bar';
    if (lower.includes('profil')) return 'profile';
    if (lower.includes('coquille')) return 'cup';
    if (lower.includes('encastré') || lower.includes('intégré')) return 'integrated';
    if (lower.includes('tirette') || lower.includes('chant')) return 'edge_pull';

    return 'bar';
  }

  private detectApplianceType(name: string): ApplianceType {
    const lower = name.toLowerCase();

    // Ovens
    if (lower.includes('four compact')) return 'oven_compact';
    if (lower.includes('four double')) return 'oven_double';
    if (lower.includes('four vapeur')) return 'steam_oven';
    if (lower.includes('four')) return 'oven_single';

    // Microwaves
    if (lower.includes('micro-ondes combiné')) return 'microwave_combi';
    if (lower.includes('micro-ondes')) return 'microwave';

    // Hobs
    if (lower.includes('induction')) return 'hob_induction';
    if (lower.includes('gaz')) return 'hob_gas';
    if (lower.includes('vitrocéramique')) return 'hob_ceramic';
    if (lower.includes('plaque')) return 'hob_induction';

    // Refrigeration
    if (lower.includes('américain')) return 'fridge_american';
    if (lower.includes('réfrigérateur') || lower.includes('frigo')) return 'fridge_integrated';
    if (lower.includes('congélateur')) return 'freezer';
    if (lower.includes('cave')) return 'wine_cooler';

    // Dishwashers
    if (lower.includes('lave-vaisselle')) return 'dishwasher_full';

    // Hoods
    if (lower.includes('hotte îlot')) return 'hood_island';
    if (lower.includes('hotte plafond')) return 'hood_ceiling';
    if (lower.includes('hotte')) return 'hood_wall';

    // Sinks & Taps
    if (lower.includes('évier')) return 'sink_single';
    if (lower.includes('robinet')) return 'tap_standard';

    // Others
    if (lower.includes('café')) return 'coffee_machine';
    if (lower.includes('tiroir chauffant')) return 'warming_drawer';

    return 'oven_single';
  }

  private extractFeatures(specs: Record<string, string>): string[] {
    const features: string[] = [];

    const featureKeys = ['fonctions', 'caracteristiques', 'options', 'programmes'];

    for (const key of Object.keys(specs)) {
      if (featureKeys.some((fk) => key.includes(fk))) {
        const value = specs[key];
        if (value) {
          features.push(...value.split(/[,;]/).map((f) => f.trim()));
        }
      }
    }

    return features.filter((f) => f.length > 0);
  }
}

export default MobalpaScraper;
