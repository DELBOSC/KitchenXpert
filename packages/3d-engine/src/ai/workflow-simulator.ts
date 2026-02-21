import type { PlacedItem3D, RoomConfig } from './ai-assistant';

/**
 * Result of a cooking workflow simulation
 */
export interface WorkflowResult {
  totalDistance: number; // total walking distance in meters
  bottlenecks: Array<{
    step: string; // e.g., "prep_to_cooktop"
    distance: number;
    isOptimal: boolean;
    suggestion?: string;
  }>;
  zones: Array<{
    name: string; // 'storage', 'prep', 'cooking', 'serving', 'cleaning'
    position: { x: number; z: number };
    radius: number;
    isWellPlaced: boolean;
  }>;
  flowScore: number; // 0-100
  congestionPoints: Array<{
    position: { x: number; z: number };
    severity: 'high' | 'medium' | 'low';
  }>;
  workTriangle: {
    perimeter: number;
    isOptimal: boolean;
    score: number;
  };
  extendedTriangle: {
    storageToPrepDistance: number;
    prepToCookDistance: number;
    cookToServeDistance: number;
    serveToCleanDistance: number;
    cleanToStorageDistance: number;
  };
  multiCookAnalysis?: {
    canTwoCooksWork: boolean;
    conflictZones: Array<{ x: number; z: number }>;
    recommendedIsland: boolean;
  };
}

/** Meal type affects complexity and multi-cook requirements */
type MealType = 'simple' | 'family' | 'dinner_party' | 'professional';

/** Internal zone representation during computation */
interface ZoneData {
  name: string;
  items: PlacedItem3D[];
  centroid: { x: number; z: number };
}

// Item type classification helpers
const STORAGE_TYPES = ['refrigerator', 'fridge', 'fridge_freezer', 'tall_cabinet', 'tall', 'pantry'];
const PREP_TYPES = ['sink', 'sink_base', 'base_cabinet', 'base'];
const COOKING_TYPES = ['cooktop', 'stove', 'hob', 'oven', 'microwave'];
const SERVING_TYPES = ['island', 'peninsula', 'bar', 'counter'];
const CLEANING_TYPES = ['sink', 'sink_base', 'dishwasher'];

// Optimal distances between consecutive workflow zones (meters)
const OPTIMAL_ZONE_DISTANCE = { min: 0.8, max: 2.5 };

// Minimum passage width for comfortable movement (meters)
const MIN_PASSAGE_WIDTH = 0.9;

/**
 * Cooking workflow simulation engine.
 *
 * Goes beyond the basic work triangle to model the full cooking workflow:
 * storage -> prep -> cook -> serve -> clean
 *
 * Identifies bottlenecks, congestion points, and scores the overall kitchen flow.
 */
export class WorkflowSimulator {
  /**
   * Simulate a complete cooking workflow and identify bottlenecks.
   * Models the movement pattern: storage -> prep -> cook -> serve -> clean
   */
  simulateWorkflow(
    items: PlacedItem3D[],
    roomConfig: RoomConfig,
    mealType: MealType
  ): WorkflowResult {
    // 1. Classify items into workflow zones
    const zones = this.classifyZones(items, roomConfig);

    // 2. Calculate distances between consecutive zones
    const extendedTriangle = this.calculateExtendedTriangle(zones);

    // 3. Calculate total walking distance based on meal type
    const totalDistance = this.calculateTotalDistance(extendedTriangle, mealType);

    // 4. Identify bottlenecks
    const bottlenecks = this.identifyBottlenecks(extendedTriangle);

    // 5. Detect congestion points
    const congestionPoints = this.detectCongestion(zones, items, roomConfig);

    // 6. Calculate the traditional work triangle
    const workTriangle = this.calculateWorkTriangle(items);

    // 7. Score the overall flow
    const flowScore = this.calculateFlowScore(
      extendedTriangle,
      bottlenecks,
      congestionPoints,
      workTriangle,
      zones,
      roomConfig
    );

    // 8. Build zone output
    const zoneOutput = this.buildZoneOutput(zones);

    // 9. Multi-cook analysis for dinner_party and professional
    let multiCookAnalysis: WorkflowResult['multiCookAnalysis'];
    if (mealType === 'dinner_party' || mealType === 'professional') {
      multiCookAnalysis = this.analyzeMultiCook(zones, items, roomConfig);
    }

    return {
      totalDistance,
      bottlenecks,
      zones: zoneOutput,
      flowScore,
      congestionPoints,
      workTriangle,
      extendedTriangle,
      multiCookAnalysis,
    };
  }

