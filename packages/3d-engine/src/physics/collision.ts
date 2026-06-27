import * as THREE from 'three';

/**
 * Résultat de test de collision
 */
export interface CollisionResult {
  collides: boolean;
  objects: THREE.Object3D[];
  penetrationDepth?: number;
}

/**
 * Configuration de contraintes de placement
 */
export interface PlacementConstraints {
  minDistanceToWall?: number;
  minDistanceBetweenObjects?: number;
  snapToGrid?: boolean;
  gridSize?: number;
  allowOverlap?: boolean;
}

/**
 * Gestionnaire de collision et contraintes pour le placement d'objets
 */
export class CollisionSystem {
  private constraints: Required<PlacementConstraints>;
  private collisionObjects: Set<THREE.Object3D> = new Set();

  constructor(constraints: PlacementConstraints = {}) {
    this.constraints = {
      minDistanceToWall: constraints.minDistanceToWall || 0.05, // 5cm minimum
      minDistanceBetweenObjects: constraints.minDistanceBetweenObjects || 0.02, // 2cm minimum
      snapToGrid: constraints.snapToGrid !== undefined ? constraints.snapToGrid : true,
      gridSize: constraints.gridSize || 0.01, // 1cm grid
      allowOverlap: constraints.allowOverlap || false,
    };
  }

  /**
   * Enregistre un objet pour la détection de collision
   */
  addCollisionObject(object: THREE.Object3D): void {
    this.collisionObjects.add(object);
  }

  /**
   * Retire un objet de la détection de collision
   */
  removeCollisionObject(object: THREE.Object3D): void {
    this.collisionObjects.delete(object);
  }

  /**
   * Teste si un objet entre en collision avec d'autres
   */
  checkCollision(object: THREE.Object3D, excludeSelf: boolean = true): CollisionResult {
    const objectBox = new THREE.Box3().setFromObject(object);
    const collidingObjects: THREE.Object3D[] = [];

    this.collisionObjects.forEach((other) => {
      if (excludeSelf && other === object) {
        return;
      }

      const otherBox = new THREE.Box3().setFromObject(other);

      if (objectBox.intersectsBox(otherBox)) {
        collidingObjects.push(other);
      }
    });

    return {
      collides: collidingObjects.length > 0,
      objects: collidingObjects,
    };
  }

  /**
   * Vérifie si une position est valide pour placer un objet
   */
  isValidPosition(object: THREE.Object3D, position: THREE.Vector3, _scene: THREE.Scene): boolean {
    // Sauvegarder la position actuelle
    const originalPosition = object.position.clone();

    // Déplacer temporairement l'objet
    object.position.copy(position);
    object.updateMatrixWorld(true);

    // Vérifier les collisions
    const result = this.checkCollision(object);

    // Restaurer la position
    object.position.copy(originalPosition);
    object.updateMatrixWorld(true);

    return !result.collides || this.constraints.allowOverlap;
  }

  /**
   * Trouve la position valide la plus proche
   */
  findNearestValidPosition(
    object: THREE.Object3D,
    targetPosition: THREE.Vector3,
    scene: THREE.Scene,
    maxDistance: number = 2.0
  ): THREE.Vector3 | null {
    // Si la position cible est déjà valide
    if (this.isValidPosition(object, targetPosition, scene)) {
      return targetPosition.clone();
    }

    // Recherche en spirale autour de la position cible
    const step = this.constraints.gridSize;
    const maxSteps = Math.floor(maxDistance / step);

    for (let radius = 1; radius <= maxSteps; radius++) {
      const angleStep = Math.PI / (4 * radius); // Plus de points pour les grands rayons

      for (let angle = 0; angle < Math.PI * 2; angle += angleStep) {
        const testPosition = targetPosition.clone();
        testPosition.x += Math.cos(angle) * radius * step;
        testPosition.z += Math.sin(angle) * radius * step;

        if (this.isValidPosition(object, testPosition, scene)) {
          return testPosition;
        }
      }
    }

    return null; // Aucune position valide trouvée
  }

  /**
   * Snap une position à la grille
   */
  snapToGrid(position: THREE.Vector3): THREE.Vector3 {
    if (!this.constraints.snapToGrid) {
      return position;
    }

    const gridSize = this.constraints.gridSize;
    return new THREE.Vector3(
      Math.round(position.x / gridSize) * gridSize,
      position.y,
      Math.round(position.z / gridSize) * gridSize
    );
  }

