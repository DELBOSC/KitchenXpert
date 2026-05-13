/**
 * Sandbox event tracker — RGPD-friendly, Plausible-compatible.
 *
 * Plausible's API is a single global function `plausible(event, opts)`.
 * If the script hasn't loaded (cookie consent denied, blocker, etc.)
 * we silently no-op. Events are also forwarded to a CustomEvent so the
 * dev tools panel + the future internal analytics page can subscribe
 * without depending on Plausible.
 *
 * Naming convention: `sandbox_<verb>_<noun>` — same prefix lets us
 * filter the funnel in Plausible's dashboard with one click.
 */

declare global {
  interface Window {
    plausible?: (event: string, opts?: { props?: Record<string, string | number> }) => void;
  }
}

export type SandboxEvent =
  | { type: 'sandbox_session_start'; props?: { template?: string | null } }
  | { type: 'sandbox_first_action'; props: { action: 'add_item' | 'move_item' | 'change_layout' | 'open_catalog' } }
  | { type: 'sandbox_friction_hit'; props: { trigger: 'pdf_export' | 'ai_use' | 'quote_compare' | 'pathtracer' | 'session_15min' } }
  | { type: 'sandbox_signup_intent'; props: { from: 'banner' | 'modal' | 'menu' | 'friction' } }
  | { type: 'sandbox_signup_completed'; props: { imported: 'yes' | 'no' } }
  | { type: 'sandbox_session_duration'; props: { seconds: number } }
  | { type: 'sandbox_items_added'; props: { count: number } };

export function trackSandbox(event: SandboxEvent): void {
  // 1. Plausible (no-op if script absent)
  if (typeof window !== 'undefined' && typeof window.plausible === 'function') {
    try {
      window.plausible(event.type, { props: ('props' in event ? event.props : undefined) as Record<string, string | number> | undefined });
    } catch {
      /* swallow analytics errors — never break the UX */
    }
  }

  // 2. CustomEvent — anyone (dev tools, in-app analytics) can listen
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent(`kx:${event.type}`, { detail: 'props' in event ? event.props : {} }),
      );
    } catch {
      /* ie11-style — non-issue */
    }
  }
}

/**
 * Hook to track session duration. Call once at the top of
 * SandboxDesignerPage; emits `sandbox_session_duration` on unload.
 */
export function useSandboxSessionTracking(): void {
  if (typeof window === 'undefined') {return;}

  // Idempotent: calling multiple times is harmless (we read the start
  // time from sessionStorage so refreshes don't reset the meter).
  const KEY = 'kx-sandbox-session-start';
  if (!sessionStorage.getItem(KEY)) {
    sessionStorage.setItem(KEY, String(Date.now()));
  }

  const handler = (): void => {
    const start = Number(sessionStorage.getItem(KEY) || '0');
    if (!start) {return;}
    const seconds = Math.round((Date.now() - start) / 1000);
    if (seconds < 5) {return;} // ignore page-load bounces
    trackSandbox({ type: 'sandbox_session_duration', props: { seconds } });
  };

  // `pagehide` is more reliable than `beforeunload` on mobile Safari.
  window.addEventListener('pagehide', handler, { once: true });
}
