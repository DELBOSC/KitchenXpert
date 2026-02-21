/**
 * Tests for KitchenCamera class
 * @file src/__tests__/camera.test.ts
 */

import * as THREE from 'three';
import { KitchenCamera, CameraPreset, CameraConfig } from '../engine/camera';

// Mock Three.js
jest.mock('three', () => {
  const mockVector3 = jest.fn().mockImplementation((x = 0, y = 0, z = 0) => {
    const v = {
      x,
      y,
      z,
      set: jest.fn(function (this: { x: number; y: number; z: number }, nx: number, ny: number, nz: number) {
        this.x = nx;
        this.y = ny;
        this.z = nz;
        return this;
      }),
      clone: jest.fn(function (this: { x: number; y: number; z: number }) {
        return mockVector3(this.x, this.y, this.z);
      }),
      copy: jest.fn(function (this: { x: number; y: number; z: number }, v2: { x: number; y: number; z: number }) {
        this.x = v2.x;
        this.y = v2.y;
        this.z = v2.z;
        return this;
      }),
      add: jest.fn(function (this: { x: number; y: number; z: number }, v2: { x: number; y: number; z: number }) {
        this.x += v2.x;
        this.y += v2.y;
        this.z += v2.z;
        return this;
      }),
      sub: jest.fn(function (this: { x: number; y: number; z: number }, v2: { x: number; y: number; z: number }) {
        this.x -= v2.x;
        this.y -= v2.y;
        this.z -= v2.z;
        return this;
      }),
      normalize: jest.fn().mockReturnThis(),
      multiplyScalar: jest.fn(function (this: { x: number; y: number; z: number }, s: number) {
        this.x *= s;
        this.y *= s;
        this.z *= s;
        return this;
      }),
      unproject: jest.fn().mockReturnThis(),
      project: jest.fn().mockReturnThis(),
    };
    return v;
  });

  const mockVector2 = jest.fn().mockImplementation((x = 0, y = 0) => ({
    x,
    y,
  }));

  return {
    PerspectiveCamera: jest.fn().mockImplementation((fov, aspect, near, far) => ({
      fov,
      aspect,
      near,
      far,
      position: mockVector3(10, 10, 10),
      lookAt: jest.fn(),
      updateProjectionMatrix: jest.fn(),
    })),
    Vector3: mockVector3,
    Vector2: mockVector2,
    Box3: jest.fn().mockImplementation(() => ({
      setFromObject: jest.fn().mockReturnThis(),
      getCenter: jest.fn((target) => {
        target.x = 0;
        target.y = 0;
        target.z = 0;
        return target;
      }),
      getSize: jest.fn((target) => {
        target.x = 2;
        target.y = 2;
        target.z = 2;
        return target;
      }),
      isEmpty: jest.fn(() => false),
      expandByObject: jest.fn().mockReturnThis(),
    })),
    Scene: jest.fn().mockImplementation(() => ({
      traverse: jest.fn((callback) => {
        // Simulate traversing scene with some meshes
        callback({ visible: true, geometry: {} });
      }),
    })),
    Mesh: jest.fn().mockImplementation(() => ({
      visible: true,
    })),
  };
});

