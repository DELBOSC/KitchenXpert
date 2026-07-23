import * as THREE from 'three';

/**
 * A rectangular opening (door / window) cut through a wall, in the wall's LOCAL frame:
 *  - `offset`  metres from the wall's left edge (0 … wallWidth) to the opening's left edge
 *  - `bottom`  metres from the floor to the opening's bottom (0 for a door, sill height for a window)
 *  - `width` / `height` metres
 */
export interface WallOpening {
  offset: number;
  bottom: number;
  width: number;
  height: number;
}

/**
 * Build a wall geometry (`width` × `height`, `thickness` deep) with rectangular openings cut
 * clean THROUGH it — using native three.js `Shape` + `Path` holes + `ExtrudeGeometry`. No CSG
 * library: for axis-aligned rectangular openings in a planar wall this is exact, dependency-free
 * and far cheaper than boolean meshing.
 *
 * Local frame (matches how the designer positions walls): the face lies in the XY plane,
 * centered on X (x ∈ [-width/2, +width/2]), base on the floor (y ∈ [0, height]), and the
 * thickness is centered on Z (z ∈ [-thickness/2, +thickness/2]). A back/front wall uses this
 * as-is; a side wall is the same geometry rotated 90° around Y.
 *
 * Openings that fall outside the wall face are clamped defensively so a bad input can never
 * produce a self-intersecting shape (which three.js would triangulate into garbage).
 */
export function buildWallGeometry(
  width: number,
  height: number,
  thickness: number,
  openings: WallOpening[] = []
): THREE.ExtrudeGeometry {
  const halfW = width / 2;

  const shape = new THREE.Shape();
  shape.moveTo(-halfW, 0);
  shape.lineTo(halfW, 0);
  shape.lineTo(halfW, height);
  shape.lineTo(-halfW, height);
  shape.lineTo(-halfW, 0);

  for (const o of openings) {
    // Clamp the opening inside the wall face (keep a 1mm margin so edges never touch the border,
    // which would break the hole triangulation).
    const m = 0.001;
    const left = Math.max(-halfW + m, Math.min(halfW - m, -halfW + o.offset));
    const right = Math.max(left + m, Math.min(halfW - m, left + o.width));
    const bottom = Math.max(m, Math.min(height - m, o.bottom));
    const top = Math.max(bottom + m, Math.min(height - m, bottom + o.height));

    const hole = new THREE.Path();
    hole.moveTo(left, bottom);
    hole.lineTo(right, bottom);
    hole.lineTo(right, top);
    hole.lineTo(left, top);
    hole.lineTo(left, bottom);
    shape.holes.push(hole);
  }

  const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false });
  // ExtrudeGeometry extrudes +Z from the shape plane; recenter the thickness on Z so the
  // wall matches the previous centered BoxGeometry placement.
  geo.translate(0, 0, -thickness / 2);
  geo.computeVertexNormals();
  return geo;
}

export interface WallPlacement {
  width: number;
  height: number;
  thickness: number;
  position: [number, number, number];
  rotationY: number;
}

/**
 * Map an axis-aligned wall BOX (the previous createWall args: box dims wx/wh/wd centered at
 * px/py/pz) to the canonical placement for buildWallGeometry (width × height, thin `thickness`,
 * base on the floor, centered on X/Z, plus a Y rotation).
 *
 * Which horizontal axis is thin tells us the orientation: a back/front wall is thin in Z
 * (no rotation); a side wall is thin in X (rotated 90° around Y). The resulting wall occupies
 * the SAME world-space box as before — this is what makes the ExtrudeGeometry swap a
 * zero-regression change when there are no openings.
 */
export function wallPlacement(
  wx: number,
  wh: number,
  wd: number,
  px: number,
  py: number,
  pz: number
): WallPlacement {
  const isThinZ = wd <= wx;
  return {
    width: isThinZ ? wx : wd,
    height: wh,
    thickness: isThinZ ? wd : wx,
    // The old box was centered at py (= height/2); our geometry has its base at y=0.
    position: [px, py - wh / 2, pz],
    rotationY: isThinZ ? 0 : Math.PI / 2,
  };
}
