import * as THREE from 'three';

/**
 * Types de snap magnetique
 */
export type SnapType = 'grid' | 'wall' | 'corner' | 'alignment' | 'face' | 'anchor';

/**
 * Resultat d'un snap
 */
export interface SnapResult {
  position: THREE.Vector3;
  snappedAxes: ('x' | 'y' | 'z')[];
  snapType: SnapType | null;
  snapDistance: number;
  guides: SnapGuide[];
}

/**
 * Guide visuel pour le snap
 */
export interface SnapGuide {
  start: THREE.Vector3;
  end: THREE.Vector3;
  type: SnapType;
  color: number;
}

/**
 * Point d'ancrage
 */
export interface SnapAnchor {
  position: THREE.Vector3;
  normal: THREE.Vector3;
  wallId: string;
  type: 'wall' | 'corner' | 'island';
}

/**
 * Configuration du systeme de snap
 */
export interface SnapConfig {
  gridSize: number;
  snapDistance: number;
  enabledSnaps: Set<SnapType>;
}

/**
 * Systeme de snap magnetique professionnel
 * 6 types : grille, mur, coin, alignement, face-a-face, ancrage
 */
export class SnapSystem {
  private config: SnapConfig;
  private walls: THREE.Object3D[] = [];
  private anchors: SnapAnchor[] = [];
  private guides: THREE.Line[] = [];
  private guidesGroup: THREE.Group;
  private scene: THREE.Scene;

  /**
   * Standard kitchen heights in meters for constraint-based snapping
   */
  private static readonly STANDARD_HEIGHTS = {
    WORKTOP: 0.85,              // 850mm - standard countertop
    WALL_CABINET_BOTTOM: 1.4,   // 1400mm - bottom of wall cabinets
    WALL_CABINET_TOP: 2.2,      // 2200mm - top of wall cabinets
    PLINTH: 0.1,                // 100mm - plinth height
    SPLASH_BACK: 0.9,           // 900mm - splash back height
  };

  constructor(scene: THREE.Scene, config?: Partial<SnapConfig>) {
    this.scene = scene;
    this.config = {
      gridSize: config?.gridSize ?? 0.001,  // 1mm precision
      snapDistance: config?.snapDistance ?? 0.05, // 5cm tolerance
      enabledSnaps: config?.enabledSnaps ?? new Set<SnapType>(['grid', 'wall', 'corner', 'alignment', 'face', 'anchor']),
    };

    this.guidesGroup = new THREE.Group();
    this.guidesGroup.name = '__snap_guides__';
    this.scene.add(this.guidesGroup);
  }

  /**
   * Effectue le snap d'une position
   */
  snap(
    position: THREE.Vector3,
    object: THREE.Object3D,
    sceneObjects: Map<string, THREE.Object3D>
  ): SnapResult {
    const result: SnapResult = {
      position: position.clone(),
      snappedAxes: [],
      snapType: null,
      snapDistance: Infinity,
      guides: [],
    };

    const objectBox = new THREE.Box3().setFromObject(object);
    const objectSize = objectBox.getSize(new THREE.Vector3());

    // Priorite : anchor > corner > wall > face > alignment > grid
    const snapResults: { result: SnapResult; priority: number }[] = [];

    if (this.config.enabledSnaps.has('anchor')) {
      const anchorSnap = this.snapToAnchor(position, objectSize);
      if (anchorSnap) snapResults.push({ result: anchorSnap, priority: 6 });
    }

    if (this.config.enabledSnaps.has('corner')) {
      const cornerSnap = this.snapToCorner(position, objectSize);
      if (cornerSnap) snapResults.push({ result: cornerSnap, priority: 5 });
    }

    if (this.config.enabledSnaps.has('wall')) {
      const wallSnap = this.snapToWall(position, objectSize);
      if (wallSnap) snapResults.push({ result: wallSnap, priority: 4 });
    }

    if (this.config.enabledSnaps.has('face')) {
      const faceSnap = this.snapToFace(position, object, sceneObjects);
      if (faceSnap) snapResults.push({ result: faceSnap, priority: 3 });
    }

    if (this.config.enabledSnaps.has('alignment')) {
      const alignSnap = this.snapToAlignment(position, object, sceneObjects);
      if (alignSnap) snapResults.push({ result: alignSnap, priority: 2 });
    }

    if (this.config.enabledSnaps.has('grid')) {
      const gridSnap = this.snapToGrid(position);
      snapResults.push({ result: gridSnap, priority: 1 });
    }

    // Choose the best snap (highest priority within snap distance)
    snapResults.sort((a, b) => b.priority - a.priority);

    for (const sr of snapResults) {
      if (sr.result.snapDistance <= this.config.snapDistance) {
        return sr.result;
      }
    }

    // Fallback to grid snap if nothing else matches
    const gridResult = snapResults.find((sr) => sr.result.snapType === 'grid');
    return gridResult?.result ?? result;
  }

