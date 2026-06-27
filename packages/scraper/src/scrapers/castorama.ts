/**
 * Castorama Scraper
 *
 * Scraper for Castorama kitchen products (GSB - Grande Surface de Bricolage)
 * Similar pricing structure to Leroy Merlin
 *
 * Website: https://www.castorama.fr
 * Catalog: /cuisine/
 */

import * as cheerio from 'cheerio';
import { BaseScraper, ScrapedProduct, ScraperOptions } from './base-scraper.js';
import type { BrandScrapingConfig } from '../config/brands.config.js';
import type { CreateCabinetInput, CabinetType, CabinetCategory } from '../models/cabinet.js';
import type { CreateFacadeInput, FacadeStyle, FacadeMaterial } from '../models/facade.js';
import type { CreateWorktopInput, WorktopMaterial, WorktopFinish } from '../models/worktop.js';
import type { CreateApplianceInput, ApplianceType } from '../models/appliance.js';
import type { CreateCollectionInput } from '../models/collection.js';

// CSS Selectors for Castorama website
const SELECTORS = {
  // Navigation & Collections
  categoryNav: '.category-nav, .nav-categories, [data-category-nav]',
  collectionLinks: '.category-card a, .collection-link, .kitchen-category a',
  collectionTitle: '.category-title, h1.page-title, .hero-title',
  collectionDescription: '.category-description, .intro-text, .seo-text',
  collectionImage: '.category-hero img, .banner-image img, .hero-bg img',

  // Product listing (e-commerce style)
  productGrid: '.product-list, .products-grid, [data-product-grid]',
  productCard: '.product-card, .product-item, [data-product-card]',
  productLink: '.product-card a, .product-link, [data-product-link]',
  productName: '.product-name, .product-title, h2.name',
  productPrice: '.product-price, .price, [data-price]',
  productOldPrice: '.old-price, .crossed-price, .was-price',
  productImage: '.product-image img, .product-thumbnail img',
  productRating: '.product-rating, .rating-stars',
  productAvailability: '.availability, .stock-status',

  // Product detail page
  productDetailName: 'h1.product-title, h1.product-name, [data-product-name]',
  productDetailRef: '.product-reference, .reference, .sku, [data-sku]',
  productDetailDescription: '.product-description, .description, [data-description]',
  productDetailDimensions: '.dimensions, .product-dimensions, .specs-dimensions',
  productDetailPrice: '.product-price, .detail-price, [data-price]',
  productDetailOldPrice: '.old-price, .crossed-price',
  productDetailImages: '.product-gallery img, .gallery-image img, [data-gallery] img',
  productDetailSpecs: '.specifications, .technical-specs, .product-specs',
  productDetailBrand: '.product-brand, .brand-name',

  // Filters
  filterSection: '.filters, .facets, [data-filters]',
  filterCategory: '.filter-category, .facet-category',
  filterPrice: '.filter-price, .facet-price',
  filterBrand: '.filter-brand, .facet-brand',

  // Cookie banner (Castorama specific)
  cookieAccept:
    '#onetrust-accept-btn-handler, .cookie-accept, #didomi-notice-agree-button, [data-consent-accept]',

  // Pagination
  pagination: '.pagination, .pager',
  nextPage: '.pagination-next, .next, a[rel="next"]',
  loadMore: '.load-more, [data-load-more]',
};

// Kitchen categories at Castorama
const KITCHEN_CATEGORIES = {
  'meubles-cuisine': 'cabinet',
  'meubles-bas-cuisine': 'base',
  'meubles-hauts-cuisine': 'wall',
  'meubles-colonne-cuisine': 'tall',
  'meubles-angle-cuisine': 'corner',
  'facades-cuisine': 'facade',
  'portes-cuisine': 'facade',
  'plans-de-travail': 'worktop',
  'electromenager-cuisine': 'appliance',
  'eviers-cuisine': 'sink',
  'robinetterie-cuisine': 'faucet',
  'accessoires-cuisine': 'accessory',
};

