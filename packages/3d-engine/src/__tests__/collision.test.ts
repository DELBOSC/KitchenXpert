/**
 * Tests for CollisionSystem class
 * @file src/__tests__/collision.test.ts
 */

import * as THREE from 'three';
import { CollisionSystem, CollisionResult, PlacementConstraints } from '../physics/collision';

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

    clamp(min: MockVector3, max: MockVector3): this {
      this.x = Math.max(min.x, Math.min(max.x, this.x));
      this.y = Math.max(min.y, Math.min(max.y, this.y));
      this.z = Math.max(min.z, Math.min(max.z, this.z));
      return this;
    }
  }

  class MockBox3 {
    min: MockVector3;
    max: MockVector3;

    constructor(min?: MockVector3, max?: MockVector3) {
      this.min = min || new MockVector3(Infinity, Infinity, Infinity);
      this.max = max || new MockVector3(-Infinity, -Infinity, -Infinity);
    }

    setFromObject(object: { position: MockVector3; scale: MockVector3 }): this {
      const pos = object.position;
      const scale = object.scale;
      this.min = new MockVector3(
        pos.x - scale.x / 2,
        pos.y - scale.y / 2,
        pos.z - scale.z / 2
      );
      this.max = new MockVector3(
        pos.x + scale.x / 2,
        pos.y + scale.y / 2,
        pos.z + scale.z / 2
      );
      return this;
    }

    intersectsBox(box: MockBox3): boolean {
      return !(
        this.max.x < box.min.x ||
        this.min.x > box.max.x ||
        this.max.y < box.min.y ||
        this.min.y > box.max.y ||
        this.max.z < box.min.z ||
        this.min.z > box.max.z
      );
    }

    containsBox(box: MockBox3): boolean {
      return (
        this.min.x <= box.min.x &&
        box.max.x <= this.max.x &&
        this.min.y <= box.min.y &&
        box.max.y <= this.max.y &&
        this.min.z <= box.min.z &&
        box.max.z <= this.max.z
      );
    }

    union(box: MockBox3): this {
      this.min.x = Math.min(this.min.x, box.min.x);
      this.min.y = Math.min(this.min.y, box.min.y);
      this.min.z = Math.min(this.min.z, box.min.z);
      this.max.x = Math.max(this.max.x, box.max.x);
      this.max.y = Math.max(this.max.y, box.max.y);
      this.max.z = Math.max(this.max.z, box.max.z);
      return this;
    }
  }

  class MockObject3D {
    position: MockVector3;
    scale: MockVector3;
    userData: Record<string, unknown>;

    constructor() {
      this.position = new MockVector3();
      this.scale = new MockVector3(1, 1, 1);
      this.userData = {};
    }

    updateMatrixWorld(_force?: boolean): void {
      // No-op
    }
  }

  class MockScene extends MockObject3D {
    children: MockObject3D[] = [];

    traverse(callback: (obj: MockObject3D) => void): void {
      callback(this);
      this.children.forEach((child) => {
        callback(child);
      });
    }
  }

  return {
    Vector3: MockVector3,
    Box3: MockBox3,
    Object3D: MockObject3D,
    Scene: MockScene,
  };
});

