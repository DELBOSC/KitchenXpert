/**
 * Kitchen Generator Service v3.0
 * Advanced AI-powered kitchen configuration generator
 *
 * Features:
 * - Genetic algorithm optimization
 * - Advanced bin-packing for cabinet placement
 * - Real work triangle calculation
 * - Corner cabinet handling
 * - Ergonomic scoring based on industry standards
 * - Utility constraint management
 */

import type {
  GenerationRequest,
  GenerationResponse,
  KitchenConfiguration,
  RoomConfiguration,
  UserPreferences,
  GenerationConstraints,
  CatalogProduct,
  PlacedItem,
  Position3D,
  WallSegment,
  WallObstacle,
  PricingSummary,
  ConfigurationScore,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  KitchenShape,
  UtilityConnection,
  CabinetType,
} from '../types';

import { providerRegistry } from '../providers';

// ============================================
// Constants & Standards
// ============================================

const DEFAULT_CONSTRAINTS: GenerationConstraints = {
  minPassageWidth: 90,
  maxWorkTrianglePerimeter: 660,
  minCooktopSinkDistance: 60,
  maxCooktopSinkDistance: 180,
  requireVentilation: true,
};

/** IKEA METOD standard dimensions (cm) */
const METOD_STANDARDS = {
  baseHeight: 80,
  wallHeights: [40, 60, 80, 100] as const,
  tallHeights: [200, 220, 240] as const,
  standardWidths: [20, 30, 40, 60, 80] as const,
  baseDepth: 60,
  wallDepth: 37,
  worktopHeight: 88,
  worktopThickness: 3.8,
  worktopOverhang: 2.5,
  plinthHeight: 8,
  wallCabinetBottomHeight: 140,
  wallCabinetTopHeight: 220,
  cornerBaseMinWidth: 88,
  cornerWallMinWidth: 68,
  fillerMinWidth: 1,
  fillerMaxWidth: 10,
};

/** Ergonomic standards based on industry guidelines */
const ERGONOMIC_STANDARDS = {
  // Work triangle (cm)
  workTriangle: {
    minPerimeter: 360,
    maxPerimeter: 660,
    idealPerimeter: 510,
    minLegLength: 120,
    maxLegLength: 270,
  },
  // Counter heights for different users
  counterHeights: {
    standard: 88,
    tall: 94,
    wheelchair: 75,
  },
  // Clearances (cm)
  clearances: {
    minPassage: 90,
    comfortablePassage: 120,
    twoPersonPassage: 150,
    applianceFront: 90,
    dishwasherFront: 100,
    ovenFront: 100,
  },
  // Zone recommendations
  zones: {
    prepMinWidth: 60,
    prepIdealWidth: 90,
    cookingMinWidth: 60,
    sinkMinWidth: 60,
  },
  // Distances
  distances: {
    cooktopToSinkMin: 40,
    cooktopToSinkMax: 120,
    cooktopToWall: 30,
    sinkToCorner: 30,
    hoodHeight: 65, // Above cooktop
  },
};

/** Genetic algorithm parameters */
const GA_PARAMS = {
  populationSize: 20,
  generations: 50,
  mutationRate: 0.15,
  crossoverRate: 0.7,
  eliteCount: 2,
  tournamentSize: 3,
};

// ============================================
// Types
// ============================================

interface LayoutPlan {
  id: string;
  shape: KitchenShape;
  variant: LayoutVariant;
  zones: KitchenZones;
  wallAssignments: WallAssignment[];
  workTriangle: WorkTriangle;
  cornerPositions: CornerPosition[];
}

type LayoutVariant =
  | 'standard'
  | 'maximized_storage'
  | 'budget_optimized'
  | 'ergonomic_focus'
  | 'professional';

interface WallAssignment {
  wall: WallSegment;
  role: 'cooking' | 'washing' | 'storage' | 'preparation' | 'tall_units';
  startOffset: number;
  endOffset: number;
  priority: number;
}

interface KitchenZones {
  cooking: ZoneDefinition;
  washing: ZoneDefinition;
  storage: ZoneDefinition;
  preparation: ZoneDefinition;
}

interface ZoneDefinition {
  wallId: string;
  start: number;
  end: number;
  priority: number;
  minWidth: number;
  idealWidth: number;
}

interface WorkTriangle {
  sink: Position3D;
  cooktop: Position3D;
  fridge: Position3D;
  perimeter: number;
  legs: {
    sinkToCooktop: number;
    cooktopToFridge: number;
    fridgeToSink: number;
  };
  isOptimal: boolean;
  score: number;
}

interface CornerPosition {
  walls: [string, string];
  position: Position3D;
  type: 'inner' | 'outer';
  angle: number;
}

interface PlacementSlot {
  wall: WallSegment;
  start: number;
  end: number;
  width: number;
  utilities: UtilityConnection[];
  obstacles: WallObstacle[];
  zone: keyof KitchenZones | null;
  isCorner: boolean;
  adjacentWall?: string;
}

interface CabinetRun {
  wall: string;
  items: PlacedItem[];
  startPosition: number;
  endPosition: number;
  hasCornerStart: boolean;
  hasCornerEnd: boolean;
}

interface GeneticIndividual {
  genes: PlacementGene[];
  fitness: number;
  configuration?: KitchenConfiguration;
}

interface PlacementGene {
  productId: string;
  slotIndex: number;
  position: number;
  rotation: number;
}

// ============================================
// Kitchen Generator Service
// ============================================

export class KitchenGeneratorService {
  private constraints: GenerationConstraints;

  constructor(constraints?: Partial<GenerationConstraints>) {
    this.constraints = { ...DEFAULT_CONSTRAINTS, ...constraints };
  }

  /**
   * Generate kitchen configurations using advanced algorithms
   */
  async generate(request: GenerationRequest): Promise<GenerationResponse> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      // 1. Analyze room geometry and determine possible shapes
      const analysis = this.analyzeRoomGeometry(request.room);
      const possibleShapes = analysis.recommendedShapes;
      const primaryShape = request.room.preferredShape || possibleShapes[0] || 'L';

      // 2. Fetch products from providers
      const products = await this.fetchProducts(request.preferences, request.providers);
      if (products.length === 0) {
        return this.createErrorResponse(startTime, 'No products available from providers');
      }

      // 3. Categorize and score products
      const categorizedProducts = this.categorizeProducts(products, request.preferences);

      // 4. Generate layouts with different strategies
      const numConfigs = Math.min(request.numConfigurations || 3, 5);
      const layouts = this.generateLayouts(request.room, primaryShape, numConfigs, analysis);

      // 5. Use genetic algorithm to optimize each layout
      const configurations: KitchenConfiguration[] = [];

      for (const layout of layouts) {
        try {
          const optimized = await this.optimizeLayoutWithGA(
            layout,
            request.room,
            request.preferences,
            categorizedProducts
          );
          if (optimized) {
            configurations.push(optimized);
          }
        } catch (error) {
          errors.push(`Layout optimization failed: ${error}`);
        }
      }

      // 6. Final ranking and selection
      const rankedConfigs = this.rankConfigurations(configurations, request.preferences);