// Product type mappings
const CABINET_TYPE_KEYWORDS: Record<string, CabinetType> = {
  'meuble bas': 'base_standard',
  'caisson bas': 'base_standard',
  'meuble sous-évier': 'base_sink',
  'sous évier': 'base_sink',
  'meuble plaque': 'base_hob',
  'meuble tiroir': 'base_drawer',
  'bloc tiroir': 'base_drawer',
  'meuble angle': 'base_corner',
  'meuble coulissant': 'base_pull_out',
  'meuble poubelle': 'base_trash',
  'meuble haut': 'wall_standard',
  'caisson haut': 'wall_standard',
  'meuble vitré': 'wall_glass',
  'meuble relevable': 'wall_lift_up',
  'meuble hotte': 'wall_extractor',
  colonne: 'tall_pantry',
  armoire: 'tall_pantry',
  'colonne four': 'tall_oven',
  'colonne réfrigérateur': 'tall_fridge',
  'colonne frigo': 'tall_fridge',
  plinthe: 'plinth',
  corniche: 'cornice',
  joue: 'filler',
  panneau: 'end_panel',
};

const FACADE_MATERIAL_KEYWORDS: Record<string, FacadeMaterial> = {
  mélaminé: 'melamine',
  stratifié: 'laminate',
  laqué: 'lacquer_matte',
  brillant: 'lacquer_gloss',
  mat: 'lacquer_matte',
  bois: 'veneer',
  chêne: 'veneer',
  verre: 'glass',
  pvc: 'laminate',
  polyester: 'laminate',
};

const WORKTOP_MATERIAL_KEYWORDS: Record<string, WorktopMaterial> = {
  stratifié: 'laminate',
  'bois massif': 'wood_solid',
  chêne: 'wood_solid',
  hêtre: 'wood_solid',
  quartz: 'quartz',
  granit: 'granite',
  marbre: 'marble',
  céramique: 'ceramic',
  compact: 'compact',
  inox: 'stainless',
  résine: 'compact',
  'béton ciré': 'concrete',
};

export class CastoramaScraper extends BaseScraper {
  private brandId: string;

  constructor(config: BrandScrapingConfig, options: Partial<ScraperOptions> = {}) {
    super(config, options);
    this.brandId = config.id;
  }

  /**
   * Get collection URLs from the main kitchen page
   */
  protected async getCollectionUrls(): Promise<string[]> {
    const urls: string[] = [];

    try {
      for (const catalogPath of this.config.catalogPaths) {
        const catalogUrl = this.resolveUrl(catalogPath);

        try {
          await this.navigateTo(catalogUrl, { waitUntil: 'networkidle2' });
          await this.acceptCookies();
          await this.humanWait(1500);

          const html = await this.getPageContent();
          const $ = this.parseHtml(html);

          // Find category/collection links
          $(SELECTORS.collectionLinks).each((_: number, el: cheerio.Element) => {
            const href = $(el).attr('href');
            if (href) {
              const fullUrl = this.resolveUrl(href);
              if (!urls.includes(fullUrl) && this.isKitchenUrl(fullUrl)) {
                urls.push(fullUrl);
              }
            }
          });

          // Look for subcategory links
          $(
            'a[href*="/cuisine/"], a[href*="/meubles-cuisine/"], a[href*="/plans-de-travail/"]'
          ).each((_: number, el: cheerio.Element) => {
            const href = $(el).attr('href');
            if (href && !href.includes('#') && !href.includes('javascript')) {
              const fullUrl = this.resolveUrl(href);
              if (!urls.includes(fullUrl) && this.isKitchenUrl(fullUrl)) {
                urls.push(fullUrl);
              }
            }
          });
        } catch (error) {
          this.logger.warn(`Failed to get collections from ${catalogPath}`, { error });
        }
      }

      // Add known kitchen category URLs if no URLs found
      if (urls.length === 0) {
        for (const category of Object.keys(KITCHEN_CATEGORIES)) {
          urls.push(this.resolveUrl(`/cuisine/${category}/`));
        }
      }

      this.logger.info(`Found ${urls.length} collection URLs`);
    } catch (error) {
      this.logger.error('Error getting collection URLs', { error });
    }

    return urls;
  }

