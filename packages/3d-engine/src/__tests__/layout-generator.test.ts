/**
 * Tests for LayoutGenerator
 * @file src/__tests__/layout-generator.test.ts
 */

jest.mock('three', () => {
  const actual = jest.requireActual('../test/__mocks__/three');
  return {
    ...actual,
    Sprite: class extends actual.Object3D { constructor() { super(); } },
    SpriteMaterial: class { constructor(_p?: any) {} dispose = jest.fn(); },
    CanvasTexture: class { constructor(_c?: any) {} dispose = jest.fn(); },
    CircleGeometry: class extends actual.BufferGeometry { constructor() { super(); } },
    LineBasicMaterial: class extends actual.Material { constructor(_p?: any) { super(); } },
    LineDashedMaterial: class extends actual.Material {
      constructor(_p?: any) { super(); }
      computeLineDistances = jest.fn();
    },
    LineLoop: class extends actual.Object3D {
      constructor() { super(); }
      computeLineDistances = jest.fn();
    },
    MeshBasicMaterial: class extends actual.Material { constructor(_p?: any) { super(); } },
    Group: class extends actual.Object3D { constructor() { super(); } },
    PointLight: class extends actual.Light { constructor() { super(); } },
    RectAreaLight: class extends actual.Light { constructor() { super(); } },
  };
});

import { LayoutGenerator, type GenerationConstraints, type LayoutProposal } from '../ai/layout-generator';
import { getBrandProfile } from '../config/brand-profiles';
import type { RoomConfig } from '../ai/ai-assistant';

