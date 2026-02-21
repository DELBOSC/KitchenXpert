/**
 * Schmidt Scraper
 *
 * Scraper for Schmidt Cuisines (home-design.schmidt)
 * Part of Schmidt Groupe (leader français)
 *
 * Note: This scraper needs to be adapted based on actual site structure.
 * Run in test mode first to verify selectors.
 */

import * as cheerio from 'cheerio';
import { BaseScraper, ScrapedProduct, ScraperOptions } from './base-scraper.js';
import type { BrandScrapingConfig } from '../config/brands.config.js';
import type { CreateCabinetInput, CabinetType, CabinetCategory } from '../models/cabinet.js';
import type { CreateFacadeInput, FacadeStyle, FacadeMaterial } from '../models/facade.js';
import type { CreateWorktopInput, WorktopMaterial } from '../models/worktop.js';
import type { CreateCollectionInput } from '../models/collection.js';

// CSS Selectors for Schmidt website
// These need to be verified and updated based on actual site structure
const SELECTORS = {
  // Navigation & Collections
  collectionsMenu: '.nav-cuisines, .menu-cuisines, [data-nav="cuisines"]',
  collectionLinks: '.collection-card a, .cuisine-model a, .model-link',
  collectionTitle: '.collection-title, .model-name, h1.title',
  collectionDescription: '.collection-description, .model-description, .description',
  collectionImage: '.collection-hero img, .model-image img, .hero-image',

  // Product listing
  productGrid: '.products-grid, .cabinets-list, .product-listing',
  productCard: '.product-card, .cabinet-card, .item-card',
  productLink: '.product-card a, .cabinet-card a, .item-link',
  productName: '.product-name, .cabinet-name, .item-title',
  productPrice: '.product-price, .price, .prix',
  productImage: '.product-image img, .thumbnail img',

  // Product detail page
  productDetailName: 'h1.product-title, h1.cabinet-name, .detail-title',
  productDetailRef: '.product-reference, .reference, .sku',
  productDetailDescription: '.product-description, .description-text',
  productDetailDimensions: '.dimensions, .product-dimensions, .specs-dimensions',
  productDetailPrice: '.detail-price, .product-price-detail',
  productDetailImages: '.product-gallery img, .detail-images img',
  productDetailSpecs: '.specifications, .product-specs, .technical-specs',

  // Facade/Finish selectors
  facadeSection: '.finishes, .facades, .door-styles',
  facadeCard: '.finish-card, .facade-card, .door-style',
  facadeName: '.finish-name, .facade-name',
  facadeColor: '.color-swatch, .color-option',

  // Worktop selectors
  worktopSection: '.worktops, .plans-de-travail',
  worktopCard: '.worktop-card, .plan-card',
  worktopMaterial: '.material-type, .material-name',

  // Cookie banner
  cookieAccept: '#onetrust-accept-btn-handler, .cookie-accept, [data-accept-cookies]',

  // Pagination
  pagination: '.pagination, .pager',
  nextPage: '.pagination-next, .next-page, a[rel="next"]',
};

// Product type mappings
const CABINET_TYPE_KEYWORDS: Record<string, CabinetType> = {
  // Base cabinets
  'meuble bas': 'base_standard',
  'caisson bas': 'base_standard',
  'sous-évier': 'base_sink',
  'sous évier': 'base_sink',
  'sous-plaque': 'base_hob',
  'tiroir': 'base_drawer',
  'tiroirs': 'base_drawer',
  'angle bas': 'base_corner',
  'meuble angle': 'base_corner',
  'coulissant': 'base_pull_out',
  'poubelle': 'base_trash',
  'bouteilles': 'base_bottle',

  // Wall cabinets
  'meuble haut': 'wall_standard',
  'caisson haut': 'wall_standard',
  'haut vitré': 'wall_glass',
  'relevable': 'wall_lift_up',
  'lift': 'wall_lift_up',
  'angle haut': 'wall_corner',
  'hotte': 'wall_extractor',
  'ouvert': 'wall_open',

  // Tall cabinets
  'colonne': 'tall_pantry',
  'armoire': 'tall_pantry',
  'four': 'tall_oven',
  'réfrigérateur': 'tall_fridge',
  'frigo': 'tall_fridge',
  'balai': 'tall_broom',

  // Other
  'plinthe': 'plinth',
  'corniche': 'cornice',
  'joue': 'filler',
  'panneau': 'end_panel',
  'îlot': 'island_base',
  'ilot': 'island_base',
};

