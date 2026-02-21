import type { PlacedItem3D, RoomConfig } from './ai-assistant';

/**
 * Result of acoustic noise analysis
 */
export interface AcousticResult {
  noiseMap: Array<{
    x: number;
    z: number;
    dbLevel: number;
    primarySource: string;
  }>;
  overallNoiseLevel: number; // dB(A) at center of kitchen
  adjacentRoomNoise?: number; // dB(A) in adjacent room
  noiseSources: Array<{
    item: string;
    dbRating: number;
    position: { x: number; z: number };
    noiseCategory: 'quiet' | 'moderate' | 'loud' | 'very_loud';
  }>;
  recommendations: Array<{
    suggestion: string;
    impact: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  score: number; // 0-100 (100 = very quiet)
}

/**
 * Open-plan configuration for adjacent room noise analysis
 */
export interface OpenPlanConfig {
  adjacentRoomDistance: number; // meters from kitchen center to adjacent room listening point
  hasWall: boolean; // whether a wall separates the rooms
  doorOpening?: number; // meters, width of door opening (if hasWall is true)
}

/**
 * Noise rating data for common kitchen appliances.
 * All values in dB(A).
 */
interface ApplianceNoiseProfile {
  types: string[];
  minDb: number;
  maxDb: number;
  defaultDb: number;
}

const APPLIANCE_NOISE_PROFILES: ApplianceNoiseProfile[] = [
  {
    types: ['dishwasher'],
    minDb: 42,
    maxDb: 52,
    defaultDb: 48,
  },
  {
    types: ['refrigerator', 'fridge', 'fridge_freezer'],
    minDb: 32,
    maxDb: 42,
    defaultDb: 37,
  },
  {
    types: ['hood', 'range_hood', 'extractor'],
    minDb: 45,
    maxDb: 65,
    defaultDb: 55, // medium setting
  },
  {
    types: ['microwave'],
    minDb: 55,
    maxDb: 55,
    defaultDb: 55,
  },
  {
    types: ['oven'],
    minDb: 40,
    maxDb: 50,
    defaultDb: 45,
  },
  {
    types: ['garbage_disposal', 'waste_disposal'],
    minDb: 70,
    maxDb: 80,
    defaultDb: 75,
  },
  {
    types: ['coffee_maker', 'coffee_machine'],
    minDb: 55,
    maxDb: 65,
    defaultDb: 60,
  },
];

// Noise propagation constants
const REFERENCE_DISTANCE = 1.0; // meters (dB rating reference distance)
const WALL_ATTENUATION_SOLID = 35; // dB reduction through solid wall
const WALL_ATTENUATION_DOOR_PER_METER = 12; // dB reduction through door opening (average)

/**
 * Acoustic planner for kitchen noise analysis.
 *
 * Calculates noise levels at various points in the kitchen and adjacent rooms,
 * identifies noisy appliances, and provides recommendations for noise reduction.
 */
export class AcousticPlanner {
  /**
   * Calculate noise levels at different points in and around the kitchen.
   */
  analyzeNoise(
    items: PlacedItem3D[],
    roomConfig: RoomConfig,
    openPlanConfig?: OpenPlanConfig
  ): AcousticResult {
    // 1. Identify noise sources
    const noiseSources = this.identifyNoiseSources(items);

    // 2. Generate noise map (grid sampling)
    const noiseMap = this.generateNoiseMap(noiseSources, roomConfig);

    // 3. Calculate overall noise level at kitchen center
    const kitchenCenter = { x: roomConfig.width / 2, z: roomConfig.depth / 2 };
    const overallNoiseLevel = this.calculateCombinedNoise(noiseSources, kitchenCenter);

    // 4. Calculate adjacent room noise if open plan config provided
    let adjacentRoomNoise: number | undefined;
    if (openPlanConfig) {
      adjacentRoomNoise = this.calculateAdjacentRoomNoise(
        noiseSources,
        kitchenCenter,
        openPlanConfig
      );
    }

    // 5. Generate recommendations
    const recommendations = this.generateRecommendations(
      noiseSources,
      overallNoiseLevel,
      adjacentRoomNoise,
      openPlanConfig
    );

    // 6. Calculate acoustic score
    const score = this.calculateScore(overallNoiseLevel, adjacentRoomNoise, noiseSources);

    return {
      noiseMap,
      overallNoiseLevel: Math.round(overallNoiseLevel * 10) / 10,
      adjacentRoomNoise: adjacentRoomNoise !== undefined
        ? Math.round(adjacentRoomNoise * 10) / 10
        : undefined,
      noiseSources: noiseSources.map((s) => ({
        item: s.item,
        dbRating: s.dbRating,
        position: s.position,
        noiseCategory: this.categorizeNoise(s.dbRating),
      })),
      recommendations,
      score,
    };
  }

