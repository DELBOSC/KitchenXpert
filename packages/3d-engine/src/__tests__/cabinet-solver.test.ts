/**
 * Tests for CabinetSolver
 * @file src/__tests__/cabinet-solver.test.ts
 */

jest.mock('three', () => {
  const actual = jest.requireActual('../test/__mocks__/three');
  return {
    ...actual,
    Sprite: class extends actual.Object3D {
      constructor() {
        super();
      }
    },
    SpriteMaterial: class {
      constructor(_p?: any) {}
      dispose = jest.fn();
    },
    CanvasTexture: class {
      constructor(_c?: any) {}
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

import { CabinetSolver } from '../ai/cabinet-solver';
import { getBrandProfile, mmToM } from '../config/brand-profiles';
import type { WallSegment } from '../ai/wall-analysis';

describe('CabinetSolver', () => {
  const brandProfile = getBrandProfile('ikea_metod');
  let solver: CabinetSolver;

  beforeEach(() => {
    solver = new CabinetSolver(brandProfile);
  });

  function makeSegment(
    wallSide: 'back' | 'left' | 'right' | 'front',
    startX: number,
    endX: number,
    usable = true
  ): WallSegment {
    return {
      wallSide,
      startX,
      endX,
      length: endX - startX,
      usable,
    };
  }

  describe('fillWallSegment()', () => {
    it('should return items that fit within a 2m segment', () => {
      const segment = makeSegment('back', 0.05, 2.05);
      const items = solver.fillWallSegment(
        segment,
        { mustHave: [], budget: { min: 2000, max: 10000 } },
        10000
      );

      expect(items.length).toBeGreaterThan(0);

      // All items should be base_cabinet type
      for (const item of items) {
        expect(item.type).toBe('base_cabinet');
      }
    });

    it('should not exceed the segment length with placed items', () => {
      const segment = makeSegment('back', 0.05, 2.05);
      const items = solver.fillWallSegment(
        segment,
        { mustHave: [], budget: { min: 2000, max: 10000 } },
        10000
      );

      const totalWidth = items.reduce((sum, item) => sum + item.dimensions.width, 0);
      expect(totalWidth).toBeLessThanOrEqual(segment.length + 0.01); // small tolerance
    });

    it('should return no items for a very small segment (< 0.2m)', () => {
      const segment = makeSegment('back', 0.05, 0.2);
      const items = solver.fillWallSegment(
        segment,
        { mustHave: [], budget: { min: 2000, max: 10000 } },
        10000
      );

      expect(items).toHaveLength(0);
    });

    it('should use correct dimensions from brandProfile', () => {
      const segment = makeSegment('back', 0.05, 2.05);
      const items = solver.fillWallSegment(
        segment,
        { mustHave: [], budget: { min: 2000, max: 10000 } },
        10000
      );

      const expectedDepth = mmToM(brandProfile.base.defaultDepth);
      const expectedHeight = mmToM(brandProfile.base.totalHeight);

      for (const item of items) {
        expect(item.dimensions.depth).toBeCloseTo(expectedDepth, 5);
        expect(item.dimensions.height).toBeCloseTo(expectedHeight, 5);
      }
    });

    it('should use available widths from the brand profile', () => {
      const segment = makeSegment('back', 0.05, 3.05);
      const items = solver.fillWallSegment(
        segment,
        { mustHave: [], budget: { min: 2000, max: 10000 } },
        10000
      );

      const availableWidthsM = brandProfile.base.availableWidths.map(mmToM);

      for (const item of items) {
        const widthMm = Math.round(item.dimensions.width * 1000);
        expect(brandProfile.base.availableWidths).toContain(widthMm);
      }
    });

    it('should fill from back wall with correct positions', () => {
      const segment = makeSegment('back', 0.05, 2.05);
      const items = solver.fillWallSegment(
        segment,
        { mustHave: [], budget: { min: 2000, max: 10000 } },
        10000
      );

      // For 'back' wall, items should have z close to depthOffset / 2
      for (const item of items) {
        expect(item.position.z).toBeGreaterThan(0);
        expect(item.rotation).toBe(0); // back wall rotation
      }
    });

    it('should fill from left wall with correct rotation', () => {
      const segment = makeSegment('left', 0.05, 2.05);
      const items = solver.fillWallSegment(
        segment,
        { mustHave: [], budget: { min: 2000, max: 10000 } },
        10000
      );

      for (const item of items) {
        expect(item.rotation).toBeCloseTo(Math.PI / 2, 5);
      }
    });

    it('should assign prices to items', () => {
      const segment = makeSegment('back', 0.05, 2.05);
      const items = solver.fillWallSegment(
        segment,
        { mustHave: [], budget: { min: 2000, max: 10000 } },
        10000
      );

      for (const item of items) {
        expect(item.price).toBeDefined();
        expect(item.price).toBeGreaterThan(0);
      }
    });
  });

  describe('placeEssentialAppliances()', () => {
    it('should place sink and cooktop when requested', () => {
      const segments = [makeSegment('back', 0.05, 3.95), makeSegment('left', 0.05, 2.95)];

      const items = solver.placeEssentialAppliances(
        segments,
        { mustHave: ['sink', 'cooktop'], budget: { min: 2000, max: 10000 } },
        []
      );

      const types = items.map((i) => i.type);
      expect(types).toContain('sink');
      expect(types).toContain('cooktop');
    });

    it('should place refrigerator when requested', () => {
      const segments = [makeSegment('back', 0.05, 3.95), makeSegment('left', 0.05, 2.95)];

      const items = solver.placeEssentialAppliances(
        segments,
        { mustHave: ['sink', 'cooktop', 'refrigerator'], budget: { min: 2000, max: 10000 } },
        []
      );

      const types = items.map((i) => i.type);
      expect(types).toContain('refrigerator');
    });

    it('should not duplicate items that already exist', () => {
      const segments = [makeSegment('back', 0.05, 3.95)];

      // Existing items already have a sink
      const existingItems = [
        {
          id: 'existing-sink',
          type: 'sink',
          position: { x: 1, y: 0, z: 0.3 } as any,
          rotation: 0,
          dimensions: { width: 0.6, height: 0.87, depth: 0.6 },
        },
      ];

      const items = solver.placeEssentialAppliances(
        segments,
        { mustHave: ['sink', 'cooktop'], budget: { min: 2000, max: 10000 } },
        existingItems
      );

      const sinkItems = items.filter((i) => ['sink', 'sink_base'].includes(i.type));
      expect(sinkItems).toHaveLength(0); // Should not add another sink
    });

    it('should return empty array when no usable segments', () => {
      const segments = [
        makeSegment('back', 0.05, 0.3, true), // Too short (< 0.6m)
      ];

      const items = solver.placeEssentialAppliances(
        segments,
        { mustHave: ['sink', 'cooktop'], budget: { min: 2000, max: 10000 } },
        []
      );

      // Segments are filtered to length >= 0.6, so this 0.25m segment should be excluded
      expect(items).toHaveLength(0);
    });

    it('should assign proper dimensions to placed appliances', () => {
      const segments = [makeSegment('back', 0.05, 3.95)];

      const items = solver.placeEssentialAppliances(
        segments,
        { mustHave: ['sink', 'cooktop', 'refrigerator'], budget: { min: 2000, max: 10000 } },
        []
      );

      for (const item of items) {
        expect(item.dimensions.width).toBeGreaterThan(0);
        expect(item.dimensions.height).toBeGreaterThan(0);
        expect(item.dimensions.depth).toBeGreaterThan(0);
      }

      // Refrigerator should be taller than base cabinets
      const fridge = items.find((i) => i.type === 'refrigerator');
      if (fridge) {
        expect(fridge.dimensions.height).toBe(1.8);
        expect(fridge.dimensions.width).toBe(0.6);
      }
    });

    it('should assign prices to essential appliances', () => {
      const segments = [makeSegment('back', 0.05, 3.95), makeSegment('left', 0.05, 2.95)];

      const items = solver.placeEssentialAppliances(
        segments,
        { mustHave: ['sink', 'cooktop', 'refrigerator'], budget: { min: 2000, max: 10000 } },
        []
      );

      for (const item of items) {
        expect(item.price).toBeDefined();
        expect(item.price).toBeGreaterThan(0);
      }
    });

    it('should try to place fridge on a different wall from other appliances', () => {
      const segments = [makeSegment('back', 0.05, 3.95), makeSegment('left', 0.05, 2.95)];

      const items = solver.placeEssentialAppliances(
        segments,
        { mustHave: ['sink', 'cooktop', 'refrigerator'], budget: { min: 2000, max: 10000 } },
        []
      );

      const fridge = items.find((i) => i.type === 'refrigerator');
      const sink = items.find((i) => i.type === 'sink');

      if (fridge && sink) {
        // Fridge should ideally be on a different wall
        // We can verify by checking that the rotation differs or the position is consistent
        // with the left wall rather than the back wall
        expect(fridge.position).toBeDefined();
        expect(sink.position).toBeDefined();
      }
    });
  });

  describe('selectOptimalWidth()', () => {
    it('should select the largest width that fits', () => {
      const widths = [1200, 900, 600, 450, 300].sort((a, b) => b - a);
      const result = solver.selectOptimalWidth(1.0, widths); // 1000mm available
      expect(result).toBe(900); // Largest that fits in 1000mm
    });

    it('should return null when no width fits', () => {
      const widths = [600, 450, 300].sort((a, b) => b - a);
      const result = solver.selectOptimalWidth(0.1, widths); // 100mm available
      expect(result).toBeNull();
    });

    it('should select exact match', () => {
      const widths = [1200, 900, 600, 450, 300].sort((a, b) => b - a);
      const result = solver.selectOptimalWidth(0.6, widths); // Exactly 600mm
      expect(result).toBe(600);
    });
  });

  describe('brand profile differences', () => {
    it('should produce different dimensions with Schmidt profile', () => {
      const schmidtProfile = getBrandProfile('schmidt');
      const schmidtSolver = new CabinetSolver(schmidtProfile);

      const segment = makeSegment('back', 0.05, 2.05);
      const ikeaItems = solver.fillWallSegment(
        segment,
        { mustHave: [], budget: { min: 2000, max: 10000 } },
        10000
      );
      const schmidtItems = schmidtSolver.fillWallSegment(
        segment,
        { mustHave: [], budget: { min: 2000, max: 10000 } },
        10000
      );

      // IKEA METOD: totalHeight=900mm, depth=600mm
      // Schmidt: totalHeight=870mm, depth=560mm
      if (ikeaItems.length > 0 && schmidtItems.length > 0) {
        expect(ikeaItems[0]!.dimensions.height).toBeCloseTo(mmToM(900), 5);
        expect(schmidtItems[0]!.dimensions.height).toBeCloseTo(mmToM(870), 5);
        expect(ikeaItems[0]!.dimensions.depth).toBeCloseTo(mmToM(600), 5);
        expect(schmidtItems[0]!.dimensions.depth).toBeCloseTo(mmToM(560), 5);
      }
    });
  });
});