  /**
   * Snap a la grille
   */
  private snapToGrid(position: THREE.Vector3): SnapResult {
    const gs = this.config.gridSize;
    const snapped = new THREE.Vector3(
      Math.round(position.x / gs) * gs,
      position.y,
      Math.round(position.z / gs) * gs
    );

    return {
      position: snapped,
      snappedAxes: ['x', 'z'],
      snapType: 'grid',
      snapDistance: position.distanceTo(snapped),
      guides: [],
    };
  }

  /**
   * Snap au mur le plus proche
   */
  private snapToWall(position: THREE.Vector3, objectSize: THREE.Vector3): SnapResult | null {
    let bestSnap: SnapResult | null = null;
    let bestDist = this.config.snapDistance;

    for (const wall of this.walls) {
      const wallBox = new THREE.Box3().setFromObject(wall);
      const wallCenter = wallBox.getCenter(new THREE.Vector3());
      const wallSize = wallBox.getSize(new THREE.Vector3());

      // Determine wall orientation
      const isXWall = wallSize.x > wallSize.z;

      if (isXWall) {
        // Wall runs along X axis - snap Z
        const wallZ = wallCenter.z;
        const snapZ = wallZ > position.z
          ? wallZ - objectSize.z / 2
          : wallZ + objectSize.z / 2;
        const dist = Math.abs(position.z - snapZ);

        if (dist < bestDist) {
          bestDist = dist;
          bestSnap = {
            position: new THREE.Vector3(position.x, position.y, snapZ),
            snappedAxes: ['z'],
            snapType: 'wall',
            snapDistance: dist,
            guides: [{
              start: new THREE.Vector3(wallBox.min.x, 0.01, snapZ),
              end: new THREE.Vector3(wallBox.max.x, 0.01, snapZ),
              type: 'wall',
              color: 0x00ff00,
            }],
          };
        }
      } else {
        // Wall runs along Z axis - snap X
        const wallX = wallCenter.x;
        const snapX = wallX > position.x
          ? wallX - objectSize.x / 2
          : wallX + objectSize.x / 2;
        const dist = Math.abs(position.x - snapX);

        if (dist < bestDist) {
          bestDist = dist;
          bestSnap = {
            position: new THREE.Vector3(snapX, position.y, position.z),
            snappedAxes: ['x'],
            snapType: 'wall',
            snapDistance: dist,
            guides: [{
              start: new THREE.Vector3(snapX, 0.01, wallBox.min.z),
              end: new THREE.Vector3(snapX, 0.01, wallBox.max.z),
              type: 'wall',
              color: 0x00ff00,
            }],
          };
        }
      }
    }

    return bestSnap;
  }

