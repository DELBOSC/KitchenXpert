/**
 * Canonical signature + clustering (CLAUDE.md §15.8.4 P5).
 *
 * Pure, DB-free port of the validated POC (.scrape-output/castorama-dedup-poc.ts,
 * 20/06). Groups catalogue rows into gammes by a deterministic signature
 * (productType | brand | normalized name | size), then designates ONE canonical
 * per (cluster × price-tier) and links the rest as variants.
 *
 * Every function here is pure (input -> output, no DB / no fs). The POC remains
 * the frozen artefact; this module is the production home of the same logic,
 * typed with explicit numbers (zero `any`).
 */

// ---- Colour dictionary (tunable). Score = 2026 trend desirability. ----
const COLOR_TIERS: Array<{ tier: number; score: number; colors: string[] }> = [
  { tier: 1, score: 100, colors: ['blanc casse', 'blanc casse', 'creme', 'magnolia', 'ivoire', 'gris perle', 'gris taupe', 'chene naturel', 'blanc'] },
  { tier: 2, score: 85, colors: ['vert sauge', 'beige sable', 'gris anthracite', 'bois clair', 'chene fume', 'sauge', 'sable', 'anthracite', 'lin', 'grege'] },
  { tier: 3, score: 70, colors: ['terre cuite', 'terracotta', 'bleu petrole', 'noir mat', 'vert olive', 'olive', 'noir'] },
  { tier: 4, score: 50, colors: ['bleu nuit', 'bleu marine', 'aubergine', 'bordeaux', 'macchiato', 'cafe'] },
  { tier: 5, score: 30, colors: ['gris fonce', 'gris moyen', 'gris clair', 'bois moyen', 'beige', 'brun', 'marron', 'gris'] },
  { tier: 6, score: 10, colors: ['jaune', 'rouge', 'rose', 'magenta', 'orange', 'fuchsia'] },
];
// Flat list sorted by colour length desc (longest / most specific match first).
const COLOR_LOOKUP: Array<{ color: string; tier: number; score: number }> = COLOR_TIERS
  .flatMap((t) => t.colors.map((c) => ({ color: c, tier: t.tier, score: t.score })))
  .sort((a, b) => b.color.length - a.color.length);

// ---- Text normalisation (accent-stripped, lowercase) ----
const deaccent = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
export function baseNorm(s: string | null | undefined): string {
  return deaccent(String(s ?? '')).toLowerCase();
}

/** Extract the first dictionary colour found in the name (longest match wins). */
export function extractColor(nameNorm: string): { color: string; tier: number; score: number } | null {
  for (const c of COLOR_LOOKUP) {
    const re = new RegExp(`(^|[^a-z])${c.color.replace(/ /g, '\\s+')}([^a-z]|$)`, 'i');
    if (re.test(nameNorm)) {return c;}
  }
  return null;
}

