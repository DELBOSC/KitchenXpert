import type { WallOpening, WallPlacement } from './wall-geometry';
import type { WallSide, WallOpeningSpan } from '@kitchenxpert/3d-engine';

/**
 * The product-level opening types (Slice 2). "sur mesure" is not a separate type — it is a
 * `window` with user-chosen dimensions.
 *  - door                → porte pleine
 *  - french_door         → porte-fenêtre simple (vantail vitré)
 *  - french_door_double  → porte-fenêtre double (deux vantaux)
 *  - window              → fenêtre (standard ou sur mesure)
 */
export type OpeningType = 'door' | 'french_door' | 'french_door_double' | 'window';

/**
 * An opening placed in a wall, in the wall's local frame.
 *  - `wallIndex` : which wall (0…N in the order buildKitchenScene creates them)
 *  - `offset`    : metres from the wall's left edge to the opening's left edge
 *  - `sill`      : metres from the floor to the opening's bottom (0 for a door)
 *  - `width` / `height` : metres
 */
export interface Opening {
  id: string;
  wallIndex: number;
  type: OpeningType;
  offset: number;
  sill: number;
  width: number;
  height: number;
}

export interface WorldTransform {
  position: [number, number, number];
  rotationY: number;
}

/**
 * The WallSide of each wall index, in the order buildKitchenScene creates them (per layout).
 * Must mirror that switch exactly — it's how an Opening's `wallIndex` maps to the generator's
 * WallSide vocabulary.
 */
export function wallSidesForLayout(layout: string): WallSide[] {
  switch (layout) {
    case 'galley':
      return ['back', 'front'];
    case 'u_shaped':
      return ['back', 'left', 'right'];
    case 'one_wall':
    case 'open_plan':
    case 'island':
      return ['back'];
    default:
      return ['back', 'left']; // l_shaped, peninsula
  }
}

/**
 * Convert placed openings into WallAnalyzer spans (so the layout generator keeps them clear).
 *
 * Coordinate alignment (the tested trap): side walls (left/right) are rotated 90° in the
 * scene, so an opening's `offset` maps to a REVERSED coordinate along the wall
 * (z = depth - offset - width) — matching openingWorldTransform. Back/front walls are not
 * reversed. Getting this wrong would block the opposite end of the wall.
 */
export function openingsToSpans(
  openings: Opening[],
  layout: string,
  room: { width: number; depth: number }
): WallOpeningSpan[] {
  const sides = wallSidesForLayout(layout);
  const spans: WallOpeningSpan[] = [];
  for (const o of openings) {
    const side = sides[o.wallIndex];
    if (!side) {
      continue; // opening targets a wall this layout doesn't build
    }
    const isSide = side === 'left' || side === 'right';
    const wallLength = isSide ? room.depth : room.width;
    const start = isSide ? wallLength - o.offset - o.width : o.offset;
    const end = isSide ? wallLength - o.offset : o.offset + o.width;
    // A window only blocks tall items (base cabinets may go underneath); everything else
    // (door, porte-fenêtre) must be kept fully clear.
    const kind = o.type === 'window' ? 'window' : 'door';
    spans.push({ wallSide: side, start, end, kind });
  }
  return spans;
}

/** An opening → the WallOpening a wall geometry needs (local frame; bottom = sill). */
export function toWallOpening(o: Opening): WallOpening {
  return { offset: o.offset, bottom: o.sill, width: o.width, height: o.height };
}

export interface LeafSpec {
  offset: number;
  width: number;
  direction: 'left' | 'right';
}

/**
 * Split a double french door into its two half-width leaves, hinged on the OUTER edges so
 * they meet in the middle (offset = left half, then right half). The wall is still cut as a
 * single full-width hole; these two leaves fill it.
 */
export function doubleLeaves(o: Opening): [LeafSpec, LeafSpec] {
  const half = o.width / 2;
  return [
    { offset: o.offset, width: half, direction: 'left' },
    { offset: o.offset + half, width: half, direction: 'right' },
  ];
}

/**
 * Compute the WORLD transform of an opening's frame group, from the wall's placement and the
 * opening's position ALONG the wall. This is the delicate bit: it must account for the wall's
 * Y rotation (side walls are rotated 90°), otherwise doors land off-wall.
 *
 * The frame group's origin sits on the FLOOR at the opening's centre-line (addDoor/addWindow
 * build upward from y=0 and place the sill internally), so worldY is always 0.
 *
 * Wall local frame: x ∈ [-width/2, +width/2] along the wall, z centred in thickness. The
 * opening's centre-line is at localX = -width/2 + offset + openingWidth/2, localZ = 0. Apply
 * the wall's (rotationY, position) to get world X/Z.
 */
export function openingWorldTransform(
  placement: WallPlacement,
  offset: number,
  openingWidth: number
): WorldTransform {
  const [px, , pz] = placement.position;
  const theta = placement.rotationY;
  const localX = -placement.width / 2 + offset + openingWidth / 2;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  // localZ = 0, so its contribution (localZ*sin, localZ*cos) drops out.
  return {
    position: [px + localX * cos, 0, pz - localX * sin],
    rotationY: theta,
  };
}