const FACADE_STYLE_KEYWORDS: Record<string, FacadeStyle> = {
  'moderne': 'flat',
  'contemporain': 'flat',
  'plat': 'flat',
  'lisse': 'flat',
  'shaker': 'shaker',
  'encadré': 'shaker',
  'cadre': 'shaker',
  'classique': 'classic',
  'traditionnel': 'classic',
  'moulure': 'classic',
  'sans poignée': 'handleless',
  'prise de main': 'handleless',
  'gorge': 'handleless',
  'rustique': 'rustic',
  'campagne': 'rustic',
  'cannelé': 'beaded',
  'rainuré': 'beaded',
};

const FACADE_MATERIAL_KEYWORDS: Record<string, FacadeMaterial> = {
  'mélaminé': 'melamine',
  'stratifié': 'laminate',
  'laqué mat': 'lacquer_matte',
  'laqué satiné': 'lacquer_satin',
  'laqué brillant': 'lacquer_gloss',
  'laque': 'lacquer_matte',
  'acrylique': 'acrylic',
  'pet': 'pet',
  'placage': 'veneer',
  'bois massif': 'solid_wood',
  'chêne': 'veneer',
  'noyer': 'veneer',
  'verre': 'glass',
  'fenix': 'fenix',
  'céramique': 'ceramic',
};

const WORKTOP_MATERIAL_KEYWORDS: Record<string, WorktopMaterial> = {
  'stratifié': 'laminate',
  'mélaminé': 'laminate',
  'bois massif': 'wood_solid',
  'chêne': 'wood_solid',
  'hêtre': 'wood_solid',
  'quartz': 'quartz',
  'silestone': 'quartz',
  'granit': 'granite',
  'marbre': 'marble',
  'céramique': 'ceramic',
  'dekton': 'compact',
  'compact': 'compact',
  'inox': 'stainless',
  'béton': 'concrete',
  'corian': 'corian',
  'verre': 'glass',
};

export class SchmidtScraper extends BaseScraper {
  private brandId: string;

  constructor(config: BrandScrapingConfig, options: Partial<ScraperOptions> = {}) {
    super(config, options);
    this.brandId = config.id;
  }

  /**
   * Get collection URLs from the main page
   */
  protected async getCollectionUrls(): Promise<string[]> {
    const urls: string[] = [];

    try {
      // Navigate to main cuisines page
      for (const catalogPath of this.config.catalogPaths) {
        const catalogUrl = this.resolveUrl(catalogPath);

        try {
          await this.navigateTo(catalogUrl);
          const html = await this.getPageContent();
          const $ = this.parseHtml(html);

          // Find collection links
          $(SELECTORS.collectionLinks).each((_: number, el: cheerio.Element) => {
            const href = $(el).attr('href');
            if (href) {
              const fullUrl = this.resolveUrl(href);
              if (!urls.includes(fullUrl)) {
                urls.push(fullUrl);
              }
            }
          });

          // Also look for direct product category links
          $('a[href*="/cuisine"], a[href*="/modele"], a[href*="/collection"]').each((_: number, el: cheerio.Element) => {
            const href = $(el).attr('href');
            if (href && !href.includes('#') && !href.includes('javascript')) {
              const fullUrl = this.resolveUrl(href);
              if (!urls.includes(fullUrl) && fullUrl.includes(this.config.website)) {
                urls.push(fullUrl);
              }
            }
          });
        } catch (error) {
          this.logger.warn(`Failed to get collections from ${catalogPath}`, { error });
        }
      }

      // If no collections found, try alternative approach
      if (urls.length === 0) {
        this.logger.warn('No collection URLs found with primary selectors, trying alternatives');
        await this.navigateTo(this.config.website);
        const html = await this.getPageContent();
        const $ = this.parseHtml(html);

        // Look for any internal links that might be collections
        $('a[href]').each((_: number, el: cheerio.Element) => {
          const href = $(el).attr('href');
          const text = $(el).text().toLowerCase();

          if (href &&
              (text.includes('cuisine') || text.includes('modèle') || text.includes('collection')) &&
              !href.includes('#') && !href.includes('javascript')) {
            const fullUrl = this.resolveUrl(href);
            if (!urls.includes(fullUrl) && fullUrl.includes(this.config.website)) {
              urls.push(fullUrl);
            }
          }
        });
      }

      this.logger.info(`Found ${urls.length} collection URLs`);
    } catch (error) {
      this.logger.error('Error getting collection URLs', { error });
    }

    return urls;
  }