  /**
   * Identify all noise-producing appliances and their noise ratings
   */
  private identifyNoiseSources(
    items: PlacedItem3D[]
  ): Array<{ item: string; dbRating: number; position: { x: number; z: number } }> {
    const sources: Array<{ item: string; dbRating: number; position: { x: number; z: number } }> = [];

    for (const item of items) {
      const profile = APPLIANCE_NOISE_PROFILES.find((p) =>
        p.types.some((t) => item.type.includes(t) || item.type === t)
      );

      if (profile) {
        sources.push({
          item: item.type,
          dbRating: profile.defaultDb,
          position: { x: item.position.x, z: item.position.z },
        });
      }
    }

    return sources;
  }

  /**
   * Generate a noise map by sampling a grid across the kitchen.
   * Uses inverse square law for sound propagation.
   */
  private generateNoiseMap(
    sources: Array<{ item: string; dbRating: number; position: { x: number; z: number } }>,
    roomConfig: RoomConfig
  ): AcousticResult['noiseMap'] {
    const noiseMap: AcousticResult['noiseMap'] = [];
    const gridStep = 0.5; // sample every 50cm

    for (let x = gridStep / 2; x < roomConfig.width; x += gridStep) {
      for (let z = gridStep / 2; z < roomConfig.depth; z += gridStep) {
        const point = { x, z };

        if (sources.length === 0) {
          noiseMap.push({
            x: Math.round(x * 100) / 100,
            z: Math.round(z * 100) / 100,
            dbLevel: 30, // ambient background noise
            primarySource: 'ambient',
          });
          continue;
        }

        // Calculate combined dB at this point from all sources
        const combinedDb = this.calculateCombinedNoise(sources, point);

        // Find the primary (loudest) source at this point
        let primarySource = 'ambient';
        let maxContribution = 0;

        for (const source of sources) {
          const dist = this.distance2D(source.position, point);
          const effectiveDist = Math.max(dist, 0.1);
          const dbAtPoint = source.dbRating - 20 * Math.log10(effectiveDist / REFERENCE_DISTANCE);

          if (dbAtPoint > maxContribution) {
            maxContribution = dbAtPoint;
            primarySource = source.item;
          }
        }

        noiseMap.push({
          x: Math.round(x * 100) / 100,
          z: Math.round(z * 100) / 100,
          dbLevel: Math.round(combinedDb * 10) / 10,
          primarySource,
        });
      }
    }

    return noiseMap;
  }

  /**
   * Calculate combined noise from all sources at a given point.
   * Uses inverse square law: dB_at_distance = source_dB - 20 * log10(distance / 1m)
   * Then combines multiple sources using power addition.
   */
  private calculateCombinedNoise(
    sources: Array<{ item: string; dbRating: number; position: { x: number; z: number } }>,
    point: { x: number; z: number }
  ): number {
    if (sources.length === 0) return 30; // ambient noise floor

    // Convert each source dB to power at the point, sum, then convert back
    let totalPower = 0;

    for (const source of sources) {
      const dist = this.distance2D(source.position, point);
      const effectiveDist = Math.max(dist, 0.1); // minimum 10cm to avoid infinity
      const dbAtPoint = source.dbRating - 20 * Math.log10(effectiveDist / REFERENCE_DISTANCE);
      // Convert dB to linear power
      totalPower += Math.pow(10, dbAtPoint / 10);
    }

    // Convert back to dB
    return 10 * Math.log10(totalPower);
  }

  /**
   * Calculate noise level in the adjacent room accounting for wall/door attenuation
   */
  private calculateAdjacentRoomNoise(
    sources: Array<{ item: string; dbRating: number; position: { x: number; z: number } }>,
    kitchenCenter: { x: number; z: number },
    config: OpenPlanConfig
  ): number {
    // Calculate combined noise at the boundary (kitchen center as reference)
    const noiseAtCenter = this.calculateCombinedNoise(sources, kitchenCenter);

    // Apply distance attenuation to adjacent room
    const distanceAttenuation = 20 * Math.log10(
      Math.max(config.adjacentRoomDistance, 1) / REFERENCE_DISTANCE
    );

    let wallAttenuation = 0;

    if (config.hasWall) {
      if (config.doorOpening && config.doorOpening > 0) {
        // Partial wall with door opening
        // Attenuation is reduced proportional to door opening size
        wallAttenuation = WALL_ATTENUATION_DOOR_PER_METER * (1 / Math.max(config.doorOpening, 0.5));
        wallAttenuation = Math.min(wallAttenuation, WALL_ATTENUATION_SOLID);
      } else {
        // Solid wall, full attenuation
        wallAttenuation = WALL_ATTENUATION_SOLID;
      }
    }
    // Open plan: no wall attenuation, just distance

    const adjacentRoomDb = noiseAtCenter - distanceAttenuation - wallAttenuation;
    return Math.max(adjacentRoomDb, 25); // ambient floor in adjacent room
  }

