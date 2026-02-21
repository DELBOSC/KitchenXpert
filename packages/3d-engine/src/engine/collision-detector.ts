import * as THREE from 'three';

export interface CollisionCheckResult {
  collides: boolean;
  collidingObjects: Array<{ id: string; overlap: number }>;
}

export class CollisionDetector {
  private scene: THREE.Scene;
  private enabled: boolean = true;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  // Check if an object at a given transform would collide with others
  checkCollision(
    objectId: string,
    position: THREE.Vector3,
    rotation: THREE.Euler,
    scale: THREE.Vector3,
    objectSize: THREE.Vector3
  ): CollisionCheckResult {
    if (!this.enabled) return { collides: false, collidingObjects: [] };

    const collidingObjects: Array<{ id: string; overlap: number }> = [];

    // Create OBB for the checking object
    const checkBox = this.createOBB(position, objectSize, scale, rotation);

    this.scene.traverse((child) => {
      if (!(child instanceof THREE.Mesh) && !(child instanceof THREE.Group)) return;
      if (!child.userData.id || child.userData.id === objectId) return;
      if (child.userData.type === 'floor' || child.userData.type === 'wall') return;

      const otherBox = new THREE.Box3().setFromObject(child);

      if (checkBox.intersectsBox(otherBox)) {
        // Calculate overlap amount
        const overlap = this.calculateOverlap(checkBox, otherBox);
        collidingObjects.push({ id: child.userData.id, overlap });
      }
    });

    return {
      collides: collidingObjects.length > 0,
      collidingObjects,
    };
  }

  private createOBB(
    position: THREE.Vector3,
    size: THREE.Vector3,
    scale: THREE.Vector3,
    _rotation: THREE.Euler
  ): THREE.Box3 {
    const scaledSize = size.clone().multiply(scale);
    const halfSize = scaledSize.clone().multiplyScalar(0.5);

    // Simplified AABB after rotation - conservative check
    const maxExtent = Math.max(halfSize.x, halfSize.z);
    return new THREE.Box3(
      new THREE.Vector3(position.x - maxExtent, position.y, position.z - maxExtent),
      new THREE.Vector3(position.x + maxExtent, position.y + scaledSize.y, position.z + maxExtent)
    );
  }

  private calculateOverlap(a: THREE.Box3, b: THREE.Box3): number {
    const overlapX = Math.min(a.max.x, b.max.x) - Math.max(a.min.x, b.min.x);
    const overlapZ = Math.min(a.max.z, b.max.z) - Math.max(a.min.z, b.min.z);
    return Math.max(0, Math.min(overlapX, overlapZ));
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  dispose(): void {
    // Nothing to dispose
  }
}
