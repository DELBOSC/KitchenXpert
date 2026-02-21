/**
 * Cabinet Model
 */

export type CabinetCategory = 'base' | 'wall' | 'tall' | 'corner' | 'island';

export type CabinetType =
  // Base cabinets
  | 'base_standard'
  | 'base_drawer'
  | 'base_sink'
  | 'base_hob'
  | 'base_corner'
  | 'base_corner_carousel'
  | 'base_pull_out'
  | 'base_trash'
  | 'base_bottle'
  // Wall cabinets
  | 'wall_standard'
  | 'wall_lift_up'
  | 'wall_corner'
  | 'wall_extractor'
  | 'wall_open'
  | 'wall_glass'
  // Tall cabinets
  | 'tall_pantry'
  | 'tall_oven'
  | 'tall_fridge'
  | 'tall_broom'
  | 'tall_combo'
  // Island
  | 'island_base'
  | 'island_drawer'
  | 'island_open'
  // Others
  | 'plinth'
  | 'cornice'
  | 'filler'
  | 'end_panel';

export type PriceType = 'fixed' | 'from' | 'estimate' | 'on_request';

export interface CabinetDimensions {
  width: number; // mm
  height: number;
  depth: number;
  widthMin?: number;
  widthMax?: number;
  heightAdjustable?: boolean;
}

export interface CabinetConfiguration {
  doors: number;
  drawers: number;
  shelves: number;
  pullOut?: boolean;
  carousel?: boolean;
  bins?: number;
}

export interface CabinetCompatibility {
  applianceTypes?: string[];
  sinkCompatible?: boolean;
  hobCompatible?: boolean;
  extractorCompatible?: boolean;
}

export interface CabinetPricing {
  priceHT?: number;
  priceTTC?: number;
  priceUnit: string;
  priceType: PriceType;
  priceDate?: Date;
}

export interface CabinetImages {
  main?: string;
  thumbnails: string[];
  technical?: string;
  model3D?: string;
}

export interface Cabinet {
  id: string;
  externalId?: string;
  brandId: string;
  collectionId?: string;

  type: CabinetType;
  category: CabinetCategory;

  name: string;
  reference: string;
  description?: string;

  dimensions: CabinetDimensions;
  configuration: CabinetConfiguration;
  compatibility: CabinetCompatibility;
  pricing: CabinetPricing;
  images: CabinetImages;

  availableFinishes: string[];
  availableColors: string[];

  url: string;
  tags: string[];
  popularity?: number;
  isActive: boolean;

  scrapedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCabinetInput {
  externalId?: string;
  brandId: string;
  collectionId?: string;

  type: CabinetType;
  category: CabinetCategory;

  name: string;
  reference: string;
  description?: string;

  width: number;
  height: number;
  depth: number;
  widthMin?: number;
  widthMax?: number;
  heightAdjustable?: boolean;

  doors?: number;
  drawers?: number;
  shelves?: number;
  hasPullOut?: boolean;
  hasCarousel?: boolean;
  bins?: number;

  applianceTypes?: string[];
  sinkCompatible?: boolean;
  hobCompatible?: boolean;
  extractorCompatible?: boolean;

  priceHT?: number;
  priceTTC?: number;
  priceType?: PriceType;

  availableFinishes?: string[];
  availableColors?: string[];

  imageMain?: string;
  imageThumbnails?: string[];
  imageTechnical?: string;
  model3D?: string;

  url: string;
  tags?: string[];
}

export interface CabinetSearchParams {
  brandIds?: string[];
  collectionIds?: string[];
  types?: CabinetType[];
  categories?: CabinetCategory[];
  widthMin?: number;
  widthMax?: number;
  heightMin?: number;
  heightMax?: number;
  priceMin?: number;
  priceMax?: number;
  sinkCompatible?: boolean;
  hobCompatible?: boolean;
  limit?: number;
  offset?: number;
  orderBy?: 'price' | 'width' | 'popularity' | 'createdAt';
  orderDir?: 'asc' | 'desc';
}

/**
 * Infer category from cabinet type
 */
export function getCategoryFromType(type: CabinetType): CabinetCategory {
  if (type.startsWith('base_') || type === 'plinth') return 'base';
  if (type.startsWith('wall_') || type === 'cornice') return 'wall';
  if (type.startsWith('tall_')) return 'tall';
  if (type.startsWith('island_')) return 'island';
  if (type.includes('corner')) return 'corner';
  return 'base';
}

/**
 * Standard IKEA METOD widths
 */
export const STANDARD_WIDTHS = [150, 200, 300, 400, 450, 600, 800, 900, 1000, 1200];

/**
 * Standard heights by category
 */
export const STANDARD_HEIGHTS: Record<CabinetCategory, number[]> = {
  base: [720, 780, 870],
  wall: [400, 600, 720, 800, 900],
  tall: [1400, 1800, 2000, 2100, 2200, 2400],
  corner: [720, 780, 870],
  island: [720, 780, 870, 900],
};

/**
 * Standard depths by category
 */
export const STANDARD_DEPTHS: Record<CabinetCategory, number[]> = {
  base: [560, 580, 600],
  wall: [320, 370, 400],
  tall: [560, 580, 600],
  corner: [560, 580, 600],
  island: [600, 650, 700, 900],
};
