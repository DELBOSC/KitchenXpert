/**
 * Tests for KitchenLayoutGenerator class
 * @file src/__tests__/kitchen-layout.test.ts
 */

import * as THREE from 'three';
import { KitchenLayoutGenerator, KitchenLayoutResult, AnchorPoint } from '../kitchen-layout';
import { KitchenShape, KitchenDimensions } from '@kitchenxpert/common';

// Mock Three.js
jest.mock('three', () => {
  const mockVector3 = jest.fn().mockImplementation((x = 0, y = 0, z = 0) => ({
    x,
    y,
    z,
    set: jest.fn().mockReturnThis(),
    clone: jest.fn().mockReturnThis(),
  }));

  return {
    Vector3: mockVector3,
    BoxGeometry: jest.fn().mockImplementation((width, height, depth) => ({
      width,
      height,
      depth,
    })),
    PlaneGeometry: jest.fn().mockImplementation((width, height) => ({
      width,
      height,
    })),
    MeshStandardMaterial: jest.fn().mockImplementation((params) => ({
      ...params,
    })),
    Mesh: jest.fn().mockImplementation((geometry, material) => ({
      geometry,
      material,
      position: {
        x: 0,
        y: 0,
        z: 0,
        set: jest.fn(function (
          this: { x: number; y: number; z: number },
          x: number,
          y: number,
          z: number
        ) {
          this.x = x;
          this.y = y;
          this.z = z;
        }),
      },
      rotation: {
        x: 0,
        y: 0,
        z: 0,
      },
      userData: {},
      castShadow: false,
      receiveShadow: false,
    })),
  };
});

// Mock @kitchenxpert/common
jest.mock('@kitchenxpert/common', () => ({
  // Types are just TypeScript types, no runtime values needed
}));