  /**
   * Snap aux coins
   */
  private snapToCorner(position: THREE.Vector3, objectSize: THREE.Vector3): SnapResult | null {
    const corners: THREE.Vector3[] = [];

    // Find corners from wall intersections
    for (let i = 0; i < this.walls.length; i++) {
      for (let j = i + 1; j < this.walls.length; j++) {
        const boxA = new THREE.Box3().setFromObject(this.walls[i]!);
        const boxB = new THREE.Box3().setFromObject(this.walls[j]!);

        // Check if walls meet at a corner
        if (boxA.intersectsBox(boxB)) {
          const intersection = boxA.clone().intersect(boxB);
          const center = intersection.getCenter(new THREE.Vector3());
          corners.push(center);
        }
      }
    }

    let bestSnap: SnapResult | null = null;
    let bestDist = this.config.snapDistance;

    for (const corner of corners) {
      // Position object in the corner, offset by half size
      const snapped = new THREE.Vector3(
        corner.x + (position.x > corner.x ? objectSize.x / 2 : -objectSize.x / 2),
        position.y,
        corner.z + (position.z > corner.z ? objectSize.z / 2 : -objectSize.z / 2)
      );

      const dist = position.distanceTo(snapped);
      if (dist < bestDist) {
        bestDist = dist;
        bestSnap = {
          position: snapped,
          snappedAxes: ['x', 'z'],
          snapType: 'corner',
          snapDistance: dist,
          guides: [{
            start: new THREE.Vector3(corner.x, 0.01, corner.z),
            end: snapped.clone().setY(0.01),
            type: 'corner',
            color: 0xff8800,
          }],
        };
      }
    }

    return bestSnap;
  }

  /**
   * Snap face-a-face (meuble contre meuble)
   */
  private snapToFace(
    position: THREE.Vector3,
    object: THREE.Object3D,
    sceneObjects: Map<string, THREE.Object3D>
  ): SnapResult | null {
    const objectBox = new THREE.Box3().setFromObject(object);
    const objectSize = objectBox.getSize(new THREE.Vector3());
    const objectId = object.userData.id;

    let bestSnap: SnapResult | null = null;
    let bestDist = this.config.snapDistance;

    for (const [id, other] of sceneObjects) {
      if (id === objectId) continue;
      if (other.userData.type === 'wall' || other.userData.type === 'floor') continue;

      const otherBox = new THREE.Box3().setFromObject(other);
      const otherSize = otherBox.getSize(new THREE.Vector3());
      const otherCenter = otherBox.getCenter(new THREE.Vector3());

      // Check each face pair
      const faces = [
        { axis: 'x' as const, dir: 1, snapPos: otherCenter.x + otherSize.x / 2 + objectSize.x / 2 },
        { axis: 'x' as const, dir: -1, snapPos: otherCenter.x - otherSize.x / 2 - objectSize.x / 2 },
        { axis: 'z' as const, dir: 1, snapPos: otherCenter.z + otherSize.z / 2 + objectSize.z / 2 },
        { axis: 'z' as const, dir: -1, snapPos: otherCenter.z - otherSize.z / 2 - objectSize.z / 2 },
      ];

      for (const face of faces) {
        const dist = Math.abs(position[face.axis] - face.snapPos);
        if (dist < bestDist) {
          bestDist = dist;
          const snappedPos = position.clone();
          snappedPos[face.axis] = face.snapPos;

          bestSnap = {
            position: snappedPos,
            snappedAxes: [face.axis],
            snapType: 'face',
            snapDistance: dist,
            guides: [{
              start: otherCenter.clone().setY(0.01),
              end: snappedPos.clone().setY(0.01),
              type: 'face',
              color: 0x0088ff,
            }],
          };
        }
      }
    }

    return bestSnap;
  }

