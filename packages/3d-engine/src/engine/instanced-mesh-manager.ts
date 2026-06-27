import * as THREE from 'three';

export interface InstanceGroup {
  mesh: THREE.InstancedMesh;
  ids: string[];
  baseGeometry: THREE.BufferGeometry;
  baseMaterial: THREE.Material;
  count: number;
}

export class InstancedMeshManager {
  private groups: Map<string, InstanceGroup> = new Map();
  private scene: THREE.Scene;
  private enabled: boolean = true;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Group key is based on geometry type + material to batch similar cabinets
   */
  getGroupKey(type: string, width: number, height: number, depth: number, color: string): string {
    return `${type}_${width}_${height}_${depth}_${color}`;
  }

  addInstance(
    id: string,
    groupKey: string,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    matrix: THREE.Matrix4
  ): void {
    if (!this.enabled) return;

    let group = this.groups.get(groupKey);

    if (!group) {
      // Create new instanced mesh with initial capacity
      const instancedMesh = new THREE.InstancedMesh(geometry, material, 50);
      instancedMesh.count = 0;
      instancedMesh.castShadow = true;
      instancedMesh.receiveShadow = true;
      this.scene.add(instancedMesh);

      group = {
        mesh: instancedMesh,
        ids: [],
        baseGeometry: geometry,
        baseMaterial: material,
        count: 0,
      };
      this.groups.set(groupKey, group);
    }

    // Add instance
    const index = group.count;
    if (index >= group.mesh.count) {
      // Need to grow - create new larger instanced mesh
      this.growGroup(groupKey, group);
    }

    group.mesh.setMatrixAt(index, matrix);
    group.mesh.instanceMatrix.needsUpdate = true;
    group.ids.push(id);
    group.count++;
  }

  private growGroup(_key: string, group: InstanceGroup): void {
    const newCapacity = Math.ceil(group.mesh.count * 1.5);
    const newMesh = new THREE.InstancedMesh(group.baseGeometry, group.baseMaterial, newCapacity);

    // Copy existing matrices
    for (let i = 0; i < group.count; i++) {
      const m = new THREE.Matrix4();
      group.mesh.getMatrixAt(i, m);
      newMesh.setMatrixAt(i, m);
    }

    newMesh.count = group.count;
    newMesh.castShadow = true;
    newMesh.receiveShadow = true;

    const oldMesh = group.mesh;
    this.scene.remove(oldMesh);
    // Dispose old instanced mesh geometry (instanceMatrix buffer) but NOT the shared baseGeometry
    oldMesh.geometry?.dispose();
    // Don't dispose shared baseMaterial — it's reused by the new mesh
    oldMesh.dispose();
    this.scene.add(newMesh);
    group.mesh = newMesh;
  }

  removeInstance(id: string): void {
    for (const [key, group] of this.groups) {
      const index = group.ids.indexOf(id);
      if (index !== -1) {
        // Swap with last and reduce count
        const lastIndex = group.count - 1;
        if (index !== lastIndex) {
          const lastMatrix = new THREE.Matrix4();
          group.mesh.getMatrixAt(lastIndex, lastMatrix);
          group.mesh.setMatrixAt(index, lastMatrix);
          group.ids[index] = group.ids[lastIndex]!;
        }
        group.ids.pop();
        group.count--;
        group.mesh.count = group.count;
        group.mesh.instanceMatrix.needsUpdate = true;

        // Remove empty groups
        if (group.count === 0) {
          this.scene.remove(group.mesh);
          group.mesh.dispose();
          this.groups.delete(key);
        }
        return;
      }
    }
  }

  updateInstanceMatrix(id: string, matrix: THREE.Matrix4): void {
    for (const group of this.groups.values()) {
      const index = group.ids.indexOf(id);
      if (index !== -1) {
        group.mesh.setMatrixAt(index, matrix);
        group.mesh.instanceMatrix.needsUpdate = true;
        return;
      }
    }
  }

  getStats(): { groups: number; totalInstances: number } {
    let totalInstances = 0;
    this.groups.forEach((g) => (totalInstances += g.count));
    return { groups: this.groups.size, totalInstances };
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  dispose(): void {
    this.groups.forEach((group) => {
      this.scene.remove(group.mesh);
      group.mesh.dispose();
    });
    this.groups.clear();
  }
}
