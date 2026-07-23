import { describe, it, expect } from 'vitest';

import {
  doubleLeaves,
  openingsToSpans,
  openingWorldTransform,
  toWallOpening,
  wallSidesForLayout,
  type Opening,
} from '../../../components/designer/openings';
import { wallPlacement } from '../../../components/designer/wall-geometry';

describe('openingWorldTransform', () => {
  // Room 4m (x) × 3m (z), 2.4m high. A 0.9m opening at offset 0.7m.
  const OFFSET = 0.7;
  const OW = 0.9;

  it('places an opening on the BACK wall (no rotation)', () => {
    // back wall: createWall(4, 2.4, 0.1, 2, 1.2, 0)
    const p = wallPlacement(4, 2.4, 0.1, 2, 1.2, 0);
    const t = openingWorldTransform(p, OFFSET, OW);
    // centre along the wall = offset + width/2 = 1.15 ; on the back wall z=0 ; floor y=0
    expect(t.position[0]).toBeCloseTo(1.15);
    expect(t.position[1]).toBe(0);
    expect(t.position[2]).toBeCloseTo(0);
    expect(t.rotationY).toBeCloseTo(0);
  });

  it('places an opening on a SIDE wall (rotated 90° — the load-bearing case)', () => {
    // left wall: createWall(0.1, 2.4, 3, 0, 1.2, 1.5)
    const p = wallPlacement(0.1, 2.4, 3, 0, 1.2, 1.5);
    const t = openingWorldTransform(p, OFFSET, OW);
    // on the left wall x=0 ; along z = depth - offset - width/2 = 3 - 1.15 = 1.85
    // A helper that ignored the wall rotation would put x=-0.35, z=1.5 → these asserts fail.
    expect(t.position[0]).toBeCloseTo(0);
    expect(t.position[2]).toBeCloseTo(1.85);
    expect(t.rotationY).toBeCloseTo(Math.PI / 2);
  });
});

describe('doubleLeaves', () => {
  it('splits a double french door into two half-width leaves, outer-hinged, side by side', () => {
    const o: Opening = {
      id: 'd',
      wallIndex: 0,
      type: 'french_door_double',
      offset: 1.0,
      sill: 0,
      width: 1.5,
      height: 2.1,
    };
    const [left, right] = doubleLeaves(o);
    expect(left).toEqual({ offset: 1.0, width: 0.75, direction: 'left' });
    expect(right).toEqual({ offset: 1.75, width: 0.75, direction: 'right' });
    // The two leaves tile the full opening without gap or overlap.
    expect(left.offset + left.width).toBeCloseTo(right.offset);
    expect(right.offset + right.width).toBeCloseTo(o.offset + o.width);
  });
});

describe('openingsToSpans (Slice 3 — generator keeps openings clear)', () => {
  const room = { width: 4, depth: 3 };

  it('maps a BACK-wall opening without reversal', () => {
    const openings: Opening[] = [
      { id: 'a', wallIndex: 0, type: 'door', offset: 0.7, sill: 0, width: 0.9, height: 2.03 },
    ];
    // l_shaped: wall 0 = back ; a door blocks everything → kind 'door'
    const [span] = openingsToSpans(openings, 'l_shaped', room);
    expect(span).toEqual({ wallSide: 'back', start: 0.7, end: 1.6, kind: 'door' });
  });

  it('maps a SIDE-wall opening WITH reversal (the load-bearing case)', () => {
    const openings: Opening[] = [
      { id: 'b', wallIndex: 1, type: 'window', offset: 0.7, sill: 1, width: 0.9, height: 1 },
    ];
    // l_shaped: wall 1 = left ; side wall reverses: z = depth - offset - width … depth - offset
    const [span] = openingsToSpans(openings, 'l_shaped', room);
    // depth 3 : start = 3 - 0.7 - 0.9 = 1.4 ; end = 3 - 0.7 = 2.3
    // A non-reversed mapping would give start=0.7,end=1.6 → this assert fails.
    expect(span).toEqual({ wallSide: 'left', start: 1.4, end: 2.3, kind: 'window' });
  });

  it('drops openings that target a wall the layout does not build', () => {
    const openings: Opening[] = [
      { id: 'c', wallIndex: 2, type: 'door', offset: 0.5, sill: 0, width: 0.9, height: 2 },
    ];
    // l_shaped has only walls 0,1 → wallIndex 2 has no side
    expect(openingsToSpans(openings, 'l_shaped', room)).toEqual([]);
  });
});

describe('wallSidesForLayout', () => {
  it('mirrors buildKitchenScene wall order', () => {
    expect(wallSidesForLayout('u_shaped')).toEqual(['back', 'left', 'right']);
    expect(wallSidesForLayout('galley')).toEqual(['back', 'front']);
    expect(wallSidesForLayout('l_shaped')).toEqual(['back', 'left']);
    expect(wallSidesForLayout('open_plan')).toEqual(['back']);
  });
});

describe('toWallOpening', () => {
  it('maps sill → bottom, keeps offset/width/height', () => {
    const o: Opening = {
      id: 'x',
      wallIndex: 0,
      type: 'window',
      offset: 1.2,
      sill: 1.0,
      width: 0.8,
      height: 1.0,
    };
    expect(toWallOpening(o)).toEqual({ offset: 1.2, bottom: 1.0, width: 0.8, height: 1.0 });
  });
});
