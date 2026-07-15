/**
 * HtmlFetcher (CLAUDE.md §15.8 — cascade N3/N4 HTML).
 *
 * Port pour récupérer du HTML/texte (PDP, sitemap XML), distinct de JsonFetcher
 * (qui parse en JSON). Une implémentation peut satisfaire les deux (le
 * HttpJsonFetcher backend le fait). Garde les Strategies HTML découplées de
 * tout client concret + du package scraper lourd.
 */
export interface HtmlFetcher {
  fetchText(url: string, options?: { headers?: Record<string, string> }): Promise<string>;
}

/**
 * Upper bound (chars) for HTML handed to the dep-free regex parsers (jsonld,
 * castorama-spec-table). Those parsers scan untrusted retailer HTML with
 * `<tag[^>]*…>` patterns that CodeQL flags as polynomial-backtracking (js/redos):
 * on a pathological page the `[^>]*` runs re-scan quadratically. A real PDP/sitemap
 * is well under this; capping the input bounds N, so the worst-case regex work is a
 * fixed ceiling instead of a function of an attacker-chosen page size. Truncation is
 * safe here — both parsers are best-effort skip-not-crash, so a cut block just yields
 * fewer results, never an exception.
 */
export const MAX_PARSE_HTML_LEN = 3_000_000;

/** Truncate HTML to {@link MAX_PARSE_HTML_LEN} before feeding it to a regex parser. */
export function capHtml(html: string): string {
  return html.length > MAX_PARSE_HTML_LEN ? html.slice(0, MAX_PARSE_HTML_LEN) : html;
}
