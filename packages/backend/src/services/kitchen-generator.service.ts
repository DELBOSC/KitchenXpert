/**
 * Kitchen Generator Service
 *
 * A comprehensive service for generating intelligent kitchen configurations
 * based on room specifications, budget constraints, style preferences,
 * and available products from catalog providers.
 *
 * Features:
 * - Multi-configuration generation with scoring
 * - Work triangle optimization (sink, cooktop, fridge)
 * - Ergonomic validation and constraints checking
 * - Budget-aware product selection
 * - Real product data integration via ProductRepository
 */

import crypto from 'crypto';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Product as _Product } from '@prisma/client';
import logger from '../utils/logger';

// ============================================================================
// TYPES - Room and Space
// ============================================================================

export interface RoomDimensions {
  /** Width in centimeters */
  width: number;
  /** Length/depth in centimeters */
  length: number;
  /** Height in centimeters */
  height: number;
  /** Unit of measurement */
  unit: 'cm' | 'mm' | 'm' | 'ft' | 'in';
}

export type RoomShape =
  | 'rectangular'
  | 'L-shaped'
  | 'U-shaped'
  | 'galley'
  | 'open-plan'
  | 'irregular';

export interface WallSegment {
  id: string;
  /** Wall identifier (north, south, east, west, or custom) */
  side: WallSide;
  /** Start point of the wall */
  start: Point2D;
  /** End point of the wall */
  end: Point2D;
  /** Wall length in cm */
  length: number;
  /** Usable length after accounting for obstacles */
  usableLength: number;
  /** Height of the wall */
  height: number;
  /** Obstacles on this wall */
  obstacles: WallObstacle[];
  /** Utility points on this wall */
  utilities: UtilityConnection[];
}

export type WallSide = 'north' | 'south' | 'east' | 'west' | 'custom';

export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D extends Point2D {
  z: number;
}

export interface WallObstacle {
  id: string;
  type: ObstacleType;
  position: Point2D;
  width: number;
  height: number;
  fromFloor: number;
}

export type ObstacleType =
  | 'door'
  | 'window'
  | 'pillar'
  | 'radiator'
  | 'chimney'
  | 'beam'
  | 'outlet';

export interface UtilityConnection {
  id: string;
  type: UtilityType;
  position: Point2D;
  wallSide: WallSide;
  height?: number;
  capacity?: string;
}

export type UtilityType =
  | 'electrical_outlet'
  | 'water_inlet'
  | 'water_outlet'
  | 'gas_line'
  | 'ventilation'
  | 'drain';

export interface RoomSpecification {
  dimensions: RoomDimensions;
  shape: RoomShape;
  walls: WallSegment[];
  utilities: UtilityConnection[];
  /** Custom polygon points for irregular shapes */
  customShape?: Point2D[];
}

// ============================================================================
// TYPES - User Preferences
// ============================================================================

export interface GeneratorPreferences {
  /** Budget constraints */
  budget: BudgetConstraint;
  /** Kitchen style preference */
  style: KitchenStylePreference;
  /** Layout preference (optional, will be calculated if not specified) */
  preferredLayout?: LayoutType;
  /** Priority areas for the kitchen */
  priorities: PriorityArea[];
  /** Required appliances */
  requiredAppliances: RequiredAppliance[];
  /** Color preferences */
  colorScheme?: ColorScheme;
  /** Accessibility requirements */
  accessibility?: AccessibilityOptions;
  /** Preferred brands */
  preferredBrands?: string[];
  /** Materials preference */
  preferredMaterials?: string[];
}

export interface BudgetConstraint {
  min: number;
  max: number;
  currency: string;
  /** Budget allocation by category (optional percentages) */
  allocation?: {
    cabinets?: number;
    appliances?: number;
    countertops?: number;
    accessories?: number;
  };
}

export type KitchenStylePreference =
  | 'modern'
  | 'contemporary'
  | 'traditional'
  | 'scandinavian'
  | 'industrial'
  | 'minimalist'
  | 'rustic'
  | 'transitional'
  | 'mediterranean';

export type LayoutType =
  | 'I-shaped'
  | 'L-shaped'
  | 'U-shaped'
  | 'G-shaped'
  | 'parallel'
  | 'island'
  | 'peninsula';

export type PriorityArea =
  | 'cooking'
  | 'storage'
  | 'workspace'
  | 'socializing'
  | 'efficiency'
  | 'aesthetics';

export interface RequiredAppliance {
  type: ApplianceType;
  minWidth?: number;
  maxWidth?: number;
  preferredBrand?: string;
  builtIn?: boolean;
}

export type ApplianceType =
  | 'refrigerator'
  | 'freezer'
  | 'cooktop'
  | 'oven'
  | 'range'
  | 'dishwasher'
  | 'microwave'
  | 'hood'
  | 'wine_cooler'
  | 'coffee_machine'
  | 'sink';

export interface ColorScheme {
  primary?: string;
  secondary?: string;
  accent?: string;
  cabinetFinish?: 'matte' | 'gloss' | 'satin' | 'textured';
  applianceFinish?: 'stainless' | 'black' | 'white' | 'custom';
}

export interface AccessibilityOptions {
  wheelchairAccessible: boolean;
  loweredWorkSurfaces: boolean;
  pullOutShelves: boolean;
  touchFaucets: boolean;
  highContrastColors: boolean;
}

// ============================================================================
// TYPES - Catalog Provider
// ============================================================================

export interface CatalogProviderInfo {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  priority: number;
}

// ============================================================================
// TYPES - Generated Configuration
// ============================================================================

export interface GeneratedKitchenConfiguration {
  id: string;
  name: string;
  description: string;
  layoutType: LayoutType;
  /** Overall score (0-100) */
  score: number;
  /** Detailed score breakdown */
  scores: ConfigurationScores;
  /** Placed items in the configuration */
  placements: ItemPlacement[];
  /** Work triangle analysis */
  workTriangle: WorkTriangleResult;
  /** Cost breakdown */
  costs: CostBreakdown;
  /** Configuration statistics */
  statistics: ConfigurationStatistics;
  /** Validation results */
  validation: ValidationResult;
  /** Improvement recommendations */
  recommendations: ConfigurationRecommendation[];
  /** Generation metadata */
  metadata: GenerationMetadata;
}

export interface ConfigurationScores {
  /** Ergonomics score (work triangle, heights, clearances) */
  ergonomics: number;
  /** Storage capacity score */
  storage: number;
  /** Aesthetics score (style consistency, proportions) */
  aesthetics: number;
  /** Budget adherence score */
  budget: number;
  /** Space utilization score */
  spaceUtilization: number;
  /** Workflow efficiency score */
  workflow: number;
}

export interface ItemPlacement {
  id: string;
  /** Reference to catalog product */
  productId: string;
  /** Product details */
  product: PlacedProduct;
  /** Position in 3D space */
  position: Point3D;
  /** Rotation in degrees */
  rotation: number;
  /** Which wall this is placed against */
  wallSide?: WallSide;
  /** Kitchen zone this belongs to */
  zone: KitchenZone;
  /** Required utility connections */
  connections: PlacementConnection[];
  /** Alternative products that could be used */
  alternatives?: string[];
}

export interface PlacedProduct {
  id: string;
  sku: string;
  name: string;
  brand: string;
  category: ProductCategoryType;
  subcategory?: string;
  dimensions: ProductDimensionInfo;
  price: number;
  currency: string;
  imageUrl?: string;
}

export type ProductCategoryType =
  | 'base_cabinet'
  | 'wall_cabinet'
  | 'tall_cabinet'
  | 'corner_cabinet'
  | 'sink_cabinet'
  | 'appliance'
  | 'countertop'
  | 'accessory'
  | 'sink'
  | 'faucet';

export interface ProductDimensionInfo {
  width: number;
  height: number;
  depth: number;
  unit: 'cm' | 'mm';
}

export type KitchenZone =
  | 'cooking'
  | 'preparation'
  | 'cleaning'
  | 'storage'
  | 'cold_storage'
  | 'serving';

export interface PlacementConnection {
  type: UtilityType;
  utilityId?: string;
  requiresExtension: boolean;
  extensionLength?: number;
}

export interface WorkTriangleResult {
  /** Sink position */
  sink: Point2D;
  /** Cooktop position */
  cooktop: Point2D;
  /** Refrigerator position */
  refrigerator: Point2D;
  /** Individual leg distances */
  distances: {
    sinkToCooktop: number;
    cooktopToRefrigerator: number;
    refrigeratorToSink: number;
    total: number;
  };
  /** Whether the triangle meets optimal standards */
  isOptimal: boolean;
  /** Score from 0-100 */
  score: number;
  /** Issues found */
  issues: string[];
  /** Suggestions for improvement */
  suggestions: string[];
}

export interface CostBreakdown {
  cabinets: number;
  appliances: number;
  countertops: number;
  accessories: number;
  installation: number;
  subtotal: number;
  tax?: number;
  total: number;
  currency: string;
  /** Confidence level of the estimate */
  confidence: 'low' | 'medium' | 'high';
  /** Whether it's within budget */
  withinBudget: boolean;
  /** Percentage of budget used */
  budgetUtilization: number;
}

export interface ConfigurationStatistics {
  totalItems: number;
  cabinetCount: {
    base: number;
    wall: number;
    tall: number;
    corner: number;
  };
  applianceCount: number;
  /** Linear meters of countertop */
  countertopLength: number;
  /** Square centimeters of countertop */
  countertopArea: number;
  /** Total storage volume in liters */
  storageVolume: number;
  /** Floor space used in square centimeters */
  floorSpaceUsed: number;
  /** Percentage of available wall space used */
  wallSpaceUtilization: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  passedChecks: string[];
}

export interface ValidationIssue {
  code: string;
  message: string;
  severity: 'error' | 'warning';
  itemId?: string;
  position?: Point3D;
  suggestion?: string;
}

export interface ConfigurationRecommendation {
  type: 'improvement' | 'alternative' | 'warning' | 'tip';
  priority: 'low' | 'medium' | 'high';
  category: 'ergonomics' | 'storage' | 'appliances' | 'safety' | 'budget' | 'style';
  title: string;
  message: string;
  action?: RecommendedAction;
}

export interface RecommendedAction {
  type: 'replace' | 'add' | 'remove' | 'move' | 'resize';
  itemId?: string;
  suggestedProductId?: string;
  suggestedPosition?: Point3D;
  estimatedImpact?: {
    scoreChange: number;
    costChange: number;
  };
}

