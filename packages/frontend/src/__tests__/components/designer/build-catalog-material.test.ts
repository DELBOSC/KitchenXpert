import { MaterialLibrary } from '@kitchenxpert/3d-engine';
import * as THREE from 'three';
import { describe, it, expect } from 'vitest';

import {
  CATALOG_COLOR_PALETTE,
  type ColorKey,
} from '../../../components/designer/catalog-color-palette';
import { buildCatalogMaterial } from '../../../components/designer/build-catalog-material';

/**
 * Canonical 33 family keys — mirrored from the backend source of truth
 * `packages/backend/src/services/variant-resolver/color-normalize.ts` FAMILIES
 * (22 kind:'color' + 11 kind:'material'). This list, NOT the palette itself, is
 * the oracle for the 33/33 coverage assertion (a palette that dropped a key
 * would still be internally consistent — only comparing against this external
 * list proves full coverage).
 */
const COLOR_NORMALIZE_KEYS: ColorKey[] = [
  'blanc',
  'noir',
  'gris',
  'bleu',
  'vert',
  'rouge',
  'beige',
  'marron',
  'anthracite',
  'creme',
  'rose',
  'terracotta',
  'taupe',
  'dore',
  'argent',
  'camel',
  'champagne',
  'graphite',
  'bordeaux',
  'ivoire',
  'jaune',
  'orange',
  'chene',
  'bois',
  'noyer',
  'sonoma',
  'hetre',
  'beton',
  'ciment',
  'marbre',
  'inox',
  'naturel',
  'metal',
];

const VALID_TYPES = ['wood', 'stone', 'metal', 'laminate', 'glass', 'ceramic'];

describe('catalog color palette — Palier 1 deterministic core', () => {
  describe('(a) buildCatalogMaterial correctness', () => {
    it('maps a family key to the exact ad-hoc KitchenMaterial', () => {
      expect(buildCatalogMaterial('anthracite')).toEqual({
        id: 'catalog-anthracite',
        name: 'Anthracite',
        type: 'laminate',
        color: '#3D3D3D',
        roughness: 0.2,
        metalness: 0.05,
      });
    });

    it('keeps metals as type:metal with their metalness (argent)', () => {
      const mat = buildCatalogMaterial('argent');
      expect(mat.type).toBe('metal');
      expect(mat.color).toBe('#C0C0C0');
      expect(mat.metalness).toBe(0.9);
    });

    it('gives every family a unique catalog-<key> id (no getMaterial cache collision)', () => {
      const ids = COLOR_NORMALIZE_KEYS.map((k) => buildCatalogMaterial(k).id);
      expect(new Set(ids).size).toBe(COLOR_NORMALIZE_KEYS.length);
      expect(buildCatalogMaterial('noir').id).toBe('catalog-noir');
    });

    it('falls back safely for an unknown key (no throw, id still unique)', () => {
      const mat = buildCatalogMaterial('not-a-family');
      expect(mat.id).toBe('catalog-not-a-family');
      expect(mat.color).toBe('#8A8D91'); // neutral grey fallback
      expect(mat.type).toBe('laminate');
    });
  });

  describe('(a) palette 33/33 coverage', () => {
    it('covers exactly the 33 color-normalize families — no missing, no extra', () => {
      const paletteKeys = Object.keys(CATALOG_COLOR_PALETTE).sort();
      const canonical = [...COLOR_NORMALIZE_KEYS].sort();
      expect(paletteKeys).toEqual(canonical);
      expect(paletteKeys).toHaveLength(33);
    });

    it('every entry is well-formed (hex #RRGGBB, valid type≠glass, ranges 0..1)', () => {
      for (const key of COLOR_NORMALIZE_KEYS) {
        const e = CATALOG_COLOR_PALETTE[key];
        expect(e.hex, key).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(VALID_TYPES, key).toContain(e.type);
        expect(e.type, key).not.toBe('glass');
        expect(e.roughness, key).toBeGreaterThanOrEqual(0);
        expect(e.roughness, key).toBeLessThanOrEqual(1);
        expect(e.metalness, key).toBeGreaterThanOrEqual(0);
        expect(e.metalness, key).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('(b) render — the REAL engine tints a mesh to the palette hex', () => {
    const library = new MaterialLibrary();

    const applyAndReadColor = (key: string): string => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial());
      library.applyMaterial(mesh, buildCatalogMaterial(key));
      return (mesh.material as THREE.MeshStandardMaterial).color.getHexString();
    };

    it("applies 'noir' → mesh.material.color === 1a1a1a", () => {
      expect(applyAndReadColor('noir')).toBe('1a1a1a');
    });

    it("applies 'anthracite' → mesh.material.color === 3d3d3d", () => {
      expect(applyAndReadColor('anthracite')).toBe('3d3d3d');
    });

    it("applies 'argent' → color c0c0c0 AND metalness 0.9 on the mesh", () => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial());
      library.applyMaterial(mesh, buildCatalogMaterial('argent'));
      const mat = mesh.material as THREE.MeshStandardMaterial;
      expect(mat.color.getHexString()).toBe('c0c0c0');
      expect(mat.metalness).toBe(0.9);
    });

    it('tints correctly for ALL 33 families (full chain, every key)', () => {
      for (const key of COLOR_NORMALIZE_KEYS) {
        const expected = CATALOG_COLOR_PALETTE[key].hex.slice(1).toLowerCase();
        expect(applyAndReadColor(key), key).toBe(expected);
      }
    });
  });
});