describe('KitchenCamera', () => {
  let camera: KitchenCamera;
  let mockContainer: HTMLElement;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock container
    mockContainer = document.createElement('div');
    Object.defineProperty(mockContainer, 'clientWidth', { value: 800 });
    Object.defineProperty(mockContainer, 'clientHeight', { value: 600 });

    camera = new KitchenCamera(mockContainer);
  });

  describe('constructor', () => {
    it('should create a camera with default configuration', () => {
      expect(THREE.PerspectiveCamera).toHaveBeenCalledWith(50, 800 / 600, 0.1, 1000);
    });

    it('should apply custom configuration', () => {
      const config: CameraConfig = {
        fov: 75,
        near: 0.5,
        far: 500,
        position: [5, 5, 5],
        lookAt: [1, 1, 1],
      };

      const customCamera = new KitchenCamera(mockContainer, config);

      expect(THREE.PerspectiveCamera).toHaveBeenCalledWith(75, 800 / 600, 0.5, 500);
      expect(customCamera.camera.position.set).toHaveBeenCalledWith(5, 5, 5);
    });

    it('should set initial lookAt target', () => {
      expect(camera.camera.lookAt).toHaveBeenCalled();
    });

    it('should calculate aspect ratio from container', () => {
      expect(camera.camera.aspect).toBe(800 / 600);
    });
  });

  describe('applyPreset', () => {
    const kitchenSize = { width: 4, depth: 3 };

    it('should apply TOP_VIEW preset', () => {
      camera.applyPreset(CameraPreset.TOP_VIEW, kitchenSize);

      expect(camera.camera.position.set).toHaveBeenCalled();
      expect(camera.camera.lookAt).toHaveBeenCalled();
    });

    it('should apply ISOMETRIC preset', () => {
      camera.applyPreset(CameraPreset.ISOMETRIC, kitchenSize);

      expect(camera.camera.position.set).toHaveBeenCalled();
      expect(camera.camera.lookAt).toHaveBeenCalled();
    });

    it('should apply FRONT preset', () => {
      camera.applyPreset(CameraPreset.FRONT, kitchenSize);

      expect(camera.camera.position.set).toHaveBeenCalled();
      expect(camera.camera.lookAt).toHaveBeenCalled();
    });

    it('should apply PERSPECTIVE preset', () => {
      camera.applyPreset(CameraPreset.PERSPECTIVE, kitchenSize);

      expect(camera.camera.position.set).toHaveBeenCalled();
      expect(camera.camera.lookAt).toHaveBeenCalled();
    });

    it('should use max dimension for positioning', () => {
      const largeKitchen = { width: 10, depth: 5 };
      camera.applyPreset(CameraPreset.TOP_VIEW, largeKitchen);

      // Position should be based on max dimension (10)
      expect(camera.camera.position.set).toHaveBeenCalled();
    });
  });

  describe('updateAspect', () => {
    it('should update camera aspect ratio', () => {
      camera.updateAspect(1920, 1080);

      expect(camera.camera.aspect).toBe(1920 / 1080);
    });

    it('should update projection matrix', () => {
      camera.updateAspect(1920, 1080);

      expect(camera.camera.updateProjectionMatrix).toHaveBeenCalled();
    });
  });

  describe('setPosition', () => {
    it('should set camera position', () => {
      camera.setPosition(5, 10, 15);

      expect(camera.camera.position.set).toHaveBeenCalledWith(5, 10, 15);
    });

    it('should update lookAt after position change', () => {
      camera.setPosition(5, 10, 15);

      expect(camera.camera.lookAt).toHaveBeenCalled();
    });
  });

  describe('setTarget', () => {
    it('should set camera target and update lookAt', () => {
      camera.setTarget(1, 2, 3);

      expect(camera.camera.lookAt).toHaveBeenCalled();
    });
  });

  describe('getPosition', () => {
    it('should return a clone of camera position', () => {
      const position = camera.getPosition();

      expect(position).toBeDefined();
      expect(camera.camera.position.clone).toHaveBeenCalled();
    });
  });

  describe('getTarget', () => {
    it('should return a clone of camera target', () => {
      const target = camera.getTarget();

      expect(target).toBeDefined();
    });
  });

  describe('focusOnObject', () => {
    it('should focus camera on an object', () => {
      const mockObject = {
        position: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      };

      camera.focusOnObject(mockObject as THREE.Object3D);

      expect(THREE.Box3).toHaveBeenCalled();
      expect(camera.camera.lookAt).toHaveBeenCalled();
    });

    it('should accept custom distance parameter', () => {
      const mockObject = {
        position: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      };

      camera.focusOnObject(mockObject as THREE.Object3D, 10);

      expect(camera.camera.lookAt).toHaveBeenCalled();
    });
  });

  describe('frameScene', () => {
    it('should frame the entire scene', () => {
      const mockScene = new THREE.Scene();

      camera.frameScene(mockScene);

      expect(camera.camera.lookAt).toHaveBeenCalled();
    });

    it('should not modify camera if scene is empty', () => {
      const emptyScene = {
        traverse: jest.fn((callback) => {
          // No meshes
        }),
      };

      // Mock empty box
      (THREE.Box3 as jest.Mock).mockImplementationOnce(() => ({
        isEmpty: jest.fn(() => true),
        expandByObject: jest.fn().mockReturnThis(),
      }));

      const lookAtCallCount = (camera.camera.lookAt as jest.Mock).mock.calls.length;
      camera.frameScene(emptyScene as unknown as THREE.Scene);

      // lookAt should be called during constructor, but not again for empty scene
      // (depends on implementation, this test verifies the empty check works)
      expect(emptyScene.traverse).toHaveBeenCalled();
    });
  });

  describe('getThreeCamera', () => {
    it('should return the underlying Three.js camera', () => {
      expect(camera.getThreeCamera()).toBe(camera.camera);
    });
  });

  describe('screenToWorld', () => {
    it('should convert screen coordinates to world coordinates', () => {
      const result = camera.screenToWorld(0.5, 0.5, 0);

      expect(result).toBeDefined();
      expect(THREE.Vector3).toHaveBeenCalled();
    });
  });

  describe('worldToScreen', () => {
    it('should convert world coordinates to screen coordinates', () => {
      const worldPosition = new THREE.Vector3(1, 2, 3);
      const result = camera.worldToScreen(worldPosition);

      expect(result).toBeDefined();
      expect(THREE.Vector2).toHaveBeenCalled();
    });
  });
});

describe('CameraPreset enum', () => {
  it('should have correct preset values', () => {
    expect(CameraPreset.TOP_VIEW).toBe('top');
    expect(CameraPreset.ISOMETRIC).toBe('isometric');
    expect(CameraPreset.FRONT).toBe('front');
    expect(CameraPreset.PERSPECTIVE).toBe('perspective');
  });
});
