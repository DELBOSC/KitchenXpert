/**
 * Kitchen material constants
 */

/** Wood Types for Cabinets */
export enum WoodType {
  OAK = 'oak',
  MAPLE = 'maple',
  CHERRY = 'cherry',
  HICKORY = 'hickory',
  BIRCH = 'birch',
  WALNUT = 'walnut',
  ASH = 'ash',
  ALDER = 'alder',
  PINE = 'pine',
  MAHOGANY = 'mahogany',
  BAMBOO = 'bamboo',
}

/** Wood Type Display Names */
export const WOOD_TYPE_LABELS: Record<WoodType, string> = {
  [WoodType.OAK]: 'Oak',
  [WoodType.MAPLE]: 'Maple',
  [WoodType.CHERRY]: 'Cherry',
  [WoodType.HICKORY]: 'Hickory',
  [WoodType.BIRCH]: 'Birch',
  [WoodType.WALNUT]: 'Walnut',
  [WoodType.ASH]: 'Ash',
  [WoodType.ALDER]: 'Alder',
  [WoodType.PINE]: 'Pine',
  [WoodType.MAHOGANY]: 'Mahogany',
  [WoodType.BAMBOO]: 'Bamboo',
};

/** Cabinet Construction Materials */
export enum CabinetMaterial {
  SOLID_WOOD = 'solid_wood',
  PLYWOOD = 'plywood',
  MDF = 'mdf',
  PARTICLE_BOARD = 'particle_board',
  MELAMINE = 'melamine',
  THERMOFOIL = 'thermofoil',
  LAMINATE = 'laminate',
  METAL = 'metal',
}

/** Cabinet Material Labels */
export const CABINET_MATERIAL_LABELS: Record<CabinetMaterial, string> = {
  [CabinetMaterial.SOLID_WOOD]: 'Solid Wood',
  [CabinetMaterial.PLYWOOD]: 'Plywood',
  [CabinetMaterial.MDF]: 'MDF (Medium-Density Fiberboard)',
  [CabinetMaterial.PARTICLE_BOARD]: 'Particle Board',
  [CabinetMaterial.MELAMINE]: 'Melamine',
  [CabinetMaterial.THERMOFOIL]: 'Thermofoil',
  [CabinetMaterial.LAMINATE]: 'Laminate',
  [CabinetMaterial.METAL]: 'Metal',
};

/** Countertop Materials */
export enum CountertopMaterial {
  GRANITE = 'granite',
  MARBLE = 'marble',
  QUARTZ = 'quartz',
  QUARTZITE = 'quartzite',
  SOAPSTONE = 'soapstone',
  SOLID_SURFACE = 'solid_surface',
  LAMINATE = 'laminate',
  BUTCHER_BLOCK = 'butcher_block',
  CONCRETE = 'concrete',
  STAINLESS_STEEL = 'stainless_steel',
  RECYCLED_GLASS = 'recycled_glass',
  CERAMIC_TILE = 'ceramic_tile',
  PORCELAIN = 'porcelain',
}

/** Countertop Material Labels */
export const COUNTERTOP_MATERIAL_LABELS: Record<CountertopMaterial, string> = {
  [CountertopMaterial.GRANITE]: 'Granite',
  [CountertopMaterial.MARBLE]: 'Marble',
  [CountertopMaterial.QUARTZ]: 'Quartz',
  [CountertopMaterial.QUARTZITE]: 'Quartzite',
  [CountertopMaterial.SOAPSTONE]: 'Soapstone',
  [CountertopMaterial.SOLID_SURFACE]: 'Solid Surface (Corian)',
  [CountertopMaterial.LAMINATE]: 'Laminate',
  [CountertopMaterial.BUTCHER_BLOCK]: 'Butcher Block',
  [CountertopMaterial.CONCRETE]: 'Concrete',
  [CountertopMaterial.STAINLESS_STEEL]: 'Stainless Steel',
  [CountertopMaterial.RECYCLED_GLASS]: 'Recycled Glass',
  [CountertopMaterial.CERAMIC_TILE]: 'Ceramic Tile',
  [CountertopMaterial.PORCELAIN]: 'Porcelain',
};

/** Surface Finishes */
export enum SurfaceFinish {
  // Wood finishes
  NATURAL = 'natural',
  STAINED = 'stained',
  PAINTED = 'painted',
  LACQUERED = 'lacquered',
  GLAZED = 'glazed',
  DISTRESSED = 'distressed',

  // Surface textures
  MATTE = 'matte',
  SATIN = 'satin',
  SEMI_GLOSS = 'semi_gloss',
  HIGH_GLOSS = 'high_gloss',

  // Stone finishes
  POLISHED = 'polished',
  HONED = 'honed',
  LEATHERED = 'leathered',
  BRUSHED = 'brushed',
  FLAMED = 'flamed',
}

