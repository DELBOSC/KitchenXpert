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
import type { JsonFetcher } from '@kitchenxpert/common';

export class HttpJsonFetcher implements JsonFetcher {
  constructor(
    private readonly userAgent = 'KitchenXpert/1.0 (+catalog ingestion)',
    private readonly timeoutMs = 15_000,
  ) {}

  async fetchJson<T = unknown>(
    url: string,
    options?: { headers?: Record<string, string> },
  ): Promise<T> {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': this.userAgent,
        ...options?.headers,
      },
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText} on ${url}`);
    }
    return (await res.json()) as T;
  }
}
