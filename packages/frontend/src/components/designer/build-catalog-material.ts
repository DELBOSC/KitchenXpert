import { CATALOG_COLOR_PALETTE, type CatalogColorEntry } from './catalog-color-palette';

import type { KitchenMaterial } from '@kitchenxpert/3d-engine';

/**
 * Turn a `/colors` family key into an ad-hoc KitchenMaterial the 3D engine can
 * apply (Palier 1 — deterministic core, no React, no UI).
 *
 * The `id` is `catalog-<key>`: unique per family so it does NOT collide with the
 * `MaterialLibrary.getMaterial` cache (keyed by id) — each family caches its own
 * tint (cf audit Q2). Unknown keys fall back to a neutral grey (the endpoint
 * only returns the 33 known families, but the param is typed `string` because it
 * comes from `ColorOption.key` at the call site; the fallback keeps it safe).
 */
const FALLBACK: CatalogColorEntry = {
  label: 'Couleur',
  hex: '#8A8D91',
  roughness: 0.25,
  metalness: 0.05,
  type: 'laminate',
};

export function buildCatalogMaterial(key: string): KitchenMaterial {
  const entry = (CATALOG_COLOR_PALETTE as Record<string, CatalogColorEntry>)[key] ?? FALLBACK;
  return {
    id: `catalog-${key}`,
    name: entry.label,
    type: entry.type,
    color: entry.hex,
    roughness: entry.roughness,
    metalness: entry.metalness,
  };
}
