import * as THREE from 'three';
import type { Command } from './command-history';

/**
 * Serialized object data for duplicate/delete operations
 */
export interface SerializedObjectData {
  id: string;
  type: string;
  userData: Record<string, unknown>;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
}

/**
 * Material property snapshot for undo/redo
 */
export interface MaterialProperties {
  color?: number;
  roughness?: number;
  metalness?: number;
  opacity?: number;
  transparent?: boolean;
  map?: THREE.Texture | null;
}

/**
 * Command: Duplicate an object in the scene
 * Undo removes the duplicated item
 */
export class DuplicateCommand implements Command {
  readonly description: string;

  constructor(
    private scene: THREE.Scene,
    _originalObject: THREE.Object3D,
    private duplicatedObject: THREE.Object3D,
    private objectMap: Map<string, THREE.Object3D>,
    private collisionAdd?: (obj: THREE.Object3D) => void,
    private collisionRemove?: (obj: THREE.Object3D) => void
  ) {
    this.description = `Dupliquer ${_originalObject.userData.type || 'objet'}`;
  }

  execute(): void {
    this.scene.add(this.duplicatedObject);
    const id = this.duplicatedObject.userData.id as string;
    if (id) {
      this.objectMap.set(id, this.duplicatedObject);
    }
    this.collisionAdd?.(this.duplicatedObject);
  }

  undo(): void {
    this.scene.remove(this.duplicatedObject);
    const id = this.duplicatedObject.userData.id as string;
    if (id) {
      this.objectMap.delete(id);
    }
    this.collisionRemove?.(this.duplicatedObject);
  }
}

/**
 * Command: Change material properties of an object
 */
export class MaterialChangeCommand implements Command {
  readonly description: string;

  constructor(
    private object: THREE.Object3D,
    _objectId: string,
    private oldProperties: MaterialProperties,
    private newProperties: MaterialProperties
  ) {
    this.description = `Modifier matériau de ${_objectId}`;
  }

  execute(): void {
    this.applyProperties(this.newProperties);
  }

  undo(): void {
    this.applyProperties(this.oldProperties);
  }

  private applyProperties(props: MaterialProperties): void {
    this.object.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        if (props.color !== undefined) child.material.color.setHex(props.color);
        if (props.roughness !== undefined) child.material.roughness = props.roughness;
        if (props.metalness !== undefined) child.material.metalness = props.metalness;
        if (props.opacity !== undefined) child.material.opacity = props.opacity;
        if (props.transparent !== undefined) child.material.transparent = props.transparent;
        if (props.map !== undefined) child.material.map = props.map;
        child.material.needsUpdate = true;
      }
    });
  }
}

/**
 * Command: Delete multiple objects at once
 * Undo re-adds all deleted objects
 */
export class DeleteMultipleCommand implements Command {
  readonly description: string;

  constructor(
    private scene: THREE.Scene,
    private objects: THREE.Object3D[],
    private objectMap: Map<string, THREE.Object3D>,
    private collisionAdd?: (obj: THREE.Object3D) => void,
    private collisionRemove?: (obj: THREE.Object3D) => void
  ) {
    this.description = `Supprimer ${objects.length} objets`;
  }

  execute(): void {
    for (const obj of this.objects) {
      this.scene.remove(obj);
      const id = obj.userData.id as string;
      if (id) {
        this.objectMap.delete(id);
      }
      this.collisionRemove?.(obj);
    }
  }

  undo(): void {
    for (const obj of this.objects) {
      this.scene.add(obj);
      const id = obj.userData.id as string;
      if (id) {
        this.objectMap.set(id, obj);
      }
      this.collisionAdd?.(obj);
    }
  }
}

/**
 * Command: Align objects (stores previous positions for undo)
 */
export class AlignCommand implements Command {
  readonly description: string;

  constructor(
    private previousPositions: Map<string, THREE.Vector3>,
    private newPositions: Map<string, THREE.Vector3>,
    private getObject: (id: string) => THREE.Object3D | undefined,
    description?: string
  ) {
    this.description = description || `Aligner ${previousPositions.size} objets`;
  }

  execute(): void {
    this.newPositions.forEach((pos, id) => {
      const obj = this.getObject(id);
      if (obj) {
        obj.position.copy(pos);
      }
    });
  }

  undo(): void {
    this.previousPositions.forEach((pos, id) => {
      const obj = this.getObject(id);
      if (obj) {
        obj.position.copy(pos);
      }
    });
  }
}
