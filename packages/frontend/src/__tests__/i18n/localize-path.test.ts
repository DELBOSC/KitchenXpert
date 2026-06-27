import { describe, it, expect } from 'vitest';

import { localizeUnknownLangPath } from '../../i18n/localize-path';

/**
 * Regression guard for the LocaleAwareShell deep-link bug (couche 7e, §11 P1):
 * a locale-less URL must keep its FULL path, not be stripped to `/fr/`.
 */
describe('localizeUnknownLangPath', () => {
  it('prepends /fr to a single-segment path (the bug: /login → /fr/, now /fr/login)', () => {
    expect(localizeUnknownLangPath('/login')).toBe('/fr/login');
    expect(localizeUnknownLangPath('/pricing')).toBe('/fr/pricing');
  });

  it('preserves multi-segment paths (was /fr/IKEA 404 → now /fr/catalog/IKEA)', () => {
    expect(localizeUnknownLangPath('/catalog/IKEA')).toBe('/fr/catalog/IKEA');
    expect(localizeUnknownLangPath('/legal/privacy')).toBe('/fr/legal/privacy');
  });

  it('preserves query string and hash', () => {
    expect(localizeUnknownLangPath('/pricing', '?utm=x')).toBe('/fr/pricing?utm=x');
    expect(localizeUnknownLangPath('/catalog/IKEA', '', '#section')).toBe(
      '/fr/catalog/IKEA#section'
    );
    expect(localizeUnknownLangPath('/login', '?a=1&b=2', '#sec')).toBe('/fr/login?a=1&b=2#sec');
  });

  it('handles the root path', () => {
    expect(localizeUnknownLangPath('/')).toBe('/fr/');
  });

  it('does NOT strip a structurally-valid but unsupported locale (documented edge case)', () => {
    // `/xx/login` keeps the bad segment → `/fr/xx/login` (rare/malformed).
    expect(localizeUnknownLangPath('/xx/login')).toBe('/fr/xx/login');
  });

  it('respects an explicit default locale', () => {
    expect(localizeUnknownLangPath('/login', '', '', 'en')).toBe('/en/login');
  });
});