  /**
   * Classify placed items into the 5 workflow zones and compute centroids
   */
  private classifyZones(items: PlacedItem3D[], roomConfig: RoomConfig): ZoneData[] {
    const storageItems = items.filter((i) => STORAGE_TYPES.some((t) => i.type.includes(t)));
    const prepItems = items.filter((i) => PREP_TYPES.some((t) => i.type === t));
    const cookingItems = items.filter((i) => COOKING_TYPES.some((t) => i.type.includes(t)));
    const servingItems = items.filter((i) => SERVING_TYPES.some((t) => i.type.includes(t)));
    const cleaningItems = items.filter((i) => CLEANING_TYPES.some((t) => i.type.includes(t)));

    // If serving zone has no dedicated items, approximate it:
    // the counter space nearest to the room opening (largest z or center)
    if (servingItems.length === 0) {
      // Use base cabinets furthest from the back wall as serving proxy
      const baseCabs = items
        .filter((i) => ['base_cabinet', 'base'].includes(i.type))
        .sort((a, b) => b.position.z - a.position.z);
      if (baseCabs.length > 0) {
        servingItems.push(baseCabs[0]!);
      }
    }

    const zones: ZoneData[] = [
      { name: 'storage', items: storageItems, centroid: this.computeCentroid(storageItems, roomConfig, 'storage') },
      { name: 'prep', items: prepItems, centroid: this.computeCentroid(prepItems, roomConfig, 'prep') },
      { name: 'cooking', items: cookingItems, centroid: this.computeCentroid(cookingItems, roomConfig, 'cooking') },
      { name: 'serving', items: servingItems, centroid: this.computeCentroid(servingItems, roomConfig, 'serving') },
      { name: 'cleaning', items: cleaningItems, centroid: this.computeCentroid(cleaningItems, roomConfig, 'cleaning') },
    ];

    return zones;
  }

  /**
   * Compute the centroid position of items in a zone.
   * Falls back to a reasonable default position if no items exist.
   */
  private computeCentroid(
    items: PlacedItem3D[],
    roomConfig: RoomConfig,
    zoneName: string
  ): { x: number; z: number } {
    if (items.length === 0) {
      // Fallback positions based on zone type
      switch (zoneName) {
        case 'storage':
          return { x: 0.3, z: roomConfig.depth / 2 };
        case 'prep':
          return { x: roomConfig.width / 3, z: 0.3 };
        case 'cooking':
          return { x: roomConfig.width / 2, z: 0.3 };
        case 'serving':
          return { x: roomConfig.width / 2, z: roomConfig.depth * 0.7 };
        case 'cleaning':
          return { x: roomConfig.width * 2 / 3, z: 0.3 };
        default:
          return { x: roomConfig.width / 2, z: roomConfig.depth / 2 };
      }
    }

    const sumX = items.reduce((s, i) => s + i.position.x, 0);
    const sumZ = items.reduce((s, i) => s + i.position.z, 0);
    return {
      x: sumX / items.length,
      z: sumZ / items.length,
    };
  }

