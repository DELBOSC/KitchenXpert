/**
 * Nobilia Scraper
 *
 * Scraper for Nobilia kitchens (German manufacturer)
 * Premium segment - one of the world's largest kitchen manufacturers
 *
 * Website: https://www.nobilia.de
 * Catalog: /fr/cuisines/ (French version)
 *
 * Note: Nobilia products are sold through distributors (Ixina, Cuisine Plus, etc.)
 * This scraper collects catalog information, not direct prices.
 */

import * as cheerio from 'cheerio';
import { BaseScraper, ScrapedProduct, ScraperOptions } from './base-scraper.js';
import type { BrandScrapingConfig } from '../config/brands.config.js';
import type { CreateCabinetInput, CabinetType, CabinetCategory } from '../models/cabinet.js';
import type { CreateFacadeInput, FacadeStyle, FacadeMaterial, FacadeFinish } from '../models/facade.js';
import type { CreateWorktopInput, WorktopMaterial, WorktopFinish } from '../models/worktop.js';
import type { CreateCollectionInput } from '../models/collection.js';

// CSS Selectors for Nobilia website (German site with French content)
const SELECTORS = {
  // Navigation & Collections
  collectionsNav: '.main-nav, .navigation, [data-nav="kitchens"]',
  collectionLinks: '.kitchen-model a, .collection-card a, .model-item a',
  collectionTitle: '.model-title, h1.title, .hero-title, .collection-name',
  collectionDescription: '.model-description, .collection-intro, .description-text',
  collectionImage: '.model-hero img, .collection-image img, .hero-image img',

  // Product/Model listing
  productGrid: '.products-grid, .models-grid, .items-list',
  productCard: '.product-card, .model-card, .item-card',
  productLink: '.product-card a, .model-card a, .item-link',
  productName: '.product-name, .model-name, h3.name',
  productImage: '.product-image img, .model-image img',
  productCategory: '.product-category, .model-category',

  // Product detail page
  productDetailName: 'h1.product-title, h1.model-name, .detail-title',
  productDetailRef: '.product-ref, .model-number, .article-number, .sku',
  productDetailDescription: '.product-description, .model-description, .details-text',
  productDetailDimensions: '.dimensions, .product-dimensions, .measures',
  productDetailImages: '.product-gallery img, .gallery-images img, .model-gallery img',
  productDetailSpecs: '.specifications, .technical-data, .product-specs',
  productDetailFeatures: '.features-list, .product-features, .highlights',
  productDetailMaterials: '.materials, .material-info',

  // Facade/Front selectors (Nobilia focus)
  frontSection: '.fronts, .facades, .door-programs',
  frontCard: '.front-card, .facade-item, .door-program',
  frontName: '.front-name, .facade-name, .program-name',
  frontStyle: '.front-style, .style-type',
  frontMaterial: '.front-material, .material-type',
  frontColors: '.color-options, .color-variants, .decors',

  // Worktop selectors
  worktopSection: '.worktops, .arbeitsplatten, .plans-travail',
  worktopCard: '.worktop-item, .worktop-card',
  worktopMaterial: '.worktop-material, .material',
  worktopDecor: '.worktop-decor, .decor-name',

  // Cookie banner (German/EU compliance)
  cookieAccept: '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll, .cookie-accept, [data-accept-all], #accept-cookies',

  // Pagination
  pagination: '.pagination, .pager',
  nextPage: '.next, .pagination-next, a[rel="next"]',
  loadMore: '.load-more, [data-load-more]',
};

