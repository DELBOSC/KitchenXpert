import type { KitchenEngine } from '@kitchenxpert/3d-engine';
import type * as THREE from 'three';

/**
 * The single definition of "the placed furniture in the scene", by traversing the three.js
 * scene — the app's real source of truth (budget, export, and the assistant payload all
 * read the scene this way, e.g. KitchenDesignerPage.updateBudgetData).
 *
 * Why traversal and NOT engine.scene.getAllObjects(): getAllObjects() returns a COPY of an
 * internal registry that is only populated by scene.addObject() (the catalog path). Items
 * added via AddObjectCommand (auto-complete, generated layouts) go into the three.js scene
 * but NOT that registry, so getAllObjects() would MISS them. For "replace everything" this
 * would orphan furniture. Traversal sees every top-level item regardless of how it was added.
 *
 * A top-level placed item carries userData.id; its child meshes (frame, doors) do not, so
 * filtering on `id` yields the groups, never their internals. Walls/floor/structure are
 * excluded (same convention as the budget traversal and apply-chat-style).
 */
export function getFurnitureObjects(engine: KitchenEngine): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  engine.scene.getThreeScene().traverse((child) => {
    const ud = child.userData as { id?: string; type?: string; isKitchenStructure?: boolean };
    if (!ud.id) {
      return;
    }
    // Exclude structure (walls/floor) AND architectural openings (door/window groups carry a
    // userData.id too, but they are not furniture — they must not be recoloured, persisted as
    // items, or replaced by a generated layout).
    if (
      ud.type === 'wall' ||
      ud.type === 'floor' ||
      ud.type === 'door' ||
      ud.type === 'window' ||
      ud.isKitchenStructure
    ) {
      return;
    }
    out.push(child);
  });
  return out;
}