  /**
   * Calculate distances between consecutive workflow zones
   */
  private calculateExtendedTriangle(zones: ZoneData[]): WorkflowResult['extendedTriangle'] {
    const storage = zones.find((z) => z.name === 'storage')!;
    const prep = zones.find((z) => z.name === 'prep')!;
    const cooking = zones.find((z) => z.name === 'cooking')!;
    const serving = zones.find((z) => z.name === 'serving')!;
    const cleaning = zones.find((z) => z.name === 'cleaning')!;

    return {
      storageToPrepDistance: this.distance2D(storage.centroid, prep.centroid),
      prepToCookDistance: this.distance2D(prep.centroid, cooking.centroid),
      cookToServeDistance: this.distance2D(cooking.centroid, serving.centroid),
      serveToCleanDistance: this.distance2D(serving.centroid, cleaning.centroid),
      cleanToStorageDistance: this.distance2D(cleaning.centroid, storage.centroid),
    };
  }

  /**
   * Calculate total walking distance for a meal preparation cycle.
   * Different meal types involve different numbers of trips between zones.
   */
  private calculateTotalDistance(
    triangle: WorkflowResult['extendedTriangle'],
    mealType: MealType
  ): number {
    // Multipliers for how many trips between zones per meal type
    const tripMultipliers: Record<MealType, number> = {
      simple: 1,
      family: 2,
      dinner_party: 4,
      professional: 6,
    };

    const multiplier = tripMultipliers[mealType];

    const baseDistance =
      triangle.storageToPrepDistance +
      triangle.prepToCookDistance +
      triangle.cookToServeDistance +
      triangle.serveToCleanDistance +
      triangle.cleanToStorageDistance;

    return Math.round(baseDistance * multiplier * 100) / 100;
  }

  /**
   * Identify bottleneck steps where distance is suboptimal
   */
  private identifyBottlenecks(
    triangle: WorkflowResult['extendedTriangle']
  ): WorkflowResult['bottlenecks'] {
    const steps: Array<{ step: string; distance: number }> = [
      { step: 'storage_to_prep', distance: triangle.storageToPrepDistance },
      { step: 'prep_to_cooktop', distance: triangle.prepToCookDistance },
      { step: 'cooktop_to_serve', distance: triangle.cookToServeDistance },
      { step: 'serve_to_clean', distance: triangle.serveToCleanDistance },
      { step: 'clean_to_storage', distance: triangle.cleanToStorageDistance },
    ];

    return steps.map(({ step, distance }) => {
      const isOptimal = distance >= OPTIMAL_ZONE_DISTANCE.min && distance <= OPTIMAL_ZONE_DISTANCE.max;
      let suggestion: string | undefined;

      if (distance < OPTIMAL_ZONE_DISTANCE.min) {
        suggestion = `The ${step.replace(/_/g, ' ')} distance (${Math.round(distance * 100)} cm) is too short — zones may overlap, causing congestion`;
      } else if (distance > OPTIMAL_ZONE_DISTANCE.max) {
        suggestion = `The ${step.replace(/_/g, ' ')} distance (${Math.round(distance * 100)} cm) is too long — consider moving elements closer to reduce walking`;
      }

      return { step, distance: Math.round(distance * 100) / 100, isOptimal, suggestion };
    });
  }

