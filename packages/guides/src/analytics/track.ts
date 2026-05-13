/**
 * Editorial-side analytics — Plausible custom events.
 *
 * Plausible is loaded by the SPA's CookieConsent (see
 * `packages/frontend/src/analytics/plausible-loader.ts`); the script
 * is shared via the same domain so guides pages benefit automatically
 * once consent is granted.
 *
 * Events tracked:
 *   - guides_article_view       (auto on page load)
 *   - guides_scroll_25          (scroll-depth milestones)
 *   - guides_scroll_50
 *   - guides_scroll_75
 *   - guides_scroll_100
 *   - guides_reading_time       (cumulative time-on-page when leaving)
 *   - guides_cta_click          (already fired by the CTABlock attrs)
 *   - guides_signup_attribution (fired when /designer/sandbox arrives
 *     with utm_source=guides — the SPA emits this; documented here for
 *     funnel completeness)
 *
 * The dashboard view of the funnel lives in Plausible itself
 * (Properties → utm_source / event_name) — no custom admin page needed
 * for v1.
 */

declare global {
  interface Window {
    plausible?: (event: string, opts?: { props?: Record<string, string | number> }) => void;
  }
}

interface TrackOpts {
  slug: string;
  collection: string;
}

function send(event: string, props: Record<string, string | number>): void {
  if (typeof window === 'undefined') return;
  if (typeof window.plausible !== 'function') return;
  try {
    window.plausible(event, { props });
  } catch {
    /* never break UX over analytics */
  }
}

/** Call once per article on mount. Records page view + sets up scroll spy. */
export function bootArticleAnalytics({ slug, collection }: TrackOpts): () => void {
  send('guides_article_view', { slug, collection });

  // ---- Scroll-depth tracking ----------------------------------------
  const milestones = [25, 50, 75, 100];
  const reached = new Set<number>();

  const onScroll = (): void => {
    const doc = document.documentElement;
    const totalScrollable = doc.scrollHeight - window.innerHeight;
    if (totalScrollable <= 0) return;
    const pct = Math.round((window.scrollY / totalScrollable) * 100);
    for (const m of milestones) {
      if (pct >= m && !reached.has(m)) {
        reached.add(m);
        send(`guides_scroll_${m}`, { slug });
      }
    }
  };

  let frame = 0;
  const throttled = (): void => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      onScroll();
    });
  };
  window.addEventListener('scroll', throttled, { passive: true });

  // ---- Reading-time tracking ---------------------------------------
  const startedAt = Date.now();
  const onLeave = (): void => {
    const seconds = Math.round((Date.now() - startedAt) / 1000);
    if (seconds < 5) return;
    send('guides_reading_time', { slug, seconds });
  };
  // `pagehide` is more reliable than `beforeunload` on mobile Safari.
  window.addEventListener('pagehide', onLeave, { once: true });

  return () => {
    window.removeEventListener('scroll', throttled);
    window.removeEventListener('pagehide', onLeave);
  };
}
