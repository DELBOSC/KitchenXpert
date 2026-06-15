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
