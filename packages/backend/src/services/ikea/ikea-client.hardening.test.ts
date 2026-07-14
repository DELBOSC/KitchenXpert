/**
 * IkeaClient — SSRF-footgun removal + path-injection guard.
 *
 * CodeQL js/request-forgery flagged four fetches whose URL embeds user-controlled
 * country/language (path) and — on the pip endpoint — this.config.baseUrl (host). The
 * host was NEVER user-controllable in practice (no call site passed baseUrl), so the four
 * were false positives for SSRF *today*. But the `baseUrl?: string` override was a dormant
 * footgun: the day a caller wired it to request input, the host became attacker-controlled.
 *
 * The fix removes the capability (there is no baseUrl to override — the host is a
 * constant) and constrains country/language to ISO 2-letter codes at the single point
 * they enter the client, closing the residual path injection. This proves both.
 */
import { IkeaClient } from './ikea-client';

import type { IkeaConfig } from './types';

describe('IkeaClient hardening', () => {
  it('constructs with valid ISO 2-letter country/language', () => {
    expect(() => new IkeaClient({ country: 'fr', language: 'en' })).not.toThrow();
  });

  it('🔒 rejects country/language that could inject path segments (fail-closed)', () => {
    for (const bad of ['../', '..%2f', 'fr/x', 'FR', 'fra', '@evil', 'f', '']) {
      expect(() => new IkeaClient({ country: bad, language: 'fr' })).toThrow(/2-letter/);
      expect(() => new IkeaClient({ country: 'fr', language: bad })).toThrow(/2-letter/);
    }
  });

  it('🔒 rejects an array country (the req.query type-lie) — stringified then refused', () => {
    // ?country=a&country=b arrives as ['a','b'] despite the `as string` at the call site.
    expect(
      () => new IkeaClient({ country: ['a', 'b'] as unknown as string, language: 'fr' })
    ).toThrow(/2-letter/);
  });

  it('🔒 the host cannot be overridden: IkeaConfig has no baseUrl field', () => {
    // Structural: passing baseUrl is a compile error, so a caller cannot point the client
    // at another host. (Cast here only to assert it is ignored at runtime, not accepted.)
    const withBaseUrl = { country: 'fr', language: 'fr', baseUrl: 'http://169.254.169.254' };
    const client = new IkeaClient(withBaseUrl as IkeaConfig);
    // The rogue baseUrl is not stored anywhere on the client's config.
    const cfg = (client as unknown as { config: Record<string, unknown> }).config;
    expect(cfg.baseUrl).toBeUndefined();
    expect(JSON.stringify(cfg)).not.toContain('169.254');
  });
});
