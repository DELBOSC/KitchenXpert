import { CollisionSystem, ModelLoader } from '@kitchenxpert/3d-engine';
import * as THREE from 'three';
import { describe, it, expect } from 'vitest';

import {
  serializeScene,
  restoreScene,
  normalizePersistedItem,
} from '../../../components/designer/scene-persistence';
import { getFurnitureObjects } from '../../../components/designer/scene-furniture';

import type { KitchenEngine } from '@kitchenxpert/3d-engine';

function fakeEngine(): KitchenEngine {
  const scene = new THREE.Scene();
  const collision = new CollisionSystem();
  return {
    scene: {
      getThreeScene: () => scene,
      addObject: (id: string, obj: THREE.Object3D) => {
        obj.userData.id = id;
        scene.add(obj);
      },
    },
    collisionSystem: collision,
  } as unknown as KitchenEngine;
}

function placeFurniture(
  engine: KitchenEngine,
  ud: Record<string, unknown>,
  position: [number, number, number],
  rotationY: number
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.6));
  mesh.userData = ud;
  mesh.position.set(...position);
  mesh.rotation.y = rotationY;
  engine.scene.getThreeScene().add(mesh);
  return mesh;
}

describe('serializeScene', () => {
  it('converts engine metres/radians → DB cm/degrees', () => {
    const engine = fakeEngine();
    placeFurniture(
      engine,
      {
        id: 'a',
        type: 'base_cabinet',
        sku: 'SKU-1',
        materialId: 'catalog-noir',
        price: 199,
        dimensions: { width: 0.6, height: 0.8, depth: 0.6 },
      },
      [0.5, 0.4, -1.9],
      Math.PI / 2
    );

    const [item] = serializeScene(engine);

    // Load-bearing: a ×1 bug would give 0.5 / 0.6, a wrong rotation factor would give ~1.57.
    expect(item.positionX).toBeCloseTo(50);
    expect(item.positionY).toBeCloseTo(40);
    expect(item.positionZ).toBeCloseTo(-190);
    expect(item.rotationY).toBeCloseTo(90);
    expect(item.width).toBeCloseTo(60);
    expect(item.height).toBeCloseTo(80);
    expect(item.depth).toBeCloseTo(60);
    expect(item.type).toBe('base_cabinet');
    expect(item.model).toBe('SKU-1');
    expect(item.price).toBe(199);
    expect(item.metadata?.materialId).toBe('catalog-noir');
  });

  it('skips degenerate items (non-positive dimensions) that would fail validation', () => {
    const engine = fakeEngine();
    placeFurniture(engine, { id: 'bad', type: 'cabinet', dimensions: { width: 0, height: 0, depth: 0 } }, [0, 0, 0], 0);
    expect(serializeScene(engine)).toHaveLength(0);
  });

  it('excludes architectural openings (door/window) — they are not furniture', () => {
    const engine = fakeEngine();
    placeFurniture(engine, { id: 'c1', type: 'cabinet', dimensions: { width: 0.6, height: 0.8, depth: 0.6 } }, [0, 0.4, 0], 0);
    placeFurniture(engine, { id: 'd1', type: 'door', dimensions: { width: 0.9, height: 2.1, depth: 0.1 } }, [1, 0, 0], 0);
    placeFurniture(engine, { id: 'w1', type: 'window', dimensions: { width: 0.8, height: 1, depth: 0.1 } }, [2, 1, 0], 0);
    const items = serializeScene(engine);
    expect(items.map((i) => i.type)).toEqual(['cabinet']);
  });
});

describe('normalizePersistedItem', () => {
  it('coerces Prisma Decimal STRINGS to numbers (else ×0.01 → NaN)', () => {
    // What GET /items actually returns: Decimal columns as strings.
    const raw = {
      type: 'base_cabinet',
      model: 'SKU-1',
      positionX: '50',
      positionY: '40',
      positionZ: '-190',
      rotationY: '90',
      width: '60',
      depth: '60',
      height: '80',
      price: '199',
      metadata: { materialId: 'catalog-noir' },
    };

    const item = normalizePersistedItem(raw);

    expect(item.positionX).toBe(50);
    expect(item.rotationY).toBe(90);
    expect(item.width).toBe(60);
    expect(item.price).toBe(199);
    // Load-bearing: these must be real numbers, not strings (NaN guard downstream).
    expect(Number.isNaN(item.positionX * 0.01)).toBe(false);
    expect(item.metadata?.materialId).toBe('catalog-noir');
  });
});

describe('serialize → restore round-trip', () => {
  it('restores position/rotation/dimensions back to metres/radians, preserving identity', () => {
    const source = fakeEngine();
    placeFurniture(
      source,
      {
        id: 'a',
        type: 'base_cabinet',
        sku: 'SKU-9',
        dimensions: { width: 0.6, height: 0.8, depth: 0.6 },
      },
      [1.2, 0.4, -0.75],
      Math.PI / 3
    );

    const persisted = serializeScene(source);

    // Restore into a FRESH engine (simulates reload).
    const target = fakeEngine();
    const count = restoreScene(target, persisted, new ModelLoader());
    expect(count).toBe(1);

    const [restored] = getFurnitureObjects(target);
    // Load-bearing both directions: m→cm→m and rad→deg→rad must come back to the source.
    expect(restored.position.x).toBeCloseTo(1.2);
    expect(restored.position.y).toBeCloseTo(0.4);
    expect(restored.position.z).toBeCloseTo(-0.75);
    expect(restored.rotation.y).toBeCloseTo(Math.PI / 3);
    const dims = restored.userData.dimensions as { width: number; height: number; depth: number };
    expect(dims.width).toBeCloseTo(0.6);
    expect(dims.height).toBeCloseTo(0.8);
    expect(dims.depth).toBeCloseTo(0.6);
    expect(restored.userData.type).toBe('base_cabinet');
    expect(restored.userData.sku).toBe('SKU-9');
  });

  it('re-applies the saved colour choice (materialId → noir finish)', () => {
    const source = fakeEngine();
    placeFurniture(
      source,
      {
        id: 'a',
        type: 'base_cabinet',
        materialId: 'catalog-noir',
        dimensions: { width: 0.6, height: 0.8, depth: 0.6 },
      },
      [0, 0.4, 0],
      0
    );

    const target = fakeEngine();
    restoreScene(target, serializeScene(source), new ModelLoader());

    const [restored] = getFurnitureObjects(target);
    expect(restored.userData.materialId).toBe('catalog-noir');
    // The noir finish (#1A1A1A) was actually applied to the mesh, not just its metadata.
    let hasNoir = false;
    restored.traverse((c) => {
      const mesh = c as THREE.Mesh;
      const mat = mesh.material as THREE.MeshStandardMaterial | undefined;
      if (mesh.isMesh && mat?.color?.getHex() === 0x1a1a1a) {
        hasNoir = true;
      }
    });
    expect(hasNoir).toBe(true);
  });
});
