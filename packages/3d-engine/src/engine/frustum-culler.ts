import * as THREE from 'three';

export class FrustumCuller {
  private frustum: THREE.Frustum;
  private projScreenMatrix: THREE.Matrix4;
  private camera: THREE.Camera;
  private enabled: boolean = true;
  private managedObjects: Map<string, THREE.Object3D> = new Map();
  private updateInterval: number = 2; // Update every N frames
  private frameCount: number = 0;

  constructor(camera: THREE.Camera) {
    this.camera = camera;
    this.frustum = new THREE.Frustum();
    this.projScreenMatrix = new THREE.Matrix4();
  }

  register(id: string, object: THREE.Object3D): void {
    this.managedObjects.set(id, object);
  }

  unregister(id: string): void {
    this.managedObjects.delete(id);
  }

  update(): void {
    if (!this.enabled) return;

    this.frameCount++;
    if (this.frameCount % this.updateInterval !== 0) return;

    this.projScreenMatrix.multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse
    );
    this.frustum.setFromProjectionMatrix(this.projScreenMatrix);

    this.managedObjects.forEach((object) => {
      // Cache the bounding sphere and its local center offset
      if (!object.userData._boundingSphere) {
        const box = new THREE.Box3().setFromObject(object);
        const sphere = new THREE.Sphere();
        box.getBoundingSphere(sphere);
        object.userData._boundingSphere = sphere;
        // Store local center for position updates (world center minus object position at cache time)
        object.userData._boundingSphereLocalCenter = sphere.center.clone().sub(object.position);
      }

      // Update sphere position based on current object position (no allocation)
      const cachedSphere = object.userData._boundingSphere as THREE.Sphere;
      const localCenter = object.userData._boundingSphereLocalCenter as THREE.Vector3;
      cachedSphere.center.copy(localCenter).add(object.position);

      object.visible = this.frustum.intersectsSphere(cachedSphere);
    });
  }

  invalidateBounds(id: string): void {
    const obj = this.managedObjects.get(id);
    if (obj) {
      delete obj.userData._boundingSphere;
      delete obj.userData._boundingSphereLocalCenter;
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      // Show all objects when disabled
      this.managedObjects.forEach((obj) => {
        obj.visible = true;
      });
    }
  }

  getStats(): { total: number; visible: number; culled: number } {
    let visible = 0;
    let culled = 0;
    this.managedObjects.forEach((obj) => {
      if (obj.visible) visible++;
      else culled++;
    });
    return { total: this.managedObjects.size, visible, culled };
  }

  dispose(): void {
    this.managedObjects.clear();
  }
}
