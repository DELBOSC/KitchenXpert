/**
 * VariantResolverService (CLAUDE.md §15.8.4 P7 — chatbot couleur, Phase 1).
 *
 * Given a canonical SKU (a gamme), reads the parentSku graph (canonical + its
 * variants), groups the active SKUs by normalized color (via the frozen
 * `normalizeColor`), and returns the offerable color choices — each with a
 * single representative purchasable SKU.
 *
 * 100% READ-ONLY: only `db.product.findMany`. No write, no LLM, no API key.
 * Pure DI (mockable `ResolverDb`) — testable with hard-coded fixtures, no DB.
 */
import { normalizeColor } from './color-normalize';

import type { ColorOption, ResolverDb, ResolverProductRow } from './variant-resolver.types';

/** Raw color string out of the Json `specifications.color`, or null. */
function colorOf(row: ResolverProductRow): string | null {
  const s = row.specifications;
  if (s != null && typeof s === 'object' && 'color' in s) {
    const c = (s as { color?: unknown }).color;
    return typeof c === 'string' ? c : null;
  }
  return null;
}

/** Positive finite price, or Infinity for sorting (invalid/missing prices last). */
function priceForSort(row: ResolverProductRow): number {
  const n = Number(row.price);
  return Number.isFinite(n) && n > 0 ? n : Infinity;
}

/** First image URL if `images` is a non-empty string array, else undefined. */
function firstImage(images: unknown): string | undefined {
  return Array.isArray(images) && typeof images[0] === 'string' ? images[0] : undefined;
}

/** Sort rank putting the canonical row first (0) before variants (1). */
function canonRank(row: ResolverProductRow): number {
  return row.isCanonical ? 0 : 1;
}

export class VariantResolverService {
  constructor(private readonly db: ResolverDb) {}

  /**
   * Resolve the offerable color choices of a gamme. Returns [] for an unknown
   * canonical / empty gamme / a gamme whose colors are all unrecognized.
   * Sorted: trend score desc, then group size desc, then label asc (stable).
   */
  async resolveColors(canonicalSku: string): Promise<ColorOption[]> {
    const rows = await this.db.product.findMany({
      where: {
        OR: [{ parentSku: canonicalSku }, { sku: canonicalSku }],
        isActive: true,
        deletedAt: null,
      },
    });

    // Group rows by normalized color key; drop unrecognized colors.
    const groups = new Map<string, { label: string; kind: 'color' | 'material'; score: number; rows: ResolverProductRow[] }>();
    for (const row of rows) {
      const nc = normalizeColor(colorOf(row));
      if (nc.kind === 'unknown') {continue;}
      const g = groups.get(nc.key) ?? { label: nc.label, kind: nc.kind, score: nc.score, rows: [] };
      g.rows.push(row);
      groups.set(nc.key, g);
    }

    const options: ColorOption[] = [];
    for (const [key, g] of groups) {
      // Representative: canonical first, else cheapest, then sku for stability.
      const sorted = [...g.rows].sort(
        (a, b) =>
          canonRank(a) - canonRank(b) ||
          priceForSort(a) - priceForSort(b) ||
          a.sku.localeCompare(b.sku),
      );
      const rep = sorted[0]!;
      const repPrice = Number(rep.price);
      options.push({
        key,
        label: g.label,
        kind: g.kind,
        score: g.score,
        isCanonicalColor: g.rows.some((r) => r.isCanonical),
        representativeSku: rep.sku,
        priceFrom: Number.isFinite(repPrice) && repPrice > 0 ? repPrice : 0,
        skuCount: g.rows.length,
        skus: g.rows.map((r) => r.sku),
        name: rep.name,
        imageUrl: firstImage(rep.images),
      });
    }

    options.sort(
      (a, b) => b.score - a.score || b.skuCount - a.skuCount || a.label.localeCompare(b.label),
    );
    return options;
  }

  /**
   * Resolve a specific color of a gamme to its representative purchasable SKU.
   * Returns null if the gamme does not offer that color.
   */
  async resolveByColor(canonicalSku: string, colorKey: string): Promise<{ sku: string; price: number } | null> {
    const options = await this.resolveColors(canonicalSku);
    const match = options.find((o) => o.key === colorKey);
    return match ? { sku: match.representativeSku, price: match.priceFrom } : null;
  }
}

export default VariantResolverService;
