/**
 * SSRF guard — the negative control.
 *
 * A guard is only real if it stops the attacks a NAIVE filter lets through. The
 * hostname-string blocklists already in this repo (partner/webhook controllers) pass
 * "169.254.169.254 → blocked" and "external → allowed" while still being bypassable.
 * So the load-bearing cases here are the ones a naive filter FAILS:
 *   - a hostname that RESOLVES to a private IP (DNS rebinding)
 *   - an external URL that REDIRECTS to a private IP
 *   - a non-HTTPS scheme
 *   - IPv4-mapped IPv6 and decimal/hex encodings
 * If those pass, it is a filter, not a guard.
 */
import { isBlockedIp, assertUrlAllowed, fetchImageSafely, SsrfBlockedError } from './safe-fetch';

import type { Resolver } from './safe-fetch';

// A resolver we fully control, so "what does this host resolve to" is the test input.
const resolvesTo =
  (map: Record<string, string[]>): Resolver =>
  (host) =>
    Promise.resolve(map[host] ?? ['203.0.113.10']); // default: a public-ish TEST-NET addr

describe('isBlockedIp — the ranges that must never be reachable', () => {
  it.each([
    ['169.254.169.254', 'cloud metadata'],
    ['127.0.0.1', 'loopback'],
    ['10.0.0.1', 'private A'],
    ['172.16.0.1', 'private B'],
    ['192.168.1.1', 'private C'],
    ['0.0.0.0', 'unspecified'],
    ['100.64.0.1', 'CGNAT'],
    ['::1', 'IPv6 loopback'],
    ['fc00::1', 'IPv6 ULA'],
    ['fe80::1', 'IPv6 link-local'],
    ['::ffff:169.254.169.254', 'IPv4-mapped metadata (classic bypass)'],
    ['::ffff:127.0.0.1', 'IPv4-mapped loopback'],
    ['not-an-ip', 'garbage'],
  ])('blocks %s (%s)', (ip) => {
    expect(isBlockedIp(ip)).toBe(true);
  });

  it.each([['8.8.8.8'], ['1.1.1.1'], ['203.0.113.10'], ['2606:4700::1111']])(
    'allows public %s',
    (ip) => {
      expect(isBlockedIp(ip)).toBe(false);
    }
  );
});

describe('assertUrlAllowed — scheme + resolved-IP validation', () => {
  it('🔒 rejects a non-HTTPS scheme (file://, http://)', async () => {
    await expect(assertUrlAllowed('file:///etc/passwd')).rejects.toThrow(SsrfBlockedError);
    await expect(assertUrlAllowed('http://example.com/x.jpg')).rejects.toThrow(/https only/);
  });

  it('🔒 rejects a direct private-IP literal', async () => {
    await expect(assertUrlAllowed('https://169.254.169.254/latest/meta-data/')).rejects.toThrow(
      SsrfBlockedError
    );
  });

  it('🔒 rejects a hostname that RESOLVES to a private IP (DNS rebinding)', async () => {
    const resolve = resolvesTo({ 'evil.example.com': ['169.254.169.254'] });
    await expect(
      assertUrlAllowed('https://evil.example.com/x.jpg', resolve)
    ).rejects.toThrow(/blocked address/);
  });

  it('🔒 rejects if ANY resolved address is private (mixed A-records)', async () => {
    const resolve = resolvesTo({ 'mixed.example.com': ['8.8.8.8', '127.0.0.1'] });
    await expect(assertUrlAllowed('https://mixed.example.com/x.jpg', resolve)).rejects.toThrow(
      SsrfBlockedError
    );
  });

  it('allows a legit external HTTPS host, pinning the vetted IP', async () => {
    const resolve = resolvesTo({ 'cdn.example.com': ['203.0.113.10'] });
    const { pinnedIp } = await assertUrlAllowed('https://cdn.example.com/x.jpg', resolve);
    expect(pinnedIp).toBe('203.0.113.10');
  });
});

describe('fetchImageSafely — redirects are re-validated, not followed blindly', () => {
  const resolve = resolvesTo({
    'cdn.example.com': ['203.0.113.10'],
    'redir.example.com': ['203.0.113.20'],
  });

  it('🔒 rejects an external URL that REDIRECTS to a private IP', async () => {
    // Hop 1: redir.example.com (public) → 302 Location: the metadata endpoint.
    const overrideFetch = jest.fn(async (url: URL) => {
      if (url.hostname === 'redir.example.com') {
        return {
          status: 302,
          location: 'https://169.254.169.254/latest/meta-data/',
          contentType: '',
          buffer: Buffer.alloc(0),
        };
      }
      return { status: 200, contentType: 'image/png', buffer: Buffer.from('x') };
    });

    await expect(
      fetchImageSafely('https://redir.example.com/x.jpg', { resolve, overrideFetch })
    ).rejects.toThrow(/blocked address/);
    // The private hop was never fetched — assertUrlAllowed threw before oneShot ran on it.
    expect(overrideFetch).toHaveBeenCalledTimes(1);
  });

  it('returns the image on a legit host with an image content-type', async () => {
    const overrideFetch = jest.fn(async () => ({
      status: 200,
      contentType: 'image/webp',
      buffer: Buffer.from('IMG'),
    }));
    const out = await fetchImageSafely('https://cdn.example.com/x.webp', {
      resolve,
      overrideFetch,
    });
    expect(out.contentType).toBe('image/webp');
    expect(out.buffer.toString()).toBe('IMG');
  });

  it('🔒 rejects a non-image content-type (no HTML/JSON exfil through the vision path)', async () => {
    const overrideFetch = jest.fn(async () => ({
      status: 200,
      contentType: 'text/html',
      buffer: Buffer.from('<html>'),
    }));
    await expect(
      fetchImageSafely('https://cdn.example.com/x', { resolve, overrideFetch })
    ).rejects.toThrow(/not an image/);
  });

  it('🔒 stops a redirect loop at the cap', async () => {
    const overrideFetch = jest.fn(async () => ({
      status: 302,
      location: 'https://cdn.example.com/again',
      contentType: '',
      buffer: Buffer.alloc(0),
    }));
    await expect(
      fetchImageSafely('https://cdn.example.com/x', { resolve, overrideFetch, maxRedirects: 2 })
    ).rejects.toThrow(/too many redirects/);
  });
});