describe('CollisionSystem', () => {
  let collisionSystem: CollisionSystem;

  beforeEach(() => {
    jest.clearAllMocks();
    collisionSystem = new CollisionSystem();
  });

  describe('constructor', () => {
    it('should create system with default constraints', () => {
      const constraints = collisionSystem.getConstraints();

      expect(constraints.minDistanceToWall).toBe(0.05);
      expect(constraints.minDistanceBetweenObjects).toBe(0.02);
      expect(constraints.snapToGrid).toBe(true);
      expect(constraints.gridSize).toBe(0.01);
      expect(constraints.allowOverlap).toBe(false);
    });

    it('should create system with custom constraints', () => {
      const customConstraints: PlacementConstraints = {
        minDistanceToWall: 0.1,
        minDistanceBetweenObjects: 0.05,
        snapToGrid: false,
        gridSize: 0.02,
        allowOverlap: true,
      };

      const customSystem = new CollisionSystem(customConstraints);
      const constraints = customSystem.getConstraints();

      expect(constraints.minDistanceToWall).toBe(0.1);
      expect(constraints.minDistanceBetweenObjects).toBe(0.05);
      expect(constraints.snapToGrid).toBe(false);
      expect(constraints.gridSize).toBe(0.02);
      expect(constraints.allowOverlap).toBe(true);
    });
  });

  describe('addCollisionObject', () => {
    it('should add object to collision detection', () => {
      const obj = new THREE.Object3D();
      collisionSystem.addCollisionObject(obj);

      // Check collision with itself should work
      const result = collisionSystem.checkCollision(obj, false);
      expect(result.objects).toContain(obj);
    });
  });

  describe('removeCollisionObject', () => {
    it('should remove object from collision detection', () => {
      const obj = new THREE.Object3D();
      collisionSystem.addCollisionObject(obj);
      collisionSystem.removeCollisionObject(obj);

      const result = collisionSystem.checkCollision(obj, false);
      expect(result.objects).not.toContain(obj);
    });
  });

  describe('checkCollision', () => {
    it('should detect collision between overlapping objects', () => {
      const obj1 = new THREE.Object3D();
      obj1.position.set(0, 0, 0);
      obj1.scale.set(2, 2, 2);

      const obj2 = new THREE.Object3D();
      obj2.position.set(0.5, 0, 0);
      obj2.scale.set(2, 2, 2);

      collisionSystem.addCollisionObject(obj1);
      collisionSystem.addCollisionObject(obj2);

      const result = collisionSystem.checkCollision(obj1);

      expect(result.collides).toBe(true);
      expect(result.objects).toContain(obj2);
    });

    it('should not detect collision between distant objects', () => {
      const obj1 = new THREE.Object3D();
      obj1.position.set(0, 0, 0);
      obj1.scale.set(1, 1, 1);

      const obj2 = new THREE.Object3D();
      obj2.position.set(10, 0, 0);
      obj2.scale.set(1, 1, 1);

      collisionSystem.addCollisionObject(obj1);
      collisionSystem.addCollisionObject(obj2);

      const result = collisionSystem.checkCollision(obj1);

      expect(result.collides).toBe(false);
      expect(result.objects).toHaveLength(0);
    });

    it('should exclude self when excludeSelf is true', () => {
      const obj = new THREE.Object3D();
      collisionSystem.addCollisionObject(obj);

      const result = collisionSystem.checkCollision(obj, true);

      expect(result.objects).not.toContain(obj);
    });

    it('should include self when excludeSelf is false', () => {
      const obj = new THREE.Object3D();
      collisionSystem.addCollisionObject(obj);

      const result = collisionSystem.checkCollision(obj, false);

      expect(result.objects).toContain(obj);
    });

    it('should return correct CollisionResult structure', () => {
      const obj = new THREE.Object3D();
      collisionSystem.addCollisionObject(obj);

      const result: CollisionResult = collisionSystem.checkCollision(obj);

      expect(result).toHaveProperty('collides');
      expect(result).toHaveProperty('objects');
      expect(typeof result.collides).toBe('boolean');
      expect(Array.isArray(result.objects)).toBe(true);
    });
  });

  describe('isValidPosition', () => {
    it('should return true for position without collision', () => {
      const obj = new THREE.Object3D();
      obj.scale.set(1, 1, 1);

      const scene = new THREE.Scene();
      const position = new THREE.Vector3(10, 0, 10);

      const isValid = collisionSystem.isValidPosition(obj, position, scene);

      expect(isValid).toBe(true);
    });

    it('should return false for position with collision', () => {
      const obj1 = new THREE.Object3D();
      obj1.position.set(0, 0, 0);
      obj1.scale.set(2, 2, 2);

      const obj2 = new THREE.Object3D();
      obj2.scale.set(1, 1, 1);

      collisionSystem.addCollisionObject(obj1);
      collisionSystem.addCollisionObject(obj2);

      const scene = new THREE.Scene();
      const position = new THREE.Vector3(0, 0, 0);

      const isValid = collisionSystem.isValidPosition(obj2, position, scene);

      expect(isValid).toBe(false);
    });

    it('should return true for collision when allowOverlap is true', () => {
      const overlapSystem = new CollisionSystem({ allowOverlap: true });

      const obj1 = new THREE.Object3D();
      obj1.position.set(0, 0, 0);
      obj1.scale.set(2, 2, 2);

      const obj2 = new THREE.Object3D();
      obj2.scale.set(1, 1, 1);

      overlapSystem.addCollisionObject(obj1);
      overlapSystem.addCollisionObject(obj2);

      const scene = new THREE.Scene();
      const position = new THREE.Vector3(0, 0, 0);

      const isValid = overlapSystem.isValidPosition(obj2, position, scene);

      expect(isValid).toBe(true);
    });

    it('should restore original position after check', () => {
      const obj = new THREE.Object3D();
      obj.position.set(5, 5, 5);
      obj.scale.set(1, 1, 1);

      const scene = new THREE.Scene();
      const testPosition = new THREE.Vector3(10, 0, 10);

      collisionSystem.isValidPosition(obj, testPosition, scene);

      expect(obj.position.x).toBe(5);
      expect(obj.position.y).toBe(5);
      expect(obj.position.z).toBe(5);
    });
  });

  describe('findNearestValidPosition', () => {
    it('should return target position if already valid', () => {
      const obj = new THREE.Object3D();
      obj.scale.set(1, 1, 1);

      const scene = new THREE.Scene();
      const targetPosition = new THREE.Vector3(10, 0, 10);

      const result = collisionSystem.findNearestValidPosition(obj, targetPosition, scene);

      expect(result).toBeDefined();
      expect(result?.x).toBe(10);
      expect(result?.z).toBe(10);
    });

    it('should find nearby valid position when target is invalid', () => {
      const obstacle = new THREE.Object3D();
      obstacle.position.set(0, 0, 0);
      obstacle.scale.set(2, 2, 2);

      const obj = new THREE.Object3D();
      obj.scale.set(0.5, 0.5, 0.5);

      collisionSystem.addCollisionObject(obstacle);
      collisionSystem.addCollisionObject(obj);

      const scene = new THREE.Scene();
      const targetPosition = new THREE.Vector3(0, 0, 0); // Collides with obstacle

      const result = collisionSystem.findNearestValidPosition(obj, targetPosition, scene, 5);

      // Should find a position that doesn't collide
      expect(result).toBeDefined();
    });

    it('should return null when no valid position within maxDistance', () => {
      // Create many obstacles covering large area
      for (let x = -5; x <= 5; x++) {
        for (let z = -5; z <= 5; z++) {
          const obstacle = new THREE.Object3D();
          obstacle.position.set(x, 0, z);
          obstacle.scale.set(1, 1, 1);
          collisionSystem.addCollisionObject(obstacle);
        }
      }

      const obj = new THREE.Object3D();
      obj.scale.set(0.5, 0.5, 0.5);
      collisionSystem.addCollisionObject(obj);

      const scene = new THREE.Scene();
      const targetPosition = new THREE.Vector3(0, 0, 0);

      const result = collisionSystem.findNearestValidPosition(obj, targetPosition, scene, 0.001);

      expect(result).toBeNull();
    });
  });

  describe('snapToGrid', () => {
    it('should snap position to grid when enabled', () => {
      const position = new THREE.Vector3(1.234, 0.5, 2.567);
      const snapped = collisionSystem.snapToGrid(position);

      // Default grid size is 0.01
      expect(snapped.x).toBeCloseTo(1.23, 2);
      expect(snapped.y).toBe(0.5); // Y is not snapped
      expect(snapped.z).toBeCloseTo(2.57, 2);
    });

    it('should not snap when snapToGrid is disabled', () => {
      const noSnapSystem = new CollisionSystem({ snapToGrid: false });
      const position = new THREE.Vector3(1.234, 0.5, 2.567);
      const result = noSnapSystem.snapToGrid(position);

      expect(result).toBe(position);
    });

    it('should use custom grid size', () => {
      const customGridSystem = new CollisionSystem({ gridSize: 0.5 });
      const position = new THREE.Vector3(1.3, 0, 2.7);
      const snapped = customGridSystem.snapToGrid(position);

      expect(snapped.x).toBe(1.5);
      expect(snapped.z).toBe(2.5);
    });
  });

  describe('distanceBetweenObjects', () => {
    it('should return 0 for overlapping objects', () => {
      const obj1 = new THREE.Object3D();
      obj1.position.set(0, 0, 0);
      obj1.scale.set(2, 2, 2);

      const obj2 = new THREE.Object3D();
      obj2.position.set(0.5, 0, 0);
      obj2.scale.set(2, 2, 2);

      const distance = collisionSystem.distanceBetweenObjects(obj1, obj2);

      expect(distance).toBe(0);
    });

    it('should calculate correct distance between non-overlapping objects', () => {
      const obj1 = new THREE.Object3D();
      obj1.position.set(0, 0, 0);
      obj1.scale.set(2, 2, 2); // Box from -1 to 1

      const obj2 = new THREE.Object3D();
      obj2.position.set(5, 0, 0);
      obj2.scale.set(2, 2, 2); // Box from 4 to 6

      const distance = collisionSystem.distanceBetweenObjects(obj1, obj2);

      // Distance should be 3 (from 1 to 4)
      expect(distance).toBe(3);
    });
  });

  describe('checkWallDistance', () => {
    it('should return true when object is far from walls', () => {
      const obj = new THREE.Object3D();
      obj.position.set(5, 0, 5);
      obj.scale.set(0.5, 0.5, 0.5);

      const wall = new THREE.Object3D();
      wall.position.set(0, 0, 0);
      wall.scale.set(10, 3, 0.2);

      const result = collisionSystem.checkWallDistance(obj, [wall]);

      expect(result).toBe(true);
    });

    it('should return false when object is too close to wall', () => {
      const obj = new THREE.Object3D();
      obj.position.set(0, 0, 0.1);
      obj.scale.set(0.5, 0.5, 0.5);

      const wall = new THREE.Object3D();
      wall.position.set(0, 0, 0);
      wall.scale.set(10, 3, 0.1);

      const result = collisionSystem.checkWallDistance(obj, [wall]);

      expect(result).toBe(false);
    });
  });

  describe('getPlacementBounds', () => {
    it('should return default bounds when no walls', () => {
      const scene = new THREE.Scene();

      const bounds = collisionSystem.getPlacementBounds(scene);

      expect(bounds.min.x).toBe(-10);
      expect(bounds.max.x).toBe(10);
    });

    it('should calculate bounds from walls', () => {
      const scene = new THREE.Scene();

      const wall = new THREE.Object3D();
      wall.userData.type = 'wall';
      wall.position.set(0, 0, 0);
      wall.scale.set(4, 3, 0.2);
      scene.children.push(wall);

      const bounds = collisionSystem.getPlacementBounds(scene);

      expect(bounds).toBeDefined();
    });
  });

  describe('isWithinBounds', () => {
    it('should return true when object is within bounds', () => {
      const obj = new THREE.Object3D();
      obj.position.set(0, 0, 0);
      obj.scale.set(1, 1, 1);

      const bounds = new THREE.Box3(
        new THREE.Vector3(-5, -5, -5),
        new THREE.Vector3(5, 5, 5)
      );

      const result = collisionSystem.isWithinBounds(obj, bounds);

      expect(result).toBe(true);
    });

    it('should return false when object is outside bounds', () => {
      const obj = new THREE.Object3D();
      obj.position.set(10, 0, 0);
      obj.scale.set(1, 1, 1);

      const bounds = new THREE.Box3(
        new THREE.Vector3(-5, -5, -5),
        new THREE.Vector3(5, 5, 5)
      );

      const result = collisionSystem.isWithinBounds(obj, bounds);

      expect(result).toBe(false);
    });
  });

  describe('clampToBounds', () => {
    it('should clamp position to bounds', () => {
      const position = new THREE.Vector3(10, 0, 10);
      const bounds = new THREE.Box3(
        new THREE.Vector3(-5, -5, -5),
        new THREE.Vector3(5, 5, 5)
      );

      const clamped = collisionSystem.clampToBounds(position, bounds);

      expect(clamped.x).toBe(5);
      expect(clamped.z).toBe(5);
    });

    it('should not modify position within bounds', () => {
      const position = new THREE.Vector3(2, 0, 3);
      const bounds = new THREE.Box3(
        new THREE.Vector3(-5, -5, -5),
        new THREE.Vector3(5, 5, 5)
      );

      const clamped = collisionSystem.clampToBounds(position, bounds);

      expect(clamped.x).toBe(2);
      expect(clamped.z).toBe(3);
    });
  });

  describe('updateConstraints', () => {
    it('should update specified constraints', () => {
      collisionSystem.updateConstraints({
        minDistanceToWall: 0.2,
        snapToGrid: false,
      });

      const constraints = collisionSystem.getConstraints();

      expect(constraints.minDistanceToWall).toBe(0.2);
      expect(constraints.snapToGrid).toBe(false);
      // Other constraints should remain unchanged
      expect(constraints.minDistanceBetweenObjects).toBe(0.02);
    });
  });

  describe('getConstraints', () => {
    it('should return a copy of constraints', () => {
      const constraints = collisionSystem.getConstraints();
      constraints.minDistanceToWall = 999;

      const freshConstraints = collisionSystem.getConstraints();

      expect(freshConstraints.minDistanceToWall).toBe(0.05);
    });
  });

  describe('clear', () => {
    it('should remove all collision objects', () => {
      const obj1 = new THREE.Object3D();
      const obj2 = new THREE.Object3D();

      collisionSystem.addCollisionObject(obj1);
      collisionSystem.addCollisionObject(obj2);
      collisionSystem.clear();

      const result = collisionSystem.checkCollision(obj1, false);

      expect(result.objects).toHaveLength(0);
    });
  });
});
