/**
 * Product category constants for kitchen items
 */

/** Main Product Categories */
export enum ProductCategory {
  CABINETS = 'cabinets',
  COUNTERTOPS = 'countertops',
  APPLIANCES = 'appliances',
  SINKS = 'sinks',
  FAUCETS = 'faucets',
  HARDWARE = 'hardware',
  LIGHTING = 'lighting',
  FLOORING = 'flooring',
  BACKSPLASH = 'backsplash',
  ACCESSORIES = 'accessories',
  STORAGE = 'storage',
  VENTILATION = 'ventilation',
}

/** Product Category Labels */
export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  [ProductCategory.CABINETS]: 'Cabinets',
  [ProductCategory.COUNTERTOPS]: 'Countertops',
  [ProductCategory.APPLIANCES]: 'Appliances',
  [ProductCategory.SINKS]: 'Sinks',
  [ProductCategory.FAUCETS]: 'Faucets',
  [ProductCategory.HARDWARE]: 'Hardware',
  [ProductCategory.LIGHTING]: 'Lighting',
  [ProductCategory.FLOORING]: 'Flooring',
  [ProductCategory.BACKSPLASH]: 'Backsplash',
  [ProductCategory.ACCESSORIES]: 'Accessories',
  [ProductCategory.STORAGE]: 'Storage Solutions',
  [ProductCategory.VENTILATION]: 'Ventilation',
};

/** Cabinet Subcategories */
export enum CabinetSubcategory {
  BASE_CABINET = 'base_cabinet',
  WALL_CABINET = 'wall_cabinet',
  TALL_CABINET = 'tall_cabinet',
  CORNER_CABINET = 'corner_cabinet',
  SINK_BASE = 'sink_base',
  DRAWER_BASE = 'drawer_base',
  PANTRY = 'pantry',
  ISLAND = 'island',
  OPEN_SHELVING = 'open_shelving',
  SPECIALTY = 'specialty',
}

/** Cabinet Subcategory Labels */
export const CABINET_SUBCATEGORY_LABELS: Record<CabinetSubcategory, string> = {
  [CabinetSubcategory.BASE_CABINET]: 'Base Cabinet',
  [CabinetSubcategory.WALL_CABINET]: 'Wall Cabinet',
  [CabinetSubcategory.TALL_CABINET]: 'Tall Cabinet',
  [CabinetSubcategory.CORNER_CABINET]: 'Corner Cabinet',
  [CabinetSubcategory.SINK_BASE]: 'Sink Base Cabinet',
  [CabinetSubcategory.DRAWER_BASE]: 'Drawer Base Cabinet',
  [CabinetSubcategory.PANTRY]: 'Pantry Cabinet',
  [CabinetSubcategory.ISLAND]: 'Island Cabinet',
  [CabinetSubcategory.OPEN_SHELVING]: 'Open Shelving',
  [CabinetSubcategory.SPECIALTY]: 'Specialty Cabinet',
};

/** Appliance Subcategories */
export enum ApplianceSubcategory {
  REFRIGERATOR = 'refrigerator',
  RANGE = 'range',
  COOKTOP = 'cooktop',
  WALL_OVEN = 'wall_oven',
  MICROWAVE = 'microwave',
  DISHWASHER = 'dishwasher',
  RANGE_HOOD = 'range_hood',
  GARBAGE_DISPOSAL = 'garbage_disposal',
  TRASH_COMPACTOR = 'trash_compactor',
  WINE_COOLER = 'wine_cooler',
  BEVERAGE_CENTER = 'beverage_center',
  WARMING_DRAWER = 'warming_drawer',
  FREEZER = 'freezer',
}

/** Appliance Subcategory Labels */
export const APPLIANCE_SUBCATEGORY_LABELS: Record<ApplianceSubcategory, string> = {
  [ApplianceSubcategory.REFRIGERATOR]: 'Refrigerator',
  [ApplianceSubcategory.RANGE]: 'Range',
  [ApplianceSubcategory.COOKTOP]: 'Cooktop',
  [ApplianceSubcategory.WALL_OVEN]: 'Wall Oven',
  [ApplianceSubcategory.MICROWAVE]: 'Microwave',
  [ApplianceSubcategory.DISHWASHER]: 'Dishwasher',
  [ApplianceSubcategory.RANGE_HOOD]: 'Range Hood',
  [ApplianceSubcategory.GARBAGE_DISPOSAL]: 'Garbage Disposal',
  [ApplianceSubcategory.TRASH_COMPACTOR]: 'Trash Compactor',
  [ApplianceSubcategory.WINE_COOLER]: 'Wine Cooler',
  [ApplianceSubcategory.BEVERAGE_CENTER]: 'Beverage Center',
  [ApplianceSubcategory.WARMING_DRAWER]: 'Warming Drawer',
  [ApplianceSubcategory.FREEZER]: 'Freezer',
};

/** Hardware Subcategories */
export enum HardwareSubcategory {
  KNOBS = 'knobs',
  PULLS = 'pulls',
  HANDLES = 'handles',
  HINGES = 'hinges',
  DRAWER_SLIDES = 'drawer_slides',
  LAZY_SUSAN = 'lazy_susan',
  SOFT_CLOSE = 'soft_close',
  SHELF_PINS = 'shelf_pins',
  HOOKS = 'hooks',
  ORGANIZERS = 'organizers',
}