  /**
   * Get product URLs from a category page
   */
  protected async getProductUrls(collectionUrl: string): Promise<string[]> {
    const urls: string[] = [];

    try {
      await this.navigateTo(collectionUrl, { waitUntil: 'networkidle2' });
      await this.humanWait(1000);

      // Scroll to load lazy-loaded products
      await this.loadAllProducts();

      const html = await this.getPageContent();
      const $ = this.parseHtml(html);

      // Find product links
      $(SELECTORS.productLink).each((_: number, el: cheerio.Element) => {
        const href = $(el).attr('href');
        if (href && this.isProductUrl(href)) {
          const fullUrl = this.resolveUrl(href);
          if (!urls.includes(fullUrl)) {
            urls.push(fullUrl);
          }
        }
      });

      // Also look for product links by pattern
      $('a[href*="/p/"], a[href*="/product/"], a[href*="-p-"]').each(
        (_: number, el: cheerio.Element) => {
          const href = $(el).attr('href');
          if (href) {
            const fullUrl = this.resolveUrl(href);
            if (!urls.includes(fullUrl)) {
              urls.push(fullUrl);
            }
          }
        }
      );

      // Handle pagination
      if (!this.options.testMode) {
        let hasNextPage = true;
        let currentPage = 1;
        const maxPages = 50;

        while (hasNextPage && currentPage < maxPages) {
          const nextLink = $(SELECTORS.nextPage).attr('href');
          if (nextLink) {
            currentPage++;
            await this.navigateTo(this.resolveUrl(nextLink), { waitUntil: 'networkidle2' });
            await this.humanWait(1000);

            const nextHtml = await this.getPageContent();
            const $next = this.parseHtml(nextHtml);

            $next(SELECTORS.productLink).each((_: number, el: cheerio.Element) => {
              const href = $next(el).attr('href');
              if (href && this.isProductUrl(href)) {
                const fullUrl = this.resolveUrl(href);
                if (!urls.includes(fullUrl)) {
                  urls.push(fullUrl);
                }
              }
            });

            hasNextPage = $next(SELECTORS.nextPage).length > 0;
          } else {
            hasNextPage = false;
          }
        }
      }

      this.logger.info(`Found ${urls.length} product URLs in category`);
    } catch (error) {
      this.logger.error('Error getting product URLs', { error, collectionUrl });
    }

    return urls;
  }

  /**
   * Scrape collection/category information
   */
  protected async scrapeCollection(url: string): Promise<CreateCollectionInput | null> {
    try {
      const html = await this.getPageContent();
      const $ = this.parseHtml(html);

      const name =
        this.extractText($(SELECTORS.collectionTitle)) || this.extractCategoryFromUrl(url);
      const slug = this.slugify(name);

      const description =
        this.extractText($(SELECTORS.collectionDescription)) ||
        $('meta[name="description"]').attr('content');

      const images: string[] = [];
      $(SELECTORS.collectionImage).each((_: number, el: cheerio.Element) => {
        const src = $(el).attr('src') || $(el).attr('data-src');
        if (src) {
          images.push(this.resolveUrl(src));
        }
      });

      return {
        brandId: this.brandId,
        name,
        slug,
        description,
        isActive: true,
        launchYear: new Date().getFullYear(),
        images,
        url,
      };
    } catch (error) {
      this.logger.error('Error scraping collection', { url, error });
      return null;
    }
  }

  /**
   * Scrape a single product
   */
  protected async scrapeProduct(url: string): Promise<ScrapedProduct | null> {
    try {
      await this.navigateTo(url, { waitUntil: 'networkidle2' });
      await this.humanWait(1500);

      const html = await this.getPageContent();
      const $ = this.parseHtml(html);

      const name = this.extractText($(SELECTORS.productDetailName));
      if (!name) {
        this.logger.warn('Could not extract product name', { url });
        return null;
      }

      // Determine product type from URL and name
      const productType = this.detectProductType(url, name, html);

      switch (productType) {
        case 'cabinet':
          return this.scrapeCabinet($, url, name);
        case 'worktop':
          return this.scrapeWorktop($, url, name);
        case 'facade':
          return this.scrapeFacade($, url, name);
        case 'appliance':
          return this.scrapeAppliance($, url, name);
        default:
          return this.scrapeCabinet($, url, name);
      }
    } catch (error) {
      this.logger.error('Error scraping product', { url, error });
      return null;
    }
  }

