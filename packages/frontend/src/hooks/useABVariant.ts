import { useEffect, useState } from 'react';

/**
 * useABVariant — sticky deterministic A/B/C assignment without a feature
 * flag service.
 *
 * Strategy:
 *   1. The very first time a visitor lands, we pick a variant uniformly
 *      at random and persist it in localStorage under
 *      `kx-ab-<experimentId>`.
 *   2. Subsequent visits / page navigations read the stored value, so
 *      a visitor sees the SAME variant for the whole experiment.
 *      Critical: if a returning user sees a different variant than at
 *      signup, the conversion attribution is broken.
 *   3. The chosen variant is fired into Plausible as a custom event
 *      ONCE per session so the funnel can be sliced by variant.
 *
 * Why not server-side / cookies?
 *   - We have no edge server. Cookies would need backend round-trip.
 *   - localStorage is good enough for a 14-day landing-page test.
 *   - For an at-scale, multi-experiment setup, swap to GrowthBook EU.
 *
 * Usage:
 *   const variant = useABVariant('hero', ['A', 'B', 'C']);
 *   if (variant === 'A') return <HeroA />;
 *   …
 */

declare global {
  interface Window {
    plausible?: (event: string, opts?: { props?: Record<string, string | number> }) => void;
  }
}

const KEY = (experimentId: string): string => `kx-ab-${experimentId}`;
const SESSION_KEY = (experimentId: string): string => `kx-ab-fired-${experimentId}`;

function pick<T>(variants: readonly T[]): T {
  // Math.random is enough for a 1/3 split. crypto would be overkill.
  // Caller guarantees variants.length > 0 — the `!` is safe.
  return variants[Math.floor(Math.random() * variants.length)]!;
}

export function useABVariant<T extends string>(
  experimentId: string,
  variants: readonly T[],
): T {
  // Default to the FIRST variant to avoid hydration flicker. The real
  // variant is settled in the effect below — fast (synchronous read).
  // Caller guarantees variants.length > 0.
  const [variant, setVariant] = useState<T>(variants[0] as T);

  useEffect(() => {
    if (typeof window === 'undefined') {return;}

    let chosen: T;
    try {
      const stored = localStorage.getItem(KEY(experimentId)) as T | null;
      if (stored && variants.includes(stored)) {
        chosen = stored;
      } else {
        chosen = pick(variants);
        localStorage.setItem(KEY(experimentId), chosen);
      }
    } catch {
      // Private browsing → fall back to a fresh draw, no persistence
      chosen = pick(variants);
    }

    setVariant(chosen);

    // Fire the assignment event ONCE per session per experiment
    try {
      const fired = sessionStorage.getItem(SESSION_KEY(experimentId));
      if (!fired && typeof window.plausible === 'function') {
        window.plausible('ab_assignment', {
          props: { experiment: experimentId, variant: chosen },
        });
        sessionStorage.setItem(SESSION_KEY(experimentId), '1');
      }
    } catch { /* no-op */ }
  }, [experimentId, variants]);

  return variant;
}

/**
 * Conversion events that can be tagged with the Hero A/B variant.
 *
 * Naming convention: the `_ab` suffix on `sandbox_signup_*_ab` keeps these
 * distinct from the generic `sandbox_signup_intent` / `sandbox_signup_completed`
 * events emitted by `trackSandbox` — so Plausible counts the funnel without
 * double-counting the totals.
 */
export type HeroABEvent =
  | 'hero_cta_primary_click'
  | 'hero_cta_secondary_click'
  | 'sandbox_signup_intent_ab'
  | 'sandbox_signup_completed_ab';

/**
 * Tag a downstream conversion with the current AB variant. Call from the
 * conversion site so Plausible can slice the funnel by variant without a
 * server-side join. Reads the variant from localStorage; emits `unknown`
 * if the visitor has no recorded assignment (SSR / private browsing).
 *
 * Call sites (Hero experiment):
 *   - HeroVariants.tsx CTAs → 'hero_cta_primary_click' / 'hero_cta_secondary_click'
 *   - SignupPromptModal     → 'sandbox_signup_intent_ab'
 *   - SandboxMigrationBanner → 'sandbox_signup_completed_ab'
 */
export function tagConversion(experimentId: string, eventName: HeroABEvent): void {
  if (typeof window === 'undefined') {return;}
  if (typeof window.plausible !== 'function') {return;}
  let variant: string | null = null;
  try {
    variant = localStorage.getItem(KEY(experimentId));
  } catch { /* */ }
  window.plausible(eventName, {
    props: {
      experiment: experimentId,
      variant: variant ?? 'unknown',
    },
  });
}