// Nobilia product lines and programs
const NOBILIA_PROGRAMS = {
  // Front programs (facades)
  'TOUCH': { style: 'flat', material: 'lacquer_matte', segment: 'premium' },
  'RIVA': { style: 'flat', material: 'melamine', segment: 'mid' },
  'FOCUS': { style: 'flat', material: 'lacquer_matte', segment: 'mid_premium' },
  'FASHION': { style: 'flat', material: 'lacquer_gloss', segment: 'mid' },
  'ARTIS': { style: 'flat', material: 'lacquer_matte', segment: 'premium' },
  'FLASH': { style: 'handleless', material: 'lacquer_gloss', segment: 'mid_premium' },
  'INLINE': { style: 'handleless', material: 'lacquer_matte', segment: 'premium' },
  'FEEL': { style: 'flat', material: 'fenix', segment: 'premium' },
  'CASCADA': { style: 'shaker', material: 'lacquer_matte', segment: 'mid_premium' },
  'CHALET': { style: 'classic', material: 'veneer', segment: 'premium' },
  'COTTAGE': { style: 'rustic', material: 'veneer', segment: 'mid_premium' },
  'SPEED': { style: 'flat', material: 'melamine', segment: 'entry_mid' },
  'STRUCTURA': { style: 'flat', material: 'melamine', segment: 'mid' },
  'LASER': { style: 'flat', material: 'lacquer_matte', segment: 'mid_premium' },
  'LINA': { style: 'handleless', material: 'lacquer_matte', segment: 'mid_premium' },
  'SENSO': { style: 'handleless', material: 'lacquer_matte', segment: 'premium' },
  'EASYTOUCH': { style: 'flat', material: 'lacquer_matte', segment: 'mid' },
  'PURA': { style: 'handleless', material: 'lacquer_matte', segment: 'premium' },
  'NATURA': { style: 'classic', material: 'veneer', segment: 'premium' },
  'STONE': { style: 'flat', material: 'ceramic', segment: 'luxury' },
};

// Cabinet type mappings (German/French)
const CABINET_TYPE_KEYWORDS: Record<string, CabinetType> = {
  // German terms
  'unterschrank': 'base_standard',
  'spülenschrank': 'base_sink',
  'kochfeldunterschrank': 'base_hob',
  'schubkastenschrank': 'base_drawer',
  'eckunterschrank': 'base_corner',
  'auszugsschrank': 'base_pull_out',
  'abfallschrank': 'base_trash',
  'oberschrank': 'wall_standard',
  'glashängeschrank': 'wall_glass',
  'klappenschrank': 'wall_lift_up',
  'dunstabzugsschrank': 'wall_extractor',
  'hochschrank': 'tall_pantry',
  'gerätehochschrank': 'tall_oven',
  'kühlschrank': 'tall_fridge',

  // French terms
  'meuble bas': 'base_standard',
  'sous-évier': 'base_sink',
  'sous-plaque': 'base_hob',
  'tiroirs': 'base_drawer',
  'angle bas': 'base_corner',
  'coulissant': 'base_pull_out',
  'meuble haut': 'wall_standard',
  'vitré': 'wall_glass',
  'relevable': 'wall_lift_up',
  'hotte': 'wall_extractor',
  'colonne': 'tall_pantry',
  'four': 'tall_oven',
  'réfrigérateur': 'tall_fridge',
};

const FACADE_MATERIAL_KEYWORDS: Record<string, FacadeMaterial> = {
  // German
  'lack': 'lacquer_matte',
  'hochglanz': 'lacquer_gloss',
  'matt': 'lacquer_matte',
  'melamin': 'melamine',
  'schichtstoff': 'laminate',
  'echtholz': 'solid_wood',
  'furnier': 'veneer',
  'glas': 'glass',
  'keramik': 'ceramic',
  'fenix': 'fenix',
  'acryl': 'acrylic',

  // French
  'laqué': 'lacquer_matte',
  'brillant': 'lacquer_gloss',
  'mélaminé': 'melamine',
  'stratifié': 'laminate',
  'bois massif': 'solid_wood',
  'placage': 'veneer',
  'verre': 'glass',
  'céramique': 'ceramic',
};

const WORKTOP_MATERIAL_KEYWORDS: Record<string, WorktopMaterial> = {
  // German
  'laminat': 'laminate',
  'schichtstoff': 'laminate',
  'massivholz': 'wood_solid',
  'eiche': 'wood_solid',
  'quarz': 'quartz',
  'silestone': 'quartz',
  'granit': 'granite',
  'marmor': 'marble',
  'keramik': 'ceramic',
  'dekton': 'compact',
  'edelstahl': 'stainless',
  'beton': 'concrete',

  // French
  'stratifié': 'laminate',
  'bois massif': 'wood_solid',
  'chêne': 'wood_solid',
  'quartz': 'quartz',
  'granite': 'granite',
  'marbre': 'marble',
  'céramique': 'ceramic',
  'compact': 'compact',
  'inox': 'stainless',
  'béton': 'concrete',
};

export class NobiliaScraper extends BaseScraper {
  private brandId: string;

  constructor(config: BrandScrapingConfig, options: Partial<ScraperOptions> = {}) {
    super(config, {
      ...options,
      language: 'fr-FR', // Use French version of the site
    });
    this.brandId = config.id;
  }