  /**
   * Generate noise reduction recommendations
   */
  private generateRecommendations(
    sources: Array<{ item: string; dbRating: number; position: { x: number; z: number } }>,
    overallLevel: number,
    adjacentRoomNoise: number | undefined,
    openPlanConfig?: OpenPlanConfig
  ): AcousticResult['recommendations'] {
    const recommendations: AcousticResult['recommendations'] = [];

    // Check dishwasher noise
    const dishwasher = sources.find((s) => s.item === 'dishwasher');
    if (dishwasher && dishwasher.dbRating > 46) {
      recommendations.push({
        suggestion: 'Consider a quieter dishwasher (42 dB models available)',
        impact: `Current dishwasher at ${dishwasher.dbRating} dB — a 42 dB model would reduce perceived noise by approximately 50%`,
        priority: adjacentRoomNoise !== undefined && adjacentRoomNoise > 40 ? 'high' : 'medium',
      });
    }

    // Check range hood noise
    const hood = sources.find((s) =>
      s.item === 'hood' || s.item === 'range_hood' || s.item === 'extractor'
    );
    if (hood && hood.dbRating > 60) {
      recommendations.push({
        suggestion: 'Consider a remote-motor range hood for quieter operation',
        impact: `Range hood at ${hood.dbRating} dB — remote-motor models can reduce noise to 40-45 dB at the hood`,
        priority: 'high',
      });
    }

    // Check fridge placement near open-plan seating
    const fridge = sources.find((s) =>
      s.item === 'refrigerator' || s.item === 'fridge' || s.item === 'fridge_freezer'
    );
    if (fridge && openPlanConfig && !openPlanConfig.hasWall) {
      recommendations.push({
        suggestion: 'Move the refrigerator away from the open-plan seating area to reduce compressor noise',
        impact: `Fridge compressor noise (${fridge.dbRating} dB) propagates directly to the living area in open-plan layouts`,
        priority: 'medium',
      });
    }

    // Check garbage disposal
    const disposal = sources.find((s) =>
      s.item === 'garbage_disposal' || s.item === 'waste_disposal'
    );
    if (disposal) {
      recommendations.push({
        suggestion: 'Install sound insulation around the garbage disposal unit',
        impact: `Garbage disposal at ${disposal.dbRating} dB is the loudest typical kitchen appliance — insulation can reduce by 5-10 dB`,
        priority: 'high',
      });
    }

    // Overall noise level recommendations
    if (overallLevel > 60) {
      recommendations.push({
        suggestion: 'Consider sound-absorbing materials on kitchen ceiling or walls (acoustic panels)',
        impact: 'Acoustic panels can reduce overall reflected noise by 3-6 dB',
        priority: 'medium',
      });
    }

    // Open plan specific
    if (openPlanConfig && !openPlanConfig.hasWall && adjacentRoomNoise !== undefined && adjacentRoomNoise > 45) {
      recommendations.push({
        suggestion: 'Consider a partial wall or glass partition between kitchen and living area',
        impact: `Adjacent room noise is ${Math.round(adjacentRoomNoise)} dB — a partial barrier would reduce by 10-15 dB`,
        priority: 'high',
      });
    }

    // Quiet kitchen bonus
    if (overallLevel < 45 && sources.length > 0) {
      recommendations.push({
        suggestion: 'Your kitchen has excellent noise characteristics — no significant improvements needed',
        impact: 'Overall noise level is below 45 dB, which is considered quiet for a kitchen',
        priority: 'low',
      });
    }

    return recommendations;
  }

  /**
   * Calculate an acoustic score (0-100, 100 = very quiet)
   */
  private calculateScore(
    overallLevel: number,
    adjacentRoomNoise: number | undefined,
    sources: Array<{ item: string; dbRating: number; position: { x: number; z: number } }>
  ): number {
    let score = 100;

    // Overall noise level penalty
    // < 45 dB: excellent, 45-55: good, 55-65: fair, 65+: poor
    if (overallLevel > 65) {
      score -= 40;
    } else if (overallLevel > 55) {
      score -= 20 + ((overallLevel - 55) / 10) * 20;
    } else if (overallLevel > 45) {
      score -= ((overallLevel - 45) / 10) * 20;
    }

    // Adjacent room noise penalty (if applicable)
    if (adjacentRoomNoise !== undefined) {
      if (adjacentRoomNoise > 50) {
        score -= 15;
      } else if (adjacentRoomNoise > 40) {
        score -= ((adjacentRoomNoise - 40) / 10) * 15;
      }
    }

    // Penalty for very loud individual sources
    const loudSources = sources.filter((s) => s.dbRating >= 65);
    score -= loudSources.length * 5;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Categorize a noise level
   */
  private categorizeNoise(db: number): 'quiet' | 'moderate' | 'loud' | 'very_loud' {
    if (db <= 40) return 'quiet';
    if (db <= 55) return 'moderate';
    if (db <= 65) return 'loud';
    return 'very_loud';
  }

  /**
   * 2D Euclidean distance
   */
  private distance2D(a: { x: number; z: number }, b: { x: number; z: number }): number {
    const dx = a.x - b.x;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dz * dz);
  }
}
