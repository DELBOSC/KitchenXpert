import * as THREE from 'three';
import { SolarCalculator, CITY_LOCATIONS } from './solar-position';
import type { GeoLocation, TimeOfDay, SolarPosition } from './solar-position';
import type { PlacedItem3D, RoomConfig } from '../ai/ai-assistant';

export interface WindowDefinition {
  id: string;
  position: THREE.Vector3;
  size: { width: number; height: number }; // metres
  orientation: number; // degrees from North
  wallId?: string;
}

/**
 * Location data for solar position calculations in shadow analysis
 */
export interface SolarLocation {
  latitude: number;
  longitude: number;
  timezone: number;
  month: number; // 1-12
  day: number; // 1-31
}

/**
 * Window position description for shadow analysis
 */
export interface ShadowWindowPosition {
  wall: string; // 'back', 'left', 'right', 'front'
  position: number; // offset along the wall in meters from left corner
  width: number; // window width in meters
  height: number; // window height in meters
}

/**
 * Result of shadow pattern analysis
 */
export interface ShadowAnalysis {
  darkZones: Array<{
    position: { x: number; z: number };
    radius: number;
    averageLuxHours: number; // average lux over daylight hours
    suggestion: string;
  }>;
  wellLitZones: Array<{
    position: { x: number; z: number };
    radius: number;
    averageLuxHours: number;
  }>;
  taskLightingNeeded: Array<{
    area: string; // 'prep_area', 'cooktop', 'sink'
    reason: string;
    type: 'under_cabinet' | 'pendant' | 'recessed' | 'track';
    suggestedLumens: number;
  }>;
  naturalLightScore: number; // 0-100
  recommendations: string[];
}

export interface RealisticLightingConfig {
  location: GeoLocation;
  month: number; // 1-12
  day: number; // 1-31
  time: TimeOfDay;
  roomOrientation: number; // degrees — where "back wall" faces
  windows: WindowDefinition[];
  enableShadows: boolean;
}

export type LightingPresetId = 'matin_ete' | 'midi_hiver' | 'soir_automne' | 'aube_printemps';

const PRESETS: Record<LightingPresetId, Partial<RealisticLightingConfig>> = {
  matin_ete: {
    month: 7,
    day: 15,
    time: { hour: 8, minute: 0 },
    location: CITY_LOCATIONS['paris']!,
  },
  midi_hiver: {
    month: 1,
    day: 15,
    time: { hour: 12, minute: 30 },
    location: CITY_LOCATIONS['paris']!,
  },
  soir_automne: {
    month: 10,
    day: 15,
    time: { hour: 18, minute: 0 },
    location: CITY_LOCATIONS['paris']!,
  },
  aube_printemps: {
    month: 4,
    day: 15,
    time: { hour: 6, minute: 30 },
    location: CITY_LOCATIONS['paris']!,
  },
};

/**
 * Eclairage realiste base sur la position solaire, geolocalisation et fenetres
 */
export class RealisticLighting {
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private config: RealisticLightingConfig;

  private sunLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;
  private hemisphereLight: THREE.HemisphereLight;
  private windowLights: Map<string, THREE.PointLight> = new Map();
  private lightGroup: THREE.Group;
  private active: boolean = false;

  constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer, config: RealisticLightingConfig) {
    this.scene = scene;
    this.renderer = renderer;
    this.config = config;

    this.lightGroup = new THREE.Group();
    this.lightGroup.name = '__realistic_lighting__';

    // Sun directional light
    this.sunLight = new THREE.DirectionalLight(0xffffff, 1);
    this.sunLight.castShadow = config.enableShadows;
    if (config.enableShadows) {
      this.sunLight.shadow.mapSize.set(2048, 2048);
      this.sunLight.shadow.camera.near = 0.1;
      this.sunLight.shadow.camera.far = 30;
      this.sunLight.shadow.camera.left = -10;
      this.sunLight.shadow.camera.right = 10;
      this.sunLight.shadow.camera.top = 10;
      this.sunLight.shadow.camera.bottom = -10;
    }
    this.lightGroup.add(this.sunLight);

    // Ambient
    this.ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    this.lightGroup.add(this.ambientLight);

    // Hemisphere (sky/ground)
    this.hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x444444, 0.4);
    this.lightGroup.add(this.hemisphereLight);

    // Window lights
    for (const win of config.windows) {
      this.addWindow(win);
    }
  }

  /**
   * Active l'eclairage realiste
   */
  activate(): void {
    if (this.active) return;
    this.scene.add(this.lightGroup);
    this.active = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.updateLighting(this.config);
  }

  /**
   * Desactive l'eclairage realiste
   */
  deactivate(): void {
    if (!this.active) return;
    this.scene.remove(this.lightGroup);
    this.active = false;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.toneMappingExposure = 1.0;
  }

  isActive(): boolean {
    return this.active;
  }

  /**
   * Met a jour l'eclairage avec une nouvelle configuration
   */
  updateLighting(config: Partial<RealisticLightingConfig>): void {
    this.config = { ...this.config, ...config };

    const solar = SolarCalculator.calculateSunPosition(
      this.config.location,
      this.config.month,
      this.config.day,
      this.config.time
    );

    this.applySolar(solar);

    // Update window lights
    for (const win of this.config.windows) {
      this.updateWindowLight(win, solar);
    }

    // Dynamic exposure based on altitude
    if (this.active) {
      this.renderer.toneMappingExposure = 0.5 + solar.intensity * 1.0;
    }
  }

  /**
   * Applique un preset
   */
  applyPreset(presetId: LightingPresetId): void {
    const preset = PRESETS[presetId];
    if (preset) {
      this.updateLighting(preset);
    }
  }

  /**
   * Ajoute une fenetre
   */
  addWindow(window: WindowDefinition): void {
    const light = new THREE.PointLight(0xffffff, 0.5, 8);
    light.position.copy(window.position);
    light.userData = { windowId: window.id };
    this.lightGroup.add(light);
    this.windowLights.set(window.id, light);
  }

  /**
   * Supprime une fenetre
   */
  removeWindow(id: string): void {
    const light = this.windowLights.get(id);
    if (light) {
      this.lightGroup.remove(light);
      this.windowLights.delete(id);
    }
  }

  /**
   * Libere les ressources
   */
  dispose(): void {
    this.deactivate();
    this.windowLights.clear();
  }

  /**
   * Analyze shadow patterns and suggest lighting improvements.
   * Based on solar timelapse data at the current location.
   *
   * Samples sun position at hours 8, 10, 12, 14, 16, 18.
   * For each sample, traces light from window positions into the room.
   * Areas blocked by tall cabinets or walls are dark zones.
   */
  analyzeShadowPatterns(
    items: PlacedItem3D[],
    roomConfig: RoomConfig,
    location: SolarLocation,
    windowPositions: ShadowWindowPosition[]
  ): ShadowAnalysis {
    const sampleHours = [8, 10, 12, 14, 16, 18];
    const gridStep = 0.5; // sample every 50cm
    const gridWidth = Math.ceil(roomConfig.width / gridStep);
    const gridDepth = Math.ceil(roomConfig.depth / gridStep);

    // Lux accumulation grid
    const luxGrid: number[][] = [];
    for (let gx = 0; gx < gridWidth; gx++) {
      luxGrid[gx] = [];
      for (let gz = 0; gz < gridDepth; gz++) {
        luxGrid[gx]![gz] = 0;
      }
    }

    // Identify tall obstacles that cast shadows
    const tallItems = items.filter((i) => {
      const topY = i.position.y + i.dimensions.height;
      return topY > 1.0; // items taller than 1m can cast meaningful shadows on countertops
    });

    // Resolve window positions to world coordinates
    const resolvedWindows = windowPositions.map((w) => this.resolveWindowPosition(w, roomConfig));

    // For each sample hour, compute sun position and trace light
    for (const hour of sampleHours) {
      const geoLoc: GeoLocation = {
        latitude: location.latitude,
        longitude: location.longitude,
        timezone: location.timezone,
      };

      const solar = SolarCalculator.calculateSunPosition(geoLoc, location.month, location.day, {
        hour,
        minute: 0,
      });

      // Skip if sun is below horizon
      if (solar.altitude <= 0) continue;

      // Calculate how much light enters through each window
      for (const win of resolvedWindows) {
        const windowLux = this.calculateWindowLux(win, solar, roomConfig);

        // For each grid cell, trace from window to cell and check obstruction
        for (let gx = 0; gx < gridWidth; gx++) {
          for (let gz = 0; gz < gridDepth; gz++) {
            const cellX = (gx + 0.5) * gridStep;
            const cellZ = (gz + 0.5) * gridStep;

            // Calculate light at this point from this window
            const dist = Math.sqrt(
              Math.pow(cellX - win.center.x, 2) + Math.pow(cellZ - win.center.z, 2)
            );

            // Distance-based falloff (inverse square, but capped for indoor)
            const distFactor = 1 / Math.max(1, dist * dist);

            // Check if tall items block the light path from window to cell
            const isBlocked = this.isPathBlocked(win.center, { x: cellX, z: cellZ }, tallItems);

            if (!isBlocked) {
              luxGrid[gx]![gz]! += windowLux * distFactor;
            }
          }
        }
      }
    }

    // Average lux over sample hours
    const numSamples = sampleHours.length;
    for (let gx = 0; gx < gridWidth; gx++) {
      for (let gz = 0; gz < gridDepth; gz++) {
        luxGrid[gx]![gz]! /= numSamples;
      }
    }

    // Classify zones into dark and well-lit
    const darkZones: ShadowAnalysis['darkZones'] = [];
    const wellLitZones: ShadowAnalysis['wellLitZones'] = [];

    const darkThreshold = 100; // lux, below this needs artificial light
    const wellLitThreshold = 300; // lux, above this is well-lit

    for (let gx = 0; gx < gridWidth; gx++) {
      for (let gz = 0; gz < gridDepth; gz++) {
        const cellX = (gx + 0.5) * gridStep;
        const cellZ = (gz + 0.5) * gridStep;
        const lux = luxGrid[gx]![gz]!;

        if (lux < darkThreshold) {
          darkZones.push({
            position: { x: Math.round(cellX * 100) / 100, z: Math.round(cellZ * 100) / 100 },
            radius: gridStep / 2,
            averageLuxHours: Math.round(lux),
            suggestion: this.getDarkZoneSuggestion(cellX, cellZ, items, roomConfig),
          });
        } else if (lux >= wellLitThreshold) {
          wellLitZones.push({
            position: { x: Math.round(cellX * 100) / 100, z: Math.round(cellZ * 100) / 100 },
            radius: gridStep / 2,
            averageLuxHours: Math.round(lux),
          });
        }
      }
    }

    // Determine task lighting needs
    const taskLightingNeeded = this.determineTaskLighting(
      items,
      luxGrid,
      gridStep,
      gridWidth,
      gridDepth
    );

    // Calculate natural light score
    const totalCells = gridWidth * gridDepth;
    const wellLitCells = wellLitZones.length;
    const naturalLightScore =
      totalCells > 0 ? Math.round(Math.min(100, (wellLitCells / totalCells) * 150)) : 0;

    // Generate recommendations
    const recommendations = this.generateShadowRecommendations(
      darkZones,
      wellLitZones,
      taskLightingNeeded,
      naturalLightScore,
      windowPositions
    );

    return {
      darkZones,
      wellLitZones,
      taskLightingNeeded,
      naturalLightScore,
      recommendations,
    };
  }

  /**
   * Resolve a window position description to world coordinates
   */
  private resolveWindowPosition(
    win: ShadowWindowPosition,
    roomConfig: RoomConfig
  ): { center: { x: number; z: number }; width: number; height: number; wall: string } {
    let cx: number;
    let cz: number;

    switch (win.wall) {
      case 'back':
        cx = win.position + win.width / 2;
        cz = 0;
        break;
      case 'front':
        cx = win.position + win.width / 2;
        cz = roomConfig.depth;
        break;
      case 'left':
        cx = 0;
        cz = win.position + win.width / 2;
        break;
      case 'right':
        cx = roomConfig.width;
        cz = win.position + win.width / 2;
        break;
      default:
        cx = win.position + win.width / 2;
        cz = 0;
    }

    return {
      center: { x: cx, z: cz },
      width: win.width,
      height: win.height,
      wall: win.wall,
    };
  }

  /**
   * Calculate lux output from a window based on sun position and facing angle
   */
  private calculateWindowLux(
    win: { center: { x: number; z: number }; width: number; height: number; wall: string },
    solar: SolarPosition,
    _roomConfig: RoomConfig
  ): number {
    // Base outdoor illuminance based on sun altitude (simplified)
    // Clear sky: ~100,000 lux at noon, proportional to sin(altitude)
    const altRad = solar.altitude * (Math.PI / 180);
    const outdoorLux = 100000 * Math.max(0, Math.sin(altRad));

    // Window transmittance (~70% for double glazing)
    const transmittance = 0.7;

    // Window area factor
    const windowArea = win.width * win.height;
    const areaFactor = Math.min(1, windowArea / 3); // normalize to ~3m2 reference

    // Sun facing factor: how much sun hits this wall
    const wallAzimuth = this.getWallAzimuth(win.wall);
    const azDiff = Math.abs(((solar.azimuth - wallAzimuth + 180) % 360) - 180);
    const facingFactor = Math.max(0.1, 1 - azDiff / 90); // minimum 10% (diffuse light)

    return outdoorLux * transmittance * areaFactor * facingFactor * solar.intensity;
  }

  /**
   * Get the approximate azimuth (degrees from North) that a wall faces
   */
  private getWallAzimuth(wall: string): number {
    // Using the room orientation from config, but simplified here:
    // back wall faces South (180), front faces North (0), left faces East (90), right faces West (270)
    switch (wall) {
      case 'back':
        return 180;
      case 'front':
        return 0;
      case 'left':
        return 90;
      case 'right':
        return 270;
      default:
        return 180;
    }
  }

  /**
   * Check if the path from a window to a point is blocked by tall items
   */
  private isPathBlocked(
    from: { x: number; z: number },
    to: { x: number; z: number },
    tallItems: PlacedItem3D[]
  ): boolean {
    // Ray-march from window to point and check intersection with tall items
    const steps = 10;

    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const px = from.x + t * (to.x - from.x);
      const pz = from.z + t * (to.z - from.z);

      for (const item of tallItems) {
        const halfW = item.dimensions.width / 2;
        const halfD = item.dimensions.depth / 2;

        if (
          px >= item.position.x - halfW &&
          px <= item.position.x + halfW &&
          pz >= item.position.z - halfD &&
          pz <= item.position.z + halfD
        ) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Generate a suggestion for a dark zone based on its location
   */
  private getDarkZoneSuggestion(
    x: number,
    z: number,
    items: PlacedItem3D[],
    roomConfig: RoomConfig
  ): string {
    // Check if near a wall (likely under wall cabinets)
    const nearBackWall = z < 0.6;
    const nearLeftWall = x < 0.6;
    const nearRightWall = x > roomConfig.width - 0.6;

    // Check if there are wall cabinets above this position
    const hasWallCabinetAbove = items.some((item) => {
      const isWallCabinet = ['wall_cabinet', 'wall', 'upper', 'upper_cabinet'].includes(item.type);
      if (!isWallCabinet) return false;
      const halfW = item.dimensions.width / 2;
      return Math.abs(x - item.position.x) < halfW + 0.2;
    });

    if (hasWallCabinetAbove && nearBackWall) {
      return 'Install under-cabinet LED strip lighting to illuminate the counter below';
    }

    if (nearBackWall || nearLeftWall || nearRightWall) {
      return 'Add recessed or track lighting to illuminate this wall area';
    }

    // Center of room
    return 'Add pendant or recessed ceiling light to illuminate this area';
  }

  /**
   * Determine task lighting needs based on work area positions and natural light
   */
  private determineTaskLighting(
    items: PlacedItem3D[],
    luxGrid: number[][],
    gridStep: number,
    gridWidth: number,
    gridDepth: number
  ): ShadowAnalysis['taskLightingNeeded'] {
    const taskLighting: ShadowAnalysis['taskLightingNeeded'] = [];
    const taskLightThreshold = 500; // lux needed for kitchen tasks (AS/NZS, EN 12464)

    // Helper to get average lux around a position
    const getAvgLux = (px: number, pz: number): number => {
      const gx = Math.floor(px / gridStep);
      const gz = Math.floor(pz / gridStep);
      if (gx >= 0 && gx < gridWidth && gz >= 0 && gz < gridDepth) {
        return luxGrid[gx]![gz]!;
      }
      return 0;
    };

    // Check prep areas (countertops near sink)
    const sinkItems = items.filter((i) => i.type === 'sink' || i.type === 'sink_base');
    for (const sink of sinkItems) {
      const luxAtSink = getAvgLux(sink.position.x, sink.position.z);
      if (luxAtSink < taskLightThreshold) {
        taskLighting.push({
          area: 'prep_area',
          reason: `Natural light at prep area near sink is insufficient (${Math.round(luxAtSink)} lux, recommended ${taskLightThreshold} lux)`,
          type: 'under_cabinet',
          suggestedLumens: 800,
        });
      }
    }

    // Cooktop always needs task lighting regardless of natural light
    const cooktops = items.filter((i) => ['cooktop', 'stove', 'hob'].includes(i.type));
    for (const cooktop of cooktops) {
      const luxAtCooktop = getAvgLux(cooktop.position.x, cooktop.position.z);
      taskLighting.push({
        area: 'cooktop',
        reason:
          luxAtCooktop < taskLightThreshold
            ? `Cooktop area requires dedicated task lighting (current ${Math.round(luxAtCooktop)} lux, cooking requires ${taskLightThreshold}+ lux)`
            : 'Cooktop area always requires dedicated task lighting for safety regardless of natural light level',
        type: 'recessed',
        suggestedLumens: 1000,
      });
    }

    // Sink area
    for (const sink of sinkItems) {
      const luxAtSink = getAvgLux(sink.position.x, sink.position.z);
      if (luxAtSink < taskLightThreshold) {
        taskLighting.push({
          area: 'sink',
          reason: `Sink area needs supplemental lighting (${Math.round(luxAtSink)} lux, recommended ${taskLightThreshold} lux for cleaning tasks)`,
          type: 'pendant',
          suggestedLumens: 600,
        });
      }
    }

    // Check island/peninsula if present
    const islands = items.filter((i) => i.type.includes('island') || i.type.includes('peninsula'));
    for (const island of islands) {
      const luxAtIsland = getAvgLux(island.position.x, island.position.z);
      if (luxAtIsland < taskLightThreshold) {
        taskLighting.push({
          area: 'prep_area',
          reason: `Island/peninsula work surface needs task lighting (${Math.round(luxAtIsland)} lux)`,
          type: 'pendant',
          suggestedLumens: 900,
        });
      }
    }

    return taskLighting;
  }

  /**
   * Generate recommendations based on shadow analysis results
   */
  private generateShadowRecommendations(
    darkZones: ShadowAnalysis['darkZones'],
    wellLitZones: ShadowAnalysis['wellLitZones'],
    taskLighting: ShadowAnalysis['taskLightingNeeded'],
    naturalLightScore: number,
    windowPositions: ShadowWindowPosition[]
  ): string[] {
    const recommendations: string[] = [];

    // Natural light assessment
    if (naturalLightScore >= 70) {
      recommendations.push(
        'The kitchen has good natural light coverage. Focus on task lighting for work areas.'
      );
    } else if (naturalLightScore >= 40) {
      recommendations.push(
        'The kitchen has moderate natural light. Consider adding ambient ceiling lighting and task lights at work zones.'
      );
    } else {
      recommendations.push(
        'The kitchen has limited natural light. A comprehensive lighting plan with ambient, task, and accent lighting is recommended.'
      );
    }

    // Window recommendations
    if (windowPositions.length === 0) {
      recommendations.push(
        'No windows detected — the kitchen relies entirely on artificial lighting. Consider adding a window or skylight if structurally possible.'
      );
    } else if (windowPositions.length === 1) {
      recommendations.push(
        'Only one window detected — consider supplementary lighting on the opposite side of the kitchen.'
      );
    }

    // Dark zone remediation
    if (darkZones.length > 0) {
      const darkPercentage = Math.round(
        (darkZones.length / (darkZones.length + wellLitZones.length + 1)) * 100
      );
      recommendations.push(
        `${darkPercentage}% of the kitchen area has insufficient natural light. Under-cabinet and recessed lighting recommended.`
      );
    }

    // Task lighting summary
    const needsUnderCabinet = taskLighting.some((t) => t.type === 'under_cabinet');
    const needsPendant = taskLighting.some((t) => t.type === 'pendant');
    const needsRecessed = taskLighting.some((t) => t.type === 'recessed');

    if (needsUnderCabinet) {
      recommendations.push(
        'Install under-cabinet LED strip lighting along all wall cabinet runs for shadow-free counter illumination.'
      );
    }
    if (needsPendant) {
      recommendations.push(
        'Pendant lighting is recommended over the sink and/or island for focused task illumination.'
      );
    }
    if (needsRecessed) {
      recommendations.push(
        'Recessed downlights are recommended above the cooktop area for safe cooking illumination.'
      );
    }

    return recommendations;
  }

  // --- Internals ---

  private applySolar(solar: SolarPosition): void {
    const rgb = SolarCalculator.colorTemperatureToRGB(solar.colorTemperature);
    const sunColor = new THREE.Color(rgb.r, rgb.g, rgb.b);

    // Sun position
    const altRad = solar.altitude * (Math.PI / 180);
    const azRad = (solar.azimuth - this.config.roomOrientation) * (Math.PI / 180);
    const dist = 15;

    this.sunLight.position.set(
      dist * Math.cos(altRad) * Math.sin(azRad),
      dist * Math.sin(altRad),
      dist * Math.cos(altRad) * Math.cos(azRad)
    );
    this.sunLight.color.copy(sunColor);
    this.sunLight.intensity = solar.intensity * 2;

    // Ambient — darker at sunrise/sunset
    this.ambientLight.intensity = 0.15 + solar.intensity * 0.25;
    this.ambientLight.color.copy(sunColor).multiplyScalar(0.3);

    // Hemisphere — sky color varies
    const skyColor = new THREE.Color().lerpColors(
      new THREE.Color(0x1a1a2e), // night
      new THREE.Color(0x87ceeb), // day
      solar.intensity
    );
    this.hemisphereLight.color.copy(skyColor);
    this.hemisphereLight.intensity = 0.2 + solar.intensity * 0.4;
  }

  private updateWindowLight(window: WindowDefinition, solar: SolarPosition): void {
    const light = this.windowLights.get(window.id);
    if (!light) return;

    // Calculate how much sun hits this window
    const windowFacing = window.orientation;
    const sunAz = solar.azimuth;
    const angleDiff = Math.abs(((sunAz - windowFacing + 180) % 360) - 180);

    // Window receives more light when facing the sun
    const facingFactor = Math.max(0, 1 - angleDiff / 90);
    const intensity = solar.intensity * facingFactor * 1.5;

    const rgb = SolarCalculator.colorTemperatureToRGB(solar.colorTemperature);
    light.color.setRGB(rgb.r, rgb.g, rgb.b);
    light.intensity = 0.2 + intensity;
    light.position.copy(window.position);
  }
}
