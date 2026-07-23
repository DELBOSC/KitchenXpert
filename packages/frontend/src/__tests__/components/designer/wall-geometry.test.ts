import * as THREE from 'three';
import { describe, it, expect } from 'vitest';

import { buildWallGeometry, wallPlacement } from '../../../components/designer/wall-geometry';

// A 2m-wide, 2.4m-high, 0.1m-thick wall with a door-sized opening.
const WIDTH = 2;
const HEIGHT = 2.4;
const THICK = 0.1;
// Door: 0.9m wide, 2.1m tall, its left edge 0.7m from the wall's left edge, on the floor.
const DOOR = { offset: 0.7, bottom: 0, width: 0.9, height: 2.1 };

// The opening's centre in the wall's local frame.
const HOLE_X = -WIDTH / 2 + DOOR.offset + DOOR.width / 2; // 0.15
const HOLE_Y = DOOR.bottom + DOOR.height / 2; // 1.05
// A point that is solid (left of the opening).
const SOLID_X = -0.8;
const SOLID_Y = 1.2;

function wallMesh(openings: Parameters<typeof buildWallGeometry>[3]): THREE.Mesh {
  return new THREE.Mesh(buildWallGeometry(WIDTH, HEIGHT, THICK, openings));
}

/** Cast a ray straight through the wall (along -Z) at (x, y); return the hit count. */
function hits(mesh: THREE.Mesh, x: number, y: number): number {
  const ray = new THREE.Raycaster(
    new THREE.Vector3(x, y, 1),
    new THREE.Vector3(0, 0, -1).normalize()
  );
  return ray.intersectObject(mesh).length;
}

describe('buildWallGeometry', () => {
  it('cuts a real hole: a ray through the opening MISSES, through solid HITS', () => {
    const mesh = wallMesh([DOOR]);
    expect(hits(mesh, HOLE_X, HOLE_Y)).toBe(0); // straight through the doorway
    expect(hits(mesh, SOLID_X, SOLID_Y)).toBeGreaterThan(0); // solid wall
  });

  it('negative control: WITHOUT the opening, that same spot is solid', () => {
    // Proves the miss above is caused by the opening, not by geometry that is missing anyway.
    const mesh = wallMesh([]);
    expect(hits(mesh, HOLE_X, HOLE_Y)).toBeGreaterThan(0);
  });

  it('is centered on X and on the floor, thickness centered on Z', () => {
    const geo = buildWallGeometry(WIDTH, HEIGHT, THICK, []);
    geo.computeBoundingBox();
    const box = geo.boundingBox!;
    expect(box.min.x).toBeCloseTo(-WIDTH / 2);
    expect(box.max.x).toBeCloseTo(WIDTH / 2);
    expect(box.min.y).toBeCloseTo(0);
    expect(box.max.y).toBeCloseTo(HEIGHT);
    expect(box.min.z).toBeCloseTo(-THICK / 2);
    expect(box.max.z).toBeCloseTo(THICK / 2);
  });

  it('zero-regression: a wired wall occupies the SAME world box as the old BoxGeometry', () => {
    // Old createWall(wx, wh, wd, px, py, pz) = a BoxGeometry(wx,wh,wd) centered at (px,py,pz).
    const cases = [
      { wx: 4, wh: 2.4, wd: 0.1, px: 2, py: 1.2, pz: 0 }, // back wall (thin Z)
      { wx: 0.1, wh: 2.4, wd: 3, px: 0, py: 1.2, pz: 1.5 }, // side wall (thin X)
    ];
    for (const c of cases) {
      // The old wall = a positioned BoxGeometry.
      const oldMesh = new THREE.Mesh(new THREE.BoxGeometry(c.wx, c.wh, c.wd));
      oldMesh.position.set(c.px, c.py, c.pz);
      oldMesh.updateMatrixWorld(true);
      const expected = new THREE.Box3().setFromObject(oldMesh);

      // The new, wired wall:
      const p = wallPlacement(c.wx, c.wh, c.wd, c.px, c.py, c.pz);
      const wall = new THREE.Mesh(buildWallGeometry(p.width, p.height, p.thickness, []));
      wall.position.set(...p.position);
      wall.rotation.y = p.rotationY;
      wall.updateMatrixWorld(true);
      const actual = new THREE.Box3().setFromObject(wall);

      expect(actual.min.x).toBeCloseTo(expected.min.x, 4);
      expect(actual.max.x).toBeCloseTo(expected.max.x, 4);
      expect(actual.min.y).toBeCloseTo(expected.min.y, 4);
      expect(actual.max.y).toBeCloseTo(expected.max.y, 4);
      expect(actual.min.z).toBeCloseTo(expected.min.z, 4);
      expect(actual.max.z).toBeCloseTo(expected.max.z, 4);
    }
  });

  it('supports two openings (e.g. a door and a window) in one wall', () => {
    const mesh = wallMesh([DOOR, { offset: 1.6, bottom: 1.0, width: 0.3, height: 0.6 }]);
    expect(hits(mesh, HOLE_X, HOLE_Y)).toBe(0); // door
    // window centre: left edge -1+1.6=0.6, +0.15 → 0.75 ; y 1.0+0.3=1.3
    expect(hits(mesh, 0.75, 1.3)).toBe(0);
    expect(hits(mesh, SOLID_X, SOLID_Y)).toBeGreaterThan(0);
  });
});
