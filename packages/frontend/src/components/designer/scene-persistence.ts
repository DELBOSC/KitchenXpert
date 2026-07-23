import { ModelLoader, MaterialLibrary } from '@kitchenxpert/3d-engine';

import { buildCatalogMaterial } from './build-catalog-material';
import { getFurnitureObjects } from './scene-furniture';

import type { KitchenEngine } from '@kitchenxpert/3d-engine';

/**
 * Serialize / restore the placed 3D furniture of a SAVED kitchen.
 *
 * UNIT CONVENTIONS (the part that silently corrupts if wrong — proven by audit 23/07):
 *  - The engine scene works in METRES and RADIANS (createProceduralFallback dims, mesh
 *    position/rotation).
 *  - `KitchenItem` (the DB table, via /kitchens/:id/items) stores CENTIMETRES and DEGREES
 *    — that is the convention of its only existing writer (sandbox import: SandboxItem is
 *    cm + degrees). We follow it so both writers agree.
 *  => serialize: m→cm (×100), rad→deg (×180/π).  restore: cm→m (÷100), deg→rad (×π/180).
 *
 * The round-trip is self-consistent for the designer (engine → DB → engine, same frame),
 * which is what "save the arrangement" needs.
 */

const M_TO_CM = 100;
const CM_TO_M = 0.01;
const RAD_TO_DEG = 180 / Math.PI;
const DEG_TO_RAD = Math.PI / 180;

// Fallback finish for restored items that carry no explicit colour choice (same warm wood
// tone the generated/auto-complete meshes use). Explicit choices are re-applied via materialId.
const DEFAULT_COLOR = 0xd4a574;
const CATALOG_MATERIAL_PREFIX = 'catalog-';

const materialLibrary = new MaterialLibrary();

/** One placed item as it crosses the wire (DB unit convention: cm, degrees). */
export interface PersistedItem {
  type: string;
  name?: string;
  /** Real catalog SKU → stored in KitchenItem.model. */
  model?: string;
  positionX: number;
  positionY: number;
  positionZ: number;
  rotationY: number;
  width: number;
  depth: number;
  height: number;
  price?: number;
  /** Carries the applied colour choice (materialId) so it survives a reload. */
  metadata?: { materialId?: string; [k: string]: unknown };
}

interface FurnitureUserData {
  type?: string;
  name?: string;
  sku?: string;
  dimensions?: { width: number; height: number; depth: number };
  price?: number;
  materialId?: string;
}

/**
 * Collect the placed furniture (traversal — the app's source of truth) and serialize each
 * to a persistable item. Items with non-positive dimensions are skipped (degenerate — they
 * cannot be restored, and a single one would make the whole save fail zod validation).
 */
export function serializeScene(engine: KitchenEngine): PersistedItem[] {
  const out: PersistedItem[] = [];
  for (const obj of getFurnitureObjects(engine)) {
    const ud = obj.userData as FurnitureUserData;
    const d = ud.dimensions ?? { width: 0, height: 0, depth: 0 };
    if (d.width <= 0 || d.depth <= 0 || d.height <= 0) {
      continue;
    }
    const item: PersistedItem = {
      type: ud.type ?? 'cabinet',
      positionX: obj.position.x * M_TO_CM,
      positionY: obj.position.y * M_TO_CM,
      positionZ: obj.position.z * M_TO_CM,
      rotationY: obj.rotation.y * RAD_TO_DEG,
      width: d.width * M_TO_CM,
      depth: d.depth * M_TO_CM,
      height: d.height * M_TO_CM,
    };
    // KitchenItem.name is a required DB column — always send one (fall back to the type).
    item.name = ud.name ?? item.type;
    if (ud.sku) {
      item.model = ud.sku;
    }
    if (ud.price != null) {
      item.price = ud.price;
    }
    if (ud.materialId) {
      item.metadata = { materialId: ud.materialId };
    }
    out.push(item);
  }
  return out;
}

/**
 * Normalize a raw `KitchenItem` row from `GET /kitchens/:id/items` into a `PersistedItem`.
 *
 * Critical: Prisma `Decimal` columns (positionX/Y/Z, rotationY, width/depth/height, price)
 * serialize to JSON as STRINGS ("50"), and `"50" * 0.01 === NaN` — a silent corruption.
 * We coerce every numeric field with Number() at this boundary so restoreScene only ever
 * sees real numbers.
 */
export function normalizePersistedItem(raw: unknown): PersistedItem {
  const r = (raw ?? {}) as Record<string, unknown>;
  const item: PersistedItem = {
    type: typeof r.type === 'string' ? r.type : 'cabinet',
    positionX: Number(r.positionX),
    positionY: Number(r.positionY),
    positionZ: Number(r.positionZ),
    rotationY: Number(r.rotationY),
    width: Number(r.width),
    depth: Number(r.depth),
    height: Number(r.height),
  };
  if (typeof r.name === 'string') {
    item.name = r.name;
  }
  if (typeof r.model === 'string') {
    item.model = r.model;
  }
  if (r.price != null) {
    item.price = Number(r.price);
  }
  if (r.metadata && typeof r.metadata === 'object') {
    item.metadata = r.metadata as PersistedItem['metadata'];
  }
  return item;
}

/**
 * Re-place persisted items into the engine scene (DB cm/degrees → engine metres/radians).
 * Adds each to the scene registry AND the collision system (so drag/auto-complete see them).
 * Re-applies the saved colour choice via materialId. Returns how many were restored.
 */
export function restoreScene(
  engine: KitchenEngine,
  items: PersistedItem[],
  loader: ModelLoader = new ModelLoader()
): number {
  items.forEach((item, i) => {
    const dimensions = {
      width: item.width * CM_TO_M,
      height: item.height * CM_TO_M,
      depth: item.depth * CM_TO_M,
    };
    const materialId = item.metadata?.materialId;
    const mesh = loader.createProceduralFallback(item.type, dimensions, DEFAULT_COLOR);
    mesh.position.set(item.positionX * CM_TO_M, item.positionY * CM_TO_M, item.positionZ * CM_TO_M);
    mesh.rotation.y = item.rotationY * DEG_TO_RAD;

    const id = `restored-${i}-${item.type}`;
    mesh.userData = {
      id,
      type: item.type,
      dimensions,
      ...(item.name ? { name: item.name } : {}),
      ...(item.model ? { sku: item.model } : {}),
      ...(item.price != null ? { price: item.price } : {}),
      ...(materialId ? { materialId } : {}),
    };

    if (typeof materialId === 'string' && materialId.startsWith(CATALOG_MATERIAL_PREFIX)) {
      const colorKey = materialId.slice(CATALOG_MATERIAL_PREFIX.length);
      materialLibrary.applyMaterial(mesh, buildCatalogMaterial(colorKey));
    }

    engine.scene.addObject(id, mesh);
    engine.collisionSystem.addCollisionObject(mesh);
  });
  return items.length;
}
