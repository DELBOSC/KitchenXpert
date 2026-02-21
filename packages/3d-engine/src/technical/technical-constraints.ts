import * as THREE from 'three';
import { generateId } from '../utils/generate-id';

/**
 * Types de points techniques
 */
export type TechnicalPointType = 'water' | 'electric' | 'gas' | 'ventilation';

export type TechnicalPointSubtype =
  | 'water_cold'
  | 'water_hot'
  | 'water_drain'
  | 'electric_16a'
  | 'electric_20a'
  | 'electric_32a'
  | 'gas_inlet'
  | 'vmc_duct'
  | 'extraction_duct';

export interface TechnicalPoint {
  id: string;
  type: TechnicalPointType;
  subtype: TechnicalPointSubtype;
  position: THREE.Vector3;
  wallId?: string;
  metadata?: Record<string, unknown>;
}

export interface TechnicalPointJSON {
  id: string;
  type: TechnicalPointType;
  subtype: TechnicalPointSubtype;
  position: { x: number; y: number; z: number };
  wallId?: string;
  metadata?: Record<string, unknown>;
}

export interface DisplacementCost {
  cost: number;
  nearestPoint: TechnicalPoint | null;
  distance: number;
  breakdown: string;
}

export interface ItemDisplacementDetail {
  type: string;
  subtype: string;
  distance: number;
  cost: number;
}

export interface ItemDisplacementCostResult {
  totalCost: number;
  details: ItemDisplacementDetail[];
}

/**
 * Couleurs par type de point technique
 */
const TYPE_COLORS: Record<TechnicalPointType, number> = {
  water: 0x3b82f6,      // bleu
  electric: 0xeab308,   // jaune
  gas: 0xef4444,        // rouge
  ventilation: 0x9ca3af, // gris
};

/**
 * Regles de cout de deplacement
 */
const DISPLACEMENT_COSTS: Record<TechnicalPointSubtype, { baseCost: number; perMeterCost: number; freeDistance: number }> = {
  water_cold:      { baseCost: 150, perMeterCost: 100, freeDistance: 2.0 },
  water_hot:       { baseCost: 150, perMeterCost: 100, freeDistance: 2.0 },
  water_drain:     { baseCost: 200, perMeterCost: 150, freeDistance: 1.5 },
  electric_16a:    { baseCost: 150, perMeterCost: 0,   freeDistance: Infinity },
  electric_20a:    { baseCost: 250, perMeterCost: 0,   freeDistance: Infinity },
  electric_32a:    { baseCost: 300, perMeterCost: 0,   freeDistance: Infinity },
  gas_inlet:       { baseCost: 400, perMeterCost: 200, freeDistance: 1.0 },
  vmc_duct:        { baseCost: 350, perMeterCost: 0,   freeDistance: Infinity },
  extraction_duct: { baseCost: 350, perMeterCost: 0,   freeDistance: Infinity },
};

/**
 * Mapping type d'item cuisine → types de points techniques requis
 */
const ITEM_TECHNICAL_NEEDS: Record<string, TechnicalPointSubtype[]> = {
  sink:         ['water_cold', 'water_hot', 'water_drain'],
  sink_base:    ['water_cold', 'water_hot', 'water_drain'],
  dishwasher:   ['water_cold', 'water_drain', 'electric_16a'],
  cooktop:      ['electric_32a'],
  stove:        ['gas_inlet'],
  hob:          ['electric_32a'],
  hood:         ['electric_16a', 'extraction_duct'],
  range_hood:   ['electric_16a', 'extraction_duct'],
  refrigerator: ['electric_16a'],
  fridge:       ['electric_16a'],
  oven:         ['electric_20a'],
  microwave:    ['electric_16a'],
};

/**
 * Gestionnaire de contraintes techniques (plomberie, electricite, gaz, ventilation)
 */
