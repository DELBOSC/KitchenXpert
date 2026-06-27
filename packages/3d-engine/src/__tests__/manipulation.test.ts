/**
 * Tests for ObjectManipulator class
 * @file src/__tests__/manipulation.test.ts
 */

import * as THREE from 'three';
import {
  ObjectManipulator,
  ManipulationMode,
  ManipulationEvent,
} from '../interaction/manipulation';
import { CollisionSystem } from '../physics/collision';

// Mock Three.js
jest.mock('three', () => {
  class MockVector3 {
    x: number;
    y: number;
    z: number;

    constructor(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }

    set(x: number, y: number, z: number): this {
      this.x = x;
      this.y = y;
      this.z = z;
      return this;
    }

    clone(): MockVector3 {
      return new MockVector3(this.x, this.y, this.z);
    }

    copy(v: MockVector3): this {
      this.x = v.x;
      this.y = v.y;
      this.z = v.z;
      return this;
    }

    add(v: MockVector3): this {
      this.x += v.x;
      this.y += v.y;
      this.z += v.z;
      return this;
    }

    sub(v: MockVector3): this {
      this.x -= v.x;
      this.y -= v.y;
      this.z -= v.z;
      return this;
    }

    multiplyScalar(s: number): this {
      this.x *= s;
      this.y *= s;
      this.z *= s;
      return this;
    }
  }

  class MockEuler {
    x: number;
    y: number;
    z: number;

    constructor(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }

    clone(): MockEuler {
      return new MockEuler(this.x, this.y, this.z);
    }
  }

  class MockPlane {
    normal: MockVector3;
    constant: number;

    constructor() {
      this.normal = new MockVector3(0, 1, 0);
      this.constant = 0;
    }

    setFromNormalAndCoplanarPoint(normal: MockVector3, point: MockVector3): this {
      this.normal = normal.clone();
      this.constant = -point.x * normal.x - point.y * normal.y - point.z * normal.z;
      return this;
    }
  }

  class MockRay {
    origin: MockVector3;
    direction: MockVector3;

    constructor() {
      this.origin = new MockVector3();
      this.direction = new MockVector3(0, 0, -1);
    }

    intersectPlane(plane: MockPlane, target: MockVector3): MockVector3 | null {
      target.x = 1;
      target.y = 0;
      target.z = 1;
      return target;
    }
  }

  class MockRaycaster {
    ray: MockRay;

    constructor() {
      this.ray = new MockRay();
    }
  }

  class MockMaterial {
    clone(): MockMaterial {
      return new MockMaterial();
    }
    dispose(): void {}
  }

  class MockMeshStandardMaterial extends MockMaterial {
    emissive = { setHex: jest.fn() };
    emissiveIntensity = 0;
  }

  class MockMesh {
    material: MockMaterial;
    userData: Record<string, unknown> = {};

    constructor() {
      this.material = new MockMeshStandardMaterial();
    }
  }

  class MockObject3D {
    position: MockVector3;
    rotation: MockEuler;
    scale: MockVector3;
    userData: Record<string, unknown>;
    children: MockObject3D[] = [];
    parent: MockObject3D | null = null;

    constructor() {
      this.position = new MockVector3();
      this.rotation = new MockEuler();
      this.scale = new MockVector3(1, 1, 1);
      this.userData = {};
    }

    clone(): MockObject3D {
      const clone = new MockObject3D();
      clone.position = this.position.clone();
      clone.rotation = this.rotation.clone();
      clone.scale = this.scale.clone();
      clone.userData = { ...this.userData };
      return clone;
    }

    traverse(callback: (obj: MockObject3D | MockMesh) => void): void {
      callback(this);
      // Simulate having a mesh child for highlight tests
      const mockMesh = new MockMesh();
      callback(mockMesh as unknown as MockObject3D);
    }
  }

  class MockScene extends MockObject3D {
    add(obj: MockObject3D): void {
      this.children.push(obj);
      obj.parent = this;
    }

    remove(obj: MockObject3D): void {
      const index = this.children.indexOf(obj);
      if (index !== -1) {
        this.children.splice(index, 1);
        obj.parent = null;
      }
    }
  }

  class MockCamera extends MockObject3D {}

  return {
    Vector3: MockVector3,
    Euler: MockEuler,
    Plane: MockPlane,
    Raycaster: MockRaycaster,
    Object3D: MockObject3D,
    Scene: MockScene,
    Camera: MockCamera,
    Mesh: MockMesh,
    Material: MockMaterial,
    MeshStandardMaterial: MockMeshStandardMaterial,
  };
});