describe('LayoutGenerator', () => {
  const brandProfile = getBrandProfile('ikea_metod');
  let generator: LayoutGenerator;

  beforeEach(() => {
    generator = new LayoutGenerator(brandProfile);
  });

  function makeConstraints(
    width: number,
    depth: number,
    overrides?: Partial<GenerationConstraints>
  ): GenerationConstraints {
    return {
      room: {
        width,
        depth,
        height: 2.5,
        walls: [],
      },
      budget: { min: 2000, max: 10000 },
      mustHave: ['sink', 'cooktop', 'refrigerator'],
      priority: 'ergonomics',
      ...overrides,
    };
  }

  describe('generateProposals()', () => {
    it('should return multiple proposals for a 4x3m room', () => {
      const constraints = makeConstraints(4, 3);
      const proposals = generator.generateProposals(constraints);

      expect(proposals.length).toBeGreaterThanOrEqual(1);
      expect(proposals.length).toBeLessThanOrEqual(5);
    });

    it('should filter out island and U-shape strategies for a 2x2m room', () => {
      const constraints = makeConstraints(2, 2);
      const proposals = generator.generateProposals(constraints);

      // A 2x2 room is too small for island (needs 3.5x3.0) and U-shape (needs 2.5x2.5)
      const strategyTypes = proposals.map((p) => p.strategy.type);
      expect(strategyTypes).not.toContain('island');
      expect(strategyTypes).not.toContain('u_shape');
    });

    it('should always include linear strategy (viable for any room)', () => {
      const constraints = makeConstraints(2, 2);
      const proposals = generator.generateProposals(constraints);

      const strategyTypes = proposals.map((p) => p.strategy.type);
      expect(strategyTypes).toContain('linear');
    });

    it('should include island strategy for a large 4x4m room', () => {
      const constraints = makeConstraints(4, 4);
      const proposals = generator.generateProposals(constraints);

      const strategyTypes = proposals.map((p) => p.strategy.type);
      // 4x4 meets island requirements (3.5x3.0)
      expect(strategyTypes).toContain('island');
    });

    it('each proposal should have items, score, and budget', () => {
      const constraints = makeConstraints(4, 3);
      const proposals = generator.generateProposals(constraints);

      for (const proposal of proposals) {
        expect(proposal).toHaveProperty('id');
        expect(proposal).toHaveProperty('name');
        expect(proposal).toHaveProperty('description');
        expect(proposal).toHaveProperty('strategy');
        expect(proposal).toHaveProperty('items');
        expect(proposal).toHaveProperty('score');
        expect(proposal).toHaveProperty('budget');

        expect(Array.isArray(proposal.items)).toBe(true);
        expect(proposal.items.length).toBeGreaterThan(0);

        expect(proposal.score).toHaveProperty('overall');
        expect(proposal.score.overall).toBeGreaterThanOrEqual(0);
        expect(proposal.score.overall).toBeLessThanOrEqual(100);

        expect(typeof proposal.budget).toBe('number');
        expect(proposal.budget).toBeGreaterThanOrEqual(0);
      }
    });

    it('proposals should be sorted by score descending', () => {
      const constraints = makeConstraints(4, 3);
      const proposals = generator.generateProposals(constraints);

      if (proposals.length > 1) {
        for (let i = 0; i < proposals.length - 1; i++) {
          expect(proposals[i]!.score.overall).toBeGreaterThanOrEqual(
            proposals[i + 1]!.score.overall
          );
        }
      }
    });

    it('should return at most 5 proposals', () => {
      // Even a very large room should yield at most 5
      const constraints = makeConstraints(6, 6);
      const proposals = generator.generateProposals(constraints);

      expect(proposals.length).toBeLessThanOrEqual(5);
    });

    it('each item should have position and dimensions', () => {
      const constraints = makeConstraints(4, 3);
      const proposals = generator.generateProposals(constraints);

      for (const proposal of proposals) {
        for (const item of proposal.items) {
          expect(item).toHaveProperty('id');
          expect(item).toHaveProperty('type');
          expect(item).toHaveProperty('position');
          expect(item).toHaveProperty('dimensions');
          expect(item.position).toHaveProperty('x');
          expect(item.position).toHaveProperty('y');
          expect(item.position).toHaveProperty('z');
          expect(item.dimensions).toHaveProperty('width');
          expect(item.dimensions).toHaveProperty('height');
          expect(item.dimensions).toHaveProperty('depth');
          expect(item.dimensions.width).toBeGreaterThan(0);
          expect(item.dimensions.height).toBeGreaterThan(0);
          expect(item.dimensions.depth).toBeGreaterThan(0);
        }
      }
    });

    it('proposals should have valid strategy metadata', () => {
      const constraints = makeConstraints(4, 3);
      const proposals = generator.generateProposals(constraints);

      for (const proposal of proposals) {
        expect(proposal.strategy).toHaveProperty('type');
        expect(proposal.strategy).toHaveProperty('name');
        expect(proposal.strategy).toHaveProperty('walls');
        expect(proposal.strategy).toHaveProperty('description');
        expect(
          ['linear', 'l_shape', 'u_shape', 'galley', 'island']
        ).toContain(proposal.strategy.type);
        expect(proposal.strategy.walls.length).toBeGreaterThan(0);
      }
    });
  });

  describe('strategy filtering by room size', () => {
    it('should include L-shape for rooms >= 2x2m', () => {
      const constraints = makeConstraints(2.5, 2.5);
      const proposals = generator.generateProposals(constraints);
      const types = proposals.map((p) => p.strategy.type);
      expect(types).toContain('l_shape');
    });

    it('should exclude L-shape for rooms < 2x2m', () => {
      const constraints = makeConstraints(1.5, 1.5);
      const proposals = generator.generateProposals(constraints);
      const types = proposals.map((p) => p.strategy.type);
      expect(types).not.toContain('l_shape');
    });

    it('should include galley for narrow but long rooms', () => {
      const constraints = makeConstraints(1.8, 3.5);
      const proposals = generator.generateProposals(constraints);
      const types = proposals.map((p) => p.strategy.type);
      expect(types).toContain('galley');
    });
  });

  describe('brand profile usage', () => {
    it('should work with different brand profiles', () => {
      const schmidtProfile = getBrandProfile('schmidt');
      const schmidtGenerator = new LayoutGenerator(schmidtProfile);
      const constraints = makeConstraints(4, 3);

      const ikeaProposals = generator.generateProposals(constraints);
      const schmidtProposals = schmidtGenerator.generateProposals(constraints);

      // Both should generate proposals
      expect(ikeaProposals.length).toBeGreaterThan(0);
      expect(schmidtProposals.length).toBeGreaterThan(0);
    });
  });
});