  /**
   * Snap d'alignement avec les centres/bords des objets voisins
   */
  private snapToAlignment(
    position: THREE.Vector3,
    object: THREE.Object3D,
    sceneObjects: Map<string, THREE.Object3D>
  ): SnapResult | null {
    const objectId = object.userData.id;
    const guides: SnapGuide[] = [];
    const snappedPos = position.clone();
    let snappedAny = false;
    let minDist = this.config.snapDistance;

    for (const [id, other] of sceneObjects) {
      if (id === objectId) continue;
      if (other.userData.type === 'wall' || other.userData.type === 'floor') continue;

      const otherCenter = new THREE.Vector3();
      other.getWorldPosition(otherCenter);

      // X alignment (center to center)
      const dx = Math.abs(position.x - otherCenter.x);
      if (dx < this.config.snapDistance && dx < minDist) {
        snappedPos.x = otherCenter.x;
        snappedAny = true;
        minDist = dx;
        guides.push({
          start: new THREE.Vector3(otherCenter.x, 0.01, otherCenter.z),
          end: new THREE.Vector3(otherCenter.x, 0.01, position.z),
          type: 'alignment',
          color: 0xff0088,
        });
      }

      // Z alignment (center to center)
      const dz = Math.abs(position.z - otherCenter.z);
      if (dz < this.config.snapDistance && dz < minDist) {
        snappedPos.z = otherCenter.z;
        snappedAny = true;
        minDist = dz;
        guides.push({
          start: new THREE.Vector3(otherCenter.x, 0.01, otherCenter.z),
          end: new THREE.Vector3(position.x, 0.01, otherCenter.z),
          type: 'alignment',
          color: 0xff0088,
        });
      }
    }

    if (!snappedAny) return null;

    const snappedAxes: ('x' | 'y' | 'z')[] = [];
    if (snappedPos.x !== position.x) snappedAxes.push('x');
    if (snappedPos.z !== position.z) snappedAxes.push('z');

    return {
      position: snappedPos,
      snappedAxes,
      snapType: 'alignment',
      snapDistance: position.distanceTo(snappedPos),
      guides,
    };
  }

  /**
   * Snap aux points d'ancrage
   */
  private snapToAnchor(position: THREE.Vector3, _objectSize: THREE.Vector3): SnapResult | null {
    let bestSnap: SnapResult | null = null;
    let bestDist = this.config.snapDistance;

    for (const anchor of this.anchors) {
      const dist = position.distanceTo(anchor.position);
      if (dist < bestDist) {
        bestDist = dist;
        bestSnap = {
          position: anchor.position.clone(),
          snappedAxes: ['x', 'z'],
          snapType: 'anchor',
          snapDistance: dist,
          guides: [{
            start: anchor.position.clone().setY(0.01),
            end: position.clone().setY(0.01),
            type: 'anchor',
            color: 0xffff00,
          }],
        };
      }
    }

    return bestSnap;
  }

  /**
   * Met a jour les guides visuels dans la scene
   */
  updateGuides(snapResult: SnapResult): void {
    this.clearGuides();

    for (const guide of snapResult.guides) {
      const geometry = new THREE.BufferGeometry().setFromPoints([guide.start, guide.end]);
      const material = new THREE.LineDashedMaterial({
        color: guide.color,
        dashSize: 0.05,
        gapSize: 0.03,
        linewidth: 1,
      });
      const line = new THREE.Line(geometry, material);
      line.computeLineDistances();
      this.guidesGroup.add(line);
      this.guides.push(line);
    }
  }

  /**
   * Efface les guides visuels
   */
  clearGuides(): void {
    for (const guide of this.guides) {
      this.guidesGroup.remove(guide);
      guide.geometry.dispose();
      (guide.material as THREE.Material).dispose();
    }
    this.guides = [];
  }

  /**
   * Enregistre les murs pour le snap
   */
  setWalls(walls: THREE.Object3D[]): void {
    this.walls = walls;
  }

  /**
   * Enregistre les points d'ancrage
   */
  setAnchors(anchors: SnapAnchor[]): void {
    this.anchors = anchors;
  }

  /**
   * Retourne la configuration courante
   */
  getConfig(): SnapConfig {
    return this.config;
  }

  /**
   * Met a jour la configuration
   */
  updateConfig(config: Partial<SnapConfig>): void {
    if (config.gridSize !== undefined) this.config.gridSize = config.gridSize;
    if (config.snapDistance !== undefined) this.config.snapDistance = config.snapDistance;
    if (config.enabledSnaps) this.config.enabledSnaps = config.enabledSnaps;
  }

