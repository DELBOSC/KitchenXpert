/**
 * Plausible loader — RGPD-compliant.
 *
 * Plausible is cookieless and CNIL-exempt in its default mode, BUT we
 * still gate the script load on explicit user consent because:
 *   1. The CMP (CookieConsent component) is the single source of truth
 *      for "what runs on this page".
 *   2. Some Plausible features (custom events with PII, outbound link
 *      tracking) raise CNIL eyebrows — being conservative is cheap.
 *
 * Public API:
 *   - `loadPlausible()`     — injects the script tag (idempotent)
 *   - `unloadPlausible()`   — removes it + nukes the global
 *   - the global `window.plausible(eventName, opts)` is what
 *     `useSandboxAnalytics.ts` calls
 */

const SCRIPT_ID = 'kx-plausible';
const DOMAIN = (import.meta.env?.VITE_PLAUSIBLE_DOMAIN as string) || 'kitchenxpert.com';
const HOST = (import.meta.env?.VITE_PLAUSIBLE_API_HOST as string) || 'https://plausible.io';

declare global {
  interface Window {
    plausible?: (event: string, opts?: { props?: Record<string, string | number> }) => void;
  }
}

/** Internal shape: the Plausible queue shim carries a `.q` array. */
type PlausibleWithQueue = NonNullable<Window['plausible']> & { q?: unknown[] };

export function loadPlausible(): void {
  if (typeof document === 'undefined') {return;}
  if (document.getElementById(SCRIPT_ID)) {return;} // already loaded

  // Plausible's outbound-links script wraps history.pushState. On localhost
  // it logs "Ignoring Event: localhost" and the wrapped pushState becomes a
  // no-op, which breaks React Router <Link> navigation. Skip entirely in dev.
  if (import.meta.env.DEV) {
    console.info('[Plausible] disabled in dev — preserves React Router pushState');
    return;
  }

  // The official Plausible snippet plus the queue shim so events fired
  // before the script finishes loading are kept and replayed.
  if (!window.plausible) {
    const stub = function (this: PlausibleWithQueue) {
      // eslint-disable-next-line prefer-rest-params
      (stub.q = stub.q || []).push(arguments);
    } as PlausibleWithQueue;
    window.plausible = stub as Window['plausible'];
  }

  const script = document.createElement('script');
  script.id = SCRIPT_ID;
  script.defer = true;
  script.dataset.domain = DOMAIN;
  // Use the `outbound-links` + `tagged-events` extensions — both
  // documented as cookieless on plausible.io.
  script.src = `${HOST}/js/script.outbound-links.tagged-events.js`;
  document.head.appendChild(script);
}

export function unloadPlausible(): void {
  if (typeof document === 'undefined') {return;}
  document.getElementById(SCRIPT_ID)?.remove();
  delete window.plausible;
}

/**
 * Call once at app boot. Reads the persisted cookie-consent (managed by
 * `components/common/CookieConsent`) and loads Plausible if the user
 * opted in to analytics. Cheap to call multiple times.
 */
export function bootAnalyticsFromConsent(): void {
  if (typeof window === 'undefined') {return;}
  try {
    const raw = localStorage.getItem('kx.cookie-consent.v1');
    if (!raw) {return;}
    const consent = JSON.parse(raw) as { analytics?: boolean };
    if (consent?.analytics) {loadPlausible();}
  } catch {
    /* corrupted cookie consent — ignore, will be re-prompted */
  }
}