  /**
   * Scrape cabinet product
   */
  private scrapeCabinet(
    $: ReturnType<typeof this.parseHtml>,
    url: string,
    name: string
  ): ScrapedProduct {
    const reference =
      this.extractText($(SELECTORS.productDetailRef)) ||
      this.extractReferenceFromUrl(url) ||
      this.generateReference(url, 'CASTO');
    const description = this.extractText($(SELECTORS.productDetailDescription));
    const priceStr = this.extractText($(SELECTORS.productDetailPrice));
    const oldPriceStr = this.extractText($(SELECTORS.productDetailOldPrice));
    const dimensionsStr = this.extractText($(SELECTORS.productDetailDimensions));

    const dimensions = this.parseDimensions(dimensionsStr);
    const type = this.detectCabinetType(name + ' ' + description);
    const category = this.detectCabinetCategory(type);

    const images: string[] = [];
    $(SELECTORS.productDetailImages).each((_: number, el: cheerio.Element) => {
      const src = $(el).attr('src') || $(el).attr('data-src');
      if (src && !src.includes('placeholder')) {
        images.push(this.resolveUrl(src));
      }
    });

    const specs = this.parseSpecifications($) as {
      width?: number;
      height?: number;
      depth?: number;
      doors?: number;
      drawers?: number;
      shelves?: number;
      material?: string;
      color?: string;
    };

    const cabinet: CreateCabinetInput = {
      brandId: this.brandId,
      name,
      reference,
      description: description || undefined,
      type,
      category,
      width: dimensions.width ?? specs.width ?? 600,
      height: dimensions.height ?? specs.height ?? 720,
      depth: dimensions.depth ?? specs.depth ?? 560,
      doors: specs.doors ?? 0,
      drawers: specs.drawers ?? 0,
      shelves: specs.shelves ?? 0,
      priceHT: undefined,
      priceTTC: this.parsePrice(priceStr),
      priceType: 'fixed',
      imageMain: images[0],
      imageThumbnails: images.slice(1),
      url,
      tags: this.generateTags(name, type, category),
    };

    return { type: 'cabinet', data: cabinet };
  }

  /**
   * Scrape worktop product
   */
  private scrapeWorktop(
    $: ReturnType<typeof this.parseHtml>,
    url: string,
    name: string
  ): ScrapedProduct {
    const reference =
      this.extractText($(SELECTORS.productDetailRef)) || this.generateReference(url, 'CASTO-W');
    const description = this.extractText($(SELECTORS.productDetailDescription));
    const priceStr = this.extractText($(SELECTORS.productDetailPrice));

    const material = this.detectWorktopMaterial(name + ' ' + description);
    const finish = this.detectWorktopFinish(name + ' ' + description);
    const thickness = this.extractThickness(name + ' ' + description);

    const images: string[] = [];
    $(SELECTORS.productDetailImages).each((_: number, el: cheerio.Element) => {
      const src = $(el).attr('src') || $(el).attr('data-src');
      if (src && !src.includes('placeholder')) {
        images.push(this.resolveUrl(src));
      }
    });

    const worktop: CreateWorktopInput = {
      brandId: this.brandId,
      name,
      reference,
      description: description || undefined,
      material,
      thicknesses: thickness ? [thickness] : [28, 38],
      depths: [600, 650],
      finishes: [finish as WorktopFinish],
      pricePerMeter: this.parsePrice(priceStr),
      priceType: 'fixed',
      images,
      url,
    };

    return { type: 'worktop', data: worktop };
  }

  /**
   * Scrape facade product
   */
  private scrapeFacade(
    $: ReturnType<typeof this.parseHtml>,
    url: string,
    name: string
  ): ScrapedProduct {
    const reference =
      this.extractText($(SELECTORS.productDetailRef)) || this.generateReference(url, 'CASTO-F');
    const description = this.extractText($(SELECTORS.productDetailDescription));
    const priceStr = this.extractText($(SELECTORS.productDetailPrice));

    const style = this.detectFacadeStyle(name + ' ' + description);
    const material = this.detectFacadeMaterial(name + ' ' + description);

    const images: string[] = [];
    $(SELECTORS.productDetailImages).each((_: number, el: cheerio.Element) => {
      const src = $(el).attr('src') || $(el).attr('data-src');
      if (src && !src.includes('placeholder')) {
        images.push(this.resolveUrl(src));
      }
    });

    const facade: CreateFacadeInput = {
      brandId: this.brandId,
      name,
      reference,
      description: description || undefined,
      type: 'door',
      style,
      material,
      finishes: ['matte'],
      colors: [],
      priceType: 'fixed',
      images,
      url,
    };

    return { type: 'facade', data: facade };
  }

