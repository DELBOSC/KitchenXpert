/**
 * Worktop Model
 */

import type { PriceType } from './cabinet.js';

export type WorktopMaterial =
  | 'laminate'
  | 'wood_solid'
  | 'wood_veneer'
  | 'quartz'
  | 'granite'
  | 'marble'
  | 'ceramic'
  | 'compact'
  | 'stainless'
  | 'concrete'
  | 'glass'
  | 'corian';

export type WorktopFinish =
  | 'matte'
  | 'gloss'
  | 'satin'
  | 'textured'
  | 'brushed'
  | 'polished';

export interface WorktopColor {
  id: string;
  name: string;
  hexCode?: string;
  image?: string;
}

export interface WorktopDimensions {
  thicknesses: number[]; // mm (12, 20, 30, 40)
  depths: number[]; // mm (600, 650, 900)
  maxLength?: number; // mm
}

export interface WorktopProperties {
  heatResistant: boolean;
  scratchResistant: boolean;
  stainResistant: boolean;
  foodSafe: boolean;
  antibacterial?: boolean;
}

export interface WorktopPricing {
  pricePerMeter?: number;
  pricePerSquareMeter?: number;
  priceUnit: string;
  priceType: PriceType;
}

export interface Worktop {
  id: string;
  brandId: string;

  name: string;
  reference: string;
  description?: string;

  material: WorktopMaterial;
  materialDetail?: string;

  dimensions: WorktopDimensions;
  finishes: WorktopFinish[];
  colors: WorktopColor[];
  properties: WorktopProperties;
  pricing: WorktopPricing;

  images: string[];
  url: string;
  isActive: boolean;

  scrapedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWorktopInput {
  brandId: string;

  name: string;
  reference: string;
  description?: string;

  material: WorktopMaterial;
  materialDetail?: string;

  thicknesses?: number[];
  depths?: number[];
  maxLength?: number;

  finishes?: WorktopFinish[];
  colors?: Array<{ name: string; hexCode?: string; image?: string }>;

  heatResistant?: boolean;
  scratchResistant?: boolean;
  stainResistant?: boolean;
  foodSafe?: boolean;
  antibacterial?: boolean;

  pricePerMeter?: number;
  pricePerSquareMeter?: number;
  priceType?: PriceType;

  images?: string[];
  url: string;
}

export interface WorktopSearchParams {
  brandIds?: string[];
  materials?: WorktopMaterial[];
  finishes?: WorktopFinish[];
  thickness?: number;
  priceMin?: number;
  priceMax?: number;
  limit?: number;
  offset?: number;
}

/**
 * Material tiers for pricing guidance
 */
export const WORKTOP_MATERIAL_TIERS: Record<WorktopMaterial, 'entry' | 'mid' | 'premium' | 'luxury'> = {
  laminate: 'entry',
  wood_veneer: 'entry',
  wood_solid: 'mid',
  quartz: 'mid',
  granite: 'mid',
  compact: 'premium',
  ceramic: 'premium',
  stainless: 'premium',
  corian: 'premium',
  marble: 'luxury',
  concrete: 'luxury',
  glass: 'luxury',
};
