/**
 * Visual Material Factory
 *
 * Takes the `metadata.visuals` payload that the backend stamps on every
 * imported KitchenItem and converts it into a Three.js material that the
 * renderer can apply to the mesh.
 *
 * Resolution order:
 *   1. Texture from `images[0]` (or any other URL in `images`) loaded via
 *      THREE.TextureLoader. CORS-safe URLs only — IKEA's CDN already serves
 *      them with `Access-Control-Allow-Origin: *`.
 *   2. Match the `material` + `color` strings against the KITCHEN_MATERIALS
 *      palette already shipped with the engine. We prefer this over a tinted
 *      placeholder because the palette has hand-tuned roughness/metalness.
 *   3. Last-chance fallback: a flat MeshStandardMaterial with the colour name
 *      resolved through `cssColorOrFallback()`.
 *
 * The factory caches materials by a deterministic key so a kitchen with 20
 * cabinets sharing the same finish only allocates one Material + one Texture
 * (textures are themselves cached by URL).
 */

import * as THREE from 'three';
import { KITCHEN_MATERIALS, type KitchenMaterial } from '../models/material-model';

export interface VisualsPayload {
  images?: string[];
  thumbnail?: string | null;
  material?: string | null;
  color?: string | null;
  finish?: string | null;
}

interface FactoryOptions {
  /** When true, textures are not requested over the network — useful in unit
   *  tests and for SSR. Falls straight to colour resolution. */
  disableTextures?: boolean;
  /** Anisotropy applied to loaded textures. Default: 8. */
  anisotropy?: number;
}

export class VisualMaterialFactory {
  private materialCache: Map<string, THREE.MeshStandardMaterial> = new Map();
  private textureCache: Map<string, Promise<THREE.Texture>> = new Map();
  private loader = new THREE.TextureLoader();

  constructor(private readonly opts: FactoryOptions = {}) {
    this.loader.crossOrigin = 'anonymous';
  }

  /**
   * Build a material for a KitchenItem. Returns synchronously with a temporary
   * placeholder, and replaces it on the same Material object once the texture
   * resolves — this lets callers attach the material to a mesh immediately
   * without waiting for the network.
   */
  build(visuals: VisualsPayload | null | undefined): THREE.MeshStandardMaterial {
    const cacheKey = visualKey(visuals);
    const cached = this.materialCache.get(cacheKey);
    if (cached) return cached;

    const palette = matchKitchenMaterial(visuals);
    const material = palette
      ? new THREE.MeshStandardMaterial({
          color: palette.color,
          roughness: applyFinish(palette.roughness, visuals?.finish),
          metalness: palette.metalness,
        })
      : new THREE.MeshStandardMaterial({
          color: cssColorOrFallback(visuals?.color, '#dadde0'),
          roughness: applyFinish(0.55, visuals?.finish),
          metalness: 0.05,
        });

    // Try to load a texture. If it succeeds, mutate the material in place so
    // anything that already holds a reference automatically picks it up.
    const url = pickTextureUrl(visuals);
    if (url && !this.opts.disableTextures) {
      void this.loadTexture(url).then((tex) => {
        material.map = tex;
        // When a colour map is set we keep `color` neutral so the texture
        // shows its own tint instead of being tinted by the base colour.
        material.color.set('#ffffff');
        material.needsUpdate = true;
      }).catch((err) => {
        // Best-effort — leave the placeholder colour. Log via console.warn
        // so it's visible in DevTools without a hard dep on a logger here.
        // eslint-disable-next-line no-console
        console.warn('[VisualMaterialFactory] texture load failed', { url, err });
      });
    }

    this.materialCache.set(cacheKey, material);
    return material;
  }

  /** Returns a Promise so the caller can await full readiness when needed. */
  async buildAsync(visuals: VisualsPayload | null | undefined): Promise<THREE.MeshStandardMaterial> {
    const material = this.build(visuals);
    const url = pickTextureUrl(visuals);
    if (url && !this.opts.disableTextures) {
      try { await this.loadTexture(url); } catch { /* ignore */ }
    }
    return material;
  }

  /** Drops every cached texture and material so the GC can reclaim GPU memory. */
  dispose(): void {
    for (const m of this.materialCache.values()) m.dispose();
    this.materialCache.clear();

    void Promise.allSettled(
      [...this.textureCache.values()].map(async (p) => {
        try { (await p).dispose(); } catch { /* ignore */ }
      }),
    );
    this.textureCache.clear();
  }

  // -------------------------------------------------------------------------
  private loadTexture(url: string): Promise<THREE.Texture> {
    const cached = this.textureCache.get(url);
    if (cached) return cached;
    const promise = new Promise<THREE.Texture>((resolve, reject) => {
      this.loader.load(
        url,
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = this.opts.anisotropy ?? 8;
          // Decent defaults for cabinet front textures.
          tex.wrapS = THREE.RepeatWrapping;
          tex.wrapT = THREE.RepeatWrapping;
          resolve(tex);
        },
        undefined,
        (err) => reject(err),
      );
    });
    this.textureCache.set(url, promise);
    return promise;
  }
}

