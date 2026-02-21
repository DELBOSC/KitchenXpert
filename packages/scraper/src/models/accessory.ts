/**
 * Accessory Model
 */

import type { PriceType } from './cabinet.js';

export type AccessoryType =
  | 'drawer_insert'
  | 'cutlery_tray'
  | 'knife_block'
  | 'spice_rack'
  | 'plate_holder'
  | 'pot_organizer'
  | 'lid_holder'
  | 'shelf'
  | 'rail'
  | 'basket'
  | 'pull_out_basket'
  | 'divider'
  | 'bin'
  | 'recycling_bin'
  | 'towel_rail'
  | 'hooks'
  | 'led_lighting'
  | 'under_cabinet_lighting'
  | 'motion_sensor'
  | 'soft_close'
  | 'push_to_open'
  | 'corner_carousel'
  | 'magic_corner'
  | 'tall_pull_out'
  | 'bottle_rack'
  | 'charging_station'
  | 'tablet_holder';

export type AccessoryCategory =
  | 'storage'
  | 'organization'
  | 'lighting'
  | 'hardware'
  | 'waste'
  | 'convenience';

export interface AccessoryDimensions {
  width?: number; // mm
  height?: number;
  depth?: number;
}

export interface AccessoryCompatibility {
  cabinetTypes?: string[]; // Compatible cabinet types
  cabinetWidths?: number[]; // Compatible cabinet widths
  universalFit?: boolean;
}

export interface AccessoryPricing {
  priceTTC?: number;
  priceType: PriceType;
}

export interface Accessory {
  id: string;
  brandId: string;

  name: string;
  reference: string;
  description?: string;

  type: AccessoryType;
  category: AccessoryCategory;

  dimensions: AccessoryDimensions;
  compatibility: AccessoryCompatibility;
  pricing: AccessoryPricing;

  images: string[];
  url: string;
  isActive: boolean;

  scrapedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAccessoryInput {
  brandId: string;

  name: string;
  reference: string;
  description?: string;

  type: AccessoryType;

  width?: number;
  height?: number;
  depth?: number;

  cabinetTypes?: string[];
  cabinetWidths?: number[];
  universalFit?: boolean;

  priceTTC?: number;
  priceType?: PriceType;

  images?: string[];
  url: string;
}

export interface AccessorySearchParams {
  brandIds?: string[];
  types?: AccessoryType[];
  categories?: AccessoryCategory[];
  cabinetWidth?: number;
  priceMin?: number;
  priceMax?: number;
  limit?: number;
  offset?: number;
}

/**
 * Map accessory type to category
 */
export function getAccessoryCategory(type: AccessoryType): AccessoryCategory {
  const categoryMap: Record<AccessoryType, AccessoryCategory> = {
    drawer_insert: 'organization',
    cutlery_tray: 'organization',
    knife_block: 'organization',
    spice_rack: 'organization',
    plate_holder: 'organization',
    pot_organizer: 'organization',
    lid_holder: 'organization',
    shelf: 'storage',
    rail: 'storage',
    basket: 'storage',
    pull_out_basket: 'storage',
    divider: 'organization',
    bin: 'waste',
    recycling_bin: 'waste',
    towel_rail: 'convenience',
    hooks: 'convenience',
    led_lighting: 'lighting',
    under_cabinet_lighting: 'lighting',
    motion_sensor: 'hardware',
    soft_close: 'hardware',
    push_to_open: 'hardware',
    corner_carousel: 'storage',
    magic_corner: 'storage',
    tall_pull_out: 'storage',
    bottle_rack: 'storage',
    charging_station: 'convenience',
    tablet_holder: 'convenience',
  };
  return categoryMap[type];
}

/**
 * Accessory type labels
 */
export const ACCESSORY_TYPE_LABELS: Record<AccessoryType, { fr: string; en: string }> = {
  drawer_insert: { fr: 'Insert tiroir', en: 'Drawer Insert' },
  cutlery_tray: { fr: 'Range-couverts', en: 'Cutlery Tray' },
  knife_block: { fr: 'Bloc couteaux', en: 'Knife Block' },
  spice_rack: { fr: 'Range-épices', en: 'Spice Rack' },
  plate_holder: { fr: 'Porte-assiettes', en: 'Plate Holder' },
  pot_organizer: { fr: 'Range-casseroles', en: 'Pot Organizer' },
  lid_holder: { fr: 'Porte-couvercles', en: 'Lid Holder' },
  shelf: { fr: 'Étagère', en: 'Shelf' },
  rail: { fr: 'Barre de crédence', en: 'Rail' },
  basket: { fr: 'Panier', en: 'Basket' },
  pull_out_basket: { fr: 'Panier coulissant', en: 'Pull-out Basket' },
  divider: { fr: 'Séparateur', en: 'Divider' },
  bin: { fr: 'Poubelle', en: 'Bin' },
  recycling_bin: { fr: 'Poubelle tri sélectif', en: 'Recycling Bin' },
  towel_rail: { fr: 'Porte-serviettes', en: 'Towel Rail' },
  hooks: { fr: 'Crochets', en: 'Hooks' },
  led_lighting: { fr: 'Éclairage LED', en: 'LED Lighting' },
  under_cabinet_lighting: { fr: 'Éclairage sous meuble', en: 'Under Cabinet Lighting' },
  motion_sensor: { fr: 'Capteur de mouvement', en: 'Motion Sensor' },
  soft_close: { fr: 'Fermeture douce', en: 'Soft Close' },
  push_to_open: { fr: 'Push to open', en: 'Push to Open' },
  corner_carousel: { fr: 'Plateau tournant', en: 'Corner Carousel' },
  magic_corner: { fr: 'Magic corner', en: 'Magic Corner' },
  tall_pull_out: { fr: 'Colonne coulissante', en: 'Tall Pull-out' },
  bottle_rack: { fr: 'Range-bouteilles', en: 'Bottle Rack' },
  charging_station: { fr: 'Station de charge', en: 'Charging Station' },
  tablet_holder: { fr: 'Support tablette', en: 'Tablet Holder' },
};
