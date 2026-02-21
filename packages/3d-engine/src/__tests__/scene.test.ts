/**
 * Tests for KitchenScene class
 * @file src/__tests__/scene.test.ts
 */

import * as THREE from 'three';
import { KitchenScene, SceneConfig } from '../engine/scene';

// Mock Three.js
jest.mock('three', () => {
  const mockVector3 = jest.fn().mockImplementation((x = 0, y = 0, z = 0) => ({
    x,
    y,
    z,
    set: jest.fn().mockReturnThis(),
    clone: jest.fn().mockReturnThis(),
    toArray: jest.fn().mockReturnValue([x, y, z]),
  }));

  const mockEuler = jest.fn().mockImplementation((x = 0, y = 0, z = 0) => ({
    x,
    y,
    z,
    toArray: jest.fn().mockReturnValue([x, y, z, 'XYZ']),
  }));

  const mockColor = jest.fn().mockImplementation((color = 0xffffff) => ({
    r: ((color >> 16) & 255) / 255,
    g: ((color >> 8) & 255) / 255,
    b: (color & 255) / 255,
  }));

  return {
    Scene: jest.fn().mockImplementation(() => ({
      background: null,
      fog: null,
      children: [],
      add: jest.fn(function (this: { children: unknown[] }, obj: unknown) {
        this.children.push(obj);
      }),
      remove: jest.fn(function (this: { children: unknown[] }, obj: unknown) {
        const index = this.children.indexOf(obj);
        if (index !== -1) this.children.splice(index, 1);
      }),
      getObjectByName: jest.fn().mockReturnValue(null),
    })),
    Color: mockColor,
    Fog: jest.fn().mockImplementation((color, near, far) => ({ color, near, far })),
    GridHelper: jest.fn().mockImplementation(() => ({
      name: '__grid_helper__',
      visible: true,
    })),
    AxesHelper: jest.fn().mockImplementation(() => ({
      name: '__axes_helper__',
    })),
    Object3D: jest.fn().mockImplementation(() => ({
      position: { x: 0, y: 0, z: 0, toArray: () => [0, 0, 0] },
      rotation: { x: 0, y: 0, z: 0, toArray: () => [0, 0, 0, 'XYZ'] },
      scale: { x: 1, y: 1, z: 1, toArray: () => [1, 1, 1] },
      userData: {},
      traverse: jest.fn((callback: (obj: unknown) => void) => {
        callback({});
      }),
    })),
    Mesh: jest.fn().mockImplementation(() => ({
      geometry: { dispose: jest.fn() },
      material: { dispose: jest.fn() },
      traverse: jest.fn(),
    })),
    Vector3: mockVector3,
    Euler: mockEuler,
  };
});

// Mock @kitchenxpert/common
jest.mock('@kitchenxpert/common', () => ({
  KitchenModel3D: {},
  Object3D: {},
}));

