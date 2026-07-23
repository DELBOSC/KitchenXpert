import { getBrandProfile } from '@kitchenxpert/3d-engine';
import * as THREE from 'three';
import { describe, it, expect } from 'vitest';

import { generateLayoutProposals } from '../../../components/designer/layout-proposals';

import type { KitchenEngine } from '@kitchenxpert/3d-engine';

// Real LayoutGenerator + real brand profile (deterministic, no LLM, headless). We prove the
// generator actually runs off the room dimensions, not a fixed canned list.

function fakeEngine(width: number, depth: number, height = 2.5): KitchenEngine {
  const scene = new THREE.Scene();
  // one wall so buildRoomConfig has something to collect (the generator uses room dims anyway)
  const wall = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.1));
  wall.userData = { type: 'wall', id: 'wall-back' };
  scene.add(wall);
  return {
    brandProfile: getBrandProfile(),
    roomWidth: width,
    roomDepth: depth,
    roomHeight: height,
    scene: { getThreeScene: () => scene },
  } as unknown as KitchenEngine;
}

function strategyTypes(engine: KitchenEngine): string[] {
  return generateLayoutProposals(engine).map((p) => p.strategy.type);
}

describe('generateLayoutProposals', () => {
  it('produces multiple DISTINCT principled proposals from a normal room', () => {
    const proposals = generateLayoutProposals(fakeEngine(4, 3));

    expect(proposals.length).toBeGreaterThanOrEqual(2);
    // distinct typologies (not the same strategy repeated)
    const types = new Set(proposals.map((p) => p.strategy.type));
    expect(types.size).toBe(proposals.length);
    // each proposal actually places furniture and carries a real score
    for (const p of proposals) {
      expect(p.items.length).toBeGreaterThan(0);
      expect(p.score.overall).toBeGreaterThanOrEqual(0);
    }
    // sorted by overall score, descending
    const scores = proposals.map((p) => p.score.overall);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });

  it('filters typologies by room size (negative control on the dimension gate)', () => {
    // A large square room admits space-hungry typologies (u_shape needs ≥2.5×2.5,
    // island needs ≥3.5 width); a tiny room must NOT. If the generator ignored dimensions
    // and returned a fixed set, these would be equal — this is the load-bearing check.
    const big = new Set(strategyTypes(fakeEngine(4, 4)));
    const tiny = new Set(strategyTypes(fakeEngine(1.6, 1.6)));

    expect(big.has('u_shape')).toBe(true);
    expect(tiny.has('u_shape')).toBe(false);
    expect(big.size).toBeGreaterThan(tiny.size);
  });
});