/** Gamme signature: strip colour, dimensions, Nouveau/Lot/articles, compact. */
export function gammeName(nameNorm: string, color: string | null): string {
  let s = nameNorm;
  if (color) {s = s.replace(new RegExp(color.replace(/ /g, '\\s+'), 'gi'), ' ');}
  s = s
    .replace(/\bnouveau\b/gi, ' ')
    .replace(/\blot\s+de\s+\d+\b/gi, ' ')
    // dimensions: L/H/P/Ep labels + number + unit, and NxNxN triplets
    .replace(/\b(l|h|p|ep|prof|haut|larg|long|diam)\.?\s*-?\s*\d+(?:[.,]\d+)?\s*(?:mm|cm|m)?/gi, ' ')
    .replace(/\d+(?:[.,]\d+)?\s*[x×]\s*\d+(?:[.,]\d+)?(?:\s*[x×]\s*\d+(?:[.,]\d+)?)?/gi, ' ')
    .replace(/\d+(?:[.,]\d+)?\s*(?:mm|cm|m)\b/gi, ' ')
    // punctuation -> space
    .replace(/[^a-z0-9]+/gi, ' ')
    // stopwords / articles
    .replace(/\b(de|du|des|la|le|les|pour|avec|et|en|a|au|aux|un|une|sur|d|l)\b/gi, ' ')
    // residual pure-numeric tokens
    .replace(/\b\d+\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return s;
}

/**
 * Extract a size key from the name (FIX: avoids merging 45cm/60cm when DB dims
 * are NULL). Only numbers ANCHORED by cm/mm or an L/H/P/Ep label count (rejects
 * "4 foyers", "6000W", "lot de 5"). mm -> cm. Sorted+deduped -> "45" | "60" | "300x4x1".
 */
export function extractSizeKey(nameNorm: string): string {
  const nums = new Set<number>();
  const add = (raw: string, unit?: string): void => {
    let v = parseFloat(raw.replace(',', '.'));
    if ((unit ?? '').toLowerCase() === 'mm') {v = v / 10;}
    if (v > 0 && v < 1000) {nums.add(Math.round(v));}
  };
  for (const m of nameNorm.matchAll(/(\d+(?:[.,]\d+)?)\s*(cm|mm)\b/gi)) {add(m[1] ?? '', m[2]);}
  for (const m of nameNorm.matchAll(/\b(?:l|h|p|ep|larg|haut|prof|long|diam)\.?\s*-?\s*(\d+(?:[.,]\d+)?)\s*(cm|mm)?/gi)) {add(m[1] ?? '', m[2]);}
  return [...nums].sort((a, b) => a - b).join('x');
}

// ---- Public types ----

/** Catalogue row in canonical-friendly shape (dims/price already coerced to cm Number). */
export interface CanonicalRow {
  sku: string;
  name: string;
  brand: string | null;
  /** specifications->>'brand' (real manufacturer; preferred over the `brand` column). */
  realBrand: string | null;
  /** specifications->>'color'. */
  specColor: string | null;
  /** specifications->>'productType'. */
  productType: string | null;
  width: number | null;
  height: number | null;
  depth: number | null;
  price: number | null;
}

export type PriceTier = 'BAS' | 'MOYEN' | 'HAUT' | 'NA';

/** Internal per-row signature item. */
export interface SignatureItem {
  sku: string;
  sig: string;
  gamme: string;
  color: string | null;
  tier: number;
  score: number;
  price: number;
  w: number;
  h: number;
  d: number;
  brand: string;
  pt: string;
  name: string;
}

export interface Canonical {
  sku: string;
  sig: string;
  category: string;
  brand: string;
  gamme: string;
  w: number;
  h: number;
  d: number;
  color: string | null;
  colorScore: number;
  price: number;
  priceTier: PriceTier;
  variantCount: number;
}

export interface VariantLink {
  sku: string;
  parentSku: string;
  color: string | null;
  price: number;
}

export interface ClusterResult {
  canonicals: Canonical[];
  variants: VariantLink[];
  excludedShortGamme: number;
  clusters: number;
  colorTierStats: Record<string, number>;
  priceTierStats: Record<PriceTier, number>;
}

/**
 * Build the full signature item for a row, or null if its gamme is too short
 * (< 3 chars) to be a reliable cluster key (matches POC exclusion).
 */
export function buildItem(row: CanonicalRow): SignatureItem | null {
  const nameNorm = baseNorm(row.name);
  const col = extractColor(nameNorm) ?? (row.specColor ? extractColor(baseNorm(row.specColor)) : null);
  const gamme = gammeName(nameNorm, col?.color ?? null);
  if (gamme.length < 3) {return null;}
  const brand = (row.realBrand && row.realBrand.trim()) || (row.brand && row.brand.trim()) || 'unknown_brand';
  const w = Math.round(row.width ?? 0);
  const h = Math.round(row.height ?? 0);
  const d = Math.round(row.depth ?? 0);
  const pt = row.productType ?? 'unknown';
  // Size: DB dims if present, else size parsed from NAME (avoids 45/60cm merge
  // when width/height/depth are NULL).
  const hasDbDims = w > 0 || h > 0 || d > 0;
  const sizeKey = hasDbDims ? `${w}x${h}x${d}` : `n:${extractSizeKey(nameNorm)}`;
  const sig = [pt, baseNorm(brand), gamme, sizeKey].join('|');
  return {
    sku: row.sku,
    sig,
    gamme,
    color: col?.color ?? null,
    tier: col?.tier ?? 0,
    score: col?.score ?? 0,
    price: row.price ?? 0,
    w, h, d, brand, pt,
    name: row.name,
  };
}

/** Convenience: just the signature string for a row ('' if excluded). */
export function buildSignature(row: CanonicalRow): string {
  return buildItem(row)?.sig ?? '';
}

/**
 * Cluster rows by signature, then designate canonicals + variants.
 *
 * Per cluster: if > 5 rows AND usePriceTiers, split into BAS/MOYEN/HAUT by the
 * 33%/66% of the price range and pick one canonical per tier; otherwise one
 * canonical for the whole cluster. The canonical = highest colour score, lowest
 * price as tie-breaker. Every non-canonical row of a (sub)group becomes a variant
 * pointing at that group's canonical.
 */
export function clusterAndSelect(rows: CanonicalRow[], usePriceTiers: boolean): ClusterResult {
  const items: SignatureItem[] = [];
  let excludedShortGamme = 0;
  for (const row of rows) {
    const it = buildItem(row);
    if (!it) { excludedShortGamme++; continue; }
    items.push(it);
  }

  const clusters = new Map<string, SignatureItem[]>();
  for (const it of items) {
    const a = clusters.get(it.sig) ?? [];
    a.push(it);
    clusters.set(it.sig, a);
  }

  const canonicals: Canonical[] = [];
  const variants: VariantLink[] = [];
  const priceTierStats: Record<PriceTier, number> = { BAS: 0, MOYEN: 0, HAUT: 0, NA: 0 };
  const colorTierStats: Record<string, number> = {};
  for (let t = 0; t <= 6; t++) {colorTierStats[String(t)] = 0;}

  for (const [sig, vs] of clusters) {
    for (const v of vs) {colorTierStats[String(v.tier)]++;}
    const pick = (group: SignatureItem[], priceTier: PriceTier): void => {
      const best = [...group].sort((a, b) => b.score - a.score || a.price - b.price)[0]!;
      canonicals.push({
        sku: best.sku, sig, category: best.pt, brand: best.brand, gamme: best.gamme,
        w: best.w, h: best.h, d: best.d, color: best.color, colorScore: best.score,
        price: best.price, priceTier, variantCount: group.length,
      });
      priceTierStats[priceTier]++;
      for (const v of group) {
        if (v.sku !== best.sku) {variants.push({ sku: v.sku, parentSku: best.sku, color: v.color, price: v.price });}
      }
    };

    if (vs.length > 5 && usePriceTiers) {
      const prices = vs.map((v) => v.price);
      const mn = Math.min(...prices);
      const mx = Math.max(...prices);
      const range = mx - mn;
      const t1 = mn + range * 0.33;
      const t2 = mn + range * 0.66;
      const groups: Record<'BAS' | 'MOYEN' | 'HAUT', SignatureItem[]> = { BAS: [], MOYEN: [], HAUT: [] };
      for (const v of vs) {groups[v.price <= t1 ? 'BAS' : v.price <= t2 ? 'MOYEN' : 'HAUT'].push(v);}
      for (const tn of ['BAS', 'MOYEN', 'HAUT'] as const) {
        if (groups[tn].length) {pick(groups[tn], tn);}
      }
    } else {
      pick(vs, 'NA');
    }
  }

  return { canonicals, variants, excludedShortGamme, clusters: clusters.size, colorTierStats, priceTierStats };
}