  /**
   * Scrape appliance product
   */
  private scrapeAppliance(
    $: ReturnType<typeof this.parseHtml>,
    url: string,
    name: string
  ): ScrapedProduct {
    const reference =
      this.extractText($(SELECTORS.productDetailRef)) || this.generateReference(url, 'CASTO-A');
    const description = this.extractText($(SELECTORS.productDetailDescription));
    const priceStr = this.extractText($(SELECTORS.productDetailPrice));
    const brand = this.extractText($(SELECTORS.productDetailBrand));
    const dimensionsStr = this.extractText($(SELECTORS.productDetailDimensions));

    const dimensions = this.parseDimensions(dimensionsStr);
    const applianceType = this.detectApplianceType(name);

    const images: string[] = [];
    $(SELECTORS.productDetailImages).each((_: number, el: cheerio.Element) => {
      const src = $(el).attr('src') || $(el).attr('data-src');
      if (src && !src.includes('placeholder')) {
        images.push(this.resolveUrl(src));
      }
    });

    const appliance: CreateApplianceInput = {
      brandId: this.brandId,
      manufacturerBrand: brand || 'Unknown',
      name,
      reference,
      description: description || undefined,
      type: applianceType,
      width: dimensions.width || 600,
      height: dimensions.height || 600,
      depth: dimensions.depth || 600,
      priceTTC: this.parsePrice(priceStr),
      priceType: 'fixed',
      images,
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
    const maxAttempts = 15;

    while (attempts < maxAttempts) {
      const currentHeight = await this.page.evaluate(() => document.body.scrollHeight);

      if (currentHeight === previousHeight) {
        // Try clicking "Load more" button
        const clicked = await this.clickElement(SELECTORS.loadMore);
        if (!clicked) break;
      }

      previousHeight = currentHeight;
      await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await this.humanWait(1500);
      attempts++;
    }
  }

  private isKitchenUrl(url: string): boolean {
    const kitchenKeywords = ['cuisine', 'kitchen', 'meuble', 'plan-de-travail', 'electromenager'];
    return kitchenKeywords.some((kw) => url.toLowerCase().includes(kw));
  }

  private isProductUrl(url: string): boolean {
    return url.includes('/p/') || url.includes('/product/') || url.includes('-p-');
  }

  private extractCategoryFromUrl(url: string): string {
    const pathMatch = url.match(/\/cuisine\/([^\/]+)/);
    if (pathMatch?.[1]) {
      return pathMatch[1].replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    }
    return 'Cuisine';
  }

  private extractReferenceFromUrl(url: string): string | null {
    // Try to extract product reference from URL patterns
    const patterns = [/-p-(\d+)/, /\/p\/(\d+)/, /product\/(\d+)/, /ref[_-]?(\d+)/i];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match?.[1]) {
        return match[1];
      }
    }