// Mock CollisionSystem
jest.mock('../physics/collision', () => {
  return {
    CollisionSystem: jest.fn().mockImplementation(() => ({
      snapToGrid: jest.fn((position) => position),
      isValidPosition: jest.fn(() => true),
      findNearestValidPosition: jest.fn((obj, pos) => pos),
      checkCollision: jest.fn(() => ({ collides: false, objects: [] })),
      getConstraints: jest.fn(() => ({ allowOverlap: false })),
      addCollisionObject: jest.fn(),
      removeCollisionObject: jest.fn(),
    })),
  };
});

describe('ObjectManipulator', () => {
  let manipulator: ObjectManipulator;
  let mockScene: THREE.Scene;
  let mockCamera: THREE.Camera;
  let mockCollisionSystem: CollisionSystem;

  beforeEach(() => {
    jest.clearAllMocks();

    mockScene = new THREE.Scene();
    mockCamera = new THREE.Camera();
    mockCollisionSystem = new CollisionSystem();

    manipulator = new ObjectManipulator(mockScene, mockCamera, mockCollisionSystem);
  });

  describe('constructor', () => {
    it('should initialize with no selected object', () => {
      expect(manipulator.getSelectedObject()).toBeNull();
    });

    it('should initialize with TRANSLATE mode', () => {
      expect(manipulator.getMode()).toBe(ManipulationMode.TRANSLATE);
    });

    it('should store camera reference', () => {
      expect(manipulator.getCamera()).toBe(mockCamera);
    });
  });

  describe('selectObject', () => {
    it('should select an object', () => {
      const obj = new THREE.Object3D();
      manipulator.selectObject(obj);

      expect(manipulator.getSelectedObject()).toBe(obj);
    });

    it('should deselect when null is passed', () => {
      const obj = new THREE.Object3D();
      manipulator.selectObject(obj);
      manipulator.selectObject(null);

      expect(manipulator.getSelectedObject()).toBeNull();
    });

    it('should deselect previous object when selecting new one', () => {
      const obj1 = new THREE.Object3D();
      const obj2 = new THREE.Object3D();

      manipulator.selectObject(obj1);
      manipulator.selectObject(obj2);

      expect(manipulator.getSelectedObject()).toBe(obj2);
    });
  });

  describe('getSelectedObject', () => {
    it('should return null when no object selected', () => {
      expect(manipulator.getSelectedObject()).toBeNull();
    });

    it('should return selected object', () => {
      const obj = new THREE.Object3D();
      manipulator.selectObject(obj);

      expect(manipulator.getSelectedObject()).toBe(obj);
    });
  });

  describe('setMode', () => {
    it('should set manipulation mode to TRANSLATE', () => {
      manipulator.setMode(ManipulationMode.TRANSLATE);
      expect(manipulator.getMode()).toBe(ManipulationMode.TRANSLATE);
    });

    it('should set manipulation mode to ROTATE', () => {
      manipulator.setMode(ManipulationMode.ROTATE);
      expect(manipulator.getMode()).toBe(ManipulationMode.ROTATE);
    });

    it('should set manipulation mode to SCALE', () => {
      manipulator.setMode(ManipulationMode.SCALE);
      expect(manipulator.getMode()).toBe(ManipulationMode.SCALE);
    });
  });

  describe('getMode', () => {
    it('should return current mode', () => {
      expect(manipulator.getMode()).toBe(ManipulationMode.TRANSLATE);

      manipulator.setMode(ManipulationMode.ROTATE);
      expect(manipulator.getMode()).toBe(ManipulationMode.ROTATE);
    });
  });

  describe('startDrag', () => {
    it('should do nothing if no object selected', () => {
      const callback = jest.fn();
      manipulator.onManipulation(callback);

      manipulator.startDrag(new THREE.Vector3(0, 0, 0));

      expect(callback).not.toHaveBeenCalled();
    });

    it('should start dragging selected object', () => {
      const obj = new THREE.Object3D();
      obj.position.set(1, 0, 1);
      manipulator.selectObject(obj);

      const callback = jest.fn();
      manipulator.onManipulation(callback);

      manipulator.startDrag(new THREE.Vector3(1, 0, 1));

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'start',
          object: obj,
          mode: ManipulationMode.TRANSLATE,
        })
      );
    });
  });

  describe('updateDrag', () => {
    it('should do nothing if not dragging', () => {
      const obj = new THREE.Object3D();
      manipulator.selectObject(obj);

      const callback = jest.fn();
      manipulator.onManipulation(callback);

      const raycaster = new THREE.Raycaster();
      manipulator.updateDrag(raycaster);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should update object position during drag', () => {
      const obj = new THREE.Object3D();
      obj.position.set(0, 0, 0);
      manipulator.selectObject(obj);
      manipulator.startDrag(new THREE.Vector3(0, 0, 0));

      const callback = jest.fn();
      manipulator.onManipulation(callback);

      const raycaster = new THREE.Raycaster();
      manipulator.updateDrag(raycaster);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'move',
        })
      );
    });

    it('should use collision system to validate position', () => {
      const obj = new THREE.Object3D();
      manipulator.selectObject(obj);
      manipulator.startDrag(new THREE.Vector3(0, 0, 0));

      const raycaster = new THREE.Raycaster();
      manipulator.updateDrag(raycaster);

      expect(mockCollisionSystem.snapToGrid).toHaveBeenCalled();
      expect(mockCollisionSystem.isValidPosition).toHaveBeenCalled();
    });

    it('should find nearest valid position when collision detected', () => {
      (mockCollisionSystem.isValidPosition as jest.Mock).mockReturnValueOnce(false);

      const obj = new THREE.Object3D();
      manipulator.selectObject(obj);
      manipulator.startDrag(new THREE.Vector3(0, 0, 0));

      const raycaster = new THREE.Raycaster();
      manipulator.updateDrag(raycaster);

      expect(mockCollisionSystem.findNearestValidPosition).toHaveBeenCalled();
    });
  });

  describe('endDrag', () => {
    it('should do nothing if not dragging', () => {
      const callback = jest.fn();
      manipulator.onManipulation(callback);

      manipulator.endDrag();

      expect(callback).not.toHaveBeenCalled();
    });

    it('should emit end event', () => {
      const obj = new THREE.Object3D();
      manipulator.selectObject(obj);
      manipulator.startDrag(new THREE.Vector3(0, 0, 0));

      const callback = jest.fn();
      manipulator.onManipulation(callback);

      manipulator.endDrag();

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'end',
        })
      );
    });

    it('should revert position on collision when overlap not allowed', () => {
      (mockCollisionSystem.checkCollision as jest.Mock).mockReturnValueOnce({
        collides: true,
        objects: [new THREE.Object3D()],
      });

      const obj = new THREE.Object3D();
      obj.position.set(5, 0, 5);
      manipulator.selectObject(obj);
      manipulator.startDrag(new THREE.Vector3(5, 0, 5));

      // Move object
      const raycaster = new THREE.Raycaster();
      manipulator.updateDrag(raycaster);

      // End drag with collision
      manipulator.endDrag();

      // Position should be reverted
      expect(obj.position.x).toBe(5);
      expect(obj.position.z).toBe(5);
    });
  });

  describe('rotateObject', () => {
    it('should do nothing if no object selected', () => {
      const callback = jest.fn();
      manipulator.onManipulation(callback);

      manipulator.rotateObject(Math.PI / 4);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should rotate selected object', () => {
      const obj = new THREE.Object3D();
      obj.rotation.y = 0;
      manipulator.selectObject(obj);

      manipulator.rotateObject(Math.PI / 4);

      expect(obj.rotation.y).toBe(Math.PI / 4);
    });

    it('should accumulate rotation', () => {
      const obj = new THREE.Object3D();
      obj.rotation.y = Math.PI / 4;
      manipulator.selectObject(obj);

      manipulator.rotateObject(Math.PI / 4);

      expect(obj.rotation.y).toBe(Math.PI / 2);
    });

    it('should emit move event', () => {
      const obj = new THREE.Object3D();
      manipulator.selectObject(obj);

      const callback = jest.fn();
      manipulator.onManipulation(callback);

      manipulator.rotateObject(Math.PI / 4);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'move',
          rotation: expect.anything(),
        })
      );
    });
  });

  describe('scaleObject', () => {
    it('should do nothing if no object selected', () => {
      const callback = jest.fn();
      manipulator.onManipulation(callback);

      manipulator.scaleObject(1.5);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should scale selected object', () => {
      const obj = new THREE.Object3D();
      obj.scale.set(1, 1, 1);
      manipulator.selectObject(obj);

      manipulator.scaleObject(1.5);

      expect(obj.scale.x).toBe(1.5);
      expect(obj.scale.y).toBe(1.5);
      expect(obj.scale.z).toBe(1.5);
    });

    it('should not scale below minimum (0.5)', () => {
      const obj = new THREE.Object3D();
      obj.scale.set(0.6, 0.6, 0.6);
      manipulator.selectObject(obj);

      manipulator.scaleObject(0.5); // Would result in 0.3

      // Scale should remain unchanged
      expect(obj.scale.x).toBe(0.6);
    });

    it('should not scale above maximum (2.0)', () => {
      const obj = new THREE.Object3D();
      obj.scale.set(1.5, 1.5, 1.5);
      manipulator.selectObject(obj);

      manipulator.scaleObject(2); // Would result in 3.0

      // Scale should remain unchanged
      expect(obj.scale.x).toBe(1.5);
    });

    it('should emit move event on valid scale', () => {
      const obj = new THREE.Object3D();
      obj.scale.set(1, 1, 1);
      manipulator.selectObject(obj);

      const callback = jest.fn();
      manipulator.onManipulation(callback);

      manipulator.scaleObject(1.2);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'move',
          scale: expect.anything(),
        })
      );
    });
  });

  describe('deleteSelectedObject', () => {
    it('should do nothing if no object selected', () => {
      manipulator.deleteSelectedObject();

      expect(mockScene.children).toHaveLength(0);
    });

    it('should remove selected object from scene', () => {
      const obj = new THREE.Object3D();
      mockScene.add(obj);
      manipulator.selectObject(obj);

      manipulator.deleteSelectedObject();

      expect(mockScene.children).not.toContain(obj);
    });

    it('should remove from collision system', () => {
      const obj = new THREE.Object3D();
      manipulator.selectObject(obj);

      manipulator.deleteSelectedObject();

      expect(mockCollisionSystem.removeCollisionObject).toHaveBeenCalledWith(obj);
    });

    it('should clear selection after delete', () => {
      const obj = new THREE.Object3D();
      manipulator.selectObject(obj);

      manipulator.deleteSelectedObject();

      expect(manipulator.getSelectedObject()).toBeNull();
    });
  });

  describe('duplicateSelectedObject', () => {
    it('should return null if no object selected', () => {
      const result = manipulator.duplicateSelectedObject();

      expect(result).toBeNull();
    });

    it('should create a clone of selected object', () => {
      const obj = new THREE.Object3D();
      obj.position.set(1, 2, 3);
      manipulator.selectObject(obj);

      const clone = manipulator.duplicateSelectedObject();

      expect(clone).toBeDefined();
      expect(clone).not.toBe(obj);
    });

    it('should add clone to scene', () => {
      const obj = new THREE.Object3D();
      manipulator.selectObject(obj);

      manipulator.duplicateSelectedObject();

      expect(mockScene.children.length).toBeGreaterThan(0);
    });

    it('should offset clone position', () => {
      const obj = new THREE.Object3D();
      obj.position.set(0, 0, 0);
      manipulator.selectObject(obj);

      const clone = manipulator.duplicateSelectedObject();

      expect(clone?.position.x).toBe(0.5);
      expect(clone?.position.z).toBe(0.5);
    });

    it('should add clone to collision system', () => {
      const obj = new THREE.Object3D();
      manipulator.selectObject(obj);

      const clone = manipulator.duplicateSelectedObject();

      expect(mockCollisionSystem.addCollisionObject).toHaveBeenCalledWith(clone);
    });
  });

  describe('onManipulation', () => {
    it('should register manipulation callback', () => {
      const callback = jest.fn();
      manipulator.onManipulation(callback);

      const obj = new THREE.Object3D();
      manipulator.selectObject(obj);
      manipulator.rotateObject(0.1);

      expect(callback).toHaveBeenCalled();
    });

    it('should receive correct event structure', () => {
      const callback = jest.fn();
      manipulator.onManipulation(callback);

      const obj = new THREE.Object3D();
      manipulator.selectObject(obj);
      manipulator.rotateObject(0.1);

      const event = callback.mock.calls[0][0] as ManipulationEvent;

      expect(event).toHaveProperty('type');
      expect(event).toHaveProperty('object');
      expect(event).toHaveProperty('mode');
      expect(event).toHaveProperty('position');
      expect(event).toHaveProperty('rotation');
      expect(event).toHaveProperty('scale');
    });
  });

  describe('reset', () => {
    it('should deselect object', () => {
      const obj = new THREE.Object3D();
      manipulator.selectObject(obj);

      manipulator.reset();

      expect(manipulator.getSelectedObject()).toBeNull();
    });

    it('should stop dragging', () => {
      const obj = new THREE.Object3D();
      manipulator.selectObject(obj);
      manipulator.startDrag(new THREE.Vector3(0, 0, 0));

      manipulator.reset();

      const callback = jest.fn();
      manipulator.onManipulation(callback);
      manipulator.endDrag();

      // endDrag should not emit event since we reset
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('getCamera', () => {
    it('should return the camera', () => {
      expect(manipulator.getCamera()).toBe(mockCamera);
    });
  });
});

describe('ManipulationMode enum', () => {
  it('should have correct values', () => {
    expect(ManipulationMode.TRANSLATE).toBe('translate');
    expect(ManipulationMode.ROTATE).toBe('rotate');
    expect(ManipulationMode.SCALE).toBe('scale');
  });
});
