import type { CollisionSystem } from '@kitchenxpert/3d-engine';
import type * as THREE from 'three';

/**
 * Nudge `mesh` to the nearest non-overlapping spot against everything already registered
 * in the collision system, then register it so the NEXT call avoids it too.
 *
 * Why this exists: auto-complete used to drop every generated mesh at its raw computed
 * position (`mesh.position.copy(item.position)`) with no validation, so items stacked on
 * top of each other — the "de la merde" layout. The engine already knew how to avoid
 * overlaps (findNearestValidPosition), it was simply never called on this path.
 *
 * Key detail (proven in physics/collision.ts): collision is tested against the registered
 * `collisionObjects` SET, not the three.js scene — the `scene` arg there is ignored. So we
 * must register each mesh incrementally; without it, meshes placed earlier in the SAME
 * pass are invisible to the later ones and they all pile up at the same coordinates.
 *
 * - Y is preserved (findNearestValidPosition only searches X/Z) → base vs wall cabinets
 *   keep their height.
 * - If no free spot is found within reach, the mesh keeps its computed position: a slight
 *   overlap is better than a dropped item.
 */
export function deOverlapAndRegister(
  collision: CollisionSystem,
  mesh: THREE.Object3D,
  scene: THREE.Scene
): void {
  const valid = collision.findNearestValidPosition(mesh, mesh.position, scene);
  if (valid) {
    mesh.position.copy(valid);
  }
  collision.addCollisionObject(mesh);
}