      return {
        success: rankedConfigs.length > 0,
        configurations: rankedConfigs,
        recommended: rankedConfigs[0] || null,
        stats: {
          totalGenerated: configurations.length,
          validConfigurations: rankedConfigs.length,
          generationTimeMs: Date.now() - startTime,
          providersQueried: request.providers || [],
          productsConsidered: products.length,
        },
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      return this.createErrorResponse(
        startTime,
        error instanceof Error ? error.message : 'Generation failed'
      );
    }
  }

  // ============================================
  // Room Geometry Analysis
  // ============================================

  private analyzeRoomGeometry(room: RoomConfiguration): {
    recommendedShapes: KitchenShape[];
    corners: CornerPosition[];
    usableWallLengths: Map<string, number>;
    totalUsableLength: number;
    effectiveArea: number;
  } {
    const { width, length } = room.dimensions;
    const area = width * length;
    const ratio = Math.max(width, length) / Math.min(width, length);

    // Calculate usable wall lengths
    const usableWallLengths = new Map<string, number>();
    for (const wall of room.walls.filter((w) => w.available)) {
      usableWallLengths.set(wall.wall, this.calculateUsableWallLength(wall));
    }
    const totalUsableLength = Array.from(usableWallLengths.values()).reduce((a, b) => a + b, 0);

    // Identify corners
    const corners = this.identifyCorners(room);

    // Determine possible shapes
    const recommendedShapes = this.determineShapes(room, area, ratio, usableWallLengths, corners);

    return {
      recommendedShapes,
      corners,
      usableWallLengths,
      totalUsableLength,
      effectiveArea: area,
    };
  }

  private calculateUsableWallLength(wall: WallSegment): number {
    let usable = wall.endPosition - wall.startPosition;

    for (const obstacle of wall.obstacles) {
      const clearance = this.getObstacleClearance(obstacle.type);
      usable -= obstacle.width + clearance * 2;
    }

    return Math.max(0, usable);
  }

  private getObstacleClearance(type: WallObstacle['type']): number {
    const clearances: Record<string, number> = {
      door: 15,
      window: 5,
      column: 5,
      pipe: 10,
      electrical: 5,
      radiator: 15,
      other: 10,
    };
    return clearances[type] || 10;
  }

  private identifyCorners(room: RoomConfiguration): CornerPosition[] {
    const corners: CornerPosition[] = [];
    const walls = room.walls.filter((w) => w.available);
    const adjacencyMap: Record<string, string[]> = {
      north: ['east', 'west'],
      south: ['east', 'west'],
      east: ['north', 'south'],
      west: ['north', 'south'],
    };

    for (const wall of walls) {
      const adjacent = adjacencyMap[wall.wall] || [];
      for (const adjName of adjacent) {
        const adjWall = walls.find((w) => w.wall === adjName);
        if (adjWall) {
          const cornerPos = this.calculateCornerPosition(wall, adjWall, room.dimensions);
          corners.push({
            walls: [wall.wall, adjName],
            position: cornerPos,
            type: 'inner',
            angle: 90,
          });
        }
      }
    }

    // Remove duplicates
    return corners.filter(
      (c, i) =>
        corners.findIndex(
          (c2) =>
            (c2.walls[0] === c.walls[0] && c2.walls[1] === c.walls[1]) ||
            (c2.walls[0] === c.walls[1] && c2.walls[1] === c.walls[0])
        ) === i
    );
  }

  private calculateCornerPosition(
    wall1: WallSegment,
    wall2: WallSegment,
    dimensions: { width: number; length: number }
  ): Position3D {
    const corners: Record<string, Position3D> = {
      'north-east': { x: dimensions.width, y: 0, z: 0 },
      'north-west': { x: 0, y: 0, z: 0 },
      'south-east': { x: dimensions.width, y: 0, z: dimensions.length },
      'south-west': { x: 0, y: 0, z: dimensions.length },
      'east-north': { x: dimensions.width, y: 0, z: 0 },
      'east-south': { x: dimensions.width, y: 0, z: dimensions.length },
      'west-north': { x: 0, y: 0, z: 0 },
      'west-south': { x: 0, y: 0, z: dimensions.length },
    };

    return corners[`${wall1.wall}-${wall2.wall}`] || { x: 0, y: 0, z: 0 };
  }

  private determineShapes(
    room: RoomConfiguration,
    area: number,
    ratio: number,
    usableWallLengths: Map<string, number>,
    corners: CornerPosition[]
  ): KitchenShape[] {
    const minDimension = Math.min(room.dimensions.width, room.dimensions.length);
    const availableWalls = room.walls.filter((w) => w.available);
    const wallCount = availableWalls.length;
    const longestWall = Math.max(...Array.from(usableWallLengths.values()));

    const shapes: { shape: KitchenShape; score: number }[] = [];

    // I-shape
    if (longestWall >= 200) {
      let score = 50;
      if (ratio > 2) score += 30;
      if (area < 60000) score += 20;
      shapes.push({ shape: 'I', score });
    }

    // L-shape
    if (wallCount >= 2 && corners.length >= 1 && minDimension >= 180) {
      let score = 60;
      if (area >= 60000 && area <= 120000) score += 25;
      if (ratio >= 1.2 && ratio <= 1.8) score += 15;
      shapes.push({ shape: 'L', score });
    }

    // U-shape
    if (wallCount >= 3 && minDimension >= 240) {
      const passageWidth = minDimension - METOD_STANDARDS.baseDepth * 2;
      if (passageWidth >= this.constraints.minPassageWidth) {
        let score = 55;
        if (area >= 80000 && area <= 150000) score += 30;
        if (passageWidth >= ERGONOMIC_STANDARDS.clearances.comfortablePassage) score += 15;
        shapes.push({ shape: 'U', score });
      }
    }

    // G-shape
    if (wallCount >= 3 && minDimension >= 300 && area >= 100000) {
      let score = 45;
      if (area >= 120000) score += 25;
      shapes.push({ shape: 'G', score });
    }

    // Parallel (Galley)
    if (this.hasOppositeWalls(availableWalls) && ratio >= 1.5) {
      const passageWidth = minDimension - METOD_STANDARDS.baseDepth * 2;
      if (passageWidth >= this.constraints.minPassageWidth) {
        let score = 50;
        if (ratio >= 2) score += 25;
        if (passageWidth >= ERGONOMIC_STANDARDS.clearances.twoPersonPassage) score += 20;
        shapes.push({ shape: 'parallel', score });
      }
    }

    // Island
    if (area >= 160000 && minDimension >= 400) {
      let score = 40;
      if (area >= 200000) score += 35;
      shapes.push({ shape: 'island', score });
    }

    // Peninsula
    if (area >= 120000 && minDimension >= 300) {
      let score = 45;
      if (area >= 140000 && area <= 200000) score += 25;
      shapes.push({ shape: 'peninsula', score });
    }

    return shapes.sort((a, b) => b.score - a.score).map((s) => s.shape);
  }

  private hasOppositeWalls(walls: WallSegment[]): boolean {
    const wallNames = new Set(walls.map((w) => w.wall));
    return (
      (wallNames.has('north') && wallNames.has('south')) ||
      (wallNames.has('east') && wallNames.has('west'))
    );
  }

  // ============================================
  // Product Management
  // ============================================

  private async fetchProducts(
    preferences: UserPreferences,
    providerIds?: string[]
  ): Promise<CatalogProduct[]> {
    const providers = providerIds
      ? providerIds.map((id) => providerRegistry.get(id)).filter(Boolean)
      : providerRegistry.getAll();

    const allProducts: CatalogProduct[] = [];

    for (const provider of providers) {
      if (!provider) continue;

      try {
        const categories = [
          'cabinets',
          'worktops',
          'fronts',
          'appliances',
          'sinks',
          'fittings',
          'handles',
        ];

        for (const category of categories) {
          const products = await provider.getProducts(category, {
            minPrice: 0,
            maxPrice: preferences.budget.max,
            limit: 100,
            inStockOnly: true,
          });
          allProducts.push(...products);
        }
      } catch (error) {
        console.error(`Failed to fetch from provider ${provider.id}:`, error);
      }
    }

    return allProducts;
  }

  private categorizeProducts(
    products: CatalogProduct[],
    preferences: UserPreferences
  ): Map<string, CatalogProduct[]> {
    const categories = new Map<string, CatalogProduct[]>();

    const categoryMapping: Record<string, string[]> = {
      base_cabinets: ['base', 'drawer'],
      wall_cabinets: ['wall'],
      tall_cabinets: ['tall', 'pantry', 'fridge_housing', 'oven_housing'],
      corner_base: ['corner_base'],
      corner_wall: ['corner_wall'],
      sink_base: ['sink_base'],
      worktops: ['worktop'],
      appliances: ['cooktop', 'oven', 'microwave', 'dishwasher', 'fridge', 'freezer', 'range_hood'],
      sinks: ['sink', 'faucet'],
      fillers: ['filler', 'panel'],
    };

    for (const [category, types] of Object.entries(categoryMapping)) {
      const categoryProducts = products
        .filter((p) => types.includes(p.type) || types.includes(p.category))
        .sort((a, b) => this.scoreProduct(b, preferences) - this.scoreProduct(a, preferences));
      categories.set(category, categoryProducts);
    }

    return categories;
  }

  private scoreProduct(product: CatalogProduct, preferences: UserPreferences): number {
    let score = 50;

    // Budget fit
    const budgetMid = (preferences.budget.min + preferences.budget.max) / 2;
    const budgetDiff = Math.abs(product.price - budgetMid);
    const budgetRange = preferences.budget.max - preferences.budget.min || 1;
    score += Math.max(0, 25 - (budgetDiff / budgetRange) * 25);

    // In stock bonus
    if (product.inStock) score += 15;

    // Preferred provider
    if (preferences.preferredProviders?.includes(product.providerId)) score += 20;

    // Standard dimensions
    if (
      METOD_STANDARDS.standardWidths.includes(product.dimensions.width as 20 | 30 | 40 | 60 | 80)
    ) {
      score += 10;
    }

    return score;
  }

  // ============================================
  // Layout Generation
  // ============================================

  private generateLayouts(
    room: RoomConfiguration,
    primaryShape: KitchenShape,
    count: number,
    analysis: ReturnType<typeof this.analyzeRoomGeometry>
  ): LayoutPlan[] {
    const layouts: LayoutPlan[] = [];
    const variants: LayoutVariant[] = [
      'standard',
      'maximized_storage',
      'budget_optimized',
      'ergonomic_focus',
      'professional',
    ];

    for (let i = 0; i < count && i < variants.length; i++) {
      const variant = variants[i]!;
      const layout = this.createLayout(room, primaryShape, variant, analysis);
      if (layout) {
        layouts.push(layout);
      }
    }

    return layouts;
  }

  private createLayout(
    room: RoomConfiguration,
    shape: KitchenShape,
    variant: LayoutVariant,
    analysis: ReturnType<typeof this.analyzeRoomGeometry>
  ): LayoutPlan | null {
    const wallAssignments = this.assignWalls(room, shape, analysis);
    if (wallAssignments.length === 0) return null;

    const zones = this.defineZones(shape, variant, wallAssignments);
    const workTriangle = this.planWorkTriangle(room, zones, wallAssignments);

    return {
      id: `${shape}-${variant}-${Date.now()}`,
      shape,
      variant,
      zones,
      wallAssignments,
      workTriangle,
      cornerPositions: analysis.corners,
    };
  }

  private assignWalls(
    room: RoomConfiguration,
    shape: KitchenShape,
    analysis: ReturnType<typeof this.analyzeRoomGeometry>
  ): WallAssignment[] {
    const availableWalls = room.walls.filter((w) => w.available);
    const assignments: WallAssignment[] = [];

    // Score walls
    const scoredWalls = availableWalls
      .map((wall) => ({
        wall,
        score: this.scoreWall(wall, room.utilities),
        usableLength: analysis.usableWallLengths.get(wall.wall) || 0,
      }))
      .sort((a, b) => b.score - a.score);

    switch (shape) {
      case 'I':
        if (scoredWalls[0]) {
          assignments.push({
            wall: scoredWalls[0].wall,
            role: 'cooking',
            startOffset: 0,
            endOffset: scoredWalls[0].usableLength,
            priority: 1,
          });
        }
        break;

      case 'L':
        this.assignLShape(scoredWalls, room.utilities, assignments);
        break;

      case 'U':
        this.assignUShape(scoredWalls, room.utilities, assignments);
        break;

      case 'parallel':
        this.assignParallelShape(scoredWalls, assignments);
        break;

      default:
        // Generic assignment
        scoredWalls.slice(0, 3).forEach((sw, i) => {
          const roles: WallAssignment['role'][] = ['washing', 'cooking', 'storage'];
          assignments.push({
            wall: sw.wall,
            role: roles[i] || 'storage',
            startOffset: 0,
            endOffset: sw.usableLength,
            priority: i + 1,
          });
        });
    }

    return assignments;
  }

  private assignLShape(
    scoredWalls: Array<{ wall: WallSegment; score: number; usableLength: number }>,
    utilities: UtilityConnection[],
    assignments: WallAssignment[]
  ): void {
    if (scoredWalls.length < 2) return;

    // Find wall with water for sink
    const waterWall =
      scoredWalls.find((sw) =>
        utilities.some(
          (u) => (u.type === 'water_inlet' || u.type === 'water_outlet') && u.wall === sw.wall.wall
        )
      ) || scoredWalls[0];

    // Find adjacent wall for cooking
    const adjacent = this.findAdjacentWall(
      waterWall!.wall,
      scoredWalls.map((s) => s.wall)
    );

    if (waterWall) {
      assignments.push({
        wall: waterWall.wall,
        role: 'washing',
        startOffset: 0,
        endOffset: waterWall.usableLength,
        priority: 1,
      });
    }

    if (adjacent) {
      const adjScored = scoredWalls.find((sw) => sw.wall.wall === adjacent.wall);
      assignments.push({
        wall: adjacent,
        role: 'cooking',
        startOffset: 0,
        endOffset: adjScored?.usableLength || 0,
        priority: 2,
      });
    }
  }

  private assignUShape(
    scoredWalls: Array<{ wall: WallSegment; score: number; usableLength: number }>,
    utilities: UtilityConnection[],
    assignments: WallAssignment[]
  ): void {
    if (scoredWalls.length < 3) return;

    // Water wall for sink (center of U ideally)
    const waterWall = scoredWalls.find((sw) =>
      utilities.some(
        (u) => (u.type === 'water_inlet' || u.type === 'water_outlet') && u.wall === sw.wall.wall
      )
    );

    if (waterWall) {
      assignments.push({
        wall: waterWall.wall,
        role: 'washing',
        startOffset: 0,
        endOffset: waterWall.usableLength,
        priority: 1,
      });

      const remaining = scoredWalls.filter((sw) => sw.wall !== waterWall.wall);
      if (remaining[0]) {
        assignments.push({
          wall: remaining[0].wall,
          role: 'cooking',
          startOffset: 0,
          endOffset: remaining[0].usableLength,
          priority: 2,
        });
      }
      if (remaining[1]) {
        assignments.push({
          wall: remaining[1].wall,
          role: 'storage',
          startOffset: 0,
          endOffset: remaining[1].usableLength,
          priority: 3,
        });
      }
    } else {
      // Default assignment
      const roles: WallAssignment['role'][] = ['cooking', 'washing', 'storage'];
      scoredWalls.slice(0, 3).forEach((sw, i) => {
        assignments.push({
          wall: sw.wall,
          role: roles[i]!,
          startOffset: 0,
          endOffset: sw.usableLength,
          priority: i + 1,
        });
      });
    }
  }

  private assignParallelShape(
    scoredWalls: Array<{ wall: WallSegment; score: number; usableLength: number }>,
    assignments: WallAssignment[]
  ): void {
    const opposites = this.findOppositeWallPair(scoredWalls.map((s) => s.wall));
    if (opposites) {
      const [wall1, wall2] = opposites;
      const sw1 = scoredWalls.find((s) => s.wall === wall1);
      const sw2 = scoredWalls.find((s) => s.wall === wall2);

      if (sw1) {
        assignments.push({
          wall: wall1,
          role: 'washing',
          startOffset: 0,
          endOffset: sw1.usableLength,
          priority: 1,
        });
      }
      if (sw2) {
        assignments.push({
          wall: wall2,
          role: 'cooking',
          startOffset: 0,
          endOffset: sw2.usableLength,
          priority: 2,
        });
      }
    }
  }

  private scoreWall(wall: WallSegment, utilities: UtilityConnection[]): number {
    let score = 0;
    const length = wall.endPosition - wall.startPosition;

    score += Math.min(length / 10, 30);

    // Water utilities (best for sink)
    const water = utilities.filter(
      (u) => u.wall === wall.wall && (u.type === 'water_inlet' || u.type === 'water_outlet')
    );
    score += water.length * 25;

    // Electrical
    const electrical = utilities.filter(
      (u) => u.wall === wall.wall && u.type.startsWith('electrical')
    );
    score += electrical.length * 10;

    // Gas (for cooktop)
    const gas = utilities.filter((u) => u.wall === wall.wall && u.type === 'gas');
    score += gas.length * 15;

    // Ventilation
    const ventilation = utilities.filter((u) => u.wall === wall.wall && u.type === 'ventilation');
    score += ventilation.length * 10;

    // Obstacle penalties
    for (const obstacle of wall.obstacles) {
      switch (obstacle.type) {
        case 'door':
          score -= 30;
          break;
        case 'window':
          // Windows above counter height are fine
          if (obstacle.heightFromFloor < METOD_STANDARDS.wallCabinetBottomHeight) {
            score -= 5;
          }
          break;
        default:
          score -= 10;
      }
    }

    return score;
  }

  private findAdjacentWall(reference: WallSegment, candidates: WallSegment[]): WallSegment | null {
    const adjacency: Record<string, string[]> = {
      north: ['east', 'west'],
      south: ['east', 'west'],
      east: ['north', 'south'],
      west: ['north', 'south'],
    };

    const adjacent = adjacency[reference.wall] || [];
    return candidates.find((c) => adjacent.includes(c.wall)) || null;
  }

  private findOppositeWallPair(walls: WallSegment[]): [WallSegment, WallSegment] | null {
    const opposites: Record<string, string> = {
      north: 'south',
      south: 'north',
      east: 'west',
      west: 'east',
    };

    for (const wall of walls) {
      const opposite = walls.find((w) => w.wall === opposites[wall.wall]);
      if (opposite) {
        return [wall, opposite];
      }
    }
    return null;
  }

  private defineZones(
    shape: KitchenShape,
    variant: LayoutVariant,
    wallAssignments: WallAssignment[]
  ): KitchenZones {
    const variantMultipliers = {
      standard: { cooking: 1, washing: 1, storage: 1, preparation: 1 },
      maximized_storage: { cooking: 0.85, washing: 0.9, storage: 1.4, preparation: 0.85 },
      budget_optimized: { cooking: 1, washing: 1, storage: 0.75, preparation: 1.25 },
      ergonomic_focus: { cooking: 1.15, washing: 1.1, storage: 0.85, preparation: 1.1 },
      professional: { cooking: 1.3, washing: 1, storage: 0.9, preparation: 1.2 },
    };

    const mult = variantMultipliers[variant];

    // Find assignments by role
    const cookingWall = wallAssignments.find((a) => a.role === 'cooking');
    const washingWall = wallAssignments.find((a) => a.role === 'washing');
    const storageWall = wallAssignments.find((a) => a.role === 'storage') || wallAssignments[0];

    return {
      cooking: {
        wallId: cookingWall?.wall.wall || washingWall?.wall.wall || '',
        start: 0,
        end: (cookingWall?.endOffset || 100) * 0.5,
        priority: 0.9 * mult.cooking,
        minWidth: ERGONOMIC_STANDARDS.zones.cookingMinWidth,
        idealWidth: 90,
      },
      washing: {
        wallId: washingWall?.wall.wall || '',
        start: 0,
        end: (washingWall?.endOffset || 100) * 0.4,
        priority: 0.95 * mult.washing,
        minWidth: ERGONOMIC_STANDARDS.zones.sinkMinWidth,
        idealWidth: 80,
      },
      storage: {
        wallId: storageWall?.wall.wall || '',
        start: 0,
        end: storageWall?.endOffset || 100,
        priority: 0.7 * mult.storage,
        minWidth: 40,
        idealWidth: 60,
      },
      preparation: {
        wallId: cookingWall?.wall.wall || washingWall?.wall.wall || '',
        start: (cookingWall?.endOffset || 100) * 0.5,
        end: cookingWall?.endOffset || 100,
        priority: 0.8 * mult.preparation,
        minWidth: ERGONOMIC_STANDARDS.zones.prepMinWidth,
        idealWidth: ERGONOMIC_STANDARDS.zones.prepIdealWidth,
      },
    };
  }

  private planWorkTriangle(
    room: RoomConfiguration,
    zones: KitchenZones,
    wallAssignments: WallAssignment[]
  ): WorkTriangle {
    // Calculate ideal positions
    const sinkPos = this.calculateZonePosition(zones.washing, wallAssignments, room);
    const cooktopPos = this.calculateZonePosition(zones.cooking, wallAssignments, room);
    const fridgePos = this.calculateStoragePosition(zones.storage, wallAssignments, room);

    // Calculate distances
    const sinkToCooktop = this.distance3D(sinkPos, cooktopPos);
    const cooktopToFridge = this.distance3D(cooktopPos, fridgePos);
    const fridgeToSink = this.distance3D(fridgePos, sinkPos);
    const perimeter = sinkToCooktop + cooktopToFridge + fridgeToSink;

    // Score the triangle
    const { minPerimeter, maxPerimeter, idealPerimeter, minLegLength, maxLegLength } =
      ERGONOMIC_STANDARDS.workTriangle;

    let score = 50;

    // Perimeter scoring
    if (perimeter >= minPerimeter && perimeter <= maxPerimeter) {
      const perimeterDiff = Math.abs(perimeter - idealPerimeter);
      score += Math.max(0, 30 - perimeterDiff / 50);
    } else {
      score -= 20;
    }

    // Leg length scoring
    const legs = [sinkToCooktop, cooktopToFridge, fridgeToSink];
    for (const leg of legs) {
      if (leg >= minLegLength && leg <= maxLegLength) {
        score += 5;
      } else {
        score -= 5;
      }
    }

    const isOptimal =
      perimeter >= minPerimeter &&
      perimeter <= maxPerimeter &&
      legs.every((l) => l >= minLegLength && l <= maxLegLength);

    return {
      sink: sinkPos,
      cooktop: cooktopPos,
      fridge: fridgePos,
      perimeter,
      legs: { sinkToCooktop, cooktopToFridge, fridgeToSink },
      isOptimal,
      score: Math.max(0, Math.min(100, score)),
    };
  }

  private calculateZonePosition(
    zone: ZoneDefinition,
    wallAssignments: WallAssignment[],
    room: RoomConfiguration
  ): Position3D {
    const assignment = wallAssignments.find((a) => a.wall.wall === zone.wallId);
    if (!assignment) {
      return { x: (zone.start + zone.end) / 2, y: 0, z: 0 };
    }

    const center = (zone.start + zone.end) / 2;
    return this.wallPositionTo3D(assignment.wall.wall, center, room.dimensions);
  }

  private calculateStoragePosition(
    zone: ZoneDefinition,
    wallAssignments: WallAssignment[],
    room: RoomConfiguration
  ): Position3D {
    const assignment = wallAssignments.find((a) => a.wall.wall === zone.wallId);
    if (!assignment) {
      return { x: zone.end - 30, y: 0, z: 0 };
    }

    // Fridge typically at end of run
    const position = zone.end - 30;
    return this.wallPositionTo3D(assignment.wall.wall, position, room.dimensions);
  }

  private wallPositionTo3D(
    wall: string,
    position: number,
    dimensions: { width: number; length: number }
  ): Position3D {
    switch (wall) {
      case 'north':
        return { x: position, y: 0, z: 0 };
      case 'south':
        return { x: position, y: 0, z: dimensions.length };
      case 'east':
        return { x: dimensions.width, y: 0, z: position };
      case 'west':
        return { x: 0, y: 0, z: position };
      default:
        return { x: position, y: 0, z: 0 };
    }
  }

  private distance3D(a: Position3D, b: Position3D): number {
    return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2) + Math.pow(b.z - a.z, 2));
  }

  // ============================================
  // Genetic Algorithm Optimization
  // ============================================

  private async optimizeLayoutWithGA(
    layout: LayoutPlan,
    room: RoomConfiguration,
    preferences: UserPreferences,
    products: Map<string, CatalogProduct[]>
  ): Promise<KitchenConfiguration | null> {
    // Calculate placement slots
    const slots = this.calculatePlacementSlots(layout, room);

    // Initialize population
    let population = this.initializePopulation(slots, products, preferences);

    // Evolve population
    for (let gen = 0; gen < GA_PARAMS.generations; gen++) {
      // Evaluate fitness
      population = await this.evaluatePopulation(population, layout, room, preferences, products);

      // Check for convergence
      const bestFitness = Math.max(...population.map((i) => i.fitness));
      if (bestFitness >= 95) break;

      // Selection, crossover, mutation
      population = this.evolvePopulation(population, slots, products);
    }

    // Get best individual
    const best = population.sort((a, b) => b.fitness - a.fitness)[0];
    if (!best || !best.configuration) return null;

    return best.configuration;
  }

  private calculatePlacementSlots(layout: LayoutPlan, room: RoomConfiguration): PlacementSlot[] {
    const slots: PlacementSlot[] = [];

    for (const assignment of layout.wallAssignments) {
      const wall = assignment.wall;
      let currentPos = wall.startPosition;

      // Sort obstacles by position
      const sortedObstacles = [...wall.obstacles].sort((a, b) => a.position - b.position);

      for (const obstacle of sortedObstacles) {
        if (obstacle.position > currentPos) {
          // Check if this is a corner position
          const isCorner = layout.cornerPositions.some(
            (c) =>
              c.walls.includes(wall.wall) &&
              (currentPos === wall.startPosition || obstacle.position === wall.endPosition)
          );

          const utilities = room.utilities.filter(
            (u) =>
              u.wall === wall.wall && u.position >= currentPos && u.position < obstacle.position
          );

          slots.push({
            wall,
            start: currentPos,
            end: obstacle.position - this.getObstacleClearance(obstacle.type),
            width: obstacle.position - this.getObstacleClearance(obstacle.type) - currentPos,
            utilities,
            obstacles: [],
            zone: this.getZoneForPosition(layout.zones, wall.wall, currentPos),
            isCorner,
            adjacentWall: isCorner ? this.getAdjacentWallName(wall.wall, layout) : undefined,
          });
        }
        currentPos = obstacle.position + obstacle.width + this.getObstacleClearance(obstacle.type);
      }

      // Final slot
      if (currentPos < wall.endPosition) {
        const isCorner = layout.cornerPositions.some(
          (c) => c.walls.includes(wall.wall) && currentPos === wall.startPosition
        );

        const utilities = room.utilities.filter(
          (u) => u.wall === wall.wall && u.position >= currentPos && u.position < wall.endPosition
        );

        slots.push({
          wall,
          start: currentPos,
          end: wall.endPosition,
          width: wall.endPosition - currentPos,
          utilities,
          obstacles: [],
          zone: this.getZoneForPosition(layout.zones, wall.wall, currentPos),
          isCorner,
          adjacentWall: isCorner ? this.getAdjacentWallName(wall.wall, layout) : undefined,
        });
      }
    }

    return slots.filter((s) => s.width >= 20);
  }

  private getZoneForPosition(
    zones: KitchenZones,
    wall: string,
    position: number
  ): keyof KitchenZones | null {
    for (const [zoneName, zone] of Object.entries(zones)) {
      if (zone.wallId === wall && position >= zone.start && position <= zone.end) {
        return zoneName as keyof KitchenZones;
      }
    }
    return null;
  }

  private getAdjacentWallName(wall: string, layout: LayoutPlan): string | undefined {
    const corner = layout.cornerPositions.find((c) => c.walls.includes(wall));
    return corner?.walls.find((w) => w !== wall);
  }

  private initializePopulation(
    slots: PlacementSlot[],
    products: Map<string, CatalogProduct[]>,
    preferences: UserPreferences
  ): GeneticIndividual[] {
    const population: GeneticIndividual[] = [];

    for (let i = 0; i < GA_PARAMS.populationSize; i++) {
      const genes = this.generateRandomGenes(slots, products, preferences);
      population.push({ genes, fitness: 0 });
    }

    return population;
  }

  private generateRandomGenes(
    slots: PlacementSlot[],
    products: Map<string, CatalogProduct[]>,
    preferences: UserPreferences
  ): PlacementGene[] {
    const genes: PlacementGene[] = [];
    const usedPositions = new Map<number, number>(); // slotIndex -> endPosition

    for (let slotIndex = 0; slotIndex < slots.length; slotIndex++) {
      const slot = slots[slotIndex]!;
      let currentPos = slot.start;

      // Determine what to place based on zone and utilities
      let productCategory = 'base_cabinets';
      if (slot.utilities.some((u) => u.type === 'water_inlet' || u.type === 'water_outlet')) {
        productCategory = 'sink_base';
      } else if (slot.isCorner) {
        productCategory = 'corner_base';
      }

      const availableProducts =
        products.get(productCategory) || products.get('base_cabinets') || [];

      while (currentPos < slot.end - 15) {
        const remainingWidth = slot.end - currentPos;

        // Select random product that fits
        const fittingProducts = availableProducts.filter(
          (p) => p.dimensions.width <= remainingWidth
        );
        if (fittingProducts.length === 0) break;

        const product = fittingProducts[Math.floor(Math.random() * fittingProducts.length)]!;

        genes.push({
          productId: product.id,
          slotIndex,
          position: currentPos,
          rotation: this.getWallRotation(slot.wall.wall),
        });

        currentPos += product.dimensions.width;
        usedPositions.set(slotIndex, currentPos);
      }
    }

    return genes;
  }

  private async evaluatePopulation(
    population: GeneticIndividual[],
    layout: LayoutPlan,
    room: RoomConfiguration,
    preferences: UserPreferences,
    products: Map<string, CatalogProduct[]>
  ): Promise<GeneticIndividual[]> {
    const allProducts = Array.from(products.values()).flat();

    for (const individual of population) {
      // Build configuration from genes
      const items = this.genesToPlacedItems(individual.genes, allProducts, layout);

      // Add wall cabinets
      const wallCabinets = this.generateWallCabinets(items, products, room);
      items.push(...wallCabinets);

      // Add worktops
      const worktops = this.generateWorktops(items, products);
      items.push(...worktops);

      // Validate
      const validation = this.validateConfiguration(items, room, layout);

      // Calculate pricing
      const pricing = this.calculatePricing(items);

      // Score
      const score = this.calculateScore(items, room, preferences, pricing, layout);

      // Calculate fitness
      individual.fitness = this.calculateFitness(score, validation, preferences, pricing);

      // Store configuration
      individual.configuration = {
        id: crypto.randomUUID(),
        name: this.generateConfigName(layout),
        shape: layout.shape,
        style: preferences.style,
        room,
        items,
        cabinets: items.filter((i) => this.isCabinet(i.product.type)),
        appliances: items.filter((i) => i.product.category === 'appliances'),
        worktops: items.filter((i) => i.product.type === 'worktop'),
        pricing,
        score,
        validation,
        metadata: {
          generatedAt: new Date().toISOString(),
          generatorVersion: '3.0.0',
          providersUsed: [...new Set(items.map((i) => i.product.providerId))],
          generationTimeMs: 0,
        },
      };
    }

    return population;
  }

  private genesToPlacedItems(
    genes: PlacementGene[],
    products: CatalogProduct[],
    layout: LayoutPlan
  ): PlacedItem[] {
    const items: PlacedItem[] = [];
    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const gene of genes) {
      const product = productMap.get(gene.productId);
      if (!product) continue;

      const wall = layout.wallAssignments[gene.slotIndex]?.wall.wall;

      items.push({
        id: `item-${Date.now()}-${items.length}`,
        product,
        position: { x: gene.position, y: 0, z: 0 },
        rotation: gene.rotation,
        wall,
      });
    }

    return items;
  }

  private generateWallCabinets(
    baseCabinets: PlacedItem[],
    products: Map<string, CatalogProduct[]>,
    room: RoomConfiguration
  ): PlacedItem[] {
    const wallCabinets = products.get('wall_cabinets') || [];
    const placed: PlacedItem[] = [];

    if (wallCabinets.length === 0) return placed;

    // Group base cabinets by wall
    const byWall = new Map<string, PlacedItem[]>();
    for (const cabinet of baseCabinets) {
      const wall = cabinet.wall || 'unknown';
      if (!byWall.has(wall)) byWall.set(wall, []);
      byWall.get(wall)!.push(cabinet);
    }

    for (const [wall, cabinets] of byWall) {
      const wallSegment = room.walls.find((w) => w.wall === wall);
      const windows = wallSegment?.obstacles.filter((o) => o.type === 'window') || [];

      for (const baseCabinet of cabinets) {
        // Check if blocked by window
        const blocked = windows.some(
          (w) =>
            baseCabinet.position.x + baseCabinet.product.dimensions.width > w.position &&
            baseCabinet.position.x < w.position + w.width &&
            w.heightFromFloor < METOD_STANDARDS.wallCabinetTopHeight
        );

        if (blocked) continue;

        // Find matching wall cabinet
        const matching = wallCabinets.find(
          (wc) => Math.abs(wc.dimensions.width - baseCabinet.product.dimensions.width) <= 5
        );

        if (matching) {
          placed.push({
            id: `wall-${Date.now()}-${placed.length}`,
            product: matching,
            position: {
              x: baseCabinet.position.x,
              y: METOD_STANDARDS.wallCabinetBottomHeight,
              z: baseCabinet.position.z,
            },
            rotation: baseCabinet.rotation,
            wall: baseCabinet.wall,
            linkedItems: [baseCabinet.id],
          });
        }
      }
    }

    return placed;
  }

  private generateWorktops(
    baseCabinets: PlacedItem[],
    products: Map<string, CatalogProduct[]>
  ): PlacedItem[] {
    const worktops = products.get('worktops') || [];
    const placed: PlacedItem[] = [];

    if (worktops.length === 0 || baseCabinets.length === 0) return placed;

    const worktopProduct = worktops[0]!;

    // Group by wall
    const byWall = new Map<string, PlacedItem[]>();
    for (const cabinet of baseCabinets.filter((c) => c.product.type !== 'tall')) {
      const wall = cabinet.wall || 'unknown';
      if (!byWall.has(wall)) byWall.set(wall, []);
      byWall.get(wall)!.push(cabinet);
    }

    for (const [wall, cabinets] of byWall) {
      const sorted = [...cabinets].sort((a, b) => a.position.x - b.position.x);

      // Find continuous runs
      const runs = this.findContinuousRuns(sorted);

      for (const run of runs) {
        if (run.width < 20) continue;

        placed.push({
          id: `worktop-${Date.now()}-${placed.length}`,
          product: {
            ...worktopProduct,
            id: `worktop-${placed.length}`,
            dimensions: {
              ...worktopProduct.dimensions,
              width: run.width + METOD_STANDARDS.worktopOverhang * 2,
            },
          },
          position: {
            x: run.start - METOD_STANDARDS.worktopOverhang,
            y: METOD_STANDARDS.worktopHeight,
            z: 0,
          },
          rotation: this.getWallRotation(wall),
          wall,
          linkedItems: run.items.map((i) => i.id),
        });
      }
    }

    return placed;
  }

  private findContinuousRuns(
    sortedCabinets: PlacedItem[]
  ): Array<{ start: number; width: number; items: PlacedItem[] }> {
    const runs: Array<{ start: number; width: number; items: PlacedItem[] }> = [];

    if (sortedCabinets.length === 0) return runs;

    let runStart = sortedCabinets[0]!.position.x;
    let runEnd = runStart + sortedCabinets[0]!.product.dimensions.width;
    let runItems = [sortedCabinets[0]!];

    for (let i = 1; i < sortedCabinets.length; i++) {
      const current = sortedCabinets[i]!;
      const currentStart = current.position.x;

      if (currentStart <= runEnd + 1) {
        // Continuous
        runEnd = currentStart + current.product.dimensions.width;
        runItems.push(current);
      } else {
        // Gap - save run and start new
        runs.push({ start: runStart, width: runEnd - runStart, items: runItems });
        runStart = currentStart;
        runEnd = currentStart + current.product.dimensions.width;
        runItems = [current];
      }
    }

    // Save last run
    runs.push({ start: runStart, width: runEnd - runStart, items: runItems });

    return runs;
  }

  private calculateFitness(
    score: ConfigurationScore,
    validation: ValidationResult,
    preferences: UserPreferences,
    pricing: PricingSummary
  ): number {
    let fitness = score.overall;

    // Penalty for validation errors
    fitness -= validation.errors.length * 15;
    fitness -= validation.warnings.length * 3;

    // Budget adherence
    if (pricing.total > preferences.budget.max) {
      const overBudget = (pricing.total - preferences.budget.max) / preferences.budget.max;
      fitness -= overBudget * 30;
    } else if (pricing.total < preferences.budget.min * 0.5) {
      // Too cheap might mean missing items
      fitness -= 10;
    }

    return Math.max(0, Math.min(100, fitness));
  }

  private evolvePopulation(
    population: GeneticIndividual[],
    slots: PlacementSlot[],
    products: Map<string, CatalogProduct[]>
  ): GeneticIndividual[] {
    const sorted = [...population].sort((a, b) => b.fitness - a.fitness);
    const newPopulation: GeneticIndividual[] = [];

    // Elitism - keep best individuals
    for (let i = 0; i < GA_PARAMS.eliteCount && i < sorted.length; i++) {
      newPopulation.push(sorted[i]!);
    }

    // Fill rest with offspring
    while (newPopulation.length < GA_PARAMS.populationSize) {
      // Tournament selection
      const parent1 = this.tournamentSelect(sorted);
      const parent2 = this.tournamentSelect(sorted);

      // Crossover
      let offspring: GeneticIndividual;
      if (Math.random() < GA_PARAMS.crossoverRate) {
        offspring = this.crossover(parent1, parent2);
      } else {
        offspring = { genes: [...parent1.genes], fitness: 0 };
      }

      // Mutation
      if (Math.random() < GA_PARAMS.mutationRate) {
        this.mutate(offspring, slots, products);
      }

      newPopulation.push(offspring);
    }

    return newPopulation;
  }

  private tournamentSelect(population: GeneticIndividual[]): GeneticIndividual {
    const tournament: GeneticIndividual[] = [];
    for (let i = 0; i < GA_PARAMS.tournamentSize; i++) {
      const idx = Math.floor(Math.random() * population.length);
      tournament.push(population[idx]!);
    }
    return tournament.sort((a, b) => b.fitness - a.fitness)[0]!;
  }

  private crossover(parent1: GeneticIndividual, parent2: GeneticIndividual): GeneticIndividual {
    const crossoverPoint = Math.floor(
      Math.random() * Math.min(parent1.genes.length, parent2.genes.length)
    );
    const genes = [
      ...parent1.genes.slice(0, crossoverPoint),
      ...parent2.genes.slice(crossoverPoint),
    ];
    return { genes, fitness: 0 };
  }

  private mutate(
    individual: GeneticIndividual,
    slots: PlacementSlot[],
    products: Map<string, CatalogProduct[]>
  ): void {
    if (individual.genes.length === 0) return;

    const mutationType = Math.random();

    if (mutationType < 0.33 && individual.genes.length > 0) {
      // Swap two genes
      const idx1 = Math.floor(Math.random() * individual.genes.length);
      const idx2 = Math.floor(Math.random() * individual.genes.length);
      [individual.genes[idx1], individual.genes[idx2]] = [
        individual.genes[idx2]!,
        individual.genes[idx1]!,
      ];
    } else if (mutationType < 0.66) {
      // Change product
      const idx = Math.floor(Math.random() * individual.genes.length);
      const gene = individual.genes[idx];
      if (gene) {
        const allProducts = Array.from(products.values()).flat();
        const alternatives = allProducts.filter((p) => p.type === 'base' || p.type === 'drawer');
        if (alternatives.length > 0) {
          gene.productId = alternatives[Math.floor(Math.random() * alternatives.length)]!.id;
        }
      }
    } else {
      // Adjust position
      const idx = Math.floor(Math.random() * individual.genes.length);
      const gene = individual.genes[idx];
      if (gene) {
        gene.position += (Math.random() - 0.5) * 20;
      }
    }
  }

  // ============================================
  // Validation
  // ============================================

  private validateConfiguration(
    items: PlacedItem[],
    room: RoomConfiguration,
    layout: LayoutPlan
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // 1. Check work triangle
    this.validateWorkTriangle(layout.workTriangle, warnings);

    // 2. Check passage widths
    this.validatePassageWidths(room, layout, errors);

    // 3. Check ventilation
    this.validateVentilation(items, warnings);

    // 4. Check overlapping items
    this.validateOverlaps(items, errors);

    // 5. Check utility proximity
    this.validateUtilityProximity(items, room, warnings);

    // 6. Check ergonomic standards
    this.validateErgonomics(items, warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private validateWorkTriangle(workTriangle: WorkTriangle, warnings: ValidationWarning[]): void {
    const { minPerimeter, maxPerimeter, minLegLength, maxLegLength } =
      ERGONOMIC_STANDARDS.workTriangle;

    if (workTriangle.perimeter > maxPerimeter) {
      warnings.push({
        code: 'WORK_TRIANGLE_LARGE',
        message: `Work triangle perimeter (${Math.round(workTriangle.perimeter)}cm) exceeds recommended ${maxPerimeter}cm`,
        severity: 'warning',
        suggestion: 'Reposition sink, cooktop, or fridge closer together',
      });
    }

    if (workTriangle.perimeter < minPerimeter) {
      warnings.push({
        code: 'WORK_TRIANGLE_SMALL',
        message: `Work triangle perimeter (${Math.round(workTriangle.perimeter)}cm) is below recommended ${minPerimeter}cm`,
        severity: 'warning',
        suggestion: 'Add more space between work zones',
      });
    }

    const { sinkToCooktop, cooktopToFridge, fridgeToSink } = workTriangle.legs;
    const legs = [
      { name: 'Sink to Cooktop', length: sinkToCooktop },
      { name: 'Cooktop to Fridge', length: cooktopToFridge },
      { name: 'Fridge to Sink', length: fridgeToSink },
    ];

    for (const leg of legs) {
      if (leg.length < minLegLength) {
        warnings.push({
          code: 'WORK_TRIANGLE_LEG_SHORT',
          message: `${leg.name} distance (${Math.round(leg.length)}cm) is below minimum ${minLegLength}cm`,
          severity: 'warning',
        });
      }
      if (leg.length > maxLegLength) {
        warnings.push({
          code: 'WORK_TRIANGLE_LEG_LONG',
          message: `${leg.name} distance (${Math.round(leg.length)}cm) exceeds maximum ${maxLegLength}cm`,
          severity: 'warning',
        });
      }
    }
  }

  private validatePassageWidths(
    room: RoomConfiguration,
    layout: LayoutPlan,
    errors: ValidationError[]
  ): void {
    const minDim = Math.min(room.dimensions.width, room.dimensions.length);

    if (layout.shape === 'U' || layout.shape === 'parallel') {
      const passageWidth = minDim - METOD_STANDARDS.baseDepth * 2;
      if (passageWidth < this.constraints.minPassageWidth) {
        errors.push({
          code: 'INSUFFICIENT_PASSAGE',
          message: `Passage width (${passageWidth}cm) is below minimum ${this.constraints.minPassageWidth}cm`,
          severity: 'error',
        });
      }
    }
  }

  private validateVentilation(items: PlacedItem[], warnings: ValidationWarning[]): void {
    const hasCooktop = items.some((i) => ['cooktop', 'hob', 'range'].includes(i.product.type));
    const hasHood = items.some((i) => ['range_hood', 'hood', 'extractor'].includes(i.product.type));

    if (hasCooktop && this.constraints.requireVentilation && !hasHood) {
      warnings.push({
        code: 'MISSING_VENTILATION',
        message: 'No range hood detected above cooktop',
        severity: 'warning',
        suggestion: 'Add a range hood for proper ventilation',
      });
    }
  }

  private validateOverlaps(items: PlacedItem[], errors: ValidationError[]): void {
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i]!;
        const b = items[j]!;

        if (a.wall === b.wall && a.position.y === b.position.y) {
          const aEnd = a.position.x + a.product.dimensions.width;
          const bEnd = b.position.x + b.product.dimensions.width;

          if (!(aEnd <= b.position.x || bEnd <= a.position.x)) {
            errors.push({
              code: 'ITEMS_OVERLAP',
              message: `${a.product.name} overlaps with ${b.product.name}`,
              severity: 'error',
              itemId: a.id,
            });
          }
        }
      }
    }
  }

  private validateUtilityProximity(
    items: PlacedItem[],
    room: RoomConfiguration,
    warnings: ValidationWarning[]
  ): void {
    const sinks = items.filter((i) => i.product.type === 'sink_base' || i.product.type === 'sink');
    const waterUtilities = room.utilities.filter(
      (u) => u.type === 'water_inlet' || u.type === 'water_outlet'
    );

    for (const sink of sinks) {
      const nearWater = waterUtilities.some(
        (u) => u.wall === sink.wall && Math.abs(u.position - sink.position.x) < 100
      );

      if (!nearWater && waterUtilities.length > 0) {
        warnings.push({
          code: 'SINK_FAR_FROM_WATER',
          message: 'Sink placement may require additional plumbing work',
          severity: 'warning',
          itemId: sink.id,
          suggestion: 'Move sink closer to existing water connections',
        });
      }
    }
  }

  private validateErgonomics(items: PlacedItem[], warnings: ValidationWarning[]): void {
    // Check cooktop distance from wall
    const cooktops = items.filter((i) => ['cooktop', 'hob'].includes(i.product.type));
    for (const cooktop of cooktops) {
      if (cooktop.position.x < ERGONOMIC_STANDARDS.distances.cooktopToWall) {
        warnings.push({
          code: 'COOKTOP_TOO_CLOSE_TO_WALL',
          message: `Cooktop is too close to wall (${Math.round(cooktop.position.x)}cm, min ${ERGONOMIC_STANDARDS.distances.cooktopToWall}cm)`,
          severity: 'warning',
          itemId: cooktop.id,
        });
      }
    }

    // Check counter space between sink and cooktop
    const sink = items.find((i) => i.product.type === 'sink_base');
    const cooktop = items.find((i) => ['cooktop', 'hob'].includes(i.product.type));

    if (sink && cooktop && sink.wall === cooktop.wall) {
      const distance = Math.abs(
        sink.position.x +
          sink.product.dimensions.width / 2 -
          (cooktop.position.x + cooktop.product.dimensions.width / 2)
      );

      if (distance < ERGONOMIC_STANDARDS.distances.cooktopToSinkMin) {
        warnings.push({
          code: 'SINK_COOKTOP_TOO_CLOSE',
          message: `Sink and cooktop are too close (${Math.round(distance)}cm, min ${ERGONOMIC_STANDARDS.distances.cooktopToSinkMin}cm)`,
          severity: 'warning',
        });
      }
    }
  }

  // ============================================
  // Scoring & Pricing
  // ============================================

  private calculatePricing(items: PlacedItem[]): PricingSummary {
    const byCategory = { cabinets: 0, appliances: 0, worktops: 0, fittings: 0 };
    const byProvider: Record<string, number> = {};

    for (const item of items) {
      const price = item.product.price || 0;

      if (this.isCabinet(item.product.type)) {
        byCategory.cabinets += price;
      } else if (item.product.category === 'appliances') {
        byCategory.appliances += price;
      } else if (item.product.type === 'worktop') {
        byCategory.worktops += price;
      } else {
        byCategory.fittings += price;
      }

      byProvider[item.product.providerId] = (byProvider[item.product.providerId] || 0) + price;
    }

    const total =
      byCategory.cabinets + byCategory.appliances + byCategory.worktops + byCategory.fittings;

    return {
      cabinets: byCategory.cabinets,
      appliances: byCategory.appliances,
      worktops: byCategory.worktops,
      fittings: byCategory.fittings,
      total,
      currency: items[0]?.product.currency || 'EUR',
      byProvider,
    };
  }

  private calculateScore(
    items: PlacedItem[],
    room: RoomConfiguration,
    preferences: UserPreferences,
    pricing: PricingSummary,
    layout: LayoutPlan
  ): ConfigurationScore {
    // 1. Ergonomics
    const ergonomics = this.scoreErgonomics(layout, items, preferences);

    // 2. Storage
    const storage = this.scoreStorage(items, preferences);

    // 3. Aesthetics
    const aesthetics = this.scoreAesthetics(items);

    // 4. Budget efficiency
    const budgetEfficiency = this.scoreBudget(pricing, preferences);

    // 5. Space utilization
    const spaceUtilization = this.scoreSpaceUtilization(items, room);

    // Weighted overall
    const weights = {
      ergonomics: 0.25,
      storage: 0.2,
      aesthetics: 0.15,
      budgetEfficiency: 0.25,
      spaceUtilization: 0.15,
    };

    const overall =
      ergonomics * weights.ergonomics +
      storage * weights.storage +
      aesthetics * weights.aesthetics +
      budgetEfficiency * weights.budgetEfficiency +
      spaceUtilization * weights.spaceUtilization;

    return {
      overall: Math.round(Math.min(100, Math.max(0, overall))),
      ergonomics: Math.round(ergonomics),
      storage: Math.round(storage),
      aesthetics: Math.round(aesthetics),
      budgetEfficiency: Math.round(budgetEfficiency),
      spaceUtilization: Math.round(spaceUtilization),
    };
  }

  private scoreErgonomics(
    layout: LayoutPlan,
    items: PlacedItem[],
    preferences: UserPreferences
  ): number {
    let score = 40;

    // Work triangle
    score += layout.workTriangle.score * 0.4;

    // Standard heights
    const standardHeightItems = items.filter(
      (i) => i.product.type === 'base' && i.product.dimensions.height === METOD_STANDARDS.baseHeight
    );
    score += Math.min(15, standardHeightItems.length * 2);

    // Accessibility
    if (preferences.accessibility?.wheelchairAccessible) {
      const hasLoweredWorktop = items.some(
        (i) =>
          i.product.type === 'worktop' &&
          i.position.y < ERGONOMIC_STANDARDS.counterHeights.wheelchair + 5
      );
      score += hasLoweredWorktop ? 10 : -10;
    }

    return Math.min(100, score);
  }

  private scoreStorage(items: PlacedItem[], preferences: UserPreferences): number {
    const storageItems = items.filter((i) =>
      ['base', 'wall', 'tall', 'drawer', 'pantry', 'corner_base', 'corner_wall'].includes(
        i.product.type
      )
    );

    const storagePriority = preferences.storagePriority || 5;
    const targetCount = storagePriority * 2;

    let score = 50 + (storageItems.length / Math.max(1, targetCount)) * 50;

    // Bonus for variety
    const types = new Set(storageItems.map((i) => i.product.type));
    score += types.size * 3;

    return Math.min(100, score);
  }

  private scoreAesthetics(items: PlacedItem[]): number {
    let score = 50;

    // Provider consistency
    const providers = new Set(items.map((i) => i.product.providerId));
    if (providers.size === 1) score += 30;
    else if (providers.size === 2) score += 15;

    // Uniform widths bonus
    const widths = new Set(
      items.filter((i) => this.isCabinet(i.product.type)).map((i) => i.product.dimensions.width)
    );
    if (widths.size <= 3) score += 10;

    return Math.min(100, score);
  }

  private scoreBudget(pricing: PricingSummary, preferences: UserPreferences): number {
    const ratio = pricing.total / preferences.budget.max;

    if (ratio <= 0.6) return 100;
    if (ratio <= 0.75) return 90;
    if (ratio <= 0.9) return 75;
    if (ratio <= 1.0) return 60;
    if (ratio <= 1.1) return 40;
    if (ratio <= 1.2) return 25;
    return 10;
  }

  private scoreSpaceUtilization(items: PlacedItem[], room: RoomConfiguration): number {
    const totalWallLength = room.walls
      .filter((w) => w.available)
      .reduce((sum, w) => sum + (w.endPosition - w.startPosition), 0);

    const usedLength = items
      .filter((i) => ['base', 'tall', 'sink_base', 'corner_base'].includes(i.product.type))
      .reduce((sum, i) => sum + i.product.dimensions.width, 0);

    const utilization = totalWallLength > 0 ? (usedLength / totalWallLength) * 100 : 0;

    if (utilization >= 65 && utilization <= 85) return 100;
    if (utilization >= 55 && utilization <= 90) return 80;
    if (utilization >= 45 && utilization <= 95) return 60;
    if (utilization >= 35) return 40;
    return 20;
  }

  // ============================================
  // Helpers
  // ============================================

  private isCabinet(type: string): boolean {
    return [
      'base',
      'wall',
      'tall',
      'drawer',
      'pantry',
      'corner_base',
      'corner_wall',
      'sink_base',
      'oven_housing',
      'fridge_housing',
    ].includes(type);
  }

  private getWallRotation(wall: string): number {
    return { north: 0, east: 90, south: 180, west: 270 }[wall] || 0;
  }

  private generateConfigName(layout: LayoutPlan): string {
    const shapeNames: Record<KitchenShape, string> = {
      I: 'Linéaire',
      L: 'Angle',
      U: 'U',
      G: 'G',
      parallel: 'Parallèle',
      island: 'Îlot',
      peninsula: 'Péninsule',
    };
    const variantNames: Record<LayoutVariant, string> = {
      standard: 'Standard',
      maximized_storage: 'Rangement Max',
      budget_optimized: 'Économique',
      ergonomic_focus: 'Ergonomique',
      professional: 'Professionnel',
    };
    return `${shapeNames[layout.shape]} - ${variantNames[layout.variant]}`;
  }

  private createErrorResponse(startTime: number, message: string): GenerationResponse {
    return {
      success: false,
      configurations: [],
      recommended: null,
      stats: {
        totalGenerated: 0,
        validConfigurations: 0,
        generationTimeMs: Date.now() - startTime,
        providersQueried: [],
        productsConsidered: 0,
      },
      errors: [message],
    };
  }

  private rankConfigurations(
    configs: KitchenConfiguration[],
    preferences: UserPreferences
  ): KitchenConfiguration[] {
    return [...configs].sort((a, b) => {
      if (b.score.overall !== a.score.overall) return b.score.overall - a.score.overall;

      const priority = preferences.storagePriority || 5;
      if (priority >= 7) return b.score.storage - a.score.storage;
      if (priority <= 3) return b.score.budgetEfficiency - a.score.budgetEfficiency;

      return b.score.ergonomics - a.score.ergonomics;
    });
  }
}

// ============================================
// Export
// ============================================

let generatorInstance: KitchenGeneratorService | null = null;

export function getKitchenGenerator(
  constraints?: Partial<GenerationConstraints>
): KitchenGeneratorService {
  if (!generatorInstance || constraints) {
    generatorInstance = new KitchenGeneratorService(constraints);
  }
  return generatorInstance;
}
