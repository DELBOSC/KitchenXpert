/**
 * Tests for WallAnalyzer
 * @file src/__tests__/wall-analysis.test.ts
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

import * as THREE from 'three';
import { WallAnalyzer, type WallSide } from '../ai/wall-analysis';
import type { PlacedItem3D, RoomConfig } from '../ai/ai-assistant';

describe('WallAnalyzer', () => {
  let analyzer: WallAnalyzer;

  beforeEach(() => {
    analyzer = new WallAnalyzer();
  });

  function makeRoom(width: number, depth: number): RoomConfig {
    return {
      width,
      depth,
      height: 2.5,
      walls: [],
    };
  }

  function makeItem(
    id: string,
    type: string,
    x: number,
    z: number,
    width: number,
    depth: number
  ): PlacedItem3D {
    return {
      id,
      type,
      position: new THREE.Vector3(x, 0, z),
      rotation: 0,
      dimensions: { width, height: 0.87, depth },
    };
  }

  describe('analyzeRoom() with empty room', () => {
    it('should return segments for all 4 walls', () => {
      const room = makeRoom(4, 3);
      const analysis = analyzer.analyzeRoom(room, []);

      // Should have segments for: back, left, right, front
      const wallSides = [...new Set(analysis.segments.map((s) => s.wallSide))];
      expect(wallSides).toContain('back');
      expect(wallSides).toContain('left');
      expect(wallSides).toContain('right');
      expect(wallSides).toContain('front');
    });

    it('should have one usable segment per wall for an empty room', () => {
      const room = makeRoom(4, 3);
      const analysis = analyzer.analyzeRoom(room, []);

      // Each wall should produce exactly one usable segment (no obstacles)
      for (const side of ['back', 'left', 'right', 'front'] as WallSide[]) {
        const wallSegments = analysis.segments.filter((s) => s.wallSide === side);
        expect(wallSegments).toHaveLength(1);
        expect(wallSegments[0]!.usable).toBe(true);
      }
    });

    it('should calculate wall lengths correctly', () => {
      const room = makeRoom(4, 3);
      const analysis = analyzer.analyzeRoom(room, []);

      expect(analysis.wallLengths.back).toBe(4);
      expect(analysis.wallLengths.front).toBe(4);
      expect(analysis.wallLengths.left).toBe(3);
      expect(analysis.wallLengths.right).toBe(3);
    });

    it('should have positive total usable length', () => {
      const room = makeRoom(4, 3);
      const analysis = analyzer.analyzeRoom(room, []);

      expect(analysis.totalUsableLength).toBeGreaterThan(0);
      // Total usable should be close to sum of all walls minus margins
      // 4 walls: back(4) + front(4) + left(3) + right(3) = 14m minus 4 * 0.1m margins = 13.6m
      expect(analysis.totalUsableLength).toBeCloseTo(4 + 4 + 3 + 3 - 8 * 0.05, 1);
    });
  });

  describe('analyzeRoom() with obstacles', () => {
    it('should have reduced usable segments when items are placed against a wall', () => {
      const room = makeRoom(4, 3);
      // Place a cabinet against the back wall (z close to 0)
      const items: PlacedItem3D[] = [makeItem('cab1', 'base_cabinet', 2.0, 0.3, 0.6, 0.6)];

      const analysis = analyzer.analyzeRoom(room, items);

      const backSegments = analysis.segments.filter((s) => s.wallSide === 'back');
      // Should have more than 1 segment (obstacle splits the wall)
      expect(backSegments.length).toBeGreaterThan(1);

      // Should have at least one non-usable segment (the obstacle itself)
      const nonUsable = backSegments.filter((s) => !s.usable);
      expect(nonUsable.length).toBeGreaterThan(0);
    });

    it('should correctly split wall into usable and non-usable segments', () => {
      const room = makeRoom(4, 3);
      // Place item centered at x=2 on back wall
      const items: PlacedItem3D[] = [makeItem('cab1', 'base_cabinet', 2.0, 0.3, 0.6, 0.6)];

      const analysis = analyzer.analyzeRoom(room, items);
      const backSegments = analysis.segments.filter((s) => s.wallSide === 'back');

      // Should have: [usable start -> obstacle start] [obstacle] [obstacle end -> usable end]
      const usableSegs = backSegments.filter((s) => s.usable);
      const obstacleSegs = backSegments.filter((s) => !s.usable);

      expect(obstacleSegs).toHaveLength(1);
      expect(obstacleSegs[0]!.obstacleIds).toContain('cab1');

      // Usable segments should exist on either side
      expect(usableSegs.length).toBeGreaterThanOrEqual(1);
    });

    it('should reduce total usable length when obstacles are present', () => {
      const room = makeRoom(4, 3);
      const emptyAnalysis = analyzer.analyzeRoom(room, []);

      const items: PlacedItem3D[] = [makeItem('cab1', 'base_cabinet', 2.0, 0.3, 1.0, 0.6)];
      const withObstacleAnalysis = analyzer.analyzeRoom(room, items);

      expect(withObstacleAnalysis.totalUsableLength).toBeLessThan(emptyAnalysis.totalUsableLength);
    });
  });

  describe('calculateWallLength()', () => {
    it('should return room width for back wall', () => {
      const room = makeRoom(4, 3);
      expect(analyzer.calculateWallLength('back', room)).toBe(4);
    });

    it('should return room width for front wall', () => {
      const room = makeRoom(4, 3);
      expect(analyzer.calculateWallLength('front', room)).toBe(4);
    });

    it('should return room depth for left wall', () => {
      const room = makeRoom(4, 3);
      expect(analyzer.calculateWallLength('left', room)).toBe(3);
    });

    it('should return room depth for right wall', () => {
      const room = makeRoom(4, 3);
      expect(analyzer.calculateWallLength('right', room)).toBe(3);
    });

    it('should handle square rooms correctly', () => {
      const room = makeRoom(3, 3);
      expect(analyzer.calculateWallLength('back', room)).toBe(3);
      expect(analyzer.calculateWallLength('left', room)).toBe(3);
      expect(analyzer.calculateWallLength('front', room)).toBe(3);
      expect(analyzer.calculateWallLength('right', room)).toBe(3);
    });
  });

  describe('findUsableSegments()', () => {
    it('should return one usable segment for empty wall', () => {
      const room = makeRoom(4, 3);
      const segments = analyzer.findUsableSegments('back', room, []);

      expect(segments).toHaveLength(1);
      expect(segments[0]!.usable).toBe(true);
      expect(segments[0]!.wallSide).toBe('back');
      // Length should be wall length minus 2 * margin (0.05)
      expect(segments[0]!.length).toBeCloseTo(4 - 0.1, 2);
    });

    it('should handle multiple obstacles on the same wall', () => {
      const room = makeRoom(4, 3);
      const items: PlacedItem3D[] = [
        makeItem('cab1', 'base_cabinet', 1.0, 0.3, 0.6, 0.6),
        makeItem('cab2', 'base_cabinet', 3.0, 0.3, 0.6, 0.6),
      ];

      const segments = analyzer.findUsableSegments('back', room, items);

      // Should have usable gaps between obstacles
      const usableSegs = segments.filter((s) => s.usable);
      const obstacleSegs = segments.filter((s) => !s.usable);

      expect(obstacleSegs).toHaveLength(2);
      expect(usableSegs.length).toBeGreaterThanOrEqual(1);
    });

    it('should not include items that are not against this wall', () => {
      const room = makeRoom(4, 3);
      // Place item against front wall (z ~ 3), not back wall
      const items: PlacedItem3D[] = [makeItem('cab1', 'base_cabinet', 2.0, 2.7, 0.6, 0.6)];

      const backSegments = analyzer.findUsableSegments('back', room, items);
      // Should have one usable segment (the item is not against the back wall)
      expect(backSegments).toHaveLength(1);
      expect(backSegments[0]!.usable).toBe(true);
    });

    it('should detect item against the front wall', () => {
      const room = makeRoom(4, 3);
      // Place item against front wall (z + halfDepth > room.depth - 0.5)
      const items: PlacedItem3D[] = [makeItem('cab1', 'base_cabinet', 2.0, 2.8, 0.6, 0.6)];

      const frontSegments = analyzer.findUsableSegments('front', room, items);
      const obstacleSegs = frontSegments.filter((s) => !s.usable);
      expect(obstacleSegs.length).toBeGreaterThan(0);
    });
  });

  describe('segment properties', () => {
    it('segments should have valid start and end positions', () => {
      const room = makeRoom(4, 3);
      const items: PlacedItem3D[] = [makeItem('cab1', 'base_cabinet', 2.0, 0.3, 0.6, 0.6)];

      const analysis = analyzer.analyzeRoom(room, items);

      for (const seg of analysis.segments) {
        expect(seg.startX).toBeLessThan(seg.endX);
        expect(seg.length).toBeCloseTo(seg.endX - seg.startX, 5);
        expect(seg.length).toBeGreaterThan(0);
        expect(typeof seg.usable).toBe('boolean');
      }
    });
  });
});