  /**
   * Get collection URLs from the main page
   */
  protected async getCollectionUrls(): Promise<string[]> {
    const urls: string[] = [];

    try {
      for (const catalogPath of this.config.catalogPaths) {
        const catalogUrl = this.resolveUrl(catalogPath);

        try {
          await this.navigateTo(catalogUrl, { waitUntil: 'networkidle2' });
          await this.acceptCookies();
          await this.humanWait(2000);

          const html = await this.getPageContent();
          const $ = this.parseHtml(html);

          // Find collection/model links
          $(SELECTORS.collectionLinks).each((_: number, el: cheerio.Element) => {
            const href = $(el).attr('href');
            if (href) {
              const fullUrl = this.resolveUrl(href);
              if (!urls.includes(fullUrl)) {
                urls.push(fullUrl);
              }
            }
          });

          // Look for kitchen model links
          $('a[href*="/cuisines/"], a[href*="/kuechen/"], a[href*="/fronts/"], a[href*="/fronten/"]').each((_: number, el: cheerio.Element) => {
            const href = $(el).attr('href');
            if (href && !href.includes('#') && !href.includes('javascript')) {
              const fullUrl = this.resolveUrl(href);
              if (!urls.includes(fullUrl)) {
                urls.push(fullUrl);
              }
            }
          });

          // Add program-specific URLs for facades
          for (const program of Object.keys(NOBILIA_PROGRAMS)) {
            const programUrl = this.resolveUrl(`/fr/cuisines/fronts/${program.toLowerCase()}/`);
            if (!urls.includes(programUrl)) {
              urls.push(programUrl);
            }
          }
        } catch (error) {
          this.logger.warn(`Failed to get collections from ${catalogPath}`, { error });
        }
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
      await this.navigateTo(collectionUrl, { waitUntil: 'networkidle2' });
      await this.humanWait(1500);

      const html = await this.getPageContent();
      const $ = this.parseHtml(html);

      // Find product/model links
      $(SELECTORS.productLink).each((_: number, el: cheerio.Element) => {
        const href = $(el).attr('href');
        if (href) {
          const fullUrl = this.resolveUrl(href);
          if (!urls.includes(fullUrl)) {
            urls.push(fullUrl);
          }
        }
      });

      // Look for specific product patterns
      $('a[href*="/detail/"], a[href*="/produkt/"], a[href*="/product/"]').each((_: number, el: cheerio.Element) => {
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
        const maxPages = 20;

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
      const html = await this.getPageContent();
      const $ = this.parseHtml(html);

      const name = this.extractText($(SELECTORS.collectionTitle)) ||
                   this.extractProgramFromUrl(url) ||
                   'Nobilia Kitchen';
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

      // Detect style from program name
      const program = this.extractProgramFromUrl(url);
      const programInfo = program ? NOBILIA_PROGRAMS[program.toUpperCase() as keyof typeof NOBILIA_PROGRAMS] : undefined;

      return {
        brandId: this.brandId,
        name,
        slug,
        description,
        style: programInfo?.style || this.detectStyle(name + ' ' + (description || '')),
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

      // Determine product type from URL and content
      const productType = this.detectProductType(url, name, html);

      switch (productType) {
        case 'facade':
          return this.scrapeFacade($, url, name);
        case 'worktop':
          return this.scrapeWorktop($, url, name);
        case 'cabinet':
          return this.scrapeCabinet($, url, name);
        default:
          // Nobilia primarily showcases facades/fronts
          return this.scrapeFacade($, url, name);
      }
    } catch (error) {
      this.logger.error('Error scraping product', { url, error });
      return null;
    }
  }

  /**
   * Scrape facade/front program
   */
  private scrapeFacade(
    $: ReturnType<typeof this.parseHtml>,
    url: string,
    name: string
  ): ScrapedProduct {
    const reference = this.extractText($(SELECTORS.productDetailRef)) ||
                     this.generateReference(url, 'NOB');
    const description = this.extractText($(SELECTORS.productDetailDescription));

    // Try to identify Nobilia program
    const program = this.extractProgramFromUrl(url) || this.detectProgramFromName(name);
    const programInfo = program ? NOBILIA_PROGRAMS[program.toUpperCase() as keyof typeof NOBILIA_PROGRAMS] : undefined;

    const style = programInfo?.style as FacadeStyle || this.detectFacadeStyle(name + ' ' + description);
    const material = programInfo?.material as FacadeMaterial || this.detectFacadeMaterial(name + ' ' + description);

    // Extract images
    const images: string[] = [];
    $(SELECTORS.productDetailImages).each((_: number, el: cheerio.Element) => {
      const src = $(el).attr('src') || $(el).attr('data-src');
      if (src && !src.includes('placeholder')) {
        images.push(this.resolveUrl(src));
      }
    });

    // Extract colors/decors
    const colors: Array<{ name: string; code?: string; image?: string }> = [];
    $(SELECTORS.frontColors).find('.color-item, .decor-item').each((_: number, el: cheerio.Element) => {
      const colorName = $(el).attr('title') || $(el).find('.name').text().trim();
      const colorCode = $(el).attr('data-code') || $(el).find('.code').text().trim();
      const colorImage = $(el).find('img').attr('src');
      if (colorName) {
        colors.push({
          name: colorName,
          code: colorCode || undefined,
          image: colorImage ? this.resolveUrl(colorImage) : undefined,
        });
      }
    });

    // Extract features
    const features: string[] = [];
    $(SELECTORS.productDetailFeatures).find('li, .feature').each((_: number, el: cheerio.Element) => {
      const feature = $(el).text().trim();
      if (feature) {
        features.push(feature);
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
      finishes: this.detectFinishes(name + ' ' + description),
      colors,
      priceType: 'on_request', // Nobilia doesn't show prices online
      images,
      url,
    };

    return { type: 'facade', data: facade };
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
                     this.generateReference(url, 'NOB-C');
    const description = this.extractText($(SELECTORS.productDetailDescription));
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
      priceTTC: undefined,
      priceType: 'on_request',
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
                     this.generateReference(url, 'NOB-W');
    const description = this.extractText($(SELECTORS.productDetailDescription));

    const material = this.detectWorktopMaterial(name + ' ' + description);
    const finish = this.detectWorktopFinish(name + ' ' + description);

    const images: string[] = [];
    $(SELECTORS.productDetailImages).each((_: number, el: cheerio.Element) => {
      const src = $(el).attr('src') || $(el).attr('data-src');
      if (src && !src.includes('placeholder')) {
        images.push(this.resolveUrl(src));
      }
    });

    // Extract decors/colors for worktops
    const decors: Array<{ name: string; image?: string }> = [];
    $(SELECTORS.worktopDecor).each((_: number, el: cheerio.Element) => {
      const decorName = $(el).text().trim() || $(el).attr('title');
      const decorImage = $(el).find('img').attr('src');
      if (decorName) {
        decors.push({
          name: decorName,
          image: decorImage ? this.resolveUrl(decorImage) : undefined,
        });
      }
    });

    const worktop: CreateWorktopInput = {
      brandId: this.brandId,
      name,
      reference,
      description: description || undefined,
      material,
      thicknesses: [16, 28, 38], // Nobilia standard thicknesses
      depths: [600, 650, 900, 1200],
      finishes: [finish as WorktopFinish],
      colors: decors,
      priceType: 'on_request',
      images,
      url,
    };

    return { type: 'worktop', data: worktop };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Helper Methods
  // ═══════════════════════════════════════════════════════════════════════════

  private extractProgramFromUrl(url: string): string | null {
    // Try to extract Nobilia program name from URL
    for (const program of Object.keys(NOBILIA_PROGRAMS)) {
      if (url.toLowerCase().includes(program.toLowerCase())) {
        return program;
      }
    }

    // Try pattern matching
    const programMatch = url.match(/\/(?:fronts?|fronten|facades?)\/([^\/]+)/i);
    if (programMatch?.[1]) {
      return programMatch[1].toUpperCase();
    }

    return null;
  }

  private detectProgramFromName(name: string): string | null {
    const upperName = name.toUpperCase();
    for (const program of Object.keys(NOBILIA_PROGRAMS)) {
      if (upperName.includes(program)) {
        return program;
      }
    }
    return null;
  }

  private detectProductType(url: string, name: string, html: string): string {
    const combined = (url + ' ' + name + ' ' + html).toLowerCase();

    if (combined.includes('arbeitsplat') || combined.includes('worktop') ||
        combined.includes('plan-de-travail') || combined.includes('plan de travail')) {
      return 'worktop';
    }
    if (combined.includes('front') || combined.includes('facade') ||
        combined.includes('tür') || combined.includes('porte')) {
      return 'facade';
    }
    if (combined.includes('schrank') || combined.includes('meuble') ||
        combined.includes('caisson') || combined.includes('cabinet')) {
      return 'cabinet';
    }

    // Default to facade as Nobilia primarily showcases fronts
    return 'facade';
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

    if (lower.includes('grifflos') || lower.includes('handleless') || lower.includes('sans poignée')) return 'handleless';
    if (lower.includes('modern') || lower.includes('glatt') || lower.includes('lisse')) return 'flat';
    if (lower.includes('rahmen') || lower.includes('shaker') || lower.includes('cadre')) return 'shaker';
    if (lower.includes('klassisch') || lower.includes('classic') || lower.includes('traditionnel')) return 'classic';
    if (lower.includes('landhaus') || lower.includes('rustic') || lower.includes('campagne')) return 'rustic';

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

  private detectFinishes(text: string): FacadeFinish[] {
    const finishes: FacadeFinish[] = [];
    const lower = text.toLowerCase();

    if (lower.includes('matt') || lower.includes('mat')) finishes.push('matte');
    if (lower.includes('hochglanz') || lower.includes('brillant') || lower.includes('gloss')) finishes.push('gloss');
    if (lower.includes('satin') || lower.includes('satiné')) finishes.push('satin');
    if (lower.includes('struktur') || lower.includes('texture')) finishes.push('textured');
    if (lower.includes('soft') || lower.includes('velvet')) finishes.push('soft_touch');

    return finishes.length > 0 ? finishes : ['matte'];
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

    if (lower.includes('matt') || lower.includes('mat')) return 'matte';
    if (lower.includes('glanz') || lower.includes('brillant') || lower.includes('poliert')) return 'polished';
    if (lower.includes('satin') || lower.includes('satiné')) return 'satin';
    if (lower.includes('struktur') || lower.includes('gebürstet') || lower.includes('brossé')) return 'brushed';
    if (lower.includes('pore') || lower.includes('texture')) return 'textured';

    return 'matte';
  }

  private detectStyle(text: string): string | undefined {
    const lower = text.toLowerCase();

    if (lower.includes('modern') || lower.includes('contemporain') || lower.includes('zeitgenössisch')) return 'modern';
    if (lower.includes('classic') || lower.includes('classique') || lower.includes('klassisch')) return 'classic';
    if (lower.includes('rustic') || lower.includes('rustique') || lower.includes('landhaus')) return 'rustic';
    if (lower.includes('minimalist') || lower.includes('minimaliste') || lower.includes('puristisch')) return 'minimalist';
    if (lower.includes('industrial') || lower.includes('industriel')) return 'industrial';
    if (lower.includes('scandinavian') || lower.includes('scandinave') || lower.includes('skandinavisch')) return 'scandinavian';

    return 'modern'; // Default for Nobilia
  }

  private parseSpecifications($: ReturnType<typeof this.parseHtml>): Record<string, any> {
    const specs: Record<string, any> = {};

    $(SELECTORS.productDetailSpecs).find('tr, .spec-row, .spec-item').each((_: number, row: cheerio.Element) => {
      const $row = $(row);
      const label = $row.find('th, .label, dt').text().toLowerCase().trim();
      const value = $row.find('td, .value, dd').text().trim();

      if (label && value) {
        // German terms
        if (label.includes('breite') || label.includes('largeur') || label.includes('width')) {
          specs.width = this.parseNumber(value);
        } else if (label.includes('höhe') || label.includes('hauteur') || label.includes('height')) {
          specs.height = this.parseNumber(value);
        } else if (label.includes('tiefe') || label.includes('profondeur') || label.includes('depth')) {
          specs.depth = this.parseNumber(value);
        } else if (label.includes('tür') || label.includes('porte') || label.includes('door')) {
          specs.doors = this.parseNumber(value);
        } else if (label.includes('schub') || label.includes('tiroir') || label.includes('drawer')) {
          specs.drawers = this.parseNumber(value);
        } else if (label.includes('boden') || label.includes('étagère') || label.includes('shelf')) {
          specs.shelves = this.parseNumber(value);
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
    const tags: string[] = [category, type.replace('_', ' '), 'nobilia', 'german', 'premium'];

    const lower = name.toLowerCase();
    if (lower.includes('weiß') || lower.includes('blanc') || lower.includes('white')) tags.push('white');
    if (lower.includes('schwarz') || lower.includes('noir') || lower.includes('black')) tags.push('black');
    if (lower.includes('grau') || lower.includes('gris') || lower.includes('grey')) tags.push('grey');
    if (lower.includes('holz') || lower.includes('bois') || lower.includes('wood')) tags.push('wood');
    if (lower.includes('eiche') || lower.includes('chêne') || lower.includes('oak')) tags.push('oak');

    return [...new Set(tags)];
  }
}

export default NobiliaScraper;