  /**
   * Detect congestion points where workflow paths cross or pass through
   * narrow passages.
   */
  private detectCongestion(
    zones: ZoneData[],
    items: PlacedItem3D[],
    roomConfig: RoomConfig
  ): WorkflowResult['congestionPoints'] {
    const congestionPoints: WorkflowResult['congestionPoints'] = [];

    // Build workflow path segments between consecutive zones
    const orderedZones = ['storage', 'prep', 'cooking', 'serving', 'cleaning'];
    const pathSegments: Array<{ from: { x: number; z: number }; to: { x: number; z: number } }> = [];

    for (let i = 0; i < orderedZones.length; i++) {
      const fromZone = zones.find((z) => z.name === orderedZones[i])!;
      const toZone = zones.find((z) => z.name === orderedZones[(i + 1) % orderedZones.length])!;
      pathSegments.push({ from: fromZone.centroid, to: toZone.centroid });
    }

    // Check for path crossings
    for (let i = 0; i < pathSegments.length; i++) {
      for (let j = i + 2; j < pathSegments.length; j++) {
        // Skip adjacent segments (they share endpoints)
        if (i === 0 && j === pathSegments.length - 1) continue;

        const intersection = this.segmentIntersection(
          pathSegments[i]!.from, pathSegments[i]!.to,
          pathSegments[j]!.from, pathSegments[j]!.to
        );

        if (intersection) {
          congestionPoints.push({
            position: intersection,
            severity: 'high',
          });
        }
      }
    }

    // Check for narrow passages along paths
    for (const segment of pathSegments) {
      const steps = 5;
      for (let s = 1; s < steps; s++) {
        const t = s / steps;
        const px = segment.from.x + t * (segment.to.x - segment.from.x);
        const pz = segment.from.z + t * (segment.to.z - segment.from.z);

        // Check if this point is in a narrow passage (close to furniture on both sides)
        const clearance = this.getMinClearance({ x: px, z: pz }, items, roomConfig);
        if (clearance < MIN_PASSAGE_WIDTH) {
          const severity = clearance < 0.6 ? 'high' : clearance < 0.75 ? 'medium' : 'low';
          congestionPoints.push({
            position: { x: Math.round(px * 100) / 100, z: Math.round(pz * 100) / 100 },
            severity,
          });
        }
      }
    }

    return congestionPoints;
  }

  /**
   * Calculate the traditional work triangle (fridge-sink-cooktop)
   */
  private calculateWorkTriangle(items: PlacedItem3D[]): WorkflowResult['workTriangle'] {
    const sink = items.find((i) => i.type === 'sink' || i.type === 'sink_base');
    const cooktop = items.find((i) => ['cooktop', 'stove', 'hob'].includes(i.type));
    const fridge = items.find((i) => ['refrigerator', 'fridge', 'fridge_freezer'].includes(i.type));

    if (!sink || !cooktop || !fridge) {
      return { perimeter: 0, isOptimal: false, score: 0 };
    }

    const sinkToCooktop = sink.position.distanceTo(cooktop.position);
    const cooktopToFridge = cooktop.position.distanceTo(fridge.position);
    const fridgeToSink = fridge.position.distanceTo(sink.position);
    const perimeter = sinkToCooktop + cooktopToFridge + fridgeToSink;

    const isOptimal = perimeter >= 3.6 && perimeter <= 6.6;

    let score = 100;
    if (perimeter < 3.6) {
      score -= ((3.6 - perimeter) / 3.6) * 40;
    } else if (perimeter > 6.6) {
      score -= ((perimeter - 6.6) / 6.6) * 40;
    } else {
      const deviation = Math.abs(perimeter - 5.1) / 5.1;
      score -= deviation * 20;
    }

    // Check individual leg lengths
    const legs = [sinkToCooktop, cooktopToFridge, fridgeToSink];
    for (const leg of legs) {
      if (leg < 1.2) score -= 10;
      if (leg > 2.7) score -= 10;
    }

    score = Math.max(0, Math.min(100, Math.round(score)));

    return {
      perimeter: Math.round(perimeter * 100) / 100,
      isOptimal,
      score,
    };
  }

