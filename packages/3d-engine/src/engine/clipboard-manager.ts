import * as THREE from 'three';

export interface ClipboardItem {
  type: string;
  userData: Record<string, unknown>;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  dimensions?: { width: number; height: number; depth: number };
}

export class ClipboardManager {
  private clipboard: ClipboardItem[] = [];
  private pasteOffset: number = 0.2; // offset each paste by 200mm

  copy(objects: THREE.Object3D[]): void {
    this.clipboard = objects.map(obj => ({
      type: obj.userData.type || 'unknown',
      userData: { ...obj.userData },
      position: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
      rotation: { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z },
      scale: { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z },
      dimensions: obj.userData.dimensions ? { ...obj.userData.dimensions } : undefined,
    }));
  }

  paste(): ClipboardItem[] | null {
    if (this.clipboard.length === 0) return null;

    // Return copies with offset position
    return this.clipboard.map(item => ({
      ...item,
      userData: { ...item.userData, id: undefined }, // clear ID so new one is generated
      position: {
        x: item.position.x + this.pasteOffset,
        y: item.position.y,
        z: item.position.z + this.pasteOffset,
      },
    }));
  }

  hasContent(): boolean {
    return this.clipboard.length > 0;
  }

  getClipboardSize(): number {
    return this.clipboard.length;
  }

  clear(): void {
    this.clipboard = [];
  }
}
