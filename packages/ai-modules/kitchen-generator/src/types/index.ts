/**
 * Kitchen Generator Types
 * Core type definitions for AI-powered kitchen configuration
 */

// ============================================
// Room & Space Types
// ============================================

export interface RoomDimensions {
  /** Width in centimeters */
  width: number;
  /** Length/Depth in centimeters */
  length: number;
  /** Height in centimeters (default: 250) */
  height: number;
  /** Unit of measurement */
  unit: 'cm' | 'mm' | 'in';
}

export interface WallSegment {
  id: string;
  /** Wall identifier (north, south, east, west, or custom) */
  wall: 'north' | 'south' | 'east' | 'west' | string;
  /** Start position along wall (cm from corner) */
  startPosition: number;
  /** End position along wall (cm from corner) */
  endPosition: number;
  /** Available for cabinets */
  available: boolean;
  /** Obstacles on this segment */
  obstacles: WallObstacle[];
}

export interface WallObstacle {
  type: 'window' | 'door' | 'column' | 'pipe' | 'electrical' | 'radiator' | 'other';
  /** Position from wall start (cm) */
  position: number;
  /** Width of obstacle (cm) */
  width: number;
  /** Height from floor (cm) */
  heightFromFloor: number;
  /** Height of obstacle (cm) */
  height: number;
}

export interface UtilityConnection {
  type:
    | 'water_inlet'
    | 'water_outlet'
    | 'gas'
    | 'electrical_220v'
    | 'electrical_380v'
    | 'ventilation';
  /** Wall location */
  wall: string;
  /** Position along wall (cm) */
  position: number;
  /** Height from floor (cm) */
  heightFromFloor: number;
}

export interface RoomConfiguration {
  dimensions: RoomDimensions;
  walls: WallSegment[];
  utilities: UtilityConnection[];
  /** Kitchen shape to aim for */
  preferredShape?: KitchenShape;
}

// ============================================
// Kitchen Layout Types
// ============================================

export type KitchenShape = 'I' | 'L' | 'U' | 'G' | 'parallel' | 'island' | 'peninsula';

export type KitchenStyle =
  | 'modern'
  | 'classic'
  | 'scandinavian'
  | 'industrial'
  | 'rustic'
  | 'minimalist'
  | 'traditional'
  | 'contemporary';

export type CabinetType =
  | 'base' // Meuble bas
  | 'wall' // Meuble haut
  | 'tall' // Colonne
  | 'corner_base' // Angle bas
  | 'corner_wall' // Angle haut
  | 'drawer' // Tiroir
  | 'sink_base' // Sous-évier
  | 'oven_housing' // Colonne four
  | 'fridge_housing' // Colonne réfrigérateur
  | 'pantry'; // Garde-manger

export type ApplianceCategory =
  | 'refrigerator'
  | 'freezer'
  | 'fridge_freezer'
  | 'oven'
  | 'microwave'
  | 'cooktop'
  | 'range_hood'
  | 'dishwasher'
  | 'washing_machine'
  | 'sink'
  | 'faucet';

// ============================================
// Product & Catalog Types
// ============================================

export interface CatalogProduct {
  id: string;
  providerId: string;
  providerProductId: string;
  name: string;
  /** Product type - flexible string to support various provider formats */
  type: string;
  category: string;
  subcategory?: string;
  dimensions: ProductDimensions;
  price: number;
  currency: string;
  imageUrl?: string;
  specifications?: Record<string, unknown>;
  compatibleWith?: string[];
  requiresUtility?: (
    | 'water_inlet'
    | 'water_outlet'
    | 'gas'
    | 'electrical_220v'
    | 'electrical_380v'
  )[];
  inStock: boolean;
}

export interface ProductDimensions {
  width: number;
  height: number;
  depth: number;
  unit: 'cm' | 'mm';
}

// ============================================
// Configuration & Preferences
// ============================================

export interface UserPreferences {
  /** Budget range in EUR */
  budget: {
    min: number;
    max: number;
    currency: string;
  };
  /** Preferred style */
  style: KitchenStyle;
  /** Color preferences */
  colors?: {
    cabinets?: string[];
    worktop?: string[];
    handles?: string[];
  };
  /** Required appliances */
  requiredAppliances: ApplianceCategory[];
  /** Optional appliances */
  optionalAppliances?: ApplianceCategory[];
  /** Preferred brands (provider IDs) */
  preferredProviders?: string[];
  /** Accessibility requirements */
  accessibility?: {
    wheelchairAccessible?: boolean;
    loweredWorktop?: boolean;
    pullOutShelves?: boolean;
  };
  /** Storage priority (1-10) */
  storagePriority?: number;
}