/** Hardware Subcategory Labels */
export const HARDWARE_SUBCATEGORY_LABELS: Record<HardwareSubcategory, string> = {
  [HardwareSubcategory.KNOBS]: 'Knobs',
  [HardwareSubcategory.PULLS]: 'Pulls',
  [HardwareSubcategory.HANDLES]: 'Handles',
  [HardwareSubcategory.HINGES]: 'Hinges',
  [HardwareSubcategory.DRAWER_SLIDES]: 'Drawer Slides',
  [HardwareSubcategory.LAZY_SUSAN]: 'Lazy Susan',
  [HardwareSubcategory.SOFT_CLOSE]: 'Soft Close Mechanisms',
  [HardwareSubcategory.SHELF_PINS]: 'Shelf Pins',
  [HardwareSubcategory.HOOKS]: 'Hooks',
  [HardwareSubcategory.ORGANIZERS]: 'Organizers',
};

/** Sink Subcategories */
export enum SinkSubcategory {
  SINGLE_BOWL = 'single_bowl',
  DOUBLE_BOWL = 'double_bowl',
  FARMHOUSE = 'farmhouse',
  UNDERMOUNT = 'undermount',
  DROP_IN = 'drop_in',
  BAR_PREP = 'bar_prep',
  UTILITY = 'utility',
}

/** Sink Subcategory Labels */
export const SINK_SUBCATEGORY_LABELS: Record<SinkSubcategory, string> = {
  [SinkSubcategory.SINGLE_BOWL]: 'Single Bowl',
  [SinkSubcategory.DOUBLE_BOWL]: 'Double Bowl',
  [SinkSubcategory.FARMHOUSE]: 'Farmhouse/Apron',
  [SinkSubcategory.UNDERMOUNT]: 'Undermount',
  [SinkSubcategory.DROP_IN]: 'Drop-In/Top Mount',
  [SinkSubcategory.BAR_PREP]: 'Bar/Prep Sink',
  [SinkSubcategory.UTILITY]: 'Utility Sink',
};

/** Lighting Subcategories */
export enum LightingSubcategory {
  PENDANT = 'pendant',
  RECESSED = 'recessed',
  UNDER_CABINET = 'under_cabinet',
  CHANDELIER = 'chandelier',
  TRACK = 'track',
  FLUSH_MOUNT = 'flush_mount',
  TASK = 'task',
  ACCENT = 'accent',
}

/** Lighting Subcategory Labels */
export const LIGHTING_SUBCATEGORY_LABELS: Record<LightingSubcategory, string> = {
  [LightingSubcategory.PENDANT]: 'Pendant Lights',
  [LightingSubcategory.RECESSED]: 'Recessed Lighting',
  [LightingSubcategory.UNDER_CABINET]: 'Under Cabinet Lighting',
  [LightingSubcategory.CHANDELIER]: 'Chandeliers',
  [LightingSubcategory.TRACK]: 'Track Lighting',
  [LightingSubcategory.FLUSH_MOUNT]: 'Flush Mount',
  [LightingSubcategory.TASK]: 'Task Lighting',
  [LightingSubcategory.ACCENT]: 'Accent Lighting',
};

/** Storage Subcategories */
export enum StorageSubcategory {
  PULL_OUT_DRAWER = 'pull_out_drawer',
  LAZY_SUSAN = 'lazy_susan',
  SPICE_RACK = 'spice_rack',
  POT_RACK = 'pot_rack',
  TRASH_PULL_OUT = 'trash_pull_out',
  PANTRY_ORGANIZER = 'pantry_organizer',
  CUTLERY_TRAY = 'cutlery_tray',
  BLIND_CORNER = 'blind_corner',
  TRAY_DIVIDER = 'tray_divider',
  WINE_RACK = 'wine_rack',
}

/** Storage Subcategory Labels */
export const STORAGE_SUBCATEGORY_LABELS: Record<StorageSubcategory, string> = {
  [StorageSubcategory.PULL_OUT_DRAWER]: 'Pull-Out Drawers',
  [StorageSubcategory.LAZY_SUSAN]: 'Lazy Susan',
  [StorageSubcategory.SPICE_RACK]: 'Spice Racks',
  [StorageSubcategory.POT_RACK]: 'Pot Racks',
  [StorageSubcategory.TRASH_PULL_OUT]: 'Trash Pull-Outs',
  [StorageSubcategory.PANTRY_ORGANIZER]: 'Pantry Organizers',
  [StorageSubcategory.CUTLERY_TRAY]: 'Cutlery Trays',
  [StorageSubcategory.BLIND_CORNER]: 'Blind Corner Solutions',
  [StorageSubcategory.TRAY_DIVIDER]: 'Tray Dividers',
  [StorageSubcategory.WINE_RACK]: 'Wine Racks',
};

/** Category hierarchy structure */
export const CATEGORY_HIERARCHY = {
  [ProductCategory.CABINETS]: Object.values(CabinetSubcategory),
  [ProductCategory.APPLIANCES]: Object.values(ApplianceSubcategory),
  [ProductCategory.HARDWARE]: Object.values(HardwareSubcategory),
  [ProductCategory.SINKS]: Object.values(SinkSubcategory),
  [ProductCategory.LIGHTING]: Object.values(LightingSubcategory),
  [ProductCategory.STORAGE]: Object.values(StorageSubcategory),
} as const;