export interface GenerationMetadata {
  generatedAt: Date;
  processingTimeMs: number;
  algorithmVersion: string;
  productsEvaluated: number;
  configurationsGenerated: number;
  selectedRank: number;
}

// ============================================================================
// TYPES - Repository Interface
// ============================================================================

export interface KitchenGeneratorRepository {
  getProducts(filters: ProductQueryFilters): Promise<GeneratorProduct[]>;
  getProductsByCategory(category: string, filters?: ProductQueryFilters): Promise<GeneratorProduct[]>;
  getProductById(id: string): Promise<GeneratorProduct | null>;
  getProviders(): Promise<CatalogProviderInfo[]>;
  saveConfiguration(config: GeneratedKitchenConfiguration): Promise<GeneratedKitchenConfiguration>;
}

export interface ProductQueryFilters {
  categories?: string[];
  brands?: string[];
  minPrice?: number;
  maxPrice?: number;
  minWidth?: number;
  maxWidth?: number;
  inStock?: boolean;
  providerId?: string;
}

export interface GeneratorProduct {
  id: string;
  sku: string;
  name: string;
  description?: string;
  brand: string;
  category: string;
  subcategory?: string;
  price: number;
  currency: string;
  width: number;
  height: number;
  depth: number;
  color?: string;
  material?: string;
  availability: string;
  imageUrl?: string;
  specifications?: Record<string, unknown>;
}

// ============================================================================
// CONSTANTS - Ergonomic Rules
// ============================================================================

const ERGONOMIC_CONSTANTS = {
  // Work triangle distances in centimeters
  workTriangle: {
    minTotalDistance: 400,  // 4 meters minimum
    maxTotalDistance: 790,  // 7.9 meters maximum
    minLegDistance: 120,    // 1.2 meters minimum per leg
    maxLegDistance: 270,    // 2.7 meters maximum per leg
  },
  // Standard heights in centimeters
  heights: {
    baseCabinet: 87,
    countertop: 90,
    wallCabinetBottom: 145,
    wallCabinetTop: 220,
    kickPlate: 10,
  },
  // Clearance requirements in centimeters
  clearances: {
    minPassageWidth: 90,
    minWorkingPassage: 120,
    minApplianceFront: 100,
    minOvenOpening: 100,
    minDishwasherOpening: 70,
    minRefrigeratorOpening: 90,
    parallelKitchenMin: 120,
  },
  // Minimum distances between elements in centimeters
  minDistances: {
    cooktopToSink: 40,
    cooktopToRefrigerator: 40,
    cooktopToWall: 40,
    sinkToCorner: 30,
    dishwasherToSink: 60,
  },
  // Standard cabinet widths in centimeters
  standardCabinetWidths: [30, 40, 45, 50, 60, 80, 90, 100, 120],
  // Standard depths in centimeters
  depths: {
    baseCabinet: 60,
    wallCabinet: 35,
    tallCabinet: 60,
    countertop: 63,
  },
};

// ============================================================================
// MAIN SERVICE CLASS
// ============================================================================

export class KitchenGeneratorService {
  private readonly algorithmVersion = '1.0.0';

  constructor(private readonly repository: KitchenGeneratorRepository) {}

  // ==========================================================================
  // PUBLIC METHODS
  // ==========================================================================

