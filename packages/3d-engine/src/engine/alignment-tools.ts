import * as THREE from 'three';

export type AlignAxis =
  | 'left'
  | 'right'
  | 'center_x'
  | 'front'
  | 'back'
  | 'center_z'
  | 'top'
  | 'bottom';
export type DistributeAxis = 'x' | 'z';

export class AlignmentTools {
  // Align objects on a given axis
  static align(objects: THREE.Object3D[], axis: AlignAxis): Map<string, THREE.Vector3> {
    if (objects.length < 2) return new Map();

    const previousPositions = new Map<string, THREE.Vector3>();
    const bounds = objects.map((obj) => {
      const box = new THREE.Box3().setFromObject(obj);
      return { obj, box };
    });

    let target: number;

    switch (axis) {
      case 'left':
        target = Math.min(...bounds.map((b) => b.box.min.x));
        bounds.forEach(({ obj, box }) => {
          previousPositions.set(obj.userData.id || obj.uuid, obj.position.clone());
          obj.position.x += target - box.min.x;
        });
        break;
      case 'right':
        target = Math.max(...bounds.map((b) => b.box.max.x));
        bounds.forEach(({ obj, box }) => {
          previousPositions.set(obj.userData.id || obj.uuid, obj.position.clone());
          obj.position.x += target - box.max.x;
        });
        break;
      case 'center_x':
        target =
          bounds.reduce((sum, b) => sum + (b.box.min.x + b.box.max.x) / 2, 0) / bounds.length;
        bounds.forEach(({ obj, box }) => {
          previousPositions.set(obj.userData.id || obj.uuid, obj.position.clone());
          const center = (box.min.x + box.max.x) / 2;
          obj.position.x += target - center;
        });
        break;
      case 'front':
        target = Math.min(...bounds.map((b) => b.box.min.z));
        bounds.forEach(({ obj, box }) => {
          previousPositions.set(obj.userData.id || obj.uuid, obj.position.clone());
          obj.position.z += target - box.min.z;
        });
        break;
      case 'back':
        target = Math.max(...bounds.map((b) => b.box.max.z));
        bounds.forEach(({ obj, box }) => {
          previousPositions.set(obj.userData.id || obj.uuid, obj.position.clone());
          obj.position.z += target - box.max.z;
        });
        break;
      case 'center_z':
        target =
          bounds.reduce((sum, b) => sum + (b.box.min.z + b.box.max.z) / 2, 0) / bounds.length;
        bounds.forEach(({ obj, box }) => {
          previousPositions.set(obj.userData.id || obj.uuid, obj.position.clone());
          const center = (box.min.z + box.max.z) / 2;
          obj.position.z += target - center;
        });
        break;
      case 'top':
        target = Math.max(...bounds.map((b) => b.box.max.y));
        bounds.forEach(({ obj, box }) => {
          previousPositions.set(obj.userData.id || obj.uuid, obj.position.clone());
          obj.position.y += target - box.max.y;
        });
        break;
      case 'bottom':
        target = Math.min(...bounds.map((b) => b.box.min.y));
        bounds.forEach(({ obj, box }) => {
          previousPositions.set(obj.userData.id || obj.uuid, obj.position.clone());
          obj.position.y += target - box.min.y;
        });
        break;
    }

    return previousPositions;
  }

  // Distribute objects evenly along an axis
  static distribute(objects: THREE.Object3D[], axis: DistributeAxis): Map<string, THREE.Vector3> {
    if (objects.length < 3) return new Map();

    const previousPositions = new Map<string, THREE.Vector3>();
    const prop = axis === 'x' ? 'x' : 'z';

    // Sort by position
    const sorted = [...objects].sort((a, b) => a.position[prop] - b.position[prop]);

    const first = sorted[0]!.position[prop];
    const last = sorted[sorted.length - 1]!.position[prop];
    const step = (last - first) / (sorted.length - 1);

    sorted.forEach((obj, i) => {
      previousPositions.set(obj.userData.id || obj.uuid, obj.position.clone());
      obj.position[prop] = first + step * i;
    });

    return previousPositions;
  }

  // Snap angle to nearest increment
  static snapAngle(angle: number, snapDegrees: number = 90): number {
    const snapRad = (snapDegrees * Math.PI) / 180;
    return Math.round(angle / snapRad) * snapRad;
  }
}
