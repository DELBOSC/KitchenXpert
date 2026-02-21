/**
 * Handle Model
 */

import type { PriceType } from './cabinet.js';

export type HandleType = 'bar' | 'knob' | 'profile' | 'integrated' | 'recessed' | 'cup' | 'edge_pull';

export type HandleMaterial = 'stainless' | 'aluminum' | 'brass' | 'zinc' | 'wood' | 'leather' | 'plastic' | 'ceramic';

export type HandleFinish = 'brushed' | 'polished' | 'matte' | 'painted' | 'antique' | 'chrome' | 'black' | 'gold';

export type HandleStyle = 'modern' | 'classic' | 'industrial' | 'scandinavian' | 'transitional';

export interface HandleDimensions {
  length?: number; // mm (center-to-center for bars)
  width?: number;
  projection?: number; // How far it sticks out
}

export interface HandlePricing {
  priceUnit?: number; // Price per handle
  pricePack?: number; // Price per pack
  packQuantity?: number;
  priceType: PriceType;
}

export interface Handle {
  id: string;
  brandId: string;

  name: string;
  reference: string;
  description?: string;

  type: HandleType;
  style?: HandleStyle;

  material: HandleMaterial;
  finish?: HandleFinish;

  dimensions: HandleDimensions;
  colors: string[];
  pricing: HandlePricing;

  images: string[];
  url: string;
  isActive: boolean;

  scrapedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateHandleInput {
  brandId: string;

  name: string;
  reference: string;
  description?: string;

  type: HandleType;
  style?: HandleStyle;

  material: HandleMaterial;
  finish?: HandleFinish;

  length?: number;
  width?: number;
  projection?: number;

  colors?: string[];

  priceUnit?: number;
  pricePack?: number;
  packQuantity?: number;
  priceType?: PriceType;

  images?: string[];
  url: string;
}

export interface HandleSearchParams {
  brandIds?: string[];
  types?: HandleType[];
  materials?: HandleMaterial[];
  finishes?: HandleFinish[];
  styles?: HandleStyle[];
  lengthMin?: number;
  lengthMax?: number;
  priceMin?: number;
  priceMax?: number;
  limit?: number;
  offset?: number;
}

/**
 * Standard bar handle lengths (center-to-center)
 */
export const STANDARD_BAR_LENGTHS = [96, 128, 160, 192, 224, 256, 320, 448, 576];

/**
 * Handle type labels
 */
export const HANDLE_TYPE_LABELS: Record<HandleType, { fr: string; en: string }> = {
  bar: { fr: 'Barre', en: 'Bar' },
  knob: { fr: 'Bouton', en: 'Knob' },
  profile: { fr: 'Profil', en: 'Profile' },
  integrated: { fr: 'Intégré', en: 'Integrated' },
  recessed: { fr: 'Encastré', en: 'Recessed' },
  cup: { fr: 'Coquille', en: 'Cup' },
  edge_pull: { fr: 'Tirage de chant', en: 'Edge Pull' },
};