  /**
   * Generate multiple kitchen configurations based on room specifications and preferences.
   *
   * @param room - Room specifications including dimensions, shape, and utilities
   * @param preferences - User preferences for style, budget, and requirements
   * @param providers - List of catalog providers to source products from
   * @param numConfigs - Number of configurations to generate (default: 3)
   * @returns Array of generated kitchen configurations, sorted by score
   */
  async generateConfigurations(
    room: RoomSpecification,
    preferences: GeneratorPreferences,
    providers: CatalogProviderInfo[],
    numConfigs: number = 3
  ): Promise<GeneratedKitchenConfiguration[]> {
    const startTime = Date.now();

    try {
      // 1. Analyze the room
      const roomAnalysis = this.analyzeRoom(room);

      // 2. Determine possible layouts
      const possibleLayouts = this.determinePossibleLayouts(roomAnalysis, preferences);

      if (possibleLayouts.length === 0) {
        throw new KitchenGeneratorError(
          'NO_VALID_LAYOUTS',
          'No valid kitchen layouts possible for the given room dimensions'
        );
      }

      // 3. Fetch compatible products from all active providers
      const products = await this.fetchCompatibleProducts(
        roomAnalysis,
        preferences,
        providers
      );

      if (products.length === 0) {
        throw new KitchenGeneratorError(
          'NO_PRODUCTS_AVAILABLE',
          'No products available matching the specified criteria'
        );
      }

      // 4. Generate configurations for each layout type
      const configurations: GeneratedKitchenConfiguration[] = [];

      for (const layout of possibleLayouts) {
        if (configurations.length >= numConfigs) break;

        const config = await this.generateSingleConfiguration(
          layout,
          roomAnalysis,
          products,
          preferences
        );

        if (config) {
          configurations.push(config);
        }
      }

      // 5. Generate variation configurations if needed
      while (configurations.length < numConfigs && configurations.length > 0) {
        const baseConfig = configurations[configurations.length - 1];
        if (!baseConfig) break;

        const variation = await this.generateVariation(
          baseConfig,
          roomAnalysis,
          products,
          preferences
        );

        if (variation && !this.isDuplicateConfig(variation, configurations)) {
          configurations.push(variation);
        } else {
          break; // Can't generate more unique variations
        }
      }

      // 6. Score and sort configurations
      const scoredConfigs = configurations.map((config, index) => ({
        ...config,
        score: this.calculateOverallScore(config, preferences),
        metadata: {
          ...config.metadata,
          processingTimeMs: Date.now() - startTime,
          selectedRank: index + 1,
        },
      }));

      scoredConfigs.sort((a, b) => b.score - a.score);

      // Update ranks after sorting
      return scoredConfigs.map((config, index) => ({
        ...config,
        metadata: { ...config.metadata, selectedRank: index + 1 },
      }));
    } catch (error) {
      if (error instanceof KitchenGeneratorError) {
        throw error;
      }
      throw new KitchenGeneratorError(
        'GENERATION_FAILED',
        `Failed to generate configurations: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Calculate optimal cabinet placement for a given room and layout shape.
   *
   * @param room - Room specifications
   * @param shape - Desired layout shape
   * @returns Optimal placement zones for each wall
   */
  calculateOptimalLayout(
    room: RoomSpecification,
    shape: LayoutType
  ): PlacementZone[] {
    const roomAnalysis = this.analyzeRoom(room);
    const zones: PlacementZone[] = [];

    switch (shape) {
      case 'I-shaped':
        zones.push(this.createZoneForWall(roomAnalysis.walls[0]!, 'primary'));
        break;

      case 'L-shaped':
        if (roomAnalysis.walls.length >= 2) {
          zones.push(this.createZoneForWall(roomAnalysis.walls[0]!, 'primary'));
          zones.push(this.createZoneForWall(roomAnalysis.walls[1]!, 'secondary'));
        }
        break;

      case 'U-shaped':
        if (roomAnalysis.walls.length >= 3) {
          zones.push(this.createZoneForWall(roomAnalysis.walls[0]!, 'primary'));
          zones.push(this.createZoneForWall(roomAnalysis.walls[1]!, 'secondary'));
          zones.push(this.createZoneForWall(roomAnalysis.walls[2]!, 'tertiary'));
        }
        break;

      case 'parallel':
        if (roomAnalysis.walls.length >= 2) {
          const oppositeWall = roomAnalysis.walls.find(
            w => this.areWallsOpposite(roomAnalysis.walls[0]!, w)
          );
          zones.push(this.createZoneForWall(roomAnalysis.walls[0]!, 'primary'));
          if (oppositeWall) {
            zones.push(this.createZoneForWall(oppositeWall, 'secondary'));
          }
        }
        break;

      case 'island':
        zones.push(this.createZoneForWall(roomAnalysis.walls[0]!, 'primary'));
        zones.push(this.createIslandZone(roomAnalysis));
        break;

      case 'peninsula':
        if (roomAnalysis.walls.length >= 2) {
          zones.push(this.createZoneForWall(roomAnalysis.walls[0]!, 'primary'));
          zones.push(this.createPeninsulaZone(roomAnalysis, roomAnalysis.walls[1]!));
        }
        break;

      case 'G-shaped':
        if (roomAnalysis.walls.length >= 3) {
          zones.push(this.createZoneForWall(roomAnalysis.walls[0]!, 'primary'));
          zones.push(this.createZoneForWall(roomAnalysis.walls[1]!, 'secondary'));
          zones.push(this.createZoneForWall(roomAnalysis.walls[2]!, 'tertiary'));
          zones.push(this.createPeninsulaZone(roomAnalysis, roomAnalysis.walls[0]!));
        }
        break;
    }

    return zones;
  }

  /**
   * Select products from catalog based on budget and style preferences.
   *
   * @param budget - Budget constraints
   * @param style - Style preference
   * @param providers - Available catalog providers
   * @returns Categorized product selections
   */
  async selectProducts(
    budget: BudgetConstraint,
    style: KitchenStylePreference,
    providers: CatalogProviderInfo[]
  ): Promise<ProductSelection> {
    const activeProviders = providers.filter(p => p.isActive);

    if (activeProviders.length === 0) {
      throw new KitchenGeneratorError(
        'NO_ACTIVE_PROVIDERS',
        'No active catalog providers available'
      );
    }

    // Calculate budget allocation
    const allocation = this.calculateBudgetAllocation(budget);

    // Fetch products for each category
    const baseCabinets = await this.repository.getProductsByCategory('base_cabinet', {
      maxPrice: allocation.cabinets * 0.15, // Max per cabinet
      inStock: true,
    });

    const wallCabinets = await this.repository.getProductsByCategory('wall_cabinet', {
      maxPrice: allocation.cabinets * 0.12,
      inStock: true,
    });

    const tallCabinets = await this.repository.getProductsByCategory('tall_cabinet', {
      maxPrice: allocation.cabinets * 0.2,
      inStock: true,
    });

    const appliances = await this.repository.getProductsByCategory('appliance', {
      maxPrice: allocation.appliances * 0.4,
      inStock: true,
    });

    const sinks = await this.repository.getProductsByCategory('sink', {
      maxPrice: allocation.accessories * 0.3,
      inStock: true,
    });

    // Filter by style compatibility
    const styleFilter = this.getStyleCompatibleFilter(style);

    return {
      baseCabinets: this.filterByStyle(baseCabinets, styleFilter),
      wallCabinets: this.filterByStyle(wallCabinets, styleFilter),
      tallCabinets: this.filterByStyle(tallCabinets, styleFilter),
      appliances,
      sinks,
      countertops: [],
      accessories: [],
      totalBudgetAllocated: budget.max,
      currency: budget.currency,
    };
  }

  /**
   * Calculate comprehensive scores for a configuration.
   *
   * @param config - The configuration to score
   * @returns Detailed score breakdown
   */
  scoreConfiguration(config: GeneratedKitchenConfiguration): ConfigurationScores {
    return {
      ergonomics: this.calculateErgonomicsScore(config),
      storage: this.calculateStorageScore(config),
      aesthetics: this.calculateAestheticsScore(config),
      budget: config.scores.budget,
      spaceUtilization: this.calculateSpaceUtilizationScore(config),
      workflow: this.calculateWorkflowScore(config),
    };
  }

  /**
   * Validate a configuration against all constraints.
   *
   * @param config - The configuration to validate
   * @returns Validation results with errors and warnings
   */
  validateConfiguration(config: GeneratedKitchenConfiguration): ValidationResult {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];
    const passedChecks: string[] = [];

    // Check work triangle
    const workTriangleValidation = this.validateWorkTriangle(config.workTriangle);
    if (workTriangleValidation.errors.length > 0) {
      errors.push(...workTriangleValidation.errors);
    } else {
      passedChecks.push('work_triangle_optimal');
    }
    warnings.push(...workTriangleValidation.warnings);

    // Check passage widths
    const passageValidation = this.validatePassages(config);
    if (passageValidation.errors.length > 0) {
      errors.push(...passageValidation.errors);
    } else {
      passedChecks.push('passage_widths_adequate');
    }
    warnings.push(...passageValidation.warnings);

    // Check appliance clearances
    const clearanceValidation = this.validateClearances(config);
    if (clearanceValidation.errors.length > 0) {
      errors.push(...clearanceValidation.errors);
    } else {
      passedChecks.push('appliance_clearances_ok');
    }
    warnings.push(...clearanceValidation.warnings);

    // Check for overlapping items
    const overlapValidation = this.validateNoOverlaps(config);
    if (overlapValidation.errors.length > 0) {
      errors.push(...overlapValidation.errors);
    } else {
      passedChecks.push('no_item_overlaps');
    }

    // Check utility connections
    const utilityValidation = this.validateUtilityConnections(config);
    if (utilityValidation.errors.length > 0) {
      errors.push(...utilityValidation.errors);
    } else {
      passedChecks.push('utility_connections_valid');
    }
    warnings.push(...utilityValidation.warnings);

    // Check minimum distances
    const distanceValidation = this.validateMinDistances(config);
    if (distanceValidation.errors.length > 0) {
      errors.push(...distanceValidation.errors);
    } else {
      passedChecks.push('minimum_distances_met');
    }
    warnings.push(...distanceValidation.warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      passedChecks,
    };
  }

  /**
   * Optimize a configuration based on specified priorities.
   *
   * @param config - The configuration to optimize
   * @param priorities - Areas to prioritize in optimization
   * @returns Optimized configuration
   */
  async optimizeConfiguration(
    config: GeneratedKitchenConfiguration,
    priorities: PriorityArea[]
  ): Promise<GeneratedKitchenConfiguration> {
    let optimized = { ...config };

    for (const priority of priorities) {
      switch (priority) {
        case 'efficiency':
          optimized = this.optimizeWorkTriangle(optimized);
          break;

        case 'storage':
          optimized = await this.optimizeStorage(optimized);
          break;

        case 'workspace':
          optimized = this.optimizeCountertopSpace(optimized);
          break;

        case 'aesthetics':
          optimized = await this.optimizeAesthetics(optimized);
          break;

        case 'cooking':
          optimized = this.optimizeCookingZone(optimized);
          break;

        case 'socializing':
          optimized = this.optimizeSocialSpace(optimized);
          break;
      }
    }

    // Recalculate scores after optimization
    optimized.scores = this.scoreConfiguration(optimized);
    optimized.score = this.calculateOverallScore(
      optimized,
      { priorities } as GeneratorPreferences
    );
    optimized.validation = this.validateConfiguration(optimized);
    optimized.recommendations = this.generateRecommendations(optimized);

    return optimized;
  }

  // ==========================================================================
  // PRIVATE METHODS - Room Analysis
  // ==========================================================================

  private analyzeRoom(room: RoomSpecification): RoomAnalysis {
    // Convert dimensions to centimeters
    const dimensions = this.normalizeDimensions(room.dimensions);

    // Calculate floor area
    const floorArea = dimensions.width * dimensions.length;

    // Analyze walls
    const walls = room.walls.length > 0
      ? room.walls.map(wall => this.analyzeWall(wall, dimensions))
      : this.generateDefaultWalls(dimensions);

    // Calculate usable wall length
    const usableWallLength = walls.reduce((sum, w) => sum + w.usableLength, 0);

    // Identify utility locations
    const utilities = room.utilities || [];

    return {
      dimensions,
      floorArea,
      walls,
      usableWallLength,
      utilities,
      shape: room.shape,
    };
  }

  private normalizeDimensions(dims: RoomDimensions): NormalizedDimensions {
    let width = dims.width;
    let length = dims.length;
    let height = dims.height;

    switch (dims.unit) {
      case 'mm':
        width /= 10;
        length /= 10;
        height /= 10;
        break;
      case 'm':
        width *= 100;
        length *= 100;
        height *= 100;
        break;
      case 'ft':
        width *= 30.48;
        length *= 30.48;
        height *= 30.48;
        break;
      case 'in':
        width *= 2.54;
        length *= 2.54;
        height *= 2.54;
        break;
    }

    return { width, length, height, unit: 'cm' };
  }

  private analyzeWall(wall: WallSegment, _dims: NormalizedDimensions): AnalyzedWall {
    const obstacleWidth = wall.obstacles.reduce((sum, obs) => sum + obs.width, 0);
    const usableLength = wall.length - obstacleWidth;

    return {
      ...wall,
      usableLength,
      segments: this.calculateUsableSegments(wall),
      hasWaterConnection: wall.utilities.some(
        u => u.type === 'water_inlet' || u.type === 'drain'
      ),
      hasElectricalConnection: wall.utilities.some(u => u.type === 'electrical_outlet'),
      hasGasConnection: wall.utilities.some(u => u.type === 'gas_line'),
    };
  }

  private generateDefaultWalls(dims: NormalizedDimensions): AnalyzedWall[] {
    const walls: AnalyzedWall[] = [];
    const wallHeight = dims.height;

    // North wall
    walls.push({
      id: 'wall-north',
      side: 'north',
      start: { x: 0, y: 0 },
      end: { x: dims.width, y: 0 },
      length: dims.width,
      usableLength: dims.width,
      height: wallHeight,
      obstacles: [],
      utilities: [],
      segments: [{ start: 0, end: dims.width, length: dims.width }],
      hasWaterConnection: false,
      hasElectricalConnection: true,
      hasGasConnection: false,
    });

    // East wall
    walls.push({
      id: 'wall-east',
      side: 'east',
      start: { x: dims.width, y: 0 },
      end: { x: dims.width, y: dims.length },
      length: dims.length,
      usableLength: dims.length,
      height: wallHeight,
      obstacles: [],
      utilities: [],
      segments: [{ start: 0, end: dims.length, length: dims.length }],
      hasWaterConnection: false,
      hasElectricalConnection: true,
      hasGasConnection: false,
    });

    // South wall
    walls.push({
      id: 'wall-south',
      side: 'south',
      start: { x: dims.width, y: dims.length },
      end: { x: 0, y: dims.length },
      length: dims.width,
      usableLength: dims.width,
      height: wallHeight,
      obstacles: [],
      utilities: [],
      segments: [{ start: 0, end: dims.width, length: dims.width }],
      hasWaterConnection: true,
      hasElectricalConnection: true,
      hasGasConnection: false,
    });

    // West wall
    walls.push({
      id: 'wall-west',
      side: 'west',
      start: { x: 0, y: dims.length },
      end: { x: 0, y: 0 },
      length: dims.length,
      usableLength: dims.length,
      height: wallHeight,
      obstacles: [],
      utilities: [],
      segments: [{ start: 0, end: dims.length, length: dims.length }],
      hasWaterConnection: false,
      hasElectricalConnection: true,
      hasGasConnection: true,
    });

    return walls;
  }

  private calculateUsableSegments(wall: WallSegment): WallSegmentInfo[] {
    if (wall.obstacles.length === 0) {
      return [{ start: 0, end: wall.length, length: wall.length }];
    }

    const segments: WallSegmentInfo[] = [];
    const sortedObstacles = [...wall.obstacles].sort(
      (a, b) => a.position.x - b.position.x
    );

    let currentStart = 0;

    for (const obstacle of sortedObstacles) {
      const obstacleStart = obstacle.position.x;
      if (obstacleStart > currentStart) {
        segments.push({
          start: currentStart,
          end: obstacleStart,
          length: obstacleStart - currentStart,
        });
      }
      currentStart = obstacleStart + obstacle.width;
    }

    if (currentStart < wall.length) {
      segments.push({
        start: currentStart,
        end: wall.length,
        length: wall.length - currentStart,
      });
    }

    return segments;
  }

  // ==========================================================================
  // PRIVATE METHODS - Layout Determination
  // ==========================================================================

  private determinePossibleLayouts(
    roomAnalysis: RoomAnalysis,
    preferences: GeneratorPreferences
  ): LayoutType[] {
    const { width, length } = roomAnalysis.dimensions;
    const layouts: LayoutType[] = [];

    // I-shaped (single wall) - always possible if there's at least one wall
    if (roomAnalysis.usableWallLength >= 200) {
      layouts.push('I-shaped');
    }

    // L-shaped - needs two adjacent walls with good length
    if (width >= 240 && length >= 240) {
      layouts.push('L-shaped');
    }

    // U-shaped - needs three walls
    if (width >= 280 && length >= 180) {
      layouts.push('U-shaped');
    }

    // Parallel (galley) - needs two facing walls
    if (length >= 180 && width >= 200) {
      layouts.push('parallel');
    }

    // Island - needs significant floor space
    if (width >= 400 && length >= 350 && roomAnalysis.floorArea >= 140000) {
      layouts.push('island');
    }

    // Peninsula - needs good depth
    if (width >= 350 && length >= 280) {
      layouts.push('peninsula');
    }

    // G-shaped - largest space requirement
    if (width >= 350 && length >= 350) {
      layouts.push('G-shaped');
    }

    // If user has a preference, prioritize it
    if (preferences.preferredLayout && layouts.includes(preferences.preferredLayout)) {
      const index = layouts.indexOf(preferences.preferredLayout);
      layouts.splice(index, 1);
      layouts.unshift(preferences.preferredLayout);
    }

    // Adjust based on priorities
    if (preferences.priorities.includes('socializing')) {
      // Prioritize island and peninsula for social kitchens
      const socialLayouts: LayoutType[] = ['island', 'peninsula', 'G-shaped'];
      layouts.sort((a, b) => {
        const aIsSocial = socialLayouts.includes(a);
        const bIsSocial = socialLayouts.includes(b);
        if (aIsSocial && !bIsSocial) return -1;
        if (!aIsSocial && bIsSocial) return 1;
        return 0;
      });
    }

    if (preferences.priorities.includes('efficiency')) {
      // Prioritize layouts with good work triangles
      const efficientLayouts: LayoutType[] = ['L-shaped', 'U-shaped', 'G-shaped'];
      layouts.sort((a, b) => {
        const aIsEfficient = efficientLayouts.includes(a);
        const bIsEfficient = efficientLayouts.includes(b);
        if (aIsEfficient && !bIsEfficient) return -1;
        if (!aIsEfficient && bIsEfficient) return 1;
        return 0;
      });
    }

    return layouts;
  }

  // ==========================================================================
  // PRIVATE METHODS - Product Fetching
  // ==========================================================================

  private async fetchCompatibleProducts(
    roomAnalysis: RoomAnalysis,
    preferences: GeneratorPreferences,
    providers: CatalogProviderInfo[]
  ): Promise<GeneratorProduct[]> {
    const activeProviders = providers.filter(p => p.isActive);

    if (activeProviders.length === 0) {
      return [];
    }

    const filters: ProductQueryFilters = {
      inStock: true,
    };

    // Apply budget filter
    if (preferences.budget) {
      filters.maxPrice = preferences.budget.max * 0.25; // Max per item
    }

    // Apply brand filter
    if (preferences.preferredBrands && preferences.preferredBrands.length > 0) {
      filters.brands = preferences.preferredBrands;
    }

    // Fetch all products
    const allProducts = await this.repository.getProducts(filters);

    // Filter products that can physically fit
    return allProducts.filter(product => {
      // Check if product fits on any wall
      const productWidth = product.width;
      const productDepth = product.depth;
      const productHeight = product.height;

      // Must fit on at least one wall
      const fitsOnWall = roomAnalysis.walls.some(
        wall => wall.usableLength >= productWidth
      );

      // Must leave passage after placement
      const minPassage = ERGONOMIC_CONSTANTS.clearances.minPassageWidth;
      const remainingDepth = roomAnalysis.dimensions.length - productDepth;
      const leavesPassage = remainingDepth >= minPassage;

      // Must fit under ceiling
      const fitsHeight = productHeight <= roomAnalysis.dimensions.height - 5;

      return fitsOnWall && leavesPassage && fitsHeight;
    });
  }

  // ==========================================================================
  // PRIVATE METHODS - Configuration Generation
  // ==========================================================================

  private async generateSingleConfiguration(
    layout: LayoutType,
    roomAnalysis: RoomAnalysis,
    products: GeneratorProduct[],
    preferences: GeneratorPreferences
  ): Promise<GeneratedKitchenConfiguration | null> {
    try {
      // Categorize products
      const categorizedProducts = this.categorizeProducts(products);

      // Place essential elements (sink, cooktop, refrigerator)
      const essentialPlacements = this.placeEssentialElements(
        layout,
        roomAnalysis,
        categorizedProducts,
        preferences
      );

      if (!essentialPlacements) {
        return null; // Cannot place essential elements
      }

      // Optimize work triangle
      const optimizedEssentials = this.optimizeEssentialPositions(
        essentialPlacements,
        roomAnalysis,
        layout
      );

      // Fill remaining space with cabinets
      const allPlacements = this.placeCabinets(
        layout,
        roomAnalysis,
        optimizedEssentials,
        categorizedProducts,
        preferences
      );

      // Calculate work triangle
      const workTriangle = this.calculateWorkTriangle(allPlacements);

      // Calculate costs
      const costs = this.calculateCosts(allPlacements, preferences.budget);

      // Calculate statistics
      const statistics = this.calculateStatistics(allPlacements, roomAnalysis);

      // Generate ID
      const configId = this.generateId();

      // Build configuration
      const config: GeneratedKitchenConfiguration = {
        id: configId,
        name: this.generateConfigName(layout, 1),
        description: this.generateDescription(layout, statistics),
        layoutType: layout,
        score: 0, // Will be calculated later
        scores: {
          ergonomics: 0,
          storage: 0,
          aesthetics: 0,
          budget: 0,
          spaceUtilization: 0,
          workflow: 0,
        },
        placements: allPlacements,
        workTriangle,
        costs,
        statistics,
        validation: { isValid: true, errors: [], warnings: [], passedChecks: [] },
        recommendations: [],
        metadata: {
          generatedAt: new Date(),
          processingTimeMs: 0,
          algorithmVersion: this.algorithmVersion,
          productsEvaluated: products.length,
          configurationsGenerated: 1,
          selectedRank: 1,
        },
      };

      // Calculate scores
      config.scores = this.scoreConfiguration(config);

      // Validate
      config.validation = this.validateConfiguration(config);

      // Generate recommendations
      config.recommendations = this.generateRecommendations(config);

      return config;
    } catch (error) {
      logger.error(`Failed to generate configuration for layout ${layout}`, { error });
      return null;
    }
  }

  private categorizeProducts(products: GeneratorProduct[]): CategorizedProducts {
    return {
      baseCabinets: products.filter(p =>
        p.category.toLowerCase().includes('base') ||
        p.category.toLowerCase().includes('floor')
      ),
      wallCabinets: products.filter(p =>
        p.category.toLowerCase().includes('wall') ||
        p.category.toLowerCase().includes('upper')
      ),
      tallCabinets: products.filter(p =>
        p.category.toLowerCase().includes('tall') ||
        p.category.toLowerCase().includes('pantry')
      ),
      cornerCabinets: products.filter(p =>
        p.category.toLowerCase().includes('corner')
      ),
      sinks: products.filter(p =>
        p.category.toLowerCase().includes('sink')
      ),
      cooktops: products.filter(p =>
        p.category.toLowerCase().includes('cooktop') ||
        p.category.toLowerCase().includes('hob')
      ),
      ovens: products.filter(p =>
        p.category.toLowerCase().includes('oven')
      ),
      refrigerators: products.filter(p =>
        p.category.toLowerCase().includes('refrigerator') ||
        p.category.toLowerCase().includes('fridge')
      ),
      dishwashers: products.filter(p =>
        p.category.toLowerCase().includes('dishwasher')
      ),
      hoods: products.filter(p =>
        p.category.toLowerCase().includes('hood') ||
        p.category.toLowerCase().includes('extractor')
      ),
      other: products.filter(p => {
        const cat = p.category.toLowerCase();
        return !['base', 'wall', 'tall', 'corner', 'sink', 'cooktop', 'hob',
                 'oven', 'refrigerator', 'fridge', 'dishwasher', 'hood', 'extractor',
                 'floor', 'upper', 'pantry']
          .some(keyword => cat.includes(keyword));
      }),
    };
  }

  private placeEssentialElements(
    layout: LayoutType,
    roomAnalysis: RoomAnalysis,
    products: CategorizedProducts,
    preferences: GeneratorPreferences
  ): ItemPlacement[] | null {
    const placements: ItemPlacement[] = [];

    // Find best sink
    const sink = this.selectBestProduct(products.sinks, preferences);
    if (!sink) {
      // If no sink product, create a placeholder
      // In production, this would fail or use a default
    }

    // Find best cooktop
    const cooktop = this.selectBestProduct(products.cooktops, preferences);

    // Find best refrigerator
    const refrigerator = this.selectBestProduct(products.refrigerators, preferences);

    // Calculate positions based on layout
    const positions = this.calculateEssentialPositions(layout, roomAnalysis);

    // Place sink
    if (sink) {
      const sinkWall = this.findWallWithUtility(roomAnalysis.walls, 'water_inlet');
      placements.push(this.createPlacement(
        sink,
        positions.sink,
        sinkWall?.side || 'north',
        'cleaning',
        [{ type: 'water_inlet', requiresExtension: !sinkWall }]
      ));
    }

    // Place cooktop
    if (cooktop) {
      const gasWall = this.findWallWithUtility(roomAnalysis.walls, 'gas_line');
      const electricWall = this.findWallWithUtility(roomAnalysis.walls, 'electrical_outlet');
      const cooktopWall = gasWall || electricWall || roomAnalysis.walls[0];

      placements.push(this.createPlacement(
        cooktop,
        positions.cooktop,
        cooktopWall?.side || 'west',
        'cooking',
        [
          gasWall
            ? { type: 'gas_line', requiresExtension: false }
            : { type: 'electrical_outlet', requiresExtension: false },
        ]
      ));
    }

    // Place refrigerator
    if (refrigerator) {
      placements.push(this.createPlacement(
        refrigerator,
        positions.refrigerator,
        'east',
        'cold_storage',
        [{ type: 'electrical_outlet', requiresExtension: false }]
      ));
    }

    return placements.length > 0 ? placements : null;
  }

  private calculateEssentialPositions(
    layout: LayoutType,
    roomAnalysis: RoomAnalysis
  ): { sink: Point3D; cooktop: Point3D; refrigerator: Point3D } {
    const { width, length } = roomAnalysis.dimensions;
    const baseHeight = ERGONOMIC_CONSTANTS.heights.baseCabinet;

    switch (layout) {
      case 'I-shaped':
        return {
          sink: { x: width * 0.5, y: ERGONOMIC_CONSTANTS.depths.baseCabinet, z: baseHeight },
          cooktop: { x: width * 0.25, y: ERGONOMIC_CONSTANTS.depths.baseCabinet, z: baseHeight },
          refrigerator: { x: width * 0.85, y: ERGONOMIC_CONSTANTS.depths.tallCabinet, z: 0 },
        };

      case 'L-shaped':
        return {
          sink: { x: width * 0.4, y: ERGONOMIC_CONSTANTS.depths.baseCabinet, z: baseHeight },
          cooktop: { x: ERGONOMIC_CONSTANTS.depths.baseCabinet, y: length * 0.4, z: baseHeight },
          refrigerator: { x: ERGONOMIC_CONSTANTS.depths.tallCabinet, y: length * 0.8, z: 0 },
        };

      case 'U-shaped':
        return {
          sink: { x: width * 0.5, y: ERGONOMIC_CONSTANTS.depths.baseCabinet, z: baseHeight },
          cooktop: { x: ERGONOMIC_CONSTANTS.depths.baseCabinet, y: length * 0.5, z: baseHeight },
          refrigerator: { x: width - ERGONOMIC_CONSTANTS.depths.tallCabinet, y: length * 0.5, z: 0 },
        };

      case 'parallel':
        return {
          sink: { x: width * 0.5, y: ERGONOMIC_CONSTANTS.depths.baseCabinet, z: baseHeight },
          cooktop: { x: width * 0.3, y: length - ERGONOMIC_CONSTANTS.depths.baseCabinet, z: baseHeight },
          refrigerator: { x: width * 0.8, y: ERGONOMIC_CONSTANTS.depths.tallCabinet, z: 0 },
        };

      case 'island':
        return {
          sink: { x: width * 0.5, y: ERGONOMIC_CONSTANTS.depths.baseCabinet, z: baseHeight },
          cooktop: { x: width * 0.5, y: length * 0.5, z: baseHeight }, // On island
          refrigerator: { x: ERGONOMIC_CONSTANTS.depths.tallCabinet, y: length * 0.5, z: 0 },
        };

      case 'peninsula':
        return {
          sink: { x: width * 0.4, y: ERGONOMIC_CONSTANTS.depths.baseCabinet, z: baseHeight },
          cooktop: { x: width * 0.4, y: length * 0.4, z: baseHeight }, // On peninsula
          refrigerator: { x: width * 0.85, y: ERGONOMIC_CONSTANTS.depths.tallCabinet, z: 0 },
        };

      case 'G-shaped':
        return {
          sink: { x: width * 0.5, y: ERGONOMIC_CONSTANTS.depths.baseCabinet, z: baseHeight },
          cooktop: { x: ERGONOMIC_CONSTANTS.depths.baseCabinet, y: length * 0.5, z: baseHeight },
          refrigerator: { x: width - ERGONOMIC_CONSTANTS.depths.tallCabinet, y: length * 0.7, z: 0 },
        };

      default:
        return {
          sink: { x: width * 0.5, y: ERGONOMIC_CONSTANTS.depths.baseCabinet, z: baseHeight },
          cooktop: { x: width * 0.25, y: ERGONOMIC_CONSTANTS.depths.baseCabinet, z: baseHeight },
          refrigerator: { x: width * 0.85, y: ERGONOMIC_CONSTANTS.depths.tallCabinet, z: 0 },
        };
    }
  }

  private selectBestProduct(
    products: GeneratorProduct[],
    preferences: GeneratorPreferences
  ): GeneratorProduct | null {
    if (products.length === 0) return null;

    // Filter by budget
    let filtered = products;
    if (preferences.budget) {
      filtered = products.filter(p => p.price <= preferences.budget.max * 0.2);
    }

    if (filtered.length === 0) {
      filtered = products; // Fall back to all products
    }

    // Filter by preferred brands
    if (preferences.preferredBrands && preferences.preferredBrands.length > 0) {
      const brandFiltered = filtered.filter(p =>
        preferences.preferredBrands!.includes(p.brand)
      );
      if (brandFiltered.length > 0) {
        filtered = brandFiltered;
      }
    }

    // Sort by availability and price (best value)
    return filtered.sort((a, b) => {
      // Prefer in-stock items
      const aInStock = a.availability === 'in_stock' ? 1 : 0;
      const bInStock = b.availability === 'in_stock' ? 1 : 0;
      if (aInStock !== bInStock) return bInStock - aInStock;

      // Then by price (lower is better for value)
      return a.price - b.price;
    })[0] || null;
  }

  private createPlacement(
    product: GeneratorProduct,
    position: Point3D,
    wallSide: WallSide,
    zone: KitchenZone,
    connections: PlacementConnection[]
  ): ItemPlacement {
    return {
      id: this.generateId(),
      productId: product.id,
      product: {
        id: product.id,
        sku: product.sku,
        name: product.name,
        brand: product.brand,
        category: this.mapToProductCategory(product.category),
        subcategory: product.subcategory,
        dimensions: {
          width: product.width,
          height: product.height,
          depth: product.depth,
          unit: 'cm',
        },
        price: product.price,
        currency: product.currency,
        imageUrl: product.imageUrl,
      },
      position,
      rotation: this.calculateRotationForWall(wallSide),
      wallSide,
      zone,
      connections,
    };
  }

  private mapToProductCategory(category: string): ProductCategoryType {
    const lower = category.toLowerCase();
    if (lower.includes('base') || lower.includes('floor')) return 'base_cabinet';
    if (lower.includes('wall') || lower.includes('upper')) return 'wall_cabinet';
    if (lower.includes('tall') || lower.includes('pantry')) return 'tall_cabinet';
    if (lower.includes('corner')) return 'corner_cabinet';
    if (lower.includes('sink')) return 'sink_cabinet';
    if (lower.includes('appliance') || lower.includes('cooktop') ||
        lower.includes('oven') || lower.includes('refrigerator') ||
        lower.includes('dishwasher') || lower.includes('hood')) return 'appliance';
    if (lower.includes('countertop')) return 'countertop';
    return 'accessory';
  }

  private calculateRotationForWall(wallSide: WallSide): number {
    switch (wallSide) {
      case 'north': return 0;
      case 'east': return 90;
      case 'south': return 180;
      case 'west': return 270;
      default: return 0;
    }
  }

  private optimizeEssentialPositions(
    placements: ItemPlacement[],
    _roomAnalysis: RoomAnalysis,
    _layout: LayoutType
  ): ItemPlacement[] {
    // Calculate current work triangle
    const currentTriangle = this.calculateWorkTriangle(placements);

    // If already optimal, return as-is
    if (currentTriangle.isOptimal) {
      return placements;
    }

    // Try to adjust positions to improve triangle
    const optimized = [...placements];

    // Check if triangle is too large
    if (currentTriangle.distances.total > ERGONOMIC_CONSTANTS.workTriangle.maxTotalDistance) {
      // Try to bring elements closer together
      // This is a simplified optimization - production would use more sophisticated algorithms
    }

    // Check if triangle is too small
    if (currentTriangle.distances.total < ERGONOMIC_CONSTANTS.workTriangle.minTotalDistance) {
      // Try to space elements further apart
    }

    return optimized;
  }

  private placeCabinets(
    _layout: LayoutType,
    roomAnalysis: RoomAnalysis,
    existingPlacements: ItemPlacement[],
    products: CategorizedProducts,
    preferences: GeneratorPreferences
  ): ItemPlacement[] {
    const placements = [...existingPlacements];

    // Calculate remaining space on each wall
    const wallSpaces = this.calculateRemainingWallSpace(
      roomAnalysis.walls,
      existingPlacements
    );

    // Place base cabinets
    for (const space of wallSpaces) {
      if (space.remainingLength < 30) continue; // Skip if too small

      const cabinetsToPlace = this.selectCabinetsForSpace(
        space,
        products.baseCabinets,
        preferences
      );

      let currentX = space.startX;
      for (const cabinet of cabinetsToPlace) {
        if (currentX + cabinet.width > space.endX) break;

        placements.push(this.createPlacement(
          cabinet,
          {
            x: currentX + cabinet.width / 2,
            y: ERGONOMIC_CONSTANTS.depths.baseCabinet,
            z: ERGONOMIC_CONSTANTS.heights.baseCabinet,
          },
          space.wallSide,
          'storage',
          []
        ));

        currentX += cabinet.width;
      }
    }

    // Place wall cabinets above base cabinets
    const baseCabinetPlacements = placements.filter(
      p => p.product.category === 'base_cabinet'
    );

    for (const basePlacement of baseCabinetPlacements) {
      // Check if there's space for a wall cabinet
      const hasObstacleAbove = roomAnalysis.walls.some(wall =>
        wall.side === basePlacement.wallSide &&
        wall.obstacles.some(obs =>
          obs.type === 'window' &&
          Math.abs(obs.position.x - basePlacement.position.x) < basePlacement.product.dimensions.width
        )
      );

      if (!hasObstacleAbove && products.wallCabinets.length > 0) {
        const wallCabinet = this.selectBestProduct(products.wallCabinets, preferences);
        if (wallCabinet) {
          placements.push(this.createPlacement(
            wallCabinet,
            {
              x: basePlacement.position.x,
              y: ERGONOMIC_CONSTANTS.depths.wallCabinet,
              z: ERGONOMIC_CONSTANTS.heights.wallCabinetBottom,
            },
            basePlacement.wallSide || 'north',
            'storage',
            []
          ));
        }
      }
    }

    return placements;
  }

  private calculateRemainingWallSpace(
    walls: AnalyzedWall[],
    placements: ItemPlacement[]
  ): WallSpace[] {
    return walls.map(wall => {
      const wallPlacements = placements.filter(p => p.wallSide === wall.side);
      const usedWidth = wallPlacements.reduce(
        (sum, p) => sum + p.product.dimensions.width,
        0
      );

      return {
        wallId: wall.id,
        wallSide: wall.side,
        startX: 0,
        endX: wall.usableLength,
        remainingLength: wall.usableLength - usedWidth,
        hasUtilities: wall.hasWaterConnection || wall.hasElectricalConnection,
      };
    });
  }

  private selectCabinetsForSpace(
    space: WallSpace,
    cabinets: GeneratorProduct[],
    _preferences: GeneratorPreferences
  ): GeneratorProduct[] {
    const selected: GeneratorProduct[] = [];
    let remainingWidth = space.remainingLength;

    // Sort cabinets by width (largest first for better space utilization)
    const sortedCabinets = [...cabinets].sort((a, b) => b.width - a.width);

    for (const cabinet of sortedCabinets) {
      if (cabinet.width <= remainingWidth) {
        selected.push(cabinet);
        remainingWidth -= cabinet.width;
      }

      if (remainingWidth < 30) break; // Stop if remaining space is too small
    }

    return selected;
  }

  // ==========================================================================
  // PRIVATE METHODS - Work Triangle
  // ==========================================================================

  private calculateWorkTriangle(placements: ItemPlacement[]): WorkTriangleResult {
    const sink = placements.find(p => p.zone === 'cleaning');
    const cooktop = placements.find(p => p.zone === 'cooking');
    const refrigerator = placements.find(p => p.zone === 'cold_storage');

    const defaultResult: WorkTriangleResult = {
      sink: { x: 0, y: 0 },
      cooktop: { x: 0, y: 0 },
      refrigerator: { x: 0, y: 0 },
      distances: {
        sinkToCooktop: 0,
        cooktopToRefrigerator: 0,
        refrigeratorToSink: 0,
        total: 0,
      },
      isOptimal: false,
      score: 0,
      issues: ['Work triangle elements not found'],
      suggestions: [],
    };

    if (!sink || !cooktop || !refrigerator) {
      return defaultResult;
    }

    const sinkPos = { x: sink.position.x, y: sink.position.y };
    const cooktopPos = { x: cooktop.position.x, y: cooktop.position.y };
    const fridgePos = { x: refrigerator.position.x, y: refrigerator.position.y };

    const sinkToCooktop = this.distance2D(sinkPos, cooktopPos);
    const cooktopToRefrigerator = this.distance2D(cooktopPos, fridgePos);
    const refrigeratorToSink = this.distance2D(fridgePos, sinkPos);
    const total = sinkToCooktop + cooktopToRefrigerator + refrigeratorToSink;

    const rules = ERGONOMIC_CONSTANTS.workTriangle;
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check total distance
    if (total < rules.minTotalDistance) {
      issues.push('Work triangle is too compact');
      suggestions.push('Consider spreading the elements further apart for better workflow');
    }
    if (total > rules.maxTotalDistance) {
      issues.push('Work triangle is too large');
      suggestions.push('Consider bringing the main elements closer together to reduce walking');
    }

    // Check individual legs
    if (sinkToCooktop < rules.minLegDistance) {
      issues.push('Sink and cooktop are too close');
    } else if (sinkToCooktop > rules.maxLegDistance) {
      issues.push('Sink and cooktop are too far apart');
    }

    if (cooktopToRefrigerator < rules.minLegDistance) {
      issues.push('Cooktop and refrigerator are too close');
    } else if (cooktopToRefrigerator > rules.maxLegDistance) {
      issues.push('Cooktop and refrigerator are too far apart');
    }

    if (refrigeratorToSink < rules.minLegDistance) {
      issues.push('Refrigerator and sink are too close');
    } else if (refrigeratorToSink > rules.maxLegDistance) {
      issues.push('Refrigerator and sink are too far apart');
    }

    const isOptimal =
      total >= rules.minTotalDistance &&
      total <= rules.maxTotalDistance &&
      sinkToCooktop >= rules.minLegDistance &&
      sinkToCooktop <= rules.maxLegDistance &&
      cooktopToRefrigerator >= rules.minLegDistance &&
      cooktopToRefrigerator <= rules.maxLegDistance &&
      refrigeratorToSink >= rules.minLegDistance &&
      refrigeratorToSink <= rules.maxLegDistance;

    // Calculate score
    let score = 100;
    if (!isOptimal) {
      // Deduct points for issues
      if (total < rules.minTotalDistance || total > rules.maxTotalDistance) {
        score -= 25;
      }
      if (sinkToCooktop < rules.minLegDistance || sinkToCooktop > rules.maxLegDistance) {
        score -= 15;
      }
      if (cooktopToRefrigerator < rules.minLegDistance || cooktopToRefrigerator > rules.maxLegDistance) {
        score -= 15;
      }
      if (refrigeratorToSink < rules.minLegDistance || refrigeratorToSink > rules.maxLegDistance) {
        score -= 15;
      }
    }

    return {
      sink: sinkPos,
      cooktop: cooktopPos,
      refrigerator: fridgePos,
      distances: {
        sinkToCooktop,
        cooktopToRefrigerator,
        refrigeratorToSink,
        total,
      },
      isOptimal,
      score: Math.max(0, score),
      issues,
      suggestions,
    };
  }

  // ==========================================================================
  // PRIVATE METHODS - Cost Calculation
  // ==========================================================================

  private calculateCosts(
    placements: ItemPlacement[],
    budget: BudgetConstraint
  ): CostBreakdown {
    let cabinets = 0;
    let appliances = 0;
    let countertops = 0;
    let accessories = 0;

    for (const placement of placements) {
      const category = placement.product.category;
      const price = placement.product.price;

      if (category.includes('cabinet')) {
        cabinets += price;
      } else if (category === 'appliance') {
        appliances += price;
      } else if (category === 'countertop') {
        countertops += price;
      } else {
        accessories += price;
      }
    }

    // Estimate countertop cost if not explicitly placed
    if (countertops === 0) {
      const baseCabinets = placements.filter(p => p.product.category === 'base_cabinet');
      const countertopLength = baseCabinets.reduce(
        (sum, p) => sum + p.product.dimensions.width,
        0
      );
      // Average countertop price per linear cm
      countertops = countertopLength * 3; // 3 EUR per cm
    }

    const subtotal = cabinets + appliances + countertops + accessories;
    const installation = subtotal * 0.15; // 15% installation cost

    const total = subtotal + installation;
    const withinBudget = total <= budget.max;
    const budgetUtilization = (total / budget.max) * 100;

    // Determine confidence based on how many items have prices
    const itemsWithPrices = placements.filter(p => p.product.price > 0).length;
    const priceRatio = itemsWithPrices / placements.length;
    const confidence: 'low' | 'medium' | 'high' =
      priceRatio > 0.8 ? 'high' : priceRatio > 0.5 ? 'medium' : 'low';

    return {
      cabinets,
      appliances,
      countertops,
      accessories,
      installation,
      subtotal,
      total,
      currency: budget.currency,
      confidence,
      withinBudget,
      budgetUtilization: Math.round(budgetUtilization * 10) / 10,
    };
  }

  private calculateBudgetAllocation(budget: BudgetConstraint): {
    cabinets: number;
    appliances: number;
    countertops: number;
    accessories: number;
    installation: number;
  } {
    const total = budget.max;

    // Default allocation if not specified
    const allocation = budget.allocation || {
      cabinets: 40,
      appliances: 35,
      countertops: 15,
      accessories: 10,
    };

    const cabinetPct = (allocation.cabinets || 40) / 100;
    const appliancePct = (allocation.appliances || 35) / 100;
    const countertopPct = (allocation.countertops || 15) / 100;
    const accessoryPct = (allocation.accessories || 10) / 100;

    // Reserve 15% for installation
    const availableForProducts = total * 0.85;

    return {
      cabinets: availableForProducts * cabinetPct,
      appliances: availableForProducts * appliancePct,
      countertops: availableForProducts * countertopPct,
      accessories: availableForProducts * accessoryPct,
      installation: total * 0.15,
    };
  }

  // ==========================================================================
  // PRIVATE METHODS - Statistics
  // ==========================================================================

  private calculateStatistics(
    placements: ItemPlacement[],
    roomAnalysis: RoomAnalysis
  ): ConfigurationStatistics {
    const cabinets = {
      base: 0,
      wall: 0,
      tall: 0,
      corner: 0,
    };

    let applianceCount = 0;
    let countertopLength = 0;
    let storageVolume = 0;
    let floorSpaceUsed = 0;

    for (const placement of placements) {
      const cat = placement.product.category;
      const dims = placement.product.dimensions;

      if (cat === 'base_cabinet') {
        cabinets.base++;
        countertopLength += dims.width;
        storageVolume += (dims.width * dims.height * dims.depth) / 1000; // Convert to liters
        floorSpaceUsed += dims.width * dims.depth;
      } else if (cat === 'wall_cabinet') {
        cabinets.wall++;
        storageVolume += (dims.width * dims.height * dims.depth) / 1000;
      } else if (cat === 'tall_cabinet') {
        cabinets.tall++;
        storageVolume += (dims.width * dims.height * dims.depth) / 1000;
        floorSpaceUsed += dims.width * dims.depth;
      } else if (cat === 'corner_cabinet') {
        cabinets.corner++;
        storageVolume += (dims.width * dims.height * dims.depth) / 1000;
        floorSpaceUsed += dims.width * dims.depth;
      } else if (cat === 'appliance') {
        applianceCount++;
        floorSpaceUsed += dims.width * dims.depth;
      }
    }

    // Calculate countertop area
    const countertopArea = countertopLength * ERGONOMIC_CONSTANTS.depths.countertop;

    // Calculate wall space utilization
    const wallSpaceUtilization =
      (countertopLength / roomAnalysis.usableWallLength) * 100;

    return {
      totalItems: placements.length,
      cabinetCount: cabinets,
      applianceCount,
      countertopLength,
      countertopArea,
      storageVolume: Math.round(storageVolume),
      floorSpaceUsed: Math.round(floorSpaceUsed),
      wallSpaceUtilization: Math.round(wallSpaceUtilization * 10) / 10,
    };
  }

  // ==========================================================================
  // PRIVATE METHODS - Scoring
  // ==========================================================================

  private calculateOverallScore(
    config: GeneratedKitchenConfiguration,
    preferences: GeneratorPreferences
  ): number {
    // Base weights
    const weights = {
      ergonomics: 0.20,
      storage: 0.15,
      aesthetics: 0.15,
      budget: 0.20,
      spaceUtilization: 0.15,
      workflow: 0.15,
    };

    // Adjust weights based on priorities
    if (preferences.priorities.includes('efficiency')) {
      weights.ergonomics = 0.30;
      weights.workflow = 0.20;
      weights.aesthetics = 0.10;
    }
    if (preferences.priorities.includes('storage')) {
      weights.storage = 0.25;
      weights.spaceUtilization = 0.20;
    }
    if (preferences.priorities.includes('aesthetics')) {
      weights.aesthetics = 0.25;
      weights.storage = 0.10;
    }

    const { scores } = config;

    return Math.round(
      scores.ergonomics * weights.ergonomics +
      scores.storage * weights.storage +
      scores.aesthetics * weights.aesthetics +
      scores.budget * weights.budget +
      scores.spaceUtilization * weights.spaceUtilization +
      scores.workflow * weights.workflow
    );
  }

  private calculateErgonomicsScore(config: GeneratedKitchenConfiguration): number {
    let score = config.workTriangle.score;

    // Check passage widths
    // (simplified - in production would analyze actual passages)

    // Check heights
    // (simplified - in production would verify all heights)

    return Math.min(100, Math.max(0, score));
  }

  private calculateStorageScore(config: GeneratedKitchenConfiguration): number {
    const { statistics } = config;
    let score = 50; // Base score

    // More storage volume is better
    if (statistics.storageVolume > 300) score += 20;
    if (statistics.storageVolume > 500) score += 15;
    if (statistics.storageVolume > 700) score += 15;

    // Variety of cabinet types
    if (statistics.cabinetCount.wall > 0) score += 5;
    if (statistics.cabinetCount.tall > 0) score += 5;

    return Math.min(100, score);
  }

  private calculateAestheticsScore(config: GeneratedKitchenConfiguration): number {
    let score = 70; // Base aesthetics score

    // Check brand consistency
    const brands = new Set(config.placements.map(p => p.product.brand));
    if (brands.size === 1) score += 15;
    else if (brands.size <= 2) score += 10;
    else if (brands.size <= 3) score += 5;

    // Check proportions (simplified)
    const { cabinetCount } = config.statistics;
    const wallToBaseRatio = cabinetCount.wall / Math.max(1, cabinetCount.base);
    if (wallToBaseRatio >= 0.5 && wallToBaseRatio <= 1.5) score += 10;

    return Math.min(100, score);
  }

  private calculateSpaceUtilizationScore(config: GeneratedKitchenConfiguration): number {
    const utilization = config.statistics.wallSpaceUtilization;

    // Optimal utilization is 60-80%
    if (utilization >= 60 && utilization <= 80) return 100;
    if (utilization >= 50 && utilization < 60) return 85;
    if (utilization >= 80 && utilization <= 90) return 85;
    if (utilization >= 40 && utilization < 50) return 70;
    if (utilization >= 90 && utilization <= 95) return 70;
    if (utilization < 40) return 50;

    return 50;
  }

  private calculateWorkflowScore(config: GeneratedKitchenConfiguration): number {
    // Start with work triangle score
    let score = config.workTriangle.score;

    // Check dishwasher near sink
    const sink = config.placements.find(p => p.zone === 'cleaning');
    const dishwasher = config.placements.find(p =>
      p.product.category === 'appliance' &&
      p.product.name.toLowerCase().includes('dishwasher')
    );

    if (sink && dishwasher) {
      const distance = this.distance2D(
        { x: sink.position.x, y: sink.position.y },
        { x: dishwasher.position.x, y: dishwasher.position.y }
      );
      if (distance <= ERGONOMIC_CONSTANTS.minDistances.dishwasherToSink) {
        score += 10;
      }
    }

    return Math.min(100, Math.max(0, score));
  }

  // ==========================================================================
  // PRIVATE METHODS - Validation
  // ==========================================================================

  private validateWorkTriangle(
    triangle: WorkTriangleResult
  ): { errors: ValidationIssue[]; warnings: ValidationIssue[] } {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    if (!triangle.isOptimal) {
      for (const issue of triangle.issues) {
        warnings.push({
          code: 'WORK_TRIANGLE_SUBOPTIMAL',
          message: issue,
          severity: 'warning',
          suggestion: triangle.suggestions[0],
        });
      }
    }

    return { errors, warnings };
  }

  private validatePassages(
    _config: GeneratedKitchenConfiguration
  ): { errors: ValidationIssue[]; warnings: ValidationIssue[] } {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    // In a real implementation, this would check actual passage widths
    // between cabinet runs and islands

    return { errors, warnings };
  }

  private validateClearances(
    config: GeneratedKitchenConfiguration
  ): { errors: ValidationIssue[]; warnings: ValidationIssue[] } {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    // Check appliance clearances
    for (const placement of config.placements) {
      if (placement.product.category === 'appliance') {
        // In a real implementation, verify there's enough space in front of appliances
      }
    }

    return { errors, warnings };
  }

  private validateNoOverlaps(
    config: GeneratedKitchenConfiguration
  ): { errors: ValidationIssue[]; warnings: ValidationIssue[] } {
    const errors: ValidationIssue[] = [];

    for (let i = 0; i < config.placements.length; i++) {
      for (let j = i + 1; j < config.placements.length; j++) {
        const p1 = config.placements[i];
        const p2 = config.placements[j];

        if (p1 && p2 && this.doItemsOverlap(p1, p2)) {
          errors.push({
            code: 'ITEM_OVERLAP',
            message: `Items "${p1.product.name}" and "${p2.product.name}" overlap`,
            severity: 'error',
            itemId: p1.id,
            position: p1.position,
            suggestion: 'Reposition one of the items to eliminate overlap',
          });
        }
      }
    }

    return { errors, warnings: [] };
  }

  private validateUtilityConnections(
    config: GeneratedKitchenConfiguration
  ): { errors: ValidationIssue[]; warnings: ValidationIssue[] } {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    for (const placement of config.placements) {
      for (const connection of placement.connections) {
        if (connection.requiresExtension) {
          warnings.push({
            code: 'UTILITY_EXTENSION_REQUIRED',
            message: `${placement.product.name} requires ${connection.type} extension`,
            severity: 'warning',
            itemId: placement.id,
            suggestion: 'Consider relocating near existing utility connection',
          });
        }
      }
    }

    return { errors, warnings };
  }

  private validateMinDistances(
    config: GeneratedKitchenConfiguration
  ): { errors: ValidationIssue[]; warnings: ValidationIssue[] } {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    const cooktop = config.placements.find(p => p.zone === 'cooking');
    const sink = config.placements.find(p => p.zone === 'cleaning');

    if (cooktop && sink) {
      const distance = this.distance2D(
        { x: cooktop.position.x, y: cooktop.position.y },
        { x: sink.position.x, y: sink.position.y }
      );

      if (distance < ERGONOMIC_CONSTANTS.minDistances.cooktopToSink) {
        warnings.push({
          code: 'COOKTOP_SINK_TOO_CLOSE',
          message: `Cooktop and sink are ${Math.round(distance)}cm apart (minimum ${ERGONOMIC_CONSTANTS.minDistances.cooktopToSink}cm)`,
          severity: 'warning',
          suggestion: 'Increase distance between cooktop and sink for safety',
        });
      }
    }

    return { errors, warnings };
  }

  private doItemsOverlap(p1: ItemPlacement, p2: ItemPlacement): boolean {
    // Check if on same plane (base cabinets, wall cabinets, etc.)
    const z1Range = { min: p1.position.z, max: p1.position.z + p1.product.dimensions.height };
    const z2Range = { min: p2.position.z, max: p2.position.z + p2.product.dimensions.height };

    const zOverlap = !(z1Range.max <= z2Range.min || z2Range.max <= z1Range.min);

    if (!zOverlap) return false;

    // Check XY overlap
    const x1Range = {
      min: p1.position.x - p1.product.dimensions.width / 2,
      max: p1.position.x + p1.product.dimensions.width / 2,
    };
    const x2Range = {
      min: p2.position.x - p2.product.dimensions.width / 2,
      max: p2.position.x + p2.product.dimensions.width / 2,
    };

    const xOverlap = !(x1Range.max <= x2Range.min || x2Range.max <= x1Range.min);

    const y1Range = {
      min: p1.position.y - p1.product.dimensions.depth / 2,
      max: p1.position.y + p1.product.dimensions.depth / 2,
    };
    const y2Range = {
      min: p2.position.y - p2.product.dimensions.depth / 2,
      max: p2.position.y + p2.product.dimensions.depth / 2,
    };

    const yOverlap = !(y1Range.max <= y2Range.min || y2Range.max <= y1Range.min);

    return xOverlap && yOverlap;
  }

  // ==========================================================================
  // PRIVATE METHODS - Recommendations
  // ==========================================================================

  private generateRecommendations(
    config: GeneratedKitchenConfiguration
  ): ConfigurationRecommendation[] {
    const recommendations: ConfigurationRecommendation[] = [];

    // Work triangle recommendations
    if (!config.workTriangle.isOptimal) {
      recommendations.push({
        type: 'improvement',
        priority: 'high',
        category: 'ergonomics',
        title: 'Optimize Work Triangle',
        message: config.workTriangle.suggestions[0] || 'Consider adjusting the positions of sink, cooktop, and refrigerator',
      });
    }

    // Storage recommendations
    if (config.statistics.storageVolume < 300) {
      recommendations.push({
        type: 'tip',
        priority: 'medium',
        category: 'storage',
        title: 'Increase Storage',
        message: 'Consider adding tall cabinets or wall cabinets to increase storage capacity',
      });
    }

    // Budget recommendations
    if (!config.costs.withinBudget) {
      recommendations.push({
        type: 'warning',
        priority: 'high',
        category: 'budget',
        title: 'Over Budget',
        message: `Configuration exceeds budget by ${(config.costs.budgetUtilization - 100).toFixed(1)}%`,
      });
    }

    // Safety recommendations
    if (config.validation.warnings.length > 0) {
      for (const warning of config.validation.warnings.slice(0, 3)) {
        recommendations.push({
          type: 'warning',
          priority: 'medium',
          category: 'safety',
          title: warning.code.replace(/_/g, ' ').toLowerCase(),
          message: warning.message,
        });
      }
    }

    return recommendations;
  }

  // ==========================================================================
  // PRIVATE METHODS - Optimization
  // ==========================================================================

  private optimizeWorkTriangle(
    config: GeneratedKitchenConfiguration
  ): GeneratedKitchenConfiguration {
    // In a real implementation, this would use optimization algorithms
    // to find better positions for work triangle elements
    return config;
  }

  private async optimizeStorage(
    config: GeneratedKitchenConfiguration
  ): Promise<GeneratedKitchenConfiguration> {
    // Add more storage units where space permits
    return config;
  }

  private optimizeCountertopSpace(
    config: GeneratedKitchenConfiguration
  ): GeneratedKitchenConfiguration {
    // Maximize continuous countertop runs
    return config;
  }

  private async optimizeAesthetics(
    config: GeneratedKitchenConfiguration
  ): Promise<GeneratedKitchenConfiguration> {
    // Improve visual balance and brand consistency
    return config;
  }

  private optimizeCookingZone(
    config: GeneratedKitchenConfiguration
  ): GeneratedKitchenConfiguration {
    // Ensure adequate space around cooktop and oven
    return config;
  }

  private optimizeSocialSpace(
    config: GeneratedKitchenConfiguration
  ): GeneratedKitchenConfiguration {
    // Add or enhance island/peninsula for socializing
    return config;
  }

  // ==========================================================================
  // PRIVATE METHODS - Variation Generation
  // ==========================================================================

  private async generateVariation(
    baseConfig: GeneratedKitchenConfiguration,
    _roomAnalysis: RoomAnalysis,
    _products: GeneratorProduct[],
    _preferences: GeneratorPreferences
  ): Promise<GeneratedKitchenConfiguration | null> {
    // Create a variation by swapping some products for alternatives
    const variation = JSON.parse(JSON.stringify(baseConfig)) as GeneratedKitchenConfiguration;

    variation.id = this.generateId();
    variation.name = `${baseConfig.name} - Variation`;

    // Swap some products for alternatives
    for (const placement of variation.placements) {
      if (Math.random() > 0.7 && placement.alternatives && placement.alternatives.length > 0) {
        // This is simplified - in production would actually fetch and use alternative products
      }
    }

    return variation;
  }

  private isDuplicateConfig(
    config: GeneratedKitchenConfiguration,
    existing: GeneratedKitchenConfiguration[]
  ): boolean {
    for (const existingConfig of existing) {
      // Compare layouts
      if (config.layoutType !== existingConfig.layoutType) continue;

      // Compare placement counts
      if (config.placements.length !== existingConfig.placements.length) continue;

      // Compare products used
      const configProducts = new Set(config.placements.map(p => p.productId));
      const existingProducts = new Set(existingConfig.placements.map(p => p.productId));

      if (this.setsEqual(configProducts, existingProducts)) {
        return true;
      }
    }

    return false;
  }

  // ==========================================================================
  // PRIVATE METHODS - Utilities
  // ==========================================================================

  private generateId(): string {
    return `kg-${crypto.randomBytes(12).toString('base64url')}`;
  }

  private distance2D(p1: Point2D, p2: Point2D): number {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }

  private setsEqual<T>(a: Set<T>, b: Set<T>): boolean {
    if (a.size !== b.size) return false;
    for (const item of a) {
      if (!b.has(item)) return false;
    }
    return true;
  }

  private generateConfigName(layout: LayoutType, index: number): string {
    const layoutNames: Record<LayoutType, string> = {
      'I-shaped': 'Linear Kitchen',
      'L-shaped': 'L-Shaped Kitchen',
      'U-shaped': 'U-Shaped Kitchen',
      'G-shaped': 'G-Shaped Kitchen',
      'parallel': 'Galley Kitchen',
      'island': 'Island Kitchen',
      'peninsula': 'Peninsula Kitchen',
    };

    return `${layoutNames[layout]} #${index}`;
  }

  private generateDescription(
    layout: LayoutType,
    stats: ConfigurationStatistics
  ): string {
    const totalCabinets = stats.cabinetCount.base + stats.cabinetCount.wall +
                          stats.cabinetCount.tall + stats.cabinetCount.corner;

    return `${this.getLayoutDescription(layout)} featuring ${totalCabinets} cabinets, ` +
           `${stats.applianceCount} appliances, and ${(stats.countertopArea / 10000).toFixed(2)}m² of counter space. ` +
           `Total storage: ${stats.storageVolume} liters.`;
  }

  private getLayoutDescription(layout: LayoutType): string {
    const descriptions: Record<LayoutType, string> = {
      'I-shaped': 'A compact linear design perfect for narrow spaces',
      'L-shaped': 'An efficient L-configuration maximizing corner space',
      'U-shaped': 'A wraparound design offering maximum storage and workspace',
      'G-shaped': 'An extended U-shape with additional peninsula for extra functionality',
      'parallel': 'A galley-style layout ideal for efficient workflow',
      'island': 'An open design with central island for cooking and socializing',
      'peninsula': 'A versatile layout with attached peninsula providing extra workspace',
    };

    return descriptions[layout];
  }

  private findWallWithUtility(
    walls: AnalyzedWall[],
    utilityType: UtilityType
  ): AnalyzedWall | undefined {
    return walls.find(wall => {
      if (utilityType === 'water_inlet') return wall.hasWaterConnection;
      if (utilityType === 'electrical_outlet') return wall.hasElectricalConnection;
      if (utilityType === 'gas_line') return wall.hasGasConnection;
      return wall.utilities.some(u => u.type === utilityType);
    });
  }

  private createZoneForWall(wall: AnalyzedWall, priority: 'primary' | 'secondary' | 'tertiary'): PlacementZone {
    return {
      id: this.generateId(),
      wallId: wall.id,
      wallSide: wall.side,
      startX: 0,
      endX: wall.usableLength,
      priority,
      allowsBaseCabinets: true,
      allowsWallCabinets: true,
      allowsTallCabinets: priority === 'primary',
      hasUtilities: wall.hasWaterConnection || wall.hasElectricalConnection || wall.hasGasConnection,
    };
  }

  private createIslandZone(roomAnalysis: RoomAnalysis): PlacementZone {
    const { width, length } = roomAnalysis.dimensions;

    return {
      id: this.generateId(),
      wallId: 'island',
      wallSide: 'custom',
      startX: width * 0.3,
      endX: width * 0.7,
      priority: 'secondary',
      allowsBaseCabinets: true,
      allowsWallCabinets: false,
      allowsTallCabinets: false,
      hasUtilities: false,
      isIsland: true,
      centerY: length * 0.5,
    };
  }

  private createPeninsulaZone(_roomAnalysis: RoomAnalysis, attachedWall: AnalyzedWall): PlacementZone {
    return {
      id: this.generateId(),
      wallId: 'peninsula',
      wallSide: 'custom',
      startX: attachedWall.start.x,
      endX: attachedWall.start.x + 120, // Standard peninsula width
      priority: 'secondary',
      allowsBaseCabinets: true,
      allowsWallCabinets: false,
      allowsTallCabinets: false,
      hasUtilities: false,
      isPeninsula: true,
    };
  }

  private areWallsOpposite(wall1: AnalyzedWall, wall2: AnalyzedWall): boolean {
    const opposites: Record<WallSide, WallSide> = {
      north: 'south',
      south: 'north',
      east: 'west',
      west: 'east',
      custom: 'custom',
    };

    return opposites[wall1.side] === wall2.side;
  }

  private getStyleCompatibleFilter(style: KitchenStylePreference): string[] {
    const styleKeywords: Record<KitchenStylePreference, string[]> = {
      modern: ['modern', 'contemporary', 'sleek', 'minimalist'],
      contemporary: ['contemporary', 'modern', 'current'],
      traditional: ['traditional', 'classic', 'heritage'],
      scandinavian: ['scandinavian', 'nordic', 'light', 'natural'],
      industrial: ['industrial', 'metal', 'urban', 'loft'],
      minimalist: ['minimalist', 'simple', 'clean', 'modern'],
      rustic: ['rustic', 'country', 'farmhouse', 'natural'],
      transitional: ['transitional', 'mixed', 'blend'],
      mediterranean: ['mediterranean', 'tuscan', 'warm'],
    };

    return styleKeywords[style] || [];
  }

  private filterByStyle(
    products: GeneratorProduct[],
    styleKeywords: string[]
  ): GeneratorProduct[] {
    if (styleKeywords.length === 0) return products;

    return products.filter(product => {
      const searchText = `${product.name} ${product.description || ''} ${product.material || ''}`.toLowerCase();
      return styleKeywords.some(keyword => searchText.includes(keyword.toLowerCase()));
    });
  }
}

// ============================================================================
// HELPER TYPES
// ============================================================================

interface RoomAnalysis {
  dimensions: NormalizedDimensions;
  floorArea: number;
  walls: AnalyzedWall[];
  usableWallLength: number;
  utilities: UtilityConnection[];
  shape: RoomShape;
}

interface NormalizedDimensions {
  width: number;
  length: number;
  height: number;
  unit: 'cm';
}

interface AnalyzedWall extends WallSegment {
  segments: WallSegmentInfo[];
  hasWaterConnection: boolean;
  hasElectricalConnection: boolean;
  hasGasConnection: boolean;
}

interface WallSegmentInfo {
  start: number;
  end: number;
  length: number;
}

interface CategorizedProducts {
  baseCabinets: GeneratorProduct[];
  wallCabinets: GeneratorProduct[];
  tallCabinets: GeneratorProduct[];
  cornerCabinets: GeneratorProduct[];
  sinks: GeneratorProduct[];
  cooktops: GeneratorProduct[];
  ovens: GeneratorProduct[];
  refrigerators: GeneratorProduct[];
  dishwashers: GeneratorProduct[];
  hoods: GeneratorProduct[];
  other: GeneratorProduct[];
}

interface PlacementZone {
  id: string;
  wallId: string;
  wallSide: WallSide;
  startX: number;
  endX: number;
  priority: 'primary' | 'secondary' | 'tertiary';
  allowsBaseCabinets: boolean;
  allowsWallCabinets: boolean;
  allowsTallCabinets: boolean;
  hasUtilities: boolean;
  isIsland?: boolean;
  isPeninsula?: boolean;
  centerY?: number;
}

interface WallSpace {
  wallId: string;
  wallSide: WallSide;
  startX: number;
  endX: number;
  remainingLength: number;
  hasUtilities: boolean;
}

interface ProductSelection {
  baseCabinets: GeneratorProduct[];
  wallCabinets: GeneratorProduct[];
  tallCabinets: GeneratorProduct[];
  appliances: GeneratorProduct[];
  sinks: GeneratorProduct[];
  countertops: GeneratorProduct[];
  accessories: GeneratorProduct[];
  totalBudgetAllocated: number;
  currency: string;
}

// ============================================================================
// ERROR CLASS
// ============================================================================

export class KitchenGeneratorError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'KitchenGeneratorError';
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Creates a new KitchenGeneratorService instance.
 *
 * @param repository - Repository for accessing products and saving configurations
 * @returns Configured KitchenGeneratorService instance
 */
export function createKitchenGeneratorService(
  repository: KitchenGeneratorRepository
): KitchenGeneratorService {
  return new KitchenGeneratorService(repository);
}

export default KitchenGeneratorService;