// ---------------------------------------------------------------------------
// Pure helpers (exported for unit-tests)
// ---------------------------------------------------------------------------

export function pickTextureUrl(v: VisualsPayload | null | undefined): string | null {
  if (!v) return null;
  if (typeof v.thumbnail === 'string' && v.thumbnail.startsWith('http')) return v.thumbnail;
  if (Array.isArray(v.images)) {
    const first = v.images.find((img) => typeof img === 'string' && img.startsWith('http'));
    if (first) return first;
  }
  return null;
}

/**
 * Resolve a `(material, color)` pair into one of the engine's curated
 * KitchenMaterial entries. We do best-effort fuzzy matching so messy strings
 * coming from scrapers ("blanc brillant", "chene massif", "INOX BROSSÉ")
 * still snap to a known finish.
 */
export function matchKitchenMaterial(v: VisualsPayload | null | undefined): KitchenMaterial | null {
  if (!v) return null;
  const haystack = `${v.material ?? ''} ${v.color ?? ''}`.toLowerCase().trim();
  if (!haystack) return null;

  const RULES: Array<{ test: RegExp; id: string }> = [
    { test: /\b(inox|stainless|acier brossé|brushed steel)\b/, id: 'metal-stainless' },
    { test: /\b(laiton|brass)\b/, id: 'metal-brass' },
    { test: /\b(cuivre|copper)\b/, id: 'metal-copper' },
    { test: /\b(noir mat|black matte|matte black)\b/, id: 'metal-black' },
    { test: /\b(quartz noir|black quartz)\b/, id: 'stone-quartz-black' },
    { test: /\b(quartz|silestone)\b/, id: 'stone-quartz-white' },
    { test: /\bmarbre\b|\bmarble\b/, id: 'stone-white-marble' },
    { test: /\bgranite?\b/, id: 'stone-granite' },
    { test: /\bardoise|slate\b/, id: 'stone-slate' },
    { test: /\bnoyer|walnut\b/, id: 'wood-walnut' },
    { test: /\b(érable|erable|maple)\b/, id: 'wood-maple' },
    { test: /\b(bouleau|birch)\b/, id: 'wood-birch' },
    { test: /\bfrêne|frene|ash\b/, id: 'wood-ash' },
    { test: /\bwengé|wenge\b/, id: 'wood-wenge' },
    { test: /\b(chêne|chene|oak)\b/, id: 'wood-oak' },
    { test: /\b(verre dépoli|frosted)\b/, id: 'glass-frosted' },
    { test: /\bverre|glass\b/, id: 'glass-clear' },
    { test: /\bterracotta|terre cuite\b/, id: 'ceramic-terracotta' },
    { test: /\b(céramique|ceramique|ceramic)\b/, id: 'ceramic-white' },
    { test: /\b(bleu marine|navy)\b/, id: 'laminate-navy' },
    { test: /\b(vert sauge|sage)\b/, id: 'laminate-sage' },
    { test: /\b(gris anthracite|anthracite|charcoal|graphite)\b/, id: 'laminate-grey' },
    { test: /\b(crème|creme|ivory)\b/, id: 'laminate-cream' },
    { test: /\b(blanc|white)\b/, id: 'laminate-white' },
  ];

  for (const rule of RULES) {
    if (rule.test.test(haystack)) {
      return KITCHEN_MATERIALS.find((m) => m.id === rule.id) ?? null;
    }
  }
  return null;
}

/** Modulate roughness based on a free-form finish hint. */
export function applyFinish(base: number, finish?: string | null): number {
  if (!finish) return base;
  const f = finish.toLowerCase();
  if (/(mat|matte|matt)/.test(f)) return Math.min(0.95, base + 0.2);
  if (/(brillant|gloss|glossy|laque)/.test(f)) return Math.max(0.05, base - 0.3);
  if (/(satin|satiné)/.test(f)) return Math.max(0.1, base - 0.1);
  return base;
}

/**
 * Try to interpret a colour string as either a CSS hex/named colour Three.js
 * understands, or a fallback if it's nonsense (e.g. "chêne naturel").
 */
export function cssColorOrFallback(input: string | null | undefined, fallback: string): string {
  if (!input) return fallback;
  const trimmed = input.trim();
  if (/^#[0-9a-fA-F]{3,8}$/.test(trimmed)) return trimmed;
  // Named CSS colours: try a temp THREE.Color — it returns NaN-coloured if
  // it can't parse, which we detect by round-tripping via getHex.
  try {
    const c = new THREE.Color(trimmed);
    if (Number.isFinite(c.r) && (c.r + c.g + c.b) > 0) return trimmed;
  } catch { /* swallow */ }
  return fallback;
}

function visualKey(v: VisualsPayload | null | undefined): string {
  if (!v) return '__none__';
  return [
    v.thumbnail ?? '',
    (v.images ?? []).join('|'),
    v.material ?? '',
    v.color ?? '',
    v.finish ?? '',
  ].join('::');
}
