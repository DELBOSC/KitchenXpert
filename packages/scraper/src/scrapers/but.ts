/**
 * But Scraper
 *
 * Scraper for But kitchen products (French furniture retailer)
 * Entry-level pricing segment
 *
 * Website: https://www.but.fr
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

// CSS Selectors for But website
const SELECTORS = {
  // Navigation & Collections
  categoryNav: '.category-menu, .nav-categories, [data-nav-category]',
  collectionLinks: '.category-tile a, .subcategory-link, .kitchen-category a',
  collectionTitle: '.category-header h1, h1.page-title, .category-title',
  collectionDescription: '.category-description, .intro-text, .seo-content',
  collectionImage: '.category-banner img, .hero-image img, .category-hero img',

  // Product listing
  productGrid: '.product-list, .products-grid, [data-products]',
  productCard: '.product-card, .product-tile, [data-product-id]',
  productLink: '.product-card a, .product-link, .product-tile a',
  productName: '.product-name, .product-title, h3.name',
  productPrice: '.product-price, .price, .current-price',
  productOldPrice: '.old-price, .crossed-price, .original-price',
  productImage: '.product-image img, .product-thumbnail img',
  productBadge: '.product-badge, .promo-badge, .discount-tag',

  // Product detail page
  productDetailName: 'h1.product-title, h1.product-name, [data-product-title]',
  productDetailRef: '.product-ref, .reference, .sku, [data-sku]',
  productDetailDescription: '.product-description, .description, .product-details',
  productDetailDimensions: '.dimensions, .product-dimensions, .specs',
  productDetailPrice: '.product-price, .price-value, [data-price]',
  productDetailOldPrice: '.old-price, .original-price',
  productDetailImages: '.product-gallery img, .gallery-images img, [data-gallery] img',
  productDetailSpecs: '.specifications, .technical-specs, .product-specs, .caracteristiques',
  productDetailBrand: '.product-brand, .brand',
  productDetailDelivery: '.delivery-info, .shipping-info',
  productDetailStock: '.stock-status, .availability',

  // Cookie banner
  cookieAccept: '#onetrust-accept-btn-handler, .cookie-accept, #didomi-notice-agree-button, .accept-cookies',

  // Pagination
  pagination: '.pagination, .pager',
  nextPage: '.pagination-next, .next, a[rel="next"], .btn-next',
  loadMore: '.load-more, .btn-load-more, [data-load-more]',
};

// Kitchen categories at But
const KITCHEN_CATEGORIES = {
  'meubles-cuisine': 'cabinet',
  'elements-bas': 'base',
  'elements-hauts': 'wall',
  'colonnes': 'tall',
  'facades-portes': 'facade',
  'plans-de-travail': 'worktop',
  'electromenager': 'appliance',
  'eviers-robinetterie': 'sink',
  'rangements-cuisine': 'accessory',
  'cuisines-completes': 'collection',
};

// Product type mappings
const CABINET_TYPE_KEYWORDS: Record<string, CabinetType> = {
  'meuble bas': 'base_standard',
  'element bas': 'base_standard',
  'caisson bas': 'base_standard',
  'sous-évier': 'base_sink',
  'sous evier': 'base_sink',
  'évier': 'base_sink',
  'plaque': 'base_hob',
  'tiroir': 'base_drawer',
  'tiroirs': 'base_drawer',
  'angle bas': 'base_corner',
  'meuble angle': 'base_corner',
  'coulissant': 'base_pull_out',
  'poubelle': 'base_trash',
  'meuble haut': 'wall_standard',
  'element haut': 'wall_standard',
  'caisson haut': 'wall_standard',
  'vitré': 'wall_glass',
  'vitre': 'wall_glass',
  'relevable': 'wall_lift_up',
  'hotte': 'wall_extractor',
  'colonne': 'tall_pantry',
  'armoire': 'tall_pantry',
  'colonne four': 'tall_oven',
  'colonne frigo': 'tall_fridge',
  'réfrigérateur': 'tall_fridge',
  'plinthe': 'plinth',
  'corniche': 'cornice',
  'joue': 'filler',
  'panneau': 'end_panel',
};

const FACADE_MATERIAL_KEYWORDS: Record<string, FacadeMaterial> = {
  'mélaminé': 'melamine',
  'melamine': 'melamine',
  'stratifié': 'laminate',
  'laqué': 'lacquer_matte',
  'laque': 'lacquer_matte',
  'brillant': 'lacquer_gloss',
  'mat': 'lacquer_matte',
  'bois': 'veneer',
  'chêne': 'veneer',
  'pvc': 'laminate',
  'foil': 'laminate',
};

const WORKTOP_MATERIAL_KEYWORDS: Record<string, WorktopMaterial> = {
  'stratifié': 'laminate',
  'mélaminé': 'laminate',
  'bois massif': 'wood_solid',
  'bois': 'wood_solid',
  'chêne': 'wood_solid',
  'quartz': 'quartz',
  'granit': 'granite',
  'résine': 'compact',
  'compact': 'compact',
  'effet pierre': 'laminate',
  'effet bois': 'laminate',
  'effet béton': 'laminate',
};

export class ButScraper extends BaseScraper {
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
          $('a[href*="/cuisine/"], a[href*="/meubles-cuisine/"]').each((_: number, el: cheerio.Element) => {
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

      // Look for product links by URL pattern
      $('a[href*="/produit/"], a[href*="-p-"], a[href*="/p/"]').each((_: number, el: cheerio.Element) => {
        const href = $(el).attr('href');
        if (href) {
          const fullUrl = this.resolveUrl(href);
          if (!urls.includes(fullUrl)) {
            urls.push(fullUrl);
          }
        }
      });

      // Handle pagination
      if (!this.options.testMode) {
        let hasNextPage = true;
        let currentPage = 1;
        const maxPages = 30;

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

      const name = this.extractText($(SELECTORS.collectionTitle)) ||
                   this.extractCategoryFromUrl(url);
      const slug = this.slugify(name);

      const description = this.extractText($(SELECTORS.collectionDescription)) ||
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
    const reference = this.extractText($(SELECTORS.productDetailRef)) ||
                     this.extractReferenceFromUrl(url) ||
                     this.generateReference(url, 'BUT');
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

    const specs = this.parseSpecifications($) as { width?: number; height?: number; depth?: number; doors?: number; drawers?: number; shelves?: number; material?: string; color?: string };

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
    const reference = this.extractText($(SELECTORS.productDetailRef)) ||
                     this.generateReference(url, 'BUT-W');
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
      depths: [600],
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
    const reference = this.extractText($(SELECTORS.productDetailRef)) ||
                     this.generateReference(url, 'BUT-F');
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
    const reference = this.extractText($(SELECTORS.productDetailRef)) ||
                     this.generateReference(url, 'BUT-A');
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
    const maxAttempts = 10;

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
    const kitchenKeywords = ['cuisine', 'meuble', 'plan-de-travail', 'electromenager', 'evier'];
    return kitchenKeywords.some((kw) => url.toLowerCase().includes(kw));
  }

  private isProductUrl(url: string): boolean {
    return url.includes('/produit/') || url.includes('-p-') || url.includes('/p/') ||
           url.match(/\/\d+-/) !== null;
  }

  private extractCategoryFromUrl(url: string): string {
    const pathMatch = url.match(/\/cuisine\/([^\/]+)/);
    if (pathMatch?.[1]) {
      return pathMatch[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    return 'Cuisine';
  }

  private extractReferenceFromUrl(url: string): string | null {
    const patterns = [
      /-p-(\d+)/,
      /\/p\/(\d+)/,
      /\/(\d+)-/,
      /ref[_-]?(\d+)/i,
    ];

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

    if (combined.includes('plan-de-travail') || combined.includes('plan de travail')) {
      return 'worktop';
    }
    if (combined.includes('facade') || combined.includes('porte-cuisine') || combined.includes('porte de meuble')) {
      return 'facade';
    }
    if (combined.includes('electromenager') || combined.includes('four') || combined.includes('hotte') ||
        combined.includes('refrigerateur') || combined.includes('lave-vaisselle') || combined.includes('plaque')) {
      return 'appliance';
    }
    if (combined.includes('meuble') || combined.includes('caisson') || combined.includes('colonne') ||
        combined.includes('element')) {
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

    if (lower.includes('moderne') || lower.includes('contemporain') || lower.includes('lisse')) return 'flat';
    if (lower.includes('shaker') || lower.includes('encadré') || lower.includes('cadre')) return 'shaker';
    if (lower.includes('classique') || lower.includes('traditionnel')) return 'classic';
    if (lower.includes('sans poignée')) return 'handleless';
    if (lower.includes('rustique') || lower.includes('campagne')) return 'rustic';

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

    $(SELECTORS.productDetailSpecs).find('tr, .spec-row, .spec-item, li, dl').each((_: number, row: cheerio.Element) => {
      const $row = $(row);
      const label = $row.find('th, .label, dt, .spec-label').text().toLowerCase().trim();
      const value = $row.find('td, .value, dd, .spec-value').text().trim();

      if (label && value) {
        if (label.includes('largeur') || label.includes('width') || label.includes('l (cm)')) {
          specs.width = this.parseNumber(value);
        } else if (label.includes('hauteur') || label.includes('height') || label.includes('h (cm)')) {
          specs.height = this.parseNumber(value);
        } else if (label.includes('profondeur') || label.includes('depth') || label.includes('p (cm)')) {
          specs.depth = this.parseNumber(value);
        } else if (label.includes('porte') || label.includes('door')) {
          specs.doors = this.parseNumber(value);
        } else if (label.includes('tiroir') || label.includes('drawer')) {
          specs.drawers = this.parseNumber(value);
        } else if (label.includes('étagère') || label.includes('tablette') || label.includes('shelf')) {
          specs.shelves = this.parseNumber(value);
        } else if (label.includes('matière') || label.includes('material') || label.includes('matériau')) {
          specs.material = value;
        } else if (label.includes('couleur') || label.includes('color') || label.includes('coloris')) {
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
    const tags: string[] = [category, type.replace('_', ' '), 'but', 'entry-level'];

    const lower = name.toLowerCase();
    if (lower.includes('blanc')) tags.push('blanc', 'white');
    if (lower.includes('noir')) tags.push('noir', 'black');
    if (lower.includes('gris')) tags.push('gris', 'grey');
    if (lower.includes('bois')) tags.push('bois', 'wood');
    if (lower.includes('chêne')) tags.push('chêne', 'oak');
    if (lower.includes('promo')) tags.push('promo', 'promotion');

    return [...new Set(tags)];
  }
}

export default ButScraper;