    return null;
  }

  private detectProductType(url: string, name: string, html: string): string {
    const combined = (url + ' ' + name + ' ' + html).toLowerCase();

    if (
      combined.includes('plan-de-travail') ||
      combined.includes('plan de travail') ||
      combined.includes('worktop')
    ) {
      return 'worktop';
    }
    if (
      combined.includes('facade') ||
      combined.includes('porte-cuisine') ||
      combined.includes('porte de cuisine')
    ) {
      return 'facade';
    }
    if (
      combined.includes('electromenager') ||
      combined.includes('four') ||
      combined.includes('hotte') ||
      combined.includes('refrigerateur') ||
      combined.includes('lave-vaisselle') ||
      combined.includes('plaque')
    ) {
      return 'appliance';
    }
    if (
      combined.includes('meuble') ||
      combined.includes('caisson') ||
      combined.includes('colonne')
    ) {
      return 'cabinet';
    }

    return 'cabinet';
  }

  private detectCabinetType(text: string): CabinetType {
    const lowerText = text.toLowerCase();

    for (const [keyword, type] of Object.entries(CABINET_TYPE_KEYWORDS)) {
      if (lowerText.includes(keyword)) {
        return type;
      }
    }

    return 'base_standard';
  }

  private detectCabinetCategory(type: CabinetType): CabinetCategory {
    if (type.startsWith('base_')) return 'base';
    if (type.startsWith('wall_')) return 'wall';
    if (type.startsWith('tall_')) return 'tall';
    if (type.startsWith('island_')) return 'island';
    if (type.includes('corner')) return 'corner';
    return 'base';
  }

  private detectFacadeStyle(text: string): FacadeStyle {
    const lower = text.toLowerCase();

    if (lower.includes('moderne') || lower.includes('contemporain') || lower.includes('lisse'))
      return 'flat';
    if (lower.includes('shaker') || lower.includes('encadré')) return 'shaker';
    if (lower.includes('classique') || lower.includes('traditionnel')) return 'classic';
    if (lower.includes('sans poignée') || lower.includes('poignée intégrée')) return 'handleless';

    return 'flat';
  }

  private detectFacadeMaterial(text: string): FacadeMaterial {
    const lower = text.toLowerCase();

    for (const [keyword, material] of Object.entries(FACADE_MATERIAL_KEYWORDS)) {
      if (lower.includes(keyword)) {
        return material;
      }
    }

    return 'melamine';
  }

  private detectWorktopMaterial(text: string): WorktopMaterial {
    const lower = text.toLowerCase();

    for (const [keyword, material] of Object.entries(WORKTOP_MATERIAL_KEYWORDS)) {
      if (lower.includes(keyword)) {
        return material;
      }
    }

    return 'laminate';
  }

  private detectWorktopFinish(text: string): string {
    const lower = text.toLowerCase();

    if (lower.includes('mat')) return 'matte';
    if (lower.includes('brillant') || lower.includes('gloss')) return 'polished';
    if (lower.includes('satiné')) return 'satin';
    if (lower.includes('brossé')) return 'brushed';
    if (lower.includes('texturé')) return 'textured';

    return 'matte';
  }

  private extractThickness(text: string): number | undefined {
    const match = text.match(/(\d+)\s*(?:mm|cm)/);
    if (match?.[1]) {
      let value = parseInt(match[1], 10);
      if (text.includes('cm') && value < 10) value *= 10;
      return value;
    }
    return undefined;
  }

  private detectApplianceType(name: string): ApplianceType {
    const lower = name.toLowerCase();

    if (lower.includes('four')) return 'oven_single';
    if (lower.includes('micro-onde')) return 'microwave';
    if (lower.includes('réfrigérateur') || lower.includes('frigo')) return 'fridge_integrated';
    if (lower.includes('congélateur')) return 'freezer';
    if (lower.includes('lave-vaisselle')) return 'dishwasher_full';
    if (lower.includes('plaque') || lower.includes('cuisson')) return 'hob_induction';
    if (lower.includes('hotte')) return 'hood_integrated';
    if (lower.includes('évier')) return 'sink_single';
    if (lower.includes('robinet') || lower.includes('mitigeur')) return 'tap_standard';

    return 'oven_single';
  }

  private parseSpecifications($: ReturnType<typeof this.parseHtml>): Record<string, unknown> {
    const specs: Record<string, unknown> = {};

    $(SELECTORS.productDetailSpecs)
      .find('tr, .spec-row, .spec-item, li')
      .each((_: number, row: cheerio.Element) => {
        const $row = $(row);
        const label = $row.find('th, .label, .spec-label, dt').text().toLowerCase().trim();
        const value = $row.find('td, .value, .spec-value, dd').text().trim();

        if (label && value) {
          if (label.includes('largeur') || label.includes('width')) {
            specs.width = this.parseNumber(value);
          } else if (label.includes('hauteur') || label.includes('height')) {
            specs.height = this.parseNumber(value);
          } else if (label.includes('profondeur') || label.includes('depth')) {
            specs.depth = this.parseNumber(value);
          } else if (label.includes('porte') || label.includes('door')) {
            specs.doors = this.parseNumber(value);
          } else if (label.includes('tiroir') || label.includes('drawer')) {
            specs.drawers = this.parseNumber(value);
          } else if (label.includes('étagère') || label.includes('shelf')) {
            specs.shelves = this.parseNumber(value);
          } else if (label.includes('matière') || label.includes('material')) {
            specs.material = value;
          } else if (label.includes('couleur') || label.includes('color')) {
            specs.color = value;
          }
        }
      });

    return specs;
  }

  private parseNumber(str: string): number {
    const match = str.match(/[\d,]+/);
    if (match) {
      return parseInt(match[0].replace(',', ''), 10);
    }
    return 0;
  }

  private generateTags(name: string, type: CabinetType, category: CabinetCategory): string[] {
    const tags: string[] = [category, type.replace('_', ' ')];

    const lower = name.toLowerCase();
    if (lower.includes('blanc')) tags.push('blanc', 'white');
    if (lower.includes('noir')) tags.push('noir', 'black');
    if (lower.includes('gris')) tags.push('gris', 'grey');
    if (lower.includes('bois')) tags.push('bois', 'wood');
    if (lower.includes('chêne')) tags.push('chêne', 'oak');
    if (lower.includes('noyer')) tags.push('noyer', 'walnut');

    return [...new Set(tags)];
  }
}

export default CastoramaScraper;
