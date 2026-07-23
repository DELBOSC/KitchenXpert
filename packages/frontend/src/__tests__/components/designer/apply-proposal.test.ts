import {
  CollisionSystem,
  CommandHistory,
  ModelLoader,
  getBrandProfile,
} from '@kitchenxpert/3d-engine';
import * as THREE from 'three';
import { describe, it, expect } from 'vitest';

import { applyProposalToScene } from '../../../components/designer/apply-proposal';
import { getFurnitureObjects } from '../../../components/designer/scene-furniture';

import type { KitchenEngine, LayoutProposal, PlacedItem3D } from '@kitchenxpert/3d-engine';

// Real three.js scene + real CollisionSystem + real CommandHistory + real ModelLoader
// (all headless). This exercises the actual command/undo machinery, not a mock of it.

function furnitureMesh(id: string): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.6));
  mesh.userData = { id, type: 'cabinet', name: id };
  mesh.position.set(0, 0.4, 0);
  return mesh;
}

function structure(type: 'wall' | 'floor'): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(4, 2.5, 0.1));
  mesh.userData = { id: type, type };
  return mesh;
}

function item(id: string, x: number): PlacedItem3D {
  return {
    id,
    type: 'cabinet',
    position: new THREE.Vector3(x, 0.4, -1.9),
    rotation: 0,
    dimensions: { width: 0.6, height: 0.8, depth: 0.6 },
  };
}

function setup(): { engine: KitchenEngine; scene: THREE.Scene; history: CommandHistory } {
  const scene = new THREE.Scene();
  const registry = new Map<string, THREE.Object3D>();
  const collision = new CollisionSystem();
  const history = new CommandHistory();

  const old1 = furnitureMesh('old-1');
  const old2 = furnitureMesh('old-2');
  for (const obj of [structure('wall'), structure('floor'), old1, old2]) {
    scene.add(obj);
    registry.set(obj.userData.id as string, obj);
  }
  collision.addCollisionObject(old1);
  collision.addCollisionObject(old2);

  const engine = {
    brandProfile: getBrandProfile(),
    collisionSystem: collision,
    history,
    scene: {
      getThreeScene: () => scene,
      getAllObjects: () => new Map(registry),
    },
  } as unknown as KitchenEngine;

  return { engine, scene, history };
}

const proposal: LayoutProposal = {
  id: 'p1',
  name: 'En L',
  description: 'test',
  strategy: { type: 'l_shape', name: 'En L', walls: ['back', 'left'], description: '' },
  items: [item('new-1', -1), item('new-2', 0), item('new-3', 1)],
  score: {
    overall: 80,
    ergonomics: 80,
    storage: 70,
    aesthetics: 60,
    budgetEfficiency: 70,
    spaceUtilization: 75,
  },
  budget: 3000,
};

describe('applyProposalToScene', () => {
  it('replaces ALL existing furniture with the proposal items (structure untouched)', () => {
    const { engine } = setup();

    const res = applyProposalToScene(engine, proposal, new ModelLoader());

    expect(res).toEqual({ removed: 2, added: 3 });

    // The furniture is now exactly the 3 proposal items — no orphaned old cabinets.
    const ids = getFurnitureObjects(engine)
      .map((o) => o.userData.id as string)
      .sort();
    expect(ids).toEqual(['new-1', 'new-2', 'new-3']);

    // Walls/floor survived.
    const scene = engine.scene.getThreeScene();
    expect(scene.children.some((c) => c.userData.type === 'wall')).toBe(true);
    expect(scene.children.some((c) => c.userData.type === 'floor')).toBe(true);
  });

  it('places items exactly where the generator computed them (no de-overlap nudging)', () => {
    const { engine } = setup();
    applyProposalToScene(engine, proposal, new ModelLoader());

    const byId = new Map(getFurnitureObjects(engine).map((o) => [o.userData.id as string, o]));
    expect(byId.get('new-1')!.position.x).toBe(-1);
    expect(byId.get('new-2')!.position.x).toBe(0);
    expect(byId.get('new-3')!.position.x).toBe(1);
  });

  it('is a single undoable batch — one undo restores the previous scene', () => {
    const { engine, history } = setup();
    applyProposalToScene(engine, proposal, new ModelLoader());

    history.undo();

    const ids = getFurnitureObjects(engine)
      .map((o) => o.userData.id as string)
      .sort();
    expect(ids).toEqual(['old-1', 'old-2']);
  });
});