describe('KitchenScene', () => {
  let kitchenScene: KitchenScene;

  beforeEach(() => {
    jest.clearAllMocks();
    kitchenScene = new KitchenScene();
  });

  afterEach(() => {
    kitchenScene.dispose();
  });

  describe('constructor', () => {
    it('should create a scene with default configuration', () => {
      expect(kitchenScene.scene).toBeDefined();
      expect(THREE.Scene).toHaveBeenCalled();
    });

    it('should apply custom configuration', () => {
      const config: SceneConfig = {
        backgroundColor: 0x000000,
        fogEnabled: false,
        gridEnabled: false,
      };

      const customScene = new KitchenScene(config);
      expect(customScene).toBeDefined();
      customScene.dispose();
    });

    it('should create fog when fogEnabled is true', () => {
      const config: SceneConfig = {
        fogEnabled: true,
        fogColor: 0xcccccc,
        fogNear: 5,
        fogFar: 50,
      };

      const fogScene = new KitchenScene(config);
      expect(THREE.Fog).toHaveBeenCalled();
      fogScene.dispose();
    });

    it('should create grid when gridEnabled is true', () => {
      const config: SceneConfig = {
        gridEnabled: true,
        gridSize: 30,
        gridDivisions: 30,
      };

      const gridScene = new KitchenScene(config);
      expect(THREE.GridHelper).toHaveBeenCalled();
      gridScene.dispose();
    });

    it('should add axes helper to the scene', () => {
      expect(THREE.AxesHelper).toHaveBeenCalled();
    });
  });

  describe('addObject', () => {
    it('should add an object to the scene', () => {
      const mockObject = new THREE.Object3D();
      kitchenScene.addObject('test-id', mockObject);

      expect(kitchenScene.scene.add).toHaveBeenCalledWith(mockObject);
    });

    it('should store the object with its ID', () => {
      const mockObject = new THREE.Object3D();
      kitchenScene.addObject('test-id', mockObject);

      const retrieved = kitchenScene.getObject('test-id');
      expect(retrieved).toBe(mockObject);
    });

    it('should set userData.id on the object', () => {
      const mockObject = new THREE.Object3D();
      kitchenScene.addObject('test-id', mockObject);

      expect(mockObject.userData.id).toBe('test-id');
    });
  });

  describe('removeObject', () => {
    it('should remove an existing object and return true', () => {
      const mockObject = new THREE.Object3D();
      mockObject.traverse = jest.fn((callback: (obj: unknown) => void) => {
        callback(mockObject);
      });

      kitchenScene.addObject('test-id', mockObject);
      const result = kitchenScene.removeObject('test-id');

      expect(result).toBe(true);
      expect(kitchenScene.scene.remove).toHaveBeenCalledWith(mockObject);
    });

    it('should return false when removing non-existent object', () => {
      const result = kitchenScene.removeObject('non-existent');
      expect(result).toBe(false);
    });

    it('should no longer find the object after removal', () => {
      const mockObject = new THREE.Object3D();
      mockObject.traverse = jest.fn();

      kitchenScene.addObject('test-id', mockObject);
      kitchenScene.removeObject('test-id');

      expect(kitchenScene.getObject('test-id')).toBeUndefined();
    });
  });

  describe('getObject', () => {
    it('should return undefined for non-existent ID', () => {
      expect(kitchenScene.getObject('non-existent')).toBeUndefined();
    });

    it('should return the correct object for existing ID', () => {
      const mockObject = new THREE.Object3D();
      kitchenScene.addObject('test-id', mockObject);

      expect(kitchenScene.getObject('test-id')).toBe(mockObject);
    });
  });

  describe('getAllObjects', () => {
    it('should return empty map when no objects added', () => {
      const objects = kitchenScene.getAllObjects();
      expect(objects.size).toBe(0);
    });

    it('should return all added objects', () => {
      const obj1 = new THREE.Object3D();
      const obj2 = new THREE.Object3D();

      kitchenScene.addObject('obj1', obj1);
      kitchenScene.addObject('obj2', obj2);

      const objects = kitchenScene.getAllObjects();
      expect(objects.size).toBe(2);
      expect(objects.get('obj1')).toBe(obj1);
      expect(objects.get('obj2')).toBe(obj2);
    });

    it('should return a copy of the map', () => {
      const obj = new THREE.Object3D();
      kitchenScene.addObject('test', obj);

      const objects = kitchenScene.getAllObjects();
      objects.delete('test');

      // Original should still have the object
      expect(kitchenScene.getObject('test')).toBe(obj);
    });
  });

  describe('clear', () => {
    it('should remove all objects from the scene', () => {
      const obj1 = new THREE.Object3D();
      const obj2 = new THREE.Object3D();
      obj1.traverse = jest.fn();
      obj2.traverse = jest.fn();

      kitchenScene.addObject('obj1', obj1);
      kitchenScene.addObject('obj2', obj2);
      kitchenScene.clear();

      expect(kitchenScene.getAllObjects().size).toBe(0);
    });

    it('should call scene.remove for each object', () => {
      const obj1 = new THREE.Object3D();
      obj1.traverse = jest.fn();

      kitchenScene.addObject('obj1', obj1);
      kitchenScene.clear();

      expect(kitchenScene.scene.remove).toHaveBeenCalledWith(obj1);
    });
  });

  describe('toggleGrid', () => {
    it('should toggle grid visibility', () => {
      const gridScene = new KitchenScene({ gridEnabled: true });
      const mockGrid = { visible: true, name: '__grid_helper__' };

      // Access private grid for testing
      (gridScene as unknown as { grid: typeof mockGrid }).grid = mockGrid;

      gridScene.toggleGrid(false);
      expect(mockGrid.visible).toBe(false);

      gridScene.toggleGrid(true);
      expect(mockGrid.visible).toBe(true);

      gridScene.dispose();
    });
  });

  describe('setBackgroundColor', () => {
    it('should change the background color', () => {
      kitchenScene.setBackgroundColor(0xff0000);
      expect(THREE.Color).toHaveBeenCalledWith(0xff0000);
    });
  });

  describe('getThreeScene', () => {
    it('should return the underlying Three.js scene', () => {
      expect(kitchenScene.getThreeScene()).toBe(kitchenScene.scene);
    });
  });

  describe('toKitchenModel', () => {
    it('should serialize scene to KitchenModel3D format', () => {
      const mockObject = new THREE.Object3D();
      mockObject.position = { x: 1, y: 2, z: 3, toArray: () => [1, 2, 3] } as THREE.Vector3;
      mockObject.rotation = { x: 0, y: 0, z: 0, toArray: () => [0, 0, 0, 'XYZ'] } as THREE.Euler;
      mockObject.scale = { x: 1, y: 1, z: 1, toArray: () => [1, 1, 1] } as THREE.Vector3;
      mockObject.userData = { type: 'appliance' };

      kitchenScene.addObject('test-obj', mockObject);

      const cameraPos = new THREE.Vector3(5, 5, 5);
      const cameraTarget = new THREE.Vector3(0, 0, 0);

      const model = kitchenScene.toKitchenModel(cameraPos, cameraTarget);

      expect(model.version).toBe('1.0.0');
      expect(model.objects).toBeDefined();
      expect(model.camera).toBeDefined();
    });

    it('should include all objects in serialization', () => {
      const obj1 = new THREE.Object3D();
      const obj2 = new THREE.Object3D();
      obj1.position = { x: 0, y: 0, z: 0, toArray: () => [0, 0, 0] } as THREE.Vector3;
      obj1.rotation = { x: 0, y: 0, z: 0, toArray: () => [0, 0, 0, 'XYZ'] } as THREE.Euler;
      obj1.scale = { x: 1, y: 1, z: 1, toArray: () => [1, 1, 1] } as THREE.Vector3;
      obj1.userData = {};
      obj2.position = { x: 0, y: 0, z: 0, toArray: () => [0, 0, 0] } as THREE.Vector3;
      obj2.rotation = { x: 0, y: 0, z: 0, toArray: () => [0, 0, 0, 'XYZ'] } as THREE.Euler;
      obj2.scale = { x: 1, y: 1, z: 1, toArray: () => [1, 1, 1] } as THREE.Vector3;
      obj2.userData = {};

      kitchenScene.addObject('obj1', obj1);
      kitchenScene.addObject('obj2', obj2);

      const cameraPos = new THREE.Vector3();
      const cameraTarget = new THREE.Vector3();
      const model = kitchenScene.toKitchenModel(cameraPos, cameraTarget);

      expect(model.objects.length).toBe(2);
    });
  });

  describe('fromKitchenModel', () => {
    it('should clear existing objects before loading', async () => {
      const obj = new THREE.Object3D();
      obj.traverse = jest.fn();
      kitchenScene.addObject('existing', obj);

      const model = {
        version: '1.0.0',
        scene: {},
        camera: {
          position: [0, 0, 0] as [number, number, number],
          target: [0, 0, 0] as [number, number, number],
        },
        objects: [],
      };

      await kitchenScene.fromKitchenModel(model);

      expect(kitchenScene.getAllObjects().size).toBe(0);
    });
  });

  describe('dispose', () => {
    it('should clear all objects and remove helpers', () => {
      const obj = new THREE.Object3D();
      obj.traverse = jest.fn();
      kitchenScene.addObject('test', obj);

      kitchenScene.dispose();

      expect(kitchenScene.getAllObjects().size).toBe(0);
    });
  });
});
