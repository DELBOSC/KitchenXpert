/**
 * Facade/Door Model
 */

import type { PriceType } from './cabinet.js';

export type FacadeType = 'door' | 'drawer_front' | 'lift_up' | 'glass_door';

export type FacadeStyle =
  | 'flat'
  | 'shaker'
  | 'classic'
  | 'handleless'
  | 'slab'
  | 'beaded'
  | 'rustic';

export type FacadeMaterial =
  | 'melamine'
  | 'laminate'
  | 'lacquer_matte'
  | 'lacquer_gloss'
  | 'lacquer_satin'
  | 'acrylic'
  | 'pet'
  | 'veneer'
  | 'solid_wood'
  | 'glass'
  | 'fenix'
  | 'ceramic';

export type FacadeFinish =
  | 'matte'
  | 'satin'
  | 'gloss'
  | 'super_matte'
  | 'textured'
  | 'soft_touch';

export type ColorCategory = 'neutral' | 'warm' | 'cool' | 'bold' | 'wood' | 'stone';

export interface FacadeColor {
  id: string;
  name: string;
  code?: string;
  hexCode?: string;
  category?: ColorCategory;
  image?: string;
}

export interface FacadeEdging {
  type: 'matching' | 'contrast' | 'aluminum';
  thickness: number; // mm
}

export interface FacadeDoorPrice {
  width: number; // mm
  height: number; // mm
  price: number;
}

export interface FacadePricing {
  pricePerSquareMeter?: number;
  doorPrices?: FacadeDoorPrice[];
  priceUnit: string;
  priceType: PriceType;
}

export interface Facade {
  id: string;
  brandId: string;
  collectionId?: string;

  name: string;
  reference: string;
  description?: string;

  type: FacadeType;
  style: FacadeStyle;

  material: FacadeMaterial;
  thickness?: number; // mm

  finishes: FacadeFinish[];
  colors: FacadeColor[];
  edging?: FacadeEdging;
  pricing: FacadePricing;

  images: string[];
  url: string;
  isActive: boolean;

  scrapedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFacadeInput {
  brandId: string;
  collectionId?: string;

  name: string;
  reference: string;
  description?: string;

  type: FacadeType;
  style: FacadeStyle;

  material: FacadeMaterial;
  thickness?: number;

  finishes?: FacadeFinish[];
  colors?: Array<{
    name: string;
    code?: string;
    hexCode?: string;
    category?: ColorCategory;
    image?: string;
  }>;

  edgingType?: string;
  edgingThickness?: number;

  pricePerSquareMeter?: number;
  doorPrices?: FacadeDoorPrice[];
  priceType?: PriceType;

  images?: string[];
  url: string;
}

export interface FacadeSearchParams {
  brandIds?: string[];
  collectionIds?: string[];
  types?: FacadeType[];
  styles?: FacadeStyle[];
  materials?: FacadeMaterial[];
  finishes?: FacadeFinish[];
  colorCategories?: ColorCategory[];
  priceMin?: number;
  priceMax?: number;
  limit?: number;
  offset?: number;
}

/**
 * Material quality tiers
 */
export const FACADE_MATERIAL_TIERS: Record<FacadeMaterial, 'entry' | 'mid' | 'premium' | 'luxury'> = {
  melamine: 'entry',
  laminate: 'entry',
  pet: 'mid',
  lacquer_matte: 'mid',
  lacquer_satin: 'mid',
  acrylic: 'mid',
  lacquer_gloss: 'premium',
  veneer: 'premium',
  fenix: 'premium',
  glass: 'premium',
  solid_wood: 'luxury',
  ceramic: 'luxury',
};

/**
 * Style descriptions for UI
 */
export const FACADE_STYLE_LABELS: Record<FacadeStyle, { fr: string; en: string }> = {
  flat: { fr: 'Plat / Moderne', en: 'Flat / Modern' },
  shaker: { fr: 'Encadré simple', en: 'Shaker' },
  classic: { fr: 'Classique moulures', en: 'Classic' },
  handleless: { fr: 'Sans poignée', en: 'Handleless' },
  slab: { fr: 'Dalle', en: 'Slab' },
  beaded: { fr: 'Cannelé', en: 'Beaded' },
  rustic: { fr: 'Rustique', en: 'Rustic' },
};
