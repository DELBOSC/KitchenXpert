/**
 * Tests for TechnicalConstraints
 * @file src/__tests__/technical-constraints.test.ts
 */

jest.mock('three', () => {
  const actual = jest.requireActual('../test/__mocks__/three');
  return {
    ...actual,
    Sprite: class extends actual.Object3D {
      material: any;
      renderOrder = 0;
      constructor(material?: any) {
        super();
        this.material = material || { dispose: jest.fn(), map: null };
      }
    },
    SpriteMaterial: class {
      map: any;
      transparent = true;
      depthTest = false;
      constructor(p?: any) {
        this.map = p?.map || null;
      }
      dispose = jest.fn();
    },
    CanvasTexture: class {
      constructor(_canvas?: any) {}
      dispose = jest.fn();
    },
    CircleGeometry: class extends actual.BufferGeometry {
      constructor() {
        super();
      }
    },
    LineBasicMaterial: class extends actual.Material {
      constructor(_p?: any) {
        super();
      }
    },
    LineDashedMaterial: class extends actual.Material {
      constructor(_p?: any) {
        super();
      }
      computeLineDistances = jest.fn();
    },
    LineLoop: class extends actual.Object3D {
      constructor() {
        super();
      }
      computeLineDistances = jest.fn();
    },
    MeshBasicMaterial: class extends actual.Material {
      constructor(_p?: any) {
        super();
      }
    },
    Group: class extends actual.Object3D {
      constructor() {
        super();
      }
    },
    PointLight: class extends actual.Light {
      constructor() {
        super();
      }
    },
    RectAreaLight: class extends actual.Light {
      constructor() {
        super();
      }
    },
  };
});

import * as THREE from 'three';
import {
  TechnicalConstraints,
  type TechnicalPoint,
  type TechnicalPointJSON,
} from '../technical/technical-constraints';

