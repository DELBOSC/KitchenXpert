import * as THREE from 'three';

export interface LODConfig {
  highDetailDistance: number;    // 0-5m: full detail
  mediumDetailDistance: number;  // 5-15m: reduced
  lowDetailDistance: number;     // 15m+: simple box
  enabled: boolean;
}

export class LODManager {
  private lodObjects: Map<string, THREE.LOD> = new Map();
  private camera: THREE.Camera;
  private config: LODConfig;

  constructor(camera: THREE.Camera, config?: Partial<LODConfig>) {
    this.camera = camera;
    this.config = {
      highDetailDistance: 5,
      mediumDetailDistance: 15,
      lowDetailDistance: 30,
      enabled: true,
      ...config
    };
  }

  /**
   * Create LOD wrapper for a mesh - adds 3 levels
   */
  createLOD(id: string, highDetail: THREE.Object3D): THREE.LOD {
    const lod = new THREE.LOD();

    // Level 0: High detail (original mesh) - shown from 0 to highDetailDistance
    lod.addLevel(highDetail, 0);

    // Level 1: Medium detail (simplified geometry) - shown from highDetailDistance to mediumDetailDistance
    const medium = this.createMediumDetail(highDetail);
    lod.addLevel(medium, this.config.highDetailDistance);

    // Level 2: Low detail (bounding box) - shown beyond mediumDetailDistance
    const low = this.createLowDetail(highDetail);
    lod.addLevel(low, this.config.mediumDetailDistance);

    // Copy userData and position
    lod.userData = { ...highDetail.userData };

    this.lodObjects.set(id, lod);
    return lod;
  }

  private createMediumDetail(original: THREE.Object3D): THREE.Object3D {
    // Create simplified version - reduce geometry detail
    const group = new THREE.Group();
    original.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        const box = new THREE.Box3().setFromObject(child);
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);

        const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
        const mat = child.material instanceof THREE.Material
          ? child.material.clone()
          : new THREE.MeshStandardMaterial({ color: 0xcccccc });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(center);
        group.add(mesh);
      }
    });
    return group;
  }

  private createLowDetail(original: THREE.Object3D): THREE.Object3D {
    const box = new THREE.Box3().setFromObject(original);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    const geo = new THREE.BoxGeometry(
      Math.max(size.x, 0.01),
      Math.max(size.y, 0.01),
      Math.max(size.z, 0.01)
    );
    const mat = new THREE.MeshStandardMaterial({ color: 0x999999, flatShading: true });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(center);
    return mesh;
  }

  removeLOD(id: string): void {
    const lod = this.lodObjects.get(id);
    if (lod) {
      lod.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (child.material instanceof THREE.Material) child.material.dispose();
        }
      });
      this.lodObjects.delete(id);
    }
  }

  update(): void {
    if (!this.config.enabled) return;
    this.lodObjects.forEach((lod) => {
      lod.update(this.camera);
    });
  }

  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  dispose(): void {
    this.lodObjects.forEach((_, id) => this.removeLOD(id));
    this.lodObjects.clear();
  }
}
