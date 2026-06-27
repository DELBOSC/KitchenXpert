import * as THREE from 'three';
import { generateId } from '../utils/generate-id';

export interface SelectionGroup {
  id: string;
  name: string;
  objectIds: string[];
  boundingBox?: THREE.Box3;
}

export class GroupManager {
  private groups: Map<string, SelectionGroup> = new Map();
  private selectedIds: Set<string> = new Set();
  protected scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  // Multi-select
  select(id: string, addToSelection: boolean = false): void {
    if (!addToSelection) this.selectedIds.clear();
    this.selectedIds.add(id);
  }

  deselect(id: string): void {
    this.selectedIds.delete(id);
  }

  clearSelection(): void {
    this.selectedIds.clear();
  }

  getSelectedIds(): string[] {
    return Array.from(this.selectedIds);
  }

  isSelected(id: string): boolean {
    return this.selectedIds.has(id);
  }

  getSelectionCount(): number {
    return this.selectedIds.size;
  }

  // Group operations
  createGroup(name: string, objectIds?: string[]): SelectionGroup {
    const ids = objectIds || this.getSelectedIds();
    if (ids.length < 2) throw new Error('Need at least 2 objects to create a group');

    const group: SelectionGroup = {
      id: generateId('group'),
      name,
      objectIds: [...ids],
    };
    this.groups.set(group.id, group);
    return group;
  }

  dissolveGroup(groupId: string): void {
    this.groups.delete(groupId);
  }

  getGroup(groupId: string): SelectionGroup | undefined {
    return this.groups.get(groupId);
  }

  getGroupForObject(objectId: string): SelectionGroup | undefined {
    for (const group of this.groups.values()) {
      if (group.objectIds.includes(objectId)) return group;
    }
    return undefined;
  }

  getAllGroups(): SelectionGroup[] {
    return Array.from(this.groups.values());
  }

  /**
   * Resolves selected IDs to effective object IDs.
   * If a selected ID corresponds to a group, expands it to all child object IDs.
   * This ensures group children are transformed when a group is selected.
   */
  private resolveSelectedObjectIds(): string[] {
    const resolved = new Set<string>();
    this.selectedIds.forEach((id) => {
      const group = this.groups.get(id);
      if (group) {
        group.objectIds.forEach((childId) => resolved.add(childId));
      } else {
        resolved.add(id);
      }
    });
    return Array.from(resolved);
  }

  // Move all selected objects by delta
  moveSelected(delta: THREE.Vector3, getObject: (id: string) => THREE.Object3D | undefined): void {
    const objectIds = this.resolveSelectedObjectIds();
    for (const id of objectIds) {
      const obj = getObject(id);
      if (obj) obj.position.add(delta.clone());
    }
  }

  // Rotate all selected objects around their collective center
  rotateSelected(angle: number, getObject: (id: string) => THREE.Object3D | undefined): void {
    const objectIds = this.resolveSelectedObjectIds();
    const center = this.computeCenter(objectIds, getObject);
    if (!center) return;

    for (const id of objectIds) {
      const obj = getObject(id);
      if (obj) {
        // Rotate position around center
        const offset = obj.position.clone().sub(center);
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const newX = offset.x * cos - offset.z * sin;
        const newZ = offset.x * sin + offset.z * cos;
        obj.position.set(center.x + newX, obj.position.y, center.z + newZ);
        obj.rotation.y += angle;
      }
    }
  }

  // Scale all selected objects by a uniform factor
  scaleSelected(factor: number, getObject: (id: string) => THREE.Object3D | undefined): void {
    const objectIds = this.resolveSelectedObjectIds();
    const center = this.computeCenter(objectIds, getObject);
    if (!center) return;

    for (const id of objectIds) {
      const obj = getObject(id);
      if (obj) {
        // Scale the object itself
        obj.scale.multiplyScalar(factor);
        // Scale position offset from center so objects spread apart proportionally
        const offset = obj.position.clone().sub(center);
        offset.multiplyScalar(factor);
        obj.position.copy(center.clone().add(offset));
      }
    }
  }

  /**
   * Computes the center position of a set of object IDs.
   */
  private computeCenter(
    objectIds: string[],
    getObject: (id: string) => THREE.Object3D | undefined
  ): THREE.Vector3 | null {
    const positions: THREE.Vector3[] = [];
    for (const id of objectIds) {
      const obj = getObject(id);
      if (obj) positions.push(obj.position.clone());
    }
    if (positions.length === 0) return null;
    const center = new THREE.Vector3();
    positions.forEach((p) => center.add(p));
    center.divideScalar(positions.length);
    return center;
  }

  getSelectionCenter(getObject: (id: string) => THREE.Object3D | undefined): THREE.Vector3 | null {
    const objectIds = this.resolveSelectedObjectIds();
    return this.computeCenter(objectIds, getObject);
  }

  getSelectionBounds(getObject: (id: string) => THREE.Object3D | undefined): THREE.Box3 | null {
    const box = new THREE.Box3();
    let hasObjects = false;
    const objectIds = this.resolveSelectedObjectIds();
    for (const id of objectIds) {
      const obj = getObject(id);
      if (obj) {
        box.expandByObject(obj);
        hasObjects = true;
      }
    }
    return hasObjects ? box : null;
  }

  toJSON(): { groups: SelectionGroup[] } {
    return { groups: Array.from(this.groups.values()) };
  }

  fromJSON(data: { groups?: SelectionGroup[] }): void {
    this.groups.clear();
    data.groups?.forEach((g) => this.groups.set(g.id, g));
  }

  dispose(): void {
    this.groups.clear();
    this.selectedIds.clear();
  }
}
