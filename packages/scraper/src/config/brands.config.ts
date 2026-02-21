/**
 * Brands Configuration
 *
 * List of all kitchen brands/retailers to scrape
 */

import type { Segment, ScrapingDifficulty, ScrapingFrequency } from '../models/brand.js';

export interface BrandScrapingConfig {
  id: string;
  name: string;
  slug: string;
  parentGroup?: string;
  segment: Segment;
  country: string;
  website: string;
  catalogPaths: string[];
  priority: number;
  enabled: boolean;
  scrapingDifficulty: ScrapingDifficulty;
  scrapingFrequency: ScrapingFrequency;
  notes?: string;
  hasPricesOnline: boolean;
  has3DConfigurator: boolean;
}

export const BRANDS_CONFIG: BrandScrapingConfig[] = [
  // ═══════════════════════════════════════════
  // GROUPE SCHMIDT (Leader français)
  // ═══════════════════════════════════════════
  {
    id: 'schmidt',
    name: 'Schmidt',
    slug: 'schmidt',
    parentGroup: 'Schmidt Groupe',
    segment: 'mid_premium',
    country: 'FR',
    website: 'https://www.home-design.schmidt',
    catalogPaths: ['/fr-fr/cuisines', '/fr-fr/rangements'],
    priority: 1,
    enabled: true,
    scrapingDifficulty: 'medium',
    scrapingFrequency: 'weekly',
    hasPricesOnline: false,
    has3DConfigurator: true,
  },
  {
    id: 'cuisinella',
    name: 'Cuisinella',
    slug: 'cuisinella',
    parentGroup: 'Schmidt Groupe',
    segment: 'mid',
    country: 'FR',
    website: 'https://www.cuisinella.com',
    catalogPaths: ['/fr-fr/cuisines'],
    priority: 2,
    enabled: true,
    scrapingDifficulty: 'medium',
    scrapingFrequency: 'weekly',
    hasPricesOnline: false,
    has3DConfigurator: true,
  },

  // ═══════════════════════════════════════════
  // GROUPE FOURNIER
  // ═══════════════════════════════════════════
  {
    id: 'mobalpa',
    name: 'Mobalpa',
    slug: 'mobalpa',
    parentGroup: 'Fournier Groupe',
    segment: 'mid_premium',
    country: 'FR',
    website: 'https://www.mobalpa.fr',
    catalogPaths: ['/cuisines', '/collections'],
    priority: 1,
    enabled: true,
    scrapingDifficulty: 'medium',
    scrapingFrequency: 'weekly',
    hasPricesOnline: false,
    has3DConfigurator: true,
  },
  {
    id: 'perene',
    name: 'Perene',
    slug: 'perene',
    parentGroup: 'Fournier Groupe',
    segment: 'premium',
    country: 'FR',
    website: 'https://www.perene.com',
    catalogPaths: ['/nos-cuisines'],
    priority: 3,
    enabled: true,
    scrapingDifficulty: 'medium',
    scrapingFrequency: 'weekly',
    hasPricesOnline: false,
    has3DConfigurator: true,
  },
  {
    id: 'socooc',
    name: "SoCoo'c",
    slug: 'socooc',
    parentGroup: 'Fournier Groupe',
    segment: 'entry_mid',
    country: 'FR',
    website: 'https://www.socooc.com',
    catalogPaths: ['/cuisine', '/nos-modeles'],
    priority: 2,
    enabled: true,
    scrapingDifficulty: 'medium',
    scrapingFrequency: 'weekly',
    hasPricesOnline: true,
    has3DConfigurator: false,
  },

  // ═══════════════════════════════════════════
  // GROUPE FBD (Nobilia)
  // ═══════════════════════════════════════════
  {
    id: 'ixina',
    name: 'Ixina',
    slug: 'ixina',
    parentGroup: 'FBD / Nobilia',
    segment: 'mid',
    country: 'FR',
    website: 'https://www.ixina.fr',
    catalogPaths: ['/cuisines', '/modeles'],
    priority: 1,
    enabled: true,
    scrapingDifficulty: 'medium',
    scrapingFrequency: 'weekly',
    hasPricesOnline: false,
    has3DConfigurator: true,
  },
  {
    id: 'cuisine-plus',
    name: 'Cuisine Plus',
    slug: 'cuisine-plus',
    parentGroup: 'FBD / Nobilia',
    segment: 'mid',
    country: 'FR',
    website: 'https://www.cuisineplus.fr',
    catalogPaths: ['/nos-cuisines'],
    priority: 3,
    enabled: true,
    scrapingDifficulty: 'easy',
    scrapingFrequency: 'weekly',
    hasPricesOnline: false,
    has3DConfigurator: false,
  },
  {
    id: 'cuisines-references',
    name: 'Cuisines Références',
    slug: 'cuisines-references',
    parentGroup: 'FBD / Nobilia',
    segment: 'mid',
    country: 'FR',
    website: 'https://www.cuisines-references.com',
    catalogPaths: ['/cuisines'],
    priority: 4,
    enabled: true,
    scrapingDifficulty: 'easy',
    scrapingFrequency: 'weekly',
    hasPricesOnline: false,
    has3DConfigurator: false,
  },

  // ═══════════════════════════════════════════
  // CDI (Cuisines Design Industries)
  // ═══════════════════════════════════════════
  {
    id: 'arthur-bonnet',
    name: 'Arthur Bonnet',
    slug: 'arthur-bonnet',
    parentGroup: 'CDI',
    segment: 'premium',
    country: 'FR',
    website: 'https://www.arthur-bonnet.com',
    catalogPaths: ['/nos-cuisines', '/nos-modeles'],
    priority: 2,
    enabled: true,
    scrapingDifficulty: 'medium',
    scrapingFrequency: 'weekly',
    hasPricesOnline: false,
    has3DConfigurator: true,
  },

  // ═══════════════════════════════════════════
  // INDÉPENDANTS FRANÇAIS
  // ═══════════════════════════════════════════
  {
    id: 'inova-cuisine',
    name: 'Inova Cuisine',
    slug: 'inova-cuisine',
    segment: 'mid',
    country: 'FR',
    website: 'https://www.inova-cuisine.fr',
    catalogPaths: ['/nos-cuisines-equipees'],
    priority: 3,
    enabled: true,
    scrapingDifficulty: 'easy',
    scrapingFrequency: 'monthly',
    hasPricesOnline: false,
    has3DConfigurator: false,
  },
  {
    id: 'aviva',
    name: 'Cuisines Aviva',
    slug: 'aviva',
    segment: 'entry_mid',
    country: 'FR',
    website: 'https://www.cuisines-aviva.com',
    catalogPaths: ['/cuisines', '/modeles'],
    priority: 3,
    enabled: true,
    scrapingDifficulty: 'easy',
    scrapingFrequency: 'weekly',
    hasPricesOnline: true,
    has3DConfigurator: false,
  },
  {
    id: 'hygena',
    name: 'Hygena',
    slug: 'hygena',
    segment: 'entry',
    country: 'FR',
    website: 'https://www.hygena.fr',
    catalogPaths: ['/cuisines'],
    priority: 3,
    enabled: true,
    scrapingDifficulty: 'easy',
    scrapingFrequency: 'weekly',
    hasPricesOnline: true,
    has3DConfigurator: false,
  },
  {
    id: 'lapeyre',
    name: 'Lapeyre',
    slug: 'lapeyre',
    segment: 'entry_mid',
    country: 'FR',
    website: 'https://www.lapeyre.fr',
    catalogPaths: ['/cuisine'],
    priority: 2,
    enabled: true,
    scrapingDifficulty: 'medium',
    scrapingFrequency: 'weekly',
    hasPricesOnline: true,
    has3DConfigurator: true,
  },
  {
    id: 'envia',
    name: 'Envia Cuisine',
    slug: 'envia',
    segment: 'mid',
    country: 'FR',
    website: 'https://www.enviacuisine.com',
    catalogPaths: ['/nos-cuisines'],
    priority: 4,
    enabled: true,
    scrapingDifficulty: 'easy',
    scrapingFrequency: 'monthly',
    hasPricesOnline: false,
    has3DConfigurator: false,
  },
  {
    id: 'charles-rema',
    name: 'Charles Rema',
    slug: 'charles-rema',
    segment: 'premium',
    country: 'FR',
    website: 'https://www.charles-rema.com',
    catalogPaths: ['/cuisines'],
    priority: 4,
    enabled: true,
    scrapingDifficulty: 'easy',
    scrapingFrequency: 'monthly',
    hasPricesOnline: false,
    has3DConfigurator: false,
  },
  {
    id: 'cuisines-morel',
    name: 'Cuisines Morel',
    slug: 'cuisines-morel',
    segment: 'mid_premium',
    country: 'FR',
    website: 'https://www.cuisines-morel.fr',
    catalogPaths: ['/nos-cuisines'],
    priority: 4,
    enabled: true,
    scrapingDifficulty: 'easy',
    scrapingFrequency: 'monthly',
    hasPricesOnline: false,
    has3DConfigurator: false,
  },
  {
    id: 'pyram',
    name: 'Pyram',
    slug: 'pyram',
    segment: 'premium',
    country: 'FR',
    website: 'https://www.pyram.com',
    catalogPaths: ['/cuisines'],
    priority: 5,
    enabled: true,
    scrapingDifficulty: 'easy',
    scrapingFrequency: 'monthly',
    hasPricesOnline: false,
    has3DConfigurator: false,
  },
  {
    id: 'cuisines-you',
    name: 'Cuisines You',
    slug: 'cuisines-you',
    segment: 'mid',
    country: 'FR',
    website: 'https://www.cuisines-you.com',
    catalogPaths: ['/nos-cuisines'],
    priority: 5,
    enabled: true,
    scrapingDifficulty: 'easy',
    scrapingFrequency: 'monthly',
    hasPricesOnline: false,
    has3DConfigurator: false,
  },

  // ═══════════════════════════════════════════
  // GRANDE DISTRIBUTION / GSB
  // ═══════════════════════════════════════════
  {
    id: 'ikea',
    name: 'IKEA',
    slug: 'ikea',
    segment: 'entry',
    country: 'SE',
    website: 'https://www.ikea.com',
    catalogPaths: ['/fr/fr/cat/cuisines-ka002/'],
    priority: 1,
    enabled: true,
    scrapingDifficulty: 'hard',
    scrapingFrequency: 'weekly',
    hasPricesOnline: true,
    has3DConfigurator: true,
    notes: 'API IKEA disponible - privilégier API vs scraping',
  },
  {
    id: 'leroy-merlin',
    name: 'Leroy Merlin',
    slug: 'leroy-merlin',
    segment: 'entry_mid',
    country: 'FR',
    website: 'https://www.leroymerlin.fr',
    catalogPaths: ['/produits/cuisine/'],
    priority: 2,
    enabled: true,
    scrapingDifficulty: 'hard',
    scrapingFrequency: 'weekly',
    hasPricesOnline: true,
    has3DConfigurator: true,
  },
  {
    id: 'castorama',
    name: 'Castorama',
    slug: 'castorama',
    segment: 'entry_mid',
    country: 'FR',
    website: 'https://www.castorama.fr',
    catalogPaths: ['/cuisine/'],
    priority: 3,
    enabled: true,
    scrapingDifficulty: 'hard',
    scrapingFrequency: 'weekly',
    hasPricesOnline: true,
    has3DConfigurator: true,
  },
  {
    id: 'brico-depot',
    name: 'Brico Dépôt',
    slug: 'brico-depot',
    segment: 'entry',
    country: 'FR',
    website: 'https://www.bricodepot.fr',
    catalogPaths: ['/cuisine/'],
    priority: 4,
    enabled: true,
    scrapingDifficulty: 'medium',
    scrapingFrequency: 'weekly',
    hasPricesOnline: true,
    has3DConfigurator: false,
  },
  {
    id: 'but',
    name: 'But',
    slug: 'but',
    segment: 'entry',
    country: 'FR',
    website: 'https://www.but.fr',
    catalogPaths: ['/cuisine/'],
    priority: 3,
    enabled: true,
    scrapingDifficulty: 'medium',
    scrapingFrequency: 'weekly',
    hasPricesOnline: true,
    has3DConfigurator: false,
  },
  {
    id: 'conforama',
    name: 'Conforama',
    slug: 'conforama',
    segment: 'entry',
    country: 'FR',
    website: 'https://www.conforama.fr',
    catalogPaths: ['/cuisine/'],
    priority: 4,
    enabled: true,
    scrapingDifficulty: 'medium',
    scrapingFrequency: 'weekly',
    hasPricesOnline: true,
    has3DConfigurator: false,
  },

  // ═══════════════════════════════════════════
  // FABRICANTS ALLEMANDS (Haut de gamme)
  // ═══════════════════════════════════════════
  {
    id: 'nobilia',
    name: 'Nobilia',
    slug: 'nobilia',
    segment: 'mid_premium',
    country: 'DE',
    website: 'https://www.nobilia.de',
    catalogPaths: ['/fr/cuisines/'],
    priority: 3,
    enabled: true,
    scrapingDifficulty: 'medium',
    scrapingFrequency: 'monthly',
    hasPricesOnline: false,
    has3DConfigurator: true,
  },
  {
    id: 'nolte',
    name: 'Nolte Küchen',
    slug: 'nolte',
    segment: 'premium',
    country: 'DE',
    website: 'https://www.nolte-kuechen.com',
    catalogPaths: ['/fr/cuisines/'],
    priority: 4,
    enabled: true,
    scrapingDifficulty: 'medium',
    scrapingFrequency: 'monthly',
    hasPricesOnline: false,
    has3DConfigurator: true,
  },
  {
    id: 'hacker',
    name: 'Häcker Küchen',
    slug: 'hacker',
    segment: 'premium',
    country: 'DE',
    website: 'https://www.haecker-kuechen.com',
    catalogPaths: ['/fr/'],
    priority: 5,
    enabled: true,
    scrapingDifficulty: 'medium',
    scrapingFrequency: 'monthly',
    hasPricesOnline: false,
    has3DConfigurator: true,
  },
  {
    id: 'kvik',
    name: 'Kvik',
    slug: 'kvik',
    segment: 'mid',
    country: 'DK',
    website: 'https://www.kvik.fr',
    catalogPaths: ['/cuisines/'],
    priority: 4,
    enabled: true,
    scrapingDifficulty: 'easy',
    scrapingFrequency: 'weekly',
    hasPricesOnline: true,
    has3DConfigurator: false,
  },
];

/**
 * Get brands by priority (lower number = higher priority)
 */
export function getBrandsByPriority(): BrandScrapingConfig[] {
  return [...BRANDS_CONFIG].sort((a, b) => a.priority - b.priority);
}

/**
 * Get enabled brands only
 */
export function getEnabledBrands(): BrandScrapingConfig[] {
  return BRANDS_CONFIG.filter((b) => b.enabled);
}

/**
 * Get brands by group
 */
export function getBrandsByGroup(group: string): BrandScrapingConfig[] {
  return BRANDS_CONFIG.filter((b) => b.parentGroup === group);
}

/**
 * Get brand by ID
 */
export function getBrandConfig(id: string): BrandScrapingConfig | undefined {
  return BRANDS_CONFIG.find((b) => b.id === id || b.slug === id);
}

/**
 * Get brands by segment
 */
export function getBrandsBySegment(segment: Segment): BrandScrapingConfig[] {
  return BRANDS_CONFIG.filter((b) => b.segment === segment);
}

/**
 * Get brands with online prices
 */
export function getBrandsWithPrices(): BrandScrapingConfig[] {
  return BRANDS_CONFIG.filter((b) => b.hasPricesOnline);
}

export default BRANDS_CONFIG;