  /**
   * Calculate the overall flow score
   */
  private calculateFlowScore(
    extendedTriangle: WorkflowResult['extendedTriangle'],
    bottlenecks: WorkflowResult['bottlenecks'],
    congestionPoints: WorkflowResult['congestionPoints'],
    workTriangle: WorkflowResult['workTriangle'],
    zones: ZoneData[],
    roomConfig: RoomConfig
  ): number {
    let score = 100;

    // Penalize for non-optimal bottleneck steps
    const nonOptimalSteps = bottlenecks.filter((b) => !b.isOptimal);
    score -= nonOptimalSteps.length * 8;

    // Penalize for congestion
    const highCongestion = congestionPoints.filter((c) => c.severity === 'high').length;
    const medCongestion = congestionPoints.filter((c) => c.severity === 'medium').length;
    score -= highCongestion * 10;
    score -= medCongestion * 5;

    // Work triangle contribution (25% weight)
    score -= (1 - workTriangle.score / 100) * 25;

    // Check flow linearity: zones should progress without backtracking
    const linearityPenalty = this.checkFlowLinearity(zones, roomConfig);
    score -= linearityPenalty;

    // Check counter space availability at prep and serving zones
    const prepZone = zones.find((z) => z.name === 'prep');
    const servingZone = zones.find((z) => z.name === 'serving');
    if (prepZone && prepZone.items.length === 0) score -= 10;
    if (servingZone && servingZone.items.length === 0) score -= 5;

    // Total distance penalty (ideal total is 5-12m for one cycle)
    const totalOneCycle =
      extendedTriangle.storageToPrepDistance +
      extendedTriangle.prepToCookDistance +
      extendedTriangle.cookToServeDistance +
      extendedTriangle.serveToCleanDistance +
      extendedTriangle.cleanToStorageDistance;

    if (totalOneCycle > 15) score -= 10;
    else if (totalOneCycle > 12) score -= 5;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Check flow linearity — penalize if zones require backtracking
   */
  private checkFlowLinearity(zones: ZoneData[], _roomConfig: RoomConfig): number {
    let penalty = 0;
    const orderedNames = ['storage', 'prep', 'cooking', 'serving', 'cleaning'];
    const orderedZones = orderedNames.map((name) => zones.find((z) => z.name === name)!);

    // Check if consecutive zones require direction changes (backtracking)
    for (let i = 0; i < orderedZones.length - 2; i++) {
      const a = orderedZones[i]!.centroid;
      const b = orderedZones[i + 1]!.centroid;
      const c = orderedZones[i + 2]!.centroid;

      // Direction from a->b
      const dx1 = b.x - a.x;
      const dz1 = b.z - a.z;
      // Direction from b->c
      const dx2 = c.x - b.x;
      const dz2 = c.z - b.z;

      // If the dot product is very negative, there's backtracking
      const dot = dx1 * dx2 + dz1 * dz2;
      const mag1 = Math.sqrt(dx1 * dx1 + dz1 * dz1);
      const mag2 = Math.sqrt(dx2 * dx2 + dz2 * dz2);

      if (mag1 > 0.01 && mag2 > 0.01) {
        const cosAngle = dot / (mag1 * mag2);
        // cosAngle < -0.5 means > 120 degree turn (backtracking)
        if (cosAngle < -0.5) {
          penalty += 5;
        }
      }
    }

    return penalty;
  }

  /**
   * Build the zone output array with radius and placement quality
   */
  private buildZoneOutput(zones: ZoneData[]): WorkflowResult['zones'] {
    return zones.map((zone) => {
      // Calculate zone radius from item spread
      let radius = 0.5; // minimum radius
      if (zone.items.length > 1) {
        const maxDist = zone.items.reduce((max, item) => {
          const d = this.distance2D(
            { x: item.position.x, z: item.position.z },
            zone.centroid
          );
          return Math.max(max, d);
        }, 0);
        radius = Math.max(radius, maxDist + 0.3);
      }

      // A zone is well-placed if it has items and they are reasonably clustered
      const isWellPlaced = zone.items.length > 0 && radius < 2.0;

      return {
        name: zone.name,
        position: {
          x: Math.round(zone.centroid.x * 100) / 100,
          z: Math.round(zone.centroid.z * 100) / 100,
        },
        radius: Math.round(radius * 100) / 100,
        isWellPlaced,
      };
    });
  }

  /**
   * Analyze whether two cooks can work simultaneously without collision.
   * Relevant for dinner_party and professional meal types.
   */
  private analyzeMultiCook(
    zones: ZoneData[],
    items: PlacedItem3D[],
    roomConfig: RoomConfig
  ): WorkflowResult['multiCookAnalysis'] {
    const cookingZone = zones.find((z) => z.name === 'cooking')!;
    const prepZone = zones.find((z) => z.name === 'prep')!;

    // Two cooks typically split: one on prep, one on cooking
    const distBetweenZones = this.distance2D(prepZone.centroid, cookingZone.centroid);

    // Can two cooks work if zones are far enough apart and passages are wide
    const minTwoCookDistance = 1.2; // meters apart
    const canTwoCooksWork = distBetweenZones >= minTwoCookDistance;

    // Identify conflict zones where both cooks would need to be
    const conflictZones: Array<{ x: number; z: number }> = [];

    // The midpoint between prep and cooking is a likely conflict zone
    const midpoint = {
      x: (prepZone.centroid.x + cookingZone.centroid.x) / 2,
      z: (prepZone.centroid.z + cookingZone.centroid.z) / 2,
    };

    const midClearance = this.getMinClearance(midpoint, items, roomConfig);
    if (midClearance < 1.2) {
      conflictZones.push({
        x: Math.round(midpoint.x * 100) / 100,
        z: Math.round(midpoint.z * 100) / 100,
      });
    }

    // Check the sink area (both cooks need water access)
    const cleaningZone = zones.find((z) => z.name === 'cleaning')!;
    if (cleaningZone.items.length > 0) {
      const sinkClearance = this.getMinClearance(cleaningZone.centroid, items, roomConfig);
      if (sinkClearance < 1.2) {
        conflictZones.push({
          x: Math.round(cleaningZone.centroid.x * 100) / 100,
          z: Math.round(cleaningZone.centroid.z * 100) / 100,
        });
      }
    }

    // Recommend island if room is wide enough and no island exists
    const hasIsland = items.some((i) => i.type.includes('island'));
    const roomHasSpace = roomConfig.width >= 3.5 && roomConfig.depth >= 3.0;
    const recommendedIsland = !hasIsland && !canTwoCooksWork && roomHasSpace;

    return {
      canTwoCooksWork,
      conflictZones,
      recommendedIsland,
    };
  }

  // --- Utility methods ---

  /**
   * 2D Euclidean distance between two points
   */
  private distance2D(a: { x: number; z: number }, b: { x: number; z: number }): number {
    const dx = a.x - b.x;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dz * dz);
  }