export class TechnicalConstraints {
  private points: Map<string, TechnicalPoint> = new Map();
  private scene: THREE.Scene;
  private spriteGroup: THREE.Group;
  private visible: boolean = true;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.spriteGroup = new THREE.Group();
    this.spriteGroup.name = '__technical_points__';
    this.scene.add(this.spriteGroup);
  }

  // --- CRUD ---

  addPoint(point: TechnicalPoint): void {
    this.points.set(point.id, point);
    this.addSprite(point);
  }

  removePoint(id: string): TechnicalPoint | undefined {
    const point = this.points.get(id);
    if (point) {
      this.points.delete(id);
      this.removeSprite(id);
    }
    return point;
  }

  updatePoint(id: string, updates: Partial<Omit<TechnicalPoint, 'id'>>): void {
    const point = this.points.get(id);
    if (!point) return;

    if (updates.position) point.position.copy(updates.position);
    if (updates.type !== undefined) point.type = updates.type;
    if (updates.subtype !== undefined) point.subtype = updates.subtype;
    if (updates.wallId !== undefined) point.wallId = updates.wallId;
    if (updates.metadata !== undefined) point.metadata = updates.metadata;

    // Re-render sprite
    this.removeSprite(id);
    this.addSprite(point);
  }

  getPoint(id: string): TechnicalPoint | undefined {
    return this.points.get(id);
  }

  getAllPoints(): TechnicalPoint[] {
    return Array.from(this.points.values());
  }

  getPointsByType(type: TechnicalPointType): TechnicalPoint[] {
    return this.getAllPoints().filter((p) => p.type === type);
  }

  // --- Queries ---

  findNearestPoint(position: THREE.Vector3, type?: TechnicalPointType): { point: TechnicalPoint; distance: number } | null {
    let nearest: TechnicalPoint | null = null;
    let minDist = Infinity;

    for (const point of this.points.values()) {
      if (type && point.type !== type) continue;
      const dist = position.distanceTo(point.position);
      if (dist < minDist) {
        minDist = dist;
        nearest = point;
      }
    }

    return nearest ? { point: nearest, distance: minDist } : null;
  }

  findNearestPointBySubtype(position: THREE.Vector3, subtype: TechnicalPointSubtype): { point: TechnicalPoint; distance: number } | null {
    let nearest: TechnicalPoint | null = null;
    let minDist = Infinity;

    for (const point of this.points.values()) {
      if (point.subtype !== subtype) continue;
      const dist = position.distanceTo(point.position);
      if (dist < minDist) {
        minDist = dist;
        nearest = point;
      }
    }

    return nearest ? { point: nearest, distance: minDist } : null;
  }

  getPointsInRadius(position: THREE.Vector3, radius: number, type?: TechnicalPointType): TechnicalPoint[] {
    return this.getAllPoints().filter((p) => {
      if (type && p.type !== type) return false;
      return position.distanceTo(p.position) <= radius;
    });
  }

  // --- Cout de deplacement ---

  /**
   * Calcule le cout estime de deplacement technique pour un item
   */
  calculateDisplacementCost(itemPosition: THREE.Vector3, itemType: string): DisplacementCost {
    const needs = ITEM_TECHNICAL_NEEDS[itemType];
    if (!needs || needs.length === 0) {
      return { cost: 0, nearestPoint: null, distance: 0, breakdown: 'Aucun raccordement technique requis.' };
    }

    let totalCost = 0;
    const breakdownParts: string[] = [];
    let closestPoint: TechnicalPoint | null = null;
    let closestDist = Infinity;

    for (const subtype of needs) {
      const nearest = this.findNearestPointBySubtype(itemPosition, subtype);
      const costRule = DISPLACEMENT_COSTS[subtype]!;

      if (!nearest) {
        // No point of this subtype — new line needed
        totalCost += costRule.baseCost;
        breakdownParts.push(`${subtype}: nouvelle ligne +${costRule.baseCost}€`);
      } else {
        const dist = nearest.distance;
        if (dist < closestDist) {
          closestDist = dist;
          closestPoint = nearest.point;
        }

        if (dist <= costRule.freeDistance) {
          breakdownParts.push(`${subtype}: raccordement existant (${Math.round(dist * 1000)} mm)`);
        } else {
          const extraMeters = dist - costRule.freeDistance;
          const cost = costRule.baseCost + Math.ceil(extraMeters) * costRule.perMeterCost;
          totalCost += cost;
          breakdownParts.push(`${subtype}: deplacement ${Math.round(dist * 1000)} mm → +${cost}€`);
        }
      }
    }

    return {
      cost: totalCost,
      nearestPoint: closestPoint,
      distance: closestDist === Infinity ? 0 : closestDist,
      breakdown: breakdownParts.join('\n'),
    };
  }

  /**
   * Calculates the displacement cost for a single item being moved to a new position.
   * Used for real-time feedback while dragging.
   *
   * For each technical point type required by the item, finds the nearest existing
   * technical point and computes the cost based on: baseCost + max(0, distance - freeDistance) * costPerMeter.
   */
  calculateItemDisplacementCost(
    itemType: string,
    itemPosition: { x: number; y: number; z: number },
    existingTechnicalPoints: TechnicalPoint[]
  ): ItemDisplacementCostResult {
    const needs = ITEM_TECHNICAL_NEEDS[itemType];
    if (!needs || needs.length === 0) {
      return { totalCost: 0, details: [] };
    }

    const pos = new THREE.Vector3(itemPosition.x, itemPosition.y, itemPosition.z);
    let totalCost = 0;
    const details: ItemDisplacementDetail[] = [];

    for (const subtype of needs) {
      const costRule = DISPLACEMENT_COSTS[subtype]!;

      // Find nearest existing technical point of this subtype from provided list
      let nearestDist = Infinity;
      for (const tp of existingTechnicalPoints) {
        if (tp.subtype !== subtype) continue;
        const dist = pos.distanceTo(tp.position);
        if (dist < nearestDist) {
          nearestDist = dist;
        }
      }

      // Also check points managed by this instance
      const managed = this.findNearestPointBySubtype(pos, subtype);
      if (managed && managed.distance < nearestDist) {
        nearestDist = managed.distance;
      }

      let cost: number;
      if (nearestDist === Infinity) {
        // No point of this subtype exists — new line needed
        cost = costRule.baseCost;
      } else if (nearestDist <= costRule.freeDistance) {
        // Within free distance — no cost
        cost = 0;
      } else {
        // Beyond free distance — apply displacement formula
        const extraMeters = nearestDist - costRule.freeDistance;
        cost = costRule.baseCost + Math.max(0, extraMeters) * costRule.perMeterCost;
      }

      // Derive the parent type from the subtype prefix
      const parentType = subtype.split('_')[0] || subtype;

      totalCost += cost;
      details.push({
        type: parentType,
        subtype,
        distance: nearestDist === Infinity ? -1 : nearestDist,
        cost,
      });
    }

    return { totalCost, details };
  }

  /**
   * Calcule le cout total pour tous les items de la scene
   */
  calculateTotalDisplacementCost(items: Array<{ position: THREE.Vector3; type: string }>): number {
    let total = 0;
    for (const item of items) {
      const result = this.calculateDisplacementCost(item.position, item.type);
      total += result.cost;
    }
    return total;
  }

  // --- Auto-generation ---

  /**
   * Auto-generates required technical points when an item is placed.
   * Returns the technical points that need to be created.
   *
   * For each required technical subtype:
   * 1. Checks if a compatible point already exists within 50cm (0.5m)
   * 2. If not, finds the nearest wall position and creates a new point there
   */
  autoGenerateTechnicalPoints(
    itemType: string,
    itemPosition: { x: number; y: number; z: number },
    walls: Array<{ start: { x: number; z: number }; end: { x: number; z: number } }>
  ): TechnicalPoint[] {
    const needs = ITEM_TECHNICAL_NEEDS[itemType];
    if (!needs || needs.length === 0) {
      return [];
    }

    const itemPos = new THREE.Vector3(itemPosition.x, itemPosition.y, itemPosition.z);
    const generatedPoints: TechnicalPoint[] = [];
    const EXISTING_PROXIMITY_THRESHOLD = 0.5; // 50cm in meters

    for (const subtype of needs) {
      // Skip if a compatible point already exists within 50cm
      const existing = this.findNearestPointBySubtype(itemPos, subtype);
      if (existing && existing.distance <= EXISTING_PROXIMITY_THRESHOLD) {
        continue;
      }

      // Find the nearest wall position for the new point
      const wallPoint = this.findNearestWallPoint(
        { x: itemPosition.x, z: itemPosition.z },
        walls
      );

      const pointType = this.subtypeToType(subtype);

      const newPoint: TechnicalPoint = {
        id: generateId(`tp-${subtype}`),
        type: pointType,
        subtype,
        position: new THREE.Vector3(wallPoint.x, wallPoint.y, wallPoint.z),
      };

      generatedPoints.push(newPoint);
    }

    return generatedPoints;
  }

  /**
   * Finds the nearest point on any wall segment to the given position.
   * Projects the position onto each wall segment and returns the closest projected point.
   * The Y coordinate is set to a standard height based on typical kitchen installations.
   */
  private findNearestWallPoint(
    position: { x: number; z: number },
    walls: Array<{ start: { x: number; z: number }; end: { x: number; z: number } }>
  ): { x: number; y: number; z: number } {
    let bestPoint = { x: position.x, y: 0.5, z: position.z };
    let bestDist = Infinity;

    for (const wall of walls) {
      // Vector from wall start to wall end
      const dx = wall.end.x - wall.start.x;
      const dz = wall.end.z - wall.start.z;
      const lengthSq = dx * dx + dz * dz;

      if (lengthSq === 0) {
        // Degenerate wall (zero length), treat start as the point
        const dist = Math.hypot(position.x - wall.start.x, position.z - wall.start.z);
        if (dist < bestDist) {
          bestDist = dist;
          bestPoint = { x: wall.start.x, y: 0.5, z: wall.start.z };
        }
        continue;
      }

      // Project position onto the wall segment, clamped to [0, 1]
      const t = Math.max(
        0,
        Math.min(
          1,
          ((position.x - wall.start.x) * dx + (position.z - wall.start.z) * dz) / lengthSq
        )
      );

      const projX = wall.start.x + t * dx;
      const projZ = wall.start.z + t * dz;
      const dist = Math.hypot(position.x - projX, position.z - projZ);

      if (dist < bestDist) {
        bestDist = dist;
        bestPoint = { x: projX, y: 0.5, z: projZ };
      }
    }

    return bestPoint;
  }

  /**
   * Maps a TechnicalPointSubtype to its parent TechnicalPointType.
   */
  private subtypeToType(subtype: TechnicalPointSubtype): TechnicalPointType {
    if (subtype.startsWith('water_')) return 'water';
    if (subtype.startsWith('electric_')) return 'electric';
    if (subtype === 'gas_inlet') return 'gas';
    // vmc_duct, extraction_duct
    return 'ventilation';
  }

  // --- Serialisation ---

  toJSON(): TechnicalPointJSON[] {
    return this.getAllPoints().map((p) => ({
      id: p.id,
      type: p.type,
      subtype: p.subtype,
      position: { x: p.position.x, y: p.position.y, z: p.position.z },
      wallId: p.wallId,
      metadata: p.metadata,
    }));
  }

  fromJSON(data: TechnicalPointJSON[]): void {
    this.clearAll();
    for (const item of data) {
      this.addPoint({
        ...item,
        position: new THREE.Vector3(item.position.x, item.position.y, item.position.z),
      });
    }
  }

  // --- Visibilite ---

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.spriteGroup.visible = visible;
  }

  isVisible(): boolean {
    return this.visible;
  }

  // --- Nettoyage ---

  clearAll(): void {
    this.points.clear();
    while (this.spriteGroup.children.length > 0) {
      const child = this.spriteGroup.children[0]!;
      if (child instanceof THREE.Sprite) {
        child.material.dispose();
        if (child.material.map) child.material.map.dispose();
      }
      this.spriteGroup.remove(child);
    }
  }

  dispose(): void {
    this.clearAll();
    this.scene.remove(this.spriteGroup);
  }

  // --- Rendu sprites ---

  private addSprite(point: TechnicalPoint): void {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    const color = TYPE_COLORS[point.type];
    const colorStr = `#${color.toString(16).padStart(6, '0')}`;

    // Cercle exterieur
    ctx.beginPath();
    ctx.arc(32, 32, 28, 0, Math.PI * 2);
    ctx.fillStyle = colorStr;
    ctx.globalAlpha = 0.9;
    ctx.fill();

    // Bordure blanche
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Symbole central
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const symbols: Record<TechnicalPointType, string> = {
      water: '\u2206',      // triangle (drop-like)
      electric: '\u26A1',   // lightning
      gas: '\u2622',        // fire-like
      ventilation: '\u25CB', // circle
    };
    ctx.fillText(symbols[point.type] || '?', 32, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(point.position);
    sprite.scale.set(0.15, 0.15, 0.15);
    sprite.userData = { technicalPointId: point.id, type: 'technical_point' };
    sprite.renderOrder = 10;

    this.spriteGroup.add(sprite);
  }

  private removeSprite(id: string): void {
    const sprite = this.spriteGroup.children.find(
      (c) => c.userData.technicalPointId === id
    );
    if (sprite) {
      if (sprite instanceof THREE.Sprite) {
        sprite.material.dispose();
        if (sprite.material.map) sprite.material.map.dispose();
      }
      this.spriteGroup.remove(sprite);
    }
  }
}