export interface GenerationConstraints {
  /** Minimum passage width (cm) */
  minPassageWidth: number;
  /** Work triangle max perimeter (cm) */
  maxWorkTrianglePerimeter: number;
  /** Min distance between cooktop and sink (cm) */
  minCooktopSinkDistance: number;
  /** Max distance between cooktop and sink (cm) */
  maxCooktopSinkDistance: number;
  /** Ventilation required above cooktop */
  requireVentilation: boolean;
}

// ============================================
// Generated Configuration Types
// ============================================

export interface PlacedItem {
  id: string;
  product: CatalogProduct;
  position: Position3D;
  rotation: number; // degrees (0, 90, 180, 270)
  wall?: string;
  /** Items that must be placed with this one */
  linkedItems?: string[];
}

export interface Position3D {
  x: number;
  y: number;
  z: number;
}

export interface KitchenConfiguration {
  id: string;
  name: string;
  shape: KitchenShape;
  style: KitchenStyle;
  room: RoomConfiguration;

  /** All placed items */
  items: PlacedItem[];

  /** Categorized items for easy access */
  cabinets: PlacedItem[];
  appliances: PlacedItem[];
  worktops: PlacedItem[];

  /** Pricing summary */
  pricing: PricingSummary;

  /** Configuration score (0-100) */
  score: ConfigurationScore;

  /** Validation results */
  validation: ValidationResult;

  /** Generation metadata */
  metadata: {
    generatedAt: string;
    generatorVersion: string;
    providersUsed: string[];
    generationTimeMs: number;
  };
}

export interface PricingSummary {
  cabinets: number;
  appliances: number;
  worktops: number;
  fittings: number;
  total: number;
  currency: string;
  /** Price breakdown by provider */
  byProvider: Record<string, number>;
}

export interface ConfigurationScore {
  overall: number;
  /** Ergonomics score (work triangle, heights, etc.) */
  ergonomics: number;
  /** Storage capacity score */
  storage: number;
  /** Aesthetics/style consistency score */
  aesthetics: number;
  /** Budget efficiency score */
  budgetEfficiency: number;
  /** Space utilization score */
  spaceUtilization: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  message: string;
  itemId?: string;
  severity: 'error';
}

export interface ValidationWarning {
  code: string;
  message: string;
  itemId?: string;
  severity: 'warning';
  suggestion?: string;
}

// ============================================
// Provider Integration Types
// ============================================

export interface KitchenProductProvider {
  id: string;
  name: string;
  type: 'furniture' | 'appliance' | 'mixed';
  country: string;

  /** Fetch products by category */
  getProducts(category: string, options?: ProviderFetchOptions): Promise<CatalogProduct[]>;

  /** Get product by ID */
  getProduct(productId: string): Promise<CatalogProduct | null>;

  /** Search products */
  searchProducts(query: string, options?: ProviderFetchOptions): Promise<CatalogProduct[]>;

  /** Get available categories */
  getCategories(): Promise<string[]>;

  /** Check stock availability */
  checkStock(productIds: string[]): Promise<Map<string, boolean>>;

  /** Get product constraints/rules */
  getProductRules?(): Promise<ProviderProductRules>;
}

export interface ProviderFetchOptions {
  limit?: number;
  offset?: number;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  dimensions?: {
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
  };
}

export interface ProviderProductRules {
  /** Standard widths for cabinets */
  standardWidths: number[];
  /** Standard heights for cabinets */
  standardHeights: Record<CabinetType, number[]>;
  /** Standard depths */
  standardDepths: number[];
  /** Compatibility rules */
  compatibility: CompatibilityRule[];
}

export interface CompatibilityRule {
  sourceType: string;
  targetType: string;
  rule: 'requires' | 'excludes' | 'optional';
  description?: string;
}

// ============================================
// Connected Appliance Types (Smart Kitchen)
// ============================================

/** Supported smart appliance platforms */
export type SmartAppliancePlatform =
  | 'home_connect' // Bosch, Siemens, Neff, Gaggenau, Thermador
  | 'miele' // Miele
  | 'smartthings' // Samsung
  | 'electrolux' // Electrolux, AEG, Frigidaire
  | 'ge_smarthq'; // GE Appliances

