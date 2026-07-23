import { CollisionSystem } from '@kitchenxpert/3d-engine';
import * as THREE from 'three';
import { describe, it, expect } from 'vitest';

import { deOverlapAndRegister } from '../../../components/designer/deoverlap-placement';

// Real CollisionSystem + real three.js boxes (headless — no renderer needed). This proves
// the actual overlap-resolution the auto-complete path relies on, not a mock of it.

function cabinet(x: number, z: number): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.6));
  mesh.position.set(x, 0.4, z);
  return mesh;
}

function box3(mesh: THREE.Object3D): THREE.Box3 {
  return new THREE.Box3().setFromObject(mesh);
}

describe('deOverlapAndRegister', () => {
  it('separates three cabinets dropped at the SAME coordinates', () => {
    const collision = new CollisionSystem();
    const scene = new THREE.Scene();
    const a = cabinet(0, 0);
    const b = cabinet(0, 0);
    const c = cabinet(0, 0);

    deOverlapAndRegister(collision, a, scene);
    deOverlapAndRegister(collision, b, scene);
    deOverlapAndRegister(collision, c, scene);

    // No pair overlaps. This fails if the mesh is not registered incrementally (b and c
    // would be invisible to each other → all pile up at 0,0), or if findNearestValidPosition
    // is never called (same pile-up).
    const [ba, bb, bc] = [box3(a), box3(b), box3(c)];
    expect(ba.intersectsBox(bb)).toBe(false);
    expect(ba.intersectsBox(bc)).toBe(false);
    expect(bb.intersectsBox(bc)).toBe(false);
  });

  it('preserves Y (a wall cabinet stays at its height while X/Z shift)', () => {
    const collision = new CollisionSystem();
    const scene = new THREE.Scene();
    const base = cabinet(0, 0); // y = 0.4
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.35));
    wall.position.set(0, 1.6, 0); // elevated

    deOverlapAndRegister(collision, base, scene);
    deOverlapAndRegister(collision, wall, scene);

    // They are at different heights → no overlap to resolve → wall keeps X/Z AND Y.
    expect(wall.position.y).toBe(1.6);
  });

  it('registers the mesh so a later, separate call sees it', () => {
    const collision = new CollisionSystem();
    const scene = new THREE.Scene();
    const first = cabinet(0, 0);
    deOverlapAndRegister(collision, first, scene);

    // A brand-new mesh at the same spot must be found invalid there and moved.
    const second = cabinet(0, 0);
    const moved = collision.findNearestValidPosition(second, second.position, scene);
    expect(moved).not.toBeNull();
    expect(moved!.x !== 0 || moved!.z !== 0).toBe(true);
  });
});