describe('TechnicalConstraints', () => {
  let scene: THREE.Scene;
  let tc: TechnicalConstraints;

  beforeEach(() => {
    scene = new THREE.Scene();
    tc = new TechnicalConstraints(scene);
  });

  afterEach(() => {
    tc.dispose();
  });

  describe('addPoint() / getPoint() / removePoint()', () => {
    it('should add and retrieve a point', () => {
      const point: TechnicalPoint = {
        id: 'p1',
        type: 'water',
        subtype: 'water_cold',
        position: new THREE.Vector3(1, 0.5, 0),
      };

      tc.addPoint(point);
      const retrieved = tc.getPoint('p1');

      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe('p1');
      expect(retrieved!.type).toBe('water');
      expect(retrieved!.subtype).toBe('water_cold');
      expect(retrieved!.position.x).toBe(1);
      expect(retrieved!.position.y).toBe(0.5);
      expect(retrieved!.position.z).toBe(0);
    });

    it('should return undefined for non-existent point', () => {
      expect(tc.getPoint('nonexistent')).toBeUndefined();
    });

    it('should remove a point and return it', () => {
      const point: TechnicalPoint = {
        id: 'p1',
        type: 'electric',
        subtype: 'electric_16a',
        position: new THREE.Vector3(2, 1, 0),
      };

      tc.addPoint(point);
      const removed = tc.removePoint('p1');

      expect(removed).toBeDefined();
      expect(removed!.id).toBe('p1');
      expect(tc.getPoint('p1')).toBeUndefined();
    });

    it('should return undefined when removing non-existent point', () => {
      const removed = tc.removePoint('nonexistent');
      expect(removed).toBeUndefined();
    });

    it('should store multiple points', () => {
      tc.addPoint({
        id: 'p1',
        type: 'water',
        subtype: 'water_cold',
        position: new THREE.Vector3(0, 0, 0),
      });
      tc.addPoint({
        id: 'p2',
        type: 'electric',
        subtype: 'electric_16a',
        position: new THREE.Vector3(1, 0, 0),
      });
      tc.addPoint({
        id: 'p3',
        type: 'gas',
        subtype: 'gas_inlet',
        position: new THREE.Vector3(2, 0, 0),
      });

      const all = tc.getAllPoints();
      expect(all).toHaveLength(3);
    });
  });

  describe('findNearestPoint()', () => {
    beforeEach(() => {
      tc.addPoint({
        id: 'w1',
        type: 'water',
        subtype: 'water_cold',
        position: new THREE.Vector3(0, 0, 0),
      });
      tc.addPoint({
        id: 'w2',
        type: 'water',
        subtype: 'water_hot',
        position: new THREE.Vector3(3, 0, 0),
      });
      tc.addPoint({
        id: 'e1',
        type: 'electric',
        subtype: 'electric_16a',
        position: new THREE.Vector3(5, 0, 0),
      });
    });

    it('should find the nearest point overall', () => {
      const result = tc.findNearestPoint(new THREE.Vector3(0.5, 0, 0));
      expect(result).not.toBeNull();
      expect(result!.point.id).toBe('w1');
      expect(result!.distance).toBeCloseTo(0.5, 5);
    });

    it('should find the nearest point of a specific type', () => {
      const result = tc.findNearestPoint(new THREE.Vector3(4, 0, 0), 'water');
      expect(result).not.toBeNull();
      expect(result!.point.id).toBe('w2');
      expect(result!.distance).toBeCloseTo(1, 5);
    });

    it('should find the nearest electric point', () => {
      const result = tc.findNearestPoint(new THREE.Vector3(4, 0, 0), 'electric');
      expect(result).not.toBeNull();
      expect(result!.point.id).toBe('e1');
      expect(result!.distance).toBeCloseTo(1, 5);
    });

    it('should return null when no points of the given type exist', () => {
      const result = tc.findNearestPoint(new THREE.Vector3(0, 0, 0), 'gas');
      expect(result).toBeNull();
    });

    it('should return null when no points exist at all', () => {
      const emptyTc = new TechnicalConstraints(new THREE.Scene());
      const result = emptyTc.findNearestPoint(new THREE.Vector3(0, 0, 0));
      expect(result).toBeNull();
      emptyTc.dispose();
    });
  });

  describe('calculateDisplacementCost()', () => {
    it('should return zero cost for items with no technical needs', () => {
      const result = tc.calculateDisplacementCost(new THREE.Vector3(0, 0, 0), 'base_cabinet');

      expect(result.cost).toBe(0);
      expect(result.breakdown).toContain('Aucun raccordement');
    });

    it('should have cost for sink far from water points', () => {
      // Add a water point far away
      tc.addPoint({
        id: 'w1',
        type: 'water',
        subtype: 'water_cold',
        position: new THREE.Vector3(0, 0, 0),
      });
      tc.addPoint({
        id: 'w2',
        type: 'water',
        subtype: 'water_hot',
        position: new THREE.Vector3(0, 0.5, 0),
      });
      tc.addPoint({
        id: 'w3',
        type: 'water',
        subtype: 'water_drain',
        position: new THREE.Vector3(0, 0, 0),
      });

      // Place sink far from water points (5m away)
      const result = tc.calculateDisplacementCost(new THREE.Vector3(5, 0, 0), 'sink');

      // Sink needs: water_cold (freeDistance=2m), water_hot (2m), water_drain (1.5m)
      // All are 5m away, so all have displacement cost
      expect(result.cost).toBeGreaterThan(0);
      expect(result.nearestPoint).not.toBeNull();
      expect(result.distance).toBeGreaterThan(0);
    });

    it('should have zero cost for sink near water points (within free distance)', () => {
      // Add water points right at sink position
      tc.addPoint({
        id: 'w1',
        type: 'water',
        subtype: 'water_cold',
        position: new THREE.Vector3(1, 0, 0),
      });
      tc.addPoint({
        id: 'w2',
        type: 'water',
        subtype: 'water_hot',
        position: new THREE.Vector3(1, 0.5, 0),
      });
      tc.addPoint({
        id: 'w3',
        type: 'water',
        subtype: 'water_drain',
        position: new THREE.Vector3(1, 0, 0),
      });

      const result = tc.calculateDisplacementCost(new THREE.Vector3(1, 0, 0), 'sink');

      expect(result.cost).toBe(0);
    });

    it('should have base cost for new line when no matching point exists', () => {
      // No water points at all, but requesting sink cost
      const result = tc.calculateDisplacementCost(new THREE.Vector3(2, 0, 0), 'sink');

      // Sink needs water_cold, water_hot, water_drain — all missing
      // base costs: 150 + 150 + 200 = 500
      expect(result.cost).toBe(500);
    });

    it('should report no cost for electric appliances with existing outlet (infinite free distance)', () => {
      tc.addPoint({
        id: 'e1',
        type: 'electric',
        subtype: 'electric_16a',
        position: new THREE.Vector3(0, 0, 0),
      });

      // Refrigerator needs electric_16a, which has infinite free distance
      const result = tc.calculateDisplacementCost(new THREE.Vector3(10, 0, 0), 'refrigerator');

      // electric_16a has freeDistance: Infinity, so even 10m away is free
      expect(result.cost).toBe(0);
    });
  });

  describe('toJSON() / fromJSON() round-trip', () => {
    it('should serialize and deserialize points correctly', () => {
      tc.addPoint({
        id: 'p1',
        type: 'water',
        subtype: 'water_cold',
        position: new THREE.Vector3(1, 2, 3),
        wallId: 'wall-back',
        metadata: { note: 'test' },
      });
      tc.addPoint({
        id: 'p2',
        type: 'electric',
        subtype: 'electric_32a',
        position: new THREE.Vector3(4, 5, 6),
      });

      const json = tc.toJSON();
      expect(json).toHaveLength(2);
      expect(json[0]!.id).toBe('p1');
      expect(json[0]!.position).toEqual({ x: 1, y: 2, z: 3 });
      expect(json[0]!.wallId).toBe('wall-back');
      expect(json[0]!.metadata).toEqual({ note: 'test' });
      expect(json[1]!.id).toBe('p2');
      expect(json[1]!.position).toEqual({ x: 4, y: 5, z: 6 });

      // Create a new instance and load from JSON
      const tc2 = new TechnicalConstraints(new THREE.Scene());
      tc2.fromJSON(json);

      expect(tc2.getAllPoints()).toHaveLength(2);
      const p1 = tc2.getPoint('p1');
      expect(p1).toBeDefined();
      expect(p1!.position.x).toBe(1);
      expect(p1!.position.y).toBe(2);
      expect(p1!.position.z).toBe(3);
      expect(p1!.wallId).toBe('wall-back');

      const p2 = tc2.getPoint('p2');
      expect(p2).toBeDefined();
      expect(p2!.type).toBe('electric');
      expect(p2!.subtype).toBe('electric_32a');

      tc2.dispose();
    });

    it('should clear existing points when loading from JSON', () => {
      tc.addPoint({
        id: 'old',
        type: 'gas',
        subtype: 'gas_inlet',
        position: new THREE.Vector3(0, 0, 0),
      });

      const newData: TechnicalPointJSON[] = [
        {
          id: 'new',
          type: 'ventilation',
          subtype: 'vmc_duct',
          position: { x: 5, y: 5, z: 5 },
        },
      ];

      tc.fromJSON(newData);
      expect(tc.getPoint('old')).toBeUndefined();
      expect(tc.getPoint('new')).toBeDefined();
      expect(tc.getAllPoints()).toHaveLength(1);
    });
  });

  describe('getPointsByType()', () => {
    it('should filter points by type', () => {
      tc.addPoint({
        id: 'w1',
        type: 'water',
        subtype: 'water_cold',
        position: new THREE.Vector3(0, 0, 0),
      });
      tc.addPoint({
        id: 'w2',
        type: 'water',
        subtype: 'water_hot',
        position: new THREE.Vector3(1, 0, 0),
      });
      tc.addPoint({
        id: 'e1',
        type: 'electric',
        subtype: 'electric_16a',
        position: new THREE.Vector3(2, 0, 0),
      });

      const waterPoints = tc.getPointsByType('water');
      expect(waterPoints).toHaveLength(2);
      expect(waterPoints.every((p) => p.type === 'water')).toBe(true);
    });
  });

  describe('visibility', () => {
    it('should default to visible', () => {
      expect(tc.isVisible()).toBe(true);
    });

    it('should toggle visibility', () => {
      tc.setVisible(false);
      expect(tc.isVisible()).toBe(false);

      tc.setVisible(true);
      expect(tc.isVisible()).toBe(true);
    });
  });

  describe('dispose()', () => {
    it('should clean up points and remove group from scene', () => {
      tc.addPoint({
        id: 'p1',
        type: 'water',
        subtype: 'water_cold',
        position: new THREE.Vector3(0, 0, 0),
      });
      tc.addPoint({
        id: 'p2',
        type: 'electric',
        subtype: 'electric_16a',
        position: new THREE.Vector3(1, 0, 0),
      });

      expect(tc.getAllPoints()).toHaveLength(2);

      tc.dispose();

      expect(tc.getAllPoints()).toHaveLength(0);
      // The spriteGroup should have been removed from the scene
      const techGroup = scene.children.find((c) => c.name === '__technical_points__');
      expect(techGroup).toBeUndefined();
    });
  });

  describe('clearAll()', () => {
    it('should clear all points but keep the group in the scene', () => {
      tc.addPoint({
        id: 'p1',
        type: 'water',
        subtype: 'water_cold',
        position: new THREE.Vector3(0, 0, 0),
      });

      tc.clearAll();

      expect(tc.getAllPoints()).toHaveLength(0);
      // Group should still be in the scene
      const techGroup = scene.children.find((c) => c.name === '__technical_points__');
      expect(techGroup).toBeDefined();
    });
  });
});