/** Surface Finish Labels */
export const SURFACE_FINISH_LABELS: Record<SurfaceFinish, string> = {
  [SurfaceFinish.NATURAL]: 'Natural',
  [SurfaceFinish.STAINED]: 'Stained',
  [SurfaceFinish.PAINTED]: 'Painted',
  [SurfaceFinish.LACQUERED]: 'Lacquered',
  [SurfaceFinish.GLAZED]: 'Glazed',
  [SurfaceFinish.DISTRESSED]: 'Distressed',
  [SurfaceFinish.MATTE]: 'Matte',
  [SurfaceFinish.SATIN]: 'Satin',
  [SurfaceFinish.SEMI_GLOSS]: 'Semi-Gloss',
  [SurfaceFinish.HIGH_GLOSS]: 'High Gloss',
  [SurfaceFinish.POLISHED]: 'Polished',
  [SurfaceFinish.HONED]: 'Honed',
  [SurfaceFinish.LEATHERED]: 'Leathered',
  [SurfaceFinish.BRUSHED]: 'Brushed',
  [SurfaceFinish.FLAMED]: 'Flamed',
};

/** Hardware Materials */
export enum HardwareMaterial {
  STAINLESS_STEEL = 'stainless_steel',
  BRASS = 'brass',
  BRONZE = 'bronze',
  NICKEL = 'nickel',
  CHROME = 'chrome',
  ZINC = 'zinc',
  ALUMINUM = 'aluminum',
  IRON = 'iron',
  COPPER = 'copper',
  CERAMIC = 'ceramic',
  GLASS = 'glass',
  CRYSTAL = 'crystal',
  LEATHER = 'leather',
}

/** Hardware Material Labels */
export const HARDWARE_MATERIAL_LABELS: Record<HardwareMaterial, string> = {
  [HardwareMaterial.STAINLESS_STEEL]: 'Stainless Steel',
  [HardwareMaterial.BRASS]: 'Brass',
  [HardwareMaterial.BRONZE]: 'Bronze',
  [HardwareMaterial.NICKEL]: 'Nickel',
  [HardwareMaterial.CHROME]: 'Chrome',
  [HardwareMaterial.ZINC]: 'Zinc',
  [HardwareMaterial.ALUMINUM]: 'Aluminum',
  [HardwareMaterial.IRON]: 'Iron',
  [HardwareMaterial.COPPER]: 'Copper',
  [HardwareMaterial.CERAMIC]: 'Ceramic',
  [HardwareMaterial.GLASS]: 'Glass',
  [HardwareMaterial.CRYSTAL]: 'Crystal',
  [HardwareMaterial.LEATHER]: 'Leather',
};

/** Flooring Materials */
export enum FlooringMaterial {
  HARDWOOD = 'hardwood',
  ENGINEERED_WOOD = 'engineered_wood',
  LAMINATE = 'laminate',
  VINYL = 'vinyl',
  TILE_CERAMIC = 'tile_ceramic',
  TILE_PORCELAIN = 'tile_porcelain',
  NATURAL_STONE = 'natural_stone',
  CONCRETE = 'concrete',
  CORK = 'cork',
  BAMBOO = 'bamboo',
  LINOLEUM = 'linoleum',
}

/** Flooring Material Labels */
export const FLOORING_MATERIAL_LABELS: Record<FlooringMaterial, string> = {
  [FlooringMaterial.HARDWOOD]: 'Hardwood',
  [FlooringMaterial.ENGINEERED_WOOD]: 'Engineered Wood',
  [FlooringMaterial.LAMINATE]: 'Laminate',
  [FlooringMaterial.VINYL]: 'Vinyl',
  [FlooringMaterial.TILE_CERAMIC]: 'Ceramic Tile',
  [FlooringMaterial.TILE_PORCELAIN]: 'Porcelain Tile',
  [FlooringMaterial.NATURAL_STONE]: 'Natural Stone',
  [FlooringMaterial.CONCRETE]: 'Concrete',
  [FlooringMaterial.CORK]: 'Cork',
  [FlooringMaterial.BAMBOO]: 'Bamboo',
  [FlooringMaterial.LINOLEUM]: 'Linoleum',
};

/** Material Properties */
export const MATERIAL_PROPERTIES = {
  [CountertopMaterial.GRANITE]: {
    heatResistant: true,
    scratchResistant: true,
    stainResistant: false,
    maintenanceLevel: 'medium',
    priceRange: 'high',
  },
  [CountertopMaterial.QUARTZ]: {
    heatResistant: false,
    scratchResistant: true,
    stainResistant: true,
    maintenanceLevel: 'low',
    priceRange: 'high',
  },
  [CountertopMaterial.LAMINATE]: {
    heatResistant: false,
    scratchResistant: false,
    stainResistant: true,
    maintenanceLevel: 'low',
    priceRange: 'low',
  },
  [CountertopMaterial.BUTCHER_BLOCK]: {
    heatResistant: false,
    scratchResistant: false,
    stainResistant: false,
    maintenanceLevel: 'high',
    priceRange: 'medium',
  },
} as const;
