/**
 * HttpJsonFetcher (CLAUDE.md §15.8 step d) — implémentation backend du port
 * JsonFetcher (@kitchenxpert/common).
 *
 * Client JSON minimal sur fetch natif (Node 20+) : UA identifiant (§15.8 P5
 * légal défensif), headers par appel (ex. Origin EPREL), timeout. Permet au
 * backend d'injecter un fetcher dans l'IngestionOrchestrator SANS dépendre du
 * package scraper (lourd, puppeteer). Le rate-limit fin / retry vit côté
 * Strategy/source ; ici on reste volontairement simple.
 */
import type { JsonFetcher, HtmlFetcher } from '@kitchenxpert/common';

export class HttpJsonFetcher implements JsonFetcher, HtmlFetcher {
  constructor(
    private readonly userAgent = 'KitchenXpert/1.0 (+catalog ingestion)',
    private readonly timeoutMs = 15_000
  ) {}

  async fetchJson<T = unknown>(
    url: string,
    options?: { headers?: Record<string, string> }
  ): Promise<T> {
    const res = await this.request(url, 'application/json', options);
    return (await res.json()) as T;
  }

  /** Récupère du HTML/texte (PDP, sitemap XML) pour les Strategies N3. */
  async fetchText(url: string, options?: { headers?: Record<string, string> }): Promise<string> {
    const res = await this.request(url, 'text/html,application/xhtml+xml,application/xml', options);
    return res.text();
  }

  private async request(
    url: string,
    accept: string,
    options?: { headers?: Record<string, string> }
  ): Promise<Response> {
    const res = await fetch(url, {
      headers: { Accept: accept, 'User-Agent': this.userAgent, ...options?.headers },
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText} on ${url}`);
    }
    return res;
  }
}
