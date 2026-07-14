/**
 * SSRF-safe image fetch.
 *
 * The style-transfer endpoint took an `imageUrl` from the request body and did
 * `await fetch(imageUrl)` behind only `z.string().url()` — which validates SYNTAX, not
 * DESTINATION (169.254.169.254, localhost:6379, file:// all pass). Any authenticated
 * user could make the backend GET an arbitrary URL: cloud metadata (IAM creds), Redis,
 * the internal network. CodeQL js/request-forgery #72.
 *
 * The two pre-existing "SSRF checks" in the repo (partner-controller, webhook-controller)
 * block by matching the HOSTNAME string against a blocklist. That is the naive filter:
 * it stops `169.254.169.254` typed literally, and lets in `evil.com` that RESOLVES to
 * 169.254.169.254 (DNS rebinding), decimal/hex IP encodings, a redirect to a private IP,
 * and IPv4-mapped IPv6. This guard validates the RESOLVED IP, pins the connection to it
 * (no second resolution → no TOCTOU), refuses non-HTTPS, and re-validates every redirect
 * hop. What survives is provably a public host.
 */
import dns from 'node:dns';
import https from 'node:https';
import net from 'node:net';

export class SsrfBlockedError extends Error {
  constructor(reason: string) {
    super(`Blocked by SSRF guard: ${reason}`);
    this.name = 'SsrfBlockedError';
  }
}

/** Injectable resolver — returns every address a hostname resolves to. */
export type Resolver = (hostname: string) => Promise<string[]>;

const defaultResolver: Resolver = (hostname) =>
  new Promise((resolve, reject) => {
    dns.lookup(hostname, { all: true, verbatim: true }, (err, addrs) => {
      if (err) {
        reject(new SsrfBlockedError(`cannot resolve host: ${hostname}`));
      } else {
        resolve(addrs.map((a) => a.address));
      }
    });
  });

/**
 * Is this IP address in a range we must never let the server reach?
 * Covers IPv4 private/loopback/link-local/CGNAT/reserved, IPv6 loopback/ULA/link-local,
 * and — the classic bypass — IPv4-mapped IPv6 (::ffff:a.b.c.d), which is unwrapped and
 * re-checked as IPv4.
 */
export function isBlockedIp(ip: string): boolean {
  const fam = net.isIP(ip);
  if (fam === 0) {return true;} // not an IP at all → refuse

  if (fam === 6) {
    const lower = ip.toLowerCase();
    // IPv4-mapped / -compatible IPv6 → validate the embedded IPv4
    const mapped = lower.match(/^::(?:ffff:)?(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped?.[1]) {return isBlockedIp(mapped[1]);}
    if (lower.includes('.')) {
      // hex-form IPv4-mapped (::ffff:a9fe:a9fe) etc. — extract trailing v4 if present
      const tail = lower.split(':').pop() ?? '';
      if (net.isIP(tail) === 4) {return isBlockedIp(tail);}
    }
    if (lower === '::1' || lower === '::') {return true;} // loopback / unspecified
    const head = lower.split(':')[0] ?? '';
    const h = parseInt(head, 16);
    if (Number.isNaN(h)) {return true;}
    if ((h & 0xfe00) === 0xfc00) {return true;} // fc00::/7  unique-local
    if ((h & 0xffc0) === 0xfe80) {return true;} // fe80::/10 link-local
    return false;
  }

  // IPv4
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some((o) => !Number.isInteger(o) || o < 0 || o > 255)) {return true;}
  const a = p[0] as number;
  const b = p[1] as number;
  if (a === 0) {return true;} // 0.0.0.0/8
  if (a === 10) {return true;} // private
  if (a === 127) {return true;} // loopback
  if (a === 169 && b === 254) {return true;} // link-local incl. 169.254.169.254 metadata
  if (a === 172 && b >= 16 && b <= 31) {return true;} // private
  if (a === 192 && b === 168) {return true;} // private
  if (a === 100 && b >= 64 && b <= 127) {return true;} // 100.64/10 CGNAT
  if (a === 198 && (b === 18 || b === 19)) {return true;} // 198.18/15 benchmark
  if (a >= 224) {return true;} // multicast + reserved (224/4, 240/4, 255.255.255.255)
  return false;
}

/**
 * Assert a URL is safe to fetch, and return the vetted IP to pin the connection to.
 * Throws SsrfBlockedError otherwise. `resolve` is injectable for tests.
 */
