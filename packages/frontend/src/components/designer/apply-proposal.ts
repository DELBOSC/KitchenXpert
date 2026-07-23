import { AddObjectCommand, RemoveObjectCommand, BatchCommand, ModelLoader } from '@kitchenxpert/3d-engine';

import { getFurnitureObjects } from './scene-furniture';

import type { KitchenEngine, LayoutProposal, Command } from '@kitchenxpert/3d-engine';
import type * as THREE from 'three';

// Same warm wood tone the auto-complete path uses for generated meshes.
const PROPOSAL_COLOR = 0xd4a574;

export interface ApplyProposalResult {
  removed: number;
  added: number;
}

/**
 * Replace the current furniture with a generated layout proposal, as ONE undoable batch
 * (a single Ctrl-Z restores the previous scene).
 *
 * - Removal traverses the three.js scene (getFurnitureObjects) so it catches every placed
 *   item regardless of how it was added — leaving no orphans behind the new layout.
 * - Proposal items are placed EXACTLY where the generator computed them. There is NO
 *   de-overlap pass here (unlike auto-complete): a cabinet run is intentionally flush, and
 *   the collision system treats touching boxes as overlapping, so nudging would break the
 *   layout the generator carefully produced.
 *
 * `loader` is injectable for testing; production callers can omit it.
 */
export function applyProposalToScene(
  engine: KitchenEngine,
  proposal: LayoutProposal,
  loader: ModelLoader = new ModelLoader()
): ApplyProposalResult {
  const scene = engine.scene.getThreeScene();
  const objectMap = engine.scene.getAllObjects();
  const collisionAdd = (o: THREE.Object3D): void => engine.collisionSystem.addCollisionObject(o);
  const collisionRemove = (o: THREE.Object3D): void =>
    engine.collisionSystem.removeCollisionObject(o);

  const commands: Command[] = [];

  // 1. Remove the existing furniture (walls/floor/structure are left untouched).
  const existing = getFurnitureObjects(engine);
  for (const obj of existing) {
    commands.push(new RemoveObjectCommand(scene, obj, objectMap, collisionAdd, collisionRemove));
  }

  // 2. Add the proposal's items (flush placement, no nudging).
  for (const item of proposal.items) {
    const mesh = loader.createProceduralFallback(item.type, item.dimensions, PROPOSAL_COLOR);
    mesh.position.copy(item.position);
    mesh.rotation.y = item.rotation;
    mesh.userData = {
      id: item.id,
      type: item.type,
      name: item.type,
      dimensions: item.dimensions,
      ...(item.productId ? { productId: item.productId } : {}),
      ...(item.price != null ? { price: item.price } : {}),
    };
    commands.push(new AddObjectCommand(scene, mesh, objectMap, collisionAdd, collisionRemove));
  }

  engine.history.execute(new BatchCommand(commands, `Implantation : ${proposal.name}`));
  return { removed: existing.length, added: proposal.items.length };
}