  /**
   * Get product URLs from a collection page
   */
  protected async getProductUrls(collectionUrl: string): Promise<string[]> {
    const urls: string[] = [];

    try {
      await this.navigateTo(collectionUrl);
      const html = await this.getPageContent();
      const $ = this.parseHtml(html);

      // Find product links
      $(SELECTORS.productLink).each((_: number, el: cheerio.Element) => {
        const href = $(el).attr('href');
        if (href) {
          const fullUrl = this.resolveUrl(href);
          if (!urls.includes(fullUrl)) {
            urls.push(fullUrl);
          }
        }
      });

      // Handle pagination
      let hasNextPage = true;
      while (hasNextPage && !this.options.testMode) {
        const nextPageLink = $(SELECTORS.nextPage).attr('href');
        if (nextPageLink && !urls.includes(this.resolveUrl(nextPageLink))) {
          await this.navigateTo(this.resolveUrl(nextPageLink));
          const nextHtml = await this.getPageContent();
          const $next = this.parseHtml(nextHtml);

          $next(SELECTORS.productLink).each((_: number, el: cheerio.Element) => {
            const href = $next(el).attr('href');
            if (href) {
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

      this.logger.info(`Found ${urls.length} product URLs in collection`);
    } catch (error) {
      this.logger.error('Error getting product URLs', { error, collectionUrl });
    }

    return urls;
  }

  /**
   * Scrape collection information
   */
  protected async scrapeCollection(url: string): Promise<CreateCollectionInput | null> {
    try {
      await this.navigateTo(url);
      const html = await this.getPageContent();
      const $ = this.parseHtml(html);

      const name = this.extractText($(SELECTORS.collectionTitle)) || this.generateReference(url);
      const slug = this.slugify(name);

      // Extract main image
      const images: string[] = [];
      $(SELECTORS.collectionImage).each((_: number, el: cheerio.Element) => {
        const src = $(el).attr('src') || $(el).attr('data-src');
        if (src) {
          images.push(this.resolveUrl(src));
        }
      });

      const collection: CreateCollectionInput = {
        brandId: this.brandId,
        name,
        slug,
        description: this.extractText($(SELECTORS.collectionDescription)) || undefined,
        style: this.detectStyle(name + ' ' + (this.extractText($(SELECTORS.collectionDescription)) || '')),
        images,
        url,
        isActive: true,
        isFeatured: false,
      };

      this.logger.debug('Scraped collection', { name: collection.name });
      return collection;
    } catch (error) {
      this.logger.error('Error scraping collection', { error, url });
      return null;
    }
  }

  /**
   * Scrape a single product
   */
  protected async scrapeProduct(url: string): Promise<ScrapedProduct | null> {
    try {
      await this.navigateTo(url);
      const html = await this.getPageContent();
      const $ = this.parseHtml(html);

      const name = this.extractText($(SELECTORS.productDetailName));
      if (!name) {
        this.logger.warn('Could not extract product name', { url });
        return null;
      }

      // Determine product type
      const productType = this.detectProductType(name, html);

      switch (productType) {
        case 'cabinet':
          return this.scrapeCabinet($, url, name);
        case 'facade':
          return this.scrapeFacade($, url, name);
        case 'worktop':
          return this.scrapeWorktop($, url, name);
        default:
          // Default to cabinet
          return this.scrapeCabinet($, url, name);
      }
    } catch (error) {
      this.logger.error('Error scraping product', { error, url });
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
    const reference = this.extractText($(SELECTORS.productDetailRef)) || this.generateReference(url, 'SCH');
    const description = this.extractText($(SELECTORS.productDetailDescription));
    const priceStr = this.extractText($(SELECTORS.productDetailPrice));
    const dimensionsStr = this.extractText($(SELECTORS.productDetailDimensions));

    // Parse dimensions
    const dimensions = this.parseDimensions(dimensionsStr);

    // Detect cabinet type
    const type = this.detectCabinetType(name + ' ' + description);
    const category = this.detectCabinetCategory(type);

    // Extract images
    const images: string[] = [];
    $(SELECTORS.productDetailImages).each((_: number, el: cheerio.Element) => {
      const src = $(el).attr('src') || $(el).attr('data-src');
      if (src) {
        images.push(this.resolveUrl(src));
      }
    });

    // Parse specifications
    const specs = this.parseSpecifications($);

    const cabinet: CreateCabinetInput = {
      brandId: this.brandId,
      name,
      reference,
      description: description || undefined,
      type,
      category,
      width: dimensions.width || specs.width || 600,
      height: dimensions.height || specs.height || 720,
      depth: dimensions.depth || specs.depth || 560,
      doors: specs.doors || 0,
      drawers: specs.drawers || 0,
      shelves: specs.shelves || 0,
      priceHT: undefined,
      priceTTC: this.parsePrice(priceStr),
      priceType: priceStr ? 'fixed' : 'on_request',
      imageMain: images[0],
      imageThumbnails: images.slice(1),
      url,
      tags: this.generateTags(name, type, category),
    };

    return { type: 'cabinet', data: cabinet };
  }

  /**
   * Scrape facade product
   */
  private scrapeFacade(
    $: ReturnType<typeof this.parseHtml>,
    url: string,
    name: string
  ): ScrapedProduct {
    const reference = this.extractText($(SELECTORS.productDetailRef)) || this.generateReference(url, 'SCH-F');
    const description = this.extractText($(SELECTORS.productDetailDescription));

    // Detect facade style and material
    const style = this.detectFacadeStyle(name + ' ' + description);
    const material = this.detectFacadeMaterial(name + ' ' + description);

    // Extract images
    const images: string[] = [];
    $(SELECTORS.productDetailImages).each((_: number, el: cheerio.Element) => {
      const src = $(el).attr('src') || $(el).attr('data-src');
      if (src) {
        images.push(this.resolveUrl(src));
      }
    });

    // Extract colors
    const colors: Array<{ name: string; image?: string }> = [];
    $(SELECTORS.facadeColor).each((_: number, el: cheerio.Element) => {
      const colorName = $(el).attr('title') || $(el).text().trim();
      const colorImage = $(el).find('img').attr('src');
      if (colorName) {
        colors.push({
          name: colorName,
          image: colorImage ? this.resolveUrl(colorImage) : undefined,
        });
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
      finishes: ['matte'], // Default, should be detected
      colors,
      images,
      url,
    };

    return { type: 'facade', data: facade };
  }

  /**
   * Scrape worktop product
   */
  private scrapeWorktop(
    $: ReturnType<typeof this.parseHtml>,
    url: string,
    name: string
  ): ScrapedProduct {
    const reference = this.extractText($(SELECTORS.productDetailRef)) || this.generateReference(url, 'SCH-W');
    const description = this.extractText($(SELECTORS.productDetailDescription));
    const priceStr = this.extractText($(SELECTORS.productDetailPrice));

    // Detect material
    const material = this.detectWorktopMaterial(name + ' ' + description);

    // Extract images
    const images: string[] = [];
    $(SELECTORS.productDetailImages).each((_: number, el: cheerio.Element) => {
      const src = $(el).attr('src') || $(el).attr('data-src');
      if (src) {
        images.push(this.resolveUrl(src));
      }
    });

    const worktop: CreateWorktopInput = {
      brandId: this.brandId,
      name,
      reference,
      description: description || undefined,
      material,
      thicknesses: [20, 30, 40], // Common thicknesses
      depths: [600, 650],
      finishes: ['matte'],
      pricePerMeter: this.parsePrice(priceStr),
      priceType: priceStr ? 'fixed' : 'on_request',
      images,
      url,
    };

    return { type: 'worktop', data: worktop };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Helper Methods
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Detect product type from name and content
   */
  private detectProductType(name: string, html: string): 'cabinet' | 'facade' | 'worktop' | 'unknown' {
    const text = (name + ' ' + html).toLowerCase();

    if (text.includes('façade') || text.includes('facade') || text.includes('porte') || text.includes('finition')) {
      return 'facade';
    }
    if (text.includes('plan de travail') || text.includes('worktop') || text.includes('comptoir')) {
      return 'worktop';
    }
    if (text.includes('meuble') || text.includes('caisson') || text.includes('colonne') ||
        text.includes('tiroir') || text.includes('évier') || text.includes('four')) {
      return 'cabinet';
    }

    return 'unknown';
  }

  /**
   * Detect cabinet type from text
   */
  private detectCabinetType(text: string): CabinetType {
    const lowerText = text.toLowerCase();

    for (const [keyword, type] of Object.entries(CABINET_TYPE_KEYWORDS)) {
      if (lowerText.includes(keyword)) {
        return type;
      }
    }

    return 'base_standard';
  }

  /**
   * Detect cabinet category from type
   */
  private detectCabinetCategory(type: CabinetType): CabinetCategory {
    if (type.startsWith('base_')) return 'base';
    if (type.startsWith('wall_')) return 'wall';
    if (type.startsWith('tall_')) return 'tall';
    if (type.startsWith('island_')) return 'island';
    if (type.includes('corner')) return 'corner';
    return 'base';
  }

  /**
   * Detect facade style from text
   */
  private detectFacadeStyle(text: string): FacadeStyle {
    const lowerText = text.toLowerCase();

    for (const [keyword, style] of Object.entries(FACADE_STYLE_KEYWORDS)) {
      if (lowerText.includes(keyword)) {
        return style;
      }
    }

    return 'flat';
  }

  /**
   * Detect facade material from text
   */
  private detectFacadeMaterial(text: string): FacadeMaterial {
    const lowerText = text.toLowerCase();

    for (const [keyword, material] of Object.entries(FACADE_MATERIAL_KEYWORDS)) {
      if (lowerText.includes(keyword)) {
        return material;
      }
    }

    return 'melamine';
  }

  /**
   * Detect worktop material from text
   */
  private detectWorktopMaterial(text: string): WorktopMaterial {
    const lowerText = text.toLowerCase();

    for (const [keyword, material] of Object.entries(WORKTOP_MATERIAL_KEYWORDS)) {
      if (lowerText.includes(keyword)) {
        return material;
      }
    }

    return 'laminate';
  }

  /**
   * Detect style from text
   */
  private detectStyle(text: string): string | undefined {
    const lowerText = text.toLowerCase();

    if (lowerText.includes('moderne') || lowerText.includes('contemporain')) return 'modern';
    if (lowerText.includes('classique') || lowerText.includes('traditionnel')) return 'classic';
    if (lowerText.includes('rustique') || lowerText.includes('campagne')) return 'rustic';
    if (lowerText.includes('design') || lowerText.includes('minimaliste')) return 'minimalist';
    if (lowerText.includes('industriel')) return 'industrial';
    if (lowerText.includes('scandinave')) return 'scandinavian';

    return undefined;
  }

  /**
   * Parse specifications from product page
   */
  private parseSpecifications($: ReturnType<typeof this.parseHtml>): {
    width?: number;
    height?: number;
    depth?: number;
    doors?: number;
    drawers?: number;
    shelves?: number;
  } {
    const specs: Record<string, number> = {};

    $(SELECTORS.productDetailSpecs).find('tr, .spec-row, .spec-item').each((_: number, row: cheerio.Element) => {
      const $row = $(row);
      const label = $row.find('th, .spec-label, .label').text().toLowerCase();
      const value = $row.find('td, .spec-value, .value').text();

      if (label.includes('largeur') || label.includes('width')) {
        specs['width'] = this.parseNumber(value);
      } else if (label.includes('hauteur') || label.includes('height')) {
        specs['height'] = this.parseNumber(value);
      } else if (label.includes('profondeur') || label.includes('depth')) {
        specs['depth'] = this.parseNumber(value);
      } else if (label.includes('porte') || label.includes('door')) {
        specs['doors'] = this.parseNumber(value);
      } else if (label.includes('tiroir') || label.includes('drawer')) {
        specs['drawers'] = this.parseNumber(value);
      } else if (label.includes('étagère') || label.includes('shelf')) {
        specs['shelves'] = this.parseNumber(value);
      }
    });

    return specs;
  }

  /**
   * Parse number from string
   */
  private parseNumber(str: string): number {
    const match = str.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  /**
   * Generate tags for a product
   */
  private generateTags(name: string, type: CabinetType, category: CabinetCategory): string[] {
    const tags: string[] = [category, type.replace('_', ' ')];

    const lowerName = name.toLowerCase();
    if (lowerName.includes('blanc')) tags.push('blanc', 'white');
    if (lowerName.includes('noir')) tags.push('noir', 'black');
    if (lowerName.includes('bois')) tags.push('bois', 'wood');
    if (lowerName.includes('chêne')) tags.push('chêne', 'oak');
    if (lowerName.includes('mat')) tags.push('mat', 'matte');
    if (lowerName.includes('brillant')) tags.push('brillant', 'gloss');

    return [...new Set(tags)];
  }
}

export default SchmidtScraper;