  /**
   * Get the minimum clearance (distance to nearest furniture or wall) at a point
   */
  private getMinClearance(
    point: { x: number; z: number },
    items: PlacedItem3D[],
    roomConfig: RoomConfig
  ): number {
    let minDist = Infinity;

    // Distance to walls
    const wallDists = [
      point.x,                        // left wall
      roomConfig.width - point.x,     // right wall
      point.z,                        // back wall
      roomConfig.depth - point.z,     // front wall
    ];
    for (const d of wallDists) {
      if (d < minDist) minDist = d;
    }

    // Distance to furniture (simplified AABB)
    for (const item of items) {
      if (['wall', 'floor', 'ceiling'].includes(item.type)) continue;

      const halfW = item.dimensions.width / 2;
      const halfD = item.dimensions.depth / 2;
      const dx = Math.max(0, Math.abs(point.x - item.position.x) - halfW);
      const dz = Math.max(0, Math.abs(point.z - item.position.z) - halfD);
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < minDist) minDist = dist;
    }

    return minDist;
  }

  /**
   * Check if two line segments intersect and return the intersection point
   */
  private segmentIntersection(
    p1: { x: number; z: number },
    p2: { x: number; z: number },
    p3: { x: number; z: number },
    p4: { x: number; z: number }
  ): { x: number; z: number } | null {
    const d1x = p2.x - p1.x;
    const d1z = p2.z - p1.z;
    const d2x = p4.x - p3.x;
    const d2z = p4.z - p3.z;

    const denominator = d1x * d2z - d1z * d2x;
    if (Math.abs(denominator) < 1e-10) return null; // parallel

    const t = ((p3.x - p1.x) * d2z - (p3.z - p1.z) * d2x) / denominator;
    const u = ((p3.x - p1.x) * d1z - (p3.z - p1.z) * d1x) / denominator;

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return {
        x: Math.round((p1.x + t * d1x) * 100) / 100,
        z: Math.round((p1.z + t * d1z) * 100) / 100,
      };
    }

    return null;
  }
}
