/**
 * Appliance Model
 */

import type { PriceType } from './cabinet.js';

export type ApplianceType =
  // Cooking
  | 'hob_induction'
  | 'hob_gas'
  | 'hob_ceramic'
  | 'hob_mixed'
  | 'oven_single'
  | 'oven_double'
  | 'oven_compact'
  | 'microwave'
  | 'microwave_combi'
  | 'steam_oven'
  | 'warming_drawer'
  // Extraction
  | 'hood_wall'
  | 'hood_island'
  | 'hood_integrated'
  | 'hood_ceiling'
  | 'hood_downdraft'
  // Cold
  | 'fridge_integrated'
  | 'fridge_freezer'
  | 'fridge_american'
  | 'freezer'
  | 'wine_cooler'
  // Washing
  | 'dishwasher_full'
  | 'dishwasher_compact'
  // Sink
  | 'sink_single'
  | 'sink_double'
  | 'sink_1_5'
  // Tap
  | 'tap_standard'
  | 'tap_pull_out'
  | 'tap_boiling'
  | 'tap_filtered'
  // Others
  | 'waste_disposal'
  | 'coffee_machine';

export type ApplianceCategory =
  | 'cooking'
  | 'extraction'
  | 'cold'
  | 'washing'
  | 'sink'
  | 'tap'
  | 'other';

export type EnergyClass = 'A+++' | 'A++' | 'A+' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

export type InclusionType = 'included' | 'optional' | 'separate';

export interface ApplianceDimensions {
  width: number; // mm
  height: number;
  depth: number;
  cutoutWidth?: number; // For built-in hobs
  cutoutDepth?: number;
}

export interface ApplianceSpecs {
  energyClass?: EnergyClass;
  capacity?: number; // Liters or kg
  power?: number; // Watts
  noiseLevel?: number; // dB
  programs?: number;
  connectivity?: boolean;
}

export interface AppliancePricing {
  priceTTC?: number;
  priceType: PriceType;
}

export interface Appliance {
  id: string;
  brandId: string; // Kitchen brand (retailer)
  manufacturerBrand: string; // Actual brand (Bosch, Siemens, etc.)

  name: string;
  reference: string;
  description?: string;

  type: ApplianceType;
  category: ApplianceCategory;

  dimensions: ApplianceDimensions;
  specs: ApplianceSpecs;
  pricing: AppliancePricing;

  inclusion: InclusionType;

  images: string[];
  url: string;
  isActive: boolean;

  scrapedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateApplianceInput {
  brandId: string;
  manufacturerBrand: string;

  name: string;
  reference: string;
  description?: string;

  type: ApplianceType;

  width: number;
  height: number;
  depth: number;
  cutoutWidth?: number;
  cutoutDepth?: number;

  energyClass?: EnergyClass;
  capacity?: number;
  power?: number;
  noiseLevel?: number;
  programs?: number;
  connectivity?: boolean;

  priceTTC?: number;
  priceType?: PriceType;

  inclusion?: InclusionType;

  images?: string[];
  url: string;
}

export interface ApplianceSearchParams {
  brandIds?: string[];
  manufacturerBrands?: string[];
  types?: ApplianceType[];
  categories?: ApplianceCategory[];
  energyClasses?: EnergyClass[];
  widthMin?: number;
  widthMax?: number;
  priceMin?: number;
  priceMax?: number;
  connectivity?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Map appliance type to category
 */
export function getApplianceCategory(type: ApplianceType): ApplianceCategory {
  if (type.startsWith('hob_') || type.startsWith('oven_') || type.startsWith('microwave') ||
      type === 'steam_oven' || type === 'warming_drawer' || type === 'coffee_machine') {
    return 'cooking';
  }
  if (type.startsWith('hood_')) return 'extraction';
  if (type.startsWith('fridge_') || type === 'freezer' || type === 'wine_cooler') return 'cold';
  if (type.startsWith('dishwasher_') || type === 'waste_disposal') return 'washing';
  if (type.startsWith('sink_')) return 'sink';
  if (type.startsWith('tap_')) return 'tap';
  return 'other';
}

/**
 * Popular appliance manufacturers
 */
export const APPLIANCE_MANUFACTURERS = [
  // German
  'Bosch',
  'Siemens',
  'Neff',
  'Gaggenau',
  'Miele',
  'AEG',
  'Liebherr',
  'Beko',
  'Küppersbusch',
  // Italian
  'Smeg',
  'Bertazzoni',
  'ILVE',
  'Elica',
  'Faber',
  // Swedish
  'Electrolux',
  // French
  'Brandt',
  'De Dietrich',
  'Sauter',
  'Rosieres',
  // American
  'KitchenAid',
  'Whirlpool',
  'GE',
  'Sub-Zero',
  'Wolf',
  // British
  'Rangemaster',
  'AGA',
  // Others
  'Samsung',
  'LG',
  'Hotpoint',
  'Indesit',
  'Candy',
  'Haier',
];

/**
 * Standard built-in dimensions (mm)
 */
export const STANDARD_BUILTIN_WIDTHS: Record<string, number[]> = {
  hob: [300, 600, 700, 800, 900],
  oven: [450, 600],
  microwave: [380, 450, 600],
  dishwasher: [450, 600],
  fridge: [540, 560, 600, 700, 900],
};

/**
 * Appliance type labels
 */
export const APPLIANCE_TYPE_LABELS: Record<ApplianceType, { fr: string; en: string }> = {
  hob_induction: { fr: 'Plaque induction', en: 'Induction Hob' },
  hob_gas: { fr: 'Plaque gaz', en: 'Gas Hob' },
  hob_ceramic: { fr: 'Plaque vitrocéramique', en: 'Ceramic Hob' },
  hob_mixed: { fr: 'Plaque mixte', en: 'Mixed Hob' },
  oven_single: { fr: 'Four simple', en: 'Single Oven' },
  oven_double: { fr: 'Four double', en: 'Double Oven' },
  oven_compact: { fr: 'Four compact', en: 'Compact Oven' },
  microwave: { fr: 'Micro-ondes', en: 'Microwave' },
  microwave_combi: { fr: 'Micro-ondes combiné', en: 'Combi Microwave' },
  steam_oven: { fr: 'Four vapeur', en: 'Steam Oven' },
  warming_drawer: { fr: 'Tiroir chauffant', en: 'Warming Drawer' },
  hood_wall: { fr: 'Hotte murale', en: 'Wall Hood' },
  hood_island: { fr: 'Hotte îlot', en: 'Island Hood' },
  hood_integrated: { fr: 'Hotte intégrée', en: 'Integrated Hood' },
  hood_ceiling: { fr: 'Hotte plafond', en: 'Ceiling Hood' },
  hood_downdraft: { fr: 'Hotte escamotable', en: 'Downdraft Hood' },
  fridge_integrated: { fr: 'Réfrigérateur intégrable', en: 'Integrated Fridge' },
  fridge_freezer: { fr: 'Réfrigérateur-congélateur', en: 'Fridge Freezer' },
  fridge_american: { fr: 'Réfrigérateur américain', en: 'American Fridge' },
  freezer: { fr: 'Congélateur', en: 'Freezer' },
  wine_cooler: { fr: 'Cave à vin', en: 'Wine Cooler' },
  dishwasher_full: { fr: 'Lave-vaisselle 60cm', en: 'Full Dishwasher' },
  dishwasher_compact: { fr: 'Lave-vaisselle 45cm', en: 'Compact Dishwasher' },
  sink_single: { fr: 'Évier simple', en: 'Single Sink' },
  sink_double: { fr: 'Évier double', en: 'Double Sink' },
  sink_1_5: { fr: 'Évier 1.5 bac', en: '1.5 Bowl Sink' },
  tap_standard: { fr: 'Mitigeur standard', en: 'Standard Tap' },
  tap_pull_out: { fr: 'Mitigeur douchette', en: 'Pull-out Tap' },
  tap_boiling: { fr: 'Robinet eau bouillante', en: 'Boiling Water Tap' },
  tap_filtered: { fr: 'Robinet filtrant', en: 'Filtered Water Tap' },
  waste_disposal: { fr: 'Broyeur déchets', en: 'Waste Disposal' },
  coffee_machine: { fr: 'Machine à café', en: 'Coffee Machine' },
};
