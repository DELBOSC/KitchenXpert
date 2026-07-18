/**
 * Extraction JSON-LD dep-free (CLAUDE.md §15.8 — N3 générique RÉUTILISABLE).
 *
 * Beaucoup de retailers exposent un `<script type="application/ld+json">` avec
 * un noeud `@type: Product` (nom, prix via offers, gtin/EAN, catégorie). On le
 * lit sans dépendance (regex + JSON.parse), aplatit `@graph`/arrays, et garde
 * les noeuds Product. RÉUTILISABLE par marque ; en revanche l'extraction des
 * COTES reste spécifique à chaque marque (formats hétérogènes) — voir chaque
 * Strategy.
 */

import { capHtml } from './html-fetcher';

/** Retourne les noeuds JSON-LD `@type: *Product*` trouvés dans une page HTML. */
export function extractJsonLdProducts(rawHtml: string): Record<string, unknown>[] {
  const html = capHtml(rawHtml); // bound the regex input (js/redos, cf capHtml)
  const out: Record<string, unknown>[] = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      const parsed: unknown = JSON.parse((m[1] ?? '').trim());
      const nodes = flattenNodes(parsed);
      for (const node of nodes) {
        if (isProduct(node)) out.push(node);
      }
    } catch {
      // bloc JSON-LD malformé -> on ignore (skip-not-crash)
    }
  }
  return out;
}

function flattenNodes(parsed: unknown): Record<string, unknown>[] {
  if (Array.isArray(parsed)) return parsed.flatMap(flattenNodes);
  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj['@graph'])) return (obj['@graph'] as unknown[]).flatMap(flattenNodes);
    return [obj];
  }
  return [];
}

function isProduct(node: Record<string, unknown>): boolean {
  const t = node['@type'];
  const types = Array.isArray(t) ? t : [t];
  return types.some((x) => typeof x === 'string' && x.includes('Product'));
}

/**
 * Prix d'un noeud Product en cents (int). `offers` peut être un objet ou un
 * array d'Offer (Castorama : array, le 1er porte le prix). Retourne null si
 * aucun prix exploitable.
 */
export function priceCentsFromOffers(offers: unknown): number | null {
  const list = Array.isArray(offers) ? offers : offers != null ? [offers] : [];
  for (const o of list) {
    if (o && typeof o === 'object') {
      const raw = (o as Record<string, unknown>).price ?? (o as Record<string, unknown>).lowPrice;
      if (raw != null) {
        const n = parseFloat(String(raw).replace(',', '.'));
        if (Number.isFinite(n)) return Math.round(n * 100);
      }
    }
  }
  return null;
}

/** Devise ISO 4217 du 1er offer qui en porte une (défaut EUR). */
export function currencyFromOffers(offers: unknown): string {
  const list = Array.isArray(offers) ? offers : offers != null ? [offers] : [];
  for (const o of list) {
    if (o && typeof o === 'object') {
      const c = (o as Record<string, unknown>).priceCurrency;
      if (typeof c === 'string' && c.length === 3) return c;
    }
  }
  return 'EUR';
}