  /**
   * Active/desactive un type de snap
   */
  toggleSnapType(type: SnapType, enabled: boolean): void {
    if (enabled) {
      this.config.enabledSnaps.add(type);
    } else {
      this.config.enabledSnaps.delete(type);
    }
  }

  /**
   * Snap to standard kitchen heights based on object type.
   * Returns a new position with the Y coordinate snapped if within tolerance.
   */
  snapToStandardHeight(position: THREE.Vector3, objectType: string): THREE.Vector3 {
    const snapped = position.clone();
    const tolerance = 0.03; // 30mm snap tolerance

    // Map object types to their standard Y positions (in meters)
    const typeHeights: Record<string, number> = {
      'base_cabinet': 0,     // Floor level
      'base': 0,
      'wall_cabinet': SnapSystem.STANDARD_HEIGHTS.WALL_CABINET_BOTTOM,
      'wall': SnapSystem.STANDARD_HEIGHTS.WALL_CABINET_BOTTOM,
      'tall_cabinet': 0,     // Floor level
      'tall': 0,
      'cooktop': SnapSystem.STANDARD_HEIGHTS.WORKTOP,
      'hood': 1.6,           // Above cooktop
      'sink': 0,             // Floor level (cabinet base)
    };

    const targetY = typeHeights[objectType];
    if (targetY !== undefined && Math.abs(snapped.y - targetY) < tolerance) {
      snapped.y = targetY;
    }

    return snapped;
  }

  /**
   * Snap to the nearest wall boundary within the room.
   * Adjusts position so the object edge aligns flush against the wall.
   */
  snapToWallBounds(
    position: THREE.Vector3,
    roomWidth: number,
    roomDepth: number,
    objectDepth: number
  ): THREE.Vector3 {
    const snapped = position.clone();
    const tolerance = 0.05; // 50mm wall snap tolerance
    const halfDepth = objectDepth / 2;

    // Snap to back wall (z positive)
    if (Math.abs(snapped.z - (roomDepth / 2 - halfDepth)) < tolerance) {
      snapped.z = roomDepth / 2 - halfDepth;
    }
    // Snap to front wall (z negative)
    if (Math.abs(snapped.z - (-roomDepth / 2 + halfDepth)) < tolerance) {
      snapped.z = -roomDepth / 2 + halfDepth;
    }
    // Snap to left wall
    if (Math.abs(snapped.x - (-roomWidth / 2 + halfDepth)) < tolerance) {
      snapped.x = -roomWidth / 2 + halfDepth;
    }
    // Snap to right wall
    if (Math.abs(snapped.x - (roomWidth / 2 - halfDepth)) < tolerance) {
      snapped.x = roomWidth / 2 - halfDepth;
    }

    return snapped;
  }

  /**
   * Dispose le systeme
   */
  dispose(): void {
    this.clearGuides();
    this.scene.remove(this.guidesGroup);
  }
}

/**
 * Snap un angle (en radians) a l'increment le plus proche
 *
 * @param angle - L'angle en radians a snapper
 * @param snapDegrees - L'increment en degres (defaut: 90)
 * @returns L'angle snappe en radians
 *
 * @example
 * snapAngle(0.1, 90)  // => 0 (0 degrees)
 * snapAngle(1.5, 90)  // => Math.PI / 2 (90 degrees)
 * snapAngle(0.7, 45)  // => Math.PI / 4 (45 degrees)
 */
export function snapAngle(angle: number, snapDegrees: number = 90): number {
  const snapRadians = (snapDegrees * Math.PI) / 180;
  return Math.round(angle / snapRadians) * snapRadians;
}

/**
 * Snap un angle a l'increment de 90 degres le plus proche
 */
export function snapAngle90(angle: number): number {
  return snapAngle(angle, 90);
}

/**
 * Snap un angle a l'increment de 45 degres le plus proche
 */
export function snapAngle45(angle: number): number {
  return snapAngle(angle, 45);
}
