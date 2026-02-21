/**
 * Brand/Retailer Model
 */

export type Segment = 'entry' | 'entry_mid' | 'mid' | 'mid_premium' | 'premium' | 'luxury';

export type ScrapingFrequency = 'daily' | 'weekly' | 'monthly';

export type ScrapingDifficulty = 'easy' | 'medium' | 'hard';

export interface BrandScrapingConfig {
  enabled: boolean;
  frequency: ScrapingFrequency;
  difficulty: ScrapingDifficulty;
  lastScrapedAt?: Date;
}

export interface BrandFeatures {
  has3DConfigurator: boolean;
  hasPricesOnline: boolean;
  hasOnlineOrdering: boolean;
  deliveryType: 'store' | 'home' | 'both';
  installationType: 'included' | 'optional' | 'not_available';
}

export interface BrandWarranty {
  cabinets?: number; // years
  hinges?: number;
  worktops?: number;
}

export interface BrandStats {
  storeCount?: number;
  collectionsCount: number;
  productsCount: number;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  parentGroup?: string;
  segment: Segment;
  country: string;
  madeIn: string[];

  website: string;
  catalogUrl?: string;

  scraping: BrandScrapingConfig;
  features: BrandFeatures;
  warranty: BrandWarranty;
  stats: BrandStats;

  logo?: string;
  priority: number;
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface BrandConfig {
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
  notes?: string;
}

export interface CreateBrandInput {
  name: string;
  slug: string;
  parentGroup?: string;
  segment: Segment;
  country?: string;
  website: string;
  catalogUrl?: string;
  scrapingEnabled?: boolean;
  scrapingFrequency?: ScrapingFrequency;
  scrapingDifficulty?: ScrapingDifficulty;
  has3DConfigurator?: boolean;
  hasPricesOnline?: boolean;
  logo?: string;
  priority?: number;
}