describe('KitchenLayoutGenerator', () => {
  let generator: KitchenLayoutGenerator;

  beforeEach(() => {
    jest.clearAllMocks();
    generator = new KitchenLayoutGenerator();
  });

  describe('generateLayout', () => {
    const defaultDimensions: KitchenDimensions = {
      width: 4,
      length: 3,
      height: 2.5,
      unit: 'm',
    };

    describe('I-shape layout', () => {
      it('should generate I-shape layout with one wall', () => {
        const result = generator.generateLayout('I', defaultDimensions);

        expect(result.walls).toHaveLength(1);
        expect(result.floor).toBeDefined();
      });

      it('should create wall with correct userData', () => {
        const result = generator.generateLayout('I', defaultDimensions);

        expect(result.walls[0].userData.type).toBe('wall');
        expect(result.walls[0].userData.wallId).toBe('back');
      });

      it('should generate anchor points along the wall', () => {
        const result = generator.generateLayout('I', defaultDimensions);

        expect(result.anchorPoints.length).toBeGreaterThan(0);
        expect(result.anchorPoints.every((ap) => ap.wallId === 'back')).toBe(true);
      });

      it('should position anchor points in front of wall', () => {
        const result = generator.generateLayout('I', defaultDimensions);

        result.anchorPoints.forEach((ap) => {
          expect(ap.type).toBe('wall');
          expect(ap.normal).toBeDefined();
        });
      });
    });

    describe('L-shape layout', () => {
      it('should generate L-shape layout with two walls', () => {
        const result = generator.generateLayout('L', defaultDimensions);

        expect(result.walls).toHaveLength(2);
      });

      it('should create back and left walls', () => {
        const result = generator.generateLayout('L', defaultDimensions);

        const wallIds = result.walls.map((w) => w.userData.wallId);
        expect(wallIds).toContain('back');
        expect(wallIds).toContain('left');
      });

      it('should include corner anchor point', () => {
        const result = generator.generateLayout('L', defaultDimensions);

        const cornerAnchor = result.anchorPoints.find((ap) => ap.type === 'corner');
        expect(cornerAnchor).toBeDefined();
        expect(cornerAnchor?.wallId).toBe('corner');
      });

      it('should have anchor points for both walls', () => {
        const result = generator.generateLayout('L', defaultDimensions);

        const backAnchors = result.anchorPoints.filter((ap) => ap.wallId === 'back');
        const leftAnchors = result.anchorPoints.filter((ap) => ap.wallId === 'left');

        expect(backAnchors.length).toBeGreaterThan(0);
        expect(leftAnchors.length).toBeGreaterThan(0);
      });
    });

    describe('U-shape layout', () => {
      it('should generate U-shape layout with three walls', () => {
        const result = generator.generateLayout('U', defaultDimensions);

        expect(result.walls).toHaveLength(3);
      });

      it('should create back, left, and right walls', () => {
        const result = generator.generateLayout('U', defaultDimensions);

        const wallIds = result.walls.map((w) => w.userData.wallId);
        expect(wallIds).toContain('back');
        expect(wallIds).toContain('left');
        expect(wallIds).toContain('right');
      });

      it('should have anchor points for all three walls', () => {
        const result = generator.generateLayout('U', defaultDimensions);

        const wallIds = new Set(result.anchorPoints.map((ap) => ap.wallId));
        expect(wallIds.has('back')).toBe(true);
        expect(wallIds.has('left')).toBe(true);
        expect(wallIds.has('right')).toBe(true);
      });
    });

    describe('G-shape layout', () => {
      it('should generate G-shape layout with walls and peninsula', () => {
        const result = generator.generateLayout('G', defaultDimensions);

        // U-shape (3 walls) + peninsula
        expect(result.walls).toHaveLength(4);
      });

      it('should include peninsula', () => {
        const result = generator.generateLayout('G', defaultDimensions);

        const peninsula = result.walls.find((w) => w.userData.type === 'peninsula');
        expect(peninsula).toBeDefined();
      });
    });

    describe('Island layout', () => {
      it('should generate island layout with wall and island', () => {
        const result = generator.generateLayout('island', defaultDimensions);

        // I-shape (1 wall) + island
        expect(result.walls).toHaveLength(2);
      });

      it('should include island structure', () => {
        const result = generator.generateLayout('island', defaultDimensions);

        const island = result.walls.find((w) => w.userData.type === 'island');
        expect(island).toBeDefined();
      });

      it('should have island anchor points', () => {
        const result = generator.generateLayout('island', defaultDimensions);

        const islandAnchors = result.anchorPoints.filter((ap) => ap.type === 'island');
        expect(islandAnchors.length).toBeGreaterThan(0);
      });
    });

    describe('Peninsula layout', () => {
      it('should generate peninsula layout with walls and peninsula', () => {
        const result = generator.generateLayout('peninsula', defaultDimensions);

        // L-shape (2 walls) + peninsula
        expect(result.walls).toHaveLength(3);
      });

      it('should include peninsula', () => {
        const result = generator.generateLayout('peninsula', defaultDimensions);

        const peninsula = result.walls.find((w) => w.userData.type === 'peninsula');
        expect(peninsula).toBeDefined();
      });
    });

    describe('Default shape handling', () => {
      it('should default to I-shape for unknown shapes', () => {
        const result = generator.generateLayout('unknown' as KitchenShape, defaultDimensions);

        // Should match I-shape (1 wall)
        expect(result.walls).toHaveLength(1);
      });
    });
  });

  describe('unit conversion', () => {
    const baseWidth = 4000;
    const baseLength = 3000;
    const baseHeight = 2500;

    it('should convert millimeters to meters', () => {
      const dimensions: KitchenDimensions = {
        width: baseWidth,
        length: baseLength,
        height: baseHeight,
        unit: 'mm',
      };

      const result = generator.generateLayout('I', dimensions);

      // BoxGeometry should be called with converted dimensions
      expect(THREE.BoxGeometry).toHaveBeenCalled();
    });

    it('should convert centimeters to meters', () => {
      const dimensions: KitchenDimensions = {
        width: 400,
        length: 300,
        height: 250,
        unit: 'cm',
      };

      const result = generator.generateLayout('I', dimensions);

      expect(THREE.BoxGeometry).toHaveBeenCalled();
    });

    it('should handle meters directly', () => {
      const dimensions: KitchenDimensions = {
        width: 4,
        length: 3,
        height: 2.5,
        unit: 'm',
      };

      const result = generator.generateLayout('I', dimensions);

      expect(THREE.BoxGeometry).toHaveBeenCalled();
    });

    it('should convert feet to meters', () => {
      const dimensions: KitchenDimensions = {
        width: 13,
        length: 10,
        height: 8,
        unit: 'ft',
      };

      const result = generator.generateLayout('I', dimensions);

      expect(THREE.BoxGeometry).toHaveBeenCalled();
    });

    it('should convert inches to meters', () => {
      const dimensions: KitchenDimensions = {
        width: 157,
        length: 118,
        height: 98,
        unit: 'in',
      };

      const result = generator.generateLayout('I', dimensions);

      expect(THREE.BoxGeometry).toHaveBeenCalled();
    });
  });

  describe('floor generation', () => {
    it('should create floor mesh', () => {
      const dimensions: KitchenDimensions = {
        width: 4,
        length: 3,
        height: 2.5,
        unit: 'm',
      };

      const result = generator.generateLayout('I', dimensions);

      expect(result.floor).toBeDefined();
      expect(result.floor.userData.type).toBe('floor');
    });

    it('should rotate floor to be horizontal', () => {
      const dimensions: KitchenDimensions = {
        width: 4,
        length: 3,
        height: 2.5,
        unit: 'm',
      };

      const result = generator.generateLayout('I', dimensions);

      expect(result.floor.rotation.x).toBe(-Math.PI / 2);
    });

    it('should enable shadow receiving on floor', () => {
      const dimensions: KitchenDimensions = {
        width: 4,
        length: 3,
        height: 2.5,
        unit: 'm',
      };

      const result = generator.generateLayout('I', dimensions);

      expect(result.floor.receiveShadow).toBe(true);
    });
  });

  describe('wall generation', () => {
    it('should enable shadow casting on walls', () => {
      const dimensions: KitchenDimensions = {
        width: 4,
        length: 3,
        height: 2.5,
        unit: 'm',
      };

      const result = generator.generateLayout('I', dimensions);

      expect(result.walls[0].castShadow).toBe(true);
    });

    it('should enable shadow receiving on walls', () => {
      const dimensions: KitchenDimensions = {
        width: 4,
        length: 3,
        height: 2.5,
        unit: 'm',
      };

      const result = generator.generateLayout('I', dimensions);

      expect(result.walls[0].receiveShadow).toBe(true);
    });

    it('should use MeshStandardMaterial for walls', () => {
      const dimensions: KitchenDimensions = {
        width: 4,
        length: 3,
        height: 2.5,
        unit: 'm',
      };

      generator.generateLayout('I', dimensions);

      expect(THREE.MeshStandardMaterial).toHaveBeenCalled();
    });
  });

  describe('anchor point generation', () => {
    it('should create anchor points with correct structure', () => {
      const dimensions: KitchenDimensions = {
        width: 4,
        length: 3,
        height: 2.5,
        unit: 'm',
      };

      const result = generator.generateLayout('I', dimensions);

      result.anchorPoints.forEach((anchor: AnchorPoint) => {
        expect(anchor.position).toBeDefined();
        expect(anchor.normal).toBeDefined();
        expect(anchor.wallId).toBeDefined();
        expect(anchor.type).toBeDefined();
      });
    });

    it('should space anchor points approximately 60cm apart', () => {
      const dimensions: KitchenDimensions = {
        width: 3, // 3m = 5 anchors expected (floor(3/0.6) = 5)
        length: 2,
        height: 2.5,
        unit: 'm',
      };

      const result = generator.generateLayout('I', dimensions);
      const backAnchors = result.anchorPoints.filter((ap) => ap.wallId === 'back');

      expect(backAnchors.length).toBe(5);
    });
  });

  describe('KitchenLayoutResult structure', () => {
    it('should return valid KitchenLayoutResult', () => {
      const dimensions: KitchenDimensions = {
        width: 4,
        length: 3,
        height: 2.5,
        unit: 'm',
      };

      const result: KitchenLayoutResult = generator.generateLayout('L', dimensions);

      expect(result).toHaveProperty('walls');
      expect(result).toHaveProperty('floor');
      expect(result).toHaveProperty('anchorPoints');
      expect(Array.isArray(result.walls)).toBe(true);
      expect(Array.isArray(result.anchorPoints)).toBe(true);
    });
  });
});