  /**
   * Calcule la distance entre deux bounding boxes
   */
  private boxToBoxDistance(box1: THREE.Box3, box2: THREE.Box3): number {
    // Si les boxes se chevauchent, la distance est 0
    if (box1.intersectsBox(box2)) {
      return 0;
    }

    // Calculer la distance sur chaque axe
    const dx = Math.max(0, Math.max(box1.min.x - box2.max.x, box2.min.x - box1.max.x));
    const dy = Math.max(0, Math.max(box1.min.y - box2.max.y, box2.min.y - box1.max.y));
    const dz = Math.max(0, Math.max(box1.min.z - box2.max.z, box2.min.z - box1.max.z));

    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Calcule la distance entre deux objets
   */
  distanceBetweenObjects(obj1: THREE.Object3D, obj2: THREE.Object3D): number {
    const box1 = new THREE.Box3().setFromObject(obj1);
    const box2 = new THREE.Box3().setFromObject(obj2);

    return this.boxToBoxDistance(box1, box2);
  }

  /**
   * Vérifie si un objet respecte la distance minimale au mur
   */
  checkWallDistance(object: THREE.Object3D, walls: THREE.Object3D[]): boolean {
    const objectBox = new THREE.Box3().setFromObject(object);

    for (const wall of walls) {
      const wallBox = new THREE.Box3().setFromObject(wall);
      const distance = this.boxToBoxDistance(objectBox, wallBox);

      if (distance < this.constraints.minDistanceToWall) {
        return false;
      }
    }

    return true;
  }

  /**
   * Calcule les contraintes de placement pour un objet
   * Retourne une bounding box où l'objet peut être placé
   */
  getPlacementBounds(scene: THREE.Scene): THREE.Box3 {
    const bounds = new THREE.Box3();

    // Trouver tous les murs
    const walls: THREE.Object3D[] = [];
    scene.traverse((child) => {
      if (child.userData.type === 'wall') {
        walls.push(child);
      }
    });

    if (walls.length === 0) {
      // Pas de murs, retourner une zone par défaut
      return new THREE.Box3(new THREE.Vector3(-10, 0, -10), new THREE.Vector3(10, 3, 10));
    }

    // Calculer la bounding box de tous les murs
    walls.forEach((wall) => {
      bounds.union(new THREE.Box3().setFromObject(wall));
    });

    // Réduire légèrement pour tenir compte de la distance minimale au mur
    bounds.min.add(
      new THREE.Vector3(this.constraints.minDistanceToWall, 0, this.constraints.minDistanceToWall)
    );
    bounds.max.sub(
      new THREE.Vector3(this.constraints.minDistanceToWall, 0, this.constraints.minDistanceToWall)
    );

    return bounds;
  }

  /**
   * Vérifie si un objet est dans les limites de placement
   */
  isWithinBounds(object: THREE.Object3D, bounds: THREE.Box3): boolean {
    const objectBox = new THREE.Box3().setFromObject(object);
    return bounds.containsBox(objectBox);
  }

  /**
   * Contraindre une position aux limites
   */
  clampToBounds(position: THREE.Vector3, bounds: THREE.Box3): THREE.Vector3 {
    return position.clone().clamp(bounds.min, bounds.max);
  }

  /**
   * Check if an object (given its center position and size) fits within the room bounds.
   * Returns whether the position is valid and a clamped position that is guaranteed
   * to be inside the room.
   */
  isWithinRoom(
    position: THREE.Vector3,
    objectSize: THREE.Vector3,
    roomWidth: number,
    roomDepth: number,
    roomHeight: number
  ): { valid: boolean; clampedPosition: THREE.Vector3 } {
    const halfW = objectSize.x / 2;
    const halfD = objectSize.z / 2;
    const clampedPosition = position.clone();
    let valid = true;

    // Clamp X within room
    const minX = -roomWidth / 2 + halfW;
    const maxX = roomWidth / 2 - halfW;
    if (clampedPosition.x < minX) {
      clampedPosition.x = minX;
      valid = false;
    }
    if (clampedPosition.x > maxX) {
      clampedPosition.x = maxX;
      valid = false;
    }

    // Clamp Z within room
    const minZ = -roomDepth / 2 + halfD;
    const maxZ = roomDepth / 2 - halfD;
    if (clampedPosition.z < minZ) {
      clampedPosition.z = minZ;
      valid = false;
    }
    if (clampedPosition.z > maxZ) {
      clampedPosition.z = maxZ;
      valid = false;
    }

    // Clamp Y (floor to ceiling)
    if (clampedPosition.y < 0) {
      clampedPosition.y = 0;
      valid = false;
    }
    if (clampedPosition.y + objectSize.y > roomHeight) {
      clampedPosition.y = roomHeight - objectSize.y;
      valid = false;
    }

    return { valid, clampedPosition };
  }

  /**
   * Met à jour les contraintes
   */
  updateConstraints(constraints: Partial<PlacementConstraints>): void {
    Object.assign(this.constraints, constraints);
  }

  /**
   * Obtient les contraintes actuelles
   */
  getConstraints(): Required<PlacementConstraints> {
    return { ...this.constraints };
  }

  /**
   * Nettoie tous les objets de collision
   */
  clear(): void {
    this.collisionObjects.clear();
  }
}
