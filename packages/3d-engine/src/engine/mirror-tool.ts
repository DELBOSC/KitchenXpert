import * as THREE from 'three';

export type MirrorAxis = 'x' | 'z';

export class MirrorTool {
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Mirror a single object along an axis relative to a pivot point
   */
  mirrorObject(object: THREE.Object3D, axis: MirrorAxis, pivot?: THREE.Vector3): THREE.Vector3 {
    const previousPosition = object.position.clone();
    const center = pivot || new THREE.Vector3(0, 0, 0);

    if (axis === 'x') {
      object.position.x = 2 * center.x - object.position.x;
      object.rotation.y = -object.rotation.y;
    } else {
      object.position.z = 2 * center.z - object.position.z;
      object.rotation.y = Math.PI - object.rotation.y;
    }

    return previousPosition;
  }

  /**
   * Mirror multiple objects along an axis relative to their collective center
   */
  mirrorObjects(objects: THREE.Object3D[], axis: MirrorAxis, pivot?: THREE.Vector3): Map<string, THREE.Vector3> {
    const previousPositions = new Map<string, THREE.Vector3>();

    // Calculate center if no pivot provided
    const center = pivot || this.calculateCenter(objects);

    objects.forEach(obj => {
      const id = (obj.userData.id as string) || obj.uuid;
      previousPositions.set(id, obj.position.clone());
      this.mirrorObject(obj, axis, center);
    });

    return previousPositions;
  }

  /**
   * Mirror entire layout - mirrors all kitchen items in place
   */
  mirrorLayout(items: THREE.Object3D[], axis: MirrorAxis, roomCenter: THREE.Vector3): Map<string, { position: THREE.Vector3; rotationY: number }> {
    const previousStates = new Map<string, { position: THREE.Vector3; rotationY: number }>();

    items.forEach(item => {
      const id = (item.userData.id as string) || item.uuid;
      previousStates.set(id, {
        position: item.position.clone(),
        rotationY: item.rotation.y,
      });
      this.mirrorObject(item, axis, roomCenter);
    });

    return previousStates;
  }

  /**
   * Get the THREE.Scene (for consistency with other tools)
   */
  getScene(): THREE.Scene {
    return this.scene;
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    // No GPU resources to dispose
  }

  private calculateCenter(objects: THREE.Object3D[]): THREE.Vector3 {
    if (objects.length === 0) return new THREE.Vector3();
    const center = new THREE.Vector3();
    objects.forEach(obj => center.add(obj.position));
    center.divideScalar(objects.length);
    return center;
  }
}
