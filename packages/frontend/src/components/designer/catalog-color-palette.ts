import type { KitchenMaterial } from '@kitchenxpert/3d-engine';

/**
 * Catalog color palette — deterministic `key → tint` map for the color-picker
 * (Palier 1). The `/catalog/products/:sku/colors` endpoint returns a normalized
 * color `key` (one of the 33 families of the backend `color-normalize.ts`
 * `FAMILIES` set), NOT a hex. The 3D engine tints via a hex
 * (`MaterialLibrary.getMaterial` → `new THREE.Color(kitchen.color)`), so this
 * table bridges the gap: each family key → a curated `{ hex, roughness,
 * metalness, type }`, aligned with the existing `KITCHEN_MATERIALS` and the
 * §5 design tokens.
 *
 * SOURCE OF TRUTH for the key set: backend
 * `packages/backend/src/services/variant-resolver/color-normalize.ts` FAMILIES
 * (22 `kind:'color'` + 11 `kind:'material'` = 33). This palette MUST cover all
 * 33 keys — the coverage test asserts it against a mirrored canonical list.
 *
 * `type` is an explicit column (not derived from kind): argent/doré/champagne
 * are metals, not laques, so they carry `type:'metal'` for a coherent PBR
 * render. `type` is never `'glass'` (would trigger transparency in the engine).
 */

/** The 33 normalized color-family keys (mirror of color-normalize.ts FAMILIES). */
export type ColorKey =
  // kind: 'color' (22)
  | 'blanc'
  | 'noir'
  | 'gris'
  | 'bleu'
  | 'vert'
  | 'rouge'
  | 'beige'
  | 'marron'
  | 'anthracite'
  | 'creme'
  | 'rose'
  | 'terracotta'
  | 'taupe'
  | 'dore'
  | 'argent'
  | 'camel'
  | 'champagne'
  | 'graphite'
  | 'bordeaux'
  | 'ivoire'
  | 'jaune'
  | 'orange'
  // kind: 'material' (11)
  | 'chene'
  | 'bois'
  | 'noyer'
  | 'sonoma'
  | 'hetre'
  | 'beton'
  | 'ciment'
  | 'marbre'
  | 'inox'
  | 'naturel'
  | 'metal';

/** One palette entry — the tint applied to a mesh for a given color family. */
export interface CatalogColorEntry {
  /** Display name (matches the family label, e.g. 'Blanc', 'Chêne'). */
  label: string;
  /** Hex tint fed to THREE.Color. */
  hex: string;
  roughness: number;
  metalness: number;
  /** KitchenMaterial.type — explicit per tint, never 'glass'. */
  type: KitchenMaterial['type'];
}

/**
 * 33/33 family keys → tint. Values authored by the product owner, aligned with
 * KITCHEN_MATERIALS and §5 tokens; argent/doré/champagne/metal corrected to
 * `type:'metal'` (their high metalness only makes sense with that type).
 */
export const CATALOG_COLOR_PALETTE: Record<ColorKey, CatalogColorEntry> = {
  // --- colors (22) ---
  blanc: { label: 'Blanc', hex: '#FFFFFF', roughness: 0.1, metalness: 0.05, type: 'laminate' },
  noir: { label: 'Noir', hex: '#1A1A1A', roughness: 0.2, metalness: 0.08, type: 'laminate' },
  gris: { label: 'Gris', hex: '#8A8D91', roughness: 0.25, metalness: 0.05, type: 'laminate' },
  bleu: { label: 'Bleu', hex: '#1B2A4A', roughness: 0.2, metalness: 0.05, type: 'laminate' },
  vert: { label: 'Vert', hex: '#9CAF88', roughness: 0.25, metalness: 0.05, type: 'laminate' },
  rouge: { label: 'Rouge', hex: '#8E3B3B', roughness: 0.22, metalness: 0.05, type: 'laminate' },
  beige: { label: 'Beige', hex: '#D9C7A8', roughness: 0.3, metalness: 0.05, type: 'laminate' },
  marron: { label: 'Marron', hex: '#6B4E3D', roughness: 0.45, metalness: 0.05, type: 'laminate' },
  anthracite: {
    label: 'Anthracite',
    hex: '#3D3D3D',
    roughness: 0.2,
    metalness: 0.05,
    type: 'laminate',
  },
  creme: { label: 'Crème', hex: '#FFF8E7', roughness: 0.15, metalness: 0.05, type: 'laminate' },
  rose: { label: 'Rose', hex: '#D9A5A0', roughness: 0.25, metalness: 0.05, type: 'laminate' },
  terracotta: {
    label: 'Terracotta',
    hex: '#C67240',
    roughness: 0.55,
    metalness: 0.05,
    type: 'ceramic',
  },
  taupe: { label: 'Taupe', hex: '#8B7D6B', roughness: 0.35, metalness: 0.05, type: 'laminate' },
  dore: { label: 'Doré', hex: '#C9A227', roughness: 0.3, metalness: 0.8, type: 'metal' },
  argent: { label: 'Argent', hex: '#C0C0C0', roughness: 0.35, metalness: 0.9, type: 'metal' },
  camel: { label: 'Camel', hex: '#B0794A', roughness: 0.4, metalness: 0.05, type: 'laminate' },
  champagne: {
    label: 'Champagne',
    hex: '#E6D2A8',
    roughness: 0.28,
    metalness: 0.35,
    type: 'metal',
  },
  graphite: {
    label: 'Graphite',
    hex: '#2B2B2E',
    roughness: 0.28,
    metalness: 0.15,
    type: 'laminate',
  },
  bordeaux: {
    label: 'Bordeaux',
    hex: '#5C2A33',
    roughness: 0.25,
    metalness: 0.05,
    type: 'laminate',
  },
  ivoire: { label: 'Ivoire', hex: '#F5EBDC', roughness: 0.18, metalness: 0.05, type: 'laminate' },
  jaune: { label: 'Jaune', hex: '#D9B84A', roughness: 0.25, metalness: 0.05, type: 'laminate' },
  orange: { label: 'Orange', hex: '#C86B34', roughness: 0.3, metalness: 0.05, type: 'laminate' },
  // --- materials (11) ---
  chene: { label: 'Chêne', hex: '#D4A574', roughness: 0.75, metalness: 0.05, type: 'wood' },
  bois: { label: 'Bois', hex: '#C8A876', roughness: 0.73, metalness: 0.05, type: 'wood' },
  noyer: { label: 'Noyer', hex: '#5D4037', roughness: 0.7, metalness: 0.05, type: 'wood' },
  sonoma: { label: 'Sonoma', hex: '#C9AE87', roughness: 0.72, metalness: 0.05, type: 'wood' },
  hetre: { label: 'Hêtre', hex: '#DCC8A0', roughness: 0.75, metalness: 0.05, type: 'wood' },
  beton: { label: 'Béton', hex: '#7D7D7A', roughness: 0.85, metalness: 0.03, type: 'stone' },
  ciment: { label: 'Ciment', hex: '#8C8C88', roughness: 0.88, metalness: 0.03, type: 'stone' },
  marbre: { label: 'Marbre', hex: '#F5F5F5', roughness: 0.15, metalness: 0.05, type: 'stone' },
  inox: { label: 'Inox', hex: '#C0C0C0', roughness: 0.35, metalness: 0.9, type: 'metal' },
  naturel: { label: 'Naturel', hex: '#CFC0A8', roughness: 0.65, metalness: 0.05, type: 'wood' },
  metal: { label: 'Métal', hex: '#B87333', roughness: 0.3, metalness: 0.85, type: 'metal' },
};