/** Connected appliance types from Home Connect */
export type ConnectedApplianceType =
  | 'Oven'
  | 'Dishwasher'
  | 'CoffeeMaker'
  | 'Refrigerator'
  | 'Freezer'
  | 'FridgeFreezer'
  | 'Hob'
  | 'Hood'
  | 'Microwave'
  | 'WarmingDrawer'
  | 'Dryer'
  | 'Washer';

/** Connected appliance status */
export interface ConnectedApplianceStatus {
  connected: boolean;
  state: 'off' | 'ready' | 'running' | 'paused' | 'finished' | 'error';
  door?: 'open' | 'closed' | 'locked';
  temperature?: number;
  targetTemperature?: number;
  remainingTime?: number;
  progress?: number;
  program?: string;
  error?: string;
}

/** Connected appliance with smart features */
export interface ConnectedAppliance extends CatalogProduct {
  /** Platform for smart control */
  platform: SmartAppliancePlatform;
  /** Home Connect / Miele appliance ID */
  applianceId?: string;
  /** Appliance type for smart control */
  applianceType: ConnectedApplianceType;
  /** Available programs */
  programs?: ApplianceProgram[];
  /** Current status (if connected) */
  status?: ConnectedApplianceStatus;
  /** Energy efficiency class */
  energyClass?: 'A+++' | 'A++' | 'A+' | 'A' | 'B' | 'C' | 'D';
  /** Connectivity features */
  connectivity?: {
    wifi: boolean;
    bluetooth?: boolean;
    homeConnect?: boolean;
    matterSupport?: boolean;
  };
}

/** Appliance program (e.g., dishwasher cycles, oven modes) */
export interface ApplianceProgram {
  id: string;
  name: string;
  /** Program key (e.g., "Dishcare.Dishwasher.Program.Eco50") */
  key: string;
  /** Estimated duration in minutes */
  duration?: number;
  /** Energy consumption in kWh */
  energyConsumption?: number;
  /** Water consumption in liters */
  waterConsumption?: number;
  /** Available options for this program */
  options?: ProgramOption[];
}

/** Program option */
export interface ProgramOption {
  key: string;
  name: string;
  type: 'temperature' | 'duration' | 'boolean' | 'enum';
  min?: number;
  max?: number;
  values?: string[];
  default?: unknown;
}

/** Smart appliance provider interface */
export interface SmartApplianceProvider {
  platform: SmartAppliancePlatform;
  name: string;

  /** Authenticate with the platform */
  authenticate(credentials: ApplianceCredentials): Promise<boolean>;

  /** Get all connected appliances */
  getAppliances(): Promise<ConnectedAppliance[]>;

  /** Get appliance status */
  getStatus(applianceId: string): Promise<ConnectedApplianceStatus>;

  /** Get available programs */
  getPrograms(applianceId: string): Promise<ApplianceProgram[]>;

  /** Start a program */
  startProgram(
    applianceId: string,
    programKey: string,
    options?: Record<string, unknown>
  ): Promise<boolean>;

  /** Stop current program */
  stopProgram(applianceId: string): Promise<boolean>;

  /** Set appliance setting */
  setSetting(applianceId: string, key: string, value: unknown): Promise<boolean>;
}

/** Credentials for appliance platform authentication */
export interface ApplianceCredentials {
  /** OAuth2 access token (for Home Connect, Miele) */
  accessToken?: string;
  /** OAuth2 refresh token */
  refreshToken?: string;
  /** Personal access token (for SmartThings) */
  patToken?: string;
  /** Username/password (for legacy APIs) */
  username?: string;
  password?: string;
  /** OAuth2 client credentials */
  clientId?: string;
  clientSecret?: string;
}

/** OAuth2 configuration for appliance APIs */
export interface ApplianceOAuthConfig {
  platform: SmartAppliancePlatform;
  authorizationUrl: string;
  tokenUrl: string;
  clientId: string;
  clientSecret?: string;
  scopes: string[];
  redirectUri: string;
}

// ============================================
// Generation Request/Response Types
// ============================================

export interface GenerationRequest {
  room: RoomConfiguration;
  preferences: UserPreferences;
  constraints?: Partial<GenerationConstraints>;
  /** Number of configurations to generate */
  numConfigurations?: number;
  /** Provider IDs to use (empty = all available) */
  providers?: string[];
}

export interface GenerationResponse {
  success: boolean;
  configurations: KitchenConfiguration[];
  /** Best configuration based on score */
  recommended: KitchenConfiguration | null;
  /** Generation statistics */
  stats: {
    totalGenerated: number;
    validConfigurations: number;
    generationTimeMs: number;
    providersQueried: string[];
    productsConsidered: number;
  };
  errors?: string[];
}