export async function assertUrlAllowed(
  rawUrl: string,
  resolve: Resolver = defaultResolver
): Promise<{ url: URL; pinnedIp: string }> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new SsrfBlockedError('malformed URL');
  }
  if (url.protocol !== 'https:') {
    throw new SsrfBlockedError(`scheme not allowed: ${url.protocol} (https only)`);
  }

  const host = url.hostname;
  // If the host is an IP literal, validate it directly (covers decimal/hex forms after
  // WHATWG normalization); otherwise resolve and validate EVERY address.
  const ips = net.isIP(host) ? [host] : await resolve(host);
  if (ips.length === 0) {throw new SsrfBlockedError(`host resolves to nothing: ${host}`);}
  for (const ip of ips) {
    if (isBlockedIp(ip)) {
      throw new SsrfBlockedError(`resolves to a blocked address: ${host} → ${ip}`);
    }
  }
  return { url, pinnedIp: ips[0] as string };
}

export interface SafeImageResult {
  buffer: Buffer;
  contentType: string;
}

interface SafeFetchOptions {
  resolve?: Resolver;
  maxBytes?: number;
  timeoutMs?: number;
  maxRedirects?: number;
}

/**
 * Perform ONE pinned HTTPS GET to a vetted URL. Connects to `pinnedIp` (no re-resolution
 * → no DNS-rebinding window), keeps the original Host/SNI, does NOT auto-follow redirects
 * (returns the 3xx Location to the caller), caps body size, and enforces a timeout.
 * Injectable via `overrideFetch` in tests.
 */
type OneShot = (
  url: URL,
  pinnedIp: string,
  maxBytes: number,
  timeoutMs: number
) => Promise<{ status: number; location?: string; contentType: string; buffer: Buffer }>;

const pinnedHttpsGet: OneShot = (url, pinnedIp, maxBytes, timeoutMs) =>
  new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: 'GET',
        // Pin the connection to the address we validated — ignore the hostname's own
        // resolution so a rebinding TTL cannot swap in a private IP after the check.
        lookup: (_h, _o, cb) => cb(null, pinnedIp, net.isIP(pinnedIp) === 6 ? 6 : 4),
        timeout: timeoutMs,
      },
      (res) => {
        const status = res.statusCode ?? 0;
        const location = res.headers.location;
        const contentType = String(res.headers['content-type'] ?? '');
        const chunks: Buffer[] = [];
        let size = 0;
        res.on('data', (c: Buffer) => {
          size += c.length;
          if (size > maxBytes) {
            req.destroy();
            reject(new SsrfBlockedError(`response exceeds ${maxBytes} bytes`));
            return;
          }
          chunks.push(c);
        });
        res.on('end', () => resolve({ status, location, contentType, buffer: Buffer.concat(chunks) }));
      }
    );
    req.on('timeout', () => {
      req.destroy();
      reject(new SsrfBlockedError('request timed out'));
    });
    req.on('error', (e) => reject(e));
    req.end();
  });

/**
 * SSRF-safe image fetch with redirect re-validation. Every hop — including redirect
 * targets — is re-checked with `assertUrlAllowed`, so an external URL that 302s to
 * 169.254.169.254 is refused at the second hop.
 */
export async function fetchImageSafely(
  rawUrl: string,
  opts: SafeFetchOptions & { overrideFetch?: OneShot } = {}
): Promise<SafeImageResult> {
  const resolve = opts.resolve ?? defaultResolver;
  const maxBytes = opts.maxBytes ?? 10 * 1024 * 1024; // 10 MB
  const timeoutMs = opts.timeoutMs ?? 8_000;
  const maxRedirects = opts.maxRedirects ?? 3;
  const oneShot = opts.overrideFetch ?? pinnedHttpsGet;

  let current = rawUrl;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    const { url, pinnedIp } = await assertUrlAllowed(current, resolve);
    const res = await oneShot(url, pinnedIp, maxBytes, timeoutMs);

    if (res.status >= 300 && res.status < 400) {
      if (!res.location) {throw new SsrfBlockedError('redirect without a location');}
      // Re-validate the redirect target on the next loop iteration.
      current = new URL(res.location, url).toString();
      continue;
    }
    if (res.status < 200 || res.status >= 300) {
      throw new SsrfBlockedError(`upstream returned ${res.status}`);
    }
    if (!/^image\//i.test(res.contentType)) {
      throw new SsrfBlockedError(`content-type is not an image: ${res.contentType || '(none)'}`);
    }
    return { buffer: res.buffer, contentType: res.contentType };
  }
  throw new SsrfBlockedError(`too many redirects (>${maxRedirects})`);
}
